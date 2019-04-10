'use strict'

module.exports = wrapCluster

function wrapCluster (tape, Cluster) {
    var test = buildTester(tape)

    test.only = buildTester(tape.only)
    test.skip = buildTester(tape.skip)

    return test

    function buildTester (testFn) {
        return tester

        function tester (testName, options, fn) {
            if (!fn && typeof options === 'function') {
                fn = options
                options = {}
            }

            if (!fn) {
                return testFn(testName)
            }

            testFn(testName, onAssert)

            function onAssert (assert) {
                var _end = assert.end
                var onlyOnce = false
                assert.end = asyncEnd

                var _plan = assert.plan
                assert.plan = planFail

                options.assert = assert
                var cluster = new Cluster(options)
                var ret = cluster.bootstrap(onCluster)
                if (ret && ret.then) {
                    ret.then(function success () {
                        process.nextTick(onCluster)
                    }, function fail (promiseError) {
                        process.nextTick(onCluster, promiseError)
                    })
                }

                function planFail (count) {
                    var e = new Error('temporary message')
                    var errorStack = e.stack
                    var errorLines = errorStack.split('\n')

                    var caller = errorLines[2]

                    // TAP: call through because plan is called internally
                    if (/node_modules[/?][\\?\\?]?tap/.test(caller)) {
                        return _plan.apply(assert, arguments)
                    }

                    throw new Error('tape-cluster: t.plan() is not supported')
                }

                function onCluster (err) {
                    if (err) {
                        return assert.end(err)
                    }

                    var ret = fn(cluster, assert)
                    if (ret && ret.then) {
                        ret.then(function success () {
                            // user may have already called end()
                            if (!onlyOnce) {
                                assert.end()
                            }
                        }, function fail (promiseError) {
                            assert.ifError(promiseError)
                            // user may have already called end()
                            if (!onlyOnce) {
                                assert.end()
                            }
                        })
                    }
                }

                function asyncEnd (err) {
                    if (onlyOnce) {
                        return _end.apply(assert, arguments)
                    }
                    onlyOnce = true

                    if (err) {
                        assert.ifError(err)
                    }

                    var ret = cluster.close(onEnd)
                    if (ret && ret.then) {
                        ret.then(function success () {
                            process.nextTick(onEnd)
                        }, function fail (promiseError) {
                            process.nextTick(onEnd, promiseError)
                        })
                    }

                    function onEnd (err2) {
                        if (err2) {
                            assert.ifError(err2)
                        }

                        _end.call(assert, err)
                    }
                }
            }
        }
    }
}
