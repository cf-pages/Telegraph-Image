# vite-hot-client

[![NPM version](https://img.shields.io/npm/v/vite-hot-client?color=a1b858&label=)](https://www.npmjs.com/package/vite-hot-client)

Get Vite's `import.meta.hot` at runtime.

**You don't normally need this library directly**. It's designed for embedded UI on top of Vite for client-server communication. For example:

- [`vite-plugin-inspect`](https://github.com/antfu/vite-plugin-inspect)
- [`@unocss/inspector`](https://github.com/unocss/unocss/tree/main/packages/inspector)
- [`@vitest/ui`](https://github.com/vitest-dev/vitest/tree/main/packages/ui)

## Install

```bash
npm i vite-hot-client
```

## Usage

```js
import { hot } from 'vite-hot-client'

// import.meta.hot
if (hot) {
  hot.on('update', () => {
    // ...
  })
}
```

```js
import { createHotContext } from 'vite-hot-client'

const hot = createHotContext('/path/to/module')

if (hot) {
  // ...
}
```

## Sponsors

<p align="center">
  <a href="https://cdn.jsdelivr.net/gh/antfu/static/sponsors.svg">
    <img src='https://cdn.jsdelivr.net/gh/antfu/static/sponsors.svg'/>
  </a>
</p>

## License

[MIT](./LICENSE) License © 2022 [Anthony Fu](https://github.com/antfu)
