import * as vue_router from 'vue-router';
import * as _vue_devtools_kit from '@vue/devtools-kit';
import { DevToolsV6PluginAPIHookPayloads, DevToolsV6PluginAPIHookKeys, OpenInEditorOptions, getRpcClient, getRpcServer, getViteRpcClient, CustomTab, CustomCommand, AppRecord } from '@vue/devtools-kit';
import { ModuleNode } from 'vite';
import { App, Ref } from 'vue';

declare function setDevToolsClientUrl(url: string): void;
declare function getDevToolsClientUrl(): any;

declare enum DevToolsMessagingEvents {
    INSPECTOR_TREE_UPDATED = "inspector-tree-updated",
    INSPECTOR_STATE_UPDATED = "inspector-state-updated",
    DEVTOOLS_STATE_UPDATED = "devtools-state-updated",
    ROUTER_INFO_UPDATED = "router-info-updated",
    TIMELINE_EVENT_UPDATED = "timeline-event-updated",
    INSPECTOR_UPDATED = "inspector-updated",
    ACTIVE_APP_UNMOUNTED = "active-app-updated",
    DESTROY_DEVTOOLS_CLIENT = "destroy-devtools-client",
    RELOAD_DEVTOOLS_CLIENT = "reload-devtools-client"
}
declare const functions: {
    on: (event: string, handler: Function) => void;
    off: (event: string, handler: Function) => void;
    once: (event: string, handler: Function) => void;
    emit: (event: string, ...args: any[]) => void;
    heartbeat: () => boolean;
    devtoolsState: () => {
        connected: boolean;
        clientConnected: boolean;
        vueVersion: string;
        tabs: _vue_devtools_kit.CustomTab[];
        commands: _vue_devtools_kit.CustomCommand[];
        vitePluginDetected: boolean;
        appRecords: {
            id: string;
            name: string;
            version: string | undefined;
            routerId: string | undefined;
        }[];
        activeAppRecordId: string;
        timelineLayersState: Record<string, boolean>;
    };
    getInspectorTree(payload: Pick<DevToolsV6PluginAPIHookPayloads[DevToolsV6PluginAPIHookKeys.GET_INSPECTOR_TREE], "inspectorId" | "filter">): Promise<string>;
    getInspectorState(payload: Pick<DevToolsV6PluginAPIHookPayloads[DevToolsV6PluginAPIHookKeys.GET_INSPECTOR_STATE], "inspectorId" | "nodeId">): Promise<string>;
    editInspectorState(payload: DevToolsV6PluginAPIHookPayloads[DevToolsV6PluginAPIHookKeys.EDIT_INSPECTOR_STATE]): Promise<void>;
    sendInspectorState(id: string): void;
    inspectComponentInspector(): Promise<string>;
    cancelInspectComponentInspector(): void;
    getComponentRenderCode(id: string): any;
    scrollToComponent(id: string): void;
    inspectDOM(id: string): void;
    getInspectorNodeActions(id: string): {
        icon: string;
        tooltip?: string;
        action: (nodeId: string) => void | Promise<void>;
    }[] | undefined;
    getInspectorActions(id: string): {
        icon: string;
        tooltip?: string;
        action: () => void | Promise<void>;
    }[] | undefined;
    updateTimelineLayersState(state: Record<string, boolean>): void;
    callInspectorNodeAction(inspectorId: string, actionIndex: number, nodeId: string): void;
    callInspectorAction(inspectorId: string, actionIndex: number): void;
    openInEditor(options: OpenInEditorOptions): void;
    checkVueInspectorDetected(): Promise<boolean>;
    enableVueInspector(): Promise<void>;
    toggleApp(id: string): Promise<void>;
    updatePluginSettings(pluginId: string, key: string, value: string): void;
    getPluginSettings(pluginId: string): {
        options: Record<string, {
            label: string;
            description?: string;
        } & ({
            type: "boolean";
            defaultValue: boolean;
        } | {
            type: "choice";
            defaultValue: string | number;
            options: {
                value: string | number;
                label: string;
            }[];
            component?: "select" | "button-group";
        } | {
            type: "text";
            defaultValue: string;
        })> | null;
        values: any;
    };
    getRouterInfo(): _vue_devtools_kit.RouterInfo;
    navigate(path: string): Promise<void | vue_router.NavigationFailure | {} | undefined>;
    getMatchedRoutes(path: string): vue_router.RouteRecordNormalized[];
    toggleClientConnected(state: boolean): void;
    getCustomInspector(): {
        id: string;
        label: string;
        logo: string;
        icon: string;
        packageName: string | undefined;
        homepage: string | undefined;
        pluginId: string;
    }[];
    getInspectorInfo(id: string): {
        id: string;
        label: string;
        logo: string | undefined;
        packageName: string | undefined;
        homepage: string | undefined;
        timelineLayers: {
            id: string;
            label: string;
            color: number;
        }[];
        treeFilterPlaceholder: string;
        stateFilterPlaceholder: string;
    } | undefined;
    highlighComponent(uid: string): Promise<any>;
    unhighlight(): Promise<any>;
    updateDevToolsClientDetected(params: Record<string, boolean>): void;
    initDevToolsServerListener(): void;
};
type RPCFunctions = typeof functions;
declare const rpc: {
    value: ReturnType<typeof getRpcClient<RPCFunctions>>;
    functions: ReturnType<typeof getRpcClient<RPCFunctions>>;
};
declare const rpcServer: {
    value: ReturnType<typeof getRpcServer<RPCFunctions>>;
    functions: ReturnType<typeof getRpcServer<RPCFunctions>>;
};
declare function onRpcConnected(callback: () => void): void;
declare function onRpcSeverReady(callback: () => void): void;

type AssetType = 'image' | 'font' | 'video' | 'audio' | 'text' | 'json' | 'wasm' | 'other';
interface AssetInfo {
    path: string;
    type: AssetType;
    publicPath: string;
    relativePath: string;
    filePath: string;
    size: number;
    mtime: number;
}
interface ImageMeta {
    width: number;
    height: number;
    orientation?: number;
    type?: string;
    mimeType?: string;
}
type AssetImporter = Pick<ModuleNode, 'url' | 'id'>;
interface AssetEntry {
    path: string;
    content: string;
    encoding?: BufferEncoding;
    override?: boolean;
}
interface CodeSnippet {
    code: string;
    lang: string;
    name: string;
    docs?: string;
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
}

declare const viteRpcFunctions: {
    on: (event: string, handler: Function) => void;
    off: (event: string, handler: Function) => void;
    once: (event: string, handler: Function) => void;
    emit: (event: string, ...args: any[]) => void;
    heartbeat: () => boolean;
};
type ViteRPCFunctions = typeof viteRpcFunctions & {
    getStaticAssets: () => Promise<AssetInfo[]>;
    getAssetImporters: (url: string) => Promise<AssetImporter[]>;
    getImageMeta: (filepath: string) => Promise<ImageMeta>;
    getTextAssetContent: (filepath: string, limit?: number) => Promise<string>;
    getRoot: () => Promise<string>;
    getGraphModules: () => Promise<ModuleInfo[]>;
};
declare const viteRpc: {
    value: ReturnType<typeof getViteRpcClient<ViteRPCFunctions>>;
    functions: ReturnType<typeof getViteRpcClient<ViteRPCFunctions>>;
};
declare function onViteRpcConnected(callback: () => void): void;
declare function createViteClientRpc(): void;
declare function createViteServerRpc(functions: Record<string, any>): void;

interface DevToolsState {
    connected: boolean;
    clientConnected: boolean;
    vueVersion: string;
    tabs: CustomTab[];
    commands: CustomCommand[];
    vitePluginDetected: boolean;
    appRecords: AppRecord[];
    activeAppRecordId: string;
    timelineLayersState: Record<string, boolean>;
}
type DevToolsRefState = {
    [P in keyof DevToolsState]: Ref<DevToolsState[P]>;
};
declare function VueDevToolsVuePlugin(): {
    install(app: App): void;
};
declare function createDevToolsStateContext(): {
    getDevToolsState: () => void;
    connected: Ref<boolean, boolean>;
    clientConnected: Ref<boolean, boolean>;
    vueVersion: Ref<string, string>;
    tabs: Ref<{
        name: string;
        icon?: string | undefined;
        title: string;
        view: {
            type: "iframe";
            src: string;
            persistent?: boolean | undefined;
        } | {
            type: "vnode";
            vnode: VNode;
        };
        category?: ("app" | "pinned" | "modules" | "advanced") | undefined;
    }[], CustomTab[] | {
        name: string;
        icon?: string | undefined;
        title: string;
        view: {
            type: "iframe";
            src: string;
            persistent?: boolean | undefined;
        } | {
            type: "vnode";
            vnode: VNode;
        };
        category?: ("app" | "pinned" | "modules" | "advanced") | undefined;
    }[]>;
    commands: Ref<{
        id: string;
        title: string;
        description?: string | undefined;
        order?: number | undefined;
        icon?: string | undefined;
        action?: {
            type: "url";
            src: string;
        } | undefined;
        children?: {
            title: string;
            id: string;
            icon?: string | undefined;
            description?: string | undefined;
            order?: number | undefined;
            action?: {
                type: "url";
                src: string;
            } | undefined;
        }[] | undefined;
    }[], CustomCommand[] | {
        id: string;
        title: string;
        description?: string | undefined;
        order?: number | undefined;
        icon?: string | undefined;
        action?: {
            type: "url";
            src: string;
        } | undefined;
        children?: {
            title: string;
            id: string;
            icon?: string | undefined;
            description?: string | undefined;
            order?: number | undefined;
            action?: {
                type: "url";
                src: string;
            } | undefined;
        }[] | undefined;
    }[]>;
    vitePluginDetected: Ref<boolean, boolean>;
    appRecords: Ref<{
        id: string;
        name: string;
        app?: _vue_devtools_kit.App;
        version?: string | undefined;
        types?: Record<string, string | symbol> | undefined;
        instanceMap: Map<string, any> & Omit<Map<string, any>, keyof Map<any, any>>;
        perfGroupIds: Map<string, {
            groupId: number;
            time: number;
        }> & Omit<Map<string, {
            groupId: number;
            time: number;
        }>, keyof Map<any, any>>;
        rootInstance: _vue_devtools_kit.VueAppInstance;
        routerId?: string | undefined;
    }[], AppRecord[] | {
        id: string;
        name: string;
        app?: _vue_devtools_kit.App;
        version?: string | undefined;
        types?: Record<string, string | symbol> | undefined;
        instanceMap: Map<string, any> & Omit<Map<string, any>, keyof Map<any, any>>;
        perfGroupIds: Map<string, {
            groupId: number;
            time: number;
        }> & Omit<Map<string, {
            groupId: number;
            time: number;
        }>, keyof Map<any, any>>;
        rootInstance: _vue_devtools_kit.VueAppInstance;
        routerId?: string | undefined;
    }[]>;
    activeAppRecordId: Ref<string, string>;
    timelineLayersState: Ref<Record<string, boolean>, Record<string, boolean>>;
};
declare function useDevToolsState(): DevToolsRefState;
declare function onDevToolsConnected(fn: () => void): () => void;
declare function refreshCurrentPageData(): void;

export { type AssetEntry, type AssetImporter, type AssetInfo, type AssetType, type CodeSnippet, DevToolsMessagingEvents, type ImageMeta, type ModuleInfo, type RPCFunctions, type ViteRPCFunctions, VueDevToolsVuePlugin, createDevToolsStateContext, createViteClientRpc, createViteServerRpc, functions, getDevToolsClientUrl, onDevToolsConnected, onRpcConnected, onRpcSeverReady, onViteRpcConnected, refreshCurrentPageData, rpc, rpcServer, setDevToolsClientUrl, useDevToolsState, viteRpc, viteRpcFunctions };
