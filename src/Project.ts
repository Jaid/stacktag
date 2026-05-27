import type Tag from '#src/tags/base/Tag.ts'
import type {EventPayload, TagRepresentation} from '#src/tags/base/Tag.ts'
import type {Constructor} from 'type-fest'

import path from 'node:path'

import expect from '#src/expect.ts'
import defaultTagRegistry from '#src/tags/index.ts'

export type DetectedTag = {
  id: string
  name: string
  value: unknown
}

export type TagRegistry = ReadonlyMap<string, Constructor<Tag>>

export type TagResult = {
  detected: boolean
  error?: Error
  forced: boolean
  id: string
  impliedBy: Array<string>
  name: string
  priority: number
  ran: boolean
  skipped: boolean
  value: unknown
}

export type ProjectResults = Record<string, TagResult>

const toError = (error: unknown) => {
  if (error instanceof Error) {
    return error
  }
  return new Error(`Unexpected throwable: ${String(error)}`)
}
const asArray = <Type>(value: Array<Type> | Type | undefined) => {
  if (value === undefined) {
    return []
  }
  return Array.isArray(value) ? value : [value]
}

export default class Project {
  static async detect<ProjectType extends Project>(this: new (cwd?: string, registry?: TagRegistry) => ProjectType, cwd: string = process.cwd(), registry?: TagRegistry) {
    const project = new this(cwd, registry)
    await project.init()
    return project
  }
  readonly cwd: string
  executionOrder?: Array<string>
  readonly registry: TagRegistry
  private readonly idsByConstructor = new Map<Constructor<Tag>, string>
  private initPromise?: Promise<this>
  private resultsValue?: ProjectResults
  private tagInstances?: Map<string, Tag>
  constructor(cwd: string = process.cwd(), registry: TagRegistry = defaultTagRegistry) {
    this.cwd = path.resolve(cwd).replaceAll('\\', '/')
    this.registry = new Map(registry)
    for (const [id, TagClass] of this.registry.entries()) {
      this.idsByConstructor.set(TagClass, id)
    }
  }
  get results() {
    if (this.resultsValue === undefined) {
      throw new Error('Project results are not initialized yet. Call `await project.init()` first or use `await Project.detect()`.')
    }
    return this.resultsValue
  }
  getResult(tag: TagRepresentation) {
    const results = this.results
    return results[this.normalizeTag(tag)]
  }
  getResults() {
    return this.results
  }
  getTags() {
    const results = this.results
    const order = this.executionOrder ?? Object.keys(results)
    return order.flatMap((id): Array<DetectedTag> => {
      const result = results[id]
      if (!result.detected) {
        return []
      }
      return [
        {
          id,
          name: result.name,
          value: result.value,
        },
      ]
    })
  }
  hasTag(tag: TagRepresentation) {
    const result = this.getResult(tag)
    return result.detected
  }
  async init() {
    if (this.resultsValue !== undefined) {
      return this
    }
    if (!this.initPromise) {
      this.initPromise = (async () => {
        await expect.folderExists(this.cwd)
        this.tagInstances = new Map([...this.registry.entries()].map(([id, TagClass]) => [id, new TagClass]))
        this.executionOrder = this.getExecutionOrder()
        const results = this.createResults()
        const processedImplications = new Set<string>
        for (const id of this.executionOrder) {
          await this.detectTag(id, results, processedImplications)
        }
        this.resultsValue = results
        return this
      })()
    }
    try {
      return await this.initPromise
    } finally {
      this.initPromise = undefined
    }
  }
  private applyImplications(id: string, results: ProjectResults, processed: Set<string>) {
    if (!this.tagInstances) {
      throw new Error('Tag instances are not initialized.')
    }
    const queue = [id]
    while (queue.length > 0) {
      const currentId = queue.shift()
      if (!currentId) {
        continue
      }
      if (processed.has(currentId)) {
        continue
      }
      const currentResult = results[currentId]
      if (!currentResult.detected) {
        continue
      }
      processed.add(currentId)
      const currentTag = this.tagInstances.get(currentId)
      if (!currentTag) {
        throw new Error(`Missing tag instance for “${currentId}”.`)
      }
      for (const impliedId of this.normalizeTagList(currentTag.implies())) {
        if (this.markImplied(results, impliedId, currentId, false)) {
          queue.push(impliedId)
        }
      }
      for (const impliedId of this.normalizeTagList(currentTag.impliesAndSkips())) {
        if (this.markImplied(results, impliedId, currentId, true)) {
          queue.push(impliedId)
        }
      }
    }
  }
  private broadcastDetection(event: EventPayload) {
    if (!this.tagInstances) {
      throw new Error('Tag instances are not initialized.')
    }
    for (const tag of this.tagInstances.values()) {
      tag.emit('detect', event)
    }
  }
  private compareTagIds(a: string, b: string) {
    const aPriority = this.tagInstances?.get(a)?.getPriority() ?? 0
    const bPriority = this.tagInstances?.get(b)?.getPriority() ?? 0
    if (aPriority !== bPriority) {
      return bPriority - aPriority
    }
    return a.localeCompare(b)
  }
  private createResults(): ProjectResults {
    if (!this.tagInstances) {
      throw new Error('Tag instances are not initialized.')
    }
    const entries = [...this.tagInstances.entries()].map(([id, tag]) => {
      const result: TagResult = {
        detected: false,
        forced: false,
        id,
        impliedBy: [],
        name: tag.getName(),
        priority: tag.getPriority(),
        ran: false,
        skipped: false,
        value: undefined,
      }
      return [id, result] as const
    })
    return Object.fromEntries(entries)
  }
  private async detectTag(id: string, results: ProjectResults, processed: Set<string>) {
    if (!this.tagInstances) {
      throw new Error('Tag instances are not initialized.')
    }
    const tag = this.tagInstances.get(id)
    if (!tag) {
      throw new Error(`Missing tag instance for “${id}”.`)
    }
    const result = results[id]
    if (result.skipped) {
      return result
    }
    const requiredIds = this.normalizeTagList(tag.needs())
    if (requiredIds.some(requiredId => !results[requiredId].detected)) {
      result.skipped = true
      return result
    }
    const requiredSomeIds = this.normalizeTagList(tag.needsSome())
    if (requiredSomeIds.length > 0 && requiredSomeIds.every(requiredId => !results[requiredId].detected)) {
      result.skipped = true
      return result
    }
    if (!tag.shouldRun()) {
      result.skipped = true
      return result
    }
    let error: Error | undefined
    let detection = false
    try {
      result.value = await tag.detect(this.cwd)
      detection = true
      result.detected = true
    } catch (rawError) {
      error = toError(rawError)
      result.error = error
      if (!result.forced) {
        result.detected = false
      }
    } finally {
      result.ran = true
      this.broadcastDetection({
        detection,
        error,
        id,
        tag,
        value: result.value,
      })
    }
    if (result.detected) {
      this.applyImplications(id, results, processed)
    }
    return result
  }
  private getExecutionOrder() {
    if (!this.tagInstances) {
      throw new Error('Tag instances are not initialized.')
    }
    const ids = [...this.tagInstances.keys()]
    const edges = new Map(ids.map(id => [id, new Set<string>]))
    const incomingEdges = new Map(ids.map(id => [id, 0]))
    const addEdge = (before: string, after: string) => {
      if (before === after) {
        return
      }
      const targets = edges.get(before)
      if (!targets || targets.has(after)) {
        return
      }
      targets.add(after)
      incomingEdges.set(after, (incomingEdges.get(after) ?? 0) + 1)
    }
    for (const [id, tag] of this.tagInstances.entries()) {
      for (const dependencyId of this.normalizeTagList(tag.needs())) {
        addEdge(dependencyId, id)
      }
      for (const dependencyId of this.normalizeTagList(tag.needsSome())) {
        addEdge(dependencyId, id)
      }
      for (const dependencyId of this.normalizeTagList(tag.shouldRunBefore())) {
        addEdge(dependencyId, id)
      }
      for (const dependentId of this.normalizeTagList(tag.shouldRunAfter())) {
        addEdge(id, dependentId)
      }
      for (const impliedId of this.normalizeTagList(tag.implies())) {
        addEdge(id, impliedId)
      }
      for (const impliedId of this.normalizeTagList(tag.impliesAndSkips())) {
        addEdge(id, impliedId)
      }
    }
    const available = ids.filter(id => (incomingEdges.get(id) ?? 0) === 0)
    const order: Array<string> = []
    while (available.length > 0) {
      available.sort((a, b) => this.compareTagIds(a, b))
      const nextId = available.shift()
      if (!nextId) {
        continue
      }
      order.push(nextId)
      for (const dependentId of edges.get(nextId) ?? []) {
        const remainingIncomingEdges = (incomingEdges.get(dependentId) ?? 0) - 1
        incomingEdges.set(dependentId, remainingIncomingEdges)
        if (remainingIncomingEdges === 0) {
          available.push(dependentId)
        }
      }
    }
    if (order.length !== ids.length) {
      const unresolvedIds = ids.filter(id => !order.includes(id))
      throw new Error(`Could not resolve a tag execution order because the dependency graph contains a cycle: ${unresolvedIds.join(', ')}`)
    }
    return order
  }
  private markImplied(results: ProjectResults, impliedId: string, originId: string, skip: boolean) {
    const result = results[impliedId]
    const wasDetected = result.detected
    result.detected = true
    result.forced = true
    if (!result.impliedBy.includes(originId)) {
      result.impliedBy.push(originId)
    }
    if (skip && !result.ran) {
      result.skipped = true
    }
    return !wasDetected
  }
  private normalizeTag(tag: TagRepresentation) {
    if (typeof tag === 'string') {
      if (!this.registry.has(tag)) {
        throw new Error(`Unknown tag id: “${tag}”.`)
      }
      return tag
    }
    const id = this.idsByConstructor.get(tag)
    if (!id) {
      throw new Error(`Unknown tag class: “${tag.name}”.`)
    }
    return id
  }
  private normalizeTagList(tags: Array<TagRepresentation> | TagRepresentation | undefined) {
    return [...new Set(asArray(tags).map(tag => this.normalizeTag(tag)))]
  }
}
