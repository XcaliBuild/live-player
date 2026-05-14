const grid = document.getElementById('match-grid');
const playerContainer = document.getElementById('player-container');
const video = document.getElementById('video');
let hls = new Hls();

// 1. Charger la liste depuis liste.json
fetch('liste.json')
    .then(res => res.json())
    .then(data => {
        data.matchs.forEach((match, index) => {
            const card = document.createElement('div');
            card.className = 'card';
            card.tabIndex = 0; 
            card.innerHTML = `
                <img src="${match.logo}" onerror="this.src='https://via.placeholder.com/100?text=TV'">
                <p>${match.nom}</p>
            `;
            
            const launch = () => handleSelection(match);
            card.onclick = launch;
            card.onkeydown = (e) => { if(e.keyCode === 13) launch(); };
            
            grid.appendChild(card);
            if(index === 0) card.focus();
        });
    });

// 2. Gestion de la sélection
async function handleSelection(match) {
    if (match.url && (match.url.includes('.m3u8') || match.url.includes('.ts'))) {
        startPlayer(match.url, match.referer);
    } else if (match.webpage) {
        await snifferUniversel(match);
    }
}

// 3. Le Sniffer "Wiseplay Style" (Cherche m3u8, ts, mpd, mp4, mkv)
async function snifferUniversel(match) {
    console.log("Analyse profonde : " + match.webpage);
    playerContainer.style.display = 'block';

    try {
        const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(match.webpage)}`;
        const res = await fetch(proxy);
        const data = await res.json();
        const html = data.contents;

        // Regex étendue : cherche tous les formats de stream possibles
        const videoRegex = /["'](https?:\/\/[^"']+\.(m3u8|ts|mpd|mp4|mkv)[^"']*)["']/i;
        
        // Regex de secours : cherche des serveurs de stream sans extension
        const serverRegex = /["'](https?:\/\/(?:stream|video|edge|play)[^"']+(?:\/embed|\/video|\/play)[^"']*)["']/i;

        const found = html.match(videoRegex) || html.match(serverRegex);

        if (found && found[1]) {
            let cleanUrl = found[1].replace(/\\/g, ''); 
            console.log("Flux détecté : " + cleanUrl);
            startPlayer(cleanUrl, match.webpage);
        } else {
            console.warn("Détection auto échouée. Passage en mode Iframe.");
            forceIframe(match.webpage);
        }
    } catch (e) {
        console.error("Erreur Sniffer :", e);
        forceIframe(match.webpage);
    }
}

// 4. Lancer le lecteur (HLS pour m3u8/ts)
function startPlayer(source, ref) {
    playerContainer.style.display = 'block';
    playerContainer.innerHTML = `<button class="back-btn" onclick="closePlayer()">↩ RETOUR</button><video id="video" controls playsinline style="width:100%; height:100%;"></video>`;
    
    const v = document.getElementById('video');
    
    if (Hls.isSupported() && (source.includes('.m3u8') || source.includes('.ts'))) {
        hls.destroy();
        hls = new Hls({
            xhrSetup: (xhr) => { if(ref) xhr.setRequestHeader('Referer', ref); }
        });
        hls.loadSource(source);
        hls.attachMedia(v);
        hls.on(Hls.Events.MANIFEST_PARSED, () => v.play());
    } else {
        // Lecture directe pour MP4 ou si HLS n'est pas nécessaire
        v.src = source;
        v.play();
    }
}

// 5. Mode Secours : Iframe (pour les sites avec Blob ou protections fortes)
function forceIframe(url) {
    playerContainer.style.display = 'block';
    playerContainer.innerHTML = `
        <button class="back-btn" onclick="closePlayer()">↩ RETOUR</button>
        <iframe src="${url}" 
                style="width:100%; height:100%; border:none; background:#000;" 
                allowfullscreen 
                allow="autoplay; encrypted-media">
        </iframe>`;
}

function closePlayer() {
    playerContainer.style.display = 'none';
    playerContainer.innerHTML = ''; // Nettoie tout (arrête les iframes ou la vidéo)
    if(hls) hls.destroy();
}
