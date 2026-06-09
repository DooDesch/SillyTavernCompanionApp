// @ts-check
/**
 * Release signing that survives `expo prebuild --clean` (android/ is gitignored).
 *
 * Injects a `release` signingConfig into the generated android/app/build.gradle that reads
 * credentials from env vars or Gradle properties (e.g. ~/.gradle/gradle.properties):
 *   STC_UPLOAD_STORE_FILE      absolute path to the keystore (use forward slashes)
 *   STC_UPLOAD_STORE_PASSWORD
 *   STC_UPLOAD_KEY_ALIAS
 *   STC_UPLOAD_KEY_PASSWORD
 *
 * With no credentials configured, the release buildType falls back to the debug keystore so
 * `expo run:android` keeps working on machines without the release keystore. The regex anchors
 * THROW when the Expo template changes, so an SDK upgrade can never silently ship a
 * debug-signed "release" build.
 */
const { withAppBuildGradle } = require('expo/config-plugins');

const RELEASE_SIGNING_CONFIG = `
        release {
            def stcStore = System.getenv('STC_UPLOAD_STORE_FILE') ?: findProperty('STC_UPLOAD_STORE_FILE')
            if (stcStore) {
                storeFile file(stcStore)
                storePassword System.getenv('STC_UPLOAD_STORE_PASSWORD') ?: findProperty('STC_UPLOAD_STORE_PASSWORD')
                keyAlias System.getenv('STC_UPLOAD_KEY_ALIAS') ?: findProperty('STC_UPLOAD_KEY_ALIAS')
                keyPassword System.getenv('STC_UPLOAD_KEY_PASSWORD') ?: findProperty('STC_UPLOAD_KEY_PASSWORD')
            }
        }`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let contents = cfg.modResults.contents;

    const signingConfigsAnchor = /(signingConfigs\s*\{\s*\n\s*debug\s*\{[\s\S]*?\n\s*\})/;
    if (!signingConfigsAnchor.test(contents)) {
      throw new Error('withReleaseSigning: signingConfigs.debug block not found — Expo template changed');
    }
    contents = contents.replace(signingConfigsAnchor, `$1${RELEASE_SIGNING_CONFIG}`);

    // `signingConfig signingConfigs.debug` also appears in the debug buildType — anchor on
    // Expo's "// Caution!" comment so only the release buildType's line is replaced.
    const releaseAnchor = /(\/\/ Caution![\s\S]{0,200}?)signingConfig signingConfigs\.debug/;
    if (!releaseAnchor.test(contents)) {
      throw new Error('withReleaseSigning: release signingConfig line not found — Expo template changed');
    }
    contents = contents.replace(
      releaseAnchor,
      "$1signingConfig (System.getenv('STC_UPLOAD_STORE_FILE') ?: findProperty('STC_UPLOAD_STORE_FILE')) ? signingConfigs.release : signingConfigs.debug",
    );

    cfg.modResults.contents = contents;
    return cfg;
  });
};
