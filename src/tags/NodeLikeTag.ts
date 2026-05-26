import type {PackageJson} from 'type-fest'

import expect from '#src/expect.ts'
import fs from '#src/lib/fs.ts'

import Tag from './base/Tag.ts'

export default class NodeLikeTag extends Tag {
  override async detect(folder: string) {
    const packageJsonFile = `${folder}/package.json`
    await expect.fileNotEmpty(packageJsonFile)
    return fs.parseJson5File<PackageJson>(packageJsonFile)
  }
  override getName() {
    return 'Node-like'
  }
}
