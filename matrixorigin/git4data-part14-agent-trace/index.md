---
title: "MatrixOne Git4Data Deep Dive (Part 14) · Agents — Run Traces: From Observable to Explainable"
author: MatrixOrigin
mail: contact@matrixorigin.io
description: "Git4Data Part 14: what a trace actually is — it comes from distributed tracing, and what it adds over a log is structure, not volume. What an agent trace looks like, and how it differs from a microservice trace. Then where each industry approach gets stuck (hand-rolled logs, APM extensions, platforms like Langfuse/LangSmith/Phoenix, the OpenTelemetry GenAI conventions), and a v1-to-v2 regression hunt showing traces need no version control, but the eval set and memory they depend on do."
tags: ["Technical Insights"]
keywords: ["Git4Data", "MatrixOne", "AI Agent", "Observability", "Traces", "Attribution", "Data Versioning"]
publishTime: "2026-07-26T17:00:00+08:00"
date: '2026-07-26'
image:
  "1": "/content/zh/shared/tech.png"
  "235": "/content/zh/shared/tech.png"
lang: en
status: published
translations:
  zh: git4data-part14-agent-trace-zh
---

# MatrixOne Git4Data Deep Dive (Part 14) · Agents — Run Traces: From Observable to Explainable

[Part 13](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/git4data-part13-agent-memory/index.md) covered an agent's **memory**: written by the agent itself, effective instantly, and therefore in need of isolation, auditing and rollback. This part covers the other thing an agent leaves behind once it runs — its **trace**.

Compared with memory, "trace" is a more technical word, and one that's easy to wave through. Plenty of teams say they've "hooked up tracing," but ask what's actually inside one of their traces and which questions it can answer, and the reply gets vague. So this part spends real space on the fundamentals first: **where traces came from, what an agent trace actually looks like, and how a trace differs from a log**. Only then does it get to why traces matter so much for agents, how the industry does it, and what building this on MatrixOne adds.

> All SQL is verified on MatrixOne `4.1.0` using deterministic expressions (no `rand()`); the runnable version lives in [git4data-tutorial](https://github.com/matrixorigin/git4data-tutorial/blob/354b9cff424cafb50d0b58128e78cc36970fe211/14-agent-trace/agent_trace_demo.sql).

---

## 1. What a trace is: the structure of one execution, not a pile of timestamps

### Where it came from

Tracing isn't an AI-era invention. It comes from **distributed tracing**: a request arrives, passes through a gateway, several microservices, a cache and a database, then returns. If each service logs on its own, you're left with a dozen unrelated records. Tracing instead assigns the request a **trace id**, records each leg it passes through as a **span**, and preserves the parent-child relationships between spans.

What you get isn't a pile of log lines — it's **a tree**: who called whom, how long each leg took, which leg failed. Google's Dapper paper established the model; the de facto standard today is [OpenTelemetry](https://opentelemetry.io/).

In observability terms it usually sits alongside two others:

| | The question it answers | Shape | Example |
|---|---|---|---|
| **Metric** | how many, how fast | numbers over time | requests per minute, P99 latency |
| **Log** | what happened | discrete, flat event stream | `2026-08-19 ERROR search_kb timeout` |
| **Trace** | what one execution went through, and how the parts relate | **a structured tree** | the full call tree of one request |

**The essential difference between a trace and a log isn't detail — it's structure.** Logs are lines; the causal relationships between them live in someone's head. A trace records those relationships explicitly, so a machine can aggregate, compare and attribute directly.

### What an agent trace looks like

An agent's execution is naturally a tree: the model thinks, decides which tool to call, gets a result, thinks again, maybe calls again, until it converges. Recorded as a trace:

```text
run  #100387   invoke_agent  "support agent v2"       2.9s  · 1,645 tokens · failed
├─ retrieval        fetch relevant memories             120ms · 5 hits
├─ llm  #1          plan next step                      610ms ·   420 tokens
├─ tool #1          search_kb(q="SSL cert expired")   1,900ms · ✗ timeout   ← the failure
├─ llm  #2          rephrase and retry                  380ms ·   510 tokens
└─ tool #2          search_kb(q="certificate renew")     80ms · ✗ empty
```

At a glance: where it's slow (`tool #1` accounts for 1.9s of the 2.9s), where the tokens went (two LLM calls), where it failed (`search_kb` twice), and **how those relate in order and nesting**.

With logs alone you'd have five lines of text, and reconstructing that tree would be a human job.

![The same run as a log versus as a trace: on the left five flat log lines, on the right an execution tree with a retrieval, two llm calls and two search_kb tool calls, each annotated with latency, tokens and outcome, where tool #1's timeout accounts for 1.9 of the 2.9 seconds; below, the three ways an agent trace differs from a microservice trace (the same input doesn't guarantee the same tree, step costs vary enormously, behaviour also depends on the memory read at the time) and the gap every tracing approach shares — they record what the agent did, not what the world looked like to it](./images/fig_trace-anatomy_en.svg)

### Is there a standard? OpenTelemetry's GenAI semantic conventions

Yes, and it's taking shape. OpenTelemetry's [GenAI semantic conventions](https://github.com/open-telemetry/semantic-conventions-genai) already model a whole agent execution as a span tree rather than a single LLM call. `gen_ai.operation.name` covers the full lifecycle:

```text
create_agent · invoke_agent · invoke_workflow · plan · execute_tool · retrieval
```

A set of attributes is defined alongside it — `gen_ai.agent.name`, `gen_ai.conversation.id`, `gen_ai.provider.name`, `gen_ai.request.model`, `gen_ai.tool.definitions`, plus token accounting as `gen_ai.usage.input_tokens` / `output_tokens` / `cache_read.input_tokens`. The MCP tool-call conventions moved into the same repository, so an agent and the MCP tools it calls share one trace vocabulary.

One caveat: **these conventions are still marked Development (experimental) overall**, and names and structure may still change. Aligning your collection layer with OTel is the right call; treating it as a frozen contract today is not.

### Three ways an agent trace differs from a microservice trace

This matters, because it drives every practical difference that follows.

**First, the same input doesn't guarantee the same tree.** Microservice call paths are essentially fixed: the same endpoint takes almost the same route. Agents don't work that way — the same question may take two steps on one run and five on the next, and may call different tools. **So a single trace says little; you need statistics over a batch of traces.**

**Second, step costs vary enormously.** In microservices, the legs are usually within an order of magnitude of each other. In an agent, one LLM call may be hundreds of milliseconds to tens of seconds and hundreds to tens of thousands of tokens, while a local function call is microseconds. **Cost and latency concentrate in a handful of spans.**

**Third, and most important: behaviour isn't determined by code alone.** A microservice's behaviour follows from its code and arguments; hold both fixed and the behaviour is fixed. Not so for an agent:

```text
a run's behaviour = code/model × config × prompt × the memory it read at the time × input
```

The memory from Part 13 keeps changing, and so may the config. **Which means a trace records what the agent did but isn't enough to reconstruct why** — unless you also record which version of memory and which version of config it read.

Closing that gap is what the second half of this article is about.

---

## 2. Why traces matter so much for agents

### 1. Without a trace, an agent is a complete black box

A conventional program raises an exception with a stack trace when it fails. An agent doesn't — it just **gives a slightly wrong answer**, while how many steps it took, which tools it called and what each returned stay invisible. Observability is a nice-to-have for ordinary services; for agents it's closer to **basic debuggability**.

### 2. Cost and latency have to attribute to steps

An agent's bill isn't evenly spread. Of one run's 1,645 tokens, 80% might go to a single retry; of a 2.9-second response, 1.9 seconds might sit in one timed-out tool. **Only by recording tokens and latency at span granularity does "why did the bill double this month" have an answer** — otherwise you can only see that the total went up.

### 3. Failures have to land on a specific step

"Success rate fell from 97.5% to 72.5%" is a symptom, not a fixable problem. A fixable problem looks like this: **"`search_kb`'s failure rate on technical questions went from 2.5% to 27.5%."** Getting from the first to the second is what structured traces are for.

### 4. Version comparison and regression hunting

This is the scenario this article walks through. After changing a prompt, swapping a model or adjusting a retrieval strategy, **is the new version better or worse, and where** — a question that comes up nearly daily. It needs two things: a batch of inputs held fixed, and comparable traces across two versions.

### 5. The evidence behind an evaluation

An eval report says "v2 scores 82." Three months later somebody asks which set of questions and which version of memory produced that 82. **If there's no answer, the score is just a number.** Traces are the evidence behind an eval conclusion, and evidence only counts if it can be re-examined.

---

## 3. How the industry does agent tracing

### 1. Roll your own structured logs into a log system

The plainest approach: emit a JSON log line per step into ELK, Loki or ClickHouse. Flexible, cost-controlled, and the data stays entirely yours.

The cost is that **you maintain the tree yourself**: trace id, span id and parent id all get threaded by hand, aggregate analysis means writing your own queries, and log systems typically retain by time (say 30 days) — **expiry means loss**, which is fatal for re-examining an eval three months later.

### 2. Extend an existing APM

Datadog, New Relic and similar already have mature distributed tracing; report LLM calls as spans and they sit next to your infrastructure monitoring. For teams already on an APM, this is the cheapest path in.

The limit is that these platforms are modelled around **service health**. They're good at "did latency rise, what's the error rate," but "how good was this answer" and "did the new prompt help or hurt" aren't in their native vocabulary.

### 3. Dedicated LLM / agent observability and evaluation platforms

A batch of products now target this specifically, roughly grouped by emphasis:

- **[Langfuse](https://langfuse.com/docs/observability/overview)** — open source and self-hostable, putting traces (prompt, response, tokens, cost, latency, retrieval and tool steps) together with **datasets, experiments and LLM-as-a-Judge evaluation**. A fit for teams with data-residency requirements or a preference for self-hosting.
- **LangSmith** — tightest with the LangChain / LangGraph ecosystem, expanding every step and tool call of a run.
- **Arize Phoenix** — open source, with a broad set of evaluation metrics (faithfulness, relevance, safety, hallucination detection).
- **Braintrust** — built around eval-driven development, with evals gating CI/CD.
- **W&B Weave** — a fit for teams already on Weights & Biases, connected to experiment tracking.

These solve real problems: span trees out of the box, cost attribution, eval datasets, human and model scoring. **If you're choosing a stack, they're usually the right starting point.**

Their shared boundary is also clear: the trace data lives inside the platform, **separate from your own business data, memory store and config tables**; retention follows your plan; and analysis that crosses "traces × business data" means exporting, or not doing it.

### 4. Standardise on OpenTelemetry

Collect using the GenAI semantic conventions and the backend becomes replaceable — the healthiest direction available, and most of the platforms above accept OTel ingestion. The same caveat applies: **the conventions are still at Development stage.**

### The thing none of them solve

Line these up and they differ a lot in how completely they record and how convenient they are to browse. But one gap is shared:

> **They all record what the agent did. None record what the world looked like to it at the time.**

I'm not aware of a product whose trace carries a column like `memory_snapshot`. The reason isn't hard to see — **it requires the memory itself to be versioned**, and that's a database problem, not an observability-platform problem.

---

## 4. What production-grade agent tracing requires

Condensing the scenarios above, the list runs roughly:

1. **A structured execution tree** — parent-child links between spans, span type (llm / tool / retrieval), latency, tokens, outcome.
2. **Aggregation by dimension** — statistics by version, by input category, by tool name, rather than scrolling entries.
3. **Cost and latency attributed to spans** — knowing which step spent the money and the time.
4. **A comparable input baseline** — when comparing two versions, both must run the same batch of inputs, and that batch must not change during the comparison.
5. **Reconstructable dependency versions** — which memory, config and prompt version this run read.
6. **Evidence that survives** — an eval round's traces and the data they depend on must be re-examinable months later.
7. **Queryable together with business data** — `input_id` in the trace should JOIN back to the eval set, `subject_key` back to the memory store.

Items 1, 2 and 3 are handled well by the dedicated platforms above, often better than a hand-rolled version. **Items 4, 5 and 6 are fundamentally versioning problems; item 7 is fundamentally a "is the data in one place" problem.** Both classes are database territory.

---

## 5. What building traces on MatrixOne adds

### First, what it doesn't do

The boundary belongs up front here, or this gets over-packaged:

> **Traces are append-only. They don't need — and aren't suited to — row-level diff and merge.** You don't "edit" a run that already happened.

So **there isn't a single `DATA BRANCH MERGE` in this article, deliberately**. The trace tables should be treated as logs: columnar storage and partitioning to carry the volume, TTL for retention.

### So what does it add

**Traces themselves don't need version control, but for traces to mean anything, what they depend on must be versioned.**

A real investigation needs four things at once: **the trace, the eval set, the memory and the config.** The difficulty with the approaches above is that those four live in different systems — traces in the observability platform, the eval set in a CSV or dataset service, memory in a vector store, config in Git or a config service. Lining up "as of that moment" across systems is hard.

On MatrixOne they can be a few tables in one database:

```text
runs / run_steps  ──JOIN──▶  eval_inputs      (which question, which category)
       │
       └── memory_snapshot ──time travel──▶  agent_memory {SNAPSHOT='mem_r1'}
       └── config_version  ────────────────▶  agent_config
```

Which adds three things:

**First, the eval set can be pinned.** One `CREATE SNAPSHOT` freezes the batch into a definite version, both sides of the comparison read the same one, and "what exactly are we comparing" stops being a question.

**Second, "what it read at the time" becomes reconstructable.** Record `memory_snapshot` per run and time-travel back to that version months later — the dividend of Part 13's memory versioning, collected here.

**Third, attribution is ordinary SQL.** With traces and business data in one database, "which questions regressed" is a JOIN and "which tool broke" is a GROUP BY — no export step first.

Of these, the first two use MatrixOne's Git4Data capability (snapshots and time travel); the third comes from the data simply being in one place.

Here's the whole flow.

---

## 6. In practice: hunting a v1 → v2 regression

The case: a support agent. 2,000 eval inputs run once under v1 and once under v2 — **4,000 runs, 16,000 steps**.

### Pin the eval set and the memory first

These two statements are the foundation for everything after:

```sql
CREATE SNAPSHOT evalset_v1 FOR TABLE agent_trace eval_inputs;   -- freeze the questions
CREATE SNAPSHOT mem_r1     FOR TABLE agent_trace agent_memory;  -- freeze the memory
```

### The trace tables: note the `memory_snapshot` column

```sql
CREATE TABLE runs (
    run_id          BIGINT PRIMARY KEY,
    agent_version   VARCHAR(16),
    input_id        BIGINT,
    memory_snapshot VARCHAR(32),   -- which memory version this run read  <- the key
    config_version  VARCHAR(16),   -- which config version
    status          VARCHAR(12),
    n_steps         INT,
    total_tokens    INT,
    latency_ms      INT
);

CREATE TABLE run_steps (
    step_id    BIGINT PRIMARY KEY,
    run_id     BIGINT,
    step_no    INT,
    step_type  VARCHAR(12),        -- llm / tool
    tool_name  VARCHAR(32),
    ok         TINYINT,
    latency_ms INT
);
```

This is the execution tree from section 1 landed in tables: `runs` is the root span, `run_steps` are its children. And `memory_snapshot` is just a string, but it's what **connects** the trace to [Part 13's](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/git4data-part13-agent-memory/index.md) memory versions — step 4 shows what that's worth.

### Step 1: the overall picture — how much worse

```sql
SELECT agent_version,
       COUNT(*) AS runs,
       SUM(CASE WHEN status = 'ok' THEN 1 ELSE 0 END) AS ok_runs,
       ROUND(100.0 * SUM(CASE WHEN status='ok' THEN 1 ELSE 0 END)/COUNT(*), 1) AS ok_pct,
       ROUND(AVG(total_tokens), 0) AS avg_tokens,
       ROUND(AVG(latency_ms), 0)   AS avg_latency_ms
FROM runs GROUP BY agent_version ORDER BY agent_version;
```

Measured:

| agent_version | runs | ok_pct | avg_tokens | avg_latency_ms |
|---|---|---|---|---|
| v1 | 2000 | **97.5** | 1345 | 1100 |
| v2 | 2000 | **72.5** | 1645 | 1300 |

Success rate down 25 points, tokens up 22%. **Because the eval set is frozen as `evalset_v1`, this comparison holds** — both versions answered the same questions, not one more and not one fewer.

But so far you only know it got worse, not where.

### Step 2: attribute to inputs — which questions regressed

```sql
SELECT COUNT(*) AS regressed_inputs
FROM runs a JOIN runs b ON a.input_id = b.input_id
WHERE a.agent_version = 'v1' AND b.agent_version = 'v2'
  AND a.status = 'ok' AND b.status = 'failed';
--   measured 500
```

500 inputs went from passing to failing. Break it down by category:

```sql
SELECT e.category, COUNT(*) AS regressed
FROM runs a
JOIN runs b ON a.input_id = b.input_id
JOIN eval_inputs e ON e.input_id = a.input_id
WHERE a.agent_version = 'v1' AND b.agent_version = 'v2'
  AND a.status = 'ok' AND b.status = 'failed'
GROUP BY e.category ORDER BY regressed DESC;
--   measured technical -> 500, every other category 0
```

**All 500 land in `technical`.** The scope narrows immediately — not a general degradation, a targeted failure on one class of question.

### Step 3: attribute to steps — which tool broke

```sql
SELECT r.agent_version, s.tool_name,
       COUNT(*) AS calls,
       SUM(CASE WHEN s.ok = 0 THEN 1 ELSE 0 END) AS failures,
       ROUND(100.0 * SUM(CASE WHEN s.ok=0 THEN 1 ELSE 0 END)/COUNT(*), 1) AS fail_pct
FROM run_steps s JOIN runs r ON s.run_id = r.run_id
WHERE s.step_type = 'tool'
GROUP BY r.agent_version, s.tool_name ORDER BY r.agent_version;
```

| agent_version | tool_name | calls | failures | fail_pct |
|---|---|---|---|---|
| v1 | search_kb | 2000 | 50 | **2.5** |
| v2 | search_kb | 2000 | 550 | **27.5** |

**`search_kb`'s failure rate went from 2.5% to 27.5%.** The attribution chain is complete:

```text
v2 success rate −25 points
   └─ 500 inputs regressed
        └─ all of them in the technical category
             └─ search_kb failure rate 2.5% → 27.5%
```

From "it got worse in production" to "v2's new retrieval path breaks search_kb on technical questions," in three SQL statements, **with nobody reading logs**.

![Agent trace attribution: snapshots pin the eval set and the memory first; overall v1 is 97.5% ok against v2's 72.5%, a 25-point drop; three SQL statements form the attribution chain — success rate down, 500 inputs regressed, all in the technical category, root cause search_kb failing 2.5% to 27.5%; a fourth statement time-travels through runs.memory_snapshot back to that version of memory to reconstruct what the agent knew at the time](./images/fig_agent-trace_en.svg)

### Step 4: reconstruct what it knew at the time

The first three steps rest on structured trace tables and a frozen eval set. But the deeper question left open in section 1 — **why** — needs one more thing.

Because every run recorded its `memory_snapshot`, the memory it read is still exactly reconstructable months later:

```sql
SELECT r.run_id, r.memory_snapshot, m.fact_key, m.fact_value
FROM runs r
JOIN agent_memory {SNAPSHOT='mem_r1'} m       -- time travel to that version of memory
  ON m.subject_key = CONCAT('cust_', r.input_id)
WHERE r.run_id = 100001;
--   measured 100001 / mem_r1 / plan_tier / basic
```

This is the article's crux. **It upgrades a log into a reconstructable scene**: the trace tells you what the agent did, and the pinned memory version tells you what it was working from. Together they answer "why."

The eval set is equally re-examinable, proving the comparison really was fair:

```sql
SELECT COUNT(*) AS eval_inputs_at_v1 FROM eval_inputs {SNAPSHOT='evalset_v1'};   -- measured 2000
```

### The four gaps this closes

| Gap | How it's closed |
|---|---|
| the comparison isn't fair (the eval set moved) | snapshot the eval set; both sides read the same version |
| can't reconstruct what it knew | record `memory_snapshot` per run, time-travel back afterwards |
| attribution means reading logs | traces land in tables, so attribution is JOIN and GROUP BY |
| evidence expires | freeze this eval round's traces together with the data versions they depend on |

---

## 7. Where this approach fits

### A good fit

- **Teams doing version comparison and regression hunting** — the moment you ask "is the new version better or worse," you need a pinned eval set, or the comparison doesn't hold.
- **Evals whose conclusions get re-examined later** — shipping a model requires evidence, and explaining a score to a customer or a regulator requires it to survive.
- **Agents that read long-term memory or dynamic config** — when behaviour isn't determined by code alone, a `memory_snapshot` column is the only route back to "why."
- **Analysis that crosses traces and business data** — failure rates broken down by customer tier, order value or channel need the traces and the business tables in one place.
- **Data-residency or self-hosting requirements** — when run data shouldn't leave your own infrastructure.

### Not a fit

- **You only need health signals** — if the question is "did latency rise, what's the error rate," an existing APM or a dedicated observability platform already covers it.
- **A prototype-stage solo project** — take something off the shelf and spend your attention on the agent itself.
- **Versioning all production traces indiscriminately** — dozens of steps per run and hundreds of thousands of runs a day means the trace tables grow far faster than business tables. **Snapshots are for pinning the evidence of one eval round, not for long-term versioning of every production trace.**
- **Wanting diff / merge over logs** — as above, that road doesn't lead anywhere.

### A few practical notes

- **A success rate isn't quality.** `status = 'ok'` only says the flow completed, not that the answer was good. Real evaluation needs human or model scoring, and those scores should be bound to the same batch of traces.
- **Don't write `memory_snapshot` as "current."** It must be the exact version identifier at the moment the run started, not a drifting reference like `latest` — otherwise you haven't recorded anything.
- **Align collection with OpenTelemetry where you can.** Even if you store it yourself, following the GenAI semantic conventions for field naming makes swapping backends and plugging into the ecosystem far easier.

---

## Closing

Agent observability is often read as "log everything." But what a trace adds over a log was never volume — it's **structure**. It reconstructs one execution as a tree with causality, latency and cost, so attribution can be handed to a machine.

For agents, structure alone still isn't enough. Their behaviour isn't determined by code alone but also by the memory and config they read at the time, **and those keep changing**. That's why complete logs still don't tell you why: you can see what it did, but not what it knew.

Pin the eval set and the memory as versions, record which version each run read, and investigation shifts from reading logs to querying data: **success rate 97.5% → 72.5%, all 500 regressed inputs in the technical category, root cause search_kb failing 2.5% → 27.5%** — three SQL statements. And "what did this run actually know at the time" is the fourth.

**Traces themselves don't need version control, but for traces to mean anything, what they depend on must be versioned.**
