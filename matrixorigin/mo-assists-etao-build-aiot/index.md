---
title: >-
  MatrixOne Assists ETAO Innovation in Building a High-Performance Smart
  Manufacturing AIOT System
author: MatrixOrigin
mail: lichuanzi@matrixorigin.io
description: >-
  ETAO Innovation simplified its MES system by switching to MatrixOne—no more
  juggling MySQL, InfluxDB, or MongoDB! Now, they handle everything with one
  database, improving performance and speeding up project delivery.
tags:
  - news
keywords:
  - MatrixOS
  - MatrixOrigin
publishTime: '2024-09-23 17:00:00+00:00'
image:
  '1': /content/en/shared/mo-news.webp
  '235': /content/en/shared/mo-news.webp
date: '2024-09-23 17:00:00+00:00'
lang: en
status: published
---

# Customer Overview

The telecom operator has been deeply involved in the Internet of Things (IoT) field for many years, providing comprehensive IoT solutions for both enterprises and individuals, including key services like smart connectivity, device management, data collection, and analysis. Leveraging its extensive network coverage and technological strengths, the operator delivers efficient, secure, and reliable IoT services across various industries, facilitating digital transformation and intelligent operations. The operator has built its IoT ecosystem on four major entry points—chips, operating systems, modules, and hardware—establishing three major platforms: an IoT SIM card management platform, a connection management platform, and a 5G private network platform. It also focuses on three key business areas: video IoT, urban IoT, and industrial IoT.

# Business Challenges

This project, in collaboration with MatrixOne, is primarily focused on connected vehicle-related business. In the connected vehicle space, the operator mainly provides services to automotive companies such as SIM card real-name authentication and connection management. Its core system consists of three key components: the connected vehicle real-name registration platform, the 5G intelligent network management platform, and the automotive company real-name registration service platform. These three platforms each use a set of MySQL 8.0 databases, with a total data volume of over 2TB, and additional data increasing by several hundred GB annually. The system already supports dozens of automotive customers, with expectations to expand to over 100 in the future.

As the connected vehicle business grows rapidly, the operator’s database architecture faces a series of challenges:

1. Scalability Issues:

The increasing volume of high-concurrency requests has led to performance bottlenecks in MySQL databases. The only option has been to manually partition tables to distribute the load, which increases operational costs and complicates both read and write operations.

2. Query Performance Issues:

For multi-table join operations, MySQL’s query performance can slow down to several minutes or even over ten minutes. To avoid joins involving more than three tables, users have had to make precise modifications to the data structure and shift much of the computational load to the application layer, often negatively impacting application performance.

3. Resource Utilization Issues:

Overall hardware utilization is low. The business was initially planned based on large-scale commercial operations, so each system’s MySQL master-slave cluster is equipped with high-spec physical machines, with up to 80 CPU cores and 504GB of memory. However, since the business is still in its early stages and automotive companies only generate significant traffic during bulk activation events, hardware utilization is typically low. Against the backdrop of cost reduction and efficiency improvement, the business unit faces considerable IT cost pressures.

In response to these challenges, the IT team attempted to integrate MySQL into the K8s cloud-native container cluster prepared for the application system to address resource utilization and scalability issues. However, actual tests revealed that deploying MySQL in containers not only failed to achieve linear scalability but also resulted in significantly worse performance compared to the previous physical machine setup, ultimately leading to the abandonment of this solution.

# Solution

To address the key challenges in the current connected vehicle data architecture while avoiding extensive modifications to existing business logic, MatrixOne's cloud-native HTAP (Hybrid Transactional/Analytical Processing) solution was introduced.

1. Elastic Scalability:

MatrixOne, as a fully container-native database designed for cloud environments, natively supports deployment in K8s container environments. MatrixOne operates as a fully decoupled compute and storage database, with CN (Compute Node) and TN (Transaction Node) both running in containers managed by K8s. These nodes are stateless, allowing them to be started, stopped, or scaled at any time. The storage layer operates on object storage, providing inherent scalability. The write-log nodes, which require stateful guarantees, ensure reliability through a three-replica Raft protocol. As a result, MatrixOne can naturally leverage the strong scalability of container platforms. When the business load increases, a single command from operations can seamlessly add CN nodes in seconds, allowing the system to handle higher concurrency without service disruption.

2. Container Pooling:

MatrixOne leverages container pooling capabilities, enabling it to dynamically allocate underlying compute resources. During the early stages of business development, when overall load pressure is low, MatrixOne can operate with fewer and smaller compute container nodes. As the business load increases, a simple command allows MatrixOne to vertically or horizontally scale the existing compute container nodes in seconds. This ensures that the actual resources consumed always match business needs, significantly improving hardware utilization.

3. Multi-Tenancy:

MatrixOne supports multi-tenant capabilities, allowing different users to log in under separate tenants within the same MatrixOne cluster, each seeing a completely distinct data space. Additionally, one or more CN (Compute Nodes) can be assigned to different tenants, ensuring isolation of compute loads. This allows all database hardware for the three sets of business applications to be pooled, while each business application database can exist as a tenant within the same MatrixOne cluster, sharing the resources of a single cluster. This usage model further enhances overall hardware utilization.

4. HTAP Capability:

MatrixOne is an HTAP (Hybrid Transactional/Analytical Processing) database, significantly outperforming MySQL in handling multi-table joins and aggregate analytical OLAP queries. Queries that previously took several minutes in MySQL can now return results in seconds with MatrixOne, greatly reducing the need to push computational tasks to the application layer, thereby alleviating the burden on the business application.

5. MySQL Compatibility:

MatrixOne is highly compatible with MySQL 8.0, allowing developers to seamlessly continue using Java tools such as ORM framework Hibernate, connection pool Druid, and modeling development management tools like DBeaver. As a result, users can maintain the same development habits as they would with MySQL, significantly reducing the cost of migration and application adaptation.

# Implementation Process

After thoroughly understanding the technical details of MatrixOne, the customer decided to proceed with the cloud-native database transformation project, and the project entered the POC (Proof of Concept) implementation stage.

First, a test deployment was conducted using K8s and object storage. MatrixOne used a total of 76 vCPUs, 304GB of memory, and 4TB of object storage resources, successfully deploying the entire solution for three business systems, reducing physical MySQL resources (1 master and 1 replica) by nearly 80%.

Next, application adaptability testing was carried out. The business team prepared 43 application interfaces for testing, 42 of which passed on the first attempt. One interface encountered a discrepancy due to improper use of MySQL's conversion between integer and string data types. After suggesting a code correction to the customer, the 43rd interface passed the test.

Third, performance testing was conducted on certain business interfaces with higher performance requirements. The customer required that under 100 concurrent requests, the end-to-end interface delay remain under 10 seconds. MatrixOne maintained an average response time of under 3 seconds, nearly 20 times faster than MySQL. Additionally, for more demanding queries, MatrixOne could quickly launch new compute nodes for instantaneous parallel processing, further improving query performance.

Lastly, to ensure data synchronization and migration capabilities, the customer tested both offline and real-time solutions using DataX and Flink CDC. MatrixOne maintained data consistency with MySQL tables and achieved second-level synchronization.

# Customer Benefits

By adopting MatrixOne's cloud-native HTAP solution, the telecom operator gained significant benefits for its connected vehicle management system:

1. Performance Improvement:

MatrixOne’s high-performance OLAP queries significantly enhanced system responsiveness, especially for complex queries. Compared to the original MySQL database, query efficiency improved by tens of times, improving the application development model and user experience.

2. Cost Optimization:

Through MatrixOne's containerized deployment and resource pooling management, the telecom operator could dynamically adjust resource allocation based on actual business needs, avoiding resource waste and effectively controlling costs.

3. Simplified Operations:

Full K8s containerized management greatly simplified database operations, making expansion and management more automated and convenient, reducing operational complexity and workload. This also allowed the database and applications to share a unified operational management system.

These improvements not only enhanced the performance and stability of the telecom operator’s connected vehicle management system but also achieved effective cost control and rapid business responsiveness, laying a solid foundation for future growth.
