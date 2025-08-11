const express = require('express');
const path = require('path');
const http = require('http');
const { exec } = require('child_process');
const WebSocket = require('ws');
const os = require('os');

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

// Envía un JSON al cliente
function send(ws, payload) {
    try { 
        ws.send(JSON.stringify(payload)); 
    } catch { 
        //
    }
}

/**
 * Simula la pulsación de una tecla multimedia (volumen, play, etc) usando PowerShell
 * @param {int} vkCode 
 * @param {int} times 
 * @returns {Promise<void>}
 */
function pressMediaKey(vkCode, times = 1) {
    const t = Math.max(1, Math.min(50, parseInt(times, 10) || 1));
    const ps = [
        `$wshell = New-Object -ComObject wscript.shell`,
        `for ($i=0; $i -lt ${t}; $i++) { $wshell.SendKeys([char]${vkCode}); Start-Sleep -Milliseconds 50 }`
    ].join('; ');
    return new Promise((resolve, reject) => {
        exec(`powershell -Command "${ps}"`, (err) => err ? reject(err) : resolve());
    });
}

/** Simula la pulsación de una o más teclas normales (letras, flechas, etc)
 * @param {string} token 
 * @param {int} times
 * @returns {Promise<void>}
 */
function pressKeys(token, times = 1) {
    const t = Math.max(1, Math.min(50, parseInt(times, 10) || 1));
    const ps = [
        `$wshell = New-Object -ComObject wscript.shell`,
        `for ($i=0; $i -lt ${t}; $i++) { $wshell.SendKeys('${token}'); Start-Sleep -Milliseconds 50 }`
    ].join('; ');
    return new Promise((resolve, reject) => {
        exec(`powershell -NoProfile -Command "${ps}"`, (err) => err ? reject(err) : resolve());
    });
}

/**
 * Maneja la acción recibida por WebSocket
 * @param {object} msg Mensaje recibido
 * @return {Promise<object>} Resultado de la acción
 */
async function handleAction(msg) {
    const { type, op, step } = msg;

    if (type === 'shutdown') {
        return new Promise((resolve, reject) => {
            exec('shutdown /s /t 0', (err) => err ? reject(err) : resolve({ ok: true, msg: 'Apagando la PC...' }));
        });
    }

    if (type === 'volume') {
        // VK_VOLUME_MUTE=173, DOWN=174, UP=175
        const map = { up: 175, down: 174, mute: 173, toggle: 173, unmute: 173 };
        if (!map[op]) return { ok: false, error: 'Operación de volumen inválida' };

        // Para mute/unmute/toggle, una pulsación; para up/down, usa "step" veces
        const times = (op === 'up' || op === 'down') ? (step ?? 2) : 1;
        await pressMediaKey(map[op], times);
        return { ok: true, msg: `Volumen ${op}${(op === 'up' || op === 'down') ? ` x${times}` : ''}` };
    }

    if (type === 'key') {
        const map = {
            left: '{LEFT}',
            right: '{RIGHT}',
            up: '{UP}',
            down: '{DOWN}',
            tab: '{TAB}',
            space: ' ',
            enter: '{ENTER}',
        };

        const token = map[op];
        if (!token) return { ok: false, error: 'Tecla inválida' };

        const times = step ?? 1;
        await pressKeys(token, times);
        return { ok: true, msg: `Key ${op} x${times}` };
    }

    return { ok: false, error: 'Tipo de acción inválido' };
}

wss.on('connection', (ws) => {
    send(ws, { ok: true, msg: 'WS conectado' });

    ws.on('message', async (data) => {
        let msg;
        try { msg = JSON.parse(data.toString()); }
        catch { return send(ws, { ok: false, error: 'JSON inválido' }); }

        try {
            const result = await handleAction(msg);
            send(ws, result);
        } catch (e) {
            send(ws, { ok: false, error: e.message || 'Error ejecutando acción' });
        }
    });
});

server.listen(PORT, () => {
    const nets = os.networkInterfaces();
    let ipLocal;

    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                ipLocal = net.address;
            }
        }
    }
    
    console.log(`Servidor activo en http://${ipLocal}:${PORT}`);
});
