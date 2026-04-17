---
title: >-
  Shenzhen ETAO Innovation | MatrixOne Empowers ETAO Innovation to Build a
  High-Performance Intelligent Manufacturing AIoT System
author: MatrixOrigin
description: >-
  ETAO Innovation adopts MatrixOne to replace MySQL, InfluxDB, and MongoDB,
  achieving a unified MES system architecture that significantly improves
  development efficiency and data processing performance.
tags:
  - usecase
keywords:
  - MatrixOne
  - MES System
  - Intelligent Manufacturing
  - Electronics Manufacturing
publishTime: '2025-01-09T17:00:00+08:00'
image:
  '1': /content/zh/shared/case.png
  '235': /content/zh/shared/case.png
annotation: 制造业数据平台 - 一道创新 MES 系统
date: '2025-01-09T17:00:00+08:00'
lang: en
status: published
---

## Shenzhen ETAO Innovation | MatrixOne Empowers ETAO Innovation to Build a High-Performance Intelligent Manufacturing AIoT System

### Client's Introduction

ETAO Innovation was founded in 2012. It is an innovative software and information technology service provider dedicated to digital transformation services for segmented manufacturing industries—particularly the electronics manufacturing industry—and to building intelligent engineering systems with ubiquitous connectivity. ETAO Innovation is committed to integrating advanced software systems, digital platforms, and artificial intelligence into smart factories, making pervasive connectivity the foundation of intelligent manufacturing.

ETAO Innovation has already served hundreds of digital factories in the electronics manufacturing sector and has connected more than 15,000 IoT access points.

### Challenges

ETAO Innovation has independently developed an intelligent manufacturing MES software system. MES is a production information management system oriented toward the manufacturing execution layer. ETAO's MES provides factories with modules such as data management, production planning and scheduling, production dispatching, inventory management, supply chain management, equipment management, and quality management, building a comprehensive and reliable manufacturing collaboration management platform for factories.

![1.png](/content/zh/mo-helps-build-AIOT-system/yd2.png?width=800)

This system has been successfully delivered to hundreds of customers. However, in the context of intelligent manufacturing and digital transformation, customer requirements have continued to rise, and ETAO's software system is now facing several new challenges:

**1. Massive IoT data volumes**

In addition to providing the MES software system, ETAO also delivers a complete solution for production equipment data acquisition and integration. This includes directly reading data from device PLCs, connecting external edge data acquisition devices, or obtaining data from control console hosts. These data are simultaneously ingested into the MES system as the foundation for various intelligent manufacturing production line analyses. As data-driven awareness in the manufacturing industry continues to strengthen, customers increasingly require MES vendors to store and fully utilize all collected data.

The high-frequency data collected from production equipment places tremendous pressure on the data processing system of the MES software. In a typical electronics manufacturing factory with dozens of production lines, after MES and data acquisition systems go live, TB-level data can accumulate within just one month. To meet the requirements of high-frequency data collection and application, ETAO introduced InfluxDB, a time-series database, on top of MySQL for data ingestion.

**2. Insufficient system performance**

In addition to being stored, production line data also involves extensive computational requirements in business scenarios such as report analysis, product traceability, and more advanced predictive maintenance and process optimization. In particular, traceability queries spanning several months or even years can no longer be adequately supported by MySQL alone.

To address this, ETAO's engineers had to implement pre-computation at the application layer. This pre-computation generates large amounts of semi-structured JSON data, which are then stored in MongoDB and provided for business analysis. This optimization alleviated the problem to some extent. However, as customer production line data continued to grow, this architecture gradually failed to meet performance requirements. Moreover, MongoDB does not support SQL-based multidimensional analysis, so all pre-computation logic must be implemented at the application layer, resulting in heavy computational load and high engineering costs on the application side.

**3. Slowed development efficiency**

Because data are distributed across three databases—MySQL, InfluxDB, and MongoDB—the data for management modules such as personnel, materials, processes, and equipment reside in MySQL; equipment acquisition data are stored in InfluxDB; and intermediate computation results are stored in MongoDB. When ultimately serving business applications, this leads to extensive cross-database data computation and interaction, resulting in highly complex business logic.

Many capabilities that should ideally be handled by the database are instead pushed to the application layer. Meanwhile, MES systems often require a certain degree of customization across different project deliveries, which further slows down product iteration efficiency.

### Solutions

After learning about the product philosophy of MatrixOrigin's MatrixOne, ETAO's R&D lead quickly realized that MatrixOne's support for mixed workloads could effectively address the current challenges. If there were a single database that could both satisfy the CRUD requirements of management information systems, support high-frequency data ingestion, enable complex queries, and still use standard SQL, then ETAO's existing MES system architecture could be greatly simplified. A large portion of data processing work could be shifted to the database layer, allowing ETAO's developers to focus on application-level development, and many features that previously could not be delivered to customers in time could be brought online much faster.

The technical architecture after project implementation is shown in the figure below:

![2.png](/content/zh/mo-helps-build-AIOT-system/yd3.png?width=800)

It can be clearly seen that a single MatrixOne cluster is capable of handling both structured and semi-structured data. At the same time, it eliminates the original ETL tasks between systems, removes the need to maintain multiple types of database systems, and unifies the access interface between the database and applications. As a result, the entire MES application returns to a minimalist architecture based on a single database.

Meanwhile, throughout the application migration process, MatrixOne maintains a very high level of compatibility with MySQL. ETAO was able to seamlessly migrate MySQL databases and tables directly into MatrixOne using SQL source import, and—following best practices—successfully migrate time-series tables from InfluxDB and document-based data structures from MongoDB into MatrixOne as well. The entire migration process took less than one week.

### Client's Benefits

After adopting MatrixOne, ETAO significantly streamlined its overall data architecture. Chen Ji, CTO of ETAO, commented:

"Now, new developers no longer need to be trained on multiple databases, it is enough to know a bit of MySQL. In the past, many analytical tasks required the application layer to pull data from multiple systems and implement additional logic. Now we can simply write SQL directly in the database, which makes things much simpler, more maintainable, and far more performant. Our efficiency in delivering MES projects has also improved significantly. In addition, we have started exploring areas related to large-model AI. MatrixOne already provides certain AI-related capabilities, which we are currently exploring and experimenting with, saving us from having to introduce additional components such as standalone vector databases."

In fact, across the industrial manufacturing sector, customers are facing very similar challenges. To support mixed data workloads, engineers have traditionally had to manually assemble complex data architectures, inevitably leading to increasing levels of code debt and operational debt. MatrixOne's architecture and capabilities are inherently well suited to such scenarios, and it is expected to play a key role in helping more industrial customers achieve intelligent manufacturing.
