---
title: "Live Replay and Courseware Download | Let AI Truly Understand Business: Building a Multimodal RAG Knowledge Platform"
author: MatrixOrigin
description: MatrixOrigin VP of R&D Zhao Chenyang shared ideas for building a multimodal RAG knowledge platform, covering knowledge extraction, multimodal fusion, and implementation paths for intelligent platforms.
tags:
  - News
keywords:
  - multimodal
  - RAG
  - knowledge platform
  - MatrixOne
  - live recap
publishTime: '2025-08-07 17:30:00+08:00'
image:
  '1': ./images/hdhg.png
  '235': ./images/hdhg.png
date: '2025-08-07 17:30:00+08:00'
lang: en
status: published
translations:
  zh: review-live-broadcast-zh
---

#### Live Session Introduction

Last Friday, MatrixOrigin VP of R&D Zhao Chenyang shared insights around the topic of "multimodal RAG knowledge platforms." Drawing on practices from e-commerce and big data platforms, he analyzed in depth how multi-source data, from text and images to structured forms, can be transformed into usable knowledge.

The session covered knowledge extraction, multimodal fusion, and implementation paths for intelligent platforms, and used real cases to show how such platforms can effectively support business decisions and promote intelligent upgrades of enterprise knowledge systems.

#### Friends Who Missed the Live Session Can Watch the Video Through the Link Below (Scan with WeChat on Mobile for One-Click Access)

https://weixin.qq.com/sph/Ap3sSyVc7

Follow the MatrixOrigin WeChat official account and reply with the keyword "multimodal knowledge platform" in the background to receive the full PPT for free.

#### Appendix: Technical Highlights Recap and In-Depth Answers to Hot Questions

**Question 1: This is called an enterprise-grade knowledge system. How can one knowledge platform solve all scenarios in an enterprise? The four types of scenarios have different requirements, especially L3 and L4, where each domain and each scenario has very strong document customization requirements.**  
Answer: We mainly solve problems in specific professional scenarios by introducing small-model technology. The goal is to provide a closed-loop solution, especially for enterprises using small and medium-sized models. We will deploy very small specialized models to handle challenges in specific scenarios. The future direction is to build an Agent system to reduce human input and let people play more of a supervision and feedback role, guiding the system to continuously mine data value. The system provides information, and humans provide feedback, such as whether the information is correct and usable. Through feedback, the intelligent system is continuously optimized. This involves the company's core capabilities. Although implementation is not easy, the goal is achievable. The expected optimization cycle is 4 to 6 months, after which it will gradually go live on the platform.

**Question 2: Knowledge graphs are expensive. Are they cost-effective for improving Q&A accuracy?**  
Answer: From my perspective, the cost-effectiveness is not high, especially when your scenario has a small amount of data, such as a few hundred documents, and the update frequency is not high. Other methods, such as direct retrieval, can answer sales questions perfectly well. But if the data volume is huge, the process of building a knowledge graph itself is long and costly, and graph retrieval also consumes significant resources. In addition, if massive data is continuously updated, maintaining knowledge graph quality becomes even less worthwhile. There are better alternatives.

**Question 3: Does multimodal processing extract text, or does it directly vectorize video?**  
Answer: Our purpose is to deepen video content, such as medical videos, into text. From the model perspective, vectorization happens in the feature-extraction stage before the model generates content. For example, retrieving images essentially means vectorizing image content within the system. Ideally, we hope all modalities, including text, images, and video, can be processed in the same vector space.

**Question 4: How should traditional PDF processing be combined with small models and multimodal large models? Which approach is recommended for better results?**  
Answer: Traditional PDFs are divided into scanned documents and structured documents. Structured PDF processing technology is relatively mature, but the challenge lies in handling scanned documents and complex layouts such as tables. Traditional rule-based methods involve many projects, complex interfaces, and poor results. Therefore, we recommend a collaborative approach: combining OCR recognition technology, layout analysis models (small models), and large models to comprehensively understand document content. A single traditional model has limited capability and low ROI. For example, even investing 300-400 million yuan may not produce good results, while a combined approach can converge faster in content understanding.

**Question 6: Have you tried using Deep Research in RAG? What practical experience can you share?**  
Answer: The idea of Deep Research is to continuously deepen understanding of the question. This is similar to some scenarios where the system first deeply understands the question, explores its potential directions and related sub-questions, then performs more precise retrieval based on those directions and integrates the retrieval results. The overall idea is progressive and exploratory, deepening layer by layer.

**Question 7: Do documents in the knowledge base need tags, or can they be searched as long as they are stored in chunks?**  
Answer: The core requirement is that documents need to be split into chunks. Tags are not mandatory. The key is to split documents finely enough into very small pieces. During retrieval, we mainly rely on the vector representations of document content and the chunks after splitting. Tags, if present, are more for management and specific scenarios such as topic-based retrieval. The basic search capability mainly relies on chunked storage and vector retrieval.

**Question 8: How should tags be created? What should tag content mainly include?**  
Answer: Tagging can be simple or complex depending on the purpose. The way tags are constructed, their organization, and the scenario are closely related. The ultimate goal is to allow documents or their content chunks to be effectively associated and recalled through tags, thereby improving retrieval relevance. On this basis, a reranking model can be used to filter and improve results. Tag content usually focuses on topics, entities, key concepts, or custom categories, with the purpose of building effective associations.

**Question 9: Would objects in images, such as avatars, be stored directly in the knowledge graph, or does the knowledge graph only store text entities?**  
Answer: At present, knowledge graphs mainly store text entities. Directly storing objects from images, such as avatars or clothing colors, into a graph is very complex and costly, especially when the number of objects is huge, such as tens of thousands of people. The more practical approach today is to generate textual descriptions of image content during image processing, such as structured descriptions, and then store those descriptions as entities or attributes in the knowledge graph while establishing relationships among them.

**Question 10: How should RAG be applied to video-modal data?**  
Answer: The core challenge is how to accurately extract relevant segments from long videos, such as 10-20 minute videos, during Q&A. A currently feasible and conservative approach is:

- Rely on the video's own metadata, subtitles, and descriptions: If structured descriptions, subtitles, or pre-generated tags are available, these text elements can be directly used for RAG retrieval.
- Key-frame extraction + image analysis: Use mature algorithms to extract key frames, then perform image analysis on the key frames, such as object detection and scene recognition, generate descriptive text, and then perform RAG based on that text.
