---
title: Upgrading CentOS 7 to the 5.4 Kernel
author: MatrixOrigin
mail: contact@matrixorigin.cn
description: MatrixOne is developed in Golang, and Golang programs may trigger bugs and cause application crashes on Linux systems with low kernel versions. CentOS 7 uses the relatively old Kernel 3.10.0. To help users run MatrixOne more stably, the community has prepared a simple guide for upgrading the CentOS 7 kernel to 5.0+ after multiple rounds of regression testing.
tags:
  - News
keywords:
  - MatrixOne
  - HTAP database
  - hyper-converged database
  - cloud-native database
  - Linux
  - Golang
publishTime: '2024-04-08 17:00:00+08:00'
image:
  '1': /images/blog-covers/news.png
  '235': /images/blog-covers/news.png
date: '2024-04-08 17:00:00+08:00'
lang: en
status: published
translations:
  zh: centos7-upgrade-5-4kernel-zh
---

The operating systems recommended for deploying MatrixOne include Debian 11+, Ubuntu 20.04+, CentOS 9+, and other systems with Linux kernel versions higher than 5.0. As the support lifecycle of CentOS 7 approaches its end, many community users have been discussing replacement Linux operating systems. Through a survey, we found that many users are still using CentOS 7 and, for various reasons, cannot upgrade or replace it in the short term.

MatrixOne is developed in Golang, and Golang programs may trigger bugs and cause application crashes on Linux systems with low kernel versions. CentOS 7 uses the relatively old Kernel 3.10.0. To help users run MatrixOne more stably, after multiple rounds of regression testing, the community has prepared a simple guide for upgrading the CentOS 7 kernel to 5.0+.

The Linux kernel is the foundational component of the operating system. It manages hardware resources and provides basic operating system capabilities. For Linux kernel versions, we usually focus only on the latest stable version and the long-term maintenance version:

## Stable

**Latest stable version.** After each mainline kernel is released, it is considered "stable." Any bug fixes for a stable kernel are backported from the Mainline tree and applied by the designated stable kernel maintainers. Before the next mainline kernel becomes available, there are usually only a few bug-fix kernel releases, unless it has been designated as a "long-term maintenance kernel." Stable kernel updates are released as needed, usually two to three times per month.

## Long-term

**Long-term maintenance version.** Several "long-term maintenance" kernel versions are usually provided to fix bugs in older kernels. These kernels only fix major bugs and are not released frequently. In general, we recommend using a long-term maintenance kernel.

**The current list of Linux Kernel Organization long-term maintained kernel versions is shown below. Because the original CentOS 7 kernel version is relatively low, we recommend upgrading to the 5.4 kernel:**

![Linux kernel lifecycle](./images/linux-kernel-life-cycle.jpg)

ELRepo is a reliable third-party repository for CentOS. This repository mainly includes file-system drivers, webcam drivers, and more. ELRepo has always provided stable kernels. In this guide, we use the RPM kernel packages provided by this repository to quickly upgrade the CentOS 7 kernel. The entire kernel upgrade requires only four steps:

## 1. Obtain the Kernel RPM Packages

First, visit the CentOS 7 kernel directory in the repository and download the latest minor version of the 5.4 kernel. ELRepo only keeps the latest two minor versions for each major kernel version. For example, to download the current latest 5.4.272 version, a normal upgrade usually requires only the following two RPM files:

```shell
wget https://elrepo.org/linux/kernel/el7/x86_64/RPMS/kernel-lt-5.4.272-1.el7.elrepo.x86_64.rpm
wget https://elrepo.org/linux/kernel/el7/x86_64/RPMS/kernel-lt-devel-5.4.272-1.el7.elrepo.x86_64.rpm
## kernel-lt (lt=long-term) indicates a long-term maintenance version.
```

## 2. Install the Kernel

Check the current kernel version of the system. The default kernel version of CentOS 7.9 is as follows:

```shell
uname -r
3.10.0-1160.el7.x86_64
```

Use the `rpm` command in Linux to quickly install the downloaded kernel RPM packages:

```shell
rpm -ivh kernel-lt-5.4.272-1.el7.elrepo.x86_64.rpm
rpm -ivh kernel-lt-devel-5.4.272-1.el7.elrepo.x86_64.rpm
```

## 3. Configure grub2

After the kernel is installed, it must be set as the default boot option and will take effect after reboot. Use the following command to view system boot entries:

```shell
awk -F\' '$1=="menuentry " {print i++ " : " $2}' /boot/grub2/grub.cfg
```

The returned values are as follows. The newly installed kernel is usually numbered 0:

```shell
awk -F\' '$1=="menuentry " {print i++ " : " $2}' /boot/grub2/grub.cfg
0 : CentOS Linux (5.4.272-1.el7.elrepo.x86_64) 7 (Core)
1 : CentOS Linux (3.10.0-1160.108.1.el7.x86_64) 7 (Core)
2 : CentOS Linux (3.10.0-1160.el7.x86_64) 7 (Core)
3 : CentOS Linux (0-rescue-b098c1cb796f4ebe8878b57bb1ddadca) 7 (Core)
```

Set the corresponding kernel number to `0`, which means using the kernel shown as number 0 by the `awk` command above as the default kernel:

```shell
grub2-set-default 0
```

## 4. Reboot and Verify

Upgrading the Linux kernel may cause system stability or compatibility issues. We recommend backing up important files and data before rebooting, and validating the change in a test environment.

After backup and testing, reboot the operating system to confirm that the kernel has been updated:

### Reboot Command

```shell
reboot
```

### Check the Kernel Version. You can see that the kernel has been upgraded to version 5.4.

```shell
uname -r
5.4.272-1.el7.elrepo.x86_64
```

In general, different kernel versions in CentOS do not affect one another. If you need to switch back to the default kernel later, you can still do so by modifying the default boot entry number and rebooting.

After confirming that the new kernel is correctly enabled, you can deploy and use MatrixOne with confidence. If you encounter any issues during use, feel free to communicate with the community at any time.
