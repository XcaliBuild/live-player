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
            card.tabIndex = 0; // Permet le focus sur Android TV
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

// 2. Gérer le choix (Lien direct ou Détection automatique)
async function handleSelection(match) {
    if (match.url && match.url.includes('.m3u8')) {
        startPlayer(match.url, match.referer);
    } else if (match.webpage) {
        await snifferWiseplay(match);
    }
}

// 3. Moteur de détection (Le Sniffer)
async function snifferWiseplay(match) {
    console.log("Analyse de la page : " + match.webpage);
    playerContainer.style.display = 'block'; // On affiche pour montrer qu'on charge

    try {
        // On utilise un proxy pour lire le code source du site protégé
        const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(match.webpage)}`;
        const res = await fetch(proxy);
        const data = await res.json();
        const html = data.contents;

        // Regex pour trouver le lien m3u8 (avec token cst)
        const regex = /["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/;
        const found = html.match(regex);

        if (found && found[1]) {
            let cleanUrl = found[1].replace(/\\/g, '');
            startPlayer(cleanUrl, match.webpage);
        } else {
            alert("Erreur : Impossible de détecter le flux vidéo sur cette page.");
            closePlayer();
        }
    } catch (e) {
        alert("Erreur réseau lors de la détection.");
        closePlayer();
    }
}

// 4. Lancer le lecteur HLS
function startPlayer(source, ref) {
    playerContainer.style.display = 'block';
    
    if (Hls.isSupported()) {
        hls.destroy();
        hls = new Hls({
            xhrSetup: (xhr) => {
                if(ref) xhr.setRequestHeader('Referer', ref);
            }
        });
        hls.loadSource(source);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
    } else {
        video.src = source;
        video.play();
    }
}

function closePlayer() {
    playerContainer.style.display = 'none';
    video.pause();
    video.src = "";
}
