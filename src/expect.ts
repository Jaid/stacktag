import fs from 'fs-extra'

import NotDetectedError from '#src/NotDetectedError.ts'

const fileExists = async (file: string) => {
  if (!file) {
    throw new NotDetectedError(`bad path check “${file}”`)
  }
  const exists = await fs.exists(file)
  if (!exists) {
    throw new NotDetectedError(`not found: ${file}`)
  }
  const stats = await fs.stat(file)
  if (!stats.isFile()) {
    throw new NotDetectedError(`not a file: ${file}`)
  }
  return stats
}
const fileNotEmpty = async (file: string) => {
  const stats = await fileExists(file)
  if (!stats.size) {
    throw new NotDetectedError(`empty file: ${file}`)
  }
}
const folderExists = async (folder: string) => {
  if (!folder) {
    throw new NotDetectedError(`bad path check “${folder}”`)
  }
  const exists = await fs.exists(folder)
  if (!exists) {
    throw new NotDetectedError(`not found: ${folder}`)
  }
  const stats = await fs.stat(folder)
  if (!stats.isDirectory()) {
    throw new NotDetectedError(`not a folder: ${folder}`)
  }
  return stats
}
const expect = {
  fileExists,
  fileNotEmpty,
  folderExists,
}

export default expect
