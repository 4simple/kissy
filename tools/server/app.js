/*jshint camelcase:false*/
var path = require('path');
var fs = require('fs');
//noinspection JSUnresolvedVariable
var cwd = process.cwd();
//noinspection JSUnresolvedVariable
var currentDir = __dirname;
var serverConfig = JSON.parse(fs.readFileSync(currentDir + '/server.json'));
var debug = require('debug')('kissy');

function startServer(port) {
    var express = require('express');
    var app = express();

    app.set('view engine', 'html');
    app.set('views', path.join(__dirname, 'views'));
    app.engine('html', require('../../lib/xtemplate').__express);

    var domain = require('domain');

    app.use(function (req, res, next) {
        var d = domain.create();

        //监听domain的错误事件
        d.on('error', function (err) {
            debug(err);
            res.render('err', {
                err: err && err.stack
            });
            d.dispose();
        });

        d.add(req);
        d.add(res);
        d.run(next);
    });

    app.use(express.favicon());
    app.use(express.compress());
    //noinspection JSUnresolvedFunction
    app.use(express.cookieParser());
    //noinspection JSUnresolvedFunction
    app.use(express.bodyParser());

    // combo
    app.use('/kissy/', require('./middleware/combo'));

    app.use('/kissy/', require('./middleware/coverage-runner'));

    app.use('/kissy/', require('./middleware/test-runner'));

    // list and process jss
    app.use('/kissy/', require('./middleware/serve'));

    //noinspection JSUnresolvedFunction
    app.use('/kissy/', express['static'](cwd));

    app.use(app.router);

    app.use(express.errorHandler());

    app.get('/throw-i', function (req, res) {
        if (Math.random() > 0.5) {
            throw new Error('haha i');
        } else {
            res.send('haha');
        }
    });

    app.get('/throw', function (req, res) {
        if (Math.random() > 0.5) {
            setTimeout(function () {
                throw new Error('haha');
            }, 1000).unref();
        } else {
            res.send('haha');
        }
    });

    app.get('/exit', function () {
        process.exit(0);
    });

    app.get('/', function (req, res) {
        //noinspection JSUnresolvedFunction
        res.redirect('/kissy/');
    });

    app.get(/\/kissy$/, function (req, res) {
        //noinspection JSUnresolvedFunction
        res.redirect('/kissy/');
    });

    require('./router/docs')(app);

    require('./router/sync')(app);

    app.get('/crossdomain.xml', function (req, res) {
        res.set('content-type', 'text/xml');
        res.send('<cross-domain-policy>' +
            '<allow-access-from domain="*"/>' +
            '</cross-domain-policy>');
    });

    require('./router/send-coverage')(app);

    var codes = require('../test/tc.js')();

    app.get('/kissy/test', function (req, res) {
        res.render('test', {
            tests: codes
        });
    });

    app.listen(port);
}

serverConfig.ports.forEach(function (port) {
    startServer(port);
});