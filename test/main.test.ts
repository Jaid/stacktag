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
  test('throws when results are accessed before init', async () => {
    const folder = await createProject({})
    const project = new Project(folder)
    expect(() => project.results).toThrow('Call `await project.init()` first')
    expect(() => project.getResults()).toThrow('Call `await project.init()` first')
    expect(() => project.getTags()).toThrow('Call `await project.init()` first')
    expect(() => project.hasTag('git')).toThrow('Call `await project.init()` first')
  })
  test('shares concurrent init calls', async () => {
    const folder = await createProject({
      'bunfig.toml': '[install]\ncache = false\n',
    })
    const project = new Project(folder)
    const [firstProject, secondProject] = await Promise.all([project.init(), project.init()])
    expect(firstProject).toBe(project)
    expect(secondProject).toBe(project)
    expect(project.hasTag('bun')).toBeTrue()
  })
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
    const project = await Project.detect(folder)
    expect(project.hasTag('git')).toBeTrue()
    expect(project.hasTag('node_like')).toBeTrue()
    expect(project.hasTag('node')).toBeTrue()
    expect(project.hasTag(BunTag)).toBeTrue()
    expect(project.getResult('git')).toMatchObject({
      detected: true,
      value: 'main',
    })
    const nodeLikeResult = project.getResult('node_like')
    expect(nodeLikeResult.value).toMatchObject({
      name: 'fixture',
      packageManager: 'bun@1.2.18',
    })
    const nodeResult = project.getResult('node')
    expect(nodeResult.value).toBe('>=24')
    const bunResult = project.getResult('bun')
    expect(bunResult.value).toMatchObject({
      lockfile: 'bun.lock',
      packageManager: 'bun@1.2.18',
      runtimeVersion: '1.2.18',
    })
    expect(project.getResults()).toBe(project.results)
    const detectedTags = project.getTags()
    expect(detectedTags.map(tag => tag.id)).toEqual(['git', 'node_like', 'bun', 'node'])
  })
  test('detects Bun projects without package.json from bunfig.toml', async () => {
    const folder = await createProject({
      'bunfig.toml': '[install]\ncache = false\n',
    })
    const project = await Project.detect(folder)
    expect(project.hasTag('bun')).toBeTrue()
    expect(project.hasTag('node_like')).toBeFalse()
    expect(project.hasTag('node')).toBeFalse()
    const bunResult = project.getResult('bun')
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
    const project = await Project.detect(folder)
    expect(project.hasTag('deno')).toBeTrue()
    expect(project.hasTag('node_like')).toBeFalse()
    const denoResult = project.getResult('deno')
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
    const project = await Project.detect(folder)
    expect(project.hasTag('python')).toBeTrue()
    const pythonResult = project.getResult('python')
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
    const project = await Project.detect(folder)
    expect(project.hasTag('rust')).toBeTrue()
    const rustResult = project.getResult('rust')
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
