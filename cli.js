#!/usr/bin/env node
require('shelljs/global');

var fs = require('fs-extra');
var path = require('path');
var util = require('util');
var program = require('commander');


// Describe CLI arguments
program.version('0.0.1').usage('<command> [options]');

var init = program.command('init');

init.description('generate a local fiddle with all skeleton files')
    .option('-p, --prompt', 'provide more details for JSFiddle')
    .action(function () {
        // the list of fiddle files to create
        fs.copySync(path.resolve(__dirname, 'templates/'), '.');
        fs.copySync(path.resolve(__dirname, 'templates/._gitignore'), '.gitignore');

        // we're to harvest more manifest options from cli prompts.
        if (init.prompt) {
            (function () {
                var yaml = require('yamljs');
                var prompt = require('prompt');
                prompt.start();
                prompt.get(require('./assets/manifest'), function (err, result) {
                    if (err) {
                        console.log('terminated on error');
                        process.exit(1);
                    }
                    fs.writeFileSync('fiddle.manifest', yaml.stringify(result));
                });
            })();
        }
    });

var SILENCE = {silent: true};
program.command('gist')
    .description('create this fiddle as a gist in your Github account')
    .action(function () {
        exec('git status', SILENCE, function (code) {
            if (!code) {
                console.error('terminated: already a git (possibly gist) repository');
                process.exit(1);
            }
            exec('gist -h', SILENCE, function (code) {
                if (code) {
                    console.error('terminated: gist is required (http://defunkt.io/gist/) ');
                    process.exit(1);
                }
                console.log('creating gist...');
                exec('gist fiddle.*', function (code, gist_url) {
                    if (code) {
                        console.error('terminated: failed to create gist');
                        process.exit(1);
                    }
                    gist_url = gist_url.trim();
                    exec('git init');
                    exec(util.format('git remote add origin %s', gist_url));
                    exec('git clean -f -d');
                    exec('git pull origin master');
                    console.log('created gist %s', gist_url);
                })
            });
        });
    });

var URL_REGEX = /(?:gist\.github\.com).+?\b([\w\d]+?)(?:\b|$)/;
var browse = program.command('browse [gist|fiddle]');
browse
    .description('browse local Fiddle as Gist/JSFiddle')
    .option('-f, --framework [name]', 'load JSFiddle with the specified framework [name]')
    .option('-v, --ver [version]', 'load JSFiddle with the specified version of the framework')
    .action(function (type) {
        var open = require('open');
        exec('git remote -v', SILENCE, function (code, output) {
            var matches = output.match(URL_REGEX);
            if (!matches) {
                console.error('terminated: not a gist repository');
                process.exit(1);
            }
            var gist_id = matches[1];
            switch (type) {
                case 'gist':
                    open(util.format('https://gist.github.com/%s', gist_id));
                    break;
                case 'jsfiddle':
                    if (browse.framework && !browse.ver) {
                        console.error('terminated: [version] -v is required when [framework] -f specified');
                        process.exit(1);
                    }
                    open(util.format('http://jsfiddle.net/gh/gist/%s/%s/%s/', browse.framework || 'library', browse.ver || 'pure', gist_id));
            }
        })
    });

program.parse(process.argv);

if (process.argv.length < 3) {
    program.help();
    process.exit(1);
}


