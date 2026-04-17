---
title: TAE-MatrixOne Cloud Native Transaction and Analytics Engine
author: Xu Peng
mail: xupeng@matrixorigin.io
description: >-
  MatrixOne is a cloud native database that not only supports high-performance
  analytical queries on ultra-large-scale datasets, but also has
  high-throughput, low-latency transactional read and write capabilities. This
  paper introduces the architecture of TAE (Transactional Analytical Engine),
  the storage engine of MatrixOne database.
tags:
  - technology
keywords:
  - MatrixOne
  - Database
  - Relational Database
  - Distributed
  - HTAP Database
publishTime: '2023-11-29 17:00:00+00:00'
image:
  '1': >-
    /content/en/tae-matrixone-cloud-native-transaction-and-analytics-engine/tae-matrixone-cloud-native-transaction-and-analytics-engine.png
  '235': >-
    /content/en/tae-matrixone-cloud-native-transaction-and-analytics-engine/tae-matrixone-cloud-native-transaction-and-analytics-engine.png
date: '2023-11-29 17:00:00+00:00'
lang: en
status: published
---

## Part 1 Overview

MatrixOne is a cloud native database that not only supports high-performance analytical queries on ultra-large-scale datasets, but also has high-throughput, low-latency transactional read and write capabilities. This paper introduces the architecture of TAE (Transactional Analytical Engine), the storage engine of MatrixOne database. The [previous article](https://medium.com/@matrixorigin-database/transactional-analytical-engine-25e4e894ad75) introduced the design of stand-alone TAE, **and this article will focus on several key components related to cloud native and storage-accounting separation**.

For Example:

- TAE can manage data much larger than the local storage capacity. Both local memory and disk can be used as caches to hold only the most recently accessed data;
- TAE can load a full copy of the data on a new node at little cost. This is important for service HA and compute resources isolation.

## Part 2 LogService

To minimize write latency, TAE persists the latest data into the log, then asynchronously dumps it into the object store. Therefore, TAE is able to ensure the persistence of committed transactions by collaborating with logging and object storage.TAE abstracts the logging layer and can access any LogService at a very small cost. The default access is our own LogService.

LogService core requirements are the following:

- High throughput
- Low Latency
- High reliability
- High Availability

Log stores the data from the latest committed transaction, and when this data is dumped asynchronously to the object store, the associated log is also deleted. You can consider the log as a sliding window on the timeline, TAE pushes the window forward, data outside the window is cleared, and the TAE ensures that the amount of data which falls inside the window not to be very large. Therefore, there is no need to configure a large disk for the LogService.

![](/content/en/tae-matrixone-cloud-native-transaction-and-analytics-engine/picture1.jpg)

## Part 3 TN(Transaction Node)

In the write process, the TAE writes the commit transaction to the log and asynchronously dumps it to the object store. All this happens at the TN(TN in the following diagram, we have changed the name to TN in 1.0.0-RC1 version).

![](/content/en/tae-matrixone-cloud-native-transaction-and-analytics-engine/picture2.jpg)

The above figure shows the state of TN after performing some write operations — the top one is the memory state machine, the middle one is the log, and the bottom one is the object store:

The first transaction adds metadata Block-1, and inserts lines A and B to Block-1. the transaction commit log is LSN = 1;

The second transaction inserts a line C to Block-1. the transaction commit log is LSN=2;

The third transaction persists Block-1 to the object store and modifies the Block-1 metadata to add location="1", producing a second version of the Block. The transaction commit log is LSN=3.

The TN state machine is committed to dumping the data in the log onto the object store, but the order of dumping is not entirely dependent on the monotonicity of the transaction log, as shown below:

![](/content/en/tae-matrixone-cloud-native-transaction-and-analytics-engine/picture3.jpg)

LSN\[11–17]'s have been dumped, but LSN\[3–4,7–10] are still in the in-memory state machine (for reasons explained in the standalone TAE article). This is only a temporary state, and TN will drive the window of logs ever forward according to a specific policy.

![](/content/en/tae-matrixone-cloud-native-transaction-and-analytics-engine/picture4.jpg)

TN will select a transaction as a snapshot candidate at an appropriate time, and wait for all transactions before this candidate to be dumped, and then save it as a snapshot using the timestamp of this candidate as the timestamp of the snapshot. When the snapshot is generated, all the logs before that transaction can be cleaned up:

![](/content/en/tae-matrixone-cloud-native-transaction-and-analytics-engine/picture5.jpg)

Here we refer all logs after the snapshot as LogTail. e.g., in the above figure, before "ckp-1" is generated, LSNs \[1–17] are all LogTail. After the TN fails, we only need to read the latest snapshot from the object storage and LogTail from the LogService to recover the complete state machine.

## Part 4 CN(Compute Node)

Distributed TAE includes not only the TN, but also the CN which is responsible for coordinating the load of all queries. When a new CN is added to the cluster, it fetches snapshots and LogTail information from the TN and maintains an in-memory state machine. Data files are pulled from the object store on demand and saved in cache as needed. This design eliminates the need to pull a large number of data files prior to querying and fulfills the need for highly resilient CNs.

**Examples:**

Join a CN to the cluster, at this point the TN's state can be described as \[1,150] according to the transaction timestamp, showing that it has data from all transactions between timestamps 1 and 150.

**TN's state consists of the following set of three parts:**

- Snapshot \[0,100], which contains six data blocks ["block-1", "block-2", "block-3" "block-4", "block-5", "block-6"]
- Persistent data block "block-7" [115, 140]
- In-memory data block "block-8" [120, 150]

At this point the newly joined CN state can be described as [0, 0]

![](/content/en/tae-matrixone-cloud-native-transaction-and-analytics-engine/picture6.jpg)

**CN receives a query request, assuming the request has a timestamp of 118:**

1. CN checks the current state machine state is [0, 0], and the maximum timestamp is less than 118;
2. CN sends a read request to TN for a LogTail between 0 and 118;
3. CN receives the response from TN and applies the LogTail to the local state machine;
4. Update the state of the CN state machine to [1, 118];
5. Starts the query.

![](/content/en/tae-matrixone-cloud-native-transaction-and-analytics-engine/picture7.jpg)

**CN receives a query request with a timestamp of 130:**

1. CN checks the current state machine state is [1, 118], and the maximum timestamp is less than 118;
2. CN sends a read request to TN for a LogTail between 118 and 130;
3. CN receives the response from TN and applies the LogTail to the local state machine;
4. Update the state of the CN state machine to [1, 130];
5. Starts the query.

![](/content/en/tae-matrixone-cloud-native-transaction-and-analytics-engine/picture8.jpg)

## Part 5 Cooperative Work

MatrixOne supports dynamic expansion of CN as well as multiple TNs (dynamic expansion is not supported at the moment).

When defining the table structure, you can specify partition keys to distribute the table data over multiple TNs. Each CN table data contains data from multiple TN partitions, which facilitates some cross-partition queries.

![](/content/en/tae-matrixone-cloud-native-transaction-and-analytics-engine/picture9.jpg)

**Looking at the responsibilities of the TN, there are three main points:**

1. Submitting transactions
   1. Conflict detection
   2. Write logs
   3. Apply transaction to state machine
2. Provide LogTail service to CN
3. Dump the latest transaction data into the object store and drive the log window

The user's computational load will not be dispatched to the TNs, and we believe the number of TNs under the current architecture can be controlled to a limited number, or even a single TN can satisfy most of the demands. By expanding the number of CNs, the performance of the system can be improved.

## Part 6 Conflict Detection

Before a transaction is committed to TN, a conflict detection based on the transaction start timestamp is done in the workspace of CN, and after it is committed to TN, it will only be done with the incremental data generated within the transaction start timestamp to the latest timestamp.

**>>> For Example**

When CN processes the write request of transaction Txn-[t1], it will do a conflict detection based on timestamp t1

CN submits Txn-\[t1] to TN, TN does a conflict detection with the writeset of Txn-\[t1] and the writeset generated by \[t1,now].

Incremental conflict detection mechanism, which can improve the throughput capacity of TN processing transactions, will not gradually decline with the growth of table data.

## Part 7 Large Transaction

Large transactions typically take up a lot of memory and are likely to result in less efficient conflict detection. LogTail for committing and synchronizing large transactions also tends to make TN a bottleneck.

Large transactions are supported here in three ways:

1. CN builds the relevant indexes for the data of the transaction and writes them to the object store before committing the transaction, and only the relevant metadata is committed to TN;
2. TN utilizes the relevant indexes to accelerate detection when committing the transaction;
3. TN updates only the metadata when committing transactions.
