const path = require('path')
const loaderUtils = require('loader-utils')
const compiler = require('vue-template-compiler')

const vuetifyMatcher = require('./matcher/tag')
const vuetifyAttrsMatcher = require('./matcher/attr')
const vuetifyIconMatcher = require('./matcher/icon')
const { camelize, capitalize, hyphenate, requirePeer } = require('./util')
const runtimePaths = {
  installComponents: require.resolve('./runtime/installComponents'),
  installDirectives: require.resolve('./runtime/installDirectives'),
  installIcons: require.resolve('./runtime/installIcons')
}

function getMatches (type, items, matches, component) {
  const imports = []

  items.forEach(item => {
    for (const matcher of matches) {
      const match = matcher(item, {
        [`kebab${type}`]: hyphenate(item),
        [`camel${type}`]: type === "Icon"? camelize(item) : capitalize(camelize(item)),
        path: this.resourcePath.substring(this.rootContext.length + 1),
        component
      })
      if (match) {
        imports.push(match)
        break
      }
    }
  })

  imports.sort((a, b) => a[0] < b[0] ? -1 : (a[0] > b[0] ? 1 : 0))
  return imports
}

function install (install, content, imports) {
  if (imports.length) {
    let newContent = '/* vuetify-loader */\n'
    newContent += `import ${install} from ${loaderUtils.stringifyRequest(this, '!' + runtimePaths[install])}\n`
    newContent += imports.map(i => i[1]).join('\n') + '\n'
    newContent += `${install}(component, {${imports.map(i => i[0]).join(',')}})\n`

    // Insert our modification before the HMR code
    const hotReload = content.indexOf('/* hot reload */')
    if (hotReload > -1) {
      content = content.slice(0, hotReload) + newContent + '\n\n' + content.slice(hotReload)
    } else {
      content += '\n\n' + newContent
    }
  }

  return content
}

module.exports = async function (content, sourceMap) {
  this.async()
  this.cacheable()

  const options = {
    match: [],
    attrsMatch: [],
    iconsMatch: [],
    ...loaderUtils.getOptions(this)
  }

  if (!Array.isArray(options.match)) options.match = [options.match]
  if (!Array.isArray(options.attrsMatch)) options.attrsMatch = [options.attrsMatch]
  if (!Array.isArray(options.iconsMatch)) options.iconsMatch = [options.iconsMatch]

  options.match.push(vuetifyMatcher)
  options.attrsMatch.push(vuetifyAttrsMatcher)
  options.iconsMatch.push(vuetifyIconMatcher)

  if (!this.resourceQuery) {
    const readFile = path => new Promise((resolve, reject) => {
      this.fs.readFile(path, function (err, data) {
        if (err) reject(err)
        else resolve(data)
      })
    })

    this.addDependency(this.resourcePath)

    const tags = new Set()
    const attrs = new Set()
    const icons = new Set()
    const file = (await readFile(this.resourcePath)).toString('utf8')
    const component = compiler.parseComponent(file)
    if (component.template) {
      if (component.template.src) {
        const externalFile = (await new Promise((resolve, reject) =>
          this.resolve(path.dirname(this.resourcePath), component.template.src, (err, result) => {
            if (err) reject(err)
            else resolve(result)
          })
        ))
        const externalContent = (await readFile(externalFile)).toString('utf8')
        component.template.content = externalContent
      }
      if (component.template.lang === 'pug') {
        const pug = requirePeer('pug')
        try {
          component.template.content = pug.render(component.template.content, {filename: this.resourcePath})
        } catch (err) {/* Ignore compilation errors, they'll be picked up by other loaders */}
      }
      compiler.compile(component.template.content, {
        modules: [{
          postTransformNode: node => {
            if ("directives" in node) {
              node.directives.forEach(({ name }) => attrs.add(name))
            }
            // start for icons
            if ("attrsMap" in node){
              let iconValues = Object.values(node.attrsMap).filter(obj => {
                if (typeof obj === 'string' || obj instanceof String){
                  if (obj.startsWith('$getIcon')){
                    return obj
                  }
                }
              })

              iconValues.forEach(val => {
                let rgxMatches = val.match(/(?<=\$getIcon\("|').*(?="|'\))/)
                if (rgxMatches.length > 0){
                  icons.add(rgxMatches[0])
                }
              })
            }
            // end for icons
            tags.add(node.tag)
          }
        }]
      })
    }

    content = install.call(this, 'installComponents', content, getMatches.call(this, 'Tag', tags, options.match, component))
    content = install.call(this, 'installDirectives', content, getMatches.call(this, 'Attr', attrs, options.attrsMatch, component))
    content = install.call(this, 'installIcons', content, getMatches.call(this, 'Icon', icons, options.iconsMatch, component))
  }

  this.callback(null, content, sourceMap)
}
