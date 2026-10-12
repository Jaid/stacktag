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

# built-in tags

| ID | name | detected by | payload |
| --- | --- | --- | --- |
| `git` | Git | `.git` folder or `gitdir:` file with a readable `HEAD` | `{head: string, headType: 'branch' \| 'detached'}` |
| `git_like` | Git-like | `.gitignore`, `.gitattributes` or `.gitmodules` | `undefined` |
| `node_like` | Node-like | nonempty `package.json` | `{packageJson: PackageJson}` |
| `node` | Node.js | `package.json#engines.node`, needs `node_like` | `{engineSelector: string}` |
| `bun` | Bun | `bun.lock`, `bun.lockb`, `bunfig.toml`, `package.json#engines.bun` or a `bun@` package manager | `{config?: JsonObject, configFile?: string, engineVersion?: string, lockfile?: string, packageManager?: string, runtimeVersion?: string}` |
| `deno` | Deno | `deno.json`, `deno.jsonc`, `deno.lock`, `import_map.json`, `package.json#engines.deno` or a `deno@` package manager | `{config?: JsonObject, configFile?: string, engineVersion?: string, importMap?: string, lockfile?: string, packageManager?: string, runtimeVersion?: string}` |
| `python` | Python | `pyproject.toml`, `.python-version`, `requirements.txt`, `setup.cfg`, `Pipfile`, `setup.py`, `uv.lock` or `poetry.lock` | `{config?: JsonObject, configFile?: string, lockfile?: string, requirements?: Array<string>, runtimeVersion?: string}` |
| `rust` | Rust | `Cargo.toml`, `Cargo.lock`, `rust-toolchain.toml` or `rust-toolchain` | `{cargo?: JsonObject, cargoFile?: string, lockfile?: string, toolchain?: JsonObject \| string, toolchainFile?: string}` |

`JsonObject` and `PackageJson` are the types from `type-fest`. Optional payload fields are only present when the corresponding source was found. Configuration files are parsed: TOML for `bunfig.toml`, `pyproject.toml`, `Cargo.toml` and `rust-toolchain.toml`, JSON5 for `package.json` and `deno.json(c)`.

The default registry is exported as `tags` and every built-in tag class is exported by name (`GitTag`, `NodeTag`, `BunTag`, …).
