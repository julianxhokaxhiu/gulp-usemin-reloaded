var gulp = require('gulp'),
	usemin = require('./gulp-usemin-reloaded');

gulp.task('test', function() {
	return gulp
	.src( 'test/in/*.html' )
	.pipe(
		usemin()
	)
	.pipe(
		gulp.dest( 'test/out/' )
	);
});

gulp.task( 'default', [
	'test'
]);