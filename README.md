# Control PC

Control remoto web para una PC Windows desde un celular en la misma red local.

La app sirve una interfaz HTML desde Node.js y se comunica por WebSocket para ejecutar acciones permitidas: volumen, teclas, texto, touchpad y apagado.

> Solo funciona en Windows porque usa PowerShell, `wscript.shell`, WinAPI y el comando `shutdown`.

## Funciones

- Apagar la PC.
- Subir, bajar y silenciar volumen.
- Enviar teclas: `ESC`, `TAB`, `DEL`, espacio, enter y flechas.
- Enviar texto desde un input.
- Mover el mouse con un touchpad tactil.
- Click izquierdo tocando el touchpad.
- Ver mensajes de acciones en un modal de consola.

## Requisitos

- Windows.
- Node.js instalado.
- Celular y PC conectados a la misma red.

## Instalacion

```powershell
npm install
```

## Ejecucion

Modo normal, sin logs de servidor:

```powershell
npm run start
```

Modo diagnostico, con logs de WebSocket y controladores:

```powershell
npm run start:logs
```

Tambien puedes usar directamente:

```powershell
node server.js
node server.js --logs
```

Al iniciar, la terminal muestra una URL parecida a:

```text
Servidor activo en http://192.168.1.20:3000
```

Abre esa URL desde el navegador del celular.

## Logs

La interfaz tiene un icono de consola en la barra superior. Al tocarlo se abre un modal con los mensajes recientes enviados por el servidor.

Los logs del navegador solo se imprimen en DevTools si abres la pagina con:

```text
http://IP_DE_TU_PC:3000?logs
```

Los logs del servidor solo se imprimen si ejecutas:

```powershell
npm run start:logs
```

## Seguridad

El frontend no puede ejecutar comandos arbitrarios en el servidor.

El WebSocket acepta un contrato cerrado de acciones:

- `shutdown`
- `volume`
- `key`
- `text`
- `mouse`

Antes de ejecutar cualquier accion, el servidor:

- valida que `type` y `op` existan en listas permitidas;
- limita `text` a 1000 caracteres;
- limita movimiento de mouse a `dx/dy` entre `-120` y `120`;
- ignora campos extra;
- limita el payload WebSocket a `4096` bytes;
- valida que el `Origin` coincida con el host del servidor;
- ejecuta PowerShell con scripts locales fijos usando `-File`;
- usa `spawn('shutdown', ['/s', '/t', '0'])` para apagar sin pasar por shell.

Importante: cualquier dispositivo que pueda abrir la URL en tu red local puede usar las acciones permitidas.

## Estructura

```text
server.js
public/
  index.html
  app.js
  styles.css
src/
  actions.js
  logger.js
  network.js
  security.js
  validation.js
  wsServer.js
  powershell/
    controlController.js
    mouseController.js
    scripts/
      control.ps1
      mouse.ps1
```

## Arquitectura

- `server.js`: arranca Express, WebSocket y los controladores.
- `src/wsServer.js`: recibe mensajes WebSocket, parsea JSON y llama a validacion.
- `src/validation.js`: normaliza el contrato publico y rechaza acciones no permitidas.
- `src/actions.js`: ejecuta acciones ya validadas.
- `src/powershell/controlController.js`: mantiene vivo el proceso de teclado, volumen y texto.
- `src/powershell/mouseController.js`: mantiene vivo el proceso de mouse.
- `src/powershell/scripts/*.ps1`: scripts fijos que reciben comandos por `stdin`.

## Cierre

Usa `Ctrl+C` para detener el servidor. El servidor cierra tambien los procesos persistentes de PowerShell antes de salir.
