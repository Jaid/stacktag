export default class Project {
  cwd: string
  results: Record<string, unknown> | undefined
  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd
  }
  async getTags() {
    if (!this.results) {
      await this.init()
    }
  }
  async init() {
    this.results = {}
  }
}
