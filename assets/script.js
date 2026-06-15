        // Application State
        let videosData = [];
        let allCategories = [];
        let isDarkMode = false;
        
        // Configuration
        const JSON_URL = 'https://khetrofol.github.io/assets/videos.json';

        // YouTube Player Instance State
        let ytPlayer = null;
        let updateTimer = null;
        let controlsTimeout = null;
        let isPlayerReady = false;

        // DOM Elements
        const loader = document.getElementById('loader');
        const appContent = document.getElementById('app-content');
        const views = document.querySelectorAll('.view-section');
        const themeToggle = document.getElementById('theme-toggle');
        const searchInput = document.getElementById('search-input');
        
        // Dynamic Script Injection of YouTube IFrame Player API
        const ytTag = document.createElement('script');
        ytTag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(ytTag, firstScriptTag);

        // Global YouTube Callback
        window.onYouTubeIframeAPIReady = function() {
            isPlayerReady = true;
            console.log("YouTube API is ready.");
        };

        // Initialize App on DOM Content Loaded
        async function initApp() {
            initTheme();
            await fetchVideos();
            
            // Hide Loader & Show App smoothly
            setTimeout(() => {
                loader.style.opacity = '0';
                setTimeout(() => {
                    loader.style.display = 'none';
                    appContent.classList.remove('hidden');
                    handleRouting();
                }, 500);
            }, 800);

            // App Event Listeners
            window.addEventListener('hashchange', handleRouting);
            themeToggle.addEventListener('change', toggleTheme);
            searchInput.addEventListener('input', handleSearch);
            document.getElementById('share-btn').addEventListener('click', handleShare);
            
            setupInfiniteScroll();
            setupPlayerControls();
        }

        // --- Theme Management ---
        function initTheme() {
            const savedTheme = localStorage.getItem('khetrofol-theme');
            if (savedTheme === 'dark') {
                isDarkMode = true;
                document.documentElement.classList.add('dark');
                themeToggle.checked = true;
            } else {
                isDarkMode = false;
                document.documentElement.classList.remove('dark');
                themeToggle.checked = false;
            }
        }

        function toggleTheme(e) {
            isDarkMode = e.target.checked;
            if (isDarkMode) {
                document.documentElement.classList.add('dark');
                localStorage.setItem('khetrofol-theme', 'dark');
            } else {
                document.documentElement.classList.remove('dark');
                localStorage.setItem('khetrofol-theme', 'light');
            }
        }

        // --- Data Fetching ---
        async function fetchVideos() {
            try {
                const response = await fetch(JSON_URL);
                if (!response.ok) throw new Error('Network response was not ok');
                const data = await response.json();
                videosData = data || [];
                allCategories = [...new Set(videosData.map(v => v.genre))];
            } catch (error) {
                console.error("Error fetching remote data, falling back to mock data:", error);
                // Failback structured data
                videosData = [
                    {
                        "title": "মহাবিশ্বের রহস্যময় ১০টি সত্য ঘটনা যা আপনাকে অবাক করবে",
                        "alias": "space-mysteries-amazing-facts",
                        "youtubeUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                        "thumbnail": "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
                        "publishDate": "2026-06-15",
                        "genre": "শীর্ষ ১০"
                    },
                    {
                        "title": "ব্ল্যাক হোল বা কৃষ্ণ গহ্বর কিভাবে কাজ করে? সহজ বাংলায় বিজ্ঞান",
                        "alias": "how-black-hole-works-simple-science",
                        "youtubeUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                        "thumbnail": "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
                        "publishDate": "2026-06-14",
                        "genre": "বিজ্ঞান ও রহস্য"
                    }
                ];
                allCategories = ["শীর্ষ ১০", "বিজ্ঞান ও রহস্য"];
            }
        }

        // --- Routing System ---
        function handleRouting() {
            const hash = window.location.hash || '#/';
            window.scrollTo(0, 0);

            // Hide all views
            views.forEach(v => v.classList.add('hidden'));
            
            // Clean player updates
            if (updateTimer) {
                clearInterval(updateTimer);
                updateTimer = null;
            }

            // Stop playback if leaving player view
            if (ytPlayer && typeof ytPlayer.pauseVideo === 'function') {
                try {
                    ytPlayer.pauseVideo();
                } catch(e){}
            }

            if (hash === '#/' || hash === '#' || hash === '') {
                document.getElementById('view-home').classList.remove('hidden');
                renderHome();
            } else if (hash === '#settings') {
                document.getElementById('view-settings').classList.remove('hidden');
            } else if (hash.startsWith('#video?id=')) {
                const alias = hash.split('id=')[1];
                document.getElementById('view-video').classList.remove('hidden');
                renderVideoPlayer(alias);
            } else {
                document.getElementById('view-home').classList.remove('hidden');
                renderHome();
            }
        }

        // --- Helper Utilities ---
        function extractVideoID(url) {
            const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
            const match = url.match(regExp);
            return (match && match[2].length === 11) ? match[2] : null;
        }

        function formatDateBangla(dateString) {
            const date = new Date(dateString);
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            return date.toLocaleDateString('bn-BD', options);
        }

        function formatTime(seconds) {
            if (isNaN(seconds) || seconds === undefined) return "00:00";
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }

        function showToast(message) {
            const container = document.getElementById('toast-container');
            const toast = document.createElement('div');
            toast.className = 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-5 py-2.5 rounded-full shadow-xl text-sm font-semibold transition-all duration-300 transform scale-90 opacity-0';
            toast.textContent = message;
            
            container.appendChild(toast);
            setTimeout(() => {
                toast.classList.remove('scale-90', 'opacity-0');
                toast.classList.add('scale-100', 'opacity-100');
            }, 10);
            
            setTimeout(() => {
                toast.classList.remove('scale-100', 'opacity-100');
                toast.classList.add('scale-90', 'opacity-0');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }

        function generateVideoCardHTML(video) {
            return `
                <a href="#video?id=${video.alias}" class="block w-full bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                    <div class="relative w-full aspect-video bg-gray-200 dark:bg-gray-700">
                        <img src="${video.thumbnail}" alt="${video.title}" class="w-full h-full object-cover" loading="lazy" onerror="this.src='https://img.youtube.com/vi/${extractVideoID(video.youtubeUrl)}/hqdefault.jpg'">
                        <div class="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-bold px-2 py-1 rounded">
                            ${video.genre}
                        </div>
                    </div>
                    <div class="p-4">
                        <h3 class="text-base font-bold text-gray-900 dark:text-white line-clamp-2 leading-snug">${video.title}</h3>
                        <p class="text-sm text-gray-500 mt-1.5">${formatDateBangla(video.publishDate)}</p>
                    </div>
                </a>
            `;
        }

        function generateHorizontalVideoCardHTML(video) {
            return `
                <a href="#video?id=${video.alias}" class="flex gap-3 bg-white dark:bg-gray-800 p-2 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <div class="relative w-36 shrink-0 aspect-video rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700">
                        <img src="${video.thumbnail}" alt="${video.title}" class="w-full h-full object-cover" loading="lazy" onerror="this.src='https://img.youtube.com/vi/${extractVideoID(video.youtubeUrl)}/hqdefault.jpg'">
                    </div>
                    <div class="flex flex-col justify-center">
                        <h3 class="text-sm font-bold text-gray-900 dark:text-white line-clamp-2 leading-tight mb-1">${video.title}</h3>
                        <span class="text-xs text-brand font-semibold mb-1">${video.genre}</span>
                        <p class="text-[11px] text-gray-500">${formatDateBangla(video.publishDate)}</p>
                    </div>
                </a>
            `;
        }

        // --- Render Home Page ---
        let feedRenderCount = 0;
        
        function renderHome() {
            if (videosData.length === 0) {
                document.getElementById('feed-container').innerHTML = '<div class="text-center text-gray-500 mt-10">কোনো ভিডিও পাওয়া যায়নি।</div>';
                return;
            }

            // Render Latest (Top 10 sorted by date)
            const sortedByDate = [...videosData].sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate));
            const latest10 = sortedByDate.slice(0, 10);
            const latestContainer = document.getElementById('latest-videos');
            
            latestContainer.innerHTML = latest10.map(v => generateVideoCardHTML(v)).join('');

            // Clear categories feed and render first batch
            const catFeed = document.getElementById('categories-feed');
            catFeed.innerHTML = '';
            appendCategoryBatch();
        }

        function appendCategoryBatch() {
            const container = document.getElementById('categories-feed');
            allCategories.forEach(category => {
                const categoryVideos = videosData.filter(v => v.genre === category);
                if (categoryVideos.length === 0) return;

                const sectionHTML = `
                    <div class="mt-8 px-4 fade-in">
                        <div class="flex items-center justify-between mb-4 border-l-4 border-brand pl-2">
                            <h2 class="text-xl font-bold text-gray-800 dark:text-white">${category}</h2>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            ${categoryVideos.map(v => generateVideoCardHTML(v)).join('')}
                        </div>
                    </div>
                `;
                container.insertAdjacentHTML('beforeend', sectionHTML);
            });
            feedRenderCount++;
        }

        // Infinite Scroll Logic
        function setupInfiniteScroll() {
            const observer = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting && videosData.length > 0) {
                    appendCategoryBatch();
                }
            }, { rootMargin: '100px' });
            
            const trigger = document.getElementById('scroll-trigger');
            if (trigger) observer.observe(trigger);
        }

        // --- Search Action ---
        function handleSearch(e) {
            const query = e.target.value.toLowerCase().trim();
            const feedContainer = document.getElementById('feed-container');
            const searchContainer = document.getElementById('search-results-container');
            const searchGrid = document.getElementById('search-results-grid');

            if (query === '') {
                feedContainer.classList.remove('hidden');
                searchContainer.classList.add('hidden');
                return;
            }

            feedContainer.classList.add('hidden');
            searchContainer.classList.remove('hidden');

            const results = videosData.filter(v => 
                v.title.toLowerCase().includes(query) || 
                v.genre.toLowerCase().includes(query)
            );

            if (results.length === 0) {
                searchGrid.innerHTML = `
                    <div class="col-span-1 sm:col-span-2 lg:col-span-3 text-center py-10">
                        <svg class="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        <p class="text-gray-500 dark:text-gray-400">কোনো ফলাফল পাওয়া যায়নি!</p>
                    </div>`;
            } else {
                searchGrid.innerHTML = results.map(v => generateVideoCardHTML(v)).join('');
            }
        }

        // --- Custom Player Actions ---
        function setupPlayerControls() {
            const playPauseBtn = document.getElementById('ctrl-play-pause');
            const bigPlayBtn = document.getElementById('ctrl-big-play');
            const seekbar = document.getElementById('ctrl-seekbar');
            const muteBtn = document.getElementById('ctrl-mute');
            const volSlider = document.getElementById('ctrl-vol-slider');
            const fullscreenBtn = document.getElementById('ctrl-fullscreen');
            const customPlayer = document.getElementById('custom-video-player');
            const controlsOverlay = document.getElementById('custom-controls');
            const middlePlayTrigger = document.getElementById('middle-play-trigger');

            // Play / Pause Action
            const togglePlayState = (e) => {
                if (e) e.stopPropagation();
                if (!ytPlayer || typeof ytPlayer.getPlayerState !== 'function') return;
                
                const state = ytPlayer.getPlayerState();
                if (state === YT.PlayerState.PLAYING) {
                    ytPlayer.pauseVideo();
                } else {
                    ytPlayer.playVideo();
                }
                resetControlsTimeout();
            };

            playPauseBtn.addEventListener('click', togglePlayState);
            bigPlayBtn.addEventListener('click', togglePlayState);
            middlePlayTrigger.addEventListener('click', togglePlayState);

            // Mute / Unmute
            muteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!ytPlayer || typeof ytPlayer.isMuted !== 'function') return;
                
                if (ytPlayer.isMuted()) {
                    ytPlayer.unMute();
                    volSlider.value = 100;
                    ytPlayer.setVolume(100);
                    updateVolumeIcons(false);
                } else {
                    ytPlayer.mute();
                    volSlider.value = 0;
                    ytPlayer.setVolume(0);
                    updateVolumeIcons(true);
                }
                resetControlsTimeout();
            });

            // Volume Change
            volSlider.addEventListener('input', (e) => {
                e.stopPropagation();
                if (!ytPlayer || typeof ytPlayer.setVolume !== 'function') return;
                const val = parseInt(e.target.value);
                ytPlayer.setVolume(val);
                if (val === 0) {
                    ytPlayer.mute();
                    updateVolumeIcons(true);
                } else {
                    ytPlayer.unMute();
                    updateVolumeIcons(false);
                }
            });
            // Stop propagation on slider to avoid triggers
            volSlider.addEventListener('click', (e) => e.stopPropagation());

            // Seekbar logic (Click and Drag)
            const handleSeek = (e) => {
                if (!ytPlayer || typeof ytPlayer.getDuration !== 'function') return;
                const rect = seekbar.getBoundingClientRect();
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                const clickX = clientX - rect.left;
                const percentage = Math.min(Math.max(clickX / rect.width, 0), 1);
                const duration = ytPlayer.getDuration();
                
                if (duration > 0) {
                    const targetTime = duration * percentage;
                    ytPlayer.seekTo(targetTime, true);
                    updateSeekbarUI(targetTime, duration);
                }
            };

            seekbar.addEventListener('click', (e) => {
                e.stopPropagation();
                handleSeek(e);
            });

            // Touch and Drag seeking mechanics
            let isDraggingSeek = false;
            const startDrag = (e) => { 
                e.stopPropagation(); 
                isDraggingSeek = true; 
                handleSeek(e); 
            };
            const dragMove = (e) => { 
                if (isDraggingSeek) {
                    e.stopPropagation();
                    handleSeek(e); 
                }
            };
            const stopDrag = () => { isDraggingSeek = false; };

            seekbar.addEventListener('mousedown', startDrag);
            window.addEventListener('mousemove', dragMove);
            window.addEventListener('mouseup', stopDrag);

            seekbar.addEventListener('touchstart', startDrag, { passive: false });
            window.addEventListener('touchmove', dragMove, { passive: false });
            window.addEventListener('touchend', stopDrag);

            // Fullscreen Toggle
            fullscreenBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!document.fullscreenElement) {
                    customPlayer.requestFullscreen().catch(err => {
                        console.error("Fullscreen Request Failed: ", err);
                    });
                } else {
                    document.exitFullscreen();
                }
            });

            // Auto-hide Mechanism
            const resetControlsTimeout = () => {
                controlsOverlay.classList.remove('controls-hidden');
                clearTimeout(controlsTimeout);
                
                if (ytPlayer && typeof ytPlayer.getPlayerState === 'function') {
                    if (ytPlayer.getPlayerState() === YT.PlayerState.PLAYING) {
                        controlsTimeout = setTimeout(() => {
                            controlsOverlay.classList.add('controls-hidden');
                        }, 3500);
                    }
                }
            };

            customPlayer.addEventListener('mousemove', resetControlsTimeout);
            customPlayer.addEventListener('touchstart', resetControlsTimeout, { passive: true });
            
            // Handle clicking outside control elements on the overlay to Toggle Play
            controlsOverlay.addEventListener('click', (e) => {
                if (e.target.closest('button') || e.target.closest('input') || e.target.closest('#ctrl-seekbar')) return;
                togglePlayState(e);
            });
        }

        function updateVolumeIcons(isMuted) {
            const highIcon = document.getElementById('vol-high');
            const mutedIcon = document.getElementById('vol-muted');
            if (isMuted) {
                highIcon.classList.add('hidden');
                mutedIcon.classList.remove('hidden');
            } else {
                highIcon.classList.remove('hidden');
                mutedIcon.classList.add('hidden');
            }
        }

        function updateSeekbarUI(currentTime, duration) {
            const seekbarFill = document.getElementById('ctrl-seekbar-fill');
            const seekbarHandle = document.getElementById('ctrl-seekbar-handle');
            const timeDisplay = document.getElementById('ctrl-time-display');

            const percent = duration > 0 ? (currentTime / duration) * 100 : 0;
            seekbarFill.style.width = `${percent}%`;
            seekbarHandle.style.left = `${percent}%`;

            timeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
        }

        // --- Render Specific Video Inside Player ---
        let currentShareAlias = '';
        
        function renderVideoPlayer(alias) {
            const video = videosData.find(v => v.alias === alias);
            
            if (!video) {
                document.getElementById('video-outer-container').innerHTML = `
                    <div class="w-full aspect-video flex flex-col items-center justify-center bg-gray-900">
                        <p class="text-white text-lg font-bold">ভিডিওটি খুঁজে পাওয়া যায়নি!</p>
                        <a href="#/" class="mt-4 px-4 py-2 bg-brand text-gray-900 rounded-full text-sm font-bold hover:bg-brandDark">হোমে ফিরে যান</a>
                    </div>`;
                document.getElementById('video-metadata').classList.add('hidden');
                return;
            }

            document.getElementById('video-metadata').classList.remove('hidden');
            document.getElementById('player-top-title').textContent = video.title;
            
            const ytId = extractVideoID(video.youtubeUrl);

            // Set Metadata Info
            document.getElementById('video-title').textContent = video.title;
            document.getElementById('video-date').textContent = "প্রকাশিত: " + formatDateBangla(video.publishDate);
            document.getElementById('video-genre').textContent = video.genre;
            currentShareAlias = video.alias;

            // Load Youtube Native Player securely
            if (window.YT && window.YT.Player) {
                initYTPlayerInstance(ytId);
            } else {
                const checkYT = setInterval(() => {
                    if (window.YT && window.YT.Player) {
                        clearInterval(checkYT);
                        initYTPlayerInstance(ytId);
                    }
                }, 100);
            }

            // Render Recommended Related List (Same Genre)
            const relatedContainer = document.getElementById('related-videos-list');
            const related = videosData.filter(v => v.genre === video.genre && v.alias !== video.alias);
            
            if (related.length > 0) {
                relatedContainer.innerHTML = related.map(v => generateHorizontalVideoCardHTML(v)).join('');
            } else {
                relatedContainer.innerHTML = '<p class="text-sm text-gray-500">এই ক্যাটাগরিতে আর কোনো ভিডিও নেই।</p>';
            }
        }

        // Safe Native-Like Player Initializer
        function initYTPlayerInstance(ytId) {
            // Destroy former instance securely if exist
            if (ytPlayer) {
                try {
                    ytPlayer.destroy();
                } catch(e) {
                    console.log("Player destruction logging:", e);
                }
                ytPlayer = null;
            }

            // Fresh rebuild of the target container to prevent YT API bindings failure
            const playerWrapper = document.getElementById('custom-video-player');
            const placeholder = document.getElementById('yt-player-placeholder');
            if (placeholder) {
                placeholder.remove();
            }
            playerWrapper.insertAdjacentHTML('afterbegin', '<div id="yt-player-placeholder"></div>');

            ytPlayer = new YT.Player('yt-player-placeholder', {
                height: '100%',
                width: '100%',
                videoId: ytId,
                playerVars: {
                    autoplay: 1,
                    controls: 0,          // Disable default overlay
                    disablekb: 1,        // Disable hotkeys
                    modestbranding: 1,   // Hide logo
                    rel: 0,              // Disable relative links
                    showinfo: 0,         // Obfuscate title
                    iv_load_policy: 3,   // Prevent annotation popups
                    fs: 0,               // Disable full screen native control
                    playsinline: 1       // Allow inline player on Safari iOS
                },
                events: {
                    'onReady': onPlayerReady,
                    'onStateChange': onPlayerStateChange,
                    'onError': onPlayerError
                }
            });
        }

        function onPlayerReady(event) {
            // Start updating progress bar real-time
            if (updateTimer) clearInterval(updateTimer);
            updateTimer = setInterval(() => {
                if (ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
                    const currentTime = ytPlayer.getCurrentTime();
                    const duration = ytPlayer.getDuration();
                    updateSeekbarUI(currentTime, duration);
                }
            }, 300);

            // Attempt Autoplay
            event.target.playVideo();
        }

        function onPlayerStateChange(event) {
            const playIcon = document.getElementById('play-icon');
            const pauseIcon = document.getElementById('pause-icon');
            const bigPlayIcon = document.getElementById('big-play-icon');
            const bigPauseIcon = document.getElementById('big-pause-icon');
            const controlsOverlay = document.getElementById('custom-controls');

            if (event.data === YT.PlayerState.PLAYING) {
                playIcon.classList.add('hidden');
                pauseIcon.classList.remove('hidden');
                bigPlayIcon.classList.add('hidden');
                bigPauseIcon.classList.remove('hidden');
                
                // Set default volume settings on load
                const volSlider = document.getElementById('ctrl-vol-slider');
                if (ytPlayer && typeof ytPlayer.setVolume === 'function') {
                    ytPlayer.setVolume(parseInt(volSlider.value));
                    if(parseInt(volSlider.value) === 0) {
                        ytPlayer.mute();
                        updateVolumeIcons(true);
                    } else {
                        ytPlayer.unMute();
                        updateVolumeIcons(false);
                    }
                }

                // Autohide controls on load playing
                clearTimeout(controlsTimeout);
                controlsTimeout = setTimeout(() => {
                    controlsOverlay.classList.add('controls-hidden');
                }, 3000);

            } else {
                playIcon.classList.remove('hidden');
                pauseIcon.classList.add('hidden');
                bigPlayIcon.classList.remove('hidden');
                bigPauseIcon.classList.add('hidden');
                
                // Show controls on stop/pause
                controlsOverlay.classList.remove('controls-hidden');
            }
        }

        function onPlayerError(event) {
            console.error("YouTube Player Error occurred: ", event.data);
            showToast("ভিডিওটি প্লে করতে সমস্যা হচ্ছে। অনুগ্রহ করে আবার চেষ্টা করুন।");
        }

        // --- Share Action ---
        function handleShare() {
            if (!currentShareAlias) return;
            const shareUrl = window.location.origin + window.location.pathname + '#video?id=' + currentShareAlias;
            
            if (navigator.share) {
                navigator.share({
                    title: 'ক্ষেত্রফল ভিডিও প্ল্যাটফর্ম',
                    text: 'ক্ষেত্রফল চ্যানেলের দুর্দান্ত এই ভিডিওটি দেখুন!',
                    url: shareUrl
                }).catch(err => {
                    console.log('Sharing error:', err);
                });
            } else {
                // Clipboard fallback using document.execCommand
                const tmp = document.createElement('input');
                document.body.appendChild(tmp);
                tmp.value = shareUrl;
                tmp.select();
                try {
                    document.execCommand('copy');
                    showToast('ভিডিওর লিংক ক্লিপবোর্ডে কপি করা হয়েছে!');
                } catch (err) {
                    showToast('দুঃখিত, লিংক কপি করা যায়নি।');
                }
                document.body.removeChild(tmp);
            }
        }

        // Launch Application
        window.addEventListener('DOMContentLoaded', initApp);
