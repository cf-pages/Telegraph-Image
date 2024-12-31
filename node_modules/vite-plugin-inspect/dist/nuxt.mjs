import { defineNuxtModule, addVitePlugin } from '@nuxt/kit';
import PluginInspect from './index.mjs';
import 'node:process';
import 'perfect-debounce';
import 'picocolors';
import 'sirv';
import 'node:path';
import 'node:url';
import 'fs-extra';
import 'node:buffer';
import '@rollup/pluginutils';
import 'debug';
import 'error-stack-parser-es';
import 'node:http';

const nuxt = defineNuxtModule({
  meta: {
    name: "vite-plugin-inspect",
    configKey: "inspect"
  },
  setup(options) {
    addVitePlugin(() => PluginInspect(options));
  }
});

export { nuxt as default };
