window.onload = function() {
    const grid = document.getElementById('match-grid');
    const status = document.getElementById('status');
    const playerContainer = document.getElementById('player-container');
    let hls = new Hls();

    // Utilisation d'un paramètre temporel pour forcer la mise à jour du cache GitHub
    fetch('liste.json?v=' + Date.now())
        .then(res => {
            if (!res.ok) throw new Error("Fichier liste.json introuvable (Erreur " + res.status + ")");
            return res.json();
        })
        .then(data => {
            if (!data.matchs || data.matchs.length === 0) {
                status.innerText = "Aucun match trouvé dans la liste.";
                return;
            }
            grid.innerHTML = ""; // Efface le message de chargement
            data.matchs.forEach((match, index) => {
                const card = document.createElement('div');
                card.className = 'card';
                card.tabIndex = 0; 
                card.innerHTML = `<img src="${match.logo}" onerror="this.src='https://via.placeholder.com/100?text=TV'"><p>${match.nom}</p>`;
                
                const launch = () => handleSelection(match);
                card.onclick = launch;
                card.onkeydown = (e) => { if(e.keyCode === 13) launch(); };
                
                grid.appendChild(card);
                if(index === 0) card.focus();
            });
        })
        .catch(err => {
            status.innerText = "Erreur : " + err.message;
            status.style.color = "red";
        });

    async function handleSelection(match) {
        if (match.url && (match.url.includes('.m3u8') || match.url.includes('.ts'))) {
            startPlayer(match.url, match.referer);
        } else if (match.webpage) {
            await sniffer(match);
        }
    }

    async function sniffer(match) {
        playerContainer.style.display = 'block';
        playerContainer.innerHTML = "<div style='color:white;padding:20px;'>Recherche du flux...</div>";
        try {
            const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(match.webpage)}`;
            const res = await fetch(proxy);
            const data = await res.json();
            // Recherche de liens vidéos courants dans le code source de la page
            const found = data.contents.match(/["'](https?:\/\/[^"']+\.(m3u8|ts|mp4|mpd)[^"']*)["']/i);
            if (found) startPlayer(found[1].replace(/\\/g, ''), match.webpage);
            else forceIframe(match.webpage);
        } catch (e) { forceIframe(match.webpage); }
    }

    function startPlayer(source, ref) {
        playerContainer.style.display = 'block';
        playerContainer.innerHTML = `<button class="back-btn" onclick="location.reload()">↩ RETOUR</button><video id="video" controls autoplay playsinline style="width:100%;height:100%;"></video>`;
        const v = document.getElementById('video');
        if (Hls.isSupported() && (source.includes('.m3u8') || source.includes('.ts'))) {
            hls.destroy();
            hls = new Hls({ xhrSetup: (xhr) => { if(ref) xhr.setRequestHeader('Referer', ref); } });
            hls.loadSource(source);
            hls.attachMedia(v);
        } else { v.src = source; v.play(); }
    }

    function forceIframe(url) {
        playerContainer.innerHTML = `<button class="back-btn" onclick="location.reload()">↩ RETOUR</button><iframe src="${url}" style="width:100%;height:100%;border:none;background:#000;" allowfullscreen allow="autoplay"></iframe>`;
    }
};
