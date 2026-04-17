---
title: >-
  Shenzhen Smart City | One-stop Traffic Big Data Platform Transformation Based
  on the Hyper-Converged Database MatrixOne
author: MatrixOrigin
description: >-
  Shenzhen Smart City adopts MatrixOne to transform its traffic big data
  platform, achieving second-level real-time analytics, reducing system
  complexity by 80%, and cutting operation costs by 50%.
tags:
  - usecase
keywords:
  - MatrixOne
  - Smart City
  - Traffic Big Data
  - Cloud-Native Database
publishTime: '2025-01-09T17:00:00+08:00'
image:
  '1': /content/zh/shared/case.png
  '235': /content/zh/shared/case.png
annotation: 物联网与智慧城市 - 深智城交通大数据
date: '2025-01-09T17:00:00+08:00'
lang: en
status: published
---

## Shenzhen Smart City | One-stop Traffic Big Data Platform Transformation Based on the Hyper-Converged Database MatrixOne

In smart transportation applications, data processing requirements are extremely complex, involving multiple aspects such as people, vehicles, roads, and the environment, and generating large volumes of heterogeneous data. Traffic management personnel need to conduct real-time analysis and make decisions based on these data to respond to various traffic incidents. However, in actual production environments, there are issues such as deficiencies in data processing, high management complexity, and insufficient compatibility with cloud-native infrastructure, etc..

Practice has proven that MatrixOne can support the real-time traffic digital simulation project of Shenzhen Smart City fully and stably. MatrixOne help Shenzhen Smart City achieve second-level real-time performance for both business operations and analytics. Significant improvements have been realized in terms of technology, management, and cost. It has reduced system complexity, strengthening integration with K8s cloud infrastructure, and lowering operation and maintenance costs by approximately 50%.

**This case will introduce of the transformation process of the one-stop traffic big data platform of Shenzhen Smart City Technology Development Group Co., Ltd. (hereinafter referred to as "Shenzhen Smart City"), based on the hyper-converged database MatrixOne.**

Shenzhen Smart City is committed to advancing the development of smart cities and digital government in Shenzhen. As a technology innovation–driven enterprise, during the 14th Five-Year Plan period, Shenzhen Smart City has set ambitious strategic goals: achieving "RMB 10 billion in revenue and a RMB 100 billion market capitalization." To this end, Shenzhen Smart City has engaged in the construction and operation of Shenzhen's smart city and digital government initiatives actively, while cultivating and developing strategic emerging industries.

Shenzhen Smart City has built a technical team of 4,300 highly qualified professionals spanning multiple fields. Among them are 4 national-level talents, 65 provincial- and ministerial-level talents, 123 national-level industry experts, and 196 professionals holding senior or associate senior professional titles. This diversified team provides strong technical support for Shenzhen Smart City in smart city development and enterprise digital transformation.

Shenzhen Smart City adopts an innovative "1 + N + 1" operating model, which leverages a state-owned enterprise platform for overall coordination and ecosystem integration. By incorporating cutting-edge technologies such as digital twins and blockchain, this model comprehensively empowers smart city development and enterprise digital transformation, driving the intelligent and digital evolution of the city.

### Business Challenges

In Shenzhen Smart City's intelligent transportation system, massive volumes of heterogeneous data are generated every day from people, vehicles, roads, and the environment. **When faced with the heterogeneous data, traditional database technologies encounter the following issues:**

**1. Inability to meet high-frequency write requirements for massive data volumes**

Traditional database technologies suffer from insufficient write performance when handling ultra-large-scale data, making it difficult to support business needs.

**2. Limitations in real-time data analysis and updates**

Existing database technologies are unable to achieve real-time data analysis and updates, resulting in slow business response times.

**3. Difficulty in ensuring data consistency**

Under high concurrency and complex operations, traditional databases struggle to maintain data consistency, increasing the risks of data management.

**4. Compatibility issues with heterogeneous data**

Traditional databases often face insufficient compatibility when processing heterogeneous data from different sources and in different formats.

**In addition, Shenzhen Smart City's existing data technology stack also has certain limitations:**

**1. Fragmented data components, leading to complex management and operations**

Dispersed data components increase the difficulty of system management and operations, that makes efficient operation become difficult.

**2. Insufficient compatibility with cloud-native technologies**

The existing technologies have limited compatibility with cloud-native infrastructure such as Kubernetes, preventing full utilization of the advantages brought by modern technologies.

**Therefore, Shenzhen Smart City partnered with MatrixOne with the aim of achieving the following three objectives for the system:**

1. Simplify the data architecture and improve efficiency — By optimizing and integrating the data architecture, the system's management complexity is reduced and efficiency is improved.

2. Enhance business performance to meet data processing requirements — System performance is improved to better handle high-concurrency processing demands for massive volumes of data.

3. Improve heterogeneous data processing capabilities — The system's compatibility with different data types and formats is enhanced to ensure comprehensive processing and integration of business data.

### Solution Analysis

![1.png](/content/zh/transportation-dataplatform-based-hyper-Converged-database/szc1.png?width=800)

The project mainly focuses on the following three aspects:

**1. Database Technology Enhancement**

- **Data warehouse upgrade:** Optimize the existing data warehouse to improve the system's adaptability to various business scenarios and meet diverse data processing requirements.

- **Database technology integration:** Integrate transactional and analytical database technologies to provide unified, high-performance database support, enabling seamless switching between transactional and analytical scenarios.

- **Enhanced data operation support:** Expand support for data updates, deletions, and transactions, and provide online table schema change capabilities, reducing the system's difficulty in adapting to business changes.

**2. Cloud-Native Enablement**

- **Compatibility with cloud-native infrastructure:** Enhance compatibility with Kubernetes (K8s), enabling seamless integration between the data layer and infrastructure layer through container orchestration, and improving system flexibility.

- **Simplified infrastructure management:** Streamline infrastructure management processes, reduce management complexity, and improve operational efficiency.

- **Optimized resource management:** Achieve flexible scheduling and elastic scaling through unified resource management, enhance responsiveness to transient workload changes, and optimize the utilization of underlying resources.

**3. Integration with the Existing Real-Time Traffic Digital Simulation System**

- **Support for simulating real traffic business scenarios:** Provide technical support to ensure the ability to simulate real-world traffic business scenarios and meet project requirements.

- **Massive data processing capabilities:** Possess the ability to process terabyte-level data per hour, ensuring stable and efficient system operation under high data volumes.

- **Second-level real-time business and analytics:** Through MatrixOne technology, ensure real-time business processing and data analysis, achieving second-level response times.

![2.png](/content/zh/transportation-dataplatform-based-hyper-Converged-database/szc2.png?width=800)

### Customer Benefits

MatrixOne fully supports Shenzhen Smart City Group's real-time traffic digital simulation project. By simulating real traffic business scenarios, MatrixOne can easily handle terabyte-level data generated per hour and achieve second-level real-time analytics.

In addition, Shenzhen Smart City's transportation system has seen significant improvements in terms of technology, management, and cost:

**1. Simplified data architecture**

By consolidating the original five data components into a single database, the number of components was reduced by 80%, greatly lowering system complexity and improving management efficiency.

**2. Realization of cloud-native architecture**

By leveraging Kubernetes (K8s) scheduling and scaling capabilities, seamless integration with K8s cloud infrastructure was achieved. This simplified deployment and management processes and enabled unified management of the data layer and business layer.

**3. Cost savings and efficiency improvements**

Significant cost savings and efficiency gains were achieved through reducing the number of components, simplifying the architecture, and consolidating teams. At the same time, by sharing cloud infrastructure and merging operations teams, operation and maintenance costs were reduced by approximately 50%.
