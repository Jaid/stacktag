import type Project from '#src/Project.ts'
import {expect} from 'bun:test'

const check = (project: Project) => {
  expect(project).toHaveProperty("cwd")
  expect(project.hasTag("node_like")).toBeTrue()
  expect(project.hasTag("github")).toBeTrue()
  expect(project.hasTag("typescript")).toBeTrue()
  expect(project.getResult("eslint").value).toMatchObject({
    configFile: ".eslintrc.json",
    configFormat: "legacy",
  })
  expect(project.hasTag("vite")).toBeFalse()
}

export default check
