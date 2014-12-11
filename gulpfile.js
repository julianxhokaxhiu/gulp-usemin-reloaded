var gulp = require('gulp'),
	usemin = require('./gulp-usemin-reloaded'),
	uglify = require('gulp-uglify'),
	minifyHtml = require('gulp-minify-html'),
	minifyCss = require('gulp-minify-css'),
	rev = require('gulp-rev');

gulp.task('test', function() {
	return gulp
	.src( 'test/in/*.html' )
	.pipe(
		usemin({
			rules: {
				build: {
					css: [minifyCss(), 'concat'],
					js: [uglify(), rev()],
					html: [minifyHtml({empty: true})]
				}
			}
		})
	)
	.pipe(
		gulp.dest( 'test/out/' )
	);
});

gulp.task( 'default', [
	'test'
]);