---
title: "소개"
category: "a-go"
group: "A-Go(LeKiwi)"
order: 10
---

# A-Go(LeKiwi) 소개

> ℹ️ **A-Go(LeKiwi) 시작하기**
> <br>이 섹션에서는 모바일 로봇 A-Go(LeKiwi)로 LeRobot을 시작하는 방법을 PC 세팅부터 데이터 수집, 학습, 추론까지 단계별로 안내합니다.

A-Go(LeKiwi)는 옴니휠 이동 베이스 위에 SO-ARM101 팔을 올린 오픈소스 모바일 매니퓰레이터입니다.
<br>라즈베리파이가 모터와 카메라를 다루고, PC가 원격으로 조종하거나 학습된 정책으로 로봇을 움직입니다.

<div style="text-align: center;">
  <img src="/img/documents_img/lekiwi.webp" alt="A-Go(LeKiwi)" width="500px">
</div>

> **정보** ℹ️ `INFO`
> <br>이 가이드는 **LeRobot v0.6.0** 기준입니다. PC와 라즈베리파이 모두 같은 버전을 설치해야 서로 통신할 수 있습니다.

## 시스템 구조

LeKiwi는 프로그램 하나가 로봇을 통째로 움직이지 않습니다. 역할이 두 컴퓨터에 나뉘어 있고, 와이파이를 통해 **ZeroMQ**로 통신합니다.

| 역할 | 실행 위치 | 하는 일 |
|---|---|---|
| **호스트(host)** | LeKiwi의 라즈베리파이 | 모터와 카메라에 직접 연결. 명령을 받아 실행하고 관측값(관절 상태 + 카메라 영상)을 보냄 |
| **클라이언트(client)** | 실행용 PC | 리더 암·키보드로 텔레오퍼레이션, 데이터 기록, 학습된 정책 실행 |
| **훈련용 PC** (선택) | GPU PC | Hugging Face Hub에서 데이터셋을 받아 정책 학습. 실행용 PC와 같은 컴퓨터여도 됩니다 |

팔은 SO-101 리더 암으로, 바퀴는 키보드로 조종하며, 관측과 행동은 **9차원**(팔 관절 6 + 바퀴 속도 3)입니다.

## 실습 흐름

<div class="card-grid">
  <a href="/docs/a-go/setup-pc-ubuntu" class="card">
    <h3>💻 PC 환경 세팅</h3>
    <p>GPU 드라이버·CUDA, Miniconda, LeRobot 0.6.0 설치 (Ubuntu / Windows)</p>
  </a>
  <a href="/docs/a-go/lekiwi-sd-card" class="card">
    <h3>📡 LeKiwi 세팅</h3>
    <p>microSD 카드 굽기 → 유선 연결 → 고정 IP·무선 연결 → 라즈베리파이에 LeRobot 설치</p>
  </a>
  <a href="/docs/a-go/start-calibration" class="card">
    <h3>🎮 Start</h3>
    <p>캘리브레이션, 텔레오퍼레이션, 카메라와 USB 포트 고정, 제어 스크립트</p>
  </a>
  <a href="/docs/a-go/dataset-record" class="card">
    <h3>📹 Dataset</h3>
    <p>시범 데이터 기록 · 재생 · 시각화 · 편집과 Hub 업로드</p>
  </a>
  <a href="/docs/a-go/train-act" class="card">
    <h3>🧠 Training</h3>
    <p>ACT 학습, SmolVLA 파인튜닝</p>
  </a>
  <a href="/docs/a-go/inference-act" class="card">
    <h3>🤖 Inference</h3>
    <p>학습한 정책으로 LeKiwi 자율 실행 · 성공률 평가 · RTC</p>
  </a>
</div>

## 이 가이드에서 쓰는 예시 값

명령어에 나오는 아래 값들은 예시입니다. 내 환경에 맞게 바꿔서 입력하세요.

| 항목 | 예시 값 | 설명 |
|---|---|---|
| Pi 계정 | `roboseasy` | 라즈베리파이 SSH 계정 (비밀번호: 스페이스 한 번) |
| 로봇 id · 호스트명 | `lekiwi07` | 로봇 번호 7번. 캘리브레이션·호스트·클라이언트에서 모두 같은 id를 씁니다 |
| 로봇 고정 IP | `192.168.0.207` | 공유기 대역 + `.(200 + 로봇 번호)` |
| 모터 보드 포트 (Pi) | `/dev/lekiwi` | 라즈베리파이에서 모터 보드에 붙인 고정 이름 ([USB 포트 고정](/docs/a-go/setup-usbport)) |
| 리더 암 포트 | `/dev/ttyACM0` (Ubuntu), `COM22` (Windows) | `lerobot-find-port` 로 확인 |
| 리더 암 id | `leader` | 캘리브레이션·텔레오퍼레이션·데이터 기록에서 같은 id를 씁니다 |
| PC conda 환경 | `lerobot060` | Python 3.12 |
| Pi 가상환경 | `~/lerobot060_venv` | Python venv |
| Hugging Face 계정 | `HueyWoo` | 본인의 계정명으로 변경 |
| 데이터셋 이름 | `lekiwi_pick_and_place` | 작업에 맞게 변경 |
