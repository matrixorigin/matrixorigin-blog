---
title: 'Push or Pull, Is This a Question?'
author: Yan Wenze
mail: yanwenze@matrixorigin.io
description: >-
  The SQL execution engine of the database is responsible for processing and
  executing SQL requests. Generally, the query optimizer outputs a physical
  execution plan, which is usually composed of a series of operators. To ensure
  efficient execution, operators need to be composed into a pipeline.
tags:
  - technology
keywords:
  - MatrixOne
  - Database
  - Distributed Database
  - Cloud-Native
  - Database Kernel
publishTime: '2023-08-07 17:00:00+00:00'
image:
  '1': /content/en/push-or-pull/push-or-pull.png
  '235': /content/en/push-or-pull/push-or-pull.png
date: '2023-08-07 17:00:00+00:00'
lang: en
status: published
---

The SQL execution engine of the database is responsible for processing and executing SQL requests. Generally, the query optimizer outputs a physical execution plan, which is usually composed of a series of operators. To ensure efficient execution, operators need to be composed into a pipeline.

There are two ways to build a pipeline: the first is the demand-driven pipeline, where an operator continuously pulls the next data tuple from the downstream operator; the second is the demand-driven pipeline, where an operator pushes each data tuple to the next operator. So, which type of pipeline construction is better? This may not be an easy question to answer. Snowflake’s paper mentions that push-based execution improves cache efficiency by removing control flow logic from data loops. It also allows Snowflake to effectively handle DAG plans of pipelines, creating additional opportunities for sharing and pipelining of intermediate results.

![](/content/en/push-or-pull/picture1.jpg)

The following figure from reference [1] illustrates the difference between Push and Pull most directly:

In simple terms, the Pull pipeline is based on the iterator model, and the classic volcano model is based on Pull. The volcano model is a mature SQL execution solution in databases. This design pattern abstracts each operation in relational algebra as an operator. In this case, the entire SQL statement forms an operator tree (execution plan tree) in this case; by calling the next interface in a top-down manner, the volcano model can process data on a database row basis, as shown in the `next()` method in the figure. This request is recursively called until the leaf node of the query plan tree can access the data itself. Therefore, for the Pull model, this is very easy to understand and implement: each operator needs to implement the `next()` method, and the recursive call is made once the query plan tree is constructed.

The volcano model has the following characteristics:

1. Process data row by row, where each row of data is processed by invoking the next interface.
2. Invoking the next interface requires a virtual function mechanism. Virtual functions require more CPU instructions than direct function calls and are more expensive.
3. Processing data on a per-row basis leads to inefficient CPU cache utilization and unnecessary complexity. The database needs to keep track of which row is being processed in order to move to the next row. Additionally, after processing a row, the next row needs to be loaded into the CPU cache. However, the CPU cache can store more than just one row of data.
4. The most significant advantage of the volcano model is that the interface looks clean and easy to understand. Since data flow and control flow are combined, each operator has a clear abstraction. For example, a Filter operator only needs to focus on how to filter data based on predicates, an Aggregates operator only need to focus on how to aggregate data.

To reduce overhead, the Pull model can introduce vectorized acceleration by implementing the `GetChunk()` method to retrieve a batch of data instead of fetching one row at a time, using the Projection operator as an example:

```go
void Projection::GetChunk(DataChunk &result) {
    // get the next chunk from the child        child->GetChunk(child_chunk);
    if (child_chunk.size() == 0) {
        return;
    }
    // execute expressions        executor.Execute(child_chunk, result);
}
```

In this code snippet, there are some control flow-related lines that are coupled with the operator's processing logic. Each operator implementation needs to include such code. For example, there is a need to check if `child_chunk` is empty because the child has performed filtering during the `GetChunk` operation. Therefore, the internal implementation of the Pull model's interface can be redundant and prone to errors.

Unlike the iterator model in the Pull pipeline, the Push model has a reversed data flow and control flow. Specifically, instead of the destination Operator requesting data from the source Operator, data is pushed from the source Operator to the destination Operator by the source Operator passing data as parameters to the consumption method (Consume) of the destination Operator. Therefore, the Push pipeline model is equivalent to the Visitor model, where each Operator no longer provides next, but is replaced by Produce/Consume. The Push model was proposed by Hyper [3], called Pipeline Operator. Its original intention is that the iterator model is Operator-centric, the boundaries of Operators are too clear, resulting in data transfer (from CPU register to memory) between Operators generating additional memory bandwidth overhead, and unable to maximize Data Locality. Therefore, execution needs to switch from Operator-centric to data-centric, keeping ingdata in registers as long as possible to ensure maximum Data Locality. Furthermore, Hyper introduced the NUMA scheduling framework of the operating system into the query execution scheduling of databases [2], implementing parallelism-awareness for the Push model:

Use Pipeline to combine operators and perform bottom-up Push scheduling. When a task finishes execution, it will notify the scheduler to enqueue subsequent tasks. Each data block unit is called a Morsel, containing about 10,000 rows of data. The execution unit of a query task is to process one Morsel.

Prioritize scheduling subsequent tasks generated by a task on the same core to avoid inter-core data communication overhead.

When a core is idle, it has the ability to "steal" a task from other cores to execute (Work Stealing). Although this may sometimes increase data transfer overhead, it relieves the accumulation of tasks on busy cores, and overall accelerates task execution.

When a core is idle and able to steal work, the scheduler does not immediately satisfy the idle core’s request, but lets it wait for a while. During this time, if busy cores can complete their own tasks, then cross-core scheduling can be avoided.

Take multi-table Join as an example:

```sql
SELECT ...
FROM SJOIN R USING A
JOIN T USING B;
```

![](/content/en/push-or-pull/picture2.jpg)

This query consists of multiple Pipelines, Pipelines need to be parallel between each other, and also parallel inside the Pipeline. In practice, controlling parallelism only needs to happen at the endpoints of the Pipeline. For example, in the above diagram, intermediate operators like Filter do not need to consider parallelism themselves, because the source TableScan will Push data to it, and the Sink of the Pipeline is Hash Join, whose Hashtable Build phase needs to be parallelism-aware, but the Probe phase(stage?) does not need to be. Basing on Push to control the parallelism-awareness of Pipelines makes it technically easier.

While it is relatively easy to implement parallelism-awareness in the Push model, why is it not so easy in the Pull model? Since scheduling is top-down rather than data driven, a direct idea is to partition, and then the optimizer generates physical plans according to the partitioning, executing the physical plans of different partitions in parallel. This can easily lead to more complex query plans (introducing more partitions), and it is not easy to achieve automatic load balancing, specifically: when partitioning the input data, after some Operators (like Filter), the amount of data retained in different partitions can vary a lot, thus subsequent operators will face data skew problems. In addition,different CPUs may spend different amounts of time processing the same amount of data. Various factors such as environmental interference, task scheduling, blocking, errors, etc., can slow down or even terminate the processing, thereby reducing overall efficiency.

Hyper's Push model was proposed in 2011. Before that, most SQL engines adopted the volcano Pull model based on iterators. It is known that systems built based on Push include Presto, Snowflake, Hyper, QuickStep, HANA, DuckDB (switched from Pull model to Push model in October 2021, see reference [4]), Starrocks, etc.

ClickHouse is an outlier, in its own Meetup materials, it claims to be a combination of Pull and Push, where the query uses the Pull model. Also, in its code, it uses the Pull term as well, as the core driver of query scheduling — PullingAsyncPipelineExecutor. After generating the QueryPlan (logical plan) from the AST, and applying some RBO optimizations, ClickHouse converts the QueryPlan into Pipelines in postorder traversal, which generates Pipelines very similar to the Push model, because each Operator (ClickHouse calls it Processor) in the Pipeline has inputs and outputs, the Operator Pulls data from input, processes it, and Pushes to the next Operator in the Pipeline. Therefore, ClickHouse is not a traditional volcano Pull model implementation, but generates Pipeline execution plans from the query plan tree. The method of generating Pipelines from the Plan Tree of the volcano Pull model is postorder traversal, starting from Nodes without Children to construct the first Pipeline, which is the standard approach to generate Pipeline Operators in the Push model:

```go
QueryPipelinePtr QueryPlan::buildQueryPipeline(...){
    struct Frame
    {
        Node * node = {};
        QueryPipelines pipelines = {};
    };
    QueryPipelinePtr last_pipeline;
    std::stack<Frame> stack;
    stack.push(Frame{.node = root});
    while (!stack.empty())
    {
        auto & frame = stack.top();
        if (last_pipeline)
        {
            frame.pipelines.emplace_back(std::move(last_pipeline));
            last_pipeline = nullptr;
        }
        size_t next_child = frame.pipelines.size();
        if (next_child == frame.node->children.size())
        {
            last_pipeline = frame.node->step->updatePipeline(std::move(frame.pipelines), build_pipeline_settings);
            stack.pop();
        }
        else
            stack.push(Frame{.node = frame.node->children[next_child]});
    }
    return last_pipeline;
}
```

Next is Pipeline scheduling. First `PullingAsyncPipelineExecutor::pull` pulls data from the Pipeline:

```go
PullingAsyncPipelineExecutor executor(pipeline);
    Block block;
    while (executor.pull(block, ...))
    {
        if (isQueryCancelled())
        {
            executor.cancel();
            break;
        }
        if (block)
        {
            if (!state.io.null_format)
                sendData(block);
        }
        sendData({});
    }
```

When pull is called, a thread is selected from the `thread_group`, then data.executor->execute(`num_threads`) executes the `PipelineExecutor`, where `num_threads` indicates the number of parallel threads. Next, `PipelineExecutor` converts the Pipeline into an `ExecutingGraph` for physical scheduling and execution. The pipeline is a logical structure, it does not care about how to execute, while `ExecutingGraph` is the physical reference for scheduling and execution. `ExecutingGraph` converts the `InputPort` and `OutputPort` of Pipeline Operators into Edges, using Edges to connect 2 Operators, Operator is the Node of the graph. After that is `PipelineExecutor::execute` which schedules the Pipeline via the `ExecutingGraph`, the main functionality of this function is to schedule tasks by popping `ExecutingGraph::Node` execution plans from the `task_queue`. During scheduling, threads keep traversing the `ExecutingGraph`, scheduling execution based on Operator execution states, until all Operators reach the finished state. Scheduler initialization picks all Nodes in `ExecutingGraph` without `OutPort` to start, hence, control flow originates from the Sink Node of the Pipeline, recursively calling `prepareProcessor`.This differs from the Push model where the control flow starts from the Source Node and propagates level by level. Apart from the difference in the control flow direction, this Pipeline Operator is identical to Push, thus some people also categorize ClickHouse into the Push model, after all, in many literature contexts, Push is equivalent to Pipeline Operator, and Pull is equivalent to Volcano. The correspondence between Pipeline and ExecutingGraph is shown below (in ClickHouse, Operator=Processor=Transformer):

![](/content/en/push-or-pull/picture3.jpg)

Therefore, the Push model is parallelism-aware, which essentially requires designing a scheduler that controls data flow and parallelism well. In addition to the aforementioned advantages, the naive Push model also has some disadvantages: handling Limit and Merge Join is difficult (see reference [1]), for the former, the Operator cannot easily control when the source Operator stopsproducing data, thus some elements may be produced but never used. For the latter, since the Merge Join Operator cannot know which source Operator generates the next data Tuple, Merge Join cannot be pipelined, so Pipeline Breaker is needed for at least one of the source Operators, requiring materialization. The essence of these two problems is still the Pipeline scheduling problem in the Push model: how consumers control producers. Apart from Limit and Merge Join, other operations like terminating a query in progress face the same situation. Just like separating the query plan tree from Pipeline enables parallelism-awareness for the Pull model, the Push model does not necessarily have to be implemented exactly as described in papers where only the Pipeline source can be controlled. By introducing mechanisms like ClickHouse’s task_queue, the Push model can similarly achieve level-by-level control of source Operators.

MatrixOne is implemented in Golang, so it directly leverages Go language features to realize the Push model: using channels as blocking message queues to notify producers. A query plan consists of multiple Operators, the pipeline is an execution sequence containing multiple Operators. Operator represents a specific operation, such as a typical Filter, Project, Hash Build and Hash Probe. For a query plan, first determine how many pipelines, how many CUPs, and which pipelines each CUP runs. Specifically, with Golang language features: one pipeline corresponds to one goroutine, pipelines communicate via channels (no buffer), and pipeline scheduling is also driven by channels. An example is as follows:

```go
Connector Operatorfunc Call(proc *process.Process, arg interface{}) (bool, error) {
    // ...
    if inputBatch == nil {
        select {
        case <-reg.Ctx.Done():
            process.FreeRegisters(proc)
            return true, nil
        case reg.Ch <- inputBatch:
            return false, nil
        }
    }
}
```

Since it is a Push model, a query plan triggers the entire process through the Producer Pipeline. Non-producer Pipelines will not run if they have not received data. After the Producer Pipeline starts, it will try to read data, then send the data to another Pipeline via channels. The Producer Pipeline will keep reading data after it starts, it will only exit in two cases:

- Data reading is complete
- Error occurs

When a non-producer pipeline does not read the data pushed by the Producer Pipeline from the channel, the Producer Pipeline will block. Non-producer Pipelines do not execute immediately after startup, unless the Producer Pipeline has placed data in the channel. Pipelines exit after startup under two circumstances:

- Received exit message from the channel
- Error occurs

MatrixOne will allocate Producer Pipelines to specific nodes based on data distribution. After receiving the Producer Pipeline, the specific node will derive multiple Producer pipelines based on the current machine status and query plan (current machine core count). The parallelism of other Pipelines is determined when receiving data.

Let’s look at a simple query first:

```sql
select * from R where a > 1 limit 10
```

![](/content/en/push-or-pull/picture4.jpg)

This query has a Limit Operator, meaning there are termination conditions for the Pipeline like Cancel, Limit, Merge Join mentioned above. The Pipeline for this query is shown below, executing in parallel on 2 Cores.

Due to the existence of Limit, the Pipeline introduces the Merge Operator. At the same time, scheduling related issues are:

- Merge cannot accept data from multiple Pipelines without limit. Merge needs to send a channel message to upstream to stop data reading based on memory size through the Connector.
- The number of Pipelines is determined dynamically based on CPU count. When Pipelines stop pushing data, the query naturally terminates, so Merge needs to flag whether transmission has ended.

Let’s look at a more complex example, tpch-q3:

```sql
select
    l_orderkey,
    sum(l_extendedprice * (1 - l_discount)) as revenue,
    o_orderdate,
    o_shippriorityfrom
    customer,
    orders,
    lineitemwhere
    c_mktsegment = 'HOUSEHOLD'
    and c_custkey = o_custkey
    and l_orderkey = o_orderkey
    and o_orderdate < date '1995-03-29'
    and l_shipdate > date '1995-03-29'group by
    l_orderkey,
    o_orderdate,
    o_shippriorityorder by
    revenue desc,
    o_orderdatelimit 10
```

Assume the query plan is as follow:

![](/content/en/push-or-pull/picture5.jpg)

Assume the data of these three tables are evenly distributed on two nodes, node0 and node1, then the corresponding Pipelines are as follows:

![](/content/en/push-or-pull/picture6.jpg)

Adopting the Push model also has a potential advantage in maintaining consistency with the Data Flow paradigm of stream computing (such as Flink). FlinkSQL will convert each Operator in the query plan into a streaming Operator, streaming Operators will pass the updates of each Operator’s computation results to the next Operator, which is logically consistent with the Push model. For MatrixOne, which intends to implement a streaming engine internally, this is a place for logical reuse. Of course, implementing a streaming engine is far from just relying on the Push model, which is beyond the scope of this article. One last potential advantage of using the Push model is that it naturally combines with query compilation Codegen. Currently MatrixOne has not implemented Codegen, which is also beyond this article’s scope.

The current MatrixOne implements basic parallel scheduling based on the Push model. In the future, there will be improvements in many aspects, such as scheduling tasks in a hybrid concurrent and parallel way for multiple queries, and when Operators need to perform Spill handling due to insufficient memory, the Pipeline schedule also needs to be aware and handle it efficiently, to complete the task while minimizing IO overhead. There will be many very interesting works in these aspects. We also welcome students interested in this area to explore innovations at these levels with us.

So, is it a question of Push or Pull? It appears to be, and yet it also does not. Everything revolves around practical effects with the focus on computational parallel scheduling, and it’s not simply black and white. It represents a way of thinking about computational parallel scheduling.

**Reference**

[1] Shaikhha, Amir and Dashti, Mohammad and Koch, Christoph, Push versus pull-based loop fusion in query engines, Journal of Functional Programming, Cambridge University Press, 2018

[2] Leis, Viktor and Boncz, Peter and Kemper, Alfons and Neumann, Thomas, Morsel-driven parallelism: A NUMA-aware query evaluation framework for the many-core age, SIGMOD 2014

[3] Thomas Neumann, Efficiently compiling efficient query plans for modern hardware, VLDB 2011

[4] [Switch to Push-Based Execution Model by Mytherin · Pull Request #2393 · duckdb/duckdb (github.com)](https://github.com/duckdb/duckdb/pull/2393)

[5] [ClickHouse Query Execution Pipeline](https://presentations.clickhouse.com/meetup24/5.%20Clickhouse%20query%20execution%20pipeline%20changes/#1)
