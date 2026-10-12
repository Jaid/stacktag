import ToolTag from './base/ToolTag.ts'

export type {Payload} from './base/ToolTag.ts'

export default class RolldownTag extends ToolTag {
  override getConfigFiles() {
    return ['rolldown.config.js', 'rolldown.config.mjs', 'rolldown.config.ts', 'rolldown.config.cjs', 'rolldown.config.mts', 'rolldown.config.cts']
  }
  override getDependencyNames() {
    return ['rolldown']
  }
  override getName() {
    return 'Rolldown'
  }
}
