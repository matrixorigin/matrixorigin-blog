---
title: "MatrixOne Git4Data 技术详解（十三）·Agent 篇：可回滚的记忆——当写数据的是 Agent 自己"
author: MatrixOrigin
description: "Git4Data 系列（十三），Agent 篇：前十二篇改数据的都是人，从这里开始写数据的是 Agent 自己，而且写下即刻生效。开源项目 Memoria 已经在 MatrixOne 上把这件事做成了产品，本文把它底下那一层摊开：记忆写入先进分支，审计矛盾、低置信与无溯源三类问题，矛盾以标记过期而非覆盖来化解，合并后 DIFF 给出净变更；一次污染 5000 条的会话用一条 RESTORE 归零。SQL 在 MatrixOne 4.1.0 上实测。"
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

# MatrixOne Git4Data 技术详解（十三）·Agent 篇：可回滚的记忆——当写数据的是 Agent 自己

前十二篇，我们把 MatrixOne 的 Git4Data 能力一路带过了[数据运维](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/git4data-part7-write-audit-publish-zh/index.md)、[传统机器学习](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/git4data-part8-ml-lifecycle-zh/index.md)、[深度学习的文件型数据](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/git4data-part10-multimodal-zh/index.md)，以及大模型的 [SFT](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/git4data-part11-sft-curation-zh/index.md) 和 [RLHF 偏好数据](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/git4data-part12-rlhf-preference-zh/index.md)。

从这一篇起，进入最后一档：**Agent**。这一档和前面所有篇章有一个根本区别——

> 前面十二篇里，**改数据的都是人**：工程师跑 ETL、标注员打标签、评审员改判、curator 下刀。哪怕节奏再快，中间总有一个人在按回车。
>
> 到了 Agent 这里，**写数据的是 Agent 自己**——它一边和用户对话，一边把"学到的东西"写进自己的长期记忆，全程没有人审。

这一篇讲的就是这份记忆：它为什么特别危险，以及怎么让它变得可审计、可回滚。

而且这一篇有一个前面十二篇都没有的便利：**这件事已经有人在 MatrixOne 上做成了产品**——开源项目 [Memoria](https://github.com/matrixorigin/Memoria)。所以本文不只是"可以这么设计"，而是可以直接对照一个真实在跑的系统，看它把哪些判断做进了产品、哪些留给了使用者。

> 文中 SQL 全部在 MatrixOne `4.1.0` 上实测，且使用确定性表达式（无 `rand()`），每个数字可逐次复现；可跑版本见 [git4data-tutorial 的 `13-agent-memory/agent_memory_demo.sql`](https://github.com/matrixorigin/git4data-tutorial/blob/354b9cff424cafb50d0b58128e78cc36970fe211/13-agent-memory/agent_memory_demo.sql)（已固定到具体 commit）。

---

## Agent 记忆和训练数据，是两种东西

先厘清概念。一个有长期记忆的 Agent，记忆里存的是它**关于世界的事实**：

```text
cust_1042 · preferred_channel · email        （这个客户偏好邮件联系）
cust_1042 · plan_tier         · pro          （他是 pro 套餐）
cust_1042 · open_issue        · ticket_8821  （有一个未结工单）
```

它和训练数据有三个关键差别，每一个都让它更危险：

| | 训练数据 | Agent 记忆 |
|---|---|---|
| **谁写的** | 人（工程师 / 标注员） | **Agent 自己**，对话中即时写入 |
| **什么时候生效** | 下一次训练时 | **下一秒**——它被立刻读进下一轮对话 |
| **写错了怎样** | 下一版训练前还能修 | **立刻在线上生效**，而且会一直生效下去 |

第三行是重点。训练数据写错了，你还有一整个 curation 环节可以拦（[第十一篇](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/git4data-part11-sft-curation-zh/index.md)讲的就是这个）。**Agent 记忆写错了，它就是一个正在生效的线上故障**——而且比普通故障更隐蔽，因为它不会报错，只会让 Agent 在之后每一次对话里，都带着这个错误的"认知"去回答。

---

## 一个真实会发生的故障：一句误解，污染半年

某个客服 Agent 在一次对话里，把用户的一句反话理解成了字面意思，于是写下：

```text
cust_1042 · preferred_channel · 不要联系我
```

这条记忆此后被每一次对话读取。用户下次来咨询，Agent 表现得异常冷淡、拒绝主动跟进——因为它"记得"这个人不想被联系。

等到几个月后有人终于发现问题，麻烦的地方在于：

1. **这条记忆是什么时候写的？** 不知道，记忆表里只有当前值。
2. **是哪一次对话写的？** 不知道，没有溯源字段。
3. **同一次对话还写了别的什么？** 不知道，无从批量排查。
4. **能不能把那次对话写的全部撤销？** 不能，它们和几十万条正常记忆混在一起。

这四个问题，正好对应 Git4Data 能力的四件事：**溯源、审计、回滚、DIFF**。

---

## 先看真实世界：Memoria 已经在 MatrixOne 上把这件事做成了产品

在拆 SQL 之前，先把参照系立起来。

[**Memoria**](https://github.com/matrixorigin/Memoria) 是一个开源（Apache 2.0）的 Agent 记忆项目，**完全构建在 MatrixOne 之上**。它以 MCP Server 的形式运行，任何支持 MCP 协议的 Agent——Cursor、Claude Code、Kiro、OpenClaw——都可以直接连上去，不需要定制集成（[一分钟接入教程](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/start-agent-memoria-zh/index.md)）。本文用 SQL 演示的每一个动作，在 Memoria 那里都已经是一个 Agent 能直接调用的工具，或者一个用户能在界面上点的按钮。

**为什么一个 Agent 记忆项目会长在数据库上？** [《为什么我用 Rust 重写了 Memoria》](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/rust-memoria-agent-zh/index.md)里讲了这条路径：Memoria 最初是为 MatrixOne 的向量检索**自动调优**做的记忆层，后来才发现「数据库调优要记住哪些策略有效」和「coding agent 要记住你的项目是怎么回事」，在抽象层面是同一个问题——**都是跨会话持久化、需要语义检索、并且需要版本管理的记忆**。而这三件事，MatrixOne 恰好在同一套引擎里都有：向量索引、全文检索，以及本系列一直在讲的 CoW 版本能力。

### Agent 看到的是工具，不是 SQL

接上 Memoria 之后，Agent 侧能直接调用的是这样一组工具（remote 模式实测）：

```text
memory_store       写入一条记忆
memory_retrieve    按当前任务检索相关记忆（向量 + 全文混合）
memory_search      显式检索
memory_correct     原地更正一条已有记忆      ← 不是盲目追加
memory_purge       清理（例如会话结束时清掉工作记忆）
memory_governance  治理
memory_consolidate 整合
memory_reflect     反思
memory_feedback    反馈
memory_profile / memory_list
```

`memory_correct` 值得单独看一眼。**它的存在本身就是一个判断**：新事实和旧事实冲突时，正确的动作不是再追加一条，而是更正——否则记忆库里会同时躺着两个互相矛盾的"事实"，Agent 每次检索到哪一条全看运气。这正是本文后面 `status = 'superseded'` 那一段要解决的问题。

而 [《为什么 AI Agent 的记忆不能只靠一个 Markdown 文件》](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/markdown-agent-memoria-zh/index.md)里那条更根本的结论，也值得在这里重述一遍：OWASP 2026 Agentic Top 10 把**记忆与上下文投毒**列为顶级威胁，而它推荐的全部缓解措施——来源追踪、信任评分、过期策略、完整性快照——**没有一项能在纯文本文件上实现**。这一篇接下来做的每一件事，都是在给这几项措施找一个落得下去的地方。

### 记忆分型，和"记坏了怎么办"

Memoria 把记忆分型管理：`profile` 是长期偏好（该一直留着），工作记忆是任务作用域的（会话结束就该 purge），还有目标追踪类的记忆。**不同类型的生命周期不一样**——这也解释了本文后面那条边界：不是每条记忆都值得走审计流程。

而"记忆被写坏了怎么办"，Memoria 直接做成了产品功能：[备份与恢复](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/memoria-backup-restore-zh/index.md)——在任意时间点对记忆打快照，出问题一键恢复。它底下就是 MatrixOne 的即时快照和时间点回滚，也就是本文第三步的 `CREATE SNAPSHOT` / `RESTORE`。

一张表对应起来：

| Memoria 这一层（产品/工具） | 本文这一层（SQL） | MatrixOne 提供的底层能力 |
|---|---|---|
| Agent 写入先隔离，审计后才生效 | `DATA BRANCH CREATE TABLE` → 审计 → `MERGE` | 零拷贝分支 |
| 矛盾检测 / 低置信隔离（memory-hygiene） | 审计三查 + `status = 'superseded'` | 行级版本语义 |
| `memory_correct` 原地更正 | `UPDATE … SET status = 'superseded'` | 行级更新 + 历史保留 |
| 「这一轮到底记了什么」 | `DATA BRANCH DIFF … OUTPUT SUMMARY` | 分支 DIFF |
| 备份与恢复（快照 / 一键还原） | `CREATE SNAPSHOT` / `RESTORE TABLE` | 即时快照 + 时间点回滚 |
| 按当前任务检索相关记忆 | （本文不展开） | 向量索引 + 全文检索 |

**本文接下来做的，就是把中间那一列摊开**：同一套动作不走工具调用，直接用 SQL 写一遍——这样每一步到底动了哪些行、留下了什么审计记录，都能看得见。

![Memoria 与本文这套 SQL 的分层关系：上层是 Cursor / Claude Code / Kiro / OpenClaw 等 Agent 通过 MCP 接入，中层是 Memoria 暴露的记忆工具（store / retrieve / correct / purge / governance）与记忆分型和备份恢复，底层是 MatrixOne 的 CoW 存储引擎提供零拷贝分支、即时快照、行级 DIFF、MERGE 与时间点回滚，以及同一套引擎内的向量索引和全文检索；本文用 SQL 直接操作的就是最底下这一层](./images/fig_memoria-stack_zh.svg)

---

## 贯穿全文的案例：一个客服 Agent 的记忆库

记忆就是一张表。注意除了事实本身，还有三列**溯源信息**——它们是这一篇的关键：

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

`source_run` 和 `written_at` 这两列，就把开头那两个"不知道"直接消灭了。而 `status` 这一列体现了一个重要设计选择：**记忆更新不是覆盖，而是把旧事实标记为 superseded**——历史被保留下来，而不是被抹掉。

案例规模：8,000 个客户 × 5 个属性 = **40,000 条已积累的记忆**。

---

## 第一步：Agent 的记忆写入，先进分支

这是整篇的核心动作。**不要让 Agent 直接写主记忆库**，先写进一条分支：

```sql
DATA BRANCH CREATE TABLE memory_staging FROM agent_memory;
-- 这一轮会话（run_9001）提议写入 3,000 条新记忆
INSERT INTO memory_staging SELECT ... ;

DATA BRANCH DIFF memory_staging AGAINST agent_memory OUTPUT SUMMARY;
--   实测 INSERTED 3000 —— 这一轮"想记住"什么，一目了然
```

这就是[第七篇 Write-Audit-Publish](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/git4data-part7-write-audit-publish-zh/index.md) 用在 Agent 记忆上：**先写、再审、通过才发布**。区别只是这次的"写"方是 Agent。

---

## 第二步：审计 Agent 想记住的东西

真实 Agent 会话产生的问题，主要是这三类：

### 矛盾：新事实和已有的活跃事实打架

```sql
SELECT COUNT(*) AS contradictions
FROM memory_staging s
JOIN agent_memory m ON s.subject_key = m.subject_key AND s.fact_key = m.fact_key
WHERE s.mem_id >= 500000 AND m.status = 'active' AND s.fact_value <> m.fact_value;
--   实测 300
```

### 低置信：Agent 其实是在猜

```sql
SELECT COUNT(*) AS low_confidence FROM memory_staging
WHERE mem_id >= 500000 AND confidence < 0.5;
--   实测 428
```

### 无溯源：写了，但不知道是哪次运行写的

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

**矛盾不该被当成错误删掉**。人是会变的：客户真的可能改了偏好。矛盾的正确处理是**新旧并存、旧的标记为过期**——这样既让 Agent 用上最新认知，又保留了"它曾经这么认为过"的历史。只有当你需要排查"Agent 为什么在三月份那样回答"时，才会明白这段历史有多值钱。

审计后的审计记录和合并：

```sql
DATA BRANCH DIFF memory_staging AGAINST agent_memory OUTPUT SUMMARY;
--   实测 INSERTED 2469 / UPDATED 206
--   （3000 条提议里，531 条因低置信或无溯源被拒；206 条旧事实被标记过期）

DATA BRANCH MERGE memory_staging INTO agent_memory;
--   实测记忆库 40,000 → 42,469；其中 active 42,263、superseded 206
```

![Agent 记忆全流程：40,000 条事实的记忆库不动，会话 run_9001 在分支上提议 3,000 条；审计出矛盾 300（标记 superseded）、低置信 428 与无溯源 120（拒绝）；合并后 DIFF 审计记录 INSERTED 2469 / UPDATED 206，记忆库到 42,469；run_9002 污染 5,000 条后一条 RESTORE 归零；溯源列让「谁在什么时候写了什么」都可查](./images/fig_agent-memory_zh.svg)

---

## 第三步：当一次会话把记忆写坏了

审计能挡住大部分问题，但挡不住全部——比如一次批量导入的误读。这时需要的是**回滚**。

先在已知良好的状态打一个快照（这应该是记忆库的日常操作，就像数据库备份）：

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

### 还有一种更常见、也更难查的坏法：渐进漂移

上面这个 5,000 条被覆盖成垃圾值的例子，是**显性事故**——有明确的一次运行、有明确的损失面，DIFF 一下就看见了。

但 Memoria [备份与恢复那篇](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/memoria-backup-restore-zh/index.md)描述的是另一种形态，而且在真实使用里更常见：**渐进漂移**。没有哪一次对话明显出错——一次把话题带偏的临时任务、一个你随手试的提示词、一段你几乎记不起的会话——Agent 只是像往常一样把发生的一切都记住了。等你察觉到"它不太对劲"的时候，那个你精心调教出来的状态早就不在了，而且**你指不出是哪一次对话搞坏的**。

这种坏法为什么必须靠版本能力解决：你打开记忆列表，面对成百上千条记录逐条排查，删多了丢掉真正重要的，删少了问题依旧——**你不是在修复，只是在猜**。而"回到一个已知良好的快照"是确定的：它不需要你先定位病因。

所以对长期运行的 Agent，快照不该只在出事时才想起来，而应该是**在每个你满意的状态上都存一个档**：

```sql
CREATE SNAPSHOT mem_v2 FOR TABLE agent_mem agent_memory;   -- 调教到满意，先存档
-- 然后放心去试新的工作流 / 新的提示词策略
```

这也正是 Memoria 把它做成产品功能的原因：**知道自己随时能回退，才敢让 Agent 去学新东西**。

---

## 第四步：开头那四个问题，现在都能回答了

有了溯源列和版本，开头那个"一句误解污染半年"的场景，排查路径变成这样：

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

---

## 边界与适用范围

- **记忆审计不是内容审核。** 置信度门槛、矛盾如何裁决、什么算"不该记住的信息"，都是你的策略。Git4Data 能力保证的是：这些策略作用在可控的分支上、每次写入有据可查、错了能退回。

- **不是每条记忆都值得走分支。** 高频、低风险的记忆（比如会话内的临时上下文）走分支反而累赘。**值得上这套流程的是长期记忆**——那些会被反复读取、影响后续所有交互的事实。

- **superseded 会累积。** 保留历史是有存储成本的，需要给过期事实设定清理或归档策略，否则记忆表会持续膨胀。

- **合规删除要穿透历史。** 如果用户要求删除个人数据，只删 active 行是不够的——superseded 的历史行和保留中的快照里都可能还有，这需要专门的处理流程（[第八篇](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/git4data-part8-ml-lifecycle-zh/index.md)提过同类问题）。

- **产品化之后，判断仍然在你这边。** Memoria 把分支、审计、快照、恢复都收成了工具和界面，但"什么该被记住""置信门槛卡在哪""这条矛盾算改主意还是算误解"——这些仍然是策略层的决定。**底层能力负责让决定可执行、可追溯、可撤销，不负责替你做决定。**

---

## 结语

Agent 记忆是这个系列里第一份**由机器自己写入、并立刻生效**的数据。它没有训练数据那样的缓冲期——写下的一瞬间就开始影响线上行为，而且会一直影响下去。

把记忆写入放进"分支 → 审计 → 合并"的流程，再配上溯源列和定期快照之后，它就从一个黑盒变成了可管理的东西：**3,000 条提议里 531 条被挡在门外、300 条矛盾以"新旧并存"的方式化解、5,000 条被污染的记忆一条语句回滚归零**；而"这条记忆是谁在什么时候写的、那次会话还写了什么"，从此都是一条 SQL 的事。

这一篇也是整个系列里唯一一次，我们能指着一个正在跑的产品说"就是这么用的"：[Memoria](https://github.com/matrixorigin/Memoria) 把上面这套动作包成了 Agent 能调的工具和用户能点的按钮，底下正是 MatrixOne 的分支、快照与回滚。**Git for Data 这套能力的价值，在 Agent 这一档上第一次不再是"给数据团队用"，而是直接变成了终端产品的一个功能。**

---

## 延伸阅读

- [为什么 AI Agent 的记忆不能只靠一个 Markdown 文件？](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/markdown-agent-memoria-zh/index.md) —— 静态文件做记忆的三个结构性缺陷，以及记忆投毒的安全面
- [为什么我用 Rust 重写了 Memoria](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/rust-memoria-agent-zh/index.md) —— Memoria 为什么长在 MatrixOne 上，以及它的架构演进
- [Memoria 备份与恢复功能上线](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/memoria-backup-restore-zh/index.md) —— 记忆快照在产品里长什么样
- [1 分钟快速上手：将你的编程智能体接入 Memoria](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/start-agent-memoria-zh/index.md)
- [为什么 AI Agent 需要 Memory？](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/ai-agent-memory-zh/index.md)

> 📎 可运行 SQL（固定 commit `354b9cf`）：[github.com/matrixorigin/git4data-tutorial](https://github.com/matrixorigin/git4data-tutorial/blob/354b9cff424cafb50d0b58128e78cc36970fe211) ｜ Memoria 开源仓库：[github.com/matrixorigin/Memoria](https://github.com/matrixorigin/Memoria) ｜ 源码与社区：[github.com/matrixorigin/matrixone](https://github.com/matrixorigin/matrixone)
