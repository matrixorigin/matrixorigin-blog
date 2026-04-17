---
title: MatrixOne——存储对象归并的原理与实现
author: MatrixOrigin
mail: wudi@matrixorigin.cn
description: 本文详细介绍了 MatrixOne 数据库中的存储对象归并机制，包括其背景、原理和实现方法。
tags:
  - 技术干货
keywords:
  - 矩阵起源
  - 对象归并
  - 数据库
  - 超融合
  - MatrixOne
publishTime: '2024-12-27 18:00:00+08:00'
image:
  '1': /content/zh/shared/tech.png'
  '235': /content/zh/shared/tech.png
date: '2024-12-27 18:00:00+08:00'
lang: zh
status: published
---

## 对象归并的目的

MatrixOne采用列式存储机制，其最小的I/O操作单位被命名为列块（ColumnBlock）。在表中，多个列会被组合成一个Batch，且每个Batch的长度上限为8192行。进一步地，多个Batch会整合成一个存储对象（Object）。这些存储对象内部的数据已经过排序处理，并且对象本身具有不可变性，即一旦创建便无法修改。每个存储对象还会附加详细的元数据信息，涵盖对象的最小值、最大值、行数以及大小等关键属性。对于数据的删除操作，MatrixOne并不会直接修改存储对象中的数据，而是采用额外的墓碑对象（Tombstone）来记录被删除的行信息。

我们可以使用mo_ctl工具查询表中对象的元数据情况。如图表1所示，我们向test.t1表中插入生成的连续100000000行数据，使用`select mo_ctl(\'dn\', \'inspect\', \'object -t test.t1 -v\');`命令查询对象的详细信息。可以看出插入完成后，此表共有16个对象，无tombstone对象。图中zm字段表示对象的数据分布信息。其中[1,99999986]表示此对象的最小值为1，最大值为99999986。

<figure>
  <img src="/content/zh/object-merging/ob-mer1.png" alt="ob-mer1" style="width:100%;max-width:100%" />
  <figcaption style="text-align:center">图表一</figcaption>
</figure>

数据库执行查询时，首先会利用对象的最小值和最大值信息进行初步筛选，接着读取那些初步符合条件的对象中的数据，并从中进一步筛选出完全符合过滤条件的行，同时检查这些行是否已被删除。因此，有效利用元数据信息以最大化过滤对象数量，并尽量减少包含已删除行的对象，对查询性能具有重要影响。

综上所述，对象归并主要解决三个问题：

1. **小对象变成大对象，减少I/O**

> 通过将多个小对象合并为一个较大的对象，可以有效减少磁盘的I/O操作次数。因为读取或写入大对象所需的磁盘访问次数远少于读取或写入多个小对象，这不仅提升了数据的访问速度，还减少了系统的I/O开销。

2. **减少对象间的覆盖，优化基于元数据的过滤**

> 对象归并还能减少对象间的覆盖情况，从而提升基于元数据的过滤效率。当对象覆盖度较高时，检索特定数据可能需要访问多个对象，增加I/O开销。归并后，对象间重叠度减少，可以通过较少的访问次数获得所需数据，从而提升数据过滤的效率。

3. **应用tombstone，减少对象大小**

> 归并操作会将已标记的数据删除，从而减少实际存储的对象数量和整体存储空间，进一步提升存储效率。

## 对象归并的实现

MatrixOne数据库内部有一个专门处理归并操作的调度器。调度器会定期遍历每个表中对象的元数据，基于元数据扫描的结果，调度器选择出需要归并的对象集合。由于对象中的数据已经是有序的，因此我们在执行归并时可以直接使用最小堆进行多路归并。执行器通过最小堆不断选出当前最小的数据项，并将其添加到新的对象中。这一步骤确保了新对象中的数据仍然保持有序。随着归并的进行，当新对象的大小触及预设的阈值（当前设定为90MB）时，执行器会立即将其数据写入磁盘（即刷盘），并随即启动一个新对象以继续归并剩余的数据。这一机制确保了归并后的对象不会过于庞大，从而优化了数据库的整体性能和存储管理。

归并操作本身成本较高，因此，在何种情况下进行归并以及能否精准选择归并对象，对查询性能的优化至关重要。

为此，我们遵循一个既直观又高效的策略：优先选择重叠度最高的对象集合进行归并。以图表2为例，图中展示了7个对象及其对应的最小值与最大值范围（以线段表示）。其中，O5、O6和O7三个对象重叠，数量最大，因此成为我们的首选归并对象。

<figure>
  <img src="/content/zh/object-merging/ob-mer2.png" alt="ob-mer2" style="width:100%" />
  <figcaption style="text-align:center">图表二</figcaption>
</figure>

完成这三个对象的归并后，结果可能如图表3所示。虽然归并减少了对象的重叠程度，但仍有部分对象存在重叠，这些重叠将在后续的归并中逐步解决。

<figure>
  <img src="/content/zh/object-merging/ob-mer3.png" alt="ob-mer3" style="width:100%" />
  <figcaption style="text-align:center">图表三</figcaption>
</figure>

然而，仅凭重叠度来选择归并对象是不够的。一方面，当对象上存在大量删除操作或表中存在大量互不重叠的小对象时，我们需要权衡是否进行额外的归并。另一方面，过度追求完全重叠可能会带来过大的开销。**这里有几种情况要尽可能避免** ：

1.  两个对象的重叠很小。如下图所示，O1和O2间重叠范围很小，若O1或O2较大时，这样的归并得到的收益很小。

![ob-mer4](/content/zh/object-merging/ob-mer4.png)

2.  两个对象的大小差距较大。当O1和O2的大小差距较大时，对这两个对象进行归并得到的收益很小。尤其是当出现大量insert、load或update操作时，会不可避免出现大量小的对象可能与大的对象重叠，此时优先归并小的对象效果会更好。

此外，在处理大量数据时，我们还需要综合考虑节点的内存状况和当前集群的负载等因素，以全面评估是否执行归并操作。在MatrixOne中，我们原则上会基于对象的重叠，并综合考虑其他各种因素，尽可能得出较优解。

## 归并的相关配置

MatrixOne中的mo_ctl工具提供了与归并相关的功能。

### 1. 自动归并的开启与关闭

使用`select mo_ctl(\'dn\', \'inspect\', \'policy -r 0 -m 0\');`语句关闭自动归并。
<img src="/content/zh/object-merging/ob-mer5.png" alt="ob-mer1" style="width:100%;max-width:100%" />

使用`select mo_ctl(\'dn\', \'inspect\', \'policy\');` 重新开启自动归并
<img src="/content/zh/object-merging/ob-mer6.png" alt="ob-mer1" style="width:100%;max-width:100%" />

开启自动归并前表共有16个对象，相互之间有大量重叠。
<img src="/content/zh/object-merging/ob-mer7.png" alt="ob-mer1" style="width:100%;max-width:100%" />

开启自动归并后，稍等一段时间，可以看到16个对象被合并为6个对象，且他们全局有序。
<img src="/content/zh/object-merging/ob-mer8.png" alt="ob-mer1" style="width:100%;max-width:100%" />

### 2. 手动归并

除了由调度器决定的自动归并，我们可以通过mo_ctl手动开启调度。在手动调度时，我们既可以指定对象，也可以指定表进行调度。

a) 指定对象的调度
我们可以使用`select mo_ctl(\'cn\', \'mergeobjects\', \'o:tableID:objectID1, objectID2, ...\');` 语句来归并指定的对象。
<img src="/content/zh/object-merging/ob-mer9.png" alt="ob-mer1" style="width:100%;max-width:100%" />

b) 指定表的调度
我们可以使用`select mo_ctl(\'cn\', \'mergeobjects\', \'t:datable.table\');`语句对整个表中的object进行归并。这条语句会对表中所有对象进行归并，并在归并结束后返回。
<img src="/content/zh/object-merging/ob-mer10.png" alt="ob-mer1" style="width:100%;max-width:100%" />

## 总结

本文详细介绍了 MatrixOne 数据库中的存储对象归并机制，包括其背景、原理和实现方法。文章讨论了归并操作的目的和具体实现过程，包括使用最小堆进行多路归并、调度器的作用以及归并对象的选择策略。此外还展示了自动和手动归并的配置方法，包括如何通过 mo_ctl 工具进行配置和操作。通过这些内容，读者可以全面了解MatrixOne 数据库的对象归并机制在提升查询性能、优化存储管理和减少 I/O 开销方面的重要作用。
