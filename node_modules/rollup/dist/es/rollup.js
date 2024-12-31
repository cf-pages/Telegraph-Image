/*
  @license
	Rollup.js v4.29.1
	Sat, 21 Dec 2024 07:15:31 GMT - commit 5d3777803404c67ce14c62b8b05d6e26e46856f5

	https://github.com/rollup/rollup

	Released under the MIT License.
*/
export { version as VERSION, defineConfig, rollup, watch } from './shared/node-entry.js';
import './shared/parseAst.js';
import '../native.js';
import 'node:path';
import 'path';
import 'node:process';
import 'node:perf_hooks';
import 'node:fs/promises';
import 'tty';
