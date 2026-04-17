---
title: >-
  Revolutionizing Data Integrity(2): Advanced Pessimistic Transactions in
  Distributed Databases
author: MatrixOrigin
mail: contact@matrixorigin.io
description: >-
  The previous sections primarily discussed MatrixOne's transaction processing.
  Previously, MO only supported the SI (Snapshot Isolation) isolation level,
  primarily implemented through MVCC (Multi-Version Concurrency Control), where
  data is multi-versioned. MatrixOne now supports the RC (Read Committed)
  isolation level for transactions.
tags:
  - technology
keywords:
  - MatrixOne
  - Database
  - Distributed Database
  - Cloud-Native
  - Database Kernel
publishTime: '2024-01-13 17:00:00+00:00'
image:
  '1': /content/en/shared/revolutionizing-data-integrity.png
  '235': /content/en/shared/revolutionizing-data-integrity.png
date: '2024-01-13 17:00:00+00:00'
lang: en
status: published
---

## RC（Read Committed）

The previous sections primarily discussed MO's transaction processing. Previously, MO only supported the SI (Snapshot Isolation) isolation level, primarily implemented through MVCC (Multi-Version Concurrency Control), where data is multi-versioned. MO now supports the RC (Read Committed) isolation level for transactions.

When implementing the RC isolation level on top of multi-versioning, for SI transactions, a consistent snapshot must be maintained throughout the transaction's lifecycle, ensuring the data read is always the same. For RC, it is necessary to see the latest committed data, which can be understood as the consistent snapshot not being tied to the transaction's lifecycle, but rather to each query. Each query starts using the current timestamp as the transaction's SnapshotTS to ensure the query can see the data committed before the query.

Under RC mode, for statements with updates (UPDATE, DELETE, SELECT FOR UPDATE), encountering a write-write conflict means that the data being modified by the query has been altered by another concurrent transaction. Since RC requires seeing the latest writes, once the conflicting transaction commits, the transaction's SnapshotTS needs to be updated and retried.

## Pessimistic Transactions

This section mainly introduces how MO implements pessimistic transactions, along with some design considerations.

### 1. Core Issues to be Addressed

Implementing pessimistic transactions in MO involves solving several problems:

**How to provide a lock service**

The lock service, used to lock a single record, a range, or even an entire table.

When a transaction requires locking during read-write requests and lock conflicts are discovered, it is necessary to implement lock waiting. When lock waiting forms a cycle, a deadlock detection mechanism is needed to break the deadlock.

**Scalable Performance of Lock Service**

Transactions in MO can occur on any CN node. When multiple nodes need to access the lock service, the performance of the lock service needs to be scalable.

**Eliminating Conflict Detection in the Commit Phase**

In pessimistic mode, with MO clusters having multiple TNs, how to ensure that eliminating conflict detection in the Commit phase is safe.

### 2. Lock Service

MO has implemented LockService to provide lock services. It offers capabilities for locking, unlocking, lock conflict detection, lock waiting, and deadlock detection. LockService is not a separately deployed component but a component of CN. In an MO cluster, there are as many LockService instances as there are CNs. LockService internally recognizes other LockService instances in the cluster and coordinates all the LockService instances in the cluster to work together. Each CN only accesses the LockService instance of the current node and is not aware of other LockService instances. To CNs, the LockService on the current node behaves like a standalone component.

**2.1. LockTable**

The lock information of a table is stored in a component called LockTable. A LockService contains many LockTables.

In an MO cluster, when any LockService accesses a table's lock service for the first time, it creates a LockTable instance, which is mounted to the LockService instance of that CN. This LockTable is marked as a LocalLockTable within LockService, indicating that it is a local LockTable.

When other CNs also access the lock service of this table, the corresponding LockService of that CN will also hold a LockTable for this table, but it will be marked as a RemoteLockTable, indicating that it is a LockTable on another LockService instance.

Thus, in the entire MO cluster, a LockTable will have one LocalLockTable and N RemoteLockTable instances. Only the LocalLockTable actually stores lock information, and the RemoteLockTable acts as a proxy to access the LocalLockTable.

**2.2. LockTableAllocator**

LockTableAllocator is a component used to allocate LockTables, and it records the distribution of all LockTables in the MO cluster in memory.

LockTableAllocator is not an independently deployed component; it is a component of TN. The binding between LockTable and LockService can change. For instance, if LockTableAllocator detects a CN going offline, the binding relationship changes, and each change increases the binding version number.

During the time window of **\[transaction start, transaction commit]**, the binding relationship between LockTable and LockService can change. This inconsistency leads to data conflicts, causing the pessimistic transaction model to fail. Therefore, LockTableAllocator, as a TN component, checks for any changes in the binding version before processing transaction commit. If it finds that the binding relationship of a LockTable accessed by a transaction is outdated, it will abort the transaction to ensure correctness.

**2.3. Distributed Deadlock Detection**

All locks held by active transactions are distributed across the LocalLockTables of multiple LockServices. Therefore, we need a distributed deadlock detection mechanism.

Each LockService contains a deadlock detection module, and the detection mechanism is roughly as follows:

- Maintain a waiting queue for each lock in memory;
- When a new transaction encounters a conflict, add it to the waiting queue of the lockholder;
- Start an asynchronous task to recursively search all locks held by transactions in this waiting queue, checking for waiting cycles. If encountering locks of remote transactions, use RPC to obtain all lock information held by the remote transactions.

**2.4. Reliability**

All key data of the lock service, such as lock information and the binding relationship between LockTable and LockService, are stored in memory.

For the lock information recorded inside LocalLockTable, if a CN crashes, then all transactions linked to this CN will fail due to the database connection being lost. Then, LockTableAllocator will reallocate the binding relationship between LockTable and LockService, and the entire lock service can continue to function normally.

LockTableAllocator runs on TN. If a TN crashes, HAKeeper will replace it with a new TN. All binding relationships become invalid in the new TN, meaning all currently active transactions will fail to commit due to mismatched binding relationships.

### 3. How to Use Lock Service

To use the lock service elegantly, MO has implemented a Lock operator responsible for invoking and handling the lock service.

During the SQL Plan phase, if it is determined to be a pessimistic transaction, the corresponding situation will be handled. In the execution phase, the Lock operator will be inserted at the appropriate position.

**Insert**

For insert operations, in the Plan phase, the Lock operator will be placed before other operators of the Insert. During subsequent execution, the following operators will only execute after successful locking.

**Delete**

Similar to Insert, in the Plan phase, the Lock operator is placed before other Delete operators. During subsequent execution, the following operators will only execute after successful locking.

**Update**

Update is decomposed into Delete+Insert during the Plan phase, so there will be two locking stages (if the primary key is not modified, it will be optimized to one locking stage, and no lock will be applied during the Insert phase).
