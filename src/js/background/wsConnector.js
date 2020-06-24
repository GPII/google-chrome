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
/* global fluid, JSON */

"use strict";

var WebSocket = WebSocket || require("ws");
var gpii = fluid.registerNamespace("gpii");

fluid.defaults("gpii.wsConnector", {
    gradeNames: "fluid.component",
    solutionId: null,   /* The solution id, such as "net.gpii.solution" */
    flowManager: null,  /* This takes the form "ws://host:port"*/
    reconnect: true,    /* Whether the component should reconnect automatically */
    retryTime: 5,       /* Try reconnecting after x seconds */
    members: {
        socket: null
    },
    invokers: {
        connect: {
            funcName: "gpii.wsConnector.connect",
            args: "{that}"
        },
        openHandler: {
            func: "{that}.events.onConnect.fire"
        },
        errorHandler: {
            func: "{that}.events.onError.fire",
            args: ["{arguments}.0"]
        },
        messageHandler: {
            funcName: "gpii.wsConnector.messageHandler",
            args: ["{that}", "{arguments}.0"]
        },
        sendMessage: {
            funcName: "gpii.wsConnector.sendMessage",
            args: ["{that}", "{arguments}.0", "{arguments}.1"]
        }
    },
    events: {
        onConnect: null,
        onConnectionSucceeded: null,
        onError: null,
        onSettingsChange: null,
        onSettingsReceived: null
    },
    listeners: {
        "onCreate.connect": "{wsConnector}.connect",
        "onConnect.setup": {
            funcName: "gpii.wsConnector.setup",
            args: "{that}",
            priority: "after:connect"
        },
        onError: {
            funcName: "gpii.wsConnector.error",
            args: ["{that}", "{arguments}.0", "{arguments}.1"]
        }
    }
});

gpii.wsConnector.messageHandler = function (that, ev) {
    var msg = JSON.parse(ev.data);

    if (msg.isError) {
        that.events.onError.fire(msg);
    } else if (msg.type === "connectionSucceeded") {
        that.events.onConnectionSucceeded.fire();
        if (msg.payload) {
            that.events.onSettingsChange.fire(msg.payload);
        }
    } else if (msg.type === "onSettingsChanged") {
        that.events.onSettingsChange.fire(msg.payload ? msg.payload : undefined);
    } else if (msg.type === "changeSettingsReceived") {
        // confirms that settings sent back across the socket have been received by the server
        that.events.onSettingsReceived.fire(msg.payload);
    } else {
        fluid.log("Unrecognized event/message", msg);
    }
};

gpii.wsConnector.connect = function (that) {
    that.socket = new WebSocket(that.options.flowManager);
    that.socket.onopen = that.openHandler;
    that.socket.onerror = that.errorHandler;
    that.socket.onclose = that.errorHandler;
};

gpii.wsConnector.error = function (that, err) {
    //TODO: Add some error handling, ie:
    //  * make difference between different kind of errors
    //
    if (err.type === "close") {
        if (that.options.reconnect) {
            setTimeout(that.connect, that.options.retryTime * 1000);
        }
    }
};

gpii.wsConnector.setup = function (that) {
    that.sendMessage("connect", {solutionId: that.options.solutionId});
    that.socket.onmessage = that.messageHandler;
};

gpii.wsConnector.sendMessage = function (that, type, payload) {
    var message = {
        type: type,
        payload: payload
    };

    if (that.socket) {
        that.socket.send(JSON.stringify(message));
    } else {
        fluid.log("Unable to send message: " + message + ". No socket connection available.");
    }
};
