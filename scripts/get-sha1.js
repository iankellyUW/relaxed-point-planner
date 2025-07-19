#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🔍 Getting SHA-1 fingerprint for Android OAuth setup...\n');

const isWindows = process.platform === 'win32';
const gradlew = isWindows ? 'gradlew.bat' : './gradlew';

try {
  // Check if we're in the right directory
  if (!fs.existsSync('android')) {
    console.error('❌ Error: android directory not found. Please run this from the project root.');
    process.exit(1);
  }

  console.log('📱 Running Android signing report...');
  
  // Change to android directory and run signing report
  process.chdir('android');
  
  const command = `${gradlew} signingReport`;
  const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
  
  // Extract SHA1 fingerprints from output
  const sha1Matches = output.match(/SHA1: ([A-F0-9:]{59})/g);
  
  if (sha1Matches && sha1Matches.length > 0) {
    console.log('✅ Found SHA-1 fingerprints:\n');
    
    sha1Matches.forEach((match, index) => {
      const sha1 = match.replace('SHA1: ', '');
      const variant = index === 0 ? 'debug' : index === 1 ? 'release' : `variant-${index}`;
      
      console.log(`🔑 ${variant.toUpperCase()} SHA-1: ${sha1}`);
      
      if (index === 0) {
        console.log(`   👆 Use this SHA-1 for your Android OAuth client in Google Cloud Console\n`);
      }
    });
    
    console.log('📋 Next steps:');
    console.log('1. Copy the DEBUG SHA-1 fingerprint above');
    console.log('2. Go to Google Cloud Console > APIs & Services > Credentials');
    console.log('3. Create or edit your Android OAuth client');
    console.log('4. Add package name: com.relaxedpointplanner.app');
    console.log('5. Add the SHA-1 fingerprint');
    console.log('6. Update your .env and capacitor.config.ts files');
    console.log('\n📖 See GOOGLE_AUTH_ANDROID_FIX.md for detailed instructions');
    
  } else {
    console.log('⚠️  No SHA-1 fingerprints found in output.');
    console.log('🔍 Full output:\n');
    console.log(output);
  }
  
} catch (error) {
  console.error('❌ Error getting SHA-1 fingerprint:');
  console.error(error.message);
  
  console.log('\n🛠️  Alternative methods to get SHA-1:');
  console.log('1. Open Android Studio');
  console.log('2. Open Gradle tab (right side)');
  console.log('3. Navigate to: app > Tasks > android > signingReport');
  console.log('4. Double-click signingReport');
  console.log('5. Look for SHA1 in the output');
  
  process.exit(1);
} 