import type {Jsonifiable, JsonObject} from 'type-fest'

import fs from '#src/lib/fs.ts'
import NotDetectedError from '#src/NotDetectedError.ts'

import Tag from './base/Tag.ts'

export default class RustTag extends Tag {
  override async detect(folder: string) {
    const cargoFile = await fs.findFirstExistingFile(folder, ['Cargo.toml'])
    const lockfile = await fs.findFirstExistingFile(folder, ['Cargo.lock'])
    const toolchainFile = await fs.findFirstExistingFile(folder, ['rust-toolchain.toml', 'rust-toolchain'])
    if (!cargoFile && !lockfile && !toolchainFile) {
      throw new NotDetectedError('No Rust marker was found.')
    }
    const value: JsonObject = {}
    if (cargoFile) {
      value.cargo = await fs.parseTomlFile(`${folder}/${cargoFile}`)
      value.cargoFile = cargoFile
    }
    if (lockfile) {
      value.lockfile = lockfile
    }
    if (toolchainFile) {
      value.toolchain = toolchainFile === 'rust-toolchain.toml' ? await fs.parseTomlFile(`${folder}/${toolchainFile}`) : await fs.readTrimmedFile(`${folder}/${toolchainFile}`)
      value.toolchainFile = toolchainFile
    }
    return Object.keys(value).length > 0 ? value : undefined
  }
  override getName() {
    return 'Rust'
  }
}
