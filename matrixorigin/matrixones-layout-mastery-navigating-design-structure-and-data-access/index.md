---
title: 'MatrixOne''s Layout Mastery: Navigating Design, Structure, and Data Access'
author: MatrixOrigin
mail: contact@matrixorigin.io
description: >-
  This week's article might be a bit long. But we provide an in-depth look at
  MatrixOne's columnar storage layout, examining its design, structure, and data
  access methods since version 0.5. We focus on the rationale for its columnar
  approach, addressing the layout's design challenges, and exploring its
  adaptability for diverse workloads.
tags:
  - technology
keywords:
  - MatrixOne
  - Database
  - Relational Database
  - Database Kernal
  - Cloud-Native Database
publishTime: '2024-01-05 17:00:00+00:00'
image:
  '1': >-
    /content/en/matrixones-layout-mastery-navigating-design-structure-and-data-access/matrixones-layout-mastery.png
  '235': >-
    /content/en/matrixones-layout-mastery-navigating-design-structure-and-data-access/matrixones-layout-mastery.png
date: '2024-01-05 17:00:00+00:00'
lang: en
status: published
---

This week's article might be a bit long. But we provide an in-depth look at MatrixOne's columnar storage layout, examining its design, structure, and data access methods since version 0.5. We focus on the rationale for its columnar approach, addressing the layout's design challenges, and exploring its adaptability for diverse workloads.

- Part 1. Conditions to be Met by Layout and Problems to be Solved
- Part 2. Structure Analysis
- Part 3. Reading Data through Extent
- Part 4. Version Compatibility

Since the design phase of version 0.5, MatrixOne has been determined to use a columnar storage structure for datasets, for the following reasons:

It's easily optimized for Analytical Processing (AP);

Introducing the concept of Column Family allows for flexible adaptation to workloads. If all columns form a single Column Family, meaning all column data is stored together, it is very similar to a database's HEAP file, exhibiting behavior akin to row-based storage. Typical OLTP databases like PostgreSQL are based on HEAP for their storage engines. If each column is an independent Column Family, meaning each column is stored separately, then it is a typical columnar storage. By defining Column Family, users can easily switch between row-based and columnar storage, which can be specified in the DDL table definition.

## Part 1: Conditions to be Met by Layout and Problems to be Solved

When designing a layout, the first question to ask is:

**_What functions and requirements do we need to fulfill?_**

### Feature 1: Supports storage of all business type data in MatrixOne.

For MatrixOne, there are many types of data that need to be stored, such as: database table data, metadata, database business trace logs, query result caches, and so on…

### Feature 2: Convenient and efficient metadata.

MatrixOne needs to interface with S3 or shared object storage, where each object stores a set of data with specified number of rows or size; thus, an object stores multiple data units, each referred to as a Block. These Blocks require efficient reading and management. For instance, to determine which Blocks to read for a query, one must first obtain and analyze the metadata of the Blocks, and then use this metadata to locate and read the actual data.

### Feature 3: Supports data version compatibility and control.

When MatrixOne has been operational for a while and customer demands increase, it becomes necessary to modify the current Layout.

### Feature 4: Supports reconstructing MatrixOne's table structure from data object files.

Supports data analysis tools and the addition of Scrub tasks.

![](/content/en/matrixones-layout-mastery-navigating-design-structure-and-data-access/picture1.jpg)

Based on the aforementioned issues, we designed the current Layout, which consists of the Header, Data Area, Index Area, Metadata Area, and Footer.

The **Header** records information such as the current Layout's version and the location of the Metadata Area.

The **Data Area** stores the data information of the data objects.

The **Index Area** stores the index information of the data objects.

The **Metadata Area** stores the metadata information of the data objects, including the type of data objects, size, number of rows, number of columns, compression algorithms, etc.

The **Footer** can be considered as a mirror image of the Header.

## Part 2 Structural Analysis

### Extent

In MatrixOne, an Extent is responsible for recording the location information of an IOEntry.

```text
+------------+----------+-------------+-------------+
| Offset(4B) | Size(4B) |  OSize (4B) |  Algo (1B)  |
+------------+----------+-------------+-------------+
Offset = The starting address of the IOEntry
Size = The size of the IOEntry stored in the object
oSize = The original size of the IOEntry before compression
Algo = Type of compression algorithm
```

### ObjectMeta

Why do we introduce ObjectMeta before the Header? It's because MatrixOne's query operations start with ObjectMeta. After MatrixOne successfully writes data to S3, it returns an Extent recording the location of ObjectMeta, which is saved in the Catalog. When MatrixOne performs a query operation and needs to read data, it can obtain ObjectMeta through this Extent, thereby accessing the actual data of the Block.

ObjectMeta consists of multiple BlockMetas, a MetaHeader, and a BlockIndex. MetaHeader and BlockMeta have the same structure and are used to record the global information of the entire Object, such as dbID, TableID, ObjectName, and global data attributes of the Object like ZoneMap, Ndv, nullCut, etc.

BlockIndex records the address of each subsequent BlockMeta. ObjectMeta is frequently used in the MatrixOne system. Although the address of each BlockMeta can be computed through iteration, to save on costs and improve performance, the BlockIndex is recorded.

BlockMeta records the metadata information of each Block.

### BlockMeta & MetaHeader

BlockMeta consists of a Header and multiple ColumnMetas.

The Header records information such as BlockID, Block Rows, and Column Count.

ColumnMeta records information for each column, such as the data address, Null Count (the number of Null values in the current column), and Ndv (the number of distinct values in the current column).

**>>>_Block Meta Header_**

```text

+----------------------------------------------------------------------------------------------------+
|                                              Header                                                |
+----------+------------+-------------+-------------+------------+--------------+--------------------+
| DBID(8B) | TableID(8B)|AccountID(4B)|BlockID(20B) |  Rows(4B)  | ColumnCnt(2B)| BloomFilter(13B)   |
+----------+------------+-------------+-------------+------------+--------------+--------------------+
|                                            Reserved(37B)                                           |
+----------------------------------------------------------------------------------------------------+
|                                             ColumnMeta                                             |
+----------------------------------------------------------------------------------------------------+
|                                             ColumnMeta                                             |
+----------------------------------------------------------------------------------------------------+
|                                             ColumnMeta                                             |
+----------------------------------------------------------------------------------------------------+
|                                             ..........                                             |
+----------------------------------------------------------------------------------------------------+

DBID = Database id
TableID = Table id
AccountID = Account id
BlockID = Block id
Rows = In MetaHeader, it represents the number of rows for the object; in BlockMeta, it represents the number of rows for the current Block
ColumnCnt = The number of columns in the object or Block
BloomFilter = Stores the address of the BloomFilter area, only valid in MetaHeader
 >>> Column Meta
```

**_>>> Column Meta_**

```text
+--------------------------------------------------------------------------------+
|                                    ColumnMeta                                  |
+--------+---------+-------+-----------+---------------+-----------+-------------+
|Idx(2B) |Type(1B) |Ndv(4B)|NullCnt(4B)|DataExtent(13B)|Chksum(4B) |ZoneMap(64B) |
+--------+---------+-------+-----------+---------------+-----------+-------------+
|                                   Reserved(32B)                                |
+--------------------------------------------------------------------------------+

Idx =  The sequence number of the Column
Ndv = The number of distinct values in the Column
NullCnt = The number of Null values in the Column
DataExtent = The location of the Column's data
Chksum = The checksum of the Column's data
ZoneMap = The ZoneMap of the Column, fixed in size at 64 bytes
```

**_>>> Header_**

The Header and Footer record the same information, only their positions differ.

```text
+---------+------------+---------------+----------+
|Magic(8B)| Version(2B)|MetaExtent(13B)|Chksum(4B)|
+---------+------------+---------------+----------+
Magic = Engine identity (0x0xFFFFFFFF)
Version = The version number of the object file
MetaExtent = The location information of ObjectMeta
Chksum = ObjectMeta's checksum
```

**_>>> Footer_**

```text
+----------+----------------+-----------+----------+
|Chksum(4B)| MetaExtent(13B)|Version(2B)| Magic(8B)|
+----------+----------------+-----------+----------+
```

## Part 3 Reading Data Through Extent

In discussing ObjectMeta, we know that after MatrixOne successfully writes data to S3, it returns an Extent that records the location of ObjectMeta. At this point, we will use the Extent to perform data reading operations.

First, using the address in the Extent, a request is made to S3 to read an IO Entry, which is then placed into MatrixOne's cache. This IO Entry is the entire content of ObjectMeta. By computing the offset, the BlockIndex can be obtained, and the BlockMeta to be read can be determined from the Extent recorded in BlockIndex. With this, our metadata operation is complete, and what remains is to request S3 to read each Column Data.

```text
 +-----------+
      |   Extent  |
      +-----------+
            |
            |
+-------------------------+
|        IO Entry         |
+-------------------------+
|       ObjectMeta        |
+-------------------------+
            |
            |
+---------------------------------------------------------------------
|                            BlockIndex                              |
+--------+------------+------------+------------+-----------+--------+
| Count  | <Extent-1> | <Extent-2> | <Extent-3> | Extent-4> | ...... |
+--------+------------+------------+------------+-----------+--------+
               |                                       |
               |                                       |
+------------------------------------------------+     |
|             Block1(BlockMeta)                  |     |
+--------------+--------------+--------------+---+     |
|<ColumnMeta-1>|<ColumnMeta-2>|<ColumnMeta-3>|...|     |
+--------------+--------------+--------------+---+     |
        |               |               |              |
        |               |               |       +------------------+
  +----------+    +----------+    +----------+  | Block4(BlockMeta)|
  | IO Entry |    | IO Entry |    | IO Entry |  +------------------+
  +----------+    +----------+    +----------+  | <ColumnMeta>...  |
  |ColumnData|    |ColumnData|    |ColumnData|  +------------------+
  +----------+    +----------+    +----------+          |
                                                        |
                                                +------------------+
                                                |    IO Entry...   |
                                                +------------------+
```

## Part 4 Version Compatibility

**_>>> IOEntry_**

IOEntry represents an IO unit, which specifically corresponds to the following in the Layout: ObjectMeta, data of each Column, BloomFilter area, and the Header and Footer. Apart from the Header and Footer, **two flags: Type & Version, need to be added to the head of each IOEntry.**

Each structure or module needs to implement Encode/Decode functions and then register them in MatrixOne. After reading an IOEntry, MatrixOne will select the corresponding code based on these two flags.

```go
const (
  IOET_ObjectMeta_V1  = 1
  IOET_ColumnData_V1  = 1
  IOET_BloomFilter_V1 = 1
  ...

  IOET_ObjectMeta_CurrVer  = IOET_ObjectMeta_V1
  IOET_ColumnData_CurrVer  = IOET_ColumnData_V1
  IOET_BloomFilter_CurrVer = IOET_BloomFilter_V1
)

const (
        IOET_Empty   = 0
        IOET_ObjMeta = 1
        IOET_ColData = 2
        IOET_BF      = 3
        ...
)
```

Taking ObjectMeta as an example. We need to register the Encode/Decode function code for version V1, set IOET_ObjectMeta_CurrVer to V1, and then write the data.

```go
const (
    IOET_ObjectMeta_V1  = 1
    IOET_ObjectMeta_V2  = 2
    ...

    IOET_ObjectMeta_CurrVer  = IOET_ObjectMeta_V2
    ...
)

func EncodeObjectMetaV2(meta *ObjectMeta) []byte {
  ...
}
func DecodeObjectMetaV2(buf []byte) *ObjectMeta {
        ...
}
RegisterIOEnrtyCodec(IOET_ObjMeta,IOET_ObjectMeta_V2,EncodeObjectMetaV2,DecodeObjectMetaV2)
ObjectMeta.Write(IOET_ObjMeta, IOET_ObjectMeta_CurrVer)
```

We're really keen to hear your thoughts and answer any questions you might have. Join newly launched Discord community [MatrixOrigin Community](https://discord.gg/taTffjxARw), Engaging in lively discussions, gaining early access to updates, and collaborating with a growing network of database enthusiasts and experts.”
