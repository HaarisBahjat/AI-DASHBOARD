const { execSync } = require('child_process');

const PORT = 3004;

function getPidsOnPort(port) {
  try {
    const output = execSync('netstat -ano -p tcp', {
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    });

    const pids = new Set();
    output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => {
        const parts = line.split(/\s+/);
        const localAddress = parts[1] || '';
        const state = (parts[3] || '').toUpperCase();
        const pid = parts[4];
        if (localAddress.endsWith(`:${port}`) && state === 'LISTENING' && pid && /^\d+$/.test(pid)) {
          pids.add(pid);
        }
      });

    return Array.from(pids);
  } catch {
    return [];
  }
}

function killPid(pid) {
  try {
    execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const pids = getPidsOnPort(PORT);

if (pids.length === 0) {
  console.log(`No backend process found on port ${PORT}.`);
  process.exit(0);
}

const killed = [];
for (const pid of pids) {
  if (killPid(pid)) killed.push(pid);
}

if (killed.length > 0) {
  console.log(`Stopped existing backend process on port ${PORT}. PIDs: ${killed.join(', ')}`);
  process.exit(0);
}

console.log(`Found process(es) on port ${PORT} but could not stop them.`);
process.exit(1);
