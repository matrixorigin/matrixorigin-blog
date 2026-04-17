---
title: How to Use Spark to Write Batch Data into MatrixOne
author: MatrixOrigin
mail: contact@matrixorigin.io
description: >-
  Apache Spark is a distributed computing engine designed for efficient
  processing of large-scale data. It employs distributed parallel computing,
  distributing tasks of data splitting, computing, and merging across multiple
  computers, thus achieving efficient data processing and analysis.
tags:
  - technology
keywords:
  - MatrixOne
  - Database
  - Database Kernel
  - SQL
  - HTAP Database
publishTime: '2024-04-19 17:00:00+00:00'
image:
  '1': >-
    /content/en/how-to-use-spark-to-write-batch-data-into-matrixone/how-to-use-spark-to-write-batch-data-into-matrixone.jpg
  '235': >-
    /content/en/how-to-use-spark-to-write-batch-data-into-matrixone/how-to-use-spark-to-write-batch-data-into-matrixone.jpg
date: '2024-04-19 17:00:00+00:00'
lang: en
status: published
---

## Overview

Apache Spark is a distributed computing engine designed for efficient processing of large-scale data. It employs distributed parallel computing, distributing tasks of data splitting, computing, and merging across multiple computers, thus achieving efficient data processing and analysis.

## Application Scenarios

### Large-scale Data Processing and Analysis

Spark can handle massive amounts of data and improves processing efficiency through parallel computing tasks. It is widely used in data processing and analysis in finance, telecommunications, healthcare, and other fields.

### Streaming Data Processing

Spark Streaming allows for real-time processing of data streams, transforming them into batch data suitable for analysis and storage. This is very useful in real-time data analysis scenarios such as online advertising and network security.

### Machine Learning

Spark includes a machine learning library (MLlib) that supports various machine learning algorithms and model training, used in applications such as recommendation systems and image recognition.

### Graph Computing

Spark's graph computing library (GraphX) supports various graph computing algorithms, suitable for scenarios such as social network analysis and recommendation systems.

This blog will introduce two examples of using the Spark computing engine to implement batch data writing into MatrixOne. One example involves migrating data from MySQL to MatrixOne, and the other involves writing Hive data into MatrixOne.

## Preliminary Preparations

### Hardware Environment

The hardware requirements for this practice are as follows:

![Hardware Environment](/content/en/how-to-use-spark-to-write-batch-data-into-matrixone/picture1.jpg)

### Software Environment

The following software environment needs to be installed and deployed for this practice:

1. MatrixOne has been installed and started.
2. Download and install IntelliJ IDEA version 2022.2.1 or above.
3. Download and install JDK 8 or higher.
4. If data needs to be imported from Hive, Hadoop and Hive must be installed.
5. Download and install MySQL Client 8.0.33.

## Example: Migrate Data from MySQL to MatrixOne

### Step One: Initialize the Project

1. Start IDEA, click File > New > Project, choose Spring Initializer, and fill in the following configuration parameters:

   - Name：mo-spark-demo
   - Location：~\Desktop
   - Language：Java
   - Type：Maven
   - Group：com.example
   - Artifact：matrixone-spark-demo
   - Package name：com.matrixone.demo
   - JDK 1.8

2. Add project dependencies, edit the contents of the `pom.xml` in the project root directory as follows:

   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <project xmlns="http://maven.apache.org/POM/4.0.0"
           xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
           xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
       <modelVersion>4.0.0</modelVersion>

       <groupId>com.example.mo</groupId>
       <artifactId>mo-spark-demo</artifactId>
       <version>1.0-SNAPSHOT</version>

       <properties>
           <maven.compiler.source>8</maven.compiler.source>
           <maven.compiler.target>8</maven.compiler.target>
           <spark.version>3.2.1</spark.version>
       </properties>

       <dependencies>
           <dependency>
               <groupId>org.apache.spark</groupId>
               <artifactId>spark-sql_2.12</artifactId>
               <version>${spark.version}</version>
           </dependency>

           <dependency>
               <groupId>org.apache.spark</groupId>
               <artifactId>spark-hive_2.12</artifactId>
               <version>${spark.version}</version>
           </dependency>
           <dependency>
               <groupId>org.apache.spark</groupId>
               <artifactId>spark-catalyst_2.12</artifactId>
               <version>${spark.version}</version>
           </dependency>
           <dependency>
               <groupId>org.apache.spark</groupId>
               <artifactId>spark-core_2.12</artifactId>
               <version>${spark.version}</version>
           </dependency>
           <dependency>
               <groupId>org.codehaus.jackson</groupId>
               <artifactId>jackson-core-asl</artifactId>
               <version>1.9.13</version>
           </dependency>
           <dependency>
               <groupId>org.codehaus.jackson</groupId>
               <artifactId>jackson-mapper-asl</artifactId>
               <version>1.9.13</version>
           </dependency>


           <dependency>
               <groupId>mysql</groupId>
               <artifactId>mysql-connector-java</artifactId>
               <version>8.0.16</version>
           </dependency>

       </dependencies>

   </project>
   ```

### Step Two: Read MatrixOne Data

After connecting to MatrixOne using the MySQL client, create the necessary databases and tables for the demonstration.

1. Create databases and tables in MatrixOne, and import data:
2. Create a `MoRead.java` class in IDEA to use Spark to read data from MatrixOne:

   ```java
   package com.matrixone.spark;

   import org.apache.spark.sql.Dataset;
   import org.apache.spark.sql.Row;
   import org.apache.spark.sql.SQLContext;
   import org.apache.spark.sql.SparkSession;

   import java.util.Properties;

   /**
   * @author MatrixOne
   * @desc 读取 MatrixOne 数据
   */
   public class MoRead {

       // parameters
       private static String master = "local[2]";
       private static String appName = "mo_spark_demo";

       private static String srcHost = "192.168.146.10";
       private static Integer srcPort = 6001;
       private static String srcUserName = "root";
       private static String srcPassword = "111";
       private static String srcDataBase = "test";
       private static String srcTable = "person";

       public static void main(String[] args) {
           SparkSession sparkSession = SparkSession.builder().appName(appName).master(master).getOrCreate();
           SQLContext sqlContext = new SQLContext(sparkSession);
           Properties properties = new Properties();
           properties.put("user", srcUserName);
           properties.put("password", srcPassword);
           Dataset<Row> dataset = sqlContext.read()
                   .jdbc("jdbc:mysql://" + srcHost + ":" + srcPort + "/" + srcDataBase,srcTable, properties);
           dataset.show();
       }

   }
   ```

3. Run `MoRead.Main()` in IDEA, and the execution result is as follows:

   ![](/content/en/how-to-use-spark-to-write-batch-data-into-matrixone/picture2.jpg)

### Step Three: Write MySQL Data into MatrixOne

Now you can start migrating MySQL data to MatrixOne using Spark.

1. Prepare MySQL data

   ```sql
   mysql -h127.0.0.1 -P3306 -uroot -proot
   mysql> CREATE DATABASE motest;
   mysql> USE motest;
   mysql> CREATE TABLE `person` (`id` int DEFAULT NULL, `name` varchar(255) DEFAULT NULL, `birthday` date DEFAULT NULL);
   mysql> INSERT INTO motest.person (id, name, birthday) VALUES(2, 'lisi', '2023-07-09'),(3, 'wangwu', '2023-07-13'),(4, 'zhaoliu', '2023-08-08');
   ```

2. ​On node3, use the MySQL client to connect to the local MySQL, create the required database and tables, and insert data. Since this example continues to use the test database from the previous example of reading MatrixOne data, we need to empty the person table first.

   ```sql
   mysql -h 192.168.146.10 -P 6001 -u root -p 111
   mysql> TRUNCATE TABLE test.person;
   ```

3. Code in IDEA

   Create `Person.java` and `Mysql2Mo.java` classes to read MySQL data using Spark.The `Mysql2Mo.java` class code can be seen in the following example:

   ```java
   package com.matrixone.spark;

   import org.apache.spark.api.java.function.MapFunction;
   import org.apache.spark.sql.*;

   import java.sql.SQLException;
   import java.util.Properties;

   /**
   * @author MatrixOne
   * @desc
   */
   public class Mysql2Mo {

       // parameters
       private static String master = "local[2]";
       private static String appName = "app_spark_demo";

       private static String srcHost = "127.0.0.1";
       private static Integer srcPort = 3306;
       private static String srcUserName = "root";
       private static String srcPassword = "root";
       private static String srcDataBase = "motest";
       private static String srcTable = "person";

       private static String destHost = "192.168.146.10";
       private static Integer destPort = 6001;
       private static String destUserName = "root";
       private static String destPassword = "111";
       private static String destDataBase = "test";
       private static String destTable = "person";


       public static void main(String[] args) throws SQLException {
           SparkSession sparkSession = SparkSession.builder().appName(appName).master(master).getOrCreate();
           SQLContext sqlContext = new SQLContext(sparkSession);
           Properties connectionProperties = new Properties();
           connectionProperties.put("user", srcUserName);
           connectionProperties.put("password", srcPassword);
           connectionProperties.put("driver","com.mysql.cj.jdbc.Driver");

           //jdbc.url=jdbc:mysql://127.0.0.1:3306/database
           String url = "jdbc:mysql://" + srcHost + ":" + srcPort + "/" + srcDataBase + "?characterEncoding=utf-8&autoReconnect=true&zeroDateTimeBehavior=convertToNull&useSSL=false&serverTimezone=Asia/Shanghai";

           //SparkJdbc read table
           System.out.println("read table person in database");
           Dataset<Row> rowDataset = sqlContext.read().jdbc(url,srcTable,connectionProperties).select("*");
           //show data
           //rowDataset.show();
           Dataset<Row> dataset = rowDataset.filter("id > 2")
                   .map((MapFunction<Row, Row>) row -> RowFactory.create(row.getInt(0), "spark_" + row.getString(1), row.getDate(2)), RowEncoder.apply(rowDataset.schema()));
           //show data
           //dataset.show();
           Properties properties = new Properties();
           properties.put("user", destUserName);
           properties.put("password", destPassword);;
           dataset.write()
                   .mode(SaveMode.Append)
                   .jdbc("jdbc:mysql://" + destHost + ":" + destPort + "/" + destDataBase,destTable, properties);
       }

   }
   ```

### Step Four: View Results

Execute the following SQL in MatrixOne to see the results:

```sql
select * from test.person;
+------+---------------+------------+
| id   | name          | birthday   |
+------+---------------+------------+
|    3 | spark_wangwu  | 2023-07-12 |
|    4 | spark_zhaoliu | 2023-08-07 |
+------+---------------+------------+
2 rows in set (0.01 sec)
```
