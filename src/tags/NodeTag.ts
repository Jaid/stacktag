import NotDetectedError from '#src/NotDetectedError.ts'

import PackageJsonAwareTag from './base/PackageJsonAwareTag.ts'
import NodeLikeTag from './NodeLikeTag.ts'

export type Payload = {
  engineSelector: string
}

export default class NodeTag extends PackageJsonAwareTag {
  override async detect(): Promise<Payload> {
    if (!this.packageJson?.engines?.node) {
      throw new NotDetectedError('not in package.json#engines.node')
    }
    return {engineSelector: this.packageJson.engines.node}
  }
  override getName() {
    return 'Node.js'
  }
  override needs() {
    return NodeLikeTag
  }
}
