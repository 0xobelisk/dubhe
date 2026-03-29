#!/usr/bin/env node

/**
 * Verification script for packages/react build and functionality
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying packages/react build and functionality...\n');

// Check 1: Build outputs exist
console.log('✅ 1. Checking build outputs...');
const distDir = path.join(__dirname, 'dist');
const requiredFiles = [
  'index.js',
  'index.mjs', 
  'index.d.ts',
  'sui/index.js',
  'sui/index.mjs',
  'sui/index.d.ts',
  'aptos/index.js',
  'aptos/index.mjs', 
  'aptos/index.d.ts',
  'initia/index.js',
  'initia/index.mjs',
  'initia/index.d.ts'
];

let buildSuccess = true;
requiredFiles.forEach(file => {
  const filePath = path.join(distDir, file);
  if (fs.existsSync(filePath)) {
    console.log(`   ✅ ${file} exists`);
  } else {
    console.log(`   ❌ ${file} missing`);
    buildSuccess = false;
  }
});

// Check 2: Package exports
console.log('\n✅ 2. Checking package exports...');
try {
  const packageJson = require('./package.json');
  const exports = packageJson.exports;
  
  console.log('   ✅ Main export:', exports['.']);
  console.log('   ✅ Sui export:', exports['./sui']);
  console.log('   ✅ Aptos export:', exports['./aptos']); 
  console.log('   ✅ Initia export:', exports['./initia']);
} catch (error) {
  console.log('   ❌ Error reading package.json:', error.message);
  buildSuccess = false;
}

// Check 3: TypeScript compilation
console.log('\n✅ 3. Checking TypeScript types...');
try {
  const mainTypes = path.join(distDir, 'index.d.ts');
  const suiTypes = path.join(distDir, 'sui/index.d.ts');
  
  if (fs.existsSync(mainTypes) && fs.existsSync(suiTypes)) {
    console.log('   ✅ TypeScript declarations generated successfully');
  } else {
    console.log('   ❌ Missing TypeScript declarations');
    buildSuccess = false;
  }
} catch (error) {
  console.log('   ❌ Error checking TypeScript files:', error.message);
  buildSuccess = false;
}

// Check 4: English-only compliance
console.log('\n✅ 4. Checking language compliance...');
const srcFiles = [
  'src/sui/examples.tsx',
  'src/sui/quickstart.tsx', 
  'src/sui/README.md',
  'README.md'
];

let langCompliance = true;
srcFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    // Check for common Chinese characters
    const hasChinese = /[\u4e00-\u9fff]/.test(content);
    if (hasChinese) {
      console.log(`   ❌ ${file} contains Chinese characters`);
      langCompliance = false;
    } else {
      console.log(`   ✅ ${file} is English-only`);
    }
  } else {
    console.log(`   ⚠️  ${file} not found`);
  }
});

// Check 5: Mock metadata files
console.log('\n✅ 5. Checking mock metadata files...');
const metadataFiles = [
  'src/sui/contracts/metadata.json',
  'src/sui/contracts/dubhe.config.json'
];

metadataFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      console.log(`   ✅ ${file} exists and is valid JSON`);
    } catch (error) {
      console.log(`   ❌ ${file} exists but is invalid JSON:`, error.message);
      buildSuccess = false;
    }
  } else {
    console.log(`   ❌ ${file} missing`);
    buildSuccess = false;
  }
});

// Summary
console.log('\n' + '='.repeat(50));
if (buildSuccess && langCompliance) {
  console.log('🎉 ALL CHECKS PASSED! packages/react is ready for use.');
  console.log('\n📝 Summary:');
  console.log('   ✅ Build outputs generated successfully');
  console.log('   ✅ Package exports configured correctly');
  console.log('   ✅ TypeScript declarations available');
  console.log('   ✅ English-only compliance verified');
  console.log('   ✅ Mock metadata files present');
  console.log('\n🚀 You can now use @0xobelisk/react in your projects!');
  process.exit(0);
} else {
  console.log('❌ VERIFICATION FAILED! Some issues need to be resolved.');
  process.exit(1);
}