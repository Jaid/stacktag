import type {TagPayload} from '#src/tags/base/Tag.ts'

export default class NotDetectedError extends Error {
  readonly payload: TagPayload | undefined
  constructor(payload?: TagPayload, options?: ErrorOptions) {
    super(typeof payload === 'string' ? payload : 'Not detected', options)
    this.name = 'NotDetectedError'
    this.payload = payload
  }
}
