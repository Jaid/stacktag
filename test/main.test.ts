import type ProjectClass from '#src/Project.ts'
import type {EventPayload} from '#src/tags/base/Tag.ts'

import {afterEach, describe, expect, test} from 'bun:test'
import os from 'node:os'

import * as path from 'forward-slash-path'
import fs from 'fs-extra'

const {default: Project, NotDetectedError} = await import('#src/main.ts')
const {default: BunTag} = await import('#src/tags/BunTag.ts')
const {default: Tag} = await import('#src/tags/base/Tag.ts')
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
  test('treats `false` returns as clean negative detections', async () => {
    class FalseTag extends Tag {
      override async detect() {
        return false
      }
    }
    class EventAwareTag extends Tag {
      sourceDetected = false
      constructor() {
        super()
        this.on('detect', (event: EventPayload) => {
          if (event.id === 'false_tag') {
            this.sourceDetected = event.detection
          }
        })
      }
      override async detect() {
        return 'unexpected'
      }
      override shouldRun() {
        return this.sourceDetected
      }
      override shouldRunBefore() {
        return FalseTag
      }
    }
    const folder = await createProject({})
    const registry = new Map<string, typeof EventAwareTag | typeof FalseTag>([
      ['false_tag', FalseTag],
      ['event_aware', EventAwareTag],
    ])
    const project: ProjectClass = await Project.detect(folder, registry)
    expect(project.hasTag('false_tag')).toBeFalse()
    expect(project.getResult('false_tag')).toMatchObject({
      detected: false,
      ran: true,
      skipped: false,
      value: undefined,
    })
    expect(project.getResult('false_tag').error).toBeUndefined()
    expect(project.getResult('event_aware')).toMatchObject({
      detected: false,
      ran: false,
      skipped: true,
    })
  })
  test('treats NotDetectedError as a clean negative detection with an optional payload', async () => {
    class CleanNegativeTag extends Tag {
      override async detect() {
        throw new NotDetectedError({reason: 'not applicable'})
      }
    }
    class BrokenTag extends Tag {
      override async detect() {
        throw new Error('broken detector')
      }
    }
    const folder = await createProject({})
    const registry = new Map<string, typeof BrokenTag | typeof CleanNegativeTag>([
      ['clean_negative', CleanNegativeTag],
      ['broken', BrokenTag],
    ])
    const project: ProjectClass = await Project.detect(folder, registry)
    expect(project.getResult('clean_negative')).toMatchObject({
      detected: false,
      ran: true,
      skipped: false,
      value: {
        reason: 'not applicable',
      },
    })
    expect(project.getResult('clean_negative').error).toBeUndefined()
    expect(project.getResult('broken')).toMatchObject({
      detected: false,
      ran: true,
      skipped: false,
      error: new Error('broken detector'),
    })
  })
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
      value: {
        head: 'main',
        headType: 'branch',
      },
    })
    const nodeLikeResult = project.getResult('node_like')
    expect(nodeLikeResult.value).toMatchObject({
      packageJson: {
        name: 'fixture',
        packageManager: 'bun@1.2.18',
      },
    })
    const nodeResult = project.getResult('node')
    expect(nodeResult.value).toMatchObject({
      engineSelector: '>=24',
    })
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
  test('detects GitHub from files in .github', async () => {
    const folder = await createProject({
      '.github/funding.yml': 'github: Jaid\n',
      '.github/workflows/test.yml': 'name: test\n',
    })
    const project = await Project.detect(folder)
    expect(project.getResult('github')).toMatchObject({
      detected: true,
      value: {
        files: ['.github/funding.yml', '.github/workflows/test.yml'],
        workflows: ['.github/workflows/test.yml'],
      },
    })
    const emptyFolder = await createProject({})
    await fs.ensureDir(`${emptyFolder}/.github`)
    const emptyProject = await Project.detect(emptyFolder)
    expect(emptyProject.hasTag('github')).toBeFalse()
  })
  test('detects GitHub repositories from Git remotes', async () => {
    const folder = await createProject({
      '.git/HEAD': 'ref: refs/heads/main\n',
      '.git/config': [
        '[core]',
        '\tbare = false',
        '[remote "origin"]',
        '\turl = https://gitlab.com/Jaid/stacktag.git',
        '\tpushurl = git@github.com:Jaid/stacktag.git ; push mirror',
        '[remote "upstream"]',
        '\turl = gh:Jaid/upstream',
        '[remote "other"]',
        '\turl = https://example.com/github.com/Jaid/stacktag.git',
        '[url "https://github.com/"]',
        '\tinsteadOf = gh:',
      ].join('\n'),
    })
    const project = await Project.detect(folder)
    expect(project.getResult('github_repository')).toMatchObject({
      detected: true,
      value: {
        remotes: [
          {
            name: 'origin',
            owner: 'Jaid',
            repo: 'stacktag',
            url: 'git@github.com:Jaid/stacktag.git',
          },
          {
            name: 'upstream',
            owner: 'Jaid',
            repo: 'upstream',
            url: 'https://github.com/Jaid/upstream',
          },
        ],
      },
    })
    const otherFolder = await createProject({
      '.git/HEAD': 'ref: refs/heads/main\n',
      '.git/config': '[remote "origin"]\n\turl = https://gitlab.com/Jaid/stacktag.git\n',
    })
    const otherProject = await Project.detect(otherFolder)
    expect(otherProject.hasTag('github_repository')).toBeFalse()
    const noGitFolder = await createProject({})
    const noGitProject = await Project.detect(noGitFolder)
    expect(noGitProject.getResult('github_repository')).toMatchObject({
      detected: false,
      ran: false,
      skipped: true,
    })
  })
  test('reads Git remotes of linked worktrees from the common Git folder', async () => {
    const folder = await createProject({
      'main/.git/config': '[remote "origin"]\n\turl = ssh://git@github.com/Jaid/stacktag.git\n',
      'main/.git/HEAD': 'ref: refs/heads/main\n',
      'main/.git/worktrees/feature/commondir': '../..\n',
      'main/.git/worktrees/feature/HEAD': 'ref: refs/heads/feature\n',
      'feature/.git': 'gitdir: ../main/.git/worktrees/feature\n',
    })
    const project = await Project.detect(`${folder}/feature`)
    expect(project.getResult('git').value).toEqual({
      head: 'feature',
      headType: 'branch',
    })
    expect(project.getResult('github_repository').value).toEqual({
      remotes: [
        {
          name: 'origin',
          owner: 'Jaid',
          repo: 'stacktag',
          url: 'ssh://git@github.com/Jaid/stacktag.git',
        },
      ],
    })
  })
  test('detects Vite and Rolldown from config files and dependencies', async () => {
    const folder = await createProject({
      'package.json': JSON.stringify({
        devDependencies: {
          rolldown: '1.0.0',
        },
        name: 'fixture',
      }),
      'vite.config.ts': 'export default {}\n',
    })
    const project = await Project.detect(folder)
    expect(project.getResult('vite').value).toEqual({
      configFile: 'vite.config.ts',
    })
    expect(project.getResult('rolldown').value).toEqual({
      dependency: {
        field: 'devDependencies',
        name: 'rolldown',
        version: '1.0.0',
      },
    })
    const emptyProject = await Project.detect(await createProject({'package.json': '{"name": "empty"}'}))
    expect(emptyProject.hasTag('vite')).toBeFalse()
    expect(emptyProject.hasTag('rolldown')).toBeFalse()
  })
  test('detects ESLint flat configs, legacy configs and package.json#eslintConfig', async () => {
    const flatProject = await Project.detect(await createProject({
      '.eslintrc.json': '{}',
      'eslint.config.mjs': 'export default []\n',
      'package.json': JSON.stringify({devDependencies: {eslint: '10.0.0'}}),
    }))
    expect(flatProject.getResult('eslint').value).toEqual({
      configFile: 'eslint.config.mjs',
      configFormat: 'flat',
      dependency: {
        field: 'devDependencies',
        name: 'eslint',
        version: '10.0.0',
      },
    })
    const legacyProject = await Project.detect(await createProject({
      '.eslintrc.cjs': 'module.exports = {}\n',
    }))
    expect(legacyProject.getResult('eslint').value).toEqual({
      configFile: '.eslintrc.cjs',
      configFormat: 'legacy',
    })
    const packageJsonProject = await Project.detect(await createProject({
      'package.json': JSON.stringify({eslintConfig: {root: true}}),
    }))
    expect(packageJsonProject.getResult('eslint').value).toEqual({
      configFormat: 'legacy',
      packageJsonConfig: true,
    })
  })
  test('detects Browserslist configs', async () => {
    const fileProject = await Project.detect(await createProject({
      '.browserslistrc': '# comment\nlast 2 Chrome versions, not dead\n\n[production staging]\n> 1%\n[development]\nlast 1 Firefox version # inline comment\n',
    }))
    expect(fileProject.getResult('browserslist').value).toEqual({
      config: {
        defaults: ['last 2 Chrome versions', 'not dead'],
        development: ['last 1 Firefox version'],
        production: ['> 1%'],
        staging: ['> 1%'],
      },
      configFile: '.browserslistrc',
    })
    const packageJsonProject = await Project.detect(await createProject({
      'package.json': JSON.stringify({
        browserslist: {
          development: 'last 1 Chrome version, last 1 Firefox version',
          production: ['>0.2%', 'not dead'],
        },
      }),
    }))
    expect(packageJsonProject.getResult('browserslist').value).toEqual({
      config: {
        development: ['last 1 Chrome version', 'last 1 Firefox version'],
        production: ['>0.2%', 'not dead'],
      },
      packageJsonConfig: true,
    })
    const emptyProject = await Project.detect(await createProject({'package.json': JSON.stringify({devDependencies: {browserslist: '4.0.0'}})}))
    expect(emptyProject.hasTag('browserslist')).toBeFalse()
  })
  test('detects TypeScript from source files and tsconfig.json', async () => {
    const sourceProject = await Project.detect(await createProject({
      'src/deep/index.mts': 'export {}\n',
    }))
    expect(sourceProject.getResult('typescript').value).toEqual({
      sourceFile: 'src/deep/index.mts',
    })
    const configProject = await Project.detect(await createProject({
      'tsconfig.json': '{\n  // comment\n  "compilerOptions": {"strict": true,},\n}\n',
    }))
    expect(configProject.getResult('typescript').value).toEqual({
      config: {
        compilerOptions: {
          strict: true,
        },
      },
      configFile: 'tsconfig.json',
    })
    const ignoredProject = await Project.detect(await createProject({
      '.gitignore': '/dist/\n',
      'dist/index.d.ts': 'export {}\n',
      'index.js': 'export {}\n',
      'node_modules/dependency/index.ts': 'export {}\n',
    }))
    expect(ignoredProject.hasTag('typescript')).toBeFalse()
  })
  test('detects workspaces with nested packages', async () => {
    const folder = await createProject({
      'package.json': JSON.stringify({
        name: 'root',
        private: true,
        workspaces: ['packages/*'],
      }),
      'packages/a/package.json': JSON.stringify({
        name: 'a',
        version: '1.0.0',
        workspaces: ['plugins/*'],
      }),
      'packages/a/plugins/leaf/package.json': JSON.stringify({name: '@scope/leaf'}),
      'packages/b/package.json': JSON.stringify({private: true}),
      'packages/not-a-package/readme.md': '',
    })
    const project = await Project.detect(folder)
    expect(project.getResult('workspace').value).toEqual({
      packages: [
        {
          folder: 'packages/a',
          hierarchy: ['root', 'a'],
          name: 'a',
          version: '1.0.0',
        },
        {
          folder: 'packages/a/plugins/leaf',
          hierarchy: ['root', 'a', '@scope/leaf'],
          name: '@scope/leaf',
        },
        {
          folder: 'packages/b',
          hierarchy: ['root', 'b'],
          private: true,
        },
      ],
    })
    const emptyProject = await Project.detect(await createProject({
      'package.json': JSON.stringify({workspaces: ['packages/*']}),
    }))
    expect(emptyProject.getResult('workspace')).toMatchObject({
      detected: false,
      ran: true,
    })
    expect(emptyProject.getResult('workspace').error).toBeUndefined()
  })
})
describe('parseGithubUrl', () => {
  test('parses GitHub remote URLs', async () => {
    const {parseGithubUrl} = await import('#src/lib/github.ts')
    const expected = {
      owner: 'Jaid',
      repo: 'stacktag',
    }
    expect(parseGithubUrl('https://github.com/Jaid/stacktag')).toEqual(expected)
    expect(parseGithubUrl('https://token@github.com/Jaid/stacktag.git/')).toEqual(expected)
    expect(parseGithubUrl('git+https://www.github.com/Jaid/stacktag.git')).toEqual(expected)
    expect(parseGithubUrl('ssh://git@ssh.github.com:443/Jaid/stacktag.git')).toEqual(expected)
    expect(parseGithubUrl('git://GitHub.com/Jaid/stacktag.git')).toEqual(expected)
    expect(parseGithubUrl('git@github.com:Jaid/stacktag.git')).toEqual(expected)
    expect(parseGithubUrl('github.com:Jaid/stacktag')).toEqual(expected)
    expect(parseGithubUrl('https://github.com/Jaid')).toEqual({})
    expect(parseGithubUrl('https://gitlab.com/Jaid/stacktag.git')).toBeUndefined()
    expect(parseGithubUrl('https://github.com.evil.example/Jaid/stacktag.git')).toBeUndefined()
    expect(parseGithubUrl('git@example.com:github.com/stacktag.git')).toBeUndefined()
    expect(parseGithubUrl('C:/repos/stacktag')).toBeUndefined()
    expect(parseGithubUrl('/srv/github.com/Jaid/stacktag.git')).toBeUndefined()
  })
})
