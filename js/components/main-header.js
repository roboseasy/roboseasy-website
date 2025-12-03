class MainHeader extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <header class="main-header">
        <div class="header-container">
          <div class="logo">
            <img src="img/logo.png" alt="RobesEasy Logo">
          </div>
          <nav class="main-nav">
            <ul>
              <li><a href="index.html">Home</a></li>
              <li><a href="documents.html">Documents</a></li>
              <li><a href="products.html">Products</a></li>
              <li><a target="_blank" href="https://forms.gle/r1A5JYj4dYZQJNoq8">Education</a></li>
              <li><a href="news.html">News</a></li>
            </ul>
          </nav>
        </div>
      </header>
    `;
  }
}

customElements.define('main-header', MainHeader);