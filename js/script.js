(function() {
    const bgMusic = document.getElementById('bgMusic');
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const resultsList = document.getElementById('resultsList');
    const resultsCount = document.getElementById('resultsCount');
    const resultsTitle = document.getElementById('resultsTitle');
    const playerContainer = document.getElementById('musicPlayer');
    const nowPlayingCover = document.getElementById('nowPlayingCover');
    const nowPlayingTitle = document.getElementById('nowPlayingTitle');
    const nowPlayingArtist = document.getElementById('nowPlayingArtist');
    const audioPlayer = document.getElementById('audioPlayer');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const playIcon = document.getElementById('playIcon');
    const progress = document.getElementById('progress');
    const currentTimeEl = document.getElementById('currentTime');
    const durationEl = document.getElementById('duration');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const qualityButtons = document.querySelectorAll('.quality-btn');
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    const volumeSlider = document.getElementById('volumeSlider');
    const progressBar = document.getElementById('progressBar');
    const musicFloatBall = document.getElementById('musicFloatBall');
    const refreshPlayersBtn = document.getElementById('refreshPlayersBtn');

    let currentSongs = [], currentIndex = -1, currentQuality = 'hires', isPlaying = false, searchInProgress = false, isDragging = false;
    const qualityNames = {'standard':'标准音质','higher':'较高音质','exhigh':'极高音质','lossless':'无损音质','hires':'高清音质'};
    let isPlayerExpanded = false;

    function showToast(m) {
        const t = document.getElementById('toast');
        t.textContent = m;
        t.style.display = 'block';
        setTimeout(() => t.style.display = 'none', 2000);
    }

    function fallbackCopyText(t, s) {
        const e = document.createElement('textarea');
        e.value = t;
        e.style.position = 'fixed';
        e.style.opacity = '0';
        e.style.pointerEvents = 'none';
        document.body.appendChild(e);
        e.select();
        try {
            if (document.execCommand('copy')) showToast(s || '复制成功！');
            else alert('复制失败，请手动复制');
        } catch (err) {
            alert('复制失败，请手动复制');
        }
        document.body.removeChild(e);
    }

    function copyTextToClipboard(t, s) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(t).then(() => showToast(s || '复制成功！')).catch(() => fallbackCopyText(t, s));
        } else {
            fallbackCopyText(t, s);
        }
    }

    window.copyIp = function() {
        const ip = document.getElementById('ip').innerText.trim();
        copyTextToClipboard(ip, 'IP 复制成功！');
    };

    window.copyGroup = function() {
        copyTextToClipboard('929934674', 'QQ群号复制成功！');
    };

    function showError(m) {
        errorText.textContent = m;
        errorMessage.classList.add('show');
        setTimeout(hideError, 5000);
    }

    function hideError() {
        errorMessage.classList.remove('show');
    }

    function formatTime(s) {
        if (isNaN(s)) return '0:00';
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60).toString().padStart(2, '0');
        return m + ':' + sec;
    }

    function updateProgress() {
        if (!audioPlayer.duration) return;
        const p = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        progress.style.width = p + '%';
        currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
    }

    function updateDuration() {
        durationEl.textContent = formatTime(audioPlayer.duration);
    }

    function handleAudioError() {
        showError('播放失败，请尝试其他音质');
        isPlaying = false;
        playIcon.className = 'fas fa-play';
        nowPlayingCover.classList.remove('playing');
    }

    function decodeHtmlEntities(text) {
        if (!text) return '';
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        return textarea.value;
    }

    async function getAudioUrl(songId, quality) {
        try {
            const res = await fetch(`https://api.byfuns.top/1/?id=${songId}&level=${quality}`);
            if (!res.ok) throw new Error();
            const url = await res.text();
            if (!url.startsWith('http')) throw new Error();
            return url;
        } catch (e) {
            const order = ['hires', 'lossless', 'exhigh', 'higher', 'standard'];
            const idx = order.indexOf(quality);
            if (idx < order.length - 1) {
                const next = order[idx + 1];
                showError(`${qualityNames[quality]}获取失败，尝试${qualityNames[next]}...`);
                return getAudioUrl(songId, next);
            } else throw new Error('无法获取音频链接');
        }
    }

    async function playSong(song, index) {
        try {
            bgMusic.pause();
            currentIndex = index;
            document.querySelectorAll('.song-item').forEach(i => i.classList.remove('active'));
            document.querySelectorAll(`.song-item[data-index="${index}"]`).forEach(i => i.classList.add('active'));
            
            const songName = song.name || '未知歌曲';
            const artistName = song.artistsname || (song.artists ? song.artists.map(a => a.name).join('/') : '未知歌手');
            const albumName = song.album || (song.albumObj ? song.albumObj.name : '未知专辑');
            
            nowPlayingTitle.textContent = songName;
            nowPlayingArtist.textContent = `${artistName} · ${albumName}`;
            
            if (!isPlayerExpanded) {
                isPlayerExpanded = true;
                playerContainer.classList.add('expanded');
                musicFloatBall.classList.add('expanded');
                musicFloatBall.querySelector('.music-icon').textContent = '▼';
            }
            nowPlayingCover.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            const audioUrl = await getAudioUrl(song.id, currentQuality);
            audioPlayer.src = audioUrl;
            nowPlayingCover.innerHTML = '<i class="fas fa-music"></i>';
            nowPlayingCover.classList.remove('playing');
            await audioPlayer.play();
            isPlaying = true;
            playIcon.className = 'fas fa-pause';
            nowPlayingCover.classList.add('playing');
            hideError();
        } catch (error) {
            showError('无法播放此歌曲，请尝试其他音质或歌曲。如网络异常，请多点击几次重试');
            console.error(error);
        }
    }

    function togglePlayPause() {
        if (!audioPlayer.src) return;
        if (isPlaying) {
            audioPlayer.pause();
            playIcon.className = 'fas fa-play';
            nowPlayingCover.classList.remove('playing');
        } else {
            audioPlayer.play();
            playIcon.className = 'fas fa-pause';
            nowPlayingCover.classList.add('playing');
        }
        isPlaying = !isPlaying;
    }

    function playPrev() {
        if (currentSongs.length === 0) return;
        let n = currentIndex - 1;
        if (n < 0) n = currentSongs.length - 1;
        playSong(currentSongs[n], n);
    }

    function playNext() {
        if (currentSongs.length === 0) return;
        let n = currentIndex + 1;
        if (n >= currentSongs.length) n = 0;
        playSong(currentSongs[n], n);
    }

    async function downloadSong(song) {
        try {
            showError('正在准备下载...');
            const url = await getAudioUrl(song.id, currentQuality);
            const a = document.createElement('a');
            a.href = url;
            const ext = (currentQuality === 'hires' || currentQuality === 'lossless') ? 'flac' : 'mp3';
            a.download = `${song.name} - ${song.artistsname || song.artists?.[0]?.name || '未知'}.${ext}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            showError(`下载已开始 (${qualityNames[currentQuality]})`);
            setTimeout(hideError, 2000);
        } catch {
            showError('下载失败，请稍后重试');
        }
    }

    function displayResults(songs, isHot) {
        if (!songs || songs.length === 0) {
            displayEmptyResults();
            return;
        }
        let html = '';
        songs.forEach((song, index) => {
            const songName = song.name || '未知歌曲';
            const artistName = song.artistsname || (song.artists ? song.artists.map(a => a.name).join('/') : '未知歌手');
            const albumName = song.album || (song.albumObj ? song.albumObj.name : '未知专辑');
            const duration = song.duration || 240000;
            const m = Math.floor(duration / 60000);
            const s = Math.floor((duration % 60000) / 1000).toString().padStart(2, '0');
            html += `<div class="song-item ${index === currentIndex ? 'active' : ''}" data-index="${index}">
                <div class="song-cover"><i class="fas fa-music"></i></div>
                <div class="song-info">
                    <h3>${escapeHtml(songName)}</h3>
                    <p>${escapeHtml(artistName)} · ${escapeHtml(albumName)} · ${m}:${s}</p>
                </div>
                <div class="song-actions">
                    <button class="play-btn" data-index="${index}"><i class="fas fa-play"></i></button>
                    <button class="download-btn" data-index="${index}"><i class="fas fa-download"></i></button>
                </div>
            </div>`;
        });
        resultsList.innerHTML = html;
        resultsCount.textContent = `${songs.length} 首歌曲`;
        
        document.querySelectorAll('.play-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                playSong(songs[parseInt(btn.dataset.index)], parseInt(btn.dataset.index));
            });
        });
        document.querySelectorAll('.download-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                downloadSong(songs[parseInt(btn.dataset.index)]);
            });
        });
        document.querySelectorAll('.song-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.song-actions')) {
                    const idx = parseInt(item.dataset.index);
                    playSong(songs[idx], idx);
                }
            });
        });
    }

    function displayEmptyResults() {
        resultsList.innerHTML = `<div class="empty-state"><i class="fas fa-search"></i><p>未找到相关歌曲，请尝试其他关键词</p></div>`;
        resultsCount.textContent = '0 首';
        resultsTitle.innerHTML = '<span class="results-title-left"><i class="fas fa-fire-flame-curved" style="color: #f39c12;"></i> 无结果</span> <span id="resultsCount">0 首</span>';
    }

    function showLoading() {
        resultsList.innerHTML = `<div class="loading"><i class="fas fa-spinner fa-spin"></i><p>正在搜索中...</p></div>`;
        resultsTitle.innerHTML = '<span class="results-title-left"><i class="fas fa-spinner fa-spin" style="color: #2ecc71;"></i> 搜索中...</span> <span id="resultsCount">...</span>';
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    async function loadHotSongs() {
        try {
            resultsTitle.innerHTML = '<span class="results-title-left"><i class="fas fa-fire-flame-curved" style="color: #f39c12;"></i> 热门推荐</span> <span id="resultsCount">加载中...</span>';
            resultsList.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><p>正在加载热歌榜...</p></div>';
            
            const response = await fetch(`https://node.api.xfabe.com/api/wangyi/search?search=热门歌曲&limit=15`);
            
            if (!response.ok) throw new Error(`HTTP错误 ${response.status}`);
            const data = await response.json();
            
            if (data.code === 200 && data.data && data.data.songs) {
                currentSongs = data.data.songs;
                displayResults(currentSongs, true);
                resultsTitle.innerHTML = '<span class="results-title-left"><i class="fas fa-fire-flame-curved" style="color: #f39c12;"></i> 热门推荐</span> <span id="resultsCount">' + currentSongs.length + ' 首</span>';
            } else {
                throw new Error('歌单数据解析失败');
            }
        } catch (error) {
            console.error('加载热歌榜失败:', error);
            resultsList.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>热门推荐加载失败，您可以搜索歌曲</p><p style="font-size:11px; margin-top:8px;">如网络异常，请多点击几次重试</p></div>';
            resultsCount.textContent = '0 首';
            resultsTitle.innerHTML = '<span class="results-title-left"><i class="fas fa-fire-flame-curved" style="color: #f39c12;"></i> 热门推荐</span> <span id="resultsCount">0 首</span>';
        }
    }

    async function performSearch(retryCount = 2) {
        const query = searchInput.value.trim();
        if (!query) {
            loadHotSongs();
            return;
        }
        if (searchInProgress) {
            showError('正在搜索中，请稍候');
            return;
        }
        
        searchInProgress = true;
        showLoading();
        resultsTitle.innerHTML = '<span class="results-title-left"><i class="fas fa-search" style="color: #2ecc71;"></i> 搜索中...</span> <span id="resultsCount">...</span>';
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);
        
        try {
            const response = await fetch(`https://node.api.xfabe.com/api/wangyi/search?search=${encodeURIComponent(query)}&limit=15`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            if (!response.ok) throw new Error(`HTTP错误 ${response.status}`);
            const data = await response.json();
            if (data.code !== 200 || !data.data || !data.data.songs) throw new Error('未找到相关歌曲');
            
            currentSongs = data.data.songs;
            displayResults(currentSongs, false);
            resultsTitle.innerHTML = '<span class="results-title-left"><i class="fas fa-search" style="color: #2ecc71;"></i> 搜索结果 “' + escapeHtml(query) + '”</span> <span id="resultsCount">' + currentSongs.length + ' 首</span>';
            hideError();
        } catch (error) {
            if (error.name === 'AbortError') {
                if (retryCount > 0) {
                    showError(`搜索超时，正在重试 (${retryCount}次剩余)...`);
                    setTimeout(() => {
                        searchInProgress = false;
                        performSearch(retryCount - 1);
                    }, 1000);
                    return;
                } else {
                    showError('搜索超时，请检查网络或稍后重试。如网络异常，请多点击几次。');
                }
            } else {
                if (retryCount > 0) {
                    showError(`搜索失败，正在重试 (${retryCount}次剩余)...`);
                    setTimeout(() => {
                        searchInProgress = false;
                        performSearch(retryCount - 1);
                    }, 1000);
                    return;
                } else {
                    showError(error.message + ' 如网络异常，请多点击几次重试');
                }
            }
            displayEmptyResults();
            resultsTitle.innerHTML = '<span class="results-title-left"><i class="fas fa-exclamation-triangle" style="color: #e74c3c;"></i> 搜索失败</span> <span id="resultsCount">0 首</span>';
        } finally {
            searchInProgress = false;
        }
    }

    function startDrag(e) {
        e.preventDefault();
        isDragging = true;
        updateSeek(e);
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', stopDrag);
        document.addEventListener('touchmove', onDrag, { passive: false });
        document.addEventListener('touchend', stopDrag);
    }

    function onDrag(e) {
        if (!isDragging) return;
        e.preventDefault();
        updateSeek(e);
    }

    function stopDrag() {
        if (isDragging) {
            isDragging = false;
            document.removeEventListener('mousemove', onDrag);
            document.removeEventListener('mouseup', stopDrag);
            document.removeEventListener('touchmove', onDrag);
            document.removeEventListener('touchend', stopDrag);
        }
    }

    function updateSeek(e) {
        const rect = progressBar.getBoundingClientRect();
        let clientX = e.touches ? e.touches[0].clientX : e.clientX;
        let pos = (clientX - rect.left) / rect.width;
        pos = Math.min(1, Math.max(0, pos));
        if (audioPlayer.duration) audioPlayer.currentTime = pos * audioPlayer.duration;
        progress.style.width = (pos * 100) + '%';
    }

    const MAIN_IP = "rzmc.cc.cd", SUB_IP = "rzmc.owo.vin";
    const mainIcon = document.getElementById("server-icon");
    const mainOnline = document.getElementById("online");
    const mainMotd = document.getElementById("motd");
    const mainDesc = document.getElementById("status-desc");
    const subIcon = document.getElementById("sub-icon");
    const subOnline = document.getElementById("sub-online");
    const subMotd = document.getElementById("sub-motd");

    function renderPlayerList(playerNames) {
        const playerListDiv = document.getElementById('playerList');
        const badgeSpan = document.getElementById('playersCountBadge');
        if (!playerListDiv) return;

        if (!playerNames || playerNames.length === 0) {
            playerListDiv.innerHTML = '<div class="no-players"><i class="fas fa-user-slash"></i> 暂无在线玩家</div>';
            if (badgeSpan) badgeSpan.textContent = '0';
            return;
        }

        let html = '';
        playerNames.forEach(item => {
            let displayName = '';
            if (typeof item === 'string') {
                displayName = item;
            } else if (item && item.name) {
                displayName = item.name;
            } else if (item && item.name_clean) {
                displayName = item.name_clean;
            } else if (item && item.uuid) {
                displayName = item.name || item.uuid.substring(0, 8);
            }
            if (displayName) {
                html += `<div class="player-item"><i class="fas fa-user-circle"></i><span class="player-name">${escapeHtml(displayName)}</span></div>`;
            }
        });
        playerListDiv.innerHTML = html;
        if (badgeSpan) badgeSpan.textContent = playerNames.length;
    }

    async function fetchWithTimeout(url, options = {}, timeout = 5000) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(timeoutId);
            return response;
        } catch (err) {
            clearTimeout(timeoutId);
            throw err;
        }
    }

    async function loadMain() {
        try {
            const response = await fetchWithTimeout(`https://api.mcsrvstat.us/2/${MAIN_IP}`, {
                cache: 'no-cache',
                headers: { 'Accept': 'application/json' }
            }, 5000);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            
            if (data.online) {
                const onlineCount = data.players?.online ?? 0;
                const maxCount = data.players?.max ?? 0;
                mainOnline.innerText = `${onlineCount} / ${maxCount}`;
                mainOnline.style.color = "#2ecc71";
                
                let motdText = "欢迎来到RZ主服";
                if (data.motd && data.motd.clean && data.motd.clean.length > 0) {
                    motdText = data.motd.clean.join(' ');
                    motdText = decodeHtmlEntities(motdText);
                }
                mainMotd.innerText = motdText;
                
                if (data.icon) mainIcon.src = data.icon;
                mainDesc.innerText = "主服正常运行中";
                
                let playerList = [];
                if (data.players) {
                    if (data.players.list && Array.isArray(data.players.list)) {
                        playerList = data.players.list;
                    } else if (data.players.sample && Array.isArray(data.players.sample)) {
                        playerList = data.players.sample;
                    }
                }
                renderPlayerList(playerList);
                return;
            } else {
                throw new Error('服务器离线');
            }
        } catch (err) {
            console.warn('mcsrvstat.us 失败，尝试备用 API', err);
            try {
                const backupRes = await fetchWithTimeout(`https://api.mcstatus.io/v2/status/java/${MAIN_IP}`);
                if (!backupRes.ok) throw new Error();
                const backupData = await backupRes.json();
                if (backupData.online) {
                    mainOnline.innerText = `${backupData.players.online} / ${backupData.players.max}`;
                    mainOnline.style.color = "#2ecc71";
                    mainMotd.innerText = backupData.motd?.clean || "欢迎来到RZ主服";
                    if (backupData.icon) mainIcon.src = backupData.icon;
                    mainDesc.innerText = "主服运行中（备用数据）";
                    
                    let playerList = [];
                    if (backupData.players) {
                        if (backupData.players.sample && Array.isArray(backupData.players.sample)) {
                            playerList = backupData.players.sample;
                        } else if (backupData.players.list && Array.isArray(backupData.players.list)) {
                            playerList = backupData.players.list;
                        }
                    }
                    renderPlayerList(playerList);
                    return;
                } else {
                    throw new Error('备用API也返回离线');
                }
            } catch (backupErr) {
                console.error('所有API均失败', backupErr);
                mainOnline.innerText = "获取失败";
                mainOnline.style.color = "#f39c12";
                mainMotd.innerText = "无法获取服务器状态";
                mainDesc.innerText = "请检查网络后刷新";
                renderPlayerList([]);
            }
        }
    }

    async function loadSub() {
        try {
            const response = await fetchWithTimeout(`https://api.mcsrvstat.us/2/${SUB_IP}`);
            const data = await response.json();
            if (data.online) {
                const onlineCount = data.players?.online || 0;
                const maxCount = data.players?.max || 0;
                subOnline.innerText = `${onlineCount} / ${maxCount}`;
                subOnline.style.color = "#2ecc71";
                
                let motdText = "子服运行中";
                if (data.motd && data.motd.clean && data.motd.clean.length > 0) {
                    motdText = data.motd.clean.join(' ');
                    motdText = decodeHtmlEntities(motdText);
                }
                subMotd.innerText = motdText;
                if (data.icon) subIcon.src = data.icon;
            } else {
                throw new Error('离线');
            }
        } catch (err) {
            console.warn('子服状态获取失败，尝试备用API');
            try {
                const backupRes = await fetchWithTimeout(`https://api.mcstatus.io/v2/status/java/${SUB_IP}`);
                const backupData = await backupRes.json();
                if (backupData.online) {
                    subOnline.innerText = `${backupData.players.online} / ${backupData.players.max}`;
                    subOnline.style.color = "#2ecc71";
                    subMotd.innerText = backupData.motd?.clean || "子服运行中";
                    if (backupData.icon) subIcon.src = backupData.icon;
                } else {
                    throw new Error();
                }
            } catch {
                subOnline.innerText = "离线";
                subOnline.style.color = "#e74c3c";
                subMotd.innerText = "子服未开启";
                subIcon.src = "https://api.mcsrvstat.us/icon/rzmc.owo.vin";
            }
        }
    }

    function init() {
        bgMusic.volume = 0.5;
        bgMusic.play().catch(() => {
            document.body.addEventListener('click', () => bgMusic.play(), { once: true });
        });
        
        searchBtn.addEventListener('click', () => performSearch());
        searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') performSearch(); });
        playPauseBtn.addEventListener('click', togglePlayPause);
        prevBtn.addEventListener('click', playPrev);
        nextBtn.addEventListener('click', playNext);
        audioPlayer.addEventListener('loadedmetadata', updateDuration);
        audioPlayer.addEventListener('timeupdate', () => { if (!isDragging) updateProgress(); });
        audioPlayer.addEventListener('ended', playNext);
        audioPlayer.addEventListener('error', handleAudioError);
        volumeSlider.addEventListener('input', function() { audioPlayer.volume = this.value / 100; });
        audioPlayer.volume = volumeSlider.value / 100;
        
        qualityButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                qualityButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentQuality = btn.dataset.quality;
                if (currentIndex !== -1) playSong(currentSongs[currentIndex], currentIndex);
            });
        });
        
        progressBar.addEventListener('mousedown', startDrag);
        progressBar.addEventListener('touchstart', startDrag, { passive: false });
        
        musicFloatBall.addEventListener('click', () => {
            isPlayerExpanded = !isPlayerExpanded;
            if (isPlayerExpanded) {
                playerContainer.classList.add('expanded');
                musicFloatBall.classList.add('expanded');
                musicFloatBall.querySelector('.music-icon').textContent = '▼';
            } else {
                playerContainer.classList.remove('expanded');
                musicFloatBall.classList.remove('expanded');
                musicFloatBall.querySelector('.music-icon').textContent = '♪';
            }
        });
        
        document.addEventListener('click', (e) => {
            if (isPlayerExpanded && !playerContainer.contains(e.target) && !musicFloatBall.contains(e.target)) {
                isPlayerExpanded = false;
                playerContainer.classList.remove('expanded');
                musicFloatBall.classList.remove('expanded');
                musicFloatBall.querySelector('.music-icon').textContent = '♪';
            }
        });
        
        if (refreshPlayersBtn) {
            refreshPlayersBtn.addEventListener('click', () => {
                loadMain();
                showToast('正在刷新玩家列表...');
            });
        }
        
        loadHotSongs();
        loadMain();
        loadSub();
        setInterval(() => {
            loadMain();
            loadSub();
        }, 30000);
    }

    init();
})();
