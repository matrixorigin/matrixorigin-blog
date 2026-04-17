---
title: 1分钟快速上手：将你的编程智能体接入Memoria
author: MatrixOrigin
description: >-
  1 分钟快速实现 Cursor、Claude Code 等编程智能体接入
  Memoria，为智能体添加跨会话、跨工具的持久化记忆，解决长任务中断、重复说明上下文的核心痛点，附详细安装配置与验证步骤。
tags:
  - 技术干货
keywords:
  - 教程
  - memoria
  - 配置
  - memory
publishTime: '2026-03-30T17:00:00+08:00'
image:
  '1': /content/zh/shared/tech.png
  '235': /content/zh/shared/tech.png
date: '2026-03-30T17:00:00+08:00'
lang: zh
status: published
---

# 1分钟快速上手：将你的编程智能体接入Memoria

> 只需一条命令，即可拥有持久化记忆。兼容Cursor、Claude Code、Codex和Kiro。

---

## 为什么你需要它

编程智能体功能强大——但它们会遗忘一切。

**长任务被迫中断**：一项复杂的重构工作可能跨多个会话进行。智能体崩溃、上下文窗口占满，或者你只是合上了笔记本电脑。当你回来时，智能体完全不知道之前在做什么、尝试过哪些方案、做出过哪些决策。你只能重新开始。

**你使用多款智能体**：许多开发者会在Cursor、Kiro、Claude Code等工具间切换，对比编码质量。但每次切换时，你都要重复说明相同的上下文：项目规范、偏好的库、架构决策。这既繁琐又容易出错。

Memoria 解决了这两个问题。它为所有编程智能体提供了一个共享的持久化记忆层——在一个会话中存储的信息，在下次会话中、在任意智能体上都能访问。

**整个配置过程不到1分钟**：登录账号、复制密钥、粘贴一段代码——搞定。

---

## 步骤1 — 获取API密钥并安装脚本

访问 [thememoria.ai](https://thememoria.ai)，一键登录（GitHub / Google账号），然后从控制台复制你的API密钥。

无需配置数据库，无需运行后端服务。

![1.png](/content/zh/start-agent-memoria/1.png)

---

## 步骤2 — 接入你的智能体

有两种安装方式：在终端运行一行命令，或在智能体聊天窗口粘贴配置片段（无需安装二进制文件）。

### 方式A：终端一键命令（Stdio MCP）

复制对应智能体的脚本，在项目根目录运行，以Cursor为例：

**Cursor**

```bash
curl -sSL https://raw.githubusercontent.com/matrixorigin/Memoria/main/scripts/install.sh \
  | sh -s -- \
  --tool cursor \
  --api-url https://api.thememoria.ai \
  --token sk-xxxxx
```

![2.png](/content/zh/start-agent-memoria/2.png)

![3.png](/content/zh/start-agent-memoria/3.png)

运行完成后，重新加载或重启你的编程智能体。

### 方式B：粘贴到智能体聊天窗口（流式HTTP，无二进制文件）

从 [thememoria.ai](https://thememoria.ai) 的快速开始页面复制JSON配置，直接粘贴到智能体的聊天窗口。智能体会自动帮你写入配置文件。以Claude Code为例：

**Claude Code**

![4.png](/content/zh/start-agent-memoria/4.png)

```
{
  "mcpServers": {
    "memoria": {
      "type": "http",
      "url": "https://api.thememoria.ai/mcp",
      "headers": {
        "Authorization": "Bearer sk-**",
        "X-Memoria-Tool": "claude"
      }
    }
  }
}

请将上述MCP服务器配置添加到.mcp.json文件中。
- 如果该文件不存在，请创建文件并写入上述内容。
- 如果文件已存在，请将"memoria"条目添加到现有的"mcpServers"对象中。

完成修改后，请告知执行结果，并提醒我：重启终端
```

![5.png](/content/zh/start-agent-memoria/5.png)

---

## 步骤3 — 验证是否生效

向你的智能体发送指令：

```
列出我的memoria记忆内容
```

如果Memoria MCP已成功连接，智能体会调用该工具并返回你的记忆条目数量（首次使用时可能为空）。

> 💡 **首次使用看到空列表？** 先前往 [Memoria 实验场](https://thememoria.ai/playground) 存储一些简单的记忆内容——比如你的名字、常用的编程语言，或者正在开发的项目。然后回到这里再次向智能体发送指令，你会看到它能调取你存储的内容，这说明端到端连接已生效。

![6.png](/content/zh/start-agent-memoria/6.png)

---

## 大功告成

只需一条命令，即可拥有持久化记忆。无需再重复说明上下文，跨会话、跨智能体的上下文也不会丢失。

现在放心地分三次完成重构任务吧——你的智能体会记住上次暂停的位置。
