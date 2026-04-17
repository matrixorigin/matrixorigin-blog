---
title: 直击GTC 2026现场，黄仁勋用20分钟讲的事，AI数据底座有多重要
author: MatrixOrigin
description: >-
  本文是矩阵起源 CEO 王龙在 GTC 2026
  现场的分享，黄仁勋演讲核心强调结构化与非结构化数据融合的重要性，该模式也将在各行业落地。矩阵起源的三大产品布局与这一方向高度契合，适配 AI Agent
  时代需求。同时，戴尔、IBM 等头部企业集体布局 AI 数据平台，产业共识形成，而矩阵起源与金盘科技的合作，也印证了数据融合在实际场景的价值。
tags:
  - 新闻
keywords:
  - GTC 2026
  - MatrixOne Intelligence
  - AI factory
  - AI数据底座
publishTime: '2026-03-17T17:00:00+08:00'
image:
  '1': /content/zh/shared/news.png
  '235': /content/zh/shared/news.png
date: '2026-03-17T17:00:00+08:00'
lang: zh
status: published
---

# 直击GTC 2026现场，黄仁勋用20分钟讲的事，AI数据底座有多重要

王龙 | 矩阵起源CEO · GTC 2026 圣何塞现场

GTC以前我来过很多次了，我住在San Jose多年，跟老黄也见过好几次面。英伟达的盛会已经持续好多年，最近几年英伟达加冕为AI之王以来更加火爆。不过今天是第一次代表矩阵起源，以NVIDIA AI Factory生态的数据平台合作伙伴身份来参与。我和三万人一起听了黄仁勋两个多小时的keynote。

![1.png](/content/zh/martrixone-ceo-gtc/1.jpg)

说实话，演讲的前20分钟，让我极其兴奋——**黄仁勋在主舞台上向全世界阐述的方向，和我们过去5年所做的技术，在客户侧解决的问题，几乎完全一致。**

## 他花了20分钟谈结构化和非结构化数据的融合

皮衣教主登台后，先是例行感谢、回顾CUDA 20周年。然后他放出了一张图——一张密密麻麻列满了Apache Spark、Presto、DuckDB、Polars等几十个数据引擎Logo的架构图。

![2.png](/content/zh/martrixone-ceo-gtc/2.png)

他说，这些数据引擎处理的是data frames，都是结构化数据，也是Business的ground truth。也就是我们一直在告诉我们的客户的，即使在AI时代结构化数据仍然是核心，因为它们是最精准的描述企业现状的核心数据。

![3.png](/content/zh/martrixone-ceo-gtc/3.png)

然后他又谈到了非结构化数据。他说全世界90%的数据是非结构化的——PDF、文档、图片、视频。企业花了几十年时间收集、存储……然后就没有然后了。因为你没法索引它，没法查询它，没法搜索它。

**但AI改变了这一切。**

AI的多模态能力让机器第一次可以"读懂"一份PDF、理解它的含义，然后把它嵌入到一个可以搜索和查询的结构中。

结构化数据和非结构化数据，一个靠精确的SQL计算引擎，一个靠Generative AI的概率性引擎，是可以完美的结合在一起，来更加精准的描述这个世界的。结构化数据是AI获取确定性事实的来源，而非结构化数据是AI的context，他们只有结合起来才能真正solve AI落地的精准度和场景适应性问题。

## 结构化数据与AI的融合，将在一个行业接一个行业地重复发生

最让我印象深刻的，是一个看似和数据平台无关的环节——DLSS 5的发布。

黄仁勋在台上演示了NVIDIA全新的3D渲染技术。过去的游戏渲染靠的是光线追踪——精确、可控，但计算量巨大，而且无论怎么堆算力，CGI始终无法完全跨越那个坎。DLSS 5的思路完全不同：它把传统3D图形引擎产生的结构化数据（几何、光照、物理模拟——这些是虚拟世界的ground truth），与生成式AI模型融合在一起。AI负责补全画面中那些用传统方法渲染代价极高的部分——材质细节、光影氛围、场景纵深。他在《生化危机》和《霍格沃茨》的实机画面上展示了效果，全场确实很震撼。但让我真正坐不住的，不是画面，而是他紧接着说的这句话：

**"This concept of fusing structured data with generative AI will repeat itself in one industry after another industry after another industry."**

结构化数据与AI的融合，将在一个行业接一个行业地重复发生。从NVIDIA的游戏场景中我们看见的计算机图形学的突破，但是实际上它对于所有行业都适用。它的本质是说：AI不是只靠大模型"生成"就够了，它必须建立在结构化数据的ground truth之上。 游戏渲染如此，企业决策如此，工业制造如此，医药研发如此——底层逻辑完全一致。这正是我们现在在芯片设计、工业制造、交通、零售等多个行业和客户中正在做的事情。

**未来的Agent，既要用结构化数据库，也要用非结构化数据库。**

## 我为什么坐不住

我在2021年创办矩阵起源的时候就有一个核心判断：未来时代的数据基础设施，核心不是单纯的更快更大，而是结构化数据与非结构化数据的融合，以及能面向未来的负载。而今天整个产业的发展已经逐步证实了我的判断，大规模的AI负载改变了数据需求，改变了数据基础设施的形态。

今天黄仁勋不是作为一个数据行业领军人物，而是AI行业的教主，在三万人面前把这件事讲清楚了。我在台下听着觉得，我们五年前押注的方向，今天被AI整个产业真正确认了。

### MatrixOne：黄仁勋口中的"ground truth"

MatrixOne是矩阵起源的云原生超融合数据库，它完全基于存算分离结构，支持管理结构化和非结构化数据，支持处理OLTP，OLAP，向量，时序，搜索负载。它就是黄仁勋在台上指着那张密密麻麻的架构图所说的ground truth of enterprise computing。

但我们比这个定义多走了关键一步：MatrixOne有Git-for-Data的能力——数据可以像代码一样分支、快照、回滚。在AI Agent时代，它就是Agent记忆管理的核心基础设施。黄仁勋在讲Vera Rubin时反复强调Agent会pound on memory really hard——Agent需要的不是一个只能append的日志，而是可以分支、可以回溯、可以合并的结构化记忆系统。

https://matrixorigin.cn/matrixone

### MatrixOne Intelligence：我们的"AI Data Platform"

当黄仁勋宣称AI Data Platform是未来最重要的平台之一时，这也正是矩阵起源一直在做的事。

MatrixOne Intelligence是我们的AI原生数据智能平台。核心思路是在MatrixOne的底座之上，把数据加工能力与AI引擎结合整个平台里，面向各种应用场景构建AI Agent应用。我们底层打通了SQL引擎（处理结构化数据）和RAG引擎（处理非结构化数据），并且在一个Agent框架内完成融合推理。

在NVIDIA AI Factory的架构里，MatrixOne Intelligence目前也承担了重要角色。它能让AI不只是调用大模型生成文本，而是让Agent可以直接查数据库、关联上下文、给出可信赖的业务洞察。

https://matrixorigin.cn/matrixone-intelligence

### Memoria：为Agent打造的可信记忆基础设施

我们最近开源Agent记忆系统Memoria，定位是Git for Memory，底层构建在MatrixOne之上。黄仁勋说Agent需要高速读写KV Cache、结构化数据和向量数据——这正是我们设计Memoria时的核心假设：Agent的记忆需要分支隔离、上下文快照、语义检索一体化的活的系统。

https://memoria.matrixorigin.cn/

## Dell、IBM、Oracle集体下场，说明什么？

除了NVIDIA自己的发布，今天同步官宣的一系列合作让我看到了产业共识加速形成：

![4.png](/content/zh/martrixone-ceo-gtc/4.png)

Dell发布了AI Data Platform with NVIDIA，Michael Dell亲自站台说这是purpose-built for agentic AI。IBM宣布WatsonX全面接入cuDF加速——黄仁勋专门提了一句"IBM，SQL的发明者"。Oracle在AI Database里集成cuVS。Google Cloud在Dataproc里集成cuDF，Snap用它把每日数据处理成本降了76%。

这些不是边缘合作。这是全球最大的IT基础设施公司，集体将"AI数据平台"提升为战略级产品线。作为NVIDIA AI Factory生态里专注做数据底座的公司，这个信号对我们来说再清晰不过了。

## 在客户现场，融合早已在发生

黄仁勋的论述不是理论。在我们的客户那里，这种结构化与非结构化数据的融合，每天都在真实发生。

在**金盘科技**——也就是今天和我一起在GTC做分享的伙伴——我们基于NVIDIA AI Enterprise的全栈能力，正在帮他们构建覆盖生产效率优化、质量检测、安全管理的AI Factory。这里面每一个场景，都离不开结构化的MES/ERP数据与非结构化的工业视觉、文档数据的融合。

这些不是demo。这些是正在上线、已经产生价值的系统。

## 今晚最想说的三件事

从SAP Center走出来，脑子里翻来覆去就三件事：

**第一，数据层终于站到了舞台中央。** 过去两年所有人都在追大模型——更大的参数、更强的推理、更长的上下文。但今天，全世界最有影响力的AI基础设施公司的创始人，用三万人大会的开场20分钟告诉所有人：没有好的数据平台，你的Agent什么也做不了。作为深耕数据基础设施的公司，这是来自产业最高点的战略确认。

**第二，"融合"不再是一个可选项。** 结构化数据是Agent的工作记忆，非结构化数据是Agent的世界知识。二者缺一不可，而且必须在同一个平台内打通。这是我们从第一天起就押注的方向，也是我们在NVIDIA AI Factory生态里的核心价值所在。

**第三，数据库的定义正在改变。** 它不再只是存数据的地方。在Agentic AI时代，数据库是Agent的记忆系统、决策依据和行动支撑。它需要高并发读写、分支隔离、上下文快照、语义检索——这些能力必须原生内置，而不是靠外部组件拼凑。

GTC还有几天，今年的AI生态真是越来越好玩了，欢迎行业客户来现场找我。

王龙 矩阵起源 MatrixOrigin CEO 2026年3月17日 · 圣何塞，GTC 2026现场
