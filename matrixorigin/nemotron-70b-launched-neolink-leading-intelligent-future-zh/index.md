---
title: Nemotron-70B 上线 Neolink.AI，开源引领智能未来！
author: MatrixOrigin
mail: lichuanzi@matrixorigin.cn
description: >-
  10月18日，NVIDIA推出Nemotron-70B模型，基于Llama 3.1 70B，经过人类反馈优化，性能超越GPT-4o和Claude
  3.5，现已上线Neolink，引发AI热议。
tags:
  - 新闻
keywords:
  - MatrixOne
  - Llama
  - Neolink
  - 开源模型
  - Meta
publishTime: '2024-10-25 17:00:00+08:00'
image:
  '1': /content/zh/three-years-anniversay-ceremony/news.png
  '235': /content/zh/three-years-anniversay-ceremony/news.png
date: '2024-10-25 17:00:00+08:00'
lang: zh
status: published
---

10月18日，NVIDIA 悄然推出了全新重量级模型 Nemotron-70B。Nemotron-70B 的训练基于 Meta 的 Llama 3.1 70B，并经过人类反馈强化学习（RLHF）优化。它不仅性能强劲，还能在 LMSYS 的 Arena Hard 基准测试中拿下 84.9 分，碾压 GPT-4o 和 Claude 3.5 。

这一发布瞬间引发了 AI 社区的广泛热议——Nemotron-70B 横空出世，直接超越了 GPT-4o 和 Claude 3.5 Sonnet，仅次于 OpenAI 的 o1 模型 。

![排名](/content/zh/Nemotron-70B-launched-neolink-leading-intelligent-future/mx1.png?width=800)

### 新手指引

#### 如何在Neolink.Ai中利用Ollama镜像使用Nemotron-70B模型

如果您是第一次使用 Neolink.AI ，您可参阅以下步骤来使用Ollama镜像：

- Step 1

进入 [Neolink.AI 官网](https://www.neolink-ai.com)，点击控制台进入到登录/注册页面：

![首页](/content/zh/Nemotron-70B-launched-neolink-leading-intelligent-future/mx2.png?width=800)

- Step 2

输入手机号并获取验证码，点击登录/注册按钮即可成功进入到控制台，首次使用将自动完成注册：

![注册](/content/zh/Nemotron-70B-launched-neolink-leading-intelligent-future/mx3.png?width=800)

- Step 3

登录成功后，在算力实例中点击创建实例，选择镜像时，找到前缀为 ollama-webui的镜像。开发者可以根据个人需求选择合适的 GPU 规格，轻松创建 Ollama 实例（为了更加流畅地使用Nemotron-70B模型，推荐选择4个40GB或两个80GB的NVIDIA GPU以及150GB的可用磁盘空间）。

![创建实例](/content/zh/Nemotron-70B-launched-neolink-leading-intelligent-future/mx4.png?width=800)

![选择镜像](/content/zh/Nemotron-70B-launched-neolink-leading-intelligent-future/mx5.png?width=800)

- Step 4

实例创建完成后，您将在实例列表右侧的内置工具中看到 Ollama 和 WebUI 两个选项，分别对应 Ollama 的 API 接口和 Web 用户界面。

![界面](/content/zh/Nemotron-70B-launched-neolink-leading-intelligent-future/mx6.png?width=800)

- Step 5

在Ollama中使用Nemotron-70B模型非常简单。首先，点击 WebUI 打开 Ollama 的可视化界面。在界面中，您可以方便地添加并管理不同的模型。您可以通过 [Ollama 的官网库](https://ollama.com/library)查看支持的模型，选择需要的模型进行下载。以 Nemotron-70B 为例，下载完成后，在 Ollama 的 WebUI 界面选择 Nemotron-70B，即可开始使用。

![开始使用](/content/zh/Nemotron-70B-launched-neolink-leading-intelligent-future/mx7.png?width=800)

这个模型的亮点之一是其惊人的推理能力。在不依赖提示或复杂推理 token 的情况下，Nemotron-70B 直接答对了 AI 界经典难题“草莓里有几个 r” 。

![答对](/content/zh/Nemotron-70B-launched-neolink-leading-intelligent-future/mx8.png?width=800)

NVIDIA 再一次证明了自己在生成式 AI 领域的霸主地位——用 Llama 3.1 打造出Nemotron-70B，精准、高效，一跃成为 o1 之后的顶尖 AI 模型！
