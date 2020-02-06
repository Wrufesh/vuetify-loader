// IMPORTANT: Do NOT use ES2015 features in this file (except for modules).
// This module is a runtime utility for cleaner component module output and will
// be included in the final webpack user bundle.

module.exports = function installIcons (component, icons) {
    var options = typeof component.exports === 'function'
      ? component.exports.extendOptions
      : component.options
  
    if (typeof component.exports === 'function') {
      options.icons = component.exports.options.icons
    }
  
    options.icons = options.icons || {}
  
    for (var i in icons) {
      options.icons[i] = options.icons[i] || icons[i]
    }
  }
