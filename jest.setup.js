/**
 * `SafeAreaProvider` mide los insets de forma asíncrona y renderiza `null`
 * hasta tenerlos, así que en Jest el árbol saldría vacío y los tests no verían
 * nada. La librería trae un mock oficial, pero es un `.tsx` que el preset de
 * React Native no transpila (queda fuera de `transformIgnorePatterns`), así que
 * se replica aquí con valores fijos.
 */
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');

  const insets = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { x: 0, y: 0, width: 320, height: 640 };

  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaView: ({ children, ...props }) =>
      React.createElement(View, props, children),
    SafeAreaInsetsContext: React.createContext(insets),
    SafeAreaFrameContext: React.createContext(frame),
    useSafeAreaInsets: () => insets,
    useSafeAreaFrame: () => frame,
    initialWindowMetrics: { insets, frame },
  };
});
