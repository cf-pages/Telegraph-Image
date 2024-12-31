(function () {
    'use strict';

    /**
     * @license
     * Copyright 2019 Google LLC
     * SPDX-License-Identifier: Apache-2.0
     */
    const proxyMarker = Symbol("Comlink.proxy");
    const createEndpoint = Symbol("Comlink.endpoint");
    const releaseProxy = Symbol("Comlink.releaseProxy");
    const finalizer = Symbol("Comlink.finalizer");
    const throwMarker = Symbol("Comlink.thrown");
    const isObject = (val) => (typeof val === "object" && val !== null) || typeof val === "function";
    /**
     * Internal transfer handle to handle objects marked to proxy.
     */
    const proxyTransferHandler = {
        canHandle: (val) => isObject(val) && val[proxyMarker],
        serialize(obj) {
            const { port1, port2 } = new MessageChannel();
            expose(obj, port1);
            return [port2, [port2]];
        },
        deserialize(port) {
            port.start();
            return wrap(port);
        },
    };
    /**
     * Internal transfer handler to handle thrown exceptions.
     */
    const throwTransferHandler = {
        canHandle: (value) => isObject(value) && throwMarker in value,
        serialize({ value }) {
            let serialized;
            if (value instanceof Error) {
                serialized = {
                    isError: true,
                    value: {
                        message: value.message,
                        name: value.name,
                        stack: value.stack,
                    },
                };
            }
            else {
                serialized = { isError: false, value };
            }
            return [serialized, []];
        },
        deserialize(serialized) {
            if (serialized.isError) {
                throw Object.assign(new Error(serialized.value.message), serialized.value);
            }
            throw serialized.value;
        },
    };
    /**
     * Allows customizing the serialization of certain values.
     */
    const transferHandlers = new Map([
        ["proxy", proxyTransferHandler],
        ["throw", throwTransferHandler],
    ]);
    function isAllowedOrigin(allowedOrigins, origin) {
        for (const allowedOrigin of allowedOrigins) {
            if (origin === allowedOrigin || allowedOrigin === "*") {
                return true;
            }
            if (allowedOrigin instanceof RegExp && allowedOrigin.test(origin)) {
                return true;
            }
        }
        return false;
    }
    function expose(obj, ep = globalThis, allowedOrigins = ["*"]) {
        ep.addEventListener("message", function callback(ev) {
            if (!ev || !ev.data) {
                return;
            }
            if (!isAllowedOrigin(allowedOrigins, ev.origin)) {
                console.warn(`Invalid origin '${ev.origin}' for comlink proxy`);
                return;
            }
            const { id, type, path } = Object.assign({ path: [] }, ev.data);
            const argumentList = (ev.data.argumentList || []).map(fromWireValue);
            let returnValue;
            try {
                const parent = path.slice(0, -1).reduce((obj, prop) => obj[prop], obj);
                const rawValue = path.reduce((obj, prop) => obj[prop], obj);
                switch (type) {
                    case "GET" /* MessageType.GET */:
                        {
                            returnValue = rawValue;
                        }
                        break;
                    case "SET" /* MessageType.SET */:
                        {
                            parent[path.slice(-1)[0]] = fromWireValue(ev.data.value);
                            returnValue = true;
                        }
                        break;
                    case "APPLY" /* MessageType.APPLY */:
                        {
                            returnValue = rawValue.apply(parent, argumentList);
                        }
                        break;
                    case "CONSTRUCT" /* MessageType.CONSTRUCT */:
                        {
                            const value = new rawValue(...argumentList);
                            returnValue = proxy(value);
                        }
                        break;
                    case "ENDPOINT" /* MessageType.ENDPOINT */:
                        {
                            const { port1, port2 } = new MessageChannel();
                            expose(obj, port2);
                            returnValue = transfer(port1, [port1]);
                        }
                        break;
                    case "RELEASE" /* MessageType.RELEASE */:
                        {
                            returnValue = undefined;
                        }
                        break;
                    default:
                        return;
                }
            }
            catch (value) {
                returnValue = { value, [throwMarker]: 0 };
            }
            Promise.resolve(returnValue)
                .catch((value) => {
                return { value, [throwMarker]: 0 };
            })
                .then((returnValue) => {
                const [wireValue, transferables] = toWireValue(returnValue);
                ep.postMessage(Object.assign(Object.assign({}, wireValue), { id }), transferables);
                if (type === "RELEASE" /* MessageType.RELEASE */) {
                    // detach and deactive after sending release response above.
                    ep.removeEventListener("message", callback);
                    closeEndPoint(ep);
                    if (finalizer in obj && typeof obj[finalizer] === "function") {
                        obj[finalizer]();
                    }
                }
            })
                .catch((error) => {
                // Send Serialization Error To Caller
                const [wireValue, transferables] = toWireValue({
                    value: new TypeError("Unserializable return value"),
                    [throwMarker]: 0,
                });
                ep.postMessage(Object.assign(Object.assign({}, wireValue), { id }), transferables);
            });
        });
        if (ep.start) {
            ep.start();
        }
    }
    function isMessagePort(endpoint) {
        return endpoint.constructor.name === "MessagePort";
    }
    function closeEndPoint(endpoint) {
        if (isMessagePort(endpoint))
            endpoint.close();
    }
    function wrap(ep, target) {
        const pendingListeners = new Map();
        ep.addEventListener("message", function handleMessage(ev) {
            const { data } = ev;
            if (!data || !data.id) {
                return;
            }
            const resolver = pendingListeners.get(data.id);
            if (!resolver) {
                return;
            }
            try {
                resolver(data);
            }
            finally {
                pendingListeners.delete(data.id);
            }
        });
        return createProxy(ep, pendingListeners, [], target);
    }
    function throwIfProxyReleased(isReleased) {
        if (isReleased) {
            throw new Error("Proxy has been released and is not useable");
        }
    }
    function releaseEndpoint(ep) {
        return requestResponseMessage(ep, new Map(), {
            type: "RELEASE" /* MessageType.RELEASE */,
        }).then(() => {
            closeEndPoint(ep);
        });
    }
    const proxyCounter = new WeakMap();
    const proxyFinalizers = "FinalizationRegistry" in globalThis &&
        new FinalizationRegistry((ep) => {
            const newCount = (proxyCounter.get(ep) || 0) - 1;
            proxyCounter.set(ep, newCount);
            if (newCount === 0) {
                releaseEndpoint(ep);
            }
        });
    function registerProxy(proxy, ep) {
        const newCount = (proxyCounter.get(ep) || 0) + 1;
        proxyCounter.set(ep, newCount);
        if (proxyFinalizers) {
            proxyFinalizers.register(proxy, ep, proxy);
        }
    }
    function unregisterProxy(proxy) {
        if (proxyFinalizers) {
            proxyFinalizers.unregister(proxy);
        }
    }
    function createProxy(ep, pendingListeners, path = [], target = function () { }) {
        let isProxyReleased = false;
        const proxy = new Proxy(target, {
            get(_target, prop) {
                throwIfProxyReleased(isProxyReleased);
                if (prop === releaseProxy) {
                    return () => {
                        unregisterProxy(proxy);
                        releaseEndpoint(ep);
                        pendingListeners.clear();
                        isProxyReleased = true;
                    };
                }
                if (prop === "then") {
                    if (path.length === 0) {
                        return { then: () => proxy };
                    }
                    const r = requestResponseMessage(ep, pendingListeners, {
                        type: "GET" /* MessageType.GET */,
                        path: path.map((p) => p.toString()),
                    }).then(fromWireValue);
                    return r.then.bind(r);
                }
                return createProxy(ep, pendingListeners, [...path, prop]);
            },
            set(_target, prop, rawValue) {
                throwIfProxyReleased(isProxyReleased);
                // FIXME: ES6 Proxy Handler `set` methods are supposed to return a
                // boolean. To show good will, we return true asynchronously ¯\_(ツ)_/¯
                const [value, transferables] = toWireValue(rawValue);
                return requestResponseMessage(ep, pendingListeners, {
                    type: "SET" /* MessageType.SET */,
                    path: [...path, prop].map((p) => p.toString()),
                    value,
                }, transferables).then(fromWireValue);
            },
            apply(_target, _thisArg, rawArgumentList) {
                throwIfProxyReleased(isProxyReleased);
                const last = path[path.length - 1];
                if (last === createEndpoint) {
                    return requestResponseMessage(ep, pendingListeners, {
                        type: "ENDPOINT" /* MessageType.ENDPOINT */,
                    }).then(fromWireValue);
                }
                // We just pretend that `bind()` didn’t happen.
                if (last === "bind") {
                    return createProxy(ep, pendingListeners, path.slice(0, -1));
                }
                const [argumentList, transferables] = processArguments(rawArgumentList);
                return requestResponseMessage(ep, pendingListeners, {
                    type: "APPLY" /* MessageType.APPLY */,
                    path: path.map((p) => p.toString()),
                    argumentList,
                }, transferables).then(fromWireValue);
            },
            construct(_target, rawArgumentList) {
                throwIfProxyReleased(isProxyReleased);
                const [argumentList, transferables] = processArguments(rawArgumentList);
                return requestResponseMessage(ep, pendingListeners, {
                    type: "CONSTRUCT" /* MessageType.CONSTRUCT */,
                    path: path.map((p) => p.toString()),
                    argumentList,
                }, transferables).then(fromWireValue);
            },
        });
        registerProxy(proxy, ep);
        return proxy;
    }
    function myFlat(arr) {
        return Array.prototype.concat.apply([], arr);
    }
    function processArguments(argumentList) {
        const processed = argumentList.map(toWireValue);
        return [processed.map((v) => v[0]), myFlat(processed.map((v) => v[1]))];
    }
    const transferCache = new WeakMap();
    function transfer(obj, transfers) {
        transferCache.set(obj, transfers);
        return obj;
    }
    function proxy(obj) {
        return Object.assign(obj, { [proxyMarker]: true });
    }
    function toWireValue(value) {
        for (const [name, handler] of transferHandlers) {
            if (handler.canHandle(value)) {
                const [serializedValue, transferables] = handler.serialize(value);
                return [
                    {
                        type: "HANDLER" /* WireValueType.HANDLER */,
                        name,
                        value: serializedValue,
                    },
                    transferables,
                ];
            }
        }
        return [
            {
                type: "RAW" /* WireValueType.RAW */,
                value,
            },
            transferCache.get(value) || [],
        ];
    }
    function fromWireValue(value) {
        switch (value.type) {
            case "HANDLER" /* WireValueType.HANDLER */:
                return transferHandlers.get(value.name).deserialize(value.value);
            case "RAW" /* WireValueType.RAW */:
                return value.value;
        }
    }
    function requestResponseMessage(ep, pendingListeners, msg, transfers) {
        return new Promise((resolve) => {
            const id = generateUUID();
            pendingListeners.set(id, resolve);
            if (ep.start) {
                ep.start();
            }
            ep.postMessage(Object.assign({ id }, msg), transfers);
        });
    }
    function generateUUID() {
        return new Array(4)
            .fill(0)
            .map(() => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16))
            .join("-");
    }

    const defaultOptions = /* @__PURE__ */ Object.freeze({
      diffTimeout: 1,
      diffEditCost: 4,
      matchThreshold: 0.5,
      matchDistance: 1e3,
      patchDeleteThreshold: 0.5,
      patchMargin: 4,
      matchMaxBits: 32
    });
    function resolveOptions(options) {
      if (options?.__resolved)
        return options;
      const resolved = {
        ...defaultOptions,
        ...options
      };
      Object.defineProperty(resolved, "__resolved", { value: true, enumerable: false });
      return resolved;
    }

    const DIFF_DELETE = -1;
    const DIFF_INSERT = 1;
    const DIFF_EQUAL = 0;
    function createDiff(op, text) {
      return [op, text];
    }
    function diffMain(text1, text2, options, opt_checklines = true, opt_deadline) {
      const resolved = resolveOptions(options);
      if (typeof opt_deadline == "undefined") {
        if (resolved.diffTimeout <= 0)
          opt_deadline = Number.MAX_VALUE;
        else
          opt_deadline = (/* @__PURE__ */ new Date()).getTime() + resolved.diffTimeout * 1e3;
      }
      const deadline = opt_deadline;
      if (text1 == null || text2 == null)
        throw new Error("Null input. (diff_main)");
      if (text1 === text2) {
        if (text1)
          return [createDiff(DIFF_EQUAL, text1)];
        return [];
      }
      const checklines = opt_checklines;
      let commonlength = diffCommonPrefix(text1, text2);
      const commonprefix = text1.substring(0, commonlength);
      text1 = text1.substring(commonlength);
      text2 = text2.substring(commonlength);
      commonlength = diffCommonSuffix(text1, text2);
      const commonsuffix = text1.substring(text1.length - commonlength);
      text1 = text1.substring(0, text1.length - commonlength);
      text2 = text2.substring(0, text2.length - commonlength);
      const diffs = diffCompute(text1, text2, resolved, checklines, deadline);
      if (commonprefix)
        diffs.unshift(createDiff(DIFF_EQUAL, commonprefix));
      if (commonsuffix)
        diffs.push(createDiff(DIFF_EQUAL, commonsuffix));
      diffCleanupMerge(diffs);
      return diffs;
    }
    function diffCompute(text1, text2, options, checklines, deadline) {
      let diffs;
      if (!text1) {
        return [createDiff(DIFF_INSERT, text2)];
      }
      if (!text2) {
        return [createDiff(DIFF_DELETE, text1)];
      }
      const longtext = text1.length > text2.length ? text1 : text2;
      const shorttext = text1.length > text2.length ? text2 : text1;
      const i = longtext.indexOf(shorttext);
      if (i !== -1) {
        diffs = [createDiff(DIFF_INSERT, longtext.substring(0, i)), createDiff(DIFF_EQUAL, shorttext), createDiff(DIFF_INSERT, longtext.substring(i + shorttext.length))];
        if (text1.length > text2.length)
          diffs[0][0] = diffs[2][0] = DIFF_DELETE;
        return diffs;
      }
      if (shorttext.length === 1) {
        return [createDiff(DIFF_DELETE, text1), createDiff(DIFF_INSERT, text2)];
      }
      const hm = diffHalfMatch(text1, text2, options);
      if (hm) {
        const text1_a = hm[0];
        const text1_b = hm[1];
        const text2_a = hm[2];
        const text2_b = hm[3];
        const mid_common = hm[4];
        const diffs_a = diffMain(text1_a, text2_a, options, checklines, deadline);
        const diffs_b = diffMain(text1_b, text2_b, options, checklines, deadline);
        return diffs_a.concat([createDiff(DIFF_EQUAL, mid_common)], diffs_b);
      }
      if (checklines && text1.length > 100 && text2.length > 100)
        return diffLineMode(text1, text2, options, deadline);
      return diffBisect(text1, text2, options, deadline);
    }
    function diffLineMode(text1, text2, options, deadline) {
      const a = diffLinesToChars(text1, text2);
      text1 = a.chars1;
      text2 = a.chars2;
      const linearray = a.lineArray;
      const diffs = diffMain(text1, text2, options, false, deadline);
      diffCharsToLines(diffs, linearray);
      diffCleanupSemantic(diffs);
      diffs.push(createDiff(DIFF_EQUAL, ""));
      let pointer = 0;
      let count_delete = 0;
      let count_insert = 0;
      let text_delete = "";
      let text_insert = "";
      while (pointer < diffs.length) {
        switch (diffs[pointer][0]) {
          case DIFF_INSERT:
            count_insert++;
            text_insert += diffs[pointer][1];
            break;
          case DIFF_DELETE:
            count_delete++;
            text_delete += diffs[pointer][1];
            break;
          case DIFF_EQUAL:
            if (count_delete >= 1 && count_insert >= 1) {
              diffs.splice(pointer - count_delete - count_insert, count_delete + count_insert);
              pointer = pointer - count_delete - count_insert;
              const subDiff = diffMain(text_delete, text_insert, options, false, deadline);
              for (let j = subDiff.length - 1; j >= 0; j--)
                diffs.splice(pointer, 0, subDiff[j]);
              pointer = pointer + subDiff.length;
            }
            count_insert = 0;
            count_delete = 0;
            text_delete = "";
            text_insert = "";
            break;
        }
        pointer++;
      }
      diffs.pop();
      return diffs;
    }
    function diffBisect(text1, text2, options, deadline) {
      const text1_length = text1.length;
      const text2_length = text2.length;
      const max_d = Math.ceil((text1_length + text2_length) / 2);
      const v_offset = max_d;
      const v_length = 2 * max_d;
      const v1 = new Array(v_length);
      const v2 = new Array(v_length);
      for (let x = 0; x < v_length; x++) {
        v1[x] = -1;
        v2[x] = -1;
      }
      v1[v_offset + 1] = 0;
      v2[v_offset + 1] = 0;
      const delta = text1_length - text2_length;
      const front = delta % 2 !== 0;
      let k1start = 0;
      let k1end = 0;
      let k2start = 0;
      let k2end = 0;
      for (let d = 0; d < max_d; d++) {
        if ((/* @__PURE__ */ new Date()).getTime() > deadline)
          break;
        for (let k1 = -d + k1start; k1 <= d - k1end; k1 += 2) {
          const k1_offset = v_offset + k1;
          let x1;
          if (k1 === -d || k1 !== d && v1[k1_offset - 1] < v1[k1_offset + 1])
            x1 = v1[k1_offset + 1];
          else
            x1 = v1[k1_offset - 1] + 1;
          let y1 = x1 - k1;
          while (x1 < text1_length && y1 < text2_length && text1.charAt(x1) === text2.charAt(y1)) {
            x1++;
            y1++;
          }
          v1[k1_offset] = x1;
          if (x1 > text1_length) {
            k1end += 2;
          } else if (y1 > text2_length) {
            k1start += 2;
          } else if (front) {
            const k2_offset = v_offset + delta - k1;
            if (k2_offset >= 0 && k2_offset < v_length && v2[k2_offset] !== -1) {
              const x2 = text1_length - v2[k2_offset];
              if (x1 >= x2) {
                return diffBisectSplit(text1, text2, options, x1, y1, deadline);
              }
            }
          }
        }
        for (let k2 = -d + k2start; k2 <= d - k2end; k2 += 2) {
          const k2_offset = v_offset + k2;
          let x2;
          if (k2 === -d || k2 !== d && v2[k2_offset - 1] < v2[k2_offset + 1])
            x2 = v2[k2_offset + 1];
          else
            x2 = v2[k2_offset - 1] + 1;
          let y2 = x2 - k2;
          while (x2 < text1_length && y2 < text2_length && text1.charAt(text1_length - x2 - 1) === text2.charAt(text2_length - y2 - 1)) {
            x2++;
            y2++;
          }
          v2[k2_offset] = x2;
          if (x2 > text1_length) {
            k2end += 2;
          } else if (y2 > text2_length) {
            k2start += 2;
          } else if (!front) {
            const k1_offset = v_offset + delta - k2;
            if (k1_offset >= 0 && k1_offset < v_length && v1[k1_offset] !== -1) {
              const x1 = v1[k1_offset];
              const y1 = v_offset + x1 - k1_offset;
              x2 = text1_length - x2;
              if (x1 >= x2) {
                return diffBisectSplit(text1, text2, options, x1, y1, deadline);
              }
            }
          }
        }
      }
      return [createDiff(DIFF_DELETE, text1), createDiff(DIFF_INSERT, text2)];
    }
    function diffBisectSplit(text1, text2, options, x, y, deadline) {
      const text1a = text1.substring(0, x);
      const text2a = text2.substring(0, y);
      const text1b = text1.substring(x);
      const text2b = text2.substring(y);
      const diffs = diffMain(text1a, text2a, options, false, deadline);
      const diffsb = diffMain(text1b, text2b, options, false, deadline);
      return diffs.concat(diffsb);
    }
    function diffLinesToChars(text1, text2) {
      const lineArray = [];
      const lineHash = {};
      let maxLines = 4e4;
      lineArray[0] = "";
      function diffLinesToCharsMunge(text) {
        let chars = "";
        let lineStart = 0;
        let lineEnd = -1;
        let lineArrayLength = lineArray.length;
        while (lineEnd < text.length - 1) {
          lineEnd = text.indexOf("\n", lineStart);
          if (lineEnd === -1)
            lineEnd = text.length - 1;
          let line = text.substring(lineStart, lineEnd + 1);
          if (lineHash.hasOwnProperty ? Object.prototype.hasOwnProperty.call(lineHash, line) : lineHash[line] !== void 0) {
            chars += String.fromCharCode(lineHash[line]);
          } else {
            if (lineArrayLength === maxLines) {
              line = text.substring(lineStart);
              lineEnd = text.length;
            }
            chars += String.fromCharCode(lineArrayLength);
            lineHash[line] = lineArrayLength;
            lineArray[lineArrayLength++] = line;
          }
          lineStart = lineEnd + 1;
        }
        return chars;
      }
      const chars1 = diffLinesToCharsMunge(text1);
      maxLines = 65535;
      const chars2 = diffLinesToCharsMunge(text2);
      return { chars1, chars2, lineArray };
    }
    function diffCharsToLines(diffs, lineArray) {
      for (let i = 0; i < diffs.length; i++) {
        const chars = diffs[i][1];
        const text = [];
        for (let j = 0; j < chars.length; j++)
          text[j] = lineArray[chars.charCodeAt(j)];
        diffs[i][1] = text.join("");
      }
    }
    function diffCommonPrefix(text1, text2) {
      if (!text1 || !text2 || text1.charAt(0) !== text2.charAt(0))
        return 0;
      let pointermin = 0;
      let pointermax = Math.min(text1.length, text2.length);
      let pointermid = pointermax;
      let pointerstart = 0;
      while (pointermin < pointermid) {
        if (text1.substring(pointerstart, pointermid) === text2.substring(pointerstart, pointermid)) {
          pointermin = pointermid;
          pointerstart = pointermin;
        } else {
          pointermax = pointermid;
        }
        pointermid = Math.floor((pointermax - pointermin) / 2 + pointermin);
      }
      return pointermid;
    }
    function diffCommonSuffix(text1, text2) {
      if (!text1 || !text2 || text1.charAt(text1.length - 1) !== text2.charAt(text2.length - 1)) {
        return 0;
      }
      let pointermin = 0;
      let pointermax = Math.min(text1.length, text2.length);
      let pointermid = pointermax;
      let pointerend = 0;
      while (pointermin < pointermid) {
        if (text1.substring(text1.length - pointermid, text1.length - pointerend) === text2.substring(text2.length - pointermid, text2.length - pointerend)) {
          pointermin = pointermid;
          pointerend = pointermin;
        } else {
          pointermax = pointermid;
        }
        pointermid = Math.floor((pointermax - pointermin) / 2 + pointermin);
      }
      return pointermid;
    }
    function diffCommonOverlap(text1, text2) {
      const text1_length = text1.length;
      const text2_length = text2.length;
      if (text1_length === 0 || text2_length === 0)
        return 0;
      if (text1_length > text2_length)
        text1 = text1.substring(text1_length - text2_length);
      else if (text1_length < text2_length)
        text2 = text2.substring(0, text1_length);
      const text_length = Math.min(text1_length, text2_length);
      if (text1 === text2)
        return text_length;
      let best = 0;
      let length = 1;
      while (true) {
        const pattern = text1.substring(text_length - length);
        const found = text2.indexOf(pattern);
        if (found === -1)
          return best;
        length += found;
        if (found === 0 || text1.substring(text_length - length) === text2.substring(0, length)) {
          best = length;
          length++;
        }
      }
    }
    function diffHalfMatch(text1, text2, options) {
      if (options.diffTimeout <= 0) {
        return null;
      }
      const longtext = text1.length > text2.length ? text1 : text2;
      const shorttext = text1.length > text2.length ? text2 : text1;
      if (longtext.length < 4 || shorttext.length * 2 < longtext.length)
        return null;
      function diffHalfMatchI(longtext2, shorttext2, i) {
        const seed = longtext2.substring(i, i + Math.floor(longtext2.length / 4));
        let j = -1;
        let best_common = "";
        let best_longtext_a, best_longtext_b, best_shorttext_a, best_shorttext_b;
        while ((j = shorttext2.indexOf(seed, j + 1)) !== -1) {
          const prefixLength = diffCommonPrefix(longtext2.substring(i), shorttext2.substring(j));
          const suffixLength = diffCommonSuffix(longtext2.substring(0, i), shorttext2.substring(0, j));
          if (best_common.length < suffixLength + prefixLength) {
            best_common = shorttext2.substring(j - suffixLength, j) + shorttext2.substring(j, j + prefixLength);
            best_longtext_a = longtext2.substring(0, i - suffixLength);
            best_longtext_b = longtext2.substring(i + prefixLength);
            best_shorttext_a = shorttext2.substring(0, j - suffixLength);
            best_shorttext_b = shorttext2.substring(j + prefixLength);
          }
        }
        if (best_common.length * 2 >= longtext2.length)
          return [best_longtext_a, best_longtext_b, best_shorttext_a, best_shorttext_b, best_common];
        else
          return null;
      }
      const hm1 = diffHalfMatchI(longtext, shorttext, Math.ceil(longtext.length / 4));
      const hm2 = diffHalfMatchI(longtext, shorttext, Math.ceil(longtext.length / 2));
      let hm;
      if (!hm1 && !hm2) {
        return null;
      } else if (!hm2) {
        hm = hm1;
      } else if (!hm1) {
        hm = hm2;
      } else {
        hm = hm1[4].length > hm2[4].length ? hm1 : hm2;
      }
      let text1_a, text1_b, text2_a, text2_b;
      if (text1.length > text2.length) {
        text1_a = hm[0];
        text1_b = hm[1];
        text2_a = hm[2];
        text2_b = hm[3];
      } else {
        text2_a = hm[0];
        text2_b = hm[1];
        text1_a = hm[2];
        text1_b = hm[3];
      }
      const mid_common = hm[4];
      return [text1_a, text1_b, text2_a, text2_b, mid_common];
    }
    function diffCleanupSemantic(diffs) {
      let changes = false;
      const equalities = [];
      let equalitiesLength = 0;
      let lastEquality = null;
      let pointer = 0;
      let length_insertions1 = 0;
      let length_deletions1 = 0;
      let length_insertions2 = 0;
      let length_deletions2 = 0;
      while (pointer < diffs.length) {
        if (diffs[pointer][0] === DIFF_EQUAL) {
          equalities[equalitiesLength++] = pointer;
          length_insertions1 = length_insertions2;
          length_deletions1 = length_deletions2;
          length_insertions2 = 0;
          length_deletions2 = 0;
          lastEquality = diffs[pointer][1];
        } else {
          if (diffs[pointer][0] === DIFF_INSERT)
            length_insertions2 += diffs[pointer][1].length;
          else
            length_deletions2 += diffs[pointer][1].length;
          if (lastEquality && lastEquality.length <= Math.max(length_insertions1, length_deletions1) && lastEquality.length <= Math.max(length_insertions2, length_deletions2)) {
            diffs.splice(equalities[equalitiesLength - 1], 0, createDiff(DIFF_DELETE, lastEquality));
            diffs[equalities[equalitiesLength - 1] + 1][0] = DIFF_INSERT;
            equalitiesLength--;
            equalitiesLength--;
            pointer = equalitiesLength > 0 ? equalities[equalitiesLength - 1] : -1;
            length_insertions1 = 0;
            length_deletions1 = 0;
            length_insertions2 = 0;
            length_deletions2 = 0;
            lastEquality = null;
            changes = true;
          }
        }
        pointer++;
      }
      if (changes)
        diffCleanupMerge(diffs);
      diffCleanupSemanticLossless(diffs);
      pointer = 1;
      while (pointer < diffs.length) {
        if (diffs[pointer - 1][0] === DIFF_DELETE && diffs[pointer][0] === DIFF_INSERT) {
          const deletion = diffs[pointer - 1][1];
          const insertion = diffs[pointer][1];
          const overlap_length1 = diffCommonOverlap(deletion, insertion);
          const overlap_length2 = diffCommonOverlap(insertion, deletion);
          if (overlap_length1 >= overlap_length2) {
            if (overlap_length1 >= deletion.length / 2 || overlap_length1 >= insertion.length / 2) {
              diffs.splice(pointer, 0, createDiff(DIFF_EQUAL, insertion.substring(0, overlap_length1)));
              diffs[pointer - 1][1] = deletion.substring(0, deletion.length - overlap_length1);
              diffs[pointer + 1][1] = insertion.substring(overlap_length1);
              pointer++;
            }
          } else {
            if (overlap_length2 >= deletion.length / 2 || overlap_length2 >= insertion.length / 2) {
              diffs.splice(pointer, 0, createDiff(DIFF_EQUAL, deletion.substring(0, overlap_length2)));
              diffs[pointer - 1][0] = DIFF_INSERT;
              diffs[pointer - 1][1] = insertion.substring(0, insertion.length - overlap_length2);
              diffs[pointer + 1][0] = DIFF_DELETE;
              diffs[pointer + 1][1] = deletion.substring(overlap_length2);
              pointer++;
            }
          }
          pointer++;
        }
        pointer++;
      }
    }
    const nonAlphaNumericRegex_ = /[^a-z0-9]/i;
    const whitespaceRegex_ = /\s/;
    const linebreakRegex_ = /[\r\n]/;
    const blanklineEndRegex_ = /\n\r?\n$/;
    const blanklineStartRegex_ = /^\r?\n\r?\n/;
    function diffCleanupSemanticLossless(diffs) {
      function diffCleanupSemanticScore(one, two) {
        if (!one || !two) {
          return 6;
        }
        const char1 = one.charAt(one.length - 1);
        const char2 = two.charAt(0);
        const nonAlphaNumeric1 = char1.match(nonAlphaNumericRegex_);
        const nonAlphaNumeric2 = char2.match(nonAlphaNumericRegex_);
        const whitespace1 = nonAlphaNumeric1 && char1.match(whitespaceRegex_);
        const whitespace2 = nonAlphaNumeric2 && char2.match(whitespaceRegex_);
        const lineBreak1 = whitespace1 && char1.match(linebreakRegex_);
        const lineBreak2 = whitespace2 && char2.match(linebreakRegex_);
        const blankLine1 = lineBreak1 && one.match(blanklineEndRegex_);
        const blankLine2 = lineBreak2 && two.match(blanklineStartRegex_);
        if (blankLine1 || blankLine2) {
          return 5;
        } else if (lineBreak1 || lineBreak2) {
          return 4;
        } else if (nonAlphaNumeric1 && !whitespace1 && whitespace2) {
          return 3;
        } else if (whitespace1 || whitespace2) {
          return 2;
        } else if (nonAlphaNumeric1 || nonAlphaNumeric2) {
          return 1;
        }
        return 0;
      }
      let pointer = 1;
      while (pointer < diffs.length - 1) {
        if (diffs[pointer - 1][0] === DIFF_EQUAL && diffs[pointer + 1][0] === DIFF_EQUAL) {
          let equality1 = diffs[pointer - 1][1];
          let edit = diffs[pointer][1];
          let equality2 = diffs[pointer + 1][1];
          const commonOffset = diffCommonSuffix(equality1, edit);
          if (commonOffset) {
            const commonString = edit.substring(edit.length - commonOffset);
            equality1 = equality1.substring(0, equality1.length - commonOffset);
            edit = commonString + edit.substring(0, edit.length - commonOffset);
            equality2 = commonString + equality2;
          }
          let bestEquality1 = equality1;
          let bestEdit = edit;
          let bestEquality2 = equality2;
          let bestScore = diffCleanupSemanticScore(equality1, edit) + diffCleanupSemanticScore(edit, equality2);
          while (edit.charAt(0) === equality2.charAt(0)) {
            equality1 += edit.charAt(0);
            edit = edit.substring(1) + equality2.charAt(0);
            equality2 = equality2.substring(1);
            const score = diffCleanupSemanticScore(equality1, edit) + diffCleanupSemanticScore(edit, equality2);
            if (score >= bestScore) {
              bestScore = score;
              bestEquality1 = equality1;
              bestEdit = edit;
              bestEquality2 = equality2;
            }
          }
          if (diffs[pointer - 1][1] !== bestEquality1) {
            if (bestEquality1) {
              diffs[pointer - 1][1] = bestEquality1;
            } else {
              diffs.splice(pointer - 1, 1);
              pointer--;
            }
            diffs[pointer][1] = bestEdit;
            if (bestEquality2) {
              diffs[pointer + 1][1] = bestEquality2;
            } else {
              diffs.splice(pointer + 1, 1);
              pointer--;
            }
          }
        }
        pointer++;
      }
    }
    function diffCleanupMerge(diffs) {
      diffs.push(createDiff(DIFF_EQUAL, ""));
      let pointer = 0;
      let count_delete = 0;
      let count_insert = 0;
      let text_delete = "";
      let text_insert = "";
      let commonlength;
      while (pointer < diffs.length) {
        switch (diffs[pointer][0]) {
          case DIFF_INSERT:
            count_insert++;
            text_insert += diffs[pointer][1];
            pointer++;
            break;
          case DIFF_DELETE:
            count_delete++;
            text_delete += diffs[pointer][1];
            pointer++;
            break;
          case DIFF_EQUAL:
            if (count_delete + count_insert > 1) {
              if (count_delete !== 0 && count_insert !== 0) {
                commonlength = diffCommonPrefix(text_insert, text_delete);
                if (commonlength !== 0) {
                  if (pointer - count_delete - count_insert > 0 && diffs[pointer - count_delete - count_insert - 1][0] === DIFF_EQUAL) {
                    diffs[pointer - count_delete - count_insert - 1][1] += text_insert.substring(0, commonlength);
                  } else {
                    diffs.splice(0, 0, createDiff(DIFF_EQUAL, text_insert.substring(0, commonlength)));
                    pointer++;
                  }
                  text_insert = text_insert.substring(commonlength);
                  text_delete = text_delete.substring(commonlength);
                }
                commonlength = diffCommonSuffix(text_insert, text_delete);
                if (commonlength !== 0) {
                  diffs[pointer][1] = text_insert.substring(text_insert.length - commonlength) + diffs[pointer][1];
                  text_insert = text_insert.substring(0, text_insert.length - commonlength);
                  text_delete = text_delete.substring(0, text_delete.length - commonlength);
                }
              }
              pointer -= count_delete + count_insert;
              diffs.splice(pointer, count_delete + count_insert);
              if (text_delete.length) {
                diffs.splice(pointer, 0, createDiff(DIFF_DELETE, text_delete));
                pointer++;
              }
              if (text_insert.length) {
                diffs.splice(pointer, 0, createDiff(DIFF_INSERT, text_insert));
                pointer++;
              }
              pointer++;
            } else if (pointer !== 0 && diffs[pointer - 1][0] === DIFF_EQUAL) {
              diffs[pointer - 1][1] += diffs[pointer][1];
              diffs.splice(pointer, 1);
            } else {
              pointer++;
            }
            count_insert = 0;
            count_delete = 0;
            text_delete = "";
            text_insert = "";
            break;
        }
      }
      if (diffs[diffs.length - 1][1] === "")
        diffs.pop();
      let changes = false;
      pointer = 1;
      while (pointer < diffs.length - 1) {
        if (diffs[pointer - 1][0] === DIFF_EQUAL && diffs[pointer + 1][0] === DIFF_EQUAL) {
          if (diffs[pointer][1].substring(diffs[pointer][1].length - diffs[pointer - 1][1].length) === diffs[pointer - 1][1]) {
            diffs[pointer][1] = diffs[pointer - 1][1] + diffs[pointer][1].substring(0, diffs[pointer][1].length - diffs[pointer - 1][1].length);
            diffs[pointer + 1][1] = diffs[pointer - 1][1] + diffs[pointer + 1][1];
            diffs.splice(pointer - 1, 1);
            changes = true;
          } else if (diffs[pointer][1].substring(0, diffs[pointer + 1][1].length) === diffs[pointer + 1][1]) {
            diffs[pointer - 1][1] += diffs[pointer + 1][1];
            diffs[pointer][1] = diffs[pointer][1].substring(diffs[pointer + 1][1].length) + diffs[pointer + 1][1];
            diffs.splice(pointer + 1, 1);
            changes = true;
          }
        }
        pointer++;
      }
      if (changes)
        diffCleanupMerge(diffs);
    }

    function calculateDiff(left, right) {
      const changes = diffMain(left, right);
      diffCleanupSemantic(changes);
      return changes;
    }
    const exports$1 = {
      calculateDiff
    };
    expose(exports$1);

})();
