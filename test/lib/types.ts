import type Project from '#src/Project.ts'
import type {Promisable} from 'type-fest'

export type FixtureCheck = (project: Project) => Promisable<void>
export type FixtureFolderSource = {
  folder: string
}

export type FixtureRepoSource = {
  repo: string
  revision: string
}

export type FixtureSource = FixtureFolderSource | FixtureRepoSource
