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
var AbstractChatEditingModifiedFileEntry_1;
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable, DisposableMap, MutableDisposable } from '../../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../../base/common/network.js';
import { clamp } from '../../../../../base/common/numbers.js';
import { autorun, derived, observableValue } from '../../../../../base/common/observable.js';
import { localize } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { observableConfigValue } from '../../../../../platform/observable/common/platformObservableUtils.js';
import { editorBackground, registerColor, transparent } from '../../../../../platform/theme/common/colorRegistry.js';
import { IUndoRedoService } from '../../../../../platform/undoRedo/common/undoRedo.js';
import { IFilesConfigurationService } from '../../../../services/filesConfiguration/common/filesConfigurationService.js';
import { IChatService } from '../../common/chatService.js';
class AutoAcceptControl {
    constructor(total, remaining, cancel) {
        this.total = total;
        this.remaining = remaining;
        this.cancel = cancel;
    }
}
export const pendingRewriteMinimap = registerColor('minimap.chatEditHighlight', transparent(editorBackground, 0.6), localize('editorSelectionBackground', "Color of pending edit regions in the minimap"));
let AbstractChatEditingModifiedFileEntry = class AbstractChatEditingModifiedFileEntry extends Disposable {
    static { AbstractChatEditingModifiedFileEntry_1 = this; }
    static { this.scheme = 'modified-file-entry'; }
    static { this.lastEntryId = 0; }
    get telemetryInfo() {
        return this._telemetryInfo;
    }
    get lastModifyingRequestId() {
        return this._telemetryInfo.requestId;
    }
    constructor(modifiedURI, _telemetryInfo, kind, configService, _fileConfigService, _chatService, _fileService, _undoRedoService, _instantiationService) {
        super();
        this.modifiedURI = modifiedURI;
        this._telemetryInfo = _telemetryInfo;
        this._fileConfigService = _fileConfigService;
        this._chatService = _chatService;
        this._fileService = _fileService;
        this._undoRedoService = _undoRedoService;
        this._instantiationService = _instantiationService;
        this.entryId = `${AbstractChatEditingModifiedFileEntry_1.scheme}::${++AbstractChatEditingModifiedFileEntry_1.lastEntryId}`;
        this._onDidDelete = this._register(new Emitter());
        this.onDidDelete = this._onDidDelete.event;
        this._stateObs = observableValue(this, 4 /* WorkingSetEntryState.Attached */);
        this.state = this._stateObs;
        this._isCurrentlyBeingModifiedByObs = observableValue(this, undefined);
        this.isCurrentlyBeingModifiedBy = this._isCurrentlyBeingModifiedByObs;
        this._rewriteRatioObs = observableValue(this, 0);
        this.rewriteRatio = this._rewriteRatioObs;
        this._reviewModeTempObs = observableValue(this, undefined);
        this._autoAcceptCtrl = observableValue(this, undefined);
        this.autoAcceptController = this._autoAcceptCtrl;
        this._refCounter = 1;
        this._editorIntegrations = this._register(new DisposableMap());
        if (kind === 0 /* ChatEditKind.Created */) {
            this.createdInRequestId = this._telemetryInfo.requestId;
        }
        if (this.modifiedURI.scheme !== Schemas.untitled && this.modifiedURI.scheme !== Schemas.vscodeNotebookCell) {
            this._register(this._fileService.watch(this.modifiedURI));
            this._register(this._fileService.onDidFilesChange(e => {
                if (e.affects(this.modifiedURI) && kind === 0 /* ChatEditKind.Created */ && e.gotDeleted()) {
                    this._onDidDelete.fire();
                }
            }));
        }
        // review mode depends on setting and temporary override
        const autoAcceptRaw = observableConfigValue('chat.editing.autoAcceptDelay', 0, configService);
        this._autoAcceptTimeout = derived(r => {
            const value = autoAcceptRaw.read(r);
            return clamp(value, 0, 100);
        });
        this.reviewMode = derived(r => {
            const configuredValue = this._autoAcceptTimeout.read(r);
            const tempValue = this._reviewModeTempObs.read(r);
            return tempValue ?? configuredValue === 0;
        });
        const autoSaveOff = this._store.add(new MutableDisposable());
        this._store.add(autorun(r => {
            if (this.isCurrentlyBeingModifiedBy.read(r)) {
                autoSaveOff.value = _fileConfigService.disableAutoSave(this.modifiedURI);
            }
            else {
                autoSaveOff.clear();
            }
        }));
    }
    dispose() {
        if (--this._refCounter === 0) {
            super.dispose();
        }
    }
    acquire() {
        this._refCounter++;
        return this;
    }
    enableReviewModeUntilSettled() {
        this._reviewModeTempObs.set(true, undefined);
        const cleanup = autorun(r => {
            // reset config when settled
            const resetConfig = this.state.read(r) !== 0 /* WorkingSetEntryState.Modified */;
            if (resetConfig) {
                this._store.delete(cleanup);
                this._reviewModeTempObs.set(undefined, undefined);
            }
        });
        this._store.add(cleanup);
    }
    updateTelemetryInfo(telemetryInfo) {
        this._telemetryInfo = telemetryInfo;
    }
    async accept(tx) {
        if (this._stateObs.get() !== 0 /* WorkingSetEntryState.Modified */) {
            // already accepted or rejected
            return;
        }
        await this._doAccept(tx);
        this._stateObs.set(1 /* WorkingSetEntryState.Accepted */, tx);
        this._autoAcceptCtrl.set(undefined, tx);
        this._notifyAction('accepted');
    }
    async reject(tx) {
        if (this._stateObs.get() !== 0 /* WorkingSetEntryState.Modified */) {
            // already accepted or rejected
            return;
        }
        await this._doReject(tx);
        this._stateObs.set(2 /* WorkingSetEntryState.Rejected */, tx);
        this._autoAcceptCtrl.set(undefined, tx);
        this._notifyAction('rejected');
    }
    _notifyAction(outcome) {
        this._chatService.notifyUserAction({
            action: { kind: 'chatEditingSessionAction', uri: this.modifiedURI, hasRemainingEdits: false, outcome },
            agentId: this._telemetryInfo.agentId,
            command: this._telemetryInfo.command,
            sessionId: this._telemetryInfo.sessionId,
            requestId: this._telemetryInfo.requestId,
            result: this._telemetryInfo.result
        });
    }
    getEditorIntegration(pane) {
        let value = this._editorIntegrations.get(pane);
        if (!value) {
            value = this._createEditorIntegration(pane);
            this._editorIntegrations.set(pane, value);
        }
        return value;
    }
    acceptStreamingEditsStart(responseModel, tx) {
        this._resetEditsState(tx);
        this._isCurrentlyBeingModifiedByObs.set(responseModel, tx);
        this._autoAcceptCtrl.get()?.cancel();
        const undoRedoElement = this._createUndoRedoElement(responseModel);
        if (undoRedoElement) {
            this._undoRedoService.pushElement(undoRedoElement);
        }
    }
    async acceptStreamingEditsEnd(tx) {
        this._resetEditsState(tx);
        if (await this._areOriginalAndModifiedIdentical()) {
            // ACCEPT if identical
            this.accept(tx);
        }
        else if (!this.reviewMode.get() && !this._autoAcceptCtrl.get()) {
            // AUTO accept mode
            const acceptTimeout = this._autoAcceptTimeout.get() * 1000;
            const future = Date.now() + acceptTimeout;
            const update = () => {
                const reviewMode = this.reviewMode.get();
                if (reviewMode) {
                    // switched back to review mode
                    this._autoAcceptCtrl.set(undefined, undefined);
                    return;
                }
                const remain = Math.round(future - Date.now());
                if (remain <= 0) {
                    this.accept(undefined);
                }
                else {
                    const handle = setTimeout(update, 100);
                    this._autoAcceptCtrl.set(new AutoAcceptControl(acceptTimeout, remain, () => {
                        clearTimeout(handle);
                        this._autoAcceptCtrl.set(undefined, undefined);
                    }), undefined);
                }
            };
            update();
        }
    }
    _resetEditsState(tx) {
        this._isCurrentlyBeingModifiedByObs.set(undefined, tx);
        this._rewriteRatioObs.set(0, tx);
    }
};
AbstractChatEditingModifiedFileEntry = AbstractChatEditingModifiedFileEntry_1 = __decorate([
    __param(3, IConfigurationService),
    __param(4, IFilesConfigurationService),
    __param(5, IChatService),
    __param(6, IFileService),
    __param(7, IUndoRedoService),
    __param(8, IInstantiationService)
], AbstractChatEditingModifiedFileEntry);
export { AbstractChatEditingModifiedFileEntry };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdNb2RpZmllZEZpbGVFbnRyeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdEVkaXRpbmcvY2hhdEVkaXRpbmdNb2RpZmllZEZpbGVFbnRyeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDdkcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBNkIsZUFBZSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFJeEgsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2pELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUM3RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxzRUFBc0UsQ0FBQztBQUM3RyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsYUFBYSxFQUFFLFdBQVcsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3JILE9BQU8sRUFBb0IsZ0JBQWdCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUV6RyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSw2RUFB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