import client from 'webpack-theme-color-replacer/client'
import generate from '@ant-design/colors/lib/generate'

export default {
  getAntdSerials (color) {
    // Lighten (i.e. less tint)
    const lightens = new Array(9).fill().map((t, i) => {
      return client.varyColor.lighten(color, i / 10)
    })
    // Get color values via colorPalette transformation
    const colorPalettes = generate(color)
    const rgb = client.varyColor.toNum3(color.replace('#', '')).join(',')
    return lightens.concat(colorPalettes).concat(rgb)
  },
  changeColor (newColor) {
    // Check if client.changer is available (plugin might not be loaded in some build configs)
    if (!client || !client.changer || typeof client.changer.changeColor !== 'function') {
      // Return a resolved promise to avoid breaking the calling code
      return Promise.resolve()
    }

    var options = {
      newColors: this.getAntdSerials(newColor), // new colors array, one-to-one corresponde with `matchColors`
      changeUrl (cssUrl) {
        return `/${cssUrl}` // while router is not `hash` mode, it needs absolute path
      }
    }

    try {
      return client.changer.changeColor(options, Promise)
    } catch (error) {
      // Return a resolved promise to avoid breaking the calling code
      return Promise.resolve()
    }
  }
}
