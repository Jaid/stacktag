import type Project from '#src/Project.ts'

import {expect} from 'bun:test'

const check = (project: Project) => {
  expect(project).toHaveProperty('cwd')
  expect(project.hasTag('git')).toBeTrue()
  expect(project.hasTag('node_like')).toBeTrue()
  expect(project.hasTag('bun')).toBeTrue()
  expect(project.hasTag('github')).toBeTrue()
  expect(project.hasTag('typescript')).toBeTrue()
  expect(project.hasTag('workspace')).toBeFalse()
  expect(project.getResult('eslint').value).toMatchObject({
    configFile: 'eslint.config.ts',
    configFormat: 'flat',
  })
  expect(project.getResult('node_like').value).toMatchObject({
    packageJson: {
      name: 'stacktag',
    },
  })
  expect(project.getResult('bun').value).toMatchObject({
    configFile: 'bunfig.toml',
    lockfile: 'bun.lock',
  })
}

export default check
