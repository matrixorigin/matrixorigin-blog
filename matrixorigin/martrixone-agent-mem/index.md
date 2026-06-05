---
title: "Released at GTC 2026: Memoria, the Industry's First \"Git for Memory\" Trusted Memory Framework for Agents"
author: MatrixOrigin
description: >-
  Today's AI Agents are generally stateless, while early Markdown-file-based memory approaches remain static and one-way. Built on the MCP protocol with MatrixOne as its foundation, Memoria brings Git-style version control concepts into memory management, enabling snapshots, branches, merges, and more. It also provides security protection and capability improvements, aiming to become the core memory management tool of the Agent era.
tags:
  - Technical Insights
keywords:
  - Memory Framework
  - memoria
  - Agent
  - memory
publishTime: '2026-03-17T17:00:00+08:00'
image:
  '1': /images/blog-covers/technical.png
  '235': /images/blog-covers/technical.png
date: '2026-03-17T17:00:00+08:00'
lang: en
status: published
translations:
  zh: martrixone-agent-mem-zh
---

# Released at GTC 2026: Memoria, the Industry's First "Git for Memory" Trusted Memory Framework for Agents

As AI Agents such as OpenClaw and Cursor enter daily application workflows at scale, memory management is becoming the final constraint preventing Agents from becoming real production tools. Today, on the stage of NVIDIA GTC, the global AI technology conference, MatrixOrigin CEO Wang Long officially announced the open source release of MatrixOrigin's core Agent Memory project: **Memoria**.
https://github.com/matrixorigin/Memoria.

As the industry's first trusted Agent memory framework to introduce the concept of "Git for Memory," Memoria is not just about enabling Agents to remember. Through the Copy-on-Write technology of the underlying MatrixOne database, it makes AI memory traceable, manageable, and trustworthy.

![1.png](./images/1.png)

## **Stage 1: Agents with No Memory at All**

In 2026, AI coding assistants such as Cursor, Claude Code, and Kiro have become everyday tools for millions of developers. They can understand code, generate solutions, and refactor architectures. But every time you close the conversation window, everything resets to zero. In the next conversation, the Agent does not know which framework you use, what your code style is, or what decisions you made together last week. You tell it twenty times, and it will ask again tomorrow. This is not a bug in any single product. It is an architectural flaw across the industry.

**The vast majority of AI Agents today are essentially stateless.** Every conversation starts as a blank sheet. The Agent does not know who you are, what your project looks like, or what consensus you have previously reached. All it can do is respond as intelligently as possible within the current conversation window.

What does this mean?

- **The cost of repeated communication is enormous.** Every new session requires context to be rebuilt. Your preferences, project conventions, and technology choices all have to be explained again, or patched through manually maintained configuration files.

- **Knowledge cannot accumulate.** Everything the Agent learns in one conversation is lost in the next. Last week it helped you refactor the auth module; this week it remembers none of it.

- **The depth of collaboration is limited.** An Agent without memory can only execute one-off tasks. It cannot become a long-term collaborator that truly understands your project.

This is the reality most developers face today. Every new conversation is a relationship that starts from zero.

## Stage 2: Basic Memory Through Markdown Files

The industry has not ignored this problem.

`.cursorrules`, `CLAUDE.md`, Kiro steering files, and community projects such as OpenClaw all follow the same idea: **write what the Agent needs to know into Markdown files, place them in the project, and let the Agent read them every time it starts.**

This is much better than having no memory at all. At least the Agent knows which framework you use, what code style you follow, and what the basic project structure is. OpenClaw goes a step further by providing a community-driven rule library, allowing developers to share and reuse these configurations.

But Markdown memory has several fundamental limitations:

- **It is static.** These files are essentially documents you write manually. You write them once and rarely update them. They cannot automatically capture decisions that evolve during development, such as switching from black to ruff last Tuesday, refactoring the auth module into session tokens, or changing deployment scripts after migrating to Kubernetes. These changes are not automatically reflected in your rule files.
- **It is one-way.** Agents can only read these files; they cannot write to them. They cannot persist new information learned during conversations. If you tell an Agent today, "We decided to replace PostgreSQL with SQLite," that decision disappears tomorrow unless you manually update the file.
- **It is unstructured.** A Markdown file may mix code style, architecture decisions, deployment processes, and personal preferences. As a project evolves, this file grows longer and harder to maintain, eventually becoming something nobody wants to update.
- **It cannot be rolled back.** If updating a rule file causes the Agent's behavior to deteriorate, there is no simple way to return to the previous state.

Markdown memory is an important step forward, but it is fundamentally **manually maintained static configuration**, not a true Agent memory system.

## Stage 3: Memoria, Giving Agents Real Memory

**Agents with memory and Agents without memory offer two completely different experiences.**

An Agent with memory knows that you prefer tabs over spaces, that your project uses Zustand's slice pattern, and that last week you decided to switch the database from PostgreSQL to SQLite. It knows these things not because you wrote them in a configuration file, but because it learned them in conversation and automatically remembered them.

It can make more accurate judgments based on past context because it has history. It does not need you to repeat yourself because it remembers. More importantly, these memories are dynamic, manageable, and rollbackable.

That is what Memoria is designed to do.

#### Memoria: Managing Agent Memory Like Code

Memoria is an open source Agent memory server. It can seamlessly integrate with Cursor, Claude Code, Kiro, and many mainstream AI tools to provide persistent memory across sessions for Agents. Memoria also provides an OpenClaw plugin, making it easy to connect to the many OpenClaw Agents already in use.

But Memoria is not just adding a database to Agents.

There are already several Agent memory solutions on the market, including Mem0, Letta, and Zep. Each has its strengths, but they share one common limitation: **once memory is written, it is difficult to manage safely.**

Imagine this scenario: over the past two weeks, your Agent has accumulated a large amount of project memory through conversations. Then you start a large-scale refactoring experiment, and the Agent's memory is updated along with it. The experiment fails, and you want to return to the previous state, but the Agent's memory has already been overwritten. What should you do?

In traditional memory systems, you can only manually search, delete, or modify items one by one. This is neither safe nor reliable.

**Memoria's core innovation is bringing Git's version control concepts into Agent memory management.**

Just as developers use Git to manage code, Memoria lets you:

- **Snapshot:** Save memory state before critical operations and roll back to any historical point at any time
- **Branch:** Run experiments in an isolated environment without affecting mainline memory
- **Merge:** Merge branch memory back into the mainline after an experiment succeeds
- **Diff:** Preview changes before merging, just like a code Pull Request
- **Rollback:** When something goes wrong, restore the previous clean state with one action

This is not a metaphor. It is real, operable version control applied to every piece of Agent memory.

#### Why Version Control Is Crucial for Agent Memory

This is not merely a matter of making management more convenient. Two important studies from 2025 revealed deeper reasons:

##### Security: Agent Memory Can Be Quietly Poisoned

Multiple academic papers, including MemoryGraft, MINJA, and A-MemGuard, have shown that attackers can inject malicious content into an Agent's long-term memory through indirect prompt injection, simply by having the Agent read a carefully crafted document. Contaminated memory can persist across sessions and gradually change Agent behavior, while users may be completely unaware.

Most memory systems have no effective answer to this. Memoria's snapshot and rollback mechanism provides a deterministic recovery path: once an anomaly is found, restore directly to the last known clean state.

##### Effectiveness: Git Operations Significantly Improve Agent Capabilities

The Git-Context-Controller paper (Wu, 2025) shows that introducing commit, branch, and merge operations into Agent context management increased the SWE-Bench task resolution rate by 13 percentage points to 80.2%. Ablation experiments confirmed that branch and merge were the final sources of key improvement. Agents with branching capability spontaneously developed more structured exploration strategies.

Memoria extends the same principle from temporary context to persistent memory, creating a complementary and necessary layer.

#### Memoria vs. Other Memory Solutions: Core Differences

|              | Memoria                               | Mem0                        | Letta                         | Zep/Graphiti           |
| ------------ | ------------------------------------- | --------------------------- | ----------------------------- | ---------------------- |
| Positioning  | Version-controlled memory for coding Agents | General AI application memory | Built-in memory for Agent frameworks | Knowledge graph memory |
| Core capability | Snapshots, branches, merges, rollbacks | Append/update               | Hierarchical storage          | Temporal graph         |
| Version control | Full Git-style operations          | Timestamps only             | None                          | Bitemporal tracking    |
| Storage architecture | Single database (MatrixOne)   | 24+ backends                | PostgreSQL + vector database  | Neo4j                  |
| Integration method | Open protocol, plug and play    | SDK/API                     | Framework-bound               | SDK/API                |

#### Technical Architecture

```
┌──────────────────┐            ┌──────────────────────────┐            ┌──────────────┐
│                  │            │                          │            │              │
│   AI Agent Layer │  Memory    │     Memoria Server       │            │  MatrixOne   │
│                  │  storage/  │                          │  SQL +     │   Database   │
│  · Cursor        │◄─────────►│  · Normalized storage     │  vector +  │              │
│  · Claude Code   │ retrieval  │  · Semantic retrieval     │  full-text │  · Structured data │
│  · Kiro          │            │  · Git-for-Data engine    │◄─────────►│  · Vector search    │
│  · OpenClaw      │            │  · Self-governance        │            │  · Full-text search │
│  · ...           │            │    (governance/consolidation/reflection) │ · CoW engine │
│                  │            │                          │            │              │
└──────────────────┘            └──────────────────────────┘            └──────────────┘
```

Memoria is powered by the MatrixOne database, a unified database that supports structured data, vector search, and full-text search at the same time. This means you do not need to stitch together multiple infrastructure components. One database solves all of these problems.

Version control capabilities come from MatrixOne's Copy-on-Write storage engine, which natively supports zero-copy snapshots and branch isolation at the database layer. Branching a memory space containing thousands of memory entries takes only milliseconds and consumes no additional storage until actual changes are made.

Memory retrieval uses a hybrid vector and full-text search strategy, scoring results based on both relevance and recency. The embedding model runs locally by default and also supports external services such as OpenAI and Ollama.

The system also includes three self-governance tools that run automatically on a regular basis:

- **Memory governance**: isolates low-confidence memories and cleans up expired data
- **Memory consolidation**: detects contradictory information and repairs data consistency
- **Memory reflection**: synthesizes high-level insights from memory clusters

## Open Source and Community-Oriented

Memoria is now fully open source on GitHub. With simple configuration, you can give trusted memory capabilities to mainstream tools such as Cursor, Claude Code, Kiro, and OpenClaw.

We hope Memoria can become the Git of the Agent era. Git guards changes in code, while Memoria carries the cognitive growth and decision evolution of Agents.

Project address: https://github.com/matrixorigin/Memoria
