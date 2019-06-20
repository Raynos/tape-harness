'ues strict'

var tape = require('tape')
var tap = require('tap')
var http = require('http')

var tapeCluster = require('../../index.js')

function MyTestCluster (opts) {
    if (!(this instanceof MyTestCluster)) {
        return new MyTestCluster(opts)
    }

    var self = this

    self.port = opts.port || 0
    self.server = http.createServer()

    self.server.on('request', onRequest)

    function onRequest (req, res) {
        res.end(req.url)
    }
}

MyTestCluster.prototype.bootstrap = function bootstrap (cb) {
    var self = this

    self.server.once('listening', function onListen () {
        self.port = self.server.address().port
        cb()
    })
    self.server.listen(self.port)
}

MyTestCluster.prototype.close = function close (cb) {
    var self = this

    self.server.close(cb)
}

MyTestCluster.test = tapeCluster(tape, MyTestCluster)
MyTestCluster.tapTest = tapeCluster(tap.test, MyTestCluster)

module.exports = MyTestCluster
