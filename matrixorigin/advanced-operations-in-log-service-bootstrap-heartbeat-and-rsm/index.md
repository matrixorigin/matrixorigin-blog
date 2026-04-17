---
title: 'Advanced Operations in Log Service: Bootstrap, Heartbeat, and RSM'
author: MatrixOrigin
mail: contact@matrixorigin.io
description: >-
  The this article will cover advanced concepts such as the bootstrap process,
  the heartbeat mechanism, and the role of the Replicated State Machine (RSM) in
  the MatrixOne Log Service.
tags:
  - technology
keywords:
  - MatrixOne
  - Database
  - Relational Database
  - Log Service
  - HTAP Database
publishTime: '2023-12-23 17:00:00+00:00'
image:
  '1': /content/en/shared/matrixone-log-service.png
  '235': /content/en/shared/matrixone-log-service.png
date: '2023-12-23 17:00:00+00:00'
lang: en
status: published
---

**Focus:** The this article will cover advanced concepts such as the bootstrap process, the heartbeat mechanism, and the role of the Replicated State Machine (RSM) in the MatrixOne Log Service.

And we would have an explanation of the read and write request process in logservice step by step in the next artcile.

## Bootstrap

Bootstrap is conducted during the startup of the logservice service, accomplished through the HAKeeper shard (with shard ID 0), with the entry function being `(*Service) BootstrapHAKeeper`.

Regardless of the number of replicas set in the configuration, each logservice process starts a replica of HAKeeper upon launch. Each replica sets members at startup, and the HAKeeper shard starts the raft with these members as the default number of replicas.

After completing the raft's leader election, it performs set initial cluster info, setting the shard count for log and TN, as well as the replica count for log.

Once the number of replicas is set, any surplus HAKeeper replicas are shut down.

## Heartbeat

This heartbeat is sent from logservice, CN, and TN to HAKeeper and is not the heartbeat between raft replicas! It serves two main purposes:

1. It sends the status information of each replica to HAKeeper via heartbeat, and HAKeeper's RSM updates the replica information;
2. Upon the return of the heartbeat, it retrieves commands from HAKeeper that need to be executed by the replicas.

The heartbeat process of Logservice is as shown in the following diagram, similar to that of CN and TN.

![](/content/en/advanced-operations-in-log-service-bootstrap-heartbeat-and-rsm/picture1.jpg)

The heartbeat is executed by default every 1 second, and its principle is as follows:

1. at the store level, it generates heartbeat information for all the replicas of shards on that store, including shard ID, node information, term, leader, etc.;
2. it sends a request to the server side of logservice;
3. upon receiving the request, the server calls `(*Service) handleLogHeartbeat()` for processing, and calls propose to send the heartbeat to raft;
4. After HAKeeper's RSM receives the heartbeat, it calls `(*stateMachine) handleLogHeartbeat()` for processing, mainly doing two things:
   - Updating the LogState in the state machine by calling `(*LogState) Update()` to update stores and shards;
   - Retrieving commands from the state machine's `ScheduleCommands` and returning them to the initiator to execute the command.

**The principle of the heartbeat from CN and TN to HA keeper is the same.**

## RSM

Both Logservice and HAKeeper's state machines are based on an in-memory model, with all data saved only in memory. They both implement the `IStateMachine` interface. The main methods are as follows:

- **Update()** — Called to update data in the state machine after a propose is committed (i.e., after the majority of replicas complete writing). The implementation of `Update()` is user-defined and must be side-effect free, ensuring identical outputs for identical inputs to maintain state machine stability. The result of `Update()` is returned through the Result structure, and error is not empty if an error occurs.
- **Lookup()** — Searches for data in the state machine, with the type of data to be searched specified via `interface{}`. The result returned is also of `interface{}` type, hence users need to define the state machine's data, input the corresponding data type, and return the corresponding data type, performing type assertion. `Lookup()` is a read-only method and should not modify data in the state machine.
- **SaveSnapshot()** — Creates a snapshot by writing the state machine's data to an `io.Writer` interface, typically a file handle, thereby saving it to a local disk file. `ISnapshotFileCollection` includes a list of files from the filesystem other than the data in the state machine, which, if present, will also be included in the snapshot. The third parameter notifies the snapshot procedure that the raft replica has stopped, terminating the snapshotting operation.
- **RecoverFromSnapshot()** — Recovers state machine data by reading the latest snapshot from `io.Reader`. `[]SnapshotFile` is a list of additional files, which are directly copied into the state machine data directory. The third parameter controls the termination of the snapshot recovery operation during the raft replica process.
- **Close()** — Closes the state machine and performs some cleanup work.

And we would have an explanation of the read and write request process in logservice step by step.
