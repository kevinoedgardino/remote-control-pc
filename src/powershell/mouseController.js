const path = require('path');
const { spawn } = require('child_process');

/**
 * Crea un controlador persistente para movimiento y click del mouse.
 *
 * El proceso PowerShell usa WinAPI desde un script fijo y recibe comandos
 * simples por stdin. Los deltas ya llegan acotados por validation.js.
 *
 * @param {typeof import('../logger')} logger Logger condicional.
 * @returns {{move: Function, leftClick: Function, stop: Function}}
 */
function createMouseController(logger) {
    let mouseProcess;
    let mouseCommandLogCount = 0;

    /**
     * Inicia el proceso persistente si todavia no existe.
     * @returns {import('child_process').ChildProcess}
     */
    function start() {
        if (mouseProcess && !mouseProcess.killed) return mouseProcess;

        logger.log('[mouse] iniciando proceso PowerShell');

        mouseProcess = spawn('powershell', [
            '-NoProfile',
            '-ExecutionPolicy',
            'Bypass',
            '-File',
            path.join(__dirname, 'scripts', 'mouse.ps1'),
        ], {
            windowsHide: true,
            stdio: ['pipe', 'pipe', 'pipe'],
        });

        mouseProcess.stdout.on('data', (data) => {
            logger.log('[mouse stdout]', data.toString().trim());
        });

        mouseProcess.stderr.on('data', (data) => {
            logger.warn('[mouse stderr]', data.toString().trim());
        });

        mouseProcess.on('exit', () => {
            logger.log('[mouse] proceso PowerShell finalizado');
            mouseProcess = undefined;
        });

        mouseProcess.on('error', (error) => {
            logger.warn('[mouse] error iniciando PowerShell:', error.message);
            mouseProcess = undefined;
        });

        return mouseProcess;
    }

    /**
     * Mueve el cursor relativo a su posicion actual.
     * @param {number} dx Delta horizontal.
     * @param {number} dy Delta vertical.
     */
    function move(dx, dy) {
        const x = Math.max(-120, Math.min(120, Math.round(Number(dx) || 0)));
        const y = Math.max(-120, Math.min(120, Math.round(Number(dy) || 0)));
        if (x === 0 && y === 0) return;

        const ps = start();
        if (mouseCommandLogCount++ % 15 === 0) {
            logger.log('[mouse] enviando movimiento a PowerShell', { dx: x, dy: y });
        }
        ps.stdin.write(`move,${x},${y}\n`);
    }

    /**
     * Ejecuta click izquierdo en la posicion actual del cursor.
     */
    function leftClick() {
        const ps = start();
        logger.log('[mouse] enviando click izquierdo a PowerShell');
        ps.stdin.write('leftclick\n');
    }

    /**
     * Detiene el proceso persistente.
     */
    function stop() {
        if (mouseProcess && !mouseProcess.killed) {
            mouseProcess.kill();
        }
    }

    return {
        move,
        leftClick,
        stop,
    };
}

module.exports = {
    createMouseController,
};
