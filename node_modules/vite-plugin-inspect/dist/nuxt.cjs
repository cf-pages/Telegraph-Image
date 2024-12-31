'use strict';Object.defineProperty(exports, '__esModule', {value: true});

const kit = require('@nuxt/kit');
const index = require('./index.cjs');
require('node:process');
require('perfect-debounce');
require('picocolors');
require('sirv');
require('node:path');
require('node:url');
require('fs-extra');
require('node:buffer');
require('@rollup/pluginutils');
require('debug');
require('error-stack-parser-es');
require('node:http');

const nuxt = kit.defineNuxtModule({
  meta: {
    name: "vite-plugin-inspect",
    configKey: "inspect"
  },
  setup(options) {
    kit.addVitePlugin(() => index(options));
  }
});

exports.default = nuxt;
