---
title: >-
  StoneCastle | MatrixOne Helps StoneCastle Build an Efficient Financial
  Analytics System
author: MatrixOrigin
description: >-
  StoneCastle adopts MatrixOne HTAP database to replace MySQL, reducing complex
  aggregation query times from 10-30 minutes to 5-10 seconds while maintaining
  private deployment and high MySQL compatibility.
tags:
  - usecase
keywords:
  - MatrixOne
  - Financial Analytics
  - HTAP Database
  - MySQL Migration
publishTime: '2025-01-09T17:00:00+08:00'
image:
  '1': /content/zh/shared/case.png
  '235': /content/zh/shared/case.png
  annotation: 金融与数据分析 - StoneCastle 金融分析系统
date: '2025-01-09T17:00:00+08:00'
lang: en
status: published
---

## StoneCastle | MatrixOne Helps StoneCastle Build an Efficient Financial Analytics System

### Client's Introduction

Founded in 2003, StoneCastle is an American financial services provider that focuses on offering cash savings safety management services for its clients. Due to the large number of banks in the United States and the risk of bank failures, the Federal Deposit Insurance Corporation (FDIC) provides deposit insurance coverage of up to USD 250,000 per individual or entity at any insured bank. Deposits exceeding this limit are not eligible for compensation in the event of a loss. StoneCastle's service helps clients distribute large sums of money across multiple banks and, through its management platform, ensures that depositors' funds are covered by FDIC insurance. StoneCastle has already managed more than USD 170 billion in funds for thousands of organizations and institutions and has integrated with thousands of savings banks.

### Challenges

StoneCastle's user accounting and ledger management system is a platform specifically designed to record the flow of client funds and track how users' assets are stored across different banks. The system currently runs on AWS EC2 cloud servers and relies on a self-managed MySQL database as its underlying infrastructure. However, with the rapid expansion of StoneCastle's business—particularly its expansion from institutional depositors to individual depositors—the volume of data has increased dramatically, and the application system has begun to face the following challenges:

**Rapid data growth**

StoneCastle's user accounting management system records the flow of funds between _N_ depositors and _M_ banks. The number of banks exceeds 1,000, while the number of depositors has grown to approximately 6,000. This massive transaction network generates several million new transaction records each month, and the accumulated historical data has already reached hundreds of millions of records. Data at this scale poses significant challenges to MySQL's query capabilities. To alleviate system pressure, the online MySQL database retains only one year of data for user queries, with data beyond that period archived. While this archiving strategy reduces the load on the primary database, it makes querying and analyzing historical data inconvenient and further limits user capabilities. Moreover, under the new business model, the rate of data growth continues to accelerate, forcing a further reduction in the amount of historical data that MySQL can support.

**Query performance bottlenecks**

Queries in StoneCastle's user accounting management system are primarily focused on aggregated analysis for both internal and external users. The system is critical for delivering accurate financial reports, monitoring transaction patterns, and supporting decision-making. Under the current MySQL database, response times increase significantly when executing queries that involve large-scale aggregations, multi-table joins, and complex calculations. For example, generating summary reports across multiple accounts and time periods, or conducting in-depth financial trend analyses, can take tens of minutes or even longer to complete. Such performance bottlenecks not only impact user productivity severely but also fail to meet the growing demands of the business. A typical slow SQL query requires more than ten minutes to execute in MySQL under datasets with tens of millions of records, seriously affecting business agility.

**Private deployment requirements**

StoneCastle's clients are extremely sensitive about data security, so they have concerns about using SaaS-based database services, fearing that incidents such as data breaches would be difficult to control and respond to. In addition, considering compatibility with existing systems and operational costs, the company did not choose AWS services such as RDS or AuroraDB. Instead, it purchased EC2 servers and privately deployed MySQL, along with building a series of in-house security measures to ensure that data can be securely and properly managed within its own environment.

![1.png](/content/zh/mo-enable-stonecastle-build-financial-analytics-system/sc2.png?width=800)

### Solution

As a high-performance HTAP database, MatrixOne features high compatibility with the MySQL protocol and can effectively address the challenges currently faced by StoneCastle's accounting management system in terms of data processing and query performance on MySQL.

Unlike traditional MySQL databases, which are primarily suited for OLTP workloads, MatrixOne combines transactional and analytical processing capabilities, which enables it to efficiently handle large volumes of real-time transaction data while also supporting complex queries and data analysis. This integrated capability makes the system more efficient and flexible in both data processing and analysis. While maintaining MySQL's original transactional performance, MatrixOne reduces the execution time of various MySQL aggregation queries and multi-table join queries from 10–30 minutes down to 5–10 seconds. Such a dramatic improvement in query performance significantly extends the time span of data that can be queried in real time within the online database, removing the previous limitation of only three years of stored data.

MatrixOne supports private deployment on cloud servers and provides very simple deployment and operations tools, enabling one-click deployment and operation. This approach continues to meet customers' data security requirements, as private data processing ensures data security and privacy while avoiding the risk of data leakage. In addition, MatrixOne supports a dual-node active–standby log replication architecture, ensuring high availability capabilities consistent with those of MySQL.

MatrixOne is highly compatible with MySQL, including connection protocols, SQL syntax, and upper-layer application ORM frameworks. This compatibility allows users to reuse familiar tools and SQL statements during migration and development. As a result, StoneCastle's engineers were able to complete the application switch with virtually no modifications to the application itself. To ensure reliability and consistency during the migration process, MatrixOne supports reading MySQL binlogs for data synchronization, allowing the two systems to run in parallel for a period of time before the final application cutover.

![2.png](/content/zh/mo-enable-stonecastle-build-financial-analytics-system/sc3.png?width=800)

### Client's Benefits

By adopting the MatrixOne database, StoneCastle successfully improved the efficiency of data processing and analytics, significantly shortened query times, accelerated decision-making, and increased the volume of data that can be accommodated in the online system. This enables users to access much longer historical data while also enhancing the system's capacity to onboard more new users.

Across the financial industry as a whole, clients are in fact facing similar challenges. As data volumes in the financial sector surge, databases are required not only to handle routine online read and write transactions, but also to cope with increasingly complex analytical workloads, such as real-time risk assessment, transaction monitoring, business intelligence reporting, data visualization, and big data analytics. In these analytical scenarios, MySQL's traditional architecture may encounter performance bottlenecks. As an HTAP database, MatrixOne, with its outstanding performance and flexibility, has become an ideal alternative to MySQL, capable of meeting enterprises' comprehensive requirements for efficient data processing.
