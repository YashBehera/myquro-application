const qrcode = require('qrcode-terminal');
const os = require('os');

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const ip = getLocalIp();
const port = 8081;
const expoUrl = `exp://${ip}:${port}`;
const devClientUrl = `myquroresturant://expo-development-client/?url=${encodeURIComponent(`http://${ip}:${port}`)}`;

console.log('\n=========================================');
console.log('   🏪 MyQuro Restaurant App QR Code   ');
console.log('=========================================\n');
console.log('› Expo Go URL: ' + expoUrl);
console.log('› Dev Client URL: ' + devClientUrl);
console.log('\n› Scan with Expo Go (or Camera):\n');

qrcode.generate(expoUrl, { small: true });

console.log('\n› Scan with Development Build / Custom Client:\n');
qrcode.generate(devClientUrl, { small: true });
console.log('\n=========================================\n');
