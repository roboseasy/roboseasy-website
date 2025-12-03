class MainFooter extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <footer class="main-footer">
        <div class="footer-container">
            <div class="footer-content">
                <div class="footer-section footer-about">
                    <div class="footer-title">RoboSEasy&nbsp;&nbsp;|&nbsp;&nbsp;로보시지</div>
                    <ul class="footer-items">
                        <li>Robot is Easy, 이게 로보시지</li>
                        <li><span>이메일</span>roboseasy@gmail.com</li>
                        <li><span>주소</span>대한민국 서울특별시 동작구</li>
                        <li><span>사업자등록번호</span>173-44-01316</li>
                    </ul>
                </div>
                <div class="footer-section footer-social">
                    <div class="footer-title">Social</div>
                    <ul class="footer-items">
                        <li><a target="_blank" href="https://github.com/roboseasy">GitHub</a></li>
                        <li><a target="_blank" href="https://www.instagram.com/robo_seasy/">instagram</a></li>
                        <li><a target="_blank" href="https://www.youtube.com/@RoboSEasy">YouTube</a></li>
                    </ul>
                </div>
                <div class="footer-section footer-store">
                    <div class="footer-title">Store</div>
                    <ul class="footer-items">
                        <li><a target="_blank" href="https://smartstore.naver.com/roboseasy">Naver Smart Store</a></li>
                        <li><a target="_blank" href="https://shop.coupang.com/roboseasy">Coupang</a></li>
                    </ul>
                </div>
            </div>
            <div class="footer-bottom">
            <p>COPYRIGHT©2025 RoboSEasy ALL RIGHTS RESERVED</p>
            </div>
        </div>
    </footer>
    `;
  }
}

customElements.define('main-footer', MainFooter);
