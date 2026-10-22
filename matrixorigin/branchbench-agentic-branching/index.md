---
title: "None of Them Finished: BranchBench and the New Yardstick for Database Branching in the Agent Era"
author: MatrixOrigin
mail: contact@matrixorigin.io
description: "BranchBench, from Columbia's DAPLab, is the first benchmark to systematically measure database branching under agentic workloads: five workloads, a two-hour timeout, and not one of Neon, Dolt, Xata, TigerData or the PostgreSQL baselines finished. This piece unpacks what it measures, why nested transactions fall short, the four-way taxonomy of branching designs, the structural Neon-versus-Dolt trade-off, and Dolt's public response."
tags:
  - Technical Insights
keywords:
  - BranchBench
  - AI Agent
  - Database Branching
  - Neon
  - Dolt
  - MatrixOne
  - Git4Data
  - MCTS
publishTime: "2026-08-19T17:00:00+08:00"
date: 2026-08-19
lang: en
status: draft
translations:
  zh: branchbench-agentic-branching-zh
---

# None of Them Finished: Reading BranchBench, and the New Yardstick for Database Branching in the Agent Era

Start with one number.

On Terminal-Bench, giving an agent Monte Carlo Tree Search (MCTS) lifted task success from **3.4% to 30.6%**. Nearly a 9× improvement, and it **did not come from a smarter model** — the model was the same. It came from something much more mundane: the agent could efficiently **fork many candidate states, evaluate each, and throw away the bad ones**.

Once that holds, the pressure travels down the stack. If "being able to open many parallel worlds" is one of the main ways an agent gets better, then the systems that hold those parallel worlds — the filesystem, the process, and **the database** — become the new bottleneck.

And on the database side, "branching" has been on sale for a few years now: Neon, Dolt, Xata and TigerData all pitch zero-copy branching. **The question is whether the branching they sell is the same thing an agent needs.**

In April 2026, Columbia's DAPLab (Eugene Wu and Kostis Kaffes's group) published [**BranchBench**](https://arxiv.org/abs/2604.17180), the first benchmark to answer that question systematically. The finding is blunt:

> **Across five representative workloads with a two-hour timeout, not one of the systems tested finished.**

This article does three things: explain what BranchBench actually measures, why the trade-off it exposes is structural rather than incidental, and what it means for anyone building data-versioning capability — ourselves included.

---

## 1. First, the distinction: a developer's branch is not an agent's branch

Today's branchable databases are essentially designed around how **developers** use branches:

```text
Developer:          main ──┬── feature/new-schema     (days to weeks)
                           └── staging                (long-lived)
                           a handful, long-lived, created by hand, a human presses enter
```

An agent's usage has a different shape:

```text
Agent:    root ──┬── b1 ──┬── b3 ──┬── b7 …          (deep, narrow: MCTS runs tens to
                 │        └── b4                      hundreds of levels; branches live
                 ├── b2 …                             milliseconds to minutes)
                 └── (1,000 forks at once, all discarded after the run)
                 hundreds to thousands, short-lived, machine-created, every second
```

The paper compresses the loop into four beats: **branch → mutate → evaluate → prune**. A single agent solving a **single task** may run that loop a thousand times.

The difference isn't only volume. Three other things change:

1. **Mutations aren't only logical — they're physical.** The agent doesn't just `UPDATE` a few rows; it runs `CREATE INDEX`, changes materialised structures, adjusts system configuration — **because what it's evaluating is often the physical design itself**. Those physical changes must also be forkable, comparable, and discardable speculative state.
2. **Evaluation is often cross-branch.** "Which cleaning path is best?" "What's the distribution across these 1,000 simulations?" The answer to those lives in no single branch; it **requires cross-branch aggregation**.
3. **Branch lifecycle becomes the dominant cost.** A developer creates a branch once a week and won't notice a one-second creation latency. An agent creates several per second, and creation latency directly sets how many hypotheses it can explore per unit of time.

![A developer's branches versus an agent's branches: developers keep a handful of long-lived branches created by hand, while an agent produces deep narrow MCTS trees, very wide flat simulation stars, moderately bushy software-engineering trees, and wide shallow data-curation trees — hundreds to thousands of short-lived branches created by machine every second. The figure also lists the three things that change (physical mutations must be forkable too, evaluation is often cross-branch, branch lifecycle becomes the dominant cost) and the headline finding that across five workloads with a two-hour timeout none of the six systems finished](./images/fig_branch-shapes_en.svg)

---

## 2. "Isn't this just transactions?" — why nested transactions and savepoints fall short

This is the most common first reaction to "database branching," and it deserves a serious answer. The paper gives four reasons, and I think this is the most valuable section in it:

**First, long transactions fight MVCC.** Transaction systems are optimised for **short-lived** units of work. A long-lived speculative transaction pins historical versions and blocks garbage collection. Mechanisms like SAGAs and long-lived transactions decompose long work into compensatable steps, but **they still operate over a single shared mainline** — while agents need structurally separate branches.

**Second, transactions have no first-class "branch" abstraction.** No durable named branches, no explicit parent-child lineage, no efficient branch switching, no principled merge semantics.

**Third, merge is not commit.** Once several candidate branches have each evolved, "merge the chosen one back into the parent state" is a **fundamentally different operation** from "commit a transaction."

**Fourth, transactions roll back logical changes but don't treat physical changes as speculative state.** Indexes and materialised views, in the transaction model, get built and reverted *sequentially*; what the agent needs is **several built side by side, then compared**.

The paper is honest about where transactions do fit: if your exploration tree can be executed **depth-first and serially**, and each branch is pruned immediately after evaluation (no need for concurrent branches), then savepoints really are a fast, lightweight branching mechanism. In the experiments PostgreSQL's txn/savepoint did complete two such workloads. **But only those.**

---

## 3. Five workloads: what BranchBench actually measures

BranchBench uses TPC-C / TPC-H schemas (CH-benCHmark) and defines five representative workloads. They are **deliberately different shapes**, covering depth, fanout, mutation intensity, and lifecycle management:

### 1. Agentic Software Engineering (moderately bushy tree)

A fleet of agents changes code and database in parallel. One iteration = read the database → `ALTER TABLE` / `CREATE INDEX` → backfill → run the tests. **Until every test passes, the whole iteration is speculative and must be revertible as a unit.**

> The paper's example is concrete: an agent adds customer loyalty tiering. It forks B1 from main to add a `tier` column, then forks B2 from B1 to backfill. Tests show almost every customer lands in the lowest tier — the thresholds were wrong. So it forks B3 from **B1** (not B2), backfills with new thresholds, the tests pass, B3 merges to main, the rest are deleted.

Branching does two jobs here: **isolating concurrently working agents from each other**, and **checkpointing every state-mutating action** so a revert is cheap.

### 2. Failure Reproduction (wide, flat star)

Production throws an error, likely triggered by some past transaction. The approach resembles `git bisect`: fork from a known-good historical state, replay a prefix of the transaction log, run the test to see whether the error reproduces, and binary-search toward the culprit. Expected to create log₂(N) branches. **Stresses: fast branch creation and reset, high write throughput.**

### 3. Data Curation (wide, shallow tree + cross-branch comparison)

Continuous monitoring finds data anomalies; one branch per anomaly explores a different cleaning approach, and within each, branch-mutate-validate explores different hyperparameters (thresholds, window sizes). **Stresses: high write throughput and efficient scans within a branch, plus fast cross-branch reads** — because the point is to compare which cleaning path won.

> Example: `customer` has missing `c_balance` values and suspicious outliers in `c_ytd_payment`. The agent opens one subtree for imputation strategies, one branch that just drops nulls, and a third subtree clipping outliers at various percentiles; after each cleaning operation it runs data-quality checks and compares across branches to discard the poor candidates.

If that sounds familiar, it's essentially the curation flow we walked through by hand in SQL in [Git4Data Parts 11 and 12](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/git4data-part11-sft-curation/index.md) — except there a human pressed enter, and here it's an agent, dozens of branches at a time.

### 4. MCTS (deep, narrow tree)

The 3.4%→30.6% scenario from the top. Select a promising leaf → expand it with an untried action (one `UPDATE`/`INSERT`) → simulate a random rollout → score the state with an analytical query → backpropagate the reward. The tree can run **tens to hundreds of levels deep**, with 3–10 children per node, expanded in parallel across subtrees, with a background process pruning low-value branches.

> Example: the agent plans which warehouse fulfils each order to minimise shipping cost. Each level is one order; sibling branches assign it to different warehouses, with `UPDATE stock` decrementing that warehouse's inventory and thereby constraining later choices. After the rollout, `SELECT SUM(ol_amount) FROM order_line JOIN warehouse` scores the whole plan.

### 5. Monte Carlo Simulation (very wide, very flat)

Fork **a thousand** branches at once; each independently runs tens to hundreds of `INSERT`/`UPDATE` operations to simulate one possible future; then **one cross-branch aggregation** computes the distribution, and every branch is discarded. **Stresses: bulk branch creation, aggregate write throughput, cross-branch aggregation queries, efficient garbage collection.**

---

## 4. A taxonomy: today's "zero-copy branching" is really four different things

This section is valuable for anyone working on storage engines. The paper classifies systems by **which DBMS layer implements the copy-on-write logic**:

| Layer | Branch mechanism | Systems |
|---|---|---|
| Storage substrate | Block-level CoW (4–64 KB) | TigerData, Xata, Vela, PG file copy |
| Recovery manager | WAL-based reconstruction (mark an LSN) | Neon |
| Storage manager | Page-level CoW | Minuet (research) |
| Storage manager | Content-addressed tree (Prolly tree) | Dolt |
| Storage manager | Delta overlays | Decibel (research) |

**This isn't an academic taxonomy — it determines each system's personality:**

- **Block-level CoW** treats the DBMS as a black box: light in the data plane, **heavy in the control plane** — after creating a branch you must re-instantiate the compute engine and connections. And when block boundaries don't align with database pages, small updates cause write amplification.
- **WAL reconstruction** (Neon) creates a branch by marking an LSN and sharing unchanged pages with the parent. But Neon gives **each branch its own compute instance** — the root cause of everything that follows.
- **Content-addressed tree** (Dolt) works like git: a branch is a new pointer to a committed root node, and an update only copies and re-hashes the nodes along the path. Branching is nearly free; the cost shows up in reads, since every query walks that tree.

### The capability list first: who supports what

Before any performance test, the paper lays out a feature-support matrix. **This table deserves a look before any of the numbers:**

| System | Create | Delete | Persist | Concurrent ops | Merge | Diff | **Cross-branch agg.** | Concurrent live branches | Schema change | Physical data ops |
|---|---|---|---|---|---|---|---|---|---|---|
| Neon | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | **✗** | ∼ | ✓ | ✓ |
| Dolt | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **✗** | ✓ | ∼ | ∼ |
| TigerData | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | **✗** | ∼ | ✓ | ✓ |
| Xata | ✓ | ✓ | ✓ | ✓ | ✓ | ∼ | **✗** | ∼ | ✓ | ✓ |
| PG file copy | ✓ | ✓ | ✓ | ∼ | ✗ | ✗ | **✗** | ✓ | ✓ | ✓ |
| Txn/Savepoint | ✓ | ✓ | ✗ | ✗ | ∼ | ✗ | **✗** | ✓ | ∼ | ✗ |

(✓ full support; ✗ none; ∼ partial)

**Note the bolded column: cross-branch aggregation, unsupported by all six systems.** And cross-branch questions are exactly what an agent asks when evaluating candidates — "what's the distribution across these 1,000 trials," "which cleaning path is best." **Merge exists in only half of them, and Diff is fully supported only by Dolt.** In other words, under the same four words "supports branching," these systems ship wildly different things.

---

## 5. The result: none of them finished

The systems tested were Neon, DoltgreSQL, TigerData and Xata, plus two PostgreSQL baselines (transactions/savepoints, and PG 18's `file_copy_method=clone`). Self-hosted systems ran on a c8i.4xlarge (16 vCPU / 32 GB); Neon was tested through its hosted service in the same region (us-east-1). Each workload had a two-hour timeout.

### Capability matrix: first can it run, then how fast

| System | Software Dev | Failure Repro | Data Cleaning | MCTS | Simulation |
|---|---|---|---|---|---|
| Neon | ∼ | ✓ | ∼ | ∼ | ✗ |
| Dolt | ✓ | ✓ | ✓ | ∼ | ✗ |
| Xata | ✗ | ✗ | ✗ | ✗ | ✗ |
| TigerData | ∼ | ✓ | ∼ | ∼ | ✗ |
| PG Clone | ✗ | ✓ | ✗ | ✗ | ✓ |
| Txn/Savepoint | ✗ | ✓ | ✗ | ✗ | ✓ |

(✓ completed; ✗ could not execute; ∼ partial or errored)

**No row is all ✓.** The failure reasons are worth reading:

- **Neon**: the hosted service allows at most **20 concurrent live branches** (each branch is attached to a compute instance). Software Dev, Data Cleaning and MCTS all need more. MCTS completed only **33 of 1,000 steps**; Software Dev 25/100; Data Cleaning 26/200; Simulation 348/1,000 — counted as a full failure because the final cross-branch aggregation couldn't be done.
- **Dolt**: reads traverse the content-addressed tree, which grows with **both branch count and mutation count**. MCTS reached **170/1,000 steps** before the two-hour timeout; at Simulation's 1,000 concurrent branches, reads got so slow that it never terminated gracefully and **final statistics couldn't even be collected**.
- **TigerData**: completed nothing except Failure Repro. Data Cleaning got 16/200 before stalling waiting for branches; the rest fell over on **undocumented API rate limiting**.
- **Xata**: mid-experiment **their team disabled the API access**, and everything after that returned 403.
- **PG txn/savepoint**: usable only on the two workloads that prune immediately after evaluation — because switching to a different savepoint means discarding the current state.
- **PG clone**: the source database **cannot have active connections** during cloning (PostgreSQL blocks all connections to the template database to guarantee consistency), which conflicts directly with "several agents are using it right now."

### Two extremes: the personalities of Neon and Dolt

Only Neon and Dolt were mature enough for a real comparison, and the results split cleanly into two corners:

| | Neon | Dolt |
|---|---|---|
| Branch creation | **25×** slower | near-instant |
| Branch switching | **1500×** slower | near-instant |
| Branch-local point read | slower (network round-trip) | **faster** (executes locally) |
| Branch-local range scan | fast | **2–4000×** slower |
| Concurrent-branch scaling | near-linear (**capped at 20**) | **plateaus at 4** |
| Software Dev storage | **4.0 GB** | 93.1 MB |

A few details deserve their own line:

- **Dolt's 4000× shows up on range scans**, from traversing the content-addressed tree. That also explains its collapse on Simulation (1,000 branches × 50 mutations per step), where range queries dominated end-to-end latency.
- **Neon's 43× storage overhead shows up on Software Dev**, a workload of "schema change + backfill" — suggesting Neon doesn't share overlapping data well across schema updates. Conversely, on Data Cleaning it's Dolt that uses more (94.1 MB vs 4.7 MB), because that workload adds a column with `DEFAULT FALSE`: PostgreSQL stores it as metadata, while Dolt **materialises the column for every existing row**.
- **The microbenchmark contains a lovely control**: on single-branch scaling, adding branches does **not** slow either system's single-branch reads — both isolate correctly. But on multi-branch scaling, Neon scales near-linearly with concurrent branches (each has its own instance) while **Dolt flattens at 4** — all branches run in one process over a fixed resource pool, so an extra branch brings no extra compute.
- The paper discounts its own storage figures: **Neon's storage statistics are unreliable** (collection starts 15 minutes in, updates hourly, and resource reclamation interferes), so they're order-of-magnitude only. That kind of self-limiting is a large part of why a benchmark paper is credible.

### The structural trade-off

Plot these on two axes — **how cheap branch management is, and how fast branch-local queries are** — and every system clusters into two corners, with **the top-right empty**:

```text
 fast branch-local
   queries
      ▲
      │   Neon               ← one compute instance per branch:
      │   (capped at 20)        fast queries, expensive create/switch, hard cap
      │
      │                    ┌──────────────────┐
      │                    │  nothing is here │
      │                    │  cheap, concurrent│
      │                    │  and query-efficient│
      │                    └──────────────────┘
      │
      │                                  Dolt
      │                                  (plateaus at 4)
      └──────────────────────────────────────▶
                             cheaper branch management
```

DAPLab's own words: **"That system does not exist yet."**

![A two-dimensional trade-off chart for branching: the x-axis is how cheap branch management is, the y-axis how fast branch-local queries are. Neon sits top-left with one compute instance per branch — fast queries but 25x slower branch creation, 1500x slower switching, and a hard cap of 20 concurrent live branches. Dolt sits bottom-right where its content-addressed tree makes branching nearly free but range scans run 2 to 4000 times slower and throughput plateaus at 4 branches. The top-right quadrant is empty. The figure also explains that both failure modes are architectural consequences, and that the microbenchmark shows both systems isolate single branches correctly — the difference is whether adding a branch adds compute](./images/fig_branch-tradeoff_en.svg)

And don't forget that whole column of ✗ in the feature table: **cross-branch aggregation, natively supported by none of the six**. Which means that even if some system one day wins both "cheap branching" and "fast queries," it's still one step short of what agents need — because the questions agents ask most often have answers that live in no single branch.

---

## 6. Dolt's response: a consensus still being formed

A month after BranchBench, DoltHub published [a response](https://www.dolthub.com/blog/2026-06-03-branch-bench-database-benchmarking-for-agentic-workflows/), and the posture is worth crediting: **concede first, then argue.**

**What they concede**: Dolt's branching really is much faster, but its query performance really is quite a bit worse on some workloads, and Dolt's storage does carry higher inherent overhead than Postgres. **What they don't accept is the 4000× magnitude.** They plan to add BranchBench to their standard test suite and investigate the bottlenecks systematically.

**What they argue — two methodological points, neither of them evasive:**

1. **How cross-branch queries were implemented.** BranchBench issues them over separate connections with driver-level knowledge. **Dolt supports cross-branch queries natively in SQL** — joins, aggregates, window functions, all expressible across branches. Simulating it at the driver layer means the benchmark never exercised the system's actual strength.
2. **The workload parameterisation may not match real agent behaviour.** A fixed number of concurrent workers may not reflect reality: real workflows more likely involve agent-owned branch heads with nested subagents that can block and synchronise — a structure that naturally creates the right moments for cross-branch queries and roll-ups.

Both points aim at the same thing: **the first version of any benchmark necessarily encodes its designers' assumptions about how agents will use a database**, and that assumption is still evolving. Dolt's second point effectively says "the exploration pattern you measured isn't agent-like enough" — which is far more interesting than "you measured it wrong."

**This is what a benchmark in a new field should look like**: the paper open-sources code and data ([ElaineAng/db-fork](https://github.com/ElaineAng/db-fork)), abstracts each backend behind a set of timed primitives (create branch, connect to branch, delete branch, execute SQL) so **any system that implements that interface can be measured**; the systems under test can publicly push back; the next version improves.

---

## 7. The bigger picture: BranchBench is one piece

BranchBench isn't a standalone paper. The same group is pushing a full research agenda called **Agentic Data Environments (ADE)** ([IEEE Data Engineering Bulletin, 2026](https://www.cs.columbia.edu/~kkaffes/papers/agenticdataenvs-ieee2026.pdf)). It starts from a plain equation:

```text
Value of automation = Benefits − Costs
```

Benefits (speed, scale, labour savings) **accumulate gradually**; costs are **abrupt, catastrophic, and hard to reverse** — deleting a production database, triggering a cloud outage, exfiltrating data. The paper invokes prospect theory: humans weigh losses far more heavily than equivalent gains. Therefore:

> **"Best-effort" safety is not enough** — higher average reliability doesn't move adoption while catastrophic outcomes remain plausible.

That leads directly to ADE's two responsibilities: **Amplify Capability** (actively organise heterogeneous information into agent-ready representations) and **Bound Risk** (provide guarantees today's stacks lack). Bound Risk in turn rests on two pillars:

- **Branching** — protecting **state safety**: let the agent interact with live environments inside isolated speculative copies;
- **Data Flow Control (DFC)** — protecting **data safety**: constrain which information may flow from which sources to which sinks (tables, files, prompts, tools, agent memory, external APIs). **An agent having legitimate access does not mean it may combine and export freely.**

And **branching doesn't stop at the database**. Real agents use the database plus the filesystem, process memory, terminal context, caches and application runtimes. The paper's sharpest example: an agent explores an alternative schema from Python while holding a live DB connection — **branch only the database and Python's cached metadata is stale; branch only Python and speculative database writes leak across branches**. A correct branch must capture a coherent slice across both. On that line they built [StateFork / Waypoint](https://daplab.cs.columbia.edu/general/2026/06/04/statefork-give-agents-a-rewind-button.html) and Chkpt: checkpointing just the filesystem takes **66 ms** (independent of size), while a container checkpoint of 2 GB takes **11.21 s**; for 1 GB of in-memory plus filesystem state, Chkpt takes **1.46 s** against Podman+CRIU's **8.84 s**.

Trace it back one more year and the line starts at [Toward Systems Foundations for Agentic Exploration](https://arxiv.org/abs/2510.05556) (SOSP'25 SAA workshop), whose three open problems are still open: **fork semantics** (how branches reveal or hide tentative updates), **external side effects** (services must expose versioned interfaces, or their calls must be intercepted), and **native forking** (cloning databases and runtimes in microseconds without bulk copying).

---

## 8. What this means for us

**One thing has to be said plainly first: BranchBench did not test MatrixOne.** The list was Neon, DoltgreSQL, TigerData, Xata and PostgreSQL baselines. So what follows is **a qualitative comparison, not a performance claim** — we have no BranchBench numbers for MatrixOne.

With that stated, several things here are directly interesting to us:

**First, it supplies a coordinate system we've been missing.** We spent fifteen parts of the [Git4Data series](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/git4data-part8-ml-lifecycle/index.md) on *what you can do*. BranchBench is about *whether it's fast enough and whether it holds up* — **at agent scale, a capability list and a performance curve are two different things**, and until now the second had no agreed yardstick.

**Second, both failure modes trace back to architecture.** Neon's 20-branch cap comes from "one compute instance per branch"; Dolt's 4-branch plateau comes from "all branches inside one process." **Both are architectural consequences, not tuning problems.** MatrixOne implements CoW in the storage engine and separates storage from compute — in the paper's taxonomy that puts it in the "storage-manager CoW" row (same layer as Dolt, different mechanism), while separation of storage and compute means a branch isn't bound to a fixed compute instance. **Whether that actually captures both sides of the trade-off is an empirical question — which is precisely why it should be measured.**

**Third, that column of ✗ is an opening.** Cross-branch aggregation is natively supported by **none** of the tested systems, and it's a hard requirement for evaluating candidate states. Throughout the Git4Data series we've been writing queries like `FROM t {SNAPSHOT='v1'}`, so cross-version comparison is ordinary SQL for us — [Part 15](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/git4data-part15-agent-evolution/index.md), where three candidate configurations are scored and promoted or rejected on quality *and* cost, is essentially a small MCTS evaluation. **But between "expressible" and "still fast at a thousand branches" sits an entire benchmark.**

**Fourth, three of the five workloads are things we've already written up.** Data Curation is [Part 11](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/git4data-part11-sft-curation/index.md) and [Part 12](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/git4data-part12-rlhf-preference/index.md); the software-engineering pattern of "checkpoint, revert the whole iteration on failure" is [Part 7's Write-Audit-Publish](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/git4data-part7-write-audit-publish/index.md); Failure Reproduction is a close cousin of [Part 5's incident rescue](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/git4data-part5-incident-rescue/index.md). **The difference is concurrency and branch count** — we wrote at human cadence; BranchBench measures machine cadence.

**Fifth, and most worth remembering: this doesn't end inside the database.** The ADE paper is explicit — branching the database alone is insufficient, because an agent's state spans processes, files, terminals and external services. What a database can offer is **the segment of that chain with the clearest semantics and the best odds of being correct**: branching, comparing and rolling back structured state. Getting that segment right is necessary; don't mistake it for sufficient.

**What we should do next is clear**: BranchBench is open source and its backends are pluggable (implement create-branch, connect-branch, delete-branch and execute-SQL as timed primitives). **Plug MatrixOne in, run it, and publish the numbers** — flattering or not. In a field that just got its first yardstick, measuring before talking is worth considerably more than the reverse.

---

## References

- Elaine Ang, In Keun Kim, Sam Weldon, Kevin Durand, Kostis Kaffes, Eugene Wu. [BranchBench: Aligning Database Branching with Agentic Demands](https://arxiv.org/abs/2604.17180). arXiv:2604.17180, 19 Apr 2026. Code and artifacts: [ElaineAng/db-fork](https://github.com/ElaineAng/db-fork)
- Short version: BranchBench: An Extensible Benchmark for Agentic Database Branching. CAIS'26 SAO Workshop, 26 May 2026.
- Columbia DAPLab. [Branchable Databases Aren't Ready for Agentic Workloads](https://daplab.cs.columbia.edu/general/2026/05/26/branchable-databases-arent-ready-for-agentic-workloads.html), 26 May 2026
- Columbia DAPLab. [The Need for Agentic Data Environments](https://daplab.cs.columbia.edu/general/2026/05/21/the-need-for-agentic-data-environments.html), 21 May 2026
- Columbia DAPLab. [StateFork: Give Agents a Rewind Button](https://daplab.cs.columbia.edu/general/2026/06/04/statefork-give-agents-a-rewind-button.html), 4 Jun 2026
- Elaine Ang et al. [Agentic Data Environments](https://www.cs.columbia.edu/~kkaffes/papers/agenticdataenvs-ieee2026.pdf). Bulletin of the IEEE Computer Society TCDE, 2026
- Jiakai Xu, Tianle Zhou, Eugene Wu, Kostis Kaffes. [Toward Systems Foundations for Agentic Exploration](https://arxiv.org/abs/2510.05556). SOSP'25 SAA Workshop
- DoltHub. [BranchBench: Database Benchmarking for Agentic Workflows](https://www.dolthub.com/blog/2026-06-03-branch-bench-database-benchmarking-for-agentic-workflows/), 3 Jun 2026
