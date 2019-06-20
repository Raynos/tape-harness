'use strict'

var request = require('request')

var MyTestCluster = require('./lib/test-cluster.js')

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
