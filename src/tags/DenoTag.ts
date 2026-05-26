import {findFirstExistingFile, parseJson5File} from '#src/lib/fs.ts'
import NotDetectedError from '#src/NotDetectedError.ts'
import {parsePackageManagerVersion} from '#src/packageManager.ts'

import PackageJsonAwareTag from './base/PackageJsonAwareTag.ts'

export default class DenoTag extends PackageJsonAwareTag {
  override async detect(folder: string) {
    const packageManager = this.packageJson?.packageManager
    const runtimeVersion = parsePackageManagerVersion(packageManager, 'deno')
    const engineVersion = this.packageJson?.engines?.deno
    const configFile = await findFirstExistingFile(folder, ['deno.json', 'deno.jsonc'])
    const importMap = await findFirstExistingFile(folder, ['import_map.json'])
    const lockfile = await findFirstExistingFile(folder, ['deno.lock'])
    if (!runtimeVersion && !engineVersion && !configFile && !importMap && !lockfile) {
      throw new NotDetectedError('No Deno marker was found.')
    }
    const value: Record<string, unknown> = {}
    if (configFile) {
      value.config = await parseJson5File(`${folder}/${configFile}`)
      value.configFile = configFile
    }
    if (engineVersion) {
      value.engineVersion = engineVersion
    }
    if (importMap) {
      value.importMap = importMap
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
    return Object.keys(value).length > 0 ? value : true
  }
  override getName() {
    return 'Deno'
  }
}
