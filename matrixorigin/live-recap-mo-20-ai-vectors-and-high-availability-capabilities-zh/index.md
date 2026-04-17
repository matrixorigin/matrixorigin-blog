---
title: 直播回顾 | MatrixOne 2.0 AI 向量与高可用性深度解析
author: MatrixOrigin
mail: lichuanzi@matrixorigin.cn
description: MatrixOne 2.0直播解析AI向量引擎、高可用性及RAG应用，展示多模数据管理与实操案例。
tags:
  - 新闻
keywords:
  - AI
  - 矩阵起源
  - 开源
  - 向量
  - MatrixOne
publishTime: '2024-11-15 18:00:00+08:00'
image:
  '1': /content/zh/shared/hdhg.png
  '235': /content/zh/shared/hdhg.png
date: '2024-11-15 18:00:00+08:00'
lang: zh
status: published
---

11月5日，矩阵起源主办的《 MatrixOne 2.0 AI 向量&高可用能力解析》直播顺利举行，活动吸引了众多观众的关注，并获得了广泛好评。本次直播中，技术团队深入解读了 MatrixOne 2.0 在 AI 向量引擎和高可用性方面的创新升级，并展示了其在快速构建RAG（检索增强生成）应用中的重要应用。以下是直播的精彩回顾～

### 1. 向量引擎：支持生成式AI的核心

MatrixOne 2.0 引入了强大的向量搜索引擎，是为生成式AI和多模态数据应用而设计的基础功能。向量引擎基于高效的近似最近邻（ANN）搜索算法（如IVFFLAT），实现了数十亿级向量数据的高效检索。该引擎支持文本、JSON数据的向量化处理，为用户提供灵活的检索方式——支持通过关键字进行的全文检索和向量相似度查找的混合检索，这对于生成式AI的内容创作和智能问答应用至关重要。

### 2. 高可用性与容灾功能

MatrixOne 2.0 在数据安全和业务连续性上进行了重要增强，包括基于事务日志复制的容灾机制和 CDC（数据变更捕获）。通过事务日志复制，系统实现了异地容灾，用户可通过启动备用集群应对数据中心级别的故障。而 CDC 功能则使得数据实时同步成为可能，特别适合需要数据一致性的场景。

此外，新版本支持快照备份和基于时间点的恢复（PiTR），为用户提供了按需恢复到特定时间点的能力，极大提升了系统的容灾能力，适合需要历史数据回溯和故障恢复的场景。

### 3. 多模数据管理与外部数据接入

MatrixOne 2.0 扩展了对非结构化数据的管理，支持文本、图片、音频等多模态数据的处理，并通过 External Stage 功能和datalink 数据类型实现了从对象存储或本地文件系统直接导入外部数据。这一特性使得系统可以更加灵活地访问和管理各种数据源，为生成式AI应用提供了丰富的数据输入选项。此外，MatrixOne 还支持创建全文索引，允许用户在 JSON 数据等非结构化数据上建立索引，提高了检索的准确性和速度。

### 4. 应用场景与实操DEMO

直播中，技术团队展示了 RAG 应用的实操案例，包括智能问答和多模态内容创作。MatrixOne 2.0 的向量引擎和全文索引功能可以帮助 RAG 应用快速找到与用户问题相关的内容，为生成式 AI 提供上下文信息，使得回答更具针对性和高质量。示例展示了如何利用 Python 脚本配合数据库实现对非结构化文本进行分片和向量化处理，再通过向量搜索实现快速匹配与生成。

[**MatrixOne 2.0.0重磅新特性解读**](https://mp.weixin.qq.com/s/yTD2FpfuxFIJhWXjdNFzPA)

[**基于MatrixOne快速构建大模型应用**](https://mp.weixin.qq.com/s/yTD2FpfuxFIJhWXjdNFzPA)

[**10分钟快速构建大模型Demo演示**](https://mp.weixin.qq.com/s/yTD2FpfuxFIJhWXjdNFzPA)

### 5. 获取PPT

![公众号](/content/zh/live-recap-mo-20-ai-vectors-and-high-availability-capabilities/wc.png?width=400)

关注本公众号，后台回复关键词「 1105 」 ，即可获取「 MatrixOne v2.0.0 新特性」及「基于 MatrixOne v2.0.0 数据库快速构建大模型应用」 PDF版PPT！
