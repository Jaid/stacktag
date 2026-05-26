import type Tag from '#src/tags/base/Tag.ts'
import type {Constructor} from 'type-fest'

import BunTag from './BunTag.ts'
import DenoTag from './DenoTag.ts'
import GitTag from './GitTag.ts'
import NodeLikeTag from './NodeLikeTag.ts'
import NodeTag from './NodeTag.ts'
import PythonTag from './PythonTag.ts'
import RustTag from './RustTag.ts'

const map = new Map<string, Constructor<Tag>>
const add = (id: string, TagClass: Constructor<Tag>) => {
  map.set(id, TagClass)
}
add('bun', BunTag)
add('deno', DenoTag)
add('git', GitTag)
add('node', NodeTag)
add('node_like', NodeLikeTag)
add('python', PythonTag)
add('rust', RustTag)

export {BunTag, DenoTag, GitTag, NodeLikeTag, NodeTag, PythonTag, RustTag}
export default map
