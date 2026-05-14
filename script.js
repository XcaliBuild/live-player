window.onload = function() {
    const grid = document.getElementById('match-grid');
    const status = document.getElementById('status');
    const playerContainer = document.getElementById('player-container');
    let hls = new Hls();

    fetch('liste.json?v=' + Date.now())
        .then(res => res.json())
        .then(data => {
            grid.innerHTML = "";
            data.matchs.forEach((match, index) => {
                const card = document.createElement('div');
                card.className = 'card'; card.tabIndex = 0;
                card.innerHTML = `<img src="${match.logo}"><p>${match.nom}</p>`;
                card.onclick = () => handleSelection(match);
                card.onkeydown = (e) => { if(e.keyCode === 13) handleSelection(match); };
                grid.appendChild(card);
                if(index === 0) card.focus();
            });
        }).catch(err => { status.innerText = "Erreur : " + err.message; });

    async function handleSelection(match) {
        if (match.url && (match.url.includes('.m3u8') || match.url.includes('.ts'))) {
            startPlayer(match.url, match.referer);
        } else { await snifferUniversel(match); }
    }

    async function snifferUniversel(match) {
        playerContainer.style.display = 'block';
        playerContainer.innerHTML = "<div style='color:white;padding:20px;'>Extraction du flux sécurisé...</div>";
        
        try {
            // Utilisation du proxy AllOrigins pour contourner le blocage de tvivu
            const targetUrl = match.webpage || match.url;
            const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
            const res = await fetch(proxy);
            const data = await res.json();
            
            // On cherche le lien vidéo et les éventuels tokens de session
            const found = data.contents.match(/["'](https?:\/\/[^"']+\.(m3u8|ts|mp4|mpd)[^"']*)["']/i);
            
            if (found) {
                const streamUrl = found[1].replace(/\\/g, '');
                // On force le Referer du site d'origine dans le lecteur
                startPlayer(streamUrl, targetUrl);
            } else {
                forceIframe(targetUrl);
            }
        } catch (e) { forceIframe(match.webpage); }
    }

    function startPlayer(source, ref) {
        playerContainer.innerHTML = `<button class="back-btn" onclick="location.reload()">↩ RETOUR</button><video id="video" controls autoplay playsinline style="width:100%;height:100%;"></video>`;
        const v = document.getElementById('video');
        
        if (Hls.isSupported()) {
            hls.destroy();
            hls = new Hls({
                xhrSetup: (xhr) => {
                    // On tente de simuler le Referer pour tvivu
                    if(ref) xhr.setRequestHeader('Referer', ref);
                    xhr.setRequestHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
                }
            });
            hls.loadSource(source);
            hls.attachMedia(v);
        } else { v.src = source; v.play(); }
    }

    function forceIframe(url) {
        // Plan B si le flux direct est trop protégé par X-Frame-Options
        playerContainer.innerHTML = `<button class="back-btn" onclick="location.reload()">↩ RETOUR</button><iframe src="${url}" style="width:100%;height:100%;border:none;background:#000;" allowfullscreen allow="autoplay"></iframe>`;
    }
};
