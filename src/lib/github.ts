export type GithubUrl = {
  owner?: string
  repo?: string
}

const githubHosts = new Set(['github.com', 'ssh.github.com', 'www.github.com'])
const urlPattern = /^[a-z][\d+\-.a-z]*:\/\//i
const scpLikePattern = /^(?:[^/@]+@)?(?<host>[^/:]+):(?<path>.*)$/
const parsePath = (rawPath: string): GithubUrl => {
  const segments = rawPath.replace(/^\/+/, '').replace(/\/+$/, '').replace(/\.git$/i, '').split('/')
  if (segments.length !== 2 || !segments[0] || !segments[1]) {
    return {}
  }
  return {
    owner: segments[0],
    repo: segments[1],
  }
}

/**
 * Parses a Git remote URL and returns owner and repository if it points to github.com, otherwise `undefined`
 *
 * Supports URL syntax (`https://`, `ssh://`, `git://`, …) and scp-like syntax (`git@github.com:owner/repo.git`). Hosts are compared literally, so SSH config aliases are not resolved.
 */
export const parseGithubUrl = (url: string): GithubUrl | undefined => {
  const trimmedUrl = url.trim()
  if (urlPattern.test(trimmedUrl)) {
    let parsedUrl: URL
    try {
      parsedUrl = new URL(trimmedUrl)
    } catch {
      return
    }
    if (!githubHosts.has(parsedUrl.hostname.toLowerCase())) {
      return
    }
    return parsePath(decodeURIComponent(parsedUrl.pathname))
  }
  const scpLikeMatch = scpLikePattern.exec(trimmedUrl)
  if (!scpLikeMatch?.groups) {
    return
  }
  if (!githubHosts.has(scpLikeMatch.groups.host.toLowerCase())) {
    return
  }
  return parsePath(scpLikeMatch.groups.path)
}
