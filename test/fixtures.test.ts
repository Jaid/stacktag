import type {FixtureCheck, FixtureSource} from '#root/test/lib/types.ts'

import {beforeAll, describe, test} from 'bun:test'
import path from 'node:path'

import fs from 'fs-extra'

import ProjectClass from '#src/Project.ts'

const fixtureEntries = await fs.readdir(path.join(import.meta.dirname, 'fixture'), {withFileTypes: true})
const fixtureIds = fixtureEntries
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name)
  .toSorted((a, b) => a.localeCompare(b))
const outputFolder = path.join(import.meta.dirname, '../temp/test/fixtures')
await fs.ensureDir(outputFolder)
describe.each(fixtureIds)('%s', fixtureId => {
  let fixtureContentId = ''
  let fixtureOutputFolder = ''
  beforeAll(async () => {
    const {default: source} = (await import(`#root/test/fixture/${fixtureId}/source.ts`)) as {default: FixtureSource}
    fixtureContentId = `${fixtureId}_${source.revision.slice(0, 6)}`
    fixtureOutputFolder = `${outputFolder}/${fixtureContentId}`
    const fixtureOutputFolderExists = await fs.exists(fixtureOutputFolder)
    if (fixtureOutputFolderExists) {
      return
    }
    await Bun.$`git clone --depth 1 --revision ${source.revision} git@github.com:${source.repo}.git ${fixtureOutputFolder}`
  }, {timeout: 60_000})
  test('check', async () => {
    const {default: check} = (await import(`#root/test/fixture/${fixtureId}/check.ts`)) as {default: FixtureCheck}
    const project = await ProjectClass.detect(fixtureOutputFolder)
    await check(project)
  })
})
