'use strict';

var tape = require('tape');
var http = require('http');
var request = require('request');

var tapeCluster = require('../index.js');

function MyTestCluster(opts) {
    if (!(this instanceof MyTestCluster)) {
        return new MyTestCluster(opts);
    }

    var self = this;

    self.port = opts.port || 0;
    self.server = http.createServer();

    self.server.on('request', onRequest);

    function onRequest(req, res) {
        res.end(req.url);
    }
}

MyTestCluster.prototype.bootstrap = function bootstrap(cb) {
    var self = this;

    self.server.once('listening', function onListen() {
        self.port = self.server.address().port;
        cb();
    });
    self.server.listen(self.port);
};

MyTestCluster.prototype.close = function close(cb) {
    var self = this;

    self.server.close(cb);
};

MyTestCluster.test = tapeCluster(tape, MyTestCluster);

MyTestCluster.test('a test', {
    port: 8000
}, function t(cluster, assert) {
    request({
        url: 'http://localhost:' + cluster.port + '/foo'
    }, function onResponse(err, resp, body) {
        assert.ifError(err);

        assert.equal(resp.statusCode, 200);
        assert.equal(resp.body, '/foo');

        assert.end();
    });
});

MyTestCluster.test('no options', function t(cluster, assert) {
    request({
        url: 'http://localhost:' + cluster.port + '/foo'
    }, function onResponse(err, resp, body) {
        assert.ifError(err);

        assert.equal(resp.statusCode, 200);
        assert.equal(resp.body, '/foo');

        assert.end();
    });
});

MyTestCluster.test('no function name');

tape('handles bootstrap error', function t(assert) {
    function TestClass() {}

    TestClass.prototype.bootstrap = function b(cb) {
        cb(new Error('it failed'));
    };
    TestClass.prototype.close = function c(cb) {
        cb();
    };

    var myTest = tapeCluster(function testFn(name, fn) {
        var hasError = false;
        assert.equal(name, 'a name');
        fn({
            end: function end() {
                assert.ok(hasError);

                assert.end();
            },
            ifError: function ifError(err) {
                hasError = true;
                assert.ok(err);
                assert.equal(err.message, 'it failed');
            }
        });
    }, TestClass);

    myTest('a name', function _(assertLike) {
        assert.fail('should not reach here');
        assertLike.end();
    });
});

tape('handles close error', function t(assert) {
    function TestClass() {}

    TestClass.prototype.bootstrap = function b(cb) {
        cb();
    };
    TestClass.prototype.close = function c(cb) {
        cb(new Error('it failed'));
    };

    var myTest = tapeCluster(function testFn(name, fn) {
        var hasError = false;
        assert.equal(name, 'a name');
        fn({
            end: function end() {
                assert.ok(hasError);

                assert.end();
            },
            ifError: function ifError(err) {
                hasError = true;
                assert.ok(err);
                assert.equal(err.message, 'it failed');
            }
        });
    }, TestClass);

    myTest('a name', function _(cluster, assertLike) {
        assert.ok(cluster);
        assertLike.end();
    });
});
