<center><a href="https://npmjs.com/package/stacktag"><img src="https://shieldcn.dev/npm/v/stacktag.svg?variant=secondary&logo=npm&label=latest+version" alt="Latest version on npm"/></a> <a href="https://github.com/Jaid/stacktag/raw/HEAD/license.txt"><img src="https://shieldcn.dev/github/license/Jaid/stacktag.svg?variant=secondary" alt="License"/></a> <a href="https://bun.sh"><picture><source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/badge/Bun-fbf0df.svg?variant=outline&logo=bun&logoColor=fbf0df&mode=dark"><img src="https://shieldcn.dev/badge/Bun-fbf0df.svg?variant=outline&logo=bun&logoColor=fbf0df&mode=light" alt="Bun"/></picture></a></center>

# stacktag

Analyzes a project folder and returns tags and metadata

## minimal example

```ts
import Project from 'stacktag'

const project = await Project.detect('C:/Users/jaid/git/stacktag')
// [{id: 'git', name: 'Git', value: {head: 'main', headType: 'branch'}}, {id: 'git_like', name: 'Git-like', value: undefined}, …]
console.log(project.getTags())
```

## features

- detects Git, Git-like, Node-like, Node.js, Bun, Deno, Python and Rust projects
- returns tag-specific JSON-serializable metadata, such as the parsed `package.json`, `bunfig.toml`, `deno.jsonc`, `pyproject.toml` or `Cargo.toml`
- distinguishes detected, undetected, skipped, implied and failed tags in detailed per-tag results
- dependency-aware execution order derived from priorities and tag relations
- extensible with custom `Tag` subclasses and custom tag registries

## installation

<a href="https://bun.sh"><picture><source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/badge/Bun-fbf0df.svg?variant=outline&logo=bun&logoColor=fbf0df&mode=dark"><img src="https://shieldcn.dev/badge/Bun-fbf0df.svg?variant=outline&logo=bun&logoColor=fbf0df&mode=light" alt="Bun"/></picture></a>

```sh
bun add stacktag
```

<a href="https://npmjs.com/package/stacktag"><img src="https://shieldcn.dev/badge/npm-stacktag-C23039.svg?variant=secondary&logo=npm" alt="stacktag on npm"/></a>

```sh
npm install --save stacktag
```

## usage

`Project.detect(cwd?)` analyzes a folder and returns a ready-to-use `Project`. If `cwd` is omitted, the current working directory is used.

```ts
import Project from 'stacktag'

const project = await Project.detect()

if (project.hasTag('bun')) {
  console.log(project.getResult('bun').value)
}
```

Alternatively, construct a `Project` yourself and call `await project.init()` before using any instance method or `project.results`. Concurrent `init()` calls share one detection run.

```ts
const project = new Project('C:/Users/jaid/git/stacktag')
await project.init()
```

Accessing results before `init()` has completed throws.

### built-in tags

| ID | name | detected by | payload |
| --- | --- | --- | --- |
| `git` | Git | `.git` folder or `gitdir:` file with a readable `HEAD` | `head` and `headType` (`branch` or `detached`) |
| `git_like` | Git-like | `.gitignore`, `.gitattributes` or `.gitmodules` | none |
| `node_like` | Node-like | nonempty `package.json` | `packageJson` |
| `node` | Node.js | `package.json#engines.node`, needs `node_like` | `engineSelector` |
| `bun` | Bun | `bun.lock`, `bun.lockb`, `bunfig.toml`, `package.json#engines.bun` or a `bun@` package manager | `config`, `configFile`, `engineVersion`, `lockfile`, `packageManager` and `runtimeVersion` |
| `deno` | Deno | `deno.json`, `deno.jsonc`, `deno.lock`, `import_map.json`, `package.json#engines.deno` or a `deno@` package manager | `config`, `configFile`, `engineVersion`, `importMap`, `lockfile`, `packageManager` and `runtimeVersion` |
| `python` | Python | `pyproject.toml`, `.python-version`, `requirements.txt`, `setup.cfg`, `Pipfile`, `setup.py`, `uv.lock` or `poetry.lock` | `config`, `configFile`, `lockfile`, `requirements` and `runtimeVersion` |
| `rust` | Rust | `Cargo.toml`, `Cargo.lock`, `rust-toolchain.toml` or `rust-toolchain` | `cargo`, `cargoFile`, `lockfile`, `toolchain` and `toolchainFile` |

Payload fields are only present when the corresponding source was found. Configuration files are parsed: TOML for `bunfig.toml`, `pyproject.toml`, `Cargo.toml` and `rust-toolchain.toml`, JSON5 for `package.json` and `deno.json(c)`.

The default registry is exported as `tags` and every built-in tag class is exported by name (`GitTag`, `NodeTag`, `BunTag`, …).

## advanced usage

### custom tags

Extend `Tag` and implement `detect(folder)` to add your own tags. Pass a registry containing them as the second argument of `Project.detect()` or the `Project` constructor. To keep the built-in tags, start from the exported `tags` map.

```ts
import type {TagDetectionResult} from 'stacktag'

import fs from 'fs-extra'
import Project, {NotDetectedError, Tag, tags} from 'stacktag'

class DockerTag extends Tag {
  override async detect(folder: string): Promise<TagDetectionResult> {
    if (!await fs.exists(`${folder}/Dockerfile`)) {
      throw new NotDetectedError('no Dockerfile')
    }
    return {dockerfile: 'Dockerfile'}
  }
  override getName() {
    return 'Docker'
  }
}

const registry = new Map(tags)
registry.set('docker', DockerTag)
const project = await Project.detect(process.cwd(), registry)
```

The return value of `detect()` decides the detection state:

- any JSON-serializable value except `false` → detected, with that value as payload
- `undefined` → detected without a payload
- `false` → not detected
- throwing `NotDetectedError(payload?)` → cleanly not detected, optionally with a diagnostic payload that does not populate `result.error`
- throwing any other error → not detected, with the error stored in `result.error`

### tag relations

Override these methods to influence ordering and detection. Each relation method returns a tag ID, a tag class or an array of them.

| method | effect |
| --- | --- |
| `getName()` | display name, defaults to the class name |
| `getPriority()` | higher priorities are evaluated earlier, defaults to `100` |
| `needs()` | runs after the listed tags and is skipped unless all of them were detected |
| `needsSome()` | runs after the listed tags and is skipped unless at least one of them was detected |
| `shouldRunBefore()` | listed tags are evaluated before this tag |
| `shouldRunAfter()` | listed tags are evaluated after this tag |
| `implies()` | marks the listed tags as detected when this tag is detected |
| `impliesAndSkips()` | like `implies()`, and the listed tags won’t run their own `detect()` |
| `shouldRun()` | return `false` to skip `detect()` |

Execution order is a topological sort of these relations, with ties broken by priority and then by ID. Cyclic relations throw.

### detection events

Every tag is an `EventEmitter` and receives a `detect` event after each detection run, carrying `{detection, error, id, tag, value}`. Tags can use this to read the payloads of tags that ran before them, as the built-in `PackageJsonAwareTag` does to share the parsed `package.json`.

## API

### Project

#### `new Project(cwd?, registry?)`

Creates an analyzer for `cwd`, which defaults to the current working directory. `registry` maps tag IDs to tag classes and defaults to the built-in tags.

#### `await Project.detect(cwd?, registry?)`

Creates a new instance, runs `init()` and returns it.

#### `await project.init()`

Runs all tag detections in execution order and returns the project. Throws if `cwd` is not an existing folder.

#### `project.getTags()`

Returns all detected tags in execution order.

```ts
type DetectedTag = {
  id: string
  name: string
  value: TagPayload | undefined
}
```

#### `project.hasTag(tag)`

Returns whether a tag was detected. `tag` may be a tag ID or a tag class.

#### `project.getResult(tag)`

Returns the detailed result for a single tag. `tag` may be a tag ID or a tag class.

```ts
type TagResult = {
  detected: boolean
  error?: Error
  forced: boolean
  id: string
  impliedBy: Array<string>
  name: string
  priority: number
  ran: boolean
  skipped: boolean
  value: TagPayload | undefined
}
```

`ran` tells whether `detect()` was called, `skipped` whether it was left out because of unmet requirements, `forced` whether the tag was implied by another tag (listed in `impliedBy`) and `error` holds unexpected errors thrown during detection.

#### `project.results` / `project.getResults()`

Returns detailed results for all registered tags keyed by ID, including skipped and undetected ones.

## development

Maintain README content in `docs/tldw`. Do not edit `readme.md` directly.

`bun run readme` regenerates it.

### setting up

```sh
git clone git@github.com:Jaid/stacktag.git
cd stacktag
bun install
```

### testing

```sh
bun run test
```

## license

[MIT License](https://github.com/Jaid/stacktag/raw/HEAD/license.txt)<br>
Copyright © 2026, Jaid \<jaid.jsx@gmail.com> (https://github.com/jaid)

<!--
readme generated with tldw v9.9.0 from ./docs/tldw
github.com/Jaid/tldw
-->
