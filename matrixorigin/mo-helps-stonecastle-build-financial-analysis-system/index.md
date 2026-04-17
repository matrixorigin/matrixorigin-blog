---
title: MatrixOne Helps StoneCastle Build a High-Performance Financial Analysis System
author: MatrixOrigin
mail: lichuanzi@matrixorigin.io
description: >-
  StoneCastle, a U.S. financial service provider, faced challenges with their
  MySQL accounting management system due to rapid data growth and query
  performance bottlenecks. To enhance efficiency and ensure data security, they
  migrated to MatrixOne, a high-performance HTAP database. This transition
  improved data processing, reduced query times significantly, and allowed for
  secure private cloud deployment while maintaining compatibility with existing
  MySQL systems.
tags:
  - news
keywords:
  - MatrixOne
  - AIoT
  - OLTP
  - MatrixOrigin
publishTime: '2024-10-25 17:00:00+00:00'
image:
  '1': /content/en/shared/mo-news.webp
  '235': /content/en/shared/mo-news.webp
date: '2024-10-25 17:00:00+00:00'
lang: en
status: published
---

### Customer Profile

Founded in 2003, StoneCastle is a U.S.-based financial service provider that focuses on offering cash savings security management services to its clients. Due to the large number of banks in the U.S. and the potential risk of bank failures, the Federal Deposit Insurance Corporation (FDIC) provides deposit insurance coverage of up to $250,000 per individual or entity at any insured bank. Deposits exceeding this amount are not covered by insurance in the event of a loss. StoneCastle's service helps clients distribute large sums of money across multiple banks and ensures that the funds benefit from FDIC insurance through its management platform. StoneCastle has managed over $170 billion in funds for thousands of organizations and institutions, partnering with over a thousand savings banks.

### Business Challenges

StoneCastle’s accounting management system is a platform dedicated to tracking the flow of funds for its users, responsible for monitoring the funds stored in different banks. Currently, this system operates on AWS EC2 cloud servers with a self-managed MySQL database as its underlying support. However, as StoneCastle’s business rapidly expanded, especially with the extension of services from institutional depositors to individual depositors, the volume of data surged, and the application system faced the following challenges:

### Rapid Data Growth

The core of StoneCastle’s accounting management system is to record financial transactions between N depositors and M banks. With over 1,000 banks involved and approximately 6,000 depositors, this large transaction network generates millions of new transaction records every month. The amount of historical data has reached hundreds of millions of entries, which poses a significant challenge for MySQL’s query capabilities. To reduce system pressure, only one year of data is kept in the online MySQL database for user queries, and data older than this is archived. While this method reduces the load on the main database, it complicates historical data queries and analysis, further limiting user operations. As the new business model drives faster data growth, the amount of data MySQL can handle continues to shrink.

### Query Performance Bottlenecks

StoneCastle's accounting management system mainly provides aggregation analysis for both internal and external users. This system is critical for generating accurate financial reports, monitoring transaction patterns, and supporting decision-making. Under the current MySQL setup, the system experiences significant delays when executing queries that involve large-scale data aggregation, multiple table joins, and complex calculations. For example, generating summary reports across multiple accounts and time periods or conducting in-depth financial trend analysis can take upwards of ten minutes or longer. This performance bottleneck not only hampers user efficiency but also struggles to meet the growing business demands. A typical slow SQL query like the one below takes over ten minutes to execute on data volumes of tens of millions, severely impacting business agility.

```sql
SELECT client_id, client_account, bank_id, bank_account, SUM(amount) FROM transactions GROUP BY client_id, client_account, bank_id, bank_account;
```

### On-Premise Deployment Requirements

Due to the high sensitivity of StoneCastle’s clients regarding data security, they have concerns about using SaaS-based database services. They worry that in the event of a data breach, it would be difficult to manage and mitigate the impact. Additionally, for reasons of compatibility with existing systems and operational cost, StoneCastle opted not to use AWS services like RDS or AuroraDB. Instead, they purchased EC2 servers and deployed MySQL in a private environment, building a series of security measures to ensure that their data could be safely and properly managed in-house.

### Solution

MatrixOne, a high-performance HTAP (Hybrid Transactional/Analytical Processing) database, offers strong compatibility with the MySQL protocol, making it an effective solution for the performance challenges StoneCastle faced with their MySQL database in terms of data processing and query performance.

1. **Enhanced Data Processing and Query Efficiency**: While traditional MySQL databases are primarily designed to handle OLTP (Online Transaction Processing) workloads, MatrixOne combines transactional and analytical processing capabilities. This allows it to efficiently handle a large volume of real-time transactional data while also supporting complex queries and data analysis. MatrixOne maintains MySQL’s transactional performance while significantly improving the execution time for various aggregation and multi-table join queries, reducing query times from 10-30 minutes to 5-10 seconds. This enhancement in query performance expands the amount of data that can be queried in real-time from the online database, without being limited by the three-year data retention period.

2. **Private Cloud Deployment**: MatrixOne supports private cloud deployment on EC2 servers and offers user-friendly deployment and operational tools for one-click setup and management. This meets StoneCastle’s data security requirements, ensuring data is processed privately and securely, mitigating the risk of data breaches. Additionally, MatrixOne’s dual-master architecture with log synchronization ensures the same level of high availability as MySQL.

3. **Seamless Compatibility with MySQL**: MatrixOne is highly compatible with MySQL, including its connection protocol, SQL syntax, and ORM frameworks used by upper-layer applications. This compatibility allowed StoneCastle to migrate to MatrixOne without any significant modifications to their applications. To ensure reliability and consistency during the migration process, MatrixOne supported data synchronization through MySQL binlog. Both systems ran in parallel for a period before the final application switch was made.

### Customer Benefits

By leveraging the MatrixOne database, StoneCastle successfully improved the efficiency of its data processing and analysis, significantly shortening query times and accelerating decision-making. Additionally, the online database can now accommodate a larger volume of data, allowing users to access older historical data and increasing the system’s capacity to handle more new users.

This challenge is common across the financial industry. As data volumes surge, databases need to not only manage daily online transactional workloads but also handle increasingly complex analytical tasks such as real-time risk assessment, transaction monitoring, business intelligence reporting, data visualization, and big data analytics. In these analytical scenarios, MySQL’s traditional architecture often encounters performance bottlenecks. MatrixOne, as an HTAP database, with its superior performance and flexibility, is an ideal alternative to MySQL, addressing the comprehensive data processing needs of enterprises.
