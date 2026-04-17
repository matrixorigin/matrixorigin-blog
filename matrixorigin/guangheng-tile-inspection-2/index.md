---
title: Guangheng | Expert in Inspecting Complex Industrial Defects with MatrixOne
author: MatrixOrigin
description: >-
  Guangheng adopts MatrixOne Serverless to replace MySQL for tile inspection
  data, achieving order-of-magnitude improvements in IoT data ingestion and
  query performance with automatic scaling.
tags:
  - usecase
keywords:
  - MatrixOne
  - Industrial Inspection
  - IoT Data
  - Serverless Database
publishTime: '2025-01-09T17:00:00+08:00'
image:
  '1': /content/zh/shared/case.png
  '235': /content/zh/shared/case.png
annotation: 制造业数据平台 - 光衡工业质检
date: '2025-01-09T17:00:00+08:00'
lang: en
status: published
---

## Expert in Inspecting Complex Industrial Defects

### Client Overview

Guangheng is committed to serving China's intelligent manufacturing sector by providing industrial enterprises with high-precision, real-time optoelectronic sensing and inspection equipment. It delivers essential foundational hardware to support the comprehensive implementation of industrial digitalization, networking, and intelligent transformation.

The company focuses on the R&D of laser sensing and inspection equipment. With high-precision laser technology at its core, combined with machine vision and artificial intelligence technologies, Guangheng promotes high-precision, real-time laser inspection equipment and systems that can comprehensively replace manual inspection across industrial application scenarios, providing systematic visual inspection solutions for various industrial sectors.

The core team of Guangheng has long been involved in major national scientific research projects, including the Chang'e lunar exploration satellites and the Fengyun-4 meteorological satellite, and possesses world-class technical capabilities and extensive project experience.

### Business Background

In recent years, ceramic enterprises have been under urgent pressure to "reduce costs and improve efficiency," making automated inspection equipment increasingly essential. Guangheng has visited more than 30 representative ceramic enterprises, conducting on-site research and technical exchanges with senior management to capture real-world frontline requirements. In addition, the company organized a 20-member team from the Shanghai Institute of Optics and Fine Mechanics, Chinese Academy of Sciences, and invested tens of millions of RMB in an R&D platform to develop an original technical approach: using laser inspection to detect 3D defects and vision-based inspection to detect 2D defects, enabling effective detection of more than 60 types of defects.

![1.png](/content/zh/guangheng-industrial-defect-matrixone/1.png)

### Business Pain Points

After tile inspection data is processed by the upper-level control software, structured data is generated and written via wireless modules to Alibaba Cloud RDS MySQL. Tens of thousands of records are generated every day, primarily for use by production-line workers through a mini program and backend web applications for defect visualization and related functions. As data volume continues to grow, MySQL performance struggles to respond quickly to query requests. At the same time, as Guangheng increased its number of devices to several dozen this year, MySQL's time-series write performance has also encountered bottlenecks.

### Solution

As a hyper-converged database, MatrixOne addresses the performance challenges of tile inspection data ingestion with its native time-series capabilities. The Serverless instance automatically detects workload pressure and dynamically adjusts computing resources. Currently, more than 70 devices which uploads data are running smoothly, with most write operations completed at the millisecond level. In addition, the original "MySQL sharding + aggregation table" approach was replaced with a "MatrixOne partitioned table" solution, where data is partitioned by date, eliminating the need for table sharding and pre-aggregation.

### Customer Benefits

**Significantly improved IoT data ingestion performance:**

Compared with MySQL, data ingestion performance has improved by an order of magnitude. Thanks to Serverless auto-scaling, write performance remains at a high level even as the number of devices increases.

**Resolution of slow query issues:**

By using MatrixOne instances, the need for table sharding and related operations is reduced, while aggregation query latency is significantly lowered. Most queries are completed within seconds.

**Reduced operations and maintenance costs:**

As device scale grows, MatrixOne Serverless automatically scales resources, eliminating the operational costs associated with manual configuration and capacity adjustments.
