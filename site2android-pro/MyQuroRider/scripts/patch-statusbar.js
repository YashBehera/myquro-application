const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../node_modules/react-native/types_generated/Libraries/Components/StatusBar/StatusBar.d.ts');

if (fs.existsSync(targetFile)) {
  let content = fs.readFileSync(targetFile, 'utf8');
  if (!content.includes('backgroundColor?: string')) {
    content = content.replace(
      'barStyle?: ("default" | "auto" | "light-content" | "dark-content") | undefined;',
      'barStyle?: ("default" | "auto" | "light-content" | "dark-content") | undefined;\n  backgroundColor?: string | undefined;\n  translucent?: boolean | undefined;'
    );
    fs.writeFileSync(targetFile, content, 'utf8');
    console.log('✅ Patched react-native StatusBar types with backgroundColor & translucent');
  } else {
    console.log('StatusBar types already patched.');
  }
}

const webviewFile = path.join(__dirname, '../node_modules/react-native-webview/index.d.ts');
if (fs.existsSync(webviewFile)) {
  let content = fs.readFileSync(webviewFile, 'utf8');
  if (content.includes('declare class WebView<P = undefined>')) {
    content = content.replace(
      'declare class WebView<P = undefined>',
      'declare class WebView<P = {}>'
    );
    fs.writeFileSync(webviewFile, content, 'utf8');
    console.log('✅ Patched react-native-webview types for React 19');
  }
}

const styleSheetFile = path.join(__dirname, '../node_modules/react-native/Libraries/StyleSheet/StyleSheetExports.js');
if (fs.existsSync(styleSheetFile)) {
  let content = fs.readFileSync(styleSheetFile, 'utf8');
  if (!content.includes('absoluteFillObject: absoluteFill')) {
    content = content.replace('absoluteFill,', 'absoluteFill,\n  absoluteFillObject: absoluteFill,');
    fs.writeFileSync(styleSheetFile, content, 'utf8');
  }
}

const styleSheetTypesFile = path.join(__dirname, '../node_modules/react-native/types_generated/Libraries/StyleSheet/StyleSheetExports.d.ts');
if (fs.existsSync(styleSheetTypesFile)) {
  let content = fs.readFileSync(styleSheetTypesFile, 'utf8');
  if (!content.includes('absoluteFillObject')) {
    content = content.replace(
      'export declare const absoluteFill: AbsoluteFillStyle;',
      'export declare const absoluteFill: AbsoluteFillStyle;\nexport declare const absoluteFillObject: AbsoluteFillStyle;'
    );
    fs.writeFileSync(styleSheetTypesFile, content, 'utf8');
  }
}

const safeAreaFile = path.join(__dirname, '../node_modules/react-native-safe-area-context/android/build.gradle');
if (fs.existsSync(safeAreaFile)) {
  let content = fs.readFileSync(safeAreaFile, 'utf8');
  if (/com\.android\.tools\.build:gradle:9\./.test(content)) {
    content = content.replace(
      /classpath\(["']com\.android\.tools\.build:gradle:9\.[^"']+["']\)/g,
      'classpath("com.android.tools.build:gradle:8.7.2")'
    );
    fs.writeFileSync(safeAreaFile, content, 'utf8');
    console.log('✅ Patched react-native-safe-area-context AGP version to 8.7.2');
  }
}

const rnGradlePluginToml = path.join(__dirname, '../node_modules/@react-native/gradle-plugin/gradle/libs.versions.toml');
if (fs.existsSync(rnGradlePluginToml)) {
  let content = fs.readFileSync(rnGradlePluginToml, 'utf8');
  if (/agp\s*=\s*"9\./.test(content)) {
    content = content.replace(/agp\s*=\s*"9\.[^"]+"/, 'agp = "8.7.2"');
    fs.writeFileSync(rnGradlePluginToml, content, 'utf8');
    console.log('✅ Patched @react-native/gradle-plugin AGP version to 8.7.2');
  }
}
