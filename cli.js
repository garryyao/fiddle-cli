#!/usr/bin/env node
'use strict';

const Promise = require('bluebird');
const shelljs = require('shelljs');
const colour = require('colour');
var fs = Promise.promisifyAll(require('fs-extra'));
var path = require('path');
var partial_right = require('lodash/partialRight');
var util = require('util');
var program = require('commander');
const exec_loud = Promise.promisify(shelljs.exec, {multiArgs:1});
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

function error(msg) {
    console.error('[error]'.error, msg);
}

function info(msg) {
    console.log('[ok]'.info, msg);
}

function echo(msg) {
    console.log('[>]'.data, msg);
}

function farm(name) {
  // the list of fiddle files to create
  const dir = path.resolve(__dirname, `templates/${name}`);
  return fs.copySync(dir, '.', {
    filter: function(file) {
      const local_file = path.relative(dir, file);
      const local_file_exists = fs.existsSync(local_file);
      if (!local_file_exists) {
        echo(`Adding ${local_file}`);
      }
      return !local_file_exists;
    }
  });
}

const gist_url = Promise.coroutine(function* () {
    const [, out] = yield exec('git remote -v');
    const match = out.match(GIST_REGEX);
    if (!match) {
        return null;
    }
    return match[0];
});

const gist_id = Promise.coroutine(function* () {
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

var init = program.command('init <sub> [others...]')
  .description('generate a local fiddle with fiddle files')
  .option('-v, --prompt', '("jsfiddle" sub only) verbose mode ask more about JSFiddle details')
  .action(Promise.coroutine(function* init() {
    const subs = Array.from(arguments).filter(arg => {
      return typeof arg === 'string' && arg;
    });
    //console.log(subs);
    subs.forEach(sub => {
      const verb = 'action_' + sub;
      if (this[verb]) {
        this[verb]();
        info(`created files for sub: ${sub}`);
      } else {
        error(`sorry, unknown sub: ${sub}`);
      }
    });

    // check for necessary npm install call
    const stat = yield fs.statAsync('./package.json');
    const diff = Date.now() - Date.parse(stat.mtime);
    if (diff < 1e3) {
      yield exec_loud('npm i -q');
    }
  }));

/**
 * scaffolding a jsfiddle repo
 */
init.action_jsfiddle = function() {
  farm('jsfiddle');

  // we're to harvest more manifest options from cli prompts.
  if (this.prompt) {
    const yaml = require('yamljs');
    const prompt = require('prompt');
    prompt.start();
    prompt.get(require('./assets/manifest'), function(err, result) {
      if (err) {
        console.log('terminated on error');
        process.exit(1);
      }
      fs.writeFileSync('fiddle.manifest', yaml.stringify(result));
    });
  }
}

/**
 * scaffolding an ES6(Babel+Webpack) repo
 */
init.action_babel = farm.bind(farm, 'babel_webpack');

/**
 * scaffolding an ES6(Babel+Webpack) with SASS loader repo
 */
init.action_babel_sass = farm.bind(farm, 'babel_sass_webpack');

program.command('clone [link]')
    .description('clone from an existing public JSFiddle link')
    .action(Promise.coroutine(function* (link) {
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
    .action(Promise.coroutine(function* () {
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


