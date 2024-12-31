import { PluginOption } from 'vite';

interface VueInspectorClient {
    enabled: boolean;
    position: {
        x: number;
        y: number;
    };
    linkParams: {
        file: string;
        line: number;
        column: number;
    };
    enable: () => void;
    disable: () => void;
    toggleEnabled: () => void;
    onEnabled: () => void;
    onDisabled: () => void;
    openInEditor: (url: URL) => void;
    onUpdated: () => void;
}
interface VitePluginInspectorOptions {
    /**
     * Vue version
     * @default 3
     */
    vue?: 2 | 3;
    /**
     * Default enable state
     * @default false
     */
    enabled?: boolean;
    /**
     * Define a combo key to toggle inspector
     * @default 'control-shift' on windows, 'meta-shift' on other os
     *
     * any number of modifiers `control` `shift` `alt` `meta` followed by zero or one regular key, separated by -
     * examples: control-shift, control-o, control-alt-s  meta-x control-meta
     * Some keys have native behavior (e.g. alt-s opens history menu on firefox).
     * To avoid conflicts or accidentally typing into inputs, modifier only combinations are recommended.
     * You can also disable it by setting `false`.
     */
    toggleComboKey?: string | false;
    /**
     * Toggle button visibility
     * @default 'active'
     */
    toggleButtonVisibility?: 'always' | 'active' | 'never';
    /**
     * Toggle button display position
     * @default top-right
     */
    toggleButtonPos?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
    /**
     * append an import to the module id ending with `appendTo` instead of adding a script into body
     * useful for frameworks that do not support transformIndexHtml hook (e.g. Nuxt3)
     *
     * WARNING: only set this if you know exactly what it does.
     */
    appendTo?: string | RegExp;
    /**
     * Customize openInEditor host (e.g. http://localhost:3000)
     * @default false
     * @deprecated This option is deprecated and removed in 5.0. The plugin now automatically detects the correct host.
     */
    openInEditorHost?: string | false;
    /**
     * lazy load inspector times (ms)
     * @default false
     */
    lazyLoad?: number | false;
    /**
     * disable inspector on editor open
     * @default false
     */
    disableInspectorOnEditorOpen?: boolean;
    /**
     * Hide information in VNode and produce clean html in DevTools
     *
     * Currently, it only works for Vue 3
     *
     * @default true
     */
    cleanHtml?: boolean;
    /**
     * Target editor when open in editor (v5.1.0+)
     *
     * @default process.env.LAUNCH_EDITOR ?? code (Visual Studio Code)
     */
    launchEditor?: 'appcode' | 'atom' | 'atom-beta' | 'brackets' | 'clion' | 'code' | 'code-insiders' | 'codium' | 'emacs' | 'idea' | 'notepad++' | 'pycharm' | 'phpstorm' | 'rubymine' | 'sublime' | 'vim' | 'visualstudio' | 'webstorm' | 'rider' | 'cursor' | string;
    /**
     * Disable animation/transition, will auto disable when `prefers-reduced-motion` is set
     * @default false
     */
    reduceMotion?: boolean;
}
declare function normalizeComboKeyPrint(toggleComboKey: string): string;
declare const DEFAULT_INSPECTOR_OPTIONS: VitePluginInspectorOptions;
declare function VitePluginInspector(options?: VitePluginInspectorOptions): PluginOption;

export { DEFAULT_INSPECTOR_OPTIONS, VitePluginInspectorOptions, VueInspectorClient, VitePluginInspector as default, normalizeComboKeyPrint };
