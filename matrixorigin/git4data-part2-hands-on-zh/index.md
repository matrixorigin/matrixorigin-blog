---
title: "MatrixOne Git4Data 技术详解（二）：从零跑通所有 Git 原语"
author: MatrixOrigin
description: "Git4Data 系列（二）：手把手、可直接复制运行的实操。装好 MatrixOne，灌进一百万行数据，把所有 Git 原语——快照、克隆、分支、行级 diff、带冲突策略的合并、cherry-pick、任意时间点恢复——在表 / 库 / 租户 / 集群四个粒度上跑一遍，并用实测数字证明：版本控制的成本与数据量无关。"
tags: ["技术干货"]
keywords: ["Git4Data", "MatrixOne", "数据版本控制", "快照克隆", "上手教程"]
publishTime: "2026-06-04T17:00:00+08:00"
date: '2026-06-04'
image:
  "1": /images/blog-covers/technical.png
  "235": /images/blog-covers/technical.png
lang: zh
status: published
translations:
  en: git4data-part2-hands-on
---

# MatrixOne Git4Data 技术详解（二）：从零跑通所有 Git 原语

上一篇我们讲了Git4Data是什么已经**为什么**它对我们有用。这一篇我们直接开始上手。十分钟之内，你会在自己的机器上把 MatrixOne 跑起来，灌进一百万行真实规模的数据，然后**一条条 SQL 把所有 Git 原语都跑一遍**——快照、克隆、分支、行级 diff、合并、cherry-pick、任意时间点恢复。所有 SQL 都可以直接复制运行；做完整段，你就有了在大规模的数据上“以 Git 的方式工作”的真实体验。

> 项目主页：[github.com/matrixorigin/matrixone](https://github.com/matrixorigin/matrixone) ｜ 文档站：[docs.matrixorigin.cn](https://docs.matrixorigin.cn/)

---

## MatrixOne 的基础背景

[MatrixOne](https://github.com/matrixorigin/matrixone) 是一个**开源、云原生、分布式的 SQL数据库**，以 Apache 2.0 协议开源，兼容 MySQL 协议——所有 MySQL 客户端、驱动、ORM 都能直接连接。

MatrixOne 原生支持多种类型的数据和多种数据负载（OLTP，OLAP，时序，向量搜索，全文检索）。它的架构是完全存算分离的，计算节点完全是无状态的容器，存储层直接使用 S3 兼容的对象存储上。这套“**存算分离 + 不可变对象 + MVCC**”的存储架构，正是它能把 **Git 式版本控制能力做进数据库内核**的基础——所以与其说 Git4Data 是它的一个附加功能，不如说是它技术架构的自然产物。

> 想了解架构与实现细节，我们系列的下一篇会详细的介绍MatrixOne的架构细节和实现原理。这一篇我们专注把这些能力先用起来。

---

## 第一步：安装 MatrixOne 

最快的方式是 Docker 一条命令：

```bash
docker run -d -p 6001:6001 --name matrixone matrixorigin/matrixone:4.0.0-rc1
```

等容器启动后，用任何 MySQL 客户端连进去（默认账号 `root`、密码 `111`、端口 `6001`）：

```bash
mysql -h 127.0.0.1 -P 6001 -u root -p111
```

进入会话试一下：

```sql
SELECT version();
```

看到版本号——你就有了一个完整的 MatrixOne 本地单机实例，可以跑起来这篇文章里要演示的全部能力。

> 想从源码构建的话也可以check我们的Github上的[教程](https://github.com/matrixorigin/matrixone/blob/main/etc/DEV_README.md)。

> 📦 **本文所有 SQL 都整理在配套仓库里**：[**matrixorigin/git4data-tutorial**](https://github.com/matrixorigin/git4data-tutorial)。
> 不想一段段复制的话，直接跑这一条就能把全文走一遍：
> ```bash
> mysql -h 127.0.0.1 -P 6001 -u root -p111 < 02-hands-on/git4data_primitives.sql
> ```
> 本系列后续每一篇的代码也都会放进这个仓库。

---

## 第二步：直接灌进 100 万行数据

这一篇我们不拿三五行的玩具表凑数——一上来就灌 **100 万行**，让你在真实规模的数据上感受 git4data。

建库、建表，然后用一条 `INSERT ... SELECT ... generate_series` 在库内直接生成 100 万行订单（不用任何外部文件）：

```sql
CREATE DATABASE git4data_demo;
USE git4data_demo;

CREATE TABLE orders (
    order_id BIGINT PRIMARY KEY,
    customer VARCHAR(32),
    amount   DECIMAL(10, 2),
    status   VARCHAR(16)
);

-- 一条 SQL 在服务端生成 100 万行
INSERT INTO orders
SELECT result,
       concat('cust_', result % 10000),
       round(rand() * 1000, 2),
       CASE result % 3 WHEN 0 THEN 'paid' WHEN 1 THEN 'pending' ELSE 'cancelled' END
FROM generate_series(1, 1000000) g;

SELECT COUNT(*) FROM orders;   -- 1,000,000
```

`generate_series(1, 1000000)` 在服务端流式生成 1..100 万的整数，整段 INSERT 全在服务端执行，网络上只走一条 SQL——本地 Docker 上通常**一两秒**就灌完了。

到这里 MatrixOne 还只是一个普普通通、装了 100 万行数据的 MySQL 兼容库。下面我们开始进入 Git 化的世界——而且接下来每个动作，都是直接作用在这 100 万行上的。

---

## 第三步：commit / tag / reset——`CREATE SNAPSHOT` 与 `RESTORE`

### git commit / tag——`CREATE SNAPSHOT`

给当前这 100 万行的状态按下“存档键”：

```sql
CREATE SNAPSHOT v1 FOR TABLE git4data_demo orders;
```

⚠ 注意 MatrixOne 的 `FOR TABLE` 子句里，库名和表名之间是**空格**而不是点号——`git4data_demo orders`，不是 `git4data_demo.orders`。

`SHOW SNAPSHOTS` 可以看到当前所有快照。

### git checkout（时间旅行）——`SELECT … {snapshot = '…'}`

先模拟一个生产事故——手滑删掉了一批订单：

```sql
DELETE FROM orders WHERE order_id <= 1000;
SELECT COUNT(*) FROM orders;                      -- 999000，1000 行没了
```

现在**回头去看一眼**快照那一刻的数据，当前状态丝毫不动：

```sql
SELECT COUNT(*) FROM orders {snapshot = 'v1'};    -- 1000000，过去那一刻完好
```

带 `{snapshot = '…'}` 的 `SELECT` **只是探头去看一眼过去**，对当前数据零干扰。这就是 git 的 `checkout <tag> -- file`，但没有 worktree 副作用。

### git reset --hard——`RESTORE TABLE`

不只想看，想真的回去：

```sql
RESTORE TABLE git4data_demo.orders {SNAPSHOT = v1};

SELECT COUNT(*) FROM orders;                       -- 1000000，全回来了
```

整张表被重置回 `v1` 那一刻——被误删的 1000 行原封不动回来了。这等价于 `git reset --hard v1`。

---

## 第四步：git clone——`CLONE`

`CLONE` 是 MatrixOne 给“基于真生产数据起一个独立副本”准备的最便宜工具：

```sql
CREATE TABLE orders_copy CLONE orders;
SELECT COUNT(*) FROM orders_copy;                  -- 1000000，瞬间出现
```

注意：克隆出的 `orders_copy` 立刻就有完整的 100 万行，但这一步**几乎不耗时、几乎不占空间**——底层根本没复制数据，只记了个指向现有数据的指针。改它不影响 `orders`，反之亦然。

也可以从某个快照 clone（用来开“某个历史状态的 dev 环境”）：

```sql
CREATE TABLE orders_at_v1 CLONE orders {SNAPSHOT = "v1"};
```

`CLONE` 是最便宜的“派生”动作，但它**不记血缘**。如果之后要做行级 diff/merge，需要的是下一步的 `DATA BRANCH CREATE`。

---

## 第五步：git branch——`DATA BRANCH CREATE`

`DATA BRANCH CREATE` 看起来和 `CLONE` 差不多，但它**记下了“我是从谁分出来的”**——这份血缘让后续的行级 `DIFF` / `MERGE` / `PICK` 自动找到共同祖先（LCA），跑得既正确又快。

```sql
DATA BRANCH CREATE TABLE orders_dev FROM orders;
```

接下来在这条分支上做点改动，让它跟主线有差异——改其中 1000 行的状态，再加一行新订单：

```sql
UPDATE orders_dev SET status = 'shipped' WHERE order_id BETWEEN 5000 AND 5999;
INSERT INTO orders_dev VALUES (1000001, 'Frank', 400.00, 'paid');

-- 主线 orders 一动不动
SELECT COUNT(*) FROM orders;                       -- 还是 1000000
```

---

## 第六步：git diff——`DATA BRANCH DIFF`

```sql
-- 只看总数：分支相对主线到底变了几行
DATA BRANCH DIFF orders_dev AGAINST orders OUTPUT SUMMARY;
```

在 100 万行的表上，它**毫秒级**就返回——而且精确到行。返回是一张表，分别给出分支和主线各自的变更行数：

```
metric   | orders_dev | orders
INSERTED |          1 |      0     -- Frank 那一行
DELETED  |          0 |      0
UPDATED  |       1000 |      0     -- 改掉状态的那 1000 行
```

它不扫整张表，只扫“变更的那部分”，所以表里有 100 万还是 1 亿行都无所谓——这一点我们在第十一步会用数字证明。

`OUTPUT` 还有几种实用形式：

```sql
-- 看每一行差异（可加 LIMIT）
DATA BRANCH DIFF orders_dev AGAINST orders OUTPUT LIMIT 10;

-- 只看一行：总条数
DATA BRANCH DIFF orders_dev AGAINST orders OUTPUT COUNT;

-- 只对比指定几列
DATA BRANCH DIFF orders_dev AGAINST orders COLUMNS (status, amount) OUTPUT SUMMARY;

-- 把差异导出成可执行的 SQL 补丁文件。注意：导出目录必须事先存在，
-- 且这是 MatrixOne 服务端（容器内）的路径——Docker 场景先建好目录：
--   docker exec matrixone mkdir -p /tmp/orders_diff
DATA BRANCH DIFF orders_dev AGAINST orders OUTPUT FILE '/tmp/orders_diff/';
```

最后那种用法很有意思：导出的 `.sql` 是一个完整事务——先把要删/要插的行灌进两张临时表，再 `DELETE` + `INSERT INTO` 应用到目标表，最后清掉临时表。它可以直接 `mysql … < diff_xxx.sql` 灌到任何 MatrixOne 实例——分支的改动凝固成了一份**可移植的补丁**。

---

## 第七步：git merge——`DATA BRANCH MERGE`

确认完改动，把分支合回主线：

```sql
DATA BRANCH MERGE orders_dev INTO orders;
SELECT COUNT(*) FROM orders;                       -- 1000001，Frank 进来了
```

不写 `WHEN CONFLICT` 时默认是 `FAIL`。把三种冲突策略各演示一次：

```sql
-- 准备两条分支，让它们在同一行（order_id=1）上撞车
DATA BRANCH CREATE TABLE orders_a FROM orders;
DATA BRANCH CREATE TABLE orders_b FROM orders;

UPDATE orders_a SET status = 'shipped'  WHERE order_id = 1;
UPDATE orders_b SET status = 'refunded' WHERE order_id = 1;

-- 先把 orders_a 合回主线（没冲突，一次过）
DATA BRANCH MERGE orders_a INTO orders;

-- 现在 orders_b 也想合回，但 order_id=1 已被 orders_a 改过——撞上了
DATA BRANCH MERGE orders_b INTO orders WHEN CONFLICT FAIL;
-- 报错：在 order_id=1 上冲突；整个事务回滚，主线一行不动
```

要把冲突解开，选一种策略：

```sql
-- 保留主线、跳过冲突行（git 的 accept ours）
DATA BRANCH MERGE orders_b INTO orders WHEN CONFLICT SKIP;

-- 或者：采用分支的版本（git 的 accept theirs）
DATA BRANCH MERGE orders_b INTO orders WHEN CONFLICT ACCEPT;
```

**关键设计**：MatrixOne **只把“两边都改了同一行”算真冲突**——如果只有一边动过那行，数据库会**自动**把改动应用过去，根本不打扰你。所以哪怕几百万行的改动，真正要你拍板的，往往就是真撞车的那几十几百行。

---

## 第八步：git cherry-pick——`DATA BRANCH PICK`

Git 里那个“只把分支里某几行挑过来”的动作，对应 MatrixOne 的 `DATA BRANCH PICK`。语法比 MERGE 多一个 `KEYS(...)`：

```sql
-- 准备一条分支，改几行、加一行
DATA BRANCH CREATE TABLE orders_fix FROM orders;
UPDATE orders_fix SET status = 'refunded' WHERE order_id IN (2, 4);
INSERT INTO orders_fix VALUES (1000002, 'Grace', 500.00, 'paid');

-- 我只要把 order_id = 2 和 1000002 这两行挑回主线，其它一概不动
DATA BRANCH PICK orders_fix INTO orders KEYS (2, 1000002) WHEN CONFLICT ACCEPT;

SELECT order_id, status FROM orders WHERE order_id IN (2, 4, 1000002) ORDER BY order_id;
-- 2       → refunded（被挑过来了）
-- 4       → 仍然是原状态（没被挑，一动不动）
-- 1000002 → Grace 那条新订单（被挑过来了）
```

`KEYS` 也支持子查询，挑的范围由 SQL 决定：

```sql
DATA BRANCH PICK orders_fix INTO orders
    KEYS (SELECT order_id FROM orders_fix WHERE customer = 'Grace')
    WHEN CONFLICT ACCEPT;
```

这一招在 RLHF 偏好数据、协作标注这些场景里特别好用——“我只要 Alice 改判过的那 80 行”，一条 SQL 就挑出来。

---

## 第九步：rewind to any moment——`PITR`

`SNAPSHOT` 是你**手动**按的存档键；`PITR` 是数据库**自动在背后**按着的连续历史。先建一个 PITR 策略，告诉系统“这张表/这个库，过去 X 时间窗口的状态都给我留着”：

```sql
-- 给整个 git4data_demo 库开 1 天的 PITR 保留窗口
CREATE PITR demo_pitr FOR DATABASE git4data_demo RANGE 1 'd';
```

`RANGE` 的单位支持 `h`（小时）/ `d`（天，默认）/ `mo`（月）/ `y`（年）。

⚠ 一个时序细节：PITR 有一个“生效边界”（约等于它的创建时刻）。**刚建完 PITR 就立刻记录秒级时间点去恢复，可能会撞上 `input timestamp ... is less than the pitr valid time` 的报错**。稳妥做法是建完 PITR 后**等 1–2 秒**，或先 `SHOW PITR` 看一眼生效边界，再记录恢复点：

```sql
SHOW PITR;              -- 确认 demo_pitr 已生效（看它的起始时刻）
```

之后任何一刻——无论你有没有显式打过 snapshot——都可以恢复回去。先记一下“现在”，然后乱改一通：

```sql
SELECT now();           -- 比如：2026-06-04 14:03:07，把这个值记一下

DELETE FROM orders;     -- 整张表清空，最糟的情况
```

恢复到刚才那个时刻：

```sql
RESTORE DATABASE git4data_demo FROM PITR demo_pitr "2026-06-04 14:03:07";

SELECT COUNT(*) FROM orders;   -- 100 万行又回来了
```

时间戳格式是 `"YYYY-MM-DD HH:MM:SS"`——“恢复到下午两点三分零七秒那一刻”的字面意思。

---

## 第十步：不止表级——库 / 租户 / 集群都能版本化

前面所有演示都在**表**这个粒度上。但 MatrixOne 的 git4data **不止于表**——它对**表、库、租户（account）、整个集群**四个层级都成立。这一点很重要：很多真实诉求其实是“多张表一起”的。

| 操作 | 表级 | 库级 | 租户级 | 集群级 |
|---|---|---|---|---|
| 快照 `CREATE SNAPSHOT` | `FOR TABLE db t` | `FOR DATABASE db` | `FOR ACCOUNT acc` | `FOR CLUSTER` |
| 恢复 `RESTORE` | `RESTORE TABLE …` | `RESTORE DATABASE …` | `RESTORE ACCOUNT …` | `RESTORE CLUSTER …` |
| 时间点恢复 `PITR` | `FOR TABLE …` | `FOR DATABASE …` | `FOR ACCOUNT …` | `FOR CLUSTER` |
| 零拷贝克隆 `CLONE` | `CREATE TABLE … CLONE` | `CREATE DATABASE … CLONE` | — | — |
| 分支 `DATA BRANCH CREATE` | `… TABLE … FROM` | `… DATABASE … FROM` | — | — |



**库级**是最常用的“一致性版本”粒度：特征表 + 标签表 + 元数据表一起打一个快照、一起恢复，保证整份训练集**跨表一致**，多表一次性原子回滚：

```sql
CREATE SNAPSHOT db_v1 FOR DATABASE git4data_demo;     -- 库里所有表，一个版本
-- …改了库里好几张表…
RESTORE DATABASE git4data_demo {SNAPSHOT = db_v1};    -- 多表原子回到 db_v1
```

**租户级**把“一个 account 下所有库的所有表”一次性版本化——多租户 SaaS 给每个客户做隔离快照、或整租户回滚时尤其有用：

```sql
CREATE SNAPSHOT acct_v1 FOR ACCOUNT myacct;           -- 整个租户一个版本
-- RESTORE ACCOUNT myacct {SNAPSHOT = acct_v1};        -- 整租户回滚（生产慎用）
```

**集群级**则覆盖整个实例，通常用于灾备级别的统一快照与恢复。

一句话：**从一张表，到一个库，到一个租户，到整个集群，git4data 是同一套语义、同一种廉价。**

---

## 第十一步：灌到 1000 万、1 亿——看“成本与数据量无关”

现在把数据加大，再重跑这些原语——你会看到 git4data 最反直觉的一点：**快照、克隆、分支几乎不随数据量变化**。

灌更多数据，只要改 `generate_series` 的上限（`order_id` 加个偏移避免主键冲突）：

```sql
-- 再灌 900 万，把表凑到 1000 万行
INSERT INTO orders
SELECT result + 2000000,
       concat('cust_', result % 10000),
       round(rand()*1000, 2),
       CASE result % 3 WHEN 0 THEN 'paid' WHEN 1 THEN 'pending' ELSE 'cancelled' END
FROM generate_series(1, 9000000) g;
```

我们在一台**单机 Docker（MatrixOne 4.0.0-rc1）**上，把同一张表分别灌到 100 万、1000 万、1 亿行，每一档都跑同一组 git4data 操作（其中 diff / merge 都**只改其中 1000 行**）。实测（稳定态，多次取中位数）：

| 表规模 | 灌入耗时 | `CREATE SNAPSHOT` | `CLONE` | `DATA BRANCH CREATE` | `DIFF`（改 1000 行） | `MERGE`（1000 行） |
|---|---|---|---|---|---|---|
| **100 万行** | 0.5 s | 6 ms | 6 ms | 7 ms | 13 ms | 64 ms |
| **1000 万行** | 5.3 s | 8 ms | 8 ms | 7 ms | 21 ms | 178 ms |
| **1 亿行** | 41 s | 5 ms | 25 ms | 19 ms | 23 ms | 189 ms |

这张表的三个关键，正是 git4data 的命门所在：

- **快照：完全恒定**——数据涨了 100 倍（100 万 → 1 亿），`CREATE SNAPSHOT` 始终是 **5–8 毫秒**。因为快照只是给“当前由哪些数据对象组成”的那份元数据目录起个名字，跟表里有多少行毫无关系。
- **克隆 / 分支：复制的是元数据目录，不是数据**——100 倍数据，克隆只从 6 毫秒涨到 25 毫秒。它复制的那份目录会随对象数量缓慢变大，但始终是在拷几 MB 元数据，而不是几十 GB 数据。
- **diff / merge：只随“改了多少行”走**——三档都只改了 1000 行，所以无论表里躺着 100 万还是 1 亿行，`DIFF` 始终一二十毫秒、`MERGE` 始终几十到一两百毫秒。`MERGE` 比 `DIFF` 略重（它要把变更真正写回主表），但同样由“改了多少行”决定，不随表规模线性膨胀。

> 一个诚实的细节：**第一次**对刚灌完的大表打快照会稍慢一点（实测约 10–12 毫秒），因为它要先把内存里还没落盘的数据 flush 到对象存储——这是一次性开销，之后就回落到上表的稳定态。我们灌完数据、稍作停顿再测，正是为了让数字反映 git4data 操作本身的成本，而不是这一次性的落盘。

这正是上一篇那句话的实证：**难的从来不是版本控制本身，而是在海量数据上还能让它廉价。**

> 注：再往上（10 亿行以上），单机 Docker 的内存会先成为瓶颈（我们这台 VM 仅 ~4GB，灌到 5000 万行就被 OOM）。真正的十亿级数据，该上多节点集群或云——论文里那组 6 亿行的实验跑在 64 核 / 256GB 的机器上，克隆同样是 0.2 秒。

---

## 串起来：一次完整的“Git 化数据”工作流

到这里所有原语你都用过了。最后把它们串成一个迷你工作流，模拟“一次模型训练前的数据策展”：

```sql
-- ① 训练入口的原始数据，先按一下存档键
CREATE SNAPSHOT samples_v3_raw FOR TABLE git4data_demo orders;

-- ② 在带血缘的分支上跑清洗——主线一动不动
DATA BRANCH CREATE TABLE orders_clean FROM orders;
DELETE FROM orders_clean WHERE amount < 200;
UPDATE orders_clean SET status = 'cancelled' WHERE status = 'pending';

-- ③ 评审：清洗到底动了什么？
DATA BRANCH DIFF orders_clean AGAINST orders OUTPUT SUMMARY;

-- ④ 质量门禁通过，原子地合并回主线
DATA BRANCH MERGE orders_clean INTO orders WHEN CONFLICT FAIL;

-- ⑤ 这就是 model_v3 的“训练所用数据”，钉一个名字
CREATE SNAPSHOT samples_v3 FOR TABLE git4data_demo orders;

-- ……后面发现模型变差……

-- ⑥ 实在不行，一秒回退
RESTORE TABLE git4data_demo.orders {SNAPSHOT = samples_v3_raw};
```

每一次实验、每一次训练、每一次发布，都有一个**可命名的版本**钉在那里。任何“哪里出了问题”，从此都是 SQL 一行能问得清的事。

---

## 收尾 & 清理

回头看看：从 `docker run` 到 `RESTORE`，**十分钟之内**你在 100 万行真实规模的数据上跑通了：

- commit / tag / reset（`CREATE SNAPSHOT` / `SELECT … {snapshot = '…'}` / `RESTORE … {SNAPSHOT = …}`）
- clone（`CREATE TABLE … CLONE` / `CREATE DATABASE … CLONE`）
- branch（`DATA BRANCH CREATE TABLE/DATABASE`）
- diff（`DATA BRANCH DIFF … OUTPUT SUMMARY / COUNT / LIMIT / FILE`）
- merge + 三种冲突策略（`DATA BRANCH MERGE … WHEN CONFLICT FAIL|SKIP|ACCEPT`）
- cherry-pick（`DATA BRANCH PICK … KEYS(…)`）
- rewind to any moment（`CREATE PITR` + `RESTORE … FROM PITR "…"`）
- 表 / 库 / 租户 / 集群四个粒度

清理一下用过的对象：

```sql
DROP SNAPSHOT v1;
DROP SNAPSHOT db_v1;
DROP SNAPSHOT samples_v3_raw;
DROP SNAPSHOT samples_v3;
DROP PITR demo_pitr;
DROP DATABASE git4data_demo;        -- 一句清掉所有演示表
```

或者你也可以一句 `docker rm -f matrixone` 把整个实例端掉。

这就是上一篇那“三个动作”在 SQL 里的全部样貌——它们现在已经在你机器上、在百万行数据上跑过一遍了。你可以**拿真生产数据当 staging**、**拿任意时刻当起点**、**让团队在同一张大表上并行作业**、**让模型训练有可复现的版本钉**。

下一篇我们会回头讲**实现原理**：MatrixOne 凭什么能在亿级、乃至论文里的 6 亿行上把这些动作做到秒级、字节级？答案在它的存储引擎里——下次我们去把它打开看看。

> 📎 完整文档：本文用到的每个原语都有专门页面，参考 [docs.matrixorigin.cn](https://docs.matrixorigin.cn/) 的 SQL Reference / DDL 章节。
> 📎 源码与社区：[github.com/matrixorigin/matrixone](https://github.com/matrixorigin/matrixone)
