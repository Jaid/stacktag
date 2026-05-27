import type Project from '#src/Project.ts'
import {expect} from 'bun:test'

const check = (project: Project) => {
  expect(project).toHaveProperty("cwd")
  expect(project.hasTag("url")).toBeTrue()
}

export default check
