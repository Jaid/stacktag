import type {Arrayable, Constructor} from 'type-fest'

import EventEmitter from 'events'

export type EventPayload = {
  detection: boolean
  id: string
  tag: Constructor<Tag>
  value: unknown
}
type TagRepresentation = Constructor<Tag> | string
type TagList = Arrayable<TagRepresentation>

export default abstract class Tag extends EventEmitter {
  /**
   * A detection run that doesn’t throw will always be considered a `true` detection. Throw a `NotDetectedError` to indicate a `false` state from a clean detection run or any other `Error` to indicate a `false` state due to unexpected conditions.
   * @return an optional payload with data collected during detection
   */
  abstract detect(folder: string): Promise<unknown>
  getName(): string {
    return this.constructor.name
  }
  /**
   * @returns priority – higher numbers get evaluated earlier
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
