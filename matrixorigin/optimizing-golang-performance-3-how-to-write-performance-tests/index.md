---
title: 'Optimizing Golang Performance (3): How to write performance tests?'
author: MatrixOrigin
mail: contact@matrixorigin.io
description: >-
  After Optimizing Golang Performance (1) Memory Related and Golang Profiling,
  we are now facing the last topic of this tutorial.
tags:
  - technology
keywords:
  - MatrixOne
  - Golang
  - Cloud-Native
  - Kubernetes
  - Docker
publishTime: '2023-12-09 17:00:00+00:00'
image:
  '1': /content/en/shared/optimizing-golang-performance.png
  '235': /content/en/shared/optimizing-golang-performance.png
date: '2023-12-09 17:00:00+00:00'
lang: en
status: published
---

After [Optimizing Golang Performance (1): Memory Related](https://medium.com/@matrixorigin-database/optimizing-golang-performance-1-memory-related-dafff15b955a) and Golang Profiling, we are now facing the last topic of this tutorial.

## How to write performance tests?

Performance problems are not guesswork, and even if we "strongly believe" that a piece of code is a performance bottleneck, it must be verified.

> "Those who can make you believe absurdities can make you commit atrocities."
>
> — Voltaire

**For performance testing, it's easy to write an inaccurate Benchmark and create a false impression.**

## 3.1 Reset or Pause timer

```go
func BenchmarkFoo(b *testing.B) {
  heavySetup()  // Performing setup before the for loop can affect the accuracy of the test results if the setup is time consuming.
  for i := 0; i < b.N; i++ {
    foo()
  }
}
```

**_Optimization Method_**

```go
func BenchmarkFoo(b *testing.B) {
  heavySetup()
  b.ResetTimer()  // reset the timer to ensure the accuracy of the test results
  for i := 0; i < b.N; i++ {
    foo()
  }
}
```

**_How to stop timer?_**

```go
func BenchmarkFoo(b *testing.B) {
  for i := 0; i < b.N; i++ {
    b.StopTimer() // stop timer
    heavySetup()
    b.StartTimer() // begin timer
    foo()
  }
}
```

## 3.2 Increased Credibility of Test Results

With Benchmark, there are many factors that can affect the accuracy of the results, such as **machine load, power management settings, thermal scaling**, and so on.

The same performance test code, run under different architectures and operating systems can produce very different results. The same Benchmark, even when run on the same machine, may produce inconsistent data.

The easy way out is to increase the number of times the Benchmark is run or to run the test multiple times to get relatively accurate results:

- Set the performance test time with **-benchtim**e (default 1 second).
- Run Benchmark multiple times with **-count.**

```go
package benchmark

import (
        "sync/atomic"
        "testing"
)

func BenchmarkAtomicStoreInt32(b *testing.B) {
        var v int32
        for i := 0; i < b.N; i++ {
                atomic.StoreInt32(&v, 1)
        }
}

func BenchmarkAtomicStoreInt64(b *testing.B) {
        var v int64
        for i := 0; i < b.N; i++ {
                atomic.StoreInt64(&v, 1)
        }
}
```

Multiple runs of the test yielded results with high confidence:

```go
go test -bench Atomic -count 10 | tee stats.txt

$ benchstat stats.txt
goos: darwin
goarch: arm64
pkg: github.com/cnutshell/go-pearls/benchmark
                   │   stats.txt   │
                   │    sec/op     │
AtomicStoreInt32-8   0.3131n ± ∞ ¹
AtomicStoreInt64-8   0.3129n ± ∞ ¹
geomean              0.3130n
¹ need >= 6 samples for confidence interval at level 0.95
```

If benchstat is not found, install it with the go install command: `go install golang.org/x/perf/cmd/benchstat@latest`

## 3.3 Pay Attention to Compiler Optimizations

```go

package benchmark

import "testing"

const (
        m1 = 0x5555555555555555
        m2 = 0x3333333333333333
        m4 = 0x0f0f0f0f0f0f0f0f
)

func calculate(x uint64) uint64 {
        x -= (x >> 1) & m1
        x = (x & m2) + ((x >> 2) & m2)
        return (x + (x >> 4)) & m4
}

func BenchmarkCalculate(b *testing.B) {
        for i := 0; i < b.N; i++ {
                calculate(uint64(i))
        }
}

func BenchmarkCalculateEmpty(b *testing.B) {
        for i := 0; i < b.N; i++ {
                // empty body
        }
}
```

Run the test in the sample code, both tests have the same result:

```go
$ go test -bench Calculate
goos: darwin
goarch: arm64
pkg: github.com/cnutshell/go-pearls/benchmark
BenchmarkCalculate-8            1000000000               0.3196 ns/op
BenchmarkCalculateEmpty-8       1000000000               0.3154 ns/op
PASS
ok      github.com/cnutshell/go-pearls/benchmark        0.814s
```

So how can this be avoided? An example was given earlier when introducing the golang interface:

```go
var global interface{}

func BenchmarkInterface(b *testing.B) {
  var local interface{}
  for i := 0; i < b.N; i++ {
    local = calculate(uint64(i)) // assign value to interface{}
  }
  global = local
}
```

Assigning the return value of **calculated** to the **local** variable local and assigning the **local** variable local to a global variable **global** at the end of the loop prevents the function **calculate** from being optimized by the compiler.

**Wrong performance test results can lead us to make wrong decisions, this is the meaning of "A slight error in the beginning results in a big mistake in the end.", writing performance test code is not as simple as it seems.**

As we conclude our exploration of Golang profiling, it's clear that this is just the beginning of a deeper journey into Golang's performance optimization.
