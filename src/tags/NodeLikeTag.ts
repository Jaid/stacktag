import type {PackageJson} from 'type-fest'

import expect from '#src/expect.ts'
import fs from '#src/lib/fs.ts'

import Tag from './base/Tag.ts'

export type Payload = {
  packageJson: PackageJson
}

export default class NodeLikeTag extends Tag {
  override async detect(folder: string): Promise<Payload> {
    const packageJsonFile = `${folder}/package.json`
    await expect.fileNotEmpty(packageJsonFile)
    const packageJson = await fs.parseJson5File<PackageJson>(packageJsonFile)
    return {packageJson}
  }
  override getName() {
    return 'Node-like'
  }
}
