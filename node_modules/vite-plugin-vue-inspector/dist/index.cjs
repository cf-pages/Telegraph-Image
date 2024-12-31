var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  DEFAULT_INSPECTOR_OPTIONS: () => DEFAULT_INSPECTOR_OPTIONS,
  default: () => src_default,
  normalizeComboKeyPrint: () => normalizeComboKeyPrint
});
module.exports = __toCommonJS(src_exports);

// ../../node_modules/.pnpm/tsup@7.2.0_postcss@8.4.49_typescript@5.2.2/node_modules/tsup/assets/cjs_shims.js
var getImportMetaUrl = () => typeof document === "undefined" ? new URL("file:" + __filename).href : document.currentScript && document.currentScript.src || new URL("main.js", document.baseURI).href;
var importMetaUrl = /* @__PURE__ */ getImportMetaUrl();

// src/index.ts
var import_node_path2 = __toESM(require("path"));
var import_node_url = require("url");
var import_node_fs = __toESM(require("fs"));
var import_node_process = __toESM(require("process"));
var import_kolorist = require("kolorist");
var import_vite2 = require("vite");
var import_magic_string2 = __toESM(require("magic-string"));

// src/compiler/template.ts
var import_node_path = __toESM(require("path"));
var import_magic_string = __toESM(require("magic-string"));
var import_compiler_dom = require("@vue/compiler-dom");
var import_core = require("@babel/core");
var import_babel_plugin_jsx = __toESM(require("@vue/babel-plugin-jsx"));
var import_plugin_transform_typescript = __toESM(require("@babel/plugin-transform-typescript"));
var import_plugin_syntax_import_meta = __toESM(require("@babel/plugin-syntax-import-meta"));
var import_plugin_proposal_decorators = __toESM(require("@babel/plugin-proposal-decorators"));
var import_plugin_syntax_import_attributes = __toESM(require("@babel/plugin-syntax-import-attributes"));
var import_vite = require("vite");
var EXCLUDE_TAG = ["template", "script", "style"];
var KEY_DATA = "data-v-inspector";
async function compileSFCTemplate({ code, id, type }) {
  const s = new import_magic_string.default(code);
  const relativePath = (0, import_vite.normalizePath)(import_node_path.default.relative(process.cwd(), id));
  const result = await new Promise((resolve) => {
    switch (type) {
      case "template": {
        const ast = (0, import_compiler_dom.parse)(code, { comments: true });
        (0, import_compiler_dom.transform)(ast, {
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
        const ast = (0, import_core.parse)(code, {
          babelrc: false,
          configFile: false,
          comments: true,
          plugins: [
            import_plugin_syntax_import_meta.default,
            [import_babel_plugin_jsx.default, {}],
            [
              import_plugin_transform_typescript.default,
              { isTSX: true, allowExtensions: true }
            ],
            [
              import_plugin_proposal_decorators.default,
              { legacy: true }
            ],
            [
              import_plugin_syntax_import_attributes.default,
              { deprecatedAssertSyntax: true }
            ]
          ]
        });
        (0, import_core.traverse)(ast, {
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
  control: import_node_process.default.platform === "darwin" ? "Control(^)" : "Ctrl(^)",
  meta: "Command(\u2318)",
  shift: "Shift(\u21E7)"
};
function getInspectorPath() {
  const pluginPath = (0, import_vite2.normalizePath)(import_node_path2.default.dirname((0, import_node_url.fileURLToPath)(importMetaUrl)));
  return pluginPath.replace(/\/dist$/, "/src");
}
function normalizeComboKeyPrint(toggleComboKey) {
  return toggleComboKey.split("-").map((key) => toggleComboKeysMap[key] || key[0].toUpperCase() + key.slice(1)).join((0, import_kolorist.dim)("+"));
}
var DEFAULT_INSPECTOR_OPTIONS = {
  vue: 3,
  enabled: false,
  toggleComboKey: import_node_process.default.platform === "darwin" ? "meta-shift" : "control-shift",
  toggleButtonVisibility: "active",
  toggleButtonPos: "top-right",
  appendTo: "",
  lazyLoad: false,
  launchEditor: import_node_process.default.env.LAUNCH_EDITOR ?? "code",
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
    import_node_process.default.env.LAUNCH_EDITOR = normalizedOptions.launchEditor;
  return [
    {
      name: "vite-plugin-vue-inspector",
      enforce: "pre",
      apply(_, { command }) {
        return command === "serve" && import_node_process.default.env.NODE_ENV !== "test";
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
          if (import_node_fs.default.existsSync(file))
            return await import_node_fs.default.promises.readFile(file, "utf-8");
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
          console.log(`  ${(0, import_kolorist.green)("\u279C")}  ${(0, import_kolorist.bold)("Vue Inspector")}: ${(0, import_kolorist.green)(`Press ${(0, import_kolorist.yellow)(keys)} in App to toggle the Inspector`)}
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
        return cleanHtml && vue === 3 && command === "serve" && import_node_process.default.env.NODE_ENV !== "test";
      },
      transform(code) {
        if (code.includes("_interopVNode"))
          return;
        if (!code.includes("data-v-inspector"))
          return;
        const fn = /* @__PURE__ */ new Set();
        const s = new import_magic_string2.default(code);
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DEFAULT_INSPECTOR_OPTIONS,
  normalizeComboKeyPrint
});
