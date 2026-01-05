"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.VSCodeTelemetryReporter = void 0;
class VSCodeTelemetryReporter {
    constructor(reporter, clientVersionDelegate) {
        this.reporter = reporter;
        this.clientVersionDelegate = clientVersionDelegate;
    }
    logTelemetry(eventName, properties = {}) {
        const reporter = this.reporter;
        if (!reporter) {
            return;
        }
        /* __GDPR__FRAGMENT__
            "TypeScriptCommonProperties" : {
                "version" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
            }
        */
        properties['version'] = this.clientVersionDelegate();
        reporter.postEventObj(eventName, properties);
    }
}
exports.VSCodeTelemetryReporter = VSCodeTelemetryReporter;
//# sourceMappingURL=telemetry.js.map