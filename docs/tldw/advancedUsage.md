# custom tags

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

# tag relations

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

# detection events

Every tag is an `EventEmitter` and receives a `detect` event after each detection run, carrying `{detection, error, id, tag, value}`. Tags can use this to read the payloads of tags that ran before them, as the built-in `PackageJsonAwareTag` does to share the parsed `package.json`.
