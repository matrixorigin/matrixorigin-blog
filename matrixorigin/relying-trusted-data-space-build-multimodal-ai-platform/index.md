---
title: "Preview the Ultra Cross Connects Suzhou Headquarters Node Launch: Building a Multimodal AI-Native Data Intelligence Platform Based on Trusted Data Space"
author: MatrixOrigin
mail: lichuanzi@matrixorigin.cn
description: >-
  On October 24, the Ultra Cross Connects Suzhou Headquarters Node Launch will be held in Suzhou, hosted by the Zhongguancun Ultra Cross Connects New Infrastructure Industry Innovation Alliance and the Digital Currency Research Institute, and organized by VNET. This article previews MatrixOrigin and introduces the cooperation between VNET and Ultra Cross Connects on a multimodal AI data intelligence platform and an intelligent computing platform.
tags:
  - News
keywords:
  - MatrixOne
  - database
  - Neolink
  - VNET
  - IDC
publishTime: '2024-10-24 17:00:00+08:00'
image:
  '1': ./images/news.png
  '235': ./images/news.png
date: '2024-10-24 17:00:00+08:00'
lang: en
status: published
translations:
  zh: relying-trusted-data-space-build-multimodal-ai-platform-zh
---

The digital world is accelerating toward an AI-native world. However, facing future million-fold growth in compute demand and data scale, existing internet infrastructure is under severe pressure. Data and compute, the two core driving factors of AI, are both undergoing profound changes. Traditional data platforms must shift from structured processing to multimodal processing in the AI era, and the deep integration of data technology and AI technology is the key. At the same time, AI-oriented compute infrastructure must shift from a scaling-up architecture to a scaling-out architecture. A new generation of intelligent computing networks plays a crucial role in this transformation.

On October 24, a day that belongs to programmers, the "Ultra Cross Connects Suzhou Headquarters Node Launch," jointly hosted by the Zhongguancun Ultra Cross Connects New Infrastructure Industry Innovation Alliance and the Digital Currency Research Institute, and organized by VNET, will be held in Suzhou. This article gives you an early look at MatrixOrigin and the close cooperation between VNET and Ultra Cross Connects on multimodal AI data intelligence platforms and ultra-connected intelligent computing platforms.

### Strong Demand for Multimodal Data Processing in the Large AI Model Era

Multimodal data refers to heterogeneous data of various types and formats, including what the industry commonly calls structured data, semi-structured data, and unstructured data.

According to IDC forecasts, by 2025 the global data volume will reach 175 ZB, most of which will be unstructured data. Traditionally, because structured data has relatively higher value density, mainstream data processing technologies have mainly focused on structured data. Unstructured data, limited by high processing costs and technical barriers and lower value density, often forms data swamps inside enterprises. Users either cannot access the data, or cannot obtain value from it. The emergence of large AI models has completely changed this situation. Almost all enterprises have seen the strong capabilities of large models in understanding and generating knowledge. Large AI models are trained from massive amounts of text, images, audio, video, and other multimodal data. This usage paradigm has raised enterprise attention to multimodal data to an unprecedented level.

However, multimodal data processing is not easy. Large amounts of multimodal data generated inside enterprises are fragmented, lack effective management solutions and governance capabilities, and grow in a chaotic state. Users cannot access, perceive, or search this data, let alone deeply determine its value and application methods. The result is that enterprises find it difficult to truly implement large AI models in real business.

### MatrixOrigin Multimodal Data Intelligence Platform Solution

To address the challenges of multimodal data processing, MatrixOrigin has launched a complete end-to-end multimodal AI data intelligence solution. It helps enterprises uniformly manage, parse, govern, query, and search heterogeneous multimodal data in one stop, enabling users to turn multimodal data swamps into data forests with real value.

![Architecture diagram](./images/chl.png?width=800)

### The Platform Consists of Four Important Modules

1. MatrixDC is a high-performance heterogeneous compute-network scheduling platform. It manages underlying GPU compute resources, network resources, and storage resources, while providing container services based on Kubernetes. As the overall IaaS foundation, this module provides elastic and high-speed infrastructure services for the data layer and AI layer.

2. MatrixOne is a hyper-converged data management platform responsible for overall data access, parsing, storage, and metadata management. Based on a cloud-native compute-storage separation architecture, it can access structured relational data, log data, JSON data, document data, images, audio, and video data, and call AI algorithms for parsing. It can also integrate OLTP, OLAP, time-series, vector, search, and other data workloads, realizing hyper-converged integration for multimodal AI data processing.

3. MatrixGenesis is an AI model foundation and Agent development platform. It hosts and tunes AI models of various sizes, serving tasks such as multimodal data parsing, text semantic understanding, and content generation in multimodal data pipelines. It can also build knowledge bases and RAG/Agent applications based on MatrixOne capabilities.

4. MatrixSearch is a unified search engine for multimodal data. It integrates semantic search, keyword search, and structured search, and further uses large model capabilities for search reranking to return the most accurate search answers to users.

This solution has already been widely implemented in media, e-commerce, manufacturing, retail, and other fields, helping dozens of medium and large enterprises manage, search, and extract value from multimodal data.

### IT Infrastructure Defects That Are Hard to Avoid

During the practical delivery of multimodal AI-native data intelligence platforms, we found that IT infrastructure bottlenecks in real enterprise scenarios greatly limit the release of data value. The most important issue is the lack of a high-speed and efficient trusted data space to connect public data and private-domain data, as well as data across different enterprise locations and applications.

1. Multimodal data naturally has fragmented and heterogeneous characteristics. Because enterprise business systems and IT facilities are heterogeneous, multimodal data is naturally generated from different data sources. Enterprises that want to build a unified data platform often need to perform large amounts of data migration.

2. Parsing and applying multimodal data requires many AI models, both large and small, which requires certain GPU compute resources. In some vertical domains, model training and fine-tuning also consume more GPU resources. Most enterprises do not have the necessary compute resources or investment capacity.

3. For multimodal data such as documents, images, audio, and video, enterprises often restrict access to private domains because they have not built complete awareness of the content. However, many applications actually require interconnection between public data and private-domain data, or even data exchange between private domains across upstream and downstream industries.

Fundamentally, enterprise data application needs, data security and privacy protection, compute resource supply, and IT investment capacity are in significant conflict under current IT infrastructure conditions. This conflict will intensify in the foreseeable future as AI applications are implemented at scale. It is difficult for enterprises to process private-domain data in a secure, reliable, and efficient way while also performing joint computation with public data and other private-domain data.

### VNET's Trusted Data Space Solution

Based on VNET's exploration and practice, the key to large-scale AI implementation is building an "Ultra Cross Connects AI-native computing architecture." The IT architecture for multimodal AI data processing and large-model AI implementation needs to be designed in a distributed cloud-edge-device form. Traditional hierarchical interconnection within data centers, metropolitan areas, and wide areas cannot achieve cross-regional, low-latency, high-bandwidth, secure, and trusted network architecture. As a result, processing ultra-massive data can basically only remain inside data centers. In a new generation of multimodal data processing architecture, we need to redesign a completely new trusted network architecture to connect heterogeneous, geographically distributed, and differently owned compute, data, and models. This architecture will change the past compute-centric model of aggregating data, reconstructing it into a data-centric model connected across regions through a point-to-point trusted network, forming a complete secure, reliable, and high-speed trusted data space.

Facing this challenge, VNET and Suzhou Mobile launched the Ultra Cross Connects distributed compute-network brain in Suzhou, building the world's first AI-native metropolitan intelligent computing network and achieving three firsts in AI-native infrastructure.

1. First, it creates the first AI-native Ultra Cross Connects (UCC) city computing bus architecture. An all-optical network delivers 100G directly to office desktops, 40G directly to AI-native homes, and smartphones under 5G slicing mode.

2. Second, it creates the first simultaneous access of three AIDC forms, Hub, Spoke, and Edge, to the UCC city computing bus within the same city.

3. Third, it creates the first dual-network architecture design of "IP" plus "address." Unlike the traditional internet addressing model based on domain names (DNS) and IP, the underlying network protocol introduces blockchain technology. Each ultra-connected terminal has its own independent public and private key address to achieve addressing and terminal verification. This realizes a new generation of security-native architecture in which all connections within the UCC city computing bus are trusted, manageable, and controllable, providing a next-generation digital infrastructure different from traditional internet B2B, B2C, and C2C.

In data protection and application, based on asymmetric key encryption and UCC, VNET proposes for the first time a non-App-layer enterprise training data and model file storage application protected by distributed keys. Each data slice record is encrypted with the owner's public key, and data content is stored on various forms of AIDC connected to the UCC city computing bus. Therefore, users can retrieve data and model file slices at any time, decrypt them with private keys, display them, and manage enterprise training and inference data. Combined with the ubiquitous computing capability of the city distributed compute platform, this starts large model API services and builds AI-native infrastructure with full-process privacy protection, out-of-the-box usability, and integrated storage and compute.

In model service and usage, the ultra-high-speed network enhanced by RDMA and RoCE, together with the data intelligence management and distribution system, will help large model enterprises fully use compute resources on the city bus for model fine-tuning and even training. It can also establish a secure, trusted, and efficient dedicated network for model distribution and enterprise private data or user privacy data between model training factories (Hub AIDC) and model users (Edge AIDC).

Under this new-generation Ultra Cross Connects intelligent computing network architecture, regional and distance limitations will be completely broken on the cloud side, edge side, and device side. A point-to-point east-west interconnection architecture, network bandwidth hundreds of times higher, and a new generation of software-defined full-process data encryption and privacy protection technologies will create a new network information space, CyberNext, and a truly practical trusted data space, helping all industries fully release data value and embrace the AI-native world.
