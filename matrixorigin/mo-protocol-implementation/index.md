---
title: MatrixOne's MySQL Protocol Implementation
author: ChenJiakai
mail: ChenJiakai@matrixorigin.io
description: >-
  Understanding MOserver-MySQL client communication, MySQL protocol structure
  (Packet Length, Sequence ID, Payload), encoding types (fixed/variable length
  integers, strings).
tags:
  - news
keywords:
  - MatrixOS
  - MatrixOrigin
publishTime: '2024-08-05 17:00:00+00:00'
image:
  '1': /content/en/shared/mo-news.webp
  '235': /content/en/shared/mo-news.webp
date: '2024-08-05 17:00:00+00:00'
lang: en
status: published
---

# 1. Learning Objectives

Understand the network interaction process of connecting and operating between MOserver and MySQL client.

# 2. Basics of MySQL Network Protocol

## Basic Structure of Protocol Packet

MySQL protocol packet is the basic unit of communication between the client and server. Each protocol packet contains the following parts:

1. **Packet Length**

   - Length: 3 bytes
   - Description: Represents the length of the packet, excluding the header (i.e., 3-byte packet length and 1-byte sequence number). The maximum value is 2^24 - 1 (16,777,215 bytes, which is 16MB - 1 byte).

2. **Sequence ID**

   - Length: 1 byte
   - Description: Used to identify the order of packets, with the client and server alternately incrementing the sequence number. The sequence number starts at 0 and increments by 1 with each packet sent, resetting to 0 after reaching 255.

3. **Payload Data**
   - Length: Variable
   - Description: The actual data being transmitted, with the length determined by the packet length field.

Since the maximum length of a MySQL protocol packet is 16,777,215 bytes (about 16MB), data exceeding this length needs to be split into multiple packets for transmission. MySQL handles this using a mechanism called "fragmented packets." Each fragmented packet has its own packet length and sequence number fields. The payload data of the fragmented packets is concatenated to form the complete data.

## MySQL Protocol Encoding Types in MO

The basic data types in MySQL protocol are Integer and String. Integers can be either fixed-length or variable-length. Fixed lengths are 1, 2, 3, 4, 6, and 8 bytes, while variable lengths use length encoding to determine the overall length of the integer, providing flexibility and efficiency.

```go
func (mp *MysqlProtocolImpl) readIntLenEnc(data []byte, pos int) (uint64, int, bool) {
	if pos >= len(data) {
		return 0, 0, false
	}
    // First byte greater than 250 indicates the size of the integer
	switch data[pos] {
	case 0xfb:
		// Zero, one byte
		return 0, pos + 1, true
	case 0xfc:
		// Integer in two bytes
		if pos+2 >= len(data) {
			return 0, 0, false
		}
		value := uint64(data[pos+1]) |
			uint64(data[pos+2])<<8
		return value, pos + 3, true
	case 0xfd:
		// Integer in three bytes
		if pos+3 >= len(data) {
			return 0, 0, false
		}
		value := uint64(data[pos+1]) |
			uint64(data[pos+2])<<8 |
			uint64(data[pos+3])<<16
		return value, pos + 4, true
	case 0xfe:
		// Integer in eight bytes
		if pos+8 >= len(data) {
			return 0, 0, false
		}
		value := uint64(data[pos+1]) |
			uint64(data[pos+2])<<8 |
			uint64(data[pos+3])<<16 |
			uint64(data[pos+4])<<24 |
			uint64(data[pos+5])<<32 |
			uint64(data[pos+6])<<40 |
			uint64(data[pos+7])<<48 |
			uint64(data[pos+8])<<56
		return value, pos + 9, true
	}
	// Values between 0 and 250 occupy 1 byte and are returned directly
	return uint64(data[pos]), pos + 1, true
}
```

The string types are mainly categorized as follows:

```go
// FixedLengthString, such as sql status in ERR_Packet is fixed at 5
func readStringFix() {
	var sdata []byte
	var ok bool
	sdata, pos, ok = mp.readCountOfBytes(data, pos, length)
	return string(sdata), pos, true
}
// NullTerminatedString ends at 0
func readStringNUL() {
	zeroPos := bytes.IndexByte(data[pos:], 0)
	return string(data[pos : pos+zeroPos]), pos + zeroPos + 1, true
}
// VariableLengthString
func readStringLenEnc() {
	var value uint64
	var ok bool
    // First read the string length using LengthEncodedInteger, then read the corresponding string
	value, pos, ok = mp.readIntLenEnc(data, pos)
	sLength := int(value)
	return string(data[pos : pos+sLength]), pos + sLength, true
}
```

# 3. Connection Phase

## Listen-Accept

MOserver establishes connections by listening to TCP and UNIX ports using the standard Go net library. Each established connection is handed over to handleConn for further processing.

```go
// Core code
func (mo *MOServer) startListener() {
    // Supports both TCP and UNIX
	for _, listener := range mo.listeners {
		go mo.startAccept(listener)
	}
}
func (mo *MOServer) startAccept(listener net.Listener) {
	for {
		conn, err := listener.Accept()
		if err != nil {
			return
		}
        // Each connection is handled in a separate goroutine
		go mo.handleConn(conn)
	}
}
```

## HandShake Preparation and Sending

handleConn handles server-client authentication, i.e., handshake. The handshake process in MySQL protocol involves sending a handshake packet and processing the authentication return handshake response to complete the identity verification, establishing the connection between server and client. The main interactions between the client and server are as follows:

Core code in MO:

```go
func (mo *MOServer) handleConn(conn net.Conn) {
    // NewIOSession creates a wrapper for net.Conn, managing network buffers and read/write operations
	rs, err := NewIOSession(conn)
	if err != nil {
		mo.Closed(rs)
		return
	}

	err = mo.handshake(rs)
	if err != nil {
		mo.rm.Closed(rs)
		return
	}
    // If handshake is successful, returns nil error and enters the command phase
	mo.handleLoop(rs)
}
func (mo *MOServer) handshake(rs *Conn) {
    hsV10pkt := makeHandshakeV10Payload()
	writePackets(hsV10pkt)

    // To handle handshake response
}

func makeHandshakeV10Payload() []byte {
    // Write the first part of the salt (fixed 8 bytes)
    pos = mp.writeCountOfBytes(data, pos, mp.GetSalt()[0:8])
    // Check if plugin authentication is supported
    // To decide whether to write the length of auth-plugin-data
    if (DefaultCapability & CLIENT_PLUGIN_AUTH) != 0 {
       // MO is fixed at 20 bytes + 1 NUL byte
		pos = mp.io.WriteUint8(data, pos, uint8(len(mp.GetSalt())+1))
	} else {
		pos = mp.io.WriteUint8(data, pos, 0)
	}
    // By default, secure connection is enabled, write the second part of the salt
	if (DefaultCapability & CLIENT_SECURE_CONNECTION) != 0 {
		pos = mp.writeCountOfBytes(data, pos, mp.GetSalt()[8:])
		pos = mp.io.WriteUint8(data, pos, 0)
	}
    // Write auth_plugin_name, MO is fixed as mysql_native_password
	if (DefaultCapability & CLIENT_PLUGIN_AUTH) != 0 {
		pos = mp.writeStringNUL(data, pos, AuthNativePassword)
	}
    return data
}
```

Example of a server handshake packet captured using Wireshark:

```sql
// Server Request
Server Greeting
    Protocol: 10
    Version: 8.0.30-MatrixOne-v286829
    Thread ID: 893
    Salt: \x12_"pID~\x11
    Server Capabilities: 0xa68f
    Server Language: utf8mb4 COLLATE utf8mb4_bin (46)
    Server Status: 0x0002
    Extended Server Capabilities: 0x013b
    Authentication Plugin Length: 21
    Unused: 00000000000000000000
    Salt: \x1E\!\x1Cku(2#\x06T~
    Authentication Plugin: mysql_native_password
```

## HandShakeResponse Analysis and Processing

After receiving the handshake, the client processes it and returns a handshake response packet:

```sql
// Client Request
MySQL Protocol
    Packet Length: 195
    Packet Number: 1
    Login Request
        Client Capabilities: 0xa685
        Extended Client Capabilities: 0x19ff
        MAX Packet: 16777216
        Charset: utf8mb4 COLLATE utf8mb4_0900_ai_ci (255)
        Unused: 0000000000000000000000000000000000000000000000
        Username: dump
        Password: 4c1978397152b08d31bfded38c0322fb8602a116
        Client Auth Plugin: mysql_native_password
        Connection Attributes
            Connection Attributes length: 114
            Connection Attribute - _pid: 27998
            Connection Attribute - _platform: x86_64
            Connection Attribute - _os: Linux
            Connection Attribute - _client_name: libmysql
            Connection Attribute - os_user: cjk


            Connection Attribute - _client_version: 8.0.33
            Connection Attribute - _pid: 27998
            Connection Attribute - _platform: x86_64
            Connection Attribute - _os: Linux
            Connection Attribute - _client_name: libmysql
            Connection Attribute - os_user: cjk
            Connection Attribute - _client_version: 8.0.33
            Connection Attribute - program_name: mysql
```

Response mainly includes client capabilities identifiers, maximum acceptable packet size, charset, necessary Auth information (for non-SSL connections), and Connection Attributes. After MOserver sends the handshake packet, it waits for the client to return the handshakeResponse. The IsEstablished flag is false before the handshake is completed, indicating it is waiting to read and analyze the handshake response.

```go
func (mo *MOServer) handshake(rs *Conn) error {
    // Begin processing the handshake response

    // Determine if the information being processed is the handshakeResponse based on the Established flag
    if !protocol.IsEstablished() {
        // Core analysis code, MO supports version 4.1 protocol
        var resp41 response41
        resp41 = analyseHandshakeResponse41()
        // After parsing, proceed with identity authentication
    }
    // Returning nil error indicates successful handshake
    return nil
}

// Analyze the payload of the response
func analyseHandshakeResponse41() response41 {
    // For version 4.1, read the 4-byte capabilities in one go. If it is found that the 4.1 protocol is not supported, it returns an error
    info.capabilities, pos, ok = mp.io.ReadUint32(data, pos)
    if (info.capabilities & CLIENT_PROTOCOL_41) == 0 {
		error
	}
    // Read the 4-byte maximum packet size, 1-byte charset, and skip the zero-fill bytes
    info.maxPacketSize, pos, ok = mp.io.ReadUint32(data, pos)
    info.collationID, pos, ok = mp.io.ReadUint8(data, pos)
    pos += 23
    // Return for SSL connection, waiting for exchange
    if pos == len(data) && (info.capabilities&CLIENT_SSL) != 0 {
		info.isAskForTlsHeader = true
		return true, info, nil
	}
    // For non-SSL, read the username in plaintext
    // Decide the method to read the password (plaintext/encrypted, fixed-length/variable-length encoding) based on capabilities
    info.username, pos, ok = mp.readStringNUL(data, pos)
    if (info.capabilities & CLIENT_PLUGIN_AUTH_LENENC_CLIENT_DATA) != 0
	 else if (info.capabilities & CLIENT_SECURE_CONNECTION) != 0	 else
    // If the database is specified
    if (info.capabilities & CLIENT_CONNECT_WITH_DB) != 0 {
        info.database, pos, ok = mp.readStringNUL(data, pos)
    }
    // Plugin_Auth only supports mysql_native_password
    info.clientPluginName, pos, ok = mp.readStringNUL(data, pos)

    info.connectAttrs = make(map[string]string)
	 if info.capabilities&CLIENT_CONNECT_ATTRS != 0 {
        // Read connectAttrs with variable-length encoding
    }
    return true, info, nil
}
```

## Authenticate Authentication

After parsing the handshakeResponse, proceed to the Authenticate information verification stage. If the authentication is successful, the Established flag is set, and the connection is completed. The server will return an OK packet, and then it starts handling regular command information.

```go
if err = protocol.Authenticate(); err != nil {
	return err
}
protocol.SetEstablished()
```

```sql
// Server Response
MySQL Protocol - response OK
    Packet Length: 8
    Packet Number: 2
    Response Code: OK Packet (0x00)
    Affected Rows: 0
    Server Status: 0x0810
    Warnings: 0
```

If the connection fails, such as due to incorrect password, it returns an ERROR packet.

```go
// Server Response
MySQL Protocol - response ERROR
    Packet Length: 75
    Packet Number: 2
    Response Code: ERR Packet (0xff)
    Error Code: 1045
    SQL state: 28000
    Error message: Access denied for user dump. internal error: check password failed
```

The core functions of Authenticate consist of two parts: AuthenticateUser under Session, which includes verifying user identity, checking account status, checking role permissions, and verifying database existence; and checkPassword, which uses the SHA-1 hash algorithm and salt to perform password verification. AuthenticateUser involves SQL queries.

```go
// Get the SQL query statement
func getSqlFor***() (string, error) {
	err := inputIsInvalid(ctx, tenant)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf(check***ormat, tenant), nil
}
// Execute SQL query
func executeSQLInBackgroundSession(sql string) ([]ExecResult, error) {
	bh := NewBackgroundExec(reqCtx, upstream, mp)
	defer bh.Close()
	err := bh.Exec(reqCtx, sql)
	if err != nil {
		return nil, err
	}
	return getResultSet(reqCtx, bh)
}
// AuthenticateUser mainly verifies the user's information in the database through SQL queries
func (ses *Session) AuthenticateUser {
    // Set tenant information to session
    ses.SetTenantInfo(tenant)
    // check tenant exit
    // check account status
    // check user:role
    // GetPassword is used to convert the stored password from hash value to byte array
    return GetPassWord(pwd)
}
// Validate client-sent auth and stored pwd
func checkPassword(pwd, salt, auth []byte) {
   ses := mp.GetSession()
   // Calculate SHA-1(salt + pwd)
	sha := sha1.New()
	_, err := sha.Write(salt)
	_, err = sha.Write(pwd)
	hash1 := sha.Sum(nil)
    // Validate if auth and hash1 have equal lengths
	if len(auth) != len(hash1) {
		return false
	}
    // Perform XOR operation
	for i := range hash1 {
		hash1[i] ^= auth[i]
	}
    // Calculate SHA-1(hash1)
	hash2 := HashSha1(hash1)
    // Compare the restored hash value with the stored password hash value
	return bytes.Equal(pwd, hash2)
}
```

## SSL Connection

The handshake interaction under SSL connection is mainly as follows:

Furthermore, analyzing the server's handshake packet captured by Wireshark, we see the SSL flag bit set in Server Capabilities.

```go
// Server request
Server Greeting
    Protocol: 10
    Version: 8.0.30-MatrixOne-v286829
    Thread ID: 707
    Salt: \x05H\nz@[7O
    Server Capabilities: 0xae8f
    Server Language: utf8mb4 COLLATE utf8mb4_bin (46)
    Server Status: 0x0002
    Extended Server Capabilities: 0x013b
    Authentication Plugin Length: 21
    Unused: 00000000000000000000
    Salt: -E`\x13c/L2GxcB
    Authentication Plugin: mysql_native_password
```

In the response packet, after the username, encrypted data is transmitted through SSL.

```sql
// Client Response
Login Request
    Client Capabilities: 0xae85
    Extended Client Capabilities: 0x19ff
    MAX Packet: 16777216
    Charset: utf8mb4 COLLATE utf8mb4_0900_ai_ci (255)
    Unused: 0000000000000000000000000000000000000000000000
    Username:
```

The specific code for establishing an SSL connection is as follows:

```go
func analyseHandshakeResponse41() {
    // Return directly when SSL flag bit = 1
	if pos == len(data) && (info.capabilities&CLIENT_SSL) != 0 {
		info.isAskForTlsHeader = true
		return true, info, nil
	}
}
func Handler() {
    if isTlsHeader {
       // Go standard library crypto/tls
    	tlsConn := tls.Server(rs.RawConn(), rm.getTlsConfig())
       protocol.SetTlsEstablished()
    }
}
```

# 4. Command Phase

## MO Network Buffer

Before introducing the specific Command execution process, let's briefly explain the basic network read and write method of the MOserver. The MOserver encapsulates the original `net.Conn` connection, primarily adding a buffer design for the MySQL protocol. The core method is to reuse a fixed-size buffer (default is 1MB) to reduce the number of memory allocations. When the data packet exceeds the fixed buffer size, it continues to write into a dynamic buffer consisting of a linked list. Below is the main structure code of the encapsulated Conn:

```go
// The basic unit of the buffer, consisting of a data slice and a write pointer
type ListBlock struct {
    data       []byte
    writeIndex int
}

type Conn struct {
    // Unique ID
    id                    uint64
    conn                  net.Conn
    // Maintain the correct SeqID
    sequenceId            uint8
    // Fixed buffer
    fixBuf *ListBlock
    // Dynamic buffer, implemented by a linked list
    dynamicBuf *list.List
    // curBuf and curHeader mark the current write block and Packet's header
    curBuf *ListBlock
    curHeader []byte
    // Current buffer data volume and current Packet data volume
    bufferLength int
    packetLength int
}
```

Except for the state response packets (OK, EOF, ERROR) in the MySQL protocol that need to be sent immediately, other data packets will be stored in the buffer first, waiting to be sent together with the state response packet to reduce the number of system call write operations. Note that the size of a data packet cannot be known in advance, so 4 bytes of Packet header are always reserved, and the Packet size and Seq ID are written back at the end of the packet.

```go
func (c *Conn) Append(elems ...byte) error {
    // Besides an extra judgment for >16MB, the core method is AppendPart
    err = c.AppendPart(elems)
    return err
}
func (c *Conn) AppendPart(elems []byte) error {
    var err error
    // Calculate the remaining space in the current block
    curBufRemainSpace := len(c.curBuf.data) - c.curBuf.writeIndex
    if len(elems) > curBufRemainSpace {
        // If the remaining size of the current block is insufficient, allocate a new block
        copy(c.curBuf.data[c.curBuf.writeIndex:], elems[:curBufRemainSpace])
        c.curBuf.writeIndex += curBufRemainSpace
        curElemsRemainSpace := len(elems) - curBufRemainSpace
        // PushNewBlock allocates new memory and puts it into the dynamic buffer, and modifies the usage of c.curBuf
        err = c.PushNewBlock(curElemsRemainSpace)
        copy(c.curBuf.data[c.curBuf.writeIndex:], elems[curBufRemainSpace:])
        c.curBuf.writeIndex += len(elems[curBufRemainSpace:])
    } else {
        // Otherwise, continue writing to the end of the current block
        copy(c.curBuf.data[c.curBuf.writeIndex:], elems)
        c.curBuf.writeIndex += len(elems)
    }
    return err
}

func (c *Conn) BeginPacket() error {
    // Record the header position of the current Packet
    c.curHeader = c.curBuf.data[c.curBuf.writeIndex : c.curBuf.writeIndex+HeaderLengthOfTheProtocol]
    // Skip the header
    c.curBuf.writeIndex += HeaderLengthOfTheProtocol
    c.bufferLength += HeaderLengthOfTheProtocol
    return nil
}

func (c *Conn) FinishedPacket() error {
    // At the end of the current packet, write the PacketSize and Seq ID to the reserved header position
    binary.LittleEndian.PutUint32(c.curHeader, uint32(c.packetLength))
    c.curHeader[3] = c.sequenceId
    return nil
}
func (c *Conn) FlushIfFull() error {
    // FlushIfFull only checks whether Flush needs to be called
}

func (c *Conn) Flush() error {
    // WriteToConn safely writes data to the network
    err = c.WriteToConn(c.fixBuf.data[:c.fixBuf.writeIndex])
    // After the fixed buffer is written, if there is additional data in the dynamic buffer, it also needs to be written
    for node := c.dynamicBuf.Front(); node != nil; node = node.Next() {
        block := node.Value.(*ListBlock)
        err = c.WriteToConn(block.data[:block.writeIndex])
    }
    return err
}

// Only state response packets OK, EOF, ERROR are directly sent via Write
func (c *Conn) Write(payload []byte) error {
    // First, send all buffer data
    err = c.Flush()
    // Construct the header of the state response packet and send it together
    var header [4]byte
    length := len(payload)
    binary.LittleEndian.PutUint32(header[:], uint32(length))
    header[3] = c.sequenceId
    c.sequenceId += 1
    err = c.WriteToConn(append(header[:], payload...))
    return err
}
```

## Query Structure

After the connection is established, the server and the client start processing different Commands. The client continuously sends Request Command Query. The structure of the Request Command Query in the MySQL official documentation is as follows:

```
// Client Request
Request Command Query
    Command: Query (3)
    Statement: select * from t
```

The first byte of a Request Command Query represents the command type. Taking the simplest and most common query type as an example, apart from the judgment of special cases, a Request Command Query consists of only two parts:

1. command type

2. query string (NullTerminatedString)

The incoming data packet is first received by the server's Read function in the form of a byte slice and then finally passed to `handleRequest` for processing. The `handleRequest` eventually calls the core `ExecuteStmt` function after layer-by-layer invocation. Next, we will describe the execution process for common statements.

## SELECT Statement

In a SELECT statement, the interaction between the client and the server is as follows:

After the SELECT statement enters the server and is parsed and classified, it is executed by calling `executeStmtWithResponse`.

```go
func Handler(msg interface{}) {
    // Confirm the connection is established
    if !protocaol.IsEstablished() {}

    // Deconstruct the Payload data stream into a Request structure
    req := protocol.GetRequest(payload)
    // Core code
    routine.handleRequest(req)
}

func handleRequest(req *Request) {
    // The query plan ultimately enters this function for execution and sending results
    executeStmtWithResponse()
}
```

Eventually, it will land in the `ExecuteResultRowStmt` function, which completes the SQL parse, generates the plan, compiles, and sends the column count and column definition before running, and finally sends the text row result. We focus on the encoding and sending method of the result after execution.

```go
func executeStmtWithResponse() {
    // Core function, including execution and sending result data
    executeStmt()
    // Respond to the client, send the status packet
    respClientWhenSuccess()
}
func respClientWhenSuccess() {
    // The final response function, ending the query by sending the result status packet
    switch stmt.RespType() {
        // The return function executed under select
        case tree.RESP_STREAM_RESULT_ROW:
            respStreamResultRow()
    }
}
func executeStmt() {
    // The data of the result row ultimately enters this function
    executeResultRowStmt()
}
func executeResultRowStmt()  {
    // Send the column count and definition before executing the query plan
    respColumnDefsWithoutFlush()
    Run()
}
```

The result sending consists of three main parts: `ColumnCount`, `Columns`, and `TextRow`. Next, we will focus on the internal operations of these three functions.
The `ColumnCount` is encoded as a length-encoded integer and sent as a single packet.

```go
func SendColumnCountPacket(count uint64) {
    // Send ColumnCount as LengthEncodedInteger
    pos = writeIntLenEnc(data, pos, count)
     // appendPacket internally calls Conn's BeginPacket, Append, FinishedPacket, etc.
    appendPackets(data)
}
```

According to the `ColumnCount`, each column definition is sent individually as a packet. After all column packets are sent, an EOF packet is sent.

```go
func sendColumns(set ResultSet) {
    // Send each column definition in sequence
    for i := uint64(0); i < set.GetColumnCount(); i++ {
        col := set.GetColumn(i)
        SendColumnDefinitionPacket(col)
    }
    // End with EOF
    sendEOFPacket()
}
func SendColumnDefinitionPacket(column Column) {
    // Core code to generate column definition packets
    data := makeColumnDefinition(column)
    appendPackets(data)
}
```

`makeColumnDefinition` generates packets similar to those in the MySQL documentation protocol and sends them. Flags are encoded to include column properties (Not NULL, primary key), etc.

```
// Server Response
MySQL Protocol - field packet
    Packet Length: 38
    Packet Number: 3
    Catalog
        Catalog: def
    Database
        Database: testdb
    Table
        Table: t
    Original table
        Original table: t
    Name
        Name: name
    Original name
        Original name: name
    Charset number: utf8 COLLATE utf8_general_ci (33)
    Length: 4294967295
    Type: FIELD_TYPE_VAR_STRING (253)
    Flags: 0x0000
    Decimals: 0
```

Additionally, except for `executeResultRowStmt`, in statements such as `Insert`, `Update`, etc., where the result returned is the execution status, it enters `executeStatusStmt`, and column definitions and actual row data are no longer returned. Only the final status packet is returned using `respClientWhenSuccess`. This will not be elaborated on here.

During execution, each result batch ultimately enters the `RespResult` function and eventually calls `WriteResultSetRow` to send rows. Unlike column definitions and status packets, result sending here uses a more efficient method by directly writing the byte stream into the TCP buffer rather than reconstructing it. The specific implementation process is as follows:

```go
// Parameters are the result set and the number of rows
func Write(bat *batch.Batch) {
    for j := 0; j < n; j++ {
        // Extract row data from column vectors row by row
        extractRowFromEveryVector(bat, j, mrs.Data[0])
        // Send row data
        WriteResultSetRow(&mrs, 1)
    }
}

func WriteResultSetRow(mrs *MysqlResultSet, cnt uint64) {
    // Call BeginPacket method in Conn to start a new protocol packet
    beginPacket()
    // Prepare data
    appendResultSetTextRow(mrs, i)
    // End the protocol packet after row writing is complete
    FinishedPacket()
}

func appendResultSetTextRow(data []byte, r uint64) []byte {
    for i := uint64(0); i < GetColumnCount(); i++ {
        column, err := set.GetColumn(i)
        // Null values are defined as 0xfb
        if isNil(column) {
            appendUint8(data, 0xFB)
        } else {
            // Other types use string<lenenc> encoding and are added to the buffer
            switch column.ColumnType() {
                appendStringLenEnc(value)
            }
        }
    }
}

func appendStringLenEnc(value string) {
    // Append ultimately calls Conn.Append to write bytes into the buffer
    Conn.Append([]byte(value[:length])...)
}
```

## Prepare/Execute

The `Prepare` statement can be directly called in CLI after using a custom name, followed by `Execute` and `SET @var`. It can also be used directly in JDBC methods without explicitly specifying the statement name. The protocol packets for the two cases differ and are described below.

### Prepare (CLI)

In CLI, `Prepare/Set/Execute` is executed, with the command type in the request packet still being `query`. `Prepare` and `Set` will only return an `OK` packet, while `Execute` returns the same result as directly executing the corresponding statement. Below is the `Prepare` query structure:

```sql
// Client Request
Request Command Query
    Command: Query (3)
    Statement: PREPARE stmt FROM 'select * from t where name'
```

After the server receives the request, it enters `executeStmt`, just like a normal query:

```go
func executeStmt() {
    // Prepare is executed directly in frontend
    execInFrontend()
}

func execInFrontend() {
    // Depending on stmt type, CLI's Prepare enters doPrepareString
    switch st := execCtx.stmt.(type) {
        case *tree.PrepareString:
            // Core code
            doPrepareString()
    }
}

func doPrepareString() {
    // The SQL after prepare is parsed and the plan is built in this function
    stmts = mysql.Parse(Sql)
    preparePlan = buildPlan()

    // Name, stmt, plan, etc., are packed into prepareStmt
    SetPrepareStmt(name, prepareStmt)
}

func SetPrepareStmt(name, prepareStmt) {
    // Saved in the map
    ses.prepareStmts[name] = prepareStmt
}
```

After successful server processing, an `OK` data packet is returned to the client, also through the `respClientWhenSuccess` function:

```sql
// Server Response
MySQL Protocol - response OK
    Packet Length: 8
    Packet Number: 1
    Response Code: OK Packet (0x00)
    Affected Rows: 0
    Server Status: 0x0812
    Warnings: 0
```

Core code:

```go
func respClientWhenSuccess() {
    respClientWithoutFlush()
}

func respClientWithoutFlush() {
    switch execCtx.stmt.StmtKind().RespType() {
        // Return as status type
        case tree.RESP_STATUS:
            respStatus(ses, execCtx)
    }
}

func respStatus() {
    switch st := execCtx.stmt.(type) {
        case *tree.PrepareStmt, *tree.PrepareString:
        // Command type is query, not PREPARE
        if ses.GetCmd() == COM_STMT_PREPARE {

        } else {
          // Prepare and send OK packet
            resp := setResponse(ses, execCtx.isLastStmt, rspLen)
            SendResponse(execCtx.reqCtx, resp)
        }
    }
}
```

### Set (CLI)

After `Prepare`, CLI usually needs to use `Set` for variable assignment before executing `Execute`. The `Set` statement, when entering `executeStmt`, is similarly executed in `execInFrontend`, falling into the `SetVar` case. The data is obtained from the virtual table and stored in the map:

```go
func execInFrontend() {
    // Depending on stmt type, CLI's Prepare enters doPrepareString
    switch st := execCtx.stmt.(type) {
        case *tree.SetVar:
            // Core code
            doSetVar()
    }
}

func doSetVar() {
    value := getExprValue()
    SetUserDefinedVar(value)
}

func getExprValue() {
    // Compose an AST from dual table select
    compositedSelect = ...
    tempExecCtx := ExecCtx{
        reqCtx: execCtx.reqCtx,
        ses:    ses,
    }
    // Execute in temporary context
    executeStmtInSameSession(tempExecCtx.reqCtx, ses, &tempExecCtx, compositedSelect)
    // Extract execution result, i.e., the actual value of the variable
    batches := ses.GetResultBatches()
}

func SetUserDefinedVar(value interface{}) {
    // User-defined variables are stored in the map
    ses.userDefinedVars[strings.ToLower(name)] = &UserDefinedVar{Value: value, Sql: sql}
}
```

### Execute (CLI)

After `Prepare` and `Set`, `Execute` is used to run variables, with the command type in CLI also being `query`:

```sql
// Client Request
Request Command Query
    Command: Query (3)
    Statement: EXECUTE stmt using @name
```

Upon receiving the request, the server first assigns the function for parameter extraction in `doComQuery`:

```go
func doComQuery() {
    // Set the function used for parameter extraction
    proc.SetResolveVariableFunc(ResolveVariable)
}

func ResolveVariable(varName string) {
    // Extract user-defined parameters
    GetUserDefinedVar(varName)
}

func GetUserDefinedVar(varName string) {
    // Extract and return from the map
    val, ok := userDefinedVars[strings.ToLower(varName)]
    return val
}
```

Entering `executeStmt`, it first compiles the actual execute statement, retrieves the prepared plan from the map, and extracts actual parameters from `userDefinedVars` based on variable names. Then it executes the prepared statement with actual parameters.

```go
func Compile() {
    // Regular build plan
    plan := buildPlan()
    // If execute type, replace the plan
    if _, ok := cwft.stmt.(*tree.Execute); ok {
        plan, stmt, sql := replacePlan(plan)
    }
    // Continue with subsequent execution after replacement
}

func replacePlan(plan) {
    // Read stmt from the map based on the extracted stmtName
    stmtName := execPlan.GetName()
    prepareStmt := GetPrepareStmt(stmtName)
    if prepareStmt.params != nil {
        // Params not nil for JDBC case, already extracted during parse
    } else {
        // CLI execute extracts param values during replacePlan stage
        for i, arg := range Plan.Args {
            // Call function decided in doComQuery phase to extract params
            param = GetResolveVariableFunc()(varName)
            paramVals[i] = param
        }
        SetPrepareParams(prepareStmt.params)
        // Bind to compile results
        cwft.paramVals = paramVals
        return prepareStmt.PreparePlan
    }
}
```

After replacement, the execution plan is obtained and processed normally in `executeStmt`. Based on the actual statement, it enters either `executeResultRowStmt` or `executeStatusStmt`. In CLI, `executeResultRowStmt` is the same as directly executing a `Select`, sending column counts, column definitions, and all results row by row encoded as length-encoded strings.

```go
func executeResultRowStmt() {
    // Send column count and column definitions
    respColumnDefsWithoutFlush()
    // After execution, send all row data
    Run()
}
```

### Prepare (JDBC)

In JDBC, the command type in the packet sent for `Prepare` is no longer `query`, but `prepare statement`. The interaction between client and server also changes as follows:
![Figure 4]( "PREPARE interaction")

The structure of the `Prepare` command is as follows:

```sql
// Client Request
Request Command Prepare Statement
    Command: Prepare Statement (22)
    Statement: select

 * from t where name = ?
```

After receiving the data, the server behaves similarly to CLI, ultimately falling into `execInFrontend`, but executes `*tree.PrepareStmt` instead of `*tree.PrepareString`.

```go
func execInFrontend() {
    // Depending on stmt type, JDBC's Prepare enters doPrepareStmt
    switch st := execCtx.stmt.(type) {
        case *tree.PrepareStmt:
            // Core code
            doPrepareStmt()
    }
}

func doPrepareStmt() {
    // No need to parse again
    preparePlan = buildPlan()
    SetPrepareStmt(name, prepareStmt)
}

func SetPrepareStmt(name, prepareStmt) {
    // Save to map
    ses.prepareStmts[name] = prepareStmt
}
```

After successful server processing, it enters the `SendPrepareResponse` function in `respStatus`, which completes the entire `PrepareResponse` sending task:

```go
func respStatus() {
    switch st := execCtx.stmt.(type) {
        case *tree.PrepareStmt, *tree.PrepareString:
        // Command type is PREPARE, not query
        if ses.GetCmd() == COM_STMT_PREPARE {
            SendPrepareResponse()
        } else {
    }
}

func SendPrepareResponse() {
    // `PrepareResponse` first sends an OK packet with param and column count
    SendOKPacket()
    // Send each param count as ?def and table column definitions
    // Both ending with EOF
    for i := 0; i < numParams; i++ {
        column := new(MysqlColumn)
        column.SetName("?")
        SendColumnDefinitionPacket()
    }
    SendEOFPacket()

    for i := 0; i < numColumns; i++ {
        column := new(MysqlColumn)
        column.SetName(columns[i].Name)
        SendColumnDefinitionPacket()
    }
    SendEOFPacket()
}
```

### Execute (JDBC)

In JDBC, the major difference in executing `Execute` is that instead of using the Text protocol, it uses Binary for efficiency. The interaction process is as follows:

```sql
// Client Request
Request Command Execute Statement
    Command: Execute Statement (23)
    Statement ID: 1
    Flags: Defaults (0)
    Iterations (unused): 1
    New parameter bound flag: First call or rebound (1)
    Parameter
        Type: FIELD_TYPE_STRING (254)
        Unsigned: 0
        Value (String): xx
```

Upon receiving `Command type = Execute`, the server first calls `parseStmtExecute` before `doComQuery` to parse the actual parameters of the execute statement in binary form and binds them to the current session's `prepareStmts`.

```go
func ExecRequest() {
    switch req.GetCmd() {
        case COM_STMT_EXECUTE:
            // Read prepareStmt structure and SQL string
            sql, prepareStmt := parseStmtExecute(data)
            doComQuery(&UserInput{sql: sql})
}
}

func parseStmtExecute(data) {
    // Read stmtID
    stmtID := binary.LittleEndian.Uint32(data[0:4])
    // Compose stmtName generated during Prepare
    stmtName := fmt.Sprintf("%s_%d", prefixPrepareStmtName, stmtID)
    // Get stmt's plan, SQL, etc.
    preStmt := GetPrepareStmt(stmtName)
    sql := fmt.Sprintf("execute %s", stmtName)
    // Extract params and bind
    ParseExecuteData()
    return sql, preStmt
}

func ParseExecuteData() {
    // Get the number of params
    preStmt = len(preStmt.PreparePlan.ParamTypes)
    // Read null bitmap
    var nullBitmaps []byte
    nullBitmapLen := (numParams + 7) >> 3
    nullBitmaps = readCountOfBytes(nullBitmapLen)
    // Read each variable based on different parameter types
    for i := 0; i < numParams; i++ {
        tp := stmt.ParamTypes[i<<1]
        switch defines.MysqlType(tp) {
            // For example, varchar, read length-encoded string
            case defines.MYSQL_TYPE_VARSTRING:
                val := readStringLenEnc(data)
                // Bind to stmt's vector
                SetAnyToStringVector(val, vector)
        }
    }
}
```

Similar to CLI, the `replacePlan` function performs parameter replacement before executing the plan. The result is then sent in Binary format if the executed statement returns data rows (e.g., `select`). The remaining logic is similar, with specific code as follows:

```go
func SendResultSetTextBatchRowSpeedup() {
    // Send each row's result data using binary protocol
    for i := uint64(0); i < cnt; i++ {
        beginPacket()
        appendResultSetBinaryRow(resultSet, i)
        finishedPacket()
    }
}

func appendResultSetBinaryRow() {
    // Protocol starts with 1 byte fixed as 0
    data = mp.append(data, defines.OKHeader)
    // Define null bitmap size based on column count
    numBytes4Null := (columnsLength + 7 + 2) / 8
    // Check if each column is null
    for i := uint64(0); i < columnsLength; i++ {
        isNil := ColumnIsNull(i)
        if isNil {
            // Find the position in the bitmap
            bytePos := (i + 2) / 8
            bitPos := byte((i + 2) % 8)
            idx := int(bytePos)
            // Set the bit to 1 to indicate null value
            buffer[idx] |= 1 << bitPos
        }
    }
    data = Conn.Append(data, buffer...)
    // Add each column sequentially
    for i := uint64(0); i < columnsLength; i++ {
        column, err := GetColumn(i)
        // Choose encoding based on different data types
        switch column.ColumnType() {
            Conn.Append(column.GetString())
        }
    }
}
```

## LOAD DATA LOCAL INFILE

The `LOAD DATA LOCAL INFILE` command is used for loading data from a local file on the client into a MySQL database table. During the network interaction process, the client first sends a `LOAD DATA LOCAL INFILE` query command, which includes the file path, target table, delimiter, and other data. The server responds with a LOCAL INFILE Packet that contains the filename. After receiving this packet, the client begins to send the file data, with an empty packet indicating the end of the data. The overall interaction process is as follows:
![Figure 6]( "LOAD DATA interaction")

The protocol packet structure is as follows:

```markdown
// Client Request
MySQL Protocol
Packet Length: 153
Packet Number: 0
Request Command Query
Command: Query (3)
Statement: LOAD DATA LOCAL INFILE '/home/test_script/users.csv' INTO TABLE t FIELDS TERMINATED BY ',' LINES TERMINATED BY '\n' IGNORE 1 LINES (id, name, email)

// Server Response
MySQL Protocol - local infile
Packet Length: 32
Packet Number: 1
Response Code: LOCAL INFILE Packet (0xfb)
LOCAL INFILE Filename: /home/test_script/users.csv
```

Upon receiving the request, the server processes it via `executeStmt`, which constructs and compiles the statement, determining that it is a `LOAD LOCAL` statement. The server first sets up `io.Pipe()` for subsequent data stream reading and writing. Then, `executeStatusStmt` is executed. Within `executeStatusStmt`, it is determined whether the statement is a `LOAD` statement, and the process transitions to the `processLoadLocal` function to complete the `LOAD LOCAL` process:

```go
func executeStmt() {
    switch st := stmt.(type) {
        case *tree.Load:
            if st.Local {
                // Create io.Pipe() for subsequent reading and writing of data from client
                // Reading logic is in the external external.go file
                LoadLocalReader, loadLocalWriter = io.Pipe()
            }
    }
    executeStatusStmt()
}

func executeStatusStmt() {
    // Handle Load Local
    processLoadLocal()
}

func processLoadLocal() {
    // TCP read/write interface
    mysqlRrWr := ses.GetResponser().MysqlRrWr()
    // Initialize file-related parameters, such as path format
    InitInfileParam()
    // Send file path to client
    WriteLocalInfileRequest(Filepath)
    for {
        // Continuously read data sent by client until an empty packet is received
        msg, err = mysqlRrWr.Read()
        if err != nil {
            break
        }
        // writer is a pipeline
        writer.Write(msg)
    }
}

func WriteLocalInfileRequest(Filepath string) {
    // Encode as fixed-length string
    req := writeStringFix(filename, len(filename))
    // Write data to client
    writePackets(req)
}
```
