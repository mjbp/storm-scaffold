// Dependencies
const config = require('./gulp.config'),
	sri = require('node-sri'),
	gulp = require('gulp'),
	pkg = require('./package.json'),
	sass = require('gulp-sass'),
	autoprefixer = require('gulp-autoprefixer'),
	header = require('gulp-header'),
	pixrem = require('gulp-pixrem'),
	uglify = require('gulp-uglify'),
	wait = require('gulp-wait'),
	rename = require('gulp-rename'),
	minifyCss = require('gulp-clean-css'),
	frontMatter = require('gulp-front-matter'),
	data = require('gulp-data'),
	sourcemaps = require('gulp-sourcemaps'),
	del = require('del'),
	browserSync = require('browser-sync'),
	reload = browserSync.reload,
	browserify = require('browserify'),
	imagemin = require('gulp-imagemin'),
	notify = require('gulp-notify'),
	plumber = require('gulp-plumber'),
	gulpIf = require('gulp-if'),
	babelify = require('babelify'),
	gulpUtil = require('gulp-util'),
	source = require('vinyl-source-stream'),
	buffer = require('vinyl-buffer'),
	runSequence = require('run-sequence'),
	fs = require('fs'),
	path = require('path');

// Error notification
const onError = err => {
	notify.onError({
		title:    'Gulp',
		subtitle: 'Failure!',
		message:  'Error: <%= error.message %>',
		sound:    'Beep'
	})(err);

	this.emit('end');
}

//walk the custom-components dir for .standalone.js modules in a dist folder
//return array of them for use in glob
const findStandaloneModules = dir => {
	if(!fs.existsSync(dir)) return [];
	return fs.readdirSync(dir)
				.reduce(function(files, file){
					if(fs.statSync(path.resolve(__dirname, path.join(dir, file))).isDirectory()) return files.concat(findStandaloneModules(path.join(dir, file)));
					if(/\S+dist\S+\.standalone.js$/.test(path.join(dir, file))) files.push(path.join(dir, file));
					return files;
				}, []);
};

//------------------------
// Tasks
//------------------------
const clean = () => del(`${config.paths.public}`);


const scss = () => gulp.src([`${config.paths.src.css}/**/*.scss`])
                    .pipe(wait(500))
                    .pipe(plumber({errorHandler: onError}))
                    .pipe(sourcemaps.init())
                    .pipe(sass())
					.pipe(autoprefixer({
						browsers: pkg.browserlist
					}))
                    .pipe(pixrem())
                    .pipe(header(config.banner, {pkg : pkg}))
                    .pipe(minifyCss())
                    .pipe(sourcemaps.write())
					.pipe(gulpIf(!!gulpUtil.env.production, minifyCss()))
					.pipe(gulp.dest(`${config.paths.public}/${config.paths.staticAssets}/css`));
					// .pipe(gulp.dest(config.paths.dest[!!gulpUtil.env.production ? 'production' : 'development'].css));
					//pipe to production
							

const jsCore = () => browserify({
						entries: `${config.paths.src.js}/app.js`,
						debug: !gulpUtil.env.production,
						fullPaths: !gulpUtil.env.production
					})
					.transform(babelify)
					.bundle()
					.pipe(source('app.js'))
					.pipe(buffer())
					.pipe(gulpIf(!!gulpUtil.env.production, uglify()))
					.pipe(gulp.dest(`${config.paths.public}/${config.paths.staticAssets}/js`));
					//pipe to production
					// .pipe(gulp.dest(config.paths.dest[!!gulpUtil.env.production ? 'production' : 'development'].js));


const jsAsync = () => gulp.src(`${config.paths.src.js}/async/**/*`)
						.pipe(uglify())
						.pipe(rename({suffix: '.min'}))
						.pipe(gulp.dest(`${config.paths.public}/${config.paths.staticAssets}/js/async`));
						//pipe to production
						// .pipe(gulp.dest(`${config.paths.dest[!!gulpUtil.env.production ? 'production' : 'development'].js}async/`));


const jsCustomComponents = () => gulp.src(findStandaloneModules(path.resolve(__dirname, `${config.paths.src.js}/custom-components`)))
									.pipe(uglify())
									.pipe(rename(path => {
										path.basename = path.basename.replace('.standalone', '');
									}))
									.pipe(gulp.dest(`${config.paths.public}/${config.paths.staticAssets}/js/async`));
									//pipe to production
									// .pipe(gulp.dest(`${config.paths.dest[!!gulpUtil.env.production ? 'production' : 'development'].js}async/`));

const jsPolyfills = () => browserify({
								entries: `${config.paths.src.js}/polyfills/index.js`,
								debug: !gulpUtil.env.production,
								fullPaths: !gulpUtil.env.production
							})
							.bundle()
							.pipe(source('index.js'))
							.pipe(buffer())
							.pipe(uglify())
							.pipe(rename({
								basename: 'polyfills',
								suffix: '.min'
							}))
							.pipe(gulp.dest(`${config.paths.public}/${config.paths.staticAssets}/js/async`));
							//pipe to production
							// .pipe(gulp.dest(`${config.paths.dest[!!gulpUtil.env.production ? 'production' : 'development'].js}async/`));

const sw = () => gulp.src(`${config.paths.src.js}/sw/*.*`)
					.pipe(gulp.dest(`${config.paths.public}`));
					// .pipe(gulp.dest(config.paths.dest[!!gulpUtil.env.production ? 'production' : 'development'].html));

// const html = () => {
// 	var JSHashFn = sri.hash(`${path.resolve(__dirname, `${config.paths.dest[!!gulpUtil.env.production ? 'production' : 'development'].js}app.js`)}`),
// 		CSSHashFn = sri.hash(`${path.resolve(__dirname, `${config.paths.dest[!!gulpUtil.env.production ? 'production' : 'development'].css}styles.css`)}`);

// 	return Promise.all([JSHashFn, CSSHashFn])
// 		.then(function(hashes){
// 			return gulp.src(`${config.paths.src.html}views/**/*.html`)
// 				.pipe(plumber({errorHandler: onError}))
// 				.pipe(frontMatter({ property: 'data' }))
// 				.pipe(data(() => {
// 					return {
// 						'assetPath': config.paths.assets,
// 						'JSIntegrity': hashes[0],
// 						'CSSIntegrity': hashes[1]
// 					};
// 				}))
// 				.pipe(nunjucksRender({
// 					path: config.paths.src.html
// 				}))
// 				.pipe(gulp.dest(config.paths.dest[!!gulpUtil.env.production ? 'production' : 'development'].html));

// 		});
// }


const img = () => gulp.src(`${config.paths.src.img}/**/*`)
					.pipe(imagemin([
						imagemin.gifsicle({interlaced: true}),
						imagemin.jpegtran({progressive:true}),
						imagemin.optipng({optimizationLevel:5}),
						imagemin.svgo({
							plugins: [
								{removeViewBox: false},
								{cleanupIDs: true}
							]
						})
					]))
					.pipe(gulp.dest(`${config.paths.public}/${config.paths.staticAssets}/img`));

const staticAssets = () => gulp.src(`${config.paths.src.staticAssets}/**/*`)
							.pipe(gulp.dest(`${config.paths.public}/${config.paths.staticAssets}`));



const watch = () => {
	gulp.watch([`${config.paths.src.css}/**/*.scss`], ['css']);
	gulp.watch(`${config.paths.src.js}/**/*`, ['js']);
	gulp.watch(`${config.paths.src.img}/**/*`, ['img']);
};

//------------------------
// Gulp API
//------------------------
gulp.task('compile', () => { runSequence('clean', ['jsCore', 'scss'], ['js-other', 'img', 'staticAssets']); });

gulp.task('jsCore', jsCore);
gulp.task('jsAsync', jsAsync);
gulp.task('jsPolyfills', jsPolyfills);
gulp.task('jsCustomComponents', jsCustomComponents);
gulp.task('sw', sw);

gulp.task('clean', clean);
gulp.task('js', () => { runSequence('jsCustomComponents', ['sw', 'jsCore', 'jsAsync', 'jsPolyfills']); });
gulp.task('scss', scss);
gulp.task('staticAssets', staticAssets);
gulp.task('img', img);
// gulp.task('js-sri', () => { runSequence('jsCore', ['html']); })
// gulp.task('scss-sri', () => { runSequence('scss', ['html']); })
gulp.task('js-other', () => { runSequence('jsCustomComponents', ['sw', 'jsAsync', 'jsPolyfills']); });
gulp.task('serve', () => { runSequence('clean', ['jsCore', 'scss'], ['js-other', 'img', 'staticAssets'], serve); });
gulp.task('watch', () => { runSequence('compile', watch); });
gulp.task('default', ['serve']);
