import * as path from 'forward-slash-path'

export default {
  folder: path.resolve(import.meta.dirname, '../../..').replaceAll('\\', '/'),
}
