---
title: Why MatrixOne 0.5 Become Slower?
author: MatrixOrigin
mail: contact@matrixorigin.io
description: >-
  Our followers may find that the performance of MatrixOne 0.5 is much slower
  than before. In the release article of MatrixOne 0.2 earlier last year, there
  were reports that the single-table performance of MatrixOne SSB exceeded
  ClickHouse, and the multi-table performance reached StarRocks. So why did it
  become slower in version 0.5?
tags:
  - technology
keywords:
  - MatrixOne
  - Database
  - Relational Database
  - Performance
  - HTAP Database
publishTime: '2023-09-08 17:00:00+00:00'
image:
  '1': >-
    /content/en/why-matrixone-0-5-become-slower/why-matrixone-0.5-become-slower.png
  '235': >-
    /content/en/why-matrixone-0-5-become-slower/why-matrixone-0.5-become-slower.png
date: '2023-09-08 17:00:00+00:00'
lang: en
status: published
---

Our followers may find that the performance of MatrixOne 0.5 is much slower than before. In the release article of MatrixOne 0.2 earlier last year, there were reports that the single-table performance of MatrixOne SSB exceeded ClickHouse, and the multi-table performance reached StarRocks. So why did it become slower in version 0.5?

Those who noticed the accelerated factorization engine at the time should pay attention. In fact, thanks to the factorization engine in version 0.2, the MPP computing engine implemented in Golang could keep up in performance and even crush most other OLAP databases in some scenarios, such as non-primary key Joins. So why is the so-called factorization engine no longer mentioned in version 0.5, and the performance has slowed down accordingly? All of this needs to start with the factorization engine itself.

Factorization is a confusing name, but that's the only way to translate it, because its full name is Factorisation. If you roll back to MatrixOne 0.4 and earlier versions, you can even see that all aggregate functions are in a confusing directory called Ring. So what is Factorisation and what is Ring?

![](/content/en/why-matrixone-0-5-become-slower/picture1.jpg)

This comes from the famous incremental materialized view algorithm family DBToaster. It treats a table in a database as a representation composed of multiplication and addition. Ring represents a series of operations that satisfy commutativity, associativity, and distributivity in this representation composed of multiplication and addition, such as various aggregation functions like Count, Sum, Avg, Max, etc.Factorization defines 3 basic operations: Union, Join, and Marginalization, as shown in the figure below. The first two are relatively easy to understand. The last one, Marginalization, translates to marginalization. It is essentially equivalent to extracting common factors based on a column (column A in the figure) for a representation composed of addition and multiplication, similar to the distributive law. Therefore it is called the factorization engine.

![](/content/en/why-matrixone-0-5-become-slower/picture2.jpg)
![](/content/en/why-matrixone-0-5-become-slower/picture3.jpg)

Given the above three operations, now assume we need to calculate:

`Select count(*) From R(A,B) Natural Join S(A,C,E) Natural Join T(C,D)`

Join relationship is shown in the figure below:

![](/content/en/why-matrixone-0-5-become-slower/picture4.jpg)

Assuming the sizes of the three tables R, S, T are all N, then the complexity of the naive implementation is _O(N3)_, that is, joining the three tables first, and then performing the count calculation.

With the Marginalization operation in factorization computation, we can push down the aggregate function:

![](/content/en/why-matrixone-0-5-become-slower/picture5.jpg)

Here `V1[A]` represents the result of marginalizing R based on column B. Further marginalizing results in `V2[A,C]`:

![](/content/en/why-matrixone-0-5-become-slower/picture6.jpg)

Finally got:

![](/content/en/why-matrixone-0-5-become-slower/picture7.jpg)

In the above continuous Marginalization computation process, the aggregation function is continuously pushed down, so even with a 3-table Join, the intermediate result remains minimal, avoiding the problem in naive implementations where a huge Join result is generated before aggregation. This is why when computing Joins based on the factorization engine, even non-primary key Joins can be fearless without worrying about Cartesian products causing OOMs.

Therefore, the factorization engine provides a general aggregation pushdown computation framework. Any aggregation function that satisfies commutativity and associativity can implement its corresponding Marginalization operation, and then get applied in the unified aggregation pushdown framework.

In the above query, the attribute operated on during each marginalization is called a Variable, and the order of marginalization operations on the query is called the Variable Order. The series of marginalization operations can form a tree called the View Tree. As you can see, the term View is used here, because if you materialize these Views on the View Tree, then this is a materialized view maintenance algorithm.

![](/content/en/why-matrixone-0-5-become-slower/picture8.jpg)

The factorization computation engine does have limitations on the queries — Variables can only be Group By and Join attributes, and according to the above factorization decomposition, it can also only support equi-joins. So in simple terms, the first major function of factorization computation is to provide a computation framework for CAQ (Conjunctive Aggregation Query) queries. When a query contains equi-inner joins or group bys, as well as aggregation functions, it provides a unified aggregation pushdown framework to minimize intermediate state and is thus an ideal computation acceleration method. The example below shows the factorization decomposition for a generic query:

![](/content/en/why-matrixone-0-5-become-slower/picture9.jpg)

Aggregate pushdown is not uncommon, although not all SQL computing engines support it. For example, Presto has started supporting this feature in recent years. It is clearly an effective query acceleration method. In comparison, general SQL computing engines need to adopt different strategies for different aggregation functions, because there is no unified aggregation pushdown method. For example, the pushdown methods for AVG and SUM are different. Therefore, under the factorization framework, you only need to implement the interface of the corresponding Agg function according to the semantics of Ring to accomplish aggregation pushdown in CAQ queries.

The second major function of the factorization engine is that it introduces a superior Join Order framework — the Hyper Tree decomposition algorithm based on Hyper Graph. This algorithm comes from the well-known Worst Case Optimal Join series, meaning that in the worst case, the complexity of this Join algorithm is optimal. Unlike standard SQL engines where joins are processed table-by-table, this algorithm processes joins attribute-by-attribute (column-by-column). We know that standard SQL computing engines basically process two-table joins — according to left-deep or right-deep principles, and rarely have multi-way joins, because even two-table joins have a search space complexity of N!. As for Bushy Plans (right side of figure below), their search space is even larger, making it very difficult to obtain even a locally optimal solution. Even left-deep Plans often cannot find the globally optimal solution due to computational complexity when there are many tables, and can only use a suboptimal solution as a substitute.

![](/content/en/why-matrixone-0-5-become-slower/picture10.jpg)

Assume there are three tables _R1, R2, R3_ in the figure below, and corresponding attributes _A1, A2, A3_. If using standard Binary Joins, we can use a Hash Join based on _A2_ to connect _R1_ and _R2_ first. This will connect (1,x) and (5,x) in R1 with (x,2) and (x,4) in R2. The output data will be 4 tuples: (1,x,2), (1,x,4), (5,x,2) and (5,x,4). The record (1,q) has no match so it is not output. To further complete the Join, we need to continue probing other table attributes until all possible relationships are probed, but this can be very slow. If each table has length _N_, the number of Tuples output by repeatedly doing Binary Joins will be _O(N2)_. Therefore, we need a smart plan to form a binary tree where leaves are relations and internal nodes correspond to connections between relations. The root node of the tree represents the connection of all relations, and the tree structure suggests which relations can be connected together. For example, in the previous case, if _R2_ and _R3_ are connected first, then only two records are produced before connecting with _R1_. The Worst Case Optimal Join series algorithms ensure the number of Tuples produced can reach _O(N3/2)_, which is mathematically proven to be the lowest.

![](/content/en/why-matrixone-0-5-become-slower/picture11.jpg)

Worst Case Optimal Join contains a series of algorithms, such as LeapFrog TrieJoin, NPRR, etc. Factorization is one of them. It expresses each query as a hypergraph, where each node in the hypergraph is defined as the Variable in the text above, and the Variable set of each relation in the query is a (hyper) edge ε of the graph. For example, for the triangular join of R1(A,B), R2(A,C), R3(B,C), the hypergraph is represented as follows. Here the Variable set contains `{A,B,C}`, and the hyperedge set contains `{{A,B}, {A,C}, {B,C}}`.

![](/content/en/why-matrixone-0-5-become-slower/picture12.jpg)

Factorization proposes a tree decomposition algorithm based on hypergraphs (Hyper Tree Decomposition). Tree decomposition is defined as a transformation on a hypergraph (V,ε) into a Pair (T,x), where T represents a tree, and x represents a function that maps each node in T to a subset of V, called a bag.

**The tree decomposition satisfies 2 properties:**

- Coverage: T needs to contain all hyperedges.
- Connectivity: All V form a connected subtree.

The right side of the figure below shows a tree decomposition result for the above query.

![](/content/en/why-matrixone-0-5-become-slower/picture13.jpg)

The purpose of the tree decomposition algorithm is to find a suitable Variable Order (mentioned above). Because the Variable Order can be expressed as a Pair (F, key), where F is a rooted tree with each Variable in the query Q corresponding to a node in the tree; key is a function that maps each Variable to a subset of its ancestor Variables in F. By determining the structure of the View Tree through the Variable Order, it determines the overall Join Order framework and execution for the query.

Therefore, factorization is different plans that optimizes query execution to establish an efficient join order framework. In the MatrixOne 0.2 code, the Variable Order and View Tree series algorithms of factorization were implemented, making it perform optimally for simple queries like SSB; in MatrixOne 0.4 code, the tree decomposition algorithm was implemented, giving relatively good performance for arbitrary table joins. This sounds good, but why did us remove these implementations from MatrixOne 0.5?

From the above introduction, you can also see that the entire factorization is a very unconventional computation framework — it has no logical plan and goes straight into execution, and can only follow its own logic, accompanied by a bunch of bizarre terminology like Variable/View Tree/Ring, etc. Such a weird framework makes it very difficult to handle richer SQL features, like when MatrixOne set the goal at the beginning of 0.5 to get TPCH running in two months. To continue using factorization, it needs an optimizer rule that can detect whether it satisfies the CAQ conditions; if so, it restructures the plan into a variable order for efficient execution. If not, uses the standard plan — for example, subqueries, CTEs, non-equijoins, future window functions, etc. required by TPCH.

Therefore, starting from version 0.5, MatrixOne developers re-implemented the SQL computation engine part after the Parser according to the standard MPP, including logical plans, optimizers and executors, and got TPCH running in just over two months.

Currently, MatrixOne has entered the 0.6 iteration cycle. In this cycle, the standard SQL execution engine needs to be accelerated, including subqueries, various non-equijoins, Runtime Filtering, Join Order (traditional left-deep tree), be comparable with other MPP engines.

So will factorization come back to MatrixOne? This is easy, because adding it is just an IF-ELSE. We first need to ensure the standard SQL engine works efficiently; secondly, as mentioned earlier, it comes from the IVM algorithm, while MatrixOne has touted the HSTAP slogan. Perhaps for S (Streaming), it is the stage for factorization algorithms.
