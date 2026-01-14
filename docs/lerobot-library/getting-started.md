# 시작하기

?> **빠른 시작**
이 가이드는 LeRobot을 사용하여 실제 로봇을 제어하고 학습시키는 전체 과정을 단계별로 안내합니다.

## LeRobot 워크플로우 개요

LeRobot으로 로봇 AI를 구축하는 과정을 요약했습니다, 이대로 따라하시면 제일 쉬워요!

<div class="workflow-box">
<div class="workflow-box-header">
<h3>LeRobot 전체 워크플로우</h3>
</div>
<div class="workflow-box-content">
<div class="workflow-step">
<div class="workflow-step-number">1</div>
<div class="workflow-step-content">
<h4>하드웨어 선택 및 준비</h4>
<p>로봇 하드웨어를 선택하고 조립합니다</p>
</div>
</div>
<div class="workflow-step">
<div class="workflow-step-number">2</div>
<div class="workflow-step-content">
<h4>LeRobot 플랫폼 설치</h4>
<p>개발 환경을 구성하고 LeRobot을 설치합니다</p>
</div>
</div>
<div class="workflow-step">
<div class="workflow-step-number">3</div>
<div class="workflow-step-content">
<h4>Teleoperation 셋업</h4>
<p>카메라, 조명등 환경을 셋업 하고, 로봇을 제어해 봅니다.</p>
</div>
</div>
<div class="workflow-step">
<div class="workflow-step-number">4</div>
<div class="workflow-step-content">
<h4>사전 학습 모델 테스트</h4>
<p>HuggingFace에서 제공하는 사전 학습 모델을 테스트합니다</p>
</div>
</div>
<div class="workflow-step">
<div class="workflow-step-number">5</div>
<div class="workflow-step-content">
<h4>데이터 수집</h4>
<p>Teleoperation을 통해 학습 데이터를 수집합니다</p>
</div>
</div>
<div class="workflow-step">
<div class="workflow-step-number">6</div>
<div class="workflow-step-content">
<h4>모델 학습</h4>
<p>수집한 데이터로 나만의 모델을 학습시킵니다</p>
</div>
</div>
<div class="workflow-step">
<div class="workflow-step-number">7</div>
<div class="workflow-step-content">
<h4>모델 적용 &amp; 실전 테스트</h4>
<p>학습된 모델을 테스트하고 실제 로봇에 적용합니다</p>
</div>
</div>
</div>
<div class="workflow-box-footer">
<p><strong>반복:</strong> 더 나은 성능을 위해 5-7 단계를 반복합니다</p>
</div>
</div>

## 단계별 상세 가이드

### 1. 하드웨어 선택 및 준비

LeRobot은 다양한 로봇 하드웨어를 지원합니다. 예산과 목적에 맞는 하드웨어를 선택하세요.

<div class="card-grid">
  <a href="#/hardware-guide" class="card">
    <h4>🤖 로봇 선택 가이드</h4>
    <p>지원되는 로봇 하드웨어 목록과 선택 가이드</p>
  </a>

  <div class="card">
    <h4>✋ SO-ARM101 Max (추천)</h4>
    <p>입문자를 위한 저가형 로봇 팔</p>
  </div>
</div>

### 2. LeRobot 플랫폼 설치

개발 환경을 구성하고 LeRobot 소프트웨어를 설치합니다.

<a href="#/software-installation" class="card">
  <h4>💾 설치 가이드</h4>
  <p>Python 환경 설정부터 LeRobot 설치까지 상세 가이드</p>
</a>

### 3. 로봇 조립

로보시지에서 제공하는 로봇을 조립합니다.

<div class="card">
  <h4>🔧 로봇 조립 가이드</h4>
  <p>SO-ARM101 Max 로봇 조립</p>
</div>

### 4. 로봇 세팅

로봇의 자세를 Calibration 합니다.

<div class="card">
  <h4>⚙️ 로봇 자세 설정 가이드</h4>
  <p>SO-ARM101 Max 로봇 자세 설정</p>
</div>

### 5. 로봇 Teleoperation 설정

로봇을 원격으로 제어할 수 있도록 teleoperation을 설정합니다.

<div class="card">
  <h4>🎮 Teleoperation 가이드</h4>
  <p>로봇 원격 조작 설정 및 사용법</p>
</div>

### 6. 사전 학습 모델 사용하기

HuggingFace에서 제공하는 사전 학습된 모델을 다운로드하고 테스트합니다.

```python
# 사전 학습 모델 다운로드 및 테스트
from lerobot.common.policies.factory import make_policy

# HuggingFace에서 모델 불러오기
policy = make_policy(
    "lerobot/act@main",
    device="cuda"
)

# 모델로 로봇 제어
policy.evaluate()
```

### 7. 데이터 수집

Teleoperation을 통해 로봇을 조작하며 학습 데이터를 수집합니다.

<div class="card">
  <h4>💿 데이터 수집 가이드</h4>
  <p>효과적인 학습 데이터 수집 방법</p>
</div>

### 8. 모델 학습

수집한 데이터로 나만의 모델을 학습시킵니다.

<div class="card">
  <h4>🧠 모델 학습 가이드</h4>
  <p>Imitation Learning으로 모델 학습하기</p>
</div>

### 9. 모델 평가 및 개선

학습된 모델을 실제 로봇에서 테스트하고 성능을 평가합니다.

!> **축하합니다!**
첫 번째 로봇 AI 모델을 만드셨습니다! 이제 더 많은 데이터를 수집하고 모델을 개선해보세요.

## 다음 단계

<div class="card-grid">
  <a href="#/hardware-guide" class="card">
    <h3>💻 로봇 선택 가이드</h3>
    <p>로봇 하드웨어 선택 및 설정</p>
  </a>

  <a href="#/software-installation" class="card">
    <h3>💾 LeRobot 설치 가이드</h3>
    <p>개발 환경 설정 및 LeRobot 설치</p>
  </a>
</div>

## 유용한 리소스

- [LeRobot GitHub](https://github.com/huggingface/lerobot)
- [HuggingFace 모델 허브](https://huggingface.co/lerobot)
- [LeRobot Discord](https://discord.com/invite/s3KuuzsPFb)
- [한국 LeRobot 오픈채팅방](https://open.kakao.com/o/gS5OQJth)

?> **도움이 필요하신가요?**
문제가 발생하면 [GitHub Issues](https://github.com/huggingface/lerobot/issues)에 문의하거나 커뮤니티에 참여하세요.
