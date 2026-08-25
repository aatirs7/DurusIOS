/**
 * SDK 55 does not ship a babel.config.js by default. This one exists for a
 * single reason: drizzle-kit's generated drizzle/migrations.js does
 * `import m from './0000_x.sql'`, and Metro cannot turn a .sql file into a
 * string on its own. inline-import substitutes the file's text at build time.
 * It pairs with `sourceExts.push('sql')` in metro.config.js; without both, the
 * import resolves to an asset URI and useMigrations gets garbage.
 *
 * babel-preset-expo must stay listed. It appends react-native-worklets/plugin
 * itself whenever the package is installed (verified in its build/index.js at
 * 55.0.24), so adding that plugin by hand here would register it twice and
 * mis-order it against the preset. Reanimated failures of that kind surface at
 * runtime on the card flip, not at build time, which is why this note is here
 * rather than in a commit message.
 */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
