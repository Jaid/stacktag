import NotDetectedError from '#src/NotDetectedError.ts'

import Tag from './base/Tag.ts'
import NodeLikeTag from './NodeLikeTag.ts'

export default class NodeTag extends Tag {
  engines?: Record<string, string>
  override async detect() {
    if (!this.engines?.node) {
      throw new NotDetectedError('not in package.json#engines.node')
    }
    return this.engines.node
  }
  override getName() {
    return 'Node.js'
  }
  override listen(event) {
    if (event.tag instanceof NodeLikeTag) {
      this.engines = (event.result as NodeLikeTag).engines
    }
  }
  override needs() {
    return NodeLikeTag
  }
}
