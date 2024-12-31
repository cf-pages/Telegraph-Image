/// <reference types="vite/client" />
type ViteHotContext = Exclude<ImportMeta['hot'], undefined>;
interface ViteClient {
    createHotContext: (path: string) => ViteHotContext;
}
/**
 * Get the module of `/@vite/client`
 */
declare function getViteClient(base?: string, warning?: boolean): Promise<ViteClient | undefined>;
declare function createHotContext(path?: string, base?: string): Promise<ViteHotContext | undefined>;
/**
 * Guess the vite client provided bases from the current pathname.
 */
declare function guessBasesFromPathname(pathname?: string): string[];
/**
 * Try to resolve the vite client provided bases.
 */
declare function tryCreateHotContext(path?: string, bases?: string[]): Promise<ViteHotContext | undefined>;

export { type ViteClient, type ViteHotContext, createHotContext, getViteClient, guessBasesFromPathname, tryCreateHotContext };
