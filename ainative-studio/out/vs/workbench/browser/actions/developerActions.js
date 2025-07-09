/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './media/actions.css';
import { localize, localize2 } from '../../../nls.js';
import { IKeybindingService } from '../../../platform/keybinding/common/keybinding.js';
import { DomEmitter } from '../../../base/browser/event.js';
import { Color } from '../../../base/common/color.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { toDisposable, dispose, DisposableStore, setDisposableTracker, DisposableTracker } from '../../../base/common/lifecycle.js';
import { getDomNodePagePosition, append, $, getActiveDocument, onDidRegisterWindow, getWindows } from '../../../base/browser/dom.js';
import { createCSSRule, createStyleSheet } from '../../../base/browser/domStylesheets.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey } from '../../../platform/contextkey/common/contextkey.js';
import { StandardKeyboardEvent } from '../../../base/browser/keyboardEvent.js';
import { RunOnceScheduler } from '../../../base/common/async.js';
import { ILayoutService } from '../../../platform/layout/browser/layoutService.js';
import { Registry } from '../../../platform/registry/common/platform.js';
import { registerAction2, Action2, MenuRegistry } from '../../../platform/actions/common/actions.js';
import { IStorageService } from '../../../platform/storage/common/storage.js';
import { clamp } from '../../../base/common/numbers.js';
import { Extensions as ConfigurationExtensions } from '../../../platform/configuration/common/configurationRegistry.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { IWorkingCopyService } from '../../services/workingCopy/common/workingCopyService.js';
import { Categories } from '../../../platform/action/common/actionCommonCategories.js';
import { IWorkingCopyBackupService } from '../../services/workingCopy/common/workingCopyBackup.js';
import { IDialogService } from '../../../platform/dialogs/common/dialogs.js';
import { IOutputService } from '../../services/output/common/output.js';
import { windowLogId } from '../../services/log/common/logConstants.js';
import { ByteSize } from '../../../platform/files/common/files.js';
import { IQuickInputService } from '../../../platform/quickinput/common/quickInput.js';
import { IUserDataProfileService } from '../../services/userDataProfile/common/userDataProfile.js';
import { IEditorService } from '../../services/editor/common/editorService.js';
import product from '../../../platform/product/common/product.js';
import { CommandsRegistry } from '../../../platform/commands/common/commands.js';
import { IEnvironmentService } from '../../../platform/environment/common/environment.js';
class InspectContextKeysAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.inspectContextKeys',
            title: localize2('inspect context keys', 'Inspect Context Keys'),
            category: Categories.Developer,
            f1: true
        });
    }
    run(accessor) {
        const contextKeyService = accessor.get(IContextKeyService);
        const disposables = new DisposableStore();
        const stylesheet = createStyleSheet(undefined, undefined, disposables);
        createCSSRule('*', 'cursor: crosshair !important;', stylesheet);
        const hoverFeedback = document.createElement('div');
        const activeDocument = getActiveDocument();
        activeDocument.body.appendChild(hoverFeedback);
        disposables.add(toDisposable(() => hoverFeedback.remove()));
        hoverFeedback.style.position = 'absolute';
        hoverFeedback.style.pointerEvents = 'none';
        hoverFeedback.style.backgroundColor = 'rgba(255, 0, 0, 0.5)';
        hoverFeedback.style.zIndex = '1000';
        const onMouseMove = disposables.add(new DomEmitter(activeDocument, 'mousemove', true));
        disposables.add(onMouseMove.event(e => {
            const target = e.target;
            const position = getDomNodePagePosition(target);
            hoverFeedback.style.top = `${position.top}px`;
            hoverFeedback.style.left = `${position.left}px`;
            hoverFeedback.style.width = `${position.width}px`;
            hoverFeedback.style.height = `${position.height}px`;
        }));
        const onMouseDown = disposables.add(new DomEmitter(activeDocument, 'mousedown', true));
        Event.once(onMouseDown.event)(e => { e.preventDefault(); e.stopPropagation(); }, null, disposables);
        const onMouseUp = disposables.add(new DomEmitter(activeDocument, 'mouseup', true));
        Event.once(onMouseUp.event)(e => {
            e.preventDefault();
            e.stopPropagation();
            const context = contextKeyService.getContext(e.target);
            console.log(context.collectAllValues());
            dispose(disposables);
        }, null, disposables);
    }
}
class ToggleScreencastModeAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.toggleScreencastMode',
            title: localize2('toggle screencast mode', 'Toggle Screencast Mode'),
            category: Categories.Developer,
            f1: true
        });
    }
    run(accessor) {
        if (ToggleScreencastModeAction.disposable) {
            ToggleScreencastModeAction.disposable.dispose();
            ToggleScreencastModeAction.disposable = undefined;
            return;
        }
        const layoutService = accessor.get(ILayoutService);
        const configurationService = accessor.get(IConfigurationService);
        const keybindingService = accessor.get(IKeybindingService);
        const disposables = new DisposableStore();
        const container = layoutService.activeContainer;
        const mouseMarker = append(container, $('.screencast-mouse'));
        disposables.add(toDisposable(() => mouseMarker.remove()));
        const keyboardMarker = append(container, $('.screencast-keyboard'));
        disposables.add(toDisposable(() => keyboardMarker.remove()));
        const onMouseDown = disposables.add(new Emitter());
        const onMouseUp = disposables.add(new Emitter());
        const onMouseMove = disposables.add(new Emitter());
        function registerContainerListeners(container, disposables) {
            disposables.add(disposables.add(new DomEmitter(container, 'mousedown', true)).event(e => onMouseDown.fire(e)));
            disposables.add(disposables.add(new DomEmitter(container, 'mouseup', true)).event(e => onMouseUp.fire(e)));
            disposables.add(disposables.add(new DomEmitter(container, 'mousemove', true)).event(e => onMouseMove.fire(e)));
        }
        for (const { window, disposables } of getWindows()) {
            registerContainerListeners(layoutService.getContainer(window), disposables);
        }
        disposables.add(onDidRegisterWindow(({ window, disposables }) => registerContainerListeners(layoutService.getContainer(window), disposables)));
        disposables.add(layoutService.onDidChangeActiveContainer(() => {
            layoutService.activeContainer.appendChild(mouseMarker);
            layoutService.activeContainer.appendChild(keyboardMarker);
        }));
        const updateMouseIndicatorColor = () => {
            mouseMarker.style.borderColor = Color.fromHex(configurationService.getValue('screencastMode.mouseIndicatorColor')).toString();
        };
        let mouseIndicatorSize;
        const updateMouseIndicatorSize = () => {
            mouseIndicatorSize = clamp(configurationService.getValue('screencastMode.mouseIndicatorSize') || 20, 20, 100);
            mouseMarker.style.height = `${mouseIndicatorSize}px`;
            mouseMarker.style.width = `${mouseIndicatorSize}px`;
        };
        updateMouseIndicatorColor();
        updateMouseIndicatorSize();
        disposables.add(onMouseDown.event(e => {
            mouseMarker.style.top = `${e.clientY - mouseIndicatorSize / 2}px`;
            mouseMarker.style.left = `${e.clientX - mouseIndicatorSize / 2}px`;
            mouseMarker.style.display = 'block';
            mouseMarker.style.transform = `scale(${1})`;
            mouseMarker.style.transition = 'transform 0.1s';
            const mouseMoveListener = onMouseMove.event(e => {
                mouseMarker.style.top = `${e.clientY - mouseIndicatorSize / 2}px`;
                mouseMarker.style.left = `${e.clientX - mouseIndicatorSize / 2}px`;
                mouseMarker.style.transform = `scale(${.8})`;
            });
            Event.once(onMouseUp.event)(() => {
                mouseMarker.style.display = 'none';
                mouseMoveListener.dispose();
            });
        }));
        const updateKeyboardFontSize = () => {
            keyboardMarker.style.fontSize = `${clamp(configurationService.getValue('screencastMode.fontSize') || 56, 20, 100)}px`;
        };
        const updateKeyboardMarker = () => {
            keyboardMarker.style.bottom = `${clamp(configurationService.getValue('screencastMode.verticalOffset') || 0, 0, 90)}%`;
        };
        let keyboardMarkerTimeout;
        const updateKeyboardMarkerTimeout = () => {
            keyboardMarkerTimeout = clamp(configurationService.getValue('screencastMode.keyboardOverlayTimeout') || 800, 500, 5000);
        };
        updateKeyboardFontSize();
        updateKeyboardMarker();
        updateKeyboardMarkerTimeout();
        disposables.add(configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('screencastMode.verticalOffset')) {
                updateKeyboardMarker();
            }
            if (e.affectsConfiguration('screencastMode.fontSize')) {
                updateKeyboardFontSize();
            }
            if (e.affectsConfiguration('screencastMode.keyboardOverlayTimeout')) {
                updateKeyboardMarkerTimeout();
            }
            if (e.affectsConfiguration('screencastMode.mouseIndicatorColor')) {
                updateMouseIndicatorColor();
            }
            if (e.affectsConfiguration('screencastMode.mouseIndicatorSize')) {
                updateMouseIndicatorSize();
            }
        }));
        const onKeyDown = disposables.add(new Emitter());
        const onCompositionStart = disposables.add(new Emitter());
        const onCompositionUpdate = disposables.add(new Emitter());
        const onCompositionEnd = disposables.add(new Emitter());
        function registerWindowListeners(window, disposables) {
            disposables.add(disposables.add(new DomEmitter(window, 'keydown', true)).event(e => onKeyDown.fire(e)));
            disposables.add(disposables.add(new DomEmitter(window, 'compositionstart', true)).event(e => onCompositionStart.fire(e)));
            disposables.add(disposables.add(new DomEmitter(window, 'compositionupdate', true)).event(e => onCompositionUpdate.fire(e)));
            disposables.add(disposables.add(new DomEmitter(window, 'compositionend', true)).event(e => onCompositionEnd.fire(e)));
        }
        for (const { window, disposables } of getWindows()) {
            registerWindowListeners(window, disposables);
        }
        disposables.add(onDidRegisterWindow(({ window, disposables }) => registerWindowListeners(window, disposables)));
        let length = 0;
        let composing = undefined;
        let imeBackSpace = false;
        const clearKeyboardScheduler = new RunOnceScheduler(() => {
            keyboardMarker.textContent = '';
            composing = undefined;
            length = 0;
        }, keyboardMarkerTimeout);
        disposables.add(onCompositionStart.event(e => {
            imeBackSpace = true;
        }));
        disposables.add(onCompositionUpdate.event(e => {
            if (e.data && imeBackSpace) {
                if (length > 20) {
                    keyboardMarker.innerText = '';
                    length = 0;
                }
                composing = composing ?? append(keyboardMarker, $('span.key'));
                composing.textContent = e.data;
            }
            else if (imeBackSpace) {
                keyboardMarker.innerText = '';
                append(keyboardMarker, $('span.key', {}, `Backspace`));
            }
            clearKeyboardScheduler.schedule();
        }));
        disposables.add(onCompositionEnd.event(e => {
            composing = undefined;
            length++;
        }));
        disposables.add(onKeyDown.event(e => {
            if (e.key === 'Process' || /[\uac00-\ud787\u3131-\u314e\u314f-\u3163\u3041-\u3094\u30a1-\u30f4\u30fc\u3005\u3006\u3024\u4e00-\u9fa5]/u.test(e.key)) {
                if (e.code === 'Backspace') {
                    imeBackSpace = true;
                }
                else if (!e.code.includes('Key')) {
                    composing = undefined;
                    imeBackSpace = false;
                }
                else {
                    imeBackSpace = true;
                }
                clearKeyboardScheduler.schedule();
                return;
            }
            if (e.isComposing) {
                return;
            }
            const options = configurationService.getValue('screencastMode.keyboardOptions');
            const event = new StandardKeyboardEvent(e);
            const shortcut = keybindingService.softDispatch(event, event.target);
            // Hide the single arrow key pressed
            if (shortcut.kind === 2 /* ResultKind.KbFound */ && shortcut.commandId && !(options.showSingleEditorCursorMoves ?? true) && (['cursorLeft', 'cursorRight', 'cursorUp', 'cursorDown'].includes(shortcut.commandId))) {
                return;
            }
            if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey
                || length > 20
                || event.keyCode === 1 /* KeyCode.Backspace */ || event.keyCode === 9 /* KeyCode.Escape */
                || event.keyCode === 16 /* KeyCode.UpArrow */ || event.keyCode === 18 /* KeyCode.DownArrow */
                || event.keyCode === 15 /* KeyCode.LeftArrow */ || event.keyCode === 17 /* KeyCode.RightArrow */) {
                keyboardMarker.innerText = '';
                length = 0;
            }
            const keybinding = keybindingService.resolveKeyboardEvent(event);
            const commandDetails = (this._isKbFound(shortcut) && shortcut.commandId) ? this.getCommandDetails(shortcut.commandId) : undefined;
            let commandAndGroupLabel = commandDetails?.title;
            let keyLabel = keybinding.getLabel();
            if (commandDetails) {
                if ((options.showCommandGroups ?? false) && commandDetails.category) {
                    commandAndGroupLabel = `${commandDetails.category}: ${commandAndGroupLabel} `;
                }
                if (this._isKbFound(shortcut) && shortcut.commandId) {
                    const keybindings = keybindingService.lookupKeybindings(shortcut.commandId)
                        .filter(k => k.getLabel()?.endsWith(keyLabel ?? ''));
                    if (keybindings.length > 0) {
                        keyLabel = keybindings[keybindings.length - 1].getLabel();
                    }
                }
            }
            if ((options.showCommands ?? true) && commandAndGroupLabel) {
                append(keyboardMarker, $('span.title', {}, `${commandAndGroupLabel} `));
            }
            if ((options.showKeys ?? true) || ((options.showKeybindings ?? true) && this._isKbFound(shortcut))) {
                // Fix label for arrow keys
                keyLabel = keyLabel?.replace('UpArrow', '↑')
                    ?.replace('DownArrow', '↓')
                    ?.replace('LeftArrow', '←')
                    ?.replace('RightArrow', '→');
                append(keyboardMarker, $('span.key', {}, keyLabel ?? ''));
            }
            length++;
            clearKeyboardScheduler.schedule();
        }));
        ToggleScreencastModeAction.disposable = disposables;
    }
    _isKbFound(resolutionResult) {
        return resolutionResult.kind === 2 /* ResultKind.KbFound */;
    }
    getCommandDetails(commandId) {
        const fromMenuRegistry = MenuRegistry.getCommand(commandId);
        if (fromMenuRegistry) {
            return {
                title: typeof fromMenuRegistry.title === 'string' ? fromMenuRegistry.title : fromMenuRegistry.title.value,
                category: fromMenuRegistry.category ? (typeof fromMenuRegistry.category === 'string' ? fromMenuRegistry.category : fromMenuRegistry.category.value) : undefined
            };
        }
        const fromCommandsRegistry = CommandsRegistry.getCommand(commandId);
        if (fromCommandsRegistry && fromCommandsRegistry.metadata?.description) {
            return { title: typeof fromCommandsRegistry.metadata.description === 'string' ? fromCommandsRegistry.metadata.description : fromCommandsRegistry.metadata.description.value };
        }
        return undefined;
    }
}
class LogStorageAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.logStorage',
            title: localize2({ key: 'logStorage', comment: ['A developer only action to log the contents of the storage for the current window.'] }, "Log Storage Database Contents"),
            category: Categories.Developer,
            f1: true
        });
    }
    run(accessor) {
        const storageService = accessor.get(IStorageService);
        const dialogService = accessor.get(IDialogService);
        storageService.log();
        dialogService.info(localize('storageLogDialogMessage', "The storage database contents have been logged to the developer tools."), localize('storageLogDialogDetails', "Open developer tools from the menu and select the Console tab."));
    }
}
class LogWorkingCopiesAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.logWorkingCopies',
            title: localize2({ key: 'logWorkingCopies', comment: ['A developer only action to log the working copies that exist.'] }, "Log Working Copies"),
            category: Categories.Developer,
            f1: true
        });
    }
    async run(accessor) {
        const workingCopyService = accessor.get(IWorkingCopyService);
        const workingCopyBackupService = accessor.get(IWorkingCopyBackupService);
        const logService = accessor.get(ILogService);
        const outputService = accessor.get(IOutputService);
        const backups = await workingCopyBackupService.getBackups();
        const msg = [
            ``,
            `[Working Copies]`,
            ...(workingCopyService.workingCopies.length > 0) ?
                workingCopyService.workingCopies.map(workingCopy => `${workingCopy.isDirty() ? '● ' : ''}${workingCopy.resource.toString(true)} (typeId: ${workingCopy.typeId || '<no typeId>'})`) :
                ['<none>'],
            ``,
            `[Backups]`,
            ...(backups.length > 0) ?
                backups.map(backup => `${backup.resource.toString(true)} (typeId: ${backup.typeId || '<no typeId>'})`) :
                ['<none>'],
        ];
        logService.info(msg.join('\n'));
        outputService.showChannel(windowLogId, true);
    }
}
class RemoveLargeStorageEntriesAction extends Action2 {
    static { this.SIZE_THRESHOLD = 1024 * 16; } // 16kb
    constructor() {
        super({
            id: 'workbench.action.removeLargeStorageDatabaseEntries',
            title: localize2('removeLargeStorageDatabaseEntries', 'Remove Large Storage Database Entries...'),
            category: Categories.Developer,
            f1: true
        });
    }
    async run(accessor) {
        const storageService = accessor.get(IStorageService);
        const quickInputService = accessor.get(IQuickInputService);
        const userDataProfileService = accessor.get(IUserDataProfileService);
        const dialogService = accessor.get(IDialogService);
        const environmentService = accessor.get(IEnvironmentService);
        const items = [];
        for (const scope of [-1 /* StorageScope.APPLICATION */, 0 /* StorageScope.PROFILE */, 1 /* StorageScope.WORKSPACE */]) {
            if (scope === 0 /* StorageScope.PROFILE */ && userDataProfileService.currentProfile.isDefault) {
                continue; // avoid duplicates
            }
            for (const target of [1 /* StorageTarget.MACHINE */, 0 /* StorageTarget.USER */]) {
                for (const key of storageService.keys(scope, target)) {
                    const value = storageService.get(key, scope);
                    if (value && (!environmentService.isBuilt /* show all keys in dev */ || value.length > RemoveLargeStorageEntriesAction.SIZE_THRESHOLD)) {
                        items.push({
                            key,
                            scope,
                            target,
                            size: value.length,
                            label: key,
                            description: ByteSize.formatSize(value.length),
                            detail: localize('largeStorageItemDetail', "Scope: {0}, Target: {1}", scope === -1 /* StorageScope.APPLICATION */ ? localize('global', "Global") : scope === 0 /* StorageScope.PROFILE */ ? localize('profile', "Profile") : localize('workspace', "Workspace"), target === 1 /* StorageTarget.MACHINE */ ? localize('machine', "Machine") : localize('user', "User")),
                        });
                    }
                }
            }
        }
        items.sort((itemA, itemB) => itemB.size - itemA.size);
        const selectedItems = await new Promise(resolve => {
            const disposables = new DisposableStore();
            const picker = disposables.add(quickInputService.createQuickPick());
            picker.items = items;
            picker.canSelectMany = true;
            picker.ok = false;
            picker.customButton = true;
            picker.hideCheckAll = true;
            picker.customLabel = localize('removeLargeStorageEntriesPickerButton', "Remove");
            picker.placeholder = localize('removeLargeStorageEntriesPickerPlaceholder', "Select large entries to remove from storage");
            if (items.length === 0) {
                picker.description = localize('removeLargeStorageEntriesPickerDescriptionNoEntries', "There are no large storage entries to remove.");
            }
            picker.show();
            disposables.add(picker.onDidCustom(() => {
                resolve(picker.selectedItems);
                picker.hide();
            }));
            disposables.add(picker.onDidHide(() => disposables.dispose()));
        });
        if (selectedItems.length === 0) {
            return;
        }
        const { confirmed } = await dialogService.confirm({
            type: 'warning',
            message: localize('removeLargeStorageEntriesConfirmRemove', "Do you want to remove the selected storage entries from the database?"),
            detail: localize('removeLargeStorageEntriesConfirmRemoveDetail', "{0}\n\nThis action is irreversible and may result in data loss!", selectedItems.map(item => item.label).join('\n')),
            primaryButton: localize({ key: 'removeLargeStorageEntriesButtonLabel', comment: ['&& denotes a mnemonic'] }, "&&Remove")
        });
        if (!confirmed) {
            return;
        }
        const scopesToOptimize = new Set();
        for (const item of selectedItems) {
            storageService.remove(item.key, item.scope);
            scopesToOptimize.add(item.scope);
        }
        for (const scope of scopesToOptimize) {
            await storageService.optimize(scope);
        }
    }
}
let tracker = undefined;
let trackedDisposables = new Set();
const DisposablesSnapshotStateContext = new RawContextKey('dirtyWorkingCopies', 'stopped');
class StartTrackDisposables extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.startTrackDisposables',
            title: localize2('startTrackDisposables', 'Start Tracking Disposables'),
            category: Categories.Developer,
            f1: true,
            precondition: ContextKeyExpr.and(DisposablesSnapshotStateContext.isEqualTo('pending').negate(), DisposablesSnapshotStateContext.isEqualTo('started').negate())
        });
    }
    run(accessor) {
        const disposablesSnapshotStateContext = DisposablesSnapshotStateContext.bindTo(accessor.get(IContextKeyService));
        disposablesSnapshotStateContext.set('started');
        trackedDisposables.clear();
        tracker = new DisposableTracker();
        setDisposableTracker(tracker);
    }
}
class SnapshotTrackedDisposables extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.snapshotTrackedDisposables',
            title: localize2('snapshotTrackedDisposables', 'Snapshot Tracked Disposables'),
            category: Categories.Developer,
            f1: true,
            precondition: DisposablesSnapshotStateContext.isEqualTo('started')
        });
    }
    run(accessor) {
        const disposablesSnapshotStateContext = DisposablesSnapshotStateContext.bindTo(accessor.get(IContextKeyService));
        disposablesSnapshotStateContext.set('pending');
        trackedDisposables = new Set(tracker?.computeLeakingDisposables(1000)?.leaks.map(disposable => disposable.value));
    }
}
class StopTrackDisposables extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.stopTrackDisposables',
            title: localize2('stopTrackDisposables', 'Stop Tracking Disposables'),
            category: Categories.Developer,
            f1: true,
            precondition: DisposablesSnapshotStateContext.isEqualTo('pending')
        });
    }
    run(accessor) {
        const editorService = accessor.get(IEditorService);
        const disposablesSnapshotStateContext = DisposablesSnapshotStateContext.bindTo(accessor.get(IContextKeyService));
        disposablesSnapshotStateContext.set('stopped');
        if (tracker) {
            const disposableLeaks = new Set();
            for (const disposable of new Set(tracker.computeLeakingDisposables(1000)?.leaks) ?? []) {
                if (trackedDisposables.has(disposable.value)) {
                    disposableLeaks.add(disposable);
                }
            }
            const leaks = tracker.computeLeakingDisposables(1000, Array.from(disposableLeaks));
            if (leaks) {
                editorService.openEditor({ resource: undefined, contents: leaks.details });
            }
        }
        setDisposableTracker(null);
        tracker = undefined;
        trackedDisposables.clear();
    }
}
// --- Actions Registration
registerAction2(InspectContextKeysAction);
registerAction2(ToggleScreencastModeAction);
registerAction2(LogStorageAction);
registerAction2(LogWorkingCopiesAction);
registerAction2(RemoveLargeStorageEntriesAction);
if (!product.commit) {
    registerAction2(StartTrackDisposables);
    registerAction2(SnapshotTrackedDisposables);
    registerAction2(StopTrackDisposables);
}
// --- Configuration
// Screen Cast Mode
const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
configurationRegistry.registerConfiguration({
    id: 'screencastMode',
    order: 9,
    title: localize('screencastModeConfigurationTitle', "Screencast Mode"),
    type: 'object',
    properties: {
        'screencastMode.verticalOffset': {
            type: 'number',
            default: 20,
            minimum: 0,
            maximum: 90,
            description: localize('screencastMode.location.verticalPosition', "Controls the vertical offset of the screencast mode overlay from the bottom as a percentage of the workbench height.")
        },
        'screencastMode.fontSize': {
            type: 'number',
            default: 56,
            minimum: 20,
            maximum: 100,
            description: localize('screencastMode.fontSize', "Controls the font size (in pixels) of the screencast mode keyboard.")
        },
        'screencastMode.keyboardOptions': {
            type: 'object',
            description: localize('screencastMode.keyboardOptions.description', "Options for customizing the keyboard overlay in screencast mode."),
            properties: {
                'showKeys': {
                    type: 'boolean',
                    default: true,
                    description: localize('screencastMode.keyboardOptions.showKeys', "Show raw keys.")
                },
                'showKeybindings': {
                    type: 'boolean',
                    default: true,
                    description: localize('screencastMode.keyboardOptions.showKeybindings', "Show keyboard shortcuts.")
                },
                'showCommands': {
                    type: 'boolean',
                    default: true,
                    description: localize('screencastMode.keyboardOptions.showCommands', "Show command names.")
                },
                'showCommandGroups': {
                    type: 'boolean',
                    default: false,
                    description: localize('screencastMode.keyboardOptions.showCommandGroups', "Show command group names, when commands are also shown.")
                },
                'showSingleEditorCursorMoves': {
                    type: 'boolean',
                    default: true,
                    description: localize('screencastMode.keyboardOptions.showSingleEditorCursorMoves', "Show single editor cursor move commands.")
                }
            },
            default: {
                'showKeys': true,
                'showKeybindings': true,
                'showCommands': true,
                'showCommandGroups': false,
                'showSingleEditorCursorMoves': true
            },
            additionalProperties: false
        },
        'screencastMode.keyboardOverlayTimeout': {
            type: 'number',
            default: 800,
            minimum: 500,
            maximum: 5000,
            description: localize('screencastMode.keyboardOverlayTimeout', "Controls how long (in milliseconds) the keyboard overlay is shown in screencast mode.")
        },
        'screencastMode.mouseIndicatorColor': {
            type: 'string',
            format: 'color-hex',
            default: '#FF0000',
            description: localize('screencastMode.mouseIndicatorColor', "Controls the color in hex (#RGB, #RGBA, #RRGGBB or #RRGGBBAA) of the mouse indicator in screencast mode.")
        },
        'screencastMode.mouseIndicatorSize': {
            type: 'number',
            default: 20,
            minimum: 20,
            maximum: 100,
            description: localize('screencastMode.mouseIndicatorSize', "Controls the size (in pixels) of the mouse indicator in screencast mode.")
        },
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV2ZWxvcGVyQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9hY3Rpb25zL2RldmVsb3BlckFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxxQkFBcUIsQ0FBQztBQUU3QixPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQ3RELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDdEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUMvRCxPQUFPLEVBQWUsWUFBWSxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsb0JBQW9CLEVBQUUsaUJBQWlCLEVBQWtCLE1BQU0sbUNBQW1DLENBQUM7QUFDakssT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsaUJBQWlCLEVBQUUsbUJBQW1CLEVBQUUsVUFBVSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDckksT0FBTyxFQUFFLGFBQWEsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFFdEgsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDL0UsT0FBTyxFQUFFLGdCQUFn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