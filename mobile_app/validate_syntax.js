const fs = require('fs');
const path = require('path');
const parser = require('./node_modules/@babel/parser');

function getFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.expo') {
        getFiles(filePath, fileList);
      }
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const srcDir = path.join(__dirname, 'src');
const rootFiles = [path.join(__dirname, 'App.js')];
const allFiles = [...rootFiles, ...getFiles(srcDir)];

let errorCount = 0;
console.log(`Checking syntax of ${allFiles.length} JavaScript files in mobile_app...`);

for (const f of allFiles) {
  const code = fs.readFileSync(f, 'utf8');
  try {
    parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'classProperties', 'objectRestSpread', 'optionalChaining', 'nullishCoalescingOperator']
    });
    console.log(`  ✓ OK: ${path.relative(__dirname, f)}`);
  } catch (err) {
    console.error(`  ✗ SYNTAX ERROR in ${path.relative(__dirname, f)}:`);
    console.error(`    Line ${err.loc?.line}, Column ${err.loc?.column}: ${err.message}`);
    errorCount++;
  }
}

if (errorCount === 0) {
  console.log('\nSUCCESS: All mobile_app JavaScript files parsed and validated with zero syntax errors!');
  process.exit(0);
} else {
  console.error(`\nFAILED: Found ${errorCount} syntax errors.`);
  process.exit(1);
}
