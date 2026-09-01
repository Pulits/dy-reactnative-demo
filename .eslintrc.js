module.exports = {
  root: true,
  extends: '@react-native',
  rules: {
    // `void promise` marca a propósito una promesa que no se espera: los
    // reportes a Dynamic Yield no deben bloquear el render. Sin el operador,
    // la intención no se distingue de un await olvidado.
    'no-void': 'off',
  },
};
