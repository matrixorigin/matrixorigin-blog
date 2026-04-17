---
title: MatrixOne CDC模块介绍：原理、实现及优化
author: MatrixOrigin
mail: wudi@matrixorigin.cn
description: 本文介绍了MatrixOne CDC模块的原理、实现及优化，涵盖了CDC在MatrixOne中的位置、组件设计及性能优化措施。
tags:
  - 技术干货
keywords:
  - MySQL
  - CDC
  - MatrixOrigin
  - 矩阵起源
  - MatrixOne
publishTime: '2025-01-03 17:00:00+08:00'
image:
  '1': /content/zh/shared/tech.png
  '235': /content/zh/shared/tech.png
date: '2025-01-03 17:00:00+08:00'
lang: zh
status: published
---

**CDC(Change Data Capture)** 是一种实时捕获数据库中数据变更的技术，能够记录插入、更新和删除操作。它通过监控数据库的变更，实现数据的实时同步和增量处理，确保不同系统间数据的一致性。CDC 适用于实时数据同步、数据迁移、灾难恢复和审计跟踪等场景，通过读取事务日志等方式，减少全量数据复制的压力，并提升系统的性能和效率。

MO从2.0.0版本开始支持CDC功能，本文将简单介绍MO CDC模块的原理，实现及优化。

## 整体结构

本节将简单介绍CDC模块在MO中位置以及CDC模块的简略整体架构。

### CDC在MO中的位置

![CDC in MO](/content/zh/mo-cdc/cdc-in-mo.svg)

CDC模块在MO中的位置大致如上图所示，图中的模块有:

- mo_cdc：MO开发的小工具，方便用户操作使用CDC功能，它接受简单的命令，生成sql语句，发送至MO执行，并展示执行结果。当然你也可以不使用这个工具，通过sql语句直接操作CDC任务
- FE：MO中的前端层，在本文中CDC模块中负责维护CDC任务的增删改查
- CDC：对于running的任务，定时向存储层查询最近修改，并转成sql发送到sink端
- Disttae：MO的存储层，提供指定时间段内的数据变更（新增和删除的数据）
- Downstream：接收同步数据的下游，目前支持下游类型有Mysql和MO

典型的CDC任务控制流为：

1. 用户通过mo_cdc创建cdc任务，指定任务参数
2. MO前端收到创建命令，拉起CDC任务
3. CDC Module定期向MO存储层查询这段时间的数据变更
4. CDC Module处理变更数据并转换成sql语句
5. 将sql语句发送到下游执行，执行成功之后更新同步记录

### CDC模块框架

![Overview Simple](/content/zh/mo-cdc/overview-simple.svg)

CDC模块的大致框架如上图所示，由以下几个组件构成：

- reader负责定期从存储层读取最新的数据变化
- sinker负责把读取的信息**按序**转换为sql语句，并发送到下游
- 一个reader和一个sinker组成一条pipeline（上图中红色虚线框），一条pipeline对应一张表的同步任务，pipeline之间互相**独立**，互不影响
- 每个CDC任务有一个WatermarkUpdater，用来记录每张表的同步进度

## CDC组件介绍

本节将具体介绍CDC各个组件的工作流程

### Reader

Reader读取数据时序图
![Reader Timeline](/content/zh/mo-cdc/reader-timeline.svg)

Reader会定期（每200ms一次）从存储层读取这段时间内的数据变更，具体操作：

1. 从WatermarkUpdate获取当前水位信息(From)
2. 调用存储的CollectChanges(From, Now)接口，得到changes对象(可以认为是一个iterator)
3. 循环调用changes的Next接口获取数据
4. 得到的**新增和删除**数据分别append到两个AtomicBatch对象中
5. 获取完changes所有数据后，将数据发送到Sinker

上面第4步中提到的AtomicBatch，其定义如下：

```go
type AtomicBatch struct {
    Mp       *mpool.MPool
    From, To types.TS
    Batches  []*batch.Batch
    Rows     *btree.BTreeG[AtomicBatchRow]
}

type AtomicBatchRow struct {
    Ts     types.TS    // (Ts, Pk) is the key for compare
    Pk     []byte
    Offset int
    Batch  *batch.Batch
}
```

它主要由两部分组成：

1. Batches负责存储具体数据
2. Rows是一颗平衡二叉树（我们这里使用了B+树），将Batches中的每条记录按Ts，Pk为序排列

这边之所以需要排序，是因为存储层出于性能考虑，返回的数据不一定是有序的，为了保证正确性，我们需要现将数据按照提交事物的时间戳进行排序。
添加数据时，我们以(Ts, Pk)为key将数据插入树中，后续操作中，Sinker可以按序将batch数据取出。
![Atomic Batch Structure](/content/zh/mo-cdc/atomicbatch-structure.svg)

### Sinker

![Insert Delete Compare No Queue](/content/zh/mo-cdc/insert-delete-compare-no-queue.svg)

通过介绍我们知道，Reader会将读取到的数据变更（新增和删除）放到两个AtomicBatch中，AtomicBatch中有一棵B+树，我们可以按照(Ts, Pk)从小到大的顺序读取每条记录。

Sinker通过一种类似merge sort的流程来读取数据，比较insert/delete AtomicBatch中树顶（即最小）的元素，确定当前剩余数据中事务提交时间戳最小的那条记录，弹出该条记录生成对应的sql，然后继续比较之前比较操作，直到某个AtomicBatch为空，再将另一个AtomicBatch中的数据按序弹出即可。

### WatermarkUpdater

![Watermark Updater](/content/zh/mo-cdc/watermark-updater.svg)

WatermarkUpdater在内存有一张map记录该CDC任务中每张表的同步进度，Sinker将数据发送到下游并收到下游执行成功的回复之后，会将最新的进度更新到map中；同时MO有一张元数据表用于保存这些进度值，WatermarkUpdater有一个定时任务，会定期将map中各表的进度值持久化到元数据表中，确保CDC任务意外停止（比如MO进程崩溃，机器断电等）之后，重启时不必再同步已同步的数据。

## 性能优化

现在我们已经有了个简单的CDC模块原型，但这个原型的性能比较差，还有很多提升空间，这节简单介绍几个我们对于CDC模块做的性能优化。

### 优化一 sql合并发送

现在MO准备数据，网络传输及下游执行sql的时序大概如下所示：
![Opt0](/content/zh/mo-cdc/opt0.svg)

我们知道sql批量执行会比拆分成多条多次执行的效率会高很多，当前MO CDC是将一个batch内的数据（最多8192条）转换成一条sql，我们可以将一个（From，To）时间段内数据尽量多的拼到一条sql中，直到达到下游规定的网络通信包大小的最大值（比如Mysql中的max_allowed_packet系统变量）；同时每次与下游的通信都会有固定开销，将sql合并之后会减少与下游的通信次数，因而减少这类开销。

sql合并后的时序大概是这样：
![Opt1](/content/zh/mo-cdc/opt1.svg)

### 优化二 非阻塞式sql生成

观察优化一之后的时序图，发现每次Sinker把sql发送出去之后就原地阻塞等待下游的返回，收到下游的ack之后才开始读取下一轮的数据变更及sql转换操作，浪费了等待下游返回的时间，而且在大数据量的场景下，执行合并sql的优化之后，准备sql是比较长的一段时间，这个问题更为明显。
因此，MO在等待下游sql执行结果时，就可以开始准备下一轮的数据，等下游返回结果之后就可以立马把下一轮的sql发送出去，时序类似这样：
![Opt2](/content/zh/mo-cdc/opt2.svg)

### 优化三 定制化Mysql Driver

MO CDC下游主要支持兼容Mysql协议的数据库为主，我们使用[Mysql Driver](https://github.com/go-sql-driver/mysql)连接下游数据库，在研究Driver源码后，我们发现驱动根据协议，需要在我们传下去的sql语句前面加5个字节的标志位，实现这个操作的步骤是：先申请len(sql) + 5 的空间，把前5个字节填上相应的状态位，然后把sql复制到后面的空间中。

为了在sql前面腾出5个字节作为状态控制位，需要申请新空间加复制大量数据，操作花费昂贵，通过研究执行sql的调用传递链路，我们发现一个tricky的方式，新定义一个sql.NamedArg，把预留前5个字节的sql语句作为value，将sql传到Dirver中，Driver识别到这个特殊的NamedArg就直接在sql的前几个字节设置状态位。

```go
reuseQueryArg := sql.NamedArg{
    Name:  mysql.ReuseQueryBuf,
    // 前5个字节留空
    Value: sqlBuf,
}
```

### 优化效果

我们使用tpch 10g库中的lineitem表进行全表同步的测试，具体数据如下表，可以看到通过上述3个优化，同步时间能减少到之前的50%不到：

| 优化                     | 同步时间 |
| ------------------------ | -------- |
| 未优化                   | 37min30s |
| 优化一                   | 25min30s |
| 优化一 + 优化二          | 18min    |
| 优化一 + 优化二 + 优化三 | 17min    |

## 总结

本文简单介绍了CDC模块的功能职责，在MO中的位置及角色；CDC模块各组件的设计及实现；性能优化措施等，限于篇幅以及MO具体实现的复杂性，很多环节都以较通俗易懂的图来阐释，并不能完全展示其中的细节（当然不影响理解CDC模块的原理及运行流程）。

如果有兴趣了解更多实现细节，可以通过github获取源码来阅读，如果有CDC设计或者优化的建议，欢迎交流。
