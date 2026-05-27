import type {Jsonifiable, JsonObject} from 'type-fest'

import fs from '#src/lib/fs.ts'
import NotDetectedError from '#src/NotDetectedError.ts'

import Tag from './base/Tag.ts'

export default class PythonTag extends Tag {
  override async detect(folder: string) {
    const configFile = await fs.findFirstExistingFile(folder, ['pyproject.toml', '.python-version', 'requirements.txt', 'setup.cfg', 'Pipfile', 'setup.py'])
    const lockfile = await fs.findFirstExistingFile(folder, ['uv.lock', 'poetry.lock'])
    if (!configFile && !lockfile) {
      throw new NotDetectedError('No Python marker was found.')
    }
    const value: JsonObject = {}
    if (configFile === 'pyproject.toml') {
      value.config = await fs.parseTomlFile(`${folder}/${configFile}`)
      value.configFile = configFile
    } else if (configFile === '.python-version') {
      value.configFile = configFile
      value.runtimeVersion = await fs.readTrimmedFile(`${folder}/${configFile}`)
    } else if (configFile === 'requirements.txt') {
      const requirements = await fs.readTrimmedFile(`${folder}/${configFile}`)
      value.configFile = configFile
      value.requirements = requirements.split(/\r?\n/u).map(line => line.trim()).filter(line => line && !line.startsWith('#'))
    } else if (configFile) {
      value.configFile = configFile
    }
    if (lockfile) {
      value.lockfile = lockfile
    }
    return Object.keys(value).length > 0 ? value : undefined
  }
  override getName() {
    return 'Python'
  }
}
