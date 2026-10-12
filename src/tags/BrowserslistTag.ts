import fs from '#src/lib/fs.ts'
import NotDetectedError from '#src/NotDetectedError.ts'

import PackageJsonAwareTag from './base/PackageJsonAwareTag.ts'

/**
 * queries keyed by environment, with `defaults` holding queries that are not assigned to an environment – the same shape as `browserslist.parseConfig()` returns
 */
export type BrowserslistConfig = Record<string, Array<string>>

export type Payload = {
  config: BrowserslistConfig
  configFile?: string
  packageJsonConfig?: true
}

const splitQueries = (queries: string) => queries.split(',').map(query => query.trim()).filter(Boolean)

/**
 * Parses `.browserslistrc` content the same way Browserslist does, including `[environment]` sections that may list multiple space-separated environments.
 */
export const parseBrowserslistConfig = (content: string) => {
  const config: BrowserslistConfig = {defaults: []}
  let sections = ['defaults']
  const lines = content.replaceAll(/#[^\n]*/g, '').split(/\n|,/).map(line => line.trim()).filter(Boolean)
  for (const line of lines) {
    if (/^\[.+\]$/.test(line)) {
      sections = line.slice(1, -1).trim().split(/\s+/)
      for (const section of sections) {
        if (Object.hasOwn(config, section)) {
          throw new Error(`Duplicate section “${section}” in Browserslist config`)
        }
        config[section] = []
      }
      continue
    }
    for (const section of sections) {
      config[section].push(line)
    }
  }
  return config
}

const normalizeQueries = (rawQueries: unknown) => {
  if (typeof rawQueries === 'string') {
    return splitQueries(rawQueries)
  }
  if (Array.isArray(rawQueries)) {
    return rawQueries.filter(query => typeof query === 'string').flatMap(splitQueries)
  }
  throw new TypeError('Unsupported queries in package.json#browserslist')
}
const normalizePackageJsonConfig = (rawConfig: unknown): BrowserslistConfig => {
  if (typeof rawConfig === 'object' && rawConfig !== null && !Array.isArray(rawConfig)) {
    const config: BrowserslistConfig = {}
    for (const [environment, queries] of Object.entries(rawConfig)) {
      config[environment] = normalizeQueries(queries)
    }
    return config
  }
  return {defaults: normalizeQueries(rawConfig)}
}

export default class BrowserslistTag extends PackageJsonAwareTag {
  override async detect(folder: string): Promise<Payload> {
    for (const configFile of ['.browserslistrc', 'browserslist']) {
      const file = `${folder}/${configFile}`
      if (!await fs.exists(file)) {
        continue
      }
      const stats = await fs.stat(file)
      if (!stats.isFile()) {
        continue
      }
      const content = await fs.readFile(file, 'utf8')
      return {
        config: parseBrowserslistConfig(content),
        configFile,
      }
    }
    const rawConfig = this.packageJson?.browserslist
    if (rawConfig !== undefined) {
      return {
        config: normalizePackageJsonConfig(rawConfig),
        packageJsonConfig: true,
      }
    }
    throw new NotDetectedError('no Browserslist config')
  }
  override getName() {
    return 'Browserslist'
  }
}
