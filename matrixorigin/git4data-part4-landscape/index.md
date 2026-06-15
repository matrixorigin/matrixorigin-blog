---
title: "MatrixOne Git4Data Deep Dive (Part 4): The Data-Versioning Landscape — How git4data, lakeFS, and Dolt Actually Differ"
author: MatrixOrigin
mail: contact@matrixorigin.io
description: "Part 4 of the MatrixOne Git4Data series: a map of the data-versioning landscape. 'git for data' is claimed by DVC/Git LFS, lakeFS, Iceberg/Delta+Nessie, Dolt, and Snowflake/Neon — but they don't mean the same thing. A five-question framework plus one running scenario (see the change / parallel merge / compute on a version / recovery) put every approach through the same exam, then pin down where MatrixOne sits and its honest boundaries."
tags: ["Technical Insights"]
keywords: ["Git4Data", "MatrixOne", "Data Version Control", "lakeFS", "Dolt", "Snowflake", "Neon"]
publishTime: "2026-06-15T17:00:00+08:00"
date: '2026-06-15'
image:
  "1": "/content/zh/shared/tech.png"
  "235": "/content/zh/shared/tech.png"
lang: en
status: published
translations:
  zh: git4data-part4-landscape-zh
---

# MatrixOne Git4Data Deep Dive (Part 4): The Data-Versioning Landscape — How git4data, lakeFS, and Dolt Actually Differ

The first three articles established what MatrixOne's git4data is, how to use it, and how it works underneath. But before moving into practice, one thing must be settled:

> **"Version control for data" is not something only MatrixOne does.** lakeFS, Dolt, Nessie, Snowflake, Neon, DVC — a crowd of products fly the "git for data" / "version control for data" banner. But what they mean by it is **not the same thing.**

The term "git4data" has been stretched so far it blurs the boundaries. This article settles it properly: a framework first, then **one running scenario** that puts every approach on this track through the same exam — same task, and the difference in each one's answer becomes obvious — and finally MatrixOne's exact coordinates and its honest boundaries.

---

## A framework first

To compare "data version control," you can't just ask "does it have diff/merge?" What actually separates these products is five questions:

1. **What does it version** — file bytes? objects in object storage? table snapshots? or data rows?
2. **At which layer does it sit** — beside the code repo? on top of object storage? on top of a table format? or inside the database kernel?
3. **How fine is the granularity** — a whole file? a whole object? a snapshot? or a single row / cell?
4. **Can you compute directly on a version** — run SQL, aggregate, join dimension tables, do vector search?
5. **What's the collaboration model** — a discrete commit chain? branch + merge? how are conflicts adjudicated?

Of these five, **#3 (granularity) and #4 (can you compute on a version) are the decisive ones** — together they all but determine whether a tool is versioning *data*, or merely versioning the *files that data happens to sit in*.

---

## One running scenario

To make the differences visible, fix a concrete scenario and make every approach answer the same four actions:

> You maintain a data asset — picture a **50-million-row user-feature table** (or a **100GB multimodal training set of millions of files**, whichever fits below). The team repeatedly does four things:
>
> - **Action A | See the change**: after editing a batch of data, know precisely **which rows** changed, and to what.
> - **Action B | Parallel collaboration**: several people each open a branch, edit in parallel, merge back to mainline, with conflicts adjudicated.
> - **Action C | Compute on a version**: go back to a historical version and **directly** run analytical SQL, or pull a batch of training data, on that version.
> - **Action D | Incident recovery**: a dropped table or a botched bulk edit — bring it back in seconds.

Hold these four actions, and each approach's genes show themselves immediately.

---

## Category 1: Git-native file versioning — DVC / Git LFS

**Approach**: treat data as "large files," store **pointers** in Git and **bytes** in a remote cache (S3, etc.). What you see in Git is a tens-of-bytes `.dvc` pointer file; the real data sits in a content-addressed cache.

- **Git LFS**: purely solves "don't blow up the Git repo with big files," handling storage only — it **doesn't understand file contents**, so diffing two versions compares the pointer files, not the data.
- **DVC**: a stronger take on the idea; its strength is binding **data + model + code + pipeline DAG** together (`dvc add`, `dvc repro` to run the DAG, `dvc exp run` for experiments) to make an ML run **reproducible**.

**In the scenario**:

- **Action A (see the change)**: `dvc diff` tells you "`train.parquet` changed" — and that's it. Which 310 rows? Invisible.

- **Action B (parallel merge)**: no data-aware merge; you fall back to **Git's text merge of the pointer files**. Two people editing the same data file is one binary conflict.

- **Action C (compute on a version)**: **can't**. To analyze a version you first `dvc checkout` the files locally, then feed pandas / Spark.

- **Action D (incident recovery)**: `git checkout <old commit>` + `dvc checkout`, swapping files back to the old version — at file granularity.

**Key difference from MatrixOne**: DVC versions **files**, and is **tightly coupled to the code repo**. It's handy for ML pipeline reproduction, but it has no concept of a "row," and can't run SQL on a version. **Pure reproduction pipelines → DVC; row-level semantics and compute-on-a-version → not its track at all.**

---

## Category 2: git-for-data over object storage — lakeFS / Pachyderm

**Approach**: over object storage (S3/OSS), provide git-style commit / branch / merge / revert, acting on **all objects in the whole repository**. It needs **a standing lakeFS server + a metadata KV** (PostgreSQL / DynamoDB in production); the data bytes stay in your object store, lakeFS owns only the metadata.

**lakeFS** is this category's flagship, and the product most often compared with MatrixOne. We've run head-to-head tests, and the picture is clear.

**In the scenario** (using the 100GB multimodal set):

- **Action A (see the change)**: the same batch changed 310 annotation rows, and `lakectl diff lakefs://repo/main lakefs://repo/feature` reports "**6 objects changed**" — its native diff granularity is the **object (whole file)**, it can't show which 310 rows. For row-level, you layer **Iceberg + Spark** on top (lakeFS now ships a `refs_data_diff` Spark SQL function that returns row-level adds/deletes — but **the compute runs in Spark, not in lakeFS**).

- **Action B (parallel merge)**: lakeFS merge is an **object-level three-way merge** — two branches touching **different** objects merge cleanly; but both touching the **same parquet file** is a conflict, and it **can't fuse the two batches of rows inside the file** — only `source-wins` / `dest-wins`.

- **Action C (compute on a version)**: **lakeFS doesn't compute.** To compute metrics, build features, or join dimension tables on a branch, you read the objects out, parse them, and feed an external engine (Spark / Trino / DuckDB).

- **Action D (incident recovery)**: `lakectl branch revert` to a historical commit — at object granularity, whole-repo consistent.

**Where it's strong**: **scope is the whole repository** — one commit / branch / merge naturally covers **all files**, making multi-file, cross-format atomic consistency effortless; this is where lakeFS beats MatrixOne. Content-level versioning of massive **unstructured bytes** (images / video / audio / weights) is its home turf.

**Key difference from MatrixOne**: lakeFS manages **objects**, MatrixOne manages **rows**. The former is "Git for the data lake," the latter is "Git grown inside the database." The two are complementary — **lakeFS owns the bytes, MatrixOne owns the catalog and labels** — and a later article in this series is dedicated to how they combine.

> Same layer: **Pachyderm** — a data-driven pipeline that auto-triggers on data change, plus lineage; same file / commit granularity, no row-level diff, no SQL on a version.

---

## Category 3: table format + git branches — Iceberg / Delta + Nessie

**Approach**: open table formats like Iceberg / Delta Lake / Hudi represent a table as a chain of **immutable snapshots** (each write = a new snapshot), with built-in time travel:

```sql
-- Iceberg: read history by snapshot id or timestamp
SELECT * FROM db.t FOR SYSTEM_VERSION AS OF 10963874102873;
SELECT * FROM db.t FOR SYSTEM_TIME AS OF '2026-06-10 01:21:00';
-- Delta
SELECT * FROM t VERSION AS OF 123;
```

Layer a catalog like **Nessie** (or Unity Catalog) on top and tables gain git-style branches / tags / merge — and a single commit can span **multiple tables**:

```sql
CREATE BRANCH etl IN nessie;
-- edit several tables on the etl branch…
MERGE BRANCH etl INTO main IN nessie;
```

**In the scenario**:

- **Action A (see the change)**: versioning is at the **snapshot level**. Which rows differ between two snapshots, the format doesn't directly tell you — an external engine has to diff the two snapshots.

- **Action B (parallel merge)**: Nessie's merge is a **real merge**, but at **table-snapshot** granularity — a conflict means "the **same table** was changed on both branches" (optimistic concurrency, content-key conflict), **not** the row-level three-way merge of MatrixOne / Dolt. It doesn't adjudicate rows; it delegates that to the table format.

- **Action C (compute on a version)**: **neither the table format nor Nessie computes** — they store snapshots and pointers; all querying is done by external engines (Spark / Trino / Flink / Dremio). The upside: **many engines read the same data**.

- **Action D (incident recovery)**: `RESTORE TABLE t TO VERSION AS OF 123` (Delta) / roll back to a snapshot.

**Key difference from MatrixOne**: this path's strength is **open ecosystem, multi-engine interoperability, lakehouse scale** — one dataset that Spark reads, Trino reads, Flink writes. The cost is **no kernel-level row merge** and **no built-in compute engine**. If your data already lives in an open lakehouse to be shared across engines, this path is the most natural; for row-level git semantics + built-in HTAP compute, it isn't.

---

## Category 4: versioned SQL databases — Dolt

**Approach**: make the **git workflow itself** into a MySQL-compatible database (with a Postgres-compatible Doltgres too). A Merkle / prolly-tree storage layer makes **cell-level** diff a natural byproduct. This is the approach **most similar** to MatrixOne.

**How "git" it is**:

```sql
-- row / cell-level diff (system tables)
SELECT * FROM dolt_diff_orders
WHERE to_commit = HASHOF('HEAD') AND from_commit = HASHOF('HEAD^');
-- time travel
SELECT * FROM orders AS OF 'HEAD~20';
-- three-way merge + conflict table
CALL DOLT_MERGE('feature');                       -- conflicts land in dolt_conflicts_orders (base/our/their columns)
CALL DOLT_CONFLICTS_RESOLVE('orders', '--ours');
```

Plus per-cell `dolt blame`, a full commit graph, remote `dolt clone / push / pull`, and the hosted DoltHub — "**git-semantics-first**," matching the full feel of a developer using git.

**In the scenario**: it nails Actions A / B / D (row-level diff, cell-level three-way merge, reset to a historical commit); Action C too — it *is* a SQL engine, `AS OF` queries any version directly.

**Differences from MatrixOne — the pair most worth getting right**:

- **Dolt's git is deeper**: a distributed git workflow (remotes / push-pull / DoltHub / per-cell blame / a full commit DAG) is its **core pitch**; MatrixOne has none of that, using a snapshot / data-branch model.

- **MatrixOne's engine is stronger**: Dolt **leans OLTP, is single-node, weak analytically** (its own benchmarks land around 1–2× MySQL latency), and its vector search is **beta as of 2.0**; MatrixOne is a **distributed, HTAP, production-vector, cloud-native** engine, strong on "row-level versioning × large-scale analytical compute × one dataset serving both transactions and analytics."

In a line: **Dolt is "git made into a database"; MatrixOne is "an HTAP database that grew git" — one starts from version control, the other from the database engine.**

---

## Category 5: cloud-warehouse zero-copy clone / branch — Snowflake / BigQuery / Neon

**Approach**: mature cloud databases offer **zero-copy clone** and **time travel**, letting you "branch" and "go back in time," but usually **without row-level git semantics** (no DIFF / MERGE / PICK with conflict policy).

**Snowflake**:

```sql
CREATE TABLE t_clone CLONE t;                     -- zero-copy clone (metadata-level, seconds)
SELECT * FROM t AT(OFFSET => -300);               -- how it looked 5 minutes ago
SELECT * FROM t BEFORE(STATEMENT => '01b2...');   -- before a given statement
UNDROP TABLE t;                                   -- rescue a drop
```

Time Travel defaults to **1 day**; **Standard Edition caps at 1 day, only Enterprise reaches 90**, after which a 7-day Fail-safe (Support-only recovery) follows. But there's **no merge primitive** — cloned tables drift independently, with **no way back or way to merge back**; to diff two versions you write `MINUS` / `EXCEPT` yourself.

**Neon** (serverless Postgres, acquired by Databricks in 2025): the headline is **copy-on-write database branches** — each branch an **independent, autoscaling, scale-to-zero** Postgres endpoint, a natural fit for **branch-per-PR** CI. But note: Neon has **no merge primitive at all** — the only parent↔child sync is **reset (a one-way parent→child overwrite that discards the child's changes)** — and its "schema diff" **compares schema only, not data rows**. So Neon is **branch + reset / PITR**, not git-style merge.

**BigQuery**: snapshot tables + time travel, likewise no row-level merge.

**Key difference from MatrixOne**: they all have "zero-copy clone + go back in time," which feels great, but they're **missing git's second half** — row-level `DIFF`, `MERGE` with conflict policy, `PICK`. MatrixOne goes further on row-level git semantics; conversely, **Neon goes further on the serverless form factor (per-branch endpoint, scale-to-zero)** — a form MatrixOne doesn't have yet.

---

## Pinning the differences down: same task, how each one answers

Every approach has now walked the scenario; here are the four sharpest contrasts side by side — same action, where the answers diverge.

### Action A: "310 rows changed — tell me which 310"

| System | Its answer |
|---|---|
| DVC / Git LFS | "some **file** changed" — no rows |
| lakeFS | "**6 objects** changed"; row-level needs Iceberg + Spark (`refs_data_diff`, computed in Spark) |
| Iceberg/Delta + Nessie | a **new snapshot id**; row-level diff needs an external engine to diff two snapshots |
| Snowflake / Neon | **no native row diff**; write `MINUS` / `EXCEPT` yourself (Neon's diff is schema-only) |
| Dolt | `SELECT * FROM dolt_diff_orders …` → **row / cell level**, from_ / to_ laid bare |
| **MatrixOne** | `DATA BRANCH DIFF … OUTPUT SUMMARY` → **UPDATED 310**, milliseconds, scanning only the increment |

This row says it best: **only Dolt and MatrixOne treat the "row" as a first-class citizen** — the rest see a file, or a snapshot, or make you write SQL to cover the gap. The same edit, seen at wildly different resolutions:

![The same edit (310 rows) seen at completely different granularities: file-level / object-level / snapshot-level, down to row·cell level](./images/fig_diff-granularity_en.svg)

### Action B: "two people edit the same table in parallel — merge, adjudicate conflicts"

| System | Merge ability |
|---|---|
| **MatrixOne** | **row-level** three-way merge, `WHEN CONFLICT FAIL / SKIP / ACCEPT` policies |
| Dolt | **cell-level** three-way merge, conflicts in `dolt_conflicts_*`, resolved in SQL |
| lakeFS | **object-level** merge; same file on both sides = conflict, only source / dest wins |
| Nessie | **table-snapshot-level** merge; same table on both sides = conflict |
| Snowflake | **no merge**: clones drift apart, nothing to merge back |
| Neon | **no merge**: only reset (one-way parent→child overwrite) |
| DVC | Git's text merge of the **pointer files** |

Granularity decides whether you can work in parallel without fighting: **editing different rows of the same table is a clean merge in MatrixOne / Dolt, but potentially a conflict in lakeFS / Nessie** — because to them that's "the same file / same table touched on both sides."

### Action C: "on a historical version, directly run analytics / pull training data"

- **Built-in engine, computes directly**: MatrixOne (HTAP SQL + vector), Dolt (OLTP SQL, `AS OF`), Snowflake / Neon (SQL, but the "version" is a clone / branch, not row-level semantics).

- **Doesn't compute, needs an external engine**: lakeFS, DVC, Git LFS, Pachyderm (read the objects out, feed Spark / Trino); Iceberg / Delta also need Spark / Trino / Flink.

This is the **watershed** between the "database approaches" and the "file / object approaches": for the former, "a version" is a table you can immediately `SELECT`, `JOIN`, and vector-search; for the latter, "a version" is a pile of bytes you still have to parse.

### Action D: "dropped a table — recover in seconds"

Nearly every approach has some "go back in time": MatrixOne uses snapshot + PITR (`RESTORE`), Snowflake uses Time Travel + `UNDROP`, Neon uses PITR (branch from a historical LSN), Dolt resets to a historical commit, lakeFS reverts to a historical commit, Iceberg / Delta `RESTORE TO VERSION`. **Recovery is table stakes on this track**; what really separates the field is Actions A / B / C above.

---

## One overview table

| Category | Representatives | What it versions | At which layer | Granularity | Compute on a version | Row-level merge + conflict |
|---|---|---|---|---|---|---|
| Git-native files | DVC / Git LFS | file bytes | beside the code repo | file | ✗ | ✗ |
| git over object store | lakeFS / Pachyderm | objects | over object storage | object (whole file) | ✗ (needs external engine) | ✗ (object-level) |
| table format + git | Iceberg/Delta + Nessie | table snapshots | table format + catalog | snapshot | ✗ (needs external engine) | ✗ (table-snapshot level) |
| versioned SQL DB | Dolt | data rows | database kernel | row / cell | ✓ (SQL, OLTP-leaning; vector beta) | ✓ (cell-level) |
| cloud-warehouse clone / branch | Snowflake / Neon | table/database | database | table/database | ✓ | ✗ (no merge) |
| **in-database git (HTAP)** | **MatrixOne** | data rows + object refs | database kernel | **row / cell** | ✓ (HTAP SQL + vector) | ✓ (row-level, with conflict policy) |

The same landscape, as a positioning map — finer granularity to the right, richer compute toward the top. MatrixOne ends up alone in the top-right corner:

![Positioning map: data-versioning approaches plotted on granularity × compute-on-a-version axes — MatrixOne sits alone in the top-right corner](./images/fig_landscape-map_en.svg)

---

## MatrixOne's coordinates, and its honest boundaries

Condense the map into one position:

> **MatrixOne's git4data ≈ "Dolt's row-level git semantics + Snowflake's zero-copy/time-travel + Neon's database branching + built-in vector/HTAP/SQL compute," all inside one open-source, MySQL-compatible cloud database.**

Its unique value is genuinely fusing **row-level git semantics** with **a live HTAP engine you can run SQL + vector compute on**. Against the four actions: **A see the change** (row-level DIFF), **B parallel collaboration** (row-level three-way merge + conflict policy), **C compute on a version** (HTAP SQL + vector), **D incident recovery** (snapshot + PITR) — it's one of the few that does **all four in a single engine.**

But "comprehensive" also means being clear about what it **isn't**:

- **It doesn't replace DVC**: no native coupling with Git/code/pipelines, none of the "data+model+code" triad reproduction of `dvc repro/exp` — for pure ML pipeline versioning, DVC is still the handier tool.

- **It doesn't replace lakeFS**: massive byte-level unstructured versioning and cross-format whole-repo atomic commits are lakeFS's turf; MatrixOne versions only the file *reference*. → **best used together**.

- **It isn't Dolt**: no distributed git workflow (remotes / push-pull / DoltHub / per-cell blame) — Dolt's git is "deeper."

- **It isn't an open lakehouse format** (Iceberg/Delta): not built for multi-engine interoperability or PB-scale lakehouse ecosystems.

- **It isn't a serverless warehouse** (Snowflake/Neon): it trails on scale, ecosystem breadth, and the per-branch scale-to-zero form factor.

Stating the boundaries isn't weakness — this is exactly the spot on this track **most prone to confusion**, and only by spelling it out can a reader know when to use MatrixOne, when to use someone else, and when to combine them.

---

## Picking one, in a sentence

- Want **row-level versioning + SQL/vector directly on a version + one dataset serving both transactions and analytics** → **MatrixOne** (this series' subject).
- Want **byte-level versioning of massive raw files (images/video/weights)** → **lakeFS** (and combine with MatrixOne: lakeFS owns the bytes, MatrixOne owns the catalog and labels).
- Want **pure ML reproduction, versioning data + model + code together** → **DVC**.
- Data already in an **open lakehouse**, shared across engines → **Iceberg/Delta + Nessie**.
- Want a **full distributed git workflow (push/pull/DoltHub)** → **Dolt**.
- Want **serverless, branch-per-PR, scale-to-zero** → **Neon**.

---

## Closing

The map is drawn. From this article on, the series leaves theory and enters practice — and you set out with a clear coordinate system: knowing what we mean by "git4data," where it stands on the track, and where its edges are.

Next is the first practical stop, and git4data's most unglamorous, most frequent use: **incident rescue** — from a fat-fingered UPDATE to a dropped table, how to bring data back in seconds with snapshots, DIFF, and PITR.

> 📎 Runnable SQL: [github.com/matrixorigin/git4data-tutorial](https://github.com/matrixorigin/git4data-tutorial) ｜ Source & community: [github.com/matrixorigin/matrixone](https://github.com/matrixorigin/matrixone)
