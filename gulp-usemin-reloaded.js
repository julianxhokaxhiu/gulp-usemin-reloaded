/*
	The MIT License (MIT)

	Copyright (c) 2014 Julian Xhokaxhiu

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

const PLUGIN_NAME = 'gulp-usemin-reloaded';

var gulpUtil = require('gulp-util'),
	through = require('through'),
	path = require('path'),
	XRegExp = require('xregexp').XRegExp,
	Buffer = require('buffer').Buffer,
	jsdom = require('jsdom'),
	$ = require('jquery')( jsdom.jsdom().parentWindow ),
	util = require('util');

// Plugin level function(dealing with files)
module.exports = function (options) {

	// This will live our array of files
	var files = [],
		parseHtml = function (html) {
            var ret = [],
                $html = $( $.parseHTML( html.replace(/(?:\r\n|\r|\n)/g,''), true ) ),
                actions = XRegExp.build('({{action}})(?:\:({{context}}))?(?:\s+({{outpath}}))?', {
                	action: /[a-zA-Z0-9]+/,
                	context: /[a-zA-Z0-9]+/,
                	outpath: /[a-zA-Z0-9\.\/]+/
                }, 'x'),
                tmp = {};

            $html
            .each( function (i,el) {
                if ( el.nodeName == '#comment' ) {
                	if ( el.textContent.indexOf('end') == -1 ) {
                		var res = XRegExp.exec( el.textContent, actions );
                		if ( res.action ) tmp['action'] = res.action;
                		if ( res.context ) tmp['context'] = res.context;
                		if ( res.outpath ) tmp['outpath'] = res.outpath;
                		tmp['nodes'] = [];
                	} else {
                		ret.push( tmp );
                		tmp = {};
                	}
                } else {
                	var tag = {},
                		key = el.nodeName.toLowerCase();
                	tag[key] = {};
                	for ( var i in el.attributes ) {
                		var attr = el.attributes[i];
                		if ( (attr.name && attr.name > '') || (attr.value && attr.value > '') )
                			tag[key][attr.name] = attr.value;
                	}
                	tmp['nodes'].push( tag );
                }
            })

            return ret;
        }
		forEachFile = function (file) {
			files.push( file );
		},
		beforeEnd = function() {
			var fileContents = {},
				filePaths = files.map(function(file){
					fileContents[file.relative] = file.contents.toString();

					return file.path;
				}),
				firstFile = files[0],
				callback = function ( error, data ) {
					if ( data ) {
						var outFile = new gulpUtil.File({
							base: firstFile.base,
							contents: new Buffer( data ),
							cwd: firstFile.cwd,
							path: path.join(firstFile.base, options.fileName)
						});

						this.emit( 'data', outFile );
						this.emit( 'end' );
					} else {
						this.emit( 'error', new gulpUtil.PluginError(PLUGIN_NAME, error) );
					}
				}.bind( this );

				// Run the UseMin tokenizer processor
				$.each( fileContents, function ( fileName, content ) {
					var ret = parseHtml( content );
					console.log(
						fileName,
						util.inspect( ret, {
							depth: null,
							colors: true
						})
					);
				});
		};

	return through( forEachFile, beforeEnd );
};