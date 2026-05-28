import type {JsonObject} from 'type-fest'

import fs from '#src/lib/fs.ts'
import NotDetectedError from '#src/NotDetectedError.ts'
import {parsePackageManagerVersion} from '#src/packageManager.ts'

import PackageJsonAwareTag from './base/PackageJsonAwareTag.ts'

export type Payload = {
  config?: JsonObject
  configFile?: string
  engineVersion?: string
  importMap?: string
  lockfile?: string
  packageManager?: string
  runtimeVersion?: string
}

export default class BunTag extends PackageJsonAwareTag {
  override async detect(folder: string): Promise<Payload> {
    const packageManager = this.packageJson?.packageManager
    const runtimeVersion = parsePackageManagerVersion(packageManager, 'bun')
    const engineVersion = this.packageJson?.engines?.bun
    const lockfile = await fs.findFirstExistingFile(folder, ['bun.lock', 'bun.lockb'])
    const configFile = await fs.findFirstExistingFile(folder, ['bunfig.toml'])
    if (!runtimeVersion && !engineVersion && !lockfile && !configFile) {
      throw new NotDetectedError('no Bun indicator')
    }
    const value: Payload = {}
    if (configFile) {
      value.config = await fs.parseTomlFile(`${folder}/${configFile}`)
      value.configFile = configFile
    }
    if (engineVersion) {
      value.engineVersion = engineVersion
    }
    if (lockfile) {
      value.lockfile = lockfile
    }
    if (packageManager) {
      value.packageManager = packageManager
    }
    if (runtimeVersion) {
      value.runtimeVersion = runtimeVersion
    }
    return value
  }
  override getName() {
    return 'Bun'
  }
}
