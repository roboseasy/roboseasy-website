# LeRobot SO-ARM 소개

?> **LeRobot SO-ARM 시작하기**
<br>이 섹션에서는 SO ARM을 사용하여 LeRobot을 시작하는 방법을 단계별로 안내합니다.

SO-ARM은 LeRobot 생태계에서 지원하는 저가형 로봇 팔입니다. 
<br>교육 및 연구 목적으로 설계되었으며, LeRobot의 모든 기능을 실습할 수 있습니다.

<div style="text-align: center;">
  <img src="https://roboseasy.netlify.app/img/lerobot-so-arm.png" alt="LeRobot SO-ARM 101" width="500px">
</div>

!> **최신 버전**
<br>SO-ARM101은 SO-ARM100의 차세대 버전으로,
<br> 개선된 배선과 더 쉽게 조립할 수 있는 설계를 특징으로 합니다.

그중 특히, SO-ARM 101은 RobotStudio와 Hugging Face가 협력하여 개발한 오픈소스 로봇 팔입니다. <br>LeRobot 라이브러리와 완벽하게 호환되며, AI 로봇공학 학습에 최적화되어 있습니다.

## 주요 특징

### 🤖 하드웨어

*   **6축 로봇 팔**: 다양한 작업 수행 가능
*   **저가형 설계**: 교육 및 연구에 적합한 가격
*   **오픈소스**: 설계 도면 및 부품 정보 공개

### 🧠 소프트웨어

*   **LeRobot 완전 지원**: 모든 기능 활용 가능
*   **텔레오퍼레이션**: 직관적인 원격 조작
*   **데이터 수집**: 시연 데이터 자동 저장
*   **모델 학습**: 다양한 AI 모델 학습 지원

## 💰 비용 분석

### SO-ARM101 시스템

### Leader Arm

*   [STS3215 서보 모터](https://ko.aliexpress.com/item/1005008600633508.html?spm=a2g0o.productlist.main.8.5ea35e91gdAdxU&algo_pvid=55fe67ff-1a8f-447f-86ec-92c0f6f6fe92&algo_exp_id=55fe67ff-1a8f-447f-86ec-92c0f6f6fe92-7&pdp_ext_f=%7B%22order%22%3A%22104%22%2C%22eval%22%3A%221%22%7D&pdp_npi=6%40dis%21KRW%2128900%2128900%21%21%2120.23%2120.23%21%40212a70c017566214535464313e41f0%2112000045901646487%21sea%21KR%216197971104%21X%211%210%21n_tag%3A-29919%3Bd%3Af9a7fa7%3Bm03_new_user%3A-29895&curPageLogUid=M5rDpRc7GlNc&utparam-url=scene%3Asearch%7Cquery_from%3A%7Cx_object_id%3A1005008600633508%7C_p_origin_prod%3A) (중국 가격 약 25,000원 x6)
*   [Seeed Studio Bus Servo Driver Board](https://ko.aliexpress.com/item/1005008761261144.html?spm=a2g0o.productlist.main.1.3c002c0bKqyYau&algo_pvid=0e30ad13-e669-41d2-91ef-83b72e236941&algo_exp_id=0e30ad13-e669-41d2-91ef-83b72e236941-0&pdp_ext_f=%7B%22order%22%3A%2236%22%2C%22eval%22%3A%221%22%7D&pdp_npi=6%40dis%21KRW%2122100%2122100%21%21%21110.21%21110.21%21%402141122217566215522356553e8a0f%2112000046617331344%21sea%21KR%216197971104%21X%211%210%21n_tag%3A-29919%3Bd%3Af9a7fa7%3Bm03_new_user%3A-29895&curPageLogUid=HZHLY94nd3Mf&utparam-url=scene%3Asearch%7Cquery_from%3A%7Cx_object_id%3A1005008761261144%7C_p_origin_prod%3A) (중국 가격 약 10,000원)
*   12V 전원 공급장치 (약 10,000원)
*   3D 프린팅 파츠 (약 100,000원)
*   **예상 비용**: 약 25만원

### Follower Arm (Follower Arm)

*   [STS3215 서보 모터](https://ko.aliexpress.com/item/1005008600633508.html?spm=a2g0o.productlist.main.8.5ea35e91gdAdxU&algo_pvid=55fe67ff-1a8f-447f-86ec-92c0f6f6fe92&algo_exp_id=55fe67ff-1a8f-447f-86ec-92c0f6f6fe92-7&pdp_ext_f=%7B%22order%22%3A%22104%22%2C%22eval%22%3A%221%22%7D&pdp_npi=6%40dis%21KRW%2128900%2128900%21%21%2120.23%2120.23%21%40212a70c017566214535464313e41f0%2112000045901646487%21sea%21KR%216197971104%21X%211%210%21n_tag%3A-29919%3Bd%3Af9a7fa7%3Bm03_new_user%3A-29895&curPageLogUid=M5rDpRc7GlNc&utparam-url=scene%3Asearch%7Cquery_from%3A%7Cx_object_id%3A1005008600633508%7C_p_origin_prod%3A) (중국 가격 약 25,000원 x6)
*   [Seeed Studio Bus Servo Driver Board](https://ko.aliexpress.com/item/1005008761261144.html?spm=a2g0o.productlist.main.1.3c002c0bKqyYau&algo_pvid=0e30ad13-e669-41d2-91ef-83b72e236941&algo_exp_id=0e30ad13-e669-41d2-91ef-83b72e236941-0&pdp_ext_f=%7B%22order%22%3A%2236%22%2C%22eval%22%3A%221%22%7D&pdp_npi=6%40dis%21KRW%2122100%2122100%21%21%21110.21%21110.21%21%402141122217566215522356553e8a0f%2112000046617331344%21sea%21KR%216197971104%21X%211%210%21n_tag%3A-29919%3Bd%3Af9a7fa7%3Bm03_new_user%3A-29895&curPageLogUid=HZHLY94nd3Mf&utparam-url=scene%3Asearch%7Cquery_from%3A%7Cx_object_id%3A1005008761261144%7C_p_origin_prod%3A) (중국 가격 약 10,000원)
*   12V 전원 공급장치 (약 10,000원)
*   3D 프린팅 파츠 (약 100,000원)
*   **예상 비용**: 약 25만원

**총 시스템 비용**: 약 50만원

‘Seeed Studio’, ‘Wowrobo’ 그리고 저희 [‘RoboSEasy’](https://smartstore.naver.com/roboseasy/products/12169101368?nl-query=lerobot%20%EA%B5%AC%EB%A7%A4&nl-au=0bf4503d107c402f90b0e21dfbf29ca9) 에서 키트를 주문 할 수 있습니다.

*   해외 구매의 경우 관세, 배송비 다 고려하면 약 50만원 수준에서 직구가 가능합니다.
*   [‘RoboSEasy’](https://smartstore.naver.com/roboseasy/products/12169101368?nl-query=lerobot%20%EA%B5%AC%EB%A7%A4&nl-au=0bf4503d107c402f90b0e21dfbf29ca9) 키트는 카메라 홀더를 포함하여 55만원 수준에서 구매 가능하며, 다양한 옵션을 제공합니다.

### 단계별 구매 계획

**1단계**: 기본 세트 (약 50만원)

*   리더, Follower Arm용 서보 12개
*   드라이버 보드 2개
*   전원 공급장치

**2단계**: 확장 옵션 (약 10 ~ 만원)

*   카메라 등 추가 센서
*   양팔로봇 브릿지

## 🔌 확장 옵션

### 선택적 업그레이드

*   **Top Camera**: 작업 공간 전체 뷰
*   **Wrist Camera**: 정밀한 작업을 위한 근접 뷰
*   **Belly Camera**: 객체 탐지를 위한 근접 뷰
*   **Open Gripper**: 평행 파지
*   **Dual Arm Bridge**: 양팔 협응 구현
*   **LeKiwi**: 모바일 베이스

## 🔌 실제 응용

*   물체 조작 및 픽앤플레이스 작업
*   AI 모델 학습을 위한 데이터 수집
*   연구 및 교육 플랫폼

## 📚 리소스

### SO-ARM101 공식 자료

*   [GitHub 저장소](https://github.com/TheRobotStudio/SO-ARM100)
*   [3D 파일 및 BOM](https://github.com/TheRobotStudio/SO-ARM100/tree/main/hardware)
*   [조립 매뉴얼](https://github.com/TheRobotStudio/SO-ARM100/blob/main/docs/assembly.md)
*   [LeRobot 통합 가이드](https://huggingface.co/docs/lerobot/robots/so100)

*SO-ARM101 프로젝트는 지속적으로 발전하고 있습니다. 최신 업데이트는 각 GitHub 저장소를 확인하세요.*

## 시작하기 전에

SO ARM을 시작하기 전에 다음 사항들을 확인해주세요:

1.  **하드웨어 준비**: SO-ARM101 키트
2.  **소프트웨어 환경**: Python 3.8+ 및 필수 라이브러리
3.  **기본 지식**: 로봇공학 및 머신러닝 기초

## 시작 가이드

SO-ARM을 처음 시작하시나요? 아래 흐름도를 따라 진행하세요:

```
1. 조립 가이드 → 2. 설정 방법 선택 → 3. 소프트웨어 설치 → 4. Calibration
                    ↓
              ⚡ 원터치 세팅 (추천)
              🔌 수동 설정 (USB + 카메라)
```

## 다음 단계

<div class="card-grid">
  <a href="#/hardware-assembly" class="card">
    <h3>🔧 조립 가이드</h3>
    <p>SO-ARM 하드웨어를 조립합니다</p>
  </a>
</div>

> **실습 준비**
> <br>모든 단계를 순서대로 따라하시면 SO-ARM101 Max를 이용한 LeRobot 실습을 성공적으로 진행할 수 있습니다!