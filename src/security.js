const ALLOWED_ORIGIN_HOSTS = new Set([
    'localhost',
    '127.0.0.1',
]);

/**
 * Valida que el Origin del WebSocket coincida con el host del request.
 * Esto no autentica usuarios; solo bloquea conexiones cross-site obvias.
 * @param {string | undefined} origin Header Origin recibido por ws.
 * @param {string | undefined} hostHeader Header Host del request.
 * @returns {boolean}
 */
function isAllowedOrigin(origin, hostHeader) {
    if (!origin) return true;

    try {
        const originUrl = new URL(origin);
        const requestHost = String(hostHeader || '').split(':')[0];

        return originUrl.hostname === requestHost || ALLOWED_ORIGIN_HOSTS.has(originUrl.hostname);
    } catch {
        return false;
    }
}

/**
 * Hook usado por ws antes de aceptar una conexion entrante.
 * @param {object} info Metadata de la conexion WebSocket.
 * @param {(result: boolean, code?: number, name?: string) => void} done Callback de ws.
 */
function verifyWsClient(info, done) {
    const isAllowed = isAllowedOrigin(info.origin, info.req.headers.host);
    done(isAllowed, isAllowed ? 200 : 403, isAllowed ? 'OK' : 'Origen no permitido');
}

module.exports = {
    verifyWsClient,
};
