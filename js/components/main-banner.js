class MainBanner extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
    <section class="banner">
        <div class="banner__container">
            <div class="banner__tags">
                <span class="banner__tag"># PhysicalAI</span>
                <span class="banner__tag"># 로봇 제조</span>
                <span class="banner__tag"># 로봇 교육</span>
                <span class="banner__tag"># 로봇 컨설팅</span>
            </div>
            <h1 class="banner__title">Robot is Easy, 이게 로보시지</h1>
            <div class="banner__subtitle">
                <p class="banner__subtitle-text">로봇이 더 쉽고, 더 가까워지도록.</p>
                <p class="banner__subtitle-text">우리는 제품·교육·기술을 통해 전국민의 Physical AI 접근성 향상에 기여합니다</p>
            </div>
        </div>
    </section>
    `;
  }
}

customElements.define('main-banner', MainBanner);
