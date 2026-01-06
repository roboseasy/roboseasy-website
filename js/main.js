// ==========================================
// Home Page - Scroll Animation
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    const sections = document.querySelectorAll('.content-section');

    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
            }
        });
    }, observerOptions);

    sections.forEach(section => {
        observer.observe(section);
    });
});


// ==========================================
// News Page - Tabs Functionality
// ==========================================

/**
 * 탭 전환 기능 초기화
 */
function initNewsTabs() {
    const tabs = document.querySelectorAll('.news__tab');
    const panels = document.querySelectorAll('.news__panel');

    if (tabs.length === 0 || panels.length === 0) {
        return; // news 페이지가 아니면 리턴
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;

            // 모든 탭과 패널에서 active 클래스 제거
            tabs.forEach(t => t.classList.remove('news__tab--active'));
            panels.forEach(p => p.classList.remove('news__panel--active'));

            // 선택된 탭과 패널에 active 클래스 추가
            tab.classList.add('news__tab--active');
            const targetPanel = document.querySelector(`.news__panel[data-panel="${targetTab}"]`);
            if (targetPanel) {
                targetPanel.classList.add('news__panel--active');
            }
        });
    });
}

// 페이지 로드 시 탭 기능 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initNewsTabs();
        loadYouTubeTitles();
    });
} else {
    initNewsTabs();
    loadYouTubeTitles();
}

// ==========================================
// YouTube Video Titles - oEmbed API
// ==========================================

/**
 * YouTube oEmbed API를 사용하여 비디오 제목 가져오기
 */
async function loadYouTubeTitles() {
    const youtubeVideos = document.querySelectorAll('.youtube-video[data-video-id]');

    if (youtubeVideos.length === 0) {
        return; // YouTube 비디오가 없으면 리턴
    }

    youtubeVideos.forEach(async (videoElement) => {
        const videoId = videoElement.getAttribute('data-video-id');
        const titleElement = videoElement.querySelector('.youtube-video__title');

        if (!videoId || !titleElement) {
            return;
        }

        try {
            // YouTube oEmbed API 호출
            const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);

            if (!response.ok) {
                throw new Error('Failed to fetch video info');
            }

            const data = await response.json();

            // 제목 업데이트
            if (data.title) {
                titleElement.textContent = data.title;
            } else {
                titleElement.textContent = 'YouTube Video';
            }
        } catch (error) {
            console.error(`Error loading title for video ${videoId}:`, error);
            titleElement.textContent = 'YouTube Video';
        }
    });
}
