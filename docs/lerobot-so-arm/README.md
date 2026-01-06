# LeRobot SO-ARM

오픈소스 로봇 팔 SO-ARM 조립 및 제어 가이드

## 소개

SO-ARM은 오픈소스 기반의 6축 로봇 팔입니다. 3D 프린팅으로 제작 가능하며, 저렴한 비용으로 로봇 팔을 구축할 수 있습니다.

### 주요 특징

- **6축 자유도**: 다양한 작업 수행 가능
- **오픈소스**: 모든 설계 도면 공개
- **3D 프린팅**: 쉽고 저렴한 제작
- **LeRobot 호환**: HuggingFace LeRobot과 완벽 호환

## 구성품

### 하드웨어

- 3D 프린팅 파트 (STL 파일 제공)
- 서보 모터 6개 (Dynamixel XL330 권장)
- 컨트롤러 보드
- 전원 공급 장치 (12V, 5A)
- 케이블 및 나사

### 소프트웨어

- Python 3.8 이상
- ROS2 (선택사항)
- LeRobot 라이브러리

## 빠른 시작

### 1. 하드웨어 조립

1. 3D 프린팅 파트 출력
2. 서보 모터 조립
3. 케이블 연결
4. 전원 연결

### 2. 소프트웨어 설치

```bash
# SO-ARM SDK 설치
pip install so-arm-sdk

# 연결 테스트
python test_connection.py
```

### 3. 첫 동작

```python
from so_arm import SOARM

# 로봇 팔 초기화
arm = SOARM(port='/dev/ttyUSB0')

# 홈 위치로 이동
arm.move_to_home()

# 특정 위치로 이동
arm.move_to([0, 45, 90, 0, 45, 0])
```

## 다음 단계

- [조립 가이드](assembly.md)
- [소프트웨어 설정](software-setup.md)
- [제어 튜토리얼](control-tutorial.md)

## 문의하기

- **이메일**: contact@roboseasy.com
- **GitHub**: [github.com/roboseasy/so-arm](https://github.com/roboseasy/so-arm)
