---
title: >-
  UNRE Technology | MatrixOne Empowers UNRE Technology to Build Construction
  Informatization Solutions
author: MatrixOrigin
description: >-
  UNRE Technology adopts MatrixOne Cloud Serverless to replace RDS MySQL,
  achieving multi-tenant isolation, improved performance, and nearly 50% cost
  reduction for construction measurement SaaS platform.
tags:
  - usecase
keywords:
  - MatrixOne Cloud
  - Construction Tech
  - Serverless Database
  - SaaS Platform
publishTime: '2025-01-09T17:00:00+08:00'
image:
  '1': /content/zh/shared/case.png
  '235': /content/zh/shared/case.png
  annotation: 建筑与工程数字化 - 盎锐科技建筑信息化
date: '2025-01-09T17:00:00+08:00'
lang: en
status: published
---

## UNRE Technology | MatrixOne Empowers UNRE Technology to Build Construction Informatization Solutions

### Client's Introduction

UNRE Technology leverages emerging technologies such as opto-mechatronics, artificial intelligence, algorithms, and big data. It is a high-tech enterprise recognized as "Specialized, Refined, Distinctive, and Innovative", dedicated to empowering the construction industry with intelligent and industrialized solutions.

The company focuses on the in-house development of core technologies, including opto-mechatronic integrated laser 3D scanning equipment, intelligent modeling, measurement data processing, intelligent analysis systems, and the automatic generation of drawings and BIM models. It provides full-stack solutions and data services for the digital operation of the entire lifecycle of buildings.

To date, UNRE Technology has served more than 500 enterprises and academic institutions, with accumulated building data exceeding 5 million square meters. Its clients span real estate developers, construction and decoration companies, consulting firms, engineering software providers, operations and maintenance enterprises, as well as secondary and higher education institutions.

### Background

In China, the construction industry accounts for more than 7% of GDP, representing a large market size; however, its level of digitalization ranks at the bottom among all industries. "Defective delivery" is a major pain point in terms of quality issues within the construction industry, and one of the key factors affecting quality is measurement. Traditional as-built measurement practices involve multiple participating parties, including owners, construction contractors, supervision entities, and decoration teams, and require the use of various traditional tools operated by multiple people across multiple parties. Due to issues such as low efficiency, poor accuracy, untimely data feedback, data fragmentation, manual falsification, and repeated measurements by multiple parties, overall management costs are significantly increased, leading to higher re-measurement workloads, reduced time efficiency, and more frequent disputes during handover stages.

The UNRE Technology's UCL360 measurement robot, combined with an automated BIM-based measurement solution derived from building drawings, is used during the structural, masonry, plastering, civil handover, and interior finishing stages, with measured data transmitted to the backend in real time. Compared with traditional measurement methods, the measurement robot offers advantages that traditional approaches do not possess: automated output of structured data, data reports, and issue rectification notices, one-click sharing with labor teams for rectification, and clear visualization of defect hotspot locations.

![Angrui Case 1](/content/zh/angrui-case/angrui-case1.png)

### Pain Point

UNRE's SaaS application service platform is deployed on Alibaba Cloud and uses an RDS MySQL database. Measurement robots upload measurement data to the cloud platform via APIs. The platform provides data upload and report analysis services to multiple clients simultaneously. As the number of users and the volume of data grow, MySQL has encountered various issues in terms of performance and resource isolation:

- To facilitate data operations, all user data is stored in the same database and the same tables, resulting in extremely large single tables reaching hundreds of millions of rows, which makes some complex report queries very slow;

- Data ingestion and dashboard report analysis share the same MySQL instance, which often leads to read–write performance interference;

- To prevent data loss or operational errors, full backups and binary logs are required; however, backup storage and consistency management are relatively complex, and recovery times are also lengthy.

### Solutions

MatrixOne Cloud's Serverless instances can automatically detect workload pressure and dynamically adjust computing resources, and they adopt a billing model based on SQL usage. Leveraging this capability, UNRE split a single database instance into multiple Serverless instances by customer, reducing single-table sizes by several orders of magnitude and effectively improving read and write performance.

![Angrui Case 2](/content/zh/angrui-case/angrui-case2.png)

Because MatrixOne adopts a multi-tenant architecture, data can be conveniently shared between tenants. MatrixOne Cloud provides a graphical data publish-and-subscribe feature, allowing databases or tables to be quickly (at the second level) shared by a tenant administrator with another tenant. During data sharing, the data is not duplicated (within the same region), and the subscribing party does not need to pay for data storage. As a result, UNRE separated the data ingestion workload from the reporting and analytics workload, using two instances to both eliminate performance interference between different workloads and naturally prevent analytics application code from accidentally modifying production data.

![Angrui Case 3](/content/zh/angrui-case/angrui-case3.png)

During data uploads to the platform or modifications to the datapipeline after data has been ingested into the database, situations frequently arise where data needs to be restored to a specific point in time due to accidental operations. MatrixOne Cloud supports a fast and cost-efficient snapshot backup mechanism. Based on each user's actual usage patterns, UNRE configures snapshot backups for the corresponding database instances.

MatrixOne Cloud supports three snapshot backup modes: manual snapshot backups, scheduled automatic snapshot backups, and point-in-time recovery–based snapshot backups. Backup operations impose almost no load on the system and are completed at the second level. Multiple snapshot backups only increase storage usage by the amount of changed data. Customers can therefore perform backups on different datasets "freely" and repeatedly as needed, while data recovery time remains relatively controllable.

### Client's Benefits

**Improved system performance:** By distributing workloads across multiple Serverless instances, the pressure caused by large-table queries is alleviated. At the same time, automatic resource scaling further improves data ingestion and query performance. Both inspection data uploads and report presentation performance have been improved by orders of magnitude.

**Cost reduction:** Previously, a large-sized RDS MySQL instance had to be purchased to handle peak workloads. However, peak business traffic only occurred for about three hours per day, while for the rest of the time business volume was low or nonexistent, leaving most machine resources idle. With MOCloud Serverless instances charging on a per-SQL basis, overall operating costs have been reduced by nearly half.

**Business workload resource isolation:** For users with large data volumes, dedicated read instances are created. As a result, report viewing and in-app data access no longer affect data ingestion or the read/write performance of other users.

**Enhanced data security:** By using daily automatic snapshot backups combined with one-day point-in-time recovery (PITR), concerns about irreversible data loss caused by accidental operations are fully eliminated.
