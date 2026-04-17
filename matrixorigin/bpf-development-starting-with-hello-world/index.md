---
title: 'BPF Development: Starting with Hello World'
author: MatrixOrigin
mail: contact@matrixorigin.io
description: >-
  BPF technology has been listed as one of the hottest new areas in the Linux
  kernel domain in recent years. It has successfully endowed the Linux kernel
  with a degree of dynamic programmability, allowing for real-time modifications
  to the kernel's behavior during runtime, without the need to recompile or
  reboot the kernel.
tags:
  - technology
keywords:
  - MatrixOne
  - BPF
  - Linux kernel
  - Virtual Machine
  - Database
publishTime: '2024-02-23 17:00:00+00:00'
image:
  '1': /content/en/bpf-development-starting-with-hello-world/top.jpg
  '235': /content/en/bpf-development-starting-with-hello-world/top.jpg
date: '2024-02-23 17:00:00+00:00'
lang: en
status: published
---

## Part 1 Overview

### Background

BPF technology has been listed as one of the hottest new areas in the Linux kernel domain in recent years. It has successfully endowed the Linux kernel with a degree of dynamic programmability, allowing for real-time modifications to the kernel's behavior during runtime, without the need to recompile or reboot the kernel.

Consequently, BPF shines in three major areas within the Linux world: networking, observability, and security. Mastering BPF technology is very meaningful for Linux kernel and application developers.

### What is BPF?

BPF is implemented in the Linux kernel as a highly streamlined virtual machine, offering near lossless performance efficiency. It allows for code to be written in a syntax similar to C, which is then compiled into assembly code that can run on the BPF virtual machine, enabling its powerful logic processing capabilities.

Today, starting with Hello World, we will take you into the world of BPF.

### Starting with BPF

Following the tradition of learning computer programming languages, we begin our journey into eBPF development with the classic Hello World program. First, let's briefly compare the similarities and differences between standard C programs and eBPF programs.

#### C Language Program

##### HelloWorld.c

```c
#include <stdio.h>

int main()
{
  printf("HelloWorld\n");
  return 0;
}
```

##### Compilation and Execution of C Language

![Compilation and Execution of C Language](/content/en/bpf-development-starting-with-hello-world/compilation-and-execution-of-c.webp)

#### eBPF Program

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

##### Compilation and Execution of eBPF Program

![Compilation and Execution of eBPF Program](/content/en/bpf-development-starting-with-hello-world/compilation-and-execution-of-ebpf-program.webp)

Compiling, loading, and running eBPF is a bit more complex than for standard C programs. The entire process will be introduced step by step.

## Part 2 Development Environment

We use **Vagrant + VirtualBox + Ubuntu 22.04** to set up our development environment. Note, it only supports x86 CPUs (Windows, Linux, or Mac). Apple's M chip is not supported.

Save the Vagrantfile, the virtual machine description file:

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

Some common commands:

- `vagrant up`: Start the virtual machine
- `vagrant halt`: Power off the virtual machine
- `vagrant destroy`: Destroy the virtual machine
- `vagrant ssh`: Log into the virtual machine

## Part 3 Starting Development

Taking the previously mentioned `HelloWorld.bpf.c` as an example.

#### Compiling eBPF

Generate eBPF bytecode, including debug information:

```bash
clang -target bpf -Wall -O2 -g -c HelloWorld.bpf.c -o HelloWorld.o
```

View the compiled eBPF bytecode

```bash
llvm-objdump -d -r -S --print-imm-hex HelloWorld.o
```

```bash
root@vagrant:~# llvm-objdump -d -r -S --print-imm-hex HelloWorld.o
HelloWorld.o: file format elf64-bpf
Disassembly of section .text:
0000000000000000 <helloworld>:
; {
 0: b7 01 00 00 0a 00 00 00 r1 = 0xa
; bpf_printk("Hello world!\n");
 1: 6b 1a fc ff 00 00 00 00 *(u16*)(r10 - 0x4) = r1
 2: b7 01 00 00 72 6c 64 21 r1 = 0x21646c72
 3: 63 1a f8 ff 00 00 00 00 *(u32*)(r10 - 0x8) = r1
 4: 18 01 00 00 48 65 6c 6c 00 00 00 00 6f 20 77 6f r1 = 0x6f77206f6c6c6548 ll
 6: 7b 1a f0 ff 00 00 00 00 *(u64*)(r10 - 0x10) = r1
 7: bf a1 00 00 00 00 00 00 r1 = r10
 8: 07 01 00 00 f0 ff ff ff r1 += -0x10
; bpf_printk("Hello world!\n");
 9: b7 02 00 00 0e 00 00 00 r2 = 0xe
 10: 85 00 00 00 06 00 00 00 call 0x6
; return 0;
 11: b7 00 00 00 00 00 00 00 r0 = 0x0
 12: 95 00 00 00 00 00 00 00 exit
}

```

This chunk of eBPF assembly code is available for interested readers to reference: [eBPF Instruction Set Specification, v1.0](https://docs.kernel.org/bpf/standardization/instruction-set.html)

### Running BPF

Process:

![Process](/content/en/bpf-development-starting-with-hello-world/process.webp)

There are many events in the Linux kernel that support eBPF. After mounting an eBPF program, you need to wait for an event to be asynchronously triggered to see the effects.

#### Loading eBPF Bytecode

The Linux kernel's official tool, bpftool, encapsulates various operations for eBPF bytecode. In this article, we use it to mount and debug eBPF.

#### Generating eBPF File Structure in the Kernel

eBPF exists in the Linux kernel as a special file form, which will automatically be destroyed if the process exits. To allow eBPF programs to persist independently of processes within the Linux kernel, the kernel provides a bpf filesystem where eBPF programs can be pinned. Ubuntu 22.04 comes with the **bpf** filesystem mounted by default, located at `/sys/fs/bpf`, and can be used directly.

The current eBPF bytecode is just a piece of pure code. To pass it into the kernel, it is necessary to specify the type of the eBPF bytecode. You can list all the eBPF types supported by the kernel through **bpftool feature**:

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

`HelloWorld.bpf.c` is a "universal" eBPF program because it only outputs `"HelloWorld"`. Therefore, it can be designated as any type of eBPF program, and here we choose raw_tracepoint.

```bash
bpftool prog load HelloWorld.o /sys/fs/bpf/HelloWorld type raw_tracepoint
```

Now, it can be seen in `/sys/fs/bpf/`:

```bash
root@vagrant:~# ls /sys/fs/bpf/HelloWorld
/sys/fs/bpf/HelloWorld
```

Or:

```bash
root@vagrant:~# bpftool prog show pinned /sys/fs/bpf/HelloWorld
353: raw_tracepoint name helloworld tag fc3c56cde923df12 gpl
 loaded_at 2023-03-11T01:59:48+0000 uid 0
 xlated 104B jited 71B memlock 4096B
 btf_id 118
```

This indicates that our eBPF program has been successfully loaded into the kernel.

#### Mounting the eBPF Program in the Kernel to Events

Normally, we would mount eBPF to specific events and then wait for the events to be asynchronously triggered before executing the eBPF program.

For convenience in this article, we choose the simplest interface used for debugging and testing: `BPF_PROG_TEST_RUN`, also called `BPF_PROG_RUN`,

They are fully equivalent. This interface can directly execute the eBPF program synchronously, without needing to mount it to an event and wait for the event to occur asynchronously.

`BPF_PROG_TEST_RUN` only supports a limited number of eBPF program types:

```text
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

Previously, we designated our eBPF bytecode as `raw_tracepoint`, which precisely meets the requirements of that interface.

By using bpftool with the `BPF_PROG_TEST_RUN` interface to run it (how to set parameters will be analyzed in a special topic later, do not modify bpftool parameters here): OK, we have now successfully executed our first, simplest BPF program.

```bash
bpftool prog run pinned /sys/fs/bpf/HelloWorld repeat 0
```

Result:

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

OK, we have now successfully executed our first, simplest BPF program.

## Part 4 BPF in MatrixOne

As our flagship database product, MatrixOne will fully utilize BPF technology in the future to enhance the performance, stability, and security of the database cluster.

### Networking

As a cloud-native database running on standard Kubernetes clusters, networking is one of its most crucial infrastructures. We will use BPF technology to reduce the overhead of the Linux kernel network protocol stack, achieving network performance optimization for MatrixOne.

### Observability

We will use BPF to collect and analyze various runtime metrics of the database in real-time within our observability component, for automated analysis and fault diagnosis. Simultaneously, we will provide a series of BPF tools for SREs to manually analyze and tune MatrixOne.

### Security

In our accompanying security component, we will provide critical operation monitoring and prohibition based on BPF, for real-time detection and defense against security threats to the database.
