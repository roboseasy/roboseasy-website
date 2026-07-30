# Issues — 알려진 이슈·주의사항·TODO

작업 시 알아둬야 할 함정과 미해결 작업. (구 known-issues.md 개편 — CMS 운영·환경변수·빌드 관련은 [operations.md](operations.md)로 이동)

## 주의사항 (건드릴 때 알아야 할 것)

- **OG 이미지는 PNG 유지** — `SeoMeta.astro`의 기본 og:image는 `/img/common_img/banner.png`다. webp로 바꾸면 카카오톡 PC 등 일부 스크래퍼가 읽지 못해 공유 미리보기가 깨진다. og 전용이라 용량 이득도 없다. 사이트 본문 이미지의 webp 원칙과 혼동하지 말 것 ([frontend.md](frontend.md) "메타 태그 / OG")
- **`.env`와 실제 필요 키가 어긋나 있다** — 코드가 쓰는 키는 `RESEND_API_KEY`·`QUOTE_FROM`·`QUOTE_TO` 세 개뿐인데(`api/contact.ts`) 로컬 `.env`에는 없어서 `npm run dev`에서 문의 폼 전송이 조용히 실패한다. 반대로 `.env`에 남아 있는 Supabase·토스 키 5개는 이 브랜치에서 참조하는 코드가 0건이다(회원·주문·결제는 별도 브랜치 범위). 쓰지 않는 시크릿은 지우는 쪽이 안전하다
- **약관·개인정보처리방침이 이 브랜치에 없는 기능을 고지한다** — `src/content/legal/`의 두 문서가 회원가입·주문·결제·마이페이지·탈퇴를 전제로 작성되어 있고 Supabase·토스페이먼츠를 수탁자로 명시한다. 실제로 이 브랜치엔 DB·인증·결제 코드가 없고 서버 호출은 문의 메일·견적서 두 건뿐이다. 백엔드 릴리스를 앞둔 선행 작성이라면 의도된 것이지만, 그 전까지는 고지와 실제가 어긋난 상태다

## 모니터링 (문제 시 대응)

- **`/hackathon-2026` 인바운드 링크** — 종료된 해커톤 페이지를 삭제하고 `public/_redirects`에서 홈으로 301 처리했다(`/hackathon-2026`, `/hackathon`, `/hackathon-2026.html`). 옛 OG 이미지 `/img/hackaton-2026.png` 매핑은 대상 파일이 사라져 제거했으므로, 외부에 남은 공유 카드의 이미지는 깨진다
- **홈 기술 목록의 `fa6-solid:robot` 종횡비** — "양팔 로봇 매니퓰레이션" 아이콘만 `fa6-solid`(viewBox 640×512, 비율 1.25)이고 나머지 5개는 `solar` bold(24×24, 비율 1.0)다. `mdi` 패키지를 걷어내려 교체했고 `solar`엔 로봇 아이콘이 없다. 48×48 컨테이너를 넘치진 않지만(22px × 1.25 = 27.5px) 목록에서 하나만 넓어 보일 수 있다 — 어색하면 `.about-item__icon svg { width: 1em }`로 정사각 강제하거나 `solar:settings-minimalistic-bold`로 대체

## TODO

### 콘텐츠
- [ ] A-Go(LeKiwi), Dual A-Ba(Dual SO-ARM) docs 실제 콘텐츠 작성 — 현재 `index.md` 하나뿐이고 "준비 중" placeholder

### 기능
- [ ] 커스텀 404 페이지(`src/pages/404.astro`) 추가 — 현재 Netlify 기본 404 노출
- [ ] contact 폼 모바일 가로 오버플로우 수정
- [ ] `SeoMeta`의 `type` prop(og:type)이 `BaseLayout`에서 전달되지 않아 쓸 수 없다 — `og:type='article'`이 필요해지면 통로를 뚫어야 함

### 정리 (동작 영향 없음)
- [ ] 미사용 CSS 변수 **24개** — `tokens.css`의 `--color-celestial-cyan`·`--color-chalk`·`--color-error`·`--color-fog`·`--color-iris-mid`·`--color-lavender-mist`·`--color-periwinkle-glow`·`--color-powder-violet`·`--color-pure-white`·`--color-success`·`--color-warning`·`--fw-thin`·`--fw-light`·`--fw-extrabold`·`--gradient-cta`·`--gradient-shimmer`·`--section-gap`·`--shadow-xl-2`·`--spacing-4`·`--spacing-20`·`--spacing-36`·`--spacing-128`·`--spacing-168`, `contact.astro`의 `--accent-mid`
  - `--color-lavender-mist`·`--color-pure-white`·`--shadow-xl-2` 3개는 옛 히어로 CSS를 지우면서 새로 고아가 된 것 — 지운 `.banner__cta-secondary`·`.banner__tag:hover`·`.banner__frame-inner`에서만 쓰이고 있었다
  - 팔레트 토큰이라 남겨도 무해하지만, 디자인 시스템 문서 없이 방치하면 "쓰는 색"과 구분이 안 된다
- [ ] 미참조 이미지 — `uploads/` 3개(`91208794376955634_522800894.jpeg`, `21823396272049845_2029614228.jpeg`, `오픈그리퍼_손목카메라4x.jpeg`). CMS 업로드 폴더라 운영자가 다시 쓸 수 있으니 확인 후 삭제
- [ ] 불필요한 `<script is:inline>` 2곳 — `docs/[...slug].astro`, `StudioDownloadSection.astro`는 onclick 호환도 외부 스크립트도 아니라 `is:inline`을 떼면 번들·타입 검사 대상이 된다 ([frontend.md](frontend.md) "JavaScript / TypeScript")
- [ ] `.gitignore`의 대상 없는 항목 3줄 — `!.vscode/extensions.json`, `!.env.example`, `/supabase`

### 미사용 CSS 판별 시 주의

⚠️ `.footer__section--docs/store/resource`, `.install-guide__panel--soon`, `.install-guide__step--terminal`, `.studio-download__column--linux`는 템플릿에서 클래스명을 문자열로 조립하므로(`footer__section--${section.key}` 등) grep·정적 검사에 안 잡힐 뿐 **사용 중**이다. 미사용 CSS를 정리할 때 이 4종을 지우면 UI가 깨진다.
