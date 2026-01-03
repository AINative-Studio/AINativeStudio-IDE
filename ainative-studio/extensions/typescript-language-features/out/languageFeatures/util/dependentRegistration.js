"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Condition = void 0;
exports.conditionalRegistration = conditionalRegistration;
exports.requireMinVersion = requireMinVersion;
exports.requireGlobalConfiguration = requireGlobalConfiguration;
exports.requireSomeCapability = requireSomeCapability;
const vscode = __importStar(require("vscode"));
const dispose_1 = require("../../utils/dispose");
class Condition extends dispose_1.Disposable {
    constructor(getValue, onUpdate) {
        super();
        this.getValue = getValue;
        this._onDidChange = this._register(new vscode.EventEmitter());
        this.onDidChange = this._onDidChange.event;
        this._value = this.getValue();
        onUpdate(() => {
            const newValue = this.getValue();
            if (newValue !== this._value) {
                this._value = newValue;
                this._onDidChange.fire();
            }
        });
    }
    get value() { return this._value; }
}
exports.Condition = Condition;
class ConditionalRegistration {
    constructor(conditions, doRegister) {
        this.conditions = conditions;
        this.doRegister = doRegister;
        this.registration = undefined;
        for (const condition of conditions) {
            condition.onDidChange(() => this.update());
        }
        this.update();
    }
    dispose() {
        this.registration?.dispose();
        this.registration = undefined;
    }
    update() {
        const enabled = this.conditions.every(condition => condition.value);
        if (enabled) {
            this.registration ?? (this.registration = this.doRegister());
        }
        else {
            this.registration?.dispose();
            this.registration = undefined;
        }
    }
}
function conditionalRegistration(conditions, doRegister) {
    return new ConditionalRegistration(conditions, doRegister);
}
function requireMinVersion(client, minVersion) {
    return new Condition(() => client.apiVersion.gte(minVersion), client.onTsServerStarted);
}
function requireGlobalConfiguration(section, configValue) {
    return new Condition(() => {
        const config = vscode.workspace.getConfiguration(section, null);
        return !!config.get(configValue);
    }, vscode.workspace.onDidChangeConfiguration);
}
function requireSomeCapability(client, ...capabilities) {
    return new Condition(() => capabilities.some(requiredCapability => client.capabilities.has(requiredCapability)), client.onDidChangeCapabilities);
}
//# sourceMappingURL=dependentRegistration.js.map