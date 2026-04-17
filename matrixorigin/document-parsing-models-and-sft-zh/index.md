---
title: 技术解读|MatrixOne Intelligence模型解析原理及微调实践
author: MatrixOrigin
description: 本文深入分析MatrixOne Intelligence的模型解析原理及微调实践，涵盖MinerU架构、OCR流程及LoRA高效微调方法。
tags:
  - 技术干货
keywords:
  - AI
  - 文档解析
  - OCR
  - SFT
  - LoRA
publishTime: '2025-06-20 17:30:00+08:00'
image:
  '1': /content/zh/shared/tech.jpeg
  '235': /content/zh/document-parsing-models-and-sft/tech.jpeg
date: '2025-06-20 17:30:00+08:00'
lang: zh
status: published
---

# 1. 解析模型

## 1.1 解析模型（Parsing Model） & MOI

解析模型是指用于从复杂文档（如 PDF、扫描图、报告等）中识别结构要素（如标题、段落、表格、图像等）并提取其内容模型。在MatrixOne Intelligence（下文简称MOI）产品中，采用了 **MinerU** ([mineru.readthedocs.io](https://mineru.readthedocs.io/ 'Welcome to the MinerU Documentation — MinerU 1.3.12 ...'))，一个开源的将PDF转化为markdown 解析工具。

MinerU 用于解析PDF，主要的解析流程如下：

- 扫描识别：判断 PDF 是否为扫描件，自动触发 OCR
- 布局分析：用多模型组合检测标题、段落、图表、公式等区域
- 内容识别：OCR 识别文本；公式识别为 LaTeX；表格识别为结构化数据
- 清洗输出：去除页眉页脚、调整自然阅读顺序，导出 Markdown 或 JSON 格式

## 1.2 MinerU 模型组合与原理

下面是 MinerU系列在 MOI 中的主要模型组合架构表格

| 子任务   | 默认模型                              | 作用                                   |
| -------- | ------------------------------------- | -------------------------------------- |
| 版面分析 | PDF-Extract-Kit + DocLayout-YOLO      | 划分段落、表格、公式、图片             |
| OCR      | PaddleOCR / RapidOCR                  | 识别文字，支持80+语种                  |
| 表格结构 | RapidTable / StructTable-InternVL2-1B | 表格解析模型，能够解析行列、合并单元格 |
| 公式识别 | UniMERNet                             | 将公式转 LaTeX                         |
| 图像抽取 | 内置 CV 算法                          | 裁剪并标注坐标                         |

其中不难看出两个比较重要的模块——版面分析和OCR，是MinerU实现文档解析的核心。接下来我们详细介绍这两个模块的原理。

### 1.2.1 版面分析 (Layout Analysis)

版面分析的目标是在文档图像中准确地定位不同类型的区域，例如段落、标题、表格和图片。MinerU 中使用的 **DocLayout-YOLO** 是基于YOLO目标检测框架进行优化的。其将版面分析任务视为一个计算机视觉中的对象检测问题。模型将整个文档页面作为输入图像，并学习直接预测出代表不同版面元素（如文本块、表格）的边界框（Bounding Box）和类别。

相比于通用物体检测，DocLayout-YOLO 针对文档的特性进行了专门优化：

- 多样化数据预训练: 在大规模、多样化的合成文档数据集（`DocSynth-300K`）上进行预训练，使其能更好地泛化到现实世界中各种复杂的文档布局。
- 全局到局部的感受野: 引入了 **GL-CRM (Global-to-Local Controllable Receptive Module)** 模块，使模型能够灵活地调整其"视野"，从而有效处理从单行标题到整页表格等不同尺度的版面元素。

简而言之，版面分析就是应用并改造强大的图像目标检测技术，使其专门用于快速、准确地识别文档的结构。

### 1.2.2 OCR (Optical Character Recognition)

OCR 的目标是将图像中的文字转换为机器可读的文本格式。MinerU 中使用的 **PaddleOCR** 是一个典型的多阶段 OCR 系统，其核心原理如下：

文本检测 (Text Detection): 首先，需要一个模型来确定图像中文字的位置。这个模型会输出包含文字区域的边界框。PaddleOCR 通常使用 **DB (Differentiable Binarization)** 算法来完成这个步骤。

文本识别 (Text Recognition): 在检测到文本区域后，每个包含文本的图像块会被裁剪出来，并送入一个识别模型中进行"阅读"。目前主流的识别模型是 **CRNN (Convolutional Recurrent Neural Network)**，它包含三个关键部分：

- CNN (Convolutional Neural Network): 卷积神经网络作为特征提取器，从输入的文本行图像中提取丰富的视觉特征序列。
- RNN (Recurrent Neural Network): 通常使用双向 LSTM，用于处理 CNN 提取出的特征序列。RNN 擅长处理序列数据，能够学习到字符之间的上下文依赖关系。
- CTC (Connectionist Temporal Classification): RNN 的输出是每个特征步长上所有字符的概率分布，CTC 算法能够智能地将这个概率序列解码为最终的文本字符串。简而言之，就是将RNN的输出序列转换为最终的文本字符串。

这套组合的优势在于模块化、灵活控制与高准确率。但也存在缺点：

- 依赖多个子模型：像OCR模型本身不是一个端到端的模型，而是由文本检测和文本识别两个子模型组成。再加上版面分析模型和一系列的表格、公式、图像识别模型，整体逻辑复杂，模型切换、接口对接逻辑稍复杂
- 工程化实现逻辑复杂：需要对接调整每一个子模型，并且需要对每一个子模型进行优化和调整，以达到最优的性能。
- 模型并发难及效率低：由于模型之间存在依赖关系，无法并行处理，导致效率低下。

## 1.3 业界前沿思路

### 1.3.1 端到端解析模型

**AllenAI olmOCR:**
olmOCR ([arxiv.org](https://arxiv.org/pdf/2502.18443))是第一个利用了VLM (Vision-Language Model) 模型进行SFT (Supervised Fine-Tuning) 解析的开源模型，端到端地将PDF转化为markdown。其主要特点如下：

- 收集并标注了一批高质量的PDF，利用微调后的 7B Vision-Language Model，提取 PDF 结构顺序、表格、公式、手写体
- 支持自然阅读顺序输出 Markdown，成本低至每百万页约 200 美元
- 属于端到端 VLM 推理，无需多模型管道切换，但需要大量的标注数据。

**ByteDance Dolphin:**
Dolphin ([arxiv.org](https://arxiv.org/abs/2505.14059)) 是字节跳动提出的一个端到端的解析模型。其不仅仅是微调现有的VLM模型，而是重构了整个模型架构，并提出了先解析结构后解析内容（analyze‑then‑parse）的架构。其主要特点如下：

- 首先进行整页布局分析，生成结构 anchor 顺序
- 然后并行解析各 anchor 组成内容，支持段落／表格／图片／公式等

### 1.3.2 优势和劣势

相比起传统的layout+OCR pipeline，端到端解析模型具有以下优势：

- 利用大模型强大的Multi-task能力，一个模型完成所有任务，无需多模型管道切换
- 由于是单模型，方便推理加速，能够实现更多的并发

但也有劣势：

- 数据依赖性强: 模型效果高度依赖于微调所用的标注数据，高质量的数据集构建成本高昂。
- 可控性与可解释性差: 端到端模型如同一个"黑箱"，当特定类型的解析（如表格）出错时，难以像模块化流程那样进行针对性的调试和优化。
- 计算资源要求高: 微调或部署大型 VLM 模型需要巨大的计算资源，对于多数团队来说门槛较高。

## 1.4 趋势：

- 总体趋势是从 layout+OCR pipeline到对VLM进行SFT (Supervised Fine-Tuning)，再到解析型 LLM 架构
- 现阶段趋势：结合 layout 分析 + OCR pipeline。典型流程：先用专属 layout 检测模型，再交由 OCR 与结构解析模型处理。这种方式在 MOI（MinerU）中仍是主力，精度高控制性强。
- 未来方向：全面过渡到 VLM / LLM 架构（如 olmOCR, Dolphin）。如 olmOCR, Dolphin，甚至即将兴起的如 **MonkeyOCR**（路径 SRR Triplet 模型），它们利用llm的能力，实现布局、内容、关系的统一处理。

# 2. 微调（SFT）

接下来简单介绍一下如何微调llm，以适用于文档解析任务。

SFT (Supervised Fine-Tuning) 即监督微调，是让已经预训练好的大模型"学会"特定任务或特定"说话风格"的核心技术。其原理很简单：就像教学生做特定类型的应用题一样，我们给模型提供一批高质量的"问题-标准答案"对（即标注好的数据集），然后让模型根据这些范例来调整自己的内部参数，使其输出越来越接近我们提供的"标准答案"。

在前文提到的文档解析任务中，这个"问题-标准答案"对就是"一篇PDF文档"和"它对应的完美Markdown格式文本"。

## 2.1 结合解析模型的大模型微调方法

数据准备完成之后，就可以开始进行SFT了。下面是两种比较常用的微调策略：

### 2.1.1 全参量微调 (Full-parameter Fine-tuning)

这是最直接的方式。顾名思义，它会更新模型中所有的参数（几亿到几百亿个）。

- **原理**: 将整个预训练模型放在新的任务数据上继续训练，不冻结任何权重。
- **优劣**: 效果潜力最大，能让模型最充分地适应新任务。但缺点也极其明显：计算资源消耗巨大（需要大量高端GPU，如A100、H100等）、训练时间长，且容易产生灾难性遗忘（Catastrophic Forgetting）——模型为了学习新知识而忘记了部分通用能力。对于文档解析，全量微调一个大型VLM模型来输出Markdown，成本和门槛都非常高。

### 2.1.2 LoRA微调 (Low-Rank Adaptation)

LoRA 是一种高效参数微调（PEFT, Parameter-Efficient Fine-Tuning）技术的杰出代表。它巧妙地解决了全参量微调的痛点。

- **原理**: LoRA的核心思想是"大模型本身已经足够强大，我们只需微调一小部分参数来引导它"。它冻结预训练模型的全部原始参数，然后在模型的关键部分（如Transformer的注意力层）旁边注入两个小型的、可训练的"旁路"矩阵（低秩矩阵）。微调时，只更新这两个小矩阵的参数。在推理时，可以将这两个小矩阵的乘积与原始参数矩阵相加，不引入任何额外的延迟。
- **优劣**: 训练参数量极少（可能只有总参数的0.01%），显著降低了显存占用和训练成本，通常使用消费级显卡（如RTX 4090）就可以实现LoRA微调。可以为不同任务训练不同的LoRA模块，灵活切换，非常适合在同一个基础模型上适配多种解析需求（如简历解析、财报解析等）。其效果通常能逼近全参量微調的90%以上，是一种性价比极高的方案。

## 2.2 SFT总结

总的来说，SFT 是将通用大模型（如VLM）特化为专业文档解析模型的关键步骤。在实践中，**LoRA** 因其高效、低成本和灵活性，已成为当前微调任务的主流选择；而全参量微调则更像是一种保留选项，用于资源充足且对模型性能有极致追求的场景。
