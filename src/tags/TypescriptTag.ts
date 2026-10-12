import type {JsonObject} from 'type-fest'

import {globbyStream} from 'globby'

import fs from '#src/lib/fs.ts'
import NotDetectedError from '#src/NotDetectedError.ts'

import Tag from './base/Tag.ts'

export type Payload = {
  config?: JsonObject
  configFile?: string
  sourceFile?: string
}

export const sourceFilePattern = /\.[cm]?tsx?$/

/**
 * Finds the first file matching `sourceFilePattern`, skipping `node_modules`, `.git` and anything excluded by `.gitignore` files.
 */
const findSourceFile = async (folder: string) => {
  const stream = globbyStream('**/*.{ts,tsx,mts,mtsx,cts,ctsx}', {
    cwd: folder,
    dot: true,
    followSymbolicLinks: false,
    gitignore: true,
    ignore: ['**/node_modules/**', '**/.git/**'],
    onlyFiles: true,
  })
  for await (const file of stream) {
    if (sourceFilePattern.test(file)) {
      return file
    }
  }
}

export default class TypescriptTag extends Tag {
  override async detect(folder: string): Promise<Payload> {
    const configFile = await fs.findFirstExistingFile(folder, ['tsconfig.json'])
    const sourceFile = await findSourceFile(folder)
    if (!configFile && !sourceFile) {
      throw new NotDetectedError('no tsconfig.json or TypeScript files')
    }
    const value: Payload = {}
    if (configFile) {
      value.configFile = configFile
      const configContent = await fs.readTrimmedFile(`${folder}/${configFile}`)
      if (configContent) {
        value.config = Bun.JSON5.parse(configContent) as JsonObject
      }
    }
    if (sourceFile) {
      value.sourceFile = sourceFile
    }
    return value
  }
  override getName() {
    return 'TypeScript'
  }
}
