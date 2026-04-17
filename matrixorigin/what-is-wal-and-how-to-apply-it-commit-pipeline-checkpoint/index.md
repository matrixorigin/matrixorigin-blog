---
title: What is WAL? and How to Apply it?(Commit Pipeline&Checkpoint)
author: Jiang Xinmeng
mail: jiangxinmeng@matrixorigin.io
description: >-
  The Write Ahead Log (WAL) is a technology related to the atomicity and
  durability of databases.It functions by converting random writes into
  sequential read-writes during transaction commits. Changes in transactions
  occur randomly across various pages, which are scattered.
tags:
  - technology
keywords:
  - MatrixOne
  - Database
  - Distributed Database
  - HTAP Database
  - Database Kernel
publishTime: '2024-01-25 17:00:00+00:00'
image:
  '1': >-
    /content/en/what-is-wal-and-how-to-apply-it-commit-pipeline-checkpoint/what-is-wal-and-how-to-apply-it-commit-pipeline-checkpoint.png
  '235': >-
    /content/en/what-is-wal-and-how-to-apply-it-commit-pipeline-checkpoint/what-is-wal-and-how-to-apply-it-commit-pipeline-checkpoint.png
date: '2024-01-25 17:00:00+00:00'
lang: en
status: published
---

## What is WAL?

The **Write Ahead Log** (WAL) is a technology related to the atomicity and durability of databases.

It functions by converting random writes into sequential read-writes during transaction commits. Changes in transactions occur randomly across various pages, which are scattered.

This random writing, being more costly than sequential writing, can reduce the performance of commits.

The WAL records only the modification operations of transactions, like adding a specific row to a block. Upon committing a transaction, new WAL entries are written sequentially at the end of the WAL file.

After committing, dirty pages are updated asynchronously, WAL entries corresponding to these updates are destroyed, and space is freed up.

## Commit Pipeline

The Commit Pipeline is a component designed for handling transaction commits. Prior to committing, it's crucial to update the memtable and persist the WAL (Write Ahead Log) entries.

The time required to perform these tasks significantly impacts the commit's performance. Persisting WAL entries is an I/O-intensive and time-consuming operation.

In systems like us, a commit pipeline is implemented to persist WAL entries asynchronously. This approach ensures that the persistence process does not block the updates occurring in the memory, thereby enhancing overall efficiency.

![](/content/en/what-is-wal-and-how-to-apply-it-commit-pipeline-checkpoint/picture1.jpg)

### The process of transaction commit involves:

1. **Updating changes to the memtable**. Before entering the commit pipeline, transactions concurrently update the memtable without blocking each other. At this point, the status of these changes is uncommitted and they are not visible to any transaction.
2. **Entering the commit pipeline to check for conflicts.**
3. **Persisting WAL entries,** which involves collecting WAL entries from memory and writing them to the backend. This process is asynchronous.

   The queue immediately returns after passing WAL entries to the backend without waiting for successful writing, thus avoiding blocking of subsequent transactions.

   The backend processes a batch of entries simultaneously. Group Commit is used to further speed up the persistence process.

4. **Updating the status in the memtable to make transactions visible.** Transactions update their status in the sequence they entered the queue. This ensures that the order of transaction visibility is consistent with the order of writing WAL entries in the queue.

## Checkpoint

A Checkpoint writes dirty data into Storage, destroys old log entries, and frees up space. What we do in MatrixOne, a checkpoint is a background-initiated task, and its process is as follows:

**Selecting an appropriate timestamp as the checkpoint and scanning for modifications made before this timestamp.** The timestamp t0 represents the previous checkpoint, and t1 is the current checkpoint. Changes between [t0, t1] need to be transferred.

**Transfer DML modifications.** DML changes are present in various blocks of the memtable.Logtail Mgr is a memory module that records which blocks each transaction has modified.

Scan the transactions between [t0, t1] on Logtail Mgr, initiate background transactions to transfer these blocks to Storage, recording the addresses in the metadata.Thus, all DML changes committed before t1 can be located through the addresses in the metadata.

To conduct checkpoints promptly and prevent the unlimited growth of WAL, **even if a block in the interval has only one line changed, it still needs to be transferred.**

![](/content/en/what-is-wal-and-how-to-apply-it-commit-pipeline-checkpoint/picture2.jpg)

**Scanning the Catalog involves dumping Data Definition Language (DDL) and metadata changes.**

The Catalog itself is structured like a tree, storing all DDL and metadata information. Each node in this tree logs the timestamp when changes occur.

When scanning, the process entails collecting all changes that fall within a specified time range, denoted by [t0, t1].

![](/content/en/what-is-wal-and-how-to-apply-it-commit-pipeline-checkpoint/picture3.jpg)

**Destroy old WAL (Write Ahead Log) entries.**

The Logtail Manager stores the LSN (Log Sequence Number) corresponding to each transaction. Based on timestamps, identify the last transaction before t1 and then instruct the Log Backend to clean up all logs prior to this transaction's LSN.
