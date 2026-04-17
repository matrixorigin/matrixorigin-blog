---
title: 'BPF 开发: 从 Hello World 开始'
author: 金庆辉
mail: jinqinghui@matrixorigin.cn
description: >-
  本文概述了 BPF 技术在 Linux 内核中的应用，介绍了如何编写和运行 eBPF 程序，并讨论了 BPF 在 MatrixOne
  数据库中的应用，涵盖了网络、可观测性和安全性方面的应用场景。
tags:
  - 技术干货
keywords:
  - BPF
  - eBPF
  - Linux 内核
  - 网络
  - 可观测性
  - 安全性
  - MatrixOne
publishTime: '2024-01-26 17:00:00+08:00'
image:
  '1': /content/zh/bpf-development-from-scratch/cover-1.jpeg
  '235': /content/zh/bpf-development-from-scratch/cover-235.jpeg
date: '2024-01-26 17:00:00+08:00'
lang: zh
status: published
---

## Part 1 概述

### 背景

BPF 技术被列为近些年 Linux 内核领域最火热的新领域之一。它成功的给 Linux 内核赋予了少量的动态可编程性，可以在 Linux 内核运行时，实时修改内核的行为，但不需要重新编译和重启内核。据此，BPF 在 Linux 世界中：

- **网络**
- **可观测性**
- **安全**

三大领域大放异彩，学习好 BPF 技术，对于 Linux 内核和应用开发者来说，是一件非常有意义的事情。

### 什么是 BPF？

BPF 在 Linux 内核中，被实现为一个非常精简的虚拟机，具有几乎性能无损的执行效率。我们可以用类似 C 语言的语法，编写代码，编译成可以在 BPF 虚拟机中运行的汇编代码，实现其强大的逻辑处理能力。

今天，我们将从 Hello World 开始，带您进入 BPF 的世界。

### 开始 BPF

按照计算机程序设计语言学习的传统，我们从经典的 Hello World 程序开始我们的 eBPF 开发之旅。首先简单对比下标准 C 程序和 eBPF 程序的异同。

#### C 语言程序

##### HelloWorld.c

```c
#include <stdio.h>

int main()
{
  printf("HelloWorld\n");
  return 0;
}
```

##### C 语言的编译与运行

![Compilation and Execution of a C Program](/content/zh/bpf-development-from-scratch/compilation-and-execution-of-c-program.png)

#### eBPF 程序

##### HelloWorld.bpf.c

```c
#include <linux/bpf.h>
#include <bpf/bpf_helpers.h>

int helloworld(void *ctx)
{
  bpf_printk("Hello world!\n");
  return 0;
}
```

##### eBPF 程序的编译与运行

![Compilation and Execution of a BPF program](/content/zh/bpf-development-from-scratch/compilation-and-execution-of-bpf.png)

eBPF 的编译、加载、运行比标准 C 程序要麻烦一些。接下来会一步一步介绍全流程。

## Part 2 开发环境

我们使用 **vagrant + virtualbox + Ubuntu22.04** 组建我们的开发环境。注意，只支持 X86 的 CPU(Windows、Linux 或 Mac)。苹果 M 芯片不支持。

保存虚拟机描述文件 Vagrantfile：

```shell
Vagrant.configure('2') do |config|
  config.vm.define 'bpf' do |bpf|
    bpf.vm.provider 'virtualbox' do |vb|
      vb.gui = false
      vb.memory = '4096'
      vb.cpus = 2
    end
    bpf.vm.synced_folder '.', '/vagrant', disabled: true
    bpf.vm.box = 'bento/ubuntu-22.04'
    bpf.vm.network 'private_network', type: 'dhcp'
    bpf.vm.provision 'shell', inline: <<-SHELL
        set -x
        set -e
        apt-get install -y linux-tools-generic linux-tools-$(uname -r) gcc-multilib clang libbpf0 libbpf-dev
    SHELL
  end
end
```

**一些常用命令：**

- `vagrant up`：启动虚拟机
- `vagrant halt`：关闭虚拟机电源
- `vagrant destroy`：销毁虚拟机
- `vagrant ssh`：登入虚拟机

## Part 3 开始开发

以上文提到的 `HelloWorld.bpf.c` 为例子。

### 编译 eBPF

生成 eBPF 字节码，并带有调试信息：

```bash
clang -target bpf -Wall -O2 -g -c HelloWorld.bpf.c -o HelloWorld.o
```

查看 eBPF 编译后的字节码：

```bash
llvm-objdump -d -r -S --print-imm-hex HelloWorld.o
```

```bash
root@vagrant:~# llvm-objdump -d -r -S --print-imm-hex HelloWorld.o

HelloWorld.o:   file format elf64-bpf

Disassembly of section .text:

0000000000000000 <helloworld>:
; {
       0:       b7 01 00 00 0a 00 00 00 r1 = 0xa
;  bpf_printk("Hello world!\n");
       1:       6b 1a fc ff 00 00 00 00 *(u16*)(r10 - 0x4) = r1
       2:       b7 01 00 00 72 6c 64 21 r1 = 0x21646c72
       3:       63 1a f8 ff 00 00 00 00 *(u32*)(r10 - 0x8) = r1
       4:       18 01 00 00 48 65 6c 6c 00 00 00 00 6f 20 77 6f r1 = 0x6f77206f6c6c6548 ll
       6:       7b 1a f0 ff 00 00 00 00 *(u64*)(r10 - 0x10) = r1
       7:       bf a1 00 00 00 00 00 00 r1 = r10
       8:       07 01 00 00 f0 ff ff ff r1 += -0x10
;  bpf_printk("Hello world!\n");
       9:       b7 02 00 00 0e 00 00 00 r2 = 0xe
      10:       85 00 00 00 06 00 00 00 call 0x6
;  return 0;
      11:       b7 00 00 00 00 00 00 00 r0 = 0x0
      12:       95 00 00 00 00 00 00 00 exit
}
```

对这一段 eBPF 汇编代码感兴趣的同学可以参考 [eBPF Instruction Set Specification v1.0](https://docs.kernel.org/bpf/standardization/instruction-set.html)。

### 运行 BPF

#### 流程

![The Process of Running a BPF Program](/content/zh/bpf-development-from-scratch/bpf-event.webp)

Linux 内核中支持 eBPF 的事件很多。挂载 eBPF 程序后，需要等待事件异步触发才能看到效果。

#### 加载 eBPF 字节码

Linux 内核官方工具 bpftool 帮我们封装了对 eBPF 字节码各种操作。本文我们用它来挂载和调试 eBPF。

#### 在内核生成 eBPF 文件结构

eBPF 在 Linux 内核以特殊文件形式存在，如果进程退出了则会自动销毁。为了让 eBPF 程序独立于进程持久存在于 Linux 内核中，内核提供了 bpf 文件系统，可以把 eBPF 程序 pin 在其中。Ubuntu 22.04 默认挂载了 bpf 文件系统，位于 `/sys/fs/bpf`，可以直接使用。

现在的 eBPF 字节码只是一段单纯的代码，要把它传入内核，还需要指定该 eBPF 字节码的类型，可以通过 bpftool feature 列出内核支持的所有 eBPF 类型：

```bash

...
Scanning eBPF program types...
eBPF program_type socket_filter is available
eBPF program_type kprobe is available
eBPF program_type sched_cls is available
eBPF program_type sched_act is available
eBPF program_type tracepoint is available
eBPF program_type xdp is available
eBPF program_type perf_event is available
eBPF program_type cgroup_skb is available
eBPF program_type cgroup_sock is available
eBPF program_type lwt_in is available
eBPF program_type lwt_out is available
...
```

`HelloWorld.bpf.c` 是一个“万能”的 eBPF 程序，因为它仅仅输出 `"HelloWorld"`，因此，它可以指定为任何 eBPF 程序类型，这里我们选用 `raw_tracepoint`。

```bash
bpftool prog load HelloWorld.o /sys/fs/bpf/HelloWorld type raw_tracepoint
```

现在可以在 `/sys/fs/bpf/` 中看到：

```bash
root@vagrant:~# ls /sys/fs/bpf/HelloWorld
/sys/fs/bpf/HelloWorld
```

或者：

```bash
root@vagrant:~# bpftool prog show pinned /sys/fs/bpf/HelloWorld
353: raw_tracepoint  name helloworld  tag fc3c56cde923df12  gpl
        loaded_at 2023-03-11T01:59:48+0000  uid 0
        xlated 104B  jited 71B  memlock 4096B
        btf_id 118
```

这说明我们的 eBPF 程序已经成功加载到内核中。

#### 把内核中的 eBPF 程序挂载到事件上

正常情况下，我们会把 eBPF 挂载到特定事件上，然后等待事件异步触发时，再执行 eBPF 程序。

本文我们为了方便，选择最简单的，用于调试和测试用的接口：`BPF_PROG_TEST_RUN`，也叫 `BPF_PROG_RUN`，
他们是完全等价的。这个接口可以直接同步执行 eBPF 程序，而不需要挂载到事件上再等待事件异步发生。

`BPF_PROG_TEST_RUN` 只支持有限的 eBPF 程序类型：

```bash
BPF_PROG_TYPE_SOCKET_FILTER
BPF_PROG_TYPE_SCHED_CLS
BPF_PROG_TYPE_SCHED_ACT
BPF_PROG_TYPE_XDP
BPF_PROG_TYPE_SK_LOOKUP
BPF_PROG_TYPE_CGROUP_SKB
BPF_PROG_TYPE_LWT_IN
BPF_PROG_TYPE_LWT_OUT
BPF_PROG_TYPE_LWT_XMIT
BPF_PROG_TYPE_LWT_SEG6LOCAL
BPF_PROG_TYPE_FLOW_DISSECTOR
BPF_PROG_TYPE_STRUCT_OPS
BPF_PROG_TYPE_RAW_TRACEPOINT
BPF_PROG_TYPE_SYSCALL
```

上文我们把 eBPF 字节码指定为 `raw_tracepoint`，正好满足该接口的要求。

利用 bpftool 使用 `BPF_PROG_TEST_RUN` 接口来运行它（参数如何设置，之后会有专题分析，这里不要修改 bpftool 参数）：

```bash
bpftool prog run pinned /sys/fs/bpf/HelloWorld repeat 0
```

查看输出结果：

```bash
root@vagrant:~# cat /sys/kernel/debug/tracing/trace
# tracer: nop
#
# entries-in-buffer/entries-written: 1/1   #P:4
#
#                                _-----=> irqs-off
#                               / _----=> need-resched
#                              | / _---=> hardirq/softirq
#                              || / _--=> preempt-depth
#                              ||| / _-=> migrate-disable
#                              |||| /     delay
#           TASK-PID     CPU#  |||||  TIMESTAMP  FUNCTION
#              | |         |   |||||     |         |
         bpftool-39498   [001] d.... 979047.864950: bpf_trace_printk: Hello world!
```

OK，我们现在成功地执行了第一个最简单的 BPF 程序。

## Part 4 BPF in MatrixOne

MatrixOne 作为我司主打数据库产品，未来在 MatrixOne 中将全面使用 BPF 技术，用于增强数据库集群的性能，稳定性和安全性。

### 网络

MatrixOne 作为云原生数据库，运行在标准的 Kubernetes 集群中，网络是其最重要的基础设施之一。我们将利用 BPF 技术，减少 Linux 内核网络协议栈的开销，实现 MatrixOne 的网络性能优化。

### 可观测性

我们将在自带的可观测性组件中，利用 BPF 实时采集和分析数据库运行时的各种指标，用于自动化分析和故障诊断。同时，我们将提供一系列 BPF 工具，用于 SRE 人工分析和调优 MatrixOne。

### 安全性

我们将在附属的安全组件中，提供基于 BPF 的关键操作监控和禁止操作，用于实时检测和防御数据库的安全威胁。
