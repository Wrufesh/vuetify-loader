module.exports = function match(_, { kebabIcon, camelIcon: icon }) {
  return [
    icon,
    `import { ${icon} } from '@mdi/js';`
  ];
};
