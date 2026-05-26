import type {EventPayload} from './base/Tag.ts'
import type {PackageJson} from 'type-fest'

import NotDetectedError from '#src/NotDetectedError.ts'

import Tag from './base/Tag.ts'
import NodeLikeTag from './NodeLikeTag.ts'

export default class NodeTag extends Tag {
  engines?: PackageJson['engines']
  constructor() {
    super()
    this.on('detect', (event: EventPayload) => {
      if (event.tag instanceof NodeLikeTag) {
        this.engines = (event.value as PackageJson).engines
      }
    })
  }
  override async detect() {
    if (!this.engines?.node) {
      throw new NotDetectedError('not in package.json#engines.node')
    }
    return this.engines.node
  }
  override getName() {
    return 'Node.js'
  }
  override needs() {
    return NodeLikeTag
  }
}
