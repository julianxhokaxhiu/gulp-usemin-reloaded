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

var jsdom = require('jsdom'),
    $ = require('jquery')( jsdom.jsdom().parentWindow ),
    gulpUtil = require('gulp-util'),
    through = require('through'),
    XRegExp = require('xregexp').XRegExp,
    Buffer = require('buffer').Buffer,
    // Native NodeJS
    util = require('util'),
    path = require('path'),
    fs = require('fs'),
    EOL = require('os').EOL;

// Plugin level function(dealing with files)
module.exports = function (options) {

    var forEachFile = function (file) {
        var parseHtml = function (html) {
            var ret = [],
                $html = $( $.parseHTML( html.replace(/(?:\r\n|\r|\n)/g,''), true ) ),
                rules = XRegExp.build(
                    '({{action}}) # build \n\
                    (?:\\:({{context}}))? # css \n\
                    (?:\\s+({{outPath}}))? # path/to/dest.ext \n\
                    (?:\\s+\\[({{attrs}})\\])? # [media="screen"]',
                    {
                        action: /[a-zA-Z0-9]+/,
                        context: /[a-zA-Z0-9]+/,
                        outPath: /[a-zA-Z0-9\.\/\-\_]+/,
                        attrs: /[a-zA-Z0-9\=\-\"\s+]+/
                    },
                    'x'
                ),
                tmp = {};

                $html
                .each( function (i,el) {
                    if ( el.nodeName == '#comment' ) {
                        if ( el.textContent.trim().indexOf('end') == 0 ) {
                            if ( Object.keys(tmp).length ) {
                                tmp['endTag'] = el.textContent;
                                ret.push( tmp );
                            }
                            tmp = {};
                        } else {
                            var res = XRegExp.exec( el.textContent, rules );
                            if ( res.length ) {
                                if ( res.action ) tmp['action'] = res.action;
                                if ( res.context ) tmp['context'] = res.context;
                                if ( res.outPath ) tmp['outPath'] = res.outPath;
                                if ( res.attrs ) tmp['attrs'] = res.attrs;
                                tmp['nodes'] = [];
                                tmp['startTag'] = el.textContent;
                            }
                        }
                    } else {
                        var tag = {
                                '_tagName' : el.nodeName.toLowerCase()
                            };
                        for ( var i in el.attributes ) {
                            var attr = el.attributes[i];
                            if ( (attr.name && attr.name > '') || (attr.value && attr.value > '') )
                                tag[attr.name] = attr.value;
                        }
                        if (!tmp['nodes']) {
                            tmp['nodes'] = [];
                        }
                        tmp['nodes'].push( tag );
                    }
                })

                return ret;
            },
            useMin = function ( content ) {
                var parsed = parseHtml( content );

                for( var i in parsed ) {
                    var obj = parsed[i];

                    if ( obj) {
                        if ( obj.nodes )
                            obj['files'] = obj.nodes.map( function (node) {
                                var filePath = path.join( options.basePath, node.href || node.src );

                                return new gulpUtil.File({
                                    path: filePath,
                                    contents: fs.readFileSync(filePath)
                                });
                            })
                    }
                }

                return processTasks( parsed, content );
            },
            processTasks = function ( parsed, content ) {
                var that = this,
                    ret = content;

                for ( var i in parsed ) {
                    var obj = parsed[i];

                    if ( obj && obj.action && obj.context ) {
                        var tasks = options.rules[obj.action][obj.context];

                        if ( $.isFunction( tasks ) ) {
                            // Callback freedom for the user
                            var custom = tasks( obj, content );
                            ret = finalizeRule( obj, custom, ret );
                        } else if ( $.isArray( tasks ) ) {
                            // Concat all the files if the user didn't already request that
                            if (tasks.indexOf('concat') == -1)
                                tasks.unshift('concat');
                            // Stream tasks, we have to handle them
                            processStream( 0, tasks, obj['files'], obj.outPath, function (files){
                                for ( var i in files ) {
                                    var file = files[i];
                                    that.emit( 'data', file );

                                    obj.outPath = file.relative;
                                    ret = finalizeRule( obj, null, ret );
                                };
                            });
                        }
                    }
                }

                return ret;
            }.bind(this),
            processStream = function ( index, tasks, files, outPath, callback ) {
                var newFiles = [],
                    task = tasks[index],
                    save = function (file) {
                        newFiles.push(file);
                    };

                if ( task == 'concat' ) {
                    newFiles = [concat(files, outPath)];
                } else {
                    task.on( 'data', save );
                    files.forEach( function (file) {
                        task.write(file);
                    });
                    task.removeListener( 'data', save );
                }

                if ( tasks[++index] )
                    processStream( index, tasks, newFiles, outPath, callback );
                else {
                    callback( newFiles );
                    this.resume();
                }
            }.bind(this),
            concat = function (files, outPath) {
                var buffer = [];

                files.forEach(function(file) {
                    buffer.push(String(file.contents));
                });

                return new gulpUtil.File({
                    path: outPath,
                    contents: new Buffer( buffer.join(EOL) )
                });
            },
            finalizeRule = function ( obj, custom, content ) {
                var ret = content,
                    ruleRegExp = XRegExp.build(
                        '(<!--{{start}}-->[a-zA-Z0-9_\\-<>"\\s+\\/\\.=]+<!--{{end}}-->)',
                        {
                            start: obj.startTag.replace('[','\\[').replace(']','\\]'),
                            end: obj.endTag
                        }
                    );

                if ( custom == null ) {
                    var tag = obj.nodes[0]._tagName
                        startTag = '<' + tag + ' ',
                        srcAttr = (tag == 'script' ? 'src' : 'href'),
                        customAttrs = ( obj.attrs ? ' ' + obj.attrs + ' ' : '' )
                        endTag = (tag == 'script' ? '></script>' : '/>');

                    custom = startTag + srcAttr + '="' + obj.outPath + '"' + customAttrs + endTag
                }

                ret = XRegExp.replace( content, ruleRegExp, custom );

                return ret;
            },
            fileName = file.relative,
            content = file.contents.toString(),
            error = null,
            ret = '';

            // Save the basePath for later
            options.basePath = file.base;

            this.pause();
            // It's a kind of magic... ♪
            ret = useMin( content );

            if ( ret ) {
                var outFile = new gulpUtil.File({
                    base: file.base,
                    contents: new Buffer( ret ),
                    cwd: file.cwd,
                    path: path.join(file.base, fileName)
                });

                this.emit( 'data', outFile );
            } else {
                this.emit( 'error', new gulpUtil.PluginError(PLUGIN_NAME, error) );
            }
        },
        beforeEnd = function() {
            this.emit( 'end' );
        };

    // Check if at least a destionation directory have been given
    options = $.extend( true, {
        rules: {
            build: {
                remove: function( object, content ) {
                    return '';
                }
            }
        }
    }, options );

    return through( forEachFile, beforeEnd );
};
