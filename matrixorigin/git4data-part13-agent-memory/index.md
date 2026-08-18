---
title: "MatrixOne Git4Data Deep Dive (Part 13) · Agents — Memory: From the Industry's Approaches to Governable Long-Term Memory"
author: MatrixOrigin
mail: contact@matrixorigin.io
description: "Agent memory isn't a longer context window — it's the state layer that lets an agent keep working across tasks. This piece starts from what memory is, surveys the industry's approaches (prompt files, summarisation, vector retrieval, structured stores, platform built-ins), then shows how MatrixOne combines structured data, hybrid retrieval, and the branching, DIFF, snapshots and rollback of its Git4Data capability into long-term memory that is retrievable, auditable and recoverable."
tags: ["Technical Insights"]
keywords: ["Agent Memory", "AI Agent", "MatrixOne", "Memoria", "Git4Data", "Vector Search", "Data Versioning", "Rollback", "Provenance"]
publishTime: "2026-07-25T17:00:00+08:00"
date: '2026-07-25'
image:
  "1": "/content/zh/shared/tech.png"
  "235": "/content/zh/shared/tech.png"
lang: en
status: published
translations:
  zh: git4data-part13-agent-memory-zh
---

# MatrixOne Git4Data Deep Dive (Part 13) · Agents — Memory: From the Industry's Approaches to Governable Long-Term Memory

Across the first twelve parts of the Git4Data series we covered data operations, machine-learning datasets, multimodal data, SFT and RLHF. The scenarios kept changing, but one thing never did: **a human decided to change the data, made the change, and checked the result.**

With agents, that boundary starts to dissolve.

An agent can discover a fact mid-conversation, form a judgment, and write both into its own long-term state. Once written, there is no retraining and no waiting for the next release; it may read that information seconds later and answer a question or call a tool based on it.

That leaves data versioning facing a new class of data: **the writer is an agent, the reader is an agent, and the moment something is written it can change the agent's subsequent behaviour.**

Start with an ordinary scenario.

A coding agent gets three things done today: it confirms the project standardises on pnpm, it discovers a legacy compatibility constraint in the auth module, and it decides the next step is migrating the database connection layer.

Reopen the session tomorrow and it recommends npm again, walks into the same compatibility problem, and has no idea how far the migration got.

The model didn't suddenly get worse. What's missing is a layer that persists, retrieves and updates state across sessions: **Memory**.

Memory is often read as "save the chat log," which falls well short. A usable agent memory doesn't only retain information — it has to answer a harder set of questions: what is worth remembering, when should it be retrieved, how does stale information get updated, how are contradictory memories handled, can a bad write be undone, and when several agents share a memory pool, how do you trace who wrote what.

So as the Git4Data series enters the agent tier, the first question isn't "which tools can an agent call." It's more basic than that: **how should an agent's memory be stored, and how can it change safely?**

This article starts from what memory is and what it does, then surveys the industry's main approaches, and finally covers why MatrixOne suits agent memory — and what its Git4Data capability (branching, DIFF, snapshots and rollback) brings to long-term memory.

> The example SQL is verified on MatrixOne `4.1.0`. The full script lives in [git4data-tutorial](https://github.com/matrixorigin/git4data-tutorial/blob/354b9cff424cafb50d0b58128e78cc36970fe211/13-agent-memory/agent_memory_demo.sql).

---

## 1. What memory is: an agent's long-term state layer

For an agent, memory is information that **persists across sessions and can be retrieved, updated or forgotten in future tasks**. It isn't one fixed data structure; it's a state mechanism that runs continuously.

The common categories look roughly like this:

| Type | What it records | Example | Lifecycle |
|---|---|---|---|
| Working memory | transient state of the current task | "debugging token expiry in the auth module" | cleared when the task ends |
| Semantic memory | relatively stable facts and knowledge | "the server runs Go 1.22" | long-lived, updated as facts change |
| Episodic memory | things that happened | "the last migration was rolled back over an old driver" | archivable, compressible, summarisable |
| Procedural memory | reusable ways of doing things | "run integration tests before a canary deploy" | long-lived, replaceable by a new process |
| User profile | preferences, permissions, interaction habits | "this user prefers concise answers" | long-lived, but must be viewable and deletable |

This table isn't a theoretical taxonomy. As we'll see later, **modelling these categories as explicit types with their own lifecycles** is one of the most practical differences between a production-grade memory system and "one big file."

Memory is also easy to confuse with three other things.

### Memory is not the context window

The context window is what the model can see in **this one inference pass**. It's bounded, and it doesn't naturally cross sessions. Memory persists outside the model, and relevant parts are fed into the context when needed.

### Memory is not training data

Training data changes model parameters through training or fine-tuning — slow and expensive. Memory doesn't touch the weights; it supplies external state at inference time, so it can be written and take effect immediately, and can equally be updated or deleted.

### Memory isn't a RAG knowledge base either

RAG generally helps a model look things up in documents, code or a knowledge base. Memory is more about the state the agent forms **while working**: user preferences, task progress, past decisions, what succeeded and what failed. The two share retrieval techniques, but differ in where the data comes from, how often it changes, and what governance it needs.

More precisely, agent memory isn't a storage box — it's a full chain:

> capture → decide whether it's worth remembering → structure or summarise → retrieve → use → update, merge or forget → audit and recover

Doing only "store" and "search" is not yet a reliable memory.

---

## 2. How much memory matters for an agent

Memory's value isn't only that the agent "understands you better." It directly determines whether an agent can graduate from a one-shot Q&A tool into a system that works continuously.

### 1. It lets tasks outlive the context window and the session

Complex coding, research, operations or customer-service tasks rarely finish in one session. Memory retains goals, intermediate results, approaches already tried and problems still open, so the agent continues in a new session instead of rebuilding context from scratch.

### 2. It avoids repeated exploration and accumulates reusable experience

If an agent remembers which approach failed in this project and why, it repeats fewer dead ends. Over time the system accumulates not just facts but ways of working that are effective for this particular user, project and environment.

### 3. It supports personalisation and consistency

If preferences, business constraints and team conventions have to be restated in every prompt, behaviour won't be stable. Memory keeps them in force across tasks, while still letting users view, correct and delete them.

### 4. It lets several agents share state

When coding, testing, research and operations agents work together, shared memory removes a lot of context shuttling. But sharing raises new governance questions: who wrote this fact, should other agents trust it, and which tasks has it already influenced?

### 5. Precise recall also buys back context budget

This gets treated as a side benefit, but it's quantifiable. Without memory, the usual way to maintain continuity is to inject the whole history into the context — and **that injection snowballs with the number of turns**. Here's a comparison we ran on Memoria:

| | Turn 1 | Turn 3 | Turn 5 | Turn 10 |
|---|---|---|---|---|
| Inject the full history | 500 | 1,900 | 4,200 | **10,000+** |
| Retrieve on demand (3–5 relevant memories per turn) | 500 | 800 | 900 | **~2,500** |

The difference isn't only the bill. Every irrelevant token in the window dilutes the model's attention on the relevant ones, so **retrieving what should be retrieved and nothing else improves cost and quality at the same time.**

### 6. Memory also amplifies mistakes

A misunderstanding in the context usually disappears when the session ends. A misunderstanding in long-term memory can be retrieved repeatedly for months, shaping answers and actions the whole time.

So memory amplifies both capability and risk. The more autonomous the agent, the longer memory is kept and the wider it's shared, the more auditing and recovery matter. OWASP already lists persistent memory and context poisoning among the significant risks for agentic systems: [Memory & Context Poisoning](https://genai.owasp.org/2025/12/09/owasp-top-10-for-agentic-applications-the-benchmark-for-agentic-security-in-the-age-of-autonomous-ai/).

---

## 3. How the industry builds agent memory

No single memory design fits every scenario today. Practice falls into roughly the following categories, which solve problems at different levels.

### 1. Prompt and Markdown files

The typical examples are `AGENTS.md`, `CLAUDE.md` and various rules files. They're transparent, easy to edit, and travel with the code in Git — a good fit for **slow-changing guardrails** like coding conventions, common commands and architectural principles. Claude Code's own documentation frames project rules and user preferences as the main use of file-based memory: [Manage Claude's memory](https://docs.anthropic.com/en/docs/claude-code/memory).

The limits are just as clear: the content generally needs manual upkeep; dynamic facts go stale; once the file grows, it's load-everything or split-by-hand; and data with different lifecycles and permissions can't be managed independently.

So Markdown isn't the "wrong answer" — it suits static rules, and it isn't suited to carrying continuously changing long-term memory on its own.

### 2. Conversation history and automatic summarisation

Keep recent messages in the window and compress earlier ones into a summary. This is the most common form of short-term memory: simple to implement, good at maintaining continuity within one task.

But summarisation is lossy compression. As a session stretches, early details, causal links and a handful of critical constraints get dropped; and it doesn't support precise queries, selective updates or cross-user isolation.

### 3. Vector stores and RAG

Chunk and embed past conversations, notes and experience, then retrieve by semantic relevance. This avoids loading everything and is an effective way to handle large volumes of unstructured memory.

But similarity only answers "which passage looks relevant." It doesn't natively answer "which is the current fact," "do these two memories conflict," "who wrote this," or "can this write be undone." If the store only appends and never updates, the old conclusion and the new one can both come back.

### 4. Structured databases or knowledge graphs

Model users, projects, entities, relations, time and provenance explicitly, and you get precise filtering, conflict checks, permission control and analytics. Knowledge graphs are especially good at complex relations.

The cost is designing the schema, entity resolution and update strategy — and structured storage alone doesn't solve semantic retrieval or version governance.

### 5. Dedicated memory frameworks and platform built-ins

Memory frameworks like Letta combine resident memory blocks, files and searchable archival memory, and let the agent manage them through tools: [Letta Context Hierarchy](https://docs.letta.com/guides/core-concepts/memory/context-hierarchy). GitHub Copilot Memory stores repository facts and user preferences, validates the code references behind a repository fact before using it, and expires memories that go unvalidated: [About GitHub Copilot Memory](https://docs.github.com/en/copilot/concepts/agents/copilot-memory).

These lower the cost of adoption, and they show the industry moving from "store more text" toward "validate, update and govern memory." Their limits are platform binding, the scope of data control, and how customisable the governance policy is.

### These approaches aren't mutually exclusive

Production systems usually layer them:

- static conventions in Markdown;
- current task state in short-term working memory;
- documents and past events recalled by vector search;
- users, projects, provenance and validity in structured storage;
- versioning, auditing and recovery handled by the data infrastructure.

The real question isn't "file or vector store." It's whether the full memory lifecycle is covered.

---

## 4. What production-grade memory requires

Once agents start writing long-term memory on their own, at least seven capabilities are needed:

1. **Persistence** — state that survives across sessions and processes.
2. **Relevance retrieval** — combining semantic similarity, keywords, entities, time, type and permissions to return what the current task actually needs.
3. **Typing and lifecycle** — working memory can expire automatically, stable rules persist, old decisions get superseded by new ones.
4. **Provenance and time** — knowing which user, agent or task wrote what, and when.
5. **Conflict and update** — detecting duplicate, stale and contradictory memories while keeping the history that matters.
6. **Write isolation and audit** — high-risk writes land in an isolated area first, and take effect only after the scope of change is confirmed.
7. **Versioning and recovery** — after a bad write, bulk poisoning or gradual drift, being able to return to a known-good state.

Classic vector retrieval mainly addresses #2. Schema plus application logic can cover part of #3, #4 and #5. But #6 and #7 require the underlying data system itself to be versioned.

That's precisely where MatrixOne's Git4Data capability comes in.

---

## 5. What building memory on MatrixOne brings

[Memoria](https://thememoria.ai) is the open-source agent-memory project we built on MatrixOne (Apache-2.0, [GitHub](https://github.com/matrixorigin/Memoria)). The premise behind it is simple:

> Git made code safe to change. We wanted memory to be the same.

It exposes tools to agents over MCP — `memory_store`, `memory_retrieve`, `memory_correct`, `memory_purge`, `memory_snapshot`, `memory_branch`, `memory_diff`, `memory_rollback` and others. Agents use memory tools rather than touching the database; MatrixOne supplies the unified data and version layer underneath:

```text
Your agent                      Memoria                MatrixOne 4.1.0
Kiro / Cursor /    ──MCP──▶    MCP Server   ─────▶    storage engine
Claude Code /      REST        typing / retrieval     branch · DIFF · MERGE
Codex / OpenClaw   stdio·SSE   governance / snapshots snapshot (CoW) · rollback
```

Adoption is tool-agnostic: Kiro, Cursor, Claude Code and Codex have ready-made configurations, OpenClaw has a plugin, and custom agents go through MCP or the REST API. **Switch models or switch agent tools, and memory doesn't have to migrate with them.**

The points below are the practical differences that come from building on MatrixOne.

### 1. One copy of the data, serving both precise queries and hybrid retrieval

Agent memory usually contains both structured fields and natural-language content. MatrixOne provides relational queries, vector search and full-text search in the same engine, so "semantically relevant" can be combined with "belongs to this project, created by this user, still within its validity window" — without maintaining two copies of state across a relational database and a vector store. MatrixOne's documentation lists the built-in vector, full-text and Git for Data capabilities: [MatrixOne Documentation](https://docs.matrixorigin.cn/).

Hybrid retrieval fixes a classic failure of pure keyword matching: the memory says "black formatter" and the user asks about a "code formatting tool" — keywords miss, semantics find it. Conversely, exact project names, paths and version numbers need full-text search as a backstop. **Having both available over the same data is what lets you avoid choosing between recall and precision.**

### 2. Memory types aren't labels — they're different lifecycles

In Memoria we implemented the table from section 1 as six explicit types: `semantic`, `profile`, `procedural`, `working`, `tool_result`, `episodic`. Type isn't just a filter field — it determines **how long the memory should live**: `working` memory should be cleared when the task ends, `profile` should persist and remain viewable and deletable by the user, and `semantic` gets superseded as facts change.

This is exactly what a Markdown file can't do: everything in one file shares one lifecycle, and you can't make three of its lines expire on their own.

### 3. Autonomous governance: contradiction detection, low-confidence quarantine, deduplication

A memory store that only grows degrades in retrieval quality over time, so we built contradiction detection, low-confidence quarantine and automatic deduplication into Memoria. That pipeline is **purpose-built rather than LLM-driven**, which is a deliberate trade-off: if governance runs every memory through a model, it stops being viable at scale.

### 4. Scale: past a certain line, retrieval is a database problem

A memory store won't stay at a few hundred rows. A personal assistant may sit at a few hundred indefinitely, but a memory pool shared by a team, or a support agent that has run for six months, reaches hundreds of thousands or millions before long.

There's a structural boundary here: **once memory crosses the line from "fits in the context" to "must be indexed," what it needs is a real retrieval engine, not a bigger file.** Index build and update, filter pushdown, query concurrency, the memory-versus-disk trade-off — these are problems databases have spent decades on, and they aren't things you patch in at the application layer.

MatrixOne's vector search supports GPU acceleration, which raises the ceiling on that path further. **The usable capacity range and the speedup depend on hardware, index type and parameters, data distribution and query shape, so this article won't quote a number detached from those conditions** — when you need to evaluate it, measure in your own environment.

### 5. The Git4Data capability makes memory changes isolatable, comparable and recoverable

This is where MatrixOne differs most from an ordinary "database + vector index" stack: memory isn't only stored and searched — it can be branched, diffed, merged and restored like code. The `snapshot → branch → diff → merge → rollback` chain is native to the storage engine rather than assembled at the application layer.

**Two semantics need separating here**, because their costs are quite different (this describes **MatrixOne 4.1.0**):

- **A snapshot (`CREATE SNAPSHOT`)** uses storage-layer copy-on-write: it freezes a point in time without copying data, and its cost grows with how much changes afterwards.
- **A branch (`DATA BRANCH CREATE TABLE`)** goes through the clone path in 4.1.0: it copies at **data-object granularity** — it doesn't rewrite row data, and the work scales with object count rather than row count, but it does **create a new table and carry storage overhead**, which grows further as the two sides diverge.

So a branch is far lighter than `SELECT INTO` a copy of the table, but it **isn't a free pointer flip**. Opening branches at scale in production needs capacity planning — which is why there's a separate section below on when a branch is worth it.

The boundary needs stating clearly:

- `confidence`, `source_run`, memory types and conflict rules are **the model and policy of Memoria or your application**;
- branch, DIFF, merge, snapshot and restore are **the underlying mechanism MatrixOne provides through its Git4Data capability**.

That capability doesn't decide for the agent what deserves remembering. It guarantees that the process of deciding has an isolated area, a record of what changed, and a way back.

### 6. Seen alongside the other options

Set against several common approaches, it looks like this — with the caveat that this compares each option's **default path**, not the full extent of any product's capability:

| Capability | Memoria | Mem0 | Letta | Markdown file |
|---|---|---|---|---|
| Version control (snapshot / branch / rollback) | **native to the storage engine** | none | Git version control | none |
| Isolated experiments (branch sandbox) | **user-facing, one click** | none | in-agent worktree | none |
| Full audit trail | **every change traceable** | limited logs | Git commit history | none |
| Semantic search | vector + full-text hybrid | vector + graph + KV | filesystem navigation | keywords only |
| Autonomous governance | purpose-built pipeline (no LLM overhead) | LLM-driven automation | Git merge + tidy-up | none |
| Structured memory types | **6 types + lifecycles** | flat KV | plain text blocks | unstructured text |
| Token efficiency | on-demand recall (3–5 memories) | on-demand recall | on-demand recall | whole file injected |
| Multi-agent sharing | **shared pool per user** | isolated per agent | isolated per agent | copy files by hand |

The most notable part is the first three rows: **semantic retrieval is something every option does; what actually separates them is versioning, isolation and auditing** — and those three aren't things a memory layer can supply by itself. They depend on whether the underlying data system supports them natively.

![How Memoria and this article's SQL stack up: agents such as Cursor, Claude Code, Kiro, Codex and OpenClaw connect over MCP or REST; Memoria in the middle exposes memory tools (store / retrieve / correct / purge / snapshot / branch / diff / rollback) plus six memory types and autonomous governance; underneath, MatrixOne 4.1.0's storage engine provides object-granularity branches, copy-on-write instant snapshots, row-level DIFF, MERGE and point-in-time rollback, with vector indexing and full-text search in the same engine](./images/fig_memoria-stack_en.svg)

---

## 6. How the Git4Data capability makes agent memory safer

The full flow, using a support agent's long-term memory store.

### 1. First, add the application-level governance fields

```sql
CREATE TABLE agent_memory (
    mem_id      BIGINT PRIMARY KEY,
    subject_key VARCHAR(64),
    fact_key    VARCHAR(64),
    fact_value  VARCHAR(256),
    confidence  DOUBLE,
    source_run  VARCHAR(32),
    written_at  DATETIME,
    status      VARCHAR(16)     -- active / superseded
);
```

`source_run` and `written_at` provide provenance, `confidence` supports risk policy, and `status` preserves the history of a fact being superseded. These fields belong to the memory application's design.

### 2. The agent writes to a branch, not to the main store

Say the main store already holds 40,000 facts, and run `run_9001` is about to write 3,000 new memories:

```sql
DATA BRANCH CREATE TABLE memory_staging FROM agent_memory;

INSERT INTO memory_staging SELECT ...;

DATA BRANCH DIFF memory_staging AGAINST agent_memory OUTPUT SUMMARY;
-- INSERTED 3000
```

The branch is a write space isolated from the main memory. The agent writes first; the mainline stays unchanged until the review passes.

### 3. Run the governance policy on the branch

In the example data, the audit finds:

- 300 new facts conflict with existing active facts;
- 428 fall below the confidence threshold;
- 120 have no provenance.

Low-confidence and untraceable memories are rejected. For conflicts, the old fact isn't deleted — per business policy it's marked `superseded`, preserving the history of what the agent believed at a given point in time.

```sql
DELETE FROM memory_staging
WHERE mem_id >= 500000
  AND (confidence < 0.5 OR source_run IS NULL);

UPDATE memory_staging m
SET status = 'superseded'
WHERE m.mem_id < 500000
  AND m.status = 'active'
  AND EXISTS (
      SELECT 1
      FROM memory_staging s
      WHERE s.mem_id >= 500000
        AND s.subject_key = m.subject_key
        AND s.fact_key = m.fact_key
        AND s.fact_value <> m.fact_value
  );
```

Worth restating: **the conflict rules are defined by the application; the Git4Data capability makes them run on an isolated branch.**

### 4. Read the net change with DIFF, then merge

```sql
DATA BRANCH DIFF memory_staging AGAINST agent_memory OUTPUT SUMMARY;
-- INSERTED 2469 / UPDATED 206

DATA BRANCH MERGE memory_staging INTO agent_memory;
-- 40,000 -> 42,469
```

What DIFF gives you isn't a vague "write succeeded" log — it's the actual change about to happen on the mainline. It can feed automatic rules, or route into human approval for high-risk cases.

### 5. Use snapshots for bulk poisoning and gradual drift

Snapshot at a known-good state:

```sql
CREATE SNAPSHOT mem_v1 FOR TABLE agent_mem agent_memory;
```

If a later run poisons 5,000 memories, assess the impact with DIFF first, then restore:

```sql
DATA BRANCH DIFF agent_memory
AGAINST agent_memory {SNAPSHOT='mem_v1'}
OUTPUT SUMMARY;
-- UPDATED 5000

RESTORE TABLE agent_mem.agent_memory {SNAPSHOT = mem_v1};
```

Rollback isn't only for the obvious incident where one run clearly broke 5,000 rows. It's also for the much harder case of gradual drift: the agent learns something slightly wrong each time, behaviour starts diverging weeks later, and there's no single failing session to point at. Returning to a known-good version is more reliable than guessing, row by row, which memory to delete.

Put the other way round, **being able to roll back changes how you work**: knowing you can always return to a known-good state is what makes it safe to let the agent try a new workflow or a new prompting strategy. We treat that as a value in its own right: branches and snapshots aren't only for firefighting, they make experiments affordable.

![The agent-memory flow: the 40,000-fact store never moves while session run_9001 proposes 3,000 memories on a branch; the audit finds 300 contradictions (marked superseded), 428 low-confidence and 120 untraceable (both rejected); after merging, DIFF records INSERTED 2469 / UPDATED 206 and the store reaches 42,469; when run_9002 poisons 5,000 facts a single RESTORE returns it to zero; and the provenance columns make "who wrote what, when" queryable](./images/fig_agent-memory_en.svg)

### What the Git4Data capability changes

| The problem before | With the Git4Data capability |
|---|---|
| an agent's write hits main memory immediately | write to a branch, merge after review |
| no idea what a given run actually changed | read the net change with DIFF |
| bulk poisoning can only be cleaned row by row | snapshot and RESTORE to a known version |
| new policies can only be tried live | try them on an isolated branch, merge on success |
| multi-agent writes are hard to reconstruct | application provenance fields + data versions form the audit chain |

So the Git4Data capability's value for memory isn't "smarter retrieval." It's that **memory can change safely.**

---

## 7. Where this fits

### A good fit

- **Long-running coding, research and operations agents** — tasks span sessions and need decisions, progress and experience preserved.
- **Support, sales and personal assistants** — user preferences and history keep shaping later interactions, and a bad memory has lasting effects.
- **Multi-agent systems** — several writers share memory and need provenance, permissions, conflict handling and a common recovery point.
- **Production systems where agents write autonomously** — nobody can review row by row, so the blast radius of a bad write has to be bounded.
- **Industries with audit, compliance or data-sovereignty requirements** — you must be able to explain why the agent answered or acted a certain way at a certain time.
- **Teams experimenting with different agent strategies** — let different branches accumulate different memories, compare the results, then decide whether to merge. A step further is "train one agent, fork its memory to every teammate": the way of working one senior engineer tuned can be copied to the rest of the team.

### Not a fit

- **One-off, short tasks** — context that's unused after the session ends is fine with a summary or working memory.
- **Slow-changing static conventions** — coding style, directory rules and safety guardrails are more transparent in Markdown.
- **A single person, a single agent, very little data** — when a human can inspect and fix all of the memory directly, a full governance flow may not pay for itself.
- **Read-only knowledge Q&A** — if the agent only retrieves human-maintained documents and never modifies the knowledge base, ordinary RAG already covers most of it.

The pragmatic architecture is layered: Markdown for static guardrails, a short-term buffer for the current task, vector and full-text search for recall, structured tables for state and permissions, and MatrixOne's Git4Data capability for versioning and recovery of high-value long-term memory.

---

## Closing

Agent memory is, fundamentally, a layer of state the agent maintains outside the model. It determines whether an agent can carry a task across sessions, accumulate experience, stay personalised, and collaborate with other agents.

The industry has produced several paths: Markdown suits transparent static rules, summarisation suits short-term continuity, vector retrieval suits large-scale semantic recall, structured databases suit state and relations, and dedicated platforms package these into tools an agent can call. Once things reach production, the question moves on from "how to remember" to "how to update, audit, isolate and recover."

MatrixOne's contribution is putting structured data, vector and full-text retrieval, and the Git4Data versioning capability in one system. Memoria handles memory types, extraction, retrieval and governance policy on top; MatrixOne provides branching, DIFF, merge, snapshots and rollback underneath through Git4Data.

It doesn't decide for the agent what the truth is. It does make every memory change bounded, recorded and reversible.

For agents that run for a long time, keep learning, and write their own state, that isn't a nice-to-have. It's the infrastructure that takes them from "able to remember" to "able to be trusted."
