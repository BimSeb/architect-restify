/*jslint node : true, nomen: true, plusplus: true, vars: true, eqeq: true,*/
/* 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
"use strict";
var fs = require('fs');
var net = require('net');
var restify = require('restify');

var DEFAULT_PLUGINS = {
    queryParser: {
        mapParams: false
    },
    bodyParser: {
        mapParams: false
    },
    gzipResponse:  {}
};

function registerPlugins(server, plugins) {
    Object.keys(DEFAULT_PLUGINS).forEach(function (name) {
        server.use(restify[name](plugins[name]));
    });
    Object.keys(plugins || {}).forEach(function (name) {
        if (restify[name]) {
            server.use(restify[name](plugins[name]));
        } else {
            server.use(plugins[name]());
        }
    });
}
module.exports = function startup(options, imports, register) {

    var config = {
        name: options.name ||  'restify-server',
        version: options.version || '0.0.1'
    };

    var server = restify.createServer(config);
    server.use(restify.acceptParser(server.acceptable));

    registerPlugins(server, options.plugins || {});

    function listenCb(err) {
        if (err) {
            return register(err);
        }
        register(null, {
            onDestruct: function (callback) {
                server.close(callback);
            },
            rest: server
        });
    }

    server.once('listening', listenCb);

    if (options.socket) {
        server.listen(options.socket);
        // double-check EADDRINUSE
        server.on('error', function (e) {
            if (e.code !== 'EADDRINUSE') {
                register(e);
            }
            net.connect({
                path: options.socket
            }, function () {
                // really in use: re-throw
                register(e);
            }).on('error', function (e) {
                if (e.code !== 'ECONNREFUSED') {
                    register(e);
                }
                // not in use: delete it and re-listen
                fs.unlinkSync(options.socket);
                server.listen(options.socket);
            });
        });
        return;
    }

    server.listen(options.port, options.host || "0.0.0.0");
};