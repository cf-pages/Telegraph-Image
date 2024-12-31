/* eslint-disable new-cap */

import * as Vue from 'vue'
import App from 'virtual:vue-inspector-path:Overlay.vue'
import inspectorOptions from 'virtual:vue-inspector-options'
const CONTAINER_ID = 'vue-inspector-container'

function createInspectorContainer() {
  if (document.getElementById(CONTAINER_ID) != null)
    throw new Error('vueInspectorContainer element already exists')

  const el = document.createElement('div')
  el.setAttribute('id', CONTAINER_ID)
  document.getElementsByTagName('body')[0].appendChild(el)
  return el
}

function load() {
  const isClient = typeof window !== 'undefined'
  if (!isClient)
    return
  createInspectorContainer()
  const { vue } = inspectorOptions
  // vue 2/3 compatibility
  vue === 3
    ? Vue.createApp({
      render: () => Vue.h(App),
      devtools: {
        hide: true,
      },
    }).mount(`#${CONTAINER_ID}`)
    : new Vue.default({
      render: h => h(App),
      devtools: {
        hide: true,
      },
    }).$mount(`#${CONTAINER_ID}`)
}

if (inspectorOptions.lazyLoad)
  setTimeout(load, inspectorOptions.lazyLoad)

else
  load()
