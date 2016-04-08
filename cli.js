#!/usr/bin/env node --harmony-destructuring
'use strict';

const shelljs = require('shelljs');
const colour = require('colour');
const co = require('co');
const denodeify = require('denodeify');
var fs = require('fs-extra');
var path = require('path');
var partial_right = require('lodash/partialRight');
var util = require('util');
var program = require('commander');
const exec_loud = denodeify(shelljs.exec, function done(code, stdout, stderr) {
    // yield a triple of exec
    return [null, [code, stdout, stderr]];
});
const exec = partial_right(exec_loud, {silent: true});
const open = require('open');
const GIST_REGEX = /https:\/\/(?:gist\.github\.com).+?\b([\w\d]+?)(?:\b|$)/;


colour.setTheme({
    prompt: 'grey',
    info: 'green',
    data: 'grey',
    warn: ['yellow', 'underline'],
    error: 'red'
});

function exit(msg) {
    console.error('[error]'.error, msg);
    process.exit();
}

function info(msg) {
    console.log('[ok]'.info, msg);
}

function echo(msg) {
    console.log('[>]'.data, msg);
}

const gist_url = co.wrap(function* () {
    const [, out] = yield exec('git remote -v');
    const match = out.match(GIST_REGEX);
    if (!match) {
        return null;
    }
    return match[0];
});

const gist_id = co.wrap(function* () {
    const url = yield gist_url();
    if (!url) {
        return null;
    }
    const match = url.match(GIST_REGEX);
    const [, gist_id] = match;
    return gist_id;
});


// Describe CLI arguments
program.version('0.0.1').usage('<command> [options]');

var init = program.command('init');

init.description('generate a local fiddle with fiddle files')
    .option('-v, --prompt', 'verbose mode ask more about JSFiddle details')
    .action(co.wrap(function* () {
        // the list of fiddle files to create
        fs.copySync(path.resolve(__dirname, 'templates/'), '.');

        // we're to harvest more manifest options from cli prompts.
        if (init.prompt) {
            const yaml = require('yamljs');
            const prompt = require('prompt');
            prompt.start();
            prompt.get(require('./assets/manifest'), function (err, result) {
                if (err) {
                    console.log('terminated on error');
                    process.exit(1);
                }
                fs.writeFileSync('fiddle.manifest', yaml.stringify(result));
            });
        }

        yield exec_loud('npm i');
    }));

program.command('clone [link]')
    .description('clone from an existing public JSFiddle link')
    .action(co.wrap(function* (link) {
        if(!/jsfiddle\.net\/[^/]+?\/[^/]+?\/?$/.test(link)) {
            exit('unexpected JSFiddle link, e.g. http://jsfiddle.net/garryyao/bT4Lc/');
        }

        const casper_cmd = [
            'casperjs',
            path.resolve(__dirname, 'jsfiddle.js'),
            link.replace(/\/$/, '') + '/show'
        ].join(' ');
        const [, html] = yield exec(casper_cmd);
        const $ = require("cheerio").load(html);
        const fiddle = {
            js: $('script').text().match(/\/\/<\!\[CDATA\[([\w\W]+)\/\/\]\]>/)[1].trim(),
            html: $('body').html().trim(),
            css: $('style').text().trim()
        };

        const files = [];
        function remember(filename) {
            files.push(filename);
            return filename;
        }

        if (fiddle.html) {
            fs.writeFileSync(remember('fiddle.html'), fiddle.html);
        }

        if (fiddle.css) {
            fs.writeFileSync(remember('fiddle.css'), fiddle.css);
        }

        if (fiddle.js) {
            fs.writeFileSync(remember('fiddle.js'), fiddle.js);
        }

        info(`${files.length} fiddles cloned: ${files.join(',')}`);
    }));

program.command('publish')
    .description('create a public gist for this fiddle in your Github account')
    .action(function () {
        co(function*() {
            let [code] = yield exec('git status');
            if (!code) {
                const [,out] = yield exec('git remote -v');
                if (GIST_REGEX.test(out)) {
                    echo('working copy is already a gist repo, just to commit and push your files');
                    process.exit();
                }
            } else {
                exec('git init');
            }

            // not yet a GIST repo

            // check cli "gist" is available
            let [,out] = yield exec('which gist');
            if (!out) {
                return exit('install "gist" is required (http://defunkt.io/gist/) ');
            }

            info('creating gist...');

            // upload only fiddle files to the gist
            const [, ret] = yield exec('gist fiddle.*');
            if (!GIST_REGEX.test(ret)) {
                return exit('failed to create GIST:\n'+ ret);
            }

            const gist_url = ret.trim();
            yield exec(`git remote add origin ${gist_url}`);
            yield exec('git push origin master');
            info(`created public gist: ${gist_url}`);
        });
    });

program.command('open')
    .description('open fiddle files from this gist on JSFiddle')
    .action(co.wrap(function* () {
        const url = yield gist_url();
        if (!url) {
            exit('working copy is not yet a gist, try to run "fiddle publish" first.');
        }
        open(url);
    }));

program.command('run')
    .description('open fiddle files from this gist on JSFiddle')
    .action(function () {
        co(function*() {
            const id = yield gist_id();
            if(!id) {
                exit('JSFiddle run requires a gist, try to run "fiddle publish" first.');
            }
            open(`http://jsfiddle.net/gh/gist/library/pure/${id}/`);
        });
    });

program.parse(process.argv);

if (process.argv.length < 3) {
    program.help();
    process.exit(1);
}


