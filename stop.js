// stop.js
import 'dotenv/config';
import { exec } from 'child_process';

function killProcessOnPort(port) {
  const command = process.platform === 'win32' ?
    `netstat -ano | findstr :${port}` :
    `lsof -i tcp:${port} | grep LISTEN | awk '{print $2}'`;

  exec(command, (err, stdout, stderr) => {
    if (err) {
      console.error(`Error finding process using port ${port}:`, stderr);
      return;
    }
    if (!stdout) {
      console.log(`No process found on port ${port}.`);
      return;
    }

    const processId = stdout.trim().split('\n').pop().split(process.platform === 'win32' ? ' ' : ' ').pop();
    if (processId) {
      console.log(`Killing process ${processId} on port ${port}...`);
      exec(`kill -9 ${processId}`, (killErr, killStdout, killStderr) => {
        if (killErr) {
          console.error(`Error killing process ${processId}:`, killStderr);
          return;
        }
        console.log(`Process ${processId} on port ${port} killed successfully.`);
      });
    }
  });
}

const PORT = Number(process.env.PORT || 3000);
const PORT_RANGE = process.env.PORT_RANGE;

let fromPort = PORT;
let maxPort = PORT;

if (PORT_RANGE && PORT_RANGE.includes('-')) {
  const portRange = PORT_RANGE.split('-');
  fromPort = Number(portRange[0]);
  maxPort = Number(portRange[1] ?? portRange[0]);
}

for (let port = fromPort; port <= maxPort; port++) {
  killProcessOnPort(port);
}
