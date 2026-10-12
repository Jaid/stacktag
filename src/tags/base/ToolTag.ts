import type {PackageJson} from 'type-fest'

import fs from '#src/lib/fs.ts'
import NotDetectedError from '#src/NotDetectedError.ts'

import PackageJsonAwareTag from './PackageJsonAwareTag.ts'

export const dependencyFields = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'] as const

export type DependencyField = typeof dependencyFields[number]

export type Dependency = {
  field: DependencyField
  name: string
  version: string
}

export type Payload = {
  configFile?: string
  dependency?: Dependency
}

export const findDependency = (packageJson: PackageJson | undefined, names: Array<string>) => {
  if (!packageJson) {
    return
  }
  for (const field of dependencyFields) {
    const dependencies = packageJson[field]
    if (!dependencies) {
      continue
    }
    for (const name of names) {
      const version = dependencies[name]
      if (typeof version === 'string') {
        return {
          field,
          name,
          version,
        } satisfies Dependency
      }
    }
  }
}

/**
 * Base class for tags that represent a tool, which is detected by either a config file in the project folder or a package listed in `package.json` dependencies.
 */
export default abstract class ToolTag extends PackageJsonAwareTag {
  override async detect(folder: string): Promise<Payload> {
    const configFile = await fs.findFirstExistingFile(folder, this.getConfigFiles())
    const dependency = findDependency(this.packageJson, this.getDependencyNames())
    if (!configFile && !dependency) {
      throw new NotDetectedError(`no ${this.getName()} indicator`)
    }
    const value: Payload = {}
    if (configFile) {
      value.configFile = configFile
    }
    if (dependency) {
      value.dependency = dependency
    }
    return value
  }
  /**
   * @return file names relative to the project folder, in order of precedence
   */
  abstract getConfigFiles(): Array<string>
  /**
   * @return npm package names that indicate usage of the tool
   */
  abstract getDependencyNames(): Array<string>
}
