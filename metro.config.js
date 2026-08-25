const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

/**
 * drizzle/migrations.js imports the generated .sql files directly. Metro treats
 * an unknown extension as an asset and would resolve the import to a URI
 * string, so .sql has to be a source extension. Paired with
 * babel-plugin-inline-import in babel.config.js, which is what inlines the text.
 */
config.resolver.sourceExts.push('sql');

/**
 * Force zustand to its CommonJS build on web.
 *
 * Package exports are on by default in SDK 55, so on web Metro resolves
 * zustand's "import" condition to esm/middleware.mjs, which references
 * import.meta. Metro's web output is not an ES module, so the browser throws
 * "Cannot use 'import.meta' outside a module" and the whole bundle dies before
 * anything renders.
 *
 * Native is unaffected, since it already resolves the "require" condition.
 * This only exists so the web target stays usable for laying out screens
 * without a TestFlight round trip.
 */
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName.startsWith('zustand')) {
    return context.resolveRequest(
      { ...context, unstable_conditionNames: ['require', 'default'] },
      moduleName,
      platform,
    );
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
