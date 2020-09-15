'use strict'

var tape = require('tape')
var util = require('util')
var request = require('request')

var tapeHarness = require('../index.js')

var AsyncHarness = require('./lib/async-harness.js')
var MyTestHarness = require('./lib/test-harness.js')

var promiseRequest = util.promisify(request)

MyTestHarness.test('a test', {
  port: 8301
}, function t (harness, assert) {
  request({
    url: 'http://localhost:' + harness.port + '/foo'
  }, function onResponse (err, resp, body) {
    assert.ifError(err)

    assert.equal(resp.statusCode, 200)
    assert.equal(resp.body, '/foo')

    assert.end()
  })
})

MyTestHarness.test('no options', function t (harness, assert) {
  request({
    url: 'http://localhost:' + harness.port + '/foo'
  }, function onResponse (err, resp, body) {
    assert.ifError(err)

    assert.equal(resp.statusCode, 200)
    assert.equal(resp.body, '/foo')

    assert.end()
  })
})

MyTestHarness.test('async await', async function t (harness, assert) {
  var resp = await promiseRequest({
    url: 'http://localhost:' + harness.port + '/foo'
  })

  assert.equal(resp.statusCode, 200)
  assert.equal(resp.body, '/foo')

  assert.end()
})

MyTestHarness.test('async await no end',
  async function t (harness, assert) {
    var resp = await promiseRequest({
      url: 'http://localhost:' + harness.port + '/foo'
    })

    assert.equal(resp.statusCode, 200)
    assert.equal(resp.body, '/foo')
  })

MyTestHarness.test('using t.plan', function t (harness, assert) {
  var shouldFail = false
  // jscs:disable disallowKeywords
  try {
    assert.plan(3)
  } catch (err) {
    shouldFail = true
    assert.equal(err.message,
      'tape-harness: t.plan() is not supported')
  }
  // jscs:enable disallowKeywords
  assert.ok(shouldFail)

  request({
    url: 'http://localhost:' + harness.port + '/foo'
  }, function onResponse (err, resp, body) {
    assert.ifError(err)

    assert.equal(resp.statusCode, 200)
    assert.equal(resp.body, '/foo')

    assert.end()
  })
})

MyTestHarness.test('no function name')

AsyncHarness.test(
  'async await promise',
  async function t (harness, assert) {
    var resp = await promiseRequest({
      url: 'http://localhost:' + harness.port + '/foo'
    })

    assert.equal(resp.statusCode, 200)
    assert.equal(resp.body, '/foo')

    assert.end()
  }
)

AsyncHarness.test(
  'async await promise without end',
  async function t (harness, assert) {
    var resp = await promiseRequest({
      url: 'http://localhost:' + harness.port + '/foo'
    })

    assert.equal(resp.statusCode, 200)
    assert.equal(resp.body, '/foo')
  }
)

tape('handles bootstrap error', function t (assert) {
  function TestClass () {}

  TestClass.prototype.bootstrap = function b (cb) {
    cb(new Error('it failed'))
  }
  TestClass.prototype.close = function c (cb) {
    cb()
  }

  var myTest = tapeHarness(function testFn (name, fn) {
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

  var myTest = tapeHarness(function testFn (name, fn) {
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

  var myTest = tapeHarness(function testFn (name, fn) {
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

  myTest('a name', function _ (harness, assertLike) {
    assert.ok(harness)
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

  var myTest = tapeHarness(function testFn (name, fn) {
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

  myTest('a name', function _ (harness, assertLike) {
    assert.ok(harness)
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

  var myTest = tapeHarness(function testFn (name, fn) {
    assert.equal(name, 'a name')
    fn({
      end: function end () {
        assert.ok(false, 'should never be called')
      },
      ifError: function ifError () {
        assert.ok(false, 'should never be called')
      }
    })
  }, TestClass)

  process.once('uncaughtException', (err) => {
    assert.equal(err.message, 'it failed')
    assert.end()
  })

  myTest('a name', async function _ (harness, assertLike) {
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

    var onlyOnce = false
    var myTest = tapeHarness(function testFn (name, fn) {
      assert.equal(name, 'a name')
      fn({
        end: function end () {
          if (onlyOnce) {
            assert.ok(false, 'double end')
          }
          onlyOnce = true
        },
        ifError: function ifError () {
          assert.ok(false, 'should not be called')
        }
      })
    }, TestClass)

    process.once('uncaughtException', (err) => {
      assert.equal(err.message, 'it failed')
      assert.equal(onlyOnce, true)
      assert.end()
    })

    myTest('a name', async function _ (harness, assertLike) {
      assertLike.end()
      throw new Error('it failed')
    })
  })
