const { spawn } = require('child_process');

const VOLUME_KEYS = {
    up: 175,
    down: 174,
    mute: 173,
    toggle: 173,
    unmute: 173,
};

const KEY_TOKENS = {
    left: '{LEFT}',
    right: '{RIGHT}',
    up: '{UP}',
    down: '{DOWN}',
    tab: '{TAB}',
    space: ' ',
    enter: '{ENTER}',
    esc: '{ESC}',
    backspace: '{BACKSPACE}',
    delete: '{DELETE}',
};

/**
 * Apaga Windows usando argumentos fijos, sin pasar por un shell.
 * @returns {Promise<{ok: boolean, msg: string}>}
 */
function shutdownPc() {
    return new Promise((resolve, reject) => {
        const child = spawn('shutdown', ['/s', '/t', '0'], {
            windowsHide: true,
            stdio: 'ignore',
        });

        child.on('error', reject);
        child.on('exit', (code) => {
            if (code === 0) {
                resolve({ ok: true, msg: 'Apagando la PC...' });
                return;
            }

            reject(new Error(`shutdown terminó con código ${code}`));
        });
    });
}

/**
 * Crea el ejecutor de acciones ya validadas.
 *
 * Importante: este modulo asume que validation.normalizeAction ya limito
 * type/op/step/dx/dy/value. No debe recibir payloads crudos del cliente.
 *
 * @param {object} deps Dependencias de control.
 * @param {ReturnType<import('./powershell/controlController').createControlController>} deps.control Controlador de teclado/volumen/texto.
 * @param {ReturnType<import('./powershell/mouseController').createMouseController>} deps.mouse Controlador de mouse.
 * @returns {(action: object) => Promise<object>}
 */
function createActionHandler({ control, mouse }) {
    return async function handleAction(action) {
        if (action.type === 'shutdown') {
            return shutdownPc();
        }

        if (action.type === 'volume') {
            control.pressMediaKey(VOLUME_KEYS[action.op], action.step);
            return {
                ok: true,
                msg: `Volumen ${action.op}${action.op === 'up' || action.op === 'down' ? ` x${action.step}` : ''}`,
            };
        }

        if (action.type === 'key') {
            control.pressKeys(KEY_TOKENS[action.op], action.step);
            return { ok: true, msg: `Key ${action.op} x${action.step}` };
        }

        if (action.type === 'text') {
            control.sendText(action.value);
            return { ok: true, msg: 'Texto enviado' };
        }

        if (action.type === 'mouse') {
            if (action.op === 'move') {
                mouse.move(action.dx, action.dy);
                return { ok: true, silent: true };
            }

            if (action.op === 'leftclick') {
                mouse.leftClick();
                return { ok: true, msg: 'Click izquierdo' };
            }
        }

        return { ok: false, error: 'Acción no soportada' };
    };
}

module.exports = {
    createActionHandler,
};
