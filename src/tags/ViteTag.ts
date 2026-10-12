import ToolTag from './base/ToolTag.ts'

export type {Payload} from './base/ToolTag.ts'

export default class ViteTag extends ToolTag {
  override getConfigFiles() {
    return ['vite.config.js', 'vite.config.mjs', 'vite.config.ts', 'vite.config.cjs', 'vite.config.mts', 'vite.config.cts']
  }
  override getDependencyNames() {
    return ['vite']
  }
  override getName() {
    return 'Vite'
  }
}
