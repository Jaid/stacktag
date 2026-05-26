import {afterEach, describe, expect, test} from 'bun:test'
import os from 'node:os'
import path from 'node:path'

import fs from 'fs-extra'

const {default: Project} = await import('#src/main.ts')
const {default: BunTag} = await import('#src/tags/BunTag.ts')
const temporaryFolders = new Set<string>
const createProject = async (files: Record<string, string>) => {
  const temporaryFolder = await fs.mkdtemp(path.join(os.tmpdir(), 'stacktag-'))
  const folder = temporaryFolder.replaceAll('\\', '/')
  temporaryFolders.add(folder)
  await Promise.all(Object.entries(files).map(async ([file, content]) => {
    await fs.outputFile(`${folder}/${file}`, content)
  }))
  return folder
}
afterEach(async () => {
  await Promise.all([...temporaryFolders].map(async folder => {
    await fs.remove(folder)
  }))
  temporaryFolders.clear()
})
describe('Project', () => {
  test('detects Git, Node-like, Node.js and Bun projects', async () => {
    const folder = await createProject({
      '.git/HEAD': 'ref: refs/heads/main\n',
      'bun.lock': '',
      'package.json': JSON.stringify({
        engines: {
          node: '>=24',
        },
        name: 'fixture',
        packageManager: 'bun@1.2.18',
      }, undefined, 2),
    })
    const project = new Project(folder)
    expect(await project.hasTag('git')).toBeTrue()
    expect(await project.hasTag('node_like')).toBeTrue()
    expect(await project.hasTag('node')).toBeTrue()
    expect(await project.hasTag(BunTag)).toBeTrue()
    expect(await project.getResult('git')).toMatchObject({
      detected: true,
      value: 'main',
    })
    const nodeLikeResult = await project.getResult('node_like')
    expect(nodeLikeResult.value).toMatchObject({
      name: 'fixture',
      packageManager: 'bun@1.2.18',
    })
    const nodeResult = await project.getResult('node')
    expect(nodeResult.value).toBe('>=24')
    const bunResult = await project.getResult('bun')
    expect(bunResult.value).toMatchObject({
      lockfile: 'bun.lock',
      packageManager: 'bun@1.2.18',
      runtimeVersion: '1.2.18',
    })
    const detectedTags = await project.getTags()
    expect(detectedTags.map(tag => tag.id)).toEqual(['git', 'node_like', 'bun', 'node'])
  })
  test('detects Bun projects without package.json from bunfig.toml', async () => {
    const folder = await createProject({
      'bunfig.toml': '[install]\ncache = false\n',
    })
    const project = new Project(folder)
    expect(await project.hasTag('bun')).toBeTrue()
    expect(await project.hasTag('node_like')).toBeFalse()
    expect(await project.hasTag('node')).toBeFalse()
    const bunResult = await project.getResult('bun')
    expect(bunResult.value).toMatchObject({
      config: {
        install: {
          cache: false,
        },
      },
      configFile: 'bunfig.toml',
    })
  })
  test('detects Deno projects from deno.jsonc', async () => {
    const folder = await createProject({
      'deno.jsonc': '{\n  // comment\n  "tasks": {"start": "deno run main.ts"},\n  "imports": {"std/": "jsr:@std/"}\n}\n',
    })
    const project = new Project(folder)
    expect(await project.hasTag('deno')).toBeTrue()
    expect(await project.hasTag('node_like')).toBeFalse()
    const denoResult = await project.getResult('deno')
    expect(denoResult.value).toMatchObject({
      config: {
        imports: {
          'std/': 'jsr:@std/',
        },
        tasks: {
          start: 'deno run main.ts',
        },
      },
      configFile: 'deno.jsonc',
    })
  })
  test('detects Python projects from pyproject.toml', async () => {
    const folder = await createProject({
      'pyproject.toml': '[project]\nname = "demo"\nrequires-python = ">=3.13"\n',
    })
    const project = new Project(folder)
    expect(await project.hasTag('python')).toBeTrue()
    const pythonResult = await project.getResult('python')
    expect(pythonResult.value).toMatchObject({
      config: {
        project: {
          name: 'demo',
          'requires-python': '>=3.13',
        },
      },
      configFile: 'pyproject.toml',
    })
  })
  test('detects Rust projects from Cargo.toml and rust-toolchain.toml', async () => {
    const folder = await createProject({
      'Cargo.toml': '[package]\nname = "demo"\nversion = "0.1.0"\nrust-version = "1.88"\n',
      'rust-toolchain.toml': '[toolchain]\nchannel = "nightly"\n',
    })
    const project = new Project(folder)
    expect(await project.hasTag('rust')).toBeTrue()
    const rustResult = await project.getResult('rust')
    expect(rustResult.value).toMatchObject({
      cargo: {
        package: {
          name: 'demo',
          'rust-version': '1.88',
          version: '0.1.0',
        },
      },
      cargoFile: 'Cargo.toml',
      toolchain: {
        toolchain: {
          channel: 'nightly',
        },
      },
      toolchainFile: 'rust-toolchain.toml',
    })
  })
})
