import fs from 'fs-extra'

import Tag from './base/Tag.ts'

export default class GitTag extends Tag {
  override async detect(folder: string) {
    const gitFolder = `${folder}/.git`
    const gitFolderExists = await fs.exists(gitFolder)
    if (!gitFolderExists) {
      return
    }
    const headFile = `${gitFolder}/HEAD`
    const headFileExists = await fs.exists(headFile)
    if (!headFileExists) {
      return
    }
    const headContentPattern = /^\s*ref:\s+refs\/heads\/(?<branch>.+)\s*$/
    const headContent = await fs.readFile(headFile, 'utf8')
    const headContentMatch = headContentPattern.exec(headContent)
    if (!headContentMatch) {
      return
    }
    const branch = headContentMatch.groups?.branch
    if (!branch) {
      return
    }
    return branch
  }
  override getName() {
    return 'Git'
  }
  override getPriority() {
    return 200
  }
}
