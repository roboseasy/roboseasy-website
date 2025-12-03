class MainBanner extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
    <section class="main-banner">
        <div class="banner-container">
            <div class="banner-tags">
                <span class="tag"># PhysicalAI</span>
                <span class="tag"># 로봇 제조</span>
                <span class="tag"># 로봇 교육</span>
                <span class="tag"># 로봇 컨설팅</span>
            </div>
            <h1 class="banner-title">Robot is Easy, 이게 로보시지</h1>
            <div class="banner-subtitle">
                <p>로봇이 더 쉽고, 더 가까워지도록.</p>
                <p>우리는 제품·교육·기술을 통해 전국민의 Physical AI 접근성 향상에 기여합니다</p>
            </div>
        </div>
    </section>
    `;
  }
}

customElements.define('main-banner', MainBanner);
