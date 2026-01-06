# XLeRobot

확장형 로봇 플랫폼 XLeRobot 활용 가이드

## 소개

XLeRobot은 다양한 센서와 액추에이터를 연결하여 커스터마이징 가능한 확장형 로봇 플랫폼입니다.

### 주요 특징

- **모듈식 설계**: 다양한 하드웨어 모듈 추가 가능
- **확장성**: 센서, 카메라, 그리퍼 등 자유롭게 확장
- **ROS2 지원**: Robot Operating System 2 완벽 호환
- **Python API**: 직관적인 Python 인터페이스

## 지원 모듈

### 센서
- 라이다 (LiDAR)
- RGB-D 카메라
- IMU (관성 측정 장치)
- 힘/토크 센서

### 액추에이터
- 서보 모터
- 스테퍼 모터
- 그리퍼
- 휠 구동계

## 빠른 시작

### 설치

```bash
pip install xlerobot
```

### 기본 사용법

```python
from xlerobot import XLeRobot

# 로봇 초기화
robot = XLeRobot()

# 센서 추가
robot.add_sensor('camera', type='rgbd')
robot.add_sensor('lidar', type='2d')

# 액추에이터 추가
robot.add_actuator('gripper', type='parallel')

# 센서 데이터 읽기
camera_data = robot.read_sensor('camera')
lidar_data = robot.read_sensor('lidar')

# 액추에이터 제어
robot.control_actuator('gripper', position=0.5)
```

## 시스템 요구사항

- Python 3.8 이상
- Ubuntu 20.04 이상 (ROS2 사용 시)
- 최소 4GB RAM

## 다음 단계

- [하드웨어 설정](hardware-setup.md)
- [모듈 추가 가이드](module-guide.md)
- [프로젝트 예제](examples.md)

## 문의하기

- **이메일**: contact@roboseasy.com
- **GitHub**: [github.com/roboseasy/xlerobot](https://github.com/roboseasy/xlerobot)
