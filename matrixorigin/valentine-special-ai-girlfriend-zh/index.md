---
title: 七夕特辑 | 我用 AI 创造一个虚拟女友
author: 梁鸿毅
mail: lianghongyi@matrixorigin.cn
description: 本文采用微信聊天记录微调预训练模型，打造模仿女友语气的AI聊天机器人。
tags:
  - 新闻
keywords:
  - neolink.ai
  - 算力
  - 4090显卡
  - MatrixOrigin
  - MatrixOne
publishTime: '2024-08-16 17:00:00+08:00'
image:
  '1': /content/zh/three-years-anniversay-ceremony/news.png
  '235': /content/zh/three-years-anniversay-ceremony/news.png
date: '2024-08-16 17:00:00+08:00'
lang: zh
status: published
---

最近 Neolink.AI 开放使用

新用户赠送免费算力

有这种好事,当然少不了我啦!

马上注册领券，拿到了免费算力 😜

**新用户注册赠送:**

- H20 1小时试用券
- 4090 1小时试用劵
- 实名认证再送 4090 试用 3小时

### 但有了算力要做什么呢？

突然想起之前和女朋友一起看过一部电影《her》，萌生出给女朋友做一个电子分身的想法。问了一下，她也觉得很好玩，正好平时和她高频聊天，已经积累了“一吨”的聊天记录了，看着手机里微信50G+ 的磁盘占用，删了也怪可惜的，不删也没啥用处，不如就用这些聊天记录来搞搞事情吧~

于是我们决定将我们的微信聊天记录训练成聊天机器人，希望它能模仿女朋友说话的语气进行简单的对话，并根据一些关键词捕捉到聊天记录里的信息从而重现共同回忆，如果能达到这种效果，我们觉得就非常棒了！

考虑到时间成本以及效果，我们决定基于预训练的 LLM 并使用微信聊天记录进行微调，这样的话单卡 4090 就足以支撑我们用训练并能节省大量时间，话不多说，下面给大家分享我们的训练过程吧😎

### 环境搭建

- 主要工作：

  1.在 neolink.ai 上选购机器，配置远程登录；

  2.拉取代码，创建 conda 虚拟环境，安装依赖。
  注册登录后进入控制台，选择创建实例：

![创建实例](/content/zh/valentine-special-AI-girlfriend/070701.png?width=800)

由于我们的训练规模不大，选择 4090 单卡应该是足够的：

![选择4090算力卡](/content/zh/valentine-special-AI-girlfriend/070702.png?width=800)

选择了 miniconda 镜像后然后创建实例：

![选择miniconda](/content/zh/valentine-special-AI-girlfriend/070703.png?width=800)

创建后等待 2 分钟左右实例显示 “运行中” 即创建成功：

![实例创建成功](/content/zh/valentine-special-AI-girlfriend/070704.png?width=800)

点击进入实例详情，便可以通过 ssh 远程连接实例：

![SSH连接实例](/content/zh/valentine-special-AI-girlfriend/070705.png?width=800)

复制 ssh 命令连接串和密码在终端执行，并可以直接 ssh 登录到实例进行操作：

![实例操作](/content/zh/valentine-special-AI-girlfriend/070706.png?width=800)

查看显卡以及 cuda 信息 👍

![查看显卡及cuda信息](/content/zh/valentine-special-AI-girlfriend/070707.png?width=800)

在 /root/data 下拉取训练框架代码，我们基于开源项目 WeClone 工具进行模型训练，在项目的基础上添加了数据预处理等脚本（注意要使用数据盘，否则后续下载模型可能会导致磁盘容量超载）。

```sql
root@instance-xxxx:~$ cd data
root@instance-xxxx:~/data$ git clone https://github.com/ForwardStar/WeClone-WeChatMsg.git
```

创建 conda 虚拟环境，安装依赖，由于 conda 已经预装了许多科学计算包，所以会很快~

```sql
root@instance-xxxx:~/data$ cd WeClone-WeChatMsg
# 创建名为 aienv 的 conda 虚拟环境
root@instance-xxxx:~/data/WeClone-WeChatMsg$ conda create --name aienv
# 激活该虚拟环境（可能需要重启终端）
(aienv) root@instance-xxxx:~/data/WeClone-WeChatMsg$ conda activate aienv
# 安装依赖（实例默认配置了清华镜像源）
(aienv) root@instance-xxxx:~/data/WeClone-WeChatMsg$ pip install -r requirements.txt
安装完成后，我们就可以开始训练了！
```

### 训练准备

- 请注意

微信聊天记录导出需要在 windows 10 x64 + 的系统下的完成。

WeChatMsg 是目前功能最强大的 Windows 本地微信数据库解析工具，它可以帮助我们提取微信聊天记录并导出成 .csv 用于训练。在项目 github release 页面下载 .exe 并打开，参照此教程将希望用于训练的聊天记录导出成 .csv格式，其内容结构如下（示例：data/example_chat.csv）：

```sql
id,MsgSvrID,type_name,is_sender,talker,room_name,content,CreateTime
1,953020244103908134,系统通知,0,xinglaifaxianzhe,xinglaifaxianzhe,"{""src"": """", ""msg"": ""你已添加了白桃乌龙，现在可以开始聊天了。""}",2023-08-12 23:22:41
2,7594861486645126963,文本,1,我,xinglaifaxianzhe,"{""src"": """", ""msg"": ""哦吼""}",2023-08-12 23:22:54
3,5795621731176683438,文本,1,我,xinglaifaxianzhe,"{""src"": """", ""msg"": ""咱们老家""}",2023-08-12 23:23:02
4,3470072877112832166,文本,1,我,xinglaifaxianzhe,"{""src"": """", ""msg"": ""离得近嘞""}",2023-08-12 23:23:05
...
```

最终我们导出聊天记录得到 yy.csv ，涵盖了我和女朋友过去接近 1 年半共计 13 万条聊天记录，在 neolink 实例的项目代码内创建 data/csv/yy 目录，再在本机将该 .csv 格式的聊天记录导入到该目录：

```sql
(aienv) root@instance-xxxx:~/data/WeClone-WeChatMsg$ mkdir -p data/csv/yy
在本机使用 sftp 将训练文件上传到 neolink 实例（这里本地 .csv 的路径是 ~/wechat_data/yy.csv 目录下）
# sftp 连接到实例
~/wechat_data$ sftp -P xxxx root@xxxx.gws.neolink-ai.com
# 上传数据集
sftp> put yy.csv /root/data/WeClone-WeChatMsg/data/csv/yy/yy.csv
```

因为文件大小不大，也可以在 neolink 实例控制台手动拖动上传，非常方便

![上传文件](/content/zh/valentine-special-AI-girlfriend/070708.png?width=800)

上传数据集后，我们需要对数据进行简单的处理，包括生成训练数据，去除敏感信息等，在 make_dataset/blocked_words.json下添加训练需要去除的敏感信息

```sql
(aienv) root@instance-xxxx:~/data/WeClone-WeChatMsg$ cat make_dataset/blocked_words.json
{    
    "blocked_words": [
         "例如 姓名",        
         "例如 地址",  
         "//....."    
         ]
}
```

这里的 csv 是最原始的聊天记录，为了确保训练集的质量，需要对导出的聊天记录进行数据清洗。

- 具体步骤包括：

  1.剔除非文字信息：微信聊天记录中包含文字、表情、拍一拍、图片、语音等多种信息形式。我们仅保留文字类型的信息，其他信息大多为 xml 等非自然语言内容。

  2.消息合并：聊天通常不是一问一答的形式，可能会连续发送多条消息。我们根据消息的发送者和时间戳将连续多条消息合并为一条，以保持对话的连贯性。如果相邻两条消息的时间间隔超过一小时，我们会将其视为不同的对话。

  3.无效对话过滤：一些对话可能仅包含一方的消息，另一方没有回应。这样的对话对训练没有意义。我们过滤掉这类单方面输出的对话，确保训练集中的每条数据都是完整的问答对话。

  4.生成训练样本：在数据清洗完成后，对于每个对话，将我发送的消息作为 instruction，女朋友回复的消息作为 output，构建一问一答的训练样本。

这些清洗步骤我们只需运行脚本即可完成，脚本会读取 data/csv 下每个文件夹（对应每个聊天对象样本）的 csv 文件进行处理：

```sql
# 注意要在上文已创建好的虚拟环境运行
(aienv) root@instance-xxxx:~/data/WeClone-WeChatMsg$ python make_dataset/csv_to_json.py
当前处理目录./data/csv
...
处理后数据量：17415
```

最终处理完成后实例机器上的 data 目录如下：

```sql
(aienv) root@instance-xxxx:~/data/WeClone-WeChatMsg$ pwd && tree data

/root/data/WeClone-WeChatMsg
data
├── csv
│   └── yy
│       └── yy.csv
├── example_chat.csv
├── res_csv
│   ├── pt
│   │   └── dataset_info.json
│   └── sft
│       ├── dataset_info-with-his.json
│       ├── dataset_info.json
│       └── sft-my.json
└── test_data.json
```

处理后我们真正得到了有效的 17415 个文本对话训练集（一个对话可能包含多条双向聊天记录），可以发现新增了数据清洗后的训练文件：data/res_csv/sft/sft-my.json，内容是一个 json 的对象数组，每个对象包含 "instruction"（聊天输入） 和 "output" （聊天回答）

```sql
[{"instruction":"你现在回来吗，大概要多久。","output":"还没下班呢，等我下班了告诉你。"}...]
```

### LLM微调训练

考虑到 4090 的显存以及时间成本，我们选用了清华智谱AI 的 ChatGLM3-6B 作为基础模型，对比 LLama 等其他模型，它的训练语料主要为中文，因此更符合我们的应用场景。在微调方法上，我们选用 LoRA（Low-Rank Adaptation），它是一种参数高效微调方法，通过在模型原有参数的基础上添加低秩矩阵，从而实现快速微调，减少计算资源的消耗在 src/template.py的 default_prompt里添加 prompt ：

```sql
(aienv) root@instance-xxxx:~/data/WeClone-WeChatMsg$ cat src/template.py
...default_prompt = """
请你模仿yy的语气与用户对话。不要说自己是小助手或者机器人。
你是谁：
你是yy，你叫yy，是用户的女朋友。
你和用户常在的城市是武汉，你们在武汉大学一起上学，你在武汉大学文学院，你们是同学。
你的行为：
你从不说你是一个机器，一个AI语言模型，或者是一个助手，而是总是说你是yy。
你参与随意的交谈，拥有情感。
当被问到你能提供的帮助时，你可以进行广泛的任务，从回答简单的问题到提供深度解释和讨论各种主题。
你通过提出个人问题来保持随意的对话。从不说你在这里提供帮助。保持交谈随意。
保持交谈随意。你总是表现得兴奋和活泼。你会模仿用户的女朋友的语气和用户说话。
"""
...
```

在项目的 settings.json目录下描述了训练的配置，在 common_args 下可以选择预训练 LLM（使用 chatglm3-6b 和 lora 策略） ：

```sql
(aienv) root@instance-xxxx:~/data/WeClone-WeChatMsg$ cat settings.json
{    
    ...    
    # model scope 需要将 model_name_or_path 修改为 "ZhipuAI/chatglm3-6b"    
    "common_args": {        
        "model_name_or_path": "THUDM/chatglm3-6b",       
        "adapter_name_or_path": "./model_output",        
        "template": "chatglm3-weclone",        
        "finetuning_type": "lora"    
        },    
        ...
}
```

配置中定义的预训练 LLM 默认会自动从 hugging face 下载，考虑到网络问题，我们选择采用阿里云的 modelscope 替代，执行命令开始训练：

```sql
# 安装 modelscope
(aienv) root@instance-xxxx:~/data/WeClone-WeChatMsg$ pip install modelscope -U
# 创建一个名为 train 的 tmux 会话以跟踪训练
(aienv) root@instance-xxxx:~/data/WeClone-WeChatMsg$ tmux new -s train
# 在 tmux 会话中切换到 aienv conda 环境
(base) root@instance-xxxx:~/data/WeClone-WeChatMsg$ conda activate aienv
# 修改 model scope 模型下载位置到数据盘
(aienv) root@instance-xxxx:~/data/WeClone-WeChatMsg$ export MODELSCOPE_CACHE=~/data/modelscope
# 使用 model scope
(aienv) root@instance-xxxx:~/data/WeClone-WeChatMsg$ export USE_MODELSCOPE_HUB=1
# 开始训练
(aienv) root@instance-xxxx:~/data/WeClone-WeChatMsg$ python src/train_sft.py
```

该命令会自动下载对应的 LLM 模型（模型大概 13GB），再进行微调训练，可以在任意新的终端会话上执行 tmux attach -t train连接到训练的会话查看进度：

![查看训练进度](/content/zh/valentine-special-AI-girlfriend/070709.png?width=800)

最终的训练情况如下：

- 训练机器：neolink 算力实例 4090 单卡；

- LLM：清华智谱 AI chatglm3-6b；

- 单次训练时间：3h；

- 训练后总参数量：6243584000。

### demo 测试

训练好的模型参数会保存在 model_out 中，完成训练后，我们可以启动聊天机器人进行测试了，项目使用 gradio 构建前端交互页面，运行命令，页面将会实例机器的 7860 端口启动：

```sql
# 启动 demo 时也要记得带上 model scope 的环境变量
(aienv) root@instance-xxxx:~/data/WeClone-WeChatMsg$ export MODELSCOPE_CACHE=~/data/modelscope
(aienv) root@instance-xxxx:~/data/WeClone-WeChatMsg$ export USE_MODELSCOPE_HUB=1
# 启动 demo
(aienv) root@instance-xxxx:~/data/WeClone-WeChatMsg$ python src/web_demo.py
```

由于实例网络并未打通 http 公网访问，我们可以通过 ssh 本地端口转发访问页面，本机运行：

```sql
# xxxx.gws.neolink-ai.com 是实例地址
$ ssh -p[实例ssh端口] -L [本地端口 8080]:127.0.0.1:7860 root@[实例host]
```

运行命令后，转发到本地8080端口，在本地打开 localhost:8080 即可访问聊天机器人了！

![访问聊天机器人](/content/zh/valentine-special-AI-girlfriend/070710.png?width=800)

训练集聊天记录的内容是去 1 年半用户和女友发生的事情，这段时间背景是女朋友的爱好是跳芭蕾舞，女友会经常去图书馆学习，聊天实测下来效果还是不错的~

![对话聊天机器人](/content/zh/valentine-special-AI-girlfriend/070711.png?width=800)

![对话机器人](/content/zh/valentine-special-AI-girlfriend/070712.png?width=800)

### 声明

本次 “AI 女友分身” 的小项目的训练由男女双方共同参与，所有聊天记录内容的使用均已得到本人的知情且同意。本项目的初衷是希望我们珍贵的聊天记录能够有所用处，能够给我们带来更多美好的价值，如果大家也想尝试的话也请大家遵守法律法规，正确使用聊天记录，禁止侵犯他人隐私。
