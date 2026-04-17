---
title: >-
  Jiangxi Copper Group | MatrixOne Empowers the Development of an AIoT Smart
  Operations System
author: MatrixOrigin
description: >-
  Jiangxi Copper Group adopts MatrixOne to build an AIoT smart operations system
  for flash smelting, shortening implementation cycle by 60% and reducing copper
  accumulation at furnace bottom by 80%.
tags:
  - usecase
keywords:
  - MatrixOne
  - AIoT
  - Smart Manufacturing
  - Copper Smelting
publishTime: '2025-01-09T17:00:00+08:00'
image:
  '1': /content/zh/shared/case.png
  '235': /content/zh/shared/case.png
annotation: 制造业数据平台 - 江西铜业 AIoT 系统
date: '2025-01-09T17:00:00+08:00'
lang: en
status: published
---

## Jiangxi Copper Group | MatrixOne Empowers the Development of an AIoT Smart Operations System

### Client's Introduction

Jiangxi Copper Group Co., Ltd. is a Fortune Global 500 company and one of China's largest copper producers. Founded in 1979, the company is headquartered in Nanchang, Jiangxi Province.

The company focuses on the mining, smelting, and processing of copper and related products, with business operations spanning mineral resource development, smelting and processing, product manufacturing, and international trade. Leveraging advanced technologies and equipment, Jiangxi Copper is committed to supplying high-quality copper products to the global market. The company possesses strong R&D capabilities and a complete industrial value chain, ensuring its leading position within the industry. Through continuous innovation and optimization, Jiangxi Copper has maintained outstanding competitiveness and a strong reputation in the global copper market.

Among its subsidiaries, the Guixi Smelter is China's largest modern copper smelting facility and the country's first flash copper smelting plant. Its production scale has reached a world-leading level, and its production costs rank among the lowest globally.

### Business Background

**Business Objective: Reducing Copper Content in Slag**

For the Guixi Smelter, the core production process is **flash smelting**, and the key piece of equipment is the **flash furnace**. In flash smelting, finely ground copper concentrate that has been deeply dehydrated (moisture content below 0.3%) is mixed with air or oxygen in a burner nozzle and injected at high velocity (60–70 m/s) from the top of the reaction shaft into a high-temperature reaction tower.

The concentrate particles are surrounded by gas and remain in a suspended state. Within just 2–3 seconds, the processes of sulfide decomposition, oxidation, and melting are essentially completed. The molten mixture of sulfides and oxides then falls to the settler at the bottom of the reaction tower, where it accumulates and continues to undergo separation, ultimately forming **matte** and **slag**. Matte is the desired intermediate product, while slag is a by-product.

The slag layer, mainly composed of oxides such as Fe and Si, usually contains a relatively high copper content, making it unsuitable for direct disposal after a single smelting step. Therefore, how to effectively reduce the copper content in slag has become a key challenge that all smelters strive to address.

**Matte level control** is currently one of the most effective means of controlling both copper losses in slag and slag entrainment in matte. Accurately sensing and controlling the heights of the slag layer and the matte bath, and using these data to reasonably manage the tapping operations for matte and slag, are crucial to reducing copper losses in the flash furnace.

To achieve rational operational control, it is necessary to properly schedule slag tapping and matte tapping operations, including timing and discharge locations. Only in this way can the matte grade be effectively controlled while better coordinating with the subsequent converter blowing process.

![1.png](/content/zh/mo-helps-copper-build-aiot-bigdata-system/sj.png?width=800)

**● Significant Limitations of Traditional Manual Operations**

The measurement method commonly used in the industry at present relies on measuring rods. This method fully utilizes the characteristic that the liquid level in the slag-tap settling zone inside the furnace is relatively stable, as well as the different adhesion properties between matte, slag, and the measuring rod, thereby enabling a relatively accurate measurement of the matte liquid level. The discharge of slag and matte is commonly carried out by manually calculating and arranging the discharge outlets and discharge timing based on the measured data. However, this traditional manual operation method has many limitations.

**● AIoT-Based Intelligent New Solution**

With the continuous development of digitalization, informatization, and automatic control technologies, this project realizes liquid-level control and automated operation in flash smelting through IoT data collection, data analysis, and AI-based decision-making. This is of great significance for achieving workshop-level digitalization and efficiency improvement, and it also complies with the standards of intelligent factories under the broader environment of digitalized production.

### Challenge

This project is a very typical AIoT application scenario. In terms of data processing, it needs to simultaneously address challenges related to OLTP, OLAP, time-series data, and AI.

**Challenge 1**

The system needs to support overall business management and control, including the management of data acquisition equipment systems, control equipment management, and operation process management. From a data-processing perspective, this belongs to fundamental OLTP requirements. At the same time, due to the real-time requirements of the operation system, the system must achieve response times of less than one second for business interactions across all stages.

**Challenge 2**

In the data acquisition solution, on the one hand, the system needs to collect real-time data such as liquid level and temperature for intelligent operations through various sensors and cameras. On the other hand, it also needs to obtain relevant data from other process systems such as converting operations. In addition, it must integrate a large amount of historical operational data, including slag discharge records, matte tapping records, and operation cycle data. From a data-processing perspective, this represents a typical multimodal data acquisition scenario, which includes structured data collected from sensors and obtained from other systems via ETL tools, as well as unstructured data captured by cameras. Among these, high-frequency time-series data can reach up to 250,000 records per second.

**Challenge 3**

In terms of data application, based on the various types of collected data, it is necessary to establish big data–driven mathematical computation and analysis models for the flash smelting furnace. Through these models, the collected data can be calculated and analyzed to provide data support and guidance for furnace condition assessment, matte tapping, and slag discharge operations. The system can automatically generate front-of-furnace operation plans and recommendations, thereby improving the accuracy and efficiency of flash furnace operations. This essentially represents a typical OLAP data analysis requirement. In addition, the parts involving camera data also require algorithmic processing using AI computer vision models.

Finally, as this system is a smart operation system closely related to flash smelting production, it must operate continuously and stably over the long term. Therefore, system stability is particularly critical. The system must be able to provide reliable services continuously, 24 hours a day, 7 days a week, even under high-load conditions.

Faced with such data-processing requirements, the traditional approach is to divide and conquer, with each module using a separate database component. The OLTP part typically uses a relational database such as MySQL; the IoT data acquisition part uses a time-series database such as InfluxDB; the OLAP data analysis part uses a data warehouse such as Greenplum; and for image-based unstructured data, an additional object storage system and AI algorithm system must be built. However, this construction approach places extremely high demands on IT personnel and makes it difficult to meet overall real-time requirements. Moreover, the ETL processes built between these database components face tremendous maintenance pressure. Even for a smelting giant like Jiangxi Copper, it is difficult to possess sufficient IT capabilities to effectively manage such a complex architectural system.

![2.png](/content/zh/mo-helps-copper-build-aiot-bigdata-system/jg.png?width=800)

### Solution

Matrix Origin's MatrixOne is a hyper-converged database that features several key capabilities, enabling the construction of a unified and efficient data foundation for this project conveniently.

**● Step 1**

MatrixOne is a hyper-converged database that provides comprehensive support for OLTP, OLAP, and time-series workloads. It can meet the real-time, consistency, and stability requirements of business process systems, support high-frequency writes for time-series data, and deliver real-time analytical capabilities for metric computation—all within a single solution. At the same time, MatrixOne is built on a single storage engine and a unified data modeling approach, eliminating the need for users to manage multiple ETL pipelines for data migration.

**● Step 2**

MatrixOne adopts a cloud-native architecture with separation of storage and compute. Its storage layer is based on shared storage protocols such as NFS and S3, which inherently enables unified storage and management of unstructured data. In this project, camera data can be directly handled and stored by the database storage layer.

**● Step 3**

MatrixOne provides a complete user-defined function (UDF) mechanism, allowing AI models implemented in code to be encapsulated as UDFs and packaged directly into the database, it avoids the need to manage and maintain AI algorithms separately.

**● Step 4**

In terms of development and usage, MatrixOne is highly compatible with MySQL. Whether it is SQL syntax, communication protocols, middleware for commonly used programming languages, or even mainstream database development and visualization tools are fully consistent with MySQL. As a result, even entry-level developers can work with it effortlessly.

![3.png](/content/zh/mo-helps-copper-build-aiot-bigdata-system/gxjg.png?width=800)

As shown in the figure, supported by these overall capabilities, the architecture of the entire data layer is greatly simplified. All data processing tasks are handled by a single database component, fully freeing application developers' time so they no longer need to devote significant effort to heavy underlying data movement and integration work.

After reviewing this new architectural design, the IT implementation leader of Jiangxi Copper Group commented:

"Jiangxi Copper has fully entered the stage of digital empowerment and smart factory construction. This flash smelting furnace front-end operation project is an nice try for us. However, when we were applying AI and big data technologies, we encountered many challenges. At the beginning we designed the architecture using open-source, point-based technologies, but later we found that the architecture was too heavy and difficult to implement. Our core task should still be to invest more time in solving business-related problems. A simplified architecture like MatrixOne is the most ideal solution for us, allowing our engineers to focus more on the business layer."

### Client's Benefits

With the support of a MatrixOne-based data architecture, Jiangxi Copper Group shortened the overall project implementation cycle by approximately 60% compared to expectations. The actual construction of the data architecture took only about one week. Meanwhile, the end-to-end response time—from data collection to data computation to the output of operational control strategies—was kept within 5 seconds.

From a production perspective, this system enhanced control over copper slag output from the flash smelting furnace, reducing overall copper accumulation at the furnace bottom by 80%. It also effectively improved liquid level control accuracy, essentially achieving automation and intelligence in furnace-front operations.

For Jiangxi Copper's industry, this project represents a completely new type of exploration. It replaces manual operations through large-scale data collection via IoT, combined with data analysis and AI-driven decision-making, while leveraging an advanced data solution like MatrixOne without falling into the complexity trap of heavy IT technologies. Such intelligent solutions have already begun to be promoted and deployed across various smelting processes within Jiangxi Copper Group, and MatrixOne will continue to support the construction of a powerful AIoT data foundation.
