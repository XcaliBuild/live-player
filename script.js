window.onload = function() {
    const grid = document.getElementById('match-grid');
    const status = document.getElementById('status');
    const playerContainer = document.getElementById('player-container');
    let hls = new Hls();

    // Chargement de la liste
    fetch('liste.json?v=' + Date.now())
        .then(res => res.json())
        .then(data => {
            grid.innerHTML = "";
            data.matchs.forEach((match, index) => {
                const card = document.createElement('div');
                card.className = 'card'; card.tabIndex = 0;
                card.innerHTML = `<img src="${match.logo}"><p>${match.nom}</p>`;
                
                const action = () => resolverUniversel(match);
                card.onclick = action;
                card.onkeydown = (e) => { if(e.keyCode === 13) action(); };
                
                grid.appendChild(card);
                if(index === 0) card.focus();
            });
        }).catch(err => { status.innerText = "Erreur JSON : " + err.message; });

    // --- LE RÉSOLVEUR "SERVO" ---
    async function resolverUniversel(match) {
        playerContainer.style.display = 'block';
        playerContainer.innerHTML = "<div style='color:white;padding:20px;'>Analyse du lien (Mode Sniffer)...</div>";
        
        const targetUrl = match.webpage || match.url;

        try {
            // Utilisation d'un proxy pour lire le code source sans blocage CORS
            const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
            const res = await fetch(proxy);
            const data = await res.json();
            const html = data.contents;

            // REGEX PUISSANTE : Cherche m3u8, ts, mpd, mp4 et les liens de serveurs edge/stream
            const masterRegex = /["'](https?:\/\/[^"']+\.(m3u8|ts|mpd|mp4)[^"']*)["']|file:\s*["']([^"']+)["']/i;
            const found = html.match(masterRegex);

            if (found) {
                const streamUrl = (found[1] || found[3]).replace(/\\/g, '');
                console.log("Flux extrait : " + streamUrl);
                startPlayer(streamUrl, targetUrl);
            } else {
                // Si le sniffer échoue, on tente l'affichage direct de la page
                forceIframe(targetUrl);
            }
        } catch (e) {
            forceIframe(targetUrl);
        }
    }

    function startPlayer(source, ref) {
        playerContainer.innerHTML = `<button class="back-btn" onclick="location.reload()">↩ RETOUR</button><video id="video" controls autoplay playsinline style="width:100%;height:100%;"></video>`;
        const v = document.getElementById('video');
        
        if (Hls.isSupported() && (source.includes('.m3u8') || source.includes('.ts'))) {
            hls.destroy();
            hls = new Hls({
                xhrSetup: (xhr) => {
                    // Simulation du referer pour passer les barrières de tvivu
                    if(ref) xhr.setRequestHeader('Referer', ref);
                    xhr.setRequestHeader('User-Agent', 'Mozilla/5.0 (Linux; Android 10; TV) AppleWebKit/537.36');
                }
            });
            hls.loadSource(source);
            hls.attachMedia(v);
        } else {
            v.src = source;
            v.play();
        }
    }

    function forceIframe(url) {
        // Pour AppCreator24, l'iframe est souvent la meilleure chance si le sniffer bloque
        playerContainer.innerHTML = `
            <button class="back-btn" onclick="location.reload()">↩ RETOUR</button>
            <iframe src="${url}" style="width:100%;height:100%;border:none;background:#000;" allowfullscreen allow="autoplay; encrypted-media"></iframe>`;
    }
};
