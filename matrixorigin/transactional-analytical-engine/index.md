---
title: Transactional Analytical Engine
author: Xu Peng
mail: xupeng@matrixorigin.io
description: >-
  TAE (Transactional Analytical Engine) is the storage engine for MatrixOne,
  named so because it needs to support both TP and AP. The initial version of
  TAE implementation was released with MatrixOne 0.5, which was a single node
  storage engine. Starting from MatrixOne 0.6, TAE will transition into a cloud
  native distributed architecture with separate computing and storage.
tags:
  - technology
keywords:
  - MatrixOne
  - Database
  - Relational Database
  - Distributed
  - HTAP Database
publishTime: '2023-08-30 17:00:00+00:00'
image:
  '1': >-
    /content/en/transactional-analytical-engine/transactional-analytical-engine.png
  '235': >-
    /content/en/transactional-analytical-engine/transactional-analytical-engine.png
date: '2023-08-30 17:00:00+00:00'
lang: en
status: published
---

**TAE (Transactional Analytical Engine) is the storage engine for MatrixOne, named so because it needs to support both TP and AP. The initial version of TAE implementation was released with MatrixOne 0.5, which was a single node storage engine. Starting from MatrixOne 0.6, TAE will transition into a cloud native distributed architecture with separate computing and storage. We will reveal the internal design of the TAE storage engine in stages, following the evolution of MatrixOne versions.**

This article assumes readers have a basic understanding of columnar storage, and are familiar with standard columnar storage organizations like block (or page, the minimum IO unit), segment (row group of multiple blocks), zonemap (min/max values within a column block), and also have a preliminary understanding of common Key Value storage engine implementations like LSM Tree, concepts like Memtable, WAL, SST files, etc. The left half of the TAE logical structure diagram below covers some basic columnar concepts, which can help readers without the relevant background.

![](/content/en/transactional-analytical-engine/picture1.jpg)

To begin with, let's address a fundamental question before delving into the design of TAE: Why would one opt for a columnar structure when designing the core storage engine for a database?

MatrixOne hopes to solve both TP and AP problems with one storage engine. As for why, you can follow other articles from MatrixOne. In short, the goal is to be able to flexibly start different compute nodes to handle TP and AP workloads on top of shared storage, while maximizing scalability and ensuring isolation between different workloads. With this premise, using a structure based on columnar storage can have the following advantages:

1. It's easy to optimize for AP
2. Flexible workload adaptation can be achieved by introducing the Column Family concept. If all columns are in one Column Family, i.e. all column data is stored together, this is very similar to the database HEAP file, which can exhibit row store-like behaviors. Typical OLTP databases like PostgreSQL use HEAP for their storage engines. If each column is an independent Column Family, i.e. each column is stored separately, then it is typical columnar storage. By defining Column Families, users can easily switch between row store and columnar, by specifying in the table DDL.

Therefore, physically TAE is a columnar storage engine. The row store mentioned below refers to common Key Value storage engines like RocksDB, since many typical distributed databases are built on top of it. TAE has an LSM Tree-like structure but does not directly use RocksDB, due to some additional considerations.

## Why is columnar storage harder to design than row storage?

It is well known that SQL compute engines handle TP and AP requests very differently. The former is mainly point queries requiring high concurrency, while the latter is mainly Scan requests, typically using MPP engines pursuing parallelism rather than concurrency. Correspondingly for storage, row stores naturally serve TP requests, while columnar fits AP requests, because the former can use a basic volcano model, reading a few rows to return results, while the latter must batch process (so-called vectorized execution), usually combined with Pipelining, reading thousands of rows from a column at a time, so after reading records, MPP compute engines need to process the entire batch extremely fast, rather than reading, deserializing, and decoding row by row, as that would greatly reduce system throughput.

When the storage engine needs to support multiple tables internally, it is straightforward for row stores to prefix each row with a TableID, which does not add much overhead to the system overall, because deserialization and decoding only needs to be done for a few records. For the storage engine, the multiple tables are still unified KeyValue, without much difference between tables.

![](/content/en/transactional-analytical-engine/picture2.jpg)

However, for columnar storage, first, the columns of each table are stored independently, and different tables contain different columns, so the data layout between tables is completely different. Assuming it also supports the primary key, prefixing each row with TableID essentially interrupts vectorized execution, and data like TableID needs to be stored in metadata. In addition to TableID, columnar also needs to record information for each column (such as block, segment, zonemap, etc.), and they are completely different between different Tables, which is not a problem for row stores since all Tables can use TableID as the prefix. Therefore, one of the core reasons columnar is harder than row store is that the metadata complexity is much higher than row store. Looking at it from a tree perspective, common columnar metadata organization looks like this:

```text
|-- [0]dentry:[name="/"]
|   |-- [1]dentry:[name="db1"]
|   |    |-- [2]dentry:[name="table1"]
|   |    |    |-- [3]dentry:[name="segment1"]
|   |    |    |     |-- [4]dentry:[name="block1"]
|   |    |    |     |    |-- col1 [5]
|   |    |    |     |    |-- col2 [6]
|   |    |    |     |    |-- idx1 [7]
|   |    |    |     |    |-- idx2 [8]
|   |    |    |     |
|   |    |    |     |-- [9]dentry:[name="block2"]
|   |    |    |     |    |-- col1 [10]
|   |    |    |     |    |-- col2 [11]
|   |    |    |     |    |-- idx1 [12]
|   |    |    |     |    |-- idx2 [13]
```

In addition to complex Metadata, there is also the crash recovery mechanism, namely WAL (Write Ahead Logging). Columnar also needs to consider more things in this area. All tables share the same Key Value space for row stores, so it's just a common WAL needed for Key Value storage, recording an LSN (Last Sequence Number) watermark is sufficient. But if columnar does the same, there will be some issues:

![](/content/en/transactional-analytical-engine/picture3.jpg)

The diagram above shows a rough example of a columnar Memtable. For easier management, we stipulate that each Block (Page) in the Memtable can only contain data from one column of one table. Assuming the Memtable contains data being written from multiple tables simultaneously, due to different write speeds of different tables, each table may have a different amount of data in the Memtable. If we only record one LSN in the WAL, it means that when a Checkpoint happens, we need to Flush the data of every table in the Memtable to disk, even if there is only 1 row of data for that table in the Memtable. At the same time, since the columnar schema cannot be fully integrated into a single Key Value like row store, even one row of table data will generate corresponding files, potentially one file per column, which will create a large number of fragmented files with many tables, leading to huge read amplification. Of course, such complex scenarios can be ignored, after all, many columnar engines don't even have WAL yet, and even columnar engines with WAL mostly don't consider the problem this way, such as only doing Checkpoint when all tables reach a certain number of rows, so with many tables, Memtable may occupy a lot of memory, potentially even OOM. TAE is the main if not only storage engine for MatrixOne database, it needs to support not only AP but also TP workloads, so for database usage, it must be able to freely create tables like a normal Key Value storage engine. Therefore, the most straightforward solution means maintaining an LSN for each table in the WAL, that is, each table has its own independent logical log space in the unified WAL to record its own current write watermark. In other words, if we view the WAL as a message queue, the WAL of a regular row store is equivalent to a message queue with only one topic, while the WAL of columnar is equivalent to a message queue with many topics, and these topics are stored continuously physically, unlike separate storage of each topic in a typical message queue. Therefore, the WAL for columnar needs a more refined design to make it easy to use.

Below we formally introduce the TAE storage engine design.

## Data Storage

TAE stores data in table format. Each table's data is organized using an LSM tree. Currently, TAE is a three-layer LSM tree, called L0, L1, and L2. L0 is very small and can reside entirely in memory, which is the Memtable mentioned earlier, while L1 and L2 reside on disk. New incoming data is inserted into the latest transient block in L0. If the inserted data exceeds the maximum number of rows for a block, the block is sorted by primary key and flushed to L1 as a sorted block. If the number of sorted blocks exceeds the maximum number for a segment, merge sort by the primary keys used to sort and write to L2. The column block, which is the smallest IO unit in TAE, is currently organized based on a fixed number of rows. Special handling for blob columns will be enhanced in future versions.

The data in L1 and L2 are all sorted by primary key. There are overlapping primary key ranges between the sorted data. The difference between L1 and L2 is that L1 guarantees sorting within blocks, while L2 guarantees sorting within a segment. Here segment is a logical concept, it can also be equivalent to a row group, row set, etc. in similar implementations. If a segment has many updates (deletions), it can be compacted into a new segment, multiple segments can also be merged into a new segment, these are done through background asynchronous tasks, and the scheduling strategy of tasks mainly balances between write amplification and read amplification — based on this consideration, TAE does not recommend providing L4 layer, that is, fully sorting all segments by primary key, although technically it can be done (through background asynchronous merge tasks continuously, similar to the behavior of columnar stores like ClickHouse).

The diagram above shows a rough example of a columnar Memtable. For easier management, we stipulate that each Block (Page) in the Memtable can only contain data from one column of one table. Assuming the Memtable contains data being written from multiple tables simultaneously, due to different write speeds of different tables, each table may have a different amount of data in the Memtable. If we only record one LSN in the WAL, it means that when a Checkpoint happens, we need to Flush the data of every table in the Memtable to disk, even if there is only 1 row of data for that table in the Memtable. At the same time, since the columnar schema cannot be fully integrated into a single Key Value like row store, even one row of table data will generate corresponding files, potentially one file per column, which will create a large number of fragmented files with many tables, leading to huge read amplification. Of course, such complex scenarios can be ignored, after all, many columnar engines don't even have WAL yet, and even columnar engines with WAL mostly don't consider the problem this way, such as only doing Checkpoint when all tables reach a certain number of rows, so with many tables, Memtable may occupy a lot of memory, potentially even OOM. TAE is the main if not only storage engine for MatrixOne database, it needs to support not only AP but also TP workloads, so for database usage, it must be able to freely create tables like a normal Key Value storage engine. Therefore, the most straightforward solution means maintaining an LSN for each table in the WAL, that is, each table has its own independent logical log space in the unified WAL to record its own current write watermark. In other words, if we view the WAL as a message queue, the WAL of a regular row store is equivalent to a message queue with only one topic, while the WAL of columnar is equivalent to a message queue with many topics, and these topics are stored continuously physically, unlike separate storage of each topic in a typical message queue. Therefore, the WAL for columnar needs a more refined design to make it easy to use.

Below we formally introduce the TAE storage engine design.

## TAE Storage Engine Design

TAE stores data in table format. Each table's data is organized using an LSM tree. Currently, TAE is a three-layer LSM tree, called L0, L1, and L2. L0 is very small and can reside entirely in memory, which is the Memtable mentioned earlier, while L1 and L2 reside on disk. New incoming data is inserted into the latest transient block in L0. If the inserted data exceeds the maximum number of rows for a block, the block is sorted by primary key and flushed to L1 as a sorted block. If the number of sorted blocks exceeds the maximum number for a segment, merge sort by the primary keys used to sort and write to L2. The column block, which is the smallest IO unit in TAE, is currently organized based on a fixed number of rows. Special handling for blob columns will be enhanced in future versions.

The data in L1 and L2 are all sorted by primary key. There are overlapping primary key ranges between the sorted data. The difference between L1 and L2 is that L1 guarantees sorting within blocks, while L2 guarantees sorting within a segment. Here segment is a logical concept, it can also be equivalent to a row group, row set, etc. in similar implementations. If a segment has many updates (deletions), it can be compacted into a new segment, multiple segments can also be merged into a new segment, these are done through background asynchronous tasks, and the scheduling strategy of tasks mainly balances between write amplification and read amplification — based on this consideration, TAE does not recommend providing L4 layer, that is, fully sorting all segments by primary key, although technically it can be done (through background asynchronous merge tasks continuously, similar to the behavior of columnar stores like ClickHouse).

![](/content/en/transactional-analytical-engine/picture4.jpg)

## Indexes and Metadata

Similar to traditional columnar databases, TAE does not introduce secondary indexes like row stores, only Zonemap (Min/Max data) at the block and segment levels, and Bloom Filter data will be added in the future to support runtime filter optimizations for query execution. As a storage engine that supports TP, TAE provides complete primary key constraints, including multi-column primary keys and auto-increment global IDs. TAE creates a primary key index for the primary key of each table by default. The main functions are deduplication to satisfy primary key constraints during data insertion, and filtering based on primary keys. Primary key deduplication is on the critical path for data insertion. TAE needs to make trade-offs in the following three aspects:

1. Query performance
2. Memory usage
3. Matching with the data layout above

Looking at index granularity, TAE can have two types, one is table-level indexes, the other is segment-level. For example, there can be a table-level index, or each segment can have an index. The table data in TAE consists of multiple segments, and the data in each segment has gone through the process from unordered to ordered through compression/merge from L1 to L3. This is very unfriendly to table-level indexes. So TAE's indexes are built at the segment level. There are two types of segments. One type can be appended, the other cannot be modified. The segment-level index is a two-level structure, bloom filter and zonemap for the latter. For bloom filters there are two options, one is segment-based bloom filter, the other is block-based bloom filter. When the index can reside entirely in memory, segment-based is a better choice. An appendable segment consists of at least one appendable block plus multiple non-appendable blocks. The index of an appendable block is an in-memory ART-tree plus a zonemap, while a non-appendable one is a bloom filter plus a zonemap.

![](/content/en/transactional-analytical-engine/picture5.jpg)

## Buffer Manager

A serious storage engine needs a Buffer Manager for fine-grained memory control. Although in principle Buffer Manager is just an LRU cache, no database would directly rely on the OS page cache as a replacement for the Buffer Manager, particularly in the case of TP databases.TAE uses Buffer Manager to manage memory buffers, each buffer node is a fixed size, and is divided into 4 areas in total:

1. Mutable: Fixed size buffers for storing transient column blocks of L0
2. SST: Used for blocks in L1 and L2
3. Index: Store index information
4. Redo log: To serve uncommitted transaction data, each transaction requires at least one Buffer

Each buffer node in Buffer Manager has Loaded and Unloaded two states. When the user requests the buffer manager to Pin a buffer node, if the node is in a Loaded state, its reference count will increase by 1, if the node is in an Unloaded state, it will read data from disk or remote storage, and increase the node reference count. When when no memory is left, the LRU policy will evict some buffer nodes from memory to free up space. When the user Unpin a node, just call Close on the node handle. If the reference count is 0, the node becomes a candidate for eviction, and a node with reference count greater than 0 will never be evicted.

## WAL and Log Replay

As mentioned earlier, the WAL design in columnar engines is more intricate compared to row stores. In TAE, the redo log is not required to record every write operation, but it must capture the transaction at the time of commit. TAE utilizes the Buffer Manager to minimize IO usage, eliminating unnecessary IO events for short-lived transactions that may require rollback due to conflicts while still accommodating long or large transactions.The Log Entry Header format used in TAE's WAL is as follows:

![](/content/en/transactional-analytical-engine/form1.jpg)

The transaction Log Entry contains the following types:

![](/content/en/transactional-analytical-engine/form2.jpg)

Most transactions only have one Log Entry. Only large transactions may be require multiple Log Entries to be recorded. So a transaction log may contain 1 or more UC type log entries plus one PC type Log Entry, or just one AC type Log Entry. TAE allocates a dedicated Group for UC type Log Entries. The figure below shows transaction logs for six committed transactions.

![](/content/en/transactional-analytical-engine/picture6.jpg)

The Payload of a transaction Log Entry contains multiple transaction nodes, as shown in the figure. Transaction nodes contain various types, such as DML Delete, Append, Update, DDL Create/Drop Table, Create/Drop Database, etc. A node is an atomic command, which can be considered an index to a sub-entry of a committed Log Entry. As mentioned in the Buffer Manager section, all active transactions share a fixed amount of memory space, which is managed by the Buffer Manager. When space remaining is insufficient, some transaction nodes will be unloaded. If it is the first time a node is unloaded, it will be saved as a Log Entry in the Redo Log, and upon loading, the corresponding Log Entry will be replayed from the Redo Log. This process is illustrated as follows:

![](/content/en/transactional-analytical-engine/picture7.jpg)

In the above figure, TN1–1 represents the first transaction node of transaction Txn1. Initially, Txn1 registers transaction node TN1–1 in the Buffer Manager and writes data W1–1:

1. Txn2 registers transaction node TN2–1 and writes data W2–1, adds W1–2 to TN1–1
2. Txn3 registers transaction node TN3–1 and writes data W3–1
3. Txn4 registers transaction node TN4–1 and writes data W4–1, adds W2–2 to TN2–1
4. Txn5 registers transaction node TN5–1 and writes data W5–1
5. Txn6 registers transaction node TN6–1 and writes data W6–1, adds W3–2 to TN3–1, adds W2–3 to TN2–1, at this point a transaction commits, adds Commit info C5 to TN5–1, creates a Log Entry, adds C4 to TN4–1, creates corresponding Log Entry
6. Deregisters TN4–1 and TN5–1 from Buffer Manager. Before writing W3–3 to TN3–1, memory space is insufficient, Buffer Manager selects TN2–1 as evictable, it is unloaded to WAL as a Log Entry. Writes W3–3 to TN3–1, Txn2 registers TN2–2 in Buffer Manager and writes W2–4, at this point a transaction commits, writes Commit info C1 to TN1–1 and creates corresponding Log Entry, writes C6 to TN6–1 and creates corresponding Log Entry. Writes W2–5 to TN2–2, increases TN2–2 RefCount A2 and creates corresponding Log Entry.

Usually, a Checkpoint is a safe point. During restart, the state machine can apply Log Entries from this safe point. Log Entries before the Checkpoint are no longer needed and will be physically destroyed at the appropriate time. A Checkpoint can represent the data equivalent within its indicated range. For example, CKPLSN-11(-∞, 10]) is equivalent to the Log Entries from EntryLSN=1 to EntryLSN=10, the logs within that range are no longer needed. During restart, replaying from the last Checkpoint CKPLSN-11(-∞, 10]) is sufficient. Due to being columnar, TAE needs a two-level structure to record the last Checkpoint info, using Group in WAL to distinguish.

![](public/content/en/transactional-analytical-engine/picture8.jpg)

Implementing WAL and log replay in TAE is abstracted into an independent code module logstore, which abstracts access to underlying logs and can connect to different implementations from a single node to distributed. At the physical layer, the logstore behaviors relies are similar to message queue semantics. Starting with MatrixOne 0.6, the system architecture will evolve to the cloud native version, and the corresponding log service will run independently as a shared log, so at that time logstore in TAE will be slightly modified to directly access the external shared log service instead of relying on any local storage.

## Transactions

TAE uses MVCC to ensure SI snapshot isolation for transactions. In the case of SI, each transaction is assigned a consistent read view, known as the Read View, which is determined by the transaction's start time, so data read within the transaction will never reflect changes made by other concurrent transactions. TAE implements fine-grained optimistic concurrency control, only updates to the same row and column will conflict. Transactions use the value version present at the start of the transaction, and do not lock when reading data. If two transactions attempt to update the same value, the second transaction will fail due to a write-write conflict.

In TAE, a table contains multiple segments, a segment is the result of multiple transactions acting together. So a segment can be represented as [_Tstart_ ,_Tend_ ](_Tstart_ is the commit time of the earliest transaction, _Tend_ is the commit time of the latest transaction). Since a segment can be compressed into a new segment, and segments can be merged into a new segment, we need to add a dimension in the segment representation to distinguish versions ([_Tstart_ ,_Tend_ ], [_Tcreate_ ,_Tdrop_ ]) (_Tcreate_ is the creation time of the segment, and _Tdrop_ is the deletion time of the segment). _Tdrop_ =0 indicates the segment has not been discarded. The representation of Block is the same as segment ([_Tstart_ ,_Tend_ ], [_Tcreate_ ,_Tdrop_ ]) . When a transaction commits, its Read View needs to be obtained based on the commit time:

(_Txncommit_ ≥ _Tcreate_) ∩ ((_Tdrop_ =0) ∪ (_Tdrop_ >_Txncommit_))

Background asynchronous tasks perform the generation and changes of segments,so TAE also incorporates these asynchronous tasks into the transaction processing framework to ensure data read consistency, for example:

![](public/content/en/transactional-analytical-engine/picture9.jpg)

_Block_1_L_0 is created at \_t1_, it contains data from _Txn1_, _Txn2_, _Txn3_, _Txn4_. _Block_1_L_0 starts sorting at \_t_11, its Read View is the baseline plus an uncommitted update node. Sorting and persisting a block can take a long time. Before committing sorted \_Block_2_L_1 at \_t21_, there are two committed transactions _Txn5_, _Txn6_ and one uncommitted transaction _Txn7_. When _Txn7_ commits at _t_16, it will fail, because \_Block_1_L_0 has already been terminated. The update nodes from \_Txn5_, _Txn6_ committed between (\_t_11 ,\_t_16 ) will be merged into a new update node, which will be committed with \_Block_2_L_1 at_t_16.

![](public/content/en/transactional-analytical-engine/picture10.jpg)

The Compaction process terminates a series of blocks or segments, while atomically creating a new block or segment (or building an index). Compared to normal transactions, it usually takes a long time, and we do not want to block update or delete transactions on the involved blocks or segments. Here we extend the content of the Read View to include the metadata of blocks and segments. When committing a normal transaction, it will fail once a write operation is detected on a block (or segment) whose metadata has been changed (committed). For a Compaction transaction, the write operations include soft deletion and adding blocks (or segments). Conflicts between writes are detected on each write during transaction execution. Once a conflict occurs, the transaction will be terminated prematurely.

## MVCC

Let's look at TAE's MVCC version information storage mechanism. The version storage mechanism of a database determines how the system stores these versions and what information each version contains. Creating a latch free linked list based on the pointer field of the data Tuple is called a version chain. This version chain allows the database to locate the required version of a Tuple. Therefore, the storage mechanism of these version data is an important consideration in the design of database storage engines. One approach is to use Append Only, where all Tuple versions of a table are stored in the same storage space. This method is used in Postgres. To update an existing Tuple, the database first gets an empty slot from the table for the new version, then copies the content of the current version to the new version. Finally, it applies modifications to the Tuple in the newly allocated slot. The key decision of the Append Only scheme is how to sort the version chain for Tuples, since it is impossible to maintain a lock free bidirectional linked list, the version chain only points in one direction, either from Old to New (O2N), or from New to Old (N2O). Another similar scheme is called Time-Travel, which stores version chain information separately, while the main table maintains the main version data. The third scheme maintains the main version of the Tuple in the main table, and holds a series of delta versions in a separate delta storage. This storage is called rollback segments in MySQL and Oracle. To update an existing Tuple, the database obtains a contiguous space from the delta storage to create a new delta version. This delta version contains the original values of the modified attributes, instead of the entire Tuple. Then the database directly performs In Place Update on the main version in the main table.

![](public/content/en/transactional-analytical-engine/picture11.jpg)

These schemes have different characteristics that affect their performance in OLTP workloads. For LSM Tree, since it is inherently Append-only structure, it is closer to the first one. The linked list of the version chain may need to be reflected. For example, in RocksDB, all write operations are later merged, so naturally there are also multiple versions of the Key (different versions may be on different Levels). When the amount of updates is not large, this structure is simple and can easily achieve better performance. TAE currently chooses a variant of the third scheme, as shown below:

![](public/content/en/transactional-analytical-engine/picture12.jpg)

**This is mainly based on the following considerations:** When the amount of updates is huge, the old version data in the LSM Tree structure will cause more read amplification. While version chain of TAE is maintained by the Buffer Manager, when it needs to be evicted, it will be merged with the main table data to regenerate new blocks. Therefore semantically it is In-Place Update, but implementation-wise it is Copy On Write, which is required for cloud storage. The regenerated new block will have less read amplification, which is more beneficial for AP queries after frequent updates, currently DuckDB also uses a similar mechanism in columnar storage. Of course, on the other hand, the semantic In Place Update also brings additional difficulties, which will be gradually introduced in future TAE articles.

Essentially, as a brand new designed and implemented storage engine, TAE still needs time to mature, but each of its components is completely built from scratch and continuously evolving rapidly. In subsequent articles, we will gradually share TAE's adjustments under the separate compute and storage system.

In our articles, we would keep exploring the dynamic world of databases and Golang. It's a journey through how these two powerful tools complement each other. Whether you're deeply involved in tech or just starting to get curious, we believe there's something in there for everyone.

You can simply click here [MatrixOrigin Community](https://discord.gg/taTffjxARw) to join our Discord community to dive deeper into the world of MatrixOrigin, where enthusiasts and experts alike share insights and explore the cutting-edge of database technology.
