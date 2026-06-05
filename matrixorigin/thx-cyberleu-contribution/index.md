---
title: Thank You to @Cyberleu for Contributing Aggregate Function Capabilities to MatrixOne
author: MatrixOrigin
mail: lichuanzi@matrixorigin.cn
description: A community contributor has contributed advanced SQL aggregate functions to MatrixOne, improving data aggregation and grouping operations.
tags:
  - News
keywords:
  - MySQL
  - GitHub
  - MatrixOrigin
  - MatrixOne
publishTime: '2024-09-27 17:00:00+08:00'
image:
  '1': /images/blog-covers/news.png
  '235': /images/blog-covers/news.png
date: '2024-09-27 17:00:00+08:00'
lang: en
status: published
translations:
  zh: thx-cyberleu-contribution-zh
---

Recently, community contributor **@Cyberleu** contributed requirements for aggregate functions such as `GROUP BY WITH ROLLUP`, `GROUP BY WITH CUBE`, `GROUP BY WITH SETS`, and `GROUPING` to MatrixOne, filling needs related to advanced data aggregation and grouping operations in SQL. Details are as follows.

### 1. GROUP BY WITH ROLLUP

- Problem solved

Performs hierarchical aggregation on data and calculates summary values at each level, as well as the grand total, within the same query.

- Use case

Suitable for scenarios that require step-by-step aggregation, such as summarizing sales by year and quarter and finally producing total sales.

- Example

Annual, quarterly, and monthly sales summaries, with total sales displayed in the final row.

### 2. GROUP BY WITH CUBE

- Problem solved

Provides comprehensive aggregated data for all combinations of dimensions, generating summaries for every possible grouping in a dataset.

- Use case

Suitable for scenarios that require combined aggregation across multiple dimensions, such as analyzing sales by different combinations of year, company, and product.

- Example

Sales summaries by year, company, and product, while also displaying every possible combination and the overall total.

### 3. GROUP BY WITH SETS

- Problem solved

Allows multiple grouping sets to be specified so that different grouping combinations can be aggregated within the same query, providing greater flexibility.

- Use case

Suitable for scenarios that require aggregation over specific grouping combinations without generating all possible combinations as `CUBE` does.

- Example

Only aggregate the year-company combination and the company-product combination, while ignoring other possible combinations.

### 4. GROUPING (GROUPING SETS)

- Problem solved

Used together with `ROLLUP` or `CUBE`, it helps identify the hierarchy or dimension of aggregated results, making it easier to distinguish summary rows at different levels in the query result.

- Use case

Suitable for scenarios where the result needs to distinguish different levels of summary values, such as year, quarter, month, and the grand total.

- Example

Use the `GROUPING` function to mark which rows are annual summaries, which are quarterly summaries, and which are grand totals.

![15861](./images/gx1.png?width=800)

### FeatureRequest

`AES_ENCRYPT()` and `AES_DECRYPT()` functions #15911:

- https://github.com/matrixorigin/matrixone/issues/15911

Support alter database #6601:

- https://github.com/matrixorigin/matrixone/issues/6601

DML returning #7501:

- https://github.com/matrixorigin/matrixone/issues/7501

Support reference aliases in where clause #16244:

- https://github.com/matrixorigin/matrixone/issues/16244

### Closing

A single spark can start a prairie fire, and the MatrixOne community continues to need more contributors. More issues are looking for contributors, so please follow along. Become a [MatrixOne Contributor](https://github.com/matrixorigin/matrixone) and receive generous customized gifts from the MatrixOne community!
