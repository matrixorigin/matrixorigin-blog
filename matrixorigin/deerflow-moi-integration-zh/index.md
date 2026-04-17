---
title: 解锁 RAG 深度搜索应用潜能：Deerflow 与 MOI 融合实战指南
author: MatrixOrigin
description: 详细介绍如何将开源 RAG 应用开发引擎 Deerflow 与 MOI 的 RAG 服务进行集成，帮助开发者快速构建强大的深度检索增强生成应用。
tags:
  - 技术干货
keywords:
  - Deerflow
  - MOI
  - RAG
  - 深度检索
publishTime: '2025-11-10 17:00:00+08:00'
image:
  '1': /content/zh/shared/tech.png
  '235': /content/zh/shared/tech.png
date: '2025-11-10 17:00:00+08:00'
lang: zh
status: published
---

## 视频+教程 | 解锁 RAG 深度搜索应用潜能：Deerflow 与 MOI 融合实战指南

## 前言

本教程旨在为开发者提供一份清晰、详尽的指南,说明如何将开源 RAG (Retrieval-Augmented Generation) 应用开发引擎 Deerflow 与 MOI 的 RAG 服务进行集成。通过本教程,读者将掌握 Deerflow 的部署方法、在 MOI 中创建数据处理工作流的技能,并最终实现两者连接,以构建一个强大的、可定制的深度检索增强生成应用。

### 一、 Deerflow 简介

Deerflow (https://github.com/bytedance/deer-flow) 是一个开源的 RAG 应用开发引擎,它提供了一套完整的后端服务和可扩展的框架。其核心价值在于简化 RAG 应用的开发流程,允许开发者通过简单的配置,快速接入 RAG 数据服务提供商(如 MOI)、大语言模型(LLMs)以及向量数据库等,从而专注于业务逻辑的实现,而非底层技术的集成。

### 二、 Deerflow 安装与部署

本教程将详细介绍本地部署 Deerflow 的过程。

#### 推荐工具

为确保顺畅的安装体验,建议使用以下工具:

- **uv**: 用于简化 Python 环境和依赖管理。uv 会自动在项目根目录创建虚拟环境并安装所有必需的包。

- **nvm**: 用于轻松管理多个 Node.js 运行时版本。

- **pnpm**: 用于安装和管理 Node.js 项目的依赖。

#### 环境要求

请确保您的系统满足以下最低要求:

- **Python**: 3.12 或更高版本

- **Node.js**: 22 或更高版本

#### 安装步骤

**步骤 1: 克隆代码仓库**

```bash
git clone https://github.com/bytedance/deer-flow.git
cd deer-flow
```

**步骤 2: 安装 Python 依赖**

使用 uv 来同步环境并安装所有必需的 Python 包。

```bash
uv sync
```

**步骤 3: 初始化配置文件**

Deerflow 通过 `.env` 和 `conf.yaml` 文件进行配置。请从模板文件复制并创建它们。

首先,配置 `.env` 文件,用于存放 API 密钥等敏感信息。我们将在后续步骤中填入 MOI 的信息。

```bash
cp .env.example .env
```

然后,配置 `conf.yaml` 文件,用于设置 LLM 模型等。

```bash
cp conf.yaml.example conf.yaml
```

**注意**: 在启动项目前,请仔细阅读官方的配置指南 (docs/configuration_guide.md),并根据您的具体需求更新这两个配置文件。

**步骤 4: 安装可选依赖**

为了支持 PPT 生成功能,您需要安装 marp-cli。

```bash
npm install -g @marp-team/marp-cli
```

**步骤 5: (可选) 安装 Web UI 依赖**

如果您希望使用 Web UI,需要进入 web 目录并安装前端依赖。

```bash
cd web
pnpm install
cd ..
```

### 三、 在 MOI 中创建 RAG 工作流

接下来,我们需要登录 MOI 平台,并创建一个用于处理和检索数据的工作流。

**步骤 1: 创建工作流**

登录您的 MOI 账户,进入工作流管理界面,点击"创建工作流"按钮,为您的新工作流命名。

**步骤 2: 搭建工作流**

一个基础的 RAG 工作流至少包含数据解析、文本分段和向量化嵌入三个核心节点。

1. **添加解析节点 (Parser Node)**: 从节点列表中拖拽一个"解析节点"到画布上。此节点的类型取决于您要处理的数据源。例如,如果您处理的是文档文件,就选择文档解析节点;如果是图片,则选择图片解析节点。

2. **添加分段节点 (Chunking Node)**: 拖拽一个"分段节点"到画布上。此节点是必不可少的,它负责将解析后的长文本切割成更小、更适合检索的文本块(Chunks)。

3. **添加文本嵌入节点 (Embedding Node)**: 拖拽一个"文本嵌入节点"到画布上。此节点也至关重要,它会调用嵌入模型(Embedding Model)将每个文本块转换为向量(Vector),以便后续进行相似度计算和检索。

4. **连接节点**: 按照 解析节点 -> 分段节点 -> 文本嵌入节点 的顺序,将这三个节点连接起来,形成一个完整的数据处理流水线。

![1.png](/content/zh/deerflow-moi-integration/1.png)

**步骤 3: 获取 API 密钥与 URL**

工作流搭建完成后,您需要获取用于 API 调用的凭证。

1. 在MOI工作区的左下角,找到 API 相关信息。

2. **复制 API 密钥 (API Key)**: 这是一长串字符,是您访问此工作流的唯一凭证。

3. **获取 API URL**: 记录下您的 MOI 服务的访问地址,例如 https://freetier-01.cn-hangzhou.cluster.matrixonecloud.cn。Deerflow 需要的最终接入点(Endpoint)是这个地址后面拼接上 /byoa。

![2.png](/content/zh/deerflow-moi-integration/2.png)

### 四、 配置 Deerflow 对接 MOI

现在,我们回到 Deerflow 项目,将 MOI 工作流的信息配置进去。

**步骤 1: 打开 .env 文件**

使用您喜欢的文本编辑器打开位于 Deerflow 项目根目录下的 `.env` 文件。

**步骤 2: 填写 MOI 配置信息**

在文件中找到或添加以下配置项,并用您在上一步中获取的信息替换占位符:

```bash
# MOI RAG 服务配置
MOI_API_KEY=your_api_key_here
MOI_API_URL=https://your-moi-instance.com/byoa
```

**配置示例:**

![3.png](/content/zh/deerflow-moi-integration/3.png)

**步骤 3: 配置基础模型 (conf.yaml)**

除了 RAG 服务,您还需要配置一个基础的大语言模型(LLM)来处理生成任务。这个模型可以是本地部署的模型(例如通过 Ollama 运行),但**关键是它必须支持工具调用(Tool Calling)功能**。

打开项目根目录下的 `conf.yaml` 文件,找到或添加 BASIC_MODEL 配置,并填入您的模型信息。

```yaml
BASIC_MODEL:
  provider: 'ollama'
  model: 'qwen2.5:7b'
  api_base: 'http://localhost:11434'
```

**其他配置:**

web 目录下的 `.env`:

```bash
VITE_API_URL=http://localhost:8000
```

### 五、 启动并查询

所有配置完成后,保存文件。现在您可以启动 Deerflow 服务并开始测试查询。

#### 启动服务

Deerflow 提供两种交互方式,您可以根据需要选择启动。

**方式一: 控制台 UI (Console UI)**

这是运行项目最快捷的方式。在项目根目录下执行:

```bash
uv run python main.py
```

**方式二: 网页图形界面 (Web UI)**

此方式提供更动态、更具吸引力的交互体验。请确保您已完成安装步骤中的第 5 步。在项目根目录下,执行启动脚本:

```bash
./start.sh
```

#### 验证集成与进行深度检索

服务启动后(推荐使用 Web UI 进行验证),请按照以下步骤操作:

1. **进入对话页面**: 打开浏览器访问 http://localhost:3000,进入 Deerflow 欢迎页后,点击 "Get Started" 进入主对话界面。

2. **验证接入成功**: 在对话框中,如果系统出现提示 "You may refer to RAG by using @",则代表 Deerflow 已成功连接到您配置的 MOI RAG 服务。

3. **进行深度检索**:

   a. 在输入框中输入 @ 符号。

   b. 系统会自动弹出一个可供选择的列表,其中包含您在 MOI 中处理过的文件或文件夹。

   c. 选择您想要检索的特定数据源,然后输入您的问题,即可开始针对该数据源的深度检索查询。(注意:用户输入的问题不能是过于简单或者不需要研究的内容,否则deerflow可能会出错。)

![4.png](/content/zh/deerflow-moi-integration/4.png)

至此,您已成功将 Deerflow 与 MOI RAG 服务集成,并可以开始您的深度检索增强生成应用之旅。

---

### 观看直播回放,获取更详尽的实战演示与内容解析

### 直播 Q&A 环节

**Q: 与直接使用多个专业系统相比,MatrixOne 统一存储的策略在灵活性方面有何优势?**

**A:** 这是一个关于架构选择的深度问题。传统上,结构化与非结构化数据通常由各自的专用数据库管理。然而,这种分离模式面临数据分散、难以保证一致性,以及各系统间频繁同步导致高昂成本等挑战。同时,对于下游的分析、训练及查询任务,多系统模式需要进行多次数据搬运,效率较低。MatrixOne Intelligence (MOI) 通过构建统一的存储引擎,能够无缝融合各类数据形态,确保数据与分析在同一份数据上进行,从而在兼顾灵活性的同时,显著提升数据处理效率与一致性。
