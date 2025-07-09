/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../../base/common/uri.js';
import { Event, Emitter } from '../../../../base/common/event.js';
import { DisposableStore, Disposable } from '../../../../base/common/lifecycle.js';
import { createLineMatcher, ApplyToKind, getResource } from './problemMatcher.js';
import { IMarkerData } from '../../../../platform/markers/common/markers.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { isWindows } from '../../../../base/common/platform.js';
export var ProblemCollectorEventKind;
(function (ProblemCollectorEventKind) {
    ProblemCollectorEventKind["BackgroundProcessingBegins"] = "backgroundProcessingBegins";
    ProblemCollectorEventKind["BackgroundProcessingEnds"] = "backgroundProcessingEnds";
})(ProblemCollectorEventKind || (ProblemCollectorEventKind = {}));
var IProblemCollectorEvent;
(function (IProblemCollectorEvent) {
    function create(kind) {
        return Object.freeze({ kind });
    }
    IProblemCollectorEvent.create = create;
})(IProblemCollectorEvent || (IProblemCollectorEvent = {}));
export class AbstractProblemCollector extends Disposable {
    constructor(problemMatchers, markerService, modelService, fileService) {
        super();
        this.problemMatchers = problemMatchers;
        this.markerService = markerService;
        this.modelService = modelService;
        this.modelListeners = new DisposableStore();
        this._onDidFindFirstMatch = new Emitter();
        this.onDidFindFirstMatch = this._onDidFindFirstMatch.event;
        this._onDidFindErrors = new Emitter();
        this.onDidFindErrors = this._onDidFindErrors.event;
        this._onDidRequestInvalidateLastMarker = new Emitter();
        this.onDidRequestInvalidateLastMarker = this._onDidRequestInvalidateLastMarker.event;
        this.matchers = Object.create(null);
        this.bufferLength = 1;
        problemMatchers.map(elem => createLineMatcher(elem, fileService)).forEach((matcher) => {
            const length = matcher.matchLength;
            if (length > this.bufferLength) {
                this.bufferLength = length;
            }
            let value = this.matchers[length];
            if (!value) {
                value = [];
                this.matchers[length] = value;
            }
            value.push(matcher);
        });
        this.buffer = [];
        this.activeMatcher = null;
        this._numberOfMatches = 0;
        this._maxMarkerSeverity = undefined;
        this.openModels = Object.create(null);
        this.applyToByOwner = new Map();
        for (const problemMatcher of problemMatchers) {
            const current = this.applyToByOwner.get(problemMatcher.owner);
            if (current === undefined) {
                this.applyToByOwner.set(problemMatcher.owner, problemMatcher.applyTo);
            }
            else {
                this.applyToByOwner.set(problemMatcher.owner, this.mergeApplyTo(current, problemMatcher.applyTo));
            }
        }
        this.resourcesToClean = new Map();
        this.markers = new Map();
        this.deliveredMarkers = new Map();
        this._register(this.modelService.onModelAdded((model) => {
            this.openModels[model.uri.toString()] = true;
        }, this, this.modelListeners));
        this._register(this.modelService.onModelRemoved((model) => {
            delete this.openModels[model.uri.toString()];
        }, this, this.modelListeners));
        this.modelService.getModels().forEach(model => this.openModels[model.uri.toString()] = true);
        this._onDidStateChange = new Emitter();
    }
    get onDidStateChange() {
        return this._onDidStateChange.event;
    }
    processLine(line) {
        if (this.tail) {
            const oldTail = this.tail;
            this.tail = oldTail.then(() => {
                return this.processLineInternal(line);
            });
        }
        else {
            this.tail = this.processLineInternal(line);
        }
    }
    dispose() {
        super.dispose();
        this.modelListeners.dispose();
    }
    get numberOfMatches() {
        return this._numberOfMatches;
    }
    get maxMarkerSeverity() {
        return this._maxMarkerSeverity;
    }
    tryFindMarker(line) {
        let result = null;
        if (this.activeMatcher) {
            result = this.activeMatcher.next(line);
            if (result) {
                this.captureMatch(result);
                return result;
            }
            this.clearBuffer();
            this.activeMatcher = null;
        }
        if (this.buffer.length < this.bufferLength) {
            this.buffer.push(line);
        }
        else {
            const end = this.buffer.length - 1;
            for (let i = 0; i < end; i++) {
                this.buffer[i] = this.buffer[i + 1];
            }
            this.buffer[end] = line;
        }
        result = this.tryMatchers();
        if (result) {
            this.clearBuffer();
        }
        return result;
    }
    async shouldApplyMatch(result) {
        switch (result.description.applyTo) {
            case ApplyToKind.allDocuments:
                return true;
            case ApplyToKind.openDocuments:
                return !!this.openModels[(await result.resource).toString()];
            case ApplyToKind.closedDocuments:
                return !this.openModels[(await result.resource).toString()];
            default:
                return true;
        }
    }
    mergeApplyTo(current, value) {
        if (current === value || current === ApplyToKind.allDocuments) {
            return current;
        }
        return ApplyToKind.allDocuments;
    }
    tryMatchers() {
        this.activeMatcher = null;
        const length = this.buffer.length;
        for (let startIndex = 0; startIndex < length; startIndex++) {
            const candidates = this.matchers[length - startIndex];
            if (!candidates) {
                continue;
            }
            for (const matcher of candidates) {
                const result = matcher.handle(this.buffer, startIndex);
                if (result.match) {
                    this.captureMatch(result.match);
                    if (result.continue) {
                        this.activeMatcher = matcher;
                    }
                    return result.match;
                }
            }
        }
        return null;
    }
    captureMatch(match) {
        this._numberOfMatches++;
        if (this._maxMarkerSeverity === undefined || match.marker.severity > this._maxMarkerSeverity) {
            this._maxMarkerSeverity = match.marker.severity;
        }
    }
    clearBuffer() {
        if (this.buffer.length > 0) {
            this.buffer = [];
        }
    }
    recordResourcesToClean(owner) {
        const resourceSetToClean = this.getResourceSetToClean(owner);
        this.markerService.read({ owner: owner }).forEach(marker => resourceSetToClean.set(marker.resource.toString(), marker.resource));
    }
    recordResourceToClean(owner, resource) {
        this.getResourceSetToClean(owner).set(resource.toString(), resource);
    }
    removeResourceToClean(owner, resource) {
        const resourceSet = this.resourcesToClean.get(owner);
        resourceSet?.delete(resource);
    }
    getResourceSetToClean(owner) {
        let result = this.resourcesToClean.get(owner);
        if (!result) {
            result = new Map();
            this.resourcesToClean.set(owner, result);
        }
        return result;
    }
    cleanAllMarkers() {
        this.resourcesToClean.forEach((value, owner) => {
            this._cleanMarkers(owner, value);
        });
        this.resourcesToClean = new Map();
    }
    cleanMarkers(owner) {
        const toClean = this.resourcesToClean.get(owner);
        if (toClean) {
            this._cleanMarkers(owner, toClean);
            this.resourcesToClean.delete(owner);
        }
    }
    _cleanMarkers(owner, toClean) {
        const uris = [];
        const applyTo = this.applyToByOwner.get(owner);
        toClean.forEach((uri, uriAsString) => {
            if (applyTo === ApplyToKind.allDocuments ||
                (applyTo === ApplyToKind.openDocuments && this.openModels[uriAsString]) ||
                (applyTo === ApplyToKind.closedDocuments && !this.openModels[uriAsString])) {
                uris.push(uri);
            }
        });
        this.markerService.remove(owner, uris);
    }
    recordMarker(marker, owner, resourceAsString) {
        let markersPerOwner = this.markers.get(owner);
        if (!markersPerOwner) {
            markersPerOwner = new Map();
            this.markers.set(owner, markersPerOwner);
        }
        let markersPerResource = markersPerOwner.get(resourceAsString);
        if (!markersPerResource) {
            markersPerResource = new Map();
            markersPerOwner.set(resourceAsString, markersPerResource);
        }
        const key = IMarkerData.makeKeyOptionalMessage(marker, false);
        let existingMarker;
        if (!markersPerResource.has(key)) {
            markersPerResource.set(key, marker);
        }
        else if (((existingMarker = markersPerResource.get(key)) !== undefined) && (existingMarker.message.length < marker.message.length) && isWindows) {
            // Most likely https://github.com/microsoft/vscode/issues/77475
            // Heuristic dictates that when the key is the same and message is smaller, we have hit this limitation.
            markersPerResource.set(key, marker);
        }
    }
    reportMarkers() {
        this.markers.forEach((markersPerOwner, owner) => {
            const deliveredMarkersPerOwner = this.getDeliveredMarkersPerOwner(owner);
            markersPerOwner.forEach((markers, resource) => {
                this.deliverMarkersPerOwnerAndResourceResolved(owner, resource, markers, deliveredMarkersPerOwner);
            });
        });
    }
    deliverMarkersPerOwnerAndResource(owner, resource) {
        const markersPerOwner = this.markers.get(owner);
        if (!markersPerOwner) {
            return;
        }
        const deliveredMarkersPerOwner = this.getDeliveredMarkersPerOwner(owner);
        const markersPerResource = markersPerOwner.get(resource);
        if (!markersPerResource) {
            return;
        }
        this.deliverMarkersPerOwnerAndResourceResolved(owner, resource, markersPerResource, deliveredMarkersPerOwner);
    }
    deliverMarkersPerOwnerAndResourceResolved(owner, resource, markers, reported) {
        if (markers.size !== reported.get(resource)) {
            const toSet = [];
            markers.forEach(value => toSet.push(value));
            this.markerService.changeOne(owner, URI.parse(resource), toSet);
            reported.set(resource, markers.size);
        }
    }
    getDeliveredMarkersPerOwner(owner) {
        let result = this.deliveredMarkers.get(owner);
        if (!result) {
            result = new Map();
            this.deliveredMarkers.set(owner, result);
        }
        return result;
    }
    cleanMarkerCaches() {
        this._numberOfMatches = 0;
        this._maxMarkerSeverity = undefined;
        this.markers.clear();
        this.deliveredMarkers.clear();
    }
    done() {
        this.reportMarkers();
        this.cleanAllMarkers();
    }
}
export var ProblemHandlingStrategy;
(function (ProblemHandlingStrategy) {
    ProblemHandlingStrategy[ProblemHandlingStrategy["Clean"] = 0] = "Clean";
})(ProblemHandlingStrategy || (ProblemHandlingStrategy = {}));
export class StartStopProblemCollector extends AbstractProblemCollector {
    constructor(problemMatchers, markerService, modelService, _strategy = 0 /* ProblemHandlingStrategy.Clean */, fileService) {
        super(problemMatchers, markerService, modelService, fileService);
        this._hasStarted = false;
        const ownerSet = Object.create(null);
        problemMatchers.forEach(description => ownerSet[description.owner] = true);
        this.owners = Object.keys(ownerSet);
        this.owners.forEach((owner) => {
            this.recordResourcesToClean(owner);
        });
    }
    async processLineInternal(line) {
        if (!this._hasStarted) {
            this._hasStarted = true;
            this._onDidStateChange.fire(IProblemCollectorEvent.create("backgroundProcessingBegins" /* ProblemCollectorEventKind.BackgroundProcessingBegins */));
        }
        const markerMatch = this.tryFindMarker(line);
        if (!markerMatch) {
            return;
        }
        const owner = markerMatch.description.owner;
        const resource = await markerMatch.resource;
        const resourceAsString = resource.toString();
        this.removeResourceToClean(owner, resourceAsString);
        const shouldApplyMatch = await this.shouldApplyMatch(markerMatch);
        if (shouldApplyMatch) {
            this.recordMarker(markerMatch.marker, owner, resourceAsString);
            if (this.currentOwner !== owner || this.currentResource !== resourceAsString) {
                if (this.currentOwner && this.currentResource) {
                    this.deliverMarkersPerOwnerAndResource(this.currentOwner, this.currentResource);
                }
                this.currentOwner = owner;
                this.currentResource = resourceAsString;
            }
        }
    }
}
export class WatchingProblemCollector extends AbstractProblemCollector {
    constructor(problemMatchers, markerService, modelService, fileService) {
        super(problemMatchers, markerService, modelService, fileService);
        this.lines = [];
        this.beginPatterns = [];
        this.resetCurrentResource();
        this.backgroundPatterns = [];
        this._activeBackgroundMatchers = new Set();
        this.problemMatchers.forEach(matcher => {
            if (matcher.watching) {
                const key = generateUuid();
                this.backgroundPatterns.push({
                    key,
                    matcher: matcher,
                    begin: matcher.watching.beginsPattern,
                    end: matcher.watching.endsPattern
                });
                this.beginPatterns.push(matcher.watching.beginsPattern.regexp);
            }
        });
        this.modelListeners.add(this.modelService.onModelRemoved(modelEvent => {
            let markerChanged = Event.debounce(this.markerService.onMarkerChanged, (last, e) => (last ?? []).concat(e), 500, false, true)(async (markerEvent) => {
                if (!markerEvent || !markerEvent.includes(modelEvent.uri) || (this.markerService.read({ resource: modelEvent.uri }).length !== 0)) {
                    return;
                }
                const oldLines = Array.from(this.lines);
                for (const line of oldLines) {
                    await this.processLineInternal(line);
                }
            });
            this._register(markerChanged); // Ensures markerChanged is tracked and disposed of properly
            setTimeout(() => {
                if (markerChanged) {
                    const _markerChanged = markerChanged;
                    markerChanged = undefined;
                    _markerChanged.dispose();
                }
            }, 600);
        }));
    }
    aboutToStart() {
        for (const background of this.backgroundPatterns) {
            if (background.matcher.watching && background.matcher.watching.activeOnStart) {
                this._activeBackgroundMatchers.add(background.key);
                this._onDidStateChange.fire(IProblemCollectorEvent.create("backgroundProcessingBegins" /* ProblemCollectorEventKind.BackgroundProcessingBegins */));
                this.recordResourcesToClean(background.matcher.owner);
            }
        }
    }
    async processLineInternal(line) {
        if (await this.tryBegin(line) || this.tryFinish(line)) {
            return;
        }
        this.lines.push(line);
        const markerMatch = this.tryFindMarker(line);
        if (!markerMatch) {
            return;
        }
        const resource = await markerMatch.resource;
        const owner = markerMatch.description.owner;
        const resourceAsString = resource.toString();
        this.removeResourceToClean(owner, resourceAsString);
        const shouldApplyMatch = await this.shouldApplyMatch(markerMatch);
        if (shouldApplyMatch) {
            this.recordMarker(markerMatch.marker, owner, resourceAsString);
            if (this.currentOwner !== owner || this.currentResource !== resourceAsString) {
                this.reportMarkersForCurrentResource();
                this.currentOwner = owner;
                this.currentResource = resourceAsString;
            }
        }
    }
    forceDelivery() {
        this.reportMarkersForCurrentResource();
    }
    async tryBegin(line) {
        let result = false;
        for (const background of this.backgroundPatterns) {
            const matches = background.begin.regexp.exec(line);
            if (matches) {
                if (this._activeBackgroundMatchers.has(background.key)) {
                    continue;
                }
                this._activeBackgroundMatchers.add(background.key);
                result = true;
                this._onDidFindFirstMatch.fire();
                this.lines = [];
                this.lines.push(line);
                this._onDidStateChange.fire(IProblemCollectorEvent.create("backgroundProcessingBegins" /* ProblemCollectorEventKind.BackgroundProcessingBegins */));
                this.cleanMarkerCaches();
                this.resetCurrentResource();
                const owner = background.matcher.owner;
                const file = matches[background.begin.file];
                if (file) {
                    const resource = getResource(file, background.matcher);
                    this.recordResourceToClean(owner, await resource);
                }
                else {
                    this.recordResourcesToClean(owner);
                }
            }
        }
        return result;
    }
    tryFinish(line) {
        let result = false;
        for (const background of this.backgroundPatterns) {
            const matches = background.end.regexp.exec(line);
            if (matches) {
                if (this._numberOfMatches > 0) {
                    this._onDidFindErrors.fire();
                }
                else {
                    this._onDidRequestInvalidateLastMarker.fire();
                }
                if (this._activeBackgroundMatchers.has(background.key)) {
                    this._activeBackgroundMatchers.delete(background.key);
                    this.resetCurrentResource();
                    this._onDidStateChange.fire(IProblemCollectorEvent.create("backgroundProcessingEnds" /* ProblemCollectorEventKind.BackgroundProcessingEnds */));
                    result = true;
                    this.lines.push(line);
                    const owner = background.matcher.owner;
                    this.cleanMarkers(owner);
                    this.cleanMarkerCaches();
                }
            }
        }
        return result;
    }
    resetCurrentResource() {
        this.reportMarkersForCurrentResource();
        this.currentOwner = undefined;
        this.currentResource = undefined;
    }
    reportMarkersForCurrentResource() {
        if (this.currentOwner && this.currentResource) {
            this.deliverMarkersPerOwnerAndResource(this.currentOwner, this.currentResource);
        }
    }
    done() {
        [...this.applyToByOwner.keys()].forEach(owner => {
            this.recordResourcesToClean(owner);
        });
        super.done();
    }
    isWatching() {
        return this.backgroundPatterns.length > 0;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvYmxlbUNvbGxlY3RvcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGFza3MvY29tbW9uL3Byb2JsZW1Db2xsZWN0b3JzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBZSxlQUFlLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFJaEcsT0FBTyxFQUFnQixpQkFBaUIsRUFBaUMsV0FBVyxFQUFvQixXQUFXLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUNqSixPQUFPLEVBQWtCLFdBQVcsRUFBa0IsTUFBTSxnREFBZ0QsQ0FBQztBQUM3RyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFL0QsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRWhFLE1BQU0sQ0FBTixJQUFrQix5QkFHakI7QUFIRCxXQUFrQix5QkFBeUI7SUFDMUMsc0ZBQXlELENBQUE7SUFDekQsa0ZBQXFELENBQUE7QUFDdEQsQ0FBQyxFQUhpQix5QkFBeUIsS0FBekIseUJBQXlCLFFBRzFDO0FBTUQsSUFBVSxzQkFBc0IsQ0FJL0I7QUFKRCxXQUFVLHNCQUFzQjtJQUMvQixTQUFnQixNQUFNLENBQUMsSUFBK0I7UUFDckQsT0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUNoQyxDQUFDO0lBRmUsNkJBQU0sU0FFckIsQ0FBQTtBQUNGLENBQUMsRUFKUyxzQkFBc0IsS0FBdEIsc0JBQXNCLFFBSS9C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