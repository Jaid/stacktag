import type Project from '#src/Project.ts'
import {expect} from 'bun:test'

const check = (project: Project) => {
  expect(project).toHaveProperty("cwd")
}

export default check
