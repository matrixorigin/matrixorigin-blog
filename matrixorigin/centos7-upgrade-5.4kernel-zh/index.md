---
title: CentOS 7 升级 5.4 内核
author: MatrixOrigin
mail: contact@matrixorigin.cn
description: >-
  MatrixOne 使用 Golang 语言开发，而 Golang 程序在低 Kernel 内核的 Linux 系统中有概率会触发 Bug 导致应用
  Crash。CentOS 7 使用的内核版本为较为陈旧的 Kernel 3.10.0，为了让小伙伴们更加稳定的使用
  MatrixOne，经过测试多轮回归测试验证，社区为大家整理了 CentOS 7 内核升级至 5.0+ 的简易方案。
tags:
  - 新闻
keywords:
  - MatrixOne
  - HTAP 数据库
  - 超融合数据库
  - 云原生数据库
  - Linux
  - Golang
publishTime: '2024-04-08 17:00:00+08:00'
image:
  '1': /content/zh/shared/tech.png
  '235': /content/zh/shared/tech.png
date: '2024-04-08 17:00:00+08:00'
lang: zh
status: published
---

MatrixOne 推荐部署使用的操作系统为 Debian 11+、Ubuntu 20.04+、CentOS 9+ 等 Kernel 内核版本高于 5.0 的操作系统。随着 CentOS 7 的支持周期接近尾声，社区不少小伙伴都在讨论用以替换的 Linux 操作系统，经过问卷调查，我们发现小伙伴们的操作系统大都仍为 CentOS 7，并且由于种种原因无法在短期内进行更新替换。

MatrixOne 使用 Golang 语言开发，而 Golang 程序在低 Kernel 内核的 Linux 系统中有概率会触发 Bug 导致应用 Crash。CentOS 7 使用的内核版本为较为陈旧的 Kernel 3.10.0，为了让小伙伴们更加稳定的使用 MatrixOne，经过测试小哥哥多轮回归测试验证，社区为大家整理了 CentOS 7 内核升级至 5.0+ 的简易方案。

Linux 内核是操作系统的基础组件，负责管理硬件资源和提供基本操作系统功能。对于 Linux 内核版本，我们通常只关注最新稳定版和长期维护版：

## Stable

**最新稳定版**，每个主线内核被发布后，即被认为是“stable”。任何对 stable 内核的 BUG 修复都会从 Mainline 主线树中回溯并由指定的 stable 内核维护人员使用。在下一个主线内核可用之前，通常只有几个 BUG 修复内核版本 - 除非它被指定为“long-term maintenance kernel（长期维护内核）”。Stable 内核更新按需发布，通常每月 2-3 次。

## Long-term

**长期维护版**，通常会提供几个“long-term maintenance”内核版本，用于修复旧版内核的 BUG。这些内核只会修复重大 BUG，并且不会频繁发布版本。通常情况下，我们较推荐使用长期维护版的内核。

**目前 Linux Kernel Organization 长期维护的内核版本列表如下。由于 CentOS 7 原始内核版本较低，我们建议选择升级至 5.4 版本的内核：**

![Linux 内核生命周期](/content/zh/centos7-upgrade-5.4kernel/linux-kernel-life-cycle.jpg)

ELRepo 是 CentOS 可靠的第三方仓库，该软件源主要包含文件系统驱动以及网络摄像头驱动程序等等。ELRepo 提供的内核稳定性一向很好，本次我们演示使用该仓库提供的 rpm 内核包进行 CentOS 7 的快速内核升级，整个内核升级操作仅需要 4 步：

## 1. 内核 rpm 包获取

首先，访问仓库下的 CentOS 7 内核目录，下载 5.4 版本的最新小版本内核，ELRepo 只会保留大版本内核最新的两个小版本，例如下载当前最新的 5.4.272 版本，普通升级通常只需要下载如下 2 个 rpm 文件：

```shell
wget https://elrepo.org/linux/kernel/el7/x86_64/RPMS/kernel-lt-5.4.272-1.el7.elrepo.x86_64.rpm
wget https://elrepo.org/linux/kernel/el7/x86_64/RPMS/kernel-lt-devel-5.4.272-1.el7.elrepo.x86_64.rpm
## kernel-lt（lt=long-term），表示长期维护版。
```

## 2. 内核安装

查看系统当前的内核版本，CentOS 7.9 默认的内核版本如下：

```shell
uname -r
3.10.0-1160.el7.x86_64
```

在 Linux 系统中通过 `rpm` 命令快速安装下载的内核 rpm 包：

```shell
rpm -ivh kernel-lt-5.4.272-1.el7.elrepo.x86_64.rpm
rpm -ivh kernel-lt-devel-5.4.272-1.el7.elrepo.x86_64.rpm
```

## 3. 设置 grub2

内核安装好后，需要设置为默认启动选项并重启后才会生效。查看系统启动项的命令为：

```shell
awk -F\' '$1=="menuentry " {print i++ " : " $2}' /boot/grub2/grub.cfg
```

返回值如下，新安装的内核通常的编号为 0：

```shell
awk -F\' '$1=="menuentry " {print i++ " : " $2}' /boot/grub2/grub.cfg
0 : CentOS Linux (5.4.272-1.el7.elrepo.x86_64) 7 (Core)
1 : CentOS Linux (3.10.0-1160.108.1.el7.x86_64) 7 (Core)
2 : CentOS Linux (3.10.0-1160.el7.x86_64) 7 (Core)
3 : CentOS Linux (0-rescue-b098c1cb796f4ebe8878b57bb1ddadca) 7 (Core)
```

设置对应内核的序号，指定为 `0`，表示使用上文 awk 命令显示的编号为 0 的内核作为默认内核：

```shell
grub2-set-default 0
```

## 4. 重启验证

Linux 内核升级可能会导致系统稳定性问题或兼容性问题，建议您重启前备份重要的文件和数据，并在测试环境中验证变更。

备份测试后，重启操作系统，来确认内核已完成更新：

### 重启命令

```shell
reboot
```

### 内核版本查看，可以看到内核已升级至 5.4 版本

```shell
uname -r
5.4.272-1.el7.elrepo.x86_64
```

通常来说，CentOS 中各个版本的内核不会互相影响，若您在后续使用中需要切换会默认内核，仍可通过修改默认启动项序号来重启切换。

在确认新内核已正确启用后，您就可以愉快的部署使用 MatrixOne 啦，在使用过程中有任何问题，欢迎小伙伴们随时在社区交流。
