import type Tag from './base/Tag.ts'
import type {Constructor} from 'type-fest'

import BrowserslistTag from './BrowserslistTag.ts'
import BunTag from './BunTag.ts'
import DenoTag from './DenoTag.ts'
import EslintTag from './EslintTag.ts'
import GithubRepositoryTag from './GithubRepositoryTag.ts'
import GithubTag from './GithubTag.ts'
import GitLikeTag from './GitLikeTag.ts'
import GitTag from './GitTag.ts'
import NodeLikeTag from './NodeLikeTag.ts'
import NodeTag from './NodeTag.ts'
import PythonTag from './PythonTag.ts'
import RolldownTag from './RolldownTag.ts'
import RustTag from './RustTag.ts'
import TypescriptTag from './TypescriptTag.ts'
import ViteTag from './ViteTag.ts'
import WorkspaceTag from './WorkspaceTag.ts'

const map = new Map<string, Constructor<Tag>>
const add = (id: string, TagClass: Constructor<Tag>) => {
  map.set(id, TagClass)
}
add('browserslist', BrowserslistTag)
add('bun', BunTag)
add('deno', DenoTag)
add('eslint', EslintTag)
add('git', GitTag)
add('git_like', GitLikeTag)
add('github', GithubTag)
add('github_repository', GithubRepositoryTag)
add('node', NodeTag)
add('node_like', NodeLikeTag)
add('python', PythonTag)
add('rolldown', RolldownTag)
add('rust', RustTag)
add('typescript', TypescriptTag)
add('vite', ViteTag)
add('workspace', WorkspaceTag)

export default map

export {default as BrowserslistTag} from './BrowserslistTag.ts'
export {default as BunTag} from './BunTag.ts'
export {default as DenoTag} from './DenoTag.ts'
export {default as EslintTag} from './EslintTag.ts'
export {default as GithubRepositoryTag} from './GithubRepositoryTag.ts'
export {default as GithubTag} from './GithubTag.ts'
export {default as GitLikeTag} from './GitLikeTag.ts'
export {default as GitTag} from './GitTag.ts'
export {default as NodeLikeTag} from './NodeLikeTag.ts'
export {default as NodeTag} from './NodeTag.ts'
export {default as PythonTag} from './PythonTag.ts'
export {default as RolldownTag} from './RolldownTag.ts'
export {default as RustTag} from './RustTag.ts'
export {default as TypescriptTag} from './TypescriptTag.ts'
export {default as ViteTag} from './ViteTag.ts'
export {default as WorkspaceTag} from './WorkspaceTag.ts'
