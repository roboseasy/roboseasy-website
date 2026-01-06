class MainHeader extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <header class="header">
        <div class="header__container">
          <a href="/" class="header__logo">
            <img class="header__logo-image" src="img/logo.png" alt="RobesEasy Logo">
          </a>
          <nav class="header__nav">
            <ul class="header__nav-list">
              <li><a class="header__nav-link" href="index.html">Home</a></li>
              <li><a class="header__nav-link" href="documents.html">Documents</a></li>
              <li><a class="header__nav-link" href="https://smartstore.naver.com/roboseasy" target="_blank">Shop</a></li>
              <li><a class="header__nav-link" target="_blank" href="https://forms.gle/r1A5JYj4dYZQJNoq8">Education</a></li>
              <li><a class="header__nav-link" href="news.html">News</a></li>
            </ul>
          </nav>
        </div>
      </header>
    `;
  }
}

customElements.define('main-header', MainHeader);