const express = require('express');
const path = require('path');
const http = require('http');
const logger = require('./src/logger');
const { getLocalIp } = require('./src/network');
const { createActionHandler } = require('./src/actions');
const { createWebSocketServer } = require('./src/wsServer');
const { createMouseController } = require('./src/powershell/mouseController');
const { createControlController } = require('./src/powershell/controlController');

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const mouse = createMouseController(logger);
const control = createControlController(logger);
const handleAction = createActionHandler({ control, mouse });

// El WebSocket valida y normaliza cada mensaje antes de llamar a handleAction.
createWebSocketServer(server, {
    logger,
    handleAction,
});

/**
 * Cierra los procesos persistentes de PowerShell antes de terminar Node.
 * Esto cubre Ctrl+C y señales normales del proceso.
 */
function stopProcesses() {
    mouse.stop();
    control.stop();
}

process.on('exit', stopProcesses);
process.on('SIGINT', () => {
    stopProcesses();
    process.exit();
});
process.on('SIGTERM', () => {
    stopProcesses();
    process.exit();
});

server.listen(PORT, () => {
    console.log(`Servidor activo en http://${getLocalIp()}:${PORT}`);
    // Precalienta el controlador de teclado/volumen para que la primera accion sea rapida.
    control.start();
});
