const Queue = require('bull')

const processor = require('../processors/metaStartProcess')
const PROCESS_LIMIT = 20
const META_START = 'meta/START'

const MetaStartQueue = new Queue(META_START)
const MetaStartQueueAdd = MetaStartQueue.add.bind(MetaStartQueue)
const MetaStartQueueProcess = () => MetaStartQueue.process(PROCESS_LIMIT, processor)
const MetaStartQueueStop = () => MetaStartQueue.close()

module.exports = {
  META_START,
  MetaStartQueue,
  MetaStartQueueAdd,
  MetaStartQueueProcess,
  MetaStartQueueStop,
}
