---
title: 'What is the Binder in Database Kernels: A useful guide might helps you.'
author: Ou Yuanning
mail: ouyuanning@matrixorigin.io
description: >-
  A database is a "warehouse that organizes, stores, and manages data according
  to data structure." It is a collection of large amounts of data that are
  organized, shareable, and uniformly managed, and stored long-term in a
  computer.
tags:
  - technology
keywords:
  - MatrixOne
  - Database
  - Distributed Database
  - HTAP Database
  - Database Kernel
publishTime: '2024-01-18 17:00:00+00:00'
image:
  '1': >-
    /content/en/what-is-the-binder-in-database-kernels-a-useful-guide-might-helps-you/what-is-the-binder-in-database-kernels-a-useful-guide-might-helps-you.png
  '235': >-
    /content/en/what-is-the-binder-in-database-kernels-a-useful-guide-might-helps-you/what-is-the-binder-in-database-kernels-a-useful-guide-might-helps-you.png
date: '2024-01-18 17:00:00+00:00'
lang: en
status: published
---

## The Internal Processing Flow and the Position of Binder in a Database

A database is a "warehouse that organizes, stores, and manages data according to data structure." It is a collection of large amounts of data that are organized, shareable, and uniformly managed, and stored long-term in a computer.

The external service process of a database typically involves: parsing the inputted Structured Query Language (SQL), performing internal data operations based on the parsing results, and finally returning response information (usually error messages or the queried data set).

The internal execution process of a database that provides services over a network can be simply understood as follows:

![](/content/en/what-is-the-binder-in-database-kernels-a-useful-guide-might-helps-you/picture1.jpg)

The Listener, Codec, Protocol modules in the diagram are common modules of a general network server. Database systems typically use custom protocols to unpack, pack, and transmit network packets, which is not discussed in detail here

The other parts in the diagram are the main modules of the database kernel. Brief descriptions of these modules are as follows:

![](/content/en/what-is-the-binder-in-database-kernels-a-useful-guide-might-helps-you/picture2.jpg)

> Note:
>
> 1.  The term "metadata" here is a broad concept, which may include metadata of the operating system, database system, current session, and the context of the current request, among others.
> 2.  The transaction executor refers to specific Structs, Classes, etc., that can retrieve and modify visible data based on the transaction isolation level and the current transaction status.

## The Main Responsibilities

From the execution sequence of the database kernel, it is evident that the Binder is a critical module in the database kernel. It acts as the connecting module from what the user wants to do to how the database kernel should do it.

- The user's intentions are expressed through the input SQL, which is converted into an Abstract Syntax Tree (AST) before reaching the Binder.
- The way the database kernel processes is represented by the final execution plan, known as the Physical Plan.

Therefore, the main work of the Binder can be understood as: Based on the input Abstract Syntax Tree structure compliant with SQL syntax, it uses various types of metadata of the current database system to verify the semantic legality (for example, confirming the existence of tables through Schema information, the existence of functions through function registration information, the meaning of columns through node context, etc.), and then constructs corresponding logical execution nodes according to the actual execution flow of the database kernel, to facilitate subsequent optimization, compilation, and execution.

Since the **final output of the Binder ultimately serves execution**, it is first necessary to understand the execution logic of the database kernel during the execution phase (Executor execution stage), to **determine what we need to output**. After determining the output, we then look at the steps and challenges from AST to this output.

## Understanding Binder's Output Through Pseudocode

Due to the different execution models used by various database kernels, the organization of their logical plans differs. For example, the Volcano model tends to use a tree of execution nodes as its input during execution; whereas the Push model tends to compile into an array of parallel execution pipelines before execution.

Regardless of the model used, database systems are designed to extract data from stored data units based on user-defined requirements (SQL), and then perform operations like filtering, grouping, sorting, and extracting to obtain the final result set (insert/update/delete can be understood as another data operation after obtaining the result set). Therefore, we don't need to focus specifically on which execution model the kernel uses; we can deduce what the Binder's output should look like from the data operation process (which can be simulated with pseudocode).

Let's take a relatively complex single-table query statement as an example and examine the steps required to execute this SQL statement through handwritten code.

Let's assume the table structure is as follows:

```sql
create table t1(a int, b int, c int, d int);
```

The SQL to be executed:

```sql
select a, sum(d) as sum_d from t1 where abs(b) > 5 group by a, c having sum_d > 10 order by sum_d limit 3 offset 2
```

Pseudocode for the entire process from data retrieval to result set output:

```go
//0 Retrieve the current transaction is visible data from the transaction executor
rows = txn_operator.get_rows_you_can_see()

//1 Filter the data, resulting columns include: a, b, c, d var after_filter_rows
for row in rows {
    if abs(row.b) > 5 {
        after_filter_row.push(row);
    }
}

//2.1  Group and sum the data,
hash_sum = hashmap<(int, int), int64>
for row in after_filter_rows {
    hash_sum[(a, c)] += row.d
}
//2.2Return the result set after group sum, resulting columns include：a,c,sum_d
var after_agg_rows;
for (a,c), sum_d in hash_sum {
    after_agg_rows.push({a, c, sum_d})
}

//3 Continue to filter data, output columns unchanged
var after_agg_filter_rows
for row in agg_rows {
    if row.sum_d > 10 {
        after_agg_filter_rows.push(row)
    }
}

//4 Sort, output columns unchanged
after_sort_rows = sort_by_fields(after_agg_filter_rows, ["sum_d"])

//5 Skip 2 rows, output columns unchanged
after_offset_rows = skip_some_rows(after_sort_rows, 2)

//6 Fetch 3 rows, output columns unchanged
after_limit_rows = fetch_some_rows(after_offset_rows, 3)

//7 Extract the required columns as the return result, resulting columns include a, sum_d
result_rows = []row
for row in after_limit_rows {
      result_rows.push({row.a, row.sum_d})
}
```

From the pseudocode, we can see that a query operation, from reading data to returning the result set, is actually composed of various submodules each fulfilling specific computational requirements.

These computational submodules are referred to as operators during execution, and as computational nodes during the Bind stage.

For the Binder, its output is the combination of these computational nodes. We can refer to the execution flow of the pseudocode and output these computational nodes in the form of a tree structure or an array. Such output can clearly express the logic of the execution phase and be used in subsequent stages of the database kernel.

## Binder's Execution Sequence and Output

When the Binder performs binding operations on the AST, there is a specific execution sequence. This sequence is based on the order in the pseudocode because only by following this order can we verify the correctness of the semantics based on the context information of the current node.

Consider the SQL query:

```sql
   create table t1(a int, b int);

   select a, b, sum(c) from t1 group by a;
```

Why does this error occur, stating that `b` is not in the group by clause or an aggregate function? From the above pseudocode execution process, we can understand that：

1. The binding of the group by clause must be executed first, followed by the binding of the select clause.
2. After binding, the group by clause changes the output columns to only include the grouped columns and the results of aggregate functions (like in this case, only `a`, `sum(c)` remain).
3. When binding the select clause later, it can only see the `a` column and `sum(c)` column output by the above computational nodes, without the `b` column. Therefore, it should produce an error, otherwise, this column would not be found during execution.

Based on the execution order in the pseudocode, in most cases, the binding order of each clause and the corresponding computational nodes are as follows:

![](/content/en/what-is-the-binder-in-database-kernels-a-useful-guide-might-helps-you/picture3.jpg)

There are some more complex clauses and computational nodes/operators (such as union, window functions, etc.), which are not discussed in detail here. Let us know if you are interested in more comprehensive information, we would explain these in later articles in detail.

## Issues and Solutions During the Binding Process

**Issues with Different Support for Expressions (Expr) in Various Clauses**

Due to different contexts in various clauses, there are differences in the types of expressions supported.

For example:

```sql
select a, b from t1 order by 2
```

The constant expression '2' means to sort by the second column of the current projection (Projection). In other clauses, it would just be a normal numeric constant '2'.

Generally, when binding expressions in different clauses, it is important to note:

- Whether list expressions are supported. For example, the limit clause does not support list expressions.
- Whether aggregate functions are supported. For example, the where clause does not support aggregate functions, which should be placed in the having clause.
- Whether window functions are supported. Most clauses do not support window functions, which should be handled in the select clause.
- Whether subqueries are supported. For example, the limit clause does not support subqueries.

When binding expressions, it's necessary to handle them based on the type of the current clause. A base class can be established for handling common Bind Expr operations, and subclasses of different clauses can deal with specific cases.

Currently, MO (MatrixOne) implements a Binder interface, and each clause implements its own Binder for processing. The corresponding Binder interface is as follows:

```go
type Binder interface {
  BindExpr(tree.Expr, int32, bool) (*plan.Expr, error)
  BindColRef(*tree.UnresolvedName, int32, bool) (*plan.Expr, error)
  BindAggFunc(string, *tree.FuncExpr, int32, bool) (*plan.Expr, error)
  BindWinFunc(string, *tree.FuncExpr, int32, bool) (*plan.Expr, error)
  BindSubquery(*tree.Subquery, bool) (*plan.Expr, error)
  GetContext() context.Context
}
```

## How to Precisely Locate a Specific Column

For non-Source type computational nodes, their input includes the dataset processed by the previous computational node. When locating a specific column in the dataset, it can be found by name, relative position (which column), or absolute position (the global ID of the column).

Assume there is a table `t1`:

```sql
create table t1(a int, b int, c int);
```

Execute SQL：

```sql
select a from t1 where b > 0;
```

For the `TableScan` node, without column pruning, it will return a dataset with three columns (`a`, `b`, `c`) to the subsequent nodes.

For the Filter node, to express the `b` column in `b > 0`, it can:

- Include column names in the dataset returned by `TableScan`; then the Filter node can find the corresponding column by the column name "b"
- During Bind Filter, instruct the Filter node to use the data from the 2nd column in the upstream dataset.
- During Bind TableScan, assign a global column id to each column. During Bind Filter, tell the Filter node to use the global column id of the b column to find the corresponding column in the upstream dataset.

Using column names requires handling issues of column name overlap, which is generally less used.

Using global column IDs is more convenient during the optimizer phase, while relative positions are more efficient during the execution phase.

The Binder and Optimizer stages can also use global IDs, with the Optimizer eventually converting the global ID to a relative position for more convenient use during the execution phase. This is also the approach our product used.

## Handling Function Binding

Generally, the specific implementation of a function is related to the type of its input parameters.

For instance, for the implementation of the abs function, if the input parameter is of type `int8`, it has a specific implementation; if the input is `int64`, there is another specific implementation. (These specific implementations are referred to as function overloads).

In the Bind phase, should we determine the specific overload, or just check if the function name is registered?

If the specific overload is determined during the Bind phase, the execution efficiency would be higher. However, for SQL queries like: `select * from t1 where a > ? and b < @var`, where the types of expressions such as? and `@var` are determined only at execution time, special handling is required.

If only the name is determined during the Bind phase and the specific function overload is finalized during execution, the function needs to be bound only once. However, this often sacrifices a bit of execution efficiency.

## Others

Of course, there are many other topics that can be further discussed, such as whether the logical plan should be a tree structure or a DAG structure? Where is the boundary between Binder and Optimizer, and should the binding process definitely not execute any optimization rules? Should the Parser reserve some information in advance for the Binder to simplify the binding process and improve performance? What information should the Binder reserve in advance for the Optimizer, etc.?

The above is a brief introduction to the Binder in the database kernel. Each database system adjusts and optimizes the implementation of the Binder according to its own design and requirements.

You can refer to the source code of the database projects you are familiar with and review their execution models to gain a clearer understanding of the implementation of the Binder component.
