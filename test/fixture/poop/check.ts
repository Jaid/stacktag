import type Project from '#src/Project.ts'
import {expect} from 'bun:test'

const check = (project: Project) => {
  expect(project.hasTag('git')).toBe(true)
}

export default check
