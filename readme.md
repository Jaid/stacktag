# stacktag

Analyzes a project folder and returns detected stack tags plus tag-specific metadata.

## Usage

```ts
import Project from 'stacktag'

const project = await Project.detect('C:/Users/jaid/git/stacktag')

console.log(project.getTags())
console.log(project.results)
```

## API

### `new Project(cwd?)`

Creates an analyzer for `cwd`. If omitted, the current working directory is used.

Call `await project.init()` before using any instance methods or `project.results`.

### `await Project.detect(cwd?)`

Creates a new instance, runs `init()` and returns the ready-to-use project.

### `project.results`

Returns detailed results for all registered tags, including skipped and undetected ones.

Throws if `init()` has not completed yet.

### `project.getTags()`

Returns all detected tags in execution order.

```ts
type DetectedTag = {
	id: string
	name: string
	value: unknown
}
```

### `project.getResults()`

Sync alias for `project.results`.

### `project.getResult(tag)`

Returns the detailed result for a single tag. `tag` may be a tag id or a tag class.

### `project.hasTag(tag)`

Returns whether a tag was detected.

## Built-in tags

- `git`
- `node_like`
- `node`
- `bun`
- `deno`
- `python`
- `rust`
