const fs = require('fs');
const path = require('path');

const gradlePropsPath = path.join(__dirname, '..', 'android', 'gradle', 'wrapper', 'gradle-wrapper.properties');
const localPropsPath = path.join(__dirname, '..', 'android', 'local.properties');

// Fix Gradle version
if (fs.existsSync(gradlePropsPath)) {
  let content = fs.readFileSync(gradlePropsPath, 'utf8');
  content = content.replace(
    /distributionUrl=.*gradle-.*-bin\.zip/,
    'distributionUrl=https\\://services.gradle.org/distributions/gradle-8.13-bin.zip'
  );
  fs.writeFileSync(gradlePropsPath, content);
  console.log('[fix-gradle] Set Gradle to 8.13');
}

// Ensure local.properties has SDK path
if (fs.existsSync(path.dirname(localPropsPath)) && !fs.existsSync(localPropsPath)) {
  const sdkDir = process.env.ANDROID_HOME || path.join(require('os').homedir(), 'Library', 'Android', 'sdk');
  fs.writeFileSync(localPropsPath, `sdk.dir=${sdkDir}\n`);
  console.log('[fix-gradle] Created local.properties with SDK path');
}
