---
title: "MOI 开发者模式上线"
author: MatrixOrigin
description: "MatrixOne Intelligence（MOI）开发者模式上线，一条命令即可装好 MOI 的命令行工具 moi-cli 和开源的 Agent Runtime Astra。用 MOI 账号登录一次，Astra 就能使用 MOI 提供的模型，并以你的身份访问 MOI，无需自备 API Key，也无需另建个人访问令牌。"
tags: ["新闻", "MOI", "Astra"]
keywords: ["MOI", "MatrixOne Intelligence", "开发者模式", "AI Agent", "Astra", "Agent Runtime", "moi-cli", "Skill"]
date: "2026-09-28T17:00:00+08:00"
publishTime: "2026-09-28T17:00:00+08:00"
image:
  "1": "/images/blog-covers/news.png"
  "235": "/images/blog-covers/news.png"
lang: zh
status: draft
---

# MOI 开发者模式上线

矩阵起源 AI 数据平台 MatrixOne Intelligence（MOI）的开发者模式已上线，一条命令即可装好 MOI 的命令行工具 moi-cli 和开源的 Agent Runtime Astra。用 MOI 账号登录一次，Astra 就能使用 MOI 提供的模型，并以你的身份访问 MOI：无需自备 API Key，也无需另建个人访问令牌。

moi-cli 是 Agent 调用 MOI 的入口，可以查询数据、运行工作流、使用知识库。它自带一份写给 Agent 的 Skill，说明每类任务该用哪条命令、资源 ID 从哪里取、写入前要确认什么。moi-cli 也可供其他能运行命令的 Agent 调用，或直接写进脚本。

[Astra](https://github.com/matrixorigin/Astra) 由矩阵起源开源，负责 Agent 的执行循环（agent loop），本身不包含模型。在开发者模式中，它默认加载 moi-cli 的 Skill，使用 MOI 提供的模型。

Astra 和 moi-cli 共用同一次登录，凭据不会进入对话。Astra 按你的 MOI 账号权限操作，在本机执行命令前默认会先征得你的同意。

## 如何开始

开发者模式目前支持 macOS 和 Linux。在终端依次运行下面三条命令：安装 Astra 和 moi-cli，在浏览器中登录 MOI 账号，然后开始对话。

```bash
curl -fsSL https://get.matrixorigin.cn/astra | sh
astra login
astra
```

完整步骤见 MOI 文档[《在终端安装 Astra 并查询 MOI 工作区》](https://docs.matrixorigin.cn/moi/zh/5.0/tutorials/astra-cli-first-use.html)。
