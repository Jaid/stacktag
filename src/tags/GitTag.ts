import path from 'node:path'

import fs from 'fs-extra'

import expect from '#src/expect.ts'
import {readTrimmedFile} from '#src/lib/fs.ts'
import NotDetectedError from '#src/NotDetectedError.ts'

import Tag from './base/Tag.ts'

export type Payload = {
  head: string
  headType: 'branch' | 'detached'
}

export default class GitTag extends Tag {
  override async detect(folder: string): Promise<Payload> {
    const gitPath = `${folder}/.git`
    const gitPathExists = await fs.exists(gitPath)
    if (!gitPathExists) {
      throw new NotDetectedError(`missing Git marker: ${gitPath}`)
    }
    const gitStats = await fs.stat(gitPath)
    let gitFolder = gitPath
    if (gitStats.isFile()) {
      const gitdirPattern = /^\s*gitdir:\s*(?<gitdir>.+)\s*$/
      const gitdirContent = await readTrimmedFile(gitPath)
      const gitdirMatch = gitdirPattern.exec(gitdirContent)
      const gitdir = gitdirMatch?.groups?.gitdir
      if (!gitdir) {
        throw new NotDetectedError(`unsupported .git indirection in ${gitPath}`)
      }
      gitFolder = path.resolve(folder, gitdir).replaceAll('\\', '/')
    } else {
      await expect.folderExists(gitFolder)
    }
    const headFile = `${gitFolder}/HEAD`
    await expect.fileNotEmpty(headFile)
    const headContentPattern = /^\s*ref:\s+refs\/heads\/(?<branch>.+)\s*$/
    const detachedHeadPattern = /^(?<commit>[0-9a-f]{40})$/i
    const headContent = await readTrimmedFile(headFile)
    const headContentMatch = headContentPattern.exec(headContent)
    if (headContentMatch?.groups?.branch) {
      return {
        headType: 'branch',
        head: headContentMatch.groups.branch,
      }
    }
    const detachedHeadMatch = detachedHeadPattern.exec(headContent)
    if (detachedHeadMatch?.groups?.commit) {
      return {
        headType: 'detached',
        head: detachedHeadMatch.groups.commit,
      }
    }
    throw new NotDetectedError(`unsupported Git HEAD format in ${headFile}`)
  }
  override getName() {
    return 'Git'
  }
  override getPriority() {
    return 200
  }
}
