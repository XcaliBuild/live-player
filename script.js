// On attend que la page soit prête
window.onload = function() {
    const grid = document.getElementById('match-grid');
    const playerContainer = document.getElementById('player-container');
    const video = document.getElementById('video');
    let hls = new Hls();

    console.log("Démarrage du script...");

    // 1. Charger la liste depuis liste.json
    // On ajoute un paramètre ?v= devant pour éviter le cache GitHub
    fetch('liste.json?v=' + Date.now())
        .then(res => {
            if (!res.ok) throw new Error("Fichier liste.json introuvable (Erreur " + res.status + ")");
            return res.json();
        })
        .then(data => {
            console.log("Liste chargée :", data);
            
            if (!data.matchs || data.matchs.length === 0) {
                grid.innerHTML = "<p>Aucun match trouvé dans le fichier JSON.</p>";
                return;
            }

            // Vider le message de chargement
            grid.innerHTML = "";

            data.matchs.forEach((match, index) => {
                const card = document.createElement('div');
                card.className = 'card';
                card.tabIndex = 0; 
                card.innerHTML = `
                    <img src="${match.logo || 'https://via.placeholder.com/100?text=TV'}" onerror="this.src='https://via.placeholder.com/100?text=TV'">
                    <p>${match.nom}</p>
                `;
                
                const launch = () => handleSelection(match);
                card.onclick = launch;
                card.onkeydown = (e) => { if(e.key === 'Enter' || e.keyCode === 13) launch(); };
                
                grid.appendChild(card);
                if(index === 0) card.focus();
            });
        })
        .catch(err => {
            console.error("Erreur fatale :", err);
            grid.innerHTML = `<div style="color:white; background:red; padding:20px; border-radius:10px;">
                <h3>Erreur de configuration</h3>
                <p>${err.message}</p>
                <small>Vérifiez que liste.json existe et est bien écrit.</small>
            </div>`;
        });

    // 2. Fonctions de lecture
    async function handleSelection(match) {
        if (match.url && (match.url.includes('.m3u8') || match.url.includes('.ts'))) {
            startPlayer(match.url, match.referer);
        } else if (match.webpage) {
            await snifferUniversel(match);
        }
    }

    async function snifferUniversel(match) {
        playerContainer.style.display = 'block';
        playerContainer.innerHTML = `<div style="padding:20px;">Recherche du flux en cours...</div>`;

        try {
            const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(match.webpage)}`;
            const res = await fetch(proxy);
            const data = await res.json();
            const html = data.contents;

            const videoRegex = /["'](https?:\/\/[^"']+\.(m3u8|ts|mpd|mp4|mkv)[^"']*)["']/i;
            const serverRegex = /["'](https?:\/\/(?:stream|video|edge|play)[^"']+(?:\/embed|\/video|\/play)[^"']*)["']/i;

            const found = html.match(videoRegex) || html.match(serverRegex);

            if (found && found[1]) {
                startPlayer(found[1].replace(/\\/g, ''), match.webpage);
            } else {
                forceIframe(match.webpage);
            }
        } catch (e) {
            forceIframe(match.webpage);
        }
    }

    function startPlayer(source, ref) {
        playerContainer.style.display = 'block';
        playerContainer.innerHTML = `<button class="back-btn" id="closeBtn">↩ RETOUR</button><video id="video" controls autoplay playsinline style="width:100%; height:100%;"></video>`;
        
        const v = document.getElementById('video');
        document.getElementById('closeBtn').onclick = closePlayer;
        
        if (Hls.isSupported() && (source.includes('.m3u8') || source.includes('.ts'))) {
            hls.destroy();
            hls = new Hls({ xhrSetup: (xhr) => { if(ref) xhr.setRequestHeader('Referer', ref); } });
            hls.loadSource(source);
            hls.attachMedia(v);
        } else {
            v.src = source;
            v.play();
        }
    }

    function forceIframe(url) {
        playerContainer.innerHTML = `
            <button class="back-btn" onclick="location.reload()">↩ RETOUR</button>
            <iframe src="${url}" style="width:100%; height:100%; border:none; background:#000;" allowfullscreen allow="autoplay"></iframe>`;
    }

    function closePlayer() {
        playerContainer.style.display = 'none';
        playerContainer.innerHTML = '';
        if(hls) hls.destroy();
    }
};
