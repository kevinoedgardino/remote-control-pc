const btnPower = document.getElementById('btnPower')
const btnVolumeUp = document.getElementById('btnVolumeUp')
const btnVolumeDown = document.getElementById('btnVolumeDown')
const btnVolumeToggle = document.getElementById('btnVolumeToggle')
const btnTab = document.getElementById('btnTab')
const btnSpace = document.getElementById('btnSpace')
const btnEnter = document.getElementById('btnEnter')
const btnArrowUp = document.getElementById('btnArrowUp')
const btnArrowLeft = document.getElementById('btnArrowLeft')
const btnArrowDown = document.getElementById('btnArrowDown')
const btnArrowRight = document.getElementById('btnArrowRight')

const txtLog = document.getElementById('log')
const txtStatus = document.getElementById('status')

let ws

function log(msg) {
    if (typeof msg === 'string') {
        txtLog.textContent = msg
    }
    else if (typeof msg === 'object') {
        txtLog.textContent = msg?.msg || msg?.error
    }
    else {
        txtLog.textContent = JSON.stringify(msg)
    }
}

function setStatus(text) {
  txtStatus.textContent = text
}

window.onload = () => {
    const url = `ws://${location.host}/ws`
    ws = new WebSocket(url)

    ws.onopen = () => { 
        setStatus('Conectado') 
        log('WS conectado') 
    }

    ws.onclose = (e) => { 
        setStatus('Desconectado') 
        log(`WS cerrado (${e.code})`) 
    }

    ws.onerror = (e) => { 
        log('WS error') 
        console.error(e) 
    }

    ws.onmessage = (e) => {
        try { 
            log(JSON.parse(e.data)) 
        } 
        catch { 
            log(e.data) 
        }
    }
}

function apagar() {
    if (confirm("¿Estás seguro de que quieres apagar el PC?")) {
        ws.send(JSON.stringify({
            type: "shutdown"
        }))
    }
}

function volumeUp() {
    ws.send(JSON.stringify({
        type:"volume",
        op:"up",
        step:4
    }))
}

function volumeDown() {
    ws.send(JSON.stringify({
        type:"volume",
        op:"down",
        step:4
    }))
}

function volumeToggle() {
    ws.send(JSON.stringify({
        type:"volume",
        op:"toggle",
        step:1
    }))
}

function keyTab() {
    ws.send(JSON.stringify({
        type:"key",
        op:"tab",
        step:1
    }))
}

function keySpace() {
    ws.send(JSON.stringify({
        type:"key",
        op:"space",
        step:1
    }))
}

function keyEnter() {
    ws.send(JSON.stringify({
        type:"key",
        op:"enter",
        step:1
    }))
}

function arrowKeys(direction) {
    ws.send(JSON.stringify({
        type:"key",
        op:direction,
        step:1
    }))
}

btnPower.addEventListener('click', apagar)
btnVolumeUp.addEventListener('click', volumeUp)
btnVolumeToggle.addEventListener('click', volumeToggle)
btnVolumeDown.addEventListener('click', volumeDown)
btnTab.addEventListener('click', keyTab)
btnSpace.addEventListener('click', keySpace)
btnEnter.addEventListener('click', keyEnter)
btnArrowUp.addEventListener('click', () => arrowKeys('up'))
btnArrowLeft.addEventListener('click', () => arrowKeys('left'))
btnArrowDown.addEventListener('click', () => arrowKeys('down'))
btnArrowRight.addEventListener('click', () => arrowKeys('right'))
