const VALID_TYPES = new Set(['shutdown', 'volume', 'key', 'text', 'mouse']);
const VOLUME_OPS = new Set(['up', 'down', 'mute', 'toggle', 'unmute']);
const KEY_OPS = new Set([
    'left',
    'right',
    'up',
    'down',
    'tab',
    'space',
    'enter',
    'esc',
    'backspace',
    'delete',
]);
const MOUSE_OPS = new Set(['move', 'leftclick']);

/**
 * @param {unknown} value Valor recibido por WebSocket.
 * @returns {value is Record<string, unknown>}
 */
function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Convierte un valor a entero y lo limita a un rango seguro.
 * @param {unknown} value Valor recibido.
 * @param {number} min Minimo permitido.
 * @param {number} max Maximo permitido.
 * @param {number} fallback Valor usado cuando value no es numero.
 * @returns {number}
 */
function clampInt(value, min, max, fallback) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(min, Math.min(max, parsed));
}

/**
 * Normaliza y valida el contrato publico del WebSocket.
 *
 * Esta funcion es la barrera de seguridad principal: el resto del backend
 * solo recibe acciones con type/op de listas cerradas y valores acotados.
 *
 * @param {unknown} msg Mensaje JSON parseado desde el cliente.
 * @returns {{ok: true, action: object} | {ok: false, error: string}}
 */
function normalizeAction(msg) {
    if (!isPlainObject(msg)) {
        return { ok: false, error: 'Mensaje inválido' };
    }

    const type = typeof msg.type === 'string' ? msg.type : '';
    if (!VALID_TYPES.has(type)) {
        return { ok: false, error: `Tipo de acción inválido: ${type || '(sin type)'}` };
    }

    if (type === 'shutdown') {
        return { ok: true, action: { type } };
    }

    if (type === 'volume') {
        const op = typeof msg.op === 'string' ? msg.op : '';
        if (!VOLUME_OPS.has(op)) {
            return { ok: false, error: 'Operación de volumen inválida' };
        }

        return {
            ok: true,
            action: {
                type,
                op,
                step: clampInt(msg.step, 1, 50, op === 'up' || op === 'down' ? 4 : 1),
            },
        };
    }

    if (type === 'key') {
        const op = typeof msg.op === 'string' ? msg.op : '';
        if (!KEY_OPS.has(op)) {
            return { ok: false, error: 'Tecla inválida' };
        }

        return {
            ok: true,
            action: {
                type,
                op,
                step: clampInt(msg.step, 1, 50, 1),
            },
        };
    }

    if (type === 'text') {
        const value = typeof msg.value === 'string' ? msg.value.slice(0, 1000) : '';
        if (!value) {
            return { ok: false, error: 'Texto vacío' };
        }

        return { ok: true, action: { type, value } };
    }

    if (type === 'mouse') {
        const op = typeof msg.op === 'string' ? msg.op : '';
        if (!MOUSE_OPS.has(op)) {
            return { ok: false, error: `Operación de mouse inválida: ${op || '(sin op)'}` };
        }

        if (op === 'leftclick') {
            return { ok: true, action: { type, op } };
        }

        return {
            ok: true,
            action: {
                type,
                op,
                dx: clampInt(msg.dx, -120, 120, 0),
                dy: clampInt(msg.dy, -120, 120, 0),
            },
        };
    }

    return { ok: false, error: 'Mensaje inválido' };
}

module.exports = {
    normalizeAction,
};
