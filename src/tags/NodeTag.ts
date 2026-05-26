import NotDetectedError from '#src/NotDetectedError.ts'

import PackageJsonAwareTag from './base/PackageJsonAwareTag.ts'
import NodeLikeTag from './NodeLikeTag.ts'

export default class NodeTag extends PackageJsonAwareTag {
  override async detect() {
    if (!this.packageJson?.engines?.node) {
      throw new NotDetectedError('not in package.json#engines.node')
    }
    return this.packageJson.engines.node
  }
  override getName() {
    return 'Node.js'
  }
  override needs() {
    return NodeLikeTag
  }
}
