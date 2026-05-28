import path from 'node:path'

export default {
  folder: path.resolve(import.meta.dirname, '../../..').replaceAll('\\', '/'),
}
