const WebSocket = require('ws');
const { verifyWsClient } = require('./security');
const { normalizeAction } = require('./validation');

/**
 * Envia un payload JSON al cliente WebSocket.
 * @param {WebSocket} ws Cliente WebSocket.
 * @param {object} payload Payload serializable.
 */
function send(ws, payload) {
    try {
        ws.send(JSON.stringify(payload));
    } catch {
        //
    }
}

/**
 * Redacta datos sensibles antes de escribir en logs del servidor.
 * @param {object} action Accion normalizada.
 * @returns {object}
 */
function actionForLog(action) {
    if (action?.type === 'text') {
        return { type: 'text', length: action.value.length };
    }

    return action;
}

/**
 * Monta el servidor WebSocket de control remoto.
 *
 * Flujo por mensaje:
 * 1. Parsear JSON.
 * 2. Normalizar/validar contrato.
 * 3. Ejecutar solo acciones permitidas.
 *
 * @param {import('http').Server} server Servidor HTTP compartido con Express.
 * @param {object} deps Dependencias.
 * @param {typeof import('./logger')} deps.logger Logger condicional.
 * @param {(action: object) => Promise<object>} deps.handleAction Ejecutor de acciones normalizadas.
 * @returns {WebSocket.Server}
 */
function createWebSocketServer(server, { logger, handleAction }) {
    const wss = new WebSocket.Server({
        server,
        path: '/ws',
        maxPayload: 4096,
        verifyClient: verifyWsClient,
    });
    let connectionCount = 0;

    wss.on('connection', (ws, req) => {
        const connectionId = ++connectionCount;
        let mouseMoveLogCount = 0;

        logger.log(`[WS ${connectionId}] cliente conectado`, {
            ip: req.socket?.remoteAddress,
            origin: req.headers.origin,
        });

        send(ws, { ok: true, msg: 'WS conectado' });
        logger.log(`[WS ${connectionId} -> cliente]`, { ok: true, msg: 'WS conectado' });

        ws.on('close', (code, reason) => {
            logger.log(`[WS ${connectionId}] cliente desconectado`, {
                code,
                reason: reason?.toString(),
            });
        });

        ws.on('message', async (data) => {
            let msg;
            try {
                msg = JSON.parse(data.toString());
            } catch {
                logger.warn(`[WS ${connectionId} <- cliente] JSON inválido`);
                return send(ws, { ok: false, error: 'JSON inválido' });
            }

            const validation = normalizeAction(msg);
            if (!validation.ok) {
                logger.warn(`[WS ${connectionId} <- cliente] acción rechazada`, validation.error);
                return send(ws, { ok: false, error: validation.error });
            }

            const { action } = validation;
            const isMouseMove = action.type === 'mouse' && action.op === 'move';
            const shouldLogMessage = !isMouseMove || mouseMoveLogCount++ % 15 === 0;

            if (shouldLogMessage) {
                logger.log(`[WS ${connectionId} <- cliente]`, actionForLog(action));
            }

            try {
                const result = await handleAction(action);
                if (shouldLogMessage || !result?.silent) {
                    logger.log(`[WS ${connectionId} -> cliente]`, result);
                }
                send(ws, result);
            } catch (e) {
                logger.warn(`[WS ${connectionId}] error ejecutando acción`, {
                    message: e.message,
                    stack: e.stack,
                });
                send(ws, { ok: false, error: e.message || 'Error ejecutando acción' });
            }
        });
    });

    return wss;
}

module.exports = {
    createWebSocketServer,
};
