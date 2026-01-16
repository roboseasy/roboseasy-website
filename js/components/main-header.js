class MainHeader extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <header class="header">
        <div class="header__container">
          <a href="/" class="header__logo">
            <img class="header__logo-image" src="img/logo.png" alt="RobesEasy Logo">
          </a>
          <button class="header__menu-toggle" aria-label="메뉴 열기">
            <span></span>
            <span></span>
            <span></span>
          </button>
          <div class="header__overlay"></div>
          <nav class="header__nav">
            <button class="header__nav-close" aria-label="메뉴 닫기">
              <i class="fa-solid fa-xmark"></i>
            </button>
            <ul class="header__nav-list">
              <li class="header__nav-item"><a class="header__nav-link" href="/">Home</a></li>
              <li class="header__nav-item"><a class="header__nav-link" href="/documents">Documents</a></li>
              <li class="header__nav-item"><a class="header__nav-link" href="https://smartstore.naver.com/roboseasy" target="_blank">Shop</a></li>
              <li class="header__nav-item"><a class="header__nav-link" target="_blank" href="https://forms.gle/r1A5JYj4dYZQJNoq8">Education</a></li>
              <li class="header__nav-item"><a class="header__nav-link" href="/programs">Programs</a></li>
              <li class="header__nav-item"><a class="header__nav-link" href="/news">News</a></li>
              <li class="header__nav-item"><a class="header__nav-link header__nav-link--hackathon" href="/hackathon">해커톤 신청하기</a></li>
            </ul>
          </nav>
        </div>
      </header>
    `;

    this.initMobileMenu();
  }

  initMobileMenu() {
    const menuToggle = this.querySelector('.header__menu-toggle');
    const nav = this.querySelector('.header__nav');
    const overlay = this.querySelector('.header__overlay');
    const closeBtn = this.querySelector('.header__nav-close');

    const closeMenu = () => {
      menuToggle.classList.remove('is-active');
      nav.classList.remove('is-open');
      overlay.classList.remove('is-visible');
      document.body.style.overflow = '';
    };

    if (menuToggle && nav && overlay) {
      menuToggle.addEventListener('click', () => {
        menuToggle.classList.toggle('is-active');
        nav.classList.toggle('is-open');
        overlay.classList.toggle('is-visible');
        document.body.style.overflow = nav.classList.contains('is-open') ? 'hidden' : '';
      });

      overlay.addEventListener('click', closeMenu);

      if (closeBtn) {
        closeBtn.addEventListener('click', closeMenu);
      }

      // 메뉴 링크 클릭 시 메뉴 닫기
      const navLinks = this.querySelectorAll('.header__nav-link');
      navLinks.forEach(link => {
        link.addEventListener('click', () => {
          menuToggle.classList.remove('is-active');
          nav.classList.remove('is-open');
          overlay.classList.remove('is-visible');
          document.body.style.overflow = '';
        });
      });
    }
  }
}

customElements.define('main-header', MainHeader);