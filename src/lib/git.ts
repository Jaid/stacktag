import * as path from 'forward-slash-path'
import fs from 'fs-extra'

import expect from '#src/expect.ts'
import {readTrimmedFile} from '#src/lib/fs.ts'
import NotDetectedError from '#src/NotDetectedError.ts'

export type GitConfig = Array<GitConfigEntry>

export type GitConfigEntry = {
  key: string
  section: string
  subsection?: string
  value: string
}

const normalizePath = (file: string) => file.replaceAll('\\', '/')

/**
 * Resolves the Git folder of a working tree, following `gitdir:` indirections used by worktrees and submodules.
 */
export const resolveGitFolder = async (folder: string) => {
  const gitPath = `${folder}/.git`
  const gitPathExists = await fs.exists(gitPath)
  if (!gitPathExists) {
    throw new NotDetectedError(`missing Git marker: ${gitPath}`)
  }
  const gitStats = await fs.stat(gitPath)
  if (!gitStats.isFile()) {
    await expect.folderExists(gitPath)
    return gitPath
  }
  const gitdirPattern = /^\s*gitdir:\s*(?<gitdir>.+?)\s*$/
  const gitdirContent = await readTrimmedFile(gitPath)
  const gitdir = gitdirPattern.exec(gitdirContent)?.groups?.gitdir
  if (!gitdir) {
    throw new NotDetectedError(`unsupported .git indirection in ${gitPath}`)
  }
  return normalizePath(path.resolve(folder, gitdir))
}

/**
 * Resolves the Git folder that holds shared files like `config`, which differs from the Git folder in linked worktrees.
 */
export const resolveCommonGitFolder = async (gitFolder: string) => {
  const commondirFile = `${gitFolder}/commondir`
  if (!await fs.exists(commondirFile)) {
    return gitFolder
  }
  const commondir = await readTrimmedFile(commondirFile)
  if (!commondir) {
    return gitFolder
  }
  return normalizePath(path.resolve(gitFolder, commondir))
}

const unescapeValue = (rawValue: string) => {
  let value = ''
  let quoted = false
  for (let index = 0; index < rawValue.length; index++) {
    const character = rawValue[index]
    if (character === '\\') {
      const nextCharacter = rawValue.at(index + 1)
      index++
      if (nextCharacter === 'n') {
        value += '\n'
      } else if (nextCharacter === 't') {
        value += '\t'
      } else if (nextCharacter !== undefined) {
        value += nextCharacter
      }
      continue
    }
    if (character === '"') {
      quoted = !quoted
      continue
    }
    if (!quoted && (character === '#' || character === ';')) {
      break
    }
    value += character
  }
  return value.trim()
}

/**
 * Parses the subset of the Git config format needed for reading remotes: sections, subsections, quoted values, escapes and comments. `include` directives are not followed.
 */
export const parseGitConfig = (content: string) => {
  const entries: GitConfig = []
  const sectionPattern = /^\[\s*(?<section>[\d\-.A-Za-z]+)(?:\s+"(?<subsection>(?:[^"\\]|\\.)*)")?\s*\](?<rest>.*)$/
  const entryPattern = /^(?<key>[A-Za-z][\d\-A-Za-z]*)\s*(?:=(?<value>.*))?$/
  let section: string | undefined
  let subsection: string | undefined
  for (const rawLine of content.split(/\r?\n/)) {
    let line = rawLine.trim()
    if (!line || line.startsWith('#') || line.startsWith(';')) {
      continue
    }
    const sectionGroups = sectionPattern.exec(line)?.groups as {
      rest: string
      section: string
      subsection?: string
    } | undefined
    if (sectionGroups) {
      const sectionName = sectionGroups.section.toLowerCase()
      if (sectionGroups.subsection === undefined && sectionName.includes('.')) {
        // deprecated `[section.subsection]` syntax
        const dotIndex = sectionName.indexOf('.')
        section = sectionName.slice(0, dotIndex)
        subsection = sectionName.slice(dotIndex + 1)
      } else {
        section = sectionName
        subsection = sectionGroups.subsection?.replaceAll(/\\(.)/g, '$1')
      }
      line = sectionGroups.rest.trim()
      if (!line || line.startsWith('#') || line.startsWith(';')) {
        continue
      }
    }
    if (!section) {
      continue
    }
    const entryGroups = entryPattern.exec(line)?.groups as {
      key: string
      value?: string
    } | undefined
    if (!entryGroups) {
      continue
    }
    // a key without `=` is a boolean `true`
    const entry: GitConfigEntry = {
      key: entryGroups.key.toLowerCase(),
      section,
      value: entryGroups.value === undefined ? 'true' : unescapeValue(entryGroups.value),
    }
    if (subsection !== undefined) {
      entry.subsection = subsection
    }
    entries.push(entry)
  }
  return entries
}

export const readGitConfig = async (gitFolder: string) => {
  const commonGitFolder = await resolveCommonGitFolder(gitFolder)
  const configFile = `${commonGitFolder}/config`
  if (!await fs.exists(configFile)) {
    return []
  }
  const content = await fs.readFile(configFile, 'utf8')
  return parseGitConfig(content)
}

export type GitRemote = {
  name: string
  pushUrls: Array<string>
  urls: Array<string>
}

/**
 * Applies `url.<base>.insteadOf` rewrites, picking the longest matching prefix like Git does.
 */
const rewriteUrl = (url: string, config: GitConfig) => {
  let bestBase: string | undefined
  let bestPrefix = ''
  for (const entry of config) {
    if (entry.section !== 'url' || entry.key !== 'insteadof' || entry.subsection === undefined) {
      continue
    }
    if (!url.startsWith(entry.value) || entry.value.length <= bestPrefix.length) {
      continue
    }
    bestBase = entry.subsection
    bestPrefix = entry.value
  }
  if (bestBase === undefined) {
    return url
  }
  return bestBase + url.slice(bestPrefix.length)
}

export const getGitRemotes = (config: GitConfig) => {
  const remotes = new Map<string, GitRemote>
  for (const entry of config) {
    if (entry.section !== 'remote' || entry.subsection === undefined) {
      continue
    }
    if (entry.key !== 'url' && entry.key !== 'pushurl') {
      continue
    }
    let remote = remotes.get(entry.subsection)
    if (!remote) {
      remote = {
        name: entry.subsection,
        pushUrls: [],
        urls: [],
      }
      remotes.set(entry.subsection, remote)
    }
    const url = rewriteUrl(entry.value, config)
    if (entry.key === 'url') {
      remote.urls.push(url)
    } else {
      remote.pushUrls.push(url)
    }
  }
  return remotes.values().toArray()
}
