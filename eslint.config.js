const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

/*
  Most of these blocks are mechanical guards for decisions that are otherwise
  matters of taste or of memory. Every one encodes a rule from IOS-SPEC.md, and
  the section is cited so a future reader can find the argument rather than only
  the prohibition.
*/
module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/*', '.expo/*', 'node_modules/*', 'drizzle/*'] },

  {
    /**
     * Engine purity, spec section 4.
     *
     * src/engine imports nothing but other engine modules: no react, no
     * react-native, no expo, no database, no clock. That is what keeps the test
     * suite fast and the scheduler replayable, and it is also what lets
     * src/engine/fold.ts ship byte-identical to the server's copy. A drifted
     * constant between the two produces devices with silently different
     * schedules, so this is enforced rather than trusted.
     */
    files: ['src/engine/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react', 'react-*', 'react-native', 'react-native/*',
                'expo', 'expo-*', '@expo/*', '@/*',
                'drizzle-orm', 'drizzle-orm/*',
              ],
              message:
                'src/engine must stay pure (spec section 4) so it runs unchanged on the server and in tests. Move platform or database code to src/data, src/lib or src/state.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'src/engine must stay platform free.' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.name='Date'][property.name='now']",
          message:
            'src/engine must not read the clock (spec section 4). Take `now` as an argument, the way schedule() does.',
        },
      ],
    },
  },

  {
    /**
     * Design system integrity, spec sections 7.1 and 7.2. Every string goes
     * through the Text component so it picks up the type scale and the palette.
     */
    files: ['src/app/**/*.tsx', 'src/components/**/*.tsx', 'src/drills/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react-native',
              importNames: ['Text'],
              message: 'Use @/components/Text so the type scale and palette tokens are applied.',
            },
          ],
        },
      ],
    },
  },

  {
    /**
     * Spec section 7.1: the only hex values in the project live in
     * src/theme/tokens.ts. A numeric test proves the palette is not harsh; this
     * rule is what stops a literal colour appearing where that test cannot see it.
     */
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/theme/tokens.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/^#[0-9a-fA-F]{3,8}$/]',
          message:
            'Spec section 7.1: no literal colours outside src/theme/tokens.ts. Add a token instead.',
        },
      ],
    },
  },

  {
    /**
     * Spec section 7.5 permits exactly two haptic events in the whole app,
     * routed through one module that swallows rejection. Section 7.4 allows
     * four animations and no spring physics anywhere.
     */
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/lib/haptics.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'expo-haptics',
              message: 'Use @/lib/haptics, which gates on the hapticsEnabled setting.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.name='withSpring']",
          message: 'Spec section 7.4: motion is limited to four animations. No spring physics.',
        },
        {
          selector: "MemberExpression[object.name='Animated'][property.name='spring']",
          message: 'Spec section 7.4: motion is limited to four animations. No spring physics.',
        },
      ],
    },
  },

  {
    /**
     * Spec section 1.1 point 6, read properly: the app never editorialises on
     * the user's activity. A sync indicator inside a drill is the same category
     * of thing as a streak counter, pointed at anxiety instead of pride, and
     * worse because there is nothing the user can do about it mid-session. The
     * only sync surface in the app is one line in Settings.
     */
    files: [
      'src/drills/**/*.{ts,tsx}',
      'src/app/review.tsx',
      'src/app/speed.tsx',
      'src/app/cases.tsx',
      'src/app/cards.tsx',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/sync', '@/sync/*', '**/sync/*'],
              message:
                'Spec section 1.1 point 6: a drill never mentions network state. The write lands in SQLite and the session is finished with it.',
            },
          ],
        },
      ],
    },
  },

  {
    /**
     * better-sqlite3 is a devDependency used only by the node test project, so
     * the same schema and queries can be exercised without the native module. A
     * stray import from src/ breaks the EAS build and not the local one, which
     * is the worst way to find out.
     */
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/**/*.node.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'better-sqlite3',
              message: 'better-sqlite3 is for *.node.test.ts only. It must never reach the app bundle.',
            },
          ],
        },
      ],
    },
  },

  {
    /**
     * The expo-sqlite driver is synchronous. db.transaction expects a sync
     * callback and returns T, not Promise<T>, so an async callback returns a
     * promise the wrapper commits before it resolves: a silently half-applied
     * write with no error anywhere.
     */
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.property.name='transaction'] > :matches(ArrowFunctionExpression[async=true], FunctionExpression[async=true])",
          message:
            'The expo-sqlite driver is sync mode. Use .get()/.all()/.run() inside a transaction, never await.',
        },
      ],
    },
  },

  {
    // The Text component is the one place allowed to reach the underlying primitive.
    files: ['src/components/Text.tsx'],
    rules: { 'no-restricted-imports': 'off' },
  },
]);
