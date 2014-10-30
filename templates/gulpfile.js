var gulp = require('gulp');
var webserver = require('gulp-webserver');
var inject = require("gulp-inject");
var path = require("path");

gulp.task('less', function () {
    var sourcemaps = require('gulp-sourcemaps');
    var autoprefixer = require('gulp-autoprefixer');
    var less = require('gulp-less');

    return gulp.src('fiddle.less')
        .pipe(sourcemaps.init())
        .pipe(less())
        .pipe(autoprefixer({ browsers: ['last 2 version'] }))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('./'));
});

gulp.task('sass', function () {
    var sourcemaps = require('gulp-sourcemaps');
    var autoprefixer = require('gulp-autoprefixer');
    var sass = require('gulp-sass');

    return gulp.src('fiddle.+(sass|scss)')
        .pipe(sourcemaps.init())
        .pipe(sass())
        .pipe(autoprefixer({ browsers: ['last 2 version'] }))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('./'));
});

gulp.task('html', function () {
    var target = gulp.src('local/index.html');
    var css_js = gulp.src(['fiddle.+(js|css)'], {read: false});
    var html = gulp.src(['fiddle.html']);
    return target
        .pipe(inject(css_js))
        .pipe(inject(html, {
            transform: function (filepath, file) {
                return file.contents.toString();
            }
        })).pipe(gulp.dest('.'));
});

gulp.task('serve', ['html', 'less', 'sass'], function () {
    gulp.src('.').pipe(webserver({
        livereload: true,
        open: true
    }));
});

gulp.task('watch', function () {
    gulp.watch('fiddle.less', ['less']);
    gulp.watch('fiddle.+(sass|scss)', ['sass']);
    gulp.watch('fiddle.html', ['html']);
});

gulp.task('default', ['serve', 'watch']);