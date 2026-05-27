import type Project from '#src/Project.ts'
import type {Promisable} from 'type-fest'

export type FixtureCheck = (project: Project) => Promisable<void>
export type FixtureSource = {
  repo: string
  revision: string
}
