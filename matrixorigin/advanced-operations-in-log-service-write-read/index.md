---
title: 'Advanced Operations in Log Service: Write&Read'
author: MatrixOrigin
mail: contact@matrixorigin.io
description: >-
  This article would have a brief explanation of the read and write request
  process in logservice.
tags:
  - technology
keywords:
  - MatrixOne
  - Database
  - Relational Database
  - Log Service
  - HTAP Database
publishTime: '2023-12-24 17:00:00+00:00'
image:
  '1': /content/en/shared/matrixone-log-service.png
  '235': /content/en/shared/matrixone-log-service.png
date: '2023-12-24 17:00:00+00:00'
lang: en
status: published
---

## Write

1. If the connection is not with the leader, it will be forwarded to the leader; upon receiving the request, the leader writes the log entries to the local disk.
2. Simultaneously, the request is sent asynchronously to follower nodes, which then write the log entries to their local disks upon receipt.
3. Once the append is completed on the majority of nodes, the commit index is updated and notified to other follower nodes via heartbeat.
4. After the leader commits, it begins to apply state machine operations.
5. After the apply operation is completed, it returns to the client.
6. After receiving the commit index from the leader, each follower applies its own state machine.

## Read

Reading data is divided into two types:

- Reading data from the state machine
- Reading log entries from the log db

### Reading Data from the State Machine

Reading data from the state machine, as shown in the following diagram:

1. When a client initiates a read request and it reaches the leader node, the commit index at that time is recorded;
2. The leader sends heartbeat requests to all nodes to confirm its leader status. Once the majority of nodes respond, confirming it is still the leader, it can respond to the read request;
3. The process waits for the apply index to be greater than or equal to the commit index;
4. Only then can the data from the state machine be read and returned to the client.

### Reading from log db

Reading log entries from the log db, as shown in the following diagram:

The process is relatively straightforward and typically occurs during **cluster restarts.**

During a restart, replicas first recover the state machine data from a snapshot, then start reading log entries from the log db from the index position recorded in the snapshot, and apply them to the state machine. Only after this operation is completed can they participate in the leader election. Once the cluster elects a leader, the TN connects to the logservice cluster and begins reading log entries from the previous checkpoint position of one of the replica's log dbs, replaying them into its own memory data.

## Truncation

If log entries in the log db continue to grow, it can lead to insufficient disk space, necessitating periodic freeing of disk space, achieved through truncation.

Logservice uses an in-memory-based state machine, which does not record user data but only some metadata and state information, such as tick, state, and LSN. User data is recorded by TN TAE itself. In MO, the state machine is separate, with TAE and logservice each maintaining a state machine.

Under this separated state machine design, a simple snapshot mechanism can cause problems:

![](/content/en/advanced-operations-in-log-service-write-read/picture1.jpg)

1. As shown in the diagram, TAE sends a truncate request, with the truncate index being 100, but at this point, the applied index of the logservice state machine is 200, meaning logs before 200 will be deleted, and then a snapshot is generated at this position.

   **Note:**

   ```text
   truncate_index != applied_index
   ```

2. Cluster restarts.
3. The Logservice state machine applies the snapshot with an index of 200 and sets the first index to 200 (logs before 200 are deleted), then the Logservice state machine begins replaying logs, providing services externally after replaying is complete.
4. TAE reads log entries from logservice, starting at position 100, but cannot read because logs before 200 have been deleted,resulting in an error.

**To solve the problem described above, the overall workflow of truncation is as follows**

![](/content/en/advanced-operations-in-log-service-write-read/picture2.jpg)

TAE sends a truncate request, updating the truncateLsn in the logservice state machine. At this point, only the value is updated without performing any snapshot/truncate operations. Each logservice server internally starts a truncation worker that sends a Truncate Request periodically. Note that the Exported parameter in this Request is set to true, indicating that the snapshot is invisible to the system and is merely exported to a specific directory.

The truncation worker also checks the list of currently exported snapshots to see if there is any with an index greater than the truncateLsn in the logservice state machine. If so, the snapshot closest to the truncateLsn is imported into the system, making it effective and visible to the system. All replicas perform the same operation, ensuring that the snapshot lsn of both state machines is the same. This allows for reading the corresponding log entries upon cluster restart.

The above is the main working principle of the logservice module.
