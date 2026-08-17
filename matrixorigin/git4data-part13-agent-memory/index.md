---
title: "MatrixOne Git4Data Deep Dive (Part 13) · Agents — Reversible Memory: When the Agent Writes the Data"
author: MatrixOrigin
mail: contact@matrixorigin.io
description: "Git4Data Part 13: in the first twelve parts a human changed the data; from here the agent writes it itself, effective instantly. Memoria — the open-source agent-memory MCP server built on MatrixOne — already ships this, and this part opens up the layer underneath: memory writes go to a branch, audited for contradictions, low confidence and missing provenance, merged with a DIFF; a session that poisoned 5,000 facts is undone by one RESTORE. Verified on MatrixOne 4.1.0."
tags: ["Technical Insights"]
keywords: ["Git4Data", "MatrixOne", "Memoria", "AI Agent", "Agent Memory", "Data Versioning", "Rollback", "Provenance"]
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

# MatrixOne Git4Data Deep Dive (Part 13) · Agents — Reversible Memory: When the Agent Writes the Data

Across the first twelve parts we took MatrixOne's Git4Data capability through [data operations](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/git4data-part7-write-audit-publish/index.md), [classical machine learning](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/git4data-part8-ml-lifecycle/index.md), [deep learning's file-based data](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/git4data-part10-multimodal/index.md), and large models' [SFT](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/git4data-part11-sft-curation/index.md) and [RLHF preference data](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/git4data-part12-rlhf-preference/index.md).

From here we enter the final tier: **agents**. And this tier differs from everything before it in one fundamental way —

> In the first twelve parts, **a human changed the data**: an engineer ran the ETL, an annotator applied labels, a reviewer overturned verdicts, a curator made the cuts. However fast the cadence, someone was pressing enter.
>
> With agents, **the agent writes the data itself** — while talking to a user, it writes what it "learned" into its own long-term memory, with nobody reviewing.

This part is about that memory: why it's uniquely dangerous, and how to make it auditable and reversible.

It also has an advantage the previous twelve parts didn't: **someone has already built this into a product on MatrixOne** — the open-source project [Memoria](https://github.com/matrixorigin/Memoria). So this isn't only "here's how you could design it." We can hold it against a system that actually runs, and see which judgments it made into product behaviour and which it left to the operator.

> All SQL is verified on MatrixOne `4.1.0` using deterministic expressions (no `rand()`), so every number reproduces run to run; the runnable version is [`13-agent-memory/agent_memory_demo.sql` in git4data-tutorial](https://github.com/matrixorigin/git4data-tutorial/blob/354b9cff424cafb50d0b58128e78cc36970fe211/13-agent-memory/agent_memory_demo.sql), pinned to a specific commit.

---

## Agent memory and training data are two different things

First, the concept. An agent with long-term memory stores **facts it believes about the world**:

```text
cust_1042 · preferred_channel · email        (this customer prefers email)
cust_1042 · plan_tier         · pro          (they're on the pro plan)
cust_1042 · open_issue        · ticket_8821  (they have an open ticket)
```

It differs from training data in three ways, each one making it more dangerous:

| | Training data | Agent memory |
|---|---|---|
| **Who writes it** | humans (engineers / annotators) | **the agent itself**, mid-conversation |
| **When it takes effect** | at the next training run | **the next second** — read straight into the next turn |
| **If it's wrong** | fixable before the next version | **it's live in production**, and stays live |

That third row is the point. Wrong training data still has an entire curation stage to catch it ([Part 11](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/git4data-part11-sft-curation/index.md) is exactly that). **Wrong agent memory is a production incident already in effect** — and a stealthier one than usual, because nothing errors out; the agent simply carries that mistaken "belief" into every conversation that follows.

---

## A failure that really happens: one misreading, six months of pollution

In one conversation, a support agent takes a user's sarcasm literally and writes:

```text
cust_1042 · preferred_channel · do not contact me
```

Every later conversation reads that memory. Next time the user gets in touch, the agent is oddly cold and refuses to follow up — because it "remembers" this person doesn't want contact.

When someone finally notices months later, the hard part is:

1. **When was this memory written?** Unknown — the table holds only the current value.
2. **Which conversation wrote it?** Unknown — there's no provenance field.
3. **What else did that conversation write?** Unknown — no way to sweep for it.
4. **Can we undo everything that conversation wrote?** No — it's mixed in with hundreds of thousands of good rows.

Those four questions map exactly onto four things the Git4Data capability provides: **provenance, audit, rollback, and DIFF**.

---

## First, the real world: Memoria already ships this on MatrixOne

Before taking the SQL apart, let's set the reference point.

[**Memoria**](https://github.com/matrixorigin/Memoria) is an open-source (Apache 2.0) agent-memory project, **built entirely on MatrixOne**. It runs as an MCP Server, so any MCP-capable agent — Cursor, Claude Code, Kiro, OpenClaw — connects to it directly, with no custom integration ([one-minute setup](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/start-agent-memoria/index.md)). Every action this article demonstrates in SQL is, over in Memoria, already a tool an agent can call or a button a user can click.

**Why does an agent-memory project grow on a database?** [Why I Rewrote Memoria in Rust](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/rust-memoria-agent/index.md) traces the path: Memoria started as the memory layer for MatrixOne's vector-search **auto-tuning**, and only later did it become clear that "remember which tuning strategies worked" and "remember how your project actually works" are the same problem in the abstract — **both are memory that persists across sessions, needs semantic retrieval, and needs version control**. MatrixOne happens to have all three in one engine: vector indexing, full-text search, and the CoW versioning this series has been about all along.

### The agent sees tools, not SQL

Once connected, the tools an agent can call look like this (measured in remote mode):

```text
memory_store       write a memory
memory_retrieve    retrieve what's relevant to the current task (hybrid vector + full-text)
memory_search      explicit search
memory_correct     correct an existing memory in place    <- not a blind append
memory_purge       clean up (e.g. drop working memory at session end)
memory_governance  governance
memory_consolidate consolidation
memory_reflect     reflection
memory_feedback    feedback
memory_profile / memory_list
```

`memory_correct` deserves a second look. **Its very existence is a judgment**: when a new fact contradicts an old one, the right move isn't to append another row but to correct — otherwise the store holds two mutually contradictory "facts" and which one the agent retrieves is luck. That's exactly the problem the `status = 'superseded'` section below solves.

And one deeper conclusion from [Why AI Agent Memory Cannot Rely on a Single Markdown File](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/markdown-agent-memoria/index.md) is worth restating here: the OWASP 2026 Agentic Top 10 lists **memory and context poisoning** as a top threat, and every mitigation it recommends — provenance tracking, trust scoring, expiry policies, integrity snapshots — **is impossible to implement on a plain text file**. Everything this part does from here is about giving those mitigations somewhere to land.

### Memory types, and what happens when memory goes bad

Memoria types its memory: `profile` holds long-lived preferences (keep them), working memory is task-scoped (purge it at session end), and there are goal-tracking memories too. **Different types, different lifecycles** — which is also why one of the boundaries below says not every memory deserves the audit flow.

And "what if the memory gets written badly" is a shipped product feature: [backup and restore](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/memoria-backup-restore/index.md) — snapshot the memory at any moment, restore in one click when something goes wrong. Underneath it is MatrixOne's instant snapshot and point-in-time rollback: the `CREATE SNAPSHOT` / `RESTORE` of step 3 below.

Lined up as a table:

| Memoria's layer (product / tools) | This article's layer (SQL) | The MatrixOne capability underneath |
|---|---|---|
| agent writes land in isolation, take effect only after audit | `DATA BRANCH CREATE TABLE` → audit → `MERGE` | zero-copy branch |
| contradiction detection / low-confidence quarantine (memory-hygiene) | the three audit checks + `status = 'superseded'` | row-level version semantics |
| `memory_correct` corrects in place | `UPDATE … SET status = 'superseded'` | row-level update with history kept |
| "what did this round actually remember" | `DATA BRANCH DIFF … OUTPUT SUMMARY` | branch DIFF |
| backup & restore (snapshot / one-click revert) | `CREATE SNAPSHOT` / `RESTORE TABLE` | instant snapshot + point-in-time rollback |
| retrieve what's relevant to the current task | (not covered here) | vector index + full-text search |

**What this article does from here is open up that middle column**: the same actions, driven straight in SQL instead of through tool calls — so you can see exactly which rows each step touched and what audit record it left.

![How Memoria and this article's SQL stack up: agents such as Cursor, Claude Code, Kiro and OpenClaw connect over MCP; Memoria in the middle exposes memory tools (store / retrieve / correct / purge / governance) plus memory typing and backup-and-restore; underneath, MatrixOne's CoW storage engine provides zero-copy branches, instant snapshots, row-level DIFF, MERGE and point-in-time rollback, with vector indexing and full-text search in the same engine — and the SQL in this article drives that bottom layer directly](./images/fig_memoria-stack_en.svg)

---

## The running case: a support agent's memory store

Memory is one table. Beyond the fact itself, note the three **provenance** columns — they're the key to this part:

```sql
CREATE TABLE agent_memory (
    mem_id      BIGINT PRIMARY KEY,
    subject_key VARCHAR(64),    -- who this fact is about (e.g. a customer id)
    fact_key    VARCHAR(64),    -- which attribute (e.g. preferred_channel)
    fact_value  VARCHAR(256),
    confidence  DOUBLE,         -- how sure the agent was when writing it
    source_run  VARCHAR(32),    -- which run wrote it   <- provenance
    written_at  DATETIME,       -- when it was written  <- provenance
    status      VARCHAR(16)     -- active / superseded
);
```

`source_run` and `written_at` kill the first two "unknowns" outright. And `status` encodes an important design choice: **a memory update doesn't overwrite — it marks the old fact superseded**, so history is preserved rather than erased.

Case scale: 8,000 customers × 5 attributes = **40,000 accumulated memory facts**.

---

## Step 1: the agent's memory writes go to a branch first

This is the core move. **Don't let the agent write straight into the memory store** — write to a branch:

```sql
DATA BRANCH CREATE TABLE memory_staging FROM agent_memory;
-- this session (run_9001) proposes 3,000 new memories
INSERT INTO memory_staging SELECT ... ;

DATA BRANCH DIFF memory_staging AGAINST agent_memory OUTPUT SUMMARY;
--   measured INSERTED 3000 — exactly what this session wants to remember
```

That's [Part 7's Write-Audit-Publish](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/git4data-part7-write-audit-publish/index.md) applied to agent memory: **write, audit, publish only on pass.** The only difference is that the writer is now the agent.

---

## Step 2: audit what the agent wants to remember

Real agent sessions produce three main kinds of problem:

### Contradictions: a new fact fights an existing active one

```sql
SELECT COUNT(*) AS contradictions
FROM memory_staging s
JOIN agent_memory m ON s.subject_key = m.subject_key AND s.fact_key = m.fact_key
WHERE s.mem_id >= 500000 AND m.status = 'active' AND s.fact_value <> m.fact_value;
--   measured 300
```

### Low confidence: the agent is really just guessing

```sql
SELECT COUNT(*) AS low_confidence FROM memory_staging
WHERE mem_id >= 500000 AND confidence < 0.5;
--   measured 428
```

### Untraceable: written, but with no record of which run wrote it

```sql
SELECT COUNT(*) AS untraceable FROM memory_staging
WHERE mem_id >= 500000 AND source_run IS NULL;
--   measured 120
```

**The three get handled differently**, and that's worth stressing:

```sql
-- low confidence + untraceable: rejected outright, never enter memory
DELETE FROM memory_staging
WHERE mem_id >= 500000 AND (confidence < 0.5 OR source_run IS NULL);

-- contradictions: don't delete the new fact — mark the OLD one superseded,
-- keeping history instead of silently overwriting
UPDATE memory_staging m SET status = 'superseded'
WHERE m.mem_id < 500000 AND m.status = 'active'
  AND EXISTS (SELECT 1 FROM memory_staging s
              WHERE s.mem_id >= 500000
                AND s.subject_key = m.subject_key AND s.fact_key = m.fact_key
                AND s.fact_value <> m.fact_value);
```

**A contradiction shouldn't be treated as an error and deleted.** People change: the customer really may have changed their preference. The right handling is **both facts coexist, the old one marked stale** — so the agent uses the latest belief while the record of "it once believed otherwise" survives. You only appreciate how valuable that history is when you have to investigate why the agent answered a certain way back in March.

The post-audit audit record, then the merge:

```sql
DATA BRANCH DIFF memory_staging AGAINST agent_memory OUTPUT SUMMARY;
--   measured INSERTED 2469 / UPDATED 206
--   (of 3,000 proposed, 531 rejected for low confidence or no provenance;
--    206 old facts marked superseded)

DATA BRANCH MERGE memory_staging INTO agent_memory;
--   measured memory 40,000 → 42,469; active 42,263, superseded 206
```

![The agent-memory flow: the 40,000-fact store never moves while session run_9001 proposes 3,000 facts on a branch; the audit finds 300 contradictions (marked superseded) plus 428 low-confidence and 120 untraceable (rejected); after merge the DIFF audit record reads INSERTED 2469 / UPDATED 206 and the store reaches 42,469; run_9002 poisons 5,000 facts and one RESTORE returns them to zero; provenance columns make who-wrote-what-when queryable](./images/fig_agent-memory_en.svg)

---

## Step 3: when a session corrupts the memory

Auditing stops most problems, not all — a misread bulk import, for instance. Then you need **rollback**.

Snapshot at a known-good state first (this should be routine for a memory store, like a database backup):

```sql
CREATE SNAPSHOT mem_v1 FOR TABLE agent_mem agent_memory;
```

Then `run_9002` goes wrong and overwrites 5,000 facts with garbage:

```sql
-- damage assessment against the known-good version
DATA BRANCH DIFF agent_memory AGAINST agent_memory {SNAPSHOT='mem_v1'} OUTPUT SUMMARY;
--   measured UPDATED 5000
SELECT COUNT(*) AS poisoned FROM agent_memory WHERE fact_value = 'GARBAGE';   -- measured 5000
```

One statement rolls the whole store back:

```sql
RESTORE TABLE agent_mem.agent_memory {SNAPSHOT = mem_v1};
SELECT COUNT(*) AS poisoned_after_restore FROM agent_memory WHERE fact_value = 'GARBAGE';  -- measured 0
SELECT COUNT(*) AS memory_after_restore FROM agent_memory;                                 -- measured 42469
```

This is [Part 5's incident rescue](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/git4data-part5-incident-rescue/index.md) applied to agent memory. The difference: **ordinary data incidents are caused by humans and are rare; agent-memory incidents are caused by machines and may happen at small scale daily** — so "can roll back" isn't a contingency plan, it's day-to-day infrastructure.

### There's a more common failure that's much harder to find: gradual drift

The 5,000 rows overwritten with garbage above is an **overt incident** — one identifiable run, one identifiable blast radius, visible in a single DIFF.

But the [backup-and-restore post](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/memoria-backup-restore/index.md) describes a different shape, and one that's far more common in real use: **gradual drift**. No single conversation went obviously wrong — a one-off task that pulled the topic sideways, a prompt you were just testing, a session you barely remember — the agent simply remembered everything that happened, as it always does. By the time you notice it "feels off," the carefully tuned state is long gone, and **you can't point at the conversation that broke it**.

Why this shape in particular needs versioning: you open the memory list, face hundreds of rows, and start pruning. Delete too much and you lose what mattered; delete too little and nothing improves. **You aren't repairing, you're guessing.** "Go back to a known-good snapshot" is definite — it doesn't require diagnosing the cause first.

So for a long-running agent, snapshots shouldn't be something you remember during an incident. Take one at **every state you're happy with**:

```sql
CREATE SNAPSHOT mem_v2 FOR TABLE agent_mem agent_memory;   -- tuned to your liking: save the state
-- then go try the new workflow / the new prompting strategy
```

Which is precisely why Memoria made it a product feature: **knowing you can always go back is what makes it safe to let the agent learn new things.**

---

## Step 4: the four opening questions, now answerable

With provenance columns and versions, that "one misreading, six months of pollution" scenario becomes an investigation:

```sql
-- how many memories did this run write?
SELECT source_run, COUNT(*) AS facts_written
FROM agent_memory WHERE source_run = 'run_9001' GROUP BY source_run;
--   measured run_9001 / 2469

-- what did memory look like three months ago?
SELECT COUNT(*) AS facts_at_mem_v1 FROM agent_memory {SNAPSHOT='mem_v1'};
--   measured 42469
```

| The opening question | The answer now |
|---|---|
| When was this memory written? | `written_at` |
| Which conversation wrote it? | `source_run` |
| What else did that conversation write? | `WHERE source_run = 'run_XXXX'` — one SQL lists them all |
| Can we undo everything it wrote? | Yes — sweep by `source_run`, or `RESTORE` the store |

---

## Boundaries and applicability

- **Memory auditing isn't content moderation.** The confidence threshold, how contradictions get resolved, what counts as "shouldn't be remembered" — all your policy. The Git4Data capability guarantees those policies act on a controlled branch, every write is on record, and mistakes roll back.

- **Not every memory deserves a branch.** High-frequency, low-risk memory (in-session scratch context) is only burdened by this flow. **What earns it is long-term memory** — the facts that get read again and again and shape every later interaction.

- **Superseded rows accumulate.** Keeping history costs storage; stale facts need a cleanup or archival policy, or the memory table grows without bound.

- **Compliance deletion must reach through history.** If a user asks for their data to be deleted, removing the active rows isn't enough — superseded rows and retained snapshots may still hold it, which needs its own process ([Part 8](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/git4data-part8-ml-lifecycle/index.md) raised the same class of problem).

- **Productizing it doesn't move the judgment.** Memoria packages branching, auditing, snapshots and restore into tools and a UI, but "what deserves remembering," "where the confidence bar sits," and "is this contradiction a changed mind or a misread" remain policy decisions. **The engine underneath makes those decisions executable, traceable and reversible; it doesn't make them for you.**

---

## Closing

Agent memory is the first data in this series **written by a machine and effective immediately.** It has none of training data's buffer — the moment it's written it starts shaping production behavior, and it keeps shaping it.

Put memory writes behind "branch → audit → merge," add provenance columns and routine snapshots, and it turns from a black box into something manageable: **531 of 3,000 proposals stopped at the gate, 300 contradictions resolved by keeping both old and new, 5,000 poisoned memories rolled back to zero in one statement** — and "who wrote this memory, when, and what else that session wrote" is, from then on, one SQL away.

This is also the one part in the series where we can point at a running product and say "that's how it's used": [Memoria](https://github.com/matrixorigin/Memoria) wraps these same actions into tools an agent can call and buttons a user can click, with MatrixOne's branches, snapshots and rollback underneath. **On the agent tier, Git for Data stops being something you build for the data team and becomes a feature of the end product itself.**

---

## Further reading

- [Why AI Agent Memory Cannot Rely on a Single Markdown File](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/markdown-agent-memoria/index.md) — the three structural flaws of files-as-memory, and the poisoning attack surface
- [Why I Rewrote Memoria in Rust](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/rust-memoria-agent/index.md) — why Memoria grew on MatrixOne, and how its architecture evolved
- [Memoria Backup and Restore Is Now Available](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/memoria-backup-restore/index.md) — what memory snapshots look like as a product feature
- [Get Started in 1 Minute: Connect Your Coding Agent to Memoria](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/start-agent-memoria/index.md)
- [Why Do AI Agents Need Memory?](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/ai-agent-memory/index.md)

> 📎 Runnable SQL (pinned to commit `354b9cf`): [github.com/matrixorigin/git4data-tutorial](https://github.com/matrixorigin/git4data-tutorial/blob/354b9cff424cafb50d0b58128e78cc36970fe211) ｜ Memoria: [github.com/matrixorigin/Memoria](https://github.com/matrixorigin/Memoria) ｜ Source & community: [github.com/matrixorigin/matrixone](https://github.com/matrixorigin/matrixone)
