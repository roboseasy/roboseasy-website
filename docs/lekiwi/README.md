# LeKiwi

모바일 로봇 플랫폼 LeKiwi 개발 가이드

## 소개

LeKiwi는 자율주행 및 비전 인식 기능을 갖춘 모바일 로봇 플랫폼입니다. 교육 및 연구 목적으로 설계되었으며, 실제 자율주행 기술을 학습할 수 있습니다.

### 주요 특징

- **자율주행**: SLAM 기반 자율 주행
- **비전 인식**: 객체 인식 및 추적
- **실시간 제어**: 저지연 제어 시스템
- **개발 친화적**: 풍부한 API와 예제

## 하드웨어 사양

### 메인 컴포넌트
- **프로세서**: Raspberry Pi 4 (4GB)
- **카메라**: Intel RealSense D435i
- **라이다**: RPLIDAR A1
- **모터**: DC 모터 + 엔코더
- **배터리**: 12V 5000mAh

### 센서
- RGB-D 카메라
- 2D 라이다
- IMU (자이로/가속도계)
- 휠 엔코더

## 빠른 시작

### 설치

```bash
# LeKiwi SDK 설치
pip install lekiwi

# 의존성 설치
pip install opencv-python numpy scipy
```

### 기본 제어

```python
from lekiwi import LeKiwi

# 로봇 초기화
robot = LeKiwi()

# 전진
robot.move_forward(speed=0.3, duration=2.0)

# 회전
robot.turn(angle=90)

# 정지
robot.stop()
```

### 자율주행

```python
from lekiwi import LeKiwi, AutoNav

robot = LeKiwi()
nav = AutoNav(robot)

# 맵 로드
nav.load_map('map.yaml')

# 목표 지점 설정
nav.set_goal(x=2.0, y=3.0)

# 자율 주행 시작
nav.start()
```

## 시스템 요구사항

- Python 3.8 이상
- OpenCV 4.5 이상
- ROS2 Foxy 이상 (선택)

## 다음 단계

- [하드웨어 조립](assembly.md)
- [소프트웨어 설정](software.md)
- [SLAM 튜토리얼](slam-tutorial.md)

## 문의하기

- **이메일**: contact@roboseasy.com
- **GitHub**: [github.com/roboseasy/lekiwi](https://github.com/roboseasy/lekiwi)
