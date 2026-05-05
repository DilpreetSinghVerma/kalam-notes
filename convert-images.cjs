const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function processImages() {
  const buildDir = path.join(__dirname, 'build');
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir);
  }

  try {
    // Process Logo
    console.log('Converting logo...');
    await sharp(path.join(__dirname, 'public', 'logo.png'))
      .resize(256, 256)
      .toFormat('png')
      .toFile(path.join(buildDir, 'icon.png'));
    console.log('Successfully created true PNG icon.');

    // Process Installer Sidebar
    console.log('Converting installer sidebar...');
    await sharp(path.join(__dirname, 'public', 'installer_bg.png'))
      .resize(164, 314)
      .toFormat('bmp')
      .toFile(path.join(buildDir, 'installerSidebar.bmp'));
    console.log('Successfully created true BMP sidebar.');

  } catch (err) {
    console.error('Error processing images:', err);
  }
}

processImages();
