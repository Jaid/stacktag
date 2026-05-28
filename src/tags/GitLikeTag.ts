import fs from 'fs-extra'

import NotDetectedError from '#src/NotDetectedError.ts'

import Tag from './base/Tag.ts'

export default class GitLikeTag extends Tag {
  override async detect(folder: string) {
    const gitignoreFile = `${folder}/.gitignore`
    const gitignoreExists = await fs.exists(gitignoreFile)
    const gitattributesFile = `${folder}/.gitattributes`
    const gitattributesExists = await fs.exists(gitattributesFile)
    const gitmodulesFile = `${folder}/.gitmodules`
    const gitmodulesExists = await fs.exists(gitmodulesFile)
    const hasGitLikeFile = gitignoreExists || gitattributesExists || gitmodulesExists
    if (!hasGitLikeFile) {
      throw new NotDetectedError('no Git-like files')
    }
  }
  override getName() {
    return 'Git-like'
  }
  override getPriority() {
    return 199
  }
}
