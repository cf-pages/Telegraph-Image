// TODO install @types/splitpanes once updated
declare module 'splitpanes' {
  import type { Component } from 'vue'

  export interface SplitpaneProps {
    horizontal: boolean
    pushOtherPanes: boolean
    dblClickSplitter: boolean
    firstSplitter: boolean
  }

  export interface PaneProps {
    size: number | string
    minSize: number | string
    maxSize: number | string
  }

  export type Pane = Component<PaneProps>
  export const Pane: Pane
  export const Splitpanes: Component<SplitpaneProps>
}
