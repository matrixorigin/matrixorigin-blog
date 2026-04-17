---
title: MatrixOne存储优化：HTAP场景下的智能存储优化策略
author: MatrixOrigin
description: 本文深度解析MatrixOne在HTAP场景下的存储优化方案，包括改进的Merge策略、事件驱动调度器、多项式拟合数据表征及Merge模拟器四大核心技术
tags:
  - 技术干货
keywords:
  - MatrixOne
  - HTAP
  - LSM优化
  - 写放大控制
  - Merge策略
  - 存储空洞分析
  - 数据库性能优化
publishTime: '2025-08-07 17:30:00+08:00'
image:
  '1': /content/zh/shared/tech.png
  '235': /content/zh/shared/tech.png
date: '2025-08-07 17:30:00+08:00'
lang: zh
status: published
---

类 LSM（Log-Structured Merge Trees）数据库通常依赖数据合并清理存储空洞、降低文件重叠度以维持数据有序性，提升查询效率。现有的合并调度技术普遍采用固定阈值触发策略或人工干预机制，通过直方图统计文件重叠情况（如点深度pd的离散区间分布）。

然而，这些方案在面向 HTAP（混合事务/分析处理）场景时面临显著缺陷：

1. 对非 KV 场景维护自动化不足：传统方法过多依赖数据库管理员手动识别合并时机并触发任务，尤其非 KV 场景下，落盘文件大小不可控时，运维负担剧增；
2. HTAP 场景适配薄弱：TP 数据的频繁随机更新导致数据分布快速劣化（空洞率与重叠度激增），同时低密度数据流入下层引发连锁合并，造成过量写放大；
3. 数据分布表征低效：常用直方图需至少16个参数描述文件重叠状态，参数冗余且无法还原分布形态特征（如峰值位置、波动趋势），导致运维决策缺乏精准依据。

因此，上述缺陷严重制约了数据库在HTAP场景下的自动化运维能力与资源利用效率。Matrixone 通过以下四个方面，对存储优化做出改进：

1. 改进的 merge 策略，通过引入独立 0 层、跨距、空洞分析等概念，控制 HTAP 场景下的写放大，同时保证数据的健康程度
2. 基于事件驱动的 merge 调度，一方面避免轮询开销，对活跃的表更加聚焦，另一方面对运维交互支持更加灵活
3. 基于多项式拟合的数据表征。通过线性拟合代替直方图，在参数更少的情况下，可以更直观地展示数据重叠的分布形态，峰值位置，波动趋势等信息
4. Merge 模拟器，通过采集和模拟两个步骤，可以根据实际数据进行实验，持续改进 merge 策略。

### 优化策略

在介绍 Matrixone 当前优化策略之前，需要澄清一些概念。首先是业界中已有的概念：

- 数据文件：储存写入数据的文件。每个文件的元信息存有该表排序键的最大值和最小值。元信息一般常驻内存。
- Merge 文件层级：数据文件按层组织。随着层级上升，预期单个文件的最大值和最小值的差距会更小，变得更加紧密。
- 文件重叠：两个文件的最大最小值的区间存在交集。
- 点深度(point depth，简称 pd )：对于含有多个文件的表，某个点值的深度，定义为该值贯穿文件的数量。对于单个文件，pd 定义为考虑它包含的全部值的深度，取最大值。与其它文件无重叠的单个文件，pd 为 1。
- 重叠度(overlap count，简称 oc)：和文件有重叠关系的文件数量。与其他文件无重叠的单个文件，oc 为 0。
- 常量文件：文件的最大值和最小值相同，这样的通常不再参与数据合并，这已经是最紧密的状态。

![1.png](/content/zh/storage-optimization/1.png)

其次是在 Matrixone 的针对 HTAP 场景改进后新增的概念：

- 0 层：在 Matrixone 中，会把表数据尽可能组织成 128 MB 的文件，更小的文件会放在 0 层，0 层采用独立的 merge 策略。
- 聚簇(cluster)：在同一个层级中，一组文件和另一组文件完全没有重叠，它们各自是一个 cluster。
- 跨距(span)：$span = \frac{oc}{pd}$，并且根据 span 值将文件分为宽(10 < span)、中(2 < span < 10)、窄(span < 2)三个等级。
- 墓碑文件空洞率：墓碑文件(tombstone) 记录了数据文件中哪些行被删除。如果行对应的数据文件本身已经被删除，称为未命中。未命中行会形成墓碑文件的空洞。所以
  $$
  vacuumPercent = \frac{missedRowCount}{totalRowCount}
  $$
- 数据文件空洞分数：数据文件的行被删除，也会形成空洞。在计算数据文件空洞率时，需要考虑到 merge 的可能性。如果这个文件很容易触发正常 merge，则没有必要专门处理它。所以考虑两个因素，大小和层级。大小越小，层级越低，都越容易 merge。所以将这两个因素权重设置为 50%，按如下公式计算数据文件分数，其中默认 MaxSize = 128 MB，MaxLevel = 8
  $$
  vacuumScore = \frac{DelRowCount}{RowCount}\left( 0.5\frac{Size}{MaxSize} + 0.5\frac{Level+1}{MaxLevel}\right)
  $$

#### 0 层：平衡写放大和小文件数量

因为 Matrixone 按照表级别组织数据，目前无法像 KV 存储一样固定内存中 memtable 的数量，受限于此，也就无法保证从内存中刷盘的文件大小。为了避免出现的小文件和大文件进行合并，增加写放大，于是设置 0 层专门处理小于 128 MB 的文件。另外，也需要保证及时合并，避免小文件过多，导致元数据处理时间增加以及 IO 碎片化，影响查询效率。

0 层合并的策略如下：
1. 该层的所有文件的内存大小超过 128 mb，立即执行 merge，确保及时性。
2. 0 层中允许的最大文件数量，随着距离上次 merge 的时间衰减，从而避免过于频繁的 merge，并且确保在有负载的情况下，尽可能累积更多小文件，减小写放大。衰减过程如下：- 初始值 32，终点值 1，衰减全程为 1 小时 - 衰减过程由 (0,0),(0.70, 0.0), (0.0, 1.0), (1,1) 控制点表示的贝塞尔曲线控制

![2.png](/content/zh/storage-optimization/2.png)

通过动态衰减机制平衡双重目标：前期允许累积小文件减少合并频率（降低写放大），后期强制收紧阈值避免元数据膨胀影响查询效率。

#### 跨距决定组件传递：避免数据分布扰动

0 层以外，merge 的默认策略为：
1. 每层遍历数据文件，识别出全部最大 pd 大于等于 3 的 cluster。
2. 对于每一个 cluster，将其中数据文件分为宽距、中距、窄距三组，每组中的数据文件个数大于等于 3，则收集为一个任务。并且只有窄距组 merge 任务产生的数据文件放置到下一层级，宽距和中距的 merge 产物继续留在当前层 3. 一次 merge 分析产生的多个任务均可以支持并发执行。

由于 Matrixone 中大部分数据文件为 128 MB，span 值和文件数据紧密程度成反比。只有当窄距组 merge 产生的数据文件，符合密度更高的预期，可以放入下一层。反之，当密度更低的数据进入下一层，会引发下一层大量文件的 pd 大于阈值，触发任务，这样的触发会继续传导，直到在最后一层内反复执行，产生无意义的 merge 消耗，导致非常严重的写放大。通过分组，避免数据文件的密度下降规避连锁反应，大量减少写放大。

如下图中，a组表示宽距和窄距混合 merge，并没有产生密度更大的数据文件，反而将本来紧密的数据分散到新数据文件中，稀释了密度。b组中宽距和宽距 merge，高密度的数据文件从两端挤出，留在当前层等待下次 merge。c组中窄距与窄距 merge，形成了更高密度的文件，可以推往下一层级别

![3.png](/content/zh/storage-optimization/3.png)

#### 空洞分析：更主动的冗余清理

相比数据文件，tombstone 的 merge 策略相对简单：

1. 小于 8 MB 的文件每 4 个合并一次
2. 大于 8 MB 的文件每 2 个合并一次
3. 大于 128 MB 的文件等待空洞分析处理

空洞分析涉及 IO，需要读取完成的 tombstone 内容，因此需要避免频繁调用。目前的触发策略是：

1. 当一个表每累积 4 次超过 120 MB 的 merge 任务时，触发一次空洞分析。这里的考量是，空洞分析主要应对大 tombstone，只有数据文件被删除时，才有比较大的概率快速提升这些 tombstone 的空洞率。所以通常把注意力放在 0 层以外发生的 merge 上，不过存在一种特殊情况，如果写入的数据完全有序，比如排序键是自增列，这种情况下，0 层以外不会产生 merge，但依然要求对数据空洞做出分析，否则更新累积出的大 tombstone 得不到处理。
2. 全局每隔 1 小时对全部表做一次空洞分析，这作为一个兜底策略存在。

空洞分析计算该表的两项数据，墓碑文件空洞率以及全部数据文件的空洞分数。

1. 如果墓碑文件空洞率超过 50%，触发合并全部墓碑文件，清除空洞。
2. 选择数据文件空洞分数大于阈值的单个文件进行独立 merge，清除空洞，该操作称为 compact。阈值随着 tombstone 最长存活时间线性衰减，因为一个 tombstone 存在的时间越长，越有清除的动机，方式就是通过更多的 compact 提升 tombstone 的空洞率。线性衰减的初值 60，终值 10，时长 40 分钟。触发 compact 后，因为删除一部分数据文件，tombstone 的空洞上升，超过 50 % 后会触发条件 1，最终达成整体的空洞率变低。

### Merge Scheduler

Merge Scheduler 由事件驱动，调度器主体是两个处理 goroutine，一个用于处理事件循环，一个用作 IO 处理。

其中 IO 循环，用于处理空洞检查，避免阻塞事件循环。

事件目前有三个消息来源：
1. 包含待执行表的优先队列，排序键为到期时间。当优先队列中的表到期，做 merge 分析，创建任务，如果一次分析后，没有任务产生，将该表的下一轮到期时间加倍，否则保持默认 5 s 后。
2. 消息管道收到的消息。这些消息将调整表在优先队列中的位置，或者执行一些辅助状态的读取和更新。- 比如一个表新建了 5 个 object，应该将该表向队列头部移动，及时分析是否需要 merge。- 手动触发任务，把表提到队列头部，并更新分析需要的辅助参数。常用于内部空洞率相关任务触发。
3. 固定心跳。10 s 一次，强制查看优先队列中是否有表可以处理，避免异常逻辑导致分析遗漏。同时也会刷新内存、cpu 等资源信息，作为任务生成的限制。例如，当任务预估内存使用超过限制，主动将参与文件减半，直到满足内存限制，或者文件清空，任务取消。

| **消息类型**            | **功能**       | **描述**                                   |
| ----------------------- | -------------- | ------------------------------------------ |
| MMsgKindSwitch          | 控制启停开关   | 全局或者单个表的自动 merge 启停            |
| MMsgKindQuery           | 查询状态       | 查询单个表的状态                           |
| MMsgKindTableChange     | 通知表变更     | 新建表、表新增数据文件、表 merge 任务结束  |
| MMsgKindTrigger         | 触发任务       | 触发分层数据文件、墓碑文件、空洞分析等任务 |
| MMsgKindConfig          | 配置表策略参数 | 临时更改单个表的 merge 行为                |
| MMsgKindConfigBootstrap | 读取启动配置   | 调度器启动时 IO 读取持久化的表配置         |

![4.png](/content/zh/storage-optimization/4.png)

### 基于多项式拟合的可视化

现有数据库，如 Snowflake，在表征文件重叠情况时，多采用直方图的形式，记录 pd 在 (0, 1, 2,..., 15, 16, 32, 64, ... 2^n) 区间内的文件个数。这样的表征方式输出参数多，至少 16 个参数，并且失去了重叠的形态信息。

Matrixone 使用多项式拟合的形式展现重叠情况。默认配置下，通过 4 次多项式 $pd(x)=a_{0} +a_{1}x+a_{2}x^2 +a_{3}x^3+a_{4}x^4$ 函数拟合文件的 pd 序列 (按照文件排序键最大值排序)，输出的参数只有 5 个浮点数，显著少于直方图的 16 个，并且通过绘图代码，可以复原出拟合图形，更直观地看到数据分布状态。如下图，通过函数拟合替换传统直方图，将 2800 个文件的“位置-pd”序列转化为连续曲线，仅用 5 个参数，直观展示了数据重叠的分布形态，峰值位置，波动趋势等信息，例如曲线两端的峰值表示重叠集中在排序键取值区间的两侧，可以大约这部分是是数据密集写入的区域。

![5.png](/content/zh/storage-optimization/5.png)

### Merge Simulator

在 Matrixone 中，为持续迭代 Merge 策略，内置了一个模拟器，方便对策略在实际数据上的表现做初步的评估。

该项功能主要分为数据采集和模拟两个部分。

#### 日志采集

在日常运行中，可以利用内置的运维命令，打开对特定表的 trace 功能。该功能通过日志记录两种事件，第一，生成新 0 层数据文件(TN 刷盘或者 CN 直接提交)。第二，生成新 tombstone 文件(TN 刷盘或者 CN 直接提交)。在记录 tombstone 时，还会分层统计以下信息：

1. 命中 object 的数据
2. 命中 object 数量占当前层的比例
3. 命中行数在 object 中的平均数
4. 命中行数在 object 中的方差

#### 模拟

模拟的主要通过替换底层的时钟实现，加速 merge scheduler 能感知的时间流速。下面的例子中，利用单测对 TPCC 100 仓中的 stock 表进行了模拟，实际测试时间 30 分钟。代码中 `player.ResetPace(10*time.Millisecond, 3*time.Second)` 设置了现实时间和模拟器时间 `1:300` 的比例。`ExtractFromLokiExport` 将从日志采集的结果中分析出 object 和 tombstone 两类事件，作为模拟器的驱动源。

```go
func TestSimulatorOnTPCC100Stock(t *testing.T) {
	player := NewSimPlayer()
	player.ResetPace(10*time.Millisecond, 3*time.Second)
	sdata, stombdesc, _ := ExtractFromLokiExport("tpcc100-stock.json", player.sclock.Now())
	player.SetEventSource(sdata, stombdesc)
	player.Start()
	defer player.Stop()
	player.WaitEventSourceExhaustedAndHoldFor(3 * time.Minute)
	t.Logf("report: %v", player.ReportString())
}
```

最终的模拟结果通过一下输出展示，主要分为两个部分，第一个部分是总体统计数据，比如可以重点关注到，data 生成事件总共 233 个，merge 次数 47，写放大为 1.3，tombstone 生成事件总计 189 个，merge 次数 76，写放大为 6.2。第二部分是每一层的重叠统计，以及空洞情况的展示。

```sh
report: {
      "next_sched_check": "1m20s",
      "last_merge": "2m48s",
      "last_vacuum_check": "6m21s",
      "vacuum_check_count": 9,
      "input_data_size": "9.226GiB",
      "input_tombstone_size": "456.6MiB",
      "data_merged_size": "12.03GiB",
      "tombstone_merged_size": "2.778GiB",
      "data_wa": 1.3035256492867446,
      "tombstone_wa": 6.230343106859288,
      "data_merge_count": 47,
      "tombstone_merge_count": 76,
      "data_source_progress": "233/233",
      "tombstone_source_progress": "189/189"
}
level 0 basic stats  : Count: 6, AvgSize: 20.84MiB, AvgRows: 36911, OSizeDist: [0 0 0 0 0 6 0 0], Tolerance: 32
level 1 overlap stats : AvgPointDepth: 2.29, AvgOverlapCnt: 2.24, Obj(s,c,u): 42-0-0, EventsCnt: 84, Clusters: [{2 3}]
level 2 overlap stats : AvgPointDepth: 2.00, AvgOverlapCnt: 1.20, Obj(s,c,u): 5-0-0, EventsCnt: 8, Clusters: []
level 3 overlap stats : AvgPointDepth: 1.00, AvgOverlapCnt: 0.00, Obj(s,c,u): 2-0-0, EventsCnt: 4, Clusters: []
level 4 overlap stats : AvgPointDepth: 1.69, AvgOverlapCnt: 0.92, Obj(s,c,u): 13-0-0, EventsCnt: 18, Clusters: []
level 5 overlap stats : AvgPointDepth: 1.00, AvgOverlapCnt: 0.00, Obj(s,c,u): 2-0-0, EventsCnt: 3, Clusters: []
level 6 no data
level 7 no data
vacuum stats : TotalSize: 341.8MiB, TotalRows: 5600250, HistoSize: [0 0 0 0 0 0 0 3], HistoCreateAt: [0 1 2 0]
     HistoVacuumScore: [25 42 0 0 0],
     DataVacuumPercent: 35.40%,
     DelVacuumPercent: 6.40%,
     DataVacuumScoreToCompact: 25
     TopHollow[0]: 201056fdc75d_0, 127.9MiB, lv1, 35
     TopHollow[1]: 552524a808ed_0, 127.9MiB, lv1, 35
     TopHollow[2]: 9ed39b7850c6_0, 129.5MiB, lv1, 35
     TopHollow[3]: 24f1015143e9_0, 129.5MiB, lv1, 35
     TopHollow[4]: 82b2c3de1e65_0, 127MiB, lv1, 35
     TopHollow[5]: 51a08df26c0c_0, 127MiB, lv1, 35
     TopHollow[6]: 92e6055e0cfc_0, 129.5MiB, lv1, 37
     TopHollow[7]: 15f2772060a0_0, 129.5MiB, lv1, 37
     TopHollow[8]: ee51be10380f_0, 127.1MiB, lv1, 37
     TopHollow[9]: 092d66e5b599_0, 129.5MiB, lv1, 38
```

通过模拟，一方面是对调度功能的测试，另一方面，也能初步看到策略在现实数据上的表现。但必须承认的是，目前的 merge simulator 还处于一个基础的阶段，对现实的反应并不准确。比如对 tombstone 而言，现在的采集和模拟没有准确刻画 tombstone 的数据分布。目前只是简单地用正态分布进行表征，删除命中的 object 也是随机选择；模拟数据合并时，也是将数据进行平均分布，并没能反应数据密集和稀疏的倾向。这些都是后续改进的方向。
