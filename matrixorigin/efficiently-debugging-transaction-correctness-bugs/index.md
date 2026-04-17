---
title: Efficiently Debugging Transaction Correctness Bugs
author: Zhang Xu MO R&D Engineer
mail: zhangxu@matrixorigin.io
description: >-
  Readers familiar with database distributed transactions should understand that
  debugging bugs related to the correctness of distributed transactions is a
  very challenging task. This article mainly introduces how MatrixOne debugs
  transaction correctness issues during its development process.
tags:
  - technology
keywords:
  - MatrixOne
  - Cloud-Native
publishTime: '2024-06-27 17:00:00+00:00'
image:
  '1': /content/en/shared/Technical.png
  '235': /content/en/shared/Technical.png
date: '2024-06-27 17:00:00+00:00'
lang: en
status: published
---

**Contents**

**Part 1.** **Transaction Review**

**Part 2.** **Transaction Correctness Issues**

**Part 3.** **How to Efficiently DEBUG**

Readers familiar with database distributed transactions should understand that debugging bugs related to the correctness of distributed transactions is a very challenging task. This article mainly introduces how MatrixOne debugs transaction correctness issues during its development process.

## 1. Transaction Review

Let's first review how transactions are implemented in MatrixOne.

### 1.1 Where the Data Resides

MatrixOne is a cloud-native database, with most of the data stored in `object storage` (any `S3` compatible object storage), which is immutable. The immutability of data brings many benefits, such as eliminating the need to consider these data's consistency.

Besides the data stored in `object storage`, a very small amount of data is stored in `LogService`, a high-performance `WAL` service implemented using Raft. This part of the data in MatrixOne is called `LogTail`. This data is mutable and can be considered the latest commit data of the MatrixOne cluster.

`Object storage` + `LogTail` constitutes the full data of MatrixOne.

### 1.2 Transaction Isolation Levels

MatrixOne's transactions support `RC` and `SI` isolation levels, with `RC` being the default.

### 1.3 Transaction Modes

MatrixOne's transactions support `pessimistic` and `optimistic` modes, with `pessimistic` being the default.

### 1.4 Transaction Concurrency Control

MatrixOne uses MVCC for transaction concurrency control and `HLC` for transaction timing.

### 1.5 Transaction Read Operations

For transaction read operations, the first thing to determine is which data is visible to the transaction. At any given moment, the data visible to the transaction includes:

1. All data in object storage with `CommitTimestamp < txn.SnapshotTimestamp`
2. All data in LogTail with `CommitTimestamp < txn.SnapshotTimestamp`
3. All `Uncommitted` data in the transaction's `Workspace`

Once we have clarified which data is visible to the transaction, we need to ensure that the data meeting the conditions is complete when read.

`Workspace` data, at any moment, is complete for the transaction. What needs to be ensured is the data in `object storage` and `LogTail`. Since `LogTail` is the latest data write of the entire MatrixOne cluster, ensuring the completeness of LogTail's data means that the corresponding data in `object storage` is also complete for the transaction.

The question now is how to ensure the completeness of `LogTail` data for the transaction.

MatrixOne's transactions are created at CN nodes. After a transaction is created, a `SnapshotTimestamp` for the transaction is determined (this timestamp is constant throughout the transaction lifecycle for `SI`, and constant within the lifecycle of each `Statement` for `RC`).

`LogTail` data is generated at `TN` nodes and written into `LogService`. CN uses a subscription method to obtain the latest `LogTail` data and `Apply` these `LogTail` data to CN's memory.

CN maintains a maximum `Apply` `CommitTimestamp` in memory. The completeness of LogTail's data for the transaction can be ensured based on the watermark of this timestamp and the transaction's `SnapshotTimestamp`.

### 1.6 Transaction Write Operations

MatrixOne's transaction `Uncommitted` data is written into `Workspace`, which is in CN's memory.

The more data a transaction writes, the larger the memory occupied by this `Workspace`, until OOM occurs. To solve this problem, MatrixOne has a threshold for the memory size of `Workspace` (default is 1MB). When it is found that the memory of `Workspace` exceeds this threshold, the data in `Workspace` will be written into `object storage`, and the data in `Workspace` will be replaced with `temporary file names on object storage`.

Before a transaction is committed, it does not interact with `TN`. At the time of `Commit`, the data in `Workspace` is sent to `TN` nodes for `Commit` processing.

## 2. Transaction Correctness Issues

### 2.1 What Are Correctness Issues

In the sections above, we reviewed transactions. Now, we need to explain what transaction correctness issues are. The main transaction correctness BUGs encountered in the development process of MatrixOne include:

- `Lost Update` under `RC` mode
- Failure of `pessimistic transaction` lock service
- `Workspace` data issues

These issues all lead to transaction correctness problems. These problems result in transactions reading incorrect data or committing incorrect data.

### 2.2 How to Test

MatrixOne conducts many tests to help us discover these transaction correctness issues, including:

- Unit tests
- Integration tests
- CI tests before PR Merge
- Performance benchmark tests after PR Merge
- 7\*24 hours stability tests
- Daily various tests
- Chaos tests

These tests help us discover transaction correctness issues.

### 2.3 Conventional Problem Analysis Methods

For development, our conventional problem analysis methods are usually these:

- Breakpoint Debugging
- Log Analysis
- Metrics
- Tracing

Among these, logs are the most useful for analyzing distributed cluster transaction issues, with the rest being almost useless. Breakpoint debugging can only analyze reproducible issues, metrics can only observe a general situation of the system, and cannot locate data issues. Tracing generally refers to call chain monitoring, which can be used to analyze performance issues but cannot help with data error issues.

In summary, logs are almost the only useful tool for analyzing correctness issues.

### 2.3.1 What Logs Are Needed

Transaction correctness issues, in essence, are about reading or writing incorrect data for a row of records. The problem itself is that the content of the data is wrong. If the data content is wrong, the problem may occur wherever this row of data is read or written.

If we need to analyze transaction correctness issues, then we need to analyze where the problem occurs in the transaction that reads or writes. And there's another condition, which is to be able to link the logs of these places based on the problematic transaction and row, to find the problem.

But the problem is complex. Due to the pessimistic transaction mode, multiple concurrent transactions will affect each other, so it is also necessary to link all relevant information of conflicting transactions together for analysis.

### 2.3.2 Issues with Logs

We analyzed what information we need to analyze issues, and these information need to be recorded in logs. These logs cannot operate at the `Info` log level, only at the `DEBUG` level. This brings some problems:

- In some tests, it is impossible to turn on `DEBUG` level logs

  It is impossible to turn on DEBUG logs in performance tests. If an error occurs in a performance test, it is almost impossible to analyze.

- `DEBUG` logs make it difficult to reproduce issues

  Transaction correctness issues are sometimes very difficult to reproduce, possibly requiring specific concurrent timing. If it occurs in tests where DEBUG cannot be turned on, you need to turn on the DEBUG log level, run the same load, and too many DEBUG logs change the system's operating timing, making the problem even more difficult to reproduce.

- Logs are difficult to analyze

  When there are complete DEBUG logs, the scale of this log may be very large, and it is a log generated by each node and process in a distributed environment, making the analysis exceptionally difficult.

## 3. How to Efficiently DEBUG

In the development process of MatrixOne, fixing transaction correctness bugs has always been a painful experience. MatrixOne is still in a rapid development stage, and there are many optimizations in the system that have not been dealt with. These changes may bring new transaction correctness bugs. Therefore, we need an efficient tool and method to DEBUG transaction correctness bugs.

### 3.1 Design Goals

The disadvantages of using logs to analyze problems, we already have deep experience. Now the design goals we need to achieve are 3 points:

- In any test scenario, as long as a bug occurs, there is enough information to analyze the problem without needing to reproduce it.
- Cannot have too much impact on performance tests, a performance impact within 10% is acceptable.
- To provide a very rich way and means of analysis information.

### 3.2 Design Challenges

A huge amount of data that needs to be analyzed will be generated in tests. How these data are stored and how to provide rich analysis query capabilities. Because when analyzing problems, you need to analyze and query information based on various conditions.

#### 3.2.1 How to Provide Analysis Query Capability

First, we don't consider how the data is stored, let's look at how to provide data query analysis capability. Solving this problem may solve the problem of how data is stored.

So far, there is no more convenient and semantically richer analysis query method than providing these data queries in SQL. If we can provide a SQL way to provide DEBUG data analysis query capability, the benefits are obvious, and the efficiency of DEBUG is also greatly improved.

Therefore, we decided to provide DEBUG data query analysis in SQL.

#### 3.2.2 How Data Is Stored

The storage method is obvious, because providing SQL query capability means that the data needs to be stored in the database. So we need a database that can provide strong AP capabilities to store these DEBUG data.

The conclusion is obvious, MatrixOne itself is a database that supports high-performance AP queries.

#### 3.2.3 How Data Is Written

We have a design goal that when collecting DEBUG information is turned on, the performance cannot be affected by more than 10%. We need some special designs for data writing to the database:

- Asynchronously write data to the database in `Load` mode.
- DEBUG data writing can skip some non-critical data to improve performance.
- Control the frequency of writing to the database to avoid excessive performance impact.

### 3.3 Trace Framework Design

From MatrixOne version 1.2, MatrixOne provides a `mo_debug` built-in database, and based on the experience of analyzing logs, we abstracted the data needed to analyze transaction issues and provided some tables to store data.

And we provided some special statements to dynamically turn on and off the Trace functionality.

Due to space limitations, this article will not describe the specific design meaning of these tables, it will only provide a brief introduction. The main purpose is to share the thought process.

#### 3.3.1 Data Tables

```sql
create table trace_event_txn (
    ts                  bigint       not null,
    txn_id              varchar(50)  not null,
    cn                  varchar(100) not null,
    event_type          varchar(50)  not null,
    txn_status          varchar(10),
    snapshot_ts         varchar(50),
    commit_ts           varchar(50),
    info                varchar(1000)
)

create table trace_event_data (
    ts                  bigint          not null,
    cn                  varchar(100)    not null,
    event_type          varchar(50)     not null,
    entry_type          varchar(50)     not null,
    table_id            bigint UNSIGNED not null,
    txn_id              varchar(50),
    row_data            varchar(500)    not null,
    committed_ts        varchar(50),
    snapshot_ts         varchar(50)
)

create table trace_event_txn_action (
    ts                  bigint          not null,
    txn_id              varchar(50)     not null,
    cn                  varchar(50)     not null,
    table_id            bigint UNSIGNED,
    action              varchar(100)    not null,
    action_sequence     bigint UNSIGNED not null,
    value               bigint,
    unit                varchar(10),
    err                 varchar(100)
)

create table trace_event_error (
    ts                  bigint          not null,
    txn_id              varchar(50)     not null,
    error_info          varchar(1000)   not null
)

create table trace_statement (
    ts          bigint          not null,
    txn_id      varchar(50)     not null,
    sql         varchar(1000)   not null,
    cost_us     bigint          not null
)
```

These data tables mainly record all data writes, reads, transaction metadata changes, executed SQL, concurrency conflicts, and other key information during the execution process.

#### 3.3.2 Filter Tables

```sql
create table trace_table_filters (
    id              bigint UNSIGNED primary key auto_increment,
    table_id        bigint UNSIGNED not null,
    table_name      varchar(50)     not null,
    columns         varchar(200)
);

create table trace_txn_filters (
    id              bigint UNSIGNED primary key auto_increment,
    method          varchar(50)     not null,
    value           varchar(500)    not null
);

create table trace_statement_filters (
    id              bigint UNSIGNED primary key auto_increment,
    method          varchar(50)     not null,
    value           varchar(500)    not null
);
```

These Filter tables are used for filtering to reduce the amount of data that needs to be recorded as much as possible.

### 3.4 Effect

After turning on Trace, the impact on performance is around 5%. Relying on the high-performance AP query service capability provided by MatrixOne, developers can use SQL to query DEBUG issues, query all needed data changes, transaction metadata changes, etc., during the execution period, which greatly improves efficiency and speeds up the FIX of transaction correctness bugs.

**About MatrixOne**

MatrixOne is a multi-model database based on cloud-native technology that can be deployed on both public and private clouds. This product uses an original architecture featuring storage-compute separation, read-write separation, and hot-cold data separation. It supports multiple workloads such as transactions, analytics, streaming, time-series, and vectors within a single storage and computing system, and can isolate or share storage and computing resources in real-time and on-demand. The cloud-native database MatrixOne helps users significantly simplify increasingly complex IT architectures, providing minimalist, highly flexible, cost-effective, and high-performance data services.

Since its release, MatrixOne Enterprise Edition and MatrixOne Cloud Service have been applied in various industries including internet, finance, energy, manufacturing, education, and healthcare. Thanks to its unique architecture design, users can reduce hardware and maintenance costs by up to 70%, increase development efficiency by 3-5 times, respond more flexibly to market changes, and seize innovation opportunities more efficiently. With the same hardware investment, MatrixOne can achieve several times higher performance.

**Keywords: hyper-converged database, multi-model database, cloud-native database, domestic database.**
