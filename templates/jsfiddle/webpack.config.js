'use strict';

const lib_excludes = /(node_modules|bower_components)/;
const fs = require('fs');
const path = require('path');

function check_ext() {
    return Array.from(arguments).find(function (ext) {
        try {
            fs.accessSync('./fiddle.' + ext, fs.R_OK | fs.W_OK);
            return 1;
        } catch (e) {
            return 0;
        }
    });
}

const ts_ext = check_ext('ts', 'tsx');
const jsx_ext = check_ext('jsx');
const coffee_ext = check_ext('coffee');
const js_ext = ts_ext || jsx_ext || coffee_ext || 'js';
const script_loader = ts_ext ? 'ts-loader' : jsx_ext ? 'babel' : coffee_ext ? 'coffee-loader' : 'script-loader';

const sass_ext = check_ext('sass', 'scss');
const less_ext = check_ext('less');
const css_ext = sass_ext || less_ext || 'css';
const style_loader = 'css' + (sass_ext ? '!sass' : less_ext ? '!less' : '');

const jade_ext = check_ext('jade');
const markdown_ext = check_ext('md');
const html_ext = jade_ext || markdown_ext || 'html';
const markup_loader = 'html' + (jade_ext ? '!jade-html-loader' : markdown_ext ? '!markdown' : '');

const ExtractTextPlugin = require("extract-text-webpack-plugin");
const HtmlWebpackPlugin = require('html-webpack-plugin');
const css_extract = new ExtractTextPlugin("[name].css", {allChunks: true});
const html_extract = new ExtractTextPlugin("[name].html", {allChunks: true});
module.exports = {
    entry: {
        fiddle: ['./fiddle.' + js_ext]
    },
    output: {
        path: path.resolve(__dirname, '.'),
        publicPath: '/',
        filename: '[name].js'
    },
    module: {
        loaders: [{
            test: new RegExp('\\.' + js_ext + '$'),
            exclude: lib_excludes,
            loader: script_loader
        }, {
            test: new RegExp('\\.' + css_ext + '$'),
            exclude: lib_excludes,
            loader: css_extract.extract(style_loader)
        }, {
            test: new RegExp('\\.' + html_ext + '$'),
            exclude: /index\.*/,
            loader: html_extract.extract(markup_loader)
        }]
    },
    plugins: [
        css_extract,
        html_extract,
        new HtmlWebpackPlugin({
            template: 'html!jade-html-loader!./index.jade',
            inject: 'head',
            cache: true
        })
    ]
};
