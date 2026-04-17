---
title: MatrixOne Chaos Testing Way
author: Su Dong
mail: sudong@matrixorigin.io
description: >-
  Migrating to cloud-native and taking a distributed architecture/design
  approach to creating cloud-native applications has been a major trend in
  recent years, and this trend is accelerating further. There is no more
  important driver than the ability to dramatically reduce application downtime,
  high resiliency, high resource utilization, etc.
tags:
  - technology
keywords:
  - MatrixOne
  - Database
  - Relational Database
  - Distributed Database
  - Cloud-Native Database
publishTime: '2023-10-30 17:00:00+00:00'
image:
  '1': /content/en/matrixone-chaos-testing-way/matrixone-chaos-testing-way.png
  '235': /content/en/matrixone-chaos-testing-way/matrixone-chaos-testing-way.png
date: '2023-10-30 17:00:00+00:00'
lang: en
status: published
---

Migrating to cloud-native and taking a distributed architecture/design approach to creating cloud-native applications has been a major trend in recent years, **and this trend is accelerating further**. There is no more important driver than the ability to dramatically reduce application downtime, high resiliency, high resource utilization, etc.

**However, this architecture certainly brings new challenges to software testing.** When testing cloud-native/distributed application systems, things become more complicated than traditional methods for testing other applications such as microcontrollers. Applications are often deployed in a more dynamic, distributed manner using microservices, which leads to faster releases and introduces unpredictable fault patterns that are difficult to anticipate and trace. Traditional testing techniques are overstretched when covering these problems, giving rise to a seemingly new testing approach — chaos testing. **More and more test concepts, theories, and technical tools related to chaos testing have been mentioned, explored, and realized.**

**So what exactly is chaos testing, what problems can it solve, and how can it be conducted effectively?** There is no authoritative answer, and there will probably never be a One-Size-Fits-Most standard. MatrixOne database has the advantages of cloud-native and distributed architecture, naturally, it also has a strong demand for chaos testing. This article shares how MatrixOne testing team globally conducts chaos testing from a theoretical perspective.

## How to Understand Chaos Testing

Chaos testing, also known as fault injection or failure testing, is a testable method based on fault simulation and injection to address chaos issues in large-scale distributed systems. However, chaos testing differs fundamentally from other types of testing as it goes beyond mere testing and resembles more of an engineering practice.

Generally speaking, different industries and products have different standards and requirements for software testing. However, the overall principles are similar. Here, we will share the testing standards MatrixOne testing team has established to conduct better and manage product testing.

![](/content/en/matrixone-chaos-testing-way/picture1.jpg)

You will find that Chaos Testing seems to defy categorization into any specific testing type, or rather, it is associated with all testing types while not strictly belonging to any single one. Here, using Professor Zhu Shaomin's definition of the "software testing" formula, we can elaborate on MatrixOne testing team's definition of Chaos Testing:

**Testing = Detecting the known + Experimenting with the unknown.**

- "The known" refers to clear testing objectives, testing requirements, and well-defined validation criteria, ensuring good testability.
- "The unknown" refers to unclear testing objectives, testing requirements, and validation criteria that are difficult to verify directly. It requires continuous experimentation to determine whether the implemented functional features are correct.

In simpler terms, "known" refers to factors within human control, while "unknown" refers to factors beyond human control and often unpredictable. In the given diagram, all the tests mentioned are conducted for the "known" items, while Chaos Testing focuses on exploring the "unknown" factors. When considering these "unknown" factors, the following principles should be followed:

1. "The unknown" can exist in any testing dimension, occur at any testing stage, and be hidden within any testing object or method.
2. The scope of "the unknown" is also bounded. It encompasses quality factors the team is concerned about but cannot effectively address through human effort alone.
3. "The unknown" should and must be assessable and measurable. Otherwise, any testing conducted for it would be meaningless. However, the criteria for measuring the unknown can be vague, broad, or progressively detailed.
4. Exploring the unknown requires using tools or engineering practices supported by a series of tools.
5. As the exploration of the unknown progresses through experimentation, more and more unknown factors can become known. Through continuous testing and analysis, insights are gained, and previously unknown aspects are uncovered, leading to a better understanding and transformation of the unknown into the known.

**We can further understand Chaos Testing through the following diagram.**

![](/content/en/matrixone-chaos-testing-way/picture2.jpg)

Therefore, in the MatrixOne testing system, all testing efforts enable the current product to perceive, manage, and evaluate the quality factors it focuses on belong to Chaos Testing. Chaos Testing is not a new or disruptive testing technique; it still adheres to the essence of software testing, which is to provide quality information and confidence for the product's business activities. **Therefore, the ultimate goal of Chaos Testing is to make "chaos" become "orderly".**

## How to Conduct Chaos Testing

As mentioned earlier, the primary prerequisite for conducting Chaos Testing is the ability to discover "unknown" issues. In this regard, the industry has a general consensus that can be summarized in words: Fault Injection.

Moreover, current research on Chaos Testing mostly focuses on enhancing the capabilities of fault injection tools. For example:

1. **Chaos Monkey**, a testing tool developed by Netflix, is designed to test server stability. Its core idea is to intentionally bring servers offline to test the recovery capabilities of cloud environments.
2. **Chaos Mesh**, an open-source cloud-native Chaos Engineering platform developed by PingCAP. It provides rich fault simulation types and has powerful fault scenario orchestration capabilities.
3. **ChaosBlade**, an open-source Chaos Engineering tool developed by Alibaba. It follows the principles of Chaos Engineering and provides rich fault scenario implementations to help distributed systems improve fault tolerance and recoverability. It allows for injecting faults at the underlying level.

These are currently available and highly effective fault injection tools, widely adopted for Chaos Testing. However, addressing fault injection alone is not sufficient. Tools are just support, to conduct Chaos Testing more effectively, an engineering mindset is required to design and layout the Chaos Testing process. After multiple iterations and experiments, the architecture diagram for Chaos Testing developed by the MatrixOne Testing team is as shown below:

![](/content/en/matrixone-chaos-testing-way/picture3.jpg)

### Core Modules:

#### 01 Fault Injection Activity

Using fault injection tools aims to identify and uncover potential "unknown" triggering factors with the tested system. Fault injection can be done randomly or based on predefined fault injection strategies. Through our practice, we have found that injecting faults based on predefined strategies is more advantageous for conducting testing because it allows for control over the minimum blast radius during Chaos Testing execution.

Of course, the definition of fault injection strategy is often related to the current focus of chaos testing. It should be noted that chaos testing is also bounded and purposeful, rather than purely random behavior. For example,suppose one wants to verify the impact of network packet loss on transaction success rate. In that case, it is necessary to appropriately adjust the fault injection strategy, increase the proportion of network delay faults, and select key fault injection points.

#### 02 Steady-State Model Definition

The Steady-state model refers to the valid state of the system under test. This valid state can be described by a set of quality element rules to which the object under test must adhere. For example, if the functional availability must satisfy r1 and performance indicators must satisfy r2, then the steady-state model can be represented as:

![](/content/en/matrixone-chaos-testing-way/picture4.jpg)

In other words, regardless of the faults injected or tests executed during chaos testing, the system under test must not violate any of the quality element rules, which can be stated as:

![](/content/en/matrixone-chaos-testing-way/picture5.jpg)

**When defining a steady-state model, it is necessary to adhere to the following principles:**

1. The selection of quality elements depends on the quality dimensions that need to be covered by the product testing itself.
2. The description of quality element rules can be imprecise and based on ranges.
3. Quality element rules must be calculable based on test results.
4. Quality element rules should be expressed as quantifiable statements and can be compared using tools.
5. Quality element rules are iteratively optimized and depend on the product and testing capabilities.

#### 03 Real Events Simulated Execution

The selection of test events depends on the definition of the steady-state model, i.e., it is possible to calculate the actual state of each quality element in the steady-state model based on the results of the final executed test events.

Of course, the automation of test event execution is a necessary prerequisite for conducting chaos testing. Therefore, the effective implementation of chaos testing requires a certain level of maturity in testing capabilities, and it also promotes further maturity in testing capabilities.

#### 04 Behavioral Logging

Behavioral log recording is an easily overlooked core element. As mentioned earlier, even if chaos testing identifies a problem, it may need to provide more precise insight into the factors that triggered it. For unresolved issues that cannot be located and resolved, they are equivalent to unknown problems.

Therefore, it is necessary to explicitly record various behaviors and information in chaos testing, such as fault injection points, fault recovery points, executed test items, resource usage, etc., in order to provide sufficient material for final issue localization and analysis.

#### 05 Reverse Optimization

Refining the test case set and enhancing the fault pattern library based on the results of chaos testing is also an important objective of chaos testing.

As for the design of each stage in MatrixOne's chaos practice, we will not delve into it in detail in this session. There will be further articles in the future to share more about it.

## How to Evaluate Chaos Testing

Regarding the mixed evaluation of chaos testing maturity, there have been some explorations in the industry. For example, Alibaba's CMM model. However, this model is somewhat complex and theoretical. Based on this, MatrixOne testing team has customized its evaluation model, and the entire development and evolution of chaos testing are also based on this model.

![](/content/en/matrixone-chaos-testing-way/picture6.jpg)
