const mqtt = require('mqtt');
const os = require('os');

let pairingCode = null;
let client = null;

function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
}

function generateCode() {
    // Generate 6 digit code (100000 - 999999)
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function init() {
    pairingCode = generateCode();
    console.log(`[PAIRING] Generated Code: ${pairingCode}`);

    // Use a public broker - HiveMQ
    client = mqtt.connect('mqtt://broker.hivemq.com');

    client.on('connect', () => {
        console.log('[PAIRING] Connected to MQTT Broker');
        subscribeToDiscovery();
    });

    client.on('error', (err) => {
        console.error('[PAIRING] MQTT Error:', err);
    });
}

function subscribeToDiscovery() {
    const topic = `billing-pos/pairing/${pairingCode}`;

    client.subscribe(topic, (err) => {
        if (!err) {
            console.log(`[PAIRING] Listening on ${topic}`);
        }
    });

    client.on('message', (topic, message) => {
        if (topic === `billing-pos/pairing/${pairingCode}`) {
            const request = JSON.parse(message.toString());
            if (request.action === 'GET_IP') {
                console.log('[PAIRING] Received IP Request, sending response...');
                // Respond with IP
                const response = {
                    ip: getLocalIP(),
                    port: 4000
                };
                client.publish(`${topic}/response`, JSON.stringify(response));
            }
        }
    });
}

function getCode() {
    return pairingCode;
}

module.exports = { init, getCode };
