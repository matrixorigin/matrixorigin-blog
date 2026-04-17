---
title: 'Optimizing Golang Performance (2):Golang Profiling'
author: MatrixOrigin
mail: contact@matrixorigin.io
description: >-
  In the pervious blog, we exploration into Golang's memory-related features,
  but it is just the beginning. In forthcoming articles, we will delve deeper
  into various facets of Golang, uncovering more advanced topics and best
  practices.
tags:
  - technology
keywords:
  - MatrixOne
  - Golang
  - Cloud-Native
  - Kubernetes
  - Docker
publishTime: '2023-12-08 17:00:00+00:00'
image:
  '1': /content/en/shared/optimizing-golang-performance.png
  '235': /content/en/shared/optimizing-golang-performance.png
date: '2023-12-08 17:00:00+00:00'
lang: en
status: published
---

In the pervious blog, we exploration into Golang's memory-related features, but it is just the beginning. In forthcoming articles, we will delve deeper into various facets of Golang, uncovering more advanced topics and best practices.

## Golang Profiling

The Profiler runs the user program and configures the operating system to send the SIGPROF signal periodically:

- First, upon receipt of the SIGPRFO signal, user program execution is suspended.
- Then, the profiler collects the status of the user program.
- Finally, the user program is resumed when the collection is complete, and so on.

Profiler is based on sampling, which affects the program performance to some extent.

> "Before you profile, you must have a stable environment to get repeatable results."

## 2.1 Supporting Profiling

By default, all the profiles are listed in [`runtime/pprof`](https://pkg.go.dev/runtime/pprof#Profile).

### a. CPU Profiling

When CPU profiling is enabled, Golang runtime will interrupt the application every 10ms by default and record the stack information of the Goroutine.

### b. Memory Profiling

Memory profiling is the same as CPU profiling, it is also based on sampling, it will record stack information when heap memory is allocated. It will record stack information when heap memory is allocated. The default sampling frequency is once every 1000 heap memory allocations, and this frequency can be configured.

**Note: Memory profiling only records heap memory allocation information, ignoring stack memory usage.**

### c. Block Profiling

Block profiling is similar to CPU profiling, but it records how long the goroutine waits on shared resources. It is useful for checking the concurrency bottleneck of an application. Blocking statistics mainly include:

- Read/write unbuffered channel
- Write full buffer channel, read empty buffer channel
- Locking operations

If based on **net/http/pprof**, the application needs to call runtime.SetBlockProfileRate to configure the sampling frequency.

### d. Mutex Profiling

Go 1.8 introduced a mutex profile that allows you to capture a portion of the stack of goroutines competing for locks. If based on net/http/pprof, you need to call runtime.SetMutexProfileFraction in your application to configure the sampling frequency.

Note: It is not recommended to change the default values of the golang profiler when profiling an online service via **net/http/pprof**. This is because modifying some of the profiler parameters, such as increasing the memory profile sample rate, may result in a significant degradation of program performance unless you are aware of the potential impact.

## 2.2 Profiling Commands

We can get the profile file from the `go test` command, or from an application using **net/http/pprof**:

```bash
## 1. From unit tests
$ go test \[-blockprofile | -cpuprofile | -memprofile | -mutexprofile\] xxx.out

## 2. From long-running program with `net/http/pprof` enabled
## 2.1 heap profile
$ curl -o mem.out http://localhost:6060/debug/pprof/heap

## 2.2 cpu profile
$ curl -o cpu.out http://localhost:6060/debug/pprof/profile?seconds=30
```

After getting the profile file, analyze it with the **go tool pprof**:

```bash
# 1. View local profile
$ go tool pprof xxx.out

# 2. View profile via http endpoint
$ go tool pprof http://localhost:6060/debug/pprof/block
$ go tool pprof http://localhost:6060/debug/pprof/mutex
```

## 2.3 Golang Trace

We can get the trace file from the `go test` command, or from an application using **net/http/pprof:**

```bash
# 1. From unit test
$ go test -trace trace.out

# 2. From long-running program with `net/http/pprof` enabled
curl -o trace.out http://localhost:6060/debug/pprof/trace?seconds=5
```

After getting the trace file, analyze it with **go tool trace**, which will automatically open the browser:

```bash
$ go tool trace trace.out
```

## 2.4 Profiling Hints

If a large amount of time is consumed in the function `runtime.mallocgc`, it means that the program has undergone a large heap memory allocation, and Memory Profiling can be used to determine where the code is allocating heap memory.

If a lot of time is spent on synchronization primitives (such as channels, locks, etc.), the program may have concurrency problems, which usually means that the program workflow needs to be redesigned.

If a lot of time is spent on **syscall.Read/Write**, the program is likely to be performing a lot of small IO.

If the GC component is consuming a lot of time, the program may be allocating a lot of small memory, or allocating a large amount of heap memory.

### 2.5 Code Demo

The code can be found in the document: [contention_test.go](https://gist.github.com/cnutshell/80e1724c6bfcabe79485cf0b7167aca0)

- Block Profiling with Unit Test

  ```bash
  $ go test -run ^TestContention$ -blockprofile block.out
  $ go tool pprof block.out
  (pprof) top
  (pprof) web
  ```

- Mutex Profiling with Unit Test

  ```bash
  $ go test -run ^TestContention$ -mutexprofile mutex.out
  $ go tool pprof mutex.out
  (pprof) top
  (pprof) web
  ```

- Trace with Unit Test

  ```bash
  $ go test -run ^TestContention$ -trace trace.out
  $ go tool trace trace.out
  ```

## 2.6 Bibliography

[net/http/pprof examples](https://pkg.go.dev/net/http/pprof@go1.20#hdr-Usage_examples)

As we conclude our exploration of Golang profiling, it's clear that this is just the beginning of a deeper journey into Golang's performance optimization.
