/**
 * Colors with a fixed meaning (and always an icon next to them, for color blindness):
 *   green  = success, critical      red    = error, fumble
 *   yellow = warning, tie           blue   = information, selection, focus
 * Primary is neutral: white elements on dark, black elements on light.
 */
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'neutral',
      neutral: 'zinc',
      success: 'green',
      error: 'red',
      warning: 'yellow',
      info: 'blue',
    },
  },
})
