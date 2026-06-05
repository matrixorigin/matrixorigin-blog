---
title: "MatrixOne Intelligence Multimodal AI Data Intelligence Solution Whitepaper (3)"
author: MatrixOrigin
mail: wudi@matrixorigin.cn
description: "MatrixOne Intelligence Multimodal AI Data Intelligence Solution Whitepaper, Part Three: Industry Use Cases"
tags:
  - Whitepaper
keywords:
  - Domestic database
  - MatrixOne Intelligence
  - MatrixOne
  - Cloud-native database
  - AI
publishTime: '2024-12-13 17:02:00+08:00'
image:
  '1': /images/blog-covers/whitepaper.png
  '235': /images/blog-covers/whitepaper.png
date: '2024-12-13 17:02:00+08:00'
lang: en
status: published
translations:
  zh: moi-whitepaper3-zh
---

<div style="text-align: center;">
  <h1><strong>MatrixOne Intelligence</strong></h1>
  <h1><strong>Multimodal AI Data Intelligence Solution Whitepaper</strong></h1>
  <h3>Your Data for Your AI</h3>
</div>

[Part One--Industry Status, Challenges, and Solution Architecture](/posts/moi-whitepaper1)

[Part Two--Detailed Technical Process of the Solution](/posts/moi-whitepaper2)

[Part Three--Industry Use Cases](/posts/moi-whitepaper3)

## Industry Use Cases

### Extreme Vision Multimodal Data and Feature Platform

#### Client Background

Extreme Vision is an enterprise focused on the research and development of computer vision algorithms. Its business scenarios cover industrial inspection, smart retail, smart cities, and many other fields. During its development, Extreme Vision faced the challenge of low AI algorithm development efficiency. In particular, it had serious pain points in the management and use of multimodal data, including scattered data, disorganized management, and low feature development efficiency. To improve AI algorithm development efficiency, Extreme Vision wanted to build a complete multimodal data and feature platform to support efficient management, processing, and reuse of large-scale data.

#### Solution

By introducing MatrixOne Intelligence, Extreme Vision built an end-to-end multimodal data and feature management platform covering data ingestion, parsing, feature engineering, storage, and modeling. The specific implementation process included the following aspects:

1. Data ingestion and integration: Extreme Vision unified multimodal data scattered across different storage systems, such as local file systems and cloud storage, into the MatrixOne database, covering core data types such as images and videos. Through MatrixPipeline's automated pipeline capabilities, the platform implemented batch archiving, deduplication, and format standardization, ensuring data consistency and manageability.

2. Data parsing and featurization: For massive image and video data, MatrixGenesis's intelligent parsing capabilities were used to extract semantic labels, object features, and embedding vectors from the data, and store these parsed results in the MatrixOne database. Multimodal features were uniformly managed and versioned, greatly improving feature traceability and reusability.

3. Feature engineering and sharing: With the Feature Store capabilities of MatrixOne Intelligence, Extreme Vision implemented centralized feature management and distributed storage. Through a unified mechanism for feature generation, optimization, and reuse, different teams can quickly call existing features, avoid duplicated development, and significantly accelerate AI algorithm iteration.

4. Storage and modeling support: The MatrixOne database supports high-concurrency and low-latency distributed storage, ensuring efficient access to multimodal data and features during algorithm development. At the same time, feature version management provides a stable data foundation for model training and ensures data consistency between training and inference.

#### Client Benefits

By building a multimodal data and feature platform based on MatrixOne Intelligence, Extreme Vision significantly improved AI algorithm development efficiency. Data ingestion efficiency increased by 60%, and multimodal data integration and management became more standardized. Feature reuse increased by 70%, avoiding wasted resources caused by repeated feature development. The algorithm iteration cycle was shortened from an average of two weeks to less than one week, significantly improving product development efficiency. With stable platform support, Extreme Vision can respond to customer needs more efficiently and accelerate the expansion of algorithm implementation scenarios.

---

### Shenzhen Smart City Group

#### Client Background

Shenzhen Smart City Group is an important participant in Shenzhen's smart city technology development. Its intelligent transportation system needs to process real-time analysis and decision-making requirements from multi-source heterogeneous data, including people, vehicles, roads, and the environment. However, traditional database systems show clear performance bottlenecks when facing massive high-frequency data writes, real-time analysis, data consistency, and multimodal data management, and cannot meet the efficient operation requirements of intelligent transportation scenarios. In addition, complex system components, high management costs, and insufficient compatibility with cloud-native technologies further limit the scalability and flexibility of the intelligent transportation system.

#### Solution

Shenzhen Smart City Group introduced MatrixOne Intelligence and comprehensively upgraded its transportation big data platform based on the capabilities of the hyper-converged database MatrixOne, building a high-performance and efficient intelligent transportation data infrastructure.

1. Data ingestion and integration: Shenzhen Smart City Group used MatrixPipeline to ingest multi-source data from the transportation system, such as sensor data, video surveillance data, and vehicle trajectory data, into the MatrixOne database. Through standardized ingestion and preprocessing, the platform achieved unified management of structured and unstructured data, laying the foundation for subsequent data analysis and real-time processing.

2. Real-time analysis and storage optimization

   a. Hyper-converged architecture: The MatrixOne database combines transactional and analytical capabilities in a single platform, eliminating the need for separate OLTP and OLAP systems and greatly improving real-time query and analysis efficiency.

   b. Real-time support: It supports high-frequency writes and real-time analysis requirements for TB-level data per hour, achieving second-level response times.

   c. Dynamic table schema changes: Online schema change capabilities provide flexible support for changing business needs in transportation scenarios and avoid system interruptions caused by schema adjustments.

3. Cloud-native compatibility and elastic scaling

   a. MatrixOne is deeply compatible with Kubernetes. Through container orchestration, it achieves seamless integration between the data layer and infrastructure layer. Dynamic scheduling and elastic scaling capabilities effectively optimize resource utilization and reduce hardware costs.

   b. It simplifies database deployment and management processes, improving the scalability and operations efficiency of intelligent transportation systems.

4. Architecture optimization and component integration

   a. Component simplification: The original five independent data components were integrated into MatrixOne, reducing the number of components by 80% and greatly lowering architectural complexity.

   b. Consistency management: Distributed transactions and data consistency support ensure the stability of the transportation big data platform in multi-node, high-concurrency scenarios.

#### Client Benefits

- Through the transformation of the transportation big data platform based on MatrixOne Intelligence, Shenzhen Smart City Group achieved significant technical and management benefits: the number of data components was reduced by 80%, the system architecture became simpler, and management efficiency improved significantly.

- Real-time business support was achieved, processing TB-level data per hour, with second-level response times meeting the needs of intelligent transportation scenarios.

- Operations and maintenance costs were reduced by approximately 50%, and infrastructure resource utilization improved significantly.

- Cloud-native compatibility was enhanced, and system scalability and elastic deployment capabilities increased substantially, providing a strong foundation for future business development.

### Jiangxi Copper

#### Client Background

Jiangxi Copper is a global leading copper producer, and converter operations are one of its core production processes. However, converter operations involve complex industrial processes and generate large volumes of IoT data, such as temperature, pressure, and gas concentration collected by sensors, as well as multimodal data, such as on-site video and equipment operation logs. These data are scattered across different systems and lack unified management and processing capabilities, making it difficult to effectively use data for intelligent decision-making. Jiangxi Copper urgently needed to build an intelligent operations platform that integrates IoT and multimodal data to enable precise monitoring and efficient operational optimization.

#### Solution

By introducing MatrixOne Intelligence, Jiangxi Copper successfully built an end-to-end intelligent operations platform covering data ingestion, parsing, analysis, and intelligent inference, providing strong support for the intelligent transformation of converter production.

1. Data ingestion and integration: With MatrixPipeline, Jiangxi Copper unified real-time data from IoT devices, such as sensor data, and multimodal data, such as converter operation videos, into the platform. Edge computing nodes preprocess high-frequency IoT data, such as compression and cleaning, and upload the processed data together with video stream data to the MatrixOne database, achieving real-time integration of multi-source data.

2. Data parsing and feature extraction: MatrixGenesis's intelligent parsing capabilities are used to extract key features from multimodal data. From IoT data, time-series features such as temperature fluctuation trends and pressure anomaly points are extracted to provide key indicators for production monitoring. From video data, video analysis technology extracts keyframes during converter operations and combines algorithms to identify parameter information on equipment displays, providing data support for operational optimization.

3. Real-time monitoring and modeling analysis: The MatrixOne database provides unified storage and efficient retrieval of multimodal data, supporting real-time monitoring of converter status and anomaly alerts. Based on historical data and real-time features, machine learning models are built to predict converter operating parameters, such as the best switching time, improving production efficiency and reducing energy consumption.

4. Intelligent inference and decision support: Based on RAG technology, historical and real-time data are integrated to provide operators with dynamic decision support, such as recommended operations based on furnace status. Multimodal search helps production teams quickly locate anomalous video clips and related IoT parameters, providing a basis for troubleshooting and optimization strategies.

#### Client Benefits

By building an intelligent operations platform based on MatrixOne Intelligence, Jiangxi Copper achieved significant intelligent upgrades in converter production. The integration efficiency of IoT data and multimodal data improved by 80%, enabling full-process visualization of production data. Through intelligent model optimization, converter operation efficiency increased by 30%, while energy consumption decreased by 15%. Anomaly detection and issue localization time was reduced by 70%, greatly improving the response speed to production issues. Intelligent decision support helped frontline operators significantly reduce operational errors and improve product quality stability.

### KITO

#### Client Background

KITO is an enterprise focused on the research, development, and sales of tile products, with a diverse product portfolio. During the purchasing process, users need to quickly find products that meet their requirements. However, traditional product retrieval methods, such as keyword or model-based search, are unable to meet the need for rapid product selection during communication between sales teams and customers. KITO wanted to build an intelligent image-based search platform that enables sales personnel to accurately find related products by taking photos, uploading images, or entering text, while also querying inventory information, thereby improving customer experience and optimizing sales efficiency.

#### Solution

Based on MatrixOne Intelligence, KITO built an intelligent search platform with MatrixSearch at its core, achieving a complete closed loop from image management to search result retrieval. The platform includes the following capabilities:

1. Data ingestion and integration

   a. MatrixSearch ingests product images and inventory data from the backend management system, and synchronizes and updates data in real time through automatic updates and API interfaces.

   b. Image data is uniformly managed by single-surface type, without model identifiers, ensuring clarity and accuracy in search results.

2. Search index construction and optimization

   a. MatrixSearch uses the EfficientNet model to extract features from uploaded images, generate high-precision image embedding vectors, and build an image retrieval index.

   b. Hybrid retrieval is supported by combining semantic retrieval, or text-to-image search, with vector retrieval, or image-to-image search, improving search accuracy and result relevance.

3. Intelligent search functionality

   a. Users upload images or enter text through a mini program entry point to search for products.

   b. The system calls MatrixSearch's search API to quickly return matching product results, while supporting category filtering and series-based queries to help users quickly find target products.

4. Inventory query and display

   a. After backend filtering and classification of search results, the mini program displays matched product information, including name, specifications, images, and inventory.

   b. Users can directly query product inventory status and further view other products in the same series, optimizing the search experience.

#### Client Benefits

- Through the intelligent search platform based on MatrixSearch, KITO achieved significant improvements in product retrieval and customer experience: search efficiency increased by 90%, enabling sales personnel to quickly find tile products that meet customer needs.

- The systematic inventory query function helps the sales team optimize inventory management and reduce manual operation time.

- Intelligent search based on image features significantly improves user satisfaction in product selection and strengthens brand stickiness.

- The flexible mini program entry point simplifies the user interaction process and provides customers with efficient services anytime, anywhere.

### Suwen TechAgent

#### Client Background

Suwen TechAgent is an enterprise focused on industry-chain public opinion data services. It mainly provides public opinion analysis for leading manufacturing enterprises and government agencies based on multimodal data such as enterprise basic information, research reports, financial reports, patents, and news. However, as business scale grew, TechAgent's original data architecture faced the following challenges:

- The use of multiple data storage and processing tools, such as MySQL, MongoDB, ElasticSearch, Faiss, and ClickHouse, increased architectural complexity and operations difficulty.

- Data collection, storage, and processing had to be completed across multiple systems, resulting in low efficiency and a high level of manual intervention.

- In private deployment scenarios, database deployment and debugging cycles were lengthy, affecting overall delivery efficiency.

TechAgent urgently needed an intelligent data platform that could simplify its data architecture, improve processing efficiency, and support GenAI applications.

#### Solution

Based on MatrixOne Intelligence, TechAgent built an AIGC platform supporting multimodal data storage, intelligent retrieval, and real-time analysis, greatly simplifying the data architecture and improving platform efficiency.

1. Data ingestion and integration

   a. Through MatrixPipeline's automated data pipelines, multimodal data from web crawlers, API interfaces, and file extraction is uniformly ingested into the system.

   b. During ingestion, data is automatically standardized and deduplicated to ensure consistency and efficiency.

   c. Batch processing and dynamic updates are supported for multimodal data sources, such as text, JSON, and images, significantly reducing manual intervention.

2. Intelligent parsing and feature extraction

   a. With MatrixGenesis's intelligent parsing capabilities, semantic features and structured information are extracted from complex data:

   Text data: Pretrained language models generate embedding vectors and semantic tags.

   JSON data: Nested data structures are parsed and key fields are extracted, simplifying subsequent retrieval and analysis.

   Images and documents: OCR and visual models extract content features, enabling cross-modal correlation analysis.

   b. Parsed data is stored in the MatrixOne database, forming a unified knowledge repository that supports subsequent retrieval and inference.

3. Retrieval and search optimization

   a. With MatrixSearch capabilities, TechAgent implements a hybrid model of full-text search and semantic vector retrieval to meet the needs of complex scenarios.

   b. By combining inverted indexes with vector retrieval, it supports hybrid search based on semantics and keywords, improving retrieval precision and relevance.

4. Cloud-native deployment and scaling

   a. MatrixOne implements a fully cloud-native design based on Kubernetes, supporting containerized deployment and dynamic scaling.

   b. It supports workload isolation, allocating dedicated resources to specific tasks to ensure the performance and security of high-priority tasks.

5. Real-time processing and analysis

   a. MatrixOne's HTAP, or Hybrid Transactional and Analytical Processing, architecture supports both OLTP and OLAP workloads without ETL operations between MySQL and ClickHouse, greatly improving real-time analysis efficiency.

   b. When generating reports or performing complex data analysis, data processing time is shortened from hours to minutes.

#### Client Benefits

Through the intelligent platform based on MatrixOne Intelligence, TechAgent achieved significant improvements in data management and business delivery:

- Data ingestion efficiency improved: With MatrixPipeline's automated processes, data ingestion and standardization efficiency increased by 60%.

- Parsing efficiency increased: MatrixGenesis intelligent parsing reduced manual annotation workload and doubled data preprocessing speed.

- Data architecture simplified: The original multi-tool combination was consolidated into a single database system, reducing operations complexity by 80%.

- Data processing efficiency improved significantly: Data processing was shortened from hours to minutes.

- Private deployment cycle shortened: The private deployment cycle was reduced from two months to one week, significantly improving delivery efficiency.

- Precise retrieval and intelligent inference: The unified retrieval platform supports semantic search and fast queries over multimodal data, providing customers with more accurate public opinion analysis and intelligent services.

MatrixOne Intelligence helped TechAgent optimize the full process from data integration to intelligent parsing. It not only solved the problems of complex data architecture and inefficient operations, but also provided a solid technical foundation for GenAI application scenarios, accelerating scaled business expansion and implementation.

## Summary

In the rapid development of GenAI, multimodal data has become a core driver of enterprise intelligent transformation. This whitepaper has discussed the MatrixOne Intelligence multimodal AI data intelligence solution in detail. By integrating and optimizing the full data lifecycle, from data ingestion and governance, preprocessing and parsing, to feature engineering, model training and evaluation, and then recall and search, it builds a comprehensive, unified, and efficient data intelligence platform for enterprises. Through this data-centric design philosophy, MatrixOne Intelligence helps customers fulfill the promise of **"Your Data for Your AI"**, turning enterprises' proprietary data into a solid foundation for GenAI applications and a source of unique competitive advantage. MatrixOne Intelligence looks forward to working with you toward a future where data intelligence and GenAI are deeply integrated.
