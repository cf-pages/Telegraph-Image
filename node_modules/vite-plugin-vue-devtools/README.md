# vite-plugin-vue-devtools

> `vite-plugin-vue-devtools` is a `Vite` plugin designed to enhance the `Vue` developer experience.

## Installation

```sh

npm add -D vite-plugin-vue-devtools

```

## Usage

### Configuration Vite

```ts
import { defineConfig } from 'vite'
import VueDevTools from 'vite-plugin-vue-devtools'

export default defineConfig({
  plugins: [
    VueDevTools(),
    vue(),
  ],
})
```

## Documentation

Check out all the DevTools details at [devtools.vuejs.org](https://devtools.vuejs.org).
