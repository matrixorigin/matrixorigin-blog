---
title: >-
  A Large Tile Manufacturing Enterprise | MatrixOne Intelligence Empowering the
  Construction of an Intelligent Tile Image Search Platform
author: MatrixOrigin
description: >-
  A tile manufacturing enterprise adopts MatrixOne Intelligence to build TaoXin,
  an intelligent image-based search platform enabling sales personnel to quickly
  locate products through photos, images, or text.
tags:
  - usecase
keywords:
  - MatrixOne Intelligence
  - Image Search
  - Tile Industry
  - Vector Retrieval
publishTime: '2025-01-09T17:00:00+08:00'
image:
  '1': /content/zh/shared/case.png
  '235': /content/zh/shared/case.png
  annotation: 制造业数据平台 - 金意陶图像搜索
date: '2025-01-09T17:00:00+08:00'
lang: en
status: published
---

## A Large Tile Manufacturing Enterprise | MatrixOne Intelligence Empowering the Construction of an Intelligent Tile Image Search Platform

### Client Background

The client is an enterprise focused on R&D and sales of tile products, offering a diverse product portfolio. During the purchasing process, users need to quickly identify products that meet their requirements. However, traditional product retrieval methods (such as keyword or model-based searches) are unable to meet the need for rapid product selection during sales and customer communications. Therefore, the client aims to build an intelligent image-based search platform that enables sales personnel to accurately find relevant products by taking photos, uploading images, or entering text, while simultaneously checking inventory information, thereby enhancing customer experience and optimizing sales efficiency.

### Solution Objectives

With the support of a mobile application, salesperson can quickly locate and obtain relevant tile information, improving work efficiency.

1. Efficient information retrieval: Through intelligent search capabilities, salesperson can rapidly access detailed tile information, ensuring both speed and accuracy in information acquisition.

2. Significant performance improvement: Benefiting from convenient operations and rich information, salesperson achieve higher conversion rates and customer satisfaction, which in turn drives overall performance growth.

![1.png](/content/zh/tile-image-search-matrixone/1.png)

### Solution

Based on MatrixOne Intelligence, an intelligent search platform named TaoXin, with MatrixSearch at its core, was built to deliver a complete closed loop from image management to search result retrieval. The solution includes the following capabilities:

**1. Data Ingestion and Integration**

a. MatrixSearch ingests product images and inventory data from the backend management system, enabling data synchronization and real-time updates through automated updates and API interfaces.

b. Image data is uniformly managed by single-surface type, without model identifiers, ensuring clarity and accuracy of search results.

**2. Search Index Construction and Optimization**

a. MatrixSearch leverages the EfficientNet model to extract features from uploaded images, generating high-precision image embedding vectors and building an image retrieval index.

b. Hybrid retrieval is supported by combining semantic retrieval (text-to-image search) with vector retrieval (image-to-image search), improving search accuracy and result relevance.

**3. Intelligent Search Functionality**

a. Users can upload images or enter text via a mini program entry to search for products.

b. The system calls MatrixSearch's search API to quickly return matching product results, while also supporting category-based filtering and series-based queries to help users rapidly locate target products.

**4. Inventory Query and Display**

a. After backend filtering and categorization of search results, the mini program displays matched product information, including name, specifications, images, and inventory levels.

b. Users can directly check product inventory status and further explore other products within the same series, optimizing the overall search experience.
