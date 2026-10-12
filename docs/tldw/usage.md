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

| ID | implication | detected by | payload |
| --- | --- | --- | --- |
| `git` | is a Git repository | `.git` folder or `gitdir:` file with a readable `HEAD` | `{head: string, headType: 'branch' \| 'detached'}` |
| `git_like` | is meant to be versioned with Git | `.gitignore`, `.gitattributes` or `.gitmodules` |  |
| `github` | has GitHub-related files | at least one file in `.github` | `{files: Array<string>, workflows?: Array<string>}` |
| `github_repository` | is hosted on GitHub | a `url` or `pushurl` of any Git remote pointing to github.com, after applying `url.<base>.insteadOf` rewrites, needs `git` | `{remotes: Array<{name: string, owner?: string, repo?: string, url: string}>}` |
| `node_like` | is an npm-style package | nonempty `package.json` | `{packageJson: PackageJson}` |
| `node` | targets Node.js | `package.json#engines.node`, needs `node_like` | `{engineSelector: string}` |
| `workspace` | is a workspace root | `package.json#workspaces` matching at least one package, traversed recursively with [traverse-workspace](https://github.com/Jaid/traverse-workspace), needs `node_like` | `{packages: Array<{folder: string, hierarchy: Array<string>, name?: string, private?: boolean, version?: string}>}` |
| `bun` | uses Bun | `bun.lock`, `bun.lockb`, `bunfig.toml`, `package.json#engines.bun` or a `bun@` package manager | `{config?: JsonObject, configFile?: string, engineVersion?: string, lockfile?: string, packageManager?: string, runtimeVersion?: string}` |
| `deno` | uses Deno | `deno.json`, `deno.jsonc`, `deno.lock`, `import_map.json`, `package.json#engines.deno` or a `deno@` package manager | `{config?: JsonObject, configFile?: string, engineVersion?: string, importMap?: string, lockfile?: string, packageManager?: string, runtimeVersion?: string}` |
| `python` | uses Python | `pyproject.toml`, `.python-version`, `requirements.txt`, `setup.cfg`, `Pipfile`, `setup.py`, `uv.lock` or `poetry.lock` | `{config?: JsonObject, configFile?: string, lockfile?: string, requirements?: Array<string>, runtimeVersion?: string}` |
| `rust` | uses Rust | `Cargo.toml`, `Cargo.lock`, `rust-toolchain.toml` or `rust-toolchain` | `{cargo?: JsonObject, cargoFile?: string, lockfile?: string, toolchain?: JsonObject \| string, toolchainFile?: string}` |
| `typescript` | uses TypeScript | `tsconfig.json` or any `.ts`, `.tsx`, `.mts` or `.cts` file that is not inside `node_modules`, `.git` or gitignored paths | `{config?: JsonObject, configFile?: string, sourceFile?: string}` |
| `vite` | uses Vite | `vite.config.(js\|mjs\|ts\|cjs\|mts\|cts)` or a `vite` dependency | `{configFile?: string, dependency?: Dependency}` |
| `rolldown` | uses Rolldown | `rolldown.config.(js\|mjs\|ts\|cjs\|mts\|cts)` or a `rolldown` dependency | `{configFile?: string, dependency?: Dependency}` |
| `eslint` | uses ESLint | `eslint.config.(js\|mjs\|cjs\|ts\|mts\|cts)`, `.eslintrc(.js\|.cjs\|.yaml\|.yml\|.json)`, `package.json#eslintConfig` or an `eslint` dependency | `{configFile?: string, configFormat?: 'flat' \| 'legacy', dependency?: Dependency, packageJsonConfig?: true}` |
| `browserslist` | has a Browserslist config | `.browserslistrc`, `browserslist` or `package.json#browserslist` | `{config: Record<string, Array<string>>, configFile?: string, packageJsonConfig?: true}` |

`JsonObject` and `PackageJson` are the types from `type-fest`. `Dependency` is `{field: 'dependencies' | 'devDependencies' | 'optionalDependencies' | 'peerDependencies', name: string, version: string}`, describing the first matching entry in `package.json`. Browserslist queries are keyed by environment, with `defaults` holding queries outside of `[environment]` sections, like `browserslist.parseConfig()` returns them. `sourceFile` is the first TypeScript file found, not a complete list. Optional payload fields are only present when the corresponding source was found. Configuration files are parsed: TOML for `bunfig.toml`, `pyproject.toml`, `Cargo.toml` and `rust-toolchain.toml`, JSON5 for `package.json`, `deno.json(c)` and `tsconfig.json`.

The default registry is exported as `tags` and every built-in tag class is exported by name (`GitTag`, `NodeTag`, `BunTag`, …). `ToolTag` is exported as a base class for tags that are detected by a config file or a `package.json` dependency.
