---
title: "MatrixOne Git4Data Deep Dive (Part 4): The Data-Versioning Landscape — How git4data, lakeFS, and Dolt Actually Differ"
author: MatrixOrigin
mail: contact@matrixorigin.io
description: "Part 4 of the MatrixOne Git4Data series: a conceptual map of the data-versioning landscape. The term 'git for data' is claimed by DVC / Git LFS, lakeFS / Pachyderm, Iceberg / Delta + Nessie, Dolt, and Snowflake / Neon — but they don't mean the same thing. A five-question framework, five product families, an overview table, and where MatrixOne git4data actually sits — with its honest boundaries."
tags: ["Technical Insights"]
keywords: ["Git4Data", "MatrixOne", "Data Version Control", "lakeFS", "Dolt"]
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

The first three articles established what MatrixOne git4data is, how to use it, and how it works underneath. But before moving into practice, one thing must be settled:

> **"Version control for data" is not something only MatrixOne does.** lakeFS, Dolt, Nessie, Snowflake, Neon, DVC — a whole crowd flies the "git for data" / "version control for data" banner. But what they mean by it is **not the same thing.**

The term "git4data" has been stretched so far it blurs the boundaries. This article is deliberately conceptual: a map. It lays out the main players on this track by **family**, makes clear *what* each one versions, *at which layer*, and *at what granularity*, and finally pins down MatrixOne git4data's exact coordinates — and its honest boundaries.

---

## A framework first

To compare "data version control," you can't just ask "does it have diff/merge?" What actually separates these products is five questions:

1. **What does it version** — file bytes? objects in object storage? table snapshots? or data rows?
2. **At which layer does it sit** — beside the code repo? on top of object storage? on top of a table format? or inside the database kernel?
3. **How fine is the granularity** — a whole file? a whole object? a snapshot? or a single row / cell?
4. **Can you compute directly on a version** — run SQL, aggregate, join dimension tables, do vector search?
5. **What's the collaboration model** — a discrete commit chain? branch + merge? how are conflicts adjudicated?

Hold these five and walk through each family.

---

## Family 1: Git-native file versioning — DVC / Git LFS

**Approach**: treat data as "large files," store pointers in Git and bytes in a remote cache (S3, etc.).

- **Git LFS**: purely solves "don't blow up the Git repo with big files," handling storage only — it **doesn't understand file contents**, so it can't see which records changed between two versions.
- **DVC**: a stronger take on the Git LFS idea; its strength is binding **data + model + code + pipeline DAG** together for ML reproducibility (`dvc repro` / `dvc exp`).

**Position**: granularity is **file-level**, and it's **tightly coupled to the code repo**. The upside is native unity with your Git workflow and CI; the downside is no row-level diff/merge and no running SQL on a version. **Pure ML reproducibility pipelines** remain DVC's comfortable home.

## Family 2: git-for-data over object storage — lakeFS / Pachyderm

**Approach**: over object storage (S3/OSS), provide git-style commit / branch / merge / revert, acting on **all objects in the whole repository**.

**lakeFS** is this family's flagship, and the product most often compared with git4data. We've run head-to-head tests, and the conclusion is clear — **the key difference isn't "diff/merge or not," it's granularity and scope**:

- **Granularity is the object (whole file), not the row**: in our test, the same batch changed 310 rows, and lakeFS's native diff reported "**6 files changed**" — it can't show which 310 rows. To get row-level, you layer an Iceberg/Delta table format on top of lakeFS.
- **Scope is the whole repository**: one commit / branch / merge naturally covers **all files** in the repo, making multi-file atomic consistency effortless — this is where lakeFS beats git4data.
- **No compute**: lakeFS only does versions; to compute metrics, build features, or join dimension tables on a version, you read the objects out, parse them, and feed an external engine.
- **Needs a standing server + metadata KV.**

**Position**: content-level versioning of massive **unstructured bytes** (images/video/audio/weights) and **cross-format whole-repo atomic commits** — that's lakeFS's home turf, and precisely git4data's boundary (Part 3: git4data versions a file's *reference*, not its bytes). **The two are highly complementary**, and a later article in this series is dedicated to how they combine.

## Family 3: table format + git branches — Iceberg / Delta + Nessie

**Approach**: open table formats like Iceberg / Delta Lake / Hudi carry snapshots and time travel (read history by snapshot id or timestamp); layer a catalog like **Nessie** (or Unity Catalog) on top and tables gain git-style branches / tags.

**Position**: versioning is at the **snapshot level**, queried by external engines (Spark/Trino/Flink); its "merge" is snapshot-level, **not the row-level three-way merge with conflict policy** of git4data/Dolt. Its strength is **open ecosystem, multi-engine interoperability, lakehouse scale** — not MatrixOne's positioning, but the most natural path if your data already lives in an open lakehouse.

## Family 4: versioned SQL databases — Dolt

**Approach**: make the **git workflow itself** into a MySQL-compatible database. This is the family **most similar** to git4data.

**Dolt** has true cell-level versioning, `diff` / `branch` / `merge` (with conflicts), plus remotes, network `clone`, `push` / `pull`, DoltHub, per-cell `blame`, and a full commit graph — "**git-semantics-first**," matching the full feel of a developer using git.

**Differences from git4data**:
- **Dolt's git is deeper**: a distributed git workflow (remotes / push-pull / per-cell blame / commit DAG) is its core; git4data has none of these, using a snapshot/branch model instead.
- **git4data's engine is stronger**: Dolt leans OLTP, is weaker analytically, has no vectors, and has historically been single-node; git4data runs on a **distributed, HTAP, vector-capable, cloud-native** engine, strong on "row-level versioning × large-scale compute × one dataset serving both transactions and analytics."

In a line: **Dolt is "a database that does version control"; git4data is "an HTAP database that grew version-control capability" — different starting points.**

## Family 5: cloud-warehouse zero-copy + time travel — Snowflake / BigQuery / Neon

**Approach**: mature cloud databases offer **zero-copy clone** and **time travel**, but usually **without row-level git semantics.**

- **Snowflake**: `CLONE` (zero-copy clone of a database/table) + Time Travel (1 day by default, up to 90), strong in a mature warehouse ecosystem.
- **Neon**: serverless Postgres, headlined by **copy-on-write database branches** (each branch an independent, autoscaling, scale-to-zero Postgres endpoint — a natural fit for branch-per-PR CI) + PITR.
- **BigQuery**: snapshot tables + time travel.

**Position**: they all have "zero-copy clone + go back in time," but **lack the row-level `DIFF / MERGE / PICK` + conflict policies** of git semantics. git4data goes a step further on row-level git semantics; Neon goes a step further on the serverless form factor (per-branch endpoint, scale-to-zero).

---

## One overview table

| Family | Representatives | What it versions | At which layer | Granularity | Compute on a version | Row-level merge + conflict |
|---|---|---|---|---|---|---|
| Git-native files | DVC / Git LFS | file bytes | beside the code repo | file | ✗ | ✗ |
| git over object store | lakeFS / Pachyderm | objects | over object storage | object (whole file) | ✗ (needs external engine) | ✗ (object-level) |
| table format + git | Iceberg/Delta + Nessie | table snapshots | table format + catalog | snapshot | needs external engine | ✗ (snapshot-level) |
| versioned SQL DB | Dolt | data rows | database kernel | row / cell | ✓ (SQL, OLTP-leaning) | ✓ |
| cloud-warehouse clone | Snowflake / Neon | table/database | database | table/database | ✓ | ✗ |
| **MatrixOne git4data** | — | data rows + object refs | database kernel (HTAP) | **row / cell** | ✓ (HTAP SQL + vector) | ✓ |

The same landscape, as a positioning map — finer granularity to the right, richer compute toward the top. git4data ends up alone in the top-right corner:

![Positioning map: data-versioning families plotted on granularity × compute-on-a-version axes — git4data sits alone in the top-right corner](./images/fig_landscape-map_en.svg)

---

## MatrixOne git4data's coordinates, and its honest boundaries

Condense the map into one position:

> **git4data ≈ "Dolt's row-level git semantics + Snowflake's zero-copy/time-travel + Neon's database branching + built-in vector/HTAP/SQL compute," all inside one open-source, MySQL-compatible cloud database.**

Its unique value is genuinely fusing **row-level git semantics** with **a live HTAP engine you can run SQL + vector compute on** — exactly what the first three articles kept showing and the practical articles will put to work.

But "comprehensive" also means being clear about what it **isn't**:

- **It doesn't replace DVC**: no native coupling with Git/code/pipelines, none of the "data+model+code" triad reproduction of `dvc repro/exp` — for pure ML pipeline versioning, DVC is still the handier tool.
- **It doesn't replace lakeFS**: massive byte-level unstructured versioning and cross-format whole-repo atomic commits are lakeFS's turf; git4data versions only the file *reference*. → **best used together**.
- **It isn't Dolt**: no distributed git workflow (remotes / push-pull / DoltHub / per-cell blame).
- **It isn't an open lakehouse format** (Iceberg/Delta): not built for multi-engine interoperability or PB-scale lakehouse ecosystems.
- **It isn't a serverless warehouse** (Snowflake/Neon): it trails on scale, ecosystem breadth, and the per-branch scale-to-zero form factor.

Stating the boundaries isn't weakness — this is exactly the spot on this track **most prone to confusion**, and only by spelling it out can a reader know when to use git4data, when to use someone else, and when to combine them.

---

## Picking one, in a sentence

- Want **row-level versioning + SQL/vector directly on a version + one dataset serving both transactions and analytics** → **MatrixOne git4data** (this series' subject).
- Want **byte-level versioning of massive raw files (images/video/weights)** → **lakeFS** (and combine with git4data: lakeFS owns the bytes, MatrixOne owns the catalog and labels).
- Want **pure ML reproduction, versioning data + model + code together** → **DVC**.
- Data already in an **open lakehouse**, shared across engines → **Iceberg/Delta + Nessie**.
- Want a **full distributed git workflow (push/pull/DoltHub)** → **Dolt**.
- Want **serverless, branch-per-PR, scale-to-zero** → **Neon**.

---

## Closing

The map is drawn. From this article on, the series leaves theory and enters practice — and you set out with a clear coordinate system: knowing what we mean by "git4data," where it stands on the track, and where its edges are.

Next is the first practical stop, and git4data's most unglamorous, most frequent use: **incident rescue** — from a fat-fingered UPDATE to a dropped table, how to bring data back in seconds with snapshots, DIFF, and PITR.

> 📎 Runnable SQL: [github.com/matrixorigin/git4data-tutorial](https://github.com/matrixorigin/git4data-tutorial) ｜ Source & community: [github.com/matrixorigin/matrixone](https://github.com/matrixorigin/matrixone)
