import type Tag from '#src/tags/base/Tag.ts'
import type {Constructor} from 'type-fest'

import GitTag from './GitTag.ts'
import NodeLikeTag from './NodeLikeTag.ts'
import NodeTag from './NodeTag.ts'

const map = new Map<string, Constructor<Tag>>
const add = (id: string, TagClass: Constructor<Tag>) => {
  map.set(id, TagClass)
}
add('git', GitTag)
add('node', NodeTag)
add('node_like', NodeLikeTag)

export default map
