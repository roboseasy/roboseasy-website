# Issues — 알려진 이슈·주의사항·TODO

작업 시 알아둬야 할 함정과 미해결 작업. (구 known-issues.md 개편 — CMS 운영·환경변수·빌드 관련은 [operations.md](operations.md)로 이동)

> 새 이슈 발견 시 해당 섹션에 추가, 해결되면 제거. 2026-07-07 코드 리뷰 기준으로 전면 검증됨.

## 모니터링 (문제 시 대응)

- **OG 이미지 webp** — banner.png→webp 교체(용량 절감, 의도된 변경). 일부 크롤러(카카오톡 등)가 webp OG를 못 읽는 사례 있음 — 공유 미리보기 깨짐 제보 시 og:image만 경량 jpg 병행으로 전환

## TODO

- [ ] LeKiwi, XLeRobot docs 실제 콘텐츠 작성 (현재 placeholder)
- [ ] contact 폼 모바일 가로 오버플로우 수정
- [ ] 커스텀 404 페이지(`src/pages/404.astro`) 추가 — 현재 Netlify 기본 404 노출