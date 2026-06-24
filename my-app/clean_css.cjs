const fs = require('fs');
const file = 'src/VoiceChat.css';
let data = fs.readFileSync(file, 'utf8');

// Replace background rgba
data = data.replace(/background:\s*rgba\([0-9\s,.]+\);?/g, 'background: transparent;');

// Replace border rgba
data = data.replace(/border(-[a-z]+)?:\s*1px solid rgba\([0-9\s,.]+\);?/g, 'border$1: 1px solid var(--border);');

fs.writeFileSync(file, data);
console.log('Cleaned CSS');
