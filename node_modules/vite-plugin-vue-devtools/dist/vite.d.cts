import { PluginOption } from 'vite';
import { VitePluginInspectorOptions } from 'vite-plugin-vue-inspector';

interface VitePluginVueDevToolsOptions {
    /**
     * append an import to the module id ending with `appendTo` instead of adding a script into body
     * useful for projects that do not use html file as an entry
     *
     * WARNING: only set this if you know exactly what it does.
     * @default ''
     */
    appendTo?: string | RegExp;
    /**
     * Enable vue component inspector
     *
     * @default true
     */
    componentInspector?: boolean | VitePluginInspectorOptions;
    /**
     * Target editor when open in editor (v7.2.0+)
     *
     * @default code (Visual Studio Code)
     */
    launchEditor?: 'appcode' | 'atom' | 'atom-beta' | 'brackets' | 'clion' | 'code' | 'code-insiders' | 'codium' | 'emacs' | 'idea' | 'notepad++' | 'pycharm' | 'phpstorm' | 'rubymine' | 'sublime' | 'vim' | 'visualstudio' | 'webstorm' | 'rider' | string;
    /**
     * Customize openInEditor host
     * @default false
     * @deprecated This option is deprecated and removed in 7.1.0. The plugin now automatically detects the correct host.
     */
    openInEditorHost?: string | false;
    /**
     * DevTools client host
     * useful for projects that use a reverse proxy
     * @default false
     * @deprecated This option is deprecated and removed in 7.1.0. The plugin now automatically detects the correct host.
     */
    clientHost?: string | false;
}
declare function VitePluginVueDevTools(options?: VitePluginVueDevToolsOptions): PluginOption;

export { type VitePluginVueDevToolsOptions, VitePluginVueDevTools as default };
