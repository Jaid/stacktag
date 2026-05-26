import type {EventPayload} from './Tag.ts'
import type {PackageJson} from 'type-fest'

import NodeLikeTag from '../NodeLikeTag.ts'
import Tag from './Tag.ts'

export default abstract class PackageJsonAwareTag extends Tag {
  packageJson?: PackageJson
  constructor() {
    super()
    this.on('detect', (event: EventPayload) => {
      if (!event.detection) {
        return
      }
      if (!(event.tag instanceof NodeLikeTag)) {
        return
      }
      this.packageJson = event.value as PackageJson
    })
  }
  override shouldRunBefore() {
    return NodeLikeTag
  }
}
