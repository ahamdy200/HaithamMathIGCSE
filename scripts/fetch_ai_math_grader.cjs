const fs = require('fs');
const path = require('path');
const https = require('https');

const files = [
  "README.md",
  "ARCHITECTURE.md",
  ".gitattributes",
  ".gitignore",
  "ai-math-grader-openai/package.json",
  "ai-math-grader-openai/tsconfig.json",
  "ai-math-grader-openai/env.example",
  "ai-math-grader-openai/DEPLOY_VPS.md",
  "ai-math-grader-openai/src/types/grading.ts",
  "ai-math-grader-openai/src/types/heic-convert.d.ts",
  "ai-math-grader-openai/src/lib/providers.ts",
  "ai-math-grader-openai/src/lib/langchain/grading-chain.ts",
  "ai-math-grader-openai/src/app/api/grade/route.ts",
  "ai-math-grader-openai/src/app/api/grade-image/route.ts",
  "ai-math-grader-openai/src/app/api/grade-langchain/route.ts",
  "ai-math-grader-openai/src/app/api/exams/route.ts",
  "ai-math-grader-openai/src/components/GradingResults.tsx",
  "ai-math-grader-openai/src/components/UploadZone.tsx",
  "ai-math-grader-openai/src/components/Header.tsx"
];

function downloadFile(relPath) {
  return new Promise((resolve) => {
    const url = `https://raw.githubusercontent.com/bluehawana/AI-Math-Grader-OpenAI/main/${relPath}`;
    const dest = path.resolve('repos', 'AI-Math-Grader-OpenAI', ...relPath.split('/'));
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
  console.log('Fetching AI-Math-Grader-OpenAI codebase...');
  for (const file of files) {
    await downloadFile(file);
  }
  console.log('Finished fetching AI-Math-Grader-OpenAI.');
}

main();
