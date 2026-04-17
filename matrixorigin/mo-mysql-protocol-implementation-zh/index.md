---
title: 长篇详解 | MatrixOne 的 MySQL 协议实现详解
author: MatrixOrigin
mail: lichuanzi@matrixorigin.cn
description: >-
  MatrixOne 是一款分布式数据库，旨在提供高性能和高可用性的数据库服务。它兼容 MySQL 协议，使得用户可以使用 MySQL 客户端和工具与
  MatrixOne 进行交互，本文详细详解了 MatrixOne 的 MySQL 协议实现。
tags:
  - 技术干货
keywords:
  - 矩阵起源
  - Mysql
  - 数据库
  - 超融合
  - MatrixOne
publishTime: '2024-07-31 17:00:00+08:00'
image:
  '1': /content/zh/shared/tech.png'
  '235': /content/zh/shared/tech.png
date: '2024-07-31 17:00:00+08:00'
lang: zh
status: published
---

## MySQL网络协议基础

### 协议包基本结构

MySQL 协议包是客户端和服务器之间通信的基本单位，每一个协议包包含以下几个部分：

1. 包长度（Packet Length）

- 长度 ：3 字节
- 描述 ：表示包的长度，不包括包头（即3字节的包长度和1字节的序列号）。最大值为 2^24 - 1 （16,777,215 字节，即 16MB - 1 字节）。

2. 序列号（Sequence ID）

- 长度 ：1 字节
- 描述 ：用于标识包的顺序，客户端和服务器交替递增序列号。序列号从0开始，每发送一个包，序列号加1，达到255后回到0。

3.  负载数据（Payload）

- 长度 ：可变
- 描述 ：实际传输的数据，长度由包长度字段决定。

此外，由于 MySQL 协议包的最大长度为 16,777,215 字节（约16MB），当需要传输的数据超过这一长度时，需要将数据拆分为多个包来传输。MySQL 使用称为“分片包”的机制来处理这种情况。每个分片包都有其自己的包长度和序列号字段。分片包的负载数据依次拼接起来构成完整的数据。

### MatrixOne中的MySQL协议编码类型

MySQL 协议中基本的数据类型为 Integer 和 String。Integer 主要有定长和变长两种类型。定长为1、2、3、4、6、8字节，变长通过对长度进行编码，来确定整个 Integer 的长度，具有较高的灵活性和效率，变长编码的具体代码如下：

```sql
func (mp *MysqlProtocolImpl) readIntLenEnc(data []byte, pos int) (uint64, int, bool) {
    // 第一位超过250，代表其决定该Integer占用字节大小
  switch data[pos] {
  case 0xfb:
    //zero, one byte
    return 0, pos + 1, true
  case 0xfc:
    // int in two bytes
    value := uint64(data[pos+1]) | uint64(data[pos+2])<<8
    return value, pos + 3, true
  case 0xfd:
    // int in three bytes
    value := uint64(data[pos+1]) | uint64(data[pos+2])<<8 | uint64(data[pos+3])<<16
    return value, pos + 4, true
  case 0xfe:
    // int in eight bytes
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
  // 0-250之间，占用1字节，直接返回
  return uint64(data[pos]), pos + 1, true
}
```

string类型主要分为以下几类：

```sql
// FixedLengthString，如ERR_Packet中sql status固定为5
func readStringFix() {
  var sdata []byte
  var ok bool
  sdata, pos, ok = mp.readCountOfBytes(data, pos, length)
  return string(sdata), pos, true
}
// NullTerminatedString 中止于0
func readStringNUL() {
  zeroPos := bytes.IndexByte(data[pos:], 0)
  return string(data[pos : pos+zeroPos]), pos + zeroPos + 1, true
}
// VariableLengthString 变长字符串
func readStringLenEnc() {
  var value uint64
  var ok bool
    // 先使用LengthEncodedInteger读取字符串长度后再读取对应字符串
  value, pos, ok = mp.readIntLenEnc(data, pos)
  sLength := int(value)
  return string(data[pos : pos+sLength]), pos + sLength, true
}
```

## Connection Phase

### Listen-Accept

MatrixOne通过go标准库net实现对tcp和unix端口的监听来建立连接。每个确定好的连接交由handleConn进行后续处理

```sql
// 核心代码
func (mo *MOServer) startListener() {
    // 可接收tcp和unix两种方式
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
       // 每个连接单独新启goroutine进行处理
    go mo.handleConn(conn)
  }
}
```

### HandShake准备与发送

handleConn主要进行服务端与客户端认证的相关操作，即handshake。MySQL协议中的handshake过程主要有handshake包的发送以及处理认证返回的handshake response来完成身份验证。确立服务端与客户端的连接。这其中客户端和服务端的主要交互如下：

![tupian1](/content/zh/mo-mysql-protocol-implementation/mysql1.png)

MatrixOne中的核心代码如下：

```sql
func (mo *MOServer) handleConn(conn net.Conn) {
    // NewIOSession创建一个net.Conn的包装类，管理网络缓冲区和读写等操作
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
    // 如果最终handshake成功, 返回nil error进入command phase
  mo.handleLoop(rs)
}
func (mo *MOServer) handshake(rs *Conn) {
    hsV10pkt := makeHandshakeV10Payload()
  writePackets(hsV10pkt)

    // 为处理handshake response
}

func makeHandshakeV10Payload() []byte {
    // 写入salt的第一部分(固定8位)
    pos = mp.writeCountOfBytes(data, pos, mp.GetSalt()[0:8])
    // 判断是否支持pulgin authentication
    // 来决定是否写入length of auth-plugin-data
    if (DefaultCapability & CLIENT_PLUGIN_AUTH) != 0 {
       // MO固定为20位+1位NUL
    pos = mp.io.WriteUint8(data, pos,             uint8(len(mp.GetSalt())+1))
  } else {
    pos = mp.io.WriteUint8(data, pos, 0)
  }
    // 默认为安全连接，写入Salt第二部分
  if (DefaultCapability & CLIENT_SECURE_CONNECTION) != 0 {
    pos = mp.writeCountOfBytes(data, pos, mp.GetSalt()[8:])
    pos = mp.io.WriteUint8(data, pos, 0)
  }
    // 写入auth_plugin_name，MO固定为mysql_native_password
  if (DefaultCapability & CLIENT_PLUGIN_AUTH) != 0 {
    pos = mp.writeStringNUL(data, pos, AuthNativePassword)
  }
    return data
}
```

wireshark抓包下一次服务端handshake包例子：

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

### handShakeResponse分析与处理

客户端收到后会处理分析handshake，返回handShakeResponse包：

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
            Connection Attribute - _client_version: 8.0.36
            Connection Attribute - program_name: mysql
```

Response中主要包括客户端的能力标识符，能接受的最大packet size，charset以及Auth的必要信息（非SSL连接）还有Connection Attributes MatrixOne发送完handshake包后等待客户端返回handshakeResponse,IsEstablished在handshake未完成前为false，代表等待读取handshake response并分析：

```sql
func (mo *MOServer) handshake(rs *Conn) error {
    // 下面开始处理handshake response

    // 根据Established标志位判断处理的信息是否为handshakeResponse
    if !protocol.IsEstablished() {
        // 核心分析代码, MO支持4.1版本协议
        var resp41 response41
        resp41 = analyseHandshakeResponse41()
        // 解析完成后进行身份认证
    }
    // 返回nil error代表handshake成功
    return nil
}


// 对照response的payload进行分析
func analyseHandshakeResponse41() response41 {
    // 4.1版本，一次性读入4位capabilities, 若发现不支持4.1协议则error
    info.capabilities, pos, ok = mp.io.ReadUint32(data, pos)
    if (info.capabilities & CLIENT_PROTOCOL_41) == 0 {
    error
  }
    // 读取4位最大packet Size 1位charset 跳过0填充
    info.maxPacketSize, pos, ok = mp.io.ReadUint32(data, pos)
    info.collationID, pos, ok = mp.io.ReadUint8(data, pos)
    pos += 23
    // SSL连接则返回，等待交换
    if pos == len(data) && (info.capabilities&CLIENT_SSL) != 0 {
    info.isAskForTlsHeader = true
    return true, info, nil
  }
    // 后续为非SSL情况，明文读取username
    // 根据capabilities决定读取password方式（明文/密文，定长/变长编码）
    info.username, pos, ok = mp.readStringNUL(data, pos)
    if (info.capabilities & CLIENT_PLUGIN_AUTH_LENENC_CLIENT_DATA) != 0
   else if (info.capabilities & CLIENT_SECURE_CONNECTION) != 0   else
    // 如果指定了database
    if (info.capabilities & CLIENT_CONNECT_WITH_DB) != 0 {
        info.database, pos, ok = mp.readStringNUL(data, pos)
    }
    // Plugin_Auth 仅支持mysql_native_password
    info.clientPluginName, pos, ok = mp.readStringNUL(data, pos)

    info.connectAttrs = make(map[string]string)
   if info.capabilities&CLIENT_CONNECT_ATTRS != 0 {
        // 变长编码读取connectAttrs
    }
    return true, info, nil
}
```

### Authenticate身份验证

解析完成handshakeResponse后，进行Authenticate信息认证环节，若认证成功则Establihed确认，连接完成。服务端会返回OK包，接下来开始handle 普通的command信息。

```sql
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

如果连接失败，如password错误，则返回ERROR包：

```sql
// Server Response
MySQL Protocol - response ERROR
    Packet Length: 75
    Packet Number: 2
    Response Code: ERR Packet (0xff)
    Error Code: 1045
    SQL state: 28000
    Error message: Access denied for user dump. internal error: check password failed
```

Authenticate的核心函数有2部分，一个为Session下的AuthenticateUser，包括验证用户身份、检查账户状态、检查角色权限以及验证数据库存在性等。另一个为checkPassword使用 SHA-1 哈希算法和盐（salt）来进行密码验证。AuthenticateUser使用到了Sql查询。

```sql
// 获得Sql查询语句
func getSqlFor***() (string, error) {
  err := inputIsInvalid(ctx, tenant)
  if err != nil {
    return "", err
  }
  return fmt.Sprintf(check***ormat, tenant), nil
}
// 执行Sql查询
func executeSQLInBackgroundSession(sql string) ([]ExecResult, error) {
  bh := NewBackgroundExec(reqCtx, upstream, mp)
  defer bh.Close()
  err := bh.Exec(reqCtx, sql)
  if err != nil {
    return nil, err
  }
  return getResultSet(reqCtx, bh)
}
// AuthenticateUser主要通过Sql查询验证用户在数据库中的信息
func (ses *Session) AuthenticateUser {
    // 将tenant信息set到session中
    ses.SetTenantInfo(tenant)
    // check tenant exit
    // check account status
    // check user:role
    // GetPassword 用于将存储的password由哈希值转换为字节数组
    return GetPassWord(pwd)
}
// 校验client发来的auth和数据库中的pwd
func checkPassword(pwd, salt, auth []byte) {
   ses := mp.GetSession()
   // 计算 SHA-1(salt + pwd)
  sha := sha1.New()
  _, err := sha.Write(salt)
  _, err = sha.Write(pwd)
  hash1 := sha.Sum(nil)
    // 验证 auth 和 hash1 长度是否相等
  if len(auth) != len(hash1) {
    return false
  }
    //  XOR操作
  for i := range hash1 {
    hash1[i] ^= auth[i]
  }
    // 计算 SHA-1(hash1)
  hash2 := HashSha1(hash1)
    // 比较还原的哈希值与存储的密码哈希值
  return bytes.Equal(pwd, hash2)
}
```

### SSL连接

SSL连接下的handshake主要交互如下：

![tupian2](/content/zh/mo-mysql-protocol-implementation/mysql2.png)

进一步，从wireshark抓下的数据包来分析，服务端发出的handshake包中，Server Capabilities的SSL标志位被置为1。

```sql
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

response包下，username后开始就是通过ssl传输的加密数据：

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

建立ssl连接的具体代码如下：

```sql
func analyseHandshakeResponse41() {
    // 当SSL标志位=1时直接返回  if pos == len(data) && (info.capabilities&CLIENT_SSL) != 0 {
    info.isAskForTlsHeader = true
    return true, info, nil
  }
}
func Handler() {
    if isTlsHeader {
       // golang 标准库crypto/tls
      tlsConn := tls.Server(rs.RawConn(), rm.getTlsConfig())
       protocol.SetTlsEstablished()
    }
}
```

## Command Phase

### MatrixOne网络缓冲区

介绍具体Command执行流程前，先简单提一下MatrixOne基本的网络读写方式。MatrixOne对原始的net.Conn连接进行了封装，主要是加入针对MySQL协议的缓冲区设计，核心方法是通过复用固定大小的缓冲区（默认为1MB）来减少内存的分配次数。当数据包超过固定缓冲区大小后，继续写入由链表构成的动态缓冲区。下面是封装后Conn的主要结构代码：

```sql
// 缓冲区的基本单位，由数据切片和写指针构成
type ListBlock struct {
  data       []byte
  writeIndex int
}

type Conn struct {    // 标识唯一ID
  id                    uint64
  conn                  net.Conn
    // 维护正确的SeqID
  sequenceId            uint8
    // 固定缓冲区
  fixBuf *ListBlock
    // 动态缓冲区，由链表实现
  dynamicBuf *list.List
    // curBuf和curHeader标记当前写入块和Packet的header
  curBuf *ListBlock
  curHeader []byte
  // 当前缓冲区数据量和当前Packet数据量
  bufferLength int
  packetLength int
}
```

除了MySQL协议中的状态响应包(OK, EOF, ERROR)需要立即发送外，其他的数据包都会先存储在缓冲区中，等待状态响应包一起发送，目的是减少系统调用写操作的次数。需要注意的是无法事先知道一个数据包的大小，因此总是预先留下4个Byte的Packet header，等到包结束时再回头写入Packet size和Seq ID。

```sql
func (c *Conn) Append(elems ...byte) error {
    // 除了对于>16MB的额外判断，核心方法为AppendPart
    err = c.AppendPart(elems)
    return err
}
func (c *Conn) AppendPart(elems []byte) error {
  var err error
    // 计算当前block剩下的空间
  curBufRemainSpace := len(c.curBuf.data) - c.curBuf.writeIndex
  if len(elems) > curBufRemainSpace {
    // 当前block剩余大小不足则要新block
    copy(c.curBuf.data[c.curBuf.writeIndex:], elems[:curBufRemainSpace])
    c.curBuf.writeIndex += curBufRemainSpace
    curElemsRemainSpace := len(elems) - curBufRemainSpace
       // PushNewBlock 分配了新的内存并放入动态缓冲区中并修改c.curBu引f的用
    err = c.PushNewBlock(curElemsRemainSpace)
    copy(c.curBuf.data[c.curBuf.writeIndex:], elems[curBufRemainSpace:])
    c.curBuf.writeIndex += len(elems[curBufRemainSpace:])
  } else {
    // 否则直接在当前块末尾继续写入
    copy(c.curBuf.data[c.curBuf.writeIndex:], elems)
    c.curBuf.writeIndex += len(elems)
  }
  return err
}

func (c *Conn) BeginPacket() error {
    // 记录下当前Packet的Header位置
    c.curHeader = c.curBuf.data[c.curBuf.writeIndex : c.curBuf.writeIndex+HeaderLengthOfTheProtocol]
    // 跳过Header
    c.curBuf.writeIndex += HeaderLengthOfTheProtocol
    c.bufferLength += HeaderLengthOfTheProtocol
  return nil
}

func (c *Conn) FinishedPacket() error {
  // 当前包结束后，向预先留出的header位置写入PacketSize和Seq ID
  binary.LittleEndian.PutUint32(c.curHeader, uint32(c.packetLength))
  c.curHeader[3] = c.sequenceId
  return nil
}
func (c *Conn) FlushIfFull() error {
  // FlushIfFull只检测是否需要调用Flush
}

func (c *Conn) Flush() error {
  // WriteToConn作用是安全地将数据写入到网络中
  err = c.WriteToConn(c.fixBuf.data[:c.fixBuf.writeIndex])
  // 固定缓冲区写入完成后，若动态缓冲区内有额外的数据也需写入
  for node := c.dynamicBuf.Front(); node != nil; node = node.Next() {
    block := node.Value.(*ListBlock)
    err = c.WriteToConn(block.data[:block.writeIndex])
  }
  return err
}

// 只有状态响应包OK,EOF,ERROR会直接经由Write发送
func (c *Conn) Write(payload []byte) error {
  // 先将缓冲区数据全部发送
  err = c.Flush()
  // 构造状态响应包的Header，并一起发送
  var header [4]byte
  length := len(payload)
  binary.LittleEndian.PutUint32(header[:], uint32(length))
  header[3] = c.sequenceIderr
  c.sequenceId += 1
  err = c.WriteToConn(append(header[:], payload...))
  return err
}
```

### Query结构

当Connection结束以后，服务端和客户端的连接成功建立，则开始处理不同的Command。客户端会持续发送Request Command Query，MySQL官方文档中的Request Command Query结构是这样：

```sql
// Client Request
Request Command Query
    Command: Query (3)
    Statement: select * from t
```

一条Request Command Query的第一个字节代表command Type，我们以最简单常用的query Type为例，除掉特殊情况的判断，其实一条Request Command Query只有两个部分：

1、command Type

2、query string （NullTerminatedString）

发送来的数据包首先以字节切片的形式，被服务端的Read函数接收，然后最终传递给handlerRequest处理，handleRequest经过层层调用后最终会进入到核心的ExecuteStmt函数。接下来对常见的语句分别描述执行流程。

```sql
// 缓冲区的基本单位，由数据切片和写指针构成
type ListBlock struct {
  data       []byte
  writeIndex int
}

type Conn struct {    // 标识唯一ID
  id                    uint64
  conn                  net.Conn
    // 维护正确的SeqID
  sequenceId            uint8
    // 固定缓冲区
  fixBuf *ListBlock
    // 动态缓冲区，由链表实现
  dynamicBuf *list.List
    // curBuf和curHeader标记当前写入块和Packet的header
  curBuf *ListBlock
  curHeader []byte
  // 当前缓冲区数据量和当前Packet数据量
  bufferLength int
  packetLength int
}
```

### SELECT语句

在一次SELECT语句中，客户端和服务端的交互行为是这样的：

![tupian3](/content/zh/mo-mysql-protocol-implementation/mysql3.png)

select语句进入服务端经过解析分类后，调用executeStmtWithResponse进行执行。

```sql
func Handler(msg interface{}) {
    // 确认连接确定
    if ！protocaol.IsEstablished() {}

    // 将Payload数据流解构为Request结构体
    req := protocol.GetRequest(payload)
    // 核心代码
    routine.handleRequest(req)
}

func handleRequest(req *Request) {
    // query计划最终进入此函数，执行并发送结果
    executeStmtWithResponse()

}
```

最终会落在ExecuteResultRowStmt函数中，该函数会完成sql的Parse，生成plan，compile等，并且发送列数和列定义后进行run，并最终发送Text row result。我们重点关注执行完成后，结果的编码，发送方式。

```sql
func executeStmtWithResponse() {
    // 核心函数，包括执行和发送结果数据
    executeStmt()
    // 响应client，发送状态包
    respClientWhenSuccess()

}
func respClientWhenSuccess() {
    // 最终响应函数，通过发送结果状态包结束此次查询
    switch stmt.RespType() {
        // select下执行的返回函数
        case tree.RESP_STREAM_RESULT_ROW:
            respStreamResultRow()
    }
}
func executeStmt() {
    // 返回结果行的数据最终进入此函数
    executeResultRowStmt()
}
func executeResultRowStmt()  {
    // 返回列数和定义后执行查询计划
    respColumnDefsWithoutFlush()
    Run()
}
```

结果的发送主要由三个部分组成：ColumnCount，Columns和TextRow。接下来分别关注这三个函数内部做的事情。ColumnCount由长度编码整形的方式编码，单独1个packet发送。

```sql
func SendColumnCountPacket(count uint64) {
    // 以LengthEncodedInteger编码方式发送ColumnCount
    pos = writeIntLenEnc(data, pos, count)
     // appendPacket内部调用Conn的BeginPacket, Append, FinishedPacket等逻辑
    appendPackets(data)
}
```

根据ColumnCount，每一列的Def单独发送为一个Packet，在所有列的Packet发送完后发送EOF

```sql
func sendColumns(set ResultSet) {
    // 依次发送每一列的Def
    for i := uint64(0); i < set.GetColumnCount(); i++ {
    col := set.GetColumn(i)
    SendColumnDefinitionPacket(col)
    }
    // 以EOF结尾
    sendEOFPacket()
}
func SendColumnDefinitionPacket(column Column) {
    // 核心代码 生成列Def Packets
    data := makeColumnDefinition(column)
    appendPackets(data)
}
```

makeColumnDefinition生成和MySQL文档协议中基本相同的Packet并发送。flags为标志编码，包含了列的特性(Not NULL，primary key)等。

```sql
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

此外，除了executeResultRowStmt，在例如Insert，Update等语句中，结果返回为执行状态，则进入到executeStatusStmt中，则不再返回列定义，实际行数据，仅使用respClientWhenSuccess返回最终状态包。这里不再赘述。

Run执行时，每个结果batch最终都进入RespResult函数中，并最终调用WriteResultSetRow按行发送，与列定义和状态包不同，这里的结果发送使用效率更高的方法直接将字节流写入tcp的缓冲区中而不是再重新进行构造，具体实现过程如下：

```sql
// 参数为结果集和行数
func Write(bat *batch.Batch) {

    for j := 0; j < n; j++ {
        // 逐行从列向量中提取行数据
        extractRowFromEveryVector(bat, j, mrs.Data[0])
        // 发送行数据
        WriteResultSetRow(&mrs, 1)
  }
}
func WriteResultSetRow(mrs *MysqlResultSet, cnt uint64) {
    // 调用Conn中的BeginPacket方法，开始新的协议包
    beginPacket()
    // 准备数据
    appendResultSetTextRow(mrs, i)
    // 行写入完成，结束协议包
    FinishedPacket()
}

func appendResultSetTextRow(data []byte, r uint64) []byte {
  for i := uint64(0); i < GetColumnCount(); i++ {
    column, err := set.GetColumn(i)
         // 空值为定义为0xfb
         if isNil(column) {
            appendUint8(data, 0xFB)
      } else {
         // 其余类型使用string<lenenc>编码，添加到buffer中
            switch column.ColumnType() {
                appendStringLenEnc(value)
      }
       }
  }
}
func appendStringLenEnc(value string) {
    // Append最终调用上述介绍的Conn.Append将字节写入缓冲区中
    Conn.Append([]byte(value[:length])...)
}
```

### Prepare/Execute

Prepare语句可以在CLI中直接调用自定义命名后使用Execute和SET @var执行。也可在JDBC中直接使用方法而不显式指定statement name。两种情况的协议包不同，下面分别进行描述。

#### Prepare(CLI)

Prepare/Set/Execute在CLI中执行，request包中的command type仍然为query。其中Prepare和Set仅会返回OK包，而Execute与直接执行对应语句返回结果相同。以下是Prepare query结构

```sql
// Client Request
Request Command Query
    Command: Query (3)
    Statement: PREPARE stmt FROM 'select * from t where name
```

服务端接收到请求后，和普通的query相同，最终进入到executeStmt中：

```sql
func executeStmt() {
    // prepare在frontend中直接执行
    execInFrontend()
}
func execInFrontend() {
    // 根据stmt的type，CLI中的Prepare进入到doPrepareString中
    switch st := execCtx.stmt.(type) {
        case *tree.PrepareString:
            // 核心代码
            doPrepareString()
    }
}

func doPrepareString() {
    // perpare后面的sql在该函数中被parse以及build plan
    stmts = mysql.Parse(Sql)
    preparePlan = buildPlan()

    // name,stmt，plan等一起封装到prepareStmt中
    SetPrepareStmt(name, prepareStmt)
}
func SetPrepareStmt(name, prepareStmt) {
    // 保存到map中
    ses.prepareStmts[name] = prepareStmt
}
```

服务端处理成功后，返回OK数据包给客户端。同样通过respClientWhenSuccess函数。

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

核心代码：

```sql
func respClientWhenSuccess() {
    respClientWithoutFlush()
}

func respClientWithoutFlush() {
    switch execCtx.stmt.StmtKind().RespType() {
        // 返回为status类型
        case tree.RESP_STATUS:
        respStatus(ses, execCtx)
    }
}
func respStatus() {
    switch st := execCtx.stmt.(type) {
        case *tree.PrepareStmt, *tree.PrepareString:
        // command type为query而不是PREPARE
        if ses.GetCmd() == COM_STMT_PREPARE {

    } else {
          // 准备并发送OK包
      resp := setResponse(ses, execCtx.isLastStmt, rspLen)
      SendResponse(execCtx.reqCtx, resp)}
    }
}
```

#### Set(CLI)

Prepare结束后，CLI通常需要使用Set进行变量的赋值，然后才执行ExecuteSet语句进入executeStmt后，和Prepare一样在execInFrontend执行，落到SetVar case中，通过虚拟表得到具体数据后存入map中：

```sql
func execInFrontend() {
    // 根据stmt的type，CLI中的Prepare进入到doPrepareString中
    switch st := execCtx.stmt.(type) {
        case *tree.SetVar:
            // 核心代码
            doSetVar()
    }
}
func doSetVar() {
    value := getExprValue()
    SetUserDefinedVar(value)
}
func getExprValue() {
    // 拼接一个从dual表中select的ast
    compositedSelect = ...
    tempExecCtx := ExecCtx{
    reqCtx: execCtx.reqCtx,
    ses:    ses,
  }
    // 在临时上下文中执行
  executeStmtInSameSession(tempExecCtx.reqCtx, ses, &tempExecCtx, compositedSelect)
    // 提取执行结果，也就是变量的实际值
  batches := ses.GetResultBatches()
}
func SetUserDefinedVar(value interface{}) {
    // 用户定义的变量存入map中
    ses.userDefinedVars[strings.ToLower(name)] = &UserDefinedVar{Value: value, Sql: sql}

}
```

#### Execute(CLI)

Prepare和Set结束后，通过Execute传入变量执行，CLI中传递的command type也为 query：

```sql
// Client Request
Request Command Query
    Command: Query (3)
    Statement: EXECUTE stmt using @name
```

服务端收到request，在doComQuery中首先为后续提取param进行函数赋值：

```sql
func doComQuery() {
    // 设置后续取参数时使用的函数
    proc.SetResolveVariableFunc(ResolveVariable)
}
func ResolveVariable(varName string) {
    // 提取用户定义的参数
    GetUserDefinedVar(varName)
}
func GetUserDefinedVar(varName string) {
    // 在map中提取并返回
    val, ok := userDefinedVars[strings.ToLower(varName)]
    return val
}
```

进入executeStmt后，首先进入到executeStmt中并compile实际的execute语句，从map中提取已经存好的plan，然后在userDefinedVars中根据变量名提取实际参数，之后将实际参数与plan一起进行执行。

```sql
func Compile() {
    // 常规build plan
    plan := buildPlan()
    // 判断如果是execute type, 进行Plan替换
    if _, ok := cwft.stmt.(*tree.Execute); ok {
        plan, stmt, sql := replacePlan(plan)
    }
    // 替换完毕后继续进行后续执行
}
func replacePlan(plan) {
    //根据提取到的stmtName，从map中读取stmt
    stmtName := execPlan.GetName()
    prepareStmt := GetPrepareStmt(stmtName)
    if prepareStmt.params != nil {
    // param不为nil为jdbc情况，jdbc在parse时已经提取参数
    } else {
    // CLI执行的execute在replacePlan阶段提取parama实际值
        for i, arg := range Plan.Args {
            // 调用doComQuey阶段决定好的函数提取param
            param = GetResolveVariableFunc()(varName)
            paramVals[i] = param
        }
        //
        SetPrepareParams(prepareStmt.params)
        // 绑定到compile结果中
        cwft.paramVals = paramVals
        return prepareStmt.PreparePlan
    }
}
```

替换完成后，返回到executeStmt后，获得的已经是重写后的执行计划，再进行常规的处理。结束后最终根据execute的实际语句进入到executeResultRowStmt或者executeStatusStmt，CLI中executeResultRowStmt与直接Select相同，发送列数，列定义后，以长度编码字符串的形式按行发送所有结果。

```sql
func executeResultRowStmt() {
    // 发送列数和列定义
    respColumnDefsWithoutFlush()
    // 执行完毕后发送所有行数据
    Run()
}
```

#### Prepare(JDBC)

JDBC中，Prepare操作发送的的数据包中，command type不再为query，而是prepare statement。客户端和服务端的交互也会发生变化，具体如下：

![tupian4](/content/zh/mo-mysql-protocol-implementation/mysql4.png)

Prepare command的结构如下：

```sql
// Client Request
Request Command Prepare Statement
    Command: Prepare Statement (22)
    Statement: select * from t where name = ?
```

服务端接收到数据后，行为与CLI相似，最终也会落到execInFrontend中，不过在switch中执行tree.PrepareStmt而不是tree.PrepareString。

```sql
func execInFrontend() {
    // 根据stmt的type，jdbc中的Prepare进入到doPrepareStmt中
    switch st := execCtx.stmt.(type) {
        case *tree.PrepareStmt:
            // 核心代码
            doPrepareStmt()
    }
}
func doPrepareStmt() {
    // 不需要再执行parse
    preparePlan = buildPlan()
    SetPrepareStmt(name, prepareStmt)
}
func SetPrepareStmt(name, prepareStmt) {
    // 保存到map中
    ses.prepareStmts[name] = prepareStmt
}
```

服务端处理成功后，进入到respStatus的SendPrepareResponse函数中, SendPrepareResponse完成全部的PrepareResponse发送任务。

```sql
func respStatus() {
    switch st := execCtx.stmt.(type) {
        case *tree.PrepareStmt, *tree.PrepareString:
        // command type为PREPARE而不是query
        if ses.GetCmd() == COM_STMT_PREPARE {
      SendPrepareResponse()
    } else {
    }
}
func SendPrepareResponse() {
    // PrepareResponse首先发送带有param和column数量的OK包
    SendOKPacket()
    // 分别发送每个param数量的？def和table本身的column def
    // 都以EOF结尾
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

#### Execute(JDBC)

jdbc中执行Execute的交互流程与直接执行的最大区别在于不再使用Text协议而是为了提高效率使用Binary的方式，具体交互流程如下：

![tupian5](/content/zh/mo-mysql-protocol-implementation/mysql5.png)

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

服务端接收到Command type = Execute后，在doComQuery之前，首先调用parseStmtExecute进行parse，parse中会以binary的形式提取execute语句中的实参。并绑定到对应的当前session的prepareStmts中:

```sql
func ExecRequest() {
    switch req.GetCmd() {
        case COM_STMT_EXECUTE:
            // 读取prepareStmt结构体和sql字符串
            sql, prepareStmt := parseStmtExecute(data)
            doComQuery(&UserInput{sql: sql})
}
func parseStmtExecute(data) {
    // 读取stmtID
    stmtID := binary.LittleEndian.Uints32(data[0:4])
    // 拼接Prepare时生成的stmtName
    stmtName := fmt.Sprintf("%s_%d", prefixPrepareStmtName, stmtID)
    // 获取Stmt的plan，sql等
    preStmt := GetPrepareStmt(stmtName)
    sql := fmt.Sprintf("execute %s", stmtName)
    // 提取params并绑定
    ParseExecuteData()
    return sql, preStmt
}
func ParseExecuteData() {
    // 获得params数量
    preStmt = len(preStmt.PreparePlan.ParamTypes)
    // 读取null位图
    var nullBitmaps []byte
    nullBitmapLen := (numParams + 7) >> 3
    nullBitmaps = readCountOfBytes(nullBitmapLen)
    // 对每个变量，根据不同的参数type进行读取
    for i := 0; i < numParams; i++ {
        tp := stmt.ParamTypes[i<<1]
        switch defines.MysqlType(tp) {
            // 以varchar为例，长度编码字符串读取
            case defines.MYSQL_TYPE_VARSTRING：
                val := readStringLenEnc(data)
                // 绑定到stmt的vector中
                SetAnyToStringVector(val, vector)
        }
    }
}
```

与CLI相似，replacePlan函数内进行参数替换后进行plan的执行。然后进行response的发送。如果执行的是返回数据行的语句，例如select，则最终结果将通过Binary的方式进行发送给而不是Text，除了编码方式外，剩下的逻辑相同，具体代码如下：

```sql
func SendResultSetTextBatchRowSpeedup() {
    // 以二进制协议发送每一行的结果数据
    for i := uint64(0); i < cnt; i++ {
        beginPacket()
        appendResultSetBinaryRow(resultSet, i)
        finishedPacket()
  }
}
func appendResultSetBinaryRow() {
    // 协议开头1字节固定为0
    data = mp.append(data, defines.OKHeader)
    // 根据列数量定义null位图大小
    numBytes4Null := (columnsLength + 7 + 2) / 8
    // 检查每一列是否为空
    for i := uint64(0); i < columnsLength; i++ {
        isNil := ColumnIsNull(i)
        if isNil {
            // 找到该列在位图中的位置
            bytePos := (i + 2) / 8
            bitPos := byte((i + 2) % 8)
            idx := int(bytePos)
            // 将对应的位设置为1，表示该列值为NULL
            buffer[idx] |= 1 << bitPos
        }
    }
  }
    data = Conn.Append(data, buffer...)
    // 依次添加每一列
    for i := uint64(0); i < columnsLength; i++ {
        column, err := GetColumn(i)
        // 根据不同的数据类型选择不同的编码方式
        switch column.ColumnType() {
            Conn.Append(column.GetString())
        }
    }
}
```

### LOAD DATA LOCAL INFILE

LOAD DATA LOCAL INFILE 用于客户端从本地的文件加载数据到MatrixOne数据库表中。整个网络交互流程上，客户端首先发送给load local infile query command， 其中包括文件路径，目标表，分隔符等等数据。服务端返回包含filename的LOCAL INFILE Packet。客户端收到后开始正式发送文件内数据，以空包代表结束。整体交互流程如下：

![tupian6](/content/zh/mo-mysql-protocol-implementation/mysql6.png)

协议包结构如下：

```sql
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

服务端端收到request后，经过executeStmt进行构建编译判断为LOAD LOCAL后，首先加入io.Pipe()用于后续数据流的读取和写入。然后由executeStatusStmt执行。executeStatusStmt中将进行判断是否为LOAD语句，进入processLoadLocal函数执行完成整个LOAD LOCAL流程：

```sql
func executeStmt() {
    switch st := stmt.(type) {
        case *tree.Load:
        if st.Local {
          // 创建io.Pipe()用于后续从client读取数据后进行写入
          // 读取逻辑在外部external.go文件中
      LoadLocalReader, loadLocalWriter = io.Pipe()
    }
    }
    executeStatusStmt()
}
func executeStatusStmt() {
    // 处理Load Local
    processLoadLocal()
}
func processLoadLocal() {
    // tcp读写接口
    mysqlRrWr := ses.GetResponser().MysqlRrWr()
    // 初始化文件相关参数，如路径格式等
    InitInfileParam()
    // 对client发送FilePath
    WriteLocalInfileRequest(Filepath)
    for {
        // 持续读取client发送的数据，直到空包后break
        msg, err = mysqlRrWr.Read()
        if err != nil {
      break
        }
        // writer为一个Pipeline
        writer.Write(msg)
    }
}
func WriteLocalInfileRequest(Filepath stirng) {
    // 以定长字符串形式编码
    req := writeStringFix(filename, len(filename))
    // 写入数据至client
    writePackets(req)
}
```
