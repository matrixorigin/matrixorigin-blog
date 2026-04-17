---
title: >-
  Log Service Essentials: Architecture,WAL Management, Client and Server
  Operations
author: MatrixOrigin
mail: contact@matrixorigin.io
description: >-
  This article will provide an in-depth look at the overall architecture of the
  MatrixOne Log Service, detailing its design principles and the integration of
  the dragonboat library and raft protocol. We will also introduce on the client
  and server aspects of the MatrixOne Log Service. It will offer detailed
  explanations of client functionalities and server-side request processing.
tags:
  - technology
keywords:
  - MatrixOne
  - Database
  - Relational Database
  - Log Service
  - HTAP Database
publishTime: '2023-12-22 17:00:00+00:00'
image:
  '1': /content/en/shared/matrixone-log-service.png
  '235': /content/en/shared/matrixone-log-service.png
date: '2023-12-22 17:00:00+00:00'
lang: en
status: published
---

**Focus:** This article will provide an in-depth look at the overall architecture of the MatrixOne Log Service, detailing its design principles and the integration of the dragonboat library and raft protocol. We will also introduce on the client and server aspects of the MatrixOne Log Service. It will offer detailed explanations of client functionalities and server-side request processing.

Logservice plays a vital role in MatrixOne, acting as an independent service accessed by external components via RPC for log management.

Logservice utilizes the dragonboat library based on the raft protocol (a Golang open-source implementation of multi-raft group), typically using local disks to store logs in multiple replicas, effectively managing the Write-Ahead Logging (WAL).Transaction submissions only require writing to Logservice, eliminating the need to write data to S3, as another component asynchronously batches the data for S3 uploads. This design ensures low latency during transaction submissions, while multiple replicas guarantee high data reliability.

This article will primarily focus on the fundamental principles of the logservice module in MatrixOne.

## Overall Architecture

The overall architecture of logservice is depicted in the following diagram. The server includes several modules such as handler, dragonboat, and RSM.

### Client

The Logservice client is primarily designed for TN (Transaction Node) usage, with key interface descriptions as follows:

- **Close()** - Closes the client connection.
- **Config()** - Retrieves client-related configurations.
- **GetLogRecord()** - Returns a `pb.LogRecord` variable, which includes an 8-byte Lsn, a 4-byte record type, and a `[]byte` type Data. The Data part consists of a 4-byte pb.UserEntryUpdate, an 8-byte replica TN ID, and a payload `[]byte`.
- **Append()** - Appends a `pb.LogRecord` to logservice, returning an Lsn. On the calling side, the pb.LogRecord parameter can be reused.
- **Read()** — Reads logs from logservice starting from firstLsn, stopping when `maxSize` is reached, with the returned Lsn serving as the starting point for the next read.
- **Truncate()** — Deletes logs prior to the specified lsn to free up disk space.
- **GetTruncatedLsn()** — Returns the Lsn of the most recently deleted log.
- **GetTSOTimestamp()** — Requests a total of count timestamps from TSO, occupying the range [returned value, returned value + count] by the caller. This method is currently not in use.

The Client communicates with the logservice server via MO-RPC, where the server interacts with raft/dragonboat to return results.

### Server

**Server Handler**

The server side of Logservice processes requests sent by the client, with the entry function being `(*Service).handle()`. Different requests invoke different methods for processing:

- **Append** — Appends logs to logservice, eventually invoking dragonboat's `(*NodeHost) SyncPropose()` method to synchronously submit the propose request. It requires the log to be committed and applied before returning, with the return value being the Lsn after successful log writing.
- **Read** — Reads log entries from the log database. It first calls `(*NodeHost) SyncRead()` to linearly read the current Lsn from the state machine, then based on the Lsn, calls `(*NodeHost) QueryRaftLog()` to retrieve log entries from the log database.
- **Truncate** — Truncates logs in the log database to free up disk space. Note that this only updates the truncatable lsn in the state machine, rather than performing an actual truncate operation.
- **Connect** — Establishes a connection with the logservice server and attempts to read and write to the state machine for status checks.
- **Heartbeat** — Includes heartbeats for logservice, CN, and TN. This request updates their respective state information in the HAKeeper's state machine and synchronizes HAKeeper's tick. During HAKeeper's check, offline time is compared based on the tick, triggering remove/shutdown operations if offline.
- **Get XXX** — Retrieves information from the state machine.
