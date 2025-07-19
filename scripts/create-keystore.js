#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

function findKeytool() {
  const possiblePaths = [
    'keytool', // If in PATH
    '/usr/bin/keytool',
    '/System/Library/Frameworks/JavaVM.framework/Versions/Current/Commands/keytool',
  ];

  // Add Windows-specific paths
  if (os.platform() === 'win32') {
    const javaPaths = [
      'C:\\Program Files\\Java\\jdk*\\bin\\keytool.exe',
      'C:\\Program Files (x86)\\Java\\jdk*\\bin\\keytool.exe',
      'C:\\Program Files\\Java\\jre*\\bin\\keytool.exe',
      'C:\\Program Files (x86)\\Java\\jre*\\bin\\keytool.exe',
      process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin', 'keytool.exe') : null,
    ].filter(Boolean);
    
    possiblePaths.push(...javaPaths);
    
    // Try to find Java installations
    try {
      const javaPath = execSync('where java', { encoding: 'utf8' }).trim().split('\n')[0];
      if (javaPath) {
        const keytoolPath = path.join(path.dirname(javaPath), 'keytool.exe');
        possiblePaths.push(keytoolPath);
      }
    } catch (error) {
      // Ignore if 'where java' fails
    }
  } else {
    // Add Unix-specific paths
    if (process.env.JAVA_HOME) {
      possiblePaths.push(path.join(process.env.JAVA_HOME, 'bin', 'keytool'));
    }
    
    // Try to find Java
    try {
      const javaPath = execSync('which java', { encoding: 'utf8' }).trim();
      if (javaPath) {
        const keytoolPath = path.join(path.dirname(javaPath), 'keytool');
        possiblePaths.push(keytoolPath);
      }
    } catch (error) {
      // Ignore if 'which java' fails
    }
  }

  for (const keytoolPath of possiblePaths) {
    try {
      if (keytoolPath.includes('*')) {
        // Handle wildcard paths - try to expand them
        continue;
      }
      execSync(`"${keytoolPath}" -help`, { stdio: 'ignore' });
      return keytoolPath;
    } catch (error) {
      continue;
    }
  }

  return null;
}

async function createReleaseKeystore() {
  console.log('🔐 Creating Production Release Keystore for Android\n');
  
  const keytool = findKeytool();
  
  if (!keytool) {
    console.log('❌ keytool not found. Please install Java SDK.');
    console.log('   Download from: https://adoptium.net/');
    console.log('   Or install Android Studio which includes Java SDK.');
    process.exit(1);
  }
  
  console.log(`✅ Found keytool: ${keytool}\n`);
  
  // Get keystore details from user
  console.log('Please provide the following information for your release keystore:\n');
  
  const keystoreName = await askQuestion('Keystore filename (default: my-release-key.keystore): ') || 'my-release-key.keystore';
  const keyAlias = await askQuestion('Key alias (default: my-key-alias): ') || 'my-key-alias';
  const keystorePassword = await askQuestion('Keystore password (enter a strong password): ');
  const keyPassword = await askQuestion('Key password (press Enter to use same as keystore): ') || keystorePassword;
  
  console.log('\nCertificate information:');
  const firstName = await askQuestion('First and last name: ');
  const orgUnit = await askQuestion('Organizational unit (e.g., IT Department): ');
  const org = await askQuestion('Organization (e.g., Your Company): ');
  const city = await askQuestion('City or locality: ');
  const state = await askQuestion('State or province: ');
  const country = await askQuestion('Two-letter country code: ');
  
  // Build the distinguished name
  const dname = `CN=${firstName}, OU=${orgUnit}, O=${org}, L=${city}, ST=${state}, C=${country}`;
  
  console.log('\n🔧 Creating release keystore...');
  
  try {
    const command = `"${keytool}" -genkey -v -keystore "${keystoreName}" -alias "${keyAlias}" -keyalg RSA -keysize 2048 -validity 10000 -storepass "${keystorePassword}" -keypass "${keyPassword}" -dname "${dname}"`;
    
    execSync(command, { stdio: 'inherit' });
    
    console.log('\n✅ Release keystore created successfully!');
    console.log(`📁 Keystore file: ${path.resolve(keystoreName)}`);
    console.log(`🔑 Key alias: ${keyAlias}`);
    
    // Get SHA-1 fingerprint
    console.log('\n🔍 Getting SHA-1 fingerprint...');
    try {
      const sha1Command = `"${keytool}" -list -v -keystore "${keystoreName}" -alias "${keyAlias}" -storepass "${keystorePassword}"`;
      const output = execSync(sha1Command, { encoding: 'utf8' });
      
      const sha1Match = output.match(/SHA1:\s*([A-F0-9:]+)/i);
      if (sha1Match) {
        const sha1 = sha1Match[1];
        console.log(`🔐 Production SHA-1: ${sha1}`);
        
        console.log('\n🎯 NEXT STEPS:');
        console.log('=============');
        console.log('1. Copy this SHA-1 fingerprint');
        console.log('2. Go to Google Cloud Console > APIs & Services > Credentials');
        console.log('3. Create a NEW OAuth Client ID for Android (production)');
        console.log('4. Use package name: com.relaxedpointplanner.app');
        console.log(`5. Use SHA-1: ${sha1}`);
        console.log('6. Download google-services.json and place in android/app/');
        console.log('7. Configure signing in android/app/build.gradle');
        
        console.log('\n📝 SIGNING CONFIGURATION:');
        console.log('Add this to android/app/build.gradle:');
        console.log(`
android {
    signingConfigs {
        release {
            keyAlias '${keyAlias}'
            keyPassword '${keyPassword}'
            storeFile file('../../${keystoreName}')
            storePassword '${keystorePassword}'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
        `);
        
        console.log('\n⚠️  SECURITY REMINDERS:');
        console.log('- Keep this keystore file secure and backed up');
        console.log('- Never commit keystores to version control');
        console.log('- Store passwords in a secure location');
        console.log('- Use the same keystore for all future releases');
        
      } else {
        console.log('⚠️  Could not extract SHA-1 fingerprint automatically');
        console.log(`   Run: keytool -list -v -keystore "${keystoreName}" -alias "${keyAlias}"`);
      }
    } catch (error) {
      console.log('⚠️  Error getting SHA-1 fingerprint:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error creating keystore:', error.message);
    process.exit(1);
  }
  
  rl.close();
}

// Run main function if this file is executed directly
if (process.argv[1] === __filename || process.argv[1] === fileURLToPath(import.meta.url)) {
  createReleaseKeystore().catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

export { createReleaseKeystore }; 