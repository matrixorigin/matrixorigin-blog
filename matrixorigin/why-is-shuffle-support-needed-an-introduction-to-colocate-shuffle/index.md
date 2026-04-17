---
title: Introduction to Colocate Shuffle
author: Ni Tao
mail: nitao@matrixorigin.io
description: >-
  Although the execution plan of shuffle on multiple CNs can reduce the overhead
  of hash tables, it may also increase the cost of data transmission over the
  network. A good shuffle execution plan must minimize data transmission over
  the network as much as possible. Therefore, the introduction of colocate
  shuffle optimization is crucial for performance.
tags:
  - technology
keywords:
  - MatrixOne
  - Database
  - Database Kernel
  - shuffle
  - HTAP Database
publishTime: '2024-03-19 17:00:00+00:00'
image:
  '1': >-
    /content/en/why-is-shuffle-support-needed-an-introduction-to-colocate-shuffle/introduction-to-colocate-shuffle.png
  '235': >-
    /content/en/why-is-shuffle-support-needed-an-introduction-to-colocate-shuffle/introduction-to-colocate-shuffle.png
date: '2024-03-19 17:00:00+00:00'
lang: en
status: published
---

Although the execution plan of shuffle on multiple CNs can reduce the overhead of hash tables, it may also increase the cost of data transmission over the network. A good shuffle execution plan must minimize data transmission over the network as much as possible. Therefore, the introduction of colocate shuffle optimization is crucial for performance.

## The Need for Colocate Shuffle: An Example

Taking tpch1T, q4 as an example again. The lineitem table outputs approximately 3.8 billion rows, and the orders table outputs about 50 million rows. If a broadcast join is used, the hash table is too large to handle, and broadcasting a hash table of 50 million rows is not a low cost either. If a normal shuffle join is used, on 3 CNs, the amount of data that needs to be transmitted over the network can be calculated as approximately (3.8 billion + 50 million) / 3 \* 2, about 2.6 billion rows. Although the hash table is smaller, the cost of network transmission is too high, and the performance would decrease to an unacceptable level. At this point, using colocate shuffle join is the best choice.

The specific principle of colocate shuffle join is to start from the scan, using the block zonemap to distribute data to the corresponding CNs and ensure as much as possible that the subsequent shuffle algorithm will shuffle data to the current CN for processing, minimizing data transmission across the network.

In this example, the optimizer will instruct the scan operator that data in the block zonemap between 1 and 2 billion are to be read on CN1, between 2 and 4 billion on CN2, and between 4 and 6 billion on CN3.

At the same time, the optimizer will instruct the shuffle join that data between 1 and 2 billion need to be shuffled to CN1 for processing, between 2 and 4 billion shuffled to CN2, and between 4 and 6 billion processed on CN3.

If each CN has 10 cores, then specifically for CN1, data between 1 and 2 billion are processed on the first pipeline, 2 to 4 billion on the second pipeline, and so on. For CN2, data between 20 and 22 billion are processed on the first pipeline, 22 to 24 billion on the second pipeline, and so on. For CN3, data between 40 and 42 billion are processed on the first pipeline, 42 to 44 billion on the second pipeline, and so on.

At this point, only a very small number of blocks need to be transmitted across the network because their data just happens to cross the boundaries of shuffle.

For example, a block zonemap of 1.9 to 2.1 billion might be read on CN1, with part of the 8192 rows read to be computed on CN1 and part to be sent to CN2 for computation.

Since the l_orderkey column is a primary key, TAE (MO's storage engine) ensures the sorting of the primary key in S3 files. There should be very little overlap between blocks, so the data that needs to be transmitted across the network should be minimal.

It is evident that to enable colocate shuffle, it must be range shuffle. If hash shuffle is used, colocate shuffle cannot be enabled.

**Another optimization of colocate shuffle** is that for the vast majority of blocks, it can be directly determined through the zonemap that this block can be shuffled entirely into a specific bucket, without the need to read, calculate, and reassemble every row into a new batch.

In this case, colocate shuffle join introduces almost no new overhead but reduces the cost of broadcasting hash tables compared to broadcast join, significantly reducing the cost of cache misses caused by random access to hash tables. In practice, the performance in multi-CN scenarios is almost more than ten times that of broadcast join.

Moreover, colocate shuffle join has good multi-CN scalability, achieving linear scaling and even exceeding linear scalability in some scenarios.

Colocate shuffle significantly enhances performance in distributed scenarios, but the specific degree of improvement is related to the data's orderliness and the overlap between blocks. Typically, primary keys or clusterby columns, which have good orderliness, yield the greatest improvement, while in other cases, colocate shuffle may degrade to a normal shuffle.

Additionally, since join applies the same shuffle strategy to both sides, it is possible for both sides to enable colocate or for only one side to be able to enable colocate. Because the join order strategy always places the smaller table on the build side, it is common to prioritize enabling colocate for the table on the probe side.

## MO's Support for Colocate Shuffle Join

Currently, MO's support for colocate shuffle join is automatically identified and calculated by the optimizer. Compared to similar databases, the advantage is that it does not rely on manually collected statistics, does not require DDL modifications, has no restrictions on the number of computing nodes (CNs) or concurrency, can automatically calculate a new shuffle execution plan when scaling in or out, and does not require any additional configuration or adjustment by the user, thereby achieving a completely transparent operational experience.

## Key Considerations for Effective Colocate Shuffle Join

- **Statistical Information**: Colocate shuffle join must use range shuffle, relying on accurate stats for a reasonable shuffle strategy.
- **Partitioning Strategy**: It does not rely on the partitioning strategy of partitioned tables, supporting any table without requiring DDL changes by the user.
- **Column Limitations**: It is not limited to specific columns, allowing flexibility in shuffle operations based on different joining conditions.
- **Shuffle Buckets and CN Scalability**: The number of shuffle buckets adapts to the scenario, supporting changes in the number of CNs without user intervention.

The first execution might involve a 3CN10-core scenario, requiring shuffle into 30 buckets, while the next execution could be a 5CN10-core scenario, requiring 50 buckets.

Taking the tpch1T lineitem table as an example again, MO will automatically calculate a new shuffle strategy, with the first bucket handling 100 to 120 million, the second bucket handling 120 to 240 million, and so on.

In the next execution, it might change to a 7CN8-core scenario, and MO will still automatically calculate a new shuffle strategy.
