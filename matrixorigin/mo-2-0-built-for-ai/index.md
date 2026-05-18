---
title: "MatrixOne v2.0.0: Built for the AI Era"
author: MatrixOrigin
mail: lichuanzi@matrixorigin.cn
description: MatrixOne Kernel v2.0.0 was released on October 31, 2024. As an AI-driven cloud-native database, it supports multimodal data management, efficient retrieval, and hybrid workload processing for generative AI applications, significantly improving disaster recovery and system stability.
tags:
  - News
keywords:
  - MySQL
  - HTAP
  - MatrixOrigin
  - MatrixOne
publishTime: '2024-11-08 17:00:00+08:00'
image:
  '1': ./images/mo2.jpg
  '235': ./images/mo2.jpg
date: '2024-11-08 17:00:00+08:00'
lang: en
status: published
translations:
  zh: mo-2-0-built-for-ai-zh
---

![MO 2.0](./images/mo20.png?width=600)

<center>We are very pleased to announce:</center>
<center>MatrixOne Kernel v2.0.0</center>
<center>was officially released on October 31, 2024!</center>
<center>Click to view the <a href="https://docs.matrixorigin.cn" target="_blank" rel="noopener noreferrer">project documentation website</a></center>

![Architecture diagram](./images/mo21.png?width=600)

MatrixOne is an AI-driven cloud-native hyper-converged database. It uses a storage-compute separation architecture, fully leverages cloud infrastructure, is compatible with MySQL, and supports hybrid workload scenarios. By combining vector data types and full-text search, it can efficiently handle multimodal data query and management scenarios for generative AI applications.

### Feature Overview

This MatrixOne iteration delivers major improvements in support for generative AI applications, disaster recovery, and stability. Key features include support for data access on external storage and access to unstructured data, full-text search capabilities, improved vector retrieval performance, snapshot backup and point-in-time recovery (PiTR), CDC and log-replication-based primary-standby cluster disaster recovery, and further improvements to MySQL compatibility. With these new features, MatrixOne is gradually becoming an ideal choice for enterprises building AI-driven intelligent data management platforms.

### Application Scenarios

MatrixOne is suitable for the following application scenarios. We welcome users with the following business pain points and requirements to contact us for trial testing.

#### Generative AI Scenarios

The MatrixOne hyper-converged database provides strong multimodal data support, real-time retrieval, and intelligent data processing capabilities for Generative AI, forming core infrastructure for generative AI applications. In multimodal scenarios such as text generation and image generation, MatrixOne ensures fast responses and high-quality generation over large-scale datasets through efficient data management, vector and hybrid retrieval, data cleaning and preprocessing supported by Python UDFs, and GPU-accelerated real-time inference. Whether for large-volume data access and storage, online inference, or dynamic feedback, MatrixOne provides stable, low-latency support for generative AI applications, helping enterprises rapidly implement, iterate, and optimize generative AI applications in AI-driven innovation.

#### Time-Series Data Applications

In modern IoT applications, hundreds of millions of devices and sensors continuously collect and transmit data, including industrial production lines, smart grids, smart city infrastructure, and autonomous vehicles. The amount of real-time data generated every day reaches the TB level. MatrixOne hyper-converged database provides efficient real-time data processing capabilities for IoT scenarios, supporting millisecond-level high-concurrency writes and fast retrieval, with superior scalability to handle peak loads. Its real-time analytics capabilities help enterprises quickly generate key insights from massive IoT data. At the same time, seamless integration with machine learning models allows real-time data streams to be fed directly into models for prediction and anomaly detection, making it suitable for industrial predictive maintenance, energy-efficiency optimization, intelligent monitoring, and other scenarios. It comprehensively meets IoT application requirements for high throughput, low latency, and intelligent data management.

#### Hybrid Workload Support

In common enterprise business systems such as OA, ERP, and CRM, as data volumes and business complexity grow, traditional standalone databases often struggle to meet peak performance demands. At critical time points such as month-end and quarter-end, high-frequency analysis and real-time statistical reports are often needed to support decision-making. Many enterprises therefore configure independent analytical databases or use sharding to reduce query load on the primary database. MatrixOne's hybrid workload support allows enterprises to meet both business and analytical needs within a single database without additional systems. Real-time data analysis ensures fast responses under high concurrency, while MatrixOne's scalability allows seamless capacity expansion as business scale grows. This keeps real-time queries and statistics efficient even under large-scale data growth, ensuring timeliness, continuity, and efficiency in enterprise data decision-making and comprehensively improving data-management flexibility.

#### Enterprise SaaS Scenarios

With the rapid development of enterprise SaaS applications, SaaS development must account for multi-tenant model requirements. Traditional solutions usually choose between multi-tenant shared database instances and single-tenant dedicated database instances, but this creates a conflict between management cost and tenant isolation. MatrixOne natively supports a multi-tenant architecture, providing workload isolation and independent scaling across tenants while offering unified management. This architecture effectively reduces management cost, ensures data isolation, improves O&M efficiency, and fully meets SaaS application requirements for cost control, management simplicity, and isolation, making it an ideal database choice for SaaS applications.

### New Features

#### Key New Features

- Multimodal data management

MatrixOne supports direct access to object storage, remote file systems, and local file systems outside the database through Stage objects, as well as direct access to files on storage systems through the `datalink` type. This capability is very helpful when building data pipelines with MatrixOne in generative AI applications. It can significantly improve application development efficiency and reduce application O&M costs.

- Full-text indexes for text or JSON data

Creating full-text indexes on JSON or TEXT columns in tables can effectively improve MatrixOne performance in AIoT applications. Combined with MatrixOne's JSON data type, this can further reduce data redundancy and improve MatrixOne's competitiveness in AIoT scenarios.

- Vector retrieval

In this iteration, MatrixOne optimizes vector retrieval performance, enabling fast vector-distance-based retrieval over large-scale vector data. This efficient retrieval capability is especially critical for generative AI applications based on large language models (LLMs) and Retrieval-Augmented Generation (RAG).

- Snapshot-based backup and recovery

By creating data snapshots for clusters or tenants, the database state at a specific moment can be captured quickly, ensuring fast recovery in the event of failures or emergencies. Snapshot technology has minimal impact on system performance and ensures data consistency, thereby guaranteeing complete data recovery. It also supports cross-tenant recovery and improves system disaster recovery capability.

- Primary-standby cluster disaster recovery based on log replication

Through a log replication mechanism, transaction logs from the primary database are synchronized to the standby database, enabling high availability and disaster recovery for primary-standby clusters. When the primary database fails, the standby database can quickly take over services and ensure business continuity.

- Point-in-time recovery

By recording all data changes after the initial snapshot, this feature allows users to restore the database to an exact historical moment in the event of a failure, erroneous operation, or data corruption, avoiding the loss of important information. Compared with traditional full backups, it greatly reduces backup storage overhead and improves recovery efficiency. This feature provides flexibility and security for critical business scenarios, supports fast recovery, and meets business continuity and compliance requirements.

- CDC from MatrixOne to MySQL

By capturing changes in the MatrixOne database and synchronizing them to downstream MySQL in real time, this feature enables disaster recovery from MatrixOne to MySQL. After users migrate from MySQL to MatrixOne, they can retain a disaster recovery link.

- Table-level publish-subscribe capability

In previous iterations, we supported database-level publish-subscribe. This iteration further implements more fine-grained table-level publish-subscribe. When data changes, table-level publish-subscribe can synchronize changes from specific tables to subscribers in real time without exposing information from other tables. Compared with database-level publish-subscribe, this provides greater flexibility and control.

#### Other New Features

- SQL statements

```text
Support RENAME TABLE
Support CREATE PITR
Support DROP PITR
Support ALTER PITR
Support RESTORE PITR
Support SHOW PITRS
Optimized SHOW PUBLICATIONS
Optimized SHOW SUBSCRIPTIONS
LOAD DATA INFILE supports loading data according to the user-specified column name order
```

- Data types

Support the `datalink` data type.

- Indexes and constraints

Added full-text indexes.

- Functions and operators

Support `json_row`, `jq`, `try_jq`, `json_extract_string`, and `json_extract_float64` functions for the JSON data type.

Support addition and subtraction operations on dates returned by the `now()` function.

- Tools

`mo-backup`: supports managing PITR tasks.

`mo_cdc`: supports managing CDC tasks.

- MySQL compatibility

Support case-insensitive string retrieval in the `WHERE` condition of `SELECT` statements.

Support `Encode()` and `Decode()` functions.

#### Quick Start

Community users and enterprise developers can deploy MatrixOne with one command for trial use:

```sql
docker pull matrixorigin/matrixone:2.0.0
```

For more details, visit our [documentation website](https://docs.matrixorigin.cn). The documentation provides detailed architecture descriptions, installation guides, and development tutorials to help you explore MatrixOne's capabilities.

In addition, our [GitHub website](https://github.com/matrixorigin/matrixone) and community WeChat groups welcome your questions, discussions, and feedback.

#### Known Issues

- In the current primary-standby cluster disaster recovery solution, the standby cluster does not support synchronizing external tables or data in stages.

- In the current primary-standby cluster disaster recovery solution, the standby cluster only supports cold standby and cannot be opened in read-only mode.

- CDC only supports table-level data synchronization.

- Snapshot backup currently supports only cluster-level and tenant-level backups, but restoration can be performed to the cluster, tenant, database, or table level.

- Snapshot and PITR backups cannot restore data from tenants that have been deleted.

#### Detailed Changelog

[Changelog](https://github.com/matrixorigin/matrixone/compare/1.2-dev...main)
