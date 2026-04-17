---
title: 爬得快，更要处理得快：MOI MCP 如何攻克数据处理效率瓶颈
author: MatrixOrigin
description: 演示如何以 MOI MCP 为核心引擎，联动网络爬虫与对象存储，构建从数据获取到价值提炼的端到端自动化管道，消除数据处理等待时间，实现真正的实时数据工作流
tags:
  - 技术干货
keywords:
  - MOI MCP
  - 数据处理
  - 自动化工作流
  - 网络爬虫
publishTime: '2025-11-23 17:00:00+08:00'
image:
  '1': /content/zh/shared/tech.png
  '235': /content/zh/shared/tech.png
date: '2025-11-23 17:00:00+08:00'
lang: zh
status: published
---

## 引言：

如今，网络爬虫能让您"爬得快"，但真正的效率瓶颈在于后续的"处理得快"。如果抓取的数据无法被高效、自动化地处理，那么再快的采集也失去了意义。

本教程聚焦于解决这一核心痛点。我们将演示如何以 **MOI MCP 为核心引擎**，联动网络爬虫 MCP 与对象存储 MCP，构建一个从数据获取到价值提炼的端到端自动化管道。其目标不仅仅是采集数据，更是要**消除数据处理的等待时间**，实现真正的实时数据工作流。

我们将遵循以下核心流程，实现从采集到处理的全程加速：

1. **配置环境**：设置并整合 MOI MCP、爬虫 MCP 和 OSS MCP。

2. **数据获取**：使用爬虫 MCP 从指定网址抓取信息并保存为本地文件。

3. **数据中转**：利用 OSS MCP 将本地文件上传至阿里云对象存储。

4. **数据接入与处理**：通过 MOI MCP 创建连接器、加载任务和工作流，对数据进行自动化解析和处理，最终生成可供分析应用的数据集（Chunks 或 Datasets）。

## 第一部分：MCP 工具链配置

在开始自动化流程之前，我们需要先配置好所有必需的 MCP 服务。这包括 MOI 自身的服务以及用于爬取和上传的外部服务。

### 1.1 MOI MCP 配置

MOI MCP 【[MCP 使用说明 - MatrixOne Intelligence 文档](https://docs.matrixorigin.cn/zh/m1intelligence/MatrixOne-Intelligence/mcp/mcp/#1-mcp)】是与 MatrixOne Intelligence 平台交互的核心。公有云配置方式简单快捷，适合快速上手和大多数在线使用场景。

#### **公有云配置**

您只需在 MCP 客户端中添加以下 JSON 配置即可连接到 MOI 公有云服务。这种方式无需本地部署，开箱即用。

_请注意_：请务必将 moi-key 的值替换为您目标工作区的实际 moi-key。

![1.png](/content/zh/moi-mcp-data-processing/1.png)

**客户端 JSON 配置**：

```json
{
  "mcpServers": {
    "mcp-moi-server": {
      "type": "streamable-http",
      "url": "https://mcp.moi.matrixorigin.cn/mcp/",
      "note": "连接到 MOI 公有云 MCP 服务",
      "headers": {
        "moi-key": "<your-moi-key>"
      }
    }
  }
}
```

#### **MOI MCP 主要工具列表**

- **目录管理**：CreateCatalog, GetCatalogInfo, GetCatalogTree 等。

- **库管理**：CreateDatabase, GetDatabaseInfo, GetDatabaseList 等。

- **卷管理**：CreateVolume, GetVolumeInfo, DeleteVolume 等。

- **文件管理**：GetFileList, DownloadFile 等。

- **连接器管理**：CreateConnector, ListConnectors, ListConnectorFiles 等。

- **任务管理**：CreateLoadTask, ListLoadTasks 等。

- **工作流管理**：CreateWorkflowMeta, CreateWorkflowBranch, UpdateWorkflowBranch 等。

### 1.2 爬虫 MCP (Fetch MCP) 配置

该工具负责从网络上抓取 HTML、JSON 或 Markdown 等文本内容。

- **项目地址**：[GitHub - zcaceres/fetch-mcp: A flexible HTTP fetching Model Context Protocol server.](https://github.com/zcaceres/fetch-mcp)

- **客户端 JSON 配置**：

```json
{
  "mcpServers": {
    "fetch": {
      "command": "npx",
      "args": ["mcp-fetch-server"],
      "env": {
        "DEFAULT_LIMIT": "50000"
      }
    }
  }
}
```

- **主要工具列表**：fetch_html, fetch_json, fetch_txt, fetch_markdown。

### 1.3 阿里云 OSS MCP 配置

该工具用于将文件上传到阿里云对象存储服务（OSS）。

- **项目地址**：[GitHub - 1yhy/oss-mcp: 阿里云OSSMCP服务器，用于将文件上传到阿里云OSS，支持多配置和目录指定](https://github.com/1yhy/oss-mcp)

- 客户端 JSON 配置：

注意：请将下方的 accessKeyId、accessKeySecret 和 bucket 等信息替换为您自己的配置。

```json
{
  "mcpServers": {
    "oss-mcp": {
      "command": "npx",
      "args": [
        "oss-mcp",
        "--oss-config='{\"default\":{\"region\":\"oss-cn-beijing\",\"accessKeyId\":\"<Your-Access-Key-Id>\",\"accessKeySecret\":\"<Your-Access-Key-Secret>\",\"bucket\":\"<Your-Bucket-Name>\",\"endpoint\":\"oss-cn-beijing.aliyuncs.com\"}}'",
        "--stdio"
      ]
    }
  }
}
```

- **主要工具列表**：

  - upload_to_oss：上传文件到 OSS。

  - list_oss_configs：列出可用的 OSS 配置。

## 第二部分：自动化数据流实战演练

配置完成后，我们开始执行完整的自动化流程。

### STEP 1: 整合并启用所有 MCP 服务

将第一部分中的所有配置合并到一个 JSON 文件中，并加载到您的 MCP 客户端。

![2.png](/content/zh/moi-mcp-data-processing/2.png)

**综合配置示例：**

```json
{
  "mcpServers": {
    "fetch": {
      "command": "npx",
      "args": ["mcp-fetch-server"],
      "env": { "DEFAULT_LIMIT": "50000" }
    },
    "oss-mcp": {
      "command": "npx",
      "args": [
        "oss-mcp",
        "--oss-config='{\"default\":{\"region\":\"oss-cn-beijing\",\"accessKeyId\":\"<Your-Access-Key-Id>\",\"accessKeySecret\":\"<Your-Access-Key-Secret>\",\"bucket\":\"<Your-Bucket-Name>\",\"endpoint\":\"oss-cn-beijing.aliyuncs.com\"}}'",
        "--stdio"
      ]
    },
    "mcp-moi-server": {
      "type": "streamable-http",
      "url": "https://mcp.moi.matrixorigin.cn/mcp/",
      "note": "连接到 MOI 公有云 MCP 服务",
      "headers": {
        "moi-key": "<your-moi-key>"
      }
    }
  }
}
```

### STEP 2: 爬取网站信息

使用 fetch MCP 工具抓取 MOI 用户手册的指定页面，并将其转换为 Markdown 格式保存在本地。

**输入指令:**

帮我获取 https://docs.matrixorigin.cn/zh/m1intelligence/MatrixOne-Intelligence/mcp/mcp/#\_8 的数据，转为md格式，保存在本地，文件名为 moi_mcp手册.md。

MCP 客户端将调用 fetch 服务的 fetch_markdown 工具完成此任务。

### STEP 3: 上传文件至 OSS

使用 oss-mcp 工具将上一步生成的本地文件 moi_mcp手册.md 上传到您预设的阿里云 OSS 存储桶中。

**输入指令:**

把文件 moi_mcp手册.md 上传到 OSS 里面。

MCP 客户端将调用 oss-mcp 服务的 upload_to_oss 工具。

### STEP 4: 创建 MOI 连接器与原始数据卷

现在，数据已在云端。我们需要让 MOI 平台能够访问它。首先创建一个指向该 OSS 存储桶的连接器，并创建一个用于存放原始数据的卷。

**输入指令:**

帮我创建一个名为 mcp_test 的连接器，配置如下：{\"name\": \"oss-test2\", \"source_type\": 4, \"config\": {\"oss\": {\"endpoint\": \"oss-cn-beijing.aliyuncs.com\", \"access_key_id\": \"\<Your-Access-Key-Id\>\", \"access_key_secret\": \"\<Your-Access-Key-Secret\>\", \"bucket_name\": \"\<Your-Bucket-Name\>\"}}}。然后，再帮我创建一个名为 moi_mcp_test 的原始数据卷。

此指令将调用 mcp-moi-server 的 CreateConnector 和 CreateVolume 工具。

![3.png](/content/zh/moi-mcp-data-processing/3.png)

### STEP 5: 创建数据加载任务

连接器建好后，创建一个加载任务，将 OSS 中的 moi_mcp手册.md 文件加载到刚创建的 moi_mcp_test 卷中。

**输入指令:**

从我刚刚创建的 mcp_test 连接器中，将文件 moi_mcp手册.md 加载到 moi_mcp_test 卷中。

此指令将调用 mcp-moi-server 的 CreateLoadTask 工具。

![4.png](/content/zh/moi-mcp-data-processing/4.png)

### STEP 6: 创建工作流处理数据

数据进入 MOI 平台后，最后一步是创建工作流对其进行自动化处理。这里提供两种常见的处理路径。

#### **路径 A：解析 + 分段 (生成 Chunks)**

此工作流将原始 Markdown 文件解析并切分成适合 RAG（检索增强生成）应用的文本块（Chunks）。

**输入指令:**

新建一个名为 moi_mcp_test_workflow 的工作流。这个工作流的任务是处理 moi_mcp_test 数据卷中的所有文件，将结果生成为适合RAG的chunks，并存放在一个新建的名为 moi_mcp_target_chunks 的处理数据卷下。

![5.png](/content/zh/moi-mcp-data-processing/5.png)

#### **路径 B：解析 + 分段 + 增强 (生成 Datasets)**

此工作流在路径 A 的基础上增加了"增强"步骤，例如进行实体识别、摘要生成等，最终输出结构化的数据集（Datasets）。

**输入指令:**

新建一个名为 moi_mcp_test_workflow_enhanced 的工作流。这个工作流的任务是处理 moi_mcp_test 数据卷中的所有文件，将结果生成为数据集，并存放在一个新建的名为 moi_mcp_target_dataset 的处理数据卷下。

## 总结：释放组合工具的潜力

通过上面的步骤，我们成功地演示了如何将 MOI MCP 与外部 MCP 工具链（爬虫、云存储）结合，构建了一个功能强大的自动化数据处理流程。这种模式的核心优势在于其**模块化**和**可扩展性**：您可以根据需求，自由替换或增加任何环节的 MCP 工具（例如，将爬虫替换为数据库抓取工具，或将 OSS 替换为其他云存储），从而灵活应对各种复杂的数据场景。

掌握这种组合工具的实践方法，将帮助您和您的团队在 MatrixOne Intelligence 平台上构建更高效、更智能的数据应用程序。
