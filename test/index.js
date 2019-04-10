'use strict'

var tape = require('tape')
var tap = require('tap')
var http = require('http')
var util = require('util')
var request = require('request')

var tapeCluster = require('../index.js')

var promiseRequest = util.promisify(request)

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

MyTestCluster.test('a test', {
    port: 8000
}, function t (cluster, assert) {
    request({
        url: 'http://localhost:' + cluster.port + '/foo'
    }, function onResponse (err, resp, body) {
        assert.ifError(err)

        assert.equal(resp.statusCode, 200)
        assert.equal(resp.body, '/foo')

        assert.end()
    })
})

MyTestCluster.tapTest('a tap test', {
    port: 0
}, function t (cluster, assert) {
    request({
        url: 'http://localhost:' + cluster.port + '/foo'
    }, function onResponse (err, resp, body) {
        assert.ifError(err)

        assert.equal(resp.statusCode, 200)
        assert.equal(resp.body, '/foo')

        assert.end()
    })
})

MyTestCluster.test('no options', function t (cluster, assert) {
    request({
        url: 'http://localhost:' + cluster.port + '/foo'
    }, function onResponse (err, resp, body) {
        assert.ifError(err)

        assert.equal(resp.statusCode, 200)
        assert.equal(resp.body, '/foo')

        assert.end()
    })
})

MyTestCluster.test('async await', async function t (cluster, assert) {
    var resp = await promiseRequest({
        url: 'http://localhost:' + cluster.port + '/foo'
    })

    assert.equal(resp.statusCode, 200)
    assert.equal(resp.body, '/foo')

    assert.end()
})

MyTestCluster.test('async await no end',
    async function t (cluster, assert) {
        var resp = await promiseRequest({
            url: 'http://localhost:' + cluster.port + '/foo'
        })

        assert.equal(resp.statusCode, 200)
        assert.equal(resp.body, '/foo')
    })

MyTestCluster.test('using t.plan', function t (cluster, assert) {
    var shouldFail = false
    // jscs:disable disallowKeywords
    try {
        assert.plan(3)
    } catch (err) {
        shouldFail = true
        assert.equal(err.message,
            'tape-cluster: t.plan() is not supported')
    }
    // jscs:enable disallowKeywords
    assert.ok(shouldFail)

    request({
        url: 'http://localhost:' + cluster.port + '/foo'
    }, function onResponse (err, resp, body) {
        assert.ifError(err)

        assert.equal(resp.statusCode, 200)
        assert.equal(resp.body, '/foo')

        assert.end()
    })
})

MyTestCluster.tapTest('using tap t.plan', function t (cluster, assert) {
    var shouldFail = false
    // jscs:disable disallowKeywords
    try {
        assert.plan(3)
    } catch (err) {
        shouldFail = true
        assert.equal(err.message,
            'tape-cluster: t.plan() is not supported')
    }
    // jscs:enable disallowKeywords
    assert.ok(shouldFail)

    request({
        url: 'http://localhost:' + cluster.port + '/foo'
    }, function onResponse (err, resp, body) {
        assert.ifError(err)

        assert.equal(resp.statusCode, 200)
        assert.equal(resp.body, '/foo')

        assert.end()
    })
})

MyTestCluster.test('no function name')

function MyPromiseTestCluster (opts) {
    if (!(this instanceof MyPromiseTestCluster)) {
        return new MyPromiseTestCluster(opts)
    }

    var self = this

    self.port = opts.port || 0
    self.server = http.createServer()

    self.server.on('request', onRequest)

    function onRequest (req, res) {
        res.end(req.url)
    }
}

MyPromiseTestCluster.prototype.bootstrap = async function bootstrap () {
    return new Promise((resolve) => {
        this.server.once('listening', () => {
            this.port = this.server.address().port
            resolve()
        })
        this.server.listen(this.port)
    })
}

MyPromiseTestCluster.prototype.close = async function close () {
    return new Promise((resolve, reject) => {
        this.server.close((err) => {
            if (err) return reject(err)
            resolve()
        })
    })
}

MyPromiseTestCluster.test = tapeCluster(tape, MyPromiseTestCluster)

MyPromiseTestCluster.test('async await promise', async function t (cluster, assert) {
    var resp = await promiseRequest({
        url: 'http://localhost:' + cluster.port + '/foo'
    })

    assert.equal(resp.statusCode, 200)
    assert.equal(resp.body, '/foo')

    assert.end()
})

tape('handles bootstrap error', function t (assert) {
    function TestClass () {}

    TestClass.prototype.bootstrap = function b (cb) {
        cb(new Error('it failed'))
    }
    TestClass.prototype.close = function c (cb) {
        cb()
    }

    var myTest = tapeCluster(function testFn (name, fn) {
        var hasError = false
        assert.equal(name, 'a name')
        fn({
            end: function end () {
                assert.ok(hasError)

                assert.end()
            },
            ifError: function ifError (err) {
                hasError = true
                assert.ok(err)
                assert.equal(err.message, 'it failed')
            }
        })
    }, TestClass)

    myTest('a name', function _ (assertLike) {
        assert.fail('should not reach here')
        assertLike.end()
    })
})

tape('handles async bootstrap error', function t (assert) {
    function TestClass () {}

    TestClass.prototype.bootstrap = async function b (cb) {
        throw new Error('it failed')
    }
    TestClass.prototype.close = function c (cb) {
        cb()
    }

    var myTest = tapeCluster(function testFn (name, fn) {
        var hasError = false
        assert.equal(name, 'a name')
        fn({
            end: function end () {
                assert.ok(hasError)

                assert.end()
            },
            ifError: function ifError (err) {
                hasError = true
                assert.ok(err)
                assert.equal(err.message, 'it failed')
            }
        })
    }, TestClass)

    myTest('a name', function _ (assertLike) {
        assert.fail('should not reach here')
        assertLike.end()
    })
})

tape('handles close error', function t (assert) {
    function TestClass () {}

    TestClass.prototype.bootstrap = function b (cb) {
        cb()
    }
    TestClass.prototype.close = function c (cb) {
        cb(new Error('it failed'))
    }

    var myTest = tapeCluster(function testFn (name, fn) {
        var hasError = false
        assert.equal(name, 'a name')
        fn({
            end: function end () {
                assert.ok(hasError)

                assert.end()
            },
            ifError: function ifError (err) {
                hasError = true
                assert.ok(err)
                assert.equal(err.message, 'it failed')
            }
        })
    }, TestClass)

    myTest('a name', function _ (cluster, assertLike) {
        assert.ok(cluster)
        assertLike.end()
    })
})

tape('handles async close error', function t (assert) {
    function TestClass () {}

    TestClass.prototype.bootstrap = function b (cb) {
        cb()
    }
    TestClass.prototype.close = async function c (cb) {
        throw new Error('it failed')
    }

    var myTest = tapeCluster(function testFn (name, fn) {
        var hasError = false
        assert.equal(name, 'a name')
        fn({
            end: function end () {
                assert.ok(hasError)

                assert.end()
            },
            ifError: function ifError (err) {
                hasError = true
                assert.ok(err)
                assert.equal(err.message, 'it failed')
            }
        })
    }, TestClass)

    myTest('a name', function _ (cluster, assertLike) {
        assert.ok(cluster)
        assertLike.end()
    })
})

tape('handles thrown exception', function t (assert) {
    function TestClass () {}

    TestClass.prototype.bootstrap = function b (cb) {
        cb()
    }
    TestClass.prototype.close = function c (cb) {
        cb()
    }

    var myTest = tapeCluster(function testFn (name, fn) {
        var hasError = false
        assert.equal(name, 'a name')
        fn({
            end: function end () {
                assert.ok(hasError)

                assert.end()
            },
            ifError: function ifError (err) {
                hasError = true
                assert.ok(err)
                assert.equal(err.message, 'it failed')
            }
        })
    }, TestClass)

    myTest('a name', async function _ (cluster, assertLike) {
        throw new Error('it failed')
    })
})

tape('handles thrown exception but also double end',
    function t (assert) {
        function TestClass () {}

        TestClass.prototype.bootstrap = function b (cb) {
            cb()
        }
        TestClass.prototype.close = function c (cb) {
            cb()
        }

        var myTest = tapeCluster(function testFn (name, fn) {
            var onlyOnce = false
            assert.equal(name, 'a name')
            fn({
                end: function end () {
                    if (onlyOnce) {
                        assert.ok(false, 'double end')
                    }
                    onlyOnce = true
                },
                ifError: function ifError (err) {
                    assert.ok(err)
                    assert.equal(err.message, 'it failed')

                    assert.ok(onlyOnce)
                    assert.end()
                }
            })
        }, TestClass)

        myTest('a name', async function _ (cluster, assertLike) {
            assertLike.end()
            throw new Error('it failed')
        })
    })
