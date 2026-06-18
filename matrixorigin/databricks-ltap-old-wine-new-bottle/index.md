---
title: "Old Wine, New Bottle: Databricks Coins Yet Another Word for HTAP"
author: MatrixOrigin
description: At its Summit, Databricks announced it had "cracked a 40-year-old database problem" and gave it a shiny new name — LTAP. A database lifer would like to point out that this bottle is called HTAP, it was opened a decade ago, and the hard road it describes is one MatrixOne has been walking for five years.
tags:
  - Engineering
keywords:
  - Databricks
  - LTAP
  - HTAP
  - MatrixOne
  - Lakebase
  - Iceberg
publishTime: "2026-06-18T17:00:00+08:00"
date: 2026-06-18
lang: en
status: draft
translations:
  zh: databricks-ltap-old-wine-new-bottle-zh
---

# Old Wine, New Bottle: Databricks Coins Yet Another Word for HTAP

By MatrixOrigin — a database lifer who has been watching HTAP for ten years (personal opinions only)

At last week's Data + AI Summit, Databricks CEO Ali Ghodsi stood on stage wearing the face of a man who has just achieved enlightenment, and announced he had cracked a database problem that stumped the industry for 40 years: merging the two copies of data — one transactional, one analytical — that every company on earth keeps apart. And then, as tradition demands, he gave it a brand-new name: **LTAP**, Lake Transactional/Analytical Processing.

I stared at those four letters for a while and nearly lost it.

Not because he's wrong — he isn't. It's that **we've opened this bottle before. It's called HTAP.** Gartner coined the term back in 2014: Hybrid Transactional/Analytical Processing. Ghodsi peeled off the H (Hybrid), slapped on an L (Lake), and presto — a "brand-new paradigm" was born.

When it comes to coining words, Databricks is the patron saint of this industry, and I mean that sincerely. It invented and popularized "lakehouse." "Data Intelligence Platform" is its phrasing too. Now it's LTAP's turn. **This company's deepest competency was never the database kernel — it's the naming engine in the marketing department.** Every so often it takes an old concept, wipes it clean, slaps on a fresh label, stages a keynote, and gets the whole industry speaking its vocabulary.

(I'll admit it works. Look — even I couldn't resist writing a whole blog post to talk it over.)

## 1. From lake, to warehouse, to database — and it took ten years to crawl to "database"

Databricks' whole journey is really one long climb from "lake" up to "database."

It started as the Spark-cluster babysitter for data scientists, peddling the data lake — a giant pond you can throw anything into and cleanly query almost nothing out of. Then it figured out lakes don't pay the bills; the CFO's wallet lives in the warehouse. So it cooked up the lakehouse, bolting on the warehouse (AP) leg. That stretch it ran well, I'll give it that.

But it was always missing the last piece: the database — the transactional TP layer.

Why missing for so long? Because **TP is the hardest bone of the three to chew.** A lake stores, a warehouse computes; if either runs a little slow or a little off, worst case your report is half a day late. TP gets no such mercy — it demands strict transactional consistency, millisecond point reads and writes, and thousands of concurrent sessions hammering it at once without miscounting a single cent. You don't conjure that by smearing a layer of SQL compatibility onto the side of a lake.

So how did Databricks get its "database"? **It bought one.** Lakebase is built on Neon, a serverless-Postgres company it acquired last year. Take a standalone Postgres instance, park it next to the lakehouse, let the two share a storage layer — that's the LTAP it's describing: "an OLAP engine that reads one copy, and an OLTP engine that updates the records."

Translation: **it's still two engines, just sharing one warehouse.** That beats the old mess of CDC jobs plus downstream replicas plus one data engineer going bald holding it all together. But "sharing storage" and "actually living in one architecture" are two very different things. Run two engines side by side and sooner or later somebody writes a document called "Query Routing Guidelines v4" — and that document is always out of date, and somebody is always getting paged at 2 a.m. because a query went to the wrong engine.

## 2. MatrixOne walked this same tightrope backwards — and has been on it for five years

Why does this hit a nerve? Because the tightrope Databricks is only now climbing onto is exactly the one MatrixOne has been walking for five years — except we started from the hard end.

Everyone else went lake first, warehouse next, and bought a database last. We started by putting TP and AP into one architecture. One copy of data, natively writable and readable, transactional and analytical at the same time — no bolted-on Postgres, no format translation, no perpetually-stale routing doc. That wasn't a feature we chased later; it was the first sentence in the first design doc.

(While we're here: that Lakebase "Git-style branching and snapshots" Databricks announced as big news this week — branch your production data, run experiments, roll back — is called Git for Data. We shipped it five years ago, and it's literally baked into the name MatrixOne. Another old bottle.)

## 3. What actually matured is the substrate — and we placed that bet five years ago

So why does LTAP suddenly work *now*, in 2026?

One reason: **the open, unified storage substrate — Iceberg and friends — finally grew up.** One copy of open-format data sitting on object storage can feed both TP and AP, with no separate copies. The consensus the industry only just reached — compute/storage separation, a single copy, open formats, one dataset serving mixed workloads — is precisely the bet MatrixOne placed five years ago.

Back when we designed it this way, Iceberg wasn't this solid and the industry was still arguing over what "lakehouse" even meant. We bet on one thing: the future of the database is one copy of data, many workloads, living on object storage. This week, Databricks put a new word on that conclusion and announced it all over again.

Welcome — sincerely. The drinks have just been warming for five years.

## 4. In the age of agents, the instance underneath has to be transactional

Last, why now — because this is the real trigger: agents.

Ghodsi tossed out a stat himself: roughly 80% of the databases on their platform are now created by agents, not humans. That number says a lot — agents have completely reshaped what database load looks like.

Agents aren't people. A person clicks a dashboard, runs a query, leaves. An agent never sleeps: it fans out, asks follow-ups, retrieves history while the business is still writing new records underneath it, and a single agent can spin up a swarm of agents and throw thousands of concurrent requests at you in a blink. For that workload, handing it a "fresher lake" is nowhere near enough.

What it needs is to read accurate business state in real time, at high concurrency and low latency. The only thing that survives that is **a genuinely transactional instance** — one that reads while it writes, guarantees consistency, and returns the right answer at the exact instant state changes. A read-only analytics engine bolted to the side of a lake can't.

Which is exactly why everyone is suddenly piling onto TP: Databricks bought Neon for Lakebase, Snowflake bought Crunchy for Postgres — all doing the same transactional homework. Same logic everywhere: if an agent is going to actually do work, read-only analytical data isn't enough; it needs a state layer it can read and write in real time.

The only difference: **everyone else assembled that layer from parts. Ours grew that way.** OLTP has always lived inside MatrixOne.

## One last thing

Back to that new word.

LTAP isn't wrong. The direction is dead right. Enterprises don't want stale analytics taped onto their operational systems, don't want long, brittle pipelines, and definitely don't want an agent making calls off a copy of the business that's an hour behind. What they want is one copy of data that can be written, read, analyzed, and served to agents in real time.

No argument there. Just don't confuse "we bolted a Postgres onto the lakehouse" with "we welded TP and AP into one kernel from day one." Open table formats are useful. Shared storage is useful. Postgres compatibility is useful. But none of those three, on its own, conjures a real HTAP database.

Databricks coined another good word. The thing that word points at, MatrixOne has been quietly building for five years.

Old wine, new bottle. It's good wine. We just opened this one a long time ago.
