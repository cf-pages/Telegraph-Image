import { functions, setDevToolsClientUrl } from '@vue/devtools-core'
import { addCustomTab, createRpcServer, devtools, setDevToolsEnv, setOpenInEditorBaseUrl, toggleComponentInspectorEnabled } from '@vue/devtools-kit'
import vueDevToolsOptions from 'virtual:vue-devtools-options'

function normalizeUrl(url) {
  return new URL(`${vueDevToolsOptions.base || '/'}${url}`, import.meta.url).toString()
}

const overlayDir = normalizeUrl(`@id/virtual:vue-devtools-path:overlay`)
const body = document.getElementsByTagName('body')[0]
const head = document.getElementsByTagName('head')[0]

setDevToolsEnv({
  vitePluginDetected: true,
})

const devtoolsClientUrl = normalizeUrl(`__devtools__/`)
setDevToolsClientUrl(devtoolsClientUrl)
setOpenInEditorBaseUrl(normalizeUrl('').slice(0, -1))

toggleComponentInspectorEnabled(!!vueDevToolsOptions.componentInspector)

devtools.init()

// create vite inspect tab
addCustomTab({
  title: 'Vite Inspect',
  name: 'vite-inspect',
  icon: 'i-carbon-ibm-watson-discovery',
  view: {
    type: 'iframe',
    src: normalizeUrl(`__inspect/`),
  },
  category: 'advanced',
})

// create link stylesheet
const link = document.createElement('link')
link.rel = 'stylesheet'
link.href = `${overlayDir}/devtools-overlay.css`

// create script
const script = document.createElement('script')
script.src = `${overlayDir}/devtools-overlay.mjs`
script.type = 'module'

// append to head
head.appendChild(link)

// append to body
body.appendChild(script)

// Used in the browser extension
window.__VUE_DEVTOOLS_VITE_PLUGIN_CLIENT_URL__ = `${window.location.origin}${devtoolsClientUrl}`

createRpcServer(functions, {
  preset: 'iframe',
})

createRpcServer(functions, {
  preset: 'broadcast',
})
