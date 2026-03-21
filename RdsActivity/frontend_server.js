// RdsActivity/frontend_server.js
// Hookuje handleData w datahandlerze i ustawia dataToSend.rdsActive
// oraz dataToSend.stereoActive. Zero zmian w datahandler.js.

const { logInfo, logWarn } = require('../../server/console');
const { serverConfig } = require('../../server/server_config');

const RDS_CONFIRM_THRESHOLD = 2;

let rdsGroupCount = 0;
let silenceTimer = null;

function onRdsLine(dataToSend) {
    rdsGroupCount++;

    const timeoutMs = (serverConfig.webserver.rdsTimeout || 0) * 1000 || 600;
    if (silenceTimer) clearTimeout(silenceTimer);
    silenceTimer = setTimeout(() => {
        rdsGroupCount = 0;
        dataToSend.rdsActive = false;
    }, timeoutMs);

    if (rdsGroupCount >= RDS_CONFIRM_THRESHOLD) {
        dataToSend.rdsActive = true;
    }
}

function hookDataHandler(dh) {
    if (!dh || typeof dh.handleData !== 'function') return;
    const orig = dh.handleData.bind(dh);

    dh.handleData = function(wss, receivedData, rdsWss) {
        for (const line of receivedData.split('\n')) {
            const l = line.trim();
            if (l.startsWith('R')) {
                onRdsLine(dh.dataToSend);
            } else if (l.startsWith('T')) {
                rdsGroupCount = 0;
                if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
                dh.dataToSend.rdsActive = false;
            }
        }
        return orig.call(this, wss, receivedData, rdsWss);
    };

    logInfo('[RdsActivity] datahandler hooked.');
}

function init() {
    let dataHandler = null;
    try {
        dataHandler = require('../../server/datahandler');
    } catch(e) {
        logWarn(`[RdsActivity] Could not load datahandler: ${e.message}`);
        return;
    }
    hookDataHandler(dataHandler);
    logInfo('[RdsActivity] Ready.');
}

setTimeout(init, 500);