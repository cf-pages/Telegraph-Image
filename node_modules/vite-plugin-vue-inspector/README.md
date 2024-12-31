
<p align="center">
<a href="https://github.com/webfansplz/vite-plugin-vue-inspector"><img src="./logo.svg" width="180" alt="vite-plugin-vue-inspector"></a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/vite-plugin-vue-inspector" target="_blank" rel="noopener noreferrer"><img src="https://badgen.net/npm/v/vite-plugin-vue-inspector" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/vite-plugin-vue-inspector" target="_blank" rel="noopener noreferrer"><img src="https://badgen.net/npm/dt/vite-plugin-vue-inspector" alt="NPM Downloads" /></a>
  <a href="https://github.com/webfansplz/vite-plugin-vue-inspector/blob/master/LICENSE" target="_blank" rel="noopener noreferrer"><img src="https://badgen.net/github/license/webfansplz/vite-plugin-vue-inspector" alt="License" /></a>
</p>

<p align="center">
<a href="https://stackblitz.com/edit/vitejs-vite-rbr2as?file=src%2FApp.vue"><img src="https://developer.stackblitz.com/img/open_in_stackblitz.svg" alt=""></a>
</p>

## 📖 Introduction

A vite plugin which provides the ability that to jump to the local IDE when you click the element of browser automatically. It supports Vue2 & 3 & SSR.

<p align="center">
<img src="./public/preview.gif" alt="vite-plugin-vue-inspector">
</p>

## 📦 Installation

```bash

# vite-plugin-vue-inspector 

pnpm install vite-plugin-vue-inspector -D

# unplugin-vue-inspector

pnpm install unplugin-vue-inspector -D

```

## 🦄 Usage

### Configuration Vite

```ts
// for Vue2

import { defineConfig, } from 'vite'
import { createVuePlugin, } from 'vite-plugin-vue2'

import Inspector from 'unplugin-vue-inspector/vite' // OR vite-plugin-vue-inspector

export default defineConfig({
  plugins: [
    createVuePlugin(),
    Inspector({
      vue: 2
    }),
  ],
})
```

```ts
// for Vue3

import { defineConfig } from 'vite'
import Vue from '@vitejs/plugin-vue'

import Inspector from 'unplugin-vue-inspector/vite' // OR vite-plugin-vue-inspector

export default defineConfig({
  plugins: [Vue(), Inspector()],
})
```

```ts
// for Nuxt3
// nuxt.config.ts
import { defineNuxtConfig } from 'nuxt/config'
import Inspector from 'vite-plugin-vue-inspector'

export default defineNuxtConfig({
  modules: [
    ['unplugin-vue-inspector/nuxt', {
      enabled: true,
      toggleButtonVisibility: 'always',
    }],
  ],
})
```

### Options


```ts
interface VitePluginInspectorOptions {
  /**
   * Vue version
   * @default 3
   */
  vue?: 2 | 3

  /**
   * Default enable state
   * @default false
   */
  enabled?: boolean

  /**
   * Define a combo key to toggle inspector
   * @default 'control-shift' on windows, 'meta-shift' on other os
   *
   * any number of modifiers `control` `shift` `alt` `meta` followed by zero or one regular key, separated by -
   * examples: control-shift, control-o, control-alt-s  meta-x control-meta
   * Some keys have native behavior (e.g. alt-s opens history menu on firefox).
   * To avoid conflicts or accidentally typing into inputs, modifier only combinations are recommended.
   * You can also disable it by setting `false`.
   */
  toggleComboKey?: string | false

  /**
   * Toggle button visibility
   * @default 'active'
   */
  toggleButtonVisibility?: 'always' | 'active' | 'never'

  /**
   * Toggle button display position
   * @default top-right
   */
  toggleButtonPos?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'

  /**
   * append an import to the module id ending with `appendTo` instead of adding a script into body
   * useful for frameworks that do not support transformIndexHtml hook (e.g. Nuxt3)
   *
   * WARNING: only set this if you know exactly what it does.
   */
  appendTo?: string | RegExp

  /**
   * Customize openInEditor host (e.g. http://localhost:3000)
   * @default false
   * @deprecated This option is deprecated and removed in 5.0. The plugin now automatically detects the correct host.
   */
  openInEditorHost?: string | false

  /**
   * lazy load inspector times (ms)
   * @default false
   */
  lazyLoad?: number | false

  /**
   * disable inspector on editor open
   * @default false
   */
  disableInspectorOnEditorOpen?: boolean

  /**
   * Hide information in VNode and produce clean html in DevTools
   *
   * Currently, it only works for Vue 3
   *
   * @default true
   */
  cleanHtml?: boolean

  /**
   * Target editor when open in editor (v5.1.0+)
   *
   * @default code (Visual Studio Code)
   */
  launchEditor?: 'appcode' | 'atom' | 'atom-beta' | 'brackets' | 'clion' | 'code' | 'code-insiders' | 'codium' | 'emacs' | 'idea' | 'notepad++' | 'pycharm' | 'phpstorm' | 'rubymine' | 'sublime' | 'vim' | 'visualstudio' | 'webstorm' | 'cursor'
}
```

### Example

- [Vue2](https://github.com/webfansplz/vite-plugin-vue-inspector/tree/main/packages/playground/vue2)
- [Vue3](https://github.com/webfansplz/vite-plugin-vue-inspector/tree/main/packages/playground/vue3)
- [Nuxt3](https://github.com/webfansplz/vite-plugin-vue-inspector/tree/main/packages/playground/nuxt)

## Supported editors

| Value | Editor | Linux | Windows | OSX |
|--------|------|:------:|:------:|:------:|
| `appcode` | [AppCode](https://www.jetbrains.com/objc/) |  |  |✓|
| `atom` | [Atom](https://atom.io/) |✓|✓|✓|
| `atom-beta` | [Atom Beta](https://atom.io/beta) |  |  |✓|
| `brackets` | [Brackets](http://brackets.io/) |✓|✓|✓|
| `clion` | [Clion](https://www.jetbrains.com/clion/) |  |✓|✓|
| `code` | [Visual Studio Code](https://code.visualstudio.com/) |✓|✓|✓|
| `code-insiders` | [Visual Studio Code Insiders](https://code.visualstudio.com/insiders/) |✓|✓|✓|
| `codium` | [VSCodium](https://github.com/VSCodium/vscodium) |✓|✓|✓|
| `emacs` | [Emacs](https://www.gnu.org/software/emacs/) |✓| | |
| `idea` | [IDEA](https://www.jetbrains.com/idea/) |✓|✓|✓|
| `notepad++` | [Notepad++](https://notepad-plus-plus.org/download/v7.5.4.html) | |✓| |
| `pycharm` | [PyCharm](https://www.jetbrains.com/pycharm/) |✓|✓|✓|
| `phpstorm` | [PhpStorm](https://www.jetbrains.com/phpstorm/) |✓|✓|✓|
| `rubymine` | [RubyMine](https://www.jetbrains.com/ruby/) |✓|✓|✓|
| `sublime` | [Sublime Text](https://www.sublimetext.com/) |✓|✓|✓|
| `vim` | [Vim](http://www.vim.org/) |✓| | |
| `visualstudio` | [Visual Studio](https://www.visualstudio.com/vs/) | | |✓|
| `webstorm` | [WebStorm](https://www.jetbrains.com/webstorm/) |✓|✓|✓|
| `cursor` | [Cursor](https://www.cursor.com/) |✓|✓|✓|

## 🔌  Configuration IDE / Editor

**Starting from v5.1.0, We recommend using the `launchEditor` option configuration to specify the IDE** (Please ensure that the editor's environment variables are correctly configured beforehand.)

It uses an **environment variable** named **`LAUNCH_EDITOR`** to specify an IDE application, but if you do not set this variable, it will try to open a common IDE that you have open or installed once it is certified.

For example, if you want it always open VS Code when inspection clicked, set `export LAUNCH_EDITOR=code` in your shell.


### VS Code

- install VS Code command line tools, [see the official docs](https://code.visualstudio.com/docs/setup/mac#_launching-from-the-command-line)
  ![install-vscode-cli](./public/install-vscode-cli.png)

- set env to shell, like `.bashrc` or `.zshrc`  

  ```bash
  export LAUNCH_EDITOR=code
  ```

<br />


### VS Code with WSL (Windows)

- add the configuration in the `settings.json`

- restart the VS Code (All Windows should be closed to take effect)

```json
{
  // other config...

  "terminal.integrated.env.linux": {
    "EDITOR": "code"
  }
}
```


### WebStorm  

- just set env with an absolute path to shell, like `.bashrc` or `.zshrc` (only MacOS)  

  ```bash
  export LAUNCH_EDITOR='/Applications/WebStorm.app/Contents/MacOS/webstorm'
  ```

**OR**

- install WebStorm command line tools

- then set env to shell, like `.bashrc` or `.zshrc`  

  ```bash
  export LAUNCH_EDITOR=webstorm
  ```

<br />

### PhpStorm

- just set env with an absolute path to shell, like `.bashrc` or `.zshrc` (only MacOS)

  ```bash
  export LAUNCH_EDITOR='/Applications/PhpStorm.app/Contents/MacOS/phpstorm'
  ```

**OR**

- install PhpStorm command line tools

- then set env to shell, like `.bashrc` or `.zshrc`

  ```bash
  export LAUNCH_EDITOR=phpstorm
  ```

<br />

### Vim

Yes! you can also use vim if you want, just set env to shell

```bash
export LAUNCH_EDITOR=vim
```

<br />

## 💡 Notice

- **[BREAKING CHANGE] From v1.0, `enabled` option default value changed from `true` to `false` .**
- It only work in develop mode .
- It does not currently support `Template Engine (e.g. pug)` .

## 👨‍💻 Programmatic Usage

You can also use control inspector programmatically, by accessing the `__VUE_INSPECTOR__` global variable.

```ts
import type { VueInspectorClient } from 'vite-plugin-vue-inspector'

const inspector: VueInspectorClient = window.__VUE_INSPECTOR__

if (inspector) {
  // enable inspector
  inspector.enable()
  // or
  inspector.disable()
}
```

## 🌸 Credits

This project is inspired by [react-dev-inspector](https://github.com/zthxxx/react-dev-inspector) .

Partially implementation is inspired by [vite-plugin-svelte-inspector](https://github.com/sveltejs/vite-plugin-svelte/tree/main/packages/vite-plugin-svelte/src/ui/inspector) .

## 🤖️ Analysis of Theory

[Chinese] [点击页面元素,这个Vite插件帮我打开了Vue组件](https://juejin.cn/post/7077347158545924127)
## 📄 License

[MIT LICENSE](./LICENSE)
