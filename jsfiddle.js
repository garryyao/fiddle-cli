/* export JSFiddle content */
var casper = require('casper').create();
casper.start(casper.cli.args[0], function () {
    casper.withFrame(0, function () {
        this.echo(this.getHTML(''));
    });
});
casper.run();