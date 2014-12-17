gulp-usemin-reloaded
====================

A better usemin.

# Why?
Once I've begun to develop using Gulp tasks and plugins, I've discovered that a lot of them are done in a really crappy way. The feature itself is cool but the code is unmanageable in the future. So, this is my effort to bring a better usemin with a cleaner logic and extensibility, but also proving a retrocompatibility layer with all existing usemin projects.

# Features
- Full [UseMin](https://github.com/zont/gulp-usemin) compatible.
- Extensible through callbacks (you do what you want with your own rules)
- Extensible rules (why stick only with `build:something` when you can write `myrule:context`?)
- Gulp Vinyl Stream compatible using [gulp-through](https://github.com/mgcrea/gulp-through)

# Documentation

## Rules
As you already know there are some standard rules that usemin tasks were using like `build:css`, `build:js` or `build:remove`. With this plugin we're going to extend those by using a more generic approach:

`action:context outputPath [attributes]`

where
- `action` is the name of your own task (i.e. `build`)
- `context` is the tag to recognize your task (i.e. `css`)
- `outputPath` is where you want this to be saved, relative to your `gulp.dest` path (i.e. `css/screen.css`)
- `[attributes]` are tha HTML attributes to append to the output tag that will be replaced (i.e. `media="screen"`)

## Callback
Usually usemin does everything out-of-the-box by itself, but since we're going to have custom Rules, we're also going to have custom callbacks to manage them. It's really simple to do that when you declare this plugin in your own `gulpfile.js`.

```javascript
var usemin = require('gulp-usemin-reloaded');

.pipe(
    usemin({
        rules: {
            build: {
                css: [minifyCss(), 'concat'],
                js: [uglify(), rev()],
                html: [minifyHtml({empty: true})],
                remove: function( object, content ) {
                    return '';
                }
            }
        }
    })
)
```

In this case the `remove` task (aka `context`) is declared as a callback.

as **INPUT** parameters you have:
- `object` is the parsed object of the current task rule (aka 'action`). It's a dictionary containing all the parsed HTML as a lookup dictionary.
- `content` is the current evaluated content that can be manipulated directly from the callback.

as **OUTPUT** it expect the handled content, in this case an empty string (we want to discard everything that is between `<!-- build:remove -->` and `<!-- endbuild -->`.

You can declare as many _actions_ and _contexts_ you like. Their value can be:
- `array` of other tasks to be run
- `callback` as described

## Object
Of course the whole refactory is based on one logic. Every HTML tag is parsed as a dictionary and could be read and/or extend with different values. This is an example on how it will look like:

**HTML**
```html
<!-- build:remove -->
<script src="js/null.js"></script>
<!-- endbuild -->
```

**DICTIONARY**
```javascript
{
    action: 'build',
    context: 'remove',
    nodes: [
        {
            _tagName: 'script',
            src: 'js/null.js'
        }
    ],
    startTag: 'build: remove',
    endTag: 'endbuild',
    files: [
        // List of Vinyl INPUT Files ( src/href for each HTML tag )
    ]
}
```

## License

See [LICENSE](https://github.com/julianxhokaxhiu/gulp-usemin-reloaded/blob/master/LICENSE) file.