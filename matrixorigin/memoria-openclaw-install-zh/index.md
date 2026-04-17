---
title: 1 分钟上手：将 Memoria 接入 OpenClaw
author: MatrixOrigin
description: >-
  1 分钟快速将 Memoria 智能记忆系统接入 OpenClaw，通过按需语义检索替代全量加载，Token 用量直降
  70%+，解决默认记忆全量加载、静默截断、检索退化、上下文损毁四大问题，无需自建数据库，一条命令完成配置，让 AI Agent 记忆更精准、更省成本。
tags:
  - 技术干货
keywords:
  - Memoria
  - OpenClaw
  - AI Agent 记忆
  - Token 优化
publishTime: '2026-04-09T17:00:00+08:00'
image:
  '1': /content/zh/shared/tech.png
  '235': /content/zh/shared/tech.png
date: '2026-04-09T17:00:00+08:00'
lang: zh
status: published
---

# 1 分钟上手：将 Memoria 接入 OpenClaw

一条命令，智能记忆，Token 用量**直降 70%+**。

## 为什么你需要它

OpenClaw 自带的记忆功能能用——但代价越来越高。

**每次都全量加载**
OpenClaw 默认的记忆系统会在每次会话开始时，将 MEMORY.md 及相关文件整个塞进上下文窗口。用得越久，积累越多：过去的偏好、旧有的决策、过时的背景信息，全部一股脑注入，不管当前任务用不用得上。每次会话都要付全额 Token 账单。

**文件有上限，超了不报错**
记忆文件有字符限制，一旦超出，内容会被静默截断。Agent 不会告诉你。它只是"忘了"。

**检索能力随时间退化**
周一写下"Alice 负责 auth 团队"，周五问"谁处理权限问题？"——OpenClaw 的默认搜索会把两个片段都找出来，却无法建立关联。关键词加向量搜索，在大规模场景下处理不了关系推理。

**上下文压缩会悄悄损毁记忆**
长会话触发压缩时，注入上下文的记忆文件内容可能被改写或直接丢弃。你以为保存了，其实已经没了。

Memoria 解决了以上所有问题。它用按需语义检索取代全文件加载——只有与当前任务相关的记忆才会被注入。结果：**记忆相关 Token 用量减少 70% 以上**，召回精度更高，数据不再悄悄丢失。

**整个配置不超过 1 分钟。** 登录、复制 API Key、运行一条命令——搞定。

## 第 1 步 — 获取你的 API 密钥

![1.png](/content/zh/memoria-openclaw-install/1.png)

前往 thememoria.ai，一键登录（支持 GitHub / Google），在控制台复制你的 API Key。

无需搭建数据库，无需自建后端。

然后确认 OpenClaw 正在运行：
```
openclaw status
```

## 第 2 步 — 接入 Memoria
两种安装方式：在终端运行命令，或直接在 OpenClaw 对话框中粘贴提示词。

### 选项 A：终端安装
在终端运行以下命令：
```
openclaw plugins install @matrixorigin/thememoria
```
然后配置云端后端：
```
openclaw memoria setup \
  --mode cloud \
  --api-url https://api.thememoria.ai \
  --api-key sk-YOUR_API_KEY
```
验证连接是否成功：
```
openclaw memoria health
```
看到 `"status": "ok"` 即表示成功。

![2.png](/content/zh/memoria-openclaw-install/2.png)

### 选项 B：粘贴到 OpenClaw 对话框

![3.png](/content/zh/memoria-openclaw-install/3.png)

复制下面的提示，将 `sk-YOUR_API_KEY` 替换为你的实际密钥后，直接发送给 OpenClaw。Agent 将运行所有步骤并汇报结果。
```
Install the Memoria memory plugin for my OpenClaw in cloud mode.
Credentials (pre-filled from my Memoria account):
- API URL: https://api.thememoria.ai
- API Key: sk-YOUR_API_KEY
Run these steps in order. Stop and report if any step fails.
1) Install plugin:
   openclaw plugins install @matrixorigin/thememoria
2) Setup cloud backend(this also enables the plugin):
   openclaw memoria setup --mode cloud --api-url https://api.thememoria.ai --api-key sk-YOUR_API_KEY
3) Verify:
   openclaw memoria health
   Expected: "status": "ok"
4) After all steps pass, tell the user:
   "Memoria is installed and healthy. To use memory tools(memory_store, memory_search, etc.), start a new conversation by typing /new — the tools won't appear in this conversation."
Rules:
- Show every command you run and its full raw output
- Do not summarize or hide errors
- If a step fails, classify the error(network / auth / config / missing-binary)and suggest the exact fix command
- Do not skip steps or reorder them
- Do NOT use `openclaw memory` commands — those are built-in file memory, not Memoria. The plugin uses `openclaw memoria`
- Do NOT attempt to use memory_store or other memory tools in this conversation
```
如有步骤失败，Agent 会自动分类错误并给出精确的修复方案——无需手动排查。

## 第 3 步 — 验证是否生效
在任何 OpenClaw 对话中，输入：
```
List my memoria memories
```
如果 Memoria 已成功连接，Agent 会调用记忆工具并返回当前记忆数量（首次使用显示空列表是正常的）。

![4.png](/content/zh/memoria-openclaw-install/4.png)

如果列表为空，前往 Memoria Playground 存入几条记忆——比如你的名字、常用编程语言或当前项目。再回来问 Agent，你会看到它精准召回你存入的内容，确认端到端连接完全正常。

## 就这么简单
一条命令，更智能的检索。
告别 Token 浪费，告别上下文丢失，
告别每次会话都要重新交代背景。

