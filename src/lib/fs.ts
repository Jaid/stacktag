import type {Jsonifiable} from 'type-fest'

import fs from 'fs-extra'
import trimAround from 'trim-around'

export const findFirstExistingFile = async (folder: string, fileNames: Array<string>) => {
  for (const fileName of fileNames) {
    const absolutePath = `${folder}/${fileName}`
    if (await fs.exists(absolutePath)) {
      return fileName
    }
  }
}

export const readTrimmedFile = async (file: string) => {
  const content = await fs.readFile(file, 'utf8')
  return trimAround(content)
}

export const parseJson5File = async <Type extends Jsonifiable = Jsonifiable>(file: string) => {
  const content = await readTrimmedFile(file)
  return Bun.JSON5.parse(content) as Type
}

export const parseTomlFile = async <Type extends Jsonifiable = Jsonifiable>(file: string) => {
  const content = await readTrimmedFile(file)
  return Bun.TOML.parse(content) as Type
}

const fsExtended = {} as typeof fs & {
  findFirstExistingFile: typeof findFirstExistingFile
  parseJson5File: typeof parseJson5File
  parseTomlFile: typeof parseTomlFile
  readTrimmedFile: typeof readTrimmedFile
}
Object.assign(fsExtended, fs, {
  findFirstExistingFile,
  readTrimmedFile,
  parseJson5File,
  parseTomlFile,
})

export default fsExtended
