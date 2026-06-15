const http = require('http');
const WebSocket = require('ws');

http.get('http://127.0.0.1:9222/json', (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const targets = JSON.parse(data);
            const target = targets.find(t => t.url.includes('character-sheet.html') || t.url.includes('combat-sheet.html'));
            if (!target) {
                console.error('No target found!');
                process.exit(1);
            }
            connectToTarget(target.webSocketDebuggerUrl);
        } catch (e) {
            console.error('Error parsing JSON:', e);
            process.exit(1);
        }
    });
}).on('error', (err) => {
    console.error('Error fetching targets:', err);
    process.exit(1);
});

function connectToTarget(wsUrl) {
    const ws = new WebSocket(wsUrl);
    ws.on('open', () => {
        const msg = {
            id: 1,
            method: 'Runtime.evaluate',
            params: {
                expression: 'localStorage.getItem("dnd_character_ragna")',
                returnByValue: true
            }
        };
        ws.send(JSON.stringify(msg));
    });

    ws.on('message', (message) => {
        const msg = JSON.parse(message);
        if (msg.id === 1) {
            console.log('localStorage State:', msg.result.result.value);
            ws.close();
            process.exit(0);
        }
    });
}
