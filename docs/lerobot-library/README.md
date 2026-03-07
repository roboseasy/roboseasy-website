# LeRobot 소개

## LeRobot이란?

![](https://static.wikidocs.net/images/page/328743/LeRobot_flag.png)



🤗 LeRobot은 PyTorch를 기반으로 실제 로봇 공학에 필요한 모델, 데이터셋, 도구를 제공합니다. 이를 통해 로보틱스에 대한 진입 장벽을 낮추고, 누구나 데이터셋과 사전학습 모델을 공유하며 그 성과를 함께 활용할 수 있도록 합니다.

🤗 LeRobot은 **모방학습(imitation learning)** 과 **강화학습(reinforcement learning)** 에 중점을 두고, 실제 환경에 적용 가능한 최신 접근법을 포함합니다.

🤗 LeRobot은 사전학습된 모델, 사람이 직접 수집한 데이터셋, 시뮬레이션 환경을 함께 제공하여 누구나 쉽게 로봇 학습을 시작할 수 있도록 지원합니다.

🤗 LeRobot은 Hugging Face 페이지를 통해 사전학습 모델과 데이터셋을 공유하며, 이를 바탕으로 개방형 로봇 학습 생태계를 확장하고 있습니다.

🤗 LeRobot은 HuggingFace에서 개발한 **실제 로봇을 위한 플랫폼**입니다. NLP 분야의 Transformers 라이브러리가 혁신을 가져왔듯이, LeRobot은 로봇공학 분야에 동일한 변화를 가져오고자 합니다.

아래 LeRobot의 리더인 Remi Cadene 의 영상을 보시면 라이브러리의 철학과 방향성을 볼 수 있습니다.
"Democratizing" 이라는 단어에서 알 수 있듯이 저가의 오픈소스로 누구나 로봇을 만들고 VLA 를 학습하고 사용하는 것을 추구합니다.

?> **Quote**
"LeRobot is to robotics what the Transformers library is to NLP."
— Remi Cadene, HuggingFace

<div class="video-container">
  <iframe src="https://www.youtube.com/embed/UZC9LiWXXHM" title="LeRobot by Remi Cadene" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
</div>

## 핵심 목표

LeRobot의 주요 목표는 **로봇 AI의 진입 장벽을 낮추는 것**입니다. 이를 통해 누구나 데이터셋과 사전 학습된 모델을 공유하고 활용할 수 있습니다.

## 주요 특징

### 1. 🔧 오픈소스 플랫폼

- 완전한 오픈소스 라이선스
- 활발한 커뮤니티
  - [LeRobot 공식 디스코드](https://discord.com/invite/s3KuuzsPFb)
  - [한국인들을 위한 르로봇 오픈 채팅방](https://open.kakao.com/o/gS5OQJth)

### 2. 🤖 다양한 하드웨어 지원

- **SO-ARM100/SO-ARM101**: 저가형 로봇 팔
- **Koch v1.1**: 또 다른 저가형 로봇 팔
- **LeKiwi**: 모바일 로봇 플랫폼
- **ALOHA**: 듀얼암 로봇 시스템

### 3. 🧠 최신 AI 기술

- **Imitation Learning**: 인간 시연을 통한 학습
- **HIL-SERL**: 인간 개입 강화학습
- **SmolVLA**: SmolVLM 기반 action 모델 공개

### 4. 📊 풍부한 리소스

- 사전 학습된 모델 제공
- 다양한 작업별 데이터셋
- 시뮬레이션 환경 지원

---



## LeRobot의 탄생 배경

LeRobot은 실세계 로보틱스를 위한 오픈소스 머신러닝 라이브러리로, 로봇 학습에 필요한 모델, 데이터셋, 학습 도구를 PyTorch 기반으로 제공하기 위해 만들어졌습니다.<sup>[1]</sup> 핵심 목적은 로보틱스의 진입장벽을 낮추고, 누구나 데이터셋과 사전학습 모델을 공유하며 그 성과를 함께 활용할 수 있도록 만드는 데 있습니다.<sup>[1]</sup> 이러한 배경에는 기존 로보틱스 연구와 개발이 하드웨어 의존성이 크고, 데이터 수집 비용이 높으며, 재현 가능한 학습 환경을 갖추기 어려웠다는 구조적 한계가 자리하고 있습니다.<sup>[1]</sup>

LeRobot은 이러한 문제를 오픈소스 방식으로 완화하기 위해 등장하였습니다. 기존에는 로봇 제어 코드, 센서 데이터, 시연 데이터셋, 학습 스크립트가 각각 분절되어 있는 경우가 많았고, 같은 작업을 수행하더라도 연구자나 개발자마다 다른 형식과 도구를 사용해 재사용성과 확장성이 낮았습니다. LeRobot은 이러한 한계를 줄이기 위해 **모델, 데이터셋, 시뮬레이션 환경, 학습 파이프라인**을 하나의 공통된 프레임워크 안에서 다룰 수 있도록 설계되었습니다.<sup>[1]</sup>

Hugging Face는 2024년에 LeRobot 라이브러리를 시작하였고, 이후 Hugging Face Hub를 로보틱스용 모델·데이터셋·라이브러리 공유 거점으로 빠르게 확장시켰습니다.<sup>[2]</sup> 이 흐름은 LeRobot이 단순한 코드 저장소가 아니라, **실세계 로봇 학습을 위한 공유형 생태계**를 구축하는 프로젝트로 출발했음을 보여줍니다.<sup>[2]</sup> 다시 말해, LeRobot의 출발점은 개별 연구실이나 개발 환경에 흩어져 있던 로봇 학습 자원을 하나의 공개된 플랫폼 위로 모으는 데 있었습니다.<sup>[1]</sup><sup>[2]</sup>

또한 LeRobot은 처음부터 강한 실용성을 지향하였습니다. LeRobot은 **모방학습**과 **강화학습**을 중심으로, 실제 환경에 적용 가능한 접근법을 포함합니다.<sup>[1]</sup> 즉, 이론적 데모에 머무는 것이 아니라, 누구나 실로봇 데이터로 학습하고 이를 실제 환경에 적용해볼 수 있는 **현장 중심 로봇 학습 도구**로 설계되었습니다.<sup>[1]</sup>

![](https://static.wikidocs.net/images/page/328743/lerobot-so-arm.png)

---

## LeRobot의 미래 전망

LeRobot의 미래는 단순한 로봇 제어 라이브러리를 넘어, **범용 로봇 학습 플랫폼**으로 확장되는 방향에 있습니다. LeRobot은 단순한 학습 스크립트 모음이 아니라, 데이터 수집부터 학습, 평가, 배포까지 포괄하는 로봇 학습 인프라로 발전하고 있음을 보여줍니다.<sup>[3]</sup>

특히 데이터셋 표준화는 LeRobot의 미래를 이해하는 데 중요한 지점입니다. **LeRobotDataset v3.0**은 로봇 학습 데이터를 위한 표준화된 포맷으로, 멀티모달 시계열 데이터, 센서모터 신호, 다중 카메라 영상, 그리고 검색·시각화를 위한 메타데이터를 통합적으로 다룰 수 있도록 설계되었습니다.<sup>[4]</sup> 또한 Hub 기반 스트리밍과 대규모 데이터셋 처리 구조를 지원하여, 앞으로 로봇 학습이 더 큰 데이터 규모와 더 다양한 센서 조합을 활용하는 방향으로 나아갈 수 있는 기반을 마련합니다.<sup>[3]</sup><sup>[4]</sup> 이 점에서 LeRobot은 향후 로보틱스 분야에서 **데이터 표준과 공유 허브**의 역할을 더욱 강화할 가능성이 큽니다.<sup>[4]</sup>

모델 측면에서도 LeRobot의 확장 가능성은 분명합니다. **SmolVLA**는 경량 로보틱스 파운데이션 모델로 제시되며, LeRobot 데이터셋에 쉽게 파인튜닝할 수 있도록 설계되었습니다.<sup>[5]</sup> 이는 LeRobot이 단순한 로봇용 데이터 처리 도구에 머무르지 않고, 앞으로는 **경량 VLA(Vision-Language-Action) 모델을 빠르게 실험하고 현장에 적용하는 플랫폼**으로 발전할 수 있음을 보여줍니다.<sup>[5]</sup> 다시 말해, LeRobot의 미래는 특정 로봇 하나를 제어하는 데서 끝나는 것이 아니라, 다양한 로봇 하드웨어와 다양한 작업에 맞추어 학습 가능한 **범용 정책 학습 기반**으로 확장되는 방향에 있습니다.<sup>[3]</sup><sup>[5]</sup>

![](https://static.wikidocs.net/images/page/328743/SO-ARM_101_MAX_Give_me_a_Twix_huggingface_lerobot_physicalai_roboseasy_8.gif)

또한 Hugging Face는 LeRobot을 통해 오픈 로보틱스 생태계를 더욱 넓혀가고 있습니다. Pollen Robotics 인수와 함께 제시된 비전은 로보틱스를 더 **개방적이고, 접근 가능하며, 커뮤니티 중심적인 방향**으로 발전시키는 것입니다.<sup>[2]</sup> 이러한 흐름을 고려하면, 앞으로 LeRobot은 오픈소스 로봇 하드웨어, 공개 데이터셋, VLA 정책 모델, 시뮬레이션 환경, 그리고 Hub 기반 협업 구조가 결합된 **실세계 피지컬 AI의 핵심 플랫폼**으로 자리잡을 가능성이 높습니다.<sup>[2]</sup><sup>[3]</sup>

!> 앞으로 LeRobot의 발전 방향은 크게 세 가지로 정리할 수 있습니다. 

첫째, 더 많은 로봇과 센서를 연결할 수 있는 **확장성**입니다.<sup>[3]</sup> 

둘째, 더 큰 규모의 데이터셋과 멀티모달 학습을 감당할 수 있는 **표준화와 데이터 처리 능력**입니다.<sup>[4]</sup> 

셋째, SmolVLA와 같은 정책 모델을 중심으로 실제 작업에 빠르게 적용할 수 있는 **범용성**입니다.<sup>[5]</sup> 

따라서 LeRobot은 앞으로 로봇 공학에서 단순한 개발 도구를 넘어, **데이터-모델-하드웨어를 잇는 오픈형 로봇 학습 생태계의 중심 축**으로 발전할 가능성이 큽니다.<sup>[2]</sup><sup>[3]</sup>

---

## 각주

<sup>[1]</sup> Hugging Face, "LeRobot," *LeRobot Documentation*.

<sup>[2]</sup> Thomas Wolf, Clem, Matthieu Lapeyre, "Hugging Face to sell open-source robots thanks to Pollen Robotics acquisition," *Hugging Face Blog*, published 2025.04.14.

<sup>[3]</sup> Steven Palma et al., "LeRobot v0.4.0: Supercharging OSS Robot Learning," *Hugging Face Blog*, published 2025.10.24.

<sup>[4]</sup> Hugging Face, "LeRobotDataset v3.0," *LeRobot Documentation*.

<sup>[5]</sup> Hugging Face, "SmolVLA," *LeRobot Documentation*.
