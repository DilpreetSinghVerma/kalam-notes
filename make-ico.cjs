const fs = require('fs');

async function makeIco() {
  const pngToIco = (await import('png-to-ico')).default;
  const buf = await pngToIco('build/icon.png');
  fs.writeFileSync('build/icon.ico', buf);
  console.log('Successfully wrote true binary icon.ico');
}
makeIco();
