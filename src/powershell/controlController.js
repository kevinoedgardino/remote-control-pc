const path = require('path');
const { spawn } = require('child_process');

/**
 * Crea un controlador persistente para teclado, volumen y texto.
 *
 * El proceso PowerShell se mantiene vivo y recibe comandos JSON por stdin;
 * esto evita abrir PowerShell en cada pulsacion y reduce el delay.
 *
 * @param {typeof import('../logger')} logger Logger condicional.
 * @returns {{start: Function, pressMediaKey: Function, pressKeys: Function, sendText: Function, stop: Function}}
 */
function createControlController(logger) {
    let controlProcess;

    /**
     * Inicia el proceso persistente si todavia no existe.
     * @returns {import('child_process').ChildProcess}
     */
    function start() {
        if (controlProcess && !controlProcess.killed) return controlProcess;

        logger.log('[control] iniciando proceso PowerShell');

        controlProcess = spawn('powershell', [
            '-NoProfile',
            '-ExecutionPolicy',
            'Bypass',
            '-File',
            path.join(__dirname, 'scripts', 'control.ps1'),
        ], {
            windowsHide: true,
            stdio: ['pipe', 'pipe', 'pipe'],
        });

        controlProcess.stdout.on('data', (data) => {
            logger.log('[control stdout]', data.toString().trim());
        });

        controlProcess.stderr.on('data', (data) => {
            logger.warn('[control stderr]', data.toString().trim());
        });

        controlProcess.on('exit', () => {
            logger.log('[control] proceso PowerShell finalizado');
            controlProcess = undefined;
        });

        controlProcess.on('error', (error) => {
            logger.warn('[control] error iniciando PowerShell:', error.message);
            controlProcess = undefined;
        });

        return controlProcess;
    }

    /**
     * Envia un comando interno al script PowerShell fijo.
     * @param {{action: string}} command Comando validado por el backend.
     */
    function sendCommand(command) {
        const ps = start();
        logger.log('[control] enviando comando a PowerShell', command);
        ps.stdin.write(`${JSON.stringify(command)}\n`);
    }

    /**
     * Pulsa una tecla multimedia por codigo virtual.
     * @param {number} vkCode Codigo virtual de Windows.
     * @param {number} [times=1] Cantidad de repeticiones.
     */
    function pressMediaKey(vkCode, times = 1) {
        sendCommand({
            action: 'media',
            code: vkCode,
            times,
        });
    }

    /**
     * Pulsa una tecla SendKeys permitida.
     * @param {string} token Token SendKeys, por ejemplo {ENTER}.
     * @param {number} [times=1] Cantidad de repeticiones.
     */
    function pressKeys(token, times = 1) {
        sendCommand({
            action: 'key',
            token,
            times,
        });
    }

    /**
     * Envia texto al foco actual de Windows.
     * @param {string} text Texto ya limitado por validation.normalizeAction.
     */
    function sendText(text) {
        sendCommand({
            action: 'text',
            value: Buffer.from(text, 'utf8').toString('base64'),
        });
    }

    /**
     * Detiene el proceso persistente.
     */
    function stop() {
        if (controlProcess && !controlProcess.killed) {
            controlProcess.kill();
        }
    }

    return {
        start,
        pressMediaKey,
        pressKeys,
        sendText,
        stop,
    };
}

module.exports = {
    createControlController,
};
