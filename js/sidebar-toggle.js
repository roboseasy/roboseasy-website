// ==========================================
// Docs Sidebar Toggle
// ==========================================

(function () {
    // Docsify가 DOM을 생성한 후 실행
    function initSidebarToggle() {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;

        // 토글 버튼 생성
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'sidebar-toggle-btn';
        toggleBtn.innerHTML = '<i class="fas fa-bars"></i>';
        toggleBtn.setAttribute('aria-label', 'Toggle sidebar');
        document.body.appendChild(toggleBtn);

        // 클릭 이벤트
        toggleBtn.addEventListener('click', function () {
            document.body.classList.toggle('sidebar-collapsed');
            const icon = toggleBtn.querySelector('i');
            if (document.body.classList.contains('sidebar-collapsed')) {
                icon.className = 'fas fa-bars';
            } else {
                icon.className = 'fas fa-xmark';
            }
        });
    }

    // Docsify ready 후 실행
    if (document.readyState === 'complete') {
        initSidebarToggle();
    } else {
        window.addEventListener('load', initSidebarToggle);
    }
})();
