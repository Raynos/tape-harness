# tape-harness

<!--
    [![build status][build-png]][build]
    [![Coverage Status][cover-png]][cover]
    [![Davis Dependency status][dep-png]][dep]
-->

<!-- [![NPM][npm-png]][npm] -->

A helper to run integration tests against an application

## Motivation

When writing integration tests against a service you generally
want to spawn up an instance of the application.

Writing tests against an application can be tedious without
a helper to do common setup & teardown before & after every test.

The `tape-harness` package will setup your test
harness / runner / application before each test block and
spin them down after each test block.

This functionality is similar to `beforeEach` or `afterEach`
that might exist in other testing libraries but is instead
implemented as a standalone library that's
compatible with vanilla `tape` and `tap`

## Example

Your test file

```js
// test/what.js
'use strict';

var tape = require('tape');
var request = require('request');

var MyTestHarness = require('./lib/test-harness.js');

MyTestHarness.test('a test', {
    port: 8000
}, function t(harness, assert) {
    request({
        url: 'http://localhost:' + harness.port + '/foo'
    }, function onResponse(err, resp, body) {
        assert.ifError(err);

        assert.equal(resp.statusCode, 200);
        assert.equal(resp.body, '/foo');

        assert.end();
    });
});

tape('a test without tape-harness', function t(assert) {
    var harness = new MyTestHarness({
        port: 8000
    });
    harness.bootstrap(function (err) {
        assert.ifError(err);
        request({
            url: 'http://localhost:' + harness.port + '/foo'
        }, function onResponse(err, resp, body) {
            assert.ifError(err);

            assert.equal(resp.statusCode, 200);
            assert.equal(resp.body, '/foo');

            harness.close(function (err) {
                assert.ifError(err);
                assert.end();
            });
        });
    });
});
```

Your actual `test-harness.js`

```js
// test-harness.js
'use strict';

var tape = require('tape');
var http = require('http');
var tapeHarness = require('tape-harness');

MyTestHarness.test = tapeHarness(tape, MyTestHarness);

module.exports = MyTestHarness;

function MyTestHarness(opts) {
    if (!(this instanceof MyTestHarness)) {
        return new MyTestHarness(opts);
    }

    var self = this;

    self.assert = opts.assert;
    self.port = opts.port;
    self.server = http.createServer();

    self.server.on('request', onRequest);

    function onRequest(req, res) {
        res.end(req.url);
    }
}

MyTestHarness.prototype.bootstrap = function bootstrap(cb) {
    var self = this;

    self.server.once('listening', cb);
    self.server.listen(self.port);
};

MyTestHarness.prototype.close = function close(cb) {
    var self = this;

    self.server.close(cb);
};
```

## ES6 example

```js
const fetch = require('node-fetch')

const MyTestHarness = require('./lib/test-harness.js');

MyTestHarness.test('a test', {
    port: 8000
}, async function t(harness, assert) {
    const res = await fetch(`http://localhost:${harness.port}/foo`)

    const text = await res.text()
    assert.equal(res.status, 200)
    assert.equal(text, '/foo')
});
```

```js
const tape = require('tape');
const http = require('http');
const tapeHarness = require('tape-harness');

class TestHarness {
    constructor(opts) {
        this.port = opts.port
        this.server = http.createServer()

        this.server.on('request', (req, res) => {
            res.end(req.url)
        })
    }

    async bootstrap() {
        return new Promise((resolve) => {
            this.server.once('listening', resolve)
            this.server.listen(this.port)
        })
    }

    async close() {
        return new Promise((resolve, reject) => {
            this.server.close((err) => {
                if (err) return reject(err)
                resolve()
            })
        })
    }
}

TestHarness.test = tapeHarness(tape, TestHarness)
```

## Installation

`npm install tape-harness`

## Tests

`npm test`

## Contributors

 - Raynos

## MIT Licensed

  [build-png]: https://secure.travis-ci.org/Raynos/tape-harness.png
  [build]: https://travis-ci.org/Raynos/tape-harness
  [cover-png]: https://coveralls.io/repos/Raynos/tape-harness/badge.png
  [cover]: https://coveralls.io/r/Raynos/tape-harness
  [dep-png]: https://david-dm.org/Raynos/tape-harness.png
  [dep]: https://david-dm.org/Raynos/tape-harness
  [npm-png]: https://nodei.co/npm/tape-harness.png?stars&downloads
  [npm]: https://nodei.co/npm/tape-harness
