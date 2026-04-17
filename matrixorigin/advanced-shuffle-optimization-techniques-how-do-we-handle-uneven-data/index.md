---
title: Advanced Shuffle Optimization Techniques：How do we handle uneven data?
author: Ni Tao
mail: nitao@matrixorigin.io
description: >-
  Previously, the tpch dataset was always used for examples, but tpch represents
  an ideal scenario where all data are evenly distributed. In actual production
  environments, many datasets are unevenly distributed. For uneven data, a
  straightforward approach is to use a hash shuffle to ensure that the data is
  evenly distributed after bucketing.
tags:
  - technology
keywords:
  - MatrixOne
  - Database
  - Database Kernel
  - shuffle
  - TPCH Testing
publishTime: '2024-03-31 17:00:00+00:00'
image:
  '1': >-
    /content/en/advanced-shuffle-optimization-techniques-how-do-we-handle-uneven-data/advanced-shuffle-optimization-techniques-how-do-we-handle-uneven-data.png
  '235': >-
    /content/en/advanced-shuffle-optimization-techniques-how-do-we-handle-uneven-data/advanced-shuffle-optimization-techniques-how-do-we-handle-uneven-data.png
date: '2024-03-31 17:00:00+00:00'
lang: en
status: published
---

## How do we handle uneven data?

Previously, the tpch dataset was always used for examples, but tpch represents an ideal scenario where all data are evenly distributed. In actual production environments, many datasets are unevenly distributed. For uneven data, a straightforward approach is to use a hash shuffle to ensure that the data is evenly distributed after bucketing.

Since hash shuffle cannot enable colocate optimization, optimizers still try to use range shuffle as much as possible, which requires a good understanding of the data distribution to provide a better bucketing algorithm. During the stats calculation phase, MO's optimizer also calculates data distribution based on the data's zonemap. The specific method is to assume that the data in this object is uniformly distributed within this zone map for every zone map accessed. Data distribution is calculated by traversing all the zone maps, and the results are stored in the `ShuffleRange` data structure.

One detail is for numerical types, it is assumed that each zonemap's data is uniformly distributed within its min-max range, and they are sorted directly from smallest max to largest max. For character types, since each character occupies one byte but most of the byte values do not appear in strings, the assumption of uniform distribution of data in each zone map is not valid. Therefore, each character that appears is mapped to a number, and after recalculating the new value for each string, they are sorted from smallest max to largest max.

### The ShuffleRange structure contains several key values:

#### ShuffleRange.Overlap

It's a `float64` type variable ranging from 0 to 1, representing the degree of overlap between zonemaps. The larger the Overlap, the more overlap there is. Specifically defined as the square root of the average of the proportion of overlap between any two zonemaps. The square root is taken to more easily differentiate between datasets with lower degrees of overlap.

#### ShuffleRange.Uniform

It's a `float64` type variable ranging from 0 to 1, representing the uniformity of the data. The greater the Uniform, the more uniform the data. Specifically defined as the overall average density of the data divided by the density at the densest part of the data. When `Uniform` is close to 1, consider directly bucketing by dividing the overall maximum and minimum values evenly.

#### ShuffleRange.Result

It's an array of `float64`, with a length of the default number of buckets, 1024, indicating the division value between two adjacent buckets. The method for calculating Result is: assuming that the data in each zonemap is uniformly distributed within its own min-max range, sort the zonemaps, calculate the density of each segment, and then calculate the division values.

After calculating the `ShuffleRange`, the optimizer decides whether to use range shuffle based on indicators such as overlap and uniform.

If the data distribution is not ideal and the algorithm cannot provide a suitable bucketing method, then hash shuffle must be used.

If the indicators are appropriate, indicating that a reasonable bucketing scheme can be provided, then the distribution method of 1024 buckets will be retained by default.

Later, when compiling the pipeline, based on runtime information, the actual number of buckets will be decided and N buckets will be re-distributed. Due to space limitations, further details of the algorithm will not be introduced. Those interested can directly view the relevant details through MO's source code.
