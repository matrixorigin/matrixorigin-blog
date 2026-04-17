---
title: Advanced Shuffle Optimization Techniques — Join reorder
author: Ni Tao
mail: nitao@matrixorigin.io
description: >-
  The execution plan for shuffle is a very important part of the optimizer. Due
  to space limitations, only some key aspects have been introduced here. For
  more details and related implementation code, feel free to directly check the
  MatrixOne source code.
tags:
  - technology
keywords:
  - MatrixOne
  - Database
  - Database Kernel
  - shuffle
  - TPCH Testing
publishTime: '2024-04-12 17:00:00+00:00'
image:
  '1': >-
    /content/en/advanced-shuffle-optimization-techniques-join-reorder/advanced-shuffle-optimization-techniques-join-reorder.jpg
  '235': >-
    /content/en/advanced-shuffle-optimization-techniques-join-reorder/advanced-shuffle-optimization-techniques-join-reorder.jpg
date: '2024-04-12 17:00:00+00:00'
lang: en
status: published
---

In query optimization, cost is the standard for assessing the quality of an execution plan, typically representing the execution time or the amount of database system resources used, including CPU, IO, and network resources.

In a single-machine execution, the cost model usually only needs to consider CPU and IO.

However, in distributed scenarios, besides considering the costs of CPU and IO, it is also necessary to consider the costs of network transmission, query parallelism, and some distributed-specific optimization scenarios, such as the cost calculation of bloom filters.

These factors fundamentally increase the complexity of designing and fitting distributed cost models, and to some extent, the complexity of the entire distributed query optimization process.

Essentially, an optimal join order for a single machine may not be optimal in a distributed state.

To address the complexity introduced by distributed query optimization, similar to most industry solutions, MO's optimizer adopts a two-phase distributed query optimization approach.

It first uses a single-machine join order algorithm to find an optimal execution plan for a single machine. Then, it performs a second scan of the execution plan to determine the distributed execution plan for each operator, whether to use merge group or shuffle group, and whether to use broadcast join or shuffle join.

During this process, it will also undergo multiple recursive scans to determine whether to enable colocate shuffle, whether to use hybrid shuffle, and whether the conditions for shuffle reuse are met, among others.

Taking `tpch1T` Q10 as an example, the optimal execution plan obtained in a single-machine environment, and the execution plan found in a distributed scenario after incorporating a shuffle execution plan are as follows:

![](/content/en/advanced-shuffle-optimization-techniques-join-reorder/picture1.jpg)

The left side represents the optimal execution plan in a single-machine scenario.

The key is the lineitem table, the largest table. Joining all other tables first and then joining the lineitem table can minimize the volume of lineitem data, avoiding joins with large tables first.

However, after incorporating the shuffle into the search space, the right side becomes the more optimal execution plan.

First, directly join lineitem and orders. This join can enable colocate shuffle join on both sides, achieving the best performance.

Second, place the join result set of customer and nation on the left side of the parent node join, which can preserve the order of customers in the output.

At this point, the group node can directly reuse the shuffle of the join node, avoiding redundant shuffles.

In practice, the new execution plan improves performance by about double in a distributed scenario compared to the original execution plan.

```sql
QUERY PLAN
Project
  ->  Sort
        Sort Key: sum(lineitem.l_extendedprice * (1 - lineitem.l_discount)) DESC
        Limit: 20
        ->  Aggregate
              Group Key: customer.c_custkey, customer.c_name, customer.c_acctbal, customer.c_phone, nation.n_name, customer.c_address, customer.c_comment shuffle: REUSE
              Aggregate Functions: sum((cast(lineitem.l_extendedprice AS DECIMAL128(38, 2)) * (1 - cast(lineitem.l_discount AS DECIMAL128(38, 2)))))
              ->  Join
                    Join Type: INNER
                    Join Cond: (customer.c_custkey = orders.o_custkey) shuffle: range(customer.c_custkey)
                    ->  Join
                          Join Type: INNER   hashOnPK
                          Join Cond: (customer.c_nationkey = nation.n_nationkey)
                          ->  Table Scan on tpch_10g.customer
                          ->  Table Scan on tpch_10g.nation
                    ->  Join
                          Join Type: INNER   hashOnPK
                          Join Cond: (lineitem.l_orderkey = orders.o_orderkey) shuffle: range(lineitem.l_orderkey)
                          ->  Table Scan on tpch_10g.lineitem
                                Filter Cond: (lineitem.l_returnflag = 'R')
                          ->  Table Scan on tpch_10g.orders
                                Filter Cond: (orders.o_orderdate < 1993-06-01), (orders.o_orderdate >= 1993-03-01)
                                Block Filter Cond: (orders.o_orderdate < 1993-06-01), (orders.o_orderdate >= 1993-03-01)
```

## Summary

The execution plan for shuffle is a very important part of the optimizer. Due to space limitations, only some key aspects have been introduced here. For more details and related implementation code, feel free to directly check the MO source code.
