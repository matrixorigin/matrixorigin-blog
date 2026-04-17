---
title: >-
  How to Overcome Three Major Challenges (1): Transitioning from NewSQL to HTAP
  Distributed Architecture
author: MatrixOrigin
mail: contact@matrixorigin.io
description: >-
  In recent years, HTAP databases have become a fashionable term, and mentioning
  HTAP has turned into a trend among many database professionals. How to create
  an HTAP database, starting from the architectural level to address and embrace
  future changes, remains an ongoing exploration for many database companies.
tags:
  - technology
keywords:
  - MatrixOne
  - HTAP Database
  - Cloud-Native
  - NewSQL
  - Distributed Database
publishTime: '2023-12-13 17:00:00+00:00'
image:
  '1': /content/en/shared/how-to-overcome-three-major-challenges.png
  '235': /content/en/shared/how-to-overcome-three-major-challenges.png
date: '2023-12-13 17:00:00+00:00'
lang: en
status: published
---

In recent years, HTAP databases have become a fashionable term, and mentioning HTAP has turned into a trend among many database professionals. How to create an HTAP database, starting from the architectural level to address and embrace future changes, remains an ongoing exploration for many database companies.

We hope what we do would somehow inspiring you.

Over the past two years, MatrixOne has undergone an architectural evolution from a more experimental old architecture to a future-oriented new architecture, capturing the attention of many database developers and operational engineers.The nature of this architectural evolution and its noteworthy aspects will be revealed in this article.

## The Layered Cake of Early Architecture

MatrixOne, as an open-source distributed architecture database, has a lifespan of nearly two years. Many long-standing community users likely remember the high performance during the SSB tests of the early architecture. However, after the release of version 0.5, there was a significant decline in performance. Friends asked me why it seemed to be regressing, and I explained that there was **a major move, a large-scale upgrade of the entire architecture.**

At this moment, I feel it's necessary to provide a comprehensive explanation of the architectural evolution and upgrade.

How do we define the early architecture of MatrixOne? Specifically, it refers to the architecture of MatrixOne from versions 0.1 to 0.4, which was prevalent in various releases before the first half of 2022. Rather than calling it an architecture, it's more apt to describe it as an experiment to explore the shortcomings of various architectures and find one truly suitable for native HTAP distributed architecture.

![](/content/en/surmounting-three-major-challenges-the-evolution-from-newsql-to-htap-distributed-arichitecure-1/picture1.jpg)

The old architecture of this experiment had two notable features: NewSQL and MPP. NewSQL was derived from several classic papers by Google and forms the general approach of many database products today. MPP, as the name suggests, stands for Massively Parallel Processing, with parallel computing as its prominent feature. Applied to the early architecture of MatrixOne, these concepts take on more specific meanings.

**NewSQL:**

1. **Distributed Architecture:** Multi-node distributed database servers, each containing computational resources and their own storage nodes, addressing scalability and high availability issues of traditional single-node databases.
2. **Multi-Engine:** Database servers may have multiple storage engines, each with different characteristics, catering to different scenarios.

**MPP :**

**Parallel Computing**: Tasks are distributed in parallel across multiple servers and nodes, with the partial results from each node aggregated to produce the final outcome.

![](/content/en/surmounting-three-major-challenges-the-evolution-from-newsql-to-htap-distributed-arichitecure-1/picture2.jpg)

### 1.1. Detailed Explanation of the Early Architecture

Delving deeper, focusing on the internal structure of the MatrixOne Server, it comprises multiple modules that work collaboratively to fulfill the functions of the entire distributed database.

It is divided into **five parts: the frontend, computation layer, distributed framework, storage layer, and metadata layer.**

- SQL Frontend:

Also known as the SQL frontend, it directly handles SQL statements and provides the following functions.

Offers MySQL-compatible protocols, ensuring that various MySQL protocols can be received by MatrixOne;

Compatible with MySQL syntax, it makes syntax judgments on received SQL that conform to MySQL.

- Query Parser:

Is the syntax parsing module in MatrixOne, providing the following functions:

SQL parsing, converting frontend SQL into an abstract syntax tree;

Dialect support offers the basis for supporting multiple SQL dialects.

- MPP SQL Execution:

Is the SQL executor that implements MPP, providing the following functions:

SQL acceleration, vectorizing some basic operations of the SQL computation engine, with some operations accelerated through assembly rewriting;

Plan construction, using unique factorization acceleration capabilities for SQL plan construction.

- Distributed Framework:

The early distributed framework of MatrixOne, called MatrixCube, is also an open-source project, equipped with the following components and functions:

Provides high availability, multiple replicas, strong consistency, and automatic load balancing; offers support for distributed transactions (Work In Progress);

Provides a Raft-based replica scheduling mechanism, known as Prophet in the code.

- Storage Layer:

The early storage layer of MatrixOne is an architecture with multiple engines, where various storage engines work together to fulfill the functions of the HTAP database:

1. AOE Engine, Append Only Engine, an append-only columnar storage engine that does not support transactions;
2. TPE Engine, Transaction Processing Engine, used for storing the metadata catalog;
3. TAE Engine, Transactional Analytical Engine, a columnar-based HTAP engine, providing complete ACID capabilities and powerful OLAP capabilities.

The metadata layer is a component frequently accessed by every other module in the early MatrixOne architecture, stored in the TPE engine, providing global metadata storage and retrieval, and is a frequently used module.

### 1.2. Why Was the Early Architecture Insufficient?

As an early architecture, it primarily bore the initial explorations and research of the development team, gradually discovering a future-oriented architecture through experimental structuring. As development progressed, unsurprisingly, the problems of the old architecture began to emerge, increasingly becoming a shackle to further development, culminating in three main areas:

- Scalability：Share-nothing architecture, requiring simultaneous expansion of storage and computational resources for each additional unit node;

Each piece of data must be stored in at least three replicas, making the time from node expansion to completion longer.

- Performance: The leader role in the Raft protocol tends to create hotspots;

Underperforming storage can lead to a greater-than-expected decline in overall database performance;

The different purposes and performances of various engines make them ineffective in handling HTAP scenarios.

- Cost: Storing three copies of data, with costs escalating with node scale, is even more pronounced in cloud versions;

Only high-end storage can deliver the expected performance of the database.

**These three major challenges compelled the MatrixOne team to ponder what kind of architecture would meet the future needs of HTAP, providing cloud users and private clients with the best product experience and practices. Like many stories of breaking and rebuilding, at this juncture, led by CTO Dr. Tian Feng, the MatrixOne team embarked on the path of architectural upgrading.**

## Part 2. Three Major Challenges: Starting Anew

The three major challenges were the superficial aspects of the old experimental architecture, and solving problems based solely on these aspects would only address the what, not the why. The deeper causes still needed to be unearthed and confirmed. After repeated hypotheses and demonstrations by the MatrixOne development team, the root causes of the old architecture's inadequacies were identified as three major issues, looming over MatrixOne like three mountains, haunting every MOer.

### 2.1. Distributed Framework

MatrixCube, as the distributed framework at the time, provided a multi-replica storage mode, storing each piece of data in three replicas and in shard form, causing storage costs to skyrocket.

The Leader nodes, based on Raft elections, frequently became hotspots, with all operations needing to be distributed through the Leader node. In extreme business scenarios, the load on Leader nodes could be several times that of ordinary nodes.

### 2.2. Numerous Engines

The early MatrixOne had three built-in storage engines, with low code reuse among them, necessitating more manpower for maintenance.

The plan construction method based on factorization algorithms was too aggressive and abstract, with a limited number of programmers in the compute group fully understanding it, often requiring a lead developer to complete new features, slowing down the addition of new functionality.

### 2.3. Resource Allocation

The old architecture used a non-segregated storage-compute model, leading to poor scalability. Expanding a unit of compute nodes required synchronous expansion of storage resources.

The use of shard partitioning in storage meant that large shards impacted OLTP performance, while small shards affected OLAP performance.

Having identified these challenges, the next step was to tackle them one by one. Dr. Tian Feng, combining MatrixOne's product vision and future technological trends, summarized the experimental architecture and proposed MatrixOne's unique architectural concept. The approach to addressing the current **state of the architecture was threefold:**

1. First, break away from the old architecture's share-nothing framework to achieve more flexible decoupling;
2. Second, consolidate the various engines into one, achieving a unified internal engine;
3. Third, reconstruct the compute engine, leaving ample room for future product development.

In summary, this phase was crucial in identifying the core challenges that needed addressing, setting a clear direction for the subsequent phase of redevelopment. The insights gained from this early architecture, particularly the issues of scalability, performance, and cost, laid the groundwork for a significant architectural transformation. This transformation, detailed in the next section, marks the transition from an experimental framework to a more refined and future-oriented architecture.
