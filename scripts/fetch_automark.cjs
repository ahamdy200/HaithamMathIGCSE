const fs = require('fs');
const path = require('path');
const https = require('https');

const files = [
  "README.md",
  "requirements.txt",
  "setup.py",
  "setup.cfg",
  "LICENSE.txt",
  "AutoMark/automark.py",
  "AutoMark/cells.py",
  "AutoMark/extractor.py",
  "AutoMark/grader.py",
  "AutoMark/helpers.py",
  "AutoMark/ocr.py",
  "AutoMark/pipeline.py",
  "AutoMark/qr.py"
];

function downloadFile(relPath) {
  return new Promise((resolve) => {
    const url = `https://raw.githubusercontent.com/adamzev/AutoMark/master/${relPath}`;
    const dest = path.resolve('repos', 'AutoMark', ...relPath.split('/'));
    fs.mkdirSync(path.dirname(dest), { recursive: true });

    https.get(url, (res) => {
      if (res.statusCode === 200) {
        const fileStream = fs.createWriteStream(dest);
        res.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          console.log(`Downloaded ${relPath}`);
          resolve(true);
        });
      } else {
        console.warn(`Failed ${relPath}: HTTP ${res.statusCode}`);
        resolve(false);
      }
    }).on('error', (err) => {
      console.warn(`Error ${relPath}: ${err.message}`);
      resolve(false);
    });
  });
}

async function main() {
  console.log('Fetching AutoMark codebase...');
  for (const file of files) {
    await downloadFile(file);
  }
  console.log('Finished fetching AutoMark.');
}

main();
