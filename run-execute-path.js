const INVOICE_HOST = process.env.INVOICE_HOST || 'http://localhost:3000';
const IS_DOCKER = INVOICE_HOST.search('host.docker.internal') !== -1 || false;

let executablePath = process.env.PUPPETEER_EXECUTABLE_PATH ?? null;
// fs list file and directory of current directory 
const files = fs.readdirSync('./');
// Check if chromium is installed in current directory
if (IS_DOCKER && !files.includes('chromium') && !files.includes('chrome')) {
  console.error('Chromium not found in current directory. Please install chromium and try again.');
  process.exit(1);
}
if (files.includes('chrome')) {
  let joinedPath = join('./', 'chrome');
  const chromePaths = ['linux-', 'chrome-'];
  chromePaths.map((path) => {
    const files2 = fs.readdirSync(joinedPath);
    const subDir = files2.find(f => f.includes(path));
    if (subDir) {
      joinedPath = join(joinedPath, subDir);
    }
  });
  executablePath = join(joinedPath, 'chrome'); // chrome is last excutable file in chrome folder
} else if (files.includes('chromium')) {
  // If chromium is installed in current directory, get excute path from chromium/.metadata file
  const metadataPath = join('./', 'chromium', '.metadata');
  fs.stat(metadataPath, (_, stats) => {
    if (stats && stats.isDirectory()) {
      // Get excute path from chromium/.metadata file
      const chromiumVer = JSON.parse(fs.readFileSync(metadataPath, 'utf8')).aliases.latest;
      if (process.platform === 'darwin') {
        executablePath = join('./', 'chromium', 'mac_arm-' + chromiumVer, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium');
      } else {
        executablePath = join('./', 'chromium', 'linux-' + chromiumVer, 'chrome-linux', 'chrome');
      }
    }
  });
}
// Fallback excute path for docker
if (!executablePath && IS_DOCKER) {
  executablePath = '/usr/bin/chromium-browser';
}
console.log('Executable path:', executablePath);
