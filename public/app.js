const btnPower = document.getElementById('btnPower')
const btnVolumeUp = document.getElementById('btnVolumeUp')
const btnVolumeDown = document.getElementById('btnVolumeDown')
const btnVolumeToggle = document.getElementById('btnVolumeToggle')
const btnEsc = document.getElementById('btnEsc')
const btnBackspace = document.getElementById('btnBackspace')
const btnTab = document.getElementById('btnTab')
const btnSpace = document.getElementById('btnSpace')
const btnEnter = document.getElementById('btnEnter')
const btnArrowUp = document.getElementById('btnArrowUp')
const btnArrowLeft = document.getElementById('btnArrowLeft')
const btnArrowDown = document.getElementById('btnArrowDown')
const btnArrowRight = document.getElementById('btnArrowRight')
const touchpad = document.getElementById('touchpad')
const textForm = document.getElementById('textForm')
const textInput = document.getElementById('textInput')
const btnLogToggle = document.getElementById('btnLogToggle')
const btnLogClose = document.getElementById('btnLogClose')
const logModal = document.getElementById('logModal')
const logModalBackdrop = document.getElementById('logModalBackdrop')
const logList = document.getElementById('logList')

const txtStatus = document.getElementById('status')
const DEBUG_WS = new URLSearchParams(location.search).has('logs')

let ws
let activePointerId = null
let lastPointer = null
let pointerStart = null
let pendingMouseMove = { dx: 0, dy: 0 }
let mouseFrame = null
let sentMouseMoveLogCount = 0

function debugLog(...args) {
    if (DEBUG_WS) console.log(...args)
}

function debugWarn(...args) {
    if (DEBUG_WS) console.warn(...args)
}

function getLogText(msg) {
    if (typeof msg === 'string') return msg
    if (typeof msg === 'object') return msg?.msg || msg?.error || JSON.stringify(msg)
    return JSON.stringify(msg)
}

/**
 * Agrega un mensaje al modal de consola sin mostrarlo en la pantalla principal.
 * @param {string | object} msg Mensaje recibido desde el servidor.
 */
function log(msg) {
    const text = getLogText(msg)
    const item = document.createElement('li')
    const time = document.createElement('time')
    time.textContent = `[${new Date().toLocaleTimeString()}] `
    item.append(time, text)
    logList.prepend(item)

    while (logList.children.length > 80) {
        logList.lastElementChild.remove()
    }

}

/**
 * Actualiza el estado de conexion visible en la barra superior.
 * @param {string} text Estado a mostrar.
 */
function setStatus(text) {
  txtStatus.textContent = text
}

/**
 * Abre el modal donde se revisan los ultimos mensajes del servidor.
 */
function openLogModal() {
    logModal.hidden = false
}

/**
 * Cierra el modal de consola.
 */
function closeLogModal() {
    logModal.hidden = true
}

window.onload = () => {
    const url = `ws://${location.host}/ws`
    debugLog('[APP] conectando WebSocket', url)
    ws = new WebSocket(url)

    ws.onopen = () => { 
        debugLog('[APP] WebSocket conectado')
        setStatus('Conectado') 
        log('WS conectado') 
    }

    ws.onclose = (e) => { 
        debugWarn('[APP] WebSocket cerrado', {
            code: e.code,
            reason: e.reason,
        })
        setStatus('Desconectado') 
        log(`WS cerrado (${e.code})`) 
    }

    ws.onerror = (e) => { 
        log('WS error') 
        console.error('[APP] WebSocket error', e) 
    }

    ws.onmessage = (e) => {
        debugLog('[APP <- WS raw]', e.data)
        try { 
            const msg = JSON.parse(e.data)
            debugLog('[APP <- WS parsed]', msg)
            if (!msg?.silent) log(msg)
        } 
        catch { 
            log(e.data) 
        }
    }
}

function apagar() {
    if (confirm("¿Estás seguro de que quieres apagar el PC?")) {
        sendJson({
            type: "shutdown"
        })
    }
}

function volumeUp() {
    sendJson({
        type:"volume",
        op:"up",
        step:4
    })
}

function volumeDown() {
    sendJson({
        type:"volume",
        op:"down",
        step:4
    })
}

function volumeToggle() {
    sendJson({
        type:"volume",
        op:"toggle",
        step:1
    })
}

function keyTab() {
    sendJson({
        type:"key",
        op:"tab",
        step:1
    })
}

function keyEsc() {
    sendJson({
        type:"key",
        op:"esc",
        step:1
    })
}

function keyBackspace() {
    sendJson({
        type:"key",
        op:"backspace",
        step:1
    })
}

function keySpace() {
    sendJson({
        type:"key",
        op:"space",
        step:1
    })
}

function keyEnter() {
    sendJson({
        type:"key",
        op:"enter",
        step:1
    })
}

function arrowKeys(direction) {
    sendJson({
        type:"key",
        op:direction,
        step:1
    })
}

function sendTextInput() {
    const value = textInput.value
    if (!value) return

    sendJson({
        type: 'text',
        value
    })

    textInput.value = ''
    textInput.focus()
}

/**
 * Envia un payload JSON al WebSocket solo si la conexion esta lista.
 * El servidor vuelve a validar todo; esta funcion solo evita errores de UI.
 * @param {object} payload Accion solicitada por la interfaz.
 */
function sendJson(payload) {
    if (ws?.readyState !== WebSocket.OPEN) {
        debugWarn('[APP -> WS bloqueado] WebSocket no está abierto', {
            readyState: ws?.readyState,
            payload,
        })
        return
    }

    const isMouseMove = payload?.type === 'mouse' && payload?.op === 'move'
    const shouldLogPayload = !isMouseMove || sentMouseMoveLogCount++ % 15 === 0

    if (shouldLogPayload) {
        debugLog('[APP -> WS]', payload)
    }

    ws.send(JSON.stringify(payload))
}

/**
 * Agrupa el movimiento del touchpad por frame para no saturar el WebSocket.
 */
function flushMouseMove() {
    mouseFrame = null

    const dx = Math.round(pendingMouseMove.dx)
    const dy = Math.round(pendingMouseMove.dy)
    pendingMouseMove = { dx: 0, dy: 0 }

    if (!dx && !dy) return
    sendJson({
        type: 'mouse',
        op: 'move',
        dx,
        dy
    })
}

/**
 * Acumula deltas tactiles antes de enviarlos al servidor.
 * @param {number} dx Movimiento horizontal del dedo.
 * @param {number} dy Movimiento vertical del dedo.
 */
function queueMouseMove(dx, dy) {
    const sensitivity = 1.35
    pendingMouseMove.dx += dx * sensitivity
    pendingMouseMove.dy += dy * sensitivity

    if (!mouseFrame) {
        mouseFrame = requestAnimationFrame(flushMouseMove)
    }
}

/**
 * Finaliza el gesto del touchpad; si casi no hubo movimiento, lo trata como click.
 * @param {PointerEvent} e Evento pointerup.
 */
function finishTouchpadPointer(e) {
    if (activePointerId !== e.pointerId) return

    const moved = pointerStart
        ? Math.hypot(e.clientX - pointerStart.x, e.clientY - pointerStart.y)
        : 0
    const elapsed = pointerStart ? Date.now() - pointerStart.time : 0
    debugLog('[touchpad] pointerup', {
        pointerId: e.pointerId,
        moved: Math.round(moved),
        elapsed,
    })

    if (moved < 8 && elapsed < 280) {
        debugLog('[touchpad] tap detectado, enviando click izquierdo')
        sendJson({
            type: 'mouse',
            op: 'leftclick'
        })
    }

    activePointerId = null
    lastPointer = null
    pointerStart = null
}

/**
 * Limpia el estado cuando el navegador cancela el gesto tactil.
 * @param {PointerEvent} e Evento pointercancel.
 */
function cancelTouchpadPointer(e) {
    if (activePointerId !== e.pointerId) return
    debugWarn('[touchpad] pointercancel', {
        pointerId: e.pointerId,
        pointerType: e.pointerType,
    })

    activePointerId = null
    lastPointer = null
    pointerStart = null
}

btnPower.addEventListener('click', apagar)
btnVolumeUp.addEventListener('click', volumeUp)
btnVolumeToggle.addEventListener('click', volumeToggle)
btnVolumeDown.addEventListener('click', volumeDown)
btnEsc.addEventListener('click', keyEsc)
btnBackspace.addEventListener('click', keyBackspace)
btnTab.addEventListener('click', keyTab)
btnSpace.addEventListener('click', keySpace)
btnEnter.addEventListener('click', keyEnter)
btnArrowUp.addEventListener('click', () => arrowKeys('up'))
btnArrowLeft.addEventListener('click', () => arrowKeys('left'))
btnArrowDown.addEventListener('click', () => arrowKeys('down'))
btnArrowRight.addEventListener('click', () => arrowKeys('right'))

textForm.addEventListener('submit', (e) => {
    e.preventDefault()
    sendTextInput()
})

btnLogToggle.addEventListener('click', openLogModal)
btnLogClose.addEventListener('click', closeLogModal)
logModalBackdrop.addEventListener('click', closeLogModal)

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !logModal.hidden) {
        closeLogModal()
    }
})

touchpad.addEventListener('pointerdown', (e) => {
    e.preventDefault()
    debugLog('[touchpad] pointerdown', {
        pointerId: e.pointerId,
        pointerType: e.pointerType,
        x: e.clientX,
        y: e.clientY,
    })
    activePointerId = e.pointerId
    lastPointer = { x: e.clientX, y: e.clientY }
    pointerStart = { x: e.clientX, y: e.clientY, time: Date.now() }
    touchpad.setPointerCapture(e.pointerId)
})

touchpad.addEventListener('pointermove', (e) => {
    if (activePointerId !== e.pointerId || !lastPointer) return
    e.preventDefault()

    const dx = e.clientX - lastPointer.x
    const dy = e.clientY - lastPointer.y
    lastPointer = { x: e.clientX, y: e.clientY }
    queueMouseMove(dx, dy)
})

touchpad.addEventListener('pointerup', finishTouchpadPointer)
touchpad.addEventListener('pointercancel', cancelTouchpadPointer)
