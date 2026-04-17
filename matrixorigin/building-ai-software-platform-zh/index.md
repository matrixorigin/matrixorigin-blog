---
title: 围绕算力+数据，矩阵起源建设开源 AI 原生软件平台
author: MatrixOrigin
mail: lichuanzi@matrixorigin.cn
description: 矩阵起源发布 MatrixOS、MatrixDC、MatrixGenesis 等产品以应对 AI 大模型时代的挑战。
tags:
  - 产品中心
keywords:
  - 矩阵起源
  - 云原生
  - MatrixOS
  - MatrixOne
publishTime: '2024-05-24 17:00:00+08:00'
image:
  '1': /content/zh/shared/osfb.png
  '235': /content/zh/shared/osfb.png
date: '2024-05-24 17:00:00+08:00'
lang: zh
status: published
---

一年多前，ChatGPT-3.5 初露头角，其突破性的自然语言交互能力撼动了整个世界。之后十几个月，Transformer 架构和大语言模型 LLM 成为划时代的技术，激发了整个 AGI 领域的创业和创新。OpenAI 和 Google 相继推出了 GPT-4o、Project Astra 等「AI 全家桶」、字节跳动发布「豆包」大模型家族、腾讯发布混元大模型，AI 应用领域也百花齐放，进入了新的大发展阶段。此外，数字人、数字孪生、生命科学、具身智能、元宇宙等技术也正逐渐进入人们视野AI-Native 的时代正在向我们召唤，对于企业而言，研究和应用 AI 技术已然成为数字化乃至智能化转型的“必选题”。

而在繁荣的另一面，我们也清楚地看到 Transformer 架构高度依赖于“scaling law”，除了传统深度学习依赖的的算力、数据、算法要素，电力也加入进来，成为企业、数据科学家和应用开发者新的瓶颈。高电力消耗、高能源成本向云计算时代构建的基础设施发起了挑战；昂贵的算力成本和笨拙的海量数据处理放慢了应用创新的脚步；AI应用在场景发掘、开发、部署和运维方面的的最佳实践，依然还在摸索中......

## MatrixOS 正式发布

为了应对 AI 大模型时代的挑战，矩阵起源发布 MatrixOS 产品。MatrixOS 是一个开源开放的 AI-Native 操作系统，链接算力、数据、知识、模型与企业应用，提供一整套端到端的 AI Stack 服务框架。

<img src="/content/zh/building-ai-software-platform/image1.png" width="1000">

MatrixOS 秉承开放理念，拥抱开源技术，整体以可快速插拔和扩展的容器化架构为基础，内置强大的异构数据存储及加工平台，同时涵盖各类开源大模型及精调、编排应用框架。MatrixOS 由三个核心子产品构成，既可以一站式组合服务，也可以由每个子产品独立提供服务。

### MatrixDC：算力服务平台

MatrixDC 是一款异构算力管理及调度的软件产品，作为 MatrixOS 的算力底座，具备模块化、可扩展、高性能的云原生服务能力，为企业提供异构算力池化调度、超大规模算力集群、智能运维服务质量保障等一系列平台能力；通过灵活的计费模式，更高的性价比，满足客户多样化的需求场景；提供开箱即用的分布式算力池，为数据处理、训练、微调、推理提供快捷、稳定、高效、弹性的分布式支撑环境；面向开发者，提供完备的开发 API/SDK，助力企业快速接入 MatrixDC 平台，实现预期的业务目标。

同时，MatrixDC 支持与 NVIDIA AI Enterprise 和 OminiVerse 软件平台的深度集成，配合全面的专家技术支持，为客户提供 AI 应用开发、模型训练、推理等全生命周期管理服务，助力企业实现 AI 赋能。同时 MatrixDC 也将逐步支持国产 GPU 芯片的集成，组网及算力服务。

<img src="/content/zh/building-ai-software-platform/image2.png" width="1000">

### MatrixOne：超融合数据管理平台

MatrixOne 是一款超融合数据管理平台。作为 MatrixOS 的数据处理层，它面向云原生和容器化设计，整体采用存算分离的架构，支持针对 OLTP，OLAP，时序，流计算，机器学习等多种异构负载，以及多种数据类型的处理。基于共享对象存储的存储层使得它得以极低的成本进行海量数据存储及分享协作，基于无状态容器化的计算层可以使得它快速弹性扩缩容以应对各类负载的波动。开发者可以基于 MatrixOne 快速、一站式的打造业务系统和数据分析应用，针对LLM大模型场景也可以基于其向量能力快速构建基于场景数据理解的知识库。MatrixOne 也是一个完全开源的项目，我们也非常欢迎社区开发者的加入和贡献。

<img src="/content/zh/building-ai-software-platform/image3.png" width="1000">

### MatrixGenesis：AI 智能开发平台

MatrixGenesis，作为 MatrixOS 的核心应用开发层，引领企业级 AI 应用进入一个全新的时代。这一创新平台不仅全链路覆盖了大模型的开发环节，还提供了从模型选择、部署、推理服务、精调，到与结构化系统数据实时打通的全生命周期开发支持。MatrixGenesis 致力于为企业提供端到端的开发流程体验，确保每一个环节都能无缝对接，从而加速 AI 应用的开发与部署。

MatrixGenesis 开发平台是专为 AI 开发者设计的，旨在提供一个高效、灵活的工具链和平台，支持从零到一的快速迭代大模型应用。无论是基于现有的基础模型还是自选模型，用户都能开发出符合自身应用场景的智能应用。MatrixGenesis 涵盖了从 Model Finetune（DPO，PPO）、Model Alignment 和 Model Evaluation，到知识库、知识图谱的建立，以及低代码构建 Multi-Agent Workflow 的全链路开发需求。此外，我们还提供针对特定场景的 RAG/Prompt 调优和评测，帮助开发者快速迭代，不断提升应用的实际AI能力。

同时 MatrixGenesis 也将联合合作伙伴打造开放式的模型，应用商店和智能体分享订阅能力，使得更多的开发者可以参与到智能应用的生态建设中，迅速为自己的智能体应用聚集用户，更好的服务所面对的用户。

<img src="/content/zh/building-ai-software-platform/image4.png" width="1000">

## 展望未来：开放、合作、创新

基于 MatrixOS 和世纪互联 AIDC 万卡集群能力的 AI 原生云平台 [neolink.AI](https://neolink.ai/) 也即将发布，这是 MatrixOS 在行业内的首次大规模落地。

MatrixOS 的发布，不仅是矩阵起源对 AI 未来的一次大胆预测和积极布局，更是对整个技术社区的一次诚挚邀请。欢迎更多的 AIDC 供应商，大模型厂商和数据智能应用厂商加入到这个开源开放的生态体系中来。我们坚信，通过开放合作、共享创新，我们可以共同推动 AI 技术的进步，为企业和社会创造更大的价值。
