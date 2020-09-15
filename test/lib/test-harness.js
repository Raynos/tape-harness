// @ts-check
'use strict'

var tape = require('@pre-bundled/tape')
var tap = require('tap')
var http = require('http')

var tapeHarness = require('../../index.js')

class MyTestHarness {
  /**
   * @param {{ port?: number }} opts
   */
  constructor (opts) {
    this.port = opts.port || 0
    this.server = http.createServer()

    this.server.on('request', (req, res) => {
      res.end(req.url)
    })
  }

  /**
   * @param {() => void} cb
   */
  bootstrap (cb) {
    this.server.once('listening', () => {
      const addr = this.server.address()
      if (addr && typeof addr === 'object') {
        this.port = addr.port
      }
      cb()
    })
    this.server.listen(this.port)
  }

  /**
   * @param {() => void} cb
   */
  close (cb) {
    this.server.close(cb)
  }
}

MyTestHarness.test = tapeHarness(tape, MyTestHarness)
MyTestHarness.tapTest = tapeHarness(
  /** @type {any} */ (tap.test), MyTestHarness
)

module.exports = MyTestHarness
