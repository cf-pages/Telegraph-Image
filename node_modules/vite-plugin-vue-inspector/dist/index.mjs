// src/index.ts
import path2 from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import process2 from "node:process";
import { bold, dim, green, yellow } from "kolorist";
import { normalizePath as normalizePath2 } from "vite";
import MagicString2 from "magic-string";

// src/compiler/template.ts
import path from "node:path";
import MagicString from "magic-string";
import { parse as vueParse, transform as vueTransform } from "@vue/compiler-dom";
import { parse as babelParse, traverse as babelTraverse } from "@babel/core";
import vueJsxPlugin from "@vue/babel-plugin-jsx";
import typescriptPlugin from "@babel/plugin-transform-typescript";
import importMeta from "@babel/plugin-syntax-import-meta";
import decoratorsPlugin from "@babel/plugin-proposal-decorators";
import importAttributesPlugin from "@babel/plugin-syntax-import-attributes";
import { normalizePath } from "vite";
var EXCLUDE_TAG = ["template", "script", "style"];
var KEY_DATA = "data-v-inspector";
async function compileSFCTemplate({ code, id, type }) {
  const s = new MagicString(code);
  const relativePath = normalizePath(path.relative(process.cwd(), id));
  const result = await new Promise((resolve) => {
    switch (type) {
      case "template": {
        const ast = vueParse(code, { comments: true });
        vueTransform(ast, {
          nodeTransforms: [
            (node) => {
              if (node.type === 1) {
                if ((node.tagType === 0 || node.tagType === 1) && !EXCLUDE_TAG.includes(node.tag)) {
                  if (node.loc.source.includes(KEY_DATA))
                    return;
                  const insertPosition = node.props.length ? Math.max(...node.props.map((i) => i.loc.end.offset)) : node.loc.start.offset + node.tag.length + 1;
                  const { line, column } = node.loc.start;
                  const content = ` ${KEY_DATA}="${relativePath}:${line}:${column}"`;
                  s.prependLeft(
                    insertPosition,
                    content
                  );
                }
              }
            }
          ]
        });
        break;
      }
      case "jsx": {
        const ast = babelParse(code, {
          babelrc: false,
          configFile: false,
          comments: true,
          plugins: [
            importMeta,
            [vueJsxPlugin, {}],
            [
              typescriptPlugin,
              { isTSX: true, allowExtensions: true }
            ],
            [
              decoratorsPlugin,
              { legacy: true }
            ],
            [
              importAttributesPlugin,
              { deprecatedAssertSyntax: true }
            ]
          ]
        });
        babelTraverse(ast, {
          enter({ node }) {
            if (node.type === "JSXElement" && !EXCLUDE_TAG.includes(s.slice(node.openingElement.name.start, node.openingElement.name.end))) {
              if (node.openingElement.attributes.some(
                (attr) => attr.type !== "JSXSpreadAttribute" && attr.name.name === KEY_DATA
              ))
                return;
              const insertPosition = node.openingElement.end - (node.openingElement.selfClosing ? 2 : 1);
              const { line, column } = node.loc.start;
              const content = ` ${KEY_DATA}="${relativePath}:${line}:${column}"`;
              s.prependLeft(
                insertPosition,
                content
              );
            }
          }
        });
        break;
      }
      default:
        break;
    }
    resolve(s.toString());
  });
  return result;
}

// src/utils/index.ts
function parseVueRequest(id) {
  const [filename] = id.split("?", 2);
  const url = new URL(id, "http://domain.inspector");
  const query = Object.fromEntries(url.searchParams.entries());
  if (query.vue != null)
    query.vue = true;
  if (query.src != null)
    query.src = true;
  if (query.index != null)
    query.index = Number(query.index);
  if (query.raw != null)
    query.raw = true;
  if (query.hasOwnProperty("lang.tsx") || query.hasOwnProperty("lang.jsx"))
    query.isJsx = true;
  return {
    filename,
    query
  };
}
var FS_PREFIX = "/@fs/";
var IS_WINDOWS = process.platform === "win32";
var queryRE = /\?.*$/s;
var hashRE = /#.*$/s;
function idToFile(id) {
  if (id.startsWith(FS_PREFIX))
    id = id = id.slice(IS_WINDOWS ? FS_PREFIX.length : FS_PREFIX.length - 1);
  return id.replace(hashRE, "").replace(queryRE, "");
}

// src/index.ts
var toggleComboKeysMap = {
  control: process2.platform === "darwin" ? "Control(^)" : "Ctrl(^)",
  meta: "Command(\u2318)",
  shift: "Shift(\u21E7)"
};
function getInspectorPath() {
  const pluginPath = normalizePath2(path2.dirname(fileURLToPath(import.meta.url)));
  return pluginPath.replace(/\/dist$/, "/src");
}
function normalizeComboKeyPrint(toggleComboKey) {
  return toggleComboKey.split("-").map((key) => toggleComboKeysMap[key] || key[0].toUpperCase() + key.slice(1)).join(dim("+"));
}
var DEFAULT_INSPECTOR_OPTIONS = {
  vue: 3,
  enabled: false,
  toggleComboKey: process2.platform === "darwin" ? "meta-shift" : "control-shift",
  toggleButtonVisibility: "active",
  toggleButtonPos: "top-right",
  appendTo: "",
  lazyLoad: false,
  launchEditor: process2.env.LAUNCH_EDITOR ?? "code",
  reduceMotion: false
};
function VitePluginInspector(options = DEFAULT_INSPECTOR_OPTIONS) {
  const inspectorPath = getInspectorPath();
  const normalizedOptions = {
    ...DEFAULT_INSPECTOR_OPTIONS,
    ...options
  };
  let config;
  const {
    vue,
    appendTo,
    cleanHtml = vue === 3
    // Only enabled for Vue 3 by default
  } = normalizedOptions;
  if (normalizedOptions.launchEditor)
    process2.env.LAUNCH_EDITOR = normalizedOptions.launchEditor;
  return [
    {
      name: "vite-plugin-vue-inspector",
      enforce: "pre",
      apply(_, { command }) {
        return command === "serve" && process2.env.NODE_ENV !== "test";
      },
      async resolveId(importee) {
        if (importee.startsWith("virtual:vue-inspector-options")) {
          return importee;
        } else if (importee.startsWith("virtual:vue-inspector-path:")) {
          const resolved = importee.replace("virtual:vue-inspector-path:", `${inspectorPath}/`);
          return resolved;
        }
      },
      async load(id) {
        if (id === "virtual:vue-inspector-options") {
          return `export default ${JSON.stringify({ ...normalizedOptions, base: config.base })}`;
        } else if (id.startsWith(inspectorPath)) {
          const { query } = parseVueRequest(id);
          if (query.type)
            return;
          const file = idToFile(id);
          if (fs.existsSync(file))
            return await fs.promises.readFile(file, "utf-8");
          else
            console.error(`failed to find file for vue-inspector: ${file}, referenced by id ${id}.`);
        }
      },
      transform(code, id) {
        const { filename, query } = parseVueRequest(id);
        const isJsx = filename.endsWith(".jsx") || filename.endsWith(".tsx") || filename.endsWith(".vue") && query.isJsx;
        const isTpl = filename.endsWith(".vue") && query.type !== "style" && !query.raw;
        if (isJsx || isTpl)
          return compileSFCTemplate({ code, id: filename, type: isJsx ? "jsx" : "template" });
        if (!appendTo)
          return;
        if (typeof appendTo === "string" && filename.endsWith(appendTo) || appendTo instanceof RegExp && appendTo.test(filename))
          return { code: `${code}
import 'virtual:vue-inspector-path:load.js'` };
      },
      configureServer(server) {
        const _printUrls = server.printUrls;
        const { toggleComboKey } = normalizedOptions;
        toggleComboKey && (server.printUrls = () => {
          const keys = normalizeComboKeyPrint(toggleComboKey);
          _printUrls();
          console.log(`  ${green("\u279C")}  ${bold("Vue Inspector")}: ${green(`Press ${yellow(keys)} in App to toggle the Inspector`)}
`);
        });
      },
      transformIndexHtml(html) {
        if (appendTo)
          return;
        return {
          html,
          tags: [
            {
              tag: "script",
              injectTo: "head",
              attrs: {
                type: "module",
                src: `${config.base || "/"}@id/virtual:vue-inspector-path:load.js`
              }
            }
          ]
        };
      },
      configResolved(resolvedConfig) {
        config = resolvedConfig;
      }
    },
    {
      name: "vite-plugin-vue-inspector:post",
      enforce: "post",
      apply(_, { command }) {
        return cleanHtml && vue === 3 && command === "serve" && process2.env.NODE_ENV !== "test";
      },
      transform(code) {
        if (code.includes("_interopVNode"))
          return;
        if (!code.includes("data-v-inspector"))
          return;
        const fn = /* @__PURE__ */ new Set();
        const s = new MagicString2(code);
        s.replace(/(createElementVNode|createVNode|createElementBlock|createBlock) as _\1,?/g, (_, name) => {
          fn.add(name);
          return "";
        });
        if (!fn.size)
          return;
        s.appendLeft(0, `/* Injection by vite-plugin-vue-inspector Start */
import { ${Array.from(fn.values()).map((i) => `${i} as __${i}`).join(",")} } from 'vue'
function _interopVNode(vnode) {
  if (vnode && vnode.props && 'data-v-inspector' in vnode.props) {
    const data = vnode.props['data-v-inspector']
    delete vnode.props['data-v-inspector']
    Object.defineProperty(vnode.props, '__v_inspector', { value: data, enumerable: false })
  }
  return vnode
}
${Array.from(fn.values()).map((i) => `function _${i}(...args) { return _interopVNode(__${i}(...args)) }`).join("\n")}
/* Injection by vite-plugin-vue-inspector End */
`);
        return {
          code: s.toString(),
          map: s.generateMap({ hires: "boundary" })
        };
      }
    }
  ];
}
var src_default = VitePluginInspector;
export {
  DEFAULT_INSPECTOR_OPTIONS,
  src_default as default,
  normalizeComboKeyPrint
};
