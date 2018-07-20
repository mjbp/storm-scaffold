const gulp = require('gulp');
const imagemin = require('gulp-imagemin');
const config = require('../gulp.config');

module.exports = () => () => {
    return gulp.src(`${config.paths.src.img}/**/*`)
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
            .pipe(gulp.dest(`${config.paths.public}/${config.paths.assets}/img`));
};