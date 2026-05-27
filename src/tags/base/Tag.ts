import type {Arrayable, Constructor, Jsonifiable} from 'type-fest'

import {EventEmitter} from 'node:events'

export type TagPayload = Exclude<Jsonifiable, false>
export type TagDetectionResult = TagPayload | false | void

export type EventPayload = {
  detection: boolean
  error?: Error
  id: string
  tag: Tag
  value: TagPayload | undefined
}
export type TagRepresentation = Constructor<Tag> | string
export type TagList = Arrayable<TagRepresentation>

export default abstract class Tag extends EventEmitter {
  /**
   * @return A detection run that can have various kinds of returns to signal different states:
   * - `Jsonifiable`: considered a `true` detection with a payload consisting of tag-related context that can be accessed by the library user and by other tags during their own detection runs
   * - `true | undefined | void`: considered a `true` detection without a payload
   * - `false`: considered a `false` detection without a payload
   * - Throw a `NotDetectedError` to indicate a `false` state from a clean detection run and use the constructor to give a custom payload, usually just a textual hint
   * - Throw any other `Error` to indicate a `false` state due to unexpected conditions
   */
  abstract detect(folder: string): Promise<TagDetectionResult>
  getName(): string {
    return this.constructor.name
  }
  /**
   * @return priority – higher numbers get evaluated earlier
   */
  getPriority(): number {
    return 100
  }
  /**
   * @return a list of tags whose detection state should be forcibly `true`
   */
  implies(): TagList {
    return []
  }
  /**
   * @return a list of tags whose detection state should be `true`, furthermore those won’t have their own `detect()` called
   */
  impliesAndSkips(): TagList {
    return []
  }
  /**
   * @return a list of tags that should be detected before this tag gets detected – Every listed tag must have a detection state of `true`, otherwise the own detection will be skipped
   */
  needs(): TagList {
    return []
  }
  /**
   * @return a list of tags that should be detected before this tag gets detected – At least one of the listed tags must have a detection state of `true`, otherwise the own detection will be skipped
   */
  needsSome(): TagList {
    return []
  }
  /**
   * @return whether `detect()` should be called
   */
  shouldRun(): boolean {
    return true
  }
  /**
   * @return a list of tags that should be detected after this tag gets detected
   */
  shouldRunAfter(): TagList {
    return []
  }
  /**
   * @return a list of tags that should be detected before this tag gets detected
   */
  shouldRunBefore(): TagList {
    return []
  }
}
