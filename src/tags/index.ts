import type Tag from './base/Tag.ts'
import type {Constructor} from 'type-fest'

import BunTag from './BunTag.ts'
import DenoTag from './DenoTag.ts'
import GitLikeTag from './GitLikeTag.ts'
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
add('git_like', GitLikeTag)
add('node', NodeTag)
add('node_like', NodeLikeTag)
add('python', PythonTag)
add('rust', RustTag)

export default map

export {default as BunTag} from './BunTag.ts'
export {default as DenoTag} from './DenoTag.ts'
export {default as GitLikeTag} from './GitLikeTag.ts'
export {default as GitTag} from './GitTag.ts'
export {default as NodeLikeTag} from './NodeLikeTag.ts'
export {default as NodeTag} from './NodeTag.ts'
export {default as PythonTag} from './PythonTag.ts'
export {default as RustTag} from './RustTag.ts'
