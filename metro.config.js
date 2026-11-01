const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Firebase JS SDK ships some .cjs files.
config.resolver.sourceExts.push('cjs');
// React Native 0.88 finds files such as "react-native/asset-registry" through the
// "exports" field of its package.json, so this must be ON (turning it off causes
// "Unable to resolve react-native/asset-registry").
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
