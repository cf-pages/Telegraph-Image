import { Plugin } from 'vite';
import { Awaitable } from '@antfu/utils';
import { StackFrame } from 'error-stack-parser-es';
import { O as Options } from './shared/vite-plugin-inspect.2cd7208c.js';
import '@rollup/pluginutils';

interface TransformInfo {
    name: string;
    result?: string;
    start: number;
    end: number;
    order?: string;
    sourcemaps?: any;
    error?: ParsedError;
}
interface ParsedError {
    message: string;
    stack: StackFrame[];
    raw?: any;
}
interface ModuleInfo {
    id: string;
    plugins: {
        name: string;
        transform?: number;
        resolveId?: number;
    }[];
    deps: string[];
    virtual: boolean;
    totalTime: number;
    invokeCount: number;
    sourceSize: number;
    distSize: number;
}
interface ModulesList {
    root: string;
    modules: ModuleInfo[];
    ssrModules: ModuleInfo[];
}
interface ModuleTransformInfo {
    resolvedId: string;
    transforms: TransformInfo[];
}
interface PluginMetricInfo {
    name: string;
    enforce?: string;
    transform: {
        invokeCount: number;
        totalTime: number;
    };
    resolveId: {
        invokeCount: number;
        totalTime: number;
    };
}
interface RPCFunctions {
    list: () => Awaitable<ModulesList>;
    getIdInfo: (id: string, ssr: boolean, clear?: boolean) => Awaitable<ModuleTransformInfo>;
    resolveId: (id: string, ssr: boolean) => Awaitable<string>;
    clear: (id: string, ssr: boolean) => Awaitable<void>;
    getPluginMetrics: (ssr: boolean) => Awaitable<PluginMetricInfo[]>;
    getServerMetrics: () => Awaitable<Record<string, Record<string, {
        name: string;
        self: number;
        total: number;
    }[]>>>;
    moduleUpdated: () => void;
}

interface ViteInspectAPI {
    rpc: RPCFunctions;
}
declare function PluginInspect(options?: Options): Plugin;
declare namespace PluginInspect {
    var getViteInspectAPI: (plugins: Plugin[]) => ViteInspectAPI | undefined;
}

export { Options, type ViteInspectAPI, PluginInspect as default };
