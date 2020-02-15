const Queue = require('bull')

const processor = require('../processors/metaEndProcess')
const PROCESS_LIMIT = 20
const META_END = 'meta/END'

const MetaEndQueue = new Queue(META_END)
const MetaEndQueueAdd = MetaEndQueue.add.bind(MetaEndQueue)
const MetaEndQueueProcess = () => MetaEndQueue.process(PROCESS_LIMIT, processor)
const MetaEndQueueStop = () => MetaEndQueue.close()

module.exports = {
  META_END,
  MetaEndQueue,
  MetaEndQueueAdd,
  MetaEndQueueProcess,
  MetaEndQueueStop,
}
