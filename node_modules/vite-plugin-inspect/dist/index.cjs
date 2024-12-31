'use strict';Object.defineProperty(exports, '__esModule', {value: true});

const process = require('node:process');
const perfectDebounce = require('perfect-debounce');
const c = require('picocolors');
const sirv = require('sirv');
const node_path = require('node:path');
const node_url = require('node:url');
const fs = require('fs-extra');
const node_buffer = require('node:buffer');
const pluginutils = require('@rollup/pluginutils');
const Debug = require('debug');
const errorStackParserEs = require('error-stack-parser-es');
const node_http = require('node:http');

var _documentCurrentScript = typeof document !== 'undefined' ? document.currentScript : null;
function _interopDefaultCompat (e) { return e && typeof e === 'object' && 'default' in e ? e.default : e; }

const process__default = /*#__PURE__*/_interopDefaultCompat(process);
const c__default = /*#__PURE__*/_interopDefaultCompat(c);
const sirv__default = /*#__PURE__*/_interopDefaultCompat(sirv);
const fs__default = /*#__PURE__*/_interopDefaultCompat(fs);
const Debug__default = /*#__PURE__*/_interopDefaultCompat(Debug);

const DEFAULT_TIMEOUT = 6e4;
function defaultSerialize(i) {
  return i;
}
const defaultDeserialize = defaultSerialize;
const { clearTimeout, setTimeout: setTimeout$1 } = globalThis;
const random = Math.random.bind(Math);
function createBirpc(functions, options) {
  const {
    post,
    on,
    off = () => {
    },
    eventNames = [],
    serialize = defaultSerialize,
    deserialize = defaultDeserialize,
    resolver,
    bind = "rpc",
    timeout = DEFAULT_TIMEOUT
  } = options;
  const rpcPromiseMap = /* @__PURE__ */ new Map();
  let _promise;
  let closed = false;
  const rpc = new Proxy({}, {
    get(_, method) {
      if (method === "$functions")
        return functions;
      if (method === "$close")
        return close;
      if (method === "then" && !eventNames.includes("then") && !("then" in functions))
        return void 0;
      const sendEvent = (...args) => {
        post(serialize({ m: method, a: args, t: "q" }));
      };
      if (eventNames.includes(method)) {
        sendEvent.asEvent = sendEvent;
        return sendEvent;
      }
      const sendCall = async (...args) => {
        if (closed)
          throw new Error(`[birpc] rpc is closed, cannot call "${method}"`);
        if (_promise) {
          try {
            await _promise;
          } finally {
            _promise = void 0;
          }
        }
        return new Promise((resolve, reject) => {
          const id = nanoid();
          let timeoutId;
          if (timeout >= 0) {
            timeoutId = setTimeout$1(() => {
              try {
                options.onTimeoutError?.(method, args);
                throw new Error(`[birpc] timeout on calling "${method}"`);
              } catch (e) {
                reject(e);
              }
              rpcPromiseMap.delete(id);
            }, timeout);
            if (typeof timeoutId === "object")
              timeoutId = timeoutId.unref?.();
          }
          rpcPromiseMap.set(id, { resolve, reject, timeoutId, method });
          post(serialize({ m: method, a: args, i: id, t: "q" }));
        });
      };
      sendCall.asEvent = sendEvent;
      return sendCall;
    }
  });
  function close() {
    closed = true;
    rpcPromiseMap.forEach(({ reject, method }) => {
      reject(new Error(`[birpc] rpc is closed, cannot call "${method}"`));
    });
    rpcPromiseMap.clear();
    off(onMessage);
  }
  async function onMessage(data, ...extra) {
    const msg = deserialize(data);
    if (msg.t === "q") {
      const { m: method, a: args } = msg;
      let result, error;
      const fn = resolver ? resolver(method, functions[method]) : functions[method];
      if (!fn) {
        error = new Error(`[birpc] function "${method}" not found`);
      } else {
        try {
          result = await fn.apply(bind === "rpc" ? rpc : functions, args);
        } catch (e) {
          error = e;
        }
      }
      if (msg.i) {
        if (error && options.onError)
          options.onError(error, method, args);
        post(serialize({ t: "s", i: msg.i, r: result, e: error }), ...extra);
      }
    } else {
      const { i: ack, r: result, e: error } = msg;
      const promise = rpcPromiseMap.get(ack);
      if (promise) {
        clearTimeout(promise.timeoutId);
        if (error)
          promise.reject(error);
        else
          promise.resolve(result);
      }
      rpcPromiseMap.delete(ack);
    }
  }
  _promise = on(onMessage);
  return rpc;
}
const cacheMap = /* @__PURE__ */ new WeakMap();
function cachedMap(items, fn) {
  return items.map((i) => {
    let r = cacheMap.get(i);
    if (!r) {
      r = fn(i);
      cacheMap.set(i, r);
    }
    return r;
  });
}
function createBirpcGroup(functions, channels, options = {}) {
  const getChannels = () => typeof channels === "function" ? channels() : channels;
  const getClients = (channels2 = getChannels()) => cachedMap(channels2, (s) => createBirpc(functions, { ...options, ...s }));
  const broadcastProxy = new Proxy({}, {
    get(_, method) {
      const client = getClients();
      const callbacks = client.map((c) => c[method]);
      const sendCall = (...args) => {
        return Promise.all(callbacks.map((i) => i(...args)));
      };
      sendCall.asEvent = (...args) => {
        callbacks.map((i) => i.asEvent(...args));
      };
      return sendCall;
    }
  });
  function updateChannels(fn) {
    const channels2 = getChannels();
    fn?.(channels2);
    return getClients(channels2);
  }
  getClients();
  return {
    get clients() {
      return getClients();
    },
    functions,
    updateChannels,
    broadcast: broadcastProxy,
    /**
     * @deprecated use `broadcast`
     */
    // @ts-expect-error deprecated
    boardcast: broadcastProxy
  };
}
const urlAlphabet = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";
function nanoid(size = 21) {
  let id = "";
  let i = size;
  while (i--)
    id += urlAlphabet[random() * 64 | 0];
  return id;
}

function createRPCServer(name, ws, functions, options = {}) {
  const event = `${name}:rpc`;
  const group = createBirpcGroup(
    functions,
    () => cachedMap(
      Array.from(ws?.clients || []),
      (channel) => {
        if (channel.socket.readyState === channel.socket.CLOSED)
          return void 0;
        return {
          on: (fn) => {
            function handler(data, source) {
              if (!source.socket)
                throw new Error("source.socket is undefined");
              if (channel.socket === source.socket)
                fn(data, source);
            }
            ws.on(event, handler);
            channel.socket.on("close", () => {
              ws.off(event, handler);
            });
          },
          post: (data) => {
            channel.send(event, data);
          }
        };
      }
    ).filter((c) => !!c),
    options
  );
  ws.on("connection", () => {
    group.updateChannels();
  });
  return group.broadcast;
}

const DIR_DIST = typeof __dirname !== "undefined" ? __dirname : node_path.dirname(node_url.fileURLToPath((typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.src || new URL('index.cjs', document.baseURI).href))));
const DIR_CLIENT = node_path.resolve(DIR_DIST, "../dist/client");

const defaults = Object.freeze({
  ignoreUnknown: false,
  respectType: false,
  respectFunctionNames: false,
  respectFunctionProperties: false,
  unorderedObjects: true,
  unorderedArrays: false,
  unorderedSets: false,
  excludeKeys: void 0,
  excludeValues: void 0,
  replacer: void 0
});
function objectHash(object, options) {
  if (options) {
    options = { ...defaults, ...options };
  } else {
    options = defaults;
  }
  const hasher = createHasher(options);
  hasher.dispatch(object);
  return hasher.toString();
}
const defaultPrototypesKeys = Object.freeze([
  "prototype",
  "__proto__",
  "constructor"
]);
function createHasher(options) {
  let buff = "";
  let context = /* @__PURE__ */ new Map();
  const write = (str) => {
    buff += str;
  };
  return {
    toString() {
      return buff;
    },
    getContext() {
      return context;
    },
    dispatch(value) {
      if (options.replacer) {
        value = options.replacer(value);
      }
      const type = value === null ? "null" : typeof value;
      return this[type](value);
    },
    object(object) {
      if (object && typeof object.toJSON === "function") {
        return this.object(object.toJSON());
      }
      const objString = Object.prototype.toString.call(object);
      let objType = "";
      const objectLength = objString.length;
      if (objectLength < 10) {
        objType = "unknown:[" + objString + "]";
      } else {
        objType = objString.slice(8, objectLength - 1);
      }
      objType = objType.toLowerCase();
      let objectNumber = null;
      if ((objectNumber = context.get(object)) === void 0) {
        context.set(object, context.size);
      } else {
        return this.dispatch("[CIRCULAR:" + objectNumber + "]");
      }
      if (typeof Buffer !== "undefined" && Buffer.isBuffer && Buffer.isBuffer(object)) {
        write("buffer:");
        return write(object.toString("utf8"));
      }
      if (objType !== "object" && objType !== "function" && objType !== "asyncfunction") {
        if (this[objType]) {
          this[objType](object);
        } else if (!options.ignoreUnknown) {
          this.unkown(object, objType);
        }
      } else {
        let keys = Object.keys(object);
        if (options.unorderedObjects) {
          keys = keys.sort();
        }
        let extraKeys = [];
        if (options.respectType !== false && !isNativeFunction(object)) {
          extraKeys = defaultPrototypesKeys;
        }
        if (options.excludeKeys) {
          keys = keys.filter((key) => {
            return !options.excludeKeys(key);
          });
          extraKeys = extraKeys.filter((key) => {
            return !options.excludeKeys(key);
          });
        }
        write("object:" + (keys.length + extraKeys.length) + ":");
        const dispatchForKey = (key) => {
          this.dispatch(key);
          write(":");
          if (!options.excludeValues) {
            this.dispatch(object[key]);
          }
          write(",");
        };
        for (const key of keys) {
          dispatchForKey(key);
        }
        for (const key of extraKeys) {
          dispatchForKey(key);
        }
      }
    },
    array(arr, unordered) {
      unordered = unordered === void 0 ? options.unorderedArrays !== false : unordered;
      write("array:" + arr.length + ":");
      if (!unordered || arr.length <= 1) {
        for (const entry of arr) {
          this.dispatch(entry);
        }
        return;
      }
      const contextAdditions = /* @__PURE__ */ new Map();
      const entries = arr.map((entry) => {
        const hasher = createHasher(options);
        hasher.dispatch(entry);
        for (const [key, value] of hasher.getContext()) {
          contextAdditions.set(key, value);
        }
        return hasher.toString();
      });
      context = contextAdditions;
      entries.sort();
      return this.array(entries, false);
    },
    date(date) {
      return write("date:" + date.toJSON());
    },
    symbol(sym) {
      return write("symbol:" + sym.toString());
    },
    unkown(value, type) {
      write(type);
      if (!value) {
        return;
      }
      write(":");
      if (value && typeof value.entries === "function") {
        return this.array(
          Array.from(value.entries()),
          true
          /* ordered */
        );
      }
    },
    error(err) {
      return write("error:" + err.toString());
    },
    boolean(bool) {
      return write("bool:" + bool);
    },
    string(string) {
      write("string:" + string.length + ":");
      write(string);
    },
    function(fn) {
      write("fn:");
      if (isNativeFunction(fn)) {
        this.dispatch("[native]");
      } else {
        this.dispatch(fn.toString());
      }
      if (options.respectFunctionNames !== false) {
        this.dispatch("function-name:" + String(fn.name));
      }
      if (options.respectFunctionProperties) {
        this.object(fn);
      }
    },
    number(number) {
      return write("number:" + number);
    },
    xml(xml) {
      return write("xml:" + xml.toString());
    },
    null() {
      return write("Null");
    },
    undefined() {
      return write("Undefined");
    },
    regexp(regex) {
      return write("regex:" + regex.toString());
    },
    uint8array(arr) {
      write("uint8array:");
      return this.dispatch(Array.prototype.slice.call(arr));
    },
    uint8clampedarray(arr) {
      write("uint8clampedarray:");
      return this.dispatch(Array.prototype.slice.call(arr));
    },
    int8array(arr) {
      write("int8array:");
      return this.dispatch(Array.prototype.slice.call(arr));
    },
    uint16array(arr) {
      write("uint16array:");
      return this.dispatch(Array.prototype.slice.call(arr));
    },
    int16array(arr) {
      write("int16array:");
      return this.dispatch(Array.prototype.slice.call(arr));
    },
    uint32array(arr) {
      write("uint32array:");
      return this.dispatch(Array.prototype.slice.call(arr));
    },
    int32array(arr) {
      write("int32array:");
      return this.dispatch(Array.prototype.slice.call(arr));
    },
    float32array(arr) {
      write("float32array:");
      return this.dispatch(Array.prototype.slice.call(arr));
    },
    float64array(arr) {
      write("float64array:");
      return this.dispatch(Array.prototype.slice.call(arr));
    },
    arraybuffer(arr) {
      write("arraybuffer:");
      return this.dispatch(new Uint8Array(arr));
    },
    url(url) {
      return write("url:" + url.toString());
    },
    map(map) {
      write("map:");
      const arr = [...map];
      return this.array(arr, options.unorderedSets !== false);
    },
    set(set) {
      write("set:");
      const arr = [...set];
      return this.array(arr, options.unorderedSets !== false);
    },
    file(file) {
      write("file:");
      return this.dispatch([file.name, file.size, file.type, file.lastModfied]);
    },
    blob() {
      if (options.ignoreUnknown) {
        return write("[blob]");
      }
      throw new Error(
        'Hashing Blob objects is currently not supported\nUse "options.replacer" or "options.ignoreUnknown"\n'
      );
    },
    domwindow() {
      return write("domwindow");
    },
    bigint(number) {
      return write("bigint:" + number.toString());
    },
    /* Node.js standard native objects */
    process() {
      return write("process");
    },
    timer() {
      return write("timer");
    },
    pipe() {
      return write("pipe");
    },
    tcp() {
      return write("tcp");
    },
    udp() {
      return write("udp");
    },
    tty() {
      return write("tty");
    },
    statwatcher() {
      return write("statwatcher");
    },
    securecontext() {
      return write("securecontext");
    },
    connection() {
      return write("connection");
    },
    zlib() {
      return write("zlib");
    },
    context() {
      return write("context");
    },
    nodescript() {
      return write("nodescript");
    },
    httpparser() {
      return write("httpparser");
    },
    dataview() {
      return write("dataview");
    },
    signal() {
      return write("signal");
    },
    fsevent() {
      return write("fsevent");
    },
    tlswrap() {
      return write("tlswrap");
    }
  };
}
const nativeFunc = "[native code] }";
const nativeFuncLength = nativeFunc.length;
function isNativeFunction(f) {
  if (typeof f !== "function") {
    return false;
  }
  return Function.prototype.toString.call(f).slice(-nativeFuncLength) === nativeFunc;
}

var __defProp$1$1 = Object.defineProperty;
var __defNormalProp$1$1 = (obj, key, value) => key in obj ? __defProp$1$1(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField$1$1 = (obj, key, value) => {
  __defNormalProp$1$1(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
class WordArray {
  constructor(words, sigBytes) {
    __publicField$1$1(this, "words");
    __publicField$1$1(this, "sigBytes");
    words = this.words = words || [];
    this.sigBytes = sigBytes === void 0 ? words.length * 4 : sigBytes;
  }
  toString(encoder) {
    return (encoder || Hex).stringify(this);
  }
  concat(wordArray) {
    this.clamp();
    if (this.sigBytes % 4) {
      for (let i = 0; i < wordArray.sigBytes; i++) {
        const thatByte = wordArray.words[i >>> 2] >>> 24 - i % 4 * 8 & 255;
        this.words[this.sigBytes + i >>> 2] |= thatByte << 24 - (this.sigBytes + i) % 4 * 8;
      }
    } else {
      for (let j = 0; j < wordArray.sigBytes; j += 4) {
        this.words[this.sigBytes + j >>> 2] = wordArray.words[j >>> 2];
      }
    }
    this.sigBytes += wordArray.sigBytes;
    return this;
  }
  clamp() {
    this.words[this.sigBytes >>> 2] &= 4294967295 << 32 - this.sigBytes % 4 * 8;
    this.words.length = Math.ceil(this.sigBytes / 4);
  }
  clone() {
    return new WordArray([...this.words]);
  }
}
const Hex = {
  stringify(wordArray) {
    const hexChars = [];
    for (let i = 0; i < wordArray.sigBytes; i++) {
      const bite = wordArray.words[i >>> 2] >>> 24 - i % 4 * 8 & 255;
      hexChars.push((bite >>> 4).toString(16), (bite & 15).toString(16));
    }
    return hexChars.join("");
  }
};
const Base64 = {
  stringify(wordArray) {
    const keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const base64Chars = [];
    for (let i = 0; i < wordArray.sigBytes; i += 3) {
      const byte1 = wordArray.words[i >>> 2] >>> 24 - i % 4 * 8 & 255;
      const byte2 = wordArray.words[i + 1 >>> 2] >>> 24 - (i + 1) % 4 * 8 & 255;
      const byte3 = wordArray.words[i + 2 >>> 2] >>> 24 - (i + 2) % 4 * 8 & 255;
      const triplet = byte1 << 16 | byte2 << 8 | byte3;
      for (let j = 0; j < 4 && i * 8 + j * 6 < wordArray.sigBytes * 8; j++) {
        base64Chars.push(keyStr.charAt(triplet >>> 6 * (3 - j) & 63));
      }
    }
    return base64Chars.join("");
  }
};
const Latin1 = {
  parse(latin1Str) {
    const latin1StrLength = latin1Str.length;
    const words = [];
    for (let i = 0; i < latin1StrLength; i++) {
      words[i >>> 2] |= (latin1Str.charCodeAt(i) & 255) << 24 - i % 4 * 8;
    }
    return new WordArray(words, latin1StrLength);
  }
};
const Utf8 = {
  parse(utf8Str) {
    return Latin1.parse(unescape(encodeURIComponent(utf8Str)));
  }
};
class BufferedBlockAlgorithm {
  constructor() {
    __publicField$1$1(this, "_data", new WordArray());
    __publicField$1$1(this, "_nDataBytes", 0);
    __publicField$1$1(this, "_minBufferSize", 0);
    __publicField$1$1(this, "blockSize", 512 / 32);
  }
  reset() {
    this._data = new WordArray();
    this._nDataBytes = 0;
  }
  _append(data) {
    if (typeof data === "string") {
      data = Utf8.parse(data);
    }
    this._data.concat(data);
    this._nDataBytes += data.sigBytes;
  }
  _doProcessBlock(_dataWords, _offset) {
  }
  _process(doFlush) {
    let processedWords;
    let nBlocksReady = this._data.sigBytes / (this.blockSize * 4);
    if (doFlush) {
      nBlocksReady = Math.ceil(nBlocksReady);
    } else {
      nBlocksReady = Math.max((nBlocksReady | 0) - this._minBufferSize, 0);
    }
    const nWordsReady = nBlocksReady * this.blockSize;
    const nBytesReady = Math.min(nWordsReady * 4, this._data.sigBytes);
    if (nWordsReady) {
      for (let offset = 0; offset < nWordsReady; offset += this.blockSize) {
        this._doProcessBlock(this._data.words, offset);
      }
      processedWords = this._data.words.splice(0, nWordsReady);
      this._data.sigBytes -= nBytesReady;
    }
    return new WordArray(processedWords, nBytesReady);
  }
}
class Hasher extends BufferedBlockAlgorithm {
  update(messageUpdate) {
    this._append(messageUpdate);
    this._process();
    return this;
  }
  finalize(messageUpdate) {
    if (messageUpdate) {
      this._append(messageUpdate);
    }
  }
}

var __defProp$2 = Object.defineProperty;
var __defNormalProp$2 = (obj, key, value) => key in obj ? __defProp$2(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField$2 = (obj, key, value) => {
  __defNormalProp$2(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
const H = [
  1779033703,
  -1150833019,
  1013904242,
  -1521486534,
  1359893119,
  -1694144372,
  528734635,
  1541459225
];
const K = [
  1116352408,
  1899447441,
  -1245643825,
  -373957723,
  961987163,
  1508970993,
  -1841331548,
  -1424204075,
  -670586216,
  310598401,
  607225278,
  1426881987,
  1925078388,
  -2132889090,
  -1680079193,
  -1046744716,
  -459576895,
  -272742522,
  264347078,
  604807628,
  770255983,
  1249150122,
  1555081692,
  1996064986,
  -1740746414,
  -1473132947,
  -1341970488,
  -1084653625,
  -958395405,
  -710438585,
  113926993,
  338241895,
  666307205,
  773529912,
  1294757372,
  1396182291,
  1695183700,
  1986661051,
  -2117940946,
  -1838011259,
  -1564481375,
  -1474664885,
  -1035236496,
  -949202525,
  -778901479,
  -694614492,
  -200395387,
  275423344,
  430227734,
  506948616,
  659060556,
  883997877,
  958139571,
  1322822218,
  1537002063,
  1747873779,
  1955562222,
  2024104815,
  -2067236844,
  -1933114872,
  -1866530822,
  -1538233109,
  -1090935817,
  -965641998
];
const W = [];
class SHA256 extends Hasher {
  constructor() {
    super(...arguments);
    __publicField$2(this, "_hash", new WordArray([...H]));
  }
  /**
   * Resets the internal state of the hash object to initial values.
   */
  reset() {
    super.reset();
    this._hash = new WordArray([...H]);
  }
  _doProcessBlock(M, offset) {
    const H2 = this._hash.words;
    let a = H2[0];
    let b = H2[1];
    let c = H2[2];
    let d = H2[3];
    let e = H2[4];
    let f = H2[5];
    let g = H2[6];
    let h = H2[7];
    for (let i = 0; i < 64; i++) {
      if (i < 16) {
        W[i] = M[offset + i] | 0;
      } else {
        const gamma0x = W[i - 15];
        const gamma0 = (gamma0x << 25 | gamma0x >>> 7) ^ (gamma0x << 14 | gamma0x >>> 18) ^ gamma0x >>> 3;
        const gamma1x = W[i - 2];
        const gamma1 = (gamma1x << 15 | gamma1x >>> 17) ^ (gamma1x << 13 | gamma1x >>> 19) ^ gamma1x >>> 10;
        W[i] = gamma0 + W[i - 7] + gamma1 + W[i - 16];
      }
      const ch = e & f ^ ~e & g;
      const maj = a & b ^ a & c ^ b & c;
      const sigma0 = (a << 30 | a >>> 2) ^ (a << 19 | a >>> 13) ^ (a << 10 | a >>> 22);
      const sigma1 = (e << 26 | e >>> 6) ^ (e << 21 | e >>> 11) ^ (e << 7 | e >>> 25);
      const t1 = h + sigma1 + ch + K[i] + W[i];
      const t2 = sigma0 + maj;
      h = g;
      g = f;
      f = e;
      e = d + t1 | 0;
      d = c;
      c = b;
      b = a;
      a = t1 + t2 | 0;
    }
    H2[0] = H2[0] + a | 0;
    H2[1] = H2[1] + b | 0;
    H2[2] = H2[2] + c | 0;
    H2[3] = H2[3] + d | 0;
    H2[4] = H2[4] + e | 0;
    H2[5] = H2[5] + f | 0;
    H2[6] = H2[6] + g | 0;
    H2[7] = H2[7] + h | 0;
  }
  /**
   * Finishes the hash calculation and returns the hash as a WordArray.
   *
   * @param {string} messageUpdate - Additional message content to include in the hash.
   * @returns {WordArray} The finalised hash as a WordArray.
   */
  finalize(messageUpdate) {
    super.finalize(messageUpdate);
    const nBitsTotal = this._nDataBytes * 8;
    const nBitsLeft = this._data.sigBytes * 8;
    this._data.words[nBitsLeft >>> 5] |= 128 << 24 - nBitsLeft % 32;
    this._data.words[(nBitsLeft + 64 >>> 9 << 4) + 14] = Math.floor(
      nBitsTotal / 4294967296
    );
    this._data.words[(nBitsLeft + 64 >>> 9 << 4) + 15] = nBitsTotal;
    this._data.sigBytes = this._data.words.length * 4;
    this._process();
    return this._hash;
  }
}
function sha256base64(message) {
  return new SHA256().finalize(message).toString(Base64);
}

function hash(object, options = {}) {
  const hashed = typeof object === "string" ? object : objectHash(object, options);
  return sha256base64(hashed).slice(0, 10);
}

const DUMMY_LOAD_PLUGIN_NAME = "__load__";

async function generateBuild(ctx, config) {
  const {
    outputDir = ".vite-inspect"
  } = ctx.options;
  const targetDir = node_path.isAbsolute(outputDir) ? outputDir : node_path.resolve(config.root, outputDir);
  const reportsDir = node_path.join(targetDir, "reports");
  await fs__default.emptyDir(targetDir);
  await fs__default.ensureDir(reportsDir);
  await fs__default.copy(DIR_CLIENT, targetDir);
  const isVirtual = (pluginName, transformName) => pluginName !== DUMMY_LOAD_PLUGIN_NAME && transformName !== "vite:load-fallback";
  function list() {
    return {
      root: config.root,
      modules: ctx.getModulesInfo(ctx.recorderClient, null, isVirtual),
      ssrModules: ctx.getModulesInfo(ctx.recorderServer, null, isVirtual)
    };
  }
  async function dumpModuleInfo(dir, recorder, ssr = false) {
    await fs__default.ensureDir(dir);
    return Promise.all(
      Object.entries(recorder.transform).map(
        ([id, info]) => fs__default.writeJSON(
          node_path.join(dir, `${hash(id)}.json`),
          {
            resolvedId: ctx.resolveId(id, ssr),
            transforms: info
          },
          { spaces: 2 }
        )
      )
    );
  }
  await Promise.all([
    fs__default.writeFile(
      node_path.join(targetDir, "index.html"),
      (await fs__default.readFile(node_path.join(targetDir, "index.html"), "utf-8")).replace(
        'data-vite-inspect-mode="DEV"',
        'data-vite-inspect-mode="BUILD"'
      )
    ),
    fs__default.writeJSON(
      node_path.join(reportsDir, "list.json"),
      list(),
      { spaces: 2 }
    ),
    fs__default.writeJSON(
      node_path.join(reportsDir, "metrics.json"),
      ctx.getPluginMetrics(false),
      { spaces: 2 }
    ),
    fs__default.writeJSON(
      node_path.join(reportsDir, "metrics-ssr.json"),
      ctx.getPluginMetrics(true),
      { spaces: 2 }
    ),
    dumpModuleInfo(node_path.join(reportsDir, "transform"), ctx.recorderClient),
    dumpModuleInfo(node_path.join(reportsDir, "transform-ssr"), ctx.recorderServer, true)
  ]);
  return targetDir;
}

var __defProp$1 = Object.defineProperty;
var __defNormalProp$1 = (obj, key, value) => key in obj ? __defProp$1(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField$1 = (obj, key, value) => {
  __defNormalProp$1(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
class Recorder {
  constructor(context) {
    this.context = context;
    __publicField$1(this, "transform", {});
    __publicField$1(this, "resolveId", {});
    __publicField$1(this, "transformCounter", {});
    this.context = context;
  }
  recordTransform(id, info, preTransformCode) {
    id = this.context.normalizeId(id);
    if (!this.transform[id] || !this.transform[id].some((tr) => tr.result)) {
      this.transform[id] = [{
        name: DUMMY_LOAD_PLUGIN_NAME,
        result: preTransformCode,
        start: info.start,
        end: info.start,
        sourcemaps: info.sourcemaps
      }];
      this.transformCounter[id] = (this.transformCounter[id] || 0) + 1;
    }
    this.transform[id].push(info);
  }
  recordLoad(id, info) {
    id = this.context.normalizeId(id);
    this.transform[id] = [info];
    this.transformCounter[id] = (this.transformCounter[id] || 0) + 1;
  }
  recordResolveId(id, info) {
    id = this.context.normalizeId(id);
    if (!this.resolveId[id])
      this.resolveId[id] = [];
    this.resolveId[id].push(info);
  }
  invalidate(id) {
    id = this.context.normalizeId(id);
    delete this.transform[id];
  }
}

async function openBrowser(address) {
  await import('open').then((r) => r.default(address, { newInstance: true })).catch(() => {
  });
}
function removeVersionQuery(url) {
  if (url.includes("v=")) {
    return url.replace(/&v=\w+/, "").replace(/\?v=\w+/, "?").replace(/\?$/, "");
  }
  return url;
}

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
class ViteInspectContext {
  constructor(options) {
    this.options = options;
    __publicField(this, "filter");
    __publicField(this, "config");
    __publicField(this, "recorderClient");
    __publicField(this, "recorderServer");
    this.filter = pluginutils.createFilter(options.include, options.exclude);
    this.recorderClient = new Recorder(this);
    this.recorderServer = new Recorder(this);
  }
  normalizeId(id) {
    if (this.options.removeVersionQuery !== false)
      return removeVersionQuery(id);
    return id;
  }
  getRecorder(ssr) {
    return ssr ? this.recorderServer : this.recorderClient;
  }
  resolveId(id = "", ssr = false) {
    if (id.startsWith("./"))
      id = node_path.resolve(this.config.root, id).replace(/\\/g, "/");
    return this.resolveIdRecursive(id, ssr);
  }
  resolveIdRecursive(id, ssr = false) {
    const rec = this.getRecorder(ssr);
    const resolved = rec.resolveId[id]?.[0]?.result;
    return resolved ? this.resolveIdRecursive(resolved, ssr) : id;
  }
  getList(server) {
    const isVirtual = (pluginName) => pluginName !== DUMMY_LOAD_PLUGIN_NAME;
    const getDeps = (id) => Array.from(server.moduleGraph.getModuleById(id)?.importedModules || []).map((i) => i.id || "").filter(Boolean);
    return {
      root: this.config.root,
      modules: this.getModulesInfo(this.recorderClient, getDeps, isVirtual),
      ssrModules: this.getModulesInfo(this.recorderServer, getDeps, isVirtual)
    };
  }
  getModulesInfo(recorder, getDeps, isVirtual) {
    function transformIdMap(recorder2) {
      return Object.values(recorder2.resolveId).reduce((map, ids2) => {
        ids2.forEach((id) => {
          var _a;
          map[_a = id.result] ?? (map[_a] = []);
          map[id.result].push(id);
        });
        return map;
      }, {});
    }
    const transformedIdMap = transformIdMap(recorder);
    const ids = new Set(Object.keys(recorder.transform).concat(Object.keys(transformedIdMap)));
    return Array.from(ids).sort().map((id) => {
      let totalTime = 0;
      const plugins = (recorder.transform[id] || []).filter((tr) => tr.result).map((transItem) => {
        const delta = transItem.end - transItem.start;
        totalTime += delta;
        return { name: transItem.name, transform: delta };
      }).concat(
        // @ts-expect-error transform is optional
        (transformedIdMap[id] || []).map((idItem) => {
          return { name: idItem.name, resolveId: idItem.end - idItem.start };
        })
      );
      function getSize(str) {
        if (!str)
          return 0;
        return node_buffer.Buffer.byteLength(str, "utf8");
      }
      return {
        id,
        deps: getDeps ? getDeps(id) : [],
        plugins,
        virtual: isVirtual(plugins[0]?.name || "", recorder.transform[id]?.[0].name || ""),
        totalTime,
        invokeCount: recorder.transformCounter?.[id] || 0,
        sourceSize: getSize(recorder.transform[id]?.[0]?.result),
        distSize: getSize(recorder.transform[id]?.[recorder.transform[id].length - 1]?.result)
      };
    });
  }
  getPluginMetrics(ssr = false) {
    const map = {};
    const defaultMetricInfo = () => ({
      transform: { invokeCount: 0, totalTime: 0 },
      resolveId: { invokeCount: 0, totalTime: 0 }
    });
    this.config.plugins.forEach((i) => {
      map[i.name] = {
        ...defaultMetricInfo(),
        name: i.name,
        enforce: i.enforce
      };
    });
    const recorder = this.getRecorder(ssr);
    Object.values(recorder.transform).forEach((transformInfos) => {
      transformInfos.forEach(({ name, start, end }) => {
        if (name === DUMMY_LOAD_PLUGIN_NAME)
          return;
        if (!map[name])
          map[name] = { ...defaultMetricInfo(), name };
        map[name].transform.totalTime += end - start;
        map[name].transform.invokeCount += 1;
      });
    });
    Object.values(recorder.resolveId).forEach((resolveIdInfos) => {
      resolveIdInfos.forEach(({ name, start, end }) => {
        if (!map[name])
          map[name] = { ...defaultMetricInfo(), name };
        map[name].resolveId.totalTime += end - start;
        map[name].resolveId.invokeCount += 1;
      });
    });
    const metrics = Object.values(map).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));
    return metrics;
  }
}

const debug = Debug__default("vite-plugin-inspect");
function hijackHook(plugin, name, wrapper) {
  if (!plugin[name])
    return;
  debug(`hijack plugin "${name}"`, plugin.name);
  let order = plugin.order || plugin.enforce || "normal";
  const hook = plugin[name];
  if ("handler" in hook) {
    const oldFn = hook.handler;
    order += `-${hook.order || hook.enforce || "normal"}`;
    hook.handler = function(...args) {
      return wrapper(oldFn, this, args, order);
    };
  } else if ("transform" in hook) {
    const oldFn = hook.transform;
    order += `-${hook.order || hook.enforce || "normal"}`;
    hook.transform = function(...args) {
      return wrapper(oldFn, this, args, order);
    };
  } else {
    const oldFn = hook;
    plugin[name] = function(...args) {
      return wrapper(oldFn, this, args, order);
    };
  }
}
function hijackPlugin(plugin, ctx) {
  hijackHook(plugin, "transform", async (fn, context, args, order) => {
    const code = args[0];
    const id = args[1];
    const ssr = args[2]?.ssr;
    let _result;
    let error;
    const start = Date.now();
    try {
      _result = await fn.apply(context, args);
    } catch (_err) {
      error = _err;
    }
    const end = Date.now();
    const result = error ? "[Error]" : typeof _result === "string" ? _result : _result?.code;
    if (ctx.filter(id)) {
      const sourcemaps = typeof _result === "string" ? null : _result?.map;
      const rec = ctx.getRecorder(ssr);
      rec.recordTransform(id, {
        name: plugin.name,
        result,
        start,
        end,
        order,
        sourcemaps,
        error: error ? parseError(error) : void 0
      }, code);
    }
    if (error)
      throw error;
    return _result;
  });
  hijackHook(plugin, "load", async (fn, context, args) => {
    const id = args[0];
    const ssr = args[1]?.ssr;
    let _result;
    let error;
    const start = Date.now();
    try {
      _result = await fn.apply(context, args);
    } catch (err) {
      error = err;
    }
    const end = Date.now();
    const result = error ? "[Error]" : typeof _result === "string" ? _result : _result?.code;
    const sourcemaps = typeof _result === "string" ? null : _result?.map;
    if (result) {
      ctx.getRecorder(ssr).recordLoad(id, {
        name: plugin.name,
        result,
        start,
        end,
        sourcemaps,
        error: error ? parseError(error) : void 0
      });
    }
    if (error)
      throw error;
    return _result;
  });
  hijackHook(plugin, "resolveId", async (fn, context, args) => {
    const id = args[0];
    const ssr = args[2]?.ssr;
    let _result;
    let error;
    const start = Date.now();
    try {
      _result = await fn.apply(context, args);
    } catch (err) {
      error = err;
    }
    const end = Date.now();
    if (!ctx.filter(id)) {
      if (error)
        throw error;
      return _result;
    }
    const result = error ? stringifyError(error) : typeof _result === "object" ? _result?.id : _result;
    if (result && result !== id) {
      ctx.getRecorder(ssr).recordResolveId(id, {
        name: plugin.name,
        result,
        start,
        end,
        error
      });
    }
    if (error)
      throw error;
    return _result;
  });
}
function parseError(error) {
  const stack = errorStackParserEs.parse(error, { allowEmpty: true });
  const message = error.message || String(error);
  return {
    message,
    stack,
    raw: error
  };
}
function stringifyError(err) {
  return String(err.stack ? err.stack : err);
}

function createPreviewServer(staticPath) {
  const server = node_http.createServer();
  const statics = sirv__default(staticPath);
  server.on("request", (req, res) => {
    statics(req, res, () => {
      res.statusCode = 404;
      res.end("File not found");
    });
  });
  server.listen(0, () => {
    const { port } = server.address();
    const url = `http://localhost:${port}`;
    console.log(`  ${c__default.green("\u279C")}  ${c__default.bold("Inspect Preview Started")}: ${url}`);
    openBrowser(url);
  });
}

const NAME = "vite-plugin-inspect";
const isCI = !!process__default.env.CI;
function PluginInspect(options = {}) {
  const {
    dev = true,
    build = false,
    silent = false,
    open: _open = false
  } = options;
  if (!dev && !build) {
    return {
      name: NAME
    };
  }
  const ctx = new ViteInspectContext(options);
  const timestampRE = /\bt=\d{13}&?\b/;
  const trailingSeparatorRE = /[?&]$/;
  let config;
  const serverPerf = {
    middleware: {}
  };
  function setupMiddlewarePerf(middlewares) {
    let firstMiddlewareIndex = -1;
    middlewares.forEach((middleware, index) => {
      const { handle: originalHandle } = middleware;
      if (typeof originalHandle !== "function" || !originalHandle.name)
        return middleware;
      middleware.handle = (...middlewareArgs) => {
        var _a;
        let req;
        if (middlewareArgs.length === 4)
          [, req] = middlewareArgs;
        else
          [req] = middlewareArgs;
        const start = Date.now();
        const url = req.url?.replace(timestampRE, "").replace(trailingSeparatorRE, "");
        (_a = serverPerf.middleware)[url] ?? (_a[url] = []);
        if (firstMiddlewareIndex < 0)
          firstMiddlewareIndex = index;
        if (index === firstMiddlewareIndex)
          serverPerf.middleware[url] = [];
        const result = originalHandle(...middlewareArgs);
        Promise.resolve(result).then(() => {
          const total = Date.now() - start;
          const metrics = serverPerf.middleware[url];
          serverPerf.middleware[url].push({
            self: metrics.length ? Math.max(total - metrics[metrics.length - 1].total, 0) : total,
            total,
            name: originalHandle.name
          });
        });
        return result;
      };
      Object.defineProperty(middleware.handle, "name", {
        value: originalHandle.name,
        configurable: true,
        enumerable: true
      });
      return middleware;
    });
  }
  function configureServer(server) {
    const _invalidateModule = server.moduleGraph.invalidateModule;
    server.moduleGraph.invalidateModule = function(...args) {
      const mod = args[0];
      if (mod?.id) {
        ctx.recorderClient.invalidate(mod.id);
        ctx.recorderServer.invalidate(mod.id);
      }
      return _invalidateModule.apply(this, args);
    };
    const base = (options.base ?? server.config.base) || "/";
    server.middlewares.use(`${base}__inspect`, sirv__default(DIR_CLIENT, {
      single: true,
      dev: true
    }));
    const rpcFunctions = {
      list: () => ctx.getList(server),
      getIdInfo,
      getPluginMetrics: (ssr = false) => ctx.getPluginMetrics(ssr),
      getServerMetrics,
      resolveId: (id, ssr = false) => ctx.resolveId(id, ssr),
      clear: clearId,
      moduleUpdated: () => {
      }
    };
    const rpcServer = createRPCServer("vite-plugin-inspect", server.ws, rpcFunctions);
    const debouncedModuleUpdated = perfectDebounce.debounce(() => {
      rpcServer.moduleUpdated.asEvent();
    }, 100);
    server.middlewares.use((req, res, next) => {
      debouncedModuleUpdated();
      next();
    });
    function getServerMetrics() {
      return serverPerf || {};
    }
    async function getIdInfo(id, ssr = false, clear = false) {
      if (clear) {
        clearId(id, ssr);
        try {
          await server.transformRequest(id, { ssr });
        } catch {
        }
      }
      const resolvedId = ctx.resolveId(id, ssr);
      const recorder = ctx.getRecorder(ssr);
      return {
        resolvedId,
        transforms: recorder.transform[resolvedId] || []
      };
    }
    function clearId(_id, ssr = false) {
      const id = ctx.resolveId(_id);
      if (id) {
        const mod = server.moduleGraph.getModuleById(id);
        if (mod)
          server.moduleGraph.invalidateModule(mod);
        ctx.getRecorder(ssr).invalidate(id);
      }
    }
    const _print = server.printUrls;
    server.printUrls = () => {
      let host = `${config.server.https ? "https" : "http"}://localhost:${config.server.port || "80"}`;
      const url = server.resolvedUrls?.local[0];
      if (url) {
        try {
          const u = new URL(url);
          host = `${u.protocol}//${u.host}`;
        } catch (error) {
          config.logger.warn(`Parse resolved url failed: ${error}`);
        }
      }
      _print();
      if (!silent) {
        const colorUrl = (url2) => c__default.green(url2.replace(/:(\d+)\//, (_, port) => `:${c__default.bold(port)}/`));
        config.logger.info(`  ${c__default.green("\u279C")}  ${c__default.bold("Inspect")}: ${colorUrl(`${host}${base}__inspect/`)}`);
      }
      if (_open && !isCI) {
        setTimeout(() => {
          openBrowser(`${host}${base}__inspect/`);
        }, 500);
      }
    };
    return rpcFunctions;
  }
  const plugin = {
    name: NAME,
    enforce: "pre",
    apply(_, { command }) {
      if (command === "serve" && dev)
        return true;
      if (command === "build" && build)
        return true;
      return false;
    },
    configResolved(_config) {
      config = ctx.config = _config;
      config.plugins.forEach((plugin2) => hijackPlugin(plugin2, ctx));
      const _createResolver = config.createResolver;
      config.createResolver = function(...args) {
        const _resolver = _createResolver.apply(this, args);
        return async function(...args2) {
          const id = args2[0];
          const aliasOnly = args2[2];
          const ssr = args2[3];
          const start = Date.now();
          const result = await _resolver.apply(this, args2);
          const end = Date.now();
          if (result && result !== id) {
            const pluginName = aliasOnly ? "alias" : "vite:resolve (+alias)";
            ctx.getRecorder(ssr).recordResolveId(id, { name: pluginName, result, start, end });
          }
          return result;
        };
      };
    },
    configureServer(server) {
      const rpc = configureServer(server);
      plugin.api = {
        rpc
      };
      return () => {
        setupMiddlewarePerf(server.middlewares.stack);
      };
    },
    load: {
      order: "pre",
      handler(id, { ssr } = {}) {
        ctx.getRecorder(ssr).invalidate(id);
        return null;
      }
    },
    handleHotUpdate({ modules, server }) {
      const ids = modules.map((module) => module.id);
      server.ws.send({
        type: "custom",
        event: "vite-plugin-inspect:update",
        data: { ids }
      });
    },
    async buildEnd() {
      if (!build)
        return;
      const dir = await generateBuild(ctx, config);
      config.logger.info(`${c__default.green("Inspect report generated at")}  ${c__default.dim(`${dir}`)}`);
      if (_open && !isCI)
        createPreviewServer(dir);
    }
  };
  return plugin;
}
PluginInspect.getViteInspectAPI = function(plugins) {
  return plugins.find((p) => p.name === NAME)?.api;
};

exports.default = PluginInspect;
