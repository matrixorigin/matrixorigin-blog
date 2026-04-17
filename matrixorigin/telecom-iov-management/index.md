---
title: >-
  A Telecommunications Operator | MatrixOne Builds a Low-Cost, High-Performance
  Connected Vehicle (IoV) Management System
author: MatrixOrigin
description: >-
  A telecommunications operator adopts MatrixOne cloud-native HTAP solution for
  connected vehicle management, reducing hardware resources by 80% and improving
  query performance by 20x.
tags:
  - usecase
keywords:
  - MatrixOne
  - Connected Vehicle
  - IoV
  - Cloud-Native Database
publishTime: '2025-01-09T17:00:00+08:00'
image:
  '1': /content/zh/shared/case.png
  '235': /content/zh/shared/case.png
  annotation: 物联网与智慧城市 - 电信运营商车联网
date: '2025-01-09T17:00:00+08:00'
lang: en
status: published
---

## A Telecommunications Operator | MatrixOne Builds a Low-Cost, High-Performance Connected Vehicle (IoV) Management System

### Client's Introduction

The telecommunications operator has been deeply engaged in the IoT field for many years and is committed to providing comprehensive IoT solutions for enterprises and individuals, covering core services such as intelligent connectivity, device management, data collection, and data analysis. Leveraging its strong network coverage and technological advantages, the operator delivers efficient, secure, and reliable IoT services across various industries, supporting digital transformation and intelligent operations.

With IoT connectivity as its foundation, the operator positions itself at four key entry points—chips, operating systems, modules, and hardware—and has built three major platforms: an IoT SIM card management platform, a connectivity management platform, and a 5G private network platform. Based on that, it has developed three major business domains: video IoT, urban IoT, and industrial IoT.

### Challenge

The project carried out in cooperation with MatrixOne is mainly oriented toward connected vehicle–related businesses. In the connected vehicle domain, the operator primarily provides services for automobile manufacturers such as SIM card real-name authentication and connection management. Its core system consists of three main components: the connected vehicle real-name registration platform, the 5G intelligent connected network management platform, and the automobile manufacturer real-name registration service platform. Each of these three platforms uses a separate MySQL 8.0 database, with the current total data volume exceeding 2 TB. At the same time, the annual data growth reaches several hundred gigabytes. The system currently supports dozens of automobile manufacturer customers and is expected to expand to more than one hundred in the future.

With the rapid development of connected vehicle services, the operator's database architecture has faced a series of challenges:

**1. Scalability issues:** The increase in high-concurrency requests has led to performance bottlenecks in the MySQL database. Users can only manually distribute the load through table sharding, resulting in high operation and maintenance costs, with both read and write operations becoming complex.

**2. Query performance issues:** When dealing with multi-table operations, MySQL query performance will slow down to several minutes or even more than ten minutes. Users have had to carefully modify the data structure to avoid join operations involving more than three tables, while shifting a large amount of computational workload to the application layer, which often leads to performance degradation at the application level.

**3. Resource utilization issues:** Overall hardware is underutilization. Because the initial business planning was based on estimates for a relatively large commercial scale, each system's underlying MySQL primary–standby cluster was equipped with very high-specification physical servers, with configurations reaching up to 80 CPU cores and 504 GB of memory. In fact, however, since the business is still in an early stage of development and automobile manufacturers only generate noticeable traffic peaks during batch activation operations, hardware is underutilization in most cases. Against the backdrop of cost reduction and efficiency improvement, the business department faces significant IT cost pressure.

Under these circumstances, the IT team of the business once attempted to connect MySQL to a K8s cloud-native container cluster prepared for the application system in order to address resource utilization and scalability issues. However, testing showed that simply running native MySQL in containers not only failed to achieve linear scalability, but also resulted in a significant performance decline compared with the previous physical server deployment, the team had to abandon this approach eventually.

![1.png](/content/zh/mo-helps-build-telematics-management-system/dxyys2.png?width=800)

### Solutions

To address the key challenges in the current connected vehicle data architecture while avoiding large-scale modifications to existing business logic, a cloud-native HTAP solution based on MatrixOne has been introduced.

**1. Elastic scalability:** As a cloud-native database designed entirely for containerized environments, MatrixOne natively supports deployment in K8s container environments. At the same time, MatrixOne adopts a fully decoupled compute-and-storage architecture: both CN (compute node) and TN (transaction management node) run in containers managed by K8s. These two types of nodes are stateless and can be started, stopped, or scaled at any time. The storage layer runs on object storage and inherently provides strong scalability. Write-ahead log nodes that require state consistency ensure reliability through a three-replica Raft protocol. As a result, MatrixOne can naturally leverage the powerful scalability of container platforms to achieve elastic expansion. When business workloads increase, only a single operations command is required to seamlessly add CN compute nodes within seconds to handle higher levels of concurrent business traffic.

![2.png](/content/zh/mo-helps-build-telematics-management-system/dxyys3.png?width=800)

**2. Container pooling:** Leveraging its container-based pooling capabilities, MatrixOne can allocate underlying compute resources on demand. During the early stages of business development, when overall workload pressure is relatively low, MatrixOne can operate with fewer and smaller compute container nodes. As business workloads gradually increase, MatrixOne only requires a single, simple operations command to perform vertical or horizontal scaling of existing compute container nodes within seconds. This ensures that the underlying resources in use always match the resources required by the business, significantly improving hardware utilization.

**3. Multi-tenant:** MatrixOne supports multi-tenant capabilities. Within a single MatrixOne cluster, users can log in under different tenants and access completely isolated data spaces. At the same time, one or more CN compute nodes can be bound to different tenants to ensure isolation of compute workloads. As a result, all database hardware underlying the three business applications can be pooled, while each upper-layer business application database exists as a tenant within a single MatrixOne cluster, sharing the same MatrixOne cluster. This usage model further improves overall hardware utilization.

![3.png](/content/zh/mo-helps-build-telematics-management-system/dxyys4.png?width=800)

**4. HTAP capabilities:** MatrixOne is an HTAP database. For multi-table joins and OLAP queries involving aggregation and analytical processing, MatrixOne is significantly more powerful than MySQL. Queries that previously took tens of minutes to execute in MySQL can produce results within seconds in MatrixOne. This greatly reduces the data computation burden that was previously forced onto the business application layer.

**5. MySQL compatibility:** MatrixOne is highly compatible with MySQL 8.0. For developers, the Java toolchains in use—including the ORM framework Hibernate, the Druid connection pool, and the modeling and development management tool DBeaver—can all be seamlessly integrated with MatrixOne. Users only need to maintain the same development practices as with MySQL, which significantly reduces the cost of migration and application adaptation.

### Process

After gaining a detailed understanding of MatrixOne's overall technical details, the customer clearly defined a plan to carry out a cloud-native transformation of the database, and the project entered the POC implementation phase.

First, deployment testing based on K8s and object storage was conducted. MatrixOne used a total of 76 vCPUs, 304 GB of memory resources, and 4 TB of object storage resources to complete the overall deployment for three business systems. Compared with the previous MySQL physical machine setup with one primary and one standby instance, the overall resource usage was reduced by nearly 80%.

Second, application compatibility testing was carried out. The business side prepared 43 application interfaces for testing. Forty-two interfaces passed the tests on the first attempt. One interface showed discrepancies due to non-standard usage of integer and string data type conversions in MySQL. Following our recommendations, the customer revised their code and successfully passed the test for the 43rd interface.

Third, we conducted performance testing on certain business interfaces that have relatively stringent performance requirements. The client required that, under 100 concurrent requests, the end-to-end application-side interface latency be within 10 seconds. MatrixOne maintained an average performance level within 3 seconds, nearly 20 times faster than MySQL. Moreover, for queries with higher performance requirements, MatrixOne can further improve query performance by rapidly launching new compute nodes to perform instantaneous parallel computation.

Finally, to ensure MatrixOne's capabilities in data synchronization and migration, the customer tested both offline and real-time solutions based on DataX and Flink CDC, respectively. MatrixOne was able to maintain data consistency with MySQL tables and achieve second-level synchronization.

### Client's Benefits

By adopting MatrixOne's cloud-native HTAP solution, the telecom operator achieved significant benefits in its vehicle networking management system:

**1. Performance Improvement**

MatrixOne's high-performance OLAP query capabilities significantly improved system response speed, especially when handling complex queries. Compared with the original MySQL database, query efficiency increased by dozens of times, thereby improving the application development model and user experience.

**2. Cost Optimization**

Through MatrixOne's containerized deployment and resource pooling management, the operator can dynamically adjust resource allocation according to actual business needs, avoiding resource waste and achieving effective cost control.

**3. Simplified Operations and Maintenance**

Fully K8s-based containerized management greatly simplified operations and maintenance work, making database scaling and management more automated and convenient, and reducing operational complexity and workload. At the same time, it enabled the formation of a unified operations and maintenance system for both databases and applications.

Through these improvements, the telecom operator not only enhanced the performance and stability of the vehicle networking management system, but also achieved effective cost control and rapid business responsiveness, laying a solid foundation for future development.
