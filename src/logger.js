const enabled = process.argv.includes('--logs') || process.env.LOGS === '1' || process.env.LOGS === 'true';

/**
 * Escribe logs solo cuando el servidor arranca con --logs o LOGS=true.
 * @param {...unknown} args Datos a imprimir.
 */
function log(...args) {
    if (enabled) console.log(...args);
}

/**
 * Escribe warnings solo cuando el modo debug esta activo.
 * @param {...unknown} args Datos a imprimir.
 */
function warn(...args) {
    if (enabled) console.warn(...args);
}

module.exports = {
    enabled,
    log,
    warn,
};
