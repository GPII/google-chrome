/*
 * Copyright The UIO+ for Morphic copyright holders
 * See the AUTHORS.md file at the top-level directory of this distribution and at
 * https://github.com/GPII/gpii-chrome-extension/blob/master/AUTHORS.md
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this license.
 *
 * You may obtain a copy of the license at
 * https://github.com/GPII/gpii-chrome-extension/blob/master/LICENSE.txt
 */

/* eslint-env node */
/* global require */

"use strict";

var fluid = require("infusion");
var jqUnit = fluid.require("node-jqunit", require, "jqUnit");
var WebSocketServer = require("ws").Server;

var gpii = fluid.registerNamespace("gpii");

require("../../src/js/background/wsConnector.js");

fluid.defaults("gpii.chrome.tests.wsConnector.server", {
    gradeNames: "fluid.modelComponent",
    port: 8083,
    members: {
        socket: null,
        allowedClients: ["gpii.chrome.tests"]
    },
    model: {
        clientSocket: null,
        settings: {}
    },
    events: {
        onConnectionRequest: null,
        onConnectionRequestDone: null,
        onMessage: null,
        onAllowed: null,
        onRejected: null
    },
    invokers: {
        populate: {
            funcName: "gpii.chrome.tests.wsConnector.server.populate",
            args: ["{that}"]
        },
        updateSettings: {
            changePath: "settings",
            value: "{arguments}.0",
            source: "updateSettings"
        },
        stop: {
            funcName: "gpii.chrome.tests.wsConnector.server.stop",
            args: "{that}"
        },
        closeClient: {
            funcName: "gpii.chrome.tests.wsConnector.server.closeClient",
            args: "{that}"
        },
        banClient: {
            funcName: "gpii.chrome.tests.wsConnector.server.banClient",
            args: ["{that}", "{arguments}.0"]
        },
        allowClient: {
            funcName: "gpii.chrome.tests.wsConnector.server.allowClient",
            args: ["{that}", "{arguments}.0"]
        },
        broadcastMessage: {
            funcName: "gpii.chrome.tests.wsConnector.server.broadcastMessage",
            args: ["{that}", "{arguments}.0", "{arguments}.1"]
        }
    },
    listeners: {
        "onCreate.populate": "{server}.populate",
        "onConnectionRequest.setupClient": {
            funcName: "gpii.chrome.tests.wsConnector.server.setupClient",
            args: ["{that}", "{arguments}.0"]
        },
        "onMessage.processMessage": {
            funcName: "gpii.chrome.tests.wsConnector.server.processMessage",
            args: ["{that}", "{arguments}.0"]
        }
    },
    modelListeners: {
        "settings": {
            func: "{that}.broadcastMessage",
            args: ["onSettingsChanged", "{change}.value"],
            namespace: "broadcastSettings",
            excludeSource: ["init"]
        }
    }
});


gpii.chrome.tests.wsConnector.server.allowClient = function (that, solutionId) {
    that.allowedClients.push(solutionId);
};

gpii.chrome.tests.wsConnector.server.banClient = function (that, solutionId) {
    var index = that.allowedClients.indexOf(solutionId);
    if (index > -1) {
        that.allowedClients.splice(index, 1);
    };
};

gpii.chrome.tests.wsConnector.server.stop = function (that) {
    that.socket.close();
};

gpii.chrome.tests.wsConnector.server.closeClient = function (that) {
    that.model.clientSocket.close();
};

gpii.chrome.tests.wsConnector.server.processMessage = function (that, message) {
    var msg = JSON.parse(message);
    if ((msg.type === "connect") && (msg.payload)) {
        var isAllowed = that.allowedClients.indexOf(msg.payload.solutionId);
        if (isAllowed > -1) {
            var response = {
                type: "connectionSucceeded",
                payload: that.model.settings
            };
            that.model.clientSocket.send(JSON.stringify(response));
        } else {
            var errMsg = "Rejecting a connection request from '" + msg.payload.solutionId +
                      "'. The solution id was not found in the solutions registry";
            var err = {
                isError: true,
                message: errMsg
            };
            that.model.clientSocket.send(JSON.stringify(err));
        }
    }
};

gpii.chrome.tests.wsConnector.server.setupClient = function (that, client) {
    that.applier.change("clientSocket", client);
    client.on("message", that.events.onMessage.fire);
};

gpii.chrome.tests.wsConnector.server.broadcastMessage = function (that, type, settings) {
    var msg = {
        type: type,
        payload: settings
    };
    if (that.model.clientSocket) {
        that.model.clientSocket.send(JSON.stringify(msg));
    }
};

gpii.chrome.tests.wsConnector.server.populate = function (that) {
    that.socket = new WebSocketServer({port: that.options.port});
    that.socket.on("connection", that.events.onConnectionRequest.fire);
};

fluid.defaults("gpii.chrome.tests.wsConnector", {
    gradeNames: ["fluid.test.testEnvironment"],
    components: {
        tester: {
            type: "gpii.chrome.tests.wsConnector.tester"
        }
    }
});

fluid.defaults("gpii.chrome.tests.wsConnector.tester", {
    gradeNames: ["fluid.test.testCaseHolder"],
    payloads: {
        test1: {
            connectPayload: {
                type: "connect",
                payload: {
                    solutionId: "gpii.chrome.tests"
                }
            },
            settings: {
                highContrastEnabled: true,
                highContrastTheme: "white-black",
                magnifierEnabled: true,
                magnification: 2
            }
        },
        test2: {
            connectPayload: {
                type: "connect",
                payload: {
                    solutionId: "gpii.chrome.tests2"
                }
            },
            settings: {
                highContrastEnabled: true,
                highContrastTheme: "white-black",
                magnifierEnabled: true,
                magnification: 2
            }
        },
        test3: {
            connectPayload: {
                type: "connect",
                payload: {
                    solutionId: "gpii.chrome.tests3"
                }
            },
            settings: {
                highContrastEnabled: true,
                highContrastTheme: "white-black",
                magnifierEnabled: true,
                magnification: 2
            }
        }
    },
    components: {
        clientOne: {
            type: "gpii.wsConnector",
            options: {
                solutionId: "gpii.chrome.tests",
                flowManager: "ws://localhost:8083",
                retryTime: 1
            }
        },
        clientTwo: {
            type: "gpii.wsConnector",
            options: {
                solutionId: "gpii.chrome.tests2",
                flowManager: "ws://localhost:8083",
                reconnect: false,
                listeners: {
                    // remove connect on creation, will connect manually in the test
                    "onCreate.connect": "fluid.identity"
                }
            }
        },
        clientThree: {
            type: "gpii.wsConnector",
            options: {
                solutionId: "gpii.chrome.tests3",
                flowManager: "ws://localhost:8083",
                retryTime: 3,
                listeners: {
                    // remove connect on creation, will connect manually in the test
                    "onCreate.connect": "fluid.identity"
                }
            }
        },
        server: {
            type: "gpii.chrome.tests.wsConnector.server",
            options: {
                members: {
                    allowedClients: ["gpii.chrome.tests"]
                }
            }
        }
    },
    modules: [{
        name: "wsConnector test suite #1",
        tests: [{
            name: "Basic auth process with an allowed client, no settings",
            expect: 4,
            sequence: [{
                // Client connects at creation time, the server should receive
                // such connection attempt and process it.
                event: "{server}.events.onConnectionRequest",
                listener: "gpii.chrome.tests.wsConnector.onConnectionRequestDone",
                args: "{arguments}.0"
            }, {
                event: "{clientOne}.events.onConnect",
                listener: "gpii.chrome.tests.wsConnector.expectedEvent"
            }, {
                event: "{server}.events.onMessage",
                listener: "gpii.chrome.tests.wsConnector.checkMessage",
                args: ["{that}.options.payloads.test1.connectPayload", "{arguments}.0"]
            }, {
                event: "{clientOne}.events.onConnectionSucceeded",
                listener: "gpii.chrome.tests.wsConnector.expectedEvent"
            }]
        }, {
            name: "Server updates settings",
            expect: 2,
            sequence: [{
                func: "{server}.updateSettings",
                args: ["{that}.options.payloads.test1.settings"]
            }, {
                event: "{clientOne}.events.onSettingsChange",
                listener: "gpii.chrome.tests.wsConnector.checkSettings",
                args: ["{arguments}.0", "{that}.options.payloads.test1.settings"]
            }, {
                func: "{server}.updateSettings"
            }, {
                event: "{clientOne}.events.onSettingsChange",
                listener: "gpii.chrome.tests.wsConnector.checkSettings",
                args: ["{arguments}.0"]
            }]
        }, {
            name: "Server sends changeSettingsReceived message",
            expect: 1,
            sequence: [{
                func: "{server}.broadcastMessage",
                args: ["changeSettingsReceived", "{that}.options.payloads.test1.settings"]
            }, {
                event: "{clientOne}.events.onSettingsReceived",
                listener: "gpii.chrome.tests.wsConnector.checkSettings",
                args: ["{arguments}.0", "{that}.options.payloads.test1.settings"]
            }]
        }, {
            name: "Server disconnects client, client reconnects",
            expect: 2,
            sequence: [{
                func: "{server}.closeClient"
            }, {
                event: "{clientOne}.events.onError",
                listener: "gpii.chrome.tests.wsConnector.expectedEvent"
            }, {
                event: "{clientOne}.events.onConnectionSucceeded",
                listener: "gpii.chrome.tests.wsConnector.expectedEvent"
            }]
        }, {
            name: "Client is removed from allowedClients, it tries to reconnect",
            expect: 2,
            sequence: [{
                func: "{server}.banClient",
                args: ["{clientOne}.options.solutionId"]
            }, {
                func: "{server}.closeClient"
            }, {
                event: "{clientOne}.events.onError",
                listener: "gpii.chrome.tests.wsConnector.expectedEvent"
            }, {
                event: "{clientOne}.events.onError",
                listener: "gpii.chrome.tests.wsConnector.expectedEvent"
            }]
        }, {
            name: "Settings change, client receives settings when connecting",
            expect: 1,
            sequence: [{
                func: "{server}.updateSettings",
                args: ["{that}.options.payloads.test2.settings"]
            }, {
                func: "{server}.allowClient",
                args: ["{clientTwo}.options.solutionId"]
            }, {
                func: "{clientTwo}.connect"
            }, {
                event: "{clientTwo}.events.onSettingsChange",
                listener: "gpii.chrome.tests.wsConnector.checkSettings",
                args: ["{arguments}.0", "{that}.options.payloads.test2.settings"]
            }, {
                funcName: "{server}.stop"
            }]
        }, {
            name: "Server closes, client tries to reconnect more than once",
            expect: 3,
            sequence: [{
                func: "{server}.allowClient",
                args: ["{clientTwo}.options.solutionId"]
            }, {
                func: "{clientThree}.connect"
            }, {
                func: "{server}.stop"
            }, {
                event: "{clientThree}.events.onError",
                listener: "gpii.chrome.tests.wsConnector.expectedEvent"
            }, {
                event: "{clientThree}.events.onError",
                listener: "gpii.chrome.tests.wsConnector.expectedEvent"
            }, {
                event: "{clientThree}.events.onError",
                listener: "gpii.chrome.tests.wsConnector.expectedEvent"
            }]
        }]
    }]
});

gpii.chrome.tests.wsConnector.checkSettings = function (settings, expected) {
    jqUnit.assertDeepEq("Client received the new settings when updated",
                        expected,
                        settings);
};

gpii.chrome.tests.wsConnector.expectedEvent = function () {
    jqUnit.assert("This event was expected to be fired");
};

gpii.chrome.tests.wsConnector.checkMessage = function (expected, payload) {
    jqUnit.assertDeepEq("Client's registration payload is correct",
                        expected, JSON.parse(payload));
};

gpii.chrome.tests.wsConnector.onConnectionRequestDone = function (client) {
    jqUnit.assertDeepEq("Client's readyState === OPEN", client.OPEN, client.readyState);
};

fluid.test.runTests("gpii.chrome.tests.wsConnector");
