---
title: "MatrixOne Git4Data 技术详解（十三）·Agent 篇：Agent 的记忆该存在哪里——从 Markdown 文件到可回滚的数据库"
author: MatrixOrigin
description: "Git4Data 系列（十三），Agent 篇：先讲清楚 Agent 记忆是什么、它为什么决定了 Agent 能不能完成长任务，再看行业里几种做法各自卡在哪——Markdown 会无声腐化、向量库只会追加、框架缓冲活不过一次会话、平台记忆绑死单个工具。然后是生产级记忆需要的六件事，以及 Git4Data 能力解决了其中最难的三条：矛盾保留历史、版本与回滚、写入可溯源。以 MatrixOne 上的开源项目 Memoria 为参照，SQL 在 MatrixOne 4.1.0 上实测。"
tags: ["技术干货"]
keywords: ["Git4Data", "MatrixOne", "Memoria", "Agent", "AI Agent", "记忆", "数据版本", "回滚", "溯源"]
publishTime: "2026-07-25T17:00:00+08:00"
date: '2026-07-25'
image:
  "1": "/content/zh/shared/tech.png"
  "235": "/content/zh/shared/tech.png"
lang: zh
status: published
translations:
  en: git4data-part13-agent-memory
---

# MatrixOne Git4Data 技术详解（十三）·Agent 篇：Agent 的记忆该存在哪里——从 Markdown 文件到可回滚的数据库

前十二篇，我们把 MatrixOne 的 Git4Data 能力一路带过了[数据运维](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/git4data-part7-write-audit-publish-zh/index.md)、[传统机器学习](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/git4data-part8-ml-lifecycle-zh/index.md)、[深度学习的文件型数据](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/git4data-part10-multimodal-zh/index.md)，以及大模型的 [SFT](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/git4data-part11-sft-curation-zh/index.md) 和 [RLHF 偏好数据](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/git4data-part12-rlhf-preference-zh/index.md)。

从这一篇起，进入最后一档：**Agent**。而 Agent 这一档的第一个问题，也是最基础的一个：**它的记忆该存在哪里。**

这一篇会按这个顺序走：先说清楚 Agent 的「记忆」到底是什么、它对 Agent 的能力有多大影响；再看行业里现有的几种做法各自卡在哪；然后是生产级记忆真正需要的能力清单；最后才轮到本系列的主角——在 MatrixOne 上构建记忆能带来什么，Git4Data 这套能力具体解决了清单里的哪几条，以及什么场景适合、什么场景不必。

> 文中 SQL 全部在 MatrixOne `4.1.0` 上实测，且使用确定性表达式（无 `rand()`），每个数字可逐次复现；可跑版本见 [git4data-tutorial 的 `13-agent-memory/agent_memory_demo.sql`](https://github.com/matrixorigin/git4data-tutorial/blob/354b9cff424cafb50d0b58128e78cc36970fe211/13-agent-memory/agent_memory_demo.sql)（已固定到具体 commit）。

---

## 一、先说清楚：Agent 的「记忆」到底是什么

「记忆」这个词被用得很泛，先把它和三个容易混淆的东西分开。

**记忆不是上下文窗口。** 上下文窗口是这一次对话里模型能看见的内容，对话结束就没了；而记忆是**跨会话持久存在**的。你今天告诉 Agent「这个项目用 pnpm 不用 npm」，明天新开一个会话它还知道——这才叫记忆。

**记忆不是训练数据。** 训练数据改变的是模型的**权重**，要等下一次训练才生效；记忆改变的是模型每次推理时**读到的内容**，写下的一瞬间就生效。

**记忆也不完全等于 RAG 知识库。** 知识库存的是相对静态的资料（文档、手册、代码），主要是给模型"查资料"用的；而记忆存的是**关于你、关于这个项目、关于世界的事实**，而且它是**会变的**：偏好会改、决策会被推翻、状态会推进。

所以一条 Agent 记忆长这样——是一条**结构化的事实**，而不是一段文本：

```text
cust_1042 · preferred_channel · email        （这个客户偏好邮件联系）
cust_1042 · plan_tier         · pro          （他是 pro 套餐）
cust_1042 · open_issue        · ticket_8821  （有一个未结工单）
```

放在一起对比，三者的差别就很清楚了：

| | 训练数据 | 上下文窗口 | **Agent 记忆** |
|---|---|---|---|
| **谁写的** | 人（工程师 / 标注员） | 当前会话的输入 | **Agent 自己**，对话中即时写入 |
| **活多久** | 永久（进权重） | 一次会话 | **跨会话持久** |
| **什么时候生效** | 下一次训练 | 立刻，但只在本次会话 | **下一秒，且一直生效** |
| **写错了怎样** | 下一版训练前能修 | 关掉窗口就没了 | **立刻在线上生效，且会一直错下去** |

**最后一行是这一篇的起点。** 前面十二篇里，改数据的都是人——工程师跑 ETL、标注员打标签、评审员改判。到了 Agent 记忆这里，**写数据的是 Agent 自己，而且没有人审、写下即刻生效**。这是整个系列里第一份具有这个性质的数据。

---

## 二、记忆对 Agent 到底有多大作用

如果记忆只是"体验更顺手一点"，它值不上一整篇文章。真正的原因是：**它直接决定了 Agent 能不能完成长任务、能不能被信任。**

### 1. 没有记忆，长任务根本做不完

一次复杂的重构可能横跨好几个会话。Agent 崩了、上下文窗口满了、或者你只是合上了电脑——回来之后它**完全不知道之前在做什么、试过哪些方案、做过哪些决策**，只能从头开始。这不是体验问题，是**能力上限**问题。

更隐蔽的是[长会话里的静默失忆](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/markdown-agent-memoria-zh/index.md)：为了腾出空间，Agent 会压缩早期上下文。一个跑 6-Agent 生产系统的开发者记录过这个现象——Agent 无声地丢失指令、忘记改过哪些文件、重复三十分钟前做过的工作，**而且它们从不告诉你**。这是上下文窗口的物理限制，写更好的提示词修不了。

### 2. 多个 Agent 之间的上下文，本来是重复劳动

很多人会在 Cursor、Claude Code、Kiro 之间来回切换。每切一次，你就要把项目规范、偏好的库、架构决策**再讲一遍**。一个共享的记忆层意味着：Cursor 学到你换了 ruff，Claude Code 也知道。

### 3. 有验证的记忆能直接提升产出质量

这一点有公开数据：GitHub 的 Copilot Memory 不只是记，而是**记忆使用前先验证——检查被引用的代码是否还存在**，28 天没被验证的记忆自动过期。结果是 **PR 合并率提升了 7%**。Anthropic 给 Claude Code 加的 Auto Memory 也是同一个方向：Agent 自己记录构建命令、调试洞察和观察到的模式。

**两家头部产品都选择了超越静态文件——这件事本身就在说明问题。**

### 4. 按需检索能省出"注意力预算"

Anthropic 的上下文工程指南把这叫**注意力预算**问题：窗口里每一个无关 token 都在降低有关 token 的处理质量。如果记忆是全量加载的，你问 CSS 格式化的事，Agent 也得读一遍数据库迁移规则。**按需检索不只是省钱，它直接提升回答质量。**

---

## 三、行业里的几种做法，各自卡在哪

理清了价值，再看现在大家都是怎么做的。

### 做法一：静态 Markdown 文件（`.cursorrules` / `CLAUDE.md` / `AGENTS.md`）

最普遍，也确实有它对的地方：零基础设施、Git 管版本、团队共享、完全透明——打开文件就知道 Agent 的输入是什么。对于"用 TypeScript""pytest 写测试"这类**季度级才变一次**的稳定规则，Markdown 完全够用。

问题在于项目会演进，而静态、平坦、无状态的文本承载不了演进带来的复杂度。[《为什么 AI Agent 的记忆不能只靠一个 Markdown 文件》](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/markdown-agent-memoria-zh/index.md)里总结了三个结构性缺陷：

**① 单向读写，然后无声地腐化。** Agent 能读，但很难精准、逻辑自洽地写回去（放任模型自己改，文件很快就自相矛盾）。于是维护责任落回你身上——而在一个每天演进的项目里，你刚重构完目录、换了状态管理库、填完一个诡异的 API 坑之后，**有几次真的会切出去把它记下来？** 现实是想不起来。于是你把 `app/api/` 改名成 `app/routers/`，按旧路径写的规则就悄悄失效了：没有编译器报错，没有 Linter 警告，**文件只是安静地对 Agent 撒谎**。

**② 全量加载浪费注意力，而且越长越不稳定。** Anthropic 文档明确指出 `CLAUDE.md` 的实用上限约 200 行，超过之后模型对规则的遵守率显著下降。有开发者甚至发现，让长规则偶尔生效的偏方是在文件名里加 "very-important" 去触发注意力权重——这已经说明问题了。

**③ 长会话中被压缩掉。** 上面提过，物理限制。

### 做法二：向量库 + RAG

把历史对话和笔记切块、嵌入、检索。**解决了按需加载**，是相对做法一的明确进步。但它有自己的代价：切块和嵌入会**丢掉结构**——对话语料丢掉时序、说话人身份、跨会话关系；而且它天然是**只追加**的。Letta 团队的判断很准确：

> 追加原始体验是对"学习"的糟糕近似。人类会创建记忆，但也会精炼、整合、压缩它们。

一个只追加的向量库里，"我们用 PostgreSQL"和"测试用 SQLite"会**同时躺着**，检索到哪条全看相似度。

### 做法三：Agent 框架里的会话缓冲

用 LangChain、CrewAI 或原生 API 自建 Agent，记忆大概率是个 Python 列表，太长就裁剪。没有跨会话持久化、没有按需检索、没有结构、没有多用户隔离。原型够用，上生产不够。

### 做法四：平台内建的记忆

Claude Code 的 Auto Memory、GitHub 的 Copilot Memory 都属于这一类，而且做得不错（前面那个 +7% 就是证据）。局限在于它**绑定在单个工具里**——你换个 Agent，记忆不跟着走；而且治理策略是平台定的，你能调的空间有限。

### 顺便说一个大多数人还没想到的问题：安全

Markdown 格式的 Agent 文件不只是不可靠——**它可以被主动利用**。MemoryGraft 攻击用 README 作为注入向量，植入虚假的"成功经验"让 Agent 反复调用；Rules File Backdoor 攻击在 `.cursorrules` 里嵌入不可见的 unicode 字符，重定向代码生成引入漏洞。这些被污染的规则还会通过共享社区传播（仅 awesome-cursorrules 就有 33,000+ stars）。

OWASP 2026 Agentic Top 10 把**记忆与上下文投毒**列为顶级威胁。而它推荐的全部缓解措施——**来源追踪、信任评分、过期策略、完整性快照**——**在纯文本文件上一项都实现不了。**

### 放进一张表

| 做法 | 按需检索 | 结构与类型 | 矛盾治理 | 版本与回滚 | 跨 Agent 共享 | 来源可追溯 |
|---|---|---|---|---|---|---|
| Markdown 文件 | 否（全量加载） | 否（平坦文本） | 否 | 文件级（Git） | 是（同一仓库） | 否 |
| 向量库 + RAG | **是** | 弱（切块丢结构） | 否（只追加） | 否 | 看部署 | 弱 |
| 框架内会话缓冲 | 否 | 否 | 否 | 否 | 否 | 否 |
| 平台内建记忆 | **是** | 部分 | 部分 | 部分 | 否（绑定工具） | 部分 |
| **数据库 + 版本能力** | **是** | **是（行 + 类型）** | **是（SQL 可查）** | **行级 + 快照** | **是（独立服务）** | **是（溯源列）** |

---

## 四、那么，生产级的 Agent 记忆到底需要什么

从具体工具里抽身出来，问"生产级记忆要做到什么"，会浮出六个需求：

1. **人和 Agent 都能写。** 你设定护栏（静态规则），Agent 在工作中积累知识（动态记忆）。两条写入路径，一个共享存储。
2. **按需检索，不是全量加载。** 对话开始时只检索与**当前任务**相关的几条。
3. **有类型的记忆，不同的生命周期。** 用户偏好该长期保存；工作记忆（"正在调试 auth 模块"）任务结束就该过期；项目决策该持久但可被新决策覆盖。**平坦文件里这些生命周期没法独立管理。**
4. **矛盾检测和自治。** 存了"我们用 PostgreSQL"，后来又遇到"测试用 SQLite"——系统要能识别这种张力：同一个主题、不同结论——然后要么解决（不同上下文），要么标记让人决策。
5. **版本控制和回滚。** 每次记忆变更都有记录；重大重构前快照一下；Agent 学错了，回滚那条记忆；想试验不同方向，分支记忆，试完合并或丢弃。**这是应对记忆污染唯一可靠的防线。**
6. **跨 Agent 共享，带来源追踪。** 所有 Agent 读写同一个记忆池，但你需要知道**哪个 Agent 在什么时候写了什么**，才能审计和选择性信任。

**注意第 4、5、6 条。** 前三条本质上是"存储 + 检索"问题，向量库和结构化存储都能解决一部分。而后三条——**保留矛盾的历史、版本化与回滚、写入的来源可追溯**——恰恰是本系列讲了十二篇的那套能力。

---

## 五、Memoria：在 MatrixOne 上把这六条落地

这不是一个假想的架构。[**Memoria**](https://github.com/matrixorigin/Memoria) 是一个开源（Apache 2.0）的 Agent 记忆项目，**完全构建在 MatrixOne 之上**，以 MCP Server 形式运行——任何支持 MCP 的 Agent（Cursor、Claude Code、Kiro、OpenClaw）都能直接连上，不需要定制集成（[一分钟接入教程](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/start-agent-memoria-zh/index.md)）。

### 为什么一个 Agent 记忆项目会长在数据库上

[《为什么我用 Rust 重写了 Memoria》](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/rust-memoria-agent-zh/index.md)讲了这条路径：Memoria 最初是为 MatrixOne 的向量检索**自动调优**做的记忆层，后来才发现「数据库调优要记住哪些策略有效」和「coding agent 要记住你的项目是怎么回事」，在抽象层面是同一个问题——**都是跨会话持久化、需要语义检索、并且需要版本管理的记忆。**

而这三件事，MatrixOne 恰好在**同一套引擎**里都有：向量索引、全文检索，以及本系列一直在讲的 CoW 版本能力。**这是"长在数据库上"的实际好处：混合检索和版本能力作用在同一份数据上，不需要在两套系统之间搬运和对齐。** 第十篇讲多模态时我们不得不接受"文件归 lakeFS、元数据归 MatrixOne"的两个世界，而 Agent 记忆是结构化事实，它整个住在一张表里。

### Agent 看到的是工具，不是 SQL

接上之后，Agent 侧能直接调用的是这样一组工具（remote 模式实测）：

```text
memory_store       写入一条记忆
memory_retrieve    按当前任务检索相关记忆（向量 + 全文混合）   ← 对应需求 2
memory_search      显式检索
memory_correct     原地更正一条已有记忆                      ← 对应需求 4
memory_purge       清理（例如会话结束时清掉工作记忆）          ← 对应需求 3
memory_governance  治理
memory_consolidate 整合
memory_reflect     反思
memory_feedback    反馈
memory_profile / memory_list
```

`memory_correct` 值得单独看一眼。**它的存在本身就是一个判断**：新事实和旧事实冲突时，正确的动作不是再追加一条，而是更正——否则记忆库里会同时躺着两个互相矛盾的"事实"，Agent 检索到哪条全看运气。这正好是做法二（只追加的向量库）没解决的那个问题。

记忆分型也做进了产品：`profile` 是长期偏好，工作记忆是任务作用域的（会话结束 purge），还有目标追踪类的记忆——**对应需求 3。**

而"记忆被写坏了怎么办"，Memoria 直接做成了产品功能：[备份与恢复](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/memoria-backup-restore-zh/index.md)——任意时间点对记忆打快照，出问题一键恢复。**对应需求 5。**

![Memoria 与本文这套 SQL 的分层关系：上层是 Cursor / Claude Code / Kiro / OpenClaw 等 Agent 通过 MCP 接入，中层是 Memoria 暴露的记忆工具（store / retrieve / correct / purge / governance）与记忆分型和备份恢复，底层是 MatrixOne 的 CoW 存储引擎提供零拷贝分支、即时快照、行级 DIFF、MERGE 与时间点回滚，以及同一套引擎内的向量索引和全文检索；本文用 SQL 直接操作的就是最底下这一层](./images/fig_memoria-stack_zh.svg)

---

## 六、Git4Data 这套能力，具体解决了清单里的哪几条

上面六个需求里，需求 1、2、3 靠的是"数据库 + 混合检索 + 一点 schema 设计"。**真正需要 Git4Data 这套能力的是后三条**，而它们恰好也是最难的三条：

| 需求 | 难在哪 | MatrixOne 的 Git4Data 能力怎么解决 |
|---|---|---|
| **4. 矛盾检测与自治** | 矛盾不能一删了之（人是会变的），得让新旧并存、旧的标记过期 | **行级版本语义**：`UPDATE … status='superseded'`，历史被保留而不是被覆盖 |
| **5. 版本控制与回滚** | 记忆污染没有明确病因，逐条排查等于猜 | **即时快照 + `RESTORE`**：回到一个已知良好的版本，不需要先定位病因 |
| **6. 来源追踪与审计** | "这一轮 Agent 到底想记住什么"，事后无从还原 | **零拷贝分支 + `DATA BRANCH DIFF`**：写入先进分支，审计通过再合并，净变更有据可查 |

再加上一条上面清单里没写、但生产上一定会遇到的：**"这次写入到底改了什么"必须能在生效之前看到。** 这就是[第七篇 Write-Audit-Publish](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/git4data-part7-write-audit-publish-zh/index.md)那套流程，只不过这次的"写"方是 Agent。

下面这一节，就是把这三件事用 SQL 拆开跑一遍——看清楚每一步到底动了哪些行、留下了什么记录。

---

## 七、把它拆开看：一轮记忆写入的完整流程

### 先看一个真实会发生的故障

某个客服 Agent 在一次对话里，把用户的一句反话理解成了字面意思，于是写下：

```text
cust_1042 · preferred_channel · 不要联系我
```

这条记忆此后被每一次对话读取。用户下次来咨询，Agent 表现得异常冷淡、拒绝主动跟进——因为它"记得"这个人不想被联系。

几个月后有人终于发现，麻烦的地方在于：

1. **这条记忆是什么时候写的？** 不知道，记忆表里只有当前值。
2. **是哪一次对话写的？** 不知道，没有溯源字段。
3. **同一次对话还写了别的什么？** 不知道，无从批量排查。
4. **能不能把那次对话写的全部撤销？** 不能，它们和几十万条正常记忆混在一起。

这四个问题，正好对应 Git4Data 能力的四件事：**溯源、审计、回滚、DIFF**。

### 案例：一个客服 Agent 的记忆库

记忆就是一张表。注意除了事实本身，还有三列**溯源信息**：

```sql
CREATE TABLE agent_memory (
    mem_id      BIGINT PRIMARY KEY,
    subject_key VARCHAR(64),    -- 这条事实是关于谁的（如客户 ID）
    fact_key    VARCHAR(64),    -- 哪个属性（如 preferred_channel）
    fact_value  VARCHAR(256),
    confidence  DOUBLE,         -- 写下时 Agent 有多确信
    source_run  VARCHAR(32),    -- 哪一次运行写的  ← 溯源
    written_at  DATETIME,       -- 什么时候写的    ← 溯源
    status      VARCHAR(16)     -- active / superseded
);
```

`source_run` 和 `written_at` 这两列，直接消灭了上面前两个"不知道"。而 `status` 这一列体现了需求 4 的那个设计选择：**记忆更新不是覆盖，而是把旧事实标记为 superseded**——历史被保留下来，而不是被抹掉。

案例规模：8,000 个客户 × 5 个属性 = **40,000 条已积累的记忆**。

### 第一步：Agent 的记忆写入，先进分支

**不要让 Agent 直接写主记忆库**，先写进一条分支：

```sql
DATA BRANCH CREATE TABLE memory_staging FROM agent_memory;
-- 这一轮会话（run_9001）提议写入 3,000 条新记忆
INSERT INTO memory_staging SELECT ... ;

DATA BRANCH DIFF memory_staging AGAINST agent_memory OUTPUT SUMMARY;
--   实测 INSERTED 3000 —— 这一轮"想记住"什么，一目了然
```

**这一步就是需求 6 的落点**：在任何东西生效之前，"这次会话想往记忆里写什么"是一个可查的确定数字，而不是一个已经发生的事实。

### 第二步：审计 Agent 想记住的东西

真实 Agent 会话产生的问题，主要是这三类：

**矛盾：新事实和已有的活跃事实打架**

```sql
SELECT COUNT(*) AS contradictions
FROM memory_staging s
JOIN agent_memory m ON s.subject_key = m.subject_key AND s.fact_key = m.fact_key
WHERE s.mem_id >= 500000 AND m.status = 'active' AND s.fact_value <> m.fact_value;
--   实测 300
```

**低置信：Agent 其实是在猜**

```sql
SELECT COUNT(*) AS low_confidence FROM memory_staging
WHERE mem_id >= 500000 AND confidence < 0.5;
--   实测 428
```

**无溯源：写了，但不知道是哪次运行写的**

```sql
SELECT COUNT(*) AS untraceable FROM memory_staging
WHERE mem_id >= 500000 AND source_run IS NULL;
--   实测 120
```

**处理方式对三类不一样**，这一点值得强调：

```sql
-- 低置信 + 无溯源：直接拒绝，不进记忆
DELETE FROM memory_staging
WHERE mem_id >= 500000 AND (confidence < 0.5 OR source_run IS NULL);

-- 矛盾：不删新的，而是把旧事实标记为 superseded —— 保留历史，而不是静默覆盖
UPDATE memory_staging m SET status = 'superseded'
WHERE m.mem_id < 500000 AND m.status = 'active'
  AND EXISTS (SELECT 1 FROM memory_staging s
              WHERE s.mem_id >= 500000
                AND s.subject_key = m.subject_key AND s.fact_key = m.fact_key
                AND s.fact_value <> m.fact_value);
```

**矛盾不该被当成错误删掉**。人是会变的：客户真的可能改了偏好。矛盾的正确处理是**新旧并存、旧的标记为过期**——这样既让 Agent 用上最新认知，又保留了"它曾经这么认为过"的历史。只有当你需要排查"Agent 为什么在三月份那样回答"时，才会明白这段历史有多值钱。**这就是需求 4 说的"要么解决，要么标记"，落在行级版本语义上的样子。**

审计后的记录和合并：

```sql
DATA BRANCH DIFF memory_staging AGAINST agent_memory OUTPUT SUMMARY;
--   实测 INSERTED 2469 / UPDATED 206
--   （3000 条提议里，531 条因低置信或无溯源被拒；206 条旧事实被标记过期）

DATA BRANCH MERGE memory_staging INTO agent_memory;
--   实测记忆库 40,000 → 42,469；其中 active 42,263、superseded 206
```

![Agent 记忆全流程：40,000 条事实的记忆库不动，会话 run_9001 在分支上提议 3,000 条；审计出矛盾 300（标记 superseded）、低置信 428 与无溯源 120（拒绝）；合并后 DIFF 审计记录 INSERTED 2469 / UPDATED 206，记忆库到 42,469；run_9002 污染 5,000 条后一条 RESTORE 归零；溯源列让「谁在什么时候写了什么」都可查](./images/fig_agent-memory_zh.svg)

### 第三步：当一次会话把记忆写坏了

审计能挡住大部分问题，但挡不住全部——比如一次批量导入的误读。这时需要的是**回滚**，也就是需求 5。

先在已知良好的状态打一个快照：

```sql
CREATE SNAPSHOT mem_v1 FOR TABLE agent_mem agent_memory;
```

然后 `run_9002` 出了问题，把 5,000 条事实覆盖成了垃圾值：

```sql
-- 损失评估：相对已知良好版本，到底动了多少
DATA BRANCH DIFF agent_memory AGAINST agent_memory {SNAPSHOT='mem_v1'} OUTPUT SUMMARY;
--   实测 UPDATED 5000
SELECT COUNT(*) AS poisoned FROM agent_memory WHERE fact_value = 'GARBAGE';   -- 实测 5000
```

整库回滚，一条语句：

```sql
RESTORE TABLE agent_mem.agent_memory {SNAPSHOT = mem_v1};
SELECT COUNT(*) AS poisoned_after_restore FROM agent_memory WHERE fact_value = 'GARBAGE';   -- 实测 0
SELECT COUNT(*) AS memory_after_restore FROM agent_memory;                                  -- 实测 42469
```

这正是[第五篇误操作救援](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/git4data-part5-incident-rescue-zh/index.md)那套能力，用在 Agent 记忆上。差别在于：**普通数据事故是人造成的，频率低；Agent 记忆事故是机器造成的，可能每天都在小规模发生**——所以"能回滚"不是应急预案，而是日常基础设施。

**还有一种更常见、也更难查的坏法：渐进漂移。** 上面这个例子是**显性事故**——有明确的一次运行、明确的损失面，DIFF 一下就看见了。但 [Memoria 备份与恢复那篇](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/memoria-backup-restore-zh/index.md)描述的是另一种形态：没有哪一次对话明显出错——一次把话题带偏的临时任务、一个你随手试的提示词、一段你几乎记不起的会话——Agent 只是像往常一样把发生的一切都记住了。等你察觉到"它不太对劲"时，那个你精心调教出来的状态早就不在了，**而且你指不出是哪一次对话搞坏的**。

这正是为什么它必须靠版本能力解决：你打开记忆列表逐条排查，删多了丢掉真正重要的，删少了问题依旧——**你不是在修复，只是在猜**。而"回到一个已知良好的快照"是确定的，它不需要你先定位病因。

所以对长期运行的 Agent，快照不该只在出事时才想起来，而应该**在每个你满意的状态上都存一个档**：

```sql
CREATE SNAPSHOT mem_v2 FOR TABLE agent_mem agent_memory;   -- 调教到满意，先存档
-- 然后放心去试新的工作流 / 新的提示词策略
```

**知道自己随时能回退，才敢让 Agent 去学新东西**——这也是 Memoria 把它做成产品功能的原因。

### 第四步：开头那四个问题，现在都能回答了

```sql
-- 这一次运行到底写了多少条记忆？
SELECT source_run, COUNT(*) AS facts_written
FROM agent_memory WHERE source_run = 'run_9001' GROUP BY source_run;
--   实测 run_9001 / 2469

-- 三个月前那个版本的记忆里，这条事实是什么？
SELECT COUNT(*) AS facts_at_mem_v1 FROM agent_memory {SNAPSHOT='mem_v1'};
--   实测 42469
```

| 开头的问题 | 现在的答案 |
|---|---|
| 这条记忆什么时候写的？ | `written_at` |
| 哪一次对话写的？ | `source_run` |
| 那次对话还写了什么？ | `WHERE source_run = 'run_XXXX'`，一条 SQL 列全 |
| 能撤销那次对话的全部写入吗？ | 能——按 `source_run` 批量撤销，或整库 `RESTORE` |

**回过头看 OWASP 那四项缓解措施**——来源追踪、信任评分、过期策略、完整性快照——现在分别落在 `source_run`/`written_at`、`confidence` 门槛、`status='superseded'`、`CREATE SNAPSHOT` 上。**这就是"结构化记忆"相比纯文本文件的实际差别。**

---

## 八、什么场景该上这套，什么场景不必

这套流程不是免费的，说清楚它的适用边界比推销它更有用。

**值得上的：**

- **长期记忆，也就是会被反复读取、影响后续所有交互的事实。** 用户偏好、项目决策、领域知识——这些错一条就会一直错下去。
- **多个 Agent 或多个用户共享同一个记忆池。** 共享意味着你必须能回答"这条是谁写的"。
- **Agent 有自主写入权限的场景。** 只要没有人逐条审，就需要一个可回退的锚点。
- **需要审计和合规的场景。** 金融、医疗、客服——"Agent 三月份为什么那样回答"必须能查。

**不必上的：**

- **会话内的临时上下文。** 高频、低风险、用完就丢，走分支反而是累赘——这类该走 `memory_purge` 那条路，不该走审计流程。
- **单人、单 Agent、可随时手改的小项目。** 一个 `CLAUDE.md` 真的够用，别过度工程。
- **纯静态的规范和护栏。** 编码规范、架构原则这类季度级才变的东西，留在 Markdown 里当护栏，反而更透明。

**务实的做法是分层**：静态规则留在 Markdown 做护栏，动态知识交给带版本能力的记忆层，版本控制做安全网。

**还有几条要提前知道的代价：**

- **记忆审计不是内容审核。** 置信度门槛、矛盾如何裁决、什么算"不该记住的信息"，都是你的策略。Git4Data 能力保证的是：这些策略作用在可控的分支上、每次写入有据可查、错了能退回。
- **superseded 会累积。** 保留历史有存储成本，需要给过期事实设定清理或归档策略。
- **合规删除要穿透历史。** 用户要求删除个人数据时，只删 active 行不够——superseded 的历史行和保留中的快照里都可能还有，这需要专门的处理流程（[第八篇](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/git4data-part8-ml-lifecycle-zh/index.md)提过同类问题）。
- **产品化之后，判断仍然在你这边。** Memoria 把分支、审计、快照、恢复都收成了工具和界面，但"什么该被记住""置信门槛卡在哪""这条矛盾算改主意还是算误解"仍然是策略层的决定。**底层能力负责让决定可执行、可追溯、可撤销，不负责替你做决定。**

---

## 结语

Agent 的记忆决定了它能不能完成长任务、能不能被信任——但它同时也是这个系列里第一份**由机器自己写入、并立刻生效**的数据。没有训练数据那样的缓冲期，写下的一瞬间就开始影响线上行为。

行业已经趟过了几种做法：Markdown 文件透明但会无声腐化，向量库解决了检索却只会追加，框架内的缓冲活不过一次会话，平台内建的记忆又绑死在单个工具里。**它们缺的不是存储，是治理**——矛盾怎么裁、错了怎么退、谁写的怎么查。

把记忆放进"分支 → 审计 → 合并"的流程，配上溯源列和定期快照之后，这三件事就都有了答案：**3,000 条提议里 531 条被挡在门外、300 条矛盾以"新旧并存"的方式化解、5,000 条被污染的记忆一条语句回滚归零**；而"这条记忆是谁在什么时候写的、那次会话还写了什么"，从此都是一条 SQL 的事。

这一篇也是整个系列里唯一一次，我们能指着一个正在跑的产品说"就是这么用的"：[Memoria](https://github.com/matrixorigin/Memoria) 把上面这套动作包成了 Agent 能调的工具和用户能点的按钮，底下正是 MatrixOne 的分支、快照与回滚。**Git for Data 这套能力的价值，在 Agent 这一档上第一次不再是"给数据团队用"，而是直接变成了终端产品的一个功能。**

---

## 延伸阅读

- [为什么 AI Agent 需要 Memory？](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/ai-agent-memory-zh/index.md) —— 记忆让 AI 从"工具"变成"关系"
- [为什么 AI Agent 的记忆不能只靠一个 Markdown 文件？](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/markdown-agent-memoria-zh/index.md) —— 静态文件的三个结构性缺陷，以及记忆投毒的安全面
- [为什么我用 Rust 重写了 Memoria](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/rust-memoria-agent-zh/index.md) —— Memoria 为什么长在 MatrixOne 上，以及它的架构演进
- [Memoria 备份与恢复功能上线](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/memoria-backup-restore-zh/index.md) —— 记忆快照在产品里长什么样
- [1 分钟快速上手：将你的编程智能体接入 Memoria](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/start-agent-memoria-zh/index.md)

> 📎 可运行 SQL（固定 commit `354b9cf`）：[github.com/matrixorigin/git4data-tutorial](https://github.com/matrixorigin/git4data-tutorial/blob/354b9cff424cafb50d0b58128e78cc36970fe211) ｜ Memoria 开源仓库：[github.com/matrixorigin/Memoria](https://github.com/matrixorigin/Memoria) ｜ 源码与社区：[github.com/matrixorigin/matrixone](https://github.com/matrixorigin/matrixone)
