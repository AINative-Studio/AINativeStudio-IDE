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
import '../media/chatEditingEditorOverlay.css';
import { combinedDisposable, DisposableMap, DisposableStore, MutableDisposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { autorun, derived, derivedOpts, observableFromEvent, observableSignalFromEvent, observableValue, transaction } from '../../../../../base/common/observable.js';
import { MenuWorkbenchToolBar } from '../../../../../platform/actions/browser/toolbar.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IChatEditingService } from '../../common/chatEditingService.js';
import { MenuId } from '../../../../../platform/actions/common/actions.js';
import { ActionViewItem } from '../../../../../base/browser/ui/actionbar/actionViewItems.js';
import { addDisposableGenericMouseMoveListener, append, reset } from '../../../../../base/browser/dom.js';
import { renderIcon } from '../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { assertType } from '../../../../../base/common/types.js';
import { localize } from '../../../../../nls.js';
import { AcceptAction, navigationBearingFakeActionId, RejectAction } from './chatEditingEditorActions.js';
import { IChatService } from '../../common/chatService.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { EditorGroupView } from '../../../../browser/parts/editor/editorGroupView.js';
import { Event } from '../../../../../base/common/event.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { EditorResourceAccessor, SideBySideEditor } from '../../../../common/editor.js';
import { IInlineChatSessionService } from '../../../inlineChat/browser/inlineChatSessionService.js';
import { isEqual } from '../../../../../base/common/resources.js';
import { ObservableEditorSession } from './chatEditingEditorContextKeys.js';
import { rcut } from '../../../../../base/common/strings.js';
let ChatEditorOverlayWidget = class ChatEditorOverlayWidget {
    constructor(_editor, _chatService, instaService) {
        this._editor = _editor;
        this._chatService = _chatService;
        this._showStore = new DisposableStore();
        this._session = observableValue(this, undefined);
        this._entry = observableValue(this, undefined);
        this._navigationBearings = observableValue(this, { changeCount: -1, activeIdx: -1, entriesCount: -1 });
        this._domNode = document.createElement('div');
        this._domNode.classList.add('chat-editor-overlay-widget');
        const progressNode = document.createElement('div');
        progressNode.classList.add('chat-editor-overlay-progress');
        append(progressNode, renderIcon(ThemeIcon.modify(Codicon.loading, 'spin')));
        this._domNode.appendChild(progressNode);
        const toolbarNode = document.createElement('div');
        toolbarNode.classList.add('chat-editor-overlay-toolbar');
        this._domNode.appendChild(toolbarNode);
        this._toolbar = instaService.createInstance(MenuWorkbenchToolBar, toolbarNode, MenuId.ChatEditingEditorContent, {
            telemetrySource: 'chatEditor.overlayToolbar',
            hiddenItemStrategy: 0 /* HiddenItemStrategy.Ignore */,
            toolbarOptions: {
                primaryGroup: () => true,
                useSeparatorsInPrimaryActions: true
            },
            menuOptions: { renderShortTitle: true },
            actionViewItemProvider: (action, options) => {
                const that = this;
                if (action.id === navigationBearingFakeActionId) {
                    return new class extends ActionViewItem {
                        constructor() {
                            super(undefined, action, { ...options, icon: false, label: true, keybindingNotRenderedWithLabel: true });
                        }
                        render(container) {
                            super.render(container);
                            container.classList.add('label-item');
                            this._store.add(autorun(r => {
                                assertType(this.label);
                                const { changeCount, activeIdx } = that._navigationBearings.read(r);
                                if (changeCount > 0) {
                                    const n = activeIdx === -1 ? '1' : `${activeIdx + 1}`;
                                    this.label.innerText = localize('nOfM', "{0} of {1}", n, changeCount);
                                }
                                else {
                                    this.label.innerText = localize('0Of0', "0 of 0");
                                }
                                this.updateTooltip();
                            }));
                        }
                        getTooltip() {
                            const { changeCount, entriesCount } = that._navigationBearings.get();
                            if (changeCount === -1 || entriesCount === -1) {
                                return undefined;
                            }
                            else if (changeCount === 1 && entriesCount === 1) {
                                return localize('tooltip_11', "1 change in 1 file");
                            }
                            else if (changeCount === 1) {
                                return localize('tooltip_1n', "1 change in {0} files", entriesCount);
                            }
                            else if (entriesCount === 1) {
                                return localize('tooltip_n1', "{0} changes in 1 file", changeCount);
                            }
                            else {
                                return localize('tooltip_nm', "{0} changes in {1} files", changeCount, entriesCount);
                            }
                        }
                    };
                }
                if (action.id === AcceptAction.ID || action.id === RejectAction.ID) {
                    return new class extends ActionViewItem {
                        constructor() {
                            super(undefined, action, { ...options, icon: false, label: true, keybindingNotRenderedWithLabel: true });
                            this._reveal = this._store.add(new MutableDisposable());
                        }
                        render(container) {
                            super.render(container);
                            if (action.id === AcceptAction.ID) {
                                const listener = this._store.add(new MutableDisposable());
                                this._store.add(autorun(r => {
                                    assertType(this.label);
                                    assertType(this.element);
                                    const ctrl = that._entry.read(r)?.autoAcceptController.read(r);
                                    if (ctrl) {
                                        const r = -100 * (ctrl.remaining / ctrl.total);
                                        this.element.style.setProperty('--vscode-action-item-auto-timeout', `${r}%`);
                                        this.element.classList.toggle('auto', true);
                                        listener.value = addDisposableGenericMouseMoveListener(this.element, () => ctrl.cancel());
                                    }
                                    else {
                                        this.element.classList.toggle('auto', false);
                                        listener.clear();
                                    }
                                }));
                            }
                        }
                        set actionRunner(actionRunner) {
                            super.actionRunner = actionRunner;
                            this._reveal.value = actionRunner.onWillRun(_e => {
                                that._editor.focus();
                            });
                        }
                        get actionRunner() {
                            return super.actionRunner;
                        }
                    };
                }
                if (action.id === 'inlineChat2.reveal' || action.id === 'workbench.action.chat.openEditSession') {
                    return new class extends ActionViewItem {
                        constructor() {
                            super(undefined, action, options);
                            this._requestMessage = derived(r => {
                                const session = that._session.read(r);
                                const chatModel = that._chatService.getSession(session?.chatSessionId ?? '');
                                if (!session || !chatModel) {
                                    return undefined;
                                }
                                const response = that._entry.read(r)?.isCurrentlyBeingModifiedBy.read(r);
                                if (response) {
                                    if (response?.isPaused.read(r)) {
                                        return { message: localize('paused', "Edits Paused"), paused: true };
                                    }
                                    const entry = that._entry.read(r);
                                    if (entry) {
                                        const progress = entry?.rewriteRatio.read(r);
                                        const message = progress === 0
                                            ? localize('generating', "Generating edits")
                                            : localize('applyingPercentage', "{0}% Applying edits", Math.round(progress * 100));
                                        return { message };
                                    }
                                }
                                if (session.isGlobalEditingSession) {
                                    return undefined;
                                }
                                const request = observableFromEvent(this, chatModel.onDidChange, () => chatModel.getRequests().at(-1)).read(r);
                                if (!request || request.response?.isComplete) {
                                    return undefined;
                                }
                                return { message: request.message.text };
                            });
                        }
                        render(container) {
                            super.render(container);
                            container.classList.add('label-item');
                            this._store.add(autorun(r => {
                                assertType(this.label);
                                const value = this._requestMessage.read(r);
                                if (!value) {
                                    // normal rendering
                                    this.options.icon = true;
                                    this.options.label = false;
                                    reset(this.label);
                                    this.updateClass();
                                    this.updateLabel();
                                    this.updateTooltip();
                                }
                                else {
                                    this.options.icon = false;
                                    this.options.label = true;
                                    this.updateClass();
                                    this.updateTooltip();
                                    const message = rcut(value.message, 47);
                                    reset(this.label, message);
                                }
                                const busy = Boolean(value && !value.paused);
                                that._domNode.classList.toggle('busy', busy);
                                this.label.classList.toggle('busy', busy);
                            }));
                        }
                        getTooltip() {
                            return this._requestMessage.get()?.message || super.getTooltip();
                        }
                    };
                }
                return undefined;
            }
        });
    }
    dispose() {
        this.hide();
        this._showStore.dispose();
        this._toolbar.dispose();
    }
    getDomNode() {
        return this._domNode;
    }
    show(session, entry, indicies) {
        this._showStore.clear();
        transaction(tx => {
            this._session.set(session, tx);
            this._entry.set(entry, tx);
        });
        this._showStore.add(autorun(r => {
            const entryIndex = indicies.entryIndex.read(r);
            const changeIndex = indicies.changeIndex.read(r);
            const entries = session.entries.read(r);
            let activeIdx = entryIndex !== undefined && changeIndex !== undefined
                ? changeIndex
                : -1;
            let totalChangesCount = 0;
            for (let i = 0; i < entries.length; i++) {
                const changesCount = entries[i].changesCount.read(r);
                totalChangesCount += changesCount;
                if (entryIndex !== undefined && i < entryIndex) {
                    activeIdx += changesCount;
                }
            }
            this._navigationBearings.set({ changeCount: totalChangesCount, activeIdx, entriesCount: entries.length }, undefined);
        }));
    }
    hide() {
        transaction(tx => {
            this._session.set(undefined, tx);
            this._entry.set(undefined, tx);
            this._navigationBearings.set({ changeCount: -1, activeIdx: -1, entriesCount: -1 }, tx);
        });
        this._showStore.clear();
    }
};
ChatEditorOverlayWidget = __decorate([
    __param(1, IChatService),
    __param(2, IInstantiationService)
], ChatEditorOverlayWidget);
let ChatEditingOverlayController = class ChatEditingOverlayController {
    constructor(container, group, instaService, chatService, chatEditingService, inlineChatService) {
        this._store = new DisposableStore();
        this._domNode = document.createElement('div');
        this._domNode.classList.add('chat-editing-editor-overlay');
        this._domNode.style.position = 'absolute';
        this._domNode.style.bottom = `24px`;
        this._domNode.style.right = `24px`;
        this._domNode.style.zIndex = `100`;
        const widget = instaService.createInstance(ChatEditorOverlayWidget, group);
        this._domNode.appendChild(widget.getDomNode());
        this._store.add(toDisposable(() => this._domNode.remove()));
        this._store.add(widget);
        const show = () => {
            if (!container.contains(this._domNode)) {
                container.appendChild(this._domNode);
            }
        };
        const hide = () => {
            if (container.contains(this._domNode)) {
                widget.hide();
                this._domNode.remove();
            }
        };
        const activeEditorSignal = observableSignalFromEvent(this, Event.any(group.onDidActiveEditorChange, group.onDidModelChange));
        const activeUriObs = derivedOpts({ equalsFn: isEqual }, r => {
            activeEditorSignal.read(r); // signal
            const editor = group.activeEditorPane;
            const uri = EditorResourceAccessor.getOriginalUri(editor?.input, { supportSideBySide: SideBySideEditor.PRIMARY });
            return uri;
        });
        const sessionAndEntry = derived(r => {
            activeEditorSignal.read(r); // signal to ensure activeEditor and activeEditorPane don't go out of sync
            const uri = activeUriObs.read(r);
            if (!uri) {
                return undefined;
            }
            return new ObservableEditorSession(uri, chatEditingService, inlineChatService).value.read(r);
        });
        const isInProgress = derived(r => {
            const session = sessionAndEntry.read(r)?.session;
            if (!session) {
                return false;
            }
            const chatModel = chatService.getSession(session.chatSessionId);
            const lastResponse = observableFromEvent(this, chatModel.onDidChange, () => chatModel.getRequests().at(-1)?.response);
            const response = lastResponse.read(r);
            if (!response) {
                return false;
            }
            return observableFromEvent(this, response.onDidChange, () => !response.isComplete).read(r);
        });
        this._store.add(autorun(r => {
            const data = sessionAndEntry.read(r);
            if (!data) {
                hide();
                return;
            }
            const { session, entry } = data;
            if (entry?.state.read(r) === 0 /* WorkingSetEntryState.Modified */ // any entry changing
                || (!session.isGlobalEditingSession && isInProgress.read(r)) // inline chat request
            ) {
                // any session with changes
                const editorPane = group.activeEditorPane;
                assertType(editorPane);
                const changeIndex = derived(r => entry
                    ? entry.getEditorIntegration(editorPane).currentIndex.read(r)
                    : 0);
                const entryIndex = derived(r => entry
                    ? session.entries.read(r).indexOf(entry)
                    : 0);
                widget.show(session, entry, { entryIndex, changeIndex });
                show();
            }
            else {
                // nothing
                hide();
            }
        }));
    }
    dispose() {
        this._store.dispose();
    }
};
ChatEditingOverlayController = __decorate([
    __param(2, IInstantiationService),
    __param(3, IChatService),
    __param(4, IChatEditingService),
    __param(5, IInlineChatSessionService)
], ChatEditingOverlayController);
let ChatEditingEditorOverlay = class ChatEditingEditorOverlay {
    static { this.ID = 'chat.edits.editorOverlay'; }
    constructor(editorGroupsService, instantiationService) {
        this._store = new DisposableStore();
        const editorGroups = observableFromEvent(this, Event.any(editorGroupsService.onDidAddGroup, editorGroupsService.onDidRemoveGroup), () => editorGroupsService.groups);
        const overlayWidgets = new DisposableMap();
        this._store.add(autorun(r => {
            const toDelete = new Set(overlayWidgets.keys());
            const groups = editorGroups.read(r);
            for (const group of groups) {
                if (!(group instanceof EditorGroupView)) {
                    // TODO@jrieken better with https://github.com/microsoft/vscode/tree/ben/layout-group-container
                    continue;
                }
                toDelete.delete(group); // we keep the widget for this group!
                if (!overlayWidgets.has(group)) {
                    const scopedInstaService = instantiationService.createChild(new ServiceCollection([IContextKeyService, group.scopedContextKeyService]));
                    const container = group.element;
                    const ctrl = scopedInstaService.createInstance(ChatEditingOverlayController, container, group);
                    overlayWidgets.set(group, combinedDisposable(ctrl, scopedInstaService));
                }
            }
            for (const group of toDelete) {
                overlayWidgets.deleteAndDispose(group);
            }
        }));
    }
    dispose() {
        this._store.dispose();
    }
};
ChatEditingEditorOverlay = __decorate([
    __param(0, IEditorGroupsService),
    __param(1, IInstantiationService)
], ChatEditingEditorOverlay);
export { ChatEditingEditorOverlay };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdFZGl0b3JPdmVybGF5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0RWRpdGluZy9jaGF0RWRpdGluZ0VkaXRvck92ZXJsYXkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyx1Q0FBdUMsQ0FBQztBQUMvQyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsYUFBYSxFQUFFLGVBQWUsRUFBRSxpQkFBaUIsRUFBRSxZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM5SSxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQWUsbUJBQW1CLEVBQUUseUJBQXlCLEVBQUUsZUFBZSxFQUFFLFdBQVcsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3BMLE9BQU8sRUFBc0Isb0JBQW9CLEVBQW9CLE1BQU0sb0RBQW9ELENBQUM7QUFDaEksT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLG1CQUFtQixFQUFpRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3hJLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUMzRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFFN0YsT0FBTyxFQUFFLHFDQUFxQyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUMxRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDcEYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztB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