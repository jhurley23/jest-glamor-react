const css = require('css')
const {styleSheet: glamorStyleSheet} = require('glamor')

function createSerializer(styleSheet) {
  function test(val) {
    return (
      val && !val.withStyles && val.$$typeof === Symbol.for('react.test.json')
    )
  }

  function print(val, printer) {
    const selectors = getSelectors(val)
    const styles = getStyles(selectors)
    val.withStyles = true
    const printedVal = printer(val)
    if (styles) {
      return replaceClassNames(selectors, styles, printedVal)
    } else {
      return printedVal
    }
  }

  function replaceClassNames(selectors, styles, code) {
    let index = 0
    return selectors.reduce((acc, className) => {
      const escapedRegex = new RegExp(
        className.replace('.', '').replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'),
        'g',
      )
      return acc.replace(escapedRegex, `c${index++}`)
    }, `${styles}\n\n${code}`)
  }

  function getSelectors(node) {
    let selectors = []
    if (node.children && node.children.reduce) {
      selectors = node.children.reduce(
        (acc, child) => acc.concat(getSelectors(child)),
        [],
      )
    }
    if (node.props) {
      return getSelectorsFromProps(selectors, node.props)
    }
    return selectors
  }

  function getSelectorsFromProps(selectors, props) {
    const className = props.className || props.class
    if (className) {
      selectors = selectors.concat(
        className.toString().split(' ').map(cn => `.${cn}`),
      )
    }
    const dataProps = Object.keys(props).reduce((dProps, key) => {
      if (key.startsWith('data-')) {
        dProps.push(`[${key}]`)
      }
      return dProps
    }, [])
    if (dataProps.length) {
      selectors = selectors.concat(dataProps)
    }
    return selectors
  }

  function getStyles(nodeSelectors) {
    const styles = styleSheet.tags
      .map(tag => /* istanbul ignore next */ tag.textContent || '')
      .join('\n')
    const ast = css.parse(styles)
    const rules = ast.stylesheet.rules.filter(filter)
    const mediaQueries = getMediaQueries(ast, filter)

    ast.stylesheet.rules = [...rules, ...mediaQueries]

    const ret = css.stringify(ast)
    return ret

    function filter(rule) {
      if (rule.type === 'rule') {
        return rule.selectors.some(selector => {
          const baseSelector = selector.split(/:| /)[0]
          return nodeSelectors.includes(baseSelector)
        })
      }
      return false
    }
  }

  function getMediaQueries(ast, filter) {
    return ast.stylesheet.rules
      .filter(rule => rule.type === 'media')
      .reduce((acc, mediaQuery) => {
        mediaQuery.rules = mediaQuery.rules.filter(filter)

        if (mediaQuery.rules.length) {
          return acc.concat(mediaQuery)
        }

        return acc
      }, [])
  }
  return {test, print}
}

const glamorSerializer = createSerializer(glamorStyleSheet)
createSerializer.test = glamorSerializer.test
createSerializer.print = glamorSerializer.print

module.exports = createSerializer
