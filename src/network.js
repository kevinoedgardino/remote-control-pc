const os = require('os');

/**
 * Obtiene una IP IPv4 local no interna para mostrar la URL que debe abrir el celular.
 * @returns {string} IP local detectada o localhost como fallback.
 */
function getLocalIp() {
    const nets = os.networkInterfaces();
    let ipLocal;

    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                ipLocal = net.address;
            }
        }
    }

    return ipLocal || 'localhost';
}

module.exports = {
    getLocalIp,
};
