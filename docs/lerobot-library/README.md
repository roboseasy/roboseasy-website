# LeRobot Library

HuggingFace LeRobot 라이브러리 사용 가이드

## 소개

LeRobot은 HuggingFace에서 제공하는 오픈소스 로봇 학습 라이브러리입니다. 이 문서에서는 LeRobot 라이브러리를 활용하여 로봇을 학습시키고 제어하는 방법을 안내합니다.

### 주요 기능

- **데이터셋 관리**: 로봇 학습 데이터 수집 및 관리
- **모방 학습**: 시연 데이터를 통한 로봇 행동 학습
- **정책 학습**: 강화학습 및 행동 복제 알고리즘
- **하드웨어 통합**: 다양한 로봇 하드웨어 지원

## 빠른 시작

### 설치

```bash
pip install lerobot
```

### 기본 사용법

```python
from lerobot import LeRobot

# 로봇 초기화
robot = LeRobot()

# 데이터 수집
robot.collect_data()

# 정책 학습
robot.train_policy()

# 로봇 실행
robot.run()
```

## 시스템 요구사항

- Python 3.8 이상
- CUDA 11.8 이상 (GPU 사용 시)
- 최소 8GB RAM

## 다음 단계

- [설치 가이드](installation.md)
- [첫 번째 프로젝트](first-project.md)
- [API 문서](api.md)

## 문의하기

궁금한 점이 있으시면 언제든지 문의해주세요:

- **이메일**: contact@roboseasy.com
- **GitHub**: [github.com/roboseasy](https://github.com/roboseasy)
- **Instagram**: [@robo_seasy](https://www.instagram.com/robo_seasy/)
