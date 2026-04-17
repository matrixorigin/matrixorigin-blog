---
title: >-
  Revolutionizing Data Integrity(1): Advanced Pessimistic Transactions in
  Distributed Databases
author: MatrixOrigin
mail: contact@matrixorigin.io
description: >-
  Previously, MatrixOne only supported optimistic transactions based on SI. It
  now supports pessimistic transactions and the RC (Read Committed) isolation
  level. Transactions with RC and SI can run concurrently in a single MatrixOne
  cluster.
tags:
  - technology
keywords:
  - MatrixOne
  - Database
  - Distributed Database
  - Cloud-Native
  - Database Kernel
publishTime: '2024-01-12 17:00:00+00:00'
image:
  '1': /content/en/shared/revolutionizing-data-integrity.png
  '235': /content/en/shared/revolutionizing-data-integrity.png
date: '2024-01-12 17:00:00+00:00'
lang: en
status: published
---

We hope this article offers you valuable insights into how these transactions work and how they can benefit your data management strategies.

## 1. A Bit Background Info about MatrixOne Transaction Features

Previously, MO only supported optimistic transactions based on SI (Snapshot Isolation).details of MatrixOne.  
It now supports pessimistic transactions and the RC (Read Committed) isolation level. Transactions with RC and SI can run concurrently in a single MO cluster.  
Optimistic and pessimistic transactions cannot run simultaneously; the cluster must use either the pessimistic or optimistic transaction model.

## 2. MatrixOne Transactions

A MatrixOne cluster consists of three built-in services: CN (Compute Node), TN (Transaction Node), LogService, and an external object storage service.

### 2.1. CN (Compute Node)

The compute node, where all the heavy work in MO is done. Each transaction client (JDBC, mysql client) establishes a connection with a single CN. Transactions initiated on this connection are created on the corresponding CN. Each transaction creates a workspace on the CN to store temporary data written by the transaction. Upon transaction commit, the temporary data written in the workspace is sent to the TN node for commit processing.

### 2.2. TN (Transaction Node)

Transaction Node, where all transactions from CNs are submitted. TN is responsible for writing the commit logs of transactions to LogService and writing commit data to memory. When memory growth meets certain conditions, memory data is committed to object storage, and the corresponding logs in LogService are simultaneously cleared.

### 2.3. LogService

The log node, which can be considered as the TN node's WAL (Write-Ahead Logging). LogService uses the Raft protocol to store logs in multiple copies (default is three), providing high availability and strong consistency. MO can restore TN nodes anytime and anywhere through LogService.

The logs stored in LogService will not grow indefinitely. When the size of the logs reaches a certain threshold, TN will write the data corresponding to the logs in LogService to external object storage and truncate the logs in LogService.

MO refers to the data stored in LogService as LogTail. Therefore, the data in object storage plus LogTail constitutes all the data of the MO database.

### 2.4. Clock Scheme

MO's clock scheme uses HLC (Hybrid Logical Clocks), integrated with the built-in MORPC, to synchronize clocks between CNs and TNs. Due to space constraints, HLC will not be elaborated here.

### 2.5. Transaction Read Operations

Transaction read operations occur on CN nodes. The versions of data visible under MVCC (Multi-Version Concurrency Control) depend on the transaction's SnapshotTS (Snapshot Timestamp).

Once the transaction's SnapshotTS is determined, a complete dataset needs to be visible. The complete dataset comprises two parts: one in object storage and the other in LogTail, with this portion residing in the memory of TN.

Reading data from object storage can be done by directly accessing object storage, and CN provides a cache to speed up the reading of this data.

Reading data from LogTail, prior to version 0.8, required forced synchronization with TN based on SnapshotTS to obtain the necessary LogTail data, known as Pull mode. Under Pull mode, synchronization with TN for LogTail only occurs after a transaction starts, and the LogTail transferred in different transactions often contains repetitive data. Evidently, the performance of Pull mode is relatively poor, with high latency and low throughput.

Starting with version 0.8, MO implemented Push mode. Synchronization of LogTail is no longer initiated at the start of a transaction. It has been changed to a CN-level subscription method, where TN synchronizes the incremental LogTail to the subscribed CNs whenever there is a change in LogTail.

In Push mode, each CN continuously receives LogTail pushed from TN, and maintains a memory data structure similar to TN (organized in MVCC fashion) and a timestamp for the last consumed LogTail. Once a transaction's SnapshotTS is determined, the CN just needs to wait until the timestamp of the last consumed LogTail is greater than or equal to SnapshotTS, which means the CN has a complete dataset for that SnapshotTS.

### 2.6. Data Visibility

What data a transaction can read depends on the transaction's SnapshotTS.

If every transaction uses the latest timestamp as its SnapshotTS, then the transaction will definitely be able to read any data committed before this transaction. This way, the data seen is the freshest, but this comes at a cost to performance. In Pull mode, it's necessary to wait for all transactions before SnapshotTS to be committed on the TN node while synchronizing LogTail. The newer the SnapshotTS, the more commits need to be waited for, resulting in greater delay.

In Push mode, the CN node needs to wait for the LogTail of the committed transactions before SnapshotTS to be consumed. The newer the SnapshotTS, the more commits need to be waited for, resulting in greater delay.

However, often we do not need to always see the latest data. MO currently offers two levels of data freshness:

1. Always seeing the latest data, using the current timestamp as SnapshotTS.
2. Using the timestamp of the largest LogTail consumed by the current CN node as SnapshotTS.

For the second method, the advantage is that transactions have no delay and can immediately start reading and writing data, as all the required LogTail is already available, resulting in good performance and low latency. However, the problem is that multiple transactions on the same database connection may not see the write operations of a previous transaction. This is because when the later transaction starts, TN has not yet pushed the committed LogTail of the previous transaction to the current CN, leading the later transaction to use an earlier SnapshotTS, thus not seeing the previous transaction's write.

To address this issue, MO maintains two timestamps: one is the CommitTS of the last transaction in the current CN, called CNCommitTS, and the other is the CommitTS of the last transaction in the current session (database connection), called SessionCommitTS. Two levels of data visibility are provided (we refer to the timestamp of the largest LogTail consumed by the current CN as LastLogTailTS):

1. Session-level data visibility, using Max(SessionCommitTS, LastLogTailTS) as the transaction's SnapshotTS, ensuring the visibility of data from transactions occurring in a session.
2. CN-level data visibility, using Max(CNCommitTS, LastLogTailTS) as the transaction's SnapshotTS, ensuring the visibility of data from transactions occurring on the same CN.

### 2.7. Conflict Resolution

MO's previous transaction model was optimistic, with all conflict resolution occurring at the Commit stage, handled by TN. The conflict resolution is relatively straightforward and won't be elaborated here; it mainly involves checking for write-write conflicts and whether there is an intersection between the transaction's [SnapshotTS, CommitTS].

In next article we would focus more on Pessimistic Transactions, explain how MO implements pessimistic transactions in detail, as well as some design considerations.
