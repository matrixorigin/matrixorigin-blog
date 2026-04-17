---
title: >-
  How to Overcome Three Major Challenges (2): Transitioning from NewSQL to HTAP
  Distributed Architecture
author: MatrixOrigin
mail: contact@matrixorigin.io
description: >-
  From the insights gained in the last article, which highlighted the challenges
  and limitations of MatrixOne's early architecture, we transition into this
  section, where the focus shifts to the transformative rebirth and strategic
  refinement of its structure.
tags:
  - technology
keywords:
  - MatrixOne
  - HTAP Database
  - Cloud-Native
  - NewSQL
  - Distributed Database
publishTime: '2023-12-14 17:00:00+00:00'
image:
  '1': /content/en/shared/how-to-overcome-three-major-challenges.png
  '235': /content/en/shared/how-to-overcome-three-major-challenges.png
date: '2023-12-14 17:00:00+00:00'
lang: en
status: published
---

From the insights gained in the [last article](/posts/surmounting-three-major-challenges-the-evolution-from-newsql-to-htap-distributed-arichitecure-1), which highlighted the challenges and limitations of MatrixOne's early architecture, we transition into this section, where the focus shifts to the transformative rebirth and strategic refinement of its structure.

## 3. MatrixOne Reborn

![](/content/en/surmounting-three-major-challenges-the-evolution-from-newsql-to-htap-distributed-arichitecure-2/picture1.jpg)

The new architecture, through decoupling, ultimately achieved three independent layers, each with its own object units and division of labor, allowing different types of nodes to scale flexibly without being constrained by other layers:

- **Compute Layer:** with Compute Nodes as units, achieved serverless computing and transaction processing, and with its own Cache, it can be arbitrarily restarted and scaled;
- **Transaction Layer:** with Transaction Nodes and Log Service as units, provides complete log services and metadata information, with built-in Logtail for storing recent data;
- **Storage Layer:** where all data is stored in object storage represented by S3, achieving low-cost, infinitely scalable storage, and a unified file operation service named File Service, enabling nodes to operate on underlying storage seamlessly.

![](/content/en/surmounting-three-major-challenges-the-evolution-from-newsql-to-htap-distributed-arichitecure-2/picture2.jpg)

After deciding on TAE as the sole storage engine, numerous design adjustments were made to the integrated TAE engine, leading to the later version of the integrated TAE storage engine. This achieved the goal of a single engine handling all database storage behaviors, with the following advantages:

- **Columnar Storage Management:** unified columnar storage and compression, offering inherent performance advantages for OLAP operations;
- **Transaction Processing:** shared logs and TN(DN in diagram above) nodes jointly support transactions for compute nodes;
- **Hot-Cold Separation:** using File Service with S3 object storage as the target, each compute node has its own Cache.
- ![](/content/en/surmounting-three-major-challenges-the-evolution-from-newsql-to-htap-distributed-arichitecure-2/picture3.jpg)

Multiple tests were run, yielding results with high confidence:

In the early compute engine, the overarching goal of MySQL compatibility remained unchanged, but there were higher demands for node scheduling, execution plans, and SQL capabilities. The restructured high-performance compute engine not only retained the MPP of the experimental architecture's compute engine but also addressed many of its past shortcomings:

- **MySQL Compatibility,** supporting both MySQL protocols and syntax;
- **Integrated Engine,** reconstructing execution plans based on DAG, capable of executing both TP and AP; Node Scheduling, potentially supporting adaptive intra-node and inter-node scheduling, fulfilling both concurrent and parallel execution;
- **Enhanced SQL Capabilities,** supporting subqueries, window functions, CTEs, Spill memory overflow handling, etc.

## 4. Small Steps Lead to Great Distances

Reflecting on the months-long journey of architectural upgrading, it was filled with various hardships and pains. No matter how well-planned, unexpected issues always arise in actual development, especially with key challenges, leading the development team from initial helplessness to occasional breakthroughs, and finally towards the dawn of success. The intricacies of this process are self-evident.

These challenges mainly revolved around storage, transactions, load isolation, and resource allocation.

### 4.1. Finding More Suitable Storage:

After realizing the issues with three-replica storage, finding a new storage solution that fit the new architecture became a significant challenge, with the new storage needing to meet two core requirements: low cost and separation of hot and cold data.

After researching and experimenting with various storage options on the market, AWS S3 was chosen as the final solution, offering single-replica storage with inherent hot-cold data separation.

### 4.2. Adjusting the Division of Transaction Work:

In the initial new architecture, the division of labor between Compute Nodes (CN) and Database Nodes (TN) was such that CNs were responsible for computation, pushing the results to TNs for transaction completion. As development progressed, this division of labor began to pose problems, with TNs' transaction processing capabilities becoming a bottleneck for the entire system.

Therefore, the division of labor between CNs and TNs had to be redefined:

- CNs are responsible for all computation and transaction logic, while TNs handle metadata, log information, and transaction adjudication, ensuring TNs are no longer a bottleneck;
- Logtail objects are introduced in the logs to store associated data from recent logs, with Logtail data periodically written to S3. CN expansion can synchronize Logtail data to Cache in real-time, enabling partial data sharing;
- A threshold is set for transaction size; transactions exceeding the threshold are written directly to S3, with logs only recording the write operations. Transactions below the threshold continue to be written by TNs, significantly increasing throughput.

### 4.3. Implementing Workload Isolation in HTAP:

As an HTAP database, how to achieve isolation of different types of workloads is a critical issue to address. After successfully decoupling the old experimental architecture, workload isolation was also achieved:

Server-level isolation, where, in the case of abundant hardware resources, each component runs on separate physical machines, all accessing the same object storage;

Container-level isolation, utilized when hardware resources are limited, leveraging the stateless nature of all nodes, using containers as the means of isolation for each node.

### 4.4. Implementing Flexible Resource Allocation Adjustments

As an HTAP database, in daily operations, the proportion of different business scenarios is dynamically changing, demanding higher requirements for resource allocation. The resource distribution model under the old architecture inevitably lacks flexibility, necessitating more refined management of each node, including but not limited to:

- The division of CN nodes, allowing users to allocate CNs for TP or AP tasks, and horizontally scaling CNs when a bottleneck occurs in any business resource;
- Dynamically assessing the load of CN groups in different business types, and automatically reallocating idle resources to busier groups when there is a significant load difference between the two types of business;
- Implementing complete logical isolation of resources through the concept of tenants (accounts), where different tenants can use designated CN resources in either an exclusive or shared manner.

## 5. Reviewing and Reaping the Benefits

Behind the resolution of numerous issues were the relentless efforts of many MOers, who, after enduring significant challenges, gained knowledge and experience in areas previously unexplored. These were not only accumulations of problem-solving but also valuable assets for the future development of MatrixOne.

Consequently, from the perspective of the three-layer architecture post-decoupling, I interviewed several colleagues and, after listening to their reflections and thoughts on the issues, provided the following feedback:

**Compute Layer:**

- Understanding SQL execution, through Plan reconstruction, led to a deeper understanding of SQL syntax parsing, execution plans, and standard SQL syntax;
- Transactions and ACID, after focusing on a single engine, almost every SQL statement required consideration of transactions and ACID, necessitating a deeper understanding of these concepts.

**Transaction Layer:**

- CN and TN adaptation, from the beginning of the architectural upgrade, the division and adaptation of CN and TN became a significant challenge, with the optimal solution obtained through repeated validation;
- Partial data sharing, the introduction of Logtail, enabled the sharing of certain data among different CNs.

**Storage Layer:**

- Using S3 storage, accumulated experience in engine development based on object storage like S3, demonstrating that object storage can also be well adapted to databases;
- Fileservice, a storage service, implementing read-write operations for different nodes on various underlying storage types, posed a significant challenge.

Finally, let's summarize the key points of the MatrixOne architectural upgrade: From integrated storage-compute to a three-layer decoupling of computation, transactions, and storage; From multiple engines to a single TAE HTAP integrated engine; From factorization algorithms to DAG-based plan construction; From multi-replica storage to the introduction of object storage and Logtail; Resource isolation brought by flexible node allocation adjustments.
