import type Project from '#src/Project.ts'
import {expect} from 'bun:test'

const check = (project: Project) => {
  expect(project).toHaveProperty("cwd")
  expect(project.hasTag("rust")).toBeTrue()
  expect(project.hasTag("github")).toBeTrue()
  expect(project.getResult("github_repository").value).toMatchObject({
    remotes: [{name: "origin", owner: "nix-community", repo: "nurl"}],
  })
  expect(project.hasTag("typescript")).toBeFalse()
}

export default check
