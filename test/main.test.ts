import {expect, test} from 'bun:test'

const {default: stacktag} = await import('#src/main.ts')

test('should run', () => {
  const result = stacktag()
  expect(result).toBe('stacktag') // TODO Test actual functionality
})
