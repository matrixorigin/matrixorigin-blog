---
title: Technical Analysis | MatrixOne Intelligence Model Parsing Principles and Fine-Tuning Practice
author: MatrixOrigin
description: This article provides an in-depth analysis of MatrixOne Intelligence model parsing principles and fine-tuning practices, covering the MinerU architecture, OCR workflow, and efficient LoRA fine-tuning methods.
tags:
  - Technical Insights
keywords:
  - AI
  - document parsing
  - OCR
  - SFT
  - LoRA
publishTime: '2025-06-20 17:30:00+08:00'
image:
  '1': ./images/tech.jpeg
  '235': ./images/tech.jpeg
date: '2025-06-20 17:30:00+08:00'
lang: en
status: published
translations:
  zh: document-parsing-models-and-sft-zh
---

# 1. Parsing Models

## 1.1 Parsing Models and MOI

A parsing model refers to a model that identifies structural elements, such as titles, paragraphs, tables, and images, from complex documents such as PDFs, scanned images, and reports, and extracts their content. In MatrixOne Intelligence (MOI), we use **MinerU** ([mineru.readthedocs.io](https://mineru.readthedocs.io/ 'Welcome to the MinerU Documentation — MinerU 1.3.12 ...')), an open-source parsing tool that converts PDFs into Markdown.

MinerU is used to parse PDFs. Its main parsing workflow is as follows:

- Scan detection: determines whether a PDF is scanned and automatically triggers OCR
- Layout analysis: uses a combination of models to detect titles, paragraphs, charts, formulas, and other regions
- Content recognition: recognizes text through OCR, converts formulas to LaTeX, and recognizes tables as structured data
- Clean output: removes headers and footers, adjusts natural reading order, and exports Markdown or JSON

## 1.2 MinerU Model Composition and Principles

The following table shows the main model composition architecture used by the MinerU series in MOI:

| Subtask | Default model | Purpose |
| --- | --- | --- |
| Layout analysis | PDF-Extract-Kit + DocLayout-YOLO | Divides paragraphs, tables, formulas, and images |
| OCR | PaddleOCR / RapidOCR | Recognizes text and supports 80+ languages |
| Table structure | RapidTable / StructTable-InternVL2-1B | Table parsing model that can parse rows, columns, and merged cells |
| Formula recognition | UniMERNet | Converts formulas to LaTeX |
| Image extraction | Built-in CV algorithms | Crops images and annotates coordinates |

It is easy to see that two important modules, layout analysis and OCR, are the core of MinerU document parsing. Next, we introduce the principles of these two modules in detail.

### 1.2.1 Layout Analysis

The goal of layout analysis is to accurately locate different types of regions in document images, such as paragraphs, titles, tables, and images. **DocLayout-YOLO**, used in MinerU, is optimized based on the YOLO object detection framework. It treats layout analysis as an object detection problem in computer vision. The model takes the full document page as the input image and learns to directly predict bounding boxes and categories representing different layout elements, such as text blocks and tables.

Compared with general object detection, DocLayout-YOLO is specially optimized for document characteristics:

- Diverse data pretraining: it is pretrained on a large-scale and diverse synthetic document dataset, `DocSynth-300K`, enabling better generalization to complex real-world document layouts.
- Global-to-local receptive field: it introduces the **GL-CRM (Global-to-Local Controllable Receptive Module)** module, allowing the model to flexibly adjust its "field of view" and effectively handle layout elements at different scales, from single-line titles to full-page tables.

In short, layout analysis applies and adapts powerful image object detection technology specifically for fast and accurate identification of document structure.

### 1.2.2 OCR (Optical Character Recognition)

The goal of OCR is to convert text in images into machine-readable text. **PaddleOCR**, used in MinerU, is a typical multi-stage OCR system. Its core principles are as follows:

Text Detection: First, a model determines the location of text in an image. This model outputs bounding boxes containing text regions. PaddleOCR typically uses the **DB (Differentiable Binarization)** algorithm for this step.

Text Recognition: After text regions are detected, each image block containing text is cropped and passed into a recognition model for "reading." The mainstream recognition model today is **CRNN (Convolutional Recurrent Neural Network)**, which consists of three key parts:

- CNN (Convolutional Neural Network): a convolutional neural network acts as a feature extractor, extracting rich visual feature sequences from the input text-line image.
- RNN (Recurrent Neural Network): usually a bidirectional LSTM, used to process the feature sequences extracted by the CNN. RNNs are good at processing sequence data and can learn contextual dependencies between characters.
- CTC (Connectionist Temporal Classification): the RNN output is a probability distribution over all characters at each feature step. CTC intelligently decodes this probability sequence into the final text string. In short, it converts the RNN output sequence into the final text string.

This combination has the advantages of modularity, flexible control, and high accuracy. But it also has disadvantages:

- Dependence on multiple submodels: the OCR model itself is not an end-to-end model, but consists of text detection and text recognition submodels. Together with the layout analysis model and a series of table, formula, and image recognition models, the overall logic is complex, and model switching and interface integration become somewhat complicated.
- Complex engineering implementation: each submodel must be integrated, adjusted, optimized, and tuned to achieve optimal performance.
- Difficult concurrency and low efficiency: because dependencies exist between models, they cannot be processed fully in parallel, which leads to lower efficiency.

## 1.3 Frontier Industry Approaches

### 1.3.1 End-to-End Parsing Models

**AllenAI olmOCR:**
olmOCR ([arxiv.org](https://arxiv.org/pdf/2502.18443)) is the first open-source model to use a VLM (Vision-Language Model) for SFT (Supervised Fine-Tuning) parsing, converting PDFs into Markdown end to end. Its main characteristics are:

- It collects and annotates a batch of high-quality PDFs, and uses a fine-tuned 7B Vision-Language Model to extract PDF structural order, tables, formulas, and handwriting.
- It supports Markdown output in natural reading order, with costs as low as about USD 200 per million pages.
- It performs end-to-end VLM inference without switching across multi-model pipelines, but requires large amounts of annotated data.

**ByteDance Dolphin:**
Dolphin ([arxiv.org](https://arxiv.org/abs/2505.14059)) is an end-to-end parsing model proposed by ByteDance. It does not simply fine-tune an existing VLM model. Instead, it reconstructs the entire model architecture and proposes an analyze-then-parse architecture. Its main characteristics are:

- It first performs full-page layout analysis and generates structural anchor order.
- It then parses the content composed of each anchor in parallel, supporting paragraphs, tables, images, formulas, and other elements.

### 1.3.2 Advantages and Disadvantages

Compared with the traditional layout + OCR pipeline, end-to-end parsing models have the following advantages:

- They use the powerful multi-task capability of large models, allowing one model to complete all tasks without switching across multiple model pipelines.
- Because they use a single model, inference acceleration is easier and higher concurrency can be achieved.

However, they also have disadvantages:

- Strong data dependence: model effectiveness depends heavily on the annotated data used for fine-tuning, and building high-quality datasets is costly.
- Weak controllability and interpretability: end-to-end models are like black boxes. When parsing fails for a specific type, such as tables, targeted debugging and optimization are difficult compared with modular workflows.
- High compute resource requirements: fine-tuning or deploying large VLM models requires significant compute resources, creating a high barrier for most teams.

## 1.4 Trends

- The overall trend is moving from layout + OCR pipelines, to SFT (Supervised Fine-Tuning) of VLMs, and then to parsing-oriented LLM architectures.
- Current trend: combining layout analysis with OCR pipelines. A typical process uses a dedicated layout detection model first, then hands results to OCR and structural parsing models. This approach remains the main method in MOI (MinerU), with high accuracy and strong controllability.
- Future direction: a full transition toward VLM / LLM architectures, such as olmOCR and Dolphin, and even emerging models such as **MonkeyOCR** with the SRR Triplet model path. These use LLM capabilities to unify layout, content, and relationship processing.

# 2. Fine-Tuning (SFT)

Next, we briefly introduce how to fine-tune LLMs for document parsing tasks.

SFT (Supervised Fine-Tuning) is the core technique that teaches a pretrained large model a specific task or a specific "speaking style." The principle is simple: like teaching students how to solve a specific type of word problem, we provide the model with a batch of high-quality "question-standard answer" pairs, or annotated datasets, and let the model adjust its internal parameters based on these examples so its output becomes increasingly close to the provided standard answers.

For the document parsing task mentioned above, the "question-standard answer" pair is "a PDF document" and "its corresponding perfect Markdown text."

## 2.1 Large Model Fine-Tuning Methods Combined with Parsing Models

After data preparation is complete, SFT can begin. The following are two commonly used fine-tuning strategies:

### 2.1.1 Full-Parameter Fine-Tuning

This is the most direct method. As the name suggests, it updates all parameters in the model, from hundreds of millions to tens of billions.

- **Principle**: Continue training the entire pretrained model on the new task data without freezing any weights.
- **Pros and cons**: It has the greatest potential effect and allows the model to adapt most fully to the new task. But its disadvantages are also obvious: it consumes massive compute resources, requiring many high-end GPUs such as A100 or H100, takes a long time to train, and can easily cause catastrophic forgetting, where the model forgets some general capabilities while learning new knowledge. For document parsing, full fine-tuning a large VLM model to output Markdown is very costly and has a high barrier.

### 2.1.2 LoRA Fine-Tuning (Low-Rank Adaptation)

LoRA is a representative technique for PEFT (Parameter-Efficient Fine-Tuning). It elegantly solves the pain points of full-parameter fine-tuning.

- **Principle**: LoRA's core idea is that "the large model itself is already powerful enough; we only need to fine-tune a small portion of parameters to guide it." It freezes all original parameters of the pretrained model, then injects two small trainable "bypass" matrices, low-rank matrices, next to key parts of the model such as Transformer attention layers. During fine-tuning, only these two small matrices are updated. During inference, the product of the two small matrices can be added to the original parameter matrix without introducing additional latency.
- **Pros and cons**: The number of trainable parameters is extremely small, perhaps only 0.01% of total parameters, significantly reducing memory usage and training cost. LoRA fine-tuning can usually be done with consumer-grade GPUs such as RTX 4090. Different LoRA modules can be trained for different tasks and switched flexibly, making it very suitable for adapting the same base model to various parsing needs, such as resume parsing and financial report parsing. Its effect can often approach more than 90% of full-parameter fine-tuning performance, making it a highly cost-effective solution.

## 2.2 SFT Summary

Overall, SFT is the key step in specializing a general large model, such as a VLM, into a professional document parsing model. In practice, **LoRA** has become the mainstream choice for current fine-tuning tasks because of its efficiency, low cost, and flexibility. Full-parameter fine-tuning is more like a reserved option for scenarios with sufficient resources and extreme requirements for model performance.
