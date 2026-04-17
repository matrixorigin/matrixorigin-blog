---
title: 感谢 @Cyberleu 为 MatrixOne 聚合函数功能做出的贡献
author: MatrixOrigin
mail: lichuanzi@matrixorigin.cn
description: 社区贡献者为 MatrixOne 贡献了高级 SQL 聚合函数，提升了数据汇总与分组操作。
tags:
  - 新闻
keywords:
  - MySQL
  - GitHub
  - 矩阵起源
  - MatrixOne
publishTime: '2024-09-27 17:00:00+08:00'
image:
  '1': /content/zh/thx-Cyberleu-contribution/gx2.png
  '235': /content/zh/thx-Cyberleu-contribution/gx2.png
date: '2024-09-27 17:00:00+08:00'
lang: zh
status: published
---

近日，社区贡献者 **@Cyberleu** 为 MatrixOne 贡献了 group by with rollup、group by with cube、group by with sets、grouping 等聚合函数的需求，补足了 SQL 中高级数据汇总与分组操作的相关需要，具体如下。

### 1. GROUP BY WITH ROLLUP

- 解决的问题

对数据进行分层次汇总，并在同一查询中计算出各层级的汇总值以及总体汇总值。

- 用途

适用于需要逐层汇总数据的场景，如每年、每季度的销售额汇总，最终给出总销售额。

- 示例

年度、季度、月度销售汇总，并且在最后一行显示总销售额。

### 2. GROUP BY WITH CUBE

- 解决的问题

提供全面的所有维度组合的汇总数据，可以产生数据集的所有可能分组的汇总。

- 用途

适用于需要对多个维度进行组合汇总的情况，例如同时对年份、公司、产品的销售额进行不同组合的汇总分析。

- 示例

每年、每个公司、每个产品的销售汇总，同时显示每个可能的组合及总汇总。

### 3. GROUP BY WITH SETS

- 解决的问题

允许指定多个分组集，以便在同一查询中对不同分组组合进行汇总，灵活性更高。

- 用途

适用于需要对特定的分组组合进行汇总的情况，而不需要像 CUBE 那样生成所有可能的组合。

- 示例

只对年份和公司的组合、公司和产品的组合进行汇总，而忽略其他可能组合。

### 4. GROUPING (GROUPING SETS)

- 解决的问题

配合 ROLLUP 或 CUBE 使用，帮助标识汇总结果的层次或维度，便于在查询结果中区分各层级的汇总行。

- 用途

适用于需要在结果中区分不同层级汇总值（如年、季度、月）以及总体汇总的场景。

- 示例

通过 GROUPING 函数标记哪些行是年汇总、哪些是季度汇总、哪些是总汇总。

![15861](/content/zh/thx-Cyberleu-contribution/gx1.png?width=800)

### FeatureRequest

AES_ENCRYPT（） 和 AES_DECRYPT（） 函数#15911：

- https://github.com/matrixorigin/matrixone/issues/15911

Support alter database #6601：

- https://github.com/matrixorigin/matrixone/issues/6601

DMLreturning #7501:

- https://github.com/matrixorigin/matrixone/issues/7501

Support reference aliases in where clause #16244:

- https://github.com/matrixorigin/matrixone/issues/16244

### 结语

星星之火可以燎原，MatrixOne 社区持续需要更多的贡献者参与。更多 issue 正在寻求贡献者，欢迎关注！成为[MatrixOne Contributor](https://github.com/matrixorigin/matrixone)即可获得 MatrixOne 社区定制的丰厚礼物！
