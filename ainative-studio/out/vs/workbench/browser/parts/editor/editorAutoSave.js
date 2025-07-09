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
import { Disposable, DisposableStore, dispose, toDisposable } from '../../../../base/common/lifecycle.js';
import { IFilesConfigurationService } from '../../../services/filesConfiguration/common/filesConfigurationService.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { IWorkingCopyService } from '../../../services/workingCopy/common/workingCopyService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IMarkerService } from '../../../../platform/markers/common/markers.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
let EditorAutoSave = class EditorAutoSave extends Disposable {
    static { this.ID = 'workbench.contrib.editorAutoSave'; }
    constructor(filesConfigurationService, hostService, editorService, editorGroupService, workingCopyService, logService, markerService, uriIdentityService) {
        super();
        this.filesConfigurationService = filesConfigurationService;
        this.hostService = hostService;
        this.editorService = editorService;
        this.editorGroupService = editorGroupService;
        this.workingCopyService = workingCopyService;
        this.logService = logService;
        this.markerService = markerService;
        this.uriIdentityService = uriIdentityService;
        // Auto save: after delay
        this.scheduledAutoSavesAfterDelay = new Map();
        // Auto save: focus change & window change
        this.lastActiveEditor = undefined;
        this.lastActiveGroupId = undefined;
        this.lastActiveEditorControlDisposable = this._register(new DisposableStore());
        // Auto save: waiting on specific condition
        this.waitingOnConditionAutoSaveWorkingCopies = new ResourceMap(resource => this.uriIdentityService.extUri.getComparisonKey(resource));
        this.waitingOnConditionAutoSaveEditors = new ResourceMap(resource => this.uriIdentityService.extUri.getComparisonKey(resource));
        // Fill in initial dirty working copies
        for (const dirtyWorkingCopy of this.workingCopyService.dirtyWorkingCopies) {
            this.onDidRegister(dirtyWorkingCopy);
        }
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.hostService.onDidChangeFocus(focused => this.onWindowFocusChange(focused)));
        this._register(this.hostService.onDidChangeActiveWindow(() => this.onActiveWindowChange()));
        this._register(this.editorService.onDidActiveEditorChange(() => this.onDidActiveEditorChange()));
        this._register(this.filesConfigurationService.onDidChangeAutoSaveConfiguration(() => this.onDidChangeAutoSaveConfiguration()));
        // Working Copy events
        this._register(this.workingCopyService.onDidRegister(workingCopy => this.onDidRegister(workingCopy)));
        this._register(this.workingCopyService.onDidUnregister(workingCopy => this.onDidUnregister(workingCopy)));
        this._register(this.workingCopyService.onDidChangeDirty(workingCopy => this.onDidChangeDirty(workingCopy)));
        this._register(this.workingCopyService.onDidChangeContent(workingCopy => this.onDidChangeContent(workingCopy)));
        // Condition changes
        this._register(this.markerService.onMarkerChanged(e => this.onConditionChanged(e, 3 /* AutoSaveDisabledReason.ERRORS */)));
        this._register(this.filesConfigurationService.onDidChangeAutoSaveDisabled(resource => this.onConditionChanged([resource], 4 /* AutoSaveDisabledReason.DISABLED */)));
    }
    onConditionChanged(resources, condition) {
        for (const resource of resources) {
            // Waiting working copies
            const workingCopyResult = this.waitingOnConditionAutoSaveWorkingCopies.get(resource);
            if (workingCopyResult?.condition === condition) {
                if (workingCopyResult.workingCopy.isDirty() &&
                    this.filesConfigurationService.getAutoSaveMode(workingCopyResult.workingCopy.resource, workingCopyResult.reason).mode !== 0 /* AutoSaveMode.OFF */) {
                    this.discardAutoSave(workingCopyResult.workingCopy);
                    this.logService.trace(`[editor auto save] running auto save from condition change event`, workingCopyResult.workingCopy.resource.toString(), workingCopyResult.workingCopy.typeId);
                    workingCopyResult.workingCopy.save({ reason: workingCopyResult.reason });
                }
            }
            // Waiting editors
            else {
                const editorResult = this.waitingOnConditionAutoSaveEditors.get(resource);
                if (editorResult?.condition === condition &&
                    !editorResult.editor.editor.isDisposed() &&
                    editorResult.editor.editor.isDirty() &&
                    this.filesConfigurationService.getAutoSaveMode(editorResult.editor.editor, editorResult.reason).mode !== 0 /* AutoSaveMode.OFF */) {
                    this.waitingOnConditionAutoSaveEditors.delete(resource);
                    this.logService.trace(`[editor auto save] running auto save from condition change event with reason ${editorResult.reason}`);
                    this.editorService.save(editorResult.editor, { reason: editorResult.reason });
                }
            }
        }
    }
    onWindowFocusChange(focused) {
        if (!focused) {
            this.maybeTriggerAutoSave(4 /* SaveReason.WINDOW_CHANGE */);
        }
    }
    onActiveWindowChange() {
        this.maybeTriggerAutoSave(4 /* SaveReason.WINDOW_CHANGE */);
    }
    onDidActiveEditorChange() {
        // Treat editor change like a focus change for our last active editor if any
        if (this.lastActiveEditor && typeof this.lastActiveGroupId === 'number') {
            this.maybeTriggerAutoSave(3 /* SaveReason.FOCUS_CHANGE */, { groupId: this.lastActiveGroupId, editor: this.lastActiveEditor });
        }
        // Remember as last active
        const activeGroup = this.editorGroupService.activeGroup;
        const activeEditor = this.lastActiveEditor = activeGroup.activeEditor ?? undefined;
        this.lastActiveGroupId = activeGroup.id;
        // Dispose previous active control listeners
        this.lastActiveEditorControlDisposable.clear();
        // Listen to focus changes on control for auto save
        const activeEditorPane = this.editorService.activeEditorPane;
        if (activeEditor && activeEditorPane) {
            this.lastActiveEditorControlDisposable.add(activeEditorPane.onDidBlur(() => {
                this.maybeTriggerAutoSave(3 /* SaveReason.FOCUS_CHANGE */, { groupId: activeGroup.id, editor: activeEditor });
            }));
        }
    }
    maybeTriggerAutoSave(reason, editorIdentifier) {
        if (editorIdentifier) {
            if (!editorIdentifier.editor.isDirty() ||
                editorIdentifier.editor.isReadonly() ||
                editorIdentifier.editor.hasCapability(4 /* EditorInputCapabilities.Untitled */)) {
                return; // no auto save for non-dirty, readonly or untitled editors
            }
            const autoSaveMode = this.filesConfigurationService.getAutoSaveMode(editorIdentifier.editor, reason);
            if (autoSaveMode.mode !== 0 /* AutoSaveMode.OFF */) {
                // Determine if we need to save all. In case of a window focus change we also save if
                // auto save mode is configured to be ON_FOCUS_CHANGE (editor focus change)
                if ((reason === 4 /* SaveReason.WINDOW_CHANGE */ && (autoSaveMode.mode === 3 /* AutoSaveMode.ON_FOCUS_CHANGE */ || autoSaveMode.mode === 4 /* AutoSaveMode.ON_WINDOW_CHANGE */)) ||
                    (reason === 3 /* SaveReason.FOCUS_CHANGE */ && autoSaveMode.mode === 3 /* AutoSaveMode.ON_FOCUS_CHANGE */)) {
                    this.logService.trace(`[editor auto save] triggering auto save with reason ${reason}`);
                    this.editorService.save(editorIdentifier, { reason });
                }
            }
            else if (editorIdentifier.editor.resource && (autoSaveMode.reason === 3 /* AutoSaveDisabledReason.ERRORS */ || autoSaveMode.reason === 4 /* AutoSaveDisabledReason.DISABLED */)) {
                this.waitingOnConditionAutoSaveEditors.set(editorIdentifier.editor.resource, { editor: editorIdentifier, reason, condition: autoSaveMode.reason });
            }
        }
        else {
            this.saveAllDirtyAutoSaveables(reason);
        }
    }
    onDidChangeAutoSaveConfiguration() {
        // Trigger a save-all when auto save is enabled
        let reason = undefined;
        switch (this.filesConfigurationService.getAutoSaveMode(undefined).mode) {
            case 3 /* AutoSaveMode.ON_FOCUS_CHANGE */:
                reason = 3 /* SaveReason.FOCUS_CHANGE */;
                break;
            case 4 /* AutoSaveMode.ON_WINDOW_CHANGE */:
                reason = 4 /* SaveReason.WINDOW_CHANGE */;
                break;
            case 1 /* AutoSaveMode.AFTER_SHORT_DELAY */:
            case 2 /* AutoSaveMode.AFTER_LONG_DELAY */:
                reason = 2 /* SaveReason.AUTO */;
                break;
        }
        if (reason) {
            this.saveAllDirtyAutoSaveables(reason);
        }
    }
    saveAllDirtyAutoSaveables(reason) {
        for (const workingCopy of this.workingCopyService.dirtyWorkingCopies) {
            if (workingCopy.capabilities & 2 /* WorkingCopyCapabilities.Untitled */) {
                continue; // we never auto save untitled working copies
            }
            const autoSaveMode = this.filesConfigurationService.getAutoSaveMode(workingCopy.resource, reason);
            if (autoSaveMode.mode !== 0 /* AutoSaveMode.OFF */) {
                workingCopy.save({ reason });
            }
            else if (autoSaveMode.reason === 3 /* AutoSaveDisabledReason.ERRORS */ || autoSaveMode.reason === 4 /* AutoSaveDisabledReason.DISABLED */) {
                this.waitingOnConditionAutoSaveWorkingCopies.set(workingCopy.resource, { workingCopy, reason, condition: autoSaveMode.reason });
            }
        }
    }
    onDidRegister(workingCopy) {
        if (workingCopy.isDirty()) {
            this.scheduleAutoSave(workingCopy);
        }
    }
    onDidUnregister(workingCopy) {
        this.discardAutoSave(workingCopy);
    }
    onDidChangeDirty(workingCopy) {
        if (workingCopy.isDirty()) {
            this.scheduleAutoSave(workingCopy);
        }
        else {
            this.discardAutoSave(workingCopy);
        }
    }
    onDidChangeContent(workingCopy) {
        if (workingCopy.isDirty()) {
            // this listener will make sure that the auto save is
            // pushed out for as long as the user is still changing
            // the content of the working copy.
            this.scheduleAutoSave(workingCopy);
        }
    }
    scheduleAutoSave(workingCopy) {
        if (workingCopy.capabilities & 2 /* WorkingCopyCapabilities.Untitled */) {
            return; // we never auto save untitled working copies
        }
        const autoSaveAfterDelay = this.filesConfigurationService.getAutoSaveConfiguration(workingCopy.resource).autoSaveDelay;
        if (typeof autoSaveAfterDelay !== 'number') {
            return; // auto save after delay must be enabled
        }
        // Clear any running auto save operation
        this.discardAutoSave(workingCopy);
        this.logService.trace(`[editor auto save] scheduling auto save after ${autoSaveAfterDelay}ms`, workingCopy.resource.toString(), workingCopy.typeId);
        // Schedule new auto save
        const handle = setTimeout(() => {
            // Clear pending
            this.discardAutoSave(workingCopy);
            // Save if dirty and unless prevented by other conditions such as error markers
            if (workingCopy.isDirty()) {
                const reason = 2 /* SaveReason.AUTO */;
                const autoSaveMode = this.filesConfigurationService.getAutoSaveMode(workingCopy.resource, reason);
                if (autoSaveMode.mode !== 0 /* AutoSaveMode.OFF */) {
                    this.logService.trace(`[editor auto save] running auto save`, workingCopy.resource.toString(), workingCopy.typeId);
                    workingCopy.save({ reason });
                }
                else if (autoSaveMode.reason === 3 /* AutoSaveDisabledReason.ERRORS */ || autoSaveMode.reason === 4 /* AutoSaveDisabledReason.DISABLED */) {
                    this.waitingOnConditionAutoSaveWorkingCopies.set(workingCopy.resource, { workingCopy, reason, condition: autoSaveMode.reason });
                }
            }
        }, autoSaveAfterDelay);
        // Keep in map for disposal as needed
        this.scheduledAutoSavesAfterDelay.set(workingCopy, toDisposable(() => {
            this.logService.trace(`[editor auto save] clearing pending auto save`, workingCopy.resource.toString(), workingCopy.typeId);
            clearTimeout(handle);
        }));
    }
    discardAutoSave(workingCopy) {
        dispose(this.scheduledAutoSavesAfterDelay.get(workingCopy));
        this.scheduledAutoSavesAfterDelay.delete(workingCopy);
        this.waitingOnConditionAutoSaveWorkingCopies.delete(workingCopy.resource);
        this.waitingOnConditionAutoSaveEditors.delete(workingCopy.resource);
    }
};
EditorAutoSave = __decorate([
    __param(0, IFilesConfigurationService),
    __param(1, IHostService),
    __param(2, IEditorService),
    __param(3, IEditorGroupsService),
    __param(4, IWorkingCopyService),
    __param(5, ILogService),
    __param(6, IMarkerService),
    __param(7, IUriIdentityService)
], EditorAutoSave);
export { EditorAutoSave };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yQXV0b1NhdmUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvZWRpdG9yL2VkaXRvckF1dG9TYXZlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN2SCxPQUFPLEVBQUUsMEJBQTBCLEVBQXdDLE1BQU0sMEVBQTBFLENBQUM7QUFDNUosT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBR3RFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNsRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUM5RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUVqRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBRWhGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUV0RixJQUFNLGNBQWMsR0FBcEIsTUFBTSxjQUFlLFNBQVEsVUFBVTthQUU3QixPQUFFLEdBQUcsa0NBQWtDLEFBQXJDLENBQXNDO0lBY3hELFlBQzZCLHlCQUFzRSxFQUNwRixXQUEwQyxFQUN4QyxhQUE4QyxFQUN4QyxrQkFBeUQsRUFDMUQsa0JBQXdELEVBQ2hFLFVBQXdDLEVBQ3JDLGFBQThDLEVBQ3pDLGtCQUF3RDtRQUU3RSxLQUFLLEVBQUUs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