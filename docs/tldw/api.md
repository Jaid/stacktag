# Project

## `new Project(cwd?, registry?)`

Creates an analyzer for `cwd`, which defaults to the current working directory. `registry` maps tag IDs to tag classes and defaults to the built-in tags.

## `await Project.detect(cwd?, registry?)`

Creates a new instance, runs `init()` and returns it.

## `await project.init()`

Runs all tag detections in execution order and returns the project. Throws if `cwd` is not an existing folder.

## `project.getTags()`

Returns all detected tags in execution order.

```ts
type DetectedTag = {
  id: string
  name: string
  value: TagPayload | undefined
}
```

## `project.hasTag(tag)`

Returns whether a tag was detected. `tag` may be a tag ID or a tag class.

## `project.getResult(tag)`

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

## `project.results` / `project.getResults()`

Returns detailed results for all registered tags keyed by ID, including skipped and undetected ones.
