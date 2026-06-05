---
title: Why I Rewrote Memoria in Rust
author: MatrixOrigin
description: >-
  Drawing on database kernel development experience, the author explains why Memoria was rewritten in Rust: AI greatly lowers the learning barrier for Rust, and compared with Python or Go, Rust is better suited for AI Agent memory services in package size, memory usage, performance, distribution, and stability. Built on MatrixOne, Memoria implements Git-style memory management and creates an efficient and reliable Agent memory layer.
tags:
  - Technical Insights
keywords:
  - rust
  - memoria
  - Agent
  - memory
publishTime: '2026-03-24T17:00:00+08:00'
image:
  '1': /images/blog-covers/technical.png
  '235': /images/blog-covers/technical.png
date: '2026-03-24T17:00:00+08:00'
lang: en
status: published
translations:
  zh: rust-memoria-agent-zh
---

# Why I Rewrote Memoria in Rust

_Xu Peng · MatrixOne Technical Lead_

---

## A Bit About My Background

I am an old programmer. I have been writing code for almost 20 years, and for nearly the past decade I have been working on database kernel development.

In April 2019, I encountered a requirement for image search by image. The initial approach was very simple: build an application in Python, call Faiss for vector retrieval, and make it run. But as I worked on it, I realized that vector similarity search was not an application-layer problem. It should be database-layer infrastructure. So I designed and implemented the first few versions of Milvus from scratch. If you look at the earliest commits in the Milvus repository, the entire kernel architecture design and core implementation were basically done by me alone. Before Milvus 1.0, the kernel was entirely implemented in C++, and not ordinary C++: GPU heterogeneous indexing, multi-card scheduling, hybrid filtering, deletion and update of dynamic indexes, and mixed compute-intensive and IO-intensive workloads. At that time, there were almost no ready-made industry references for these problems. Later, Milvus grew into one of the world's best-known open-source vector databases, but that is another story.

After that, I joined MatrixOne and designed and implemented the entire storage engine. MatrixOne is written in Golang overall. Every day, I work with storage engines, transaction processing, and query optimization. You could say I am someone who lives inside compilers and type systems, used to having problems stopped before the code runs.

Speaking of MatrixOne (https://github.com/matrixorigin/matrixone), many people may still not know much about it. It is a database kernel project we started from scratch five years ago. It solves two core problems. First, it uses one storage and compute engine to support OLTP, OLAP, vector, and full-text workloads at the same time, without requiring users to move data between different data systems. Second, through a cloud-native and compute-storage separation architecture, it implements **Git for Data** capabilities. You can perform Git-like snapshots, branches, Diff, and Merge operations on TB-scale data. The core is that we implemented Copy-on-Write-based data version management at the storage engine layer: zero-copy branches, instant snapshots, and rollback to any point in time. This is very useful for application development, data development, and AI training.

Today's focus is not MatrixOne, but Memoria. However, Memoria is built entirely on MatrixOne.

```text
┌─────────────────────────────────────────────────────────┐
│                    MatrixOne Architecture               │
│                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │   OLTP   │ │   OLAP   │ │  Vector  │ │ FullText │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘  │
│       └─────────────┴────────────┴─────────────┘        │
│                         │                               │
│              ┌──────────▼──────────┐                    │
│              │ Unified Compute      │                    │
│              └──────────┬──────────┘                    │
│                         │                               │
│              ┌──────────▼──────────┐                    │
│              │ CoW Storage Engine   │ ◄── Git for Data   │
│              │                      │                    │
│              │ • Zero-copy branch   │                    │
│              │ • Instant snapshot   │                    │
│              │ • Point-in-time      │                    │
│              │   rollback           │                    │
│              │ • Diff / Merge       │                    │
│              └──────────┬──────────┘                    │
│                         │                               │
│              ┌──────────▼──────────┐                    │
│              │ Cloud-native         │                    │
│              │ Compute-storage sep. │                    │
│              │ (S3 / Object Store)  │                    │
│              └─────────────────────┘                    │
└─────────────────────────────────────────────────────────┘
```

## AI Changed My View, and Then I Started Building Memoria

The world of database kernels is deterministic and controllable. But starting in the second half of 2024, AI coding tools began to truly affect my daily work. At first, I only used Copilot to complete some code. Later, I found that AI could do more and more: not just completion, but understanding context, refactoring, and writing tests. As a systems programmer, I began to realize something: **AI is not only changing how we write code. It is changing what kinds of projects are worth building.**

This shift in perspective pushed me directly toward AI-related projects.

MatrixOne natively supports vector indexes. We have been thinking about how to make vector search tuning more intelligent: not asking users to tune parameters manually, but letting the system optimize itself based on query patterns and data distribution. This idea requires a memory layer. The system needs to remember past queries, remember which tuning strategies worked, and remember user usage patterns.

This was the starting point of Memoria. It was originally designed for automatic tuning of MatrixOne vector search: a memory system that can persist across sessions, support semantic retrieval, and manage versions. https://github.com/matrixorigin/Memoria

## From Database Tuning to AI Agent Memory: The Same Problem

At the same time, as someone who uses coding agents every day, I found something interesting: **the memory needs of coding agents are essentially the same as the problem of using AI for database automatic tuning.** Agents need to remember your project structure, coding preferences, where the last debugging session stopped, and which solutions were already tried and failed. This is exactly like a database tuning system needing to remember query patterns and which indexing strategies worked. At the abstraction level, both are "persistent memories that span sessions, are searchable, and need version management."

And we happen to have MatrixOne's Git for Data capability. Zero-copy branches mean an agent can perform experimental reasoning without affecting main memory. Instant snapshots mean any memory change can be rolled back. Vector indexes mean semantic retrieval is natively supported. These capabilities do not need to be built from scratch; MatrixOne has already refined them.

```text
       Database Auto-Tuning                   Coding Agent
    ┌─────────────────┐                  ┌─────────────────┐
    │ Remember query   │                  │ Remember project │
    │ patterns         │                  │ structure        │
    │ Remember tuning  │                  │ Remember coding  │
    │ strategies       │                  │ preferences      │
    │ Remember data    │                  │ Remember debug   │
    │ distribution     │                  │ progress         │
    │ Roll back failed │                  │ Roll back wrong  │
    │ attempts         │                  │ approaches       │
    └────────┬────────┘                  └────────┬────────┘
             │                                    │
             │        The same abstract problem   │
             └──────────┬─────────────────────────┘
                        │
                        ▼
          ┌──────────────────────────┐
          │   Persistent memory layer │
          │                          │
          │ • Cross-session persist. │
          │ • Semantic retrieval     │
          │ • Version management     │
          │   (Git for Data)         │
          └──────────┬───────────────┘
                     │
                     ▼
          ┌──────────────────────────┐
          │       MatrixOne          │
          │  CoW · Vector · Branch   │
          └──────────────────────────┘
```

So Memoria naturally evolved from an internal database tuning tool into a general-purpose AI Agent memory layer.

Looking back, there is a recurring pattern in my career: **start from a concrete requirement, discover a general problem, then build infrastructure.** Image search by image led to Milvus. Database tuning led to Memoria. The pattern is the same. And Memoria's core, embedding, semantic retrieval, and hybrid indexing, is exactly an extension of the domain knowledge I accumulated while building Milvus into a new scenario.

The first version was written in Python. The reason was simple: speed. In the AI ecosystem, Python is the default language. LangChain, sentence-transformers, and SDKs for various embedding models are Python-first. As a prototype, Python allowed us to run through the complete workflow from semantic retrieval to Git-style branching in just a few days.

But as Memoria moved from prototype toward a product we truly needed to use internally, Python problems began to appear one after another.

## Python's Problem: It Works, but It Gets Increasingly Uncomfortable

A classic pain point of dynamic languages is that bugs hide at runtime.

You write a function and annotate a parameter as `str`, but Python does not check this at compile time. One day, a `None` quietly slips in, the program crashes in production, and the stack trace points somewhere you never expected. You add type hints and run mypy, but mypy cannot cover all scenarios, especially when dynamic reflection and third-party libraries are involved.

This was not isolated. While developing Memoria, I repeatedly encountered these problems:

- An `Optional[str]` was not handled correctly, causing the embedding service to occasionally return empty vectors.
- Exceptions in async code were silently swallowed because asyncio's error propagation mechanism did not match intuition.
- Dependency management was a nightmare. On different users' machines, the same `pip install` could produce different results.
- Packaging and distribution were even worse. You either ask users to install a Python environment, or use PyInstaller to build a package of several hundred MB.

None of these problems is fatal alone, but together they create continuous friction. Every time I wanted to add a new feature, I first had to spend time dealing with these infrastructure-level troubles.

When working on the MatrixOne kernel, I had a principle: **if something can be rewritten in a compiled language, I will not use Python.** It was finally time to apply this principle to Memoria.

## Why Rust, Not Go?

This is a reasonable question. I have written Go for many years, and the entire MatrixOne kernel is written in Go. In theory, Go should be my comfort zone.

But I have learned lessons from language choices. Before Milvus 1.0, everything was C++. C++ gave me extreme performance and control, but the cost was huge: memory safety problems were hard to defend against, development efficiency was low, and onboarding new engineers was difficult. Later, Milvus 2.0 was rewritten in Go, which greatly improved development efficiency, but in scenarios requiring extreme performance, GC remained a hidden concern. These two experiences gave me a practical framework for language selection: **the question is not which language is "best," but which language has the most reasonable trade-off in a specific scenario.**

Memoria's scenario differs from a database kernel. Memoria is a service that needs to be distributed to and run on users' local machines. This means:

- **Package size matters.** Users will not install a runtime of several hundred MB for a memory server. Rust-compiled binaries are self-contained and usually only a few MB.
- **Memory usage matters.** Memoria runs in the background together with IDEs. Go's GC is already good, but Rust's zero-cost abstractions and GC-free design mean memory usage can be almost negligible.
- **Performance ceiling matters.** Semantic retrieval involves vector computation, and branch merging involves large amounts of data comparison. Rust's performance advantage is real in these scenarios.

From C++ to Go and then to Rust, I have traced a complete arc. C++ taught me the value of performance and control. Go taught me the value of development efficiency and engineering. Rust is the best balance I have found so far: C++-level performance, much better memory safety than C++, and with AI assistance, development efficiency is no longer a bottleneck.

```text
  Performance ▲
              │
   Extreme    │  ★ C++                              ★ Rust (+ AI)
              │  Milvus 1.0                         Memoria
              │  · Extreme performance ✓            · Extreme performance ✓
              │  · Memory safety ✗                  · Memory safety ✓
              │  · Development efficiency ✗         · Development efficiency ✓
              │                                      (AI-assisted)
              │                 ★ Go
              │                 MatrixOne
              │                 · Good performance ✓
              │                 · Memory safety ✓ (GC)
              │                 · Development efficiency ✓
              │
              └──────────────────────────────────────────────► Safety
```

More importantly, Rust in 2026 is no longer the same as Rust from a few years ago. The language itself has not changed; the way we learn it has.

## AI Has Smoothed Out Rust's Learning Curve

I need to state one thing first: **before starting the rewrite, I knew almost nothing about Rust.**

I knew concepts such as ownership, borrow checking, and lifetimes, but I had never written a complete project in Rust. If this were two years ago, it might have meant spending months reading The Rust Programming Language, fighting the compiler, and searching Stack Overflow for lifetime errors.

But now things are different.

In February this year, Anthropic researcher Nicholas Carlini published a blog post describing how he used 16 Claude instances working in parallel to write a Rust implementation of a C compiler from scratch. It could compile the entire Linux 6.9 kernel and supported x86, ARM, and RISC-V. The project had 100,000 lines of Rust code, took about 2,000 Claude Code sessions, and cost USD 20,000.

This had a big impact on me. Not because AI can write a compiler, since compilers are essentially engineering problems with clear rules. What truly shocked me was this: **AI chose Rust as the implementation language, and the code quality was good enough to compile the Linux kernel.** After reading that blog post, I decided to try it on Memoria.

This case shows two things:

1. AI's understanding of Rust is already deep enough to handle ownership, lifetimes, the trait system, and other difficult parts of Rust.
2. Rust's type system and compiler become advantages for AI. The compiler tells AI where it is wrong, and AI can automatically fix issues based on compiler errors.

This contrasts sharply with Python. Python's flexibility is an advantage for humans, but for AI it can become a disadvantage. Without a compiler as a safety net, AI-generated Python code is more likely to produce bugs that only appear at runtime.

Around the same time, Andrej Karpathy said in a podcast that since December 2025 he had not handwritten a single line of code, moving from writing 80% of the code himself to having AI write 80% of the code. That ratio is still continuing to flip.

My experience was similar. While using AI to rewrite Memoria, I mostly needed to do three things:

1. **Define the architecture**: tell AI the module boundaries, data flow, and API design I wanted.
2. **Review the code**: check whether the AI-generated code matched my intent and whether it had logical issues.
3. **Handle compile errors**: most of the time, AI could fix them itself based on `cargo build` output.

Rust's compiler plays a key role in this workflow. It is the quality inspector between AI and humans. Every compilation tells you and the AI: "There is a problem here, here is exactly what the problem is, and here is how it should be changed." This feedback loop does not exist in dynamic languages.

```text
  Rust + AI Feedback Loop                 Python + AI Workflow
  =======================                 ====================

  Human: define architecture / needs      Human: define architecture / needs
         │                                       │
         ▼                                       ▼
  ┌─────────────┐                         ┌─────────────┐
  │ AI generates│                         │ AI generates│
  │ code        │                         │ code        │
  └──────┬──────┘                         └──────┬──────┘
         │                                       │
         ▼                                       ▼
  ┌─────────────┐    compile errors       ┌─────────────┐
  │ cargo build │ ──────────┐             │ run directly│
  └──────┬──────┘           │             └──────┬──────┘
         │ compiles          │                    │
         ▼                  │                    ▼
    ✅ basically runs  AI auto-fixes        ❌ fails at runtime
                    (precise errors)        (unclear stack traces)
```

## The Industry Is Moving in This Direction

I am not the only one thinking this way.

GitHub's Octoverse 2025 report shows an interesting trend: AI coding tools are creating a "convenience loop" that reshapes developers' language choices. TypeScript grew by 66% on GitHub, surpassing Python and JavaScript to become the most-used language. One reason is that static types provide a safety net for AI-generated code.

The same logic applies to Rust. Stack Overflow's 2024 survey showed Rust remained the "most loved" language with an 83% ratio. The State of Rust Survey showed that nearly half of surveyed enterprises already use Rust in production. Microsoft announced a plan to use AI assistance to migrate C/C++ code to Rust by 2030.

Python's share in the AI infrastructure layer is being eroded by compiled languages. Python remains king in AI research and prototyping, but in system software that needs deployment, distribution, and long-term maintenance, compiled languages are regaining ground.

This matches exactly the trend I have seen in vector databases. Milvus's Python SDK was the ecosystem entry point, but its kernel has always been compiled-language based. Qdrant chose Rust from day one, and LanceDB is also Rust. In AI infra, "prototype in Python, build products in compiled languages" is no longer a personal preference. It is an industry consensus.

For services that need to be embedded into user IDEs and run persistently, zero runtime overhead, memory safety, and single-binary distribution are not nice-to-have features. They are requirements. Rust is becoming the default choice for these scenarios.

## What We Gained from the Rewrite

After rewriting Memoria in Rust, we got several "free" improvements:

```text
                    Python version          Rust version
                ┌──────────────┐         ┌──────────────┐
  Binary size    │   ~300 MB    │   →     │    <10 MB    │   ↓ 97%
                ├──────────────┤         ├──────────────┤
  Resident mem   │   200+ MB    │   →     │    ~20 MB    │   ↓ 90%
                ├──────────────┤         ├──────────────┤
  Startup speed  │   seconds    │   →     │ milliseconds │   ↓ 99%
                ├──────────────┤         ├──────────────┤
  Distribution   │ Python + pip │   →     │ single binary│   zero deps
  dependencies   │ + venv + ... │         │              │
                ├──────────────┤         ├──────────────┤
  Runtime errors │ possible at  │   →     │ guaranteed by│   ≈ 0
                │ any time     │         │ compilation  │
                └──────────────┘         └──────────────┘
```

- **Binary size**: from hundreds of MB with Python + PyInstaller to a single executable under 10 MB
- **Memory usage**: resident memory dropped from 200 MB+ to around 20 MB
- **Startup speed**: from several seconds of Python interpreter cold start to millisecond-level Rust binary startup
- **Distribution experience**: users download one binary and can use it immediately, without installing Python, managing pip, or setting up virtual environments
- **Reliability**: once it compiles, it basically runs; no sudden runtime `AttributeError: 'NoneType' object has no attribute 'xxx'`

These improvements did not come from careful optimization. They came naturally from changing the language. This is what I mean by "free improvements."

## Final Notes

I am not saying Python is bad. Python's position in AI research, data analysis, and rapid prototyping will not be shaken in the short term. But for system software that needs to be distributed to users, maintained for a long time, and run in resource-constrained environments, Python's shortcomings are becoming increasingly obvious.

Rust's biggest barrier used to be its steep learning curve. AI is rapidly smoothing that out. When AI can help you handle ownership and lifetime details, and when the compiler can serve as a real-time feedback mechanism for AI, Rust being "hard" is no longer a valid objection.

As a database kernel programmer who has written Go for many years, I never thought I would rewrite a project in Rust. But AI changed the equation. It allows me to focus on architecture design and product thinking instead of wrestling with language syntax details.

From hand-writing Milvus in C++ in 2019, to building MatrixOne in Go, to rewriting Memoria in Rust today, every language choice was the optimal solution under the constraints of the time. The emergence of AI has turned Rust from "I want to use it but cannot afford to" into "there is no reason not to use it."

**The system instantly gains memory safety, performance, and distribution size improvements almost for free.**

That is why I rewrote Memoria in Rust.

---

_[Memoria](https://github.com/matrixorigin/memoria) is an open-source project that provides persistent memory for AI Agents and supports mainstream AI coding tools such as Kiro, Cursor, and Claude Code. Its underlying storage is based on the [MatrixOne](https://github.com/matrixorigin/matrixone) cloud-native hyper-converged database._
