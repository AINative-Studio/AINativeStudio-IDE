/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import Severity from '../../../base/common/severity.js';
import { localize } from '../../../nls.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
export var MarkerTag;
(function (MarkerTag) {
    MarkerTag[MarkerTag["Unnecessary"] = 1] = "Unnecessary";
    MarkerTag[MarkerTag["Deprecated"] = 2] = "Deprecated";
})(MarkerTag || (MarkerTag = {}));
export var MarkerSeverity;
(function (MarkerSeverity) {
    MarkerSeverity[MarkerSeverity["Hint"] = 1] = "Hint";
    MarkerSeverity[MarkerSeverity["Info"] = 2] = "Info";
    MarkerSeverity[MarkerSeverity["Warning"] = 4] = "Warning";
    MarkerSeverity[MarkerSeverity["Error"] = 8] = "Error";
})(MarkerSeverity || (MarkerSeverity = {}));
(function (MarkerSeverity) {
    function compare(a, b) {
        return b - a;
    }
    MarkerSeverity.compare = compare;
    const _displayStrings = Object.create(null);
    _displayStrings[MarkerSeverity.Error] = localize('sev.error', "Error");
    _displayStrings[MarkerSeverity.Warning] = localize('sev.warning', "Warning");
    _displayStrings[MarkerSeverity.Info] = localize('sev.info', "Info");
    function toString(a) {
        return _displayStrings[a] || '';
    }
    MarkerSeverity.toString = toString;
    const _displayStringsPlural = Object.create(null);
    _displayStringsPlural[MarkerSeverity.Error] = localize('sev.errors', "Errors");
    _displayStringsPlural[MarkerSeverity.Warning] = localize('sev.warnings', "Warnings");
    _displayStringsPlural[MarkerSeverity.Info] = localize('sev.infos', "Infos");
    function toStringPlural(a) {
        return _displayStringsPlural[a] || '';
    }
    MarkerSeverity.toStringPlural = toStringPlural;
    function fromSeverity(severity) {
        switch (severity) {
            case Severity.Error: return MarkerSeverity.Error;
            case Severity.Warning: return MarkerSeverity.Warning;
            case Severity.Info: return MarkerSeverity.Info;
            case Severity.Ignore: return MarkerSeverity.Hint;
        }
    }
    MarkerSeverity.fromSeverity = fromSeverity;
    function toSeverity(severity) {
        switch (severity) {
            case MarkerSeverity.Error: return Severity.Error;
            case MarkerSeverity.Warning: return Severity.Warning;
            case MarkerSeverity.Info: return Severity.Info;
            case MarkerSeverity.Hint: return Severity.Ignore;
        }
    }
    MarkerSeverity.toSeverity = toSeverity;
})(MarkerSeverity || (MarkerSeverity = {}));
export var IMarkerData;
(function (IMarkerData) {
    const emptyString = '';
    function makeKey(markerData) {
        return makeKeyOptionalMessage(markerData, true);
    }
    IMarkerData.makeKey = makeKey;
    function makeKeyOptionalMessage(markerData, useMessage) {
        const result = [emptyString];
        if (markerData.source) {
            result.push(markerData.source.replace('¦', '\\¦'));
        }
        else {
            result.push(emptyString);
        }
        if (markerData.code) {
            if (typeof markerData.code === 'string') {
                result.push(markerData.code.replace('¦', '\\¦'));
            }
            else {
                result.push(markerData.code.value.replace('¦', '\\¦'));
            }
        }
        else {
            result.push(emptyString);
        }
        if (markerData.severity !== undefined && markerData.severity !== null) {
            result.push(MarkerSeverity.toString(markerData.severity));
        }
        else {
            result.push(emptyString);
        }
        // Modifed to not include the message as part of the marker key to work around
        // https://github.com/microsoft/vscode/issues/77475
        if (markerData.message && useMessage) {
            result.push(markerData.message.replace('¦', '\\¦'));
        }
        else {
            result.push(emptyString);
        }
        if (markerData.startLineNumber !== undefined && markerData.startLineNumber !== null) {
            result.push(markerData.startLineNumber.toString());
        }
        else {
            result.push(emptyString);
        }
        if (markerData.startColumn !== undefined && markerData.startColumn !== null) {
            result.push(markerData.startColumn.toString());
        }
        else {
            result.push(emptyString);
        }
        if (markerData.endLineNumber !== undefined && markerData.endLineNumber !== null) {
            result.push(markerData.endLineNumber.toString());
        }
        else {
            result.push(emptyString);
        }
        if (markerData.endColumn !== undefined && markerData.endColumn !== null) {
            result.push(markerData.endColumn.toString());
        }
        else {
            result.push(emptyString);
        }
        result.push(emptyString);
        return result.join('¦');
    }
    IMarkerData.makeKeyOptionalMessage = makeKeyOptionalMessage;
})(IMarkerData || (IMarkerData = {}));
export const IMarkerService = createDecorator('markerService');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Vycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9tYXJrZXJzL2NvbW1vbi9tYXJrZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sUUFBUSxNQUFNLGtDQUFrQyxDQUFDO0FBRXhELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMzQyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFnQzlFLE1BQU0sQ0FBTixJQUFrQixTQUdqQjtBQUhELFdBQWtCLFNBQVM7SUFDMUIsdURBQWUsQ0FBQTtJQUNmLHFEQUFjLENBQUE7QUFDZixDQUFDLEVBSGlCLFNBQVMsS0FBVCxTQUFTLFFBRzFCO0FBRUQsTUFBTSxDQUFOLElBQVksY0FLWDtBQUxELFdBQVksY0FBYztJQUN6QixtREFBUSxDQUFBO0lBQ1IsbURBQVEsQ0FBQTtJQUNSLHlEQUFXLENBQUE7SUFDWCxxREFBUyxDQUFBO0FBQ1YsQ0FBQyxFQUxXLGNBQWMsS0FBZCxjQUFjLFFBS3pCO0FBRUQsV0FBaUIsY0FBYztJQUU5QixTQUFnQixPQUFPLENBQUMsQ0FBaUIsRUFBRSxDQUFpQjtRQUMzRCxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDZCxDQUFDO0lBRmUsc0JBQU8sVUFFdEIsQ0FBQTtJQUVELE1BQU0sZUFBZSxHQUFnQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3pFLGVBQWUsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLEdBQUcsUUFBUSxDQUFDLFdBQVcsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUN2RSxlQUFlLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxHQUFHLFFBQVEsQ0FBQyxhQUFhLEVBQUUsU0FBUyxDQUFDLENB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