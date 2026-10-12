import {globby} from 'globby'

import NotDetectedError from '#src/NotDetectedError.ts'

import Tag from './base/Tag.ts'

export type Payload = {
  files: Array<string>
  workflows?: Array<string>
}

export default class GithubTag extends Tag {
  override async detect(folder: string): Promise<Payload> {
    const files = await globby('.github/**', {
      cwd: folder,
      dot: true,
      followSymbolicLinks: false,
      onlyFiles: true,
    })
    if (files.length === 0) {
      throw new NotDetectedError('no files in .github')
    }
    files.sort((a, b) => a.localeCompare(b, 'en'))
    const value: Payload = {files}
    const workflows = files.filter(file => /^\.github\/workflows\/[^/]+\.ya?ml$/.test(file))
    if (workflows.length > 0) {
      value.workflows = workflows
    }
    return value
  }
  override getName() {
    return 'GitHub'
  }
}
