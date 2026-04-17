---
title: MatrixOne 如何高效 Debug 事务正确性 Bug
author: 张旭
mail: zhangxu@matrixorigin.cn
description: >-
  矩阵起源 MatrixOne 在其研发过程中，通过多种高效的调试方法来处理事务正确性问题，确保系统的可靠性和稳定性。本文详细探讨 MatrixOne
  如何高效 debug 这些 bug，介绍其在研发中解决分布式事务正确性问题的策略和实践经验。
tags:
  - 技术干货
keywords:
  - 矩阵起源
  - 分布式
  - 数据库
  - 云原生
  - MatrixOne
publishTime: '2024-06-21 17:00:00+08:00'
image:
  '1': /content/zh/shared/tech.png
  '235': /content/zh/shared/tech.png
date: '2024-06-21 17:00:00+08:00'
lang: zh
status: published
---

熟悉数据库分布式事务的读者，应该能够理解 debug 分布式事务正确性问题的 bug 是一件非常有挑战的事情。本文主要是给大家介绍一下，MatrixOne 在研发过程中，是如何 debug 事务正确性问题的。

## 1. 事务回顾

我们首先来回顾一下，在 MatrixOne 中，事务是如何实现的。

### 1.1 数据存在哪儿

MatrixOne 是一个云原生的数据库，数据库中大部分的数据都存储在`对象存储`（可以是任何 `S3` 兼容的对象存储）中，这部分数据是不变的。数据不可变带来了非常多的好处，比如不需要考虑这些数据的一致性问题。

除了存储在`对象存储`中的数据外，还有非常少的数据存储在 `LogService` 中，`LogService` 是一个使用 Raft 实现的高性能的 `WAL` 服务。这部分数据在 MatrixOne 中被称为 `LogTail`。这部分数据是变化的，可以认为是 MatrixOne 集群最新的 Commit 数据。

`对象存储` + `LogTail` 组成了 MatrixOne 的全量数据。

### 1.2 事务隔离级别

MatrixOne 的事务支持 `RC` 和 `SI` 的隔离级别，默认是 `RC`。

### 1.2 事务模式

MatrixOne 的事务支持`悲观`和`乐观`的模式，默认是`悲观`。

### 1.3 事务并发控制

MatrixOne 使用 MVCC 来实现事务并发控制。并且使用 `HLC` 来实现事务时钟。

### 1.4 事务读操作

对于事务的读操作而言，首先需要确定的就是哪些数据对于事务是可见的。在任何一个时刻，对于事务可见的数据包括:

1. 对象存储中所有 `CommitTimestamp < txn.SnapshotTimestamp` 的数据
2. LogTail 中所有 `CommitTimestamp < txn.SnapshotTimestamp` 的数据
3. 事务的 `Workspace` 中所有的 `Uncommitted` 的数据

在我们明确哪些数据对于事务是可见的时候，就需要确定满足条件的数据在读发生的时候，是否完整。

`Workspace` 中的数据，任何时刻对于事务都是完整的。需要保证的就是 `对象存储` 和 `LogTail` 的数据了。由于 `LogTail` 是整个 MatrixOne 集群最新的数据写入，所以只要保证 LogTail 的数据完整了，那么`对象存储`对应的数据对于事务也就完整了。

现在的问题就是如何保证 `LogTail` 的数据对于事务是完整的。

MatrixOne 的事务在 CN 节点创建，事务创建后，就会明确一个事务的 `SnapshotTimestamp` (这个时间戳对于 `SI` 是整个事务生命周期不变的，对于 `RC` 是每个 `Statement` 的生命周期内是不变的)。

`LogTail` 的数据在 `TN` 节点产生，并且写入 `LogService`。CN 使用订阅的方式来获得最新的 `LogTail` 数据，并且把这些 `LogTail` 中的数据 `Apply` 到 CN 的内存中。

CN 在内存中维护了一个最大的 `Apply` 的 `CommitTimestamp`，可以根据这个时间戳的水位和事务的 `SnapshotTimestamp` 来确保，LogTail 的数据对于事务是完整的。

### 1.5 事务的写操作

MatrixOne 事务的 `Uncommitted` 的数据，都是写入 `Workspace`，这个 `Workspace` 在 CN 的内存中。

一个事务写入的数据越多，这个 `Workspace` 占用的内存越大，知道 OOM 发生。MatrixOne 为了解决这个问题，对于 `Workspace` 的内存大小有一个阈值 (默认是 1MB)，当发现 `Workspace` 的内存超过这个阈值，就会把 `Workspace` 中的数据写入到 `对象存储`，在 `Workspace` 的数据会被替换成 `对象存储上临时文件名`。

事务在没有 Commit 之前，不会和 `TN` 交互，在 `Commit` 的时候，会把 `Workspace` 的数据发送给 `TN` 节点做 `Commit` 处理。

## 2. 事务的正确性问题

### 2.1 什么是正确性问题

上面的章节我们回顾了事务，现在需要说明一下，什么事事务正确性的问题。在 MatrixOne 的研发过程中遇到事务正确性的 bug 主要有以下几种：

- `RC` 模式下的 `Lost Update`
- `悲观事务` 锁服务失效
- `Workspace` 数据问题

这几个问题都会产生事务正确性问题。这些问题，都会产生事务读了错误的数据，或者提交了错误的数据。

### 2.2 如何测试

MatrixOne 有很多的测试，来帮助我们发现这些事务正确问题，这些测试包括：

- 单元测试
- 集成测试
- PR Merge 之前的 CI 测试
- PR Merge 之后的性能基准测试
- 7\*24 小时执行的稳定性测试
- daily 的各种测试
- chaos 测试

这些测试都会帮助我们发现事务正确性问题。

### 2.3 常规分析问题的手段

对于研发来说，我们常规的分析问题的手段一半是这几种：

- 断点 Debug
- 分析日志
- Metrics
- Tracing

对于分析分布式集群的事务问题，其中最有用的就是日志，其余手段几乎没有用。断点 debug 只能分析必现的问题，Metrics 只能观测到系统的一个大概情况，不能定位数据问题。Tracing 一般是指调用链监控，可以用来分析性能问题，但是对于数据错误的问题，无法提供帮助。

总结来看，分析正确性问题几乎只有日志可用。

### 2.3.1 需要哪些日志

事务正确性问题，归根结底是对于一行记录，读到了错误的数据或者写入错误的数据。这个问题的本身，是数据的内容错了。数据的内容错了，问题可能出现在这行数据所有发生读写的地方。

如果我们需要分析事务正确性问题，那么就需要分析问题出在哪一个事务发生读写的地方。并且还有一个条件，就是能够根据出问题的事务，出问题的行，把这些地方的日志信息全部串联起来，就可以找到问题所在。

但是问题是复杂的，由于悲观事务的模式，多个并发事务会相互影响，所以还需要串联起来有冲突的事务的所有相关信息一起分析。

### 2.3.2 日志的问题

我们分析问题需要那些信息，上文我们分析了，这些信息需要都记录到日志中。这些日志不可能运行在 `Info` 的日志级别，只能在 `DEBUG` 级别。这样就带来了一些问题：

- 在一些测试中无法打开 `DEBUG` 级别的日志

  在性能测试中，是无法打开 `DEBUG` 日志的。如果错误出现在性能测试中出现，几乎无法分析。

- `DEBUG` 日志难以重现问题

  事务正确性问题，有时候非常难以重现，可能需要满足特定的并发时序。如果是在不能打开 debug 的测试中出现，需要打开 `DEBUG` 日志级别，跑一样的负载，`DEBUG` 日志过多，改变了系统运行的时序，问题会更加难以复现。

- 日志难以分析

  当具备完备的 `DEBUG` 的日志的时候，这个日志的规模可能非常非常大，并且是一个在分布式环境中，产生的各自节点和进程的日志，分析的难度也是异常艰难的。

## 3. 如何高效 Debug

在 MatrixOne 的研发过程中，Fix 事务正确性的 bug，一直是痛苦的经历。MatrixOne 还处于快速发展阶段，系统中有非常多的优化还没有去处理，这些修改，都有可能带来新的事务正确性的 bug。所以我们需要一个高效 debug 事务正确性 bug 的工具和方法。

### 3.1 设计目标

使用日志去分析的问题弊端，我们已经有扩深刻的经历。现在需要达成的设计目标有 3 点：

- 在任何测试场景中，只要出现 bug，不需要重新复现，就有足够的信息分析问题
- 不能对于性能测试有太大的影响，10% 以内的性能影响是可以接受的
- 要提供非常丰富的分析信息的方式和手段

### 3.2 设计挑战

在测试中会产生非常巨大的需要分析的数据。这些数据如何存储，如何提供丰富的分析查询能力。因为分析问题的时候，需要根据各种各样的条件去分析查询信息。

#### 3.2.1 如何提供分析查询能力

首先我们不考虑数据如何存储，先来看如何提供数据查询分析能力，解决了这个问题，可能数据如何存储的问题就解决了。

目前为止，没有比以 SQL 的方式来提供这些数据的查询更方便的，语意更丰富能力的分析查询方式了。如果我们可以提供一 SQL 的方式来提供 debug 数据的分析查询能力，这个好处是显而易见的，并且 debug 的效率也是提升巨大的。

所以我们决定以 SQL 的方式提供 debug 数据的查询分析。

#### 3.2.2 数据如何存储

存储方式就显而易见了，因为提供 SQL 的方式来提供查询能力，那么数据就需要存储的数据库中。所以我们需要一个能够提供强大 AP 能力的数据库来存储这些 debug 数据。

结论显而易见了，MatrixOne 自己就是一个支持高性能 AP 查询的数据库。

#### 3.2.3 数据如何写入

我们有一个设计目标是，开启收集 debug 信息的时候，对于性能不能有超过 10% 的性能影响。我们需要对数据写入到数据库有一些特殊的设计：

- 异步以 `Load` 的方式写入数据到数据库
- Debug 数据的写入可以 skip 掉事务中一些耗时的操作 (去重，冲突检测)
- 尽可能的减少不必要的信息

### 3.3 Trace 框架设计

从 MatrixOne 1.2 版本开始，MatrixOne 提供一个 `mo_debug` 的内置数据库，并且根据之前分析日志的经验，对分析事务问题需要的数据进行了抽象，提供了一些表来存储数据。

并且提供了一些专门的语句来动态的打开和关闭 Trace 的功能。

由于篇幅问题，本文不会描述这些表的具体设计含义，只会简单介绍一下，主要目的还是给分享一下思路。

#### 3.3.1 数据表

```sql
create table trace_event_txn (
    ts 			      bigint       not null,
    txn_id            varchar(50)  not null,
    cn                varchar(100) not null,
    event_type        varchar(50)  not null,
    txn_status	      varchar(10),
    snapshot_ts       varchar(50),
    commit_ts         varchar(50),
    info              varchar(1000)
)

create table trace_event_data (
    ts 			      bigint          not null,
    cn                varchar(100)    not null,
    event_type        varchar(50)     not null,
    entry_type		  varchar(50)     not null,
    table_id 	      bigint UNSIGNED not null,
    txn_id            varchar(50),
    row_data          varchar(500)    not null,
    committed_ts      varchar(50),
    snapshot_ts       varchar(50)
)

create table trace_event_txn_action (
    ts 			      bigint          not null,
    txn_id            varchar(50)     not null,
    cn                varchar(50)     not null,
    table_id          bigint UNSIGNED,
    action            varchar(100)    not null,
    action_sequence   bigint UNSIGNED not null,
    value             bigint,
    unit              varchar(10),
    err               varchar(100)
)

create table trace_event_error (
    ts 			      bigint          not null,
    txn_id            varchar(50)     not null,
    error_info        varchar(1000)   not null
)

create table trace_statement (
    ts 		   bigint          not null,
    txn_id     varchar(50)     not null,
    sql        varchar(1000)   not null,
    cost_us    bigint          not null
)
```

这些数据表主要记录了，在执行过程中所有数据发生的写入，读取，以及事务的元数据变更，执行的 SQL，并发冲突等等关键信息。

#### 3.3.2 Filter 表

```sql
create table trace_table_filters (
    id              bigint UNSIGNED primary key auto_increment,
    table_id	    bigint UNSIGNED not null,
    table_name      varchar(50)     not null,
    columns         varchar(200)
);

create table trace_txn_filters (
    id             bigint UNSIGNED primary key auto_increment,
    method         varchar(50)     not null,
    value          varchar(500)    not null
);

create table trace_statement_filters (
    id             bigint UNSIGNED primary key auto_increment,
    method         varchar(50)     not null,
    value          varchar(500)    not null
);
```

这些 Filter 表，用来做过滤，尽可能的减少需要记录的数据量。

### 3.4 效果

打开 Trace 后，对于性能的影响在 5% 左右。依靠 MatrixOne 提供能的高性能的 AP 查询服务能力，研发人员可以根据 SQL 来查询 debug 问题，查询执行期间所有需要的数据变更，事务元数据变更等等所有的对于 debug 问题有帮助的信息。

这样极大的提高了效率，提升了 fix 事务正确性的 bug 的速度。
