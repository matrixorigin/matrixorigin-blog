---
title: MatrixOne Core Version 1.2.0 Officially Released
author: MatrixOrigin
mail: lichuanzi@matrixorigin.cn
description: >-
  MatrixOne is a distributed hyper-converged heterogeneous database. The key
  functions of this iterative update include snapshot backup, snapshot backup,
  incremental physical backup, CTAS, BITMAP, and vector index. With the
  introduction of these new functions, MatrixOne is gradually becoming an ideal
  choice for enterprise-level data management and analysis.
tags:
  - product
keywords:
  - MatrixOne
  - MatrixDC
  - MatrixOS
  - MatrixGenesis
  - AI
  - AIDC
publishTime: '2024-05-30 17:00:00+08:00'
image:
  '1': /content/en/mo-1.2.0-released/banner1.png'
  '235': /content/en/mo-1.2.0-released/banner1.png
date: '2024-05-30 17:00:00+08:00'
lang: en
status: published
---

<div align="center">

## MatrixOne Core Version 1.2.0

## For project documentation https://docs.matrixorigin.cn/en

</div>

MatrixOne is a distributed hyper-converged heterogeneous database. It aims to provide a cloud-native, high-performance, highly elastic, and highly compatible HSTAP database that seamlessly integrates transactions, analytics, time-series, and streaming computations. With MatrixOne, users can efficiently handle mixed workloads through a one-stop data processing solution.

## MatrixOne 1.2.0

MatrixOne has undergone significant feature expansion in this iteration, with key features including: snapshot backup, incremental physical backup, CTAS, BITMAP, and vector indexing. With the introduction of these new features, MatrixOne is gradually becoming the ideal choice for enterprise-level data management and analysis.

### Snapshot Backup and Recovery (Beta)

Database snapshot backup technology provides an efficient way to protect data by creating read-only copies at specific points in time without impacting the database's operation. In this iteration, MatrixOne begins to support snapshot backup and recovery at the tenant level. In the event of data loss or corruption, snapshot backup can quickly restore to the state at the time of backup, reducing the Recovery Time Objective (RTO). Snapshot backups do not require halting database services, simplifying the backup process and ensuring business continuity. In disaster recovery plans, snapshot backups play a crucial role in ensuring the rapid restoration of critical data in emergency situations.

### Incremental Physical Backup (Enterprise Edition)

Building upon the full physical backup support in the mo_backup tool, incremental physical backup capability has been added. In environments with large data volumes, previous backups were full backups, resulting in long backup times and consuming significant storage space. The incremental backup feature automatically calculates previously backed up time points and objects , requiring only new objects to be backed up.

### CTAS

In this iteration, MatrixOne supports CTAS. CTAS is an SQL statement used to quickly create a new table based on existing data. It combines the functionalities of creating a table and selecting queries, providing an efficient way to create table snapshots, perform data transformations, or create data models for reporting and analysis. Key features include:

- Efficiency: CTAS is typically executed as an atomic operation, reducing the steps of creating a table and inserting data, thus improving performance.

- Simplicity: By creating a new table and populating data in one operation, data modeling and ETL processes are simplified.

- Flexibility: Most functionalities in the SELECT statement, such as WHERE, JOIN, GROUP BY, etc., can be utilized for complex data transformations.

### BITMAP Fast Deduplication

In the process of data analysis and decision support, it is often necessary to deduplicate and count a large amount of data to obtain the accurate count of different values. While traditional count(distinct values) statements can achieve this purpose, their performance is often unsatisfactory when dealing with large-scale datasets. To address this issue, MatrixOne introduces the BITMAP (bitmap) function in this iteration. These built-in functions enable BITMAP to provide faster processing speed and lower resource consumption than traditional methods when deduplicating, counting, querying statistics, sorting, etc.In applications such as business intelligence, user behavior analysis, and real-time recommendation systems, BITMAP can significantly improve data processing speed and accuracy, aiding better data analysis and decision-making for enterprises and organizations.

### Vector Indexing

In the previous iteration, MatrixOne supported vector types and common vector similarity functions. In this iteration, MatrixOne further introduces vector indexing technology, which significantly improves the system's performance in handling vector data. Vector indexing allows the system to quickly retrieve data points most similar or closest to a query vector. This efficient retrieval capability is crucial for applications that require rapid searching and matching in massive datasets. In the fields of machine learning and artificial intelligence, the application of technologies such as Large Language Models (LLMs) and Retrieval Augmented Generators (RAGs) is increasing. These technologies often require processing large amounts of high-dimensional data and performing complex similarity comparisons and pattern matching on the data. The introduction of vector indexing provides a solid foundation for the application of these technologies. It not only reduces the consumption of computing resources but also significantly improves query response time, thereby optimizing overall system performance.

### Other New Features

#### SQL Statements

- Support for insert ignore

- Support for create table ... like

- Support for create index ... using ivfflat

- Support for alter table ... alter reindex

- Support for load data...character set

- Support for create snapshot

- Support for show snapshots

- Support for restore account

- Support for drop snapshot

- Optimized alter publication

- Optimized show publications

- Optimized show subscriptions

#### Data Types

- Support for `bit` data type

#### Indexes and Constraints

- Addition of vector index (Vector Index)

#### Functions and Operators

- Addition of `SYSDATE` date function

- Addition of `TO_BASE64` and `FROM_BASE64` encoding/decoding functions

- Addition of encryption functions for `MD5` and `SHA1`

- Addition of `SUBVECTOR` function for extracting sub-vectors

- Addition of `SERIAL_EXTRACT` function for extracting elements from sequences/tuple values

- Addition of `CLUSTER_CENTERS` function for determining cluster centers of vector columns

- Support for arithmetic operations between vectors and scalars

#### System Parameters

- Addition of `keep_user_target_list_in_result` system parameter

- Addition of `foreign_key_checks` system parameter

#### MySQL Compatibility

- Refactoring of `csv reader` and `csv split` to maintain compatibility with MySQL.

### Known Issues

- Vector indexing currently only accelerates queries with l2_distance metric.

- Snapshot backup and recovery is currently only supported at the tenant level, not at the cluster level.

- Snapshot recovery requires writing the data once in full, which consumes significant CPU and memory.

- Out of Memory (OOM) issues occasionally occur with large data volumes.

- The system may occasionally freeze under high concurrency loads.

### Documentation Updates

- Added documentation related to snapshot backup.

- Added documentation related to BITMAP.

- Added documentation related to CTAS (Create Table As Select).

- Added documentation related to vector indexing and retrieval.

- Updated reference manuals for SQL statements, functions and operators, system variables.

- Updated overall feature list.

- Updated MySQL compatibility list.

For more details, you can visit our documentation website(<https://docs.matrixorigin.cn>). There, you can find detailed architecture explanations, installation guides, and development tutorials to help you explore the capabilities of MatrixOne. Additionally, our Github repository and community WeChat group are also available for questions, discussions, or feedback.

Welcome to try and experience it.

Official website: [matrixorigin.cn](https://matrixorigin.cn)

Source code:[github.com/matrixorigin/matrixone](https://github.com/matrixorigin/matrixone)

Slack: [matrixoneworkspace.slack.com](https://matrixoneworkspace.slack.com)
