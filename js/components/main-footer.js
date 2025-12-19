class MainFooter extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <footer class="footer">
        <div class="footer__container">
            <div class="footer__content">
                <div class="footer__section footer__section--about">
                    <div class="footer__title">RoboSEasy&nbsp;&nbsp;|&nbsp;&nbsp;로보시지</div>
                    <ul class="footer__list">
                        <li class="footer__list-item">Robot is Easy, 이게 로보시지</li>
                        <li class="footer__list-item"><span>이메일</span>roboseasy@gmail.com</li>
                        <li class="footer__list-item"><span>주소</span>대한민국 서울특별시 동작구 상도로15길 143,</li>
                        <li class="footer__list-item"><span></span>창건빌딩 403-404호
                        <li class="footer__list-item"><span>사업자등록번호</span>173-44-01316</li>
                    </ul>
                </div>
                <div class="footer__section footer__section--social">
                    <div class="footer__title">Social</div>
                    <ul class="footer__list">
                        <li class="footer__list-item"><a class="footer__link" target="_blank" href="https://github.com/roboseasy">GitHub</a></li>
                        <li class="footer__list-item"><a class="footer__link" target="_blank" href="https://www.instagram.com/robo_seasy/">instagram</a></li>
                        <li class="footer__list-item"><a class="footer__link" target="_blank" href="https://www.youtube.com/@RoboSEasy">YouTube</a></li>
                    </ul>
                </div>
                <div class="footer__section footer__section--store">
                    <div class="footer__title">Store</div>
                    <ul class="footer__list">
                        <li class="footer__list-item"><a class="footer__link" target="_blank" href="https://smartstore.naver.com/roboseasy">Naver Smart Store</a></li>
                        <li class="footer__list-item"><a class="footer__link" target="_blank" href="https://shop.coupang.com/roboseasy">Coupang</a></li>
                    </ul>
                </div>
            </div>
            <div class="footer__bottom">
            <p class="footer__copyright">COPYRIGHT©2025 RoboSEasy ALL RIGHTS RESERVED</p>
            </div>
        </div>
    </footer>
    `;
  }
}

customElements.define('main-footer', MainFooter);
