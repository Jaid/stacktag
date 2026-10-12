import {getGitRemotes, readGitConfig, resolveGitFolder} from '#src/lib/git.ts'
import {parseGithubUrl} from '#src/lib/github.ts'
import NotDetectedError from '#src/NotDetectedError.ts'

import Tag from './base/Tag.ts'
import GitTag from './GitTag.ts'

export type GithubRemote = {
  /**
   * remote name, like `origin`
   */
  name: string
  owner?: string
  repo?: string
  url: string
}

export type Payload = {
  remotes: Array<GithubRemote>
}

export default class GithubRepositoryTag extends Tag {
  override async detect(folder: string): Promise<Payload> {
    const gitFolder = await resolveGitFolder(folder)
    const config = await readGitConfig(gitFolder)
    const remotes: Array<GithubRemote> = []
    for (const remote of getGitRemotes(config)) {
      for (const url of new Set([...remote.urls, ...remote.pushUrls])) {
        const githubUrl = parseGithubUrl(url)
        if (!githubUrl) {
          continue
        }
        remotes.push({
          name: remote.name,
          ...githubUrl,
          url,
        })
      }
    }
    if (remotes.length === 0) {
      throw new NotDetectedError('no Git remote on github.com')
    }
    return {remotes}
  }
  override getName() {
    return 'GitHub Repository'
  }
  override needs() {
    return GitTag
  }
}
