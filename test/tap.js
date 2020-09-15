'use strict'

var request = require('request')

var MyTestHarness = require('./lib/test-harness.js')

MyTestHarness.tapTest('a tap test', {
  port: 0
}, function t (harness, assert) {
  request({
    url: 'http://localhost:' + harness.port + '/foo'
  }, function onResponse (err, resp) {
    assert.ifError(err)

    assert.equal(resp.statusCode, 200)
    assert.equal(resp.body, '/foo')

    assert.end()
  })
})

MyTestHarness.tapTest('using tap t.plan', function t (harness, assert) {
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
  }, function onResponse (err, resp) {
    assert.ifError(err)

    assert.equal(resp.statusCode, 200)
    assert.equal(resp.body, '/foo')

    assert.end()
  })
})
