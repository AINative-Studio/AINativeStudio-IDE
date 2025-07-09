/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { onUnexpectedError } from '../../../base/common/errors.js';
import { Disposable, isDisposable } from '../../../base/common/lifecycle.js';
import { Schemas } from '../../../base/common/network.js';
import Severity from '../../../base/common/severity.js';
import * as nls from '../../../nls.js';
import { IDialogService } from '../../dialogs/common/dialogs.js';
import { registerSingleton } from '../../instantiation/common/extensions.js';
import { INotificationService } from '../../notification/common/notification.js';
import { IUndoRedoService, ResourceEditStackSnapshot, UndoRedoGroup, UndoRedoSource } from './undoRedo.js';
const DEBUG = false;
function getResourceLabel(resource) {
    return resource.scheme === Schemas.file ? resource.fsPath : resource.path;
}
let stackElementCounter = 0;
class ResourceStackElement {
    constructor(actual, resourceLabel, strResource, groupId, groupOrder, sourceId, sourceOrder) {
        this.id = (++stackElementCounter);
        this.type = 0 /* UndoRedoElementType.Resource */;
        this.actual = actual;
        this.label = actual.label;
        this.confirmBeforeUndo = actual.confirmBeforeUndo || false;
        this.resourceLabel = resourceLabel;
        this.strResource = strResource;
        this.resourceLabels = [this.resourceLabel];
        this.strResources = [this.strResource];
        this.groupId = groupId;
        this.groupOrder = groupOrder;
        this.sourceId = sourceId;
        this.sourceOrder = sourceOrder;
        this.isValid = true;
    }
    setValid(isValid) {
        this.isValid = isValid;
    }
    toString() {
        return `[id:${this.id}] [group:${this.groupId}] [${this.isValid ? '  VALID' : 'INVALID'}] ${this.actual.constructor.name} - ${this.actual}`;
    }
}
var RemovedResourceReason;
(function (RemovedResourceReason) {
    RemovedResourceReason[RemovedResourceReason["ExternalRemoval"] = 0] = "ExternalRemoval";
    RemovedResourceReason[RemovedResourceReason["NoParallelUniverses"] = 1] = "NoParallelUniverses";
})(RemovedResourceReason || (RemovedResourceReason = {}));
class ResourceReasonPair {
    constructor(resourceLabel, reason) {
        this.resourceLabel = resourceLabel;
        this.reason = reason;
    }
}
class RemovedResources {
    constructor() {
        this.elements = new Map();
    }
    createMessage() {
        const externalRemoval = [];
        const noParallelUniverses = [];
        for (const [, element] of this.elements) {
            const dest = (element.reason === 0 /* RemovedResourceReason.ExternalRemoval */
                ? externalRemoval
                : noParallelUniverses);
            dest.push(element.resourceLabel);
        }
        const messages = [];
        if (externalRemoval.length > 0) {
            messages.push(nls.localize({ key: 'externalRemoval', comment: ['{0} is a list of filenames'] }, "The following files have been closed and modified on disk: {0}.", externalRemoval.join(', ')));
        }
        if (noParallelUniverses.length > 0) {
            messages.push(nls.localize({ key: 'noParallelUniverses', comment: ['{0} is a list of filenames'] }, "The following files have been modified in an incompatible way: {0}.", noParallelUniverses.join(', ')));
        }
        return messages.join('\n');
    }
    get size() {
        return this.elements.size;
    }
    has(strResource) {
        return this.elements.has(strResource);
    }
    set(strResource, value) {
        this.elements.set(strResource, value);
    }
    delete(strResource) {
        return this.elements.delete(strResource);
    }
}
class WorkspaceStackElement {
    constructor(actual, resourceLabels, strResources, groupId, groupOrder, sourceId, sourceOrder) {
        this.id = (++stackElementCounter);
        this.type = 1 /* UndoRedoElementType.Workspace */;
        this.actual = actual;
        this.label = actual.label;
        this.confirmBeforeUndo = actual.confirmBeforeUndo || false;
        this.resourceLabels = resourceLabels;
        this.strResources = strResources;
        this.groupId = groupId;
        this.groupOrder = groupOrder;
        this.sourceId = sourceId;
        this.sourceOrder = sourceOrder;
        this.removedResources = null;
        this.invalidatedResources = null;
    }
    canSplit() {
        return (typeof this.actual.split === 'function');
    }
    removeResource(resourceLabel, strResource, reason) {
        if (!this.removedResources) {
            this.removedResources = new RemovedResources();
        }
        if (!this.removedResources.has(strResource)) {
            this.removedResources.set(strResource, new ResourceReasonPair(resourceLabel, reason));
        }
    }
    setValid(resourceLabel, strResource, isValid) {
        if (isValid) {
            if (this.invalidatedResources) {
                this.invalidatedResources.delete(strResource);
                if (this.invalidatedResources.size === 0) {
                    this.invalidatedResources = null;
                }
            }
        }
        else {
            if (!this.invalidatedResources) {
                this.invalidatedResources = new RemovedResources();
            }
            if (!this.invalidatedResources.has(strResource)) {
                this.invalidatedResources.set(strResource, new ResourceReasonPair(resourceLabel, 0 /* RemovedResourceReason.ExternalRemoval */));
            }
        }
    }
    toString() {
        return `[id:${this.id}] [group:${this.groupId}] [${this.invalidatedResources ? 'INVALID' : '  VALID'}] ${this.actual.constructor.name} - ${this.actual}`;
    }
}
class ResourceEditStack {
    constructor(resourceLabel, strResource) {
        this.resourceLabel = resourceLabel;
        this.strResource = strResource;
        this._past = [];
        this._future = [];
        this.locked = false;
        this.versionId = 1;
    }
    dispose() {
        for (const element of this._past) {
            if (element.type === 1 /* UndoRedoElementType.Workspace */) {
                element.removeResource(this.resourceLabel, this.strResource, 0 /* RemovedResourceReason.ExternalRemoval */);
            }
        }
        for (const element of this._future) {
            if (element.type === 1 /* UndoRedoElementType.Workspace */) {
                element.removeResource(this.resourceLabel, this.strResource, 0 /* RemovedResourceReason.ExternalRemoval */);
            }
        }
        this.versionId++;
    }
    toString() {
        const result = [];
        result.push(`* ${this.strResource}:`);
        for (let i = 0; i < this._past.length; i++) {
            result.push(`   * [UNDO] ${this._past[i]}`);
        }
        for (let i = this._future.length - 1; i >= 0; i--) {
            result.push(`   * [REDO] ${this._future[i]}`);
        }
        return result.join('\n');
    }
    flushAllElements() {
        this._past = [];
        this._future = [];
        this.versionId++;
    }
    setElementsIsValid(isValid) {
        for (const element of this._past) {
            if (element.type === 1 /* UndoRedoElementType.Workspace */) {
                element.setValid(this.resourceLabel, this.strResource, isValid);
            }
            else {
                element.setValid(isValid);
            }
        }
        for (const element of this._future) {
            if (element.type === 1 /* UndoRedoElementType.Workspace */) {
                element.setValid(this.resourceLabel, this.strResource, isValid);
            }
            else {
                element.setValid(isValid);
            }
        }
    }
    _setElementValidFlag(element, isValid) {
        if (element.type === 1 /* UndoRedoElementType.Workspace */) {
            element.setValid(this.resourceLabel, this.strResource, isValid);
        }
        else {
            element.setValid(isValid);
        }
    }
    setElementsValidFlag(isValid, filter) {
        for (const element of this._past) {
            if (filter(element.actual)) {
                this._setElementValidFlag(element, isValid);
            }
        }
        for (const element of this._future) {
            if (filter(element.actual)) {
                this._setElementValidFlag(element, isValid);
            }
        }
    }
    pushElement(element) {
        // remove the future
        for (const futureElement of this._future) {
            if (futureElement.type === 1 /* UndoRedoElementType.Workspace */) {
                futureElement.removeResource(this.resourceLabel, this.strResource, 1 /* RemovedResourceReason.NoParallelUniverses */);
            }
        }
        this._future = [];
        this._past.push(element);
        this.versionId++;
    }
    createSnapshot(resource) {
        const elements = [];
        for (let i = 0, len = this._past.length; i < len; i++) {
            elements.push(this._past[i].id);
        }
        for (let i = this._future.length - 1; i >= 0; i--) {
            elements.push(this._future[i].id);
        }
        return new ResourceEditStackSnapshot(resource, elements);
    }
    restoreSnapshot(snapshot) {
        const snapshotLength = snapshot.elements.length;
        let isOK = true;
        let snapshotIndex = 0;
        let removePastAfter = -1;
        for (let i = 0, len = this._past.length; i < len; i++, snapshotIndex++) {
            const element = this._past[i];
            if (isOK && (snapshotIndex >= snapshotLength || element.id !== snapshot.elements[snapshotIndex])) {
                isOK = false;
                removePastAfter = 0;
            }
            if (!isOK && element.type === 1 /* UndoRedoElementType.Workspace */) {
                element.removeResource(this.resourceLabel, this.strResource, 0 /* RemovedResourceReason.ExternalRemoval */);
            }
        }
        let removeFutureBefore = -1;
        for (let i = this._future.length - 1; i >= 0; i--, snapshotIndex++) {
            const element = this._future[i];
            if (isOK && (snapshotIndex >= snapshotLength || element.id !== snapshot.elements[snapshotIndex])) {
                isOK = false;
                removeFutureBefore = i;
            }
            if (!isOK && element.type === 1 /* UndoRedoElementType.Workspace */) {
                element.removeResource(this.resourceLabel, this.strResource, 0 /* RemovedResourceReason.ExternalRemoval */);
            }
        }
        if (removePastAfter !== -1) {
            this._past = this._past.slice(0, removePastAfter);
        }
        if (removeFutureBefore !== -1) {
            this._future = this._future.slice(removeFutureBefore + 1);
        }
        this.versionId++;
    }
    getElements() {
        const past = [];
        const future = [];
        for (const element of this._past) {
            past.push(element.actual);
        }
        for (const element of this._future) {
            future.push(element.actual);
        }
        return { past, future };
    }
    getClosestPastElement() {
        if (this._past.length === 0) {
            return null;
        }
        return this._past[this._past.length - 1];
    }
    getSecondClosestPastElement() {
        if (this._past.length < 2) {
            return null;
        }
        return this._past[this._past.length - 2];
    }
    getClosestFutureElement() {
        if (this._future.length === 0) {
            return null;
        }
        return this._future[this._future.length - 1];
    }
    hasPastElements() {
        return (this._past.length > 0);
    }
    hasFutureElements() {
        return (this._future.length > 0);
    }
    splitPastWorkspaceElement(toRemove, individualMap) {
        for (let j = this._past.length - 1; j >= 0; j--) {
            if (this._past[j] === toRemove) {
                if (individualMap.has(this.strResource)) {
                    // gets replaced
                    this._past[j] = individualMap.get(this.strResource);
                }
                else {
                    // gets deleted
                    this._past.splice(j, 1);
                }
                break;
            }
        }
        this.versionId++;
    }
    splitFutureWorkspaceElement(toRemove, individualMap) {
        for (let j = this._future.length - 1; j >= 0; j--) {
            if (this._future[j] === toRemove) {
                if (individualMap.has(this.strResource)) {
                    // gets replaced
                    this._future[j] = individualMap.get(this.strResource);
                }
                else {
                    // gets deleted
                    this._future.splice(j, 1);
                }
                break;
            }
        }
        this.versionId++;
    }
    moveBackward(element) {
        this._past.pop();
        this._future.push(element);
        this.versionId++;
    }
    moveForward(element) {
        this._future.pop();
        this._past.push(element);
        this.versionId++;
    }
}
class EditStackSnapshot {
    constructor(editStacks) {
        this.editStacks = editStacks;
        this._versionIds = [];
        for (let i = 0, len = this.editStacks.length; i < len; i++) {
            this._versionIds[i] = this.editStacks[i].versionId;
        }
    }
    isValid() {
        for (let i = 0, len = this.editStacks.length; i < len; i++) {
            if (this._versionIds[i] !== this.editStacks[i].versionId) {
                return false;
            }
        }
        return true;
    }
}
const missingEditStack = new ResourceEditStack('', '');
missingEditStack.locked = true;
let UndoRedoService = class UndoRedoService {
    constructor(_dialogService, _notificationService) {
        this._dialogService = _dialogService;
        this._notificationService = _notificationService;
        this._editStacks = new Map();
        this._uriComparisonKeyComputers = [];
    }
    registerUriComparisonKeyComputer(scheme, uriComparisonKeyComputer) {
        this._uriComparisonKeyComputers.push([scheme, uriComparisonKeyComputer]);
        return {
            dispose: () => {
                for (let i = 0, len = this._uriComparisonKeyComputers.length; i < len; i++) {
                    if (this._uriComparisonKeyComputers[i][1] === uriComparisonKeyComputer) {
                        this._uriComparisonKeyComputers.splice(i, 1);
                        return;
                    }
                }
            }
        };
    }
    getUriComparisonKey(resource) {
        for (const uriComparisonKeyComputer of this._uriComparisonKeyComputers) {
            if (uriComparisonKeyComputer[0] === resource.scheme) {
                return uriComparisonKeyComputer[1].getComparisonKey(resource);
            }
        }
        return resource.toString();
    }
    _print(label) {
        console.log(`------------------------------------`);
        console.log(`AFTER ${label}: `);
        const str = [];
        for (const element of this._editStacks) {
            str.push(element[1].toString());
        }
        console.log(str.join('\n'));
    }
    pushElement(element, group = UndoRedoGroup.None, source = UndoRedoSource.None) {
        if (element.type === 0 /* UndoRedoElementType.Resource */) {
            const resourceLabel = getResourceLabel(element.resource);
            const strResource = this.getUriComparisonKey(element.resource);
            this._pushElement(new ResourceStackElement(element, resourceLabel, strResource, group.id, group.nextOrder(), source.id, source.nextOrder()));
        }
        else {
            const seen = new Set();
            const resourceLabels = [];
            const strResources = [];
            for (const resource of element.resources) {
                const resourceLabel = getResourceLabel(resource);
                const strResource = this.getUriComparisonKey(resource);
                if (seen.has(strResource)) {
                    continue;
                }
                seen.add(strResource);
                resourceLabels.push(resourceLabel);
                strResources.push(strResource);
            }
            if (resourceLabels.length === 1) {
                this._pushElement(new ResourceStackElement(element, resourceLabels[0], strResources[0], group.id, group.nextOrder(), source.id, source.nextOrder()));
            }
            else {
                this._pushElement(new WorkspaceStackElement(element, resourceLabels, strResources, group.id, group.nextOrder(), source.id, source.nextOrder()));
            }
        }
        if (DEBUG) {
            this._print('pushElement');
        }
    }
    _pushElement(element) {
        for (let i = 0, len = element.strResources.length; i < len; i++) {
            const resourceLabel = element.resourceLabels[i];
            const strResource = element.strResources[i];
            let editStack;
            if (this._editStacks.has(strResource)) {
                editStack = this._editStacks.get(strResource);
            }
            else {
                editStack = new ResourceEditStack(resourceLabel, strResource);
                this._editStacks.set(strResource, editStack);
            }
            editStack.pushElement(element);
        }
    }
    getLastElement(resource) {
        const strResource = this.getUriComparisonKey(resource);
        if (this._editStacks.has(strResource)) {
            const editStack = this._editStacks.get(strResource);
            if (editStack.hasFutureElements()) {
                return null;
            }
            const closestPastElement = editStack.getClosestPastElement();
            return closestPastElement ? closestPastElement.actual : null;
        }
        return null;
    }
    _splitPastWorkspaceElement(toRemove, ignoreResources) {
        const individualArr = toRemove.actual.split();
        const individualMap = new Map();
        for (const _element of individualArr) {
            const resourceLabel = getResourceLabel(_element.resource);
            const strResource = this.getUriComparisonKey(_element.resource);
            const element = new ResourceStackElement(_element, resourceLabel, strResource, 0, 0, 0, 0);
            individualMap.set(element.strResource, element);
        }
        for (const strResource of toRemove.strResources) {
            if (ignoreResources && ignoreResources.has(strResource)) {
                continue;
            }
            const editStack = this._editStacks.get(strResource);
            editStack.splitPastWorkspaceElement(toRemove, individualMap);
        }
    }
    _splitFutureWorkspaceElement(toRemove, ignoreResources) {
        const individualArr = toRemove.actual.split();
        const individualMap = new Map();
        for (const _element of individualArr) {
            const resourceLabel = getResourceLabel(_element.resource);
            const strResource = this.getUriComparisonKey(_element.resource);
            const element = new ResourceStackElement(_element, resourceLabel, strResource, 0, 0, 0, 0);
            individualMap.set(element.strResource, element);
        }
        for (const strResource of toRemove.strResources) {
            if (ignoreResources && ignoreResources.has(strResource)) {
                continue;
            }
            const editStack = this._editStacks.get(strResource);
            editStack.splitFutureWorkspaceElement(toRemove, individualMap);
        }
    }
    removeElements(resource) {
        const strResource = typeof resource === 'string' ? resource : this.getUriComparisonKey(resource);
        if (this._editStacks.has(strResource)) {
            const editStack = this._editStacks.get(strResource);
            editStack.dispose();
            this._editStacks.delete(strResource);
        }
        if (DEBUG) {
            this._print('removeElements');
        }
    }
    setElementsValidFlag(resource, isValid, filter) {
        const strResource = this.getUriComparisonKey(resource);
        if (this._editStacks.has(strResource)) {
            const editStack = this._editStacks.get(strResource);
            editStack.setElementsValidFlag(isValid, filter);
        }
        if (DEBUG) {
            this._print('setElementsValidFlag');
        }
    }
    hasElements(resource) {
        const strResource = this.getUriComparisonKey(resource);
        if (this._editStacks.has(strResource)) {
            const editStack = this._editStacks.get(strResource);
            return (editStack.hasPastElements() || editStack.hasFutureElements());
        }
        return false;
    }
    createSnapshot(resource) {
        const strResource = this.getUriComparisonKey(resource);
        if (this._editStacks.has(strResource)) {
            const editStack = this._editStacks.get(strResource);
            return editStack.createSnapshot(resource);
        }
        return new ResourceEditStackSnapshot(resource, []);
    }
    restoreSnapshot(snapshot) {
        const strResource = this.getUriComparisonKey(snapshot.resource);
        if (this._editStacks.has(strResource)) {
            const editStack = this._editStacks.get(strResource);
            editStack.restoreSnapshot(snapshot);
            if (!editStack.hasPastElements() && !editStack.hasFutureElements()) {
                // the edit stack is now empty, just remove it entirely
                editStack.dispose();
                this._editStacks.delete(strResource);
            }
        }
        if (DEBUG) {
            this._print('restoreSnapshot');
        }
    }
    getElements(resource) {
        const strResource = this.getUriComparisonKey(resource);
        if (this._editStacks.has(strResource)) {
            const editStack = this._editStacks.get(strResource);
            return editStack.getElements();
        }
        return { past: [], future: [] };
    }
    _findClosestUndoElementWithSource(sourceId) {
        if (!sourceId) {
            return [null, null];
        }
        // find an element with the sourceId and with the highest sourceOrder ready to be undone
        let matchedElement = null;
        let matchedStrResource = null;
        for (const [strResource, editStack] of this._editStacks) {
            const candidate = editStack.getClosestPastElement();
            if (!candidate) {
                continue;
            }
            if (candidate.sourceId === sourceId) {
                if (!matchedElement || candidate.sourceOrder > matchedElement.sourceOrder) {
                    matchedElement = candidate;
                    matchedStrResource = strResource;
                }
            }
        }
        return [matchedElement, matchedStrResource];
    }
    canUndo(resourceOrSource) {
        if (resourceOrSource instanceof UndoRedoSource) {
            const [, matchedStrResource] = this._findClosestUndoElementWithSource(resourceOrSource.id);
            return matchedStrResource ? true : false;
        }
        const strResource = this.getUriComparisonKey(resourceOrSource);
        if (this._editStacks.has(strResource)) {
            const editStack = this._editStacks.get(strResource);
            return editStack.hasPastElements();
        }
        return false;
    }
    _onError(err, element) {
        onUnexpectedError(err);
        // An error occurred while undoing or redoing => drop the undo/redo stack for all affected resources
        for (const strResource of element.strResources) {
            this.removeElements(strResource);
        }
        this._notificationService.error(err);
    }
    _acquireLocks(editStackSnapshot) {
        // first, check if all locks can be acquired
        for (const editStack of editStackSnapshot.editStacks) {
            if (editStack.locked) {
                throw new Error('Cannot acquire edit stack lock');
            }
        }
        // can acquire all locks
        for (const editStack of editStackSnapshot.editStacks) {
            editStack.locked = true;
        }
        return () => {
            // release all locks
            for (const editStack of editStackSnapshot.editStacks) {
                editStack.locked = false;
            }
        };
    }
    _safeInvokeWithLocks(element, invoke, editStackSnapshot, cleanup, continuation) {
        const releaseLocks = this._acquireLocks(editStackSnapshot);
        let result;
        try {
            result = invoke();
        }
        catch (err) {
            releaseLocks();
            cleanup.dispose();
            return this._onError(err, element);
        }
        if (result) {
            // result is Promise<void>
            return result.then(() => {
                releaseLocks();
                cleanup.dispose();
                return continuation();
            }, (err) => {
                releaseLocks();
                cleanup.dispose();
                return this._onError(err, element);
            });
        }
        else {
            // result is void
            releaseLocks();
            cleanup.dispose();
            return continuation();
        }
    }
    async _invokeWorkspacePrepare(element) {
        if (typeof element.actual.prepareUndoRedo === 'undefined') {
            return Disposable.None;
        }
        const result = element.actual.prepareUndoRedo();
        if (typeof result === 'undefined') {
            return Disposable.None;
        }
        return result;
    }
    _invokeResourcePrepare(element, callback) {
        if (element.actual.type !== 1 /* UndoRedoElementType.Workspace */ || typeof element.actual.prepareUndoRedo === 'undefined') {
            // no preparation needed
            return callback(Disposable.None);
        }
        const r = element.actual.prepareUndoRedo();
        if (!r) {
            // nothing to clean up
            return callback(Disposable.None);
        }
        if (isDisposable(r)) {
            return callback(r);
        }
        return r.then((disposable) => {
            return callback(disposable);
        });
    }
    _getAffectedEditStacks(element) {
        const affectedEditStacks = [];
        for (const strResource of element.strResources) {
            affectedEditStacks.push(this._editStacks.get(strResource) || missingEditStack);
        }
        return new EditStackSnapshot(affectedEditStacks);
    }
    _tryToSplitAndUndo(strResource, element, ignoreResources, message) {
        if (element.canSplit()) {
            this._splitPastWorkspaceElement(element, ignoreResources);
            this._notificationService.warn(message);
            return new WorkspaceVerificationError(this._undo(strResource, 0, true));
        }
        else {
            // Cannot safely split this workspace element => flush all undo/redo stacks
            for (const strResource of element.strResources) {
                this.removeElements(strResource);
            }
            this._notificationService.warn(message);
            return new WorkspaceVerificationError();
        }
    }
    _checkWorkspaceUndo(strResource, element, editStackSnapshot, checkInvalidatedResources) {
        if (element.removedResources) {
            return this._tryToSplitAndUndo(strResource, element, element.removedResources, nls.localize({ key: 'cannotWorkspaceUndo', comment: ['{0} is a label for an operation. {1} is another message.'] }, "Could not undo '{0}' across all files. {1}", element.label, element.removedResources.createMessage()));
        }
        if (checkInvalidatedResources && element.invalidatedResources) {
            return this._tryToSplitAndUndo(strResource, element, element.invalidatedResources, nls.localize({ key: 'cannotWorkspaceUndo', comment: ['{0} is a label for an operation. {1} is another message.'] }, "Could not undo '{0}' across all files. {1}", element.label, element.invalidatedResources.createMessage()));
        }
        // this must be the last past element in all the impacted resources!
        const cannotUndoDueToResources = [];
        for (const editStack of editStackSnapshot.editStacks) {
            if (editStack.getClosestPastElement() !== element) {
                cannotUndoDueToResources.push(editStack.resourceLabel);
            }
        }
        if (cannotUndoDueToResources.length > 0) {
            return this._tryToSplitAndUndo(strResource, element, null, nls.localize({ key: 'cannotWorkspaceUndoDueToChanges', comment: ['{0} is a label for an operation. {1} is a list of filenames.'] }, "Could not undo '{0}' across all files because changes were made to {1}", element.label, cannotUndoDueToResources.join(', ')));
        }
        const cannotLockDueToResources = [];
        for (const editStack of editStackSnapshot.editStacks) {
            if (editStack.locked) {
                cannotLockDueToResources.push(editStack.resourceLabel);
            }
        }
        if (cannotLockDueToResources.length > 0) {
            return this._tryToSplitAndUndo(strResource, element, null, nls.localize({ key: 'cannotWorkspaceUndoDueToInProgressUndoRedo', comment: ['{0} is a label for an operation. {1} is a list of filenames.'] }, "Could not undo '{0}' across all files because there is already an undo or redo operation running on {1}", element.label, cannotLockDueToResources.join(', ')));
        }
        // check if new stack elements were added in the meantime...
        if (!editStackSnapshot.isValid()) {
            return this._tryToSplitAndUndo(strResource, element, null, nls.localize({ key: 'cannotWorkspaceUndoDueToInMeantimeUndoRedo', comment: ['{0} is a label for an operation. {1} is a list of filenames.'] }, "Could not undo '{0}' across all files because an undo or redo operation occurred in the meantime", element.label));
        }
        return null;
    }
    _workspaceUndo(strResource, element, undoConfirmed) {
        const affectedEditStacks = this._getAffectedEditStacks(element);
        const verificationError = this._checkWorkspaceUndo(strResource, element, affectedEditStacks, /*invalidated resources will be checked after the prepare call*/ false);
        if (verificationError) {
            return verificationError.returnValue;
        }
        return this._confirmAndExecuteWorkspaceUndo(strResource, element, affectedEditStacks, undoConfirmed);
    }
    _isPartOfUndoGroup(element) {
        if (!element.groupId) {
            return false;
        }
        // check that there is at least another element with the same groupId ready to be undone
        for (const [, editStack] of this._editStacks) {
            const pastElement = editStack.getClosestPastElement();
            if (!pastElement) {
                continue;
            }
            if (pastElement === element) {
                const secondPastElement = editStack.getSecondClosestPastElement();
                if (secondPastElement && secondPastElement.groupId === element.groupId) {
                    // there is another element with the same group id in the same stack!
                    return true;
                }
            }
            if (pastElement.groupId === element.groupId) {
                // there is another element with the same group id in another stack!
                return true;
            }
        }
        return false;
    }
    async _confirmAndExecuteWorkspaceUndo(strResource, element, editStackSnapshot, undoConfirmed) {
        if (element.canSplit() && !this._isPartOfUndoGroup(element)) {
            // this element can be split
            let UndoChoice;
            (function (UndoChoice) {
                UndoChoice[UndoChoice["All"] = 0] = "All";
                UndoChoice[UndoChoice["This"] = 1] = "This";
                UndoChoice[UndoChoice["Cancel"] = 2] = "Cancel";
            })(UndoChoice || (UndoChoice = {}));
            const { result } = await this._dialogService.prompt({
                type: Severity.Info,
                message: nls.localize('confirmWorkspace', "Would you like to undo '{0}' across all files?", element.label),
                buttons: [
                    {
                        label: nls.localize({ key: 'ok', comment: ['{0} denotes a number that is > 1, && denotes a mnemonic'] }, "&&Undo in {0} Files", editStackSnapshot.editStacks.length),
                        run: () => UndoChoice.All
                    },
                    {
                        label: nls.localize({ key: 'nok', comment: ['&& denotes a mnemonic'] }, "Undo this &&File"),
                        run: () => UndoChoice.This
                    }
                ],
                cancelButton: {
                    run: () => UndoChoice.Cancel
                }
            });
            if (result === UndoChoice.Cancel) {
                // choice: cancel
                return;
            }
            if (result === UndoChoice.This) {
                // choice: undo this file
                this._splitPastWorkspaceElement(element, null);
                return this._undo(strResource, 0, true);
            }
            // choice: undo in all files
            // At this point, it is possible that the element has been made invalid in the meantime (due to the confirmation await)
            const verificationError1 = this._checkWorkspaceUndo(strResource, element, editStackSnapshot, /*invalidated resources will be checked after the prepare call*/ false);
            if (verificationError1) {
                return verificationError1.returnValue;
            }
            undoConfirmed = true;
        }
        // prepare
        let cleanup;
        try {
            cleanup = await this._invokeWorkspacePrepare(element);
        }
        catch (err) {
            return this._onError(err, element);
        }
        // At this point, it is possible that the element has been made invalid in the meantime (due to the prepare await)
        const verificationError2 = this._checkWorkspaceUndo(strResource, element, editStackSnapshot, /*now also check that there are no more invalidated resources*/ true);
        if (verificationError2) {
            cleanup.dispose();
            return verificationError2.returnValue;
        }
        for (const editStack of editStackSnapshot.editStacks) {
            editStack.moveBackward(element);
        }
        return this._safeInvokeWithLocks(element, () => element.actual.undo(), editStackSnapshot, cleanup, () => this._continueUndoInGroup(element.groupId, undoConfirmed));
    }
    _resourceUndo(editStack, element, undoConfirmed) {
        if (!element.isValid) {
            // invalid element => immediately flush edit stack!
            editStack.flushAllElements();
            return;
        }
        if (editStack.locked) {
            const message = nls.localize({ key: 'cannotResourceUndoDueToInProgressUndoRedo', comment: ['{0} is a label for an operation.'] }, "Could not undo '{0}' because there is already an undo or redo operation running.", element.label);
            this._notificationService.warn(message);
            return;
        }
        return this._invokeResourcePrepare(element, (cleanup) => {
            editStack.moveBackward(element);
            return this._safeInvokeWithLocks(element, () => element.actual.undo(), new EditStackSnapshot([editStack]), cleanup, () => this._continueUndoInGroup(element.groupId, undoConfirmed));
        });
    }
    _findClosestUndoElementInGroup(groupId) {
        if (!groupId) {
            return [null, null];
        }
        // find another element with the same groupId and with the highest groupOrder ready to be undone
        let matchedElement = null;
        let matchedStrResource = null;
        for (const [strResource, editStack] of this._editStacks) {
            const candidate = editStack.getClosestPastElement();
            if (!candidate) {
                continue;
            }
            if (candidate.groupId === groupId) {
                if (!matchedElement || candidate.groupOrder > matchedElement.groupOrder) {
                    matchedElement = candidate;
                    matchedStrResource = strResource;
                }
            }
        }
        return [matchedElement, matchedStrResource];
    }
    _continueUndoInGroup(groupId, undoConfirmed) {
        if (!groupId) {
            return;
        }
        const [, matchedStrResource] = this._findClosestUndoElementInGroup(groupId);
        if (matchedStrResource) {
            return this._undo(matchedStrResource, 0, undoConfirmed);
        }
    }
    undo(resourceOrSource) {
        if (resourceOrSource instanceof UndoRedoSource) {
            const [, matchedStrResource] = this._findClosestUndoElementWithSource(resourceOrSource.id);
            return matchedStrResource ? this._undo(matchedStrResource, resourceOrSource.id, false) : undefined;
        }
        if (typeof resourceOrSource === 'string') {
            return this._undo(resourceOrSource, 0, false);
        }
        return this._undo(this.getUriComparisonKey(resourceOrSource), 0, false);
    }
    _undo(strResource, sourceId = 0, undoConfirmed) {
        if (!this._editStacks.has(strResource)) {
            return;
        }
        const editStack = this._editStacks.get(strResource);
        const element = editStack.getClosestPastElement();
        if (!element) {
            return;
        }
        if (element.groupId) {
            // this element is a part of a group, we need to make sure undoing in a group is in order
            const [matchedElement, matchedStrResource] = this._findClosestUndoElementInGroup(element.groupId);
            if (element !== matchedElement && matchedStrResource) {
                // there is an element in the same group that should be undone before this one
                return this._undo(matchedStrResource, sourceId, undoConfirmed);
            }
        }
        const shouldPromptForConfirmation = (element.sourceId !== sourceId || element.confirmBeforeUndo);
        if (shouldPromptForConfirmation && !undoConfirmed) {
            // Hit a different source or the element asks for prompt before undo, prompt for confirmation
            return this._confirmAndContinueUndo(strResource, sourceId, element);
        }
        try {
            if (element.type === 1 /* UndoRedoElementType.Workspace */) {
                return this._workspaceUndo(strResource, element, undoConfirmed);
            }
            else {
                return this._resourceUndo(editStack, element, undoConfirmed);
            }
        }
        finally {
            if (DEBUG) {
                this._print('undo');
            }
        }
    }
    async _confirmAndContinueUndo(strResource, sourceId, element) {
        const result = await this._dialogService.confirm({
            message: nls.localize('confirmDifferentSource', "Would you like to undo '{0}'?", element.label),
            primaryButton: nls.localize({ key: 'confirmDifferentSource.yes', comment: ['&& denotes a mnemonic'] }, "&&Yes"),
            cancelButton: nls.localize('confirmDifferentSource.no', "No")
        });
        if (!result.confirmed) {
            return;
        }
        return this._undo(strResource, sourceId, true);
    }
    _findClosestRedoElementWithSource(sourceId) {
        if (!sourceId) {
            return [null, null];
        }
        // find an element with sourceId and with the lowest sourceOrder ready to be redone
        let matchedElement = null;
        let matchedStrResource = null;
        for (const [strResource, editStack] of this._editStacks) {
            const candidate = editStack.getClosestFutureElement();
            if (!candidate) {
                continue;
            }
            if (candidate.sourceId === sourceId) {
                if (!matchedElement || candidate.sourceOrder < matchedElement.sourceOrder) {
                    matchedElement = candidate;
                    matchedStrResource = strResource;
                }
            }
        }
        return [matchedElement, matchedStrResource];
    }
    canRedo(resourceOrSource) {
        if (resourceOrSource instanceof UndoRedoSource) {
            const [, matchedStrResource] = this._findClosestRedoElementWithSource(resourceOrSource.id);
            return matchedStrResource ? true : false;
        }
        const strResource = this.getUriComparisonKey(resourceOrSource);
        if (this._editStacks.has(strResource)) {
            const editStack = this._editStacks.get(strResource);
            return editStack.hasFutureElements();
        }
        return false;
    }
    _tryToSplitAndRedo(strResource, element, ignoreResources, message) {
        if (element.canSplit()) {
            this._splitFutureWorkspaceElement(element, ignoreResources);
            this._notificationService.warn(message);
            return new WorkspaceVerificationError(this._redo(strResource));
        }
        else {
            // Cannot safely split this workspace element => flush all undo/redo stacks
            for (const strResource of element.strResources) {
                this.removeElements(strResource);
            }
            this._notificationService.warn(message);
            return new WorkspaceVerificationError();
        }
    }
    _checkWorkspaceRedo(strResource, element, editStackSnapshot, checkInvalidatedResources) {
        if (element.removedResources) {
            return this._tryToSplitAndRedo(strResource, element, element.removedResources, nls.localize({ key: 'cannotWorkspaceRedo', comment: ['{0} is a label for an operation. {1} is another message.'] }, "Could not redo '{0}' across all files. {1}", element.label, element.removedResources.createMessage()));
        }
        if (checkInvalidatedResources && element.invalidatedResources) {
            return this._tryToSplitAndRedo(strResource, element, element.invalidatedResources, nls.localize({ key: 'cannotWorkspaceRedo', comment: ['{0} is a label for an operation. {1} is another message.'] }, "Could not redo '{0}' across all files. {1}", element.label, element.invalidatedResources.createMessage()));
        }
        // this must be the last future element in all the impacted resources!
        const cannotRedoDueToResources = [];
        for (const editStack of editStackSnapshot.editStacks) {
            if (editStack.getClosestFutureElement() !== element) {
                cannotRedoDueToResources.push(editStack.resourceLabel);
            }
        }
        if (cannotRedoDueToResources.length > 0) {
            return this._tryToSplitAndRedo(strResource, element, null, nls.localize({ key: 'cannotWorkspaceRedoDueToChanges', comment: ['{0} is a label for an operation. {1} is a list of filenames.'] }, "Could not redo '{0}' across all files because changes were made to {1}", element.label, cannotRedoDueToResources.join(', ')));
        }
        const cannotLockDueToResources = [];
        for (const editStack of editStackSnapshot.editStacks) {
            if (editStack.locked) {
                cannotLockDueToResources.push(editStack.resourceLabel);
            }
        }
        if (cannotLockDueToResources.length > 0) {
            return this._tryToSplitAndRedo(strResource, element, null, nls.localize({ key: 'cannotWorkspaceRedoDueToInProgressUndoRedo', comment: ['{0} is a label for an operation. {1} is a list of filenames.'] }, "Could not redo '{0}' across all files because there is already an undo or redo operation running on {1}", element.label, cannotLockDueToResources.join(', ')));
        }
        // check if new stack elements were added in the meantime...
        if (!editStackSnapshot.isValid()) {
            return this._tryToSplitAndRedo(strResource, element, null, nls.localize({ key: 'cannotWorkspaceRedoDueToInMeantimeUndoRedo', comment: ['{0} is a label for an operation. {1} is a list of filenames.'] }, "Could not redo '{0}' across all files because an undo or redo operation occurred in the meantime", element.label));
        }
        return null;
    }
    _workspaceRedo(strResource, element) {
        const affectedEditStacks = this._getAffectedEditStacks(element);
        const verificationError = this._checkWorkspaceRedo(strResource, element, affectedEditStacks, /*invalidated resources will be checked after the prepare call*/ false);
        if (verificationError) {
            return verificationError.returnValue;
        }
        return this._executeWorkspaceRedo(strResource, element, affectedEditStacks);
    }
    async _executeWorkspaceRedo(strResource, element, editStackSnapshot) {
        // prepare
        let cleanup;
        try {
            cleanup = await this._invokeWorkspacePrepare(element);
        }
        catch (err) {
            return this._onError(err, element);
        }
        // At this point, it is possible that the element has been made invalid in the meantime (due to the prepare await)
        const verificationError = this._checkWorkspaceRedo(strResource, element, editStackSnapshot, /*now also check that there are no more invalidated resources*/ true);
        if (verificationError) {
            cleanup.dispose();
            return verificationError.returnValue;
        }
        for (const editStack of editStackSnapshot.editStacks) {
            editStack.moveForward(element);
        }
        return this._safeInvokeWithLocks(element, () => element.actual.redo(), editStackSnapshot, cleanup, () => this._continueRedoInGroup(element.groupId));
    }
    _resourceRedo(editStack, element) {
        if (!element.isValid) {
            // invalid element => immediately flush edit stack!
            editStack.flushAllElements();
            return;
        }
        if (editStack.locked) {
            const message = nls.localize({ key: 'cannotResourceRedoDueToInProgressUndoRedo', comment: ['{0} is a label for an operation.'] }, "Could not redo '{0}' because there is already an undo or redo operation running.", element.label);
            this._notificationService.warn(message);
            return;
        }
        return this._invokeResourcePrepare(element, (cleanup) => {
            editStack.moveForward(element);
            return this._safeInvokeWithLocks(element, () => element.actual.redo(), new EditStackSnapshot([editStack]), cleanup, () => this._continueRedoInGroup(element.groupId));
        });
    }
    _findClosestRedoElementInGroup(groupId) {
        if (!groupId) {
            return [null, null];
        }
        // find another element with the same groupId and with the lowest groupOrder ready to be redone
        let matchedElement = null;
        let matchedStrResource = null;
        for (const [strResource, editStack] of this._editStacks) {
            const candidate = editStack.getClosestFutureElement();
            if (!candidate) {
                continue;
            }
            if (candidate.groupId === groupId) {
                if (!matchedElement || candidate.groupOrder < matchedElement.groupOrder) {
                    matchedElement = candidate;
                    matchedStrResource = strResource;
                }
            }
        }
        return [matchedElement, matchedStrResource];
    }
    _continueRedoInGroup(groupId) {
        if (!groupId) {
            return;
        }
        const [, matchedStrResource] = this._findClosestRedoElementInGroup(groupId);
        if (matchedStrResource) {
            return this._redo(matchedStrResource);
        }
    }
    redo(resourceOrSource) {
        if (resourceOrSource instanceof UndoRedoSource) {
            const [, matchedStrResource] = this._findClosestRedoElementWithSource(resourceOrSource.id);
            return matchedStrResource ? this._redo(matchedStrResource) : undefined;
        }
        if (typeof resourceOrSource === 'string') {
            return this._redo(resourceOrSource);
        }
        return this._redo(this.getUriComparisonKey(resourceOrSource));
    }
    _redo(strResource) {
        if (!this._editStacks.has(strResource)) {
            return;
        }
        const editStack = this._editStacks.get(strResource);
        const element = editStack.getClosestFutureElement();
        if (!element) {
            return;
        }
        if (element.groupId) {
            // this element is a part of a group, we need to make sure redoing in a group is in order
            const [matchedElement, matchedStrResource] = this._findClosestRedoElementInGroup(element.groupId);
            if (element !== matchedElement && matchedStrResource) {
                // there is an element in the same group that should be redone before this one
                return this._redo(matchedStrResource);
            }
        }
        try {
            if (element.type === 1 /* UndoRedoElementType.Workspace */) {
                return this._workspaceRedo(strResource, element);
            }
            else {
                return this._resourceRedo(editStack, element);
            }
        }
        finally {
            if (DEBUG) {
                this._print('redo');
            }
        }
    }
};
UndoRedoService = __decorate([
    __param(0, IDialogService),
    __param(1, INotificationService)
], UndoRedoService);
export { UndoRedoService };
class WorkspaceVerificationError {
    constructor(returnValue) {
        this.returnValue = returnValue;
    }
}
registerSingleton(IUndoRedoService, UndoRedoService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW5kb1JlZG9TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VuZG9SZWRvL2NvbW1vbi91bmRvUmVkb1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDbkUsT0FBTyxFQUFFLFVBQVUsRUFBZSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMxRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDMUQsT0FBTyxRQUFRLE1BQU0sa0NBQWtDLENBQUM7QUFFeEQsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQztBQUN2QyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDakUsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ2pGLE9BQU8sRUFBbUUsZ0JBQWdCLEVBQTZCLHlCQUF5QixFQUF1QixhQUFhLEVBQUUsY0FBYyxFQUE0QixNQUFNLGVBQWUsQ0FBQztBQUV0UCxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUM7QUFFcEIsU0FBUyxnQkFBZ0IsQ0FBQyxRQUFhO0lBQ3RDLE9BQU8sUUFBUSxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDO0FBQzNFLENBQUM7QUFFRCxJQUFJLG1CQUFtQixHQUFHLENBQUMsQ0FBQztBQUU1QixNQUFNLG9CQUFvQjtJQWlCekIsWUFBWSxNQUF3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