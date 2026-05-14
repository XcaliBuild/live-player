// Exemple de fonction pour ton bouton "Play"
function getStream(originalUrl) {
    const serverIp = "89.168.45.234";
    const proxyUrl = `http://${serverIp}:8000/sniff?url=${originalUrl}`;

    fetch(proxyUrl)
        .then(response => response.json())
        .then(data => {
            if(data.url) {
                // Ici tu lances le lien data.url dans ton lecteur vidéo
                console.log("Lien débloqué : ", data.url);
                location.href = "intent://"+data.url+"#Intent;scheme=http;type=video/*;package=com.mxtech.videoplayer.ad;end";
            }
        });
}
