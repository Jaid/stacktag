import type {JsonObject} from 'type-fest'

import fs from '#src/lib/fs.ts'
import NotDetectedError from '#src/NotDetectedError.ts'

import Tag from './base/Tag.ts'

export type Payload = {
  cargo?: JsonObject
  cargoFile?: string
  lockfile?: string
  toolchain?: JsonObject | string
  toolchainFile?: string
}

export default class RustTag extends Tag {
  override async detect(folder: string): Promise<Payload> {
    const cargoFile = await fs.findFirstExistingFile(folder, ['Cargo.toml'])
    const lockfile = await fs.findFirstExistingFile(folder, ['Cargo.lock'])
    const toolchainFile = await fs.findFirstExistingFile(folder, ['rust-toolchain.toml', 'rust-toolchain'])
    if (!cargoFile && !lockfile && !toolchainFile) {
      throw new NotDetectedError('no Rust indicator')
    }
    const value: Payload = {}
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
    return value
  }
  override getName() {
    return 'Rust'
  }
}
