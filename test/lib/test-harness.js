'ues strict'

var tape = require('tape')
var tap = require('tap')
var http = require('http')

var tapeHarness = require('../../index.js')

function MyTestHarness (opts) {
    if (!(this instanceof MyTestHarness)) {
        return new MyTestHarness(opts)
    }

    var self = this

    self.port = opts.port || 0
    self.server = http.createServer()

    self.server.on('request', onRequest)

    function onRequest (req, res) {
        res.end(req.url)
    }
}

MyTestHarness.prototype.bootstrap = function bootstrap (cb) {
    var self = this

    self.server.once('listening', function onListen () {
        self.port = self.server.address().port
        cb()
    })
    self.server.listen(self.port)
}

MyTestHarness.prototype.close = function close (cb) {
    var self = this

    self.server.close(cb)
}

MyTestHarness.test = tapeHarness(tape, MyTestHarness)
MyTestHarness.tapTest = tapeHarness(tap.test, MyTestHarness)

module.exports = MyTestHarness
