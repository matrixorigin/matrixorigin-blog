---
title: >-
  ShenZhen Smart City’s One-Stop Traffic Big Data Platform Transformation Based
  on the Hyper-Converged Database MatrixOne
author: MatrixOrigin
mail: lichuanzi@matrixorigin.io
description: >-
  ShenZhiCheng is revolutionizing its traffic platform using MatrixOne’s
  hyper-converged database. Simplified architecture, seamless cloud-native
  integration, and real-time processing—this transformation is a game-changer!
tags:
  - news
keywords:
  - MatrixOS
  - MatrixOrigin
publishTime: '2024-09-02 17:00:00+00:00'
image:
  '1': /content/en/shared/mo-news.webp
  '235': /content/en/shared/mo-news.webp
date: '2024-09-02 17:00:00+00:00'
lang: en
status: published
---

In intelligent transportation applications, the demand for data processing is extremely complex, involving multiple aspects such as people, vehicles, roads, and the environment, resulting in a large amount of heterogeneous data. Traffic management personnel need to perform real-time analysis and decision-making on this data to respond to various traffic events. However, in actual production, issues such as data processing defects, high management complexity, and insufficient compatibility with cloud-native infrastructure often arise.

Practice has proven that MatrixOne can fully and stably support the traffic digital real-time simulation project of ShenZhiCheng Group, achieving second-level business and analysis real-time capabilities, with significant improvements in technology, management, and cost. This has greatly reduced system complexity, enhanced integration with K8s cloud infrastructure, and reduced operation and maintenance costs by approximately 50%.

This case study will detail the process of transforming the one-stop traffic big data platform of Shenzhen City Smart Technology Development Group Co., Ltd. (hereinafter referred to as ShenZhiCheng) based on the hyper-converged database MatrixOne.

# Client Background

ShenZhiCheng is committed to promoting the construction of Shenzhen’s smart city and digital government. As a technology-driven enterprise, ShenZhiCheng has set ambitious strategic goals during the 14th Five-Year Plan, aiming to achieve "100 billion in revenue and a trillion in market value." To this end, ShenZhiCheng actively participates in the construction and operation of Shenzhen's smart city and digital government and vigorously fosters and develops strategic emerging industries.

ShenZhiCheng has a technical team of 4,300 highly qualified professionals covering multiple professional fields. The team includes 4 national-level talents, 65 provincial-level high-level talents, 123 national-level industry experts, and 196 professionals with senior professional titles. This diverse team provides solid technical support for ShenZhiCheng in smart city construction and enterprise digital transformation.

ShenZhiCheng adopts an innovative "1+N+1" operational model, which integrates cutting-edge technologies such as digital twins and blockchain through the coordination and ecosystem combination of state-owned enterprise platforms, fully empowering the construction of smart cities and the digital transformation of enterprises, and promoting the intelligent and digital development of cities.

# Business Challenges

The smart transportation system of ShenZhiCheng generates massive amounts of heterogeneous data daily from people, vehicles, roads, and the environment. Traditional database technology faces the following challenges when dealing with heterogeneous data:

1. Inability to meet the high-frequency write demands of massive data:

Traditional database technology lacks sufficient write performance when processing large-scale data, making it difficult to support business needs.

2. Limitations in real-time data analysis and updates:

Existing database technology cannot achieve real-time data analysis and updates, resulting in slow business response times.

3. Difficulty in ensuring data consistency:

Under high concurrency and complex operations, traditional databases struggle to maintain data consistency, increasing the risk of data management.

4. Compatibility issues with heterogeneous data:

Traditional databases often face compatibility issues when handling heterogeneous data from different sources and formats.

Moreover, ShenZhiCheng's existing data technology stack has some limitations:

1. Dispersed data components complicate management and operations: The dispersed nature of data components increases the complexity of system management and operations, making efficient operation difficult.

2. Insufficient compatibility with cloud-native technologies: The existing technology has low compatibility with cloud-native infrastructures such as Kubernetes, preventing full utilization of the advantages brought by modern technologies.

To address these challenges, ShenZhiCheng, in collaboration with MatrixOne, aims to achieve the following three goals for the system:

1. Simplify the data architecture and improve efficiency:

Optimize and integrate the data architecture to reduce management complexity and enhance overall system efficiency.

2. Enhance business performance to meet data processing needs:

Improve system performance to better handle the high-concurrency processing demands of massive data.

3. Improve heterogeneous data processing capabilities:

Strengthen the system’s compatibility with different types and formats of data to ensure comprehensive processing and integration of business data.

# Solution Analysis

The project primarily focuses on the following three aspects:

1. Database Technology Enhancement:

- Data Warehouse Upgrade: The existing data warehouse has been optimized and upgraded to improve the system’s adaptability to various business scenarios, meeting diverse data processing needs.

- Database Technology Integration: Transactional and analytical database technologies have been integrated to provide unified, high-speed database support, enabling seamless switching between transactional and analytical scenarios.

- Enhanced Data Operation Support: The support for data updates, deletions, and transactions has been extended, along with the provision of online table structure modification capabilities, reducing the system's difficulty in adapting to business changes.

2. Cloud-Native Support:

- Cloud-Native Infrastructure Compatibility: Compatibility with Kubernetes (K8s) has been enhanced, allowing for seamless integration of the data layer with the infrastructure layer’s container orchestration, thereby improving system flexibility.

- Simplified Infrastructure Management: The overall management process of the infrastructure has been simplified, reducing management complexity and increasing operational efficiency.

- Optimized Resource Management: Unified resource management enables flexible scheduling and elastic scaling, enhancing the system’s ability to respond to sudden load changes and optimizing the utilization of underlying resources.

3. Coupling with the Existing Traffic Digital Real-Time Simulation System:

- Support for Simulating Real Traffic Business Scenarios: Technical support is provided to ensure the simulation of real traffic business scenarios, meeting project requirements.

- Handling Massive Data: The system is capable of processing terabytes of data per hour, ensuring stable and efficient operation under high data volumes.

- Achieving Second-Level Business and Analysis Real-Time Capabilities: MatrixOne technology ensures real-time business processing and data analysis, achieving second-level response times.

# Client Benefits

MatrixOne fully supported ShenZhiCheng Group's traffic digital real-time simulation project. By simulating real traffic business scenarios, MatrixOne can easily handle terabytes of data generated per hour and achieve second-level real-time analysis. Additionally, the ShenZhiCheng traffic system saw significant improvements in technology, management, and cost:

1. Simplified Data Architecture:

By consolidating the original five data components into a single database, the number of components was reduced by 80%, greatly reducing system complexity and improving management efficiency.

2. Cloud-Native Implementation:

Leveraging Kubernetes (K8s) for scheduling and scaling, MatrixOne achieved seamless integration with K8s cloud infrastructure. This simplified the deployment and management processes, enabling unified management of the data and business layers.

3. Cost Savings and Efficiency Improvement:

By reducing the number of components, simplifying the architecture, and integrating teams, significant cost savings and efficiency improvements were achieved. Additionally, by sharing cloud infrastructure and consolidating the operations and maintenance teams, operational costs were reduced by approximately 50%.
