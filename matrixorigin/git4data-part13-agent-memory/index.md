---
title: "MatrixOne Git4Data Deep Dive (Part 13) · Agents — Where Should an Agent's Memory Live? From a Markdown File to a Reversible Database"
author: MatrixOrigin
mail: contact@matrixorigin.io
description: "Git4Data Part 13: what agent memory is, why it decides whether an agent can finish long tasks, and where each existing approach gets stuck — Markdown files decay silently, vector stores only append, framework buffers die with the session, platform memory is tool-bound. Then the six things production memory needs, and which three the Git4Data capability solves: contradictions kept as history, versioning and rollback, traceable provenance. Verified on MatrixOne 4.1.0."
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

# MatrixOne Git4Data Deep Dive (Part 13) · Agents — Where Should an Agent's Memory Live? From a Markdown File to a Reversible Database

Across the first twelve parts we took MatrixOne's Git4Data capability through [data operations](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/git4data-part7-write-audit-publish/index.md), [classical machine learning](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/git4data-part8-ml-lifecycle/index.md), [deep learning's file-based data](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/git4data-part10-multimodal/index.md), and large models' [SFT](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/git4data-part11-sft-curation/index.md) and [RLHF preference data](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/git4data-part12-rlhf-preference/index.md).

From here we enter the final tier: **agents**. And the first question in this tier is also the most basic one: **where should an agent's memory live?**

This part follows that order. First, what agent memory actually is and how much it affects what an agent can do. Then, where each of the industry's current approaches gets stuck. Then the capability list production-grade memory really needs. Only after that does this series' subject arrive: what building memory on MatrixOne brings, which items on that list the Git4Data capability specifically solves, and which situations call for it — and which don't.

> All SQL is verified on MatrixOne `4.1.0` using deterministic expressions (no `rand()`), so every number reproduces run to run; the runnable version is [`13-agent-memory/agent_memory_demo.sql` in git4data-tutorial](https://github.com/matrixorigin/git4data-tutorial/blob/354b9cff424cafb50d0b58128e78cc36970fe211/13-agent-memory/agent_memory_demo.sql), pinned to a specific commit.

---

## 1. First, what agent "memory" actually is

The word gets used loosely, so let's separate it from three things it's often confused with.

**Memory is not the context window.** The context window is what the model can see during *this* conversation; it's gone when the conversation ends. Memory **persists across sessions**. Tell an agent today that "this project uses pnpm, not npm," and it still knows tomorrow in a fresh session. That's memory.

**Memory is not training data.** Training data changes the model's **weights** and takes effect at the next training run. Memory changes what the model **reads at inference time**, and takes effect the instant it's written.

**Memory isn't quite a RAG knowledge base either.** A knowledge base holds relatively static material — docs, manuals, code — for the model to look things up in. Memory holds **facts about you, about this project, about the world**, and crucially those facts **change**: preferences get revised, decisions get overturned, state moves forward.

So one memory looks like this — a **structured fact**, not a paragraph:

```text
cust_1042 · preferred_channel · email        (this customer prefers email)
cust_1042 · plan_tier         · pro          (they're on the pro plan)
cust_1042 · open_issue        · ticket_8821  (they have an open ticket)
```

Side by side, the differences are clear:

| | Training data | Context window | **Agent memory** |
|---|---|---|---|
| **Who writes it** | humans (engineers / annotators) | this session's input | **the agent itself**, mid-conversation |
| **How long it lives** | permanent (in the weights) | one session | **persists across sessions** |
| **When it takes effect** | the next training run | immediately, but only this session | **the next second, and from then on** |
| **What if it's wrong** | fixable before the next training run | close the window and it's gone | **live in production immediately, and stays wrong** |

**That last row is where this part starts.** In the first twelve parts, humans changed the data — an engineer ran the ETL, an annotator applied labels, a reviewer overturned a verdict. With agent memory, **the agent writes it itself, nobody reviews, and it takes effect instantly.** It's the first data in this series with that property.

---

## 2. How much does memory actually matter for an agent?

If memory were only about a smoother experience, it wouldn't be worth a whole part. The real reason: **it determines whether an agent can finish long tasks and whether it can be trusted.**

### 1. Without memory, long tasks simply can't complete

A complex refactor can span several sessions. The agent crashes, the context window fills, or you just close the laptop — and when you come back it **has no idea what it was doing, what it already tried, or what it decided**. It starts over. That isn't an experience problem, it's a **ceiling on capability**.

More insidious is [silent forgetting in long sessions](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/markdown-agent-memoria/index.md): to free space, agents compress earlier context. A developer running a 6-agent production system recorded exactly this — agents silently losing instructions, forgetting which files they'd changed, redoing work from thirty minutes earlier, and **never telling anyone**. That's a physical limit of the context window; better prompts don't fix it.

### 2. Context shared between agents is otherwise repeated labour

Plenty of people switch between Cursor, Claude Code and Kiro. Every switch means restating the project conventions, the preferred libraries, the architectural decisions. A shared memory layer means Cursor learns you moved to ruff, and Claude Code knows too.

### 3. Verified memory measurably improves output

There's public data on this: GitHub's Copilot Memory doesn't only record — it **validates memory before use, checking whether the referenced code still exists** — and memories not validated in 28 days expire. The result was a **7% increase in PR merge rate**. Anthropic's Auto Memory for Claude Code points the same way: the agent records build commands, debugging insights and patterns it observes.

**Both leading products chose to go beyond a static file. That fact alone says something.**

### 4. On-demand retrieval buys back the "attention budget"

Anthropic's context-engineering guidance calls this the **attention budget** problem: every irrelevant token in the window degrades the processing of the relevant ones. If memory is loaded wholesale, asking about CSS formatting still makes the agent read your database migration rules. **On-demand retrieval isn't only cheaper — it directly improves answer quality.**

---

## 3. The industry's approaches, and where each gets stuck

With the value clear, look at how this is done today.

### Approach 1: a static Markdown file (`.cursorrules` / `CLAUDE.md` / `AGENTS.md`)

The most common one, and it genuinely gets things right: zero infrastructure, versioned by Git, shared by the team, completely transparent — open the file and you know exactly what the agent's input is. For stable rules that change on a quarterly cadence ("use TypeScript", "tests in pytest"), Markdown is entirely sufficient.

The problem is that projects evolve, and static, flat, stateless text can't carry the complexity that evolution brings. [Why AI Agent Memory Cannot Rely on a Single Markdown File](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/markdown-agent-memoria/index.md) names three structural flaws:

**① One-way reads, then silent decay.** The agent can read it, but can't write back precisely and self-consistently (let the model edit freely and the file soon contradicts itself). So maintenance falls back on you — and in a project that evolves daily, right after you've restructured directories, swapped state libraries, and dug out of a bizarre API trap, **how often do you actually switch away and write it down?** Realistically, you forget. Then you rename `app/api/` to `app/routers/` and every rule scoped to the old path quietly stops applying: no compiler error, no linter warning. **The file just calmly lies to the agent.**

**② Wholesale loading wastes attention, and longer means less reliable.** Anthropic's docs put the practical ceiling of `CLAUDE.md` at roughly 200 lines, past which rule adherence drops noticeably. Some developers found that the one trick that occasionally makes long rules stick is putting "very-important" in the filename to game attention weighting — which tells you everything.

**③ Compressed away in long sessions.** As above — a physical limit.

### Approach 2: a vector store plus RAG

Chunk, embed and retrieve past conversations and notes. This **solves on-demand loading**, a clear step up from Approach 1. But it has its own cost: chunking and embedding **destroy structure** — a conversation corpus loses temporal ordering, speaker identity, cross-session relationships. And it is inherently **append-only**. Letta's team put it precisely:

> Appending raw experience is a poor approximation of learning. Humans create memories, but they also refine, consolidate, and compress them.

In an append-only vector store, "we use PostgreSQL" and "tests use SQLite" **both sit there**, and which one gets retrieved is a matter of similarity scores.

### Approach 3: a conversation buffer inside an agent framework

Build on LangChain, CrewAI or a raw API and memory is probably a Python list, trimmed when it gets long. No cross-session persistence, no on-demand retrieval, no structure, no multi-user isolation. Fine for a prototype, not for production.

### Approach 4: memory built into the platform

Claude Code's Auto Memory and GitHub's Copilot Memory belong here, and they work well (that +7% is the evidence). The limitation is that memory is **bound to a single tool** — switch agents and it doesn't come with you — and the governance policy is the platform's, leaving you little room to adjust it.

### One more thing most people haven't considered: security

Markdown agent files aren't only unreliable — **they can be actively exploited.** The MemoryGraft attack uses a README as an injection vector, planting fake "successful experiences" the agent then invokes repeatedly. The Rules File Backdoor attack embeds invisible unicode in `.cursorrules` to redirect code generation toward vulnerabilities. Poisoned rules then spread through sharing communities (awesome-cursorrules alone has 33,000+ stars).

The OWASP 2026 Agentic Top 10 lists **memory and context poisoning** as a top threat. And every mitigation it recommends — **provenance tracking, trust scoring, expiry policies, integrity snapshots** — **is impossible to implement on a plain text file.**

### As a table

| Approach | On-demand retrieval | Structure & types | Contradiction governance | Versioning & rollback | Shared across agents | Provenance |
|---|---|---|---|---|---|---|
| Markdown file | no (loaded wholesale) | no (flat text) | no | file-level (Git) | yes (same repo) | no |
| Vector store + RAG | **yes** | weak (chunking loses it) | no (append-only) | no | depends on deployment | weak |
| Framework buffer | no | no | no | no | no | no |
| Platform built-in | **yes** | partial | partial | partial | no (tool-bound) | partial |
| **Database + versioning** | **yes** | **yes (rows + types)** | **yes (queryable in SQL)** | **row-level + snapshots** | **yes (standalone service)** | **yes (provenance columns)** |

---

## 4. So what does production-grade agent memory actually need?

Step back from any specific tool and ask what production memory has to do, and six requirements surface:

1. **Both humans and agents can write.** You set the guardrails (static rules); the agent accumulates knowledge as it works (dynamic memory). Two write paths, one shared store.
2. **Retrieve on demand, don't load everything.** At the start of a conversation, pull only the memories relevant to **the current task**.
3. **Typed memory with different lifecycles.** User preferences should persist; working memory ("currently debugging the auth module") should expire when the task ends; project decisions should persist but be overridable. **In a flat file these lifecycles can't be managed independently.**
4. **Contradiction detection and reconciliation.** You stored "we use PostgreSQL," then encountered "tests use SQLite" — the system must recognise the tension (same subject, different conclusion) and either resolve it (different contexts) or flag it for a human.
5. **Version control and rollback.** Every memory change on record; snapshot before a major refactor; roll back a memory the agent learned wrong; branch memory to try a different direction, then merge or discard. **This is the only reliable defence against memory poisoning.**
6. **Shared across agents, with provenance.** All agents read and write one pool — but you need to know **which agent wrote what, and when**, to audit it and to trust it selectively.

**Note requirements 4, 5 and 6.** The first three are essentially storage-and-retrieval problems, and a vector store or a structured store can address much of them. The last three — **preserving the history of contradictions, versioning and rollback, and traceable provenance of writes** — are precisely the capability this series has spent twelve parts on.

---

## 5. Memoria: landing those six on MatrixOne

This isn't a hypothetical architecture. [**Memoria**](https://github.com/matrixorigin/Memoria) is an open-source (Apache 2.0) agent-memory project **built entirely on MatrixOne**. It runs as an MCP Server, so any MCP-capable agent — Cursor, Claude Code, Kiro, OpenClaw — connects directly, with no custom integration ([one-minute setup](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/start-agent-memoria/index.md)).

### Why an agent-memory project grows on a database

[Why I Rewrote Memoria in Rust](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/rust-memoria-agent/index.md) traces the path: Memoria started as the memory layer for MatrixOne's vector-search **auto-tuning**, and only later did it become clear that "remember which tuning strategies worked" and "remember how your project actually works" are the same problem in the abstract — **both are memory that persists across sessions, needs semantic retrieval, and needs version control.**

MatrixOne happens to have all three in **one engine**: vector indexing, full-text search, and the CoW versioning this series is about. **That's the practical benefit of living on a database: hybrid retrieval and versioning act on the same data, with nothing to move or reconcile between two systems.** Part 10 forced us to accept two worlds — files in lakeFS, metadata in MatrixOne — because images have no rows. Agent memory is structured facts; it lives entirely in one table.

### The agent sees tools, not SQL

Once connected, the tools an agent can call look like this (measured in remote mode):

```text
memory_store       write a memory
memory_retrieve    retrieve what's relevant now (hybrid vector + full-text)   <- requirement 2
memory_search      explicit search
memory_correct     correct an existing memory in place                        <- requirement 4
memory_purge       clean up (e.g. drop working memory at session end)         <- requirement 3
memory_governance  governance
memory_consolidate consolidation
memory_reflect     reflection
memory_feedback    feedback
memory_profile / memory_list
```

`memory_correct` deserves a second look. **Its very existence is a judgment**: when a new fact contradicts an old one, the right move isn't to append another row but to correct — otherwise the store holds two mutually contradictory "facts" and which one the agent retrieves is luck. That's exactly what Approach 2 (the append-only vector store) leaves unsolved.

Memory typing ships too: `profile` for long-lived preferences, working memory scoped to a task (purged at session end), and goal-tracking memories — **requirement 3**.

And "what if memory gets written badly" is a shipped product feature: [backup and restore](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/memoria-backup-restore/index.md) — snapshot memory at any moment, restore in one click — **requirement 5**.

![How Memoria and this article's SQL stack up: agents such as Cursor, Claude Code, Kiro and OpenClaw connect over MCP; Memoria in the middle exposes memory tools (store / retrieve / correct / purge / governance) plus memory typing and backup-and-restore; underneath, MatrixOne's CoW storage engine provides zero-copy branches, instant snapshots, row-level DIFF, MERGE and point-in-time rollback, with vector indexing and full-text search in the same engine — and the SQL in this article drives that bottom layer directly](./images/fig_memoria-stack_en.svg)

---

## 6. Which items on the list does the Git4Data capability actually solve?

Of the six requirements above, 1, 2 and 3 come down to "a database, hybrid retrieval, and a little schema design." **The ones that genuinely need the Git4Data capability are the last three** — which are also the hardest three:

| Requirement | Why it's hard | How MatrixOne's Git4Data capability solves it |
|---|---|---|
| **4. Contradiction handling** | you can't just delete contradictions (people do change their minds); old and new must coexist with the old marked stale | **row-level version semantics**: `UPDATE … status='superseded'` keeps history instead of overwriting it |
| **5. Versioning & rollback** | memory poisoning has no clear cause; pruning row by row is guesswork | **instant snapshot + `RESTORE`**: return to a known-good version without diagnosing the cause first |
| **6. Provenance & audit** | "what did this round of the agent want to remember" can't be reconstructed afterwards | **zero-copy branch + `DATA BRANCH DIFF`**: writes land on a branch, merge only after audit, net change on record |

Plus one the list doesn't state but production always hits: **"what did this write actually change" has to be visible before it takes effect.** That's [Part 7's Write-Audit-Publish](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/git4data-part7-write-audit-publish/index.md), except the writer this time is an agent.

The next section takes those three apart in SQL — so you can see exactly which rows each step touched and what it left on record.

---

## 7. Taking it apart: one full round of memory writes

### A failure that really happens

In one conversation, a support agent takes a user's sarcasm literally and writes:

```text
cust_1042 · preferred_channel · do not contact me
```

Every subsequent conversation reads that memory. Next time the user comes back, the agent is oddly cold and won't follow up — because it "remembers" this person doesn't want to be contacted.

Months later somebody notices, and the hard part is:

1. **When was this memory written?** Unknown — the table holds only the current value.
2. **Which conversation wrote it?** Unknown — there's no provenance field.
3. **What else did that conversation write?** Unknown — no way to sweep for it.
4. **Can we undo everything that conversation wrote?** No — it's mixed in with hundreds of thousands of good rows.

Those four questions map exactly onto four things the Git4Data capability provides: **provenance, audit, rollback, and DIFF**.

### The case: a support agent's memory store

Memory is a table. Note the three **provenance** columns alongside the facts themselves:

```sql
CREATE TABLE agent_memory (
    mem_id      BIGINT PRIMARY KEY,
    subject_key VARCHAR(64),    -- who this fact is about (e.g. a customer ID)
    fact_key    VARCHAR(64),    -- which attribute (e.g. preferred_channel)
    fact_value  VARCHAR(256),
    confidence  DOUBLE,         -- how sure the agent was when writing it
    source_run  VARCHAR(32),    -- which run wrote it   <- provenance
    written_at  DATETIME,       -- when it was written  <- provenance
    status      VARCHAR(16)     -- active / superseded
);
```

`source_run` and `written_at` eliminate the first two "unknowns" outright. And `status` embodies the design choice behind requirement 4: **a memory update isn't an overwrite — the old fact is marked superseded.** History is preserved rather than erased.

Scale: 8,000 customers × 5 attributes = **40,000 accumulated memories**.

### Step 1: the agent's writes land on a branch first

**Don't let the agent write the main store directly.** Write to a branch:

```sql
DATA BRANCH CREATE TABLE memory_staging FROM agent_memory;
-- this session (run_9001) proposes 3,000 new memories
INSERT INTO memory_staging SELECT ... ;

DATA BRANCH DIFF memory_staging AGAINST agent_memory OUTPUT SUMMARY;
--   measured INSERTED 3000 — what this round "wants to remember," at a glance
```

**This is where requirement 6 lands**: before anything takes effect, "what this session wants to write into memory" is a definite, queryable number rather than an accomplished fact.

### Step 2: audit what the agent wants to remember

Real agent sessions produce three main classes of problem:

**Contradictions: a new fact fights an existing active one**

```sql
SELECT COUNT(*) AS contradictions
FROM memory_staging s
JOIN agent_memory m ON s.subject_key = m.subject_key AND s.fact_key = m.fact_key
WHERE s.mem_id >= 500000 AND m.status = 'active' AND s.fact_value <> m.fact_value;
--   measured 300
```

**Low confidence: the agent is guessing**

```sql
SELECT COUNT(*) AS low_confidence FROM memory_staging
WHERE mem_id >= 500000 AND confidence < 0.5;
--   measured 428
```

**No provenance: written, but nobody knows by which run**

```sql
SELECT COUNT(*) AS untraceable FROM memory_staging
WHERE mem_id >= 500000 AND source_run IS NULL;
--   measured 120
```

**The three get handled differently**, and that's worth emphasising:

```sql
-- low confidence + no provenance: rejected outright, never enters memory
DELETE FROM memory_staging
WHERE mem_id >= 500000 AND (confidence < 0.5 OR source_run IS NULL);

-- contradictions: don't delete the new one — mark the old fact superseded, keeping history
UPDATE memory_staging m SET status = 'superseded'
WHERE m.mem_id < 500000 AND m.status = 'active'
  AND EXISTS (SELECT 1 FROM memory_staging s
              WHERE s.mem_id >= 500000
                AND s.subject_key = m.subject_key AND s.fact_key = m.fact_key
                AND s.fact_value <> m.fact_value);
```

**A contradiction shouldn't be treated as an error and deleted.** People change: the customer really may have changed their preference. The right handling is **both versions coexisting, the old one marked stale** — so the agent uses the latest understanding while "it once believed otherwise" survives. You only appreciate that history when you have to work out why the agent answered a certain way back in March. **This is requirement 4's "resolve or flag," expressed in row-level version semantics.**

The record and the merge:

```sql
DATA BRANCH DIFF memory_staging AGAINST agent_memory OUTPUT SUMMARY;
--   measured INSERTED 2469 / UPDATED 206
--   (of 3,000 proposals, 531 rejected for low confidence or no provenance; 206 old facts marked stale)

DATA BRANCH MERGE memory_staging INTO agent_memory;
--   measured memory store 40,000 -> 42,469; of which active 42,263, superseded 206
```

![The agent-memory flow: the 40,000-fact store never moves while session run_9001 proposes 3,000 memories on a branch; the audit finds 300 contradictions (marked superseded), 428 low-confidence and 120 untraceable (both rejected); after merging, DIFF records INSERTED 2469 / UPDATED 206 and the store reaches 42,469; when run_9002 poisons 5,000 facts a single RESTORE returns it to zero; and the provenance columns make "who wrote what, when" queryable](./images/fig_agent-memory_en.svg)

### Step 3: when a session writes memory badly

The audit stops most problems, but not all — a misread bulk import, for instance. That needs **rollback**, i.e. requirement 5.

Snapshot at a known-good state first:

```sql
CREATE SNAPSHOT mem_v1 FOR TABLE agent_mem agent_memory;
```

Then `run_9002` goes wrong and overwrites 5,000 facts with garbage:

```sql
-- damage assessment: what changed relative to the known-good version
DATA BRANCH DIFF agent_memory AGAINST agent_memory {SNAPSHOT='mem_v1'} OUTPUT SUMMARY;
--   measured UPDATED 5000
SELECT COUNT(*) AS poisoned FROM agent_memory WHERE fact_value = 'GARBAGE';   -- measured 5000
```

One statement rolls the whole thing back:

```sql
RESTORE TABLE agent_mem.agent_memory {SNAPSHOT = mem_v1};
SELECT COUNT(*) AS poisoned_after_restore FROM agent_memory WHERE fact_value = 'GARBAGE';   -- measured 0
SELECT COUNT(*) AS memory_after_restore FROM agent_memory;                                  -- measured 42469
```

This is [Part 5's incident rescue](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/git4data-part5-incident-rescue/index.md) applied to agent memory. The difference: **ordinary data incidents are caused by humans and are rare; agent-memory incidents are caused by machines and may happen at small scale daily** — so "can roll back" isn't a contingency plan, it's day-to-day infrastructure.

**And there's a more common failure that's much harder to find: gradual drift.** The example above is an **overt incident** — one identifiable run, one identifiable blast radius, visible in a single DIFF. But the [backup-and-restore post](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/memoria-backup-restore/index.md) describes a different shape: no single conversation went obviously wrong — a one-off task that pulled the topic sideways, a prompt you were just testing, a session you barely remember — the agent simply remembered everything, as it always does. By the time it "feels off," the carefully tuned state is long gone, and **you can't point at the conversation that broke it**.

That's exactly why it needs versioning. You open the memory list and start pruning: delete too much and you lose what mattered; delete too little and nothing improves. **You aren't repairing, you're guessing.** "Go back to a known-good snapshot" is definite, and it doesn't require diagnosing the cause first.

So for a long-running agent, snapshots shouldn't be something you remember during an incident. Take one at **every state you're happy with**:

```sql
CREATE SNAPSHOT mem_v2 FOR TABLE agent_mem agent_memory;   -- tuned to your liking: save the state
-- then go try the new workflow / the new prompting strategy
```

**Knowing you can always go back is what makes it safe to let the agent learn new things** — which is why Memoria made it a product feature.

### Step 4: those four questions are all answerable now

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
| Can we undo everything it wrote? | Yes — sweep by `source_run`, or `RESTORE` the whole store |

**Look back at OWASP's four mitigations** — provenance tracking, trust scoring, expiry policies, integrity snapshots. They now land on `source_run`/`written_at`, the `confidence` threshold, `status='superseded'`, and `CREATE SNAPSHOT` respectively. **That's the concrete difference between structured memory and a plain text file.**

---

## 8. When to reach for this, and when not to

This flow isn't free, so being clear about where it applies is more useful than selling it.

**Worth it:**

- **Long-term memory — facts that get read repeatedly and shape every later interaction.** User preferences, project decisions, domain knowledge: one wrong row stays wrong indefinitely.
- **Several agents or several users sharing one memory pool.** Sharing means you must be able to answer "who wrote this."
- **Anywhere the agent has autonomous write access.** With nobody reviewing row by row, you need a reversible anchor.
- **Anything requiring audit or compliance.** Finance, healthcare, support — "why did the agent answer that way in March" has to be answerable.

**Not worth it:**

- **Within-session scratch context.** High-frequency, low-risk, discarded on use — a branch is pure overhead here. This is what `memory_purge` is for, not the audit flow.
- **A single person, a single agent, a small project you can edit by hand.** A `CLAUDE.md` really is enough; don't over-engineer.
- **Purely static conventions and guardrails.** Coding standards and architectural principles change quarterly — leaving them in Markdown as guardrails is more transparent.

**The pragmatic answer is layering**: static rules stay in Markdown as guardrails, dynamic knowledge goes to a memory layer with versioning, and version control is the safety net.

**A few costs to know upfront:**

- **Memory auditing is not content moderation.** The confidence threshold, how contradictions get adjudicated, what counts as "shouldn't be remembered" — all your policy. What the Git4Data capability guarantees is that those policies act on a controlled branch, every write is on record, and mistakes roll back.
- **`superseded` rows accumulate.** Keeping history costs storage; stale facts need a cleanup or archival policy.
- **Compliance deletion must reach through history.** If a user asks for their data to be deleted, removing active rows isn't enough — superseded rows and retained snapshots may still hold it, which needs its own process ([Part 8](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/git4data-part8-ml-lifecycle/index.md) raised the same class of problem).
- **Productizing it doesn't move the judgment.** Memoria packages branching, auditing, snapshots and restore into tools and a UI, but "what deserves remembering," "where the confidence bar sits," and "is this contradiction a changed mind or a misread" remain policy decisions. **The engine underneath makes those decisions executable, traceable and reversible; it doesn't make them for you.**

---

## Closing

An agent's memory determines whether it can finish long tasks and whether it can be trusted — and it is also the first data in this series **written by a machine and effective immediately.** It has none of training data's buffer: the moment it's written it starts shaping production behaviour.

The industry has worked through several approaches. Markdown files are transparent but decay silently. Vector stores solved retrieval but only ever append. Framework buffers don't survive a session. Platform-built-in memory is locked to one tool. **What they're missing isn't storage — it's governance:** how contradictions get adjudicated, how mistakes get undone, how you find out who wrote what.

Put memory writes behind "branch → audit → merge," add provenance columns and routine snapshots, and all three have answers: **531 of 3,000 proposals stopped at the gate, 300 contradictions resolved by keeping both old and new, 5,000 poisoned memories rolled back to zero in one statement** — and "who wrote this memory, when, and what else that session wrote" is, from then on, one SQL away.

This is also the one part in the series where we can point at a running product and say "that's how it's used": [Memoria](https://github.com/matrixorigin/Memoria) wraps these same actions into tools an agent can call and buttons a user can click, with MatrixOne's branches, snapshots and rollback underneath. **On the agent tier, Git for Data stops being something you build for the data team and becomes a feature of the end product itself.**

---

## Further reading

- [Why Do AI Agents Need Memory?](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/ai-agent-memory/index.md) — how memory turns AI from a tool into a relationship
- [Why AI Agent Memory Cannot Rely on a Single Markdown File](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/markdown-agent-memoria/index.md) — the three structural flaws of files-as-memory, and the poisoning attack surface
- [Why I Rewrote Memoria in Rust](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/rust-memoria-agent/index.md) — why Memoria grew on MatrixOne, and how its architecture evolved
- [Memoria Backup and Restore Is Now Available](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/memoria-backup-restore/index.md) — what memory snapshots look like as a product feature
- [Get Started in 1 Minute: Connect Your Coding Agent to Memoria](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/start-agent-memoria/index.md)

> 📎 Runnable SQL (pinned to commit `354b9cf`): [github.com/matrixorigin/git4data-tutorial](https://github.com/matrixorigin/git4data-tutorial/blob/354b9cff424cafb50d0b58128e78cc36970fe211) ｜ Memoria: [github.com/matrixorigin/Memoria](https://github.com/matrixorigin/Memoria) ｜ Source & community: [github.com/matrixorigin/matrixone](https://github.com/matrixorigin/matrixone)
