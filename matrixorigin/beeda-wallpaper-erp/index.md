---
title: BeeDa Software -- A Leading Software Brand in the Wallpaper Industry
author: MatrixOrigin
description: >-
  BeeDa adopts MatrixOne Cloud Serverless as its sole database for ERP system,
  achieving cost reduction with performance improvement and business isolation.
tags:
  - usecase
keywords:
  - MatrixOne
  - ERP System
  - Wallpaper Industry
  - Serverless Database
publishTime: '2025-01-09T17:00:00+08:00'
image:
  '1': /content/zh/shared/case.png
  '235': /content/zh/shared/case.png
annotation: 建筑与工程数字化 - 壁达软件 ERP 系统
date: '2025-01-09T17:00:00+08:00'
lang: en
status: published
---

## BeeDa Software -- A Leading Software Brand in the Wallpaper Industry

### Client Overview

BeeDa Software is a domestic professional software provider for the wallpaper industry. The company has long been committed to driving industry development and transformation through innovative information technologies, creating new management and service models for enterprises and delivering value to society.

### Business Background

BeeDa has independently developed a "purchase–sales–inventory" (PSI) ERP system that connects applications, devices, and customers. Through this system, users can quickly access upstream factory product codes and inventory data, as well as order information from downstream distributors at all levels and retail stores, enabling customers to manage sales data more efficiently. The system integrates functions into a unified platform, including mobile online ordering, customer management, order shipment tracking, customized executive reports, procurement and stock preparation, and decision support into a unified platform.

![1.png](/content/zh/bida-wallpaper-erp-matrixone/1.png)

![2.png](/content/zh/bida-wallpaper-erp-matrixone/2.png)

### Business Pain Points

Currently, BeeDa serves tens of thousands of customers, with the entire system supported by dozens of SQL Server instances deployed on Alibaba Cloud. Each instance serves several hundred customers, separated by database, with approximately 500 tables per database. The databases must support both concurrent data writes and queries from customers, as well as various complex multi-table queries.

**Limited HTAP capabilities:**

Although SQL Server supports hybrid workloads, its ability to handle large-scale transactional processing and real-time analytical queries simultaneously on a single instance is limited. When processing high volumes of transactions alongside analytical queries, it may occur the performance bottleneck.

**Read–write resource contention:**

The ERP system is a light-write, heavy-read scenario. In addition, hundreds of customers share the same instance, which often causes report queries and BI ad-hoc queries to severely impact critical scenarios such as order creation and inventory lookup.

**Insufficient scalability:**

SQL Server is essentially a single-node system, which makes resource adjustments unfriendly when user scale changes, horizontal scaling solutions are complex as well.

**Mismatch between user budgets and costs:**

The wallpaper and curtain industry has relatively low technical barriers and intense market competition, with a generally low level of digitalization. Customers are not willing to pay too much, while modern ERP systems must support multiple business requirements, resulting in high software and database costs and consequently thin profit margins.

### Solution

The Bida ERP system adopts MatrixOne Cloud Serverless instances as its sole database, addressing challenges related to performance, isolation, scalability, and cost effectively.

First, MatrixOne is a hyper-converged, multi-model database in which a single compute and storage engine can simultaneously support both transactional and analytical workloads.

Second, MatrixOne is a cloud-native database. Its decoupled compute–storage architecture enables flexible scaling of compute resources, while Serverless instances provide millisecond-level automatic scaling, allowing the system to closely adapt to business workload fluctuations.

Finally, Serverless instances offer an extremely simple billing model—charging by SQL execution. Users do not need to pre-purchase excessive resources and incur waste. As the system has only three daily business peak periods, with a total duration of less than six hours, this billing model significantly reduces overall database usage costs.

### Customer Benefits

**Cost reduction with performance improvement:**

Serverless instances provide an optimal resource utilization solution, significantly reducing both operational and usage costs. At the same time, MatrixOne's HTAP capabilities meet the performance requirements of both order management workloads and complex data queries.

**Business isolation with stable performance:**

MatrixOne Serverless instances provide tenant-level resource isolation. Combined with the pay-per-SQL billing model, users create separate instances for each customer's read and write workloads, ensuring that different businesses no longer impact each other's performance.
