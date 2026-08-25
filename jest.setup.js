// AsyncStorage is a native module, so it needs its official mock under Jest.
// Without it any test that touches a persisted store fails at import time.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

/**
 * Reanimated 4 runs on Worklets, whose native half does not exist under Jest,
 * so any component importing Animated throws at import time. That is a module
 * load failure rather than a test failure, and it takes the whole suite down.
 *
 * The library's own mock cannot be used here because it imports Reanimated
 * itself and hits the same missing native module. This is a hand rolled stand
 * in covering only the surface the app actually touches, so anything new that
 * gets used will fail loudly here rather than silently no-op.
 */
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View, Text, ScrollView } = require('react-native');

  const passthrough = (Component) => {
    const Wrapped = React.forwardRef((props, ref) => React.createElement(Component, { ...props, ref }));
    Wrapped.displayName = `Animated(${Component.displayName || Component.name || 'Component'})`;
    return Wrapped;
  };

  // Entering and exiting animations are chainable builders in real Reanimated,
  // so the stand in has to be chainable too or every .duration() call throws.
  const builder = () => {
    const chain = {
      duration: () => chain,
      delay: () => chain,
      withInitialValues: () => chain,
      springify: () => chain,
      build: () => () => ({ initialValues: {}, animations: {} }),
    };
    return chain;
  };

  const Animated = {
    View: passthrough(View),
    Text: passthrough(Text),
    ScrollView: passthrough(ScrollView),
    createAnimatedComponent: passthrough,
  };

  return {
    __esModule: true,
    default: Animated,
    ...Animated,

    FadeIn: builder(),
    FadeOut: builder(),

    // Shared values are read synchronously in tests, so a plain object with a
    // mutable .value is enough and keeps assertions honest.
    useSharedValue: (initial) => ({ value: initial }),
    useAnimatedStyle: (fn) => {
      try {
        return fn();
      } catch {
        return {};
      }
    },
    useDerivedValue: (fn) => ({ value: fn() }),
    useAnimatedRef: () => ({ current: null }),
    useReducedMotion: () => false,

    withTiming: (to) => to,
    withSpring: (to) => to,
    withDelay: (_ms, value) => value,
    withSequence: (...values) => values[values.length - 1],
    withRepeat: (value) => value,
    cancelAnimation: () => {},
    runOnJS: (fn) => fn,
    runOnUI: (fn) => fn,
    interpolate: (v) => v,
    interpolateColor: (_v, _input, output) => output[0],

    Easing: {
      ease: (t) => t,
      linear: (t) => t,
      out: (fn) => fn,
      in: (fn) => fn,
      inOut: (fn) => fn,
      bezier: () => (t) => t,
    },
    ReducedMotionConfig: () => null,
  };
});
