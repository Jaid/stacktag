import {afterEach, beforeAll, describe, expect, test} from 'bun:test'
import os from 'node:os'
import path from 'node:path'

import fs from 'fs-extra'

const fixtureIds = await fs.readdir(path.join(import.meta.dirname, 'fixture'))
const outputFolder = path.join(import.meta.dirname, '../temp/test/fixtures')
await fs.ensureDir(outputFolder)
describe.each(fixtureIds)('%s', fixtureId => {
  beforeAll(async () => {
    const {default: source} = await import(`#root/test/fixture/${fixtureId}/source.ts`)
    const fixtureOutputFolder = `${outputFolder}/${fixtureId}_${source.revision}`
    const fixtureOutputFolderExists = await fs.exists(fixtureOutputFolder)
    if (fixtureOutputFolderExists) {
      return
    }
    await Bun.$`git clone --depth 1 --revision ${source.revision} git@github.com:${source.repo}.git ${fixtureOutputFolder}`
  }, {timeout: 1000 * 60})
  test('check', async () => {

  })
})
