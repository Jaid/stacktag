import type {Payload as ToolPayload} from './base/ToolTag.ts'

import fs from '#src/lib/fs.ts'
import NotDetectedError from '#src/NotDetectedError.ts'

import ToolTag, {findDependency} from './base/ToolTag.ts'

export type Payload = ToolPayload & {
  configFormat?: 'flat' | 'legacy'
  packageJsonConfig?: true
}

const flatConfigFiles = ['eslint.config.js', 'eslint.config.mjs', 'eslint.config.cjs', 'eslint.config.ts', 'eslint.config.mts', 'eslint.config.cts']
const legacyConfigFiles = ['.eslintrc.js', '.eslintrc.cjs', '.eslintrc.yaml', '.eslintrc.yml', '.eslintrc.json', '.eslintrc']

export default class EslintTag extends ToolTag {
  override async detect(folder: string): Promise<Payload> {
    const flatConfigFile = await fs.findFirstExistingFile(folder, flatConfigFiles)
    const legacyConfigFile = flatConfigFile ? undefined : await fs.findFirstExistingFile(folder, legacyConfigFiles)
    const configFile = flatConfigFile ?? legacyConfigFile
    const packageJsonConfig = this.packageJson?.eslintConfig !== undefined
    const dependency = findDependency(this.packageJson, this.getDependencyNames())
    if (!configFile && !packageJsonConfig && !dependency) {
      throw new NotDetectedError('no ESLint indicator')
    }
    const value: Payload = {}
    if (configFile) {
      value.configFile = configFile
      value.configFormat = flatConfigFile ? 'flat' : 'legacy'
    } else if (packageJsonConfig) {
      value.configFormat = 'legacy'
    }
    if (dependency) {
      value.dependency = dependency
    }
    if (packageJsonConfig) {
      value.packageJsonConfig = true
    }
    return value
  }
  override getConfigFiles() {
    return [...flatConfigFiles, ...legacyConfigFiles]
  }
  override getDependencyNames() {
    return ['eslint']
  }
  override getName() {
    return 'ESLint'
  }
}
