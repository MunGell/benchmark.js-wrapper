const gulp = require('gulp');
const addSrc = require('gulp-add-src');
const concat = require('gulp-concat');
const insert = require('gulp-insert');
const remoteSrc = require('gulp-remote-src');
const replace = require('gulp-replace');
const config = require('./config.js');

gulp.task('js', function () {

    // Fetch Platform.js, Benchmark.js, and its jsPerf UI dependencies.
    var files = [
        `bestiejs/benchmark.js/${config.benchmarkjs.version}/benchmark.js`
    ];

    if (config.ui) {
        files.push(`bestiejs/benchmark.js/${config.benchmarkjs.version}/example/jsperf/ui.js`);
        files.push(`bestiejs/benchmark.js/${config.benchmarkjs.version}/plugin/ui.browserscope.js`);
    }

    var flow = remoteSrc(files, {
        'base': 'https://raw.githubusercontent.com/',
        'requestOptions': config.requestOptions
    })
        .pipe(addSrc.prepend(require.resolve('platform')))
        .pipe(addSrc.prepend(require.resolve('lodash'))) // Use whatever version of lodash Benchmark.js is using.
        .pipe(concat(config.output.file))

        // jsPerf is browser-only. Ensure we’re detected as a browser environment,
        // even if this is an AMD test, for example.
        .pipe(replace(/freeDefine = (?:[^;]+)/, 'freeDefine = false'))
        .pipe(replace(/freeExports = (?:[^;]+)/, 'freeExports = false'))
        .pipe(replace(/freeModule = (?:[^;]+)/, 'freeModule = false'))
        .pipe(replace(/freeRequire = (?:[^;]+)/, 'freeRequire = false'))
        .pipe(replace(/(if\s*\()(typeof define|freeDefine)\b/, '$1false'));

    if (config.ui) {
        flow.pipe(replace('gaId = \'\'', `gaId = \'${config.ga}\'`)) // Set the Google Analytics ID.
            .pipe(replace('\'selector\': \'\'', '\'selector\': \'#bs-results\'')); // Set the CSS selector for the Browserscope results.
    }

    // Avoid exposing `_` and `platform` as global variables.
    flow.pipe(insert.wrap(
        '(function(){var _,platform;',
        '}.call(this))'
    ))
        .pipe(replace('root.platform = parse()', 'platform = parse()'))
        .pipe(replace('var _ = runInContext()', '_ = runInContext()'))
        .pipe(replace('(freeWindow || freeSelf || {})._ = _', ''))
        .pipe(replace('root._ = _', ''))

        // Ensure that Benchmark.js uses the local copies of lodash and Platform.js.
        .pipe(replace('var _ = context && context._ || req(\'lodash\') || root._;', ''))
        .pipe(replace('\'platform\': context.platform', '\'platform\': platform'));

    if (config.output.minify) {
        // Minify the result.
        flow.pipe(uglify());
    }

    flow.pipe(gulp.dest('./dist/'));
});

gulp.task('assets', function () {
    // Update  Platform.js, Benchmark.js, and its jsPerf UI dependencies.
    remoteSrc([
            'index.html',
            'main.css'
        ], {
            'base': `https://raw.githubusercontent.com/bestiejs/benchmark.js/${config.benchmarkjs.version}/example/jsperf/`,
            'requestOptions': config.requestOptions
        }
    )
        .pipe(replace('<script src="../../node_modules/lodash/index.js"></script>', ''))
        .pipe(replace('<script src="../../node_modules/platform/platform.js"></script>', ''))
        .pipe(replace('<script src="../../benchmark.js"></script>', ''))
        .pipe(replace('<script src="ui.js"></script>', ''))
        .pipe(replace(
            '<script src="../../plugin/ui.browserscope.js"></script>',
            '<script src="' + config.output.file + '"></script>'
        ))
        .pipe(gulp.dest('./dist'));
});

gulp.task('default', ['js', 'assets']);
