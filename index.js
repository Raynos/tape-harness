'use strict'

module.exports = wrapHarness

function wrapHarness (tape, Harness) {
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
        var harness = new Harness(options)
        var ret = harness.bootstrap(onHarness)
        if (ret && ret.then) {
          ret.then(function success () {
            process.nextTick(onHarness)
          }, function fail (promiseError) {
            process.nextTick(onHarness, promiseError)
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

          throw new Error('tape-harness: t.plan() is not supported')
        }

        function onHarness (err) {
          if (err) {
            return assert.end(err)
          }

          var ret = fn(harness, assert)
          if (ret && ret.then) {
            ret.then(function success () {
              // user may have already called end()
              if (!onlyOnce) {
                assert.end()
              }
            }, function fail (promiseError) {
              process.nextTick(rethrow, promiseError)
            })
          }
        }

        function rethrow (promiseError) {
          throw promiseError
        }

        function asyncEnd (err) {
          if (onlyOnce) {
            return _end.apply(assert, arguments)
          }
          onlyOnce = true

          if (err) {
            assert.ifError(err)
          }

          var ret = harness.close(onEnd)
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
