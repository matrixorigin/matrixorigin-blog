---
title: >-
  Extreme Vision | MatrixOne Empowers Extreme Vision to Build a Unified and
  Reusable AI Feature Platform
author: MatrixOrigin
description: >-
  Extreme Vision adopts MatrixOne to build a unified AI feature data platform,
  reducing model development cycle by 30% and improving cross-department data
  utilization by 40%.
tags:
  - usecase
keywords:
  - MatrixOne
  - AI Feature Platform
  - Machine Learning
  - Feature Engineering
publishTime: '2025-01-09T17:00:00+08:00'
image:
  '1': /content/zh/shared/case.png
  '235': /content/zh/shared/case.png
annotation: 制造业数据平台 - 极视角 AI 特征平台
date: '2025-01-09T17:00:00+08:00'
lang: en
status: published
---

## Extreme Vision | MatrixOne Empowers Extreme Vision to Build a Unified and Reusable AI Feature Platform

### Client's Introduction

Extreme Vision Technology Co., Ltd. (Extreme Vision) founded in June 2015, it is a professional provider of artificial intelligence and computer vision algorithms. Extreme Vision is China's first computer vision algorithm platform, dedicated to expanding the development and application of artificial intelligence across different industries and fields, and providing enterprises with a wide range of AI algorithms and solutions. The Extreme Vision algorithm platform has brought together more than 400,000 computer vision algorithm developers from China and abroad, and has successfully served over 3,000 government organizations, enterprises, and research institutions. It provides the industry with a rich set of AI algorithms and foundational platforms, empowering various sectors to achieve intelligent transformation and upgrading.

### Technology Challenges

As a company whose core capabilities center on machine learning and AI algorithms, Extreme Vision's business involves extensive AI/ML-related engineering work, in which feature engineering plays a particularly critical role. Feature engineering refers to the process of transforming raw data into feature vectors. It is one of the most important steps in machine learning, directly affecting model performance, and typically requires a significant amount of time. Typical feature engineering processes include data cleaning, feature extraction, and feature selection.

![jsj2](/content/zh/jishijiao-case/jsj2.jpg)

In the overall feature engineering process, the storage and management of feature data is a critical component. Traditionally, AI engineers tend to store feature data in relatively simple file-based formats and then load these features into subsequent training or inference pipelines through code. Extreme Vision's approach to feature data storage and usage has followed a similar pattern.

Over years of development, Extreme Vision has accumulated a large number of AI algorithms across various vertical domains, and the associated feature data has become extremely large and highly fragmented. Most of these feature datasets exist only within individual AI engineers' own workflows. In reality, however, many application scenarios are beginning to overlap and integrate. Due to the lack of effective management, many relatively general-purpose feature datasets cannot be reused, resulting in the need to repeat the entire feature engineering process each time a new model is trained. This leads to significant consumption of engineering time and computational resources.

### The construction requirements for a unified feature platform

As a result, Extreme Vision began seeking to build a unified feature repository data management platform to improve the overall efficiency and reusability of feature engineering. The core capabilities required for this platform include:

**Support for storing data in various formats and modalities:**

Because different machine learning feature engineering algorithms vary significantly and produce diverse output formats, the platform must support strictly schema-defined structured CSV data, schema-flexible JSON data, text data, image data, and vector data generated through vectorization algorithms.

**Efficient sharing and secondary processing of feature data:**

Feature engineering is typically constructed by different AI engineers and reused across other project workflows. Therefore, the platform needs to support rapid ingestion of feature data and enable sharing and publishing to other engineers for collaboration, while also allowing further processing to create new feature repositories.

**Capabilities for various data transformations:**

Different machine learning algorithms have varying requirements for training and inference, and even within the same project there may be frequent adjustments to feature data. As such, the platform must provide corresponding data transformation capabilities.

**Flexible and efficient query capabilities:**

Data processed for machine learning is often massive in volume, especially time-series data. Identifying anomalies or contaminated data within existing feature repositories typically requires aggregation or window-based query capabilities. In addition, for matching tasks involving images or text, the platform must has vector search functionality.

**High-concurrency online service capability:**

Feature data is not only used in training scenarios but is also commonly applied in inference scenarios. Inference services are often large-scale, high-concurrency online services, with some popular AI algorithms reaching thousands of concurrent requests.

**System scalability:**

As the size of the feature repository continues to grow with the delivery of more algorithms and projects, the platform must be scalable to ensure consistent performance and stability as data volumes increase.

### Solution

Traditionally, building such a feature data platform requires a wide range of data processing capabilities, including the storage and querying of relational data, JSON data, vector data, and even unstructured data. This typically necessitates the use of at least three or more different database components. In addition, requirements for data transformation and collaborative data sharing often require the introduction of a large number of ETL components and custom business logic. For Extreme Vision, the construction and maintenance of such a platform would be extremely challenging.

By contrast, MatrixOne, the hyper-converged database developed by Matrix Origin, is well suited to meet these comprehensive requirements. By serving as a unified data foundation for the feature data platform, MatrixOne allows developers to delegate data storage, transformation, querying, and collaborative sharing entirely to the database layer. This enables them to focus solely on AI-related engineering implementation.

MatrixOne offers several key capabilities that make it well suited to the requirements of a feature data platform:

**Unified modeling and storage of multiple data types:**

MatrixOne supports unified modeling of structured data, JSON data, vector data, and file data. Users only need to define the relevant data types within the same schema, and can then ingest and store all data in a unified manner by INSERT.

**Integrated querying across multiple workloads:**

MatrixOne supports a wide range of workloads, including OLTP for large-scale, high-concurrency queries; OLAP for batch data aggregation and analysis; windowed analysis for time-series data; comparison and search for vector data; and retrieval for text data.

**Multi-tenant and data sharing capabilities:**

Each AI engineer can have their own workspace and data space within the same MatrixOne cluster, while also being able to quickly share their data with other AI engineers either through point-to-point sharing or broadcast-style publishing, enabling efficient collaboration.

**Strong scalability:**

MatrixOne is designed with a cloud-native, decoupled storage and compute architecture. The storage layer is built on low-cost object storage, while the compute layer is composed entirely of containers. Whether facing changes in data volume or fluctuations in business workloads, MatrixOne can elastically scale in the most appropriate way to meet requirements.

**Extensible data transformation capabilities:**

MatrixOne support certain streaming data transformations and processing through SQL, and also allows user-defined transformation logic to be integrated into the database via Python UDFs for unified task management.

With these capabilities, MatrixOne enables the one-stop construction of an AI feature data platform, greatly simplifying the traditionally complex architectures that rely on multiple database components.

![jsj1](/content/zh/jishijiao-case/jsj1.jpg)

After completing the AI feature platform built on MatrixOne as the underlying foundation, Extreme Vision's AI engineers were able to completely move away from the previous model in which a separate feature engineering pipeline had to be built for each AI algorithm or model. In terms of model development efficiency, by precomputing and storing features, the model development cycle was reduced by 30%, shortening the average timeline from four weeks to 2.8 weeks. At the same time, feature reuse reduced the feature engineering pipelines required for each model iteration by 40%. A large number of repetitive pipelines were identified and replaced by existing feature engineering workflows or by directly using prebuilt feature datasets. In addition, through the sharing of business features, overall business flexibility increased significantly. When different departments and projects encountered business requirements, cross-department and cross-project feature data sharing improved overall data utilization by 40%.

Feature data platforms are, in fact, a very common requirement in the field of machine learning. The collaboration between MatrixOne and Extreme Vision provides the entire industry with an ideal reference model for building feature data platforms.
