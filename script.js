let player;
let isPlaying = false;
let updateTimer;

const PLAYLIST_ID = 'PLHK9W6IpLdBo';

const tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
const firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
        playerVars: { 
            'playsinline': 1, 'controls': 0, 'listType': 'playlist', 'list': PLAYLIST_ID, 'loop': 1
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

function onPlayerReady(event) {
    player.setShuffle(true); 
    setTimeout(() => {
        player.playVideoAt(0);
        player.pauseVideo(); 
    }, 1500);
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
        ensurePlayingState();
        let videoData = player.getVideoData();
        if (videoData && videoData.title) {
            document.getElementById('track-name').innerText = videoData.title;
            document.getElementById('track-artist').innerText = "Office Playlist Queue";
        }
        
        let duration = player.getDuration();
        document.getElementById('seek-bar').max = duration;
        document.getElementById('total-time').innerText = formatTime(duration);
        
        clearInterval(updateTimer);
        updateTimer = setInterval(updateProgressBar, 1000);
        
        if (!document.getElementById('queue-modal').classList.contains('hidden')) {
            renderQueue();
        }
    } else {
        clearInterval(updateTimer);
    }
}

function togglePlay() {
    const playIcon = document.getElementById('play-icon');
    if (isPlaying) {
        player.pauseVideo();
        playIcon.classList.replace('fa-pause', 'fa-play');
    } else {
        player.playVideo(); 
        playIcon.classList.replace('fa-play', 'fa-pause');
    }
    isPlaying = !isPlaying;
}

function nextVideo() { player.nextVideo(); }
function prevVideo() { player.previousVideo(); }

function ensurePlayingState() {
    if (!isPlaying) {
        isPlaying = true;
        document.getElementById('play-icon').classList.replace('fa-play', 'fa-pause');
    }
}

function updateProgressBar() {
    if (player && isPlaying) {
        let currentTime = player.getCurrentTime();
        document.getElementById('seek-bar').value = currentTime;
        document.getElementById('current-time').innerText = formatTime(currentTime);
    }
}

function formatTime(timeInSeconds) {
    let minutes = Math.floor(timeInSeconds / 60);
    let seconds = Math.floor(timeInSeconds % 60);
    return minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
}

document.getElementById('seek-bar').addEventListener('input', function() {
    let seekTo = this.value;
    player.seekTo(seekTo, true);
    document.getElementById('current-time').innerText = formatTime(seekTo);
});

// ==========================================
// Queue Redesign & Search Functionality
// ==========================================
let fetchQueue = [];
let isFetching = false;

function processFetchQueue() {
    if (fetchQueue.length === 0 || isFetching) return;
    
    isFetching = true;
    let id = fetchQueue.shift(); 
    
    fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${id}`)
        .then(response => response.json())
        .then(data => {
            if (data.title) {
                let savedTitles = JSON.parse(localStorage.getItem('officePlaylistTitles') || '{}');
                savedTitles[id] = data.title; 
                localStorage.setItem('officePlaylistTitles', JSON.stringify(savedTitles)); 
                
                let li = document.getElementById('track-' + id);
                if (li) {
                    let titleSpan = li.querySelector('.track-title');
                    if(titleSpan) titleSpan.innerText = data.title;
                }
            }
        })
        .catch(error => console.log("Skipped fetching track"))
        .finally(() => {
            isFetching = false;
            setTimeout(processFetchQueue, 300); 
        });
}

function toggleQueue() {
    const modal = document.getElementById('queue-modal');
    modal.classList.toggle('hidden');
    
    // Clear search bar when opened
    if (!modal.classList.contains('hidden')) {
        document.getElementById('queue-search').value = "";
        renderQueue();
    }
}

function renderQueue() {
    const queueList = document.getElementById('queue-list');
    queueList.innerHTML = '';
    
    if (!player || !player.getPlaylist) return;
    
    const playlist = player.getPlaylist();
    if (!playlist) return;
    
    const currentIndex = player.getPlaylistIndex();
    let savedTitles = JSON.parse(localStorage.getItem('officePlaylistTitles') || '{}');
    
    playlist.forEach((id, index) => {
        let li = document.createElement('li');
        li.id = 'track-' + id; 
        let isCurrent = (index === currentIndex);
        
        if (isCurrent) li.classList.add('active-track');
        
        let displayText = savedTitles[id] ? savedTitles[id] : "Loading...";
        let thumbUrl = `https://i.ytimg.com/vi/${id}/mqdefault.jpg`; // Gets official YouTube thumbnail
        
        li.innerHTML = `
            <span class="track-num">${isCurrent ? '▶' : (index + 1)}</span>
            <img class="track-thumb" src="${thumbUrl}" alt="Thumbnail">
            <div class="track-info">
                <span class="track-title">${displayText}</span>
                <span class="track-sub">YouTube Playlist</span>
            </div>
        `;
        
        li.onclick = () => { 
            player.playVideoAt(index);
            ensurePlayingState();
            toggleQueue(); 
        };
        
        queueList.appendChild(li);

        if (!savedTitles[id] && !fetchQueue.includes(id)) {
            fetchQueue.push(id);
        }
    });

    processFetchQueue();
}

// Search Filter Logic
function filterQueue() {
    let input = document.getElementById('queue-search').value.toLowerCase();
    let items = document.querySelectorAll('#queue-list li');
    
    items.forEach(item => {
        let title = item.querySelector('.track-title').innerText.toLowerCase();
        if (title.includes(input)) {
            item.style.display = "flex";
        } else {
            item.style.display = "none";
        }
    });
}

document.addEventListener('keydown', function(event) {
    if(event.target.tagName.toLowerCase() === 'input') return;

    switch(event.code) {
        case 'Space':
            event.preventDefault();
            togglePlay();
            break;
        case 'KeyN':
            nextVideo();
            break;
        case 'KeyP':
            prevVideo();
            break;
        case 'KeyQ':
            toggleQueue();
            break;
        case 'ArrowRight':
            if(player) player.seekTo(player.getCurrentTime() + 10, true);
            break;
        case 'ArrowLeft':
            if(player) player.seekTo(player.getCurrentTime() - 10, true);
            break;
    }
});
