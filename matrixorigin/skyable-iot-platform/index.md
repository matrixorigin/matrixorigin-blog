---
title: >-
  Skyable | MatrixOne Empowers Skyable to Build an Integrated Internet of Things
  Platform
author: MatrixOrigin
description: >-
  Skyable adopts MatrixOne to consolidate MySQL, MongoDB, and Elasticsearch into
  a single platform, significantly simplifying architecture and improving IoT
  data processing efficiency.
tags:
  - usecase
keywords:
  - MatrixOne
  - IoT Platform
  - Device Management
  - Data Analytics
publishTime: '2025-01-09T17:00:00+08:00'
image:
  '1': /content/zh/shared/case.png
  '235': /content/zh/shared/case.png
annotation: 物联网与智慧城市 - 西安天能 IoT 平台
date: '2025-01-09T17:00:00+08:00'
lang: en
status: published
---

## Skyable | MatrixOne Empowers Skyable to Build an Integrated Internet of Things Platform

In the era of the IoT, enterprises are accelerating digital transformation at an unprecedented pace. Xi'an Skyable, a leading company in the industrial IoT sector, has partnered with MatrixOne to jointly build a new-generation integrated IoT platform, achieving comprehensive improvements from device connectivity and data processing to intelligent prediction.

### Client's Introduction

Skyable is a high-tech enterprise that provides IoT cloud services and solutions for enterprise users. Its core R&D team comes from top architects in the Internet software, hardware, and security fields at companies such as BAT, Datang Telecom, and 360. Matrix IoT Cloud Platform has successfully connected nearly ten million devices and serves nearly 300 enterprise customers in China and abroad, including Haier, Hisense, State Power Investment Corporation, Yadu, Supor, Konkais, Forland, Viessmann, Zhiyi, Mill, and Baomi. Its business mainly covers the Industrial Internet of Things (IIoT) and various business systems extended from IIoT, and it is committed to providing enterprises with intelligent device management and data analysis services.

![1.png](/content/zh/mo-helps-xian-tianneng-replace-mysql-mongodb-es-create-iot-platform/tn1.png?width=800)

### Challenges

Skyable's IoT scenarios represent a typical mixed data workload:

First, the system needs to access, configure, and manage a massive number of devices. Each device involves the configuration of communication protocols and data parsing rules, as well as various management modules of the system itself. The workloads handled in this part are transactional OLTP workloads.

Second, devices continuously generate large volumes of data. Part of the data is used for real-time monitoring services, while a large amount of historical data is stored for historical trend analysis. This requires the capability to perform fast queries and analysis on massive volumes of historical data.

Third, devices and the platform also generate a large amount of log text data. These logs need to be parsed and queried to ensure the stability and reliability of the platform, and are also used for security auditing purposes.

**Given these business characteristics, Skyable adopted a data architecture in which MySQL is used for core data and process management, Redis for real-time data, MongoDB for historical data, and Elasticsearch for log data.**

![2.png](/content/zh/mo-helps-xian-tianneng-replace-mysql-mongodb-es-create-iot-platform/tn2.png?width=800)

**Pressure from processing massive amounts of data**

Skyable's IoT scenarios involve a large number of devices reporting data in real time. The platform receives approximately 10 million device data records per day, with a maximum size of 1 KB per record. The annual data volume reaches about 36 billion records, with a total data size of approximately 33 TB.

The existing multi-database architecture has led to increased maintenance costs and architectural complexity. In particular, as data volumes continue to grow, write performance has degraded and query speeds have declined.

**System complexity and high operation & maintenance costs**

Due to Elasticsearch's indexing mechanism, write performance degrades significantly when the volume of indexed data becomes too large. To address this issue, Skyable stores data in monthly sharded tables to reduce the write pressure on individual indexes. However, this approach further increases system complexity and makes business processing more cumbersome. At the same time, the use of multiple database systems results in a heavy operations and maintenance burden and keeps server costs high.

**Performance bottlenecks and real-time requirements**

IoT business scenarios place extremely high performance demands on real-time device monitoring, requiring timely access to information such as vehicle operating hours, mileage, and online/offline status. However, under the existing architecture, it is difficult to maintain efficient query and write performance as data volumes continue to grow. This challenge is especially pronounced in the analysis of log data and device-reported information, where low statistical efficiency undermines the platform's real-time capabilities.

**The difficulty of indicator statistics**

A large volume of device data is stored in MongoDB in JSON format. While this format offers strong flexibility, MongoDB's query capabilities are relatively limited. For more complex metric calculations involving cross-collection statistics, a significant amount of business logic has to be implemented at the application layer. Moreover, due to the massive data volume, application-layer code is prone to performance issues, and in some cases may even encounter out-of-memory (OOM) errors.

**The high cost of architecture expansion and technology migration**

In the existing architecture, Skyable not only needs to maintain three separate storage systems, but also has to handle complex business logic processing and query optimization for different data sources. The rapid expansion of the business places higher demands on the system's elastic scalability and efficient migration capabilities.

### Solutions

MatrixOne is a cloud-native, hyper-converged database that provides strong support for IoT scenarios. It can handle multiple types of workloads with a single data engine, significantly reducing architectural complexity. For Skyable's IoT platform, MatrixOne delivers value in the following areas:

**Improved Write and Query Performance**

To address the previous query and write performance issues with Elasticsearch, performance testing of MatrixOne showed that both single-table write and query performance fully meet current business requirements, eliminating the need for complex table sharding and greatly simplifying data management.

In response to MongoDB's relatively weak query expressiveness, MatrixOne supports standard SQL syntax and a wide range of analytical functions, enabling heavy and complex data queries to be computed directly at the database layer. MatrixOne's built-in memory management and parallel execution mechanisms also help avoid OOM issues during large-scale data processing.

**Simplified Architecture and Reduced O&M Costs**

By consolidating all data storage into a single system, MatrixOne significantly simplifies the overall architecture, reducing operational complexity and costs. With unified data management, platform maintenance and scaling become more flexible and efficient.

**Seamless Data Source Switching**

MatrixOne is highly compatible with MySQL syntax, allowing Skyable to migrate data storage and querying to the new platform without major changes to existing business code. Most code can remain unchanged; only minor adjustments to the persistence and read logic of the logging module are required, greatly reducing migration cost and time.

**Support for Multiple Workloads**

MatrixOne's hybrid workload capabilities enable it to handle both transaction processing (TP) and analytical processing (AP), while also supporting full-text search for text data. On the Skyable platform, core data processing leverages MatrixOne's TP capabilities to ensure efficient read and write performance. Queries on device-reported data and logs utilize MatrixOne's AP features and full-text search, satisfying both real-time requirements and analytical needs.

![3.png](/content/zh/mo-helps-xian-tianneng-replace-mysql-mongodb-es-create-iot-platform/tn3.png?width=800)

### Client's Benefits

By introducing MatrixOne, Skyable significantly simplified its original system architecture. The previous three-database architecture based on MySQL, Elasticsearch, and MongoDB was streamlined into a single MatrixOne platform, enabling unified storage and management of all data. This architectural simplification not only reduced system complexity, but also significantly lowered hardware resource consumption and day-to-day operations and maintenance costs.

At the same time, data processing workflows were substantially optimized. Previously, device data ingestion and query processes had to pass through multiple systems, making them complex and inefficient. Now, data flows directly from Kafka into MatrixOne, resulting in a major improvement in query performance, significantly reduced response times, and a substantial increase in overall processing efficiency.

With this new data architecture in place, Skyable has greatly reduced both the deployment cycle and implementation complexity of new IoT platform projects, markedly enhancing business agility.
