# stacktag

Analyzes a project folder and returns detected stack tags plus tag-specific metadata.

## Usage

```ts
import Project from 'stacktag'

const project = new Project('C:/Users/jaid/git/stacktag')

console.log(await project.getTags())
console.log(await project.getResults())
```

## API

### `new Project(cwd?)`

Creates an analyzer for `cwd`. If omitted, the current working directory is used.

### `await project.getTags()`

Returns all detected tags in execution order.

```ts
type DetectedTag = {
	id: string
	name: string
	value: unknown
}
```

### `await project.getResults()`

Returns detailed results for all registered tags, including skipped and undetected ones.

### `await project.getResult(tag)`

Returns the detailed result for a single tag. `tag` may be a tag id or a tag class.

### `await project.hasTag(tag)`

Returns whether a tag was detected.

## Built-in tags

- `git`
- `node_like`
- `node`
- `bun`
- `deno`
- `python`
- `rust`
