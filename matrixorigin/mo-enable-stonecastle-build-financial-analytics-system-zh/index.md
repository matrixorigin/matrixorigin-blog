---
title: 应用案例——StoneCastle ｜ MatrixOne 助力 StoneCastle 构建高效金融分析系统
author: MatrixOrigin
mail: lichuanzi@matrixorigin.cn
description: >-
  StoneCastle 成立于 2003 年，专注现金储蓄管理。借助 MatrixOne，StoneCastle
  提升了数据处理效率，缩短查询时间，确保大额资金分散存储并享受 FDIC 保险。
tags:
  - 客户案例
keywords:
  - MySQL
  - HTAP
  - StoneCastle
  - 矩阵起源
  - MatrixOne
publishTime: '2024-10-25 17:00:00+08:00'
image:
  '1': /content/zh/mo-enable-stonecastle-build-financial-analytics-system/sc1.png
  '235': /content/zh/mo-enable-stonecastle-build-financial-analytics-system/sc1.png
date: '2024-10-25 17:00:00+08:00'
lang: zh
status: published
---

### 客户简介

StoneCastle 成立于 2003 年，是一家美国金融服务提供商，专注于为客户提供现金储蓄安全管理服务。由于美国银行众多且存在一定的倒闭风险，因此美国联邦存款保险公司(FDIC)对每个个人或实体在任何一家受保银行提供上限为25万美元的存款保险，超出这个额度的存款遭遇损失就无法获得理赔。而StoneCastle的服务就是帮助客户将大额资金分散存放在多家银行，并且通过其管理平台确保储户的资金享受FIDC的保险。StoneCastle已经为数千个组织及机构管理了超过1700亿美元的资金，对接了上千家储蓄银行。

### 业务挑战

StoneCastle 的用户记账管理系统是一个专门用于记录用户资金流向的平台，负责跟踪用户在不同银行的资金存储情况。该系统目前运行在 AWS EC2 云服务器上，自建 MySQL 数据库作为底层支撑。然而，随着 StoneCastle 业务的快速扩展，特别是从机构储户扩展到个人储户后，数据量急剧增加，该应用系统面临着以下挑战：

- 数据增长迅猛

StoneCastle 的用户会计管理系统本质上是记录 N 名储户与 M 家银行的资金往来，银行数量超过1000家，而储户的数量已经增加到约6000家。这一庞大的资金交易网络每月会新增约数百万条交易记录，历史留存的数据量已经达到数亿条，这种规模的数据对于MySQL的查询能力带来了很大的挑战。为了缓解系统压力，在线系统MySQL内只保留了一年的数据供用户查询，超过年限的数据均被归档。这种归档方式缓解了主数据库的压力，但对历史数据的查询和分析带来了不便，进一步限制了用户的操作能力。且在新的业务模式下，数据增加的速度越来越快，MySQL能承载的数据年限只能进一步缩小。

- 查询性能瓶颈

StoneCastle 的用户记账管理系统的查询主要是面向内外部用户的聚合分析。该系统对于提供准确的财务报告、监控交易模式以及支持决策制定至关重要。在当前的 MySQL 数据库下，系统在执行涉及大量数据聚合、多表关联和复杂计算的查询时，响应时间显著延长。例如，生成跨多个账户和时间段的汇总报告，或者进行深入的财务趋势分析，这些操作可能需要耗时十几分钟甚至更长时间才能完成。这种性能瓶颈不仅严重影响了用户的工作效率，也难以满足不断增长的业务需求。典型的慢SQL查询如下，这条SQL在千万级数据量下MySQL需要执行十分钟以上，严重影响了业务的敏捷度。

```sql
SELECT client_id, client_account, bank_id, bank_account, SUM(amount) FROM transactions GROUP BY client_id, client_account, bank_id, bank_account;
```

- 私有化部署需求

由于 StoneCastle 客户对数据安全极为敏感，他们对使用SaaS数据库服务存在顾虑，担心如果发生数据泄露等问题将难以控制和应对。同时也考虑到跟现有系统兼容性及运营成本的考虑，客户没有选用AWS的RDS或者AuroraDB等服务，而是购买 EC2 服务器，并私有化部署 MySQL，同时自建了一系列安全措施，以确保数据能够在自有环境中得到安全、妥善的管理。

![改造前数据架构](/content/zh/mo-enable-stonecastle-build-financial-analytics-system/sc2.png?width=800)

### 解决方案

MatrixOne 作为一款高性能的 HTAP 数据库，具有高度兼容 MySQL 协议的特点，能够有效解决 StoneCastle 记账管理系统当前 MySQL 数据库在数据处理和查询性能方面面临的挑战。

相比传统的 MySQL 数据库仅适合处理OLTP负载，而MatrixOne 结合了事务处理和分析处理的能力，使其能够高效地处理大量实时交易数据，同时支持复杂的查询和数据分析。这种融合能力使得系统在处理和分析数据时更加高效和灵活。MatrixOne在保持了原有的MySQL交易性能同时，将 MySQL 的各类聚合查询和多表关联查询耗时从10到30分钟缩短至5-10秒。这样的查询性能提升可以极大的拓宽在线数据库中可实时查询的数据年限，不会再受限于3年的存储数据量。

MatrixOne 支持基于云服务器的私有化部署，并且提供了非常简便的部署和运维工具，可以一键部署和运行。这样仍然可以满足客户对数据安全的要求，数据的私有化处理确保了数据的安全性和隐私性，同时避免了数据泄露的风险。同时MatrixOne支持双机主备日志同步架构，确保了与MySQL一致的高可用能力。

MatrixOne 与 MySQL 高度兼容，包括连接协议，SQL语法，上层应用的ORM框架等，这种兼容性使得用户在进行迁移和开发的时候完全可以复用熟悉的工具和SQL语句进行迁移，StoneCastle的工程师基本上对应用没有进行任何改造即完成了应用的切换。且为了确保迁移过程可靠及一致，MatrixOne支持读取MySQL binlog进行数据同步，两套系统并行运行了一段时间才进行了应用切换。

![迁移架构](/content/zh/mo-enable-stonecastle-build-financial-analytics-system/sc3.png?width=800)

### 客户收益

StoneCastle 通过使用 MatrixOne 数据库，成功地提升了数据处理和分析的效率，显著缩短了查询时间，加速了决策制定，同时也提升了在线数据中可承载的数据量。这使得一方面用户可以查询到更久远的历史数据，另一方面也让系统增加了接入更多新用户的能力。

而在整个在金融行业中，客户其实都面临着同样的问题，随着金融行业数据量的激增，数据库不仅要处理日常的在线读写事务，还需应对日益复杂的分析型工作负载，如实时风险评估、交易监控、商业智能报告、数据可视化和大数据分析等。在这些分析型业务场景中，MySQL 的传统架构可能会遇到性能瓶颈。MatrixOne 作为一款 HTAP 数据库，以其卓越的性能和灵活性，成为替代 MySQL 的理想选择，以满足企业对高效数据处理的全面需求。
