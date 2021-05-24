'use strict'

/**
 * @typedef {import('./types/pre-bundled__tape').Test} Test
 * @typedef {import('./types/pre-bundled__tape').TestCase} TestCase
 * @typedef {{
 *    bootstrap(cb?: (e?: Error) => void): void | Promise<void>
 *    close(cb?: (e?: Error) => void): void | Promise<void>
 * }} Harness
 */

/**
 * @template {Harness} T
 * @typedef {{
      (
        name: string,
        cb?: (harness: T, test: Test) => (void | Promise<void>)
      ): void;
      (
        name: string,
        opts: object,
        cb: (harness: T, test: Test) => (void | Promise<void>)
      ): void;

      only(
        name: string,
        cb?: (harness: T, test: Test) => (void | Promise<void>)
      ): void;
      only(
        name: string,
        opts: object,
        cb: (harness: T, test: Test) => (void | Promise<void>)
      ): void;

      skip(
        name: string,
        cb?: (harness: T, test: Test) => (void | Promise<void>)
      ): void;
      skip(
        name: string,
        opts: object,
        cb: (harness: T, test: Test) => (void | Promise<void>)
      ): void;
 * }} TapeTestFn
 */

module.exports = wrapHarness

/**
 * @template {Harness} T
 * @param {import('./types/pre-bundled__tape')} tape
 * @param {new (options: object) => T} Harness
 * @returns {TapeTestFn<T>}
 */
function wrapHarness (tape, Harness) {
  const harness = new TapeHarness(tape, Harness)

  test.only = harness.only.bind(harness)
  test.skip = harness.skip.bind(harness)

  return test

  /**
   * @param {string} testName
   * @param {object} [options]
   * @param {(harness: T, test: Test) => (void | Promise<void>)} [fn]
   */
  function test (testName, options, fn) {
    return harness.test(testName, options, fn)
  }
}

/**
 * @template {Harness} T
 */
class TapeHarness {
  /**
   * @param {import('./types/pre-bundled__tape')} tape
   * @param {new (options: object) => T} Harness
   */
  constructor (tape, Harness) {
    this.tape = tape
    this.Harness = Harness
  }

  /**
   * @param {string} testName
   * @param {object} [options]
   * @param {(harness: T, test: Test) => (void | Promise<void>)} [fn]
   */
  test (testName, options, fn) {
    this._test(this.tape, testName, options, fn)
  }

  /**
   * @param {string} testName
   * @param {object} [options]
   * @param {(harness: T, test: Test) => (void | Promise<void>)} [fn]
   */
  only (testName, options, fn) {
    this._test(this.tape.only, testName, options, fn)
  }

  /**
   * @param {string} testName
   * @param {object} [options]
   * @param {(harness: T, test: Test) => (void | Promise<void>)} [fn]
   */
  skip (testName, options, fn) {
    this._test(this.tape.skip, testName, options, fn)
  }

  /**
   * @param {(str: string, fn?: TestCase) => void} tapeFn
   * @param {string} testName
   * @param {object} [options]
   * @param {(harness: T, test: Test) => (void | Promise<void>)} [fn]
   */
  _test (tapeFn, testName, options, fn) {
    if (!fn && typeof options === 'function') {
      fn = /** @type {(h: T, test: Test) => void} */ (options)
      options = {}
    }

    if (!fn) {
      return tapeFn(testName)
    }
    const testFn = fn

    tapeFn(testName, (assert) => {
      this._onAssert(assert, options || {}, testFn)
    })
  }

  /**
   * @param {Test} assert
   * @param {object} options
   * @param {(harness: T, test: Test) => (void | Promise<void>)} fn
   */
  _onAssert (assert, options, fn) {
    const _end = assert.end
    let onlyOnce = false
    assert.end = asyncEnd

    const _plan = assert.plan
    assert.plan = planFail

    Reflect.set(options, 'assert', assert)
    var harness = new this.Harness(options)
    var ret = harness.bootstrap(onHarness)
    if (ret && ret.then) {
      ret.then(function success () {
        process.nextTick(onHarness)
      }, function fail (promiseError) {
        process.nextTick(onHarness, promiseError)
      })
    }

    /**
     * @param {Error} [err]
     */
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
          var ret = harness.close((err2) => {
            if (err2) {
              console.error('TestHarness.close() has an err', {
                error: err2
              })
            }

            process.nextTick(() => {
              throw promiseError
            })
          })
          if (ret && ret.then) {
            ret.then(() => {
              process.nextTick(() => {
                throw promiseError
              })
            }, (/** @type {Error} */ _failure) => {
              console.error('TestHarness.close() has an err', {
                error: _failure
              })

              process.nextTick(() => {
                throw promiseError
              })
            })
          }
        })
      }
    }

    /**
     * @param {number} count
     */
    function planFail (count) {
      const e = new Error('temporary message')
      const errorStack = e.stack || ''
      const errorLines = errorStack.split('\n')

      const caller = errorLines[2]

      // TAP: call through because plan is called internally
      if (/node_modules[/?][\\?\\?]?tap/.test(caller)) {
        return _plan.call(assert, count)
      }

      throw new Error('tape-harness: t.plan() is not supported')
    }

    /**
     * @param {Error} [err]
     */
    function asyncEnd (err) {
      if (onlyOnce) {
        return _end.call(assert, err)
      }
      onlyOnce = true

      if (err) {
        assert.ifError(err)
      }

      var ret = harness.close((err2) => {
        onEnd(err2, err)
      })
      if (ret && ret.then) {
        ret.then(() => {
          process.nextTick(onEnd)
        }, (/** @type {Error} */ promiseError) => {
          process.nextTick(onEnd, promiseError, err)
        })
      }
    }

    /**
     * @param {Error} [err2]
     * @param {Error} [err]
     */
    function onEnd (err2, err) {
      if (err2) {
        assert.ifError(err2)
      }

      _end.call(assert, err || err2)
    }
  }
}
