"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target2, all) => {
  for (var name in all)
    __defProp(target2, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  DevToolsMessagingEvents: () => DevToolsMessagingEvents,
  VueDevToolsVuePlugin: () => VueDevToolsVuePlugin,
  createDevToolsStateContext: () => createDevToolsStateContext,
  createViteClientRpc: () => createViteClientRpc,
  createViteServerRpc: () => createViteServerRpc,
  functions: () => functions,
  getDevToolsClientUrl: () => getDevToolsClientUrl,
  onDevToolsConnected: () => onDevToolsConnected,
  onRpcConnected: () => onRpcConnected,
  onRpcSeverReady: () => onRpcSeverReady,
  onViteRpcConnected: () => onViteRpcConnected,
  refreshCurrentPageData: () => refreshCurrentPageData,
  rpc: () => rpc,
  rpcServer: () => rpcServer,
  setDevToolsClientUrl: () => setDevToolsClientUrl,
  useDevToolsState: () => useDevToolsState,
  viteRpc: () => viteRpc,
  viteRpcFunctions: () => viteRpcFunctions
});
module.exports = __toCommonJS(src_exports);

// src/client.ts
var import_devtools_shared = require("@vue/devtools-shared");
function setDevToolsClientUrl(url) {
  import_devtools_shared.target.__VUE_DEVTOOLS_CLIENT_URL__ = url;
}
function getDevToolsClientUrl() {
  var _a;
  return (_a = import_devtools_shared.target.__VUE_DEVTOOLS_CLIENT_URL__) != null ? _a : (() => {
    if (import_devtools_shared.isBrowser) {
      const devtoolsMeta = document.querySelector("meta[name=__VUE_DEVTOOLS_CLIENT_URL__]");
      if (devtoolsMeta)
        return devtoolsMeta.getAttribute("content");
    }
    return "";
  })();
}

// src/rpc/global.ts
var import_devtools_kit = require("@vue/devtools-kit");

// ../../node_modules/.pnpm/hookable@5.5.3/node_modules/hookable/dist/index.mjs
function flatHooks(configHooks, hooks3 = {}, parentName) {
  for (const key in configHooks) {
    const subHook = configHooks[key];
    const name = parentName ? `${parentName}:${key}` : key;
    if (typeof subHook === "object" && subHook !== null) {
      flatHooks(subHook, hooks3, name);
    } else if (typeof subHook === "function") {
      hooks3[name] = subHook;
    }
  }
  return hooks3;
}
var defaultTask = { run: (function_) => function_() };
var _createTask = () => defaultTask;
var createTask = typeof console.createTask !== "undefined" ? console.createTask : _createTask;
function serialTaskCaller(hooks3, args) {
  const name = args.shift();
  const task = createTask(name);
  return hooks3.reduce(
    (promise, hookFunction) => promise.then(() => task.run(() => hookFunction(...args))),
    Promise.resolve()
  );
}
function parallelTaskCaller(hooks3, args) {
  const name = args.shift();
  const task = createTask(name);
  return Promise.all(hooks3.map((hook) => task.run(() => hook(...args))));
}
function callEachWith(callbacks, arg0) {
  for (const callback of [...callbacks]) {
    callback(arg0);
  }
}
var Hookable = class {
  constructor() {
    this._hooks = {};
    this._before = void 0;
    this._after = void 0;
    this._deprecatedMessages = void 0;
    this._deprecatedHooks = {};
    this.hook = this.hook.bind(this);
    this.callHook = this.callHook.bind(this);
    this.callHookWith = this.callHookWith.bind(this);
  }
  hook(name, function_, options = {}) {
    if (!name || typeof function_ !== "function") {
      return () => {
      };
    }
    const originalName = name;
    let dep;
    while (this._deprecatedHooks[name]) {
      dep = this._deprecatedHooks[name];
      name = dep.to;
    }
    if (dep && !options.allowDeprecated) {
      let message = dep.message;
      if (!message) {
        message = `${originalName} hook has been deprecated` + (dep.to ? `, please use ${dep.to}` : "");
      }
      if (!this._deprecatedMessages) {
        this._deprecatedMessages = /* @__PURE__ */ new Set();
      }
      if (!this._deprecatedMessages.has(message)) {
        console.warn(message);
        this._deprecatedMessages.add(message);
      }
    }
    if (!function_.name) {
      try {
        Object.defineProperty(function_, "name", {
          get: () => "_" + name.replace(/\W+/g, "_") + "_hook_cb",
          configurable: true
        });
      } catch (e) {
      }
    }
    this._hooks[name] = this._hooks[name] || [];
    this._hooks[name].push(function_);
    return () => {
      if (function_) {
        this.removeHook(name, function_);
        function_ = void 0;
      }
    };
  }
  hookOnce(name, function_) {
    let _unreg;
    let _function = (...arguments_) => {
      if (typeof _unreg === "function") {
        _unreg();
      }
      _unreg = void 0;
      _function = void 0;
      return function_(...arguments_);
    };
    _unreg = this.hook(name, _function);
    return _unreg;
  }
  removeHook(name, function_) {
    if (this._hooks[name]) {
      const index = this._hooks[name].indexOf(function_);
      if (index !== -1) {
        this._hooks[name].splice(index, 1);
      }
      if (this._hooks[name].length === 0) {
        delete this._hooks[name];
      }
    }
  }
  deprecateHook(name, deprecated) {
    this._deprecatedHooks[name] = typeof deprecated === "string" ? { to: deprecated } : deprecated;
    const _hooks = this._hooks[name] || [];
    delete this._hooks[name];
    for (const hook of _hooks) {
      this.hook(name, hook);
    }
  }
  deprecateHooks(deprecatedHooks) {
    Object.assign(this._deprecatedHooks, deprecatedHooks);
    for (const name in deprecatedHooks) {
      this.deprecateHook(name, deprecatedHooks[name]);
    }
  }
  addHooks(configHooks) {
    const hooks3 = flatHooks(configHooks);
    const removeFns = Object.keys(hooks3).map(
      (key) => this.hook(key, hooks3[key])
    );
    return () => {
      for (const unreg of removeFns.splice(0, removeFns.length)) {
        unreg();
      }
    };
  }
  removeHooks(configHooks) {
    const hooks3 = flatHooks(configHooks);
    for (const key in hooks3) {
      this.removeHook(key, hooks3[key]);
    }
  }
  removeAllHooks() {
    for (const key in this._hooks) {
      delete this._hooks[key];
    }
  }
  callHook(name, ...arguments_) {
    arguments_.unshift(name);
    return this.callHookWith(serialTaskCaller, name, ...arguments_);
  }
  callHookParallel(name, ...arguments_) {
    arguments_.unshift(name);
    return this.callHookWith(parallelTaskCaller, name, ...arguments_);
  }
  callHookWith(caller, name, ...arguments_) {
    const event = this._before || this._after ? { name, args: arguments_, context: {} } : void 0;
    if (this._before) {
      callEachWith(this._before, event);
    }
    const result = caller(
      name in this._hooks ? [...this._hooks[name]] : [],
      arguments_
    );
    if (result instanceof Promise) {
      return result.finally(() => {
        if (this._after && event) {
          callEachWith(this._after, event);
        }
      });
    }
    if (this._after && event) {
      callEachWith(this._after, event);
    }
    return result;
  }
  beforeEach(function_) {
    this._before = this._before || [];
    this._before.push(function_);
    return () => {
      if (this._before !== void 0) {
        const index = this._before.indexOf(function_);
        if (index !== -1) {
          this._before.splice(index, 1);
        }
      }
    };
  }
  afterEach(function_) {
    this._after = this._after || [];
    this._after.push(function_);
    return () => {
      if (this._after !== void 0) {
        const index = this._after.indexOf(function_);
        if (index !== -1) {
          this._after.splice(index, 1);
        }
      }
    };
  }
};
function createHooks() {
  return new Hookable();
}

// src/rpc/global.ts
var hooks = createHooks();
var DevToolsMessagingEvents = /* @__PURE__ */ ((DevToolsMessagingEvents2) => {
  DevToolsMessagingEvents2["INSPECTOR_TREE_UPDATED"] = "inspector-tree-updated";
  DevToolsMessagingEvents2["INSPECTOR_STATE_UPDATED"] = "inspector-state-updated";
  DevToolsMessagingEvents2["DEVTOOLS_STATE_UPDATED"] = "devtools-state-updated";
  DevToolsMessagingEvents2["ROUTER_INFO_UPDATED"] = "router-info-updated";
  DevToolsMessagingEvents2["TIMELINE_EVENT_UPDATED"] = "timeline-event-updated";
  DevToolsMessagingEvents2["INSPECTOR_UPDATED"] = "inspector-updated";
  DevToolsMessagingEvents2["ACTIVE_APP_UNMOUNTED"] = "active-app-updated";
  DevToolsMessagingEvents2["DESTROY_DEVTOOLS_CLIENT"] = "destroy-devtools-client";
  DevToolsMessagingEvents2["RELOAD_DEVTOOLS_CLIENT"] = "reload-devtools-client";
  return DevToolsMessagingEvents2;
})(DevToolsMessagingEvents || {});
function getDevToolsState() {
  var _a;
  const state = import_devtools_kit.devtools.ctx.state;
  return {
    connected: state.connected,
    clientConnected: true,
    vueVersion: ((_a = state == null ? void 0 : state.activeAppRecord) == null ? void 0 : _a.version) || "",
    tabs: state.tabs,
    commands: state.commands,
    vitePluginDetected: state.vitePluginDetected,
    appRecords: state.appRecords.map((item) => ({
      id: item.id,
      name: item.name,
      version: item.version,
      routerId: item.routerId
    })),
    activeAppRecordId: state.activeAppRecordId,
    timelineLayersState: state.timelineLayersState
  };
}
var functions = {
  on: (event, handler) => {
    hooks.hook(event, handler);
  },
  off: (event, handler) => {
    hooks.removeHook(event, handler);
  },
  once: (event, handler) => {
    hooks.hookOnce(event, handler);
  },
  emit: (event, ...args) => {
    hooks.callHook(event, ...args);
  },
  heartbeat: () => {
    return true;
  },
  devtoolsState: () => {
    return getDevToolsState();
  },
  async getInspectorTree(payload) {
    const res = await import_devtools_kit.devtools.ctx.api.getInspectorTree(payload);
    return (0, import_devtools_kit.stringify)(res);
  },
  async getInspectorState(payload) {
    const inspector = (0, import_devtools_kit.getInspector)(payload.inspectorId);
    if (inspector)
      inspector.selectedNodeId = payload.nodeId;
    const res = await import_devtools_kit.devtools.ctx.api.getInspectorState(payload);
    return (0, import_devtools_kit.stringify)(res);
  },
  async editInspectorState(payload) {
    return await import_devtools_kit.devtools.ctx.api.editInspectorState(payload);
  },
  sendInspectorState(id) {
    return import_devtools_kit.devtools.ctx.api.sendInspectorState(id);
  },
  inspectComponentInspector() {
    return import_devtools_kit.devtools.ctx.api.inspectComponentInspector();
  },
  cancelInspectComponentInspector() {
    return import_devtools_kit.devtools.ctx.api.cancelInspectComponentInspector();
  },
  getComponentRenderCode(id) {
    return import_devtools_kit.devtools.ctx.api.getComponentRenderCode(id);
  },
  scrollToComponent(id) {
    return import_devtools_kit.devtools.ctx.api.scrollToComponent(id);
  },
  inspectDOM(id) {
    return import_devtools_kit.devtools.ctx.api.inspectDOM(id);
  },
  getInspectorNodeActions(id) {
    return (0, import_devtools_kit.getInspectorNodeActions)(id);
  },
  getInspectorActions(id) {
    return (0, import_devtools_kit.getInspectorActions)(id);
  },
  updateTimelineLayersState(state) {
    return (0, import_devtools_kit.updateTimelineLayersState)(state);
  },
  callInspectorNodeAction(inspectorId, actionIndex, nodeId) {
    var _a;
    const nodeActions = (0, import_devtools_kit.getInspectorNodeActions)(inspectorId);
    if (nodeActions == null ? void 0 : nodeActions.length) {
      const item = nodeActions[actionIndex];
      (_a = item.action) == null ? void 0 : _a.call(item, nodeId);
    }
  },
  callInspectorAction(inspectorId, actionIndex) {
    var _a;
    const actions = (0, import_devtools_kit.getInspectorActions)(inspectorId);
    if (actions == null ? void 0 : actions.length) {
      const item = actions[actionIndex];
      (_a = item.action) == null ? void 0 : _a.call(item);
    }
  },
  openInEditor(options) {
    return import_devtools_kit.devtools.ctx.api.openInEditor(options);
  },
  async checkVueInspectorDetected() {
    return !!await import_devtools_kit.devtools.ctx.api.getVueInspector();
  },
  async enableVueInspector() {
    var _a, _b, _c;
    const inspector = await ((_c = (_b = (_a = import_devtools_kit.devtools) == null ? void 0 : _a.api) == null ? void 0 : _b.getVueInspector) == null ? void 0 : _c.call(_b));
    if (inspector)
      await inspector.enable();
  },
  async toggleApp(id) {
    return import_devtools_kit.devtools.ctx.api.toggleApp(id);
  },
  updatePluginSettings(pluginId, key, value) {
    return import_devtools_kit.devtools.ctx.api.updatePluginSettings(pluginId, key, value);
  },
  getPluginSettings(pluginId) {
    return import_devtools_kit.devtools.ctx.api.getPluginSettings(pluginId);
  },
  getRouterInfo() {
    return import_devtools_kit.devtoolsRouterInfo;
  },
  navigate(path) {
    var _a;
    return (_a = import_devtools_kit.devtoolsRouter.value) == null ? void 0 : _a.push(path).catch(() => ({}));
  },
  getMatchedRoutes(path) {
    var _a, _b, _c;
    const c = console.warn;
    console.warn = () => {
    };
    const matched = (_c = (_b = (_a = import_devtools_kit.devtoolsRouter.value) == null ? void 0 : _a.resolve) == null ? void 0 : _b.call(_a, {
      path: path || "/"
    }).matched) != null ? _c : [];
    console.warn = c;
    return matched;
  },
  toggleClientConnected(state) {
    (0, import_devtools_kit.toggleClientConnected)(state);
  },
  getCustomInspector() {
    return (0, import_devtools_kit.getActiveInspectors)();
  },
  getInspectorInfo(id) {
    return (0, import_devtools_kit.getInspectorInfo)(id);
  },
  highlighComponent(uid) {
    return import_devtools_kit.devtools.ctx.hooks.callHook(import_devtools_kit.DevToolsContextHookKeys.COMPONENT_HIGHLIGHT, { uid });
  },
  unhighlight() {
    return import_devtools_kit.devtools.ctx.hooks.callHook(import_devtools_kit.DevToolsContextHookKeys.COMPONENT_UNHIGHLIGHT);
  },
  updateDevToolsClientDetected(params) {
    (0, import_devtools_kit.updateDevToolsClientDetected)(params);
  },
  // listen to devtools server events
  initDevToolsServerListener() {
    const rpcServer2 = (0, import_devtools_kit.getRpcServer)();
    const broadcast = rpcServer2.broadcast;
    import_devtools_kit.devtools.ctx.hooks.hook(import_devtools_kit.DevToolsMessagingHookKeys.SEND_INSPECTOR_TREE_TO_CLIENT, (payload) => {
      broadcast.emit("inspector-tree-updated" /* INSPECTOR_TREE_UPDATED */, (0, import_devtools_kit.stringify)(payload));
    });
    import_devtools_kit.devtools.ctx.hooks.hook(import_devtools_kit.DevToolsMessagingHookKeys.SEND_INSPECTOR_STATE_TO_CLIENT, (payload) => {
      broadcast.emit("inspector-state-updated" /* INSPECTOR_STATE_UPDATED */, (0, import_devtools_kit.stringify)(payload));
    });
    import_devtools_kit.devtools.ctx.hooks.hook(import_devtools_kit.DevToolsMessagingHookKeys.DEVTOOLS_STATE_UPDATED, () => {
      broadcast.emit("devtools-state-updated" /* DEVTOOLS_STATE_UPDATED */, getDevToolsState());
    });
    import_devtools_kit.devtools.ctx.hooks.hook(import_devtools_kit.DevToolsMessagingHookKeys.ROUTER_INFO_UPDATED, ({ state }) => {
      broadcast.emit("router-info-updated" /* ROUTER_INFO_UPDATED */, state);
    });
    import_devtools_kit.devtools.ctx.hooks.hook(import_devtools_kit.DevToolsMessagingHookKeys.SEND_TIMELINE_EVENT_TO_CLIENT, (payload) => {
      broadcast.emit("timeline-event-updated" /* TIMELINE_EVENT_UPDATED */, (0, import_devtools_kit.stringify)(payload));
    });
    import_devtools_kit.devtools.ctx.hooks.hook(import_devtools_kit.DevToolsMessagingHookKeys.SEND_INSPECTOR_TO_CLIENT, (payload) => {
      broadcast.emit("inspector-updated" /* INSPECTOR_UPDATED */, payload);
    });
    import_devtools_kit.devtools.ctx.hooks.hook(import_devtools_kit.DevToolsMessagingHookKeys.SEND_ACTIVE_APP_UNMOUNTED_TO_CLIENT, () => {
      broadcast.emit("active-app-updated" /* ACTIVE_APP_UNMOUNTED */);
    });
  }
};
var rpc = new Proxy({
  value: {},
  functions: {}
}, {
  get(target2, property) {
    const _rpc = (0, import_devtools_kit.getRpcClient)();
    if (property === "value") {
      return _rpc;
    } else if (property === "functions") {
      return _rpc.$functions;
    }
  }
});
var rpcServer = new Proxy({
  value: {},
  functions: {}
}, {
  get(target2, property) {
    const _rpc = (0, import_devtools_kit.getRpcServer)();
    if (property === "value") {
      return _rpc;
    } else if (property === "functions") {
      return _rpc.functions;
    }
  }
});
function onRpcConnected(callback) {
  let timer = null;
  let retryCount = 0;
  function heartbeat() {
    var _a, _b;
    (_b = (_a = rpc.value) == null ? void 0 : _a.heartbeat) == null ? void 0 : _b.call(_a).then(() => {
      callback();
      clearTimeout(timer);
    }).catch(() => {
    });
  }
  timer = setInterval(() => {
    if (retryCount >= 30) {
      clearTimeout(timer);
    }
    retryCount++;
    heartbeat();
  }, retryCount * 200 + 200);
  heartbeat();
}
function onRpcSeverReady(callback) {
  let timer = null;
  const timeout = 120;
  function heartbeat() {
    if (rpcServer.value.clients.length > 0) {
      callback();
      clearTimeout(timer);
    }
  }
  timer = setInterval(() => {
    heartbeat();
  }, timeout);
}

// src/rpc/vite.ts
var import_devtools_kit2 = require("@vue/devtools-kit");
var hooks2 = createHooks();
var viteRpcFunctions = {
  on: (event, handler) => {
    hooks2.hook(event, handler);
  },
  off: (event, handler) => {
    hooks2.removeHook(event, handler);
  },
  once: (event, handler) => {
    hooks2.hookOnce(event, handler);
  },
  emit: (event, ...args) => {
    hooks2.callHook(event, ...args);
  },
  heartbeat: () => {
    return true;
  }
};
var viteRpc = new Proxy({
  value: {},
  functions: {}
}, {
  get(target2, property) {
    const _rpc = (0, import_devtools_kit2.getViteRpcClient)();
    if (property === "value") {
      return _rpc;
    } else if (property === "functions") {
      return _rpc == null ? void 0 : _rpc.$functions;
    }
  }
});
function onViteRpcConnected(callback) {
  let timer = null;
  function heartbeat() {
    var _a, _b;
    (_b = (_a = viteRpc.value) == null ? void 0 : _a.heartbeat) == null ? void 0 : _b.call(_a).then(() => {
      clearTimeout(timer);
      callback();
    }).catch(() => ({}));
    timer = setTimeout(() => {
      heartbeat();
    }, 80);
  }
  heartbeat();
}
function createViteClientRpc() {
  (0, import_devtools_kit2.createRpcClient)(viteRpcFunctions, {
    preset: "vite"
  });
}
function createViteServerRpc(functions2) {
  (0, import_devtools_kit2.createRpcServer)(functions2, {
    preset: "vite"
  });
}

// src/vue-plugin/devtools-state.ts
var import_vue = require("vue");
var VueDevToolsStateSymbol = Symbol.for("__VueDevToolsStateSymbol__");
function VueDevToolsVuePlugin() {
  return {
    install(app) {
      const state = createDevToolsStateContext();
      state.getDevToolsState();
      app.provide(VueDevToolsStateSymbol, state);
      app.config.globalProperties.$getDevToolsState = state.getDevToolsState;
      app.config.globalProperties.$disconnectDevToolsClient = () => {
        state.clientConnected.value = false;
        state.connected.value = false;
      };
    }
  };
}
function createDevToolsStateContext() {
  const connected = (0, import_vue.ref)(false);
  const clientConnected = (0, import_vue.ref)(false);
  const vueVersion = (0, import_vue.ref)("");
  const tabs = (0, import_vue.ref)([]);
  const commands = (0, import_vue.ref)([]);
  const vitePluginDetected = (0, import_vue.ref)(false);
  const appRecords = (0, import_vue.ref)([]);
  const activeAppRecordId = (0, import_vue.ref)("");
  const timelineLayersState = (0, import_vue.ref)({});
  function updateState(data) {
    connected.value = data.connected;
    clientConnected.value = data.clientConnected;
    vueVersion.value = data.vueVersion || "";
    tabs.value = data.tabs;
    commands.value = data.commands;
    vitePluginDetected.value = data.vitePluginDetected;
    appRecords.value = data.appRecords;
    activeAppRecordId.value = data.activeAppRecordId;
    timelineLayersState.value = data.timelineLayersState;
  }
  function getDevToolsState2() {
    onRpcConnected(() => {
      rpc.value.devtoolsState().then((data) => {
        updateState(data);
      });
      rpc.functions.off("devtools-state-updated" /* DEVTOOLS_STATE_UPDATED */, updateState);
      rpc.functions.on("devtools-state-updated" /* DEVTOOLS_STATE_UPDATED */, updateState);
    });
  }
  return {
    getDevToolsState: getDevToolsState2,
    connected,
    clientConnected,
    vueVersion,
    tabs,
    commands,
    vitePluginDetected,
    appRecords,
    activeAppRecordId,
    timelineLayersState
  };
}
function useDevToolsState() {
  return (0, import_vue.inject)(VueDevToolsStateSymbol);
}
var fns = [];
function onDevToolsConnected(fn) {
  const { connected, clientConnected } = useDevToolsState();
  fns.push(fn);
  (0, import_vue.onUnmounted)(() => {
    fns.splice(fns.indexOf(fn), 1);
  });
  const devtoolsReady = (0, import_vue.computed)(() => clientConnected.value && connected.value);
  if (devtoolsReady.value) {
    fn();
  } else {
    const stop = (0, import_vue.watch)(devtoolsReady, (v) => {
      if (v) {
        fn();
        stop();
      }
    });
  }
  return () => {
    fns.splice(fns.indexOf(fn), 1);
  };
}
function refreshCurrentPageData() {
  fns.forEach((fn) => fn());
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DevToolsMessagingEvents,
  VueDevToolsVuePlugin,
  createDevToolsStateContext,
  createViteClientRpc,
  createViteServerRpc,
  functions,
  getDevToolsClientUrl,
  onDevToolsConnected,
  onRpcConnected,
  onRpcSeverReady,
  onViteRpcConnected,
  refreshCurrentPageData,
  rpc,
  rpcServer,
  setDevToolsClientUrl,
  useDevToolsState,
  viteRpc,
  viteRpcFunctions
});
