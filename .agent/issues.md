# Issues — 알려진 이슈·주의사항·TODO

작업 시 알아둬야 할 함정과 미해결 작업. (구 known-issues.md 개편 — CMS 운영·환경변수·빌드 관련은 [operations.md](operations.md)로 이동)

> 새 이슈 발견 시 해당 섹션에 추가, 해결되면 제거. 2026-07-07 코드 리뷰 기준으로 전면 검증됨.

## 코드 이슈 (미해결)

- **견적 품목 가격 이원화** — `contact.astro`의 ITEMS(공급가 하드코딩) ↔ `products.json`(부가세 포함가)이 독립 관리. 현재는 500,000×1.1=550,000으로 일치하나 강제 장치 없음 — CMS에서 가격 변경 시 견적 폼은 옛 가격. **2차 products DB 동기화 때 같은 소스로 통합**
- **상품 상세 배송 정보 하드코딩** — `products/[id].astro`: "무료배송 (100,000원 이상 무료)" 문구 모순 + 택배사 "GSPostbox"가 확정 택배사(로진택배)와 불일치. **배송 정책(backend.md 미결 #1) 확정 시 정리**

## 모바일 UX (브라우저 확인 필요)

- `/programs/<slug>` 상세: 원래 PC 전용 모달이었음 — 모바일 진입은 가능하나 CSS가 PC 기반이라 일부 어긋남
- `/docs/<slug>`: 1024px 이하 사이드바 오버레이 토글(우하단 ☰) — 동작하나 CSS 다듬기 필요
- contact 폼: 모바일 가로 오버플로우(좌우 스크롤) 보고됨 — 재현 확인 필요

## docsify 잔재

- 옛 docsify-tabs 마크업(`<!-- tabs:start/end -->`)이 lerobot-so-arm 문서 5개(`policy-act`, `policy-groot`, `policy-smolvla`, `dataset-record`, `start-teleoperation`)에 잔존 — Astro에선 주석으로 무시돼 탭 내용이 평면 나열됨 (정리 필요)
- 검색 미구현 (docsify 시절엔 클라이언트 검색 있었음) — Pagefind 도입 검토 가능

## 모니터링 (문제 시 대응)

- **OG 이미지 webp** — banner.png→webp 교체(용량 절감, 의도된 변경). 일부 크롤러(카카오톡 등)가 webp OG를 못 읽는 사례 있음 — 공유 미리보기 깨짐 제보 시 og:image만 경량 jpg 병행으로 전환

## TODO

- [ ] **약관·개인정보처리방침 페이지 게시** (`/terms`, `/privacy`) — 가입 폼의 동의 링크가 현재 404. 법무 검토 후 `.agent/*-draft.md` 내용으로 페이지 생성 (개인정보처리방침은 백엔드 1차 구현 완료 조건 충족됨)

- [ ] LeKiwi, XLeRobot docs 실제 콘텐츠 작성 (현재 placeholder)
- [ ] contact 폼 모바일 가로 오버플로우 수정
- [ ] `/programs/<slug>` 모바일 반응형 보강
- [ ] products 페이지 라이트/다크 토큰 정합 (미확인 — 재검증 필요)
- [ ] 커스텀 404 페이지(`src/pages/404.astro`) 추가 — 현재 Netlify 기본 404 노출
- [ ] netlify.app→roboseasy.ai 301 (Netlify 대시보드 설정 — 저장소 밖이라 미확인. site/robots/SeoMeta 정합은 완료됨)
- [ ] (선택) Pagefind 검색 통합 (`postbuild`에 `npx pagefind --site dist`)
- [ ] (선택) `hackathon-2026` 페이지 공통 헤더/푸터 통일 (현재 chrome={false})

## 해결됨 (2026-07 참고 기록)

- ~~메일 HTML 이스케이프 누락~~ — Hono 이식 시 `src/lib/contactEmail.ts`에서 전 필드 esc() 적용. AS 문의의 구매자 여부·구매 날짜가 메일에서 누락되던 것도 함께 수정

- ~~contact 견적 카드·파일 칩 아이콘 미렌더~~ — innerHTML의 `<Icon>` → 인라인 SVG로 교체
- ~~문의 내용 필수 검증 클라·서버 불일치~~ — required + submit 검증 추가 (AS 필드 포함)
- ~~첨부 안내 25MB가 인프라 한도 초과~~ — 5MB로 정정
- ~~contact 라이트 테마 데드 CSS~~ — 삭제
- ~~도메인 정합(site→roboseasy.ai, robots.txt, SeoMeta)~~ — 완료 확인
