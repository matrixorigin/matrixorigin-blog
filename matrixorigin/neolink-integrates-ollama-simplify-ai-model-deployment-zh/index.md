---
title: Neolink.AI 整合 Ollama，简化本地 AI 模型的部署流程。
author: MatrixOrigin
mail: lichuanzi@matrixorigin.cn
description: Neolink.AI 与 Ollama 实现集成，旨在简化本地 AI 模型的部署过程，使开发者能够更高效地管理和使用这些模型。
tags:
  - 新闻
keywords:
  - Ollama
  - AI
  - Neolink
  - 自然语言生成
  - MatrixOrigin
  - MatrixOne
publishTime: '2024-10-18 17:00:00+08:00'
image:
  '1': /content/zh/three-years-anniversay-ceremony/news.png
  '235': /content/zh/three-years-anniversay-ceremony/news.png
date: '2024-10-18 17:00:00+08:00'
lang: zh
status: published
---

Ollama 是一个开源的本地 AI 工具，旨在简化大语言模型（LLMs）的使用和部署。它的核心功能是帮助开发者在本地环境中高效运行和管理大语言模型，提供硬件加速（如 GPU 支持），以显著提升模型推理速度。Ollama 集成了多种流行的大语言模型，如 GPT 和 LLaMA，开发者可以根据需求快速加载和切换模型。

Ollama 提供易用的 API 和命令行工具，支持自然语言生成、智能问答、对话系统等任务的开发和集成。它允许用户对大语言模型的行为进行精细控制，确保所有的数据输入和生成内容都在本地环境中处理，特别适合需要高数据隐私和自定义模型配置的场景。Ollama 简化了 AI 模型的管理流程，使得开发者能够快速构建和部署 AI 驱动的应用程序。

![Ollama](/content/zh/neolink-integrates-ollama-simplify-ai-model-deployment/O1.png?width=800)

### Ollama本地部署难题

尽管 Ollama 提供了极大的灵活性和控制权，允许开发者在本地运行大语言模型，但其本地部署面临诸多挑战。Ollama 的部署往往需要强大的硬件资源支持，尤其是高性能 GPU 和充足的存储空间。大语言模型的存储和推理性能要求也很高，再加上复杂的环境配置和性能调优，令许多开发者难以轻松上手，这些难题为本地部署 Ollama 带来了很大的技术门槛。

**目前，Neolink.AI 平台已经集成了 Ollama-WebUI 镜像，Neolink.AI 依托于高性能的 GPU 计算资源，为开发者提供了强大的支持，使其无需再为本地硬件配置、环境依赖和性能调优而烦恼。** 通过 Neolink.AI，开发者可以轻松使用 Ollama 的功能，并通过平台提供的 API 将其集成到各类应用中，从而快速实现大语言模型的推理、生成、问答等任务。这不仅显著降低了技术门槛，还大大简化了开发流程，开发者无需担忧硬件资源的限制，便能轻松利用 Ollama 的强大能力，快速构建和部署 AI 应用。

### 新手指引——如何在Neolink.AI中使用Ollama镜像

如果您是第一次使用 Neolink.AI ，您可参阅以下步骤来使用Ollama镜像：

- Step 1

进入 [Neolink.AI 官网](www.https://neolink-ai.com)，点击控制台进入到登录/注册页面：

![首页](/content/zh/neolink-integrates-ollama-simplify-ai-model-deployment/O2.png?width=800)

- Step 2

输入手机号并获取验证码，点击登录/注册按钮即可成功进入到控制台，首次使用将自动完成注册：

![登陆页](/content/zh/neolink-integrates-ollama-simplify-ai-model-deployment/O3.png?width=800)

- Step 3

进入到控制台页面后，点击右上角的账户图标 > 账户中心 > 我的账户进入到账户管理页面：

![账户中心](/content/zh/neolink-integrates-ollama-simplify-ai-model-deployment/O4.png?width=800)

在账户管理页面，您可以通过点击修改密码按钮来设置密码，之后即可使用账号和密码进行登录：

![修改密码](/content/zh/neolink-integrates-ollama-simplify-ai-model-deployment/O5.png?width=800)

- Step 4

登录成功后，在算力实例中点击创建实例，选择镜像时，找到前缀为 ollama-webui 的镜像。开发者可以根据个人需求选择合适的 GPU 规格，轻松创建 Ollama 实例。

![创建实例](/content/zh/neolink-integrates-ollama-simplify-ai-model-deployment/O6.png?width=800)

![选择镜像](/content/zh/neolink-integrates-ollama-simplify-ai-model-deployment/O7.png?width=800)

- Step 5

实例创建完成后，您将在实例列表右侧的内置工具中看到 Ollama和 WebUI两个选项，分别对应 Ollama 的 API 接口和 Web 用户界面。

![内置工具](/content/zh/neolink-integrates-ollama-simplify-ai-model-deployment/O8.png?width=800)

- Step 6

使用 Ollama 非常简单。首先，点击 WebUI 打开 Ollama 的可视化界面。在界面中，您可以方便地添加并管理不同的模型。您可以通过 Ollama 的官网库（[Ollama模型库](library)）查看支持的模型，选择需要的模型进行下载。以 Llama 3.1 为例，下载完成后，在 Ollama 的 WebUI 界面选择 Llama 3.1，即可开始使用。Ollama 可用于多种场景，例如帮助编写代码、生成文案、或者调试代码中的 Bug。通过简单的需求描述，Ollama 就能够生成合适的代码片段、创作高质量的文本内容，甚至提出修复代码错误的建议。

![选择模型](/content/zh/neolink-integrates-ollama-simplify-ai-model-deployment/O9.png?width=800)

![开始对话](/content/zh/neolink-integrates-ollama-simplify-ai-model-deployment/O10.png?width=800)

### Note

有关ollama api调用的详细使用方法，请参考 Ollama 的帮助文档，请参阅 [Ollama 的帮助文档](https://neolink-ai.com/docs/Built-in_tools/ollama)。
