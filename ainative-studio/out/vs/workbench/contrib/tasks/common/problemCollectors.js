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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvYmxlbUNvbGxlY3RvcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90YXNrcy9jb21tb24vcHJvYmxlbUNvbGxlY3RvcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFlLGVBQWUsRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUloRyxPQUFPLEVBQWdCLGlCQUFpQixFQUFpQyxXQUFXLEVBQW9CLFdBQVcsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQ2pKLE9BQU8sRUFBa0IsV0FBVyxFQUFrQixNQUFNLGdEQUFnRCxDQUFDO0FBQzdHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUUvRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFaEUsTUFBTSxDQUFOLElBQWtCLHlCQUdqQjtBQUhELFdBQWtCLHlCQUF5QjtJQUMxQyxzRkFBeUQsQ0FBQTtJQUN6RCxrRkFBcUQsQ0FBQTtBQUN0RCxDQUFDLEVBSGlCLHlCQUF5QixLQUF6Qix5QkFBeUIsUUFHMUM7QUFNRCxJQUFVLHNCQUFzQixDQUkvQjtBQUpELFdBQVUsc0JBQXNCO0lBQy9CLFNBQWdCLE1BQU0sQ0FBQyxJQUErQjtRQUNyRCxPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQ2hDLENBQUM7SUFGZSw2QkFBTSxTQUVyQixDQUFBO0FBQ0YsQ0FBQyxFQUpTLHNCQUFzQixLQUF0QixzQkFBc0IsUUFJL0I7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