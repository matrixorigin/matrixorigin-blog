---
title: >-
  Go Language Advanced Practices: MatrixOne's Journey in Designing and
  Implementing High-Performance Hash Tables
author: Long Ran
mail: longran@matrixorigin.io
description: >-
  MatrixOne is a new generation of hyper-converged heterogeneous databases
  committed to creating a single architecture to handle mixed workloads such as
  OLTP, OLAP, streaming etc. MatrixOne is developed by Go language and has been
  open-sourced since October 2021. As a database implemented in Go competing
  with top-tier OLAP databases written in C++, MatrixOne has applied many
  optimizations including high-performance hash table implementation, which will
  be explained in detail in this article.
tags:
  - technology
keywords:
  - MatrixOne
  - Database
  - Hyper-Converged Database
  - OLTP
  - OLAP
publishTime: '2023-08-17 17:00:00+00:00'
image:
  '1': >-
    /content/en/how-matrixone-uses-go-language-to-design-and-implement-high-performance-hash-tables/how-matrixone-uses-go-language-to-design-and-implement-high-performance-hash-tables.png
  '235': >-
    /content/en/how-matrixone-uses-go-language-to-design-and-implement-high-performance-hash-tables/how-matrixone-uses-go-language-to-design-and-implement-high-performance-hash-tables.png
date: '2023-08-17 17:00:00+00:00'
lang: en
status: published
---

MatrixOne is a new generation of hyper-converged heterogeneous databases committed to creating a single architecture to handle mixed workloads such as OLTP, OLAP, streaming etc. MatrixOne is developed by Go language and has been open-sourced since October 2021. As a database implemented in Go competing with top-tier OLAP databases written in C++, MatrixOne has applied many optimizations including high-performance hash table implementation, which will be explained in detail in this article.

Github: [MatrixOne Repository](https://github.com/matrixorigin/matrixone)

## Hash Table Data Structure Basics

The Hash table is a very fundamental data structure and is critically important for the performance of grouping aggregations and joining queries in databases. Take the following grouping aggregation as an example (note, image reference from [1]):

```sql
SELECT col, count(*) FROM table GROUP BY col
```

![](/content/en/how-matrixone-uses-go-language-to-design-and-implement-high-performance-hash-tables/picture1.jpg)

It involves two processing stages: Stage 1 is to build a hash table using the data from the source. Each record in the hash table is associated with a counter. If the record is newly inserted, the associated counter is set to 1; otherwise, the counter is incremented. Stage 2 is to aggregate the records in the hash table into a format that can be used for further query processing.

For join queries, take the following SQL as an example:

![](/content/en/how-matrixone-uses-go-language-to-design-and-implement-high-performance-hash-tables/picture2.jpg)

```sql
SELECT A.left_col, B.right_col FROM A JOIN B USING (key_col)
```

It also has two stages: the first stage is to use the data from the right side table in the JOIN statement to build a hash table, and the second stage is to read data from the left side table, and quickly probe the hash table just built. The building stage is similar to the grouping implementation above, but each slot in the hash table stores a reference to the right column.

As you can see, hash tables play a critical role in the basic SQL capabilities of databases. This article discusses the basic design and the impact on hash table performance, compares various typical hash table implementations, and then introduces our design choices and engineering optimizations for the hash table we implemented in MatrixOne. Finally, we present some performance test cases and results.

We assume readers are already familiar with the hash table-related concepts, we will only focus on high performance design in this article. If you are unfamiliar with the basic concepts, please refer to Wikipedia or other resources.

## Basic Hash Table Design and Performance Impact

### Collision Handling

When different keys are mapped to the same bucket by the hash function, it is called a hash collision. The most common collision handling mechanisms in various implementations are chaining and open addressing.

### Chaining

In a hash table with chaining, each bucket stores a linked list, with different elements with the same hash value stored in the list. This is the approach commonly used in C++ standard containers.

Advantages:

- Simple and intuitive to implement
- Less space wasted

### Open Addressing

If a collision occurs during insertion, start from the bucket where the collision occurred, find an empty bucket in a predetermined order.

Advantages:

- More CPU cache friendly, only one pointer jump for each insertion or lookup
- less memory fragmentation, all data is stored in a contiguous memory block

When the max load factor is significant, performance is worse than chaining. However, when we sacrifice memory and choose a smaller max load factor (e.g., 0.5), the situation is reversed and open addressing performs better. This is because the probability of collisions is significantly reduced, and the cache-friendly advantage can stand out.

It's worth noting that C++ standard containers do not use open addressing as required by the C++ standard, not by performance considerations (see this [boost](https://www.boost.org/doc/libs/1_78_0/doc/html/unordered/rationale.html#unordered.rationale.data_structure) doc for details).

### Max Load Factor

A hash table with chaining refers to the upper limit of the average number of elements per bucket. For open addressing hash table, it refers to the maximum ratio of filled buckets to total buckets.

The smaller the max load factor, the lower the probability of collisions, and the more space wasted.

**Growth Factor**

It refers to the multiple of memory expansion when the filled buckets reach the upper limit defined by the max load factor and the hash table needs to rehash. The more significant the growth factor, the fewer times the hash table needs to rehash, but the more memory is wasted.

### Probing Methods for Empty Buckets

With open addressing, if another key already occupies the bucket returned by the hash function, we need to find an empty bucket in nearby buckets according to a preset rule.The most common methods are (assuming a total of |T| buckets and hash function H(k)):

- Linear probing: probe buckets H(k, i) = H(k) + ci mod |T| for i = 0, 1, 2… in order.
- Quadratic probing: probe H(k, i) = H(k) + c1i + c2i2 mod |T| for i = 0, 1, 2…. Where c2 cannot be 0, otherwise it degenerates to linear probing.
- Double hashing: use two different hash functions, probe H(k, i) = (H1(k) + i \* H2(k)) mod |T| in order.

Linear probing requires probing the most significant average number of buckets compared to other methods. However, linear probing always accesses memory sequentially, which is most cache-friendly. Therefore, linear probing is fastest when the collision probability is small (max load factor is small). Other more clever probing methods include cuckoo hashing, hopscotch hashing, and robin hood hashing (introduced in the Wikipedia page linked at the beginning). However, they are designed for larger max load factors (above 0.6). In practice, when max load factor = 0.5, their performance is inferior to the most basic linear probing.

## Some Common Hash Table Implementations

### C++ std::unordered_map/boost::unordered_map

For the reasons mentioned above, the chaining method is used to deal with collisions. Default max load factor = 1, growth factor = 2. Simple design, no need to elaborate.

### Go map

By reading the Golang library code, we know that the built-in map in Golang uses chaining.

### Swisstable

From Google's [abseil](https://abseil.io/blog/20180927-swisstables) library, a high performance hash table implementation for general purposes. Handles collisions with open addressing, and probes with quadratic probing within blocks. [Parallel-hashmap](https://github.com/greg7mdp/parallel-hashmap) and the hash table in Rust standard library are also based on swisstable. [More info here](https://zhuanlan.zhihu.com/p/277732297).

## Hash Table in ClickHouse

Uses open addressing and linear probing. The max load factor is 0.5, the growth factor is 4 when the number of buckets is less than 2²⁴, otherwise 2.

For keys as strings, ClickHouse also has a specialized hash table implementation that adapts based on string length, see [paper](https://www.researchgate.net/publication/339879042_SAHA_A_String_Adaptive_Hash_Table_for_Analytical_Databases) for details, not elaborated here.

### Efficient Hash Table Design and Implementation

MatrixOne is a database developed with Go. We couldn't directly use existing notable hash table implementations, and our initial implementation used Go's built-in map, which led to performance lagging behind ClickHouse by almost an order of magnitude for high cardinality grouping (e.g., multi-column grouping can easily reach high cardinality), and quite a bit slower for low cardinality. So we had to implement our own version.

### Basic Design and Parameter Selection

ClickHouse's hash table showed the highest performance in its own benchmarks, so borrowing its design was a natural choice. We replicated ClickHouse's following designs:

- Open addressing
- Linear probing
- max load factor = 0.5, growth factor = 4
- Integer hash function based on CRC32 instruction

The reasons are explained earlier — open addressing is better than chaining when the max load factor is small, and linear probing is superior to other probe methods.

And made the following modifications (optimizations):

- String hash function based on AESENC instruction
- Batch calculation of hash functions during insertion, lookup, and expansion
- Directly traverse the old table and insert it into the new table during the expansion
- ClickHouse first memcpy's the old table entirely into the new table, then adjusts positions by traversing. We didn't find the rationale for this design, and our approach tested to be faster.

### Hash Functions

The role of hash functions is to map arbitrary keys to an address in the hash table, and is the first step in insertion and lookup. Hash functions used in database scenarios should satisfy:

- Be as fast as possible
- Scramble as evenly as possible (avoid clustering) to minimize collision probability. Also ensures even partitioning if the hash table is partitioned.
- No need to consider cryptographic security
- In ClickHouse's implementation, the CRC32 instruction available on modern CPUs (amd64 or arm64) is mainly used to implement the hash function.

```go
inline DB::UInt64 intHashCRC32(DB::UInt64 x)
{
#ifdef __SSE4_2__
  return _mm_crc32_u64(-1ULL, x);
#elif defined(__aarch64__) && defined(__ARM_FEATURE_CRC32)
  return __crc32cd(-1U, x);
#else
    /// On other platforms we do not have CRC32. NOTE This can be confusing.
  return intHash64(x);
#endif
}
```

Empirical tests show the scrambling effect is perfect, and each 64-bit integer only requires one CPU instruction, already reaching the theoretical limit, much faster than xxhash, Murmur3 and other "ordinary" hash functions without using special instructions.

Our integer hash function is implemented using the same approach.

```text
TEXT ·Crc32Int64Hash(SB), NOSPLIT, $0-16
  MOVQ   $-1, SI
  CRC32Q data+0(FP), SI
  MOVQ   SI, ret+8(FP)

  RET
```

It's worth noting that Go does not have intrinsic functions like C/C++/Rust, so to use certain special instructions, we have to implement them ourselves using Go assembly. Also, Go assembly functions currently cannot be inlined, so to maximize performance, we need to batch the process of computing hash functions, details to be covered in a later article.

The SSE4.2 instruction set containing CRC32 first appeared in 2008 with the Nehalem CPU architecture. So we assume users' CPUs should support this instruction, since older devices don't seem suitable for running an HTAP database anyway.

For string hash functions, ClickHouse still uses CRC32. After research, we chose to implement based on the AESENC instruction, which is part of the AES-NI instruction set first introduced by Intel in 2010 with the Westmere architecture. A single AESENC instruction performs one round of the AES encryption process, processing 128-bit data per instruction on average. AESENC is faster than CRC32, and provides a 128-bit result, suitable for more use cases (CRC32 is only 32 bits). Empirical tests show hash functions based on AESENC also have excellent scrambling effects. There are already many hash functions implemented using AESENC online, e.g. [nabhash](https://github.com/mengzhuo/nabhash), [meowhash](https://github.com/cmuratori/meow_hash), [aHash](https://github.com/tkaitchuck/aHash). Our implementations are [here (amd64)](https://github.com/matrixorigin/matrixone/blob/6c57eceb783fefbc3b62c8c896918e33928921e4/pkg/container/hashtable/hash_amd64.s#L176) and [here (arm64)](https://github.com/matrixorigin/matrixone/blob/6c57eceb783fefbc3b62c8c896918e33928921e4/pkg/container/hashtable/hash_arm64.s#L178).

### Special Optimizations

For string keys, we used a very unconventional design: do not store the original keys in the hash table, but instead store two different hash values based on AESENC, one 64-bit result as the hash value, the other 128-bit result as the “key”. The 192 bits plus a 64-bit value gives a bucket width of exactly 32 bytes, which can be perfectly cacheline aligned. During collision handling, we compare this 192-bit data instead of the original keys. The probability of two different strings having both hash values collide is extremely low and can be ignored in OLAP systems. The advantage is turning variable length string comparison into comparing 3 fixed length 64-bit integers, and also saves one pointer jump, greatly speeding up collision detection.

Code snippet:

```go
type StringHashMapCell struct {
  HashState [3]uint64
  Mapped    uint64
}

...

func (ht *StringHashMap) findCell(state *[3]uint64) *StringHashMapCell {
  mask := ht.cellCnt - 1
  idx := state[0] & mask
  for {
    cell := &ht.cells[idx]
    if cell.Mapped == 0 || cell.HashState == *state {
      return cell
    }
    idx = (idx + 1) & mask
  }
  return nil
}
```

### Implementation Code

[matrixone/pkg/container/hashtable at main · matrixorigin/matrixone · GitHub](https://github.com/matrixorigin/matrixone/tree/main/pkg/container/hashtable)

## Performance Testing

### Testing Environment

- CPU: AMD Ryzen 9 5900X
- Memory: DDR4–3200 32GB
- OS: Manjaro 21.2
- Kernel version: 5.16.11
- Data: 1 billion rows Yandex.Metrica dataset provided by ClickHouse

### Test Contents

Each test inserts 1 billion records sequentially, then lookups at 1 billion records in the same order. The process is similar to the code snippet below:

```go
...
// Insert
for (auto k : data) {
  hash_map.emplace(k, hash_map.size() + 1);
}
...
// Find
size_t sum = 0;
for (auto k : data) {
  sum += hash_map[k]
}
...
```

### Integer Key Results

The table below shows the time in milliseconds (ms) taken by some hash table implementations to insert/find different attributes of the Yandex.Metrica dataset.

[GitHub — sparsehash/sparsehash: C++ associative containers](https://github.com/sparsehash/sparsehash)

[abseil-cpp/absl/container at master · abseil/abseil-cpp · GitHub](https://github.com/abseil/abseil-cpp/tree/master/absl/container)

[GitHub — Tessil/hopscotch-map: C++ implementation of a fast hash map and hash set using hopscotch hashing](https://github.com/Tessil/hopscotch-map)

[GitHub — Tessil/robin-map: C++ implementation of a fast hash map and hash set using robin hood hashing](https://github.com/Tessil/robin-map)

[GitHub — Tessil/sparse-map: C++ implementation of a memory efficient hash map and hash set](https://github.com/Tessil/sparse-map)

It can be seen that when cardinality is very small, ClickHouse implementation is the fastest. MatrixOrigin implementation is the fastest when cardinality increases, and the bigger the cardinality, the bigger the lead.

### String Key Results

The results are similar to integer keys, our implementation leads more as cardinality increases.

### Summary

The above performance test results have far exceeded our initial expectations. Starting from porting ClickHouse's built-in hash table, we expected that due to language differences, we could at best achieve 70–80% of the performance of the C++ original. Through repeated iterations of optimizations, and constantly trying to change some of ClickHouse's original designs, we have surprisingly surpassed the C++ version in hash table insertion and lookup performance.

This shows that even for some very basic data structures that are thoroughly researched, through careful design for specific application scenarios and partial assembly acceleration, Go implementations can match the performance of C/C++/Rust versions. This gives us more confidence in using Go to develop high performance databases.

## Reference

Tianqi Zheng, Zhibin Zhang, and Xueqi Cheng. 2020. SAHA: A String Adaptive Hash Table for Analytical Databases. Applied Sciences 10, 6 (2020).[https://www.mdpi.com/2076-3417/10/6/1915](https://www.mdpi.com/2076-3417/10/6/1915)
