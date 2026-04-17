---
title: >-
  MatrixOne Empowers Skyable to Replace MySQL, MongoDB, and Elasticsearch with a
  Unified IoT Platform
author: MatrixOrigin
mail: lichuanzi@matrixorigin.io
description: >-
  In the IoT era, Skyable and MatrixOne have partnered to build a next-gen
  platform, enhancing device connectivity, data processing, and intelligent
  forecasting while simplifying system architecture.
tags:
  - news
keywords:
  - MatrixOS
  - MatrixOrigin
  - IoT
  - ''
  - MatrixOne
  - Skyable
publishTime: '2024-11-01 17:00:00+00:00'
image:
  '1': /content/en/shared/mo-news.webp
  '235': /content/en/shared/mo-news.webp
date: '2024-11-01 17:00:00+00:00'
lang: en
status: published
---

In the Internet of Things (IoT) era, businesses are accelerating digital transformation at an unprecedented pace. Xi’an Tianeng Software Technology Co., Ltd. (Skyable), a leader in the industrial IoT sector, has partnered with MatrixOne to build a next-generation unified IoT platform, achieving comprehensive improvements from device connectivity and data processing to intelligent forecasting.

### About the Customer

**Xi’an Tianeng Software Technology Co., Ltd. (Skyable)** is a high-tech company providing IoT cloud services and solutions for enterprise clients. Skyable's core R&D team includes top architects from industry giants such as BAT, Datang Telecom, and 360, specializing in internet software, hardware, and security. Skyable’s primary product, the Matrix IoT Cloud Platform, has successfully connected nearly 10 million devices, serving close to 300 companies globally, including Haier, Hisense, State Power Investment Corporation, Yadu, Supor, Conkes, France, Viessmann, Mill, and others. The company focuses on Industrial IoT (IIoT) and various business systems extended from IIoT, providing intelligent device management and data analysis services for enterprises.

### Business Challenges

Skyable’s IoT scenario is characterized by mixed data load requirements:

1. **Device Configuration and Management:** The system needs to connect, configure, and manage a large volume of devices. Each device requires communication protocol configurations, data parsing rules, and various management modules, which are transactional OLTP (Online Transaction Processing) loads.

2. **Real-time and Historical Data:** Devices continuously generate data, some of which supports real-time monitoring, while historical data is stored for trend analysis, requiring the ability to quickly query and analyze massive historical data.

3. **Log Data Management:** The devices and platform generate extensive logs that need to be parsed and queried to ensure platform stability, reliability, and for security auditing purposes.

For these business needs, Skyable previously used MySQL for core data and process management, Redis for real-time data, MongoDB for historical data, and Elasticsearch for log data.

#### High Data Processing Demands

Skyable’s IoT platform involves real-time data reporting from numerous devices, receiving approximately 10 million data points daily, with each data point being a maximum of 1KB. This adds up to about 36 billion records per year, totaling around 33TB. The multi-database architecture increased maintenance costs and system complexity. As data volume grew, write performance deteriorated, and query speed declined.

#### Complexity and High Maintenance Costs

Elasticsearch’s indexing mechanism caused a significant decline in write performance as indexed data grew. To mitigate this, Skyable divided monthly data into separate tables, reducing individual index loads but adding system complexity and complicating business processing. Additionally, using multiple databases increased maintenance burdens and raised server costs.

#### Performance Bottlenecks and Real-time Demands

Skyable’s IoT scenario requires high-performance real-time device monitoring, with timely access to data such as equipment operating time, mileage, and online/offline status. The existing architecture struggled to maintain efficient querying and writing performance with increasing data volumes, particularly for log data and device report analysis, impacting the platform’s real-time capabilities.

#### Complex Metric Calculation

Device data stored in MongoDB as JSON was flexible but limited MongoDB’s querying abilities, making cross-table metric calculations challenging. This required extensive application-layer coding, which often led to performance issues, including Out of Memory (OOM) errors when handling large data volumes.

#### High Costs for Architecture Expansion and Migration

Skyable had to maintain three separate storage systems, with each data source requiring complex business logic and query optimization. Rapid business expansion raised the demand for elastic scalability and efficient migration capabilities within the system.

### MatrixOne Solution

MatrixOne is a cloud-native, hyper-converged database well-suited to IoT scenarios, capable of handling multiple loads within a single data engine, reducing system complexity. For Skyable’s IoT platform, MatrixOne adds value in the following ways:

#### Enhanced Write and Query Performance

MatrixOne addresses the query and write challenges experienced with Elasticsearch. Performance tests show MatrixOne’s single-table write and query performance meet current business needs, eliminating complex table partitioning and simplifying data management. For MongoDB’s query limitations, MatrixOne supports standard SQL syntax and analytical functions, allowing complex queries to be processed at the database level. MatrixOne’s memory management and parallel processing mechanisms prevent OOM errors for large-scale data calculations.

#### Simplified Architecture and Reduced Maintenance Costs

MatrixOne’s solution consolidates all data into a single system, significantly simplifying the system architecture and lowering maintenance difficulty and costs. With unified data management, platform maintenance and expansion become more flexible and efficient.

#### Seamless Data Source Transition

MatrixOne’s compatibility with MySQL syntax enables Skyable to transition data storage and querying to the new platform without extensive modifications to existing business code. Most code requires no changes, with only minor adjustments to the log module’s storage and retrieval components, reducing migration costs and time.

#### Support for Multiple Loads

MatrixOne’s mixed-load capability supports both transaction processing (TP) and analytical processing (AP) tasks, as well as full-text search. Skyable’s platform uses MatrixOne’s TP features for basic data processing, ensuring efficient data reading and writing. For device reporting and log data queries, MatrixOne’s AP features and full-text search capabilities meet both real-time and data analysis needs.

### Customer Benefits

By introducing MatrixOne, Skyable has significantly simplified its original system architecture. Previously relying on MySQL, Elasticsearch, and MongoDB, the three-database structure has been streamlined into a single MatrixOne platform, allowing all data to be stored and managed in one place. This architecture simplification not only reduces system complexity but also substantially lowers hardware resource usage and day-to-day maintenance costs.

Simultaneously, data processing flows have been greatly optimized. The formerly complex device data reporting and query processes that required multiple systems now flow directly from Kafka to MatrixOne, resulting in a significant boost in query performance and a substantial reduction in response time, enhancing overall processing efficiency.

With this new data architecture, Skyable has reduced the deployment cycles and implementation difficulty for new IoT platform projects, substantially increasing business agility.
