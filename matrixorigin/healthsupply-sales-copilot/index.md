---
title: >-
  A Well-known Health Supplement Enterprise: Introducing MatrixOne Intelligence,
  Building a Unified GenAI Data Platform for Sales Copilot
author: MatrixOrigin
description: >-
  A global health supplement retail brand adopts MatrixOne Intelligence to build
  a unified AI data engineering platform, reducing data preparation time by 80%
  and enabling rapid AI application deployment.
tags:
  - usecase
keywords:
  - MatrixOne Intelligence
  - Sales Copilot
  - GenAI Platform
  - RAG Application
publishTime: '2025-01-09T17:00:00+08:00'
image:
  '1': /content/zh/shared/case.png
  '235': /content/zh/shared/case.png
annotation: AI 智能体应用 - 保健品公司销售 Copilot
date: '2025-01-09T17:00:00+08:00'
lang: en
status: published
---

## A Well-known Health Supplement Enterprise: Introducing MatrixOne Intelligence, Building a Unified GenAI Data Platform for Sales Copilot

### Customer's Background and Challenge

The client is a well-known global health supplement retail brand. To accelerate the intelligent transformation of the enterprise, the AI factory project was initiated, aiming to build a series of AI assistant applications for multiple business functions including marketing, customer service, and finance. However, this ambitious AI strategy encountered challenges at the data level. The key knowledge required by the enterprise, such as product information, business policies, market reports, etc., are in various forms like PDF, HTML, structured data, and they are scattered across multiple heterogeneous IT systems such as CMS, S3, and databases, etc..

If each Copilot application independently connects, accesses, and processes these dispersed data sources, it will result in an extremely complex and chaotic "many-to-many" silos-style integration architecture. This model will not only lead to a large amount of repetitive development work as well as inconsistent standards and quality criteria of data processing, but also result in high operation and maintenance costs for the entire system, making it difficult to support the rapid, agile, and large-scale implementation of enterprise-level AI application strategies. Therefore, there is an urgent need for a unified data engineering platform to address this bottleneck.

### Solution: Build a Unified AI Data Engineering Platform

To address the challenges and build a solid data foundation for the AI factory, the client has chosen to adopt MatrixOne Intelligence and construct a unified AI data engineering platform, which fundamentally resolves the issues of data fragmentation and complex data processing workflows. The core goal of this platform is to accomplish the data preparation work required by all AI applications through a standardized and automated central platform, thereby achieving the principle of "processed once, shared globally".

Specific process：

**1. Unified Data Ingestion**

Through its built-in Connector module, the platform ingests various types of structured data (e.g., PDF documents, HTML content) from the client's existing business systems (e.g., S3, CMS, Dataphin) automatically and periodically.

**2. Automated Multimodal Data Processing Pipeline**

The ingested raw data enters a visual workflow driven by MatrixPipeline. Within this pipeline, the platform leverages a variety of integrated AI models to perform in-depth data processing, including:

a. Intelligent Parsing and Segmentation: Using layout analysis models (e.g., layout-doc-yolo) and OCR engines (e.g., Paddle-OCR), it accurately parses document structures and intelligently splits long texts into segments suitable for RAG.

b. Embedding: It invokes industry-leading vector models such as BAAI/bge-m3 to convert the processed data into high-quality vectors, enabling semantic retrieval.

**3. Building a Unified Vector Knowledge Base**

All processed, enhanced, and vectorized AI-Ready data is ultimately stored uniformly in the MatrixOne database. As the core vector database, MatrixOne provides a unified, high-performance, and highly available knowledge entry point for all upper-layer AI applications.

![1.png](/content/zh/moi-matrixone-copilot/1.png)

### Implement Effect

In the actual implementation of Sales Copilot, frontline sales ask the assistant for help through multimodal interaction methods such as voice and images, putting forward complex needs such as "how to formulate a high-protein nutrition plan for diabetic patients". At this point, the unified data platform connects and operates instantly: it accurately retrieves cross-domain knowledge from the MatrixOne vector database, including product ingredient lists, clinical nutrition research reports, and customers' historical health records, and then integrates this knowledge into a personalized plan through RAG-enhanced generation technology. By deploying MatrixOne Intelligence as a unified data engineering platform, the client has successfully laid a solid data foundation for its AI factory strategy and achieved remarkable results:

**● Simplified Technical Architecture and Improved Development Efficiency:** The platform has successfully decoupled the complex underlying data engineering from upper-layer AI application development, completely eliminating the "many-to-many" integration dilemma. AI application developers no longer need to worry about data acquisition and processing—they only need to call AI-Ready data from the unified platform. As a result, the average data preparation time for new applications has been reduced by 80%.

**● Guaranteed Data Quality and Unified Data Standards:** The standardized central data processing workflow ensures full consistency in data standards across all links (including data source, cleaning, processing, and embedding) for data used by all AI applications. This greatly enhances the accuracy, consistency, and credibility of answers when RAG applications such as "Sales Copilot" provide business-related responses.

**● Accelerated Deployment of Enterprise-Level AI Applications:** The data engineering platform has successfully supported the launch of multiple core Copilot applications, including "AI Contract Review", "Sales Copilot", and "AI Healthcare Assistant". Among them, the "Contract Review Agent" has significantly reduced the single review time from 16 days to just 1 minute, fully validating the advanced nature and commercial value of this architecture.

### Long-Term Plan

Currently, the unified data platform has integrated over 20 systems, and the client is planning to further expand its scope. According to the disclosed internal roadmap, in 2025, it will gradually integrate real-time signals such as supply chain sensor data and IoT data streams from research farms. Meanwhile, through dynamic embedding technology, the platform will be equipped with predictive analytics capabilities. This evolution not only upholds the core logic of "processed once, shared globally" but also achieves a critical leap in the depth of intelligence—shifting from passive response to active decision-making. It thereby lays the foundation for the next-phase goal of the AI factory: building an enterprise-level Agent Network.
