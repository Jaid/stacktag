import type {Arrayable, Constructor} from 'type-fest'

type TagRepresentation = Constructor<Tag> | string
type TagList = Arrayable<TagRepresentation>
type EventPayload = {
  detection: boolean
  id: string
  tag: Constructor<Tag>
  value: unknown
}

export default abstract class Tag {
  abstract detect(folder: string, partialResults: Record<string, unknown>): Promise<unknown>
  getName(): string {
    return this.constructor.name
  }
  getPriority(): number {
    return 100
  }
  implies(): TagList {
    return []
  }
  impliesAndSkips(): TagList {
    return []
  }
  listen(event: EventPayload) {
    void event
  }
  needs(): TagList {
    return []
  }
  needsSome(): TagList {
    return []
  }
  shouldRun(partialResults: Record<string, unknown>): boolean {
    void partialResults
    return true
  }
  shouldRunAfter(): TagList {
    return []
  }
  shouldRunBefore(): TagList {
    return []
  }
}
