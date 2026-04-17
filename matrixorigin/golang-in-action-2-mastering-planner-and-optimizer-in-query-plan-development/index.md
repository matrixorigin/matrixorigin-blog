---
title: 'Golang in Action (2):Mastering Planner and Optimizer in Query Plan Development'
author: MatrixOrigin
mail: contact@matrixorigin.io
description: >-
  As we recap the journey of developing our query plan system, it's essential to
  highlight the pivotal transition from the foundational work on the Binder to
  the advanced stages involving the Planner and Optimizer. This shift marked a
  significant progression in both the complexity of tasks and the depth of
  technical innovation required.
tags:
  - technology
keywords:
  - MatrixOne
  - Golang
  - Cloud-Native
  - Query Plan
  - Database
publishTime: '2023-12-30 17:00:00+00:00'
image:
  '1': /content/en/shared/golang-in-action.png
  '235': /content/en/shared/golang-in-action.png
date: '2023-12-30 17:00:00+00:00'
lang: en
status: published
---

As we recap the journey of developing our query plan system, it's essential to highlight the pivotal transition from the foundational work on the Binder to the advanced stages involving the Planner and Optimizer. This shift marked a significant progression in both the complexity of tasks and the depth of technical innovation required.

This journey, from the Binder to the Planner and Optimizer, was a voyage through increasing levels of complexity and sophistication in Golang programming for database systems. Each stage brought new challenges and learning opportunities, enriching our understanding of Golang's capabilities and its application in database technology. As we continue to refine our query plan system, these experiences form a valuable repository of knowledge and skills, driving us towards more innovative and effective solutions in database engineering.

## Part 3: Planner

After binding is completed, the Planner's task is not extensive. It involves arranging different relational algebra nodes in the logical execution order of SQL statement clauses to form a query plan tree:

1. From
2. Where
3. Group by
4. Having
5. Window
6. Qualify
7. Distinct
8. Order by
9. Limit.

Is that all? Not quite. If we aim to successfully execute TPC-H, there is an important issue we missed: subqueries. During the binding phase, subqueries are recursively processed and then transformed into a special expression. In the generated query plan tree, we can also directly include subqueries, but such a plan cannot be executed by the executor!

In principle, a complete Planner must produce an executable plan, even without an optimizer. Therefore, subqueries require some additional processing. The ideal way to handle subqueries is to completely eliminate them, transforming them into various join nodes. This approach can typically reduce the time complexity from O(m \* n) to O(m + n).

However, before the famous 2015 paper "Unnesting Arbitrary Queries", there was no method to unravel all subqueries. Therefore, databases retained operators for executing unresolved subqueries in a nested fashion, typically known as apply join.

We initially examined various methods for unraveling subqueries and, considering the urgency of time and the short-term goal of just TPC-H, decided to implement only the method of lifting filter conditions on associated columns. The limitation of this method is that it cannot unravel subqueries with associated column depths greater than one, or where associated columns appear in non-equi-join conditions, but it is sufficient to cover most user scenarios.

Illustrated with an example:

```sql
SELECT ...
FROM part, partsupp
WHERE p_partkey = ps_partkey
AND ps_supplycost = (SELECT min(ps_supplycost) FROM partsupp WHERE p_partkey = ps_partkey)
```

This is an excerpt from TPC-H q2. The approach adopted by MatrixOne would generate an execution plan similar to the following:

- project: …
- join: ps_partkey = ps1.ps_partkey, ps_supplycost = min(ps1.ps_supplycost)
- join: p_partkey = ps_partkey
- scan: part
- scan: partsupp
- agg: min(ps_supplycost) group by ps1.ps_partkey
- scan: partsupp ps1

**Another example based on TPC-H q21:**

```sql
SELECT ...
FROM l1
WHERE exists (SELECT * FROM l2 WHERE l1_key = l2_key)
```

Would be expanded into:

- project: …
- semi join: l1_key = l2_key
- scan: l1
- scan: l2

## Part 4: Optimizer

For a database engine, the optimizer is an endless task. However, in the process of a version iteration, the things we can do are quite limited. Fortunately, not many optimizer rules are needed just to execute TPC-H successfully. The essential ones are only these four:

1. Column Pruning
2. And-Or Distribution Law
3. Simple Greedy Join Order
4. Aliases Defined in the SELECT Clause

Column pruning needs little explanation; without it, disk IO and memory usage can increase several-fold. The distribution law is essential for running q19, as everyone can understand by looking at the q19 below. Without implementing the distribution law, it results in a Cartesian product with filtering. Once implemented, it can be transformed into an equi-join, and multiple filter conditions can be pushed down. These two rules have very certain behaviors and do not need to be changed once written.

```sql
select
  sum(l_extendedprice* (1 - l_discount)) as revenue
from
  lineitem,
  part
where
  (
    p_partkey = l_partkey
    and p_brand = 'Brand#23'
    and p_container in ('SM CASE', 'SM BOX', 'SM PACK', 'SM PKG')
    and l_quantity >= 5 and l_quantity <= 5 + 10
    and p_size between 1 and 5
    and l_shipmode in ('AIR', 'AIR REG')
    and l_shipinstruct = 'DELIVER IN PERSON'
  )
  or
  (
    p_partkey = l_partkey
    and p_brand = 'Brand#15'
    and p_container in ('MED BAG', 'MED BOX', 'MED PKG', 'MED PACK')
    and l_quantity >= 14 and l_quantity <= 14 + 10
    and p_size between 1 and 10
    and l_shipmode in ('AIR', 'AIR REG')
    and l_shipinstruct = 'DELIVER IN PERSON'
  )
  or
  (
    p_partkey = l_partkey
    and p_brand = 'Brand#44'
    and p_container in ('LG CASE', 'LG BOX', 'LG PACK', 'LG PKG')
    and l_quantity >= 28 and l_quantity <= 28 + 10
    and p_size between 1 and 15
    and l_shipmode in ('AIR', 'AIR REG')
    and l_shipinstruct = 'DELIVER IN PERSON'
  );
```

**Let's focus on the join order.**

During the 0.5 version cycle, our metadata provided only the row count of each table, with no other statistical information, not even zonemaps. How can we determine the join order in this case? The first thought is to sort all tables by row count and join them from smallest to largest to form a right-deep tree (our executor builds a hash table on the right table and probes with the left table), avoiding Cartesian products. The goal of running 1G data TPC-H is quite lenient, and this method could execute most queries within a tolerable time frame. Except for q5…

After analysis, we found that in q5, there's a condition connecting the customer and supplier tables: c_nationkey = s_nationkey. Since both these tables are relatively small, our first version of the greedy join order algorithm joins these two tables early on. However, the cardinality of nationkey is very small, leading to the result of joining these two small tables ballooning to hundreds of millions of rows, two orders of magnitude higher than the largest table, lineitem. In subsequent join operations, this result of several hundred million rows is used more than once to build hash tables, resulting in unbearably slow execution speeds.

After further analysis, we still found a solution: the primary key constraints of TPC-H. For join order, even without any statistical information, primary key constraints are a strong indicator. No matter how large the two tables being joined, if the equi-join condition includes all the primary key columns of one table, the number of rows in the result will not exceed that of the other table. At that time, our storage engine was also being rewritten and had not yet implemented primary key constraints, so this information was initially overlooked. After identifying this issue, we quickly implemented the second version of the greedy join order:

- **Use all join conditions with primary keys to generate one or more directed trees (polytrees).**
- **For each directed tree, start from the root node, recursively process all child nodes, and then join the current node with all join nodes generated by the child nodes.**
- **For the root nodes of these directed trees, use the first version of the greedy method to generate a right-deep tree.**

The improved greedy method effectively solved the problem with q5, and the performance of q9 also improved significantly. With this, the goal of running 1G data TPC-H was successfully achieved!

## Part 5: Conclusion

This article briefly describes how we accomplished the seemingly impossible task of developing a query plan system from scratch within two to three months and successfully executed all TPC-H queries on a 1G data set. Looking back nearly a year later, we still deeply feel the hardship of the concerted effort by several colleagues, the frustration of constantly encountering problems, and the surprise of achieving our goal. This experience continues to inspire us to keep striving in the field of database foundational software.

## References

- _Unnesting Arbitrary Queries,_ [_https://btw-2015.informatik.uni-hamburg.de/res/proceedings/Hauptband/Wiss/Neumann-Unnesting_Arbitrary_Querie.pdf_](https://btw-2015.informatik.uni-hamburg.de/res/proceedings/Hauptband/Wiss/Neumann-Unnesting_Arbitrary_Querie.pdf)

- _The Complete Story of Joins (in HyPer),_ [_https://15721.courses.cs.cmu.edu/spring2018/papers/16-optimizer2/hyperjoins-btw2017.pdf_](https://15721.courses.cs.cmu.edu/spring2018/papers/16-optimizer2/hyperjoins-btw2017.pdf)

- _Orthogonal Optimization of Subqueries and Aggregation,_ [_https://www.comp.nus.edu.sg/~cs5226/papers/subqueries-sigmod01.pdf_](https://www.comp.nus.edu.sg/~cs5226/papers/subqueries-sigmod01.pdf)

- _Query Optimization Technology for Correlated Subqueries,_ [_https://www.alibabacloud.com/blog/query-optimization-technology-for-correlated-subqueries_597644_](https://www.alibabacloud.com/blog/query-optimization-technology-for-correlated-subqueries_597644)

- _DuckDB,_ [_https://github.com/duckdb/duckdb_](https://github.com/duckdb/duckdb) _and_ [_https://duckdb.org/news/_](https://duckdb.org/news/)
