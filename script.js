async function snifferWiseplay(match) {
    console.log("Analyse profonde de la page : " + match.webpage);
    playerContainer.style.display = 'block';

    try {
        const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(match.webpage)}`;
        const res = await fetch(proxy);
        const data = await res.json();
        const html = data.contents;

        // --- LISTE DES FORMATS SUPPORTÉS ---
        // Cherche : .m3u8, .ts, .mpd (Dash), .mp4, .mkv
        const videoRegex = /["'](https?:\/\/[^"']+\.(m3u8|ts|mpd|mp4|mkv)[^"']*)["']/i;
        
        // Cherche aussi les liens de serveurs de streaming connus (qui ne finissent pas par une extension)
        const streamServerRegex = /["'](https?:\/\/(?:stream|video|edge)[^"']+(?:\/play|\/embed)[^"']*)["']/i;

        const found = html.match(videoRegex) || html.match(streamServerRegex);

        if (found && found[1]) {
            let cleanUrl = found[1].replace(/\\/g, ''); // Nettoyage des caractères d'échappement
            
            // Correction spécifique pour les segments .ts isolés
            // Si on trouve un .ts, on essaie de voir s'il y a un index.m3u8 dans le même dossier
            if (cleanUrl.endsWith('.ts')) {
                console.log("Segment .ts détecté, tentative de lecture directe...");
            }

            console.log("Flux détecté avec succès : " + cleanUrl);
            startPlayer(cleanUrl, match.webpage);
        } else {
            console.warn("Détection automatique échouée. Passage en mode Iframe forcée.");
            forceIframe(match.webpage);
        }
    } catch (e) {
        console.error("Erreur de sniffer :", e);
        forceIframe(match.webpage);
    }
}
