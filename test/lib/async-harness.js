'use strict'

const http = require('http')
const util = require('util')
const tape = require('tape')

const tapeHarness = require('../../index.js')

class AsyncHarness {
  constructor (opts) {
    this.port = opts.port || 0
    this.server = http.createServer()

    this.server.on('request', (req, res) => {
      res.end(req.url)
    })
  }

  async bootstrap () {
    await util.promisify((cb) => {
      this.server.listen(this.port, () => {
        this.port = this.server.address().port
        cb()
      })
    })()
  }

  async close () {
    await util.promisify((cb) => {
      this.server.close(cb)
    })()
  }
}
AsyncHarness.test = tapeHarness(tape, AsyncHarness)

module.exports = AsyncHarness
