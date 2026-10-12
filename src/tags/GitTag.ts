import expect from '#src/expect.ts'
import {readTrimmedFile} from '#src/lib/fs.ts'
import {resolveGitFolder} from '#src/lib/git.ts'
import NotDetectedError from '#src/NotDetectedError.ts'

import Tag from './base/Tag.ts'

export type Payload = {
  head: string
  headType: 'branch' | 'detached'
}

export default class GitTag extends Tag {
  override async detect(folder: string): Promise<Payload> {
    const gitFolder = await resolveGitFolder(folder)
    const headFile = `${gitFolder}/HEAD`
    await expect.fileNotEmpty(headFile)
    const headContentPattern = /^\s*ref:\s+refs\/heads\/(?<branch>.+)\s*$/
    const headContent = await readTrimmedFile(headFile)
    const headContentMatch = headContentPattern.exec(headContent)
    if (headContentMatch?.groups?.branch) {
      return {
        headType: 'branch',
        head: headContentMatch.groups.branch,
      }
    }
    const detachedHeadPattern = /^(?<commit>[0-9a-f]{40})$/i
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
