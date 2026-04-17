---
title: 'Golang in Action (1): How to Quickly Implement a Query Plan'
author: MatrixOrigin
mail: contact@matrixorigin.io
description: >-
  In versions prior to 0.4, MatrixOne's computation engine was implemented based
  on a factorization approach. However, this approach lacked versatility, such
  as the inability to support non-equi-join conditions. Therefore, starting with
  version 0.5, we officially decided to abandon the factorization approach and
  develop a new computation engine from scratch.
tags:
  - technology
keywords:
  - MatrixOne
  - Golang
  - Cloud-Native
  - Query Plan
  - Database
publishTime: '2023-12-29 17:00:00+00:00'
image:
  '1': /content/en/shared/golang-in-action.png
  '235': /content/en/shared/golang-in-action.png
date: '2023-12-29 17:00:00+00:00'
lang: en
status: published
---

## Introduction

In versions prior to 0.4, MatrixOne's computation engine was implemented based on a factorization approach. However, this approach lacked versatility, such as the inability to support non-equi-join conditions. Therefore, starting with version 0.5, we officially decided to abandon the factorization approach and develop a new computation engine from scratch.

As one of the main developers of the new query plan, I personally experienced the journey from having no experience in query plan development to successfully executing a 1G data TPC-H in three months.

This article shares some relevant experiences.

Below is an overview of the article's contents:

1. Overall Architecture
2. Binder
3. Planner
4. Optimizer
5. Conclusion

## Part 1: Overall Architecture

The execution process of a SQL database's computation engine typically involves the following steps:

- Parser: Performs lexical analysis on the input SQL statement to generate an Abstract Syntax Tree (AST).
- Binder: Combines metadata to map table names, column names, function names, etc., in the expression to actual objects within the database.
- Planner: Generates a query plan tree based on the syntax tree after binding.
- Optimizer: Rewrites equivalent query plans based on optimization rules and statistical information.
- Executor: Generates a specific operator execution tree based on the query plan and executes it on physical machines.

The process of generating a query plan includes the work of the Binder, Planner, and Optimizer.

## Part 2: Binder

The Parser's job is to perform lexical analysis on SQL statement strings, identify keywords, and parse constant types. However, for non-keyword, non-constant strings, the Parser does not know their specific meanings.

The Binder, as the first step in generating a query plan, maps these non-keyword strings to actual objects within the database. The key to this step is correctness and robustness, and once completed, it generally does not require subsequent changes.

From an implementation perspective, the challenges in the Binder part include:

- In different clauses of SQL statements, binding behavior varies. For example, aggregate functions cannot appear in WHERE clauses, and only integer constants are allowed in LIMIT clauses.
- Contextual information must be considered. For instance, once a GROUP BY clause appears, only aggregate functions or column names that have appeared in the GROUP BY clause can appear in SELECT and ORDER BY clauses.

To address these issues, different Binder classes are used in different places to distinguish behaviors. However, these different Binder classes behave the same in most cases, with differences only in specific situations, such as handling aggregate functions.

The most reasonable approach is to implement a base class with most functionalities, from which other classes are derived and only need to implement a few special behaviors.

Some may wonder, since MatrixOne is implemented in Go, which does not have the concept of class inheritance. In fact, Go can also simulate the effects of class inheritance and function overloading.

```go
type Binder interface {
  BindExpr(tree.Expr, int32, bool) (*plan.Expr, error)
  BindColRef(*tree.UnresolvedName, int32, bool) (*plan.Expr, error)
  BindAggFunc(string, *tree.FuncExpr, int32, bool) (*plan.Expr, error)
  BindWinFunc(string, *tree.FuncExpr, int32, bool) (*plan.Expr, error)
  BindSubquery(*tree.Subquery, bool) (*plan.Expr, error)
  GetContext() context.Context
}

type baseBinder struct {
  ...
}

type WhereBinder struct {
  baseBinder
}

type GroupBinder struct {
  baseBinder
}

type HavingBinder struct {
  baseBinder
  insideAgg bool
}

var _ Binder = (*WhereBinder)(nil)
var _ Binder = (*GroupBinder)(nil)
var _ Binder = (*HavingBinder)(nil)
...
```

For the behavior "aggregate functions are not allowed in most clauses," we can implement the baseBinder's BindAggFunc to throw an error directly. Then, `WhereBinder` and `GroupBinder` do not implement the `BindAggFunc` method, so when calling `whereBinder.BindAggFunc`, it actually calls the first anonymous member's method, which is the baseBinder's method with the same name.

For the HAVING clause, where aggregate functions are allowed, we implement the `havingBinder.BindAggFunc` method separately.

This way, by fully utilizing the features of Go, we also achieve behavior similar to C++ where if a derived class does not implement a method, the base class method is called.

Another area prone to errors in Binder is the order of columns in the expansion result of the asterisk (\*). For example, with four tables `t1(a, b, e)`, `t2(b, c, d)`, `t3(c, d, e)`, `t4(d, e, f)`, what should be the order of columns in the following query's result?

```sql
SELECT * FROM (t1 JOIN t2 USING(b)) JOIN (t3 JOIN t4 USING(d)) USING(e, c)
```

Interested readers may try this out. DuckDB, which I referenced initially, has always had a bug in handling this issue.

**In conclusion**, the development of the Binder component in our query plan system highlighted the intricacies and challenges of memory management in Golang. Our journey offered a nuanced understanding of how Golang handles complex tasks, especially in the realm of SQL parsing and database interactions.

Stay tuned for more insightful explorations into Golang, as we continue to unravel its intricacies in our upcoming articles, diving deeper into the realms of Planner and Optimizer development. This journey into Golang's capabilities in database technology is just beginning, promising more learning and innovative solutions ahead.
