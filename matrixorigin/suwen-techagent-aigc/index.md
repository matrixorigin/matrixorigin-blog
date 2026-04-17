---
title: >-
  TechAgent of Shenzhen Suwen Intelligence | MatrixOne Builds a Hyper-Converged
  AIGC Data Infrastructure Platform
author: MatrixOrigin
description: >-
  Suwen Intelligence adopts MatrixOne to simplify its complex multi-database
  architecture into a unified platform, reducing delivery time from two months
  to one week and enabling minute-level data processing.
tags:
  - usecase
keywords:
  - MatrixOne
  - AIGC Platform
  - TechAgent
  - Hyper-Converged Database
publishTime: '2025-01-09T17:00:00+08:00'
image:
  '1': /content/zh/shared/case.png
  '235': /content/zh/shared/case.png
annotation: AI 智能体应用 - 素问智能 AIGC 平台
date: '2025-01-09T17:00:00+08:00'
lang: en
status: published
---

## TechAgent of Shenzhen Suwen Intelligence | MatrixOne Builds a Hyper-Converged AIGC Data Infrastructure Platform

### Client's Introduction

Suwen Intelligence, founded in 2017, is a service provider focused on delivering industry-chain public opinion data. Suwen Intelligence has served dozens of leading manufacturing enterprises and government industrial management institutions. It has built an industry public opinion big data platform named **TechAgent**, which is based on enterprise basic information, research reports, financial reports, patents, news, and other full-network data. Through natural language processing, the platform searches enterprise-specific information and deep industry-chain linkages, constructs comprehensive enterprise profiles, and captures industry-chain information in real time, supporting services such as industry-chain analysis, industrial planning, and industrial consulting and tracking.

### Business Challenges

TechAgent represents a typical scenario centered on data processing and transformation as its core capability. Its business models include direct data report services, data SaaS, and API services. In practice, all these delivery models ultimately rely on a complete in-house data processing platform built by Suwen. To support diversified functions and business models, this data processing platform was designed to be highly complex, which has led to certain challenges in operations, maintenance, and development iteration.

**Challenge 1**

The upstream of TechAgent consists of a large number of data collection programs, including data obtained via web crawlers from public sources, commercial data acquired through API, and data extracted from files through preprocessing programs. All these data are stored in MySQL after being structured. Some of the data need to be processed by LLM before application. Due to the characteristics of the algorithms, the outputs are often JSON files with relatively complex structures. MySQL's JSON capabilities are insufficient to meet these requirements, so Suwen introduced a MongoDB instance to store and query these JSON files.

**Challenge 2**

Search is one of TechAgent's core capabilities. This includes both keyword-based full-text search and semantic-based vector search. As a result, TechAgent introduced ElasticSearch and Faiss, each dedicated to supporting one of these two independent search capabilities.

**Challenge 3**

As the business scale gradually expanded and the number of data sources increased, MySQL's processing capacity became increasingly insufficient. On the one hand, write-side concurrency pressure increased, making it necessary to cache data on the frontend for a period of time through code before writing it into the database. On the other hand, as single-table sizes exceeded tens of millions of records, manual table sharding had to be adopted to limit query scope and maintain query performance. For certain report generation tasks and large-scale analytical queries, TechAgent had to introduce an additional ClickHouse instance to ensure performance.

![1.png](/content/zh/mo-helps-TechAgent-build-AIGC-pedestal/sw2.png?width=800)

As a startup with a very limited team size, TechAgent has found it increasingly unsustainable to maintain and manage numerous database components. Product iteration often requires adding various pieces of "glue code" to resolve data interoperability issues, and this makes onboarding newly hired engineers particularly difficult. The greatest challenge to the business lies in private deployment scenarios for large clients: while the delivery team can complete application-layer software deployment in just a few days, it often takes several weeks to deploy and debug the databases—an area that is not TechAgent's core expertise.

### Solution

MatrixOne is a new-generation cloud-native hyper-converged database. Built on Kubernetes (K8s) and shared storage with a simplified distributed database engine, it supports mixed workloads including OLTP, OLAP, time-series, vector, and search, while maintaining high compatibility with MySQL syntax. MatrixOne has unique advantages in AIoT and AIGC scenarios and can serve as a one-stop data foundation. For use cases like TechAgent that deeply leverage large language models and document data, MatrixOne is particularly well suited, enabling one-stop underlying data processing and significantly reducing data architecture complexity as well as delivery and operations overhead.

MatrixOne is an HTAP database with strong support for both OLTP and OLAP. The previous model of using MySQL for transactional processing and ClickHouse for analytical processing can be naturally unified into a one-stop solution. This eliminates the operational overhead of periodically migrating data from MySQL to ClickHouse via ETL tools. Instead, users can directly create VIEWs and write various analytical queries using SQL. MatrixOne is highly compatible with MySQL and can seamlessly integrate with the Django framework and SQLAlchemy ORM tools used by TechAgent. Therefore, migrating from MySQL and ClickHouse to MatrixOne constitutes the most fundamental step of the overall transformation.

MatrixOne provides built-in JSON and vector data types. Users can easily create vector columns of type vecf32 / vecf64 or JSON columns in any table. MatrixOne also offers vector indexing and search functions, as well as JSON parsing functions, which can meet the most of requirements related to JSON processing and semantic search. Therefore, with appropriate adaptation and refactoring, MatrixOne can partly replace MongoDB and Faiss.

MatrixOne supports inverted indexes, which are the core technology of Elasticsearch. Moreover, MatrixOne's inverted index can be used in combination with vector-based semantic retrieval, and users are allowed to adjust the weighting between the two. This not only addresses the limitations of relying solely on Elasticsearch, but also enables hybrid semantic and full-text search directly at the database layer. TechAgent's original architecture adopted Elasticsearch and Faiss precisely to combine the advantages of semantic search and full-text search at the application layer in order to deliver the best possible search experience. MatrixOne's implementation further simplifies this model.

MatrixOne is designed natively for Kubernetes (K8s) and inherently supports K8s-based deployment. This aligns perfectly with TechAgent's approach to cloud-native application transformation. Previously, the delivery and operations of a model based on standalone applications and multiple independent databases were extremely complex. Through cloud-native transformation, containerized rapid delivery becomes possible. In the past, K8s enablement at the database layer was a relatively complex undertaking; however, because MatrixOne is designed natively for K8s, it can be deployed and delivered with great ease and naturally supports scalability. When workloads increase, performance baselines can be rapidly improved through vertical or horizontal scaling of compute containers.

Finally, when facing a wide variety of heterogeneous workloads, MatrixOne also provides flexible workload isolation solutions. In practice, workload isolation within the same database can be achieved by assigning specific CN container resource groups to handle dedicated business workloads, thereby maximizing business stability and security.

![2.png](/content/zh/mo-helps-TechAgent-build-AIGC-pedestal/sw3.png?width=800)

### Client's Benefits

Before partnering with MatrixOne, TechAgent was facing significant difficulties in delivering solutions to various large clients. On average, each client delivery cycle took as long as two months, with the most complex and time-consuming part being database deployment and debugging. After gaining an understanding of MatrixOne's capabilities and architecture, the TechAgent team decisively initiated an architectural transformation. They ultimately succeeded in simplifying the previous "patchwork" architecture into one that is as straightforward as a standalone MySQL setup. With the support of the MatrixOne cloud-native team, TechAgent also smoothly completed a comprehensive cloud-native transformation, enabling highly integrated delivery of applications and databases. As a result, the overall delivery time was reduced to one week. In addition, end-to-end data processing efficiency, which previously operated on an hourly basis, was shortened to a minute-level timeframe.

Suwen's CEO Wang Wei said: "In the past, during a period of rapid business growth, we adopted a relatively rough architectural approach—adding components whenever something was missing—without considering the system as a whole. This eventually affected iteration speed and delivery timelines. Collaborating with the MatrixOne team allowed us to start fresh, shedding heavy technical burdens in a one-time effort. In the future, TechAgent and MatrixOne will continue to explore the AIGC field together, striving to deliver higher-quality AI consultants to our industry clients."
