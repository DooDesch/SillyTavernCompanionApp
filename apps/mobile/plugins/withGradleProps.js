// @ts-check
/**
 * Extra gradle.properties that expo-build-properties doesn't cover (android/ is gitignored,
 * so they must be injected at prebuild time).
 *
 * art-profile-r8-rewriting: AGP rewrites the ART baseline profile against R8's renamed
 * classes; with RN 0.85's shipped baseline profile this fails `:app:compileReleaseArtProfile`
 * ("Failed requirement."). Disabling the rewrite only costs first-launch JIT warmup.
 */
const { withGradleProperties } = require('expo/config-plugins');

const PROPS = [{ key: 'android.experimental.art-profile-r8-rewriting', value: 'false' }];

module.exports = function withGradleProps(config) {
  return withGradleProperties(config, (cfg) => {
    for (const { key, value } of PROPS) {
      cfg.modResults = cfg.modResults.filter((item) => !('key' in item) || item.key !== key);
      cfg.modResults.push({ type: 'property', key, value });
    }
    return cfg;
  });
};
