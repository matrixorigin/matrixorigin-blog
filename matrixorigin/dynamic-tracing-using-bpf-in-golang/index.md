---
title: Dynamic Tracing Using BPF in Golang
author: Jin Qinghui
mail: jinqinghui@matrixorigin.io
description: >-
  Golang provides a pprof performance profiling tool, allowing us to quickly and
  roughly analyze performance bottlenecks, which is widely used in daily
  development. However, as performance tuning requirements continue to rise, we
  need more accurate performance metrics, such as the execution time of a
  particular Golang function. At which point pprof can't help, and we have to
  find another way.
tags:
  - technology
keywords:
  - MatrixOne
  - Golang
  - BPF Tracing
  - Cloud-Native
publishTime: '2023-11-22 17:00:00+00:00'
image:
  '1': >-
    /content/en/dynamic-tracing-using-bpf-in-golang/dynamic-tracing-using-bpf-in-golang.png
  '235': >-
    /content/en/dynamic-tracing-using-bpf-in-golang/dynamic-tracing-using-bpf-in-golang.png
date: '2023-11-22 17:00:00+00:00'
lang: en
status: published
---

## Part 1 Background

**Golang, the most widely used programming language in the cloud-native area, is the main development language for MatrixOne.** Golang provides a pprof performance profiling tool, allowing us to quickly and roughly analyze performance bottlenecks, which is widely used in daily development. However, as performance tuning requirements continue to rise, we need more accurate performance metrics, such as the execution time of a particular Golang function. At which point pprof can't help, and we have to find another way.

As a first reaction, we consider manually adding timing functions and recompiling the code for execution. This solution is certainly feasible, but disadvantages are also obvious, each function needs to be analyzed, the code must be modified and recompiled for execution. The program is relatively heavy and not easy to maintain. In case of online systems, it is often not possible to modify the code.

**So, is there a better way to measure the latency of a specific function? Preferably without modifying the code and recompiling it. The answer is Yes.**

## Part 2 History

### 01 Uprobe

If you want to achieve the function of measuring the code without modifying it, the choice is to dynamically modify the code segments of the program at runtime to include custom logic.

Linux developers, provide the ability to dynamically modify program code while it is running — uprobe. It can modify the specified assembly code to int3 instruction and save the original instruction. When the application program runs into the int3 instruction, it triggers an exception and switches to the Linux kernel state, it can execute the measurement logic in advance. Then, it returns to user space and executes the instruction that was replaced by int3 and saved at the beginning. For the application program, everything looks senseless. Our measurement logic, on the other hand, records the current time. If we record it once at the beginning and the end of the function, we can calculate the difference and get the execution time of the function.

### 02 BPF

Uprobe, provides the basic framework for dynamic tracking applications. However, it remains difficult to use, and the measurement logic requires writing Linux kernel modules, which remains a high barrier to use for most application developers.

With BPF technology emerged, Linux kernel developers, integrated it into the uprobe framework. From there, dynamic trace logic can be written using C-like code. This is much simpler than the Linux kernel module implementation.

### 03 bpftrace

To further lower the barrier to using uprobe + BPF, developers have designed and implemented the bpftrace tool, which acts as a front-end to BPF, compiling and generating BPF programs and loading them automatically by using a simple script-like syntax. This allows for very fast implementation of dynamic measurement procedures when analyze an application. It is also possible to prepare scripts in advance and use them directly.

Bpftrace was originally designed mainly for C development scenarios. Can it be useful in a golang environment? **The answer is yes**, but it needs to be tweaked. In the next section, we will introduce how to make bpftrace work correctly in a golang environment.

## Part 3 BPF Meets Golang

### 01 Questions

**Golang, being a compiled language, can theoretically be used directly for dynamic tracing using uprobe + BPF. However, golang has subtle differences compared to C.** Here is an example using go 1.19 + x86 environment:

1. Functions only use registers to pass parameters in C. However, golang is not sure whether to use registers or the stack to pass function parameters (either registers or the stack, not mixed), the compiler has an algorithm to decide, the specific algorithmic rules can be referred to the golang source code of the `src/cmd/compile/internal-abi.md` document. The difference means that when using bpftrace dynamic tracing to get the parameters of the traced function, you need to check whether it uses registers to pass parameters, or passes parameters via the stack, and call a different bpftace function to get them. My personal approach is to look at the assembly language of golang function and determine it manually. Haven't come up with a smarter way yet.
2. Golang natively supports coprocessing, its function stack is initially very small compared to C, and stack expansion occurs as the stack depth increases, which copies the old stack into a new, larger stack memory. This feature of golang means that the uretprobe dynamic tracing technique for function returns, which is used stably in C (and which requires modification of the function stack), is directly applicable in golang. When stack expansion occurs, it can lead to program errors. Therefore, the only way to properly trace the return of a golang function is to iterate through the assembly code of the function and trace all ret assembly instructions.
3. The number and order of function arguments in Golang cannot be determined literally. The compiler will probably rewrite it. For example, a string reference, golang will expand it into two parameters, address and length. Currently, I haven't found a good way to find the rewritten parameter list.
4. All Golang functions run in a co-thread, which means a function may switch from thread A to thread B during one execution. C functions, on the other hand, will only be in one thread during a single execution until the execution is complete. This means the context in a golang function cannot be uniquely determined by the thread number. Fortunately, we still have a way to uniquely identify a golang thread context. Each golang concatenation is represented by a `type gobuf struct {…}` instance. Trace the `runtime/proc.go:execute(gp *g, inheritTime bool)` function to record `*g`, which uniquely marks the current concatenation context.
5. Golang function symbols may have symbols like `(`, `*`, etc. bpftrace doesn't support this very well, maybe it will be fixed later. For now, we can get around this by replacing function names with addresses.

## 02 Implementation

**>>> Open Source Projects: go-bpf-gen** ([GitHub — stevenjohnstone/go-bpf-gen: Generate bpftrace scripts for use with golang programs. Works around quirks in the golang runtime.](https://github.com/stevenjohnstone/go-bpf-gen))

It is a good solution to the problem of adapting BPF to golang. We need to focus on the latency.bt script, it can measure the histogram of the call latency of any golang function.

**>>> Compile**

```bash
go build
```

**>>> Generate measurement scripts for specific functions**

```go
./go-bpf-gen templates/latency.bt ../../matrixone/mo-service symbol="github.com/matrixorigin/matrixone/pkg/logservice.(*managedClient).Append"
BEGIN {
  printf("Hit CTRL+C to end profilingn");
}


uprobe:/home/jinqinghui/matrixone/mo-service:runtime.execute {
        // map thread id to goroutine id
        @gids[tid] = reg("ax")
}

tracepoint:sched:sched_process_exit {
  delete(@gids[tid]);
}

uprobe:/home/jinqinghui/matrixone/mo-service:"github.com/matrixorigin/matrixone/pkg/logservice.(*managedClient).Append" {
        $gid = @gids[tid];
        @start0[$gid, pid] = nsecs;
}

uprobe:/home/jinqinghui/matrixone/mo-service:"github.com/matrixorigin/matrixone/pkg/logservice.(*managedClient).Append" + 273,
uprobe:/home/jinqinghui/matrixone/mo-service:"github.com/matrixorigin/matrixone/pkg/logservice.(*managedClient).Append" + 291 {
        $gid = @gids[tid];
        @durations["github.com/matrixorigin/matrixone/pkg/logservice.(*managedClient).Append"] = hist((nsecs - @start0[$gid, pid])/1000000);
        delete(@start0[$gid, pid]);
}
```

**Key points of the script:**

- **Function call context acquisition:** trace `runtime.execute()`. This function is the dispatch function for scheduling a concatenation on the golang runtime. With the trace parameter, you can know the identity of the golang concatenation being dispatched on the current thread.
- **Function parameter acquisition:** `runtime.execute()` is passed through registers in golang 1.19. This can be determined by looking at the assembly.
- **The return point of a Golang function:** Iterate through the binary to find the offset of the function's ret instruction, then add it to the function start position. There are as many ret instructions as times to trace.
- **By recording the function entry time and return time:** The delay is calculated and finally saved in the histogram tree structure.

**>>> BUG**

Unfortunately, this script does not execute correctly with the latest bpftrace. The reason is that the traced function contains `(` which is currently not supported by bpftrace. The alternative is to manually replace the function name with the specific address of the function in the binary. Manual computation is required.

MatrixOne will be improved based on the go-bpf-gen project — automatically replace function names with function addresses when generating scripts, in order to avoid the inconvenience of manually viewing the assembly.
