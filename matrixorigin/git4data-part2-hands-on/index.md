# MatrixOne Git4Data Deep Dive (Part 2): From Zero, Through Every Git Primitive

In Part 1 we covered **what** Git4Data is and **why** it matters. This time we go straight to hands-on. Within ten minutes you'll have MatrixOne running on your own machine, load a million rows of realistic data, and then **run every Git primitive, one SQL statement at a time** — snapshot, clone, branch, row-level diff, merge, cherry-pick, point-in-time recovery. Every SQL is copy-paste runnable; finish the walkthrough and you'll have *actually worked with data the Git way*, at scale.

> Project: [github.com/matrixorigin/matrixone](https://github.com/matrixorigin/matrixone) ｜ Docs: [docs.matrixorigin.cn](https://docs.matrixorigin.cn/)

---

## A quick intro to MatrixOne

[MatrixOne](https://github.com/matrixorigin/matrixone) is an **open-source, cloud-native, distributed SQL database**, released under Apache 2.0 and wire-compatible with MySQL — every MySQL client, driver, and ORM connects to it as-is.

MatrixOne natively handles multiple data types and workloads (OLTP, OLAP, time series, vector search, full-text search). Its architecture fully separates storage from compute: compute nodes are stateless containers, and the storage layer sits directly on S3-compatible object storage. That "**storage-compute separation + immutable objects + MVCC**" design is exactly what lets it bake **Git-style version control into the database kernel** — so rather than an add-on feature, Git4Data is a natural consequence of how MatrixOne is built.

> Want the architecture and internals? The next article in this series covers them in detail. This one focuses on putting the capabilities to use.

---

## Step 1 — Install MatrixOne

The fastest path is one Docker command:

```bash
docker run -d -p 6001:6001 --name matrixone matrixorigin/matrixone:latest
```

Once the container is up, connect with any MySQL client (default user `root`, password `111`, port `6001`):

```bash
mysql -h 127.0.0.1 -P 6001 -u root -p111
```

Sanity check inside the session:

```sql
SELECT version();
```

A version string comes back — you now have a complete, local, single-node MatrixOne that can run everything in this article.

> Building from source? See the [guide](https://github.com/matrixorigin/matrixone/blob/main/etc/DEV_README.md) in our GitHub repo.

> 📦 **All the SQL in this article lives in a companion repo**: [**matrixorigin/git4data-tutorial**](https://github.com/matrixorigin/git4data-tutorial).
> Rather than copy each snippet, you can run the whole walkthrough with one line:
> ```bash
> mysql -h 127.0.0.1 -P 6001 -u root -p111 < 02-hands-on/git4data_primitives.sql
> ```
> Every later article in this series will add its code to that repo too.

---

## Step 2 — Load 1,000,000 rows right away

No three-row toy tables here — we start with **a million rows**, so you feel Git4Data at realistic scale.

Create a database and table, then generate a million orders in-database with a single `INSERT ... SELECT ... generate_series` (no external files):

```sql
CREATE DATABASE git4data_demo;
USE git4data_demo;

CREATE TABLE orders (
    order_id BIGINT PRIMARY KEY,
    customer VARCHAR(32),
    amount   DECIMAL(10, 2),
    status   VARCHAR(16)
);

-- One statement generates a million rows entirely on the server
INSERT INTO orders
SELECT result,
       concat('cust_', result % 10000),
       round(rand() * 1000, 2),
       CASE result % 3 WHEN 0 THEN 'paid' WHEN 1 THEN 'pending' ELSE 'cancelled' END
FROM generate_series(1, 1000000) g;

SELECT COUNT(*) FROM orders;   -- 1,000,000
```

`generate_series(1, 1000000)` streams the integers 1..1,000,000 on the server, the whole INSERT runs server-side, and only one SQL goes over the wire — on local Docker it usually finishes in **a second or two**.

At this point MatrixOne is still just an ordinary MySQL-compatible database with a million rows in it. Now we enter the Git-flavored world — and every action below operates directly on these million rows.

---

## Step 3 — git commit / tag / reset: `CREATE SNAPSHOT` and `RESTORE`

### git commit / tag — `CREATE SNAPSHOT`

Press "save" on the current million-row state:

```sql
CREATE SNAPSHOT v1 FOR TABLE git4data_demo orders;
```

⚠ Note that in MatrixOne's `FOR TABLE` clause, the database and table names are separated by a **space**, not a dot — `git4data_demo orders`, not `git4data_demo.orders`.

`SHOW SNAPSHOTS` lists all of them.

### git checkout (time travel) — `SELECT … {snapshot = '…'}`

Simulate a production incident — a fat-fingered delete of a batch of orders:

```sql
DELETE FROM orders WHERE order_id <= 1000;
SELECT COUNT(*) FROM orders;                      -- 999000, 1000 rows gone
```

Now peek at the snapshot moment; the current state is untouched:

```sql
SELECT COUNT(*) FROM orders {snapshot = 'v1'};    -- 1000000, intact in the past
```

A `SELECT` with `{snapshot = '…'}` **just looks** at the past — zero impact on current data. It's git's `checkout <tag> -- file`, without the worktree side-effect.

### git reset --hard — `RESTORE TABLE`

Not just looking, actually going back:

```sql
RESTORE TABLE git4data_demo.orders {SNAPSHOT = v1};
-- Equivalent form:
-- RESTORE TABLE git4data_demo.orders FROM SNAPSHOT v1;

SELECT COUNT(*) FROM orders;                       -- 1000000, all back
```

The table is reset to the `v1` moment — the wrongly deleted 1000 rows are back, intact. This is the equivalent of `git reset --hard v1`.

---

## Step 4 — git clone: `CLONE`

`CLONE` is MatrixOne's cheapest tool for "spin up a standalone copy off real production data":

```sql
CREATE TABLE orders_copy CLONE orders;
SELECT COUNT(*) FROM orders_copy;                  -- 1000000, appears instantly
```

Note: `orders_copy` has the full million rows immediately, but this step costs **almost no time and almost no space** — it copies no data, just records a pointer to existing data. Changing it doesn't affect `orders`, and vice versa.

You can also clone from a snapshot (a "dev env as of a past state"):

```sql
CREATE TABLE orders_at_v1 CLONE orders {SNAPSHOT = "v1"};
```

`CLONE` is the cheapest fork, but it records **no lineage**. For row-level diff/merge later, what you want is the next step: `DATA BRANCH CREATE`.

---

## Step 5 — git branch: `DATA BRANCH CREATE`

`DATA BRANCH CREATE` looks like `CLONE`, but it **records "where I branched from"** — that lineage lets later row-level `DIFF` / `MERGE` / `PICK` find the lowest common ancestor (LCA) automatically, making them both correct and fast.

```sql
DATA BRANCH CREATE TABLE orders_dev FROM orders;
```

Diverge from the mainline — change 1,000 rows' status and add a new order:

```sql
UPDATE orders_dev SET status = 'shipped' WHERE order_id BETWEEN 5000 AND 5999;
INSERT INTO orders_dev VALUES (1000001, 'Frank', 400.00, 'paid');

-- Mainline orders is untouched
SELECT COUNT(*) FROM orders;                       -- still 1000000
```

---

## Step 6 — git diff: `DATA BRANCH DIFF`

```sql
-- Just the totals: how many rows changed on the branch vs the mainline?
DATA BRANCH DIFF orders_dev AGAINST orders OUTPUT SUMMARY;
```

On a million-row table it returns in **milliseconds** — and precise to the row:

```
INSERTED  1     -- Frank's row
UPDATED   1000  -- the rows whose status changed
DELETED   0
```

It scans only the changed part, not the whole table, so it doesn't matter whether the table holds a million or a hundred million rows — we'll prove that with numbers in Step 11.

`OUTPUT` has a few other useful forms:

```sql
-- See each diff row (LIMIT optional)
DATA BRANCH DIFF orders_dev AGAINST orders OUTPUT LIMIT 10;

-- Single number: the total count
DATA BRANCH DIFF orders_dev AGAINST orders OUTPUT COUNT;

-- Compare only a few columns
DATA BRANCH DIFF orders_dev AGAINST orders COLUMNS (status, amount) OUTPUT SUMMARY;

-- Export the diff as an executable SQL patch file (DELETE + REPLACE INTO)
DATA BRANCH DIFF orders_dev AGAINST orders OUTPUT FILE '/tmp/orders_diff/';
```

That last one is nice: the generated `.sql` file can be applied to any MatrixOne instance with `mysql … < diff_xxx.sql` — the branch's changes frozen into a **portable patch**.

---

## Step 7 — git merge: `DATA BRANCH MERGE`

After reviewing the changes, merge the branch back into the mainline:

```sql
DATA BRANCH MERGE orders_dev INTO orders;
SELECT COUNT(*) FROM orders;                       -- 1000001, Frank merged in
```

Without `WHEN CONFLICT`, the default is `FAIL`. Let's demo all three modes:

```sql
-- Two branches that will collide on the same row (order_id = 1)
DATA BRANCH CREATE TABLE orders_a FROM orders;
DATA BRANCH CREATE TABLE orders_b FROM orders;

UPDATE orders_a SET status = 'shipped'  WHERE order_id = 1;
UPDATE orders_b SET status = 'refunded' WHERE order_id = 1;

-- Merge orders_a first (no conflict, lands cleanly)
DATA BRANCH MERGE orders_a INTO orders;

-- Now orders_b collides, since order_id=1 was already changed by orders_a
DATA BRANCH MERGE orders_b INTO orders WHEN CONFLICT FAIL;
-- ERROR: conflict on order_id=1; the whole transaction rolls back, mainline untouched
```

Pick a strategy to resolve:

```sql
-- Keep mainline, skip conflicting rows (git's accept ours)
DATA BRANCH MERGE orders_b INTO orders WHEN CONFLICT SKIP;

-- Or take the branch's version (git's accept theirs)
DATA BRANCH MERGE orders_b INTO orders WHEN CONFLICT ACCEPT;
```

**Key design point**: MatrixOne treats a row as a **true conflict only when both sides changed it**. If only one side touched a row, the database **applies the change automatically** and doesn't bother you. So even on a changeset of millions of rows, the ones that actually need a human decision are usually the few dozen or few hundred genuine collisions.

---

## Step 8 — git cherry-pick: `DATA BRANCH PICK`

Git's "take just these few rows from the branch" maps to MatrixOne's `DATA BRANCH PICK`. Syntactically it's MERGE plus a `KEYS(...)` clause:

```sql
-- Prepare a branch: change a couple of rows, add one
DATA BRANCH CREATE TABLE orders_fix FROM orders;
UPDATE orders_fix SET status = 'refunded' WHERE order_id IN (2, 4);
INSERT INTO orders_fix VALUES (1000002, 'Grace', 500.00, 'paid');

-- Promote ONLY order_id 2 and 1000002 into mainline; leave everything else
DATA BRANCH PICK orders_fix INTO orders KEYS (2, 1000002) WHEN CONFLICT ACCEPT;

SELECT order_id, status FROM orders WHERE order_id IN (2, 4, 1000002) ORDER BY order_id;
-- 2        -> refunded  (cherry-picked)
-- 4        -> unchanged (not picked)
-- 1000002  -> Grace's new order (cherry-picked)
```

`KEYS` also accepts a subquery, so SQL decides which rows get picked:

```sql
DATA BRANCH PICK orders_fix INTO orders
    KEYS (SELECT order_id FROM orders_fix WHERE customer = 'Grace')
    WHEN CONFLICT ACCEPT;
```

This shines in RLHF preference data and collaborative labeling — "I only want the 80 rows Alice re-judged" is a one-line SQL away.

---

## Step 9 — rewind to any moment: `PITR`

`SNAPSHOT` is the save button **you** press; `PITR` is continuous history the database keeps **automatically** in the background. First set a PITR policy telling the system "keep the state of this table/database for the past X window":

```sql
-- Keep 1 day of history for the whole git4data_demo database
CREATE PITR demo_pitr FOR DATABASE git4data_demo RANGE 1 'd';
```

`RANGE` units: `h` (hours) / `d` (days, default) / `mo` (months) / `y` (years).

Now any past moment — whether or not you took an explicit snapshot at it — is reachable. Note "now", then do something destructive:

```sql
SELECT now();           -- e.g. 2026-06-04 14:03:07 — copy this value

DELETE FROM orders;     -- worst case: whole table gone
```

Restore to that exact moment:

```sql
RESTORE DATABASE git4data_demo FROM PITR demo_pitr "2026-06-04 14:03:07";

SELECT COUNT(*) FROM orders;   -- the million rows are back
```

The timestamp format is `"YYYY-MM-DD HH:MM:SS"` — "restore to 2:03:07 PM" in the literal sense.

---

## Step 10 — Beyond tables: database / account / cluster

Every demo above operated at the **table** level. But MatrixOne's Git4Data is **not table-only** — it holds at **four levels: table, database, account (tenant), and the whole cluster**. This matters: many real needs are "several tables together."

| Operation | Table | Database | Account (tenant) | Cluster |
|---|---|---|---|---|
| Snapshot `CREATE SNAPSHOT` | `FOR TABLE db t` | `FOR DATABASE db` | `FOR ACCOUNT acc` | `FOR CLUSTER` |
| Restore `RESTORE` | `RESTORE TABLE …` | `RESTORE DATABASE …` | `RESTORE ACCOUNT …` | `RESTORE CLUSTER …` |
| Point-in-time `PITR` | `FOR TABLE …` | `FOR DATABASE …` | `FOR ACCOUNT …` | `FOR CLUSTER` |
| Zero-copy clone `CLONE` | `CREATE TABLE … CLONE` | `CREATE DATABASE … CLONE` | — | — |
| Branch `DATA BRANCH CREATE` | `… TABLE … FROM` | `… DATABASE … FROM` | — | — |

(All five rows above were verified runnable on MatrixOne 4.0.)

**Database level** is the most common "consistent version" granularity: snapshot a feature table + label table + metadata table together and roll them back atomically, keeping the whole training set **consistent across tables**:

```sql
CREATE SNAPSHOT db_v1 FOR DATABASE git4data_demo;     -- all tables in the db, one version
-- ... change several tables in the database ...
RESTORE DATABASE git4data_demo {SNAPSHOT = db_v1};    -- all tables atomically back to db_v1
```

**Account (tenant) level** versions "every database and table under one account" at once — useful for per-customer isolated snapshots, or whole-tenant rollback, in multi-tenant SaaS:

```sql
CREATE SNAPSHOT acct_v1 FOR ACCOUNT myacct;           -- the whole tenant, one version
-- RESTORE ACCOUNT myacct {SNAPSHOT = acct_v1};        -- whole-tenant rollback (use with care)
```

**Cluster level** covers the entire instance, typically for disaster-recovery-grade snapshot and restore.

In one line: **from a table, to a database, to a tenant, to the whole cluster — Git4Data is the same semantics and the same cheapness.**

---

## Step 11 — Scale to 10M, 100M: cost is independent of data size

Now make the data bigger and re-run these primitives — you'll see Git4Data's most counterintuitive property: **snapshot, clone, and branch barely change with data size.**

Load more by raising the `generate_series` bound (offset `order_id` to avoid primary-key collisions):

```sql
-- Top the table up to 10,000,000 rows (adds 9M)
INSERT INTO orders
SELECT result + 2000000,
       concat('cust_', result % 10000),
       round(rand()*1000, 2),
       CASE result % 3 WHEN 0 THEN 'paid' WHEN 1 THEN 'pending' ELSE 'cancelled' END
FROM generate_series(1, 9000000) g;
```

On a single-node Docker MatrixOne (4.0.0), we grew the same table to 1M, 10M, and 100M rows and ran the same set of git4data operations (diff / merge each touch only **1,000 rows**). Measured (steady-state, median of several runs):

| Table size | Load | `CREATE SNAPSHOT` | `CLONE` | `DATA BRANCH CREATE` | `DIFF` (1000) | `MERGE` (1000) |
|---|---|---|---|---|---|---|
| **1,000,000** | 0.5 s | 6 ms | 6 ms | 7 ms | 13 ms | 64 ms |
| **10,000,000** | 5.3 s | 8 ms | 8 ms | 7 ms | 21 ms | 178 ms |
| **100,000,000** | 41 s | 5 ms | 25 ms | 19 ms | 23 ms | 1.3 s |

Three things in this table are the whole point of Git4Data:

- **Snapshot: dead constant** — data grew 100× (1M → 100M), yet `CREATE SNAPSHOT` stays at **5–8 ms**. A snapshot just names the metadata directory of "which data objects make up the table right now" — it has nothing to do with how many rows are in it.
- **Clone / branch: they copy the metadata directory, not the data** — across 100× the data, clone rises only from 6 ms to 25 ms. That directory grows slowly with the number of objects, but it's always a few MB of metadata being copied, never tens of GB of data.
- **Diff / merge: scale only with "how many rows changed"** — all three changed only 1,000 rows, so `DIFF` stays in the tens of milliseconds; `MERGE` grows as the table gets bigger (it writes the changes back into the main table), but that growth is proportional to the write work and is expected.

> An honest detail: the **first** snapshot of a freshly loaded large table is a bit slower (~10–12 ms measured), because it first flushes still-in-memory data to object storage — a one-time cost, after which it drops to the steady-state numbers above. We loaded the data, paused briefly, then measured, precisely so the numbers reflect the git4data operation itself rather than that one-time flush.

This is the empirical proof of Part 1's line: **the hard part was never version control itself — it's keeping it cheap on massive data.**

> Note: beyond this (10B+ rows), a single-node Docker setup runs into memory first (our VM had only ~4GB and got OOM-killed around 50M rows mid-load). Real billion-row data belongs on a multi-node cluster or the cloud — the paper's 600M-row experiment ran on a 64-core / 256GB machine, where a clone is likewise 0.2 seconds.

---

## Putting it together: one complete "Git-flavored data" workflow

You've now used every primitive. Here they are chained into a tiny workflow that simulates "curating data before a training run":

```sql
-- ① Pin the raw training input
CREATE SNAPSHOT samples_v3_raw FOR TABLE git4data_demo orders;

-- ② Clean on a lineage-tracked branch — mainline untouched
DATA BRANCH CREATE TABLE orders_clean FROM orders;
DELETE FROM orders_clean WHERE amount < 200;
UPDATE orders_clean SET status = 'cancelled' WHERE status = 'pending';

-- ③ Review: what exactly did cleanup change?
DATA BRANCH DIFF orders_clean AGAINST orders OUTPUT SUMMARY;

-- ④ Quality gate passes — atomically merge back into mainline
DATA BRANCH MERGE orders_clean INTO orders WHEN CONFLICT FAIL;

-- ⑤ This is now "the data used by model_v3" — pin a name on it
CREATE SNAPSHOT samples_v3 FOR TABLE git4data_demo orders;

-- ... if the model later regresses ...

-- ⑥ Worst case, a one-second roll-back
RESTORE TABLE git4data_demo.orders {SNAPSHOT = samples_v3_raw};
```

Every experiment, every training run, every release has a **named version** pinned to it. Any "where did this go wrong?" is from now on something a single SQL statement can answer.

---

## Wrap-up & cleanup

Look back: from `docker run` to `RESTORE`, **within ten minutes** you've run, on a million rows of realistic data:

- commit / tag / reset (`CREATE SNAPSHOT` / `SELECT … {snapshot = '…'}` / `RESTORE … {SNAPSHOT = …}`)
- clone (`CREATE TABLE … CLONE` / `CREATE DATABASE … CLONE`)
- branch (`DATA BRANCH CREATE TABLE/DATABASE`)
- diff (`DATA BRANCH DIFF … OUTPUT SUMMARY / COUNT / LIMIT / FILE`)
- merge + three conflict modes (`DATA BRANCH MERGE … WHEN CONFLICT FAIL|SKIP|ACCEPT`)
- cherry-pick (`DATA BRANCH PICK … KEYS(…)`)
- rewind to any moment (`CREATE PITR` + `RESTORE … FROM PITR "…"`)
- table / database / account / cluster granularity

Clean up what we created:

```sql
DROP SNAPSHOT v1;
DROP SNAPSHOT db_v1;
DROP SNAPSHOT samples_v3_raw;
DROP SNAPSHOT samples_v3;
DROP PITR demo_pitr;
DROP DATABASE git4data_demo;        -- drops all demo tables at once
```

Or just `docker rm -f matrixone` to take the whole instance down.

That's the full picture of Part 1's "three powers," expressed in SQL — and they've now actually run on your machine, on a million rows. You can use real production data as staging, fork off any moment, let a team work in parallel on the same big table, and pin a reproducible version to every training run.

In the next article we go back into the engine and explain the **implementation principles**: how does MatrixOne do all of this in seconds and bytes, on hundreds of millions — even the paper's 600 million — rows? The answer lives in the storage engine — next time we open it up.

> 📎 Full docs: every primitive used here has its own page in [docs.matrixorigin.cn](https://docs.matrixorigin.cn/) under SQL Reference / DDL.
> 📦 Runnable SQL: [github.com/matrixorigin/git4data-tutorial](https://github.com/matrixorigin/git4data-tutorial)
> 📎 Source & community: [github.com/matrixorigin/matrixone](https://github.com/matrixorigin/matrixone)
