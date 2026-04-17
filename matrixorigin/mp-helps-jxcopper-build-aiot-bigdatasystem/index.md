---
title: >-
  MatrixOne Helps Jiangxi Copper Corporation Limited Build an AIoT Big Data
  System for Smart Operations at the Furnace Front
author: MatrixOrigin
mail: lichuanzi@matrixorigin.io
description: >-
  Jiangxi Copper, a top global copper producer, implemented an AIoT solution at
  its Guixi Smelter to automate copper and slag discharge. Using MatrixOne, this
  project reduced copper in slag by 80%, improved production precision, and
  shortened implementation time by 60%, driving data-driven automation in
  smelting operations.
tags:
  - news
keywords:
  - MatrixOne
  - AIoT
  - OLTP
  - MatrixOrigin
publishTime: '2024-10-18 17:00:00+00:00'
image:
  '1': /content/en/shared/mo-news.webp
  '235': /content/en/shared/mo-news.webp
date: '2024-10-18 17:00:00+00:00'
lang: en
status: published
---

## Client Profile

Jiangxi Copper Corporation Limited is a Fortune Global 500 company and one of China's largest copper producers, founded in 1979 and headquartered in Nanchang, Jiangxi Province. The company focuses on the mining, smelting, and processing of copper and its related products, with operations covering mineral resource development, smelting and processing, product manufacturing, and international trade. Leveraging advanced technology and equipment, Jiangxi Copper is committed to providing high-quality copper products to the global market. With strong research and development capabilities and a complete industrial chain, the company maintains its leading position in the industry. Through continuous innovation and optimization, Jiangxi Copper has sustained excellent competitiveness and reputation in the global copper market.

The Guixi Smelter under its umbrella is the largest modern copper smelter in China and the country's first flash smelting plant. Its production scale has reached a world-leading level, and its production costs are among the lowest globally.

## Business Background

**Business Objective: Reduce Copper Content in Slag**

For the Guixi Smelter, the core production process is called flash smelting, and the core equipment is known as the flash furnace. Flash smelting involves mixing dewatered powdered concentrate (with moisture content less than 0.3%) with air or oxygen in a nozzle, then injecting it at high speed (60-70 m/s) from the top of the reaction tower into a high-temperature environment. The concentrate particles are surrounded by gas, remaining in a suspended state, and within 2-3 seconds, the processes of sulfide decomposition, oxidation, and melting are essentially completed. The molten mixture of sulfides and oxides falls into the settling tank at the bottom of the reaction tower, continuing the formation process of blister copper (the product at this stage) and slag (the waste), followed by settling and separation. The slag layer typically consists of oxides such as Fe and Si, which have high copper content and do not meet the goal of first-time slag disposal. Thus, effectively reducing the copper content in slag is a problem that manufacturers are dedicated to solving.

Controlling the blister copper liquid level is currently an effective means of managing copper content in slag and the slag's copper content. Accurately sensing and controlling the height of the slag layer and blister copper liquid level, as well as reasonably controlling the discharge of blister copper and copper slag based on height data, are crucial methods for controlling copper content in the slag and copper content in the blister copper. To achieve reasonable operational control objectives, it is necessary to schedule the timing and location for slag and copper discharges properly. This will allow for better coordination with the subsequent converter smelting process while effectively controlling the grade of blister copper.

**Limitations of Traditional Manual Operations**

Currently, the common measurement method in the industry relies on measuring gauges to take measurements, fully utilizing the relatively stationary characteristics of the liquid level in the slag discharge area within the furnace. By exploiting the differences in adhesive force between blister copper, slag, and the measuring gauge, it is possible to measure the blister copper liquid level with relative accuracy. The discharge operations for slag and copper are usually arranged based on manual calculations of data, including discharge ports and timing. However, this traditional manual operation method has several limitations.

**AIoT Intelligent New Solution**

With the continuous development of digitalization, informatization, and automated control technologies, this project has implemented a new solution for controlling the liquid level in flash smelting and automating operations through IoT data collection, data analysis, and AI decision-making. This initiative is significant for digitizing workshops and enhancing efficiency, aligning with the standards of intelligent factories in the context of digital production.

## Data Processing Challenges

This project represents a typical AIoT application scenario, requiring simultaneous resolution of OLTP, OLAP, time series, and AI-related issues in data processing.

1. **OLTP Requirements**: The system needs to support overall business management and control, including managing equipment systems, controlling devices, and managing operational processes. This represents a fundamental OLTP requirement for data processing. Additionally, due to the real-time demands of the operational system, the system must respond to business interactions across all segments in less than one second.

2. **Data Collection Scheme**: The system must collect real-time data such as liquid levels and temperatures through various sensors and cameras while also obtaining related data from other processes like blowing and smelting. Furthermore, it needs to integrate a significant amount of historical operational data, including slag discharge records, copper discharge records, and operational cycles. This involves typical multimodal data collection, incorporating both structured data from sensors and other systems through ETL tools, as well as unstructured data collected from cameras. The high-frequency collection of time series data may reach 250,000 entries per second.

3. **Data Application**: Based on the collected data, mathematical computation and analysis models for flash smelting big data need to be established. These models will compute and analyze the collected data, providing support and guidance for assessing furnace conditions, copper discharge, and slag discharge operations. The system will automatically generate operational plans and recommendations for the furnace front, enhancing the precision and efficiency of operations. This represents a typical OLAP data analysis requirement, with parts involving camera data requiring AI vision models for algorithmic processing.

4. **System Stability**: As an intelligent operational system that is integral to flash production, the system needs to work continuously and reliably over the long term. Thus, the stability of the system is particularly critical, ensuring reliable, uninterrupted service 24/7 under high load conditions.

Given the data processing requirements, the traditional approach of dividing and conquering involves using separate database components for each module. The OLTP component may utilize a relational database like MySQL, while the IoT data collection part might employ a time-series database such as InfluxDB. For OLAP data analysis, a data warehouse like Greenplum could be used, and additional object storage systems and AI algorithm systems would be required for storing unstructured image data. However, such a construction approach places high demands on IT personnel and often struggles to meet overall real-time requirements. The ETL processes bridging these database components also face substantial maintenance challenges. Even a smelting giant like Jiangxi Copper may not have sufficient IT capabilities to manage such a complex architectural system.

## Solution

The MatrixOne database, originating from Matrix Origin, is a hyper-converged database that offers several key features, making it easy to establish a unified and efficient data foundation for this project.

1. **Comprehensive Support**: MatrixOne is a hyper-converged database that provides robust support for OLTP, OLAP, and time series data. It meets the requirements for real-time processing, consistency, and stability in business workflow systems. It can also handle the high-frequency write demands of time series data and perform real-time analytical computations, all in one solution. Furthermore, MatrixOne is built on a single storage engine and modeling approach, eliminating the need for users to manage multiple ETL links for data migration.

2. **Cloud-Native Architecture**: MatrixOne features a cloud-native architecture with a storage layer based on NFS/S3 shared storage protocols, inherently enabling unified storage and management of structured and unstructured data. In this project, camera data can be directly managed by the database's storage layer.

3. **User-Defined Functions (UDF)**: MatrixOne offers comprehensive UDF capabilities, allowing AI models implemented in code to be encapsulated as UDFs and packaged within the database. This avoids the need for separate management and maintenance of AI algorithms.

4. **MySQL Compatibility**: In terms of development and usage, MatrixOne is highly compatible with MySQL. Its SQL syntax, communication protocols, middleware for common programming languages, and even popular database development visualization tools are fully consistent. This ensures that even entry-level developers can easily navigate the system.

As illustrated in the diagram, the overall capability support greatly simplifies the architecture of the entire data layer. Data processing tasks are handled entirely by a single database component, freeing application developers from spending excessive time on the burdensome tasks of data transportation and integration. The IT implementation leader at Jiangxi Copper Corporation Limited commented on this new architectural design: “Jiangxi Copper has fully entered the stage of digital empowerment and the construction of smart factories. This flash smelting front operation project is an important attempt for us. However, we encountered many challenges while leveraging AI and big data technologies. Initially, we designed the architecture using open-source point technologies, but later found it too heavy for implementation. Our core task is to invest more time in solving business-related issues. The simplified architecture provided by MatrixOne is ideal for us; our engineers can focus more on the business layer.”

## Client Benefits

With MatrixOne's data architecture support, Jiangxi Copper Corporation Limited shortened the project implementation cycle by about 60% compared to expectations. The actual construction of the data architecture took only about one week, while the overall end-to-end response time—from data collection to data processing to the output of operational control strategies—was under five seconds.

For production, this system enhanced the control of copper slag output in the flash smelting process, reducing the overall copper output from the furnace bottom by 80%, while also effectively controlling the precision of the liquid level, essentially achieving automation and intelligence in front-of-furnace operations.

This project represents a completely new attempt for Jiangxi Copper in the industry, using IoT for extensive data collection and replacing manual operations with data analysis and AI. Additionally, the advanced data solution provided by MatrixOne does not lead to entrapment in the complexities of IT technologies. This intelligent solution has already begun to be promoted and constructed across various segments of Jiangxi Copper's smelting operations, with MatrixOne continuing to support the establishment of a robust AIoT data foundation.
