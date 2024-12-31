<script>
import inspectorOptions from 'virtual:vue-inspector-options'

const base = inspectorOptions.base

const KEY_DATA = 'data-v-inspector'
const KEY_IGNORE = 'data-v-inspector-ignore'
const KEY_PROPS_DATA = '__v_inspector'

function getData(el) {
  return el?.__vnode?.props?.[KEY_PROPS_DATA] ?? getComponentData(el) ?? el?.getAttribute?.(KEY_DATA)
}

function getComponentData(el) {
  const ctxVNode = el?.__vnode?.ctx?.vnode
  if (ctxVNode?.el === el)
    return ctxVNode?.props?.[KEY_PROPS_DATA]
}

export default {
  name: 'VueInspectorOverlay',
  data() {
    return {
      containerRef: null,
      floatsRef: null,
      enabled: inspectorOptions.enabled,
      toggleCombo: inspectorOptions.toggleComboKey?.toLowerCase?.()?.split?.('-') ?? false,
      disableInspectorOnEditorOpen: inspectorOptions.disableInspectorOnEditorOpen,
      overlayVisible: false,
      position: {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      },
      linkParams: {
        file: '',
        line: 0,
        column: 0,
      },
      KEY_IGNORE,
      animation: !inspectorOptions.reduceMotion,
    }
  },
  computed: {
    logoColors() {
      return this.enabled ? ['#42D392', '#213547', '#42b883'] : ['#E2C6C6', '#E2C6C6', '#E2C6C6']
    },
    containerVisible() {
      const { toggleButtonVisibility } = inspectorOptions
      return toggleButtonVisibility === 'always' || (toggleButtonVisibility === 'active' && this.enabled)
    },
    containerPosition() {
      return inspectorOptions.toggleButtonPos
        .split('-')
        .map(p => `${p}: 15px;`)
        .join('')
    },
    bannerPosition() {
      const [x, y] = inspectorOptions.toggleButtonPos.split('-')
      return {
        [x === 'top' ? 'bottom' : 'top']: '-45px',
        [y]: 0,
      }
    },
    floatsStyle() {
      let margin = 10
      let x = this.position.x + (this.position.width / 2)
      let y = this.position.y + this.position.height + 5
      const floatsRef = this.$refs.floatsRef
      let floatsWidth = floatsRef?.clientWidth ?? 0
      let floatsHeight = floatsRef?.clientHeight ?? 0

      x = Math.max(margin, x)
      x = Math.min(x, window.innerWidth - floatsWidth - margin)
      if (x < floatsWidth / 2) {
        x = floatsWidth / 2 + margin
      }

      y = Math.max(margin, y)
      y = Math.min(y, window.innerHeight - floatsHeight - margin)

      return {
        left: `${x}px`,
        top: `${y}px`,
      }
    },
    sizeIndicatorStyle() {
      return {
        left: `${this.position.x}px`,
        top: `${this.position.y}px`,
        width: `${this.position.width}px`,
        height: `${this.position.height}px`,
      }
    },
  },
  watch: {
    enabled: {
      handler(val, oldVal) {
        if (val === oldVal)
          return
        if (val)
          this.onEnabled()
        else
          this.onDisabled()
      },
    },
  },
  mounted() {
    this.toggleCombo && document.body.addEventListener('keydown', this.onKeydown)
    this.toggleEventListener()

    // Expose control to global
    window.__VUE_INSPECTOR__ = this
  },
  methods: {
    toggleEventListener() {
      const listener = this.enabled ? document.body.addEventListener : document.body.removeEventListener

      listener?.call(document.body, 'mousemove', this.updateLinkParams)
      listener?.call(document.body, 'resize', this.closeOverlay, true)
      listener?.call(document.body, 'click', this.handleClick, true)
    },
    toggleEnabled() {
      this.enabled = !this.enabled
      this.overlayVisible = false
      this.toggleEventListener()
    },
    onKeydown(event) {
      if (event.repeat || event.key === undefined)
        return

      const isCombo = this.toggleCombo?.every(key => this.isKeyActive(key, event))
      if (isCombo)
        this.toggleEnabled()
    },
    isKeyActive(key, event) {
      switch (key) {
        case 'shift':
        case 'control':
        case 'alt':
        case 'meta':
          return event.getModifierState(key.charAt(0).toUpperCase() + key.slice(1))
        default:
          return key === event.key.toLowerCase()
      }
    },
    isChildOf(ele, target) {
      if (!ele || ele === document)
        return false
      return ele === target ? true : this.isChildOf(ele.parentNode, target)
    },
    getTargetNode(e) {
      const splitRE = /(.+):([\d]+):([\d]+)$/
      const path = e.path ?? e.composedPath()
      if (!path) {
        return {
          targetNode: null,
          params: null,
        }
      }
      const ignoreIndex = path.findIndex(node => node?.hasAttribute?.(KEY_IGNORE))
      const targetNode = path.slice(ignoreIndex + 1).find(node => getData(node))
      if (!targetNode) {
        return {
          targetNode: null,
          params: null,
        }
      }
      const match = getData(targetNode)?.match(splitRE)
      const [_, file, line, column] = match || []
      return {
        targetNode,
        params: match
          ? {
              file,
              line,
              column,
              title: file,
            }
          : null,
      }
    },
    handleClick(e) {
      const { targetNode, params } = this.getTargetNode(e)
      if (!targetNode)
        return
      e.preventDefault()
      e.stopPropagation()
      e.stopImmediatePropagation()
      const { file, line, column } = params
      this.overlayVisible = false
      const url = new URL(
        `${base}__open-in-editor?file=${encodeURIComponent(`${file}:${line}:${column}`)}`,
        import.meta.url,
      )
      this.openInEditor(url)
    },
    updateLinkParams(e) {
      const { targetNode, params } = this.getTargetNode(e)
      if (targetNode) {
        const rect = targetNode.getBoundingClientRect()
        this.overlayVisible = true
        this.position.x = rect.x
        this.position.y = rect.y
        this.position.width = rect.width
        this.position.height = rect.height
        this.linkParams = params
      }
      else {
        this.closeOverlay()
      }
      this.onUpdated()
    },
    closeOverlay() {
      this.overlayVisible = false
      this.linkParams = {
        file: '',
        line: 0,
        column: 0,
      }
    },

    // Public methods
    enable() {
      if (this.enabled)
        return
      this.toggleEnabled()
    },
    disable() {
      if (!this.enabled)
        return
      this.toggleEnabled()
    },
    openInEditor(baseUrl, file, line, column) {
      /**
       * Vite built-in support
       * https://github.com/vitejs/vite/blob/d59e1acc2efc0307488364e9f2fad528ec57f204/packages/vite/src/node/server/index.ts#L569-L570
       */

      const _url = baseUrl instanceof URL ? baseUrl : `${baseUrl}/__open-in-editor?file=${encodeURIComponent(`${file}:${line}:${column}`)}`
      const promise = fetch(
        _url,
        {
          mode: 'no-cors',
        },
      )

      if (this.disableInspectorOnEditorOpen)
        promise.then(this.disable)

      return promise
    },
    onUpdated() {
      // to be replaced programmatically
    },
    onEnabled() {
      // to be replaced programmatically
    },
    onDisabled() {
      // to be replaced programmatically
    },
  },
}
</script>

<template>
  <div v-bind="{ [KEY_IGNORE]: 'true' }">
    <div
      v-if="containerVisible"
      ref="containerRef"
      class="vue-inspector-container"
      :style="containerPosition"
      :class="{ 'vue-inspector-container--disabled': !enabled }"
    >
      <!-- Logo -->
      <svg
        width="100"
        height="19"
        viewBox="0 0 62 12"
        fill="none"
        @click.prevent.stop="toggleEnabled"
      >
        <path d="M0.988281 5.34375C0.988281 5.26562 1.00391 5.20312 1.03516 5.15625C1.07422 5.10156 1.14062 5.04688 1.23438 4.99219C1.64062 4.80469 2.00391 4.62891 2.32422 4.46484C2.65234 4.30078 2.97266 4.14453 3.28516 3.99609C3.59766 3.83984 3.92188 3.6875 4.25781 3.53906C4.60156 3.39062 5 3.23047 5.45312 3.05859C5.46094 3.05859 5.46875 3.05859 5.47656 3.05859C5.48438 3.05078 5.49609 3.04688 5.51172 3.04688C5.59766 3.04688 5.66797 3.08594 5.72266 3.16406C5.77734 3.24219 5.80469 3.32031 5.80469 3.39844C5.80469 3.48438 5.78516 3.55469 5.74609 3.60938C5.71484 3.66406 5.65234 3.71094 5.55859 3.75L2.55859 5.07422L2.71094 5.22656C2.71094 5.23438 2.75 5.25781 2.82812 5.29688C2.91406 5.32812 3.02344 5.375 3.15625 5.4375C3.28906 5.5 3.4375 5.57031 3.60156 5.64844C3.77344 5.71875 3.94141 5.79297 4.10547 5.87109C4.27734 5.94141 4.44141 6.01172 4.59766 6.08203C4.75391 6.14453 4.88672 6.20312 4.99609 6.25781C5.07422 6.29688 5.18359 6.32812 5.32422 6.35156C5.47266 6.36719 5.61328 6.39062 5.74609 6.42188C5.88672 6.45312 6.00781 6.5 6.10938 6.5625C6.21875 6.61719 6.27344 6.70703 6.27344 6.83203C6.27344 6.94141 6.23047 7.02734 6.14453 7.08984C6.06641 7.14453 5.97656 7.17188 5.875 7.17188C5.77344 7.17188 5.625 7.15234 5.42969 7.11328C5.24219 7.06641 5.02344 7.00781 4.77344 6.9375C4.53125 6.85938 4.26562 6.76953 3.97656 6.66797C3.69531 6.56641 3.41406 6.46484 3.13281 6.36328C2.85156 6.26172 2.58203 6.15625 2.32422 6.04688C2.06641 5.9375 1.83594 5.83984 1.63281 5.75391C1.4375 5.66016 1.28125 5.57812 1.16406 5.50781C1.04688 5.4375 0.988281 5.38281 0.988281 5.34375Z" :fill="logoColors[0]" />
        <path d="M7.60066 0.599999H7.70866C7.77266 0.599999 7.82866 0.624 7.87666 0.672C7.92466 0.72 7.94866 0.776 7.94866 0.84V8.76C7.94866 8.824 7.92466 8.88 7.87666 8.928C7.82866 8.976 7.77266 9 7.70866 9H7.60066C7.52866 9 7.46866 8.976 7.42066 8.928C7.38066 8.88 7.36066 8.824 7.36066 8.76V0.84C7.36066 0.776 7.38066 0.72 7.42066 0.672C7.46866 0.624 7.52866 0.599999 7.60066 0.599999ZM11.851 2.976C12.451 2.976 12.911 3.136 13.231 3.456C13.551 3.768 13.711 4.228 13.711 4.836V8.76C13.711 8.92 13.635 9 13.483 9H13.387C13.227 9 13.147 8.92 13.147 8.76V4.968C13.147 4.016 12.711 3.54 11.839 3.54C11.383 3.54 10.995 3.72 10.675 4.08C10.587 4.152 10.511 4.188 10.447 4.188C10.303 4.188 10.227 4.108 10.219 3.948C10.219 3.884 10.235 3.82 10.267 3.756C10.435 3.524 10.659 3.336 10.939 3.192C11.219 3.048 11.523 2.976 11.851 2.976ZM9.823 3.012H9.919C9.983 3.012 10.039 3.036 10.087 3.084C10.135 3.124 10.159 3.18 10.159 3.252V8.76C10.159 8.832 10.135 8.892 10.087 8.94C10.039 8.98 9.983 9 9.919 9H9.823C9.759 9 9.703 8.98 9.655 8.94C9.607 8.892 9.583 8.832 9.583 8.76V3.252C9.583 3.18 9.607 3.124 9.655 3.084C9.703 3.036 9.759 3.012 9.823 3.012ZM15.5172 4.572C15.5172 4.116 15.6692 3.736 15.9732 3.432C16.2852 3.128 16.7452 2.976 17.3532 2.976C17.9692 2.976 18.4412 3.128 18.7692 3.432C19.0972 3.728 19.2612 4.168 19.2612 4.752C19.2612 4.816 19.2372 4.872 19.1892 4.92C19.1492 4.96 19.0972 4.98 19.0332 4.98H18.9252C18.8612 4.98 18.8052 4.96 18.7572 4.92C18.7172 4.872 18.6972 4.82 18.6972 4.764C18.6972 3.956 18.2452 3.552 17.3412 3.552C16.9252 3.552 16.6092 3.652 16.3932 3.852C16.1852 4.052 16.0812 4.304 16.0812 4.608C16.0812 4.912 16.1812 5.156 16.3812 5.34C16.5892 5.516 16.9772 5.66 17.5452 5.772C18.1132 5.884 18.5572 6.06 18.8772 6.3C19.1972 6.54 19.3572 6.9 19.3572 7.38C19.3572 7.852 19.1812 8.248 18.8292 8.568C18.4852 8.88 18.0012 9.036 17.3772 9.036C16.7612 9.036 16.2612 8.88 15.8772 8.568C15.4932 8.248 15.3012 7.78 15.3012 7.164C15.3012 6.996 15.3812 6.912 15.5412 6.912H15.6372C15.7892 6.912 15.8652 6.992 15.8652 7.152C15.8652 8.024 16.3812 8.46 17.4132 8.46C17.8772 8.46 18.2212 8.356 18.4452 8.148C18.6772 7.932 18.7932 7.668 18.7932 7.356C18.7932 7.044 18.6732 6.82 18.4332 6.684C18.1932 6.54 17.7732 6.404 17.1732 6.276C16.5812 6.148 16.1572 5.944 15.9012 5.664C15.6452 5.384 15.5172 5.02 15.5172 4.572ZM20.7741 4.956C20.7741 4.332 20.9621 3.848 21.3381 3.504C21.7221 3.152 22.2181 2.976 22.8261 2.976C23.4421 2.976 23.9421 3.148 24.3261 3.492C24.7101 3.836 24.9021 4.324 24.9021 4.956V7.044C24.9021 7.66 24.7101 8.144 24.3261 8.496C23.9421 8.848 23.4421 9.024 22.8261 9.024C22.2181 9.024 21.7221 8.86 21.3381 8.532V11.772C21.3381 11.924 21.2621 12 21.1101 12H21.0021C20.8501 12 20.7741 11.924 20.7741 11.772V4.956ZM23.9061 3.912C23.6261 3.672 23.2701 3.552 22.8381 3.552C22.4061 3.552 22.0461 3.676 21.7581 3.924C21.4781 4.164 21.3381 4.512 21.3381 4.968V7.884C21.8261 8.26 22.3061 8.448 22.7781 8.448C23.2501 8.448 23.6261 8.324 23.9061 8.076C24.1941 7.828 24.3381 7.476 24.3381 7.02V4.968C24.3381 4.504 24.1941 4.152 23.9061 3.912ZM27.0353 4.956C27.0353 4.324 27.2273 3.836 27.6113 3.492C27.9953 3.148 28.4953 2.976 29.1113 2.976C29.7273 2.976 30.2233 3.152 30.5993 3.504C30.9753 3.848 31.1633 4.332 31.1633 4.956V5.676C31.1633 6.02 30.9993 6.192 30.6713 6.192H28.0793C28.0073 6.192 27.9473 6.168 27.8993 6.12C27.8593 6.072 27.8393 6.016 27.8393 5.952V5.856C27.8393 5.792 27.8593 5.736 27.8993 5.688C27.9473 5.64 28.0073 5.616 28.0793 5.616H30.5993V4.968C30.5993 4.512 30.4593 4.164 30.1793 3.924C29.8993 3.676 29.5433 3.552 29.1113 3.552C28.6793 3.552 28.3193 3.676 28.0313 3.924C27.7513 4.164 27.6113 4.512 27.6113 4.968V7.032C27.6113 7.488 27.7513 7.84 28.0313 8.088C28.3193 8.328 28.6753 8.448 29.0993 8.448C29.5313 8.448 29.8873 8.332 30.1673 8.1C30.4553 7.86 30.5993 7.52 30.5993 7.08C30.5993 7.016 30.6193 6.96 30.6593 6.912C30.7073 6.864 30.7633 6.84 30.8273 6.84H30.9233C30.9953 6.84 31.0513 6.864 31.0913 6.912C31.1393 6.96 31.1633 7.016 31.1633 7.08C31.1553 7.696 30.9633 8.176 30.5873 8.52C30.2113 8.856 29.7193 9.024 29.1113 9.024C28.5033 9.024 28.0033 8.852 27.6113 8.508C27.2273 8.156 27.0353 7.668 27.0353 7.044V4.956ZM32.9181 4.956C32.9181 4.324 33.1101 3.836 33.4941 3.492C33.8781 3.148 34.3781 2.976 34.9941 2.976C35.6101 2.976 36.1061 3.152 36.4821 3.504C36.8581 3.848 37.0461 4.332 37.0461 4.956C37.0461 5.108 36.9661 5.184 36.8061 5.184H36.7101C36.5581 5.184 36.4821 5.108 36.4821 4.956C36.4821 4.5 36.3421 4.152 36.0621 3.912C35.7821 3.672 35.4261 3.552 34.9941 3.552C34.5621 3.552 34.2021 3.676 33.9141 3.924C33.6341 4.164 33.4941 4.512 33.4941 4.968V7.032C33.4941 7.488 33.6341 7.84 33.9141 8.088C34.2021 8.328 34.5621 8.448 34.9941 8.448C35.4261 8.448 35.7781 8.332 36.0501 8.1C36.3301 7.86 36.4741 7.52 36.4821 7.08C36.4821 7.016 36.5021 6.96 36.5421 6.912C36.5901 6.864 36.6461 6.84 36.7101 6.84H36.8061C36.8781 6.84 36.9341 6.864 36.9741 6.912C37.0221 6.96 37.0461 7.016 37.0461 7.08C37.0301 7.688 36.8341 8.164 36.4581 8.508C36.0821 8.852 35.5901 9.024 34.9821 9.024C34.3821 9.024 33.8861 8.852 33.4941 8.508C33.1101 8.156 32.9181 7.668 32.9181 7.044V4.956ZM39.4927 0.24H39.5887C39.7407 0.24 39.8167 0.316 39.8167 0.468L39.7807 7.152C39.7887 7.56 39.9007 7.876 40.1167 8.1C40.3407 8.324 40.6327 8.436 40.9927 8.436H41.2927C41.3567 8.436 41.4087 8.46 41.4487 8.508C41.4967 8.556 41.5207 8.608 41.5207 8.664V8.76C41.5207 8.92 41.3407 9 40.9807 9C40.4527 9 40.0287 8.84 39.7087 8.52C39.3887 8.192 39.2247 7.74 39.2167 7.164L39.2527 0.468C39.2687 0.316 39.3487 0.24 39.4927 0.24ZM38.5687 3H38.8567C38.9287 3 38.9847 3.024 39.0247 3.072C39.0727 3.12 39.0967 3.176 39.0967 3.24V3.312C39.0967 3.376 39.0727 3.432 39.0247 3.48C38.9847 3.528 38.9287 3.552 38.8567 3.552H38.5687C38.4967 3.552 38.4367 3.528 38.3887 3.48C38.3487 3.432 38.3287 3.376 38.3287 3.312V3.24C38.3287 3.176 38.3487 3.12 38.3887 3.072C38.4367 3.024 38.4967 3 38.5687 3ZM40.1767 3H41.0647C41.1287 3 41.1807 3.024 41.2207 3.072C41.2687 3.12 41.2927 3.176 41.2927 3.24V3.312C41.2927 3.376 41.2687 3.432 41.2207 3.48C41.1807 3.528 41.1287 3.552 41.0647 3.552H40.1767C40.1127 3.552 40.0567 3.528 40.0087 3.48C39.9607 3.432 39.9367 3.376 39.9367 3.312V3.24C39.9367 3.176 39.9607 3.12 40.0087 3.072C40.0567 3.024 40.1127 3 40.1767 3ZM43.008 4.956C43.008 4.324 43.2 3.836 43.584 3.492C43.968 3.148 44.468 2.976 45.084 2.976C45.7 2.976 46.196 3.152 46.572 3.504C46.948 3.848 47.136 4.332 47.136 4.956V7.044C47.136 7.668 46.948 8.156 46.572 8.508C46.196 8.852 45.7 9.024 45.084 9.024C44.476 9.024 43.976 8.852 43.584 8.508C43.2 8.156 43.008 7.668 43.008 7.044V4.956ZM46.572 4.956C46.572 4.5 46.432 4.152 46.152 3.912C45.872 3.664 45.516 3.54 45.084 3.54C44.652 3.54 44.292 3.664 44.004 3.912C43.716 4.152 43.572 4.5 43.572 4.956V7.044C43.572 7.5 43.716 7.852 44.004 8.1C44.292 8.34 44.652 8.46 45.084 8.46C45.516 8.46 45.872 8.34 46.152 8.1C46.432 7.852 46.572 7.5 46.572 7.044V4.956ZM51.0948 2.976C51.2468 2.976 51.3228 3.056 51.3228 3.216V3.3C51.3228 3.364 51.2988 3.42 51.2508 3.468C51.2108 3.516 51.1588 3.54 51.0948 3.54C50.6388 3.54 50.2748 3.656 50.0028 3.888C49.7308 4.12 49.5948 4.476 49.5948 4.956V8.76C49.5948 8.832 49.5708 8.892 49.5228 8.94C49.4748 8.98 49.4188 9 49.3548 9H49.2708C49.2068 9 49.1508 8.98 49.1028 8.94C49.0548 8.892 49.0308 8.832 49.0308 8.76V4.956C49.0308 4.3 49.2148 3.808 49.5828 3.48C49.9508 3.144 50.4548 2.976 51.0948 2.976Z" fill="url(#paint0_linear_2_49)" fill-opacity="0.94" />
        <path d="M51.6953 8.66016C51.6953 8.47266 51.7188 8.29688 51.7656 8.13281C51.8203 7.96875 51.8828 7.80859 51.9531 7.65234C52.0312 7.49609 52.1094 7.34375 52.1875 7.19531C52.2656 7.03906 52.3359 6.87891 52.3984 6.71484C52.3984 6.68359 52.4141 6.61328 52.4453 6.50391C52.4766 6.39453 52.5117 6.27734 52.5508 6.15234C52.5898 6.01953 52.625 5.89844 52.6562 5.78906C52.6953 5.67188 52.7227 5.60156 52.7383 5.57812C52.7695 5.49219 52.8242 5.35938 52.9023 5.17969C52.9883 5 53.082 4.79688 53.1836 4.57031C53.2852 4.34375 53.3945 4.10547 53.5117 3.85547C53.6289 3.60547 53.7383 3.36719 53.8398 3.14062C53.9492 2.91406 54.0469 2.71094 54.1328 2.53125C54.2188 2.35156 54.2852 2.22266 54.332 2.14453C54.3398 2.10547 54.3555 2.07812 54.3789 2.0625C54.4102 2.04688 54.4414 2.03516 54.4727 2.02734C54.5117 2.01953 54.5469 2.01953 54.5781 2.02734C54.6172 2.02734 54.6484 2.02734 54.6719 2.02734C54.8203 2.02734 54.9141 2.05078 54.9531 2.09766C55 2.13672 55.0234 2.23047 55.0234 2.37891C55.0234 2.39453 55.0195 2.43359 55.0117 2.49609C55.0117 2.55859 55.0117 2.59375 55.0117 2.60156C54.7305 3.03125 54.4688 3.50781 54.2266 4.03125C53.9844 4.54688 53.7578 5.07422 53.5469 5.61328C53.3359 6.15234 53.1406 6.6875 52.9609 7.21875C52.7891 7.74219 52.6328 8.22266 52.4922 8.66016C52.4453 8.80078 52.3945 8.89453 52.3398 8.94141C52.2852 8.98828 52.1836 9.01172 52.0352 9.01172C51.9023 9.01172 51.8125 8.98438 51.7656 8.92969C51.7188 8.875 51.6953 8.78516 51.6953 8.66016Z" :fill="logoColors[1]" />
        <path d="M56.4883 7.61719V7.26562C56.4883 7.21875 56.4961 7.18359 56.5117 7.16016C56.5273 7.12891 56.5508 7.09766 56.582 7.06641C56.6133 7.03516 56.6641 7 56.7344 6.96094L59.6992 4.89844C59.793 4.88281 59.8711 4.84375 59.9336 4.78125C59.9961 4.71875 60.0312 4.64062 60.0391 4.54688C59.9844 4.53125 59.8984 4.50781 59.7812 4.47656C59.6719 4.44531 59.5469 4.41016 59.4062 4.37109C59.2656 4.32422 59.1133 4.27734 58.9492 4.23047C58.793 4.17578 58.6406 4.12891 58.4922 4.08984L58.1172 3.96094C58 3.92188 57.918 3.89062 57.8711 3.86719C57.8398 3.85938 57.7812 3.83594 57.6953 3.79688C57.6172 3.75 57.5156 3.70312 57.3906 3.65625C57.2734 3.60156 57.1445 3.54297 57.0039 3.48047C56.8711 3.41016 56.7344 3.34375 56.5938 3.28125C56.4609 3.21094 56.332 3.14844 56.207 3.09375C56.0898 3.03906 56 2.99219 55.9375 2.95312C55.875 2.92188 55.8086 2.88672 55.7383 2.84766C55.668 2.80859 55.6055 2.76172 55.5508 2.70703C55.4961 2.65234 55.4453 2.59375 55.3984 2.53125C55.3594 2.46875 55.3398 2.40234 55.3398 2.33203C55.3398 2.28516 55.3438 2.23828 55.3516 2.19141C55.3672 2.14453 55.3867 2.10156 55.4102 2.0625C55.4414 2.01562 55.4727 1.98047 55.5039 1.95703C55.5352 1.92578 55.582 1.91016 55.6445 1.91016C55.6445 1.91016 55.6484 1.91406 55.6562 1.92188C55.6641 1.92188 55.6719 1.92188 55.6797 1.92188C55.6875 1.92969 55.6953 1.93359 55.7031 1.93359C55.7188 1.93359 55.7383 1.94531 55.7617 1.96875C55.7852 1.98438 55.8086 2.00391 55.832 2.02734C55.8555 2.05078 55.875 2.07422 55.8906 2.09766C55.9141 2.12109 55.9297 2.14062 55.9375 2.15625C56.3594 2.39844 56.7734 2.60156 57.1797 2.76562C57.5938 2.92969 58.0078 3.07812 58.4219 3.21094C58.8359 3.33594 59.25 3.46094 59.6641 3.58594C60.0781 3.70312 60.5078 3.83594 60.9531 3.98438C61.0859 4.03125 61.1953 4.10547 61.2812 4.20703C61.375 4.30078 61.4219 4.42188 61.4219 4.57031C61.4219 4.625 61.4102 4.67578 61.3867 4.72266C61.3633 4.76953 61.2969 4.78906 61.1875 4.78125L56.8398 7.85156C56.832 7.85938 56.8203 7.86328 56.8047 7.86328H56.7461C56.6758 7.86328 56.6211 7.85156 56.582 7.82812C56.5508 7.80469 56.5273 7.77734 56.5117 7.74609C56.4961 7.70703 56.4883 7.66406 56.4883 7.61719Z" :fill="logoColors[2]" />
        <defs>
          <linearGradient
            id="paint0_linear_2_49"
            x1="31.5"
            y1="-3"
            x2="31.5"
            y2="15"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0.515625" :stop-color="logoColors[0]" />
            <stop offset="0.552083" :stop-color="logoColors[2]" />
          </linearGradient>
        </defs>
      </svg>

      <!-- Banner  -->
      <a
        :style="bannerPosition"
        class="vue-inspector-banner vue-inspector-card"
        href="https://github.com/webfansplz/vite-plugin-vue-inspector"
        target="_blank"
      >
        <div>vite-plugin-vue-inspector</div>
        <div class="tip">Click on a element › Open IDE › Link to File</div>
      </a>
    </div>
    <!-- Overlay -->
    <template v-if="overlayVisible && linkParams">
      <div
        ref="floatsRef"
        class="vue-inspector-floats vue-inspector-card" :class="[{ 'vue-inspector-animated': animation }]"
        :style="floatsStyle"
      >
        <div>{{ linkParams.title }}:{{ linkParams.line }}:{{ linkParams.column }}</div>
        <div class="tip">
          Click to go to the file
        </div>
      </div>
      <div
        class="vue-inspector-size-indicator" :class="[{ 'vue-inspector-animated': animation }]"
        :style="sizeIndicatorStyle"
      />
    </template>
  </div>
</template>

<style scoped>
.vue-inspector-container {
  cursor: pointer;
  position: fixed;
  text-align: center;
  z-index: 2147483647;
  font-family: Arial, Helvetica, sans-serif;
}

.vue-inspector-card {
  font-family: Arial, Helvetica, sans-serif;
  padding: 5px 8px;
  border-radius: 4px;
  text-align: left;
  color:#e9e9e9;
  font-size: 14px;
  background-color:#42b883;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1);
}

.vue-inspector-card .tip {
  font-size: 11px;
  opacity: 0.7;
}

.vue-inspector-banner {
  display: none;
  position: absolute;
  margin: 0;
  width: 260px;
  text-decoration: none;
}

.vue-inspector-container:hover .vue-inspector-banner {
  display: block;
}

.vue-inspector-container--disabled:hover .vue-inspector-banner {
  display: none;
}

.vue-inspector-floats {
  z-index: 2147483647;
  position: fixed;
  transform: translateX(-50%);
  pointer-events: none;
}

.vue-inspector-size-indicator {
  z-index: 2147483646;
  position: fixed;
  background-color:#42b88325;
  border: 1px solid #42b88350;
  border-radius: 5px;
  pointer-events: none;
}

.vue-inspector-animated {
  transition: all 0.1s ease-in;
}

@media (prefers-reduced-motion) {
  .vue-inspector-animated {
    transition: none !important;
  }
}
</style>
