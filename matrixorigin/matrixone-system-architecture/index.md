---
title: MatrixOne System Architecture
author: MatrixOrigin
mail: contact@matrixorigin.io
description: >-
  In the era of digital transformation, data has become increasingly valuable.
  There is a growing trend of convergence in data technology. To address the
  pain points of customers, we have launched a simple, fast, and cloud native
  database, MatrixOne.
tags:
  - technology
keywords:
  - MatrixOne
  - Database
  - Relational Database
  - Architecture
  - Cloud-Native Database
publishTime: '2023-09-25 17:00:00+00:00'
image:
  '1': /content/en/matrixone-system-architecture/matrixone-system-architecture.png
  '235': /content/en/matrixone-system-architecture/matrixone-system-architecture.png
date: '2023-09-25 17:00:00+00:00'
lang: en
status: published
---

## Guide

In the era of digital transformation, data has become increasingly valuable. There is a growing trend of convergence in data technology. To address the pain points of customers, we have launched a simple, fast, and cloud native database, MatrixOne.

We will delve into the architectural design of MatrixOne, the next generation hyper-converged heterogeneous cloud-native database. We will focus on the following three key points:

- Challenges to data storage and processing
- MatrixOne architecture, components and design trade-offs
- MatrixOne transaction related read/write processes

## Part 1 Challenges to data storage and processing

### 01 Numerous components of the enterprise digital middleware

When enterprises undergo digital transformation, they often establish a technology middleware and develop a comprehensive suite of data processing systems using Hadoop. The diagram below illustrates the typical data components present within the Hadoop system. As depicted, various components have different versions and compatibility requirements, which entail managing numerous intricate details. This complexity increases the costs associated with learning, maintenance, and troubleshooting.

![](/content/en/matrixone-system-architecture/picture1.jpg)

Building and maintaining a data center can be compared to assembling building blocks. Each individual component is developed separately and functions independently. While these components may work individually, the system becomes fragile and unreliable. If any of these components encounter issues, it can lead to the entire system becoming unavailable. Additionally, managing and maintaining the entire system becomes challenging, and the cost of building such a system increases significantly.

### 02 Databases

In the history of database development, relational databases emerged in the 1970s. In the 1980s, there was significant progress in developing OLTP databases, leading to the introduction of Oracle, DB2, Sybase, and SQL Server. The 1990s saw the rise of AP-type databases, while the 2000s witnessed the emergence of NoSQL databases alongside the rapid growth of the Internet. NoSQL databases were designed to offer improved scalability, particularly in horizontal scaling. Although NoSQL databases generally lack strong transaction support, they provide excellent flexibility for data storage. Around 2000, several NoSQL databases supporting key-value (KV) stores, document-oriented structures, and JSON data format became prevalent.

From around 2000, extensive data systems like Hadoop, and tools like Hive and Spark emerged. During the same period, various solutions were developed to address the limitations of traditional databases in terms of horizontal scalability. One solution involved implementing middleware, such as split libraries and split table approaches, on top of traditional databases like MySQL. These middleware solutions enabled distributed transaction capabilities by building on top of the database infrastructure.

Another solution that gained popularity was NewSQL, with Google Spanner being a representative example. Other databases like OceanBase, TiDB, CockroachDB, and YugaByte also belong to this category. NewSQL databases typically utilize a KV (key-value) engine at the lower layer and employ consensus protocols like Raft or Paxos at the upper layer to ensure the reliability of logs and state machines.

Since 2010, cloud computing has experienced rapid development, posing new challenges for databases that must operate within the cloud. The first generation of cloud databases faced the issue of deploying a database on the cloud. However, the second and third generations of cloud-native databases now utilize cloud-based components, such as S3 and object storage, to improve scalability and reduce costs.

Two examples of cloud-native databases are Aurora, which is representative of TP-type databases, and Snowflake, which is representative of AP-type databases. The separation of storage and computation characterizes the architecture of such databases. This means that nodes responsible for computation and storage can be independently expanded or contracted, resulting in significant cost savings for users. Additionally, these databases require no deployment and are easy to maintain, offering developers a seamless and straightforward experience.

After years of development, extensive data has progressed from purely batch processing to solutions that include stream processing. These innovations have made it possible to handle real-time workloads and support better analytics capabilities. Moreover, the fusion of big data systems with AP-type databases has further enhanced analytical capabilities.

The data lake is usually used to solve the unstructured data, can store all types of data, while the data warehouse deals with structured data, the combination of the two is Lakehouse. Lake warehouse one of the more representative open source system is Hudi, Iceberg, a non-open source Lakehouse.

From the above developments, it can be observed that convergence is the trend in the development of extensive data systems in recent years. This includes the convergence of TP and AP, as well as the convergence of data lakes and data warehouses. MatrixOne is precisely such a hyper-converged database, similar to a smartphone that integrates functions like a camera, phone, e-books, and alarm clocks. It can utilize multiple databases to significantly reduce the cost of database operations and maintenance.

## Part 2 MatrixOne architecture, components and design trade-offs

The diagram shows the architecture of MatrixOne：

![The Architecture of MatrixOne](/content/en/matrixone-system-architecture/architecture-of-matrixone.jpg)

- First of all, the top layer is the compute layer, and the compute nodes in this are called CN. CNs can do analytics, streaming computation, and background task processing. The user level and the frontend business cannot perceive the background processing tasks of the compute node.
- The main nodes in the transaction layer below the compute layer are TN, which share nothing and horizontally scalable. The data slices between and within each TN are disjoint. The current scheme is to do the horizontal distribution of data expansion according to the data primary key. The data ranges handled by each TN do not intersect with each other, and there is no need for conflict detection.
- At the lower level are Log service and File service, the logs of data written by TN nodes will be stored in Log service, which uses Multi-Raft to build a reliable storage state machine, and asynchronous compaction tasks to merge the logs and write them to File service. The asynchronous compaction task merges the logs and writes them to the File Service, which is a common interface to local disks, NFS, S3, HDFS and other data storage systems.
- The HA Keeper component is a centralized cluster management component, not the Zookeeper commonly used in Big Data. The current implementation uses a single Raft group. HA Keeper maintains the state and reliability of the compute cluster, TN cluster, and Log Service cluster. HA Keeper pulls nodes up when it finds that a node in the cluster is down.

### 01 File Service

MatrixOne expects it to support both public and private cloud deployments, using a single solution for both deployment methods. In a private environment, users have a variety of actual storage environments, and may choose to use HDFS, Ceph, etc. for storage. In cloud-native scenarios, there are also various choices, S3-compatible protocols, AliCloud OSS, etc.

In this context, we make a generic abstraction of storage, and this service, File Service, is provided as a storage interface for TN nodes and CN nodes to interact with data. At the same time, File Service itself also takes on the job of data caching.

### 02 Log Service

Log Service is a Multi-Raft group. Since the storage is Log tail, the amount of data is not large. However, we have very high throughput requirements for Log Service. Therefore, we need to configure better hardware devices for Log Service during deployment, such as hard disk needs to use SSD disk.

### 03 Transcation Node

Each TN node is shared-nothing, and the data that each TN node accesses each other is not overlapped. The current version of the TN component of the data division using the primary key to do the hash way to achieve, do not use the range of the way to achieve, because we think that the hash way will make the distribution more uniform.

The horizontal scaling of TN nodes is more complex than the horizontal scaling of CN nodes. Traditional NewSQL scaling nodes can be scaled up using the characteristics of Raft groups, adding or subtracting replicas.

### 04 Compute Node

MatrixOne is a storage-computing separation architecture, and the horizontal scalability of the computational node CN node is extreme, and it can be expanded and contracted arbitrarily.

In addition to foreground query tasks, CN nodes handle streaming and background tasks. The background tasks include asynchronous Compaction tasks, which modify the data and conflict with the foreground task data, and these conflicts need to be detected and handled.

The background task scheme is initiated by the TN node. The TN node maintains a state machine, which discovers the node and initiates an asynchronous task to the CN node to invoke the background task. This process does not require high reliability and asynchronous background tasks do not require high real-time responsiveness and idempotence.

### 05 HA Keeper

HA Keeper maintains the state of each node in the cluster, keeps a heartbeat with each node in the cluster, and pulls the node up when the node hangs; in addition, HA Keeper also interacts with the external K8S resource pool to establish the context of the added nodes. HA Keeper is a reliable cluster with a single Raft group, which does not have a high degree of concurrency itself, and can only carry a low heartbeat frequency.

## Part 3 MatrixOne transaction related read/write processes

### 01 Workflow

MatrixOne uses a two-phase commit (2PC) implementation of transactions that is slightly different from the current NewSQL solution. The specific writing process is as follows:

![](/content/en/matrixone-system-architecture/picture2.jpg)

The client writes data using the write interface and saves the read/write space of the transaction on the CN node after the request reaches the CN node. The data starts conflict detection only regarding the TN(TN in the diagram) node.

The data interactions that occur in the middle of a transaction from begin to commit are stored on the CN node's workspace, and once the client initiates the commit, the CN node performs a two-phase commit to push the data to the TN node. The workspace data may be distributed across multiple TN nodes, so we designed a two-phase processing flow within the TN node: The first stage is Prepare and the second stage is commit.

To ensure the reliability of the two phases, we ensure that one of the multiple TN nodes is chosen as the coordinator, a role also known as transaction record in some systems.The first TN node we do transaction commit and record all the transaction participants in the transaction coordinator.

When a transaction occurs, the prepared log is first written to the Log service for persistence, including the commit information of the transaction, the prepare information on the TN, etc. The prepared transaction information will be returned to the CN, which receives the response from the transaction participants, i.e., the whole transaction is successful, and then returns that the user commit has been successful; or that the user commit has been successful; or that the user commit has been successful, or that the user commit has been successful. The CN node receives the response from the transaction participant, which means the whole transaction is successful, and then returns to the user that the commit has been successful; or it returns to the user after the rollback.

The two-phase transaction is asynchronous; the TN node commit process is asynchronous with the preparation and return to the user after the successful commit. The two-stage transaction with some special features: first of all, the workspace is stored in the CN node, conflict detection in the TN node; the second feature is the distributed transaction using Clock SI way to allocate timestamps.

### 02 Clock SI

![](/content/en/matrixone-system-architecture/picture3.jpg)

The Clock SI itself is defined as circled in the red box above. Any transaction opens a consistency snapshot, the start of which is determined by a snapshot timestamp, and all transactions that have been committed before this timestamp are visible in this snapshot. The commit timestamps are in full order. Transactions are canceled if a concurrent write-write conflict occurs.

Clock SI mainly solves the problem of distributing timestamps without a central node, i.e., using each node's own timestamp. However, there is the problem of always clock drift between nodes and nodes, and clock drift faces two error bugs:

![](/content/en/matrixone-system-architecture/picture4.jpg)

The first error is the snapshot unavailability problem, Fig.1 on the left side shows two transaction participants P1 and P2 on different nodes, there is a clock drift between them, which will lead to the problem that the snapshot is unavailable before P2 reaches t.

The second error is shown in Fig.2, T2 if read at T1 commit, get the data need to wait until T1 commit is completed to read the data after T1 commit, do not wait for it can not read the data snapshot.

Clock SI uses Algorithm 1 in the figure above for the second error to solve both problems. When T.SnapshotTime exceeds the current commit timestamp to read the data, otherwise wait; that is, if there is currently a transaction in the preparation and commit, you need to wait for the preparation and commit to be completed before you can do conflict detection, do commit.

MatrixOne combines Clocks SI and HLC, HLC is a hybrid logic clock, the two participants in the transaction clock drift occur when the use of hybrid logic clock calibration, to resolve the first error.

### 03 Read

For read requests with high data consistency requirements, the read request needs to pull the latest distribution of data from the TN after the read request reaches the CN node, and the TN(TN in the diagram) returns both the latest metadata and meta to the CN node. Based on this information, the CN node pulls the data from the File Service interface.

![](/content/en/matrixone-system-architecture/picture5.jpg)

MatrixOne uses a single column memory to store data, each column's block and segment's tree structure and bloom filter, minmax index and other information are stored in the meta, index zone, all data writes are append only, no matter updating, inserting or deleting are just All data writing is append only, no matter updating, inserting or deleting, it is just adding new files. Merge on read is used to do the merge when querying.

The latest meta is saved in TN, and the tree structure is used to save it in TN. When querying, CN will ask TN for snapshots and log tail, and CN will trim the SQL according to the records in the snapshots. For example, when doing a SQL query, a bloom filter can be used as a runtime filter, so that the amount of data that really needs to be read for computation is relatively small.

In addition, TN node will return log tail data to CN node, which is relatively small, so it is not a big problem.

For TP query, CN can do consistency read after getting the latest data. For AP query, CN can do consistency read after getting the latest data, while AP query has lower requirement for data consistency and can use meta read stored in CN, which has less pressure on TN load and can carry high throughput.

### 04 Asynchronous Compaction

We can use the CN to scan the data to decide whether to do the compaction or the TN node to determine whether to do the compaction. The following figure shows the operation flow of using TN for compaction.

![](/content/en/matrixone-system-architecture/picture6.jpg)

When a TN node finds that too much data has been deleted and the data is fragmented, it performs a data merge. The data merge triggers a dedicated compaction node to run the merge, the CN node will collect the data where the compaction is going to happen, merge it within the CN node and submit it.

Compaction will produce modifications to the data, the process itself is also a transaction, will submit data to the TN and data detection.

Compaction process to modify the data, the foreground task may also modify this part of the data, at this time, write-write conflicts may occur, write-write conflicts will abort the background compaction. At this time, re-running the condensation, independent of the CN node to run the compaction task, will not impact the user experience.

### 05 Streaming Plan

Currently, streaming is done by two schemes, one is that the data is modified, and the delta snapshot is pushed to the CN node based on the last generated snapshot and the current snapshot, and the CN node itself generates a DAG graph based on the streaming task, and does the incremental computation on the DAG graph. The incremental computation also obtains the result of the last query and does incremental computation based on it.

![](/content/en/matrixone-system-architecture/picture7.jpg)

The final query result combines the delta and base query results in the figure above. The part that stores the intermediate results uses the push model. Another way is to pull the base result, pull a delta snapshot from the CN node periodically when the user does a streaming query, and then do an incremental query. After the query is finished, the latest base result is stored on a reliable storage such as S3, HDFS, etc., and the stored base result can be used next time when doing incremental computation.
