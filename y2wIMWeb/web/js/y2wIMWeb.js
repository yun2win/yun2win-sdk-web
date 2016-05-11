/*!
 * async
 * https://github.com/caolan/async
 *
 * Copyright 2010-2014 Caolan McMahon
 * Released under the MIT license
 */
/*jshint onevar: false, indent:4 */
/*global setImmediate: false, setTimeout: false, console: false */
(function () {

    var async = {};

    // global on the server, window in the browser
    var root, previous_async;

    root = this;
    if (root != null) {
        previous_async = root.async;
    }

    async.noConflict = function () {
        root.async = previous_async;
        return async;
    };

    function only_once(fn) {
        var called = false;
        return function() {
            if (called) throw new Error("Callback was already called.");
            called = true;
            fn.apply(root, arguments);
        }
    }

    //// cross-browser compatiblity functions ////

    var _toString = Object.prototype.toString;

    var _isArray = Array.isArray || function (obj) {
            return _toString.call(obj) === '[object Array]';
        };

    var _each = function (arr, iterator) {
        for (var i = 0; i < arr.length; i += 1) {
            iterator(arr[i], i, arr);
        }
    };

    var _map = function (arr, iterator) {
        if (arr.map) {
            return arr.map(iterator);
        }
        var results = [];
        _each(arr, function (x, i, a) {
            results.push(iterator(x, i, a));
        });
        return results;
    };

    var _reduce = function (arr, iterator, memo) {
        if (arr.reduce) {
            return arr.reduce(iterator, memo);
        }
        _each(arr, function (x, i, a) {
            memo = iterator(memo, x, i, a);
        });
        return memo;
    };

    var _keys = function (obj) {
        if (Object.keys) {
            return Object.keys(obj);
        }
        var keys = [];
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                keys.push(k);
            }
        }
        return keys;
    };

    //// exported async module functions ////

    //// nextTick implementation with browser-compatible fallback ////
    if (typeof process === 'undefined' || !(process.nextTick)) {
        if (typeof setImmediate === 'function') {
            async.nextTick = function (fn) {
                // not a direct alias for IE10 compatibility
                setImmediate(fn);
            };
            async.setImmediate = async.nextTick;
        }
        else {
            async.nextTick = function (fn) {
                setTimeout(fn, 0);
            };
            async.setImmediate = async.nextTick;
        }
    }
    else {
        async.nextTick = process.nextTick;
        if (typeof setImmediate !== 'undefined') {
            async.setImmediate = function (fn) {
                // not a direct alias for IE10 compatibility
                setImmediate(fn);
            };
        }
        else {
            async.setImmediate = async.nextTick;
        }
    }

    async.each = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        _each(arr, function (x) {
            iterator(x, only_once(done) );
        });
        function done(err) {
            if (err) {
                callback(err);
                callback = function () {};
            }
            else {
                completed += 1;
                if (completed >= arr.length) {
                    callback();
                }
            }
        }
    };
    async.forEach = async.each;

    async.eachSeries = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        var iterate = function () {
            iterator(arr[completed], function (err) {
                if (err) {
                    callback(err);
                    callback = function () {};
                }
                else {
                    completed += 1;
                    if (completed >= arr.length) {
                        callback();
                    }
                    else {
                        iterate();
                    }
                }
            });
        };
        iterate();
    };
    async.forEachSeries = async.eachSeries;

    async.eachLimit = function (arr, limit, iterator, callback) {
        var fn = _eachLimit(limit);
        fn.apply(null, [arr, iterator, callback]);
    };
    async.forEachLimit = async.eachLimit;

    var _eachLimit = function (limit) {

        return function (arr, iterator, callback) {
            callback = callback || function () {};
            if (!arr.length || limit <= 0) {
                return callback();
            }
            var completed = 0;
            var started = 0;
            var running = 0;

            (function replenish () {
                if (completed >= arr.length) {
                    return callback();
                }

                while (running < limit && started < arr.length) {
                    started += 1;
                    running += 1;
                    iterator(arr[started - 1], function (err) {
                        if (err) {
                            callback(err);
                            callback = function () {};
                        }
                        else {
                            completed += 1;
                            running -= 1;
                            if (completed >= arr.length) {
                                callback();
                            }
                            else {
                                replenish();
                            }
                        }
                    });
                }
            })();
        };
    };


    var doParallel = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.each].concat(args));
        };
    };
    var doParallelLimit = function(limit, fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [_eachLimit(limit)].concat(args));
        };
    };
    var doSeries = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.eachSeries].concat(args));
        };
    };


    var _asyncMap = function (eachfn, arr, iterator, callback) {
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        if (!callback) {
            eachfn(arr, function (x, callback) {
                iterator(x.value, function (err) {
                    callback(err);
                });
            });
        } else {
            var results = [];
            eachfn(arr, function (x, callback) {
                iterator(x.value, function (err, v) {
                    results[x.index] = v;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };
    async.map = doParallel(_asyncMap);
    async.mapSeries = doSeries(_asyncMap);
    async.mapLimit = function (arr, limit, iterator, callback) {
        return _mapLimit(limit)(arr, iterator, callback);
    };

    var _mapLimit = function(limit) {
        return doParallelLimit(limit, _asyncMap);
    };

    // reduce only has a series version, as doing reduce in parallel won't
    // work in many situations.
    async.reduce = function (arr, memo, iterator, callback) {
        async.eachSeries(arr, function (x, callback) {
            iterator(memo, x, function (err, v) {
                memo = v;
                callback(err);
            });
        }, function (err) {
            callback(err, memo);
        });
    };
    // inject alias
    async.inject = async.reduce;
    // foldl alias
    async.foldl = async.reduce;

    async.reduceRight = function (arr, memo, iterator, callback) {
        var reversed = _map(arr, function (x) {
            return x;
        }).reverse();
        async.reduce(reversed, memo, iterator, callback);
    };
    // foldr alias
    async.foldr = async.reduceRight;

    var _filter = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.filter = doParallel(_filter);
    async.filterSeries = doSeries(_filter);
    // select alias
    async.select = async.filter;
    async.selectSeries = async.filterSeries;

    var _reject = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (!v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.reject = doParallel(_reject);
    async.rejectSeries = doSeries(_reject);

    var _detect = function (eachfn, arr, iterator, main_callback) {
        eachfn(arr, function (x, callback) {
            iterator(x, function (result) {
                if (result) {
                    main_callback(x);
                    main_callback = function () {};
                }
                else {
                    callback();
                }
            });
        }, function (err) {
            main_callback();
        });
    };
    async.detect = doParallel(_detect);
    async.detectSeries = doSeries(_detect);

    async.some = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (v) {
                    main_callback(true);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(false);
        });
    };
    // any alias
    async.any = async.some;

    async.every = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (!v) {
                    main_callback(false);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(true);
        });
    };
    // all alias
    async.all = async.every;

    async.sortBy = function (arr, iterator, callback) {
        async.map(arr, function (x, callback) {
            iterator(x, function (err, criteria) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, {value: x, criteria: criteria});
                }
            });
        }, function (err, results) {
            if (err) {
                return callback(err);
            }
            else {
                var fn = function (left, right) {
                    var a = left.criteria, b = right.criteria;
                    return a < b ? -1 : a > b ? 1 : 0;
                };
                callback(null, _map(results.sort(fn), function (x) {
                    return x.value;
                }));
            }
        });
    };

    async.auto = function (tasks, callback) {
        callback = callback || function () {};
        var keys = _keys(tasks);
        var remainingTasks = keys.length
        if (!remainingTasks) {
            return callback();
        }

        var results = {};

        var listeners = [];
        var addListener = function (fn) {
            listeners.unshift(fn);
        };
        var removeListener = function (fn) {
            for (var i = 0; i < listeners.length; i += 1) {
                if (listeners[i] === fn) {
                    listeners.splice(i, 1);
                    return;
                }
            }
        };
        var taskComplete = function () {
            remainingTasks--
            _each(listeners.slice(0), function (fn) {
                fn();
            });
        };

        addListener(function () {
            if (!remainingTasks) {
                var theCallback = callback;
                // prevent final callback from calling itself if it errors
                callback = function () {};

                theCallback(null, results);
            }
        });

        _each(keys, function (k) {
            var task = _isArray(tasks[k]) ? tasks[k]: [tasks[k]];
            var taskCallback = function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (args.length <= 1) {
                    args = args[0];
                }
                if (err) {
                    var safeResults = {};
                    _each(_keys(results), function(rkey) {
                        safeResults[rkey] = results[rkey];
                    });
                    safeResults[k] = args;
                    callback(err, safeResults);
                    // stop subsequent errors hitting callback multiple times
                    callback = function () {};
                }
                else {
                    results[k] = args;
                    async.setImmediate(taskComplete);
                }
            };
            var requires = task.slice(0, Math.abs(task.length - 1)) || [];
            var ready = function () {
                return _reduce(requires, function (a, x) {
                        return (a && results.hasOwnProperty(x));
                    }, true) && !results.hasOwnProperty(k);
            };
            if (ready()) {
                task[task.length - 1](taskCallback, results);
            }
            else {
                var listener = function () {
                    if (ready()) {
                        removeListener(listener);
                        task[task.length - 1](taskCallback, results);
                    }
                };
                addListener(listener);
            }
        });
    };

    async.retry = function(times, task, callback) {
        var DEFAULT_TIMES = 5;
        var attempts = [];
        // Use defaults if times not passed
        if (typeof times === 'function') {
            callback = task;
            task = times;
            times = DEFAULT_TIMES;
        }
        // Make sure times is a number
        times = parseInt(times, 10) || DEFAULT_TIMES;
        var wrappedTask = function(wrappedCallback, wrappedResults) {
            var retryAttempt = function(task, finalAttempt) {
                return function(seriesCallback) {
                    task(function(err, result){
                        seriesCallback(!err || finalAttempt, {err: err, result: result});
                    }, wrappedResults);
                };
            };
            while (times) {
                attempts.push(retryAttempt(task, !(times-=1)));
            }
            async.series(attempts, function(done, data){
                data = data[data.length - 1];
                (wrappedCallback || callback)(data.err, data.result);
            });
        }
        // If a callback is passed, run this as a controll flow
        return callback ? wrappedTask() : wrappedTask
    };

    async.waterfall = function (tasks, callback) {
        callback = callback || function () {};
        if (!_isArray(tasks)) {
            var err = new Error('First argument to waterfall must be an array of functions');
            return callback(err);
        }
        if (!tasks.length) {
            return callback();
        }
        var wrapIterator = function (iterator) {
            return function (err) {
                if (err) {
                    callback.apply(null, arguments);
                    callback = function () {};
                }
                else {
                    var args = Array.prototype.slice.call(arguments, 1);
                    var next = iterator.next();
                    if (next) {
                        args.push(wrapIterator(next));
                    }
                    else {
                        args.push(callback);
                    }
                    async.setImmediate(function () {
                        iterator.apply(null, args);
                    });
                }
            };
        };
        wrapIterator(async.iterator(tasks))();
    };

    var _parallel = function(eachfn, tasks, callback) {
        callback = callback || function () {};
        if (_isArray(tasks)) {
            eachfn.map(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            eachfn.each(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.parallel = function (tasks, callback) {
        _parallel({ map: async.map, each: async.each }, tasks, callback);
    };

    async.parallelLimit = function(tasks, limit, callback) {
        _parallel({ map: _mapLimit(limit), each: _eachLimit(limit) }, tasks, callback);
    };

    async.series = function (tasks, callback) {
        callback = callback || function () {};
        if (_isArray(tasks)) {
            async.mapSeries(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            async.eachSeries(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.iterator = function (tasks) {
        var makeCallback = function (index) {
            var fn = function () {
                if (tasks.length) {
                    tasks[index].apply(null, arguments);
                }
                return fn.next();
            };
            fn.next = function () {
                return (index < tasks.length - 1) ? makeCallback(index + 1): null;
            };
            return fn;
        };
        return makeCallback(0);
    };

    async.apply = function (fn) {
        var args = Array.prototype.slice.call(arguments, 1);
        return function () {
            return fn.apply(
                null, args.concat(Array.prototype.slice.call(arguments))
            );
        };
    };

    var _concat = function (eachfn, arr, fn, callback) {
        var r = [];
        eachfn(arr, function (x, cb) {
            fn(x, function (err, y) {
                r = r.concat(y || []);
                cb(err);
            });
        }, function (err) {
            callback(err, r);
        });
    };
    async.concat = doParallel(_concat);
    async.concatSeries = doSeries(_concat);

    async.whilst = function (test, iterator, callback) {
        if (test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.whilst(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doWhilst = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            var args = Array.prototype.slice.call(arguments, 1);
            if (test.apply(null, args)) {
                async.doWhilst(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.until = function (test, iterator, callback) {
        if (!test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.until(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doUntil = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            var args = Array.prototype.slice.call(arguments, 1);
            if (!test.apply(null, args)) {
                async.doUntil(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.queue = function (worker, concurrency) {
        if (concurrency === undefined) {
            concurrency = 1;
        }
        function _insert(q, data, pos, callback) {
            if (!q.started){
                q.started = true;
            }
            if (!_isArray(data)) {
                data = [data];
            }
            if(data.length == 0) {
                // call drain immediately if there are no tasks
                return async.setImmediate(function() {
                    if (q.drain) {
                        q.drain();
                    }
                });
            }
            _each(data, function(task) {
                var item = {
                    data: task,
                    callback: typeof callback === 'function' ? callback : null
                };

                if (pos) {
                    q.tasks.unshift(item);
                } else {
                    q.tasks.push(item);
                }

                if (q.saturated && q.tasks.length === q.concurrency) {
                    q.saturated();
                }
                async.setImmediate(q.process);
            });
        }

        var workers = 0;
        var q = {
            tasks: [],
            concurrency: concurrency,
            saturated: null,
            empty: null,
            drain: null,
            started: false,
            paused: false,
            push: function (data, callback) {
                _insert(q, data, false, callback);
            },
            kill: function () {
                q.drain = null;
                q.tasks = [];
            },
            unshift: function (data, callback) {
                _insert(q, data, true, callback);
            },
            process: function () {
                if (!q.paused && workers < q.concurrency && q.tasks.length) {
                    var task = q.tasks.shift();
                    if (q.empty && q.tasks.length === 0) {
                        q.empty();
                    }
                    workers += 1;
                    var next = function () {
                        workers -= 1;
                        if (task.callback) {
                            task.callback.apply(task, arguments);
                        }
                        if (q.drain && q.tasks.length + workers === 0) {
                            q.drain();
                        }
                        q.process();
                    };
                    var cb = only_once(next);
                    worker(task.data, cb);
                }
            },
            length: function () {
                return q.tasks.length;
            },
            running: function () {
                return workers;
            },
            idle: function() {
                return q.tasks.length + workers === 0;
            },
            pause: function () {
                if (q.paused === true) { return; }
                q.paused = true;
            },
            resume: function () {
                if (q.paused === false) { return; }
                q.paused = false;
                // Need to call q.process once per concurrent
                // worker to preserve full concurrency after pause
                for (var w = 1; w <= q.concurrency; w++) {
                    async.setImmediate(q.process);
                }
            }
        };
        return q;
    };

    async.priorityQueue = function (worker, concurrency) {

        function _compareTasks(a, b){
            return a.priority - b.priority;
        };

        function _binarySearch(sequence, item, compare) {
            var beg = -1,
                end = sequence.length - 1;
            while (beg < end) {
                var mid = beg + ((end - beg + 1) >>> 1);
                if (compare(item, sequence[mid]) >= 0) {
                    beg = mid;
                } else {
                    end = mid - 1;
                }
            }
            return beg;
        }

        function _insert(q, data, priority, callback) {
            if (!q.started){
                q.started = true;
            }
            if (!_isArray(data)) {
                data = [data];
            }
            if(data.length == 0) {
                // call drain immediately if there are no tasks
                return async.setImmediate(function() {
                    if (q.drain) {
                        q.drain();
                    }
                });
            }
            _each(data, function(task) {
                var item = {
                    data: task,
                    priority: priority,
                    callback: typeof callback === 'function' ? callback : null
                };

                q.tasks.splice(_binarySearch(q.tasks, item, _compareTasks) + 1, 0, item);

                if (q.saturated && q.tasks.length === q.concurrency) {
                    q.saturated();
                }
                async.setImmediate(q.process);
            });
        }

        // Start with a normal queue
        var q = async.queue(worker, concurrency);

        // Override push to accept second parameter representing priority
        q.push = function (data, priority, callback) {
            _insert(q, data, priority, callback);
        };

        // Remove unshift function
        delete q.unshift;

        return q;
    };

    async.cargo = function (worker, payload) {
        var working     = false,
            tasks       = [];

        var cargo = {
            tasks: tasks,
            payload: payload,
            saturated: null,
            empty: null,
            drain: null,
            drained: true,
            push: function (data, callback) {
                if (!_isArray(data)) {
                    data = [data];
                }
                _each(data, function(task) {
                    tasks.push({
                        data: task,
                        callback: typeof callback === 'function' ? callback : null
                    });
                    cargo.drained = false;
                    if (cargo.saturated && tasks.length === payload) {
                        cargo.saturated();
                    }
                });
                async.setImmediate(cargo.process);
            },
            process: function process() {
                if (working) return;
                if (tasks.length === 0) {
                    if(cargo.drain && !cargo.drained) cargo.drain();
                    cargo.drained = true;
                    return;
                }

                var ts = typeof payload === 'number'
                    ? tasks.splice(0, payload)
                    : tasks.splice(0, tasks.length);

                var ds = _map(ts, function (task) {
                    return task.data;
                });

                if(cargo.empty) cargo.empty();
                working = true;
                worker(ds, function () {
                    working = false;

                    var args = arguments;
                    _each(ts, function (data) {
                        if (data.callback) {
                            data.callback.apply(null, args);
                        }
                    });

                    process();
                });
            },
            length: function () {
                return tasks.length;
            },
            running: function () {
                return working;
            }
        };
        return cargo;
    };

    var _console_fn = function (name) {
        return function (fn) {
            var args = Array.prototype.slice.call(arguments, 1);
            fn.apply(null, args.concat([function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (typeof console !== 'undefined') {
                    if (err) {
                        if (console.error) {
                            console.error(err);
                        }
                    }
                    else if (console[name]) {
                        _each(args, function (x) {
                            console[name](x);
                        });
                    }
                }
            }]));
        };
    };
    async.log = _console_fn('log');
    async.dir = _console_fn('dir');
    /*async.info = _console_fn('info');
     async.warn = _console_fn('warn');
     async.error = _console_fn('error');*/

    async.memoize = function (fn, hasher) {
        var memo = {};
        var queues = {};
        hasher = hasher || function (x) {
            return x;
        };
        var memoized = function () {
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            var key = hasher.apply(null, args);
            if (key in memo) {
                async.nextTick(function () {
                    callback.apply(null, memo[key]);
                });
            }
            else if (key in queues) {
                queues[key].push(callback);
            }
            else {
                queues[key] = [callback];
                fn.apply(null, args.concat([function () {
                    memo[key] = arguments;
                    var q = queues[key];
                    delete queues[key];
                    for (var i = 0, l = q.length; i < l; i++) {
                        q[i].apply(null, arguments);
                    }
                }]));
            }
        };
        memoized.memo = memo;
        memoized.unmemoized = fn;
        return memoized;
    };

    async.unmemoize = function (fn) {
        return function () {
            return (fn.unmemoized || fn).apply(null, arguments);
        };
    };

    async.times = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.map(counter, iterator, callback);
    };

    async.timesSeries = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.mapSeries(counter, iterator, callback);
    };

    async.seq = function (/* functions... */) {
        var fns = arguments;
        return function () {
            var that = this;
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            async.reduce(fns, args, function (newargs, fn, cb) {
                    fn.apply(that, newargs.concat([function () {
                        var err = arguments[0];
                        var nextargs = Array.prototype.slice.call(arguments, 1);
                        cb(err, nextargs);
                    }]))
                },
                function (err, results) {
                    callback.apply(that, [err].concat(results));
                });
        };
    };

    async.compose = function (/* functions... */) {
        return async.seq.apply(null, Array.prototype.reverse.call(arguments));
    };

    var _applyEach = function (eachfn, fns /*args...*/) {
        var go = function () {
            var that = this;
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            return eachfn(fns, function (fn, cb) {
                    fn.apply(that, args.concat([cb]));
                },
                callback);
        };
        if (arguments.length > 2) {
            var args = Array.prototype.slice.call(arguments, 2);
            return go.apply(this, args);
        }
        else {
            return go;
        }
    };
    async.applyEach = doParallel(_applyEach);
    async.applyEachSeries = doSeries(_applyEach);

    async.forever = function (fn, callback) {
        function next(err) {
            if (err) {
                if (callback) {
                    return callback(err);
                }
                throw err;
            }
            fn(next);
        }
        next();
    };

    // Node.js
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = async;
    }
    // AMD / RequireJS
    else if (typeof define !== 'undefined' && define.amd) {
        define([], function () {
            return async;
        });
    }
    // included directly via <script> tag
    else {
        root.async = async;
    }

}());

var avatarRandomBGColorCount = 5;
var defaultContactImageUrl = 'images/contact_avatar.png';
var defaultGroupImageUrl = 'images/group_avatar.png';
var addEvent = function(node, type, callback){
    if(window.addEventListener){
        node.addEventListener(type, callback, false);
    }else{
        node.attachEvent("on" + type, callback);
    }
}
/**
 * 时间戳转化为日期（用于消息列表）
 * @return {string} 转化后的日期
 */
var transTime = (function(){
    var getDayPoint = function(time){
        time.setMinutes(0);
        time.setSeconds(0);
        time.setMilliseconds(0);
        time.setHours(0);
        var today = time.getTime();
        time.setMonth(1);
        time.setDate(1);
        var yearDay = time.getTime();
        return [today,yearDay];
    }
    return function(time){
        var check = getDayPoint(new Date());
        if (time>=check[0]){
            return dateFormat(time,"HH:mm")
        }else if(time<check[0]&&time>=check[1]){
            return dateFormat(time,"MM-dd HH:mm")
        }else{
            return dateFormat(time,"yyyy-MM-dd HH:mm")
        }
    }
})();
/**
 * 时间戳转化为日期(用于左边会话面板)
 * @return {string} 转化后的日期
 */
var transTime2 = (function(){
    var getDayPoint = function(time){
        time.setMinutes(0);
        time.setSeconds(0);
        time.setMilliseconds(0);
        time.setHours(0);
        var today = time.getTime();
        time.setMonth(1);
        time.setDate(1);
        var yearDay = time.getTime();
        return [today,yearDay];
    }
    return function(time){
        if(typeof time === 'string')
            time = new Date(time).getTime();
        var check = getDayPoint(new Date());
        if (time>=check[0]){
            return dateFormat(time,"HH:mm")
        }else if(time>=check[0]-60*1000*60*24){
            return "昨天";
        }else if(time>=(check[0]-2*60*1000*60*24)){
            return "前天";
        }else if(time>=(check[0]-7*60*1000*60*24)){
            return "星期"+dateFormat(time,"w");
        }else if(time>=check[1]){
            return dateFormat(time,"M/d")
        }else{
            return dateFormat(time,"yy/M/d")
        }
    }
})();
/**
 * 日期格式化
 * @return string
 */
var dateFormat = (function(){
    var _map = {i:!0,r:/\byyyy|yy|MM|cM|eM|M|dd|d|HH|H|mm|ms|ss|m|s|w|ct|et\b/g},
        _12cc = ['上午','下午'],
        _12ec = ['A.M.','P.M.'],
        _week = ['日','一','二','三','四','五','六'],
        _cmon = ['一','二','三','四','五','六','七','八','九','十','十一','十二'],
        _emon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sept','Oct','Nov','Dec'];
    var _fmtnmb = function(_number){
        _number = parseInt(_number)||0;
        return (_number<10?'0':'')+_number;
    };
    var _fmtclc = function(_hour){
        return _hour<12?0:1;
    };
    return function(_time,_format,_12time){
        if (!_time||!_format)
            return '';
        _time = new Date(_time);
        _map.yyyy = _time.getFullYear();
        _map.yy   = (''+_map.yyyy).substr(2);
        _map.M    = _time.getMonth()+1;
        _map.MM   = _fmtnmb(_map.M);
        _map.eM   = _emon[_map.M-1];
        _map.cM   = _cmon[_map.M-1];
        _map.d    = _time.getDate();
        _map.dd   = _fmtnmb(_map.d);
        _map.H    = _time.getHours();
        _map.HH   = _fmtnmb(_map.H);
        _map.m    = _time.getMinutes();
        _map.mm   = _fmtnmb(_map.m);
        _map.s    = _time.getSeconds();
        _map.ss   = _fmtnmb(_map.s);
        _map.ms   = _time.getMilliseconds();
        _map.w    = _week[_time.getDay()];
        var _cc   = _fmtclc(_map.H);
        _map.ct   = _12cc[_cc];
        _map.et   = _12ec[_cc];
        if (!!_12time){
            _map.H = _map.H%12;
        }
        return _$encode(_map,_format);
    };
})();
var _$encode = function(_map,_content){
    _content = ''+_content;
    if (!_map||!_content){
        return _content||'';
    }
    return _content.replace(_map.r,function($1){
        var _result = _map[!_map.i?$1.toLowerCase():$1];
        return _result!=null?_result:$1;
    });
};
var _$escape = (function(){
    var _reg = /<br\/?>$/,
        _map = {
            r:/\<|\>|\&|\r|\n|\s|\'|\"/g,
            '<':'&lt;','>':'&gt;','&':'&amp;',' ':'&nbsp;',
            '"':'&quot;',"'":'&#39;','\n':'<br/>','\r':''
        };
    return function(_content){
        _content = _$encode(_map,_content);
        return _content.replace(_reg,'<br/><br/>');
    };
})();
//数组功能扩展
Array.prototype.each = function(fn){
    fn = fn || Function.K;
    var a = [];
    var args = Array.prototype.slice.call(arguments, 1);
    for(var i = 0; i < this.length; i++){
        var res = fn.apply(this,[this[i],i].concat(args));
        if(res != null) a.push(res);
    }
    return a;
};

//数组是否包含指定元素
Array.prototype.contains = function(suArr){
    for(var i = 0; i < this.length; i ++){
        if(this[i] == suArr){
            return true;
        }
    }
    return false;
};
//不重复元素构成的数组
Array.prototype.uniquelize = function(){
    var ra = new Array();
    for(var i = 0; i < this.length; i ++){
        if(!ra.contains(this[i])){
            ra.push(this[i]);
        }
    }
    return ra;
};
//两个数组的补集
Array.complement = function(a, b){
    return Array.minus(Array.union(a, b),Array.intersect(a, b));
};
//两个数组的交集
Array.intersect = function(a, b){
    return a.uniquelize().each(function(o){return b.contains(o) ? o : null});
};
//两个数组的差集
Array.minus = function(a, b){
    return a.uniquelize().each(function(o){return b.contains(o) ? null : o});
};
//两个数组并集
Array.union = function(a, b){
    return a.concat(b).uniquelize();
};
var guid = function() {
    var S4 = function () {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    };
    return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
}
function config(){

}

config.baseUrl = 'http://112.74.210.208:8080/v1/';
//config.baseUrl = 'http://192.168.0.104:8080/v1/';
config.y2wAutorizeUrl = 'http://console.yun2win.com/';

function nop() {}

var globalMinDate = new Date(2000, 0, 1).getTime();
var globalMaxDate = new Date(3000, 0, 1).getTime();
var globalMinSyncDate = new Date(2000, 0, 2).getTime();

function guid() {
    var S4 = function () {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    };
    return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
}

function baseRequest(){

}

baseRequest.get = function(url, ts, token, cb){
    if(!cb)
        cb = nop;
    $.ajax({
        url: config.baseUrl + url,
        type: 'GET',
        dataType: 'json',
        contentType: 'application/x-www-form-urlencoded',
        beforeSend: function (req) {
            if(ts)
                req.setRequestHeader('Client-Sync-Time', ts);
            if(token)
                req.setRequestHeader('Authorization', 'Bearer ' + token);
        },
        success: function(data) {
            cb(null, data);
        },
        error: function(e) {
            if(e.status == 401){
                alert('您登录的信息已过期,请重新登录!');
                y2w.logout();
                return;
            }
            cb(e);
        }
    });
}

baseRequest.post = function(url, params, token, cb){
    if(!cb)
        cb = nop;
    $.ajax({
        url: config.baseUrl + url,
        type: 'POST',
        data: params,
        dataType: 'json',
        contentType: 'application/x-www-form-urlencoded',
        beforeSend: function (req) {
            if(token)
                req.setRequestHeader('Authorization', 'Bearer ' + token);
        },
        success: function(data) {
            cb(null, data);
        },
        error: function(e) {
            if(e.status == 401){
                alert('您登录的信息已过期,请重新登录!');
                y2w.logout();
                return;
            }
            cb(e);
        }
    });
}

baseRequest.delete = function(url, params, token, cb){
    if(!cb)
        cb = nop;
    $.ajax({
        url: config.baseUrl + url,
        type: 'DELETE',
        data: params,
        dataType: 'json',
        contentType: 'application/x-www-form-urlencoded',
        beforeSend: function (req) {
            if(token)
                req.setRequestHeader('Authorization', 'Bearer ' + token);
        },
        success: function(data) {
            cb(null, data);
        },
        error: function(e) {
            if(e.status == 401){
                alert('您登录的信息已过期,请重新登录!');
                y2w.logout();
                return;
            }
            cb(e);
        }
    });
}

baseRequest.put = function(url, params, token, cb){
    if(!cb)
        cb = nop;
    $.ajax({
        url: config.baseUrl + url,
        type: 'PUT',
        data: params,
        dataType: 'json',
        contentType: 'application/x-www-form-urlencoded',
        beforeSend: function (req) {
            if(token)
                req.setRequestHeader('Authorization', 'Bearer ' + token);
        },
        success: function(data) {
            cb(null, data);
        },
        error: function(e) {
            if(e.status == 401){
                alert('您登录的信息已过期,请重新登录!');
                y2w.logout();
                return;
            }
            cb(e);
        }
    });
}

baseRequest.uploadBase64Image = function(url, fileName, imageData, token, cb){
    if(!cb)
        cb = nop;
    var boundaryKey = Math.random().toString(16);
    var xhr = new XMLHttpRequest();
    xhr.open("POST", config.baseUrl + url);// + '?fileName=' + fileName);
    xhr.setRequestHeader('Authorization', 'Bearer ' + token);
    xhr.overrideMimeType("application/octet-stream");
    xhr.setRequestHeader('Content-Type', 'multipart/form-data; boundary='+boundaryKey+'');
    var data_0 = '--' + boundaryKey + '\r\n';
    data_0 += 'Content-Type: image/jpg\r\n';
    data_0 += 'Content-Disposition: form-data; name="pic"; filename="' + fileName + '"\r\n';
    data_0 += 'Content-Transfer-Encoding: binary\r\n\r\n';
    var bytes0 = transTextToBytes(data_0);
    var bytes1 = transBase64ToBytes(imageData);
    var data_2  = '\r\n--' + boundaryKey + '--';
    var bytes2 = transTextToBytes(data_2);

    var bytes = new Uint8Array(bytes0.length + bytes1.length + bytes2.length);
    for (var i = 0; i < bytes0.length; i++)
        bytes[i] = bytes0[i];
    for (var i = 0; i < bytes1.length; i++)
        bytes[bytes0.length + i] = bytes1[i];
    for (var i = 0; i < bytes2.length; i++)
        bytes[bytes0.length + bytes1.length + i] = bytes2[i];

    xhr.send(bytes.buffer);
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
            if (xhr.status == 200) {
                cb(null, JSON.parse(xhr.responseText));
            }
            else if(xhr.status == 401){
                alert('您登录的信息已过期,请重新登录!');
                y2w.logout();
                return;
            }
            else{
                cb(xhr.responseText);
            }
        }
    }
}

function transTextToBytes(text){
    var data = new ArrayBuffer(text.length);
    var ui8a = new Uint8Array(data, 0);
    for (var i = 0; i < text.length; i++)
        ui8a[i] = (text.charCodeAt(i) & 0xff);
    return ui8a;
}

function transBase64ToBytes(text){
    var index = text.indexOf(';base64,');
    var foo = window.atob(text.substring(index + 8));
    var ui8a = new Uint8Array(foo.length);
    for (var i = 0; i < foo.length; i++)
        ui8a[i] = foo.charCodeAt(i);
    return ui8a;
}

function y2wAuthorizeRequest(){

}

y2wAuthorizeRequest.post = function(url, params, token, cb){
    if(!cb)
        cb = nop;
    $.ajax({
        url: config.y2wAutorizeUrl + url,
        type: 'POST',
        data: params,
        dataType: 'json',
        contentType: 'application/x-www-form-urlencoded',
        beforeSend: function (req) {
            if(token)
                req.setRequestHeader('Authorization', 'Bearer ' + token);
        },
        success: function(data) {
            cb(null, data);
        },
        error: function(e) {
            if(e.status == 400){
                //appKey或secret不正确，重新登录
                alert('您登录的信息已过期,请重新登录!');
                y2w.logout();
                return;
            }
            cb(e);
        }
    });
}


function swap(items, firstIndex, secondIndex){
    var temp = items[firstIndex];
    items[firstIndex] = items[secondIndex];
    items[secondIndex] = temp;
}
function partition(items, attr, left, right, desc) {
    var pivot   = items[Math.floor((right + left) / 2)],
        i       = left,
        j       = right;
    while (i <= j) {
        if(desc){
            while (items[i][attr] > pivot[attr]) {
                i++;
            }
            while (items[j][attr] < pivot[attr]) {
                j--;
            }
        }
        else {
            while (items[i][attr] < pivot[attr]) {
                i++;
            }
            while (items[j][attr] > pivot[attr]) {
                j--;
            }
        }
        if (i <= j) {
            swap(items, i, j);
            i++;
            j--;
        }
    }
    return i;
}
function quickSortAlgo(items, attr, left, right, desc) {
    var index;
    if (items.length > 1) {
        index = partition(items, attr, left, right, desc);
        if (left < index - 1) {
            quickSortAlgo(items, attr, left, index - 1, desc);
        }
        if (index < right) {
            quickSortAlgo(items, attr, index, right, desc);
        }

    }
    return items;
}
function quickSort(items, attr, desc){
    return quickSortAlgo(items, attr, 0, items.length - 1, desc);
}
'use strict';

var Users = (function(){
    var _instance;

    function Singleton() {
        var _list;
        this.localStorage = usersLocalStorageSingleton.getInstance(this);
        this.remote = usersRemoteSingleton.getInstance(this);

        this.getCurrentUser = function(){
            if(this.localStorage.getCurrentUserId() == null)
                throw 'currentUserId is null, pls relogin!';
            if(!_list){
                _list = this.localStorage.getUsers(this.localStorage.getCurrentUserId());
                for(var k in _list){
                    _list[k] = new User(_list[k]);
                }
                var info = this.localStorage.getCurrentUserInfo();
                info.account = info.account || info.email;
                var user = new CurrentUser(info);
                _list[user.id] = user;
                user.init();
                this.localStorage.setUsers(_list);
            }
            return this.get(user.id);
        }
        this.get = function(id){
            return _list[id];
        }
        this.getUsers = function(){
            return _list;
        }
        this.create = function(id, name, account, avatarUrl){
            if(this.get(id))
                throw 'can not create the user, because the user is exist';
            else{
                var user = new User({
                    id: id,
                    name: name,
                    account: account,
                    avatarUrl: avatarUrl
                });
                _list[user.id] = user;
                this.localStorage.setUsers(_list);
                return user;
            }
        }
    }
    return{
        getInstance: function(){
            if(!_instance)
                _instance = new Singleton();
            return _instance;
        }
    }
})();

var usersLocalStorageSingleton = (function(){
    var _instance;

    function Singleton(users) {
        var _users = users;

        this.getCurrentUserId = function(){
            return localStorage.getItem('y2wIMCurrentUserId');
        }
        this.setCurrentUserId = function(userId){
            localStorage.setItem('y2wIMCurrentUserId', userId);
        }
        this.removeCurrentId = function(){
            localStorage.removeItem('y2wIMCurrentUserId')
        }
        this.getCurrentUserInfo = function(){
            return JSON.parse(localStorage.getItem(this.getCurrentUserId()));
        }
        this.setCurrentUserInfo = function(user){
            localStorage.setItem(user.id, JSON.stringify(user));
        }
        this.removeCurrentUserInfo = function(){
            delete currentUser.appKey;
            delete currentUser.secret;
            delete currentUser.token;
            delete currentUser.imToken;
            this.setUsers(_users.getUsers());
            localStorage.removeItem(currentUser.id);
        }
        this.getUsers = function(){
            var users = localStorage.getItem(this.getCurrentUserId() + '_users');
            if(!users)
                return {};
            return JSON.parse(users);
        }
        this.setUsers = function(users){
            localStorage.setItem(this.getCurrentUserId() + '_users', JSON.stringify(users));
        }
    }
    return{
        getInstance: function(users, list){
            if(!_instance)
                _instance = new Singleton(users, list);
            return _instance;
        }
    }
})();

var usersRemoteSingleton = (function(){
    var _instance;

    function Singleton(users) {
        var _users = users;
        this.register = function(account, password, name, cb){
            cb = cb || nop;
            var url = 'users/register';
            var params = {
                email: account,
                password:MD5(password),
                name: name
            };
            baseRequest.post(url, params, null, cb);
        }
        this.login = function(account, password, cb){
            cb = cb || nop;
            var url = 'users/login';
            var params = {
                email: account,
                password:MD5(password)
            };
            baseRequest.post(url, params, null, function(err, data){
                if(err){
                    cb(err);
                    return;
                }
                _users.localStorage.setCurrentUserId(data.id);
                _users.localStorage.setCurrentUserInfo(data);
                cb(null, data);
            });
        }
        this.search = function(account, token, cb){
            cb = cb || nop;
            var url = 'users?filter_term=' + account;
            baseRequest.get(url, null, currentUser.token, function(err, obj){
                if(err){
                    cb(err);
                    return;
                }
                if(obj.total_count){
                    var info = obj.entries[0];
                    var user = _users.get(info.id);
                    if(!user)
                        user = _users.create(info.id, info.name, info.email, info.avatarUrl);
                    cb(null, user);
                }
                else
                    cb(null, null);
            });
        };
    }
    return{
        getInstance: function(users){
            if(!_instance)
                _instance = new Singleton(users);
            return _instance;
        }
    }
})();

var User = function(obj){
    this.id = obj['id'];
    this.name = obj['name'];
    this.pinyin = obj['pinyin'];
    this.account = obj['account'] || obj['email'];
    this.avatarUrl = obj['avatarUrl'] || ' ';
    if(this.avatarUrl.indexOf('/images/default.jpg') >= 0)
        this.avatarUrl = ' ';
    this.role = obj['role'];
    this.jobTitle = obj['jobTitle'];
    this.phone = obj['phone'];
    this.address = obj['address'];
    this.status = obj['status'];
    this.createdAt = obj['createdAt'] || globalMinDate;
    this.updatedAt = obj['updatedAt'] || globalMinDate;
}
User.prototype.toJSON = function(){
    return {
        id: this.id,
        name: this.name,
        pinyin: this.pinyin,
        account: this.account,
        avatarUrl: this.avatarUrl,
        role: this.role,
        jobTitle: this.jobTitle,
        phone: this.phone,
        address: this.address,
        status: this.status,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
    }
}

User.prototype.getAvatarUrl = function(){
    if(this.avatarUrl && $.trim(this.avatarUrl) != '' && $.trim(this.avatarUrl) != '..')
        return config.baseUrl + this.avatarUrl + '?access_token=' + currentUser.token;
    return null;
}

var CurrentUser = function(obj){
    User.call(this, obj);
    this.appKey = obj['key'];
    this.secret = obj['secret'];
    this.token = obj['token'];
    this.imToken = obj['imToken'];
    this.userConversations = new UserConversations(this);
    this.contacts = new Contacts(this);
    this.sessions = new Sessions(this);
    this.userSessions = new UserSessions(this);
    this.attchments = new Attachments(this);
    this.remote = currentUserRemoteSingleton.getInstance(this);
    this.currentSession;
    this.y2wIMBridge;
}
CurrentUser.prototype = new User({});
CurrentUser.prototype.init = function(){
    this.userConversations.init();
    this.contacts.init();
    this.sessions.init();
    this.userSessions.init();
}
CurrentUser.prototype.logout = function(cb){
    try {
        this.y2wIMBridge.disconnect();
    }catch(e){}
    Users.getInstance().localStorage.removeCurrentUserInfo();
    Users.getInstance().localStorage.removeCurrentId();
    cb();
}
CurrentUser.prototype.toJSON = function(){
    return {
        id: this.id,
        name: this.name,
        pinyin: this.pinyin,
        account: this.account,
        avatarUrl: this.avatarUrl,
        role: this.role,
        jobTitle: this.jobTitle,
        phone: this.phone,
        address: this.address,
        status: this.status,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
        key: this.appKey,
        secret: this.secret,
        token: this.token,
        imToken: this.imToken
    }
}

CurrentUser.prototype.y2wIMInit = function(){
    var that = this;
    this.remote.syncIMToken(function(err){
        if(err){
            console.log(err);
            return;
        }
        that.y2wIMBridge = new y2wIMBridge(that);
    })
}

var currentUserRemoteSingleton = (function(){
    var _instance;

    function Singleton(user) {
        var _user = user;
        this.syncIMToken = function(cb){
            cb = cb || nop;
            var url = 'oauth/token';
            var params = {
                grant_type: 'client_credentials',
                client_id: _user.appKey,
                client_secret: _user.secret
            };
            y2wAuthorizeRequest.post(url, params, _user.token, function(err, data){
                if(err){
                    cb(err);
                    return;
                }
                _user.imToken = data.access_token;
                cb(null, _user.imToken);
            })
        }
        this.store = function(cb){
            cb = cb || nop;
            var url = 'users/' + _user.id;
            var params = {
                email: _user.account,
                name: _user.name,
                role: _user.role,
                jobTitle: _user.jobTitle,
                phone: _user.phone,
                address: _user.address,
                status: _user.status,
                avatarUrl: _user.avatarUrl
            };
            baseRequest.put(url, params, _user.token, function(err){
                if(err){
                    cb(err);
                    return;
                }
                Users.getInstance().localStorage.setCurrentUserInfo(_user);
                Users.getInstance().localStorage.setUsers(Users.getInstance().getUsers());
                cb(null);
            })
        }
    }
    return{
        getInstance: function(user){
            if(!_instance)
                _instance = new Singleton(user);
            return _instance;
        }
    }
})();
'use strict';

var UserConversations = function(user){
    var _list;
    var _localStorage = new userConversationsLocalStorage(this);
    this.user = user;
    this.updatedAt = globalMinDate;
    this.remote = new userConversationsRemote(this);

    this.init = function() {
        _list = _localStorage.getList(this.user.id + '_userConversations');
        for (var k in _list) {
            var userConversation = this.createUserConversation(_list[k]);
            _list[k] = userConversation;
            if(this.updatedAt < userConversation.updatedAt)
                this.updatedAt = userConversation.updatedAt;
        }
    }
    /**
     * 获取用户会话
     * @param type['p2p','group']:会话场景类型
     * @param targetId[user.id,session.id]会话目标Id
     * type=='p2p':targetId=user.id(对方用户);
     * type=='group':targetId=session.id(会话id)
     * @returns userConversation
     */
    this.get = function(type, targetId){
        return _list[type + '-' + targetId];
    }
    this.createUserConversation = function(obj){
        return new UserConversation(this, obj);
    }
    /**
     * 获取用户会话列表
     * @param type['p2p','group',undefined]
     * @returns [userConversation]
     */
    this.getUserConversations = function(type){
        var foo = [];
        for(var k in _list){
            if(!_list[k].isDelete && (!type || (type && _list[k].type == type)))
                foo.push(_list[k]);
        }
        return quickSort(foo, 'updatedAt', true);
    }
    this.addUserConversations = function(list){
        for(var i = 0; i < list.length; i++){
            var userConversation = this._add(list[i]);
            if(this.updatedAt < userConversation.updatedAt)
                this.updatedAt = parseInt(userConversation.updatedAt);
        }
        if(list.length > 0)
            _localStorage.setList(_list);
    }
    this._add = function(obj){
        var userConversation = _list[obj.type + '-' + obj.targetId];
        if(!userConversation)
            userConversation = this.createUserConversation(obj);
        else
            userConversation.update(obj);
        _list[userConversation.type + '-' + userConversation.targetId] = userConversation;
        return userConversation;
    }
    this.updateCache_List = function(){
        _localStorage.setList(_list);
    }
}
var userConversationsLocalStorage = function(userConversations){
    this.userConversations = userConversations;
}
userConversationsLocalStorage.prototype.getList = function(){
    var list = localStorage.getItem(this.userConversations.user.id + '_userConversations');
    if(!list)
        return {};
    return JSON.parse(list);
}
userConversationsLocalStorage.prototype.setList = function(list){
    localStorage.setItem(this.userConversations.user.id + '_userConversations', JSON.stringify(list));
}
var userConversationsRemote = function(userConversations) {
    this.userConversations = userConversations;
}
userConversationsRemote.prototype.sync = function(cb) {
    cb = cb || nop;
    var that = this;
    var url = 'users/' + that.userConversations.user.id + '/userConversations';
    baseRequest.get(url, that.userConversations.updatedAt, that.userConversations.user.token, function(err, data){
        if(err){
            cb(err);
            return;
        }
        that.userConversations.addUserConversations(data.entries);
        cb(null, data.entries.length);
    })
}
/**
 * 修改用户会话
 * @param userConversation
 * @param cb
 */
userConversationsRemote.prototype.store = function(userConversation, cb){
    var that = this;
    cb = cb || nop;
    var url = 'users/' + that.userConversations.user.id + '/userConversations/' + userConversation.id;
    var params = {
        targetId: userConversation.targetId,
        name: userConversation.name,
        type: userConversation.type,
        avatarUrl: userConversation.avatarUrl
    }
    baseRequest.put(url, params, that.userConversations.user.token, function(err, data){
        if(err){
            cb(err);
            return;
        }
        cb(null, data);
    })
}
/**
 * 删除用户会话
 * @param userConversationId:用户会话id
 * @param cb
 */
userConversationsRemote.prototype.remove = function(userConversationId, cb){
    var that = this;
    cb = cb || nop;
    var url = 'users/' + that.userConversations.user.id + '/userConversations/' + userConversationId;
    baseRequest.delete(url, null, that.userConversations.user.token, function(err, data){
        if(err){
            cb(err);
            return;
        }
        cb(null, data);
    })
}

var UserConversation = function(userConversations, obj){
    this.userConversations = userConversations;
    this.id = obj['id'];
    this.name = obj['name'];
    this.avatarUrl = obj['avatarUrl'] || ' ';
    if(this.avatarUrl.indexOf('/images/default.jpg') >= 0)
        this.avatarUrl = ' ';
    this.targetId = obj['targetId'];
    this.unread = obj['unread'];
    this.type = obj['type'];
    this.isDelete = obj['isDelete'];
    this.createdAt = new Date(obj['createdAt']).getTime();
    this.updatedAt = new Date(obj['updatedAt']).getTime();
    this.visiable = obj['visiable'];
    this.top = obj['top'];
    if(this.type == 'p2p'){
        var user = Users.getInstance().get(this.targetId);
        if (user === undefined)
            Users.getInstance().create(this.targetId, this.name, null, this.avatarUrl);
    }
    this.firstGetLastMessges = true;
    this.lastMessage = obj['lastMessage'];
    if(this.lastMessage) {
        this.lastMessage.scene = this.type;
        try {
            this.lastMessage.content = JSON.parse(this.lastMessage.content);
        }
        catch (e) {}
        if(this.type == 'p2p') {
            var user = Users.getInstance().get(this.targetId);
            if(this.lastMessage.sender == this.userConversations.user.id) {
                this.lastMessage.from = this.userConversations.user;
                this.lastMessage.to = user;
            }
            else{
                this.lastMessage.from = user;
                this.lastMessage.to = this.userConversations.user;
            }
        }
        else if(this.type == 'group'){
            this.lastMessage.from = null;
            if(this.lastMessage && this.lastMessage.sender)
                this.lastMessage.from = Users.getInstance().get(this.lastMessage.sender);
            this.lastMessage.to = null;
        }
    }
}
UserConversation.prototype.update = function(obj){
    this.name = obj['name'];
    this.avatarUrl = obj['avatarUrl'] || ' ';
    if(this.avatarUrl.indexOf('/images/default.jpg') >= 0)
        this.avatarUrl = ' ';
    this.unread = obj['unread'];
    this.isDelete = obj['isDelete'];
    this.createdAt = new Date(obj['createdAt']).getTime();
    this.updatedAt = new Date(obj['updatedAt']).getTime();
    this.visiable = obj['visiable'];
    this.top = obj['top'];
    this.lastMessage = obj['lastMessage'];
    if(this.lastMessage) {
        this.lastMessage.scene = this.type;
        try {
            this.lastMessage.content = JSON.parse(this.lastMessage.content);
        }
        catch (e) {}
        if(this.type == 'p2p') {
            var user = Users.getInstance().get(this.targetId);
            if (user === undefined)
                user = Users.getInstance().create(this.targetId, this.name, null, this.avatarUrl);
            if(this.lastMessage.sender == this.userConversations.user.id) {
                this.lastMessage.from = this.userConversations.user;
                this.lastMessage.to = user;
            }
            else{
                this.lastMessage.from = user;
                this.lastMessage.to = this.userConversations.user;
            }
        }
        else if(this.type == 'group'){
            this.lastMessage.from = null;
            if(this.lastMessage && this.lastMessage.sender)
                this.lastMessage.from = Users.getInstance().get(this.lastMessage.sender);
            this.lastMessage.to = null;
        }
    }
}
UserConversation.prototype.toJSON = function(){
    var obj = {
        id: this.id,
        name: this.name,
        avatarUrl: this.avatarUrl,
        targetId: this.targetId,
        unread: this.unread,
        type: this.type,
        isDelete: this.isDelete,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
        visiable: this.visiable,
        top: this.top,
        firstGetLastMessges: this.firstGetLastMessges
    }
    if(this.lastMessage){
        obj.lastMessage = {
            scene: this.lastMessage.scene,
            sender: this.lastMessage.sender,
            content: this.lastMessage.content,
            type: this.lastMessage.type
        }
    }
    return obj;
}
/**
 * 获取名称
 * @returns name
 */
UserConversation.prototype.getName = function(){
    if(this.type == 'p2p'){
        var contact = this.userConversations.user.contacts.get(this.targetId);
        if(contact)
            return contact.getName();
        return Users.getInstance().get(this.targetId).name;
    }
    return this.name;
}
/**
 * 获取头像
 * @returns url
 */
UserConversation.prototype.getAvatarUrl = function(){
    if(this.type == 'p2p') {
        var contact = this.userConversations.user.contacts.get(this.targetId);
        if(contact)
            return contact.getAvatarUrl();
        return Users.getInstance().get(this.targetId).getAvatarUrl();
    }
    if(this.avatarUrl && $.trim(this.avatarUrl) != '')
        return config.baseUrl + this.avatarUrl + '?access_token=' + this.userConversations.user.token;
    return null;
}
/**
 * 获取目标会话
 * @param cb
 */
UserConversation.prototype.getSession = function(cb){
    this.userConversations.user.sessions.get(this.targetId, this.type, cb);
}
/**
 * 同步消息
 * @param force[true|false]:强制同步
 * @param cb
 */
UserConversation.prototype.syncMessages = function(force, cb){
    if(!cb){
        cb = force || nop;
        force = false;
    }
    var that = this;
    this.getSession(function(err, session){
        if(err){
            cb(err);
            return;
        }
        if(force || that.updatedAt > session.messages.updatedAt){
            session.messages.remote.sync(function(err, messages){
                if(err){
                    cb(err);
                    return;
                }
                cb(null, messages);
            })
        }
        else
            cb(null, []);
    })
}
/**
 * 获取历史消息
 * @param cb
 */
UserConversation.prototype.getLastMessages = function(cb){
    cb = cb || nop;
    var that = this;
    this.getSession(function(err, session){
        if(err){
            cb(err);
            return;
        }
        session.messages.remote.getLastMessages(function(err, messages){
            if(err){
                cb(err);
                return;
            }
            that.firstGetLastMessges = false;
            cb(null, messages);
        })
    })
}
/**
 * 清除已读数量
 */
UserConversation.prototype.clearUnread = function(){
    this.unread = 0;
    this.userConversations.updateCache_List();
}
'use strict';

var Contacts = function(user){
    var _list;
    var _localStorage = new contactsLocalStorage(this);
    this.user = user;
    this.updatedAt = globalMinDate;
    this.remote = new contactsRemote(this);

    this.init = function(){
        _list = _localStorage.getList();
        for(var k in _list){
            var contact = this.createContact(_list[k]);
            _list[k] = contact;
            if(this.updatedAt < contact.updatedAt)
                this.updatedAt = contact.updatedAt;
        }
    }
    /**
     * 获取联系人
     * @param userId:用户id
     * @returns contact
     */
    this.get = function(userId){
        return _list[userId];
    }
    this.createContact = function(obj){
        return new Contact(this, obj);
    }
    /**
     * 获取联系人列表
     * @returns [contact]
     */
    this.getContacts = function(){
        var foo = [];
        for(var k in _list){
            if(_list[k].isDelete)
                continue;
            foo.push(_list[k]);
        }
        return foo;
    }
    this.addContacts = function(list){
        for(var i = 0; i < list.length; i++){
            var contact = this._add(list[i]);
            if(this.updatedAt < contact.updatedAt)
                this.updatedAt = parseInt(contact.updatedAt);
        }
        if(list.length > 0)
            _localStorage.setList(_list);
    }
    this._add = function(obj){
        var contact = _list[obj['userId']];
        if(!contact)
            contact = this.createContact(obj);
        else
            contact.update(obj);
        _list[contact.userId] = contact;
        return contact;
    }
}
var contactsLocalStorage = function(contacts){
    this.contacts = contacts;
}
contactsLocalStorage.prototype.getList = function(){
    var list = localStorage.getItem(this.contacts.user.id + '_contacts');
    if(!list)
        return {};
    return JSON.parse(list);
}
contactsLocalStorage.prototype.setList = function(list){
    localStorage.setItem(this.contacts.user.id + '_contacts', JSON.stringify(list));
}
var contactsRemote = function(contacts) {
    this.contacts = contacts;
}
contactsRemote.prototype.sync = function(cb) {
    cb = cb || nop;
    var that = this;
    var url = 'users/' + that.contacts.user.id + '/contacts';
    baseRequest.get(url, that.contacts.updatedAt, that.contacts.user.token, function(err, data){
        if(err){
            cb(err);
            return;
        }
        that.contacts.addContacts(data.entries);
        cb(null, data.entries.length);
    })
}
/**
 * 添加联系人
 * @param userId:用户id
 * @param name:用户姓名
 * @param cb
 */
contactsRemote.prototype.add = function(userId, name, cb) {
    cb = cb || nop;
    var that = this;
    var url = 'users/' + that.contacts.user.id + '/contacts';
    var params = {
        userId: userId,
        name: name
    }
    baseRequest.post(url, params, that.contacts.user.token, function(err, data){
        if(err){
            cb(err);
            return;
        }
        cb(null, data);
    })
}
/**
 * 修改联系人
 * @param contact
 * @param cb
 */
contactsRemote.prototype.store = function(contact, cb){
    cb = cb || nop;
    var that = this;
    var url = 'users/' + that.contacts.user.id + '/contacts/' + contact.id;
    var params = {
        userId: contact.userId,
        name: contact.name,
        title: contact.title,
        remark: contact.remark,
        avatarUrl: contact.avatarUrl
    }
    baseRequest.put(url, params, that.contacts.user.token, function(err, data){
        if(err){
            cb(err);
            return;
        }
        cb(null, data);
    })
}
/**
 * 删除联系人
 * @param contactId
 * @param cb
 */
contactsRemote.prototype.remove = function(contactId, cb){
    cb = cb || nop;
    var that = this;
    var url = 'users/' + that.contacts.user.id + '/contacts/' + contactId;
    baseRequest.delete(url, null, that.contacts.user.token, function(err){
        if(err){
            cb(err);
            return;
        }
        cb();
    })
}

var Contact = function(contacts, obj){
    this.contacts = contacts;
    this.id = obj['id'];
    this.name = obj['name'];
    this.pinyin = obj['pinyin'];
    this.title = obj['title'];
    this.titlePinyin = obj['titlePinyin'];
    this.remark = obj['remark'];
    this.isDelete = obj['isDelete'];
    this.createdAt = new Date(obj['createdAt']).getTime();
    this.updatedAt = new Date(obj['updatedAt']).getTime();
    this.userId = obj['userId'];
    this.user = Users.getInstance().get(this.userId);
    if(this.user === undefined)
        this.user = Users.getInstance().create(obj['userId'], obj['name'], obj['email'], obj['avatarUrl']);
    this.avatarUrl = obj['avatarUrl'] || ' ';
}
Contact.prototype.update = function(obj){
    this.name = obj['name'];
    this.pinyin = obj['pinyin'];
    this.title = obj['title'];
    this.titlePinyin = obj['titlePinyin'];
    this.remark = obj['remark'];
    this.isDelete = obj['isDelete'];
    this.createdAt = new Date(obj['createdAt']).getTime();
    this.updatedAt = new Date(obj['updatedAt']).getTime();
    this.avatarUrl = obj['avatarUrl'] || ' ';
}
Contact.prototype.toJSON = function(){
    return {
        id: this.id,
        name: this.name,
        pinyin: this.pinyin,
        title: this.title,
        titlePinyin: this.titlePinyin,
        remark: this.remark,
        isDelete: this.isDelete,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
        userId: this.userId,
        avatarUrl: this.avatarUrl
    }
}
/**
 * 获取名称
 * @returns name
 */
Contact.prototype.getName = function(){
    if(this.title && this.title.length > 0)
        return this.title;
    return this.user.name;
}
/**
 * 获取拼音
 * @returns pinyin
 */
Contact.prototype.getPinYin = function(){
    if(this.title && this.title.length > 0)
        return this.titlePinyin;
    return this.pinyin;
}
/**
 * 获取头像
 * @returns url
 */
Contact.prototype.getAvatarUrl = function(){
    return this.user.getAvatarUrl();
}
'use strict';

var Messages = function(session){
    this.session = session;
    this._list = [];
    this.more = true;
    this.updatedAt = globalMinDate;
    this.topDate = globalMaxDate;
    this.sessionUpdatedAt = globalMinDate;
    this.remote = new messagesRemote(this);
}
/**
 * 获取消息数量
 * @returns {Number}
 */
Messages.prototype.count = function(){
    return this._list.length;
}
/**
 * 获取消息列表
 * @returns [messages]
 */
Messages.prototype.getMessages = function(){
    return this._list;
}
/**
 * 创建消息对象
 * @param obj
 * @returns message
 */
Messages.prototype.createMessage = function(obj){
    return new Message(this, obj);
}
Messages.prototype.add = function(message){
    this._list.push(message);
}
Messages.prototype.insert = function(index, message){
    this._list.splice(index, 0, message);
}
var messagesRemote = function(messages) {
    this.messages = messages;
}
messagesRemote.prototype.store = function(message, cb) {
    cb = cb || nop;
    var that = this;
    var url = 'sessions/' + that.messages.session.id + '/messages';
    var params = {
        sender: message.sender,
        content: JSON.stringify(message.content),
        type: message.type
    }
    baseRequest.post(url, params, that.messages.session.sessions.user.token, function(err, data){
        if(err){
            cb(err);
            message.status = 'storefailed';
            //that.messages.add(message);
            return;
        }
        message.id = data.id;
        message.createdAt = new Date(data.createdAt).getTime();
        message.updatedAt = new Date(data.updatedAt).getTime();
        message.status = 'stored';
        cb(null, message);
    })
}
/**
 * 消息同步
 * 1. 获取同步消息
 * 2. 从后往前查询消息标志位存在的本地消息(带标志位的为本地消息，同步消息不包含此属性)，并设置索引，当未查询到此状态时，表示找到了上次同步后最后一条索引
 * 3. 将同步消息插入到索引位置
 * 4. 删除标志位为stored的本地消息
 * 5. 返回同步回来的消息
 * @param cb
 */
messagesRemote.prototype.sync = function(cb) {
    cb = cb || nop;
    var that = this;
    var url = 'sessions/' + that.messages.session.id + '/messages';
    baseRequest.get(url, that.messages.updatedAt, that.messages.session.sessions.user.token, function(err, data){
        if(err){
            //无权限同步消息
            if(err.status == '403'){
                var userConversation = that.messages.session.getConversation();
                that.messages.updatedAt = userConversation.updatedAt;
                var targetId = that.messages.session.sessions.getTargetId(that.messages.session.id, that.messages.session.type);
                that.messages.session.sessions.remote.sync(targetId, that.messages.session.type, function(err){
                    if(err){
                        cb(err);
                        return;
                    }
                    cb();
                })
            }
            else
                cb(err);
        }
        else {
            var tmpList = that.messages.getMessages();
            var insertIndex = tmpList.length;
            for (var i = tmpList.length - 1; i >= 0; i--) {
                if (!tmpList[i].status)
                    break;
                else
                    insertIndex = i;
            }
            var list = [];
            for (var i = 0; i < data.entries.length; i++) {
                var message = that.messages.createMessage(data.entries[i]);
                that.messages.insert(insertIndex++, message);
                list.push(message);
                if (that.messages.updatedAt < message.updatedAt)
                    that.messages.updatedAt = message.updatedAt;
            }
            if (that.messages.updatedAt == globalMinDate)
                that.messages.updatedAt = globalMinSyncDate;
            tmpList = that.messages.getMessages();
            for (var i = tmpList.length - 1; i >= insertIndex; i--) {
                if (tmpList[i].status == 'stored')
                    tmpList.splice(i, 1);
            }
            //如果服务端session已更新，同步session
            if(that.messages.session.updatedAt < new Date(data['sessionUpdatedAt']).getTime()) {
                var targetId = that.messages.session.sessions.getTargetId(that.messages.session.id, that.messages.session.type);
                that.messages.session.sessions.remote.sync(targetId, that.messages.session.type, function(err){
                    if(err){
                        cb(err);
                        return;
                    }
                    cb(null, list);
                })
            }
            else
                cb(null, list);
        }
    })
}
messagesRemote.prototype.getLastMessages = function(cb){
    cb = cb || nop;
    var that = this;
    var limit = 20;
    var url = 'sessions/' + that.messages.session.id + '/messages/history?limit=' + limit;
    baseRequest.get(url, that.messages.topDate, that.messages.session.sessions.user.token, function(err, datas){
        if(err){
            cb(err);
            return;
        }
        var list = [];
        for(var i = 0; i < datas.length; i++){
            var message = that.messages.createMessage(datas[i]);
            that.messages.insert(0, message);
            list.splice(0, 0, message);
            if(that.messages.updatedAt < message.updatedAt)
                that.messages.updatedAt = message.updatedAt;
            if(that.messages.topDate > message.updatedAt)
                that.messages.topDate = message.updatedAt;
        }
        if(that.messages.updatedAt == globalMinDate)
            that.messages.updatedAt = globalMinSyncDate;
        if(datas.length < limit)
            that.messages.more = false;
        else
            that.messages.more = true;
        cb(null, list);
    })
}


var Message = function(messages, obj){
    this.messages = messages;
    this.id = obj['id'] || guid();
    this.sender = obj['sender'];
    this.from;
    this.to;
    if(this.messages.session.type == 'p2p'){
        var member = this.messages.session.members.getMember(this.sender);
        if(member)
            this.from = member.user;
        if(this.from) {
            member = this.messages.session.members.getP2POtherSideMember(this.from.id);
            if (member)
                this.to = member.user;
        }
    }
    else if(this.messages.session.type == 'group'){
        this.from = this.messages.session.members.getMember(this.sender);
        this.to = this.messages.session;
    }
    this.type = obj['type'];
    try {
        this.content = JSON.parse(obj['content']);
    }
    catch(e){
        this.content = obj['content'];
    }
    this.createdAt = obj['createdAt'] ? new Date(obj['createdAt']).getTime() : globalMinDate;
    this.updatedAt = obj['updatedAt'] ? new Date(obj['updatedAt']).getTime() : globalMinDate;
    this.isDelete = obj['isDelete'];
    this.status = obj['status'] || '';
}
var UserSessions = function(user){
    var _list;
    var _localStorage = new userSessionsLocalStorage(this);
    this.user = user;
    this.updatedAt = globalMinDate;
    this.remote = new userSessionsRemote(this);

    this.init = function(){
        _list = _localStorage.getList();
        for(var k in _list){
            var userSession = this.createUserSession(_list[k]);
            _list[k] = userSession;
            if(this.updatedAt < userSession.updatedAt)
                this.updatedAt = userSession.updatedAt;
        }
    }
    /**
     * 获取群组
     * @param sessionId:会话Id
     * @returns userSession
     */
    this.get = function(sessionId){
        return _list[sessionId];
    }
    this.createUserSession = function(obj){
        return new UserSession(this, obj);
    }
    /**
     * 获取群组列表
     * @returns [userSession]
     */
    this.getUserSessions = function(){
        var foo = [];
        for(var k in _list){
            if(_list[k].isDelete)
                continue;
            foo.push(_list[k]);
        }
        return foo;
    }
    this.addUserSessions = function(list){
        for(var i = 0; i < list.length; i++){
            var userSession = this._add(list[i]);
            if(this.updatedAt < userSession.updatedAt)
                this.updatedAt = parseInt(userSession.updatedAt);
        }
        if(list.length > 0)
            _localStorage.setList(_list);
    }
    this._add = function(obj){
        var userSession = _list[obj.sessionId];
        if(!userSession)
            userSession = this.createUserSession(obj);
        else
            userSession.update(obj);
        _list[userSession.sessionId] = userSession;
        return userSession;
    }
}
var userSessionsLocalStorage = function(userSessions){
    this.userSessions = userSessions;
}
userSessionsLocalStorage.prototype.getList = function(){
    var list = localStorage.getItem(this.userSessions.user.id + '_userSessions');
    if(!list)
        return {};
    return JSON.parse(list);
}
userSessionsLocalStorage.prototype.setList = function(list){
    localStorage.setItem(this.userSessions.user.id + '_userSessions', JSON.stringify(list));
}
var userSessionsRemote = function(userSessions){
    this.userSessions = userSessions;
}
/**
 * 收藏群组
 * @param sessionId:会话Id
 * @param name:群组名称
 * @param avatarUrl:群组头像
 * @param cb
 */
userSessionsRemote.prototype.add = function(sessionId, name, avatarUrl, cb){
    var that = this;
    cb = cb || nop;
    var url = 'users/' + that.userSessions.user.id + '/userSessions';
    var params = {
        sessionId: sessionId,
        name: name,
        avatarUrl: avatarUrl
    }
    baseRequest.post(url, params, that.userSessions.user.token, function(err, data){
        if(err){
            cb(err);
            return;
        }
        cb(null, data);
    })
}
/**
 * 取消收藏群组
 * @param userSessionId:群组id
 * @param cb
 */
userSessionsRemote.prototype.remove = function(userSessionId, cb){
    var that = this;
    cb = cb || nop;
    var url = 'users/' + that.userSessions.user.id + '/userSessions/' + userSessionId;
    var params = {}
    baseRequest.delete(url, params, that.userSessions.user.token, function(err, data){
        if(err){
            cb(err);
            return;
        }
        cb(null);
    })
}
/**
 * 同步群组
 * @param cb
 */
userSessionsRemote.prototype.sync = function(cb){
    cb = cb || nop;
    var that = this;
    var url = 'users/' + that.userSessions.user.id + '/userSessions';
    baseRequest.get(url, that.userSessions.updatedAt, that.userSessions.user.token, function(err, data){
        if(err){
            cb(err);
            return;
        }
        that.userSessions.addUserSessions(data.entries);
        cb(null, data.entries.length);
    })
}

var UserSession = function(userSessions, obj){
    this.userSessions = userSessions;
    this.id = obj['id'];
    this.sessionId = obj['sessionId'];
    this.name = obj['name'];
    this.isDelete = obj['isDelete'];
    this.createdAt = new Date(obj['createdAt']).getTime();
    this.updatedAt = new Date(obj['updatedAt']).getTime();
    this.avatarUrl = obj['avatarUrl'] || ' ';
    if(this.avatarUrl && this.avatarUrl.indexOf('/images/default.jpg') >= 0)
        this.avatarUrl = ' ';
}
UserSession.prototype.update = function(obj){
    this.name = obj['name'];
    this.isDelete = obj['isDelete'];
    this.createdAt = new Date(obj['createdAt']).getTime();
    this.updatedAt = new Date(obj['updatedAt']).getTime();
    this.avatarUrl = obj['avatarUrl'] || ' ';
    if(this.avatarUrl && this.avatarUrl.indexOf('/images/default.jpg') >= 0)
        this.avatarUrl = ' ';
}
UserSession.prototype.toJSON = function(){
    return {
        id: this.id,
        sessionId: this.sessionId,
        name: this.name,
        isDelete: this.isDelete,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
        avatarUrl: this.avatarUrl
    }
}
UserSession.prototype.getAvatarUrl = function(){
    if(this.avatarUrl && $.trim(this.avatarUrl) != '')
        return config.baseUrl + this.avatarUrl + '?access_token=' + this.userSessions.user.token;
    return null;
}
var SessionMembers = function(session){
    var _list;
    var _localStorage = new sessionMembersLocalStorage(this);
    this.session = session;
    this.createdAt = globalMinDate;
    this.updatedAt = globalMinDate;
    this.init = function(){
        _list = _localStorage.getList();
        for(var k in _list){
            var sessionMember = this.createSessionMember(_list[k]);
            _list[k] = sessionMember;
            if(this.createdAt < sessionMember.createdAt)
                this.createdAt = sessionMember.createdAt;
            if(this.updatedAt < sessionMember.updatedAt)
                this.updatedAt = sessionMember.updatedAt;
        }
    }
    this.remove = function(userId){
        delete _list[userId];
        _localStorage.setList(_list);
    }
    this.addSessionMembers = function(list){
        for(var i = 0; i < list.length; i++){
            var sessionMember = this._add(list[i]);
            if(this.createdAt < sessionMember.createdAt)
                this.createdAt = sessionMember.createdAt;
            if(this.updatedAt < sessionMember.updatedAt)
                this.updatedAt = sessionMember.updatedAt;
        }
        if(list.length > 0)
            _localStorage.setList(_list);
    }
    this._add = function(obj){
        var sessionMember = _list[obj['userId']];
        if(!sessionMember)
            sessionMember = this.createSessionMember(obj);
        else
            sessionMember.update(obj);
        _list[sessionMember.userId] = sessionMember;
        return sessionMember;
    }
    this.createSessionMember = function(obj){
        return new SessionMember(this, obj);
    }
    /**
     * 获取会话成员
     * @param userId:用户id
     * @returns sessionMember
     */
    this.getMember = function(userId){
        return _list[userId];
    }
    /**
     * 获取会话成员列表
     * @returns [sessionMember]
     */
    this.getMembers = function(){
        var foo = [];
        for(var k in _list){
            if(!_list[k].isDelete)
                foo.push(_list[k]);
        }
        return foo;
    }
    /**
     * 获取p2p会话相对方的会话成员对象
     * @param userId
     * @returns sessionMember
     */
    this.getP2POtherSideMember = function(userId){
        for(var k in _list){
            if(k != userId)
                return _list[k];
        }
        return null;
    }
    this.remote = new sessionMembersRemote(this);
    this.init();
}
var sessionMembersLocalStorage = function(sessionMembers){
    this.sessionMembers = sessionMembers;
}
sessionMembersLocalStorage.prototype.getList = function(){
    var list = localStorage.getItem(this.sessionMembers.session.sessions.user.id + '_' + this.sessionMembers.session.id + '_sessionMembers');
    if(!list)
        return {};
    return JSON.parse(list);
}
sessionMembersLocalStorage.prototype.setList = function(list){
    localStorage.setItem(this.sessionMembers.session.sessions.user.id + '_' + this.sessionMembers.session.id + '_sessionMembers', JSON.stringify(list));
}
var sessionMembersRemote = function(sessionMembers) {
    this.sessionMembers = sessionMembers;
}
sessionMembersRemote.prototype.sync = function(cb) {
    cb = cb || nop;
    var that = this;
    var url = 'sessions/' + that.sessionMembers.session.id + '/members';
    baseRequest.get(url, that.sessionMembers.updatedAt, that.sessionMembers.session.sessions.user.token, function(err, data){
        if(err){
            cb(err);
            return;
        }
        that.sessionMembers.addSessionMembers(data.entries);
        cb();
    })
}
/**
 * 添加会话成员
 * @param userId:用户id
 * @param name:用户名称
 * @param role['master'|'admin'|'user']:会话成员角色，master:群主;admin:管理员;user:一般成员
 * @param avatarUrl:头像
 * @param status['active'|'封禁']:用户状态，active:有效;inactive:封禁
 * @param cb
 */
sessionMembersRemote.prototype.add = function(userId, name, role, avatarUrl, status, cb) {
    var that = this;
    cb = cb || nop;
    var url = 'sessions/' + that.sessionMembers.session.id + '/members';
    var params = {
        userId: userId,
        name: name,
        role: role,
        avatarUrl: avatarUrl,
        status: status
    }
    baseRequest.post(url, params, that.sessionMembers.session.sessions.user.token, function(err, data){
        if(err){
            cb(err);
            return;
        }
        cb(null, data);
    })
}
/**
 * 删除会话成员
 * @param memberId:会话成员id
 * @param cb
 */
sessionMembersRemote.prototype.remove = function(memberId, cb){
    var that = this;
    cb = cb || nop;
    var url = 'sessions/' + that.sessionMembers.session.id + '/members/' + memberId;
    baseRequest.delete(url, null, that.sessionMembers.session.sessions.user.token, function(err){
        if(err){
            cb(err);
            return;
        }
        cb(null);
    })
}

var SessionMember = function(sessionMembers, obj){
    this.sessionMembers = sessionMembers;
    this.id = obj['id'];
    this.name = obj['name'];
    this.pinyin = obj['pinyin'];
    this.createdAt = new Date(obj['createdAt']).getTime();
    this.updatedAt = new Date(obj['updatedAt']).getTime();
    this.userId = obj['userId'];
    this.isDelete = obj['isDelete'];
    this.role = obj['role'];
    this.status = obj['status'];
    this.user = Users.getInstance().get(this.userId);
    if(!this.user && this.userId && this.userId.length)
        this.user = Users.getInstance().create(obj['userId'], obj['name'], obj['email'], obj['avatarUrl']);
}
SessionMember.prototype.update = function(obj){
    this.name = obj['name'];
    this.pinyin = obj['pinyin'];
    this.createdAt = new Date(obj['createdAt']).getTime();
    this.updatedAt = new Date(obj['updatedAt']).getTime();
    this.isDelete = obj['isDelete'];
    this.role = obj['role'];
    this.status = obj['status'];
}
SessionMember.prototype.toJSON = function(){
    return {
        id: this.id,
        name: this.name,
        pinyin: this.pinyin,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
        userId: this.userId,
        isDelete: this.isDelete,
        role: this.role,
        status: this.status
    }
}
/**
 * 获取头像
 * @returns url
 */
SessionMember.prototype.getAvatarUrl = function(){
    return this.user.getAvatarUrl();
}

'use strict';

var Sessions = function(user){
    this.user = user;
    var _targetList;
    var _sessionList;
    var _localStorage = new sessionsLocalStorage(this);
    this.remote = new sessionsRemote(this);

    this.init = function(){
        _targetList = _localStorage.getList();
        _sessionList = {};
        for(var k in _targetList){
            var session = this.createSession(_targetList[k]);
            _targetList[k] = session;
            _sessionList[session.id] = session;
        }
    }
    this.createSession = function(obj){
        return new Session(this, obj);
    }
    /**
     * 获取会话
     * @param targetId:会话目标id
     * type=='p2p':targetId=user.id(对方用户);
     * type=='group':targetId=session.id(会话id)
     * @param type['p2'|'group']:会话场景类型
     * @param cb
     */
    this.get = function(targetId, type, cb){
        var that = this;
        cb = cb || nop;
        if(type != 'p2p' && type != 'group' && type != 'single'){
            cb('session type is invalid');
            return;
        }
        if(_targetList[type + '-' + targetId]){
            cb(null, _targetList[type + '-' + targetId]);
            return;
        }
        this.remote.sync(targetId, type, function(err){
            if(err){
                cb(err);
                return;
            }
            var session = _targetList[type + '-' + targetId];
            if(session) {
                cb(null, session);
            }
            else if(type == 'single'){
                that.remote.add('single', that.user.name, 'private', that.user.avatarUrl, function(err, session){
                    if(err){
                        cb(err);
                        return;
                    }
                    that.add(that.user.id, session);
                    cb(null, session);
                })
            }
            else
                cb();
        })
    }
    /**
     * 根据SessionId获取本地会话
     * @param id
     * @returns {*}
     */
    this.getById = function(id){
        return _sessionList[id];
    }
    /**
     * 获取会话目标id
     * type=='p2p':targetId=user.id(对方用户);
     * type=='group':targetId=session.id(会话id)
     * @param id:会话Id
     * @param type['p2p|'group']:会话场景类型
     * @returns targetId
     */
    this.getTargetId = function(id, type){
        for(var k in _targetList){
            if(_targetList[k].id == id && _targetList[k].type == type)
                return k.replace(type + '-', '');
        }
        throw "targetId is not exist";
    }
    this.add = function(targetId, obj){
        var session = _targetList[obj.type + '-' + targetId];
        if(!session)
            session = this.createSession(obj);
        else
            session.update(obj);
        _targetList[obj.type + '-' + targetId] = session;
        _sessionList[session.id] = session;
        _localStorage.setList(_targetList);
        return session;
    }
    this.remove = function(session){
        var targetId = this.getTargetId(session.id, session.type);
        delete _targetList[session.type + '-' + targetId];
        delete _sessionList[session.id];
        _localStorage.setList(_targetList);
    }
}
var sessionsLocalStorage = function(sessions){
    this.sessions = sessions;
}
sessionsLocalStorage.prototype.getList = function(){
    var list = localStorage.getItem(this.sessions.user.id + '_sessions');
    if(!list)
        return {};
    return JSON.parse(list);
}
sessionsLocalStorage.prototype.setList = function(list){
    localStorage.setItem(this.sessions.user.id + '_sessions', JSON.stringify(list));
}
var sessionsRemote = function(sessions) {
    this.sessions = sessions;
}
/**
 * 同步会话
 * @param targetId:会话目标id
 * type=='p2p':targetId=user.id(对方用户);
 * type=='group':targetId=session.id(会话id)
 * @param type['p2p|'group']:会话场景类型
 * @param type
 * @param cb
 */
sessionsRemote.prototype.sync = function(targetId, type, cb){
    var that = this;
    cb = cb || nop;
    if(type != 'p2p' && type != 'group' && type != 'single'){
        cb('session type is invalid');
        return;
    }
    var url;
    if(type == 'p2p')
        url = 'sessions/p2p/' + that.sessions.user.id + '/' + targetId;
    else if(type == 'group')
        url = 'sessions/' + targetId;
    else
        url = 'sessions/p2p/' + that.sessions.user.id + '/' + targetId;
    baseRequest.get(url, null, that.sessions.user.token, function(err, data){
        if(err){
            cb(err);
            return;
        }
        var session = that.sessions.add(targetId, data);
        session.members.remote.sync(function(err){
            if(err){
                cb(err);
                return;
            }
            cb(null, session);
        })
    })
}
/**
 * 添加会话
 * @param type:['p2p'|'group']:会话场景类型
 * @param name:名称
 * @param secureType['public'|'private']:安全类型，通常使用private
 * @param avatarUrl:头像
 * @param cb
 */
sessionsRemote.prototype.add = function(type, name, secureType, avatarUrl, cb){
    var that = this;
    cb = cb || nop;
    var url = 'sessions';
    var params = {
        type: type,
        name: name,
        secureType: secureType,
        avatarUrl: avatarUrl
    }
    baseRequest.post(url, params, that.sessions.user.token, function(err, data){
        if(err){
            cb(err);
            return;
        }
        var session = that.sessions.createSession(data);
        cb(null, session);
    })
}
/**
 * 更新会话信息
 * @param session
 * @param cb
 */
sessionsRemote.prototype.store = function(session, cb){
    var that = this;
    var targetId = this.sessions.getTargetId(session.id, session.type);
    cb = cb || nop;
    var url = 'sessions/' + session.id;
    var params = {
        name: session.name,
        secureType: session.secureType,
        avatarUrl: session.avatarUrl
    }
    baseRequest.put(url, params, that.sessions.user.token, function(err, data){
        if(err){
            cb(err);
            return;
        }
        var session = that.sessions.add(targetId, data);
        session.members.remote.sync(function(err){
            if(err){
                cb(err);
                return;
            }
            cb(null, session);
        });
    })
}

var Session = function(sessions, obj){
    this.sessions = sessions;
    this.id = obj['id'];
    this.name = obj['name'];
    this.nameChanged = obj['nameChanged'];
    this.secureType = obj['secureType'];
    this.type = obj['type'];
    this.description = obj['description'];
    this.avatarUrl = obj['avatarUrl'] || ' ';
    this.createdAt = new Date(obj['createdAt']).getTime();
    this.updatedAt = new Date(obj['updatedAt']).getTime();
    this.members = new SessionMembers(this);
    this.messages = new Messages(this);
}
Session.prototype.update = function(obj){
    this.name = obj['name'];
    this.nameChanged = obj['nameChanged'];
    this.secureType = obj['secureType'];
    this.type = obj['type'];
    this.description = obj['description'];
    this.avatarUrl = obj['avatarUrl'] || ' ';
    this.createdAt = new Date(obj['createdAt']).getTime();
    this.updatedAt = new Date(obj['updatedAt']).getTime();
}
Session.prototype.toJSON = function(){
    return {
        id: this.id,
        name: this.name,
        nameChanged: this.nameChanged,
        secureType: this.secureType,
        type: this.type,
        description: this.description,
        avatarUrl: this.avatarUrl,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
    }
}
/**
 * 获取用户会话对象
 * @returns userConversation
 */
Session.prototype.getConversation = function(){
    if(this.type == 'p2p'){
        var member = this.members.getP2POtherSideMember(this.sessions.user.id);
        return this.sessions.user.userConversations.get(this.type, member.user.id);
    }
    else if(this.type == 'group'){
        return this.sessions.user.userConversations.get(this.type, this.id);
    }
    else
        return null;
}



