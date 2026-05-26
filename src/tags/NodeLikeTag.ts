import type {PackageJson} from 'type-fest'

import fs from 'fs-extra'

import expect from '#src/expect.ts'

import Tag from './base/Tag.ts'

export default class NodeLikeTag extends Tag {
  override async detect(folder: string) {
    const packageJsonFile = `${folder}/package.json`
    await expect.fileNotEmpty(packageJsonFile)
    const packageJsonText = await fs.readFile(packageJsonFile, 'utf8')
    const packageJson = Bun.JSON5.parse(packageJsonText) as PackageJson
    return packageJson
  }
  override getName() {
    return 'Node-like'
  }
}
