---
title: 'Optimizing Golang Performance (1): Memory Related'
author: MatrixOrigin
mail: contact@matrixorigin.io
description: >-
  Nowadays, with the booming cloud native ecosystem driven by Kubernetes,
  Docker, and many other star projects, more and more startups as well as big
  companies in China have started to pay attention to Golang.
tags:
  - technology
keywords:
  - MatrixOne
  - Golang
  - Cloud-Native
  - Kubernetes
  - Docker
publishTime: '2023-12-07 17:00:00+00:00'
image:
  '1': /content/en/shared/optimizing-golang-performance.png
  '235': /content/en/shared/optimizing-golang-performance.png
date: '2023-12-07 17:00:00+00:00'
lang: en
status: published
---

## Introduction

Nowadays, with the booming cloud native ecosystem driven by Kubernetes, Docker, and many other star projects, more and more startups as well as big companies in China have started to pay attention to Golang. There are more books, blogs, and articles introducing Golang, and there are a lot of very high-quality materials among them. There is enough information in the industry, so this article will not cover any particular aspect of Golang. Instead, it will focus on the advantages of Golang from a practical engineering perspective. This is because in the course of my work, I have noticed some frustrating code, some of which even comes from senior programmers.

Here's an overview of the table of contents which would be introduced in this week. We'll start with memory-related topics:

## Part 1: Compiler Memory Escape Analysis

Let's start with this code:

```go
package main

//go:noinline
func makeBuffer() []byte {
    return make([]byte, 1024)
}

func main() {
    buf := makeBuffer()
    for i := range buf {
        buf[i] = buf[i] + 1
    }
}
```

The sample code in the function `makeBuffer` return memory is located on the function stack. In C, this is a piece of wrong code that will lead to undefined behavior.

In Go, such writing is allowed, and the Go compiler performs **escape analysis**: when it finds a piece of memory that cannot be placed on the function stack, it places it on the heap. For example, `makeBuffer` returns stack memory upwards, and the compiler automatically places memory on the heap.

The **-m** option allows you to view the results of the compiler analysis:

```bash
$ go build -gcflags="-m" escape.go
# command-line-arguments
./escape.go:8:6: can inline main
./escape.go:5:13: make([]byte, 1024) escapes to heap
```

In addition to this, there are other cases where memory "escapes" can be triggered:

- Global variables, since they can be accessed concurrently by multiple goroutines.
- Pointer transfers through channels.
  ```go
  type Hello struct { name string }
  ch := make(chan *Hello, 1)
  ch <- &Hello{ name: "world"}
  ```
- A pointer is held in a structure passed through the channel.
  ```go
  type Hello struct { name *string }
  ch := make(chan *Hello, 1)
  name := "world"
  ch <- Hello{ name: &name }
  ```
- Local variables are too large to be placed on the function stack.
- The size of a local variable is unknown at compile time, e.g. `s := make([]int, 1024)` might not be placed on heap memory, but `s := make([]int, n)` will be placed on heap memory because its size `n` is a variable.
- An **append** operation on a **slice** triggers a reallocation of its underlying array.

_Note: The above list is not exhaustive and is subject to change as Go evolves._

During development, if programmers do not pay attention to the Golang compiler's memory escape analysis, they may write code that results in "extra" dynamic memory allocations, which are often associated with performance problems (more on this later in the Golang gc chapter).

**The example code gives us the inspiration: pay attention to the design of the function signature, try to avoid unnecessary memory allocation due to irrational design of the function signature. The [cockroach encoding function](https://github.com/cockroachdb/cockroach/blob/5fbcd8a8deac0205c7df38e340c1eb9692854383/pkg/util/encoding/encoding.go#L180) is a good example of how returning a slice upwards can trigger memory escapes, while passing a slice downwards does not.**

## Part 2: Interface{}/any

`any` was introduced in Golang 1.18 and is equivalent to `interface{}`.

```go
type any = interface{}
```

In Golang, an interface is implemented as a "fat" pointer: one to the actual data, and one to a table of function pointers (similar to the table of virtual functions in C++).

Let's look at the following code:

```go
package interfaces

import (
  "testing"
)

var global interface{}

func BenchmarkInterface(b *testing.B) {
  var local interface{}
  for i := 0; i < b.N; i++ {
    local = calculate(i) // assign value to interface{}
  }
  global = local
}

// values is bigger than single machine word.
type values struct {
  value  int
  double int
  triple int
}
func calculate(i int) values {
  return values{
    value:  i,
    double: i * 2,
    triple: i * 3,
  }
}
```

In the performance test `BenchmarkInterface`, we assign the result returned by the **calculate** function to a variable of type `interface{}`.

Next, we perform a **memory profile** on the `BenchmarkInterface`:

```bash
$ go test -run none -bench Interface -benchmem -memprofile mem.out

goos: darwin
goarch: arm64
pkg: github.com/cnutshell/go-pearls/memory/interfaces
BenchmarkInterface-8    101292834               11.80 ns/op           24 B/op          1 allocs/op
PASS
ok      github.com/cnutshell/go-pearls/memory/interfaces        2.759s

$ go tool pprof -alloc_space -flat mem.out
(pprof) top
(pprof) list iface.BenchmarkInterface
Total: 2.31GB
    2.31GB     2.31GB (flat, cum) 99.89% of Total
         .          .      7:var global interface{}
         .          .      8:
         .          .      9:func BenchmarkInterface(b *testing.B) {
         .          .     10:   var local interface{}
         .          .     11:   for i := 0; i < b.N; i++ {
    2.31GB     2.31GB     12:           local = calculate(i) // assign value to interface{}
         .          .     13:   }
         .          .     14:   global = local
         .          .     15:}
         .          .     16:
         .          .     17:// values is bigger than single machine word.
(pprof)
```

From the memory profiling result, we can see that assigning a value to the variable **local** of the interface type will trigger a memory "escape", resulting in additional dynamic memory allocation.

Before Go 1.18 introduced the paradigm, we were implementing polymorphism based on interfaces. Implementing polymorphism based on interfaces has the following problems:

- Type information is lost, and program behavior is shifted from the compile phase to the runtime phase;
- The runtime phase of the program inevitably needs to perform operations such as type conversion, type assertion, or reflection;
- Assigning values to variables of interface types may result in "extra" memory allocations;
- The actual call overhead of an interface-based function call is: pointer dereference (to determine the method address) + function execution overhead. The compiler cannot perform inline optimizations or perform further optimizations based on inline optimizations.

**Here are some tips on the use of interfaces:**

- Avoid using `interface{}` or `any` in your code, at least in frequently used data structures or functions.
- Go 1.18 introduced paradigms. Changing the interface type to a paradigm type is a way to optimize performance by avoiding extra memory allocation.

## Part 3: Golang gc

As we learned earlier, after the Golang compiler executes an escape analysis, data may be "moved" to heap memory as needed.

Here is a brief introduction to Golang's gc to understand why we should try to avoid "extra" memory allocation when writing Golang code.

### 3.1 Introduction

The gc is a very important part of the Go language that greatly simplifies the complexity of writing concurrent programs for programmers.

It has been discovered that writing well-working concurrent programs is no longer the exclusive skill of a small group of programmers. Gc uses a tree to maintain references to objects in heap memory and is a tracing style of gc that works on the **basis of a "mark-and-clear" algorithm**, which is divided into two main phases:

- **Mark phase** — Traverses all heap memory objects to determine if they are in use;
- **Clear phase** — Traverses the tree and clears the heap memory objects that are not referenced.

When executing gc, Golang first performs a series of operations and stops the application execution, i.e., **stopping the world**, and then resumes the application execution. At the same time, other gc-related operations are executed in parallel. This is why golang's gc is also called **concurrent mark-and-sweep**, which aims to minimize the impact of STW on program execution. Strictly speaking, **STW** occurs twice, at the start of the mark and at the end of the mark.

Golang gc includes a scavenger that periodically returns memory that is no longer in use to the operating system. It is also possible to manually return memory to the operating system by calling `debug.FreeOSMemory()` in your program.

### 3.2 The gc Trigger Mechanism

Compared to Java, Golang provides a simpler way to control gc: through the environment variable `GOGC`.

`runtime/debug.SetGCPercent` allows changing this percentage at run time.

`GOGC` defines the growth rate of heap memory when the next gc is triggered, and the default value is 100, which means that another gc will be triggered when the heap memory doubles after the last gc. For example, if the current heap size is 128MB when gc is triggered, and if `GOGC=100`, then the next gc will be executed when the heap size grows to 256MB, and if golang hasn't executed a gc in two minutes, it will be triggered once. We can also call `runtime.GC()` in the program to trigger gc actively.

```bash
# You can display gc trace information by setting the environment variable GODEBUG.

$ GODEBUG=gctrace=1 go test -bench=. -v

# When gc runs, the relevant information is written to standard error.
```

**_Note:_** _Increasing the GOGC value in order to reduce the number of gc triggers does not necessarily result in a linear gain. Even if the number of gc triggers is reduced, the execution of gc may be extended due to the larger heap memory. In most cases, keeping GOGC at the default value of 100 is sufficient._

### 3.3 gc hints

If we have a lot of "extra" heap memory allocations in our code, especially in the critical paths of our code, the negative impact on performance can be significant:

- First, heap memory allocation is a relatively time-consuming operation.
- Secondly, a large number of "extra" heap memory allocations means additional gc processes, which STW further affects the efficiency of program execution.

In extreme cases, a large amount of heap memory allocation in a short period of time may directly trigger an OOM, and the gc will not even have a chance to execute.

**So don't be "naive" and think that gc will do everything for you: the less work you leave to gc, the more "decent" your performance will be.**

From a performance optimization point of view, eliminating those "extra" memory allocations has obvious benefits and is usually the first or second priority. However, heap memory usage cannot be completely avoided, and when it is needed, you can consider techniques such as duplicating memory with `sync.Pool` to reduce gc pressure.

### 3.4 Why are there still memory leaks with gc?

Even though Golang is a gc language, it is not necessarily free of memory leaks, and the following two situations can lead to memory leak situations:

- Objects that reference heap memory objects persist for a long time;
- Goroutines consume a certain amount of memory to hold contextual information about user code, and a Goroutine leak can lead to a memory leak.

### 3.5 Code Demo

The code can be found in the file [gc.go](https://gist.github.com/cnutshell/817b17f6eb4fa5c4383c0c7d53c744c0)：

- The allocator function sends a structure of type buf through channel, which holds a reference to heap memory;
- The function mempool receives the buf from allocator through channel and records it in slice in a loop;
- Meanwhile, mempool also prints the current memory status of the application periodically, see [`runtime.MemStats`](https://pkg.go.dev/runtime@go1.20#MemStats) for details.

Run the code `gc.go`:

```bash
$ go run gc.go
HeapSys(bytes),PoolSize(MiB),HeapAlloc(MiB),HeapInuse(MiB),HeapIdle(bytes),HeapReleased(bytes)
 12222464,     5.00,     7.11,     7.45,  4415488,  4300800
 16384000,    10.00,    12.11,    12.45,  3334144,  3153920
 24772608,    18.00,    20.11,    20.45,  3334144,  3121152
 28966912,    22.00,    24.11,    24.45,  3334144,  3121152
 33161216,    25.00,    27.11,    27.45,  4382720,  4169728
 37355520,    32.00,    34.11,    34.45,  1236992,   991232
 41549824,    36.00,    38.11,    38.45,  1236992,   991232
 54132736,    48.00,    50.11,    50.45,  1236992,   991232
 58327040,    51.00,    53.11,    53.45,  2285568,  2039808
```

**From the program output, we can see that if there is a variable in the program that holds a reference to heap memory, then this heap memory will not be reclaimed by gc.**

Therefore, when assigning a variable with a reference to heap memory, such as assigning it to a new variable, care should be taken to avoid memory leaks. It is often recommended to encapsulate assignment-related operations in methods to avoid "unexpected" memory leaks through proper API design. Encapsulation also has the benefit of improving the testability of the code.

**In conclusion**, optimizing memory performance in Golang requires a nuanced understanding of its memory management mechanisms. The insights gained from the compiler's memory escape analysis, the implications of using interfaces, and the intricacies of Golang

Stay tuned for more insightful explorations into Golang, as we continue to unravel the intricacies of this powerful programming language in **our upcoming articles**.

### 3.6 Bibliography

[Blog: Go Data Structures: Interfaces](https://research.swtch.com/interfaces)

[GOGC on golang's document](https://pkg.go.dev/runtime@go1.20#hdr-Environment_Variables)

[GC Recognition](https://www.bookstack.cn/read/qcrao-Go-Questions/GC-GC.md)
