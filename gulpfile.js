var gulp = require('gulp'),
	usemin = require('./gulp-usemin-reloaded');

gulp.task('test', function() {
	return gulp
	.src( 'test/*.html' )
	.pipe(
		usemin()
	);
});

gulp.task( 'default', [
	'test'
]);