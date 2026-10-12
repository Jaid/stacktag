import * as path from 'forward-slash-path'
import traverseWorkspace from 'traverse-workspace'

import NotDetectedError from '#src/NotDetectedError.ts'

import PackageJsonAwareTag from './base/PackageJsonAwareTag.ts'
import NodeLikeTag from './NodeLikeTag.ts'

export type WorkspacePackage = {
  /**
   * package folder relative to the project folder
   */
  folder: string
  /**
   * package names from the project package down to this package, with folder names as fallbacks for unnamed packages
   */
  hierarchy: Array<string>
  name?: string
  private?: boolean
  version?: string
}

export type Payload = {
  packages: Array<WorkspacePackage>
}

export default class WorkspaceTag extends PackageJsonAwareTag {
  override async detect(folder: string): Promise<Payload> {
    if (this.packageJson?.workspaces === undefined) {
      throw new NotDetectedError('not in package.json#workspaces')
    }
    const packages: Array<WorkspacePackage> = []
    // depth-first preorder, the first entry is the project package itself
    for await (const entry of traverseWorkspace.async(folder)) {
      if (entry.hierarchy.length === 1) {
        continue
      }
      const workspacePackage: WorkspacePackage = {
        folder: path.relative(folder, entry.folder).replaceAll('\\', '/'),
        hierarchy: entry.hierarchy,
      }
      if (entry.name !== undefined) {
        workspacePackage.name = entry.name
      }
      if (entry.private !== undefined) {
        workspacePackage.private = entry.private
      }
      if (entry.version !== undefined) {
        workspacePackage.version = entry.version
      }
      packages.push(workspacePackage)
    }
    if (packages.length === 0) {
      throw new NotDetectedError('package.json#workspaces matches no packages')
    }
    return {packages}
  }
  override getName() {
    return 'Workspace'
  }
  override needs() {
    return NodeLikeTag
  }
}
