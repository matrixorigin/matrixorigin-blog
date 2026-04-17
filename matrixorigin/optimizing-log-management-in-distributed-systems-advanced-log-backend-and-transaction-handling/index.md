---
title: >-
  Optimizing Log Management in Distributed Systems: Advanced Log Backend and
  Transaction Handling Mechanisms
author: MatrixOrigin
mail: contact@matrixorigin.io
description: >-
  The initial Log Backend was based on a local file system. To accommodate
  distributed characteristics, we developed a highly reliable and low-latency
  Log Service as the new Log Backend. We abstracted a virtual backend to adapt
  to different log backends, connecting to various backends through the
  development of lightweight drivers.
tags:
  - technology
keywords:
  - MatrixOne
  - Database
  - Distributed Database
  - Log
  - Database Kernel
publishTime: '2024-01-26 17:00:00+00:00'
image:
  '1': >-
    /content/en/optimizing-log-management-in-distributed-systems-advanced-log-backend-and-transaction-handling/optimizing-log-management-in-distributed-systems-advanced-log-backend-and-transaction-handling.png
  '235': >-
    /content/en/optimizing-log-management-in-distributed-systems-advanced-log-backend-and-transaction-handling/optimizing-log-management-in-distributed-systems-advanced-log-backend-and-transaction-handling.png
date: '2024-01-26 17:00:00+00:00'
lang: en
status: published
---

## Log Backend

The initial Log Backend was based on a local file system. To accommodate distributed characteristics, we developed a highly reliable and low-latency Log Service as the new Log Backend. We abstracted a virtual backend to adapt to different log backends, connecting to various backends through the development of lightweight drivers.

**The Driver needs to adapt these interfaces:**

Append, which asynchronously writes log entries when committing transactions;

```go
Append(entry) (Lsn, error)
```

Read, which batch reads log entries upon restart;

```go
Read(Lsn, maxSize) (entry, Lsn, error)
```

Truncate interface, which destroys all log entries before the LSN, thereby freeing up space.

```go
Truncate(lsn Lsn) error
```

## Group Commit

Group Commit can accelerate the persistence of log entries. Persisting log entries is IO-intensive and time-consuming, often being the bottleneck in submissions.

To reduce latency, log entries are written in batches to the Log Backend. For instance, fsync in file systems is a lengthy process. If fsync is performed for every entry, it would be very time-consuming.

In a file system-based Log Backend, after writing multiple entries, a single fsync is performed for all. The combined time cost for flushing these entries is roughly equivalent to flushing a single entry.

![](/content/en/optimizing-log-management-in-distributed-systems-advanced-log-backend-and-transaction-handling/picture1.jpg)

The Log Service supports concurrent writing, allowing the flush times of individual entries to overlap, which can reduce the total time for writing entries and increase the concurrency of submissions.

## Handling Out-of-Order LSNs in Log Backend

To accelerate the process, entries are written concurrently to the Log Backend. The order of successful writes may not be consistent with the order of requests, resulting in a discrepancy between the LSNs generated in the Log Backend and the logical LSNs passed to the Driver from higher levels.

These out-of-order LSNs must be managed during truncation and restart processes.

![](/content/en/optimizing-log-management-in-distributed-systems-advanced-log-backend-and-transaction-handling/picture2.jpg)

To ensure that the LSNs in the Log Backend are generally in order and to minimize the extent of disorder, a logical LSN window is maintained.

If an earlier log entry is still being written unsuccessfully, the writing of new entries to the Log Backend is halted.

For instance, if the window size is 7 and the entry with LSN 13 in the diagram has not yet returned, entries with LSNs greater than or equal to 20 will be blocked.

In the Log Backend, logs are destroyed through a truncate operation, which destroys all entries before a specified LSN.The logical LSNs corresponding to these entries must be less than the logical truncate point.

For example, if the logical truncate is up to 7, and this corresponds to entry 11 in the Log Backend, entries corresponding to 5, 6, 7, 10 in the Log Backend, having logical LSNs greater than 7, cannot be truncated. The Log Backend can only truncate up to 4.

Upon restart, the system skips the initial and final entries that are not continuous. For instance, if the Log Backend writes up to 14 and then the entire machine powers down, upon restart, it will filter out the beginning entries 8, 9, 11 based on the previous truncate information.

After reading all entries, if it is found that the logical LSNs of 6 and 14 are not continuous with the other entries, the system will discard the last entries 6 and 14.

## WAL Practical （The format of MatrixOne ）

Each write transaction corresponds to one log entry, consisting of an LSN, Transaction Context, and several Commands.

```text
+---------------------------------------------------------+
|                  Transaction Entry                      |
+-----+---------------------+-----------+-----------+-   -+
| LSN | Transaction Context | Command-1 | Command-2 | ... |
+-----+---------------------+-----------+-----------+-   -+
```

### LSN

Each log entry corresponds to an LSN. The LSNs are sequentially incremental and are used for deleting entries during checkpointing.

### Transaction Context

The Transaction Context records information about the transaction.

```text
+---------------------------+
|   Transaction Context     |
+---------+----------+------+
| StartTS | CommitTS | Memo |
+---------+----------+------+
```

1. StartTS and CommitTS are the timestamps for the start and end of the transaction, respectively.
2. Memo records the data locations modified by the transaction. Upon restart, this information is restored into Logtail Mgr and is utilized during checkpointing.

## Transaction Commands

Each write operation in a transaction corresponds to one or more commands. The log entry records all commands in the transaction.

### >>>Operators

In MatrixOne, DN (Data Node) is responsible for committing transactions, writing log entries to the Log Backend, and performing checkpoints.

DN supports creating and dropping databases, creating and dropping tables, updating table structures, inserting, and deleting. In the background, sorting is automatically triggered.

Update operations are split into insert and delete actions.

### DDL

DDL (Data Definition Language) includes operations such as creating and dropping databases, creating and dropping tables, and updating table structures. DN (Data Node) records information about tables and databases in the Catalog.

The Catalog in memory is structured as a tree, with each node being a catalog entry. There are four types of catalog entries: database, table, segment, and block, where segment and block are metadata and subject to change during data insertion and background sorting. Each database entry corresponds to a database, and each table entry corresponds to a table. Each DDL operation corresponds to a database/table entry, which is recorded as an Update Catalog Command.

### Insert

Operations for newly inserted data are recorded in the Append Command.

Data in DN is recorded in blocks, with multiple blocks forming a segment. If there are not enough blocks or segments in DN to record newly inserted data, a new one is created.

These changes are recorded in the Update Catalog Command. In large transactions, data is written directly to S3 by CN, and DN only submits metadata. Thus, the data in the Append Command is not very large.

### Delete

DN records the row numbers where Deletes occur. When reading, it first reads all the inserted data and then subtracts these rows. In a transaction, all deletions on the same block are combined into one Delete Command.

### Compact & Merge

DN initiates transactions in the background to transfer data **from memory to S3**. Data on S3 is sorted by primary key to facilitate filtering during read operations. Compaction occurs on a block, and after compaction, the data within the block is ordered.

Merging occurs within a segment and involves multiple blocks, resulting in the entire segment being ordered after the merge.

The data remains unchanged before and after **compact/merge**, only the metadata changes, with the **old block/segment** being deleted and a **new block/segment** being created. Each **deletion/creation** corresponds to an Update Catalog Command.

## >>>Commands

## Update Catalog

The Catalog is structured hierarchically from top to bottom, comprising database, table, segment, and block levels. One Update Catalog Command corresponds to one Catalog Entry. Each DDL operation or metadata update corresponds to an Update Catalog Command. The Update Catalog Command includes Dest and EntryNode.

```text
+-------------------+
|   Update Catalog  |
+-------+-----------+
| Dest | EntryNode  |
+-------+-----------+
```

### Dest

Dest is the target location of the Command, recording the IDs of the corresponding node and its ancestor nodes. Upon restart, the operation's location in the Catalog is pinpointed through Dest.

### EntryNode

- Each EntryNode records the creation and deletion times of the entry. If the entry has not been deleted, the deletion time is recorded as 0.

- If the current transaction is in the process of creating or deleting, the corresponding time is marked as UncommitTS.

```text
+-------------------+
|    Entry Node     |
+---------+---------+
| Create@ | Delete@ |
+---------+---------+
```

- For segments and blocks, the Entry Node also records metaLoc and deltaLoc, which are the addresses for data and deletion records respectively on S3.

```text
+----------------------------------------+
 |               Entry Node               |
 +---------+---------+---------+----------+
 | Create@ | Delete@ | metaLoc | deltaLoc |
 +---------+---------+---------+----------+
```

- For tables, the Entry Node additionally records the table structure schema.

```text
+----------------------------+
 |         Entry Node         |
 +---------+---------+--------+
 | Create@ | Delete@ | schema |
 +---------+---------+--------+
```

### Append

The Command records the inserted data and their locations

```text
+-------------------------------------------+
|             Append Command                |
+--------------+--------------+-   -+-------+
| AppendInfo-1 | AppendInfo-2 | ... | Batch |
+--------------+--------------+-   -+-------+
```

- Batch refers to the inserted data.
- AppendInfo: Data in an Append Data Command may span multiple blocks. Each block corresponds to an Append Info, which records the position of the data within the Command's Batch (pointer to data) and the location of the data within the block (destination).

```text
+------------------------------------------------------------------------------+
|                              AppendInfo                                      |
+-----------------+------------------------------------------------------------+
| pointer to data |                     destination                            |
+--------+--------+-------+----------+------------+----------+--------+--------+
| offset | length | db id | table id | segment id | block id | offset | length |
+--------+--------+-------+----------+------------+----------+--------+--------+
```

### Delete Command

Each Delete Command encompasses deletions within a single block.

```text
+---------------------------+
|      Delete Command       |
+-------------+-------------+
| Destination | Delete Mask |
+-------------+-------------+
```

Destination records the specific Block where the Delete occurs.

Delete Mask records the row numbers that have been deleted.
