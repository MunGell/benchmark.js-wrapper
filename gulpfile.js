const gulp = require('gulp');
const addSrc = require('gulp-add-src');
const concat = require('gulp-concat');
const insert = require('gulp-insert');
const remoteSrc = require('gulp-remote-src');
const replace = require('gulp-replace');
const config =  require('./config.js');

gulp.task('js', function() {

	// Fetch Platform.js, Benchmark.js, and its jsPerf UI dependencies.
	remoteSrc([
		'bestiejs/platform.js/1.3.1/platform.js',
		`bestiejs/benchmark.js/${config.benchmarkjs.version}/benchmark.js`,
		`bestiejs/benchmark.js/${config.benchmarkjs.version}/example/jsperf/ui.js`,
		`bestiejs/benchmark.js/${config.benchmarkjs.version}/plugin/ui.browserscope.js`
	], {
			'base': 'https://raw.githubusercontent.com/',
			'requestOptions': config.requestOptions
		}
	)

	// Use whatever version of lodash Benchmark.js is using.
	.pipe(addSrc.prepend(require.resolve('lodash')))

	.pipe(concat(config.output.file))

	// Set the Google Analytics ID.
	.pipe(replace('gaId = \'\'', `gaId = \'${config.ga}\'`))

	// jsPerf is browser-only. Ensure we’re detected as a browser environment,
	// even if this is an AMD test, for example.
	.pipe(replace(/freeDefine = (?:[^;]+)/, 'freeDefine = false'))
	.pipe(replace(/freeExports = (?:[^;]+)/, 'freeExports = false'))
	.pipe(replace(/freeModule = (?:[^;]+)/, 'freeModule = false'))
	.pipe(replace(/freeRequire = (?:[^;]+)/, 'freeRequire = false'))
	.pipe(replace(/(if\s*\()(typeof define|freeDefine)\b/, '$1false'))

	// Set the CSS selector for the Browserscope results.
	.pipe(replace('\'selector\': \'\'', '\'selector\': \'#bs-results\''))

	// Avoid exposing `_` and `platform` as global variables.
	.pipe(insert.wrap(
		'(function(){var _,platform;',
		'}.call(this))'
	))
	.pipe(replace('root.platform = parse()', 'platform = parse()'))
	.pipe(replace('var _ = runInContext()', '_ = runInContext()'))
	.pipe(replace('(freeWindow || freeSelf || {})._ = _', ''))
	.pipe(replace('root._ = _', ''))

	// Ensure that Benchmark.js uses the local copies of lodash and Platform.js.
	.pipe(replace('var _ = context && context._ || req(\'lodash\') || root._;', ''))
	.pipe(replace('\'platform\': context.platform', '\'platform\': platform'))

	// Minify the result.
	//.pipe(uglify())

	.pipe(gulp.dest('./dist/'));
});

gulp.task('assets', function() {
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
		'<script src="all.js"></script>'
	))
	.pipe(gulp.dest('./dist'));
});

gulp.task('default', ['js', 'assets']);
