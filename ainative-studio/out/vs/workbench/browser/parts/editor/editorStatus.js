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
var ShowLanguageExtensionsAction_1;
import './media/editorstatus.css';
import { localize, localize2 } from '../../../../nls.js';
import { getWindowById, runAtThisOrScheduleAtNextAnimationFrame } from '../../../../base/browser/dom.js';
import { format, compare, splitLines } from '../../../../base/common/strings.js';
import { extname, basename, isEqual } from '../../../../base/common/resources.js';
import { areFunctions, assertIsDefined } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { Action } from '../../../../base/common/actions.js';
import { Language } from '../../../../base/common/platform.js';
import { UntitledTextEditorInput } from '../../../services/untitled/common/untitledTextEditorInput.js';
import { EditorResourceAccessor, SideBySideEditor } from '../../../common/editor.js';
import { Disposable, MutableDisposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { TrimTrailingWhitespaceAction } from '../../../../editor/contrib/linesOperations/browser/linesOperations.js';
import { IndentUsingSpaces, IndentUsingTabs, ChangeTabDisplaySize, DetectIndentation, IndentationToSpacesAction, IndentationToTabsAction } from '../../../../editor/contrib/indentation/browser/indentation.js';
import { BaseBinaryResourceEditor } from './binaryEditor.js';
import { BinaryResourceDiffEditor } from './binaryDiffEditor.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IFileService, FILES_ASSOCIATIONS_CONFIG } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { Range } from '../../../../editor/common/core/range.js';
import { Selection } from '../../../../editor/common/core/selection.js';
import { ICommandService, CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { IExtensionGalleryService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
import { SUPPORTED_ENCODINGS } from '../../../services/textfile/common/encoding.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { deepClone } from '../../../../base/common/objects.js';
import { getCodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { Schemas } from '../../../../base/common/network.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { getIconClassesForLanguageId } from '../../../../editor/common/services/getIconClasses.js';
import { Promises, timeout } from '../../../../base/common/async.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { IStatusbarService } from '../../../services/statusbar/browser/statusbar.js';
import { IMarkerService, MarkerSeverity, IMarkerData } from '../../../../platform/markers/common/markers.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { SideBySideEditorInput } from '../../../common/editor/sideBySideEditorInput.js';
import { AutomaticLanguageDetectionLikelyWrongId, ILanguageDetectionService } from '../../../services/languageDetection/common/languageDetectionWorkerService.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { Action2 } from '../../../../platform/actions/common/actions.js';
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { TabFocus } from '../../../../editor/browser/config/tabFocus.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { InputMode } from '../../../../editor/common/inputMode.js';
class SideBySideEditorEncodingSupport {
    constructor(primary, secondary) {
        this.primary = primary;
        this.secondary = secondary;
    }
    getEncoding() {
        return this.primary.getEncoding(); // always report from modified (right hand) side
    }
    async setEncoding(encoding, mode) {
        await Promises.settled([this.primary, this.secondary].map(editor => editor.setEncoding(encoding, mode)));
    }
}
class SideBySideEditorLanguageSupport {
    constructor(primary, secondary) {
        this.primary = primary;
        this.secondary = secondary;
    }
    setLanguageId(languageId, source) {
        [this.primary, this.secondary].forEach(editor => editor.setLanguageId(languageId, source));
    }
}
function toEditorWithEncodingSupport(input) {
    // Untitled Text Editor
    if (input instanceof UntitledTextEditorInput) {
        return input;
    }
    // Side by Side (diff) Editor
    if (input instanceof SideBySideEditorInput) {
        const primaryEncodingSupport = toEditorWithEncodingSupport(input.primary);
        const secondaryEncodingSupport = toEditorWithEncodingSupport(input.secondary);
        if (primaryEncodingSupport && secondaryEncodingSupport) {
            return new SideBySideEditorEncodingSupport(primaryEncodingSupport, secondaryEncodingSupport);
        }
        return primaryEncodingSupport;
    }
    // File or Resource Editor
    const encodingSupport = input;
    if (areFunctions(encodingSupport.setEncoding, encodingSupport.getEncoding)) {
        return encodingSupport;
    }
    // Unsupported for any other editor
    return null;
}
function toEditorWithLanguageSupport(input) {
    // Untitled Text Editor
    if (input instanceof UntitledTextEditorInput) {
        return input;
    }
    // Side by Side (diff) Editor
    if (input instanceof SideBySideEditorInput) {
        const primaryLanguageSupport = toEditorWithLanguageSupport(input.primary);
        const secondaryLanguageSupport = toEditorWithLanguageSupport(input.secondary);
        if (primaryLanguageSupport && secondaryLanguageSupport) {
            return new SideBySideEditorLanguageSupport(primaryLanguageSupport, secondaryLanguageSupport);
        }
        return primaryLanguageSupport;
    }
    // File or Resource Editor
    const languageSupport = input;
    if (typeof languageSupport.setLanguageId === 'function') {
        return languageSupport;
    }
    // Unsupported for any other editor
    return null;
}
class StateChange {
    constructor() {
        this.indentation = false;
        this.selectionStatus = false;
        this.languageId = false;
        this.languageStatus = false;
        this.encoding = false;
        this.EOL = false;
        this.tabFocusMode = false;
        this.inputMode = false;
        this.columnSelectionMode = false;
        this.metadata = false;
    }
    combine(other) {
        this.indentation = this.indentation || other.indentation;
        this.selectionStatus = this.selectionStatus || other.selectionStatus;
        this.languageId = this.languageId || other.languageId;
        this.languageStatus = this.languageStatus || other.languageStatus;
        this.encoding = this.encoding || other.encoding;
        this.EOL = this.EOL || other.EOL;
        this.tabFocusMode = this.tabFocusMode || other.tabFocusMode;
        this.inputMode = this.inputMode || other.inputMode;
        this.columnSelectionMode = this.columnSelectionMode || other.columnSelectionMode;
        this.metadata = this.metadata || other.metadata;
    }
    hasChanges() {
        return this.indentation
            || this.selectionStatus
            || this.languageId
            || this.languageStatus
            || this.encoding
            || this.EOL
            || this.tabFocusMode
            || this.inputMode
            || this.columnSelectionMode
            || this.metadata;
    }
}
class State {
    get selectionStatus() { return this._selectionStatus; }
    get languageId() { return this._languageId; }
    get encoding() { return this._encoding; }
    get EOL() { return this._EOL; }
    get indentation() { return this._indentation; }
    get tabFocusMode() { return this._tabFocusMode; }
    get inputMode() { return this._inputMode; }
    get columnSelectionMode() { return this._columnSelectionMode; }
    get metadata() { return this._metadata; }
    update(update) {
        const change = new StateChange();
        switch (update.type) {
            case 'selectionStatus':
                if (this._selectionStatus !== update.selectionStatus) {
                    this._selectionStatus = update.selectionStatus;
                    change.selectionStatus = true;
                }
                break;
            case 'indentation':
                if (this._indentation !== update.indentation) {
                    this._indentation = update.indentation;
                    change.indentation = true;
                }
                break;
            case 'languageId':
                if (this._languageId !== update.languageId) {
                    this._languageId = update.languageId;
                    change.languageId = true;
                }
                break;
            case 'encoding':
                if (this._encoding !== update.encoding) {
                    this._encoding = update.encoding;
                    change.encoding = true;
                }
                break;
            case 'EOL':
                if (this._EOL !== update.EOL) {
                    this._EOL = update.EOL;
                    change.EOL = true;
                }
                break;
            case 'tabFocusMode':
                if (this._tabFocusMode !== update.tabFocusMode) {
                    this._tabFocusMode = update.tabFocusMode;
                    change.tabFocusMode = true;
                }
                break;
            case 'inputMode':
                if (this._inputMode !== update.inputMode) {
                    this._inputMode = update.inputMode;
                    change.inputMode = true;
                }
                break;
            case 'columnSelectionMode':
                if (this._columnSelectionMode !== update.columnSelectionMode) {
                    this._columnSelectionMode = update.columnSelectionMode;
                    change.columnSelectionMode = true;
                }
                break;
            case 'metadata':
                if (this._metadata !== update.metadata) {
                    this._metadata = update.metadata;
                    change.metadata = true;
                }
                break;
        }
        return change;
    }
}
let TabFocusMode = class TabFocusMode extends Disposable {
    constructor(configurationService) {
        super();
        this.configurationService = configurationService;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this.registerListeners();
        const tabFocusModeConfig = configurationService.getValue('editor.tabFocusMode') === true ? true : false;
        TabFocus.setTabFocusMode(tabFocusModeConfig);
    }
    registerListeners() {
        this._register(TabFocus.onDidChangeTabFocus(tabFocusMode => this._onDidChange.fire(tabFocusMode)));
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('editor.tabFocusMode')) {
                const tabFocusModeConfig = this.configurationService.getValue('editor.tabFocusMode') === true ? true : false;
                TabFocus.setTabFocusMode(tabFocusModeConfig);
                this._onDidChange.fire(tabFocusModeConfig);
            }
        }));
    }
};
TabFocusMode = __decorate([
    __param(0, IConfigurationService)
], TabFocusMode);
class StatusInputMode extends Disposable {
    constructor() {
        super();
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        InputMode.setInputMode('insert');
        this._register(InputMode.onDidChangeInputMode(inputMode => this._onDidChange.fire(inputMode)));
    }
}
const nlsSingleSelectionRange = localize('singleSelectionRange', "Ln {0}, Col {1} ({2} selected)");
const nlsSingleSelection = localize('singleSelection', "Ln {0}, Col {1}");
const nlsMultiSelectionRange = localize('multiSelectionRange', "{0} selections ({1} characters selected)");
const nlsMultiSelection = localize('multiSelection', "{0} selections");
const nlsEOLLF = localize('endOfLineLineFeed', "LF");
const nlsEOLCRLF = localize('endOfLineCarriageReturnLineFeed', "CRLF");
let EditorStatus = class EditorStatus extends Disposable {
    constructor(targetWindowId, editorService, quickInputService, languageService, textFileService, statusbarService, instantiationService, configurationService) {
        super();
        this.targetWindowId = targetWindowId;
        this.editorService = editorService;
        this.quickInputService = quickInputService;
        this.languageService = languageService;
        this.textFileService = textFileService;
        this.statusbarService = statusbarService;
        this.configurationService = configurationService;
        this.tabFocusModeElement = this._register(new MutableDisposable());
        this.inputModeElement = this._register(new MutableDisposable());
        this.columnSelectionModeElement = this._register(new MutableDisposable());
        this.indentationElement = this._register(new MutableDisposable());
        this.selectionElement = this._register(new MutableDisposable());
        this.encodingElement = this._register(new MutableDisposable());
        this.eolElement = this._register(new MutableDisposable());
        this.languageElement = this._register(new MutableDisposable());
        this.metadataElement = this._register(new MutableDisposable());
        this.state = new State();
        this.toRender = undefined;
        this.activeEditorListeners = this._register(new DisposableStore());
        this.delayedRender = this._register(new MutableDisposable());
        this.currentMarkerStatus = this._register(instantiationService.createInstance(ShowCurrentMarkerInStatusbarContribution));
        this.tabFocusMode = this._register(instantiationService.createInstance(TabFocusMode));
        this.inputMode = this._register(instantiationService.createInstance(StatusInputMode));
        this.registerCommands();
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.editorService.onDidActiveEditorChange(() => this.updateStatusBar()));
        this._register(this.textFileService.untitled.onDidChangeEncoding(model => this.onResourceEncodingChange(model.resource)));
        this._register(this.textFileService.files.onDidChangeEncoding(model => this.onResourceEncodingChange((model.resource))));
        this._register(Event.runAndSubscribe(this.tabFocusMode.onDidChange, (tabFocusMode) => {
            if (tabFocusMode !== undefined) {
                this.onTabFocusModeChange(tabFocusMode);
            }
            else {
                this.onTabFocusModeChange(this.configurationService.getValue('editor.tabFocusMode'));
            }
        }));
        this._register(Event.runAndSubscribe(this.inputMode.onDidChange, (inputMode) => this.onInputModeChange(inputMode ?? 'insert')));
    }
    registerCommands() {
        this._register(CommandsRegistry.registerCommand({ id: `changeEditorIndentation${this.targetWindowId}`, handler: () => this.showIndentationPicker() }));
    }
    async showIndentationPicker() {
        const activeTextEditorControl = getCodeEditor(this.editorService.activeTextEditorControl);
        if (!activeTextEditorControl) {
            return this.quickInputService.pick([{ label: localize('noEditor', "No text editor active at this time") }]);
        }
        if (this.editorService.activeEditor?.isReadonly()) {
            return this.quickInputService.pick([{ label: localize('noWritableCodeEditor', "The active code editor is read-only.") }]);
        }
        const picks = [
            assertIsDefined(activeTextEditorControl.getAction(IndentUsingSpaces.ID)),
            assertIsDefined(activeTextEditorControl.getAction(IndentUsingTabs.ID)),
            assertIsDefined(activeTextEditorControl.getAction(ChangeTabDisplaySize.ID)),
            assertIsDefined(activeTextEditorControl.getAction(DetectIndentation.ID)),
            assertIsDefined(activeTextEditorControl.getAction(IndentationToSpacesAction.ID)),
            assertIsDefined(activeTextEditorControl.getAction(IndentationToTabsAction.ID)),
            assertIsDefined(activeTextEditorControl.getAction(TrimTrailingWhitespaceAction.ID))
        ].map((a) => {
            return {
                id: a.id,
                label: a.label,
                detail: (Language.isDefaultVariant() || a.label === a.alias) ? undefined : a.alias,
                run: () => {
                    activeTextEditorControl.focus();
                    a.run();
                }
            };
        });
        picks.splice(3, 0, { type: 'separator', label: localize('indentConvert', "convert file") });
        picks.unshift({ type: 'separator', label: localize('indentView', "change view") });
        const action = await this.quickInputService.pick(picks, { placeHolder: localize('pickAction', "Select Action"), matchOnDetail: true });
        return action?.run();
    }
    updateTabFocusModeElement(visible) {
        if (visible) {
            if (!this.tabFocusModeElement.value) {
                const text = localize('tabFocusModeEnabled', "Tab Moves Focus");
                this.tabFocusModeElement.value = this.statusbarService.addEntry({
                    name: localize('status.editor.tabFocusMode', "Accessibility Mode"),
                    text,
                    ariaLabel: text,
                    tooltip: localize('disableTabMode', "Disable Accessibility Mode"),
                    command: 'editor.action.toggleTabFocusMode',
                    kind: 'prominent'
                }, 'status.editor.tabFocusMode', 1 /* StatusbarAlignment.RIGHT */, 100.7);
            }
        }
        else {
            this.tabFocusModeElement.clear();
        }
    }
    updateInputModeElement(inputMode) {
        if (inputMode === 'overtype') {
            if (!this.inputModeElement.value) {
                const text = localize('inputModeOvertype', 'OVR');
                const name = localize('status.editor.enableInsertMode', "Enable Insert Mode");
                this.inputModeElement.value = this.statusbarService.addEntry({
                    name,
                    text,
                    ariaLabel: text,
                    tooltip: name,
                    command: 'editor.action.toggleOvertypeInsertMode',
                    kind: 'prominent'
                }, 'status.editor.inputMode', 1 /* StatusbarAlignment.RIGHT */, 100.6);
            }
        }
        else {
            this.inputModeElement.clear();
        }
    }
    updateColumnSelectionModeElement(visible) {
        if (visible) {
            if (!this.columnSelectionModeElement.value) {
                const text = localize('columnSelectionModeEnabled', "Column Selection");
                this.columnSelectionModeElement.value = this.statusbarService.addEntry({
                    name: localize('status.editor.columnSelectionMode', "Column Selection Mode"),
                    text,
                    ariaLabel: text,
                    tooltip: localize('disableColumnSelectionMode', "Disable Column Selection Mode"),
                    command: 'editor.action.toggleColumnSelection',
                    kind: 'prominent'
                }, 'status.editor.columnSelectionMode', 1 /* StatusbarAlignment.RIGHT */, 100.8);
            }
        }
        else {
            this.columnSelectionModeElement.clear();
        }
    }
    updateSelectionElement(text) {
        if (!text) {
            this.selectionElement.clear();
            return;
        }
        const editorURI = getCodeEditor(this.editorService.activeTextEditorControl)?.getModel()?.uri;
        if (editorURI?.scheme === Schemas.vscodeNotebookCell) {
            this.selectionElement.clear();
            return;
        }
        const props = {
            name: localize('status.editor.selection', "Editor Selection"),
            text,
            ariaLabel: text,
            tooltip: localize('gotoLine', "Go to Line/Column"),
            command: 'workbench.action.gotoLine'
        };
        this.updateElement(this.selectionElement, props, 'status.editor.selection', 1 /* StatusbarAlignment.RIGHT */, 100.5);
    }
    updateIndentationElement(text) {
        if (!text) {
            this.indentationElement.clear();
            return;
        }
        const editorURI = getCodeEditor(this.editorService.activeTextEditorControl)?.getModel()?.uri;
        if (editorURI?.scheme === Schemas.vscodeNotebookCell) {
            this.indentationElement.clear();
            return;
        }
        const props = {
            name: localize('status.editor.indentation', "Editor Indentation"),
            text,
            ariaLabel: text,
            tooltip: localize('selectIndentation', "Select Indentation"),
            command: `changeEditorIndentation${this.targetWindowId}`
        };
        this.updateElement(this.indentationElement, props, 'status.editor.indentation', 1 /* StatusbarAlignment.RIGHT */, 100.4);
    }
    updateEncodingElement(text) {
        if (!text) {
            this.encodingElement.clear();
            return;
        }
        const props = {
            name: localize('status.editor.encoding', "Editor Encoding"),
            text,
            ariaLabel: text,
            tooltip: localize('selectEncoding', "Select Encoding"),
            command: 'workbench.action.editor.changeEncoding'
        };
        this.updateElement(this.encodingElement, props, 'status.editor.encoding', 1 /* StatusbarAlignment.RIGHT */, 100.3);
    }
    updateEOLElement(text) {
        if (!text) {
            this.eolElement.clear();
            return;
        }
        const props = {
            name: localize('status.editor.eol', "Editor End of Line"),
            text,
            ariaLabel: text,
            tooltip: localize('selectEOL', "Select End of Line Sequence"),
            command: 'workbench.action.editor.changeEOL'
        };
        this.updateElement(this.eolElement, props, 'status.editor.eol', 1 /* StatusbarAlignment.RIGHT */, 100.2);
    }
    updateLanguageIdElement(text) {
        if (!text) {
            this.languageElement.clear();
            return;
        }
        const props = {
            name: localize('status.editor.mode', "Editor Language"),
            text,
            ariaLabel: text,
            tooltip: localize('selectLanguageMode', "Select Language Mode"),
            command: 'workbench.action.editor.changeLanguageMode'
        };
        this.updateElement(this.languageElement, props, 'status.editor.mode', 1 /* StatusbarAlignment.RIGHT */, 100.1);
    }
    updateMetadataElement(text) {
        if (!text) {
            this.metadataElement.clear();
            return;
        }
        const props = {
            name: localize('status.editor.info', "File Information"),
            text,
            ariaLabel: text,
            tooltip: localize('fileInfo', "File Information")
        };
        this.updateElement(this.metadataElement, props, 'status.editor.info', 1 /* StatusbarAlignment.RIGHT */, 100);
    }
    updateElement(element, props, id, alignment, priority) {
        if (!element.value) {
            element.value = this.statusbarService.addEntry(props, id, alignment, priority);
        }
        else {
            element.value.update(props);
        }
    }
    updateState(update) {
        const changed = this.state.update(update);
        if (!changed.hasChanges()) {
            return; // Nothing really changed
        }
        if (!this.toRender) {
            this.toRender = changed;
            this.delayedRender.value = runAtThisOrScheduleAtNextAnimationFrame(getWindowById(this.targetWindowId, true).window, () => {
                this.delayedRender.clear();
                const toRender = this.toRender;
                this.toRender = undefined;
                if (toRender) {
                    this.doRenderNow();
                }
            });
        }
        else {
            this.toRender.combine(changed);
        }
    }
    doRenderNow() {
        this.updateTabFocusModeElement(!!this.state.tabFocusMode);
        this.updateInputModeElement(this.state.inputMode);
        this.updateColumnSelectionModeElement(!!this.state.columnSelectionMode);
        this.updateIndentationElement(this.state.indentation);
        this.updateSelectionElement(this.state.selectionStatus);
        this.updateEncodingElement(this.state.encoding);
        this.updateEOLElement(this.state.EOL ? this.state.EOL === '\r\n' ? nlsEOLCRLF : nlsEOLLF : undefined);
        this.updateLanguageIdElement(this.state.languageId);
        this.updateMetadataElement(this.state.metadata);
    }
    getSelectionLabel(info) {
        if (!info || !info.selections) {
            return undefined;
        }
        if (info.selections.length === 1) {
            if (info.charactersSelected) {
                return format(nlsSingleSelectionRange, info.selections[0].positionLineNumber, info.selections[0].positionColumn, info.charactersSelected);
            }
            return format(nlsSingleSelection, info.selections[0].positionLineNumber, info.selections[0].positionColumn);
        }
        if (info.charactersSelected) {
            return format(nlsMultiSelectionRange, info.selections.length, info.charactersSelected);
        }
        if (info.selections.length > 0) {
            return format(nlsMultiSelection, info.selections.length);
        }
        return undefined;
    }
    updateStatusBar() {
        const activeInput = this.editorService.activeEditor;
        const activeEditorPane = this.editorService.activeEditorPane;
        const activeCodeEditor = activeEditorPane ? getCodeEditor(activeEditorPane.getControl()) ?? undefined : undefined;
        // Update all states
        this.onColumnSelectionModeChange(activeCodeEditor);
        this.onSelectionChange(activeCodeEditor);
        this.onLanguageChange(activeCodeEditor, activeInput);
        this.onEOLChange(activeCodeEditor);
        this.onEncodingChange(activeEditorPane, activeCodeEditor);
        this.onIndentationChange(activeCodeEditor);
        this.onMetadataChange(activeEditorPane);
        this.currentMarkerStatus.update(activeCodeEditor);
        // Dispose old active editor listeners
        this.activeEditorListeners.clear();
        // Attach new listeners to active editor
        if (activeEditorPane) {
            this.activeEditorListeners.add(activeEditorPane.onDidChangeControl(() => {
                // Since our editor status is mainly observing the
                // active editor control, do a full update whenever
                // the control changes.
                this.updateStatusBar();
            }));
        }
        // Attach new listeners to active code editor
        if (activeCodeEditor) {
            // Hook Listener for Configuration changes
            this.activeEditorListeners.add(activeCodeEditor.onDidChangeConfiguration((event) => {
                if (event.hasChanged(22 /* EditorOption.columnSelection */)) {
                    this.onColumnSelectionModeChange(activeCodeEditor);
                }
            }));
            // Hook Listener for Selection changes
            this.activeEditorListeners.add(Event.defer(activeCodeEditor.onDidChangeCursorPosition)(() => {
                this.onSelectionChange(activeCodeEditor);
                this.currentMarkerStatus.update(activeCodeEditor);
            }));
            // Hook Listener for language changes
            this.activeEditorListeners.add(activeCodeEditor.onDidChangeModelLanguage(() => {
                this.onLanguageChange(activeCodeEditor, activeInput);
            }));
            // Hook Listener for content changes
            this.activeEditorListeners.add(Event.accumulate(activeCodeEditor.onDidChangeModelContent)(e => {
                this.onEOLChange(activeCodeEditor);
                this.currentMarkerStatus.update(activeCodeEditor);
                const selections = activeCodeEditor.getSelections();
                if (selections) {
                    for (const inner of e) {
                        for (const change of inner.changes) {
                            if (selections.some(selection => Range.areIntersecting(selection, change.range))) {
                                this.onSelectionChange(activeCodeEditor);
                                break;
                            }
                        }
                    }
                }
            }));
            // Hook Listener for content options changes
            this.activeEditorListeners.add(activeCodeEditor.onDidChangeModelOptions(() => {
                this.onIndentationChange(activeCodeEditor);
            }));
        }
        // Handle binary editors
        else if (activeEditorPane instanceof BaseBinaryResourceEditor || activeEditorPane instanceof BinaryResourceDiffEditor) {
            const binaryEditors = [];
            if (activeEditorPane instanceof BinaryResourceDiffEditor) {
                const primary = activeEditorPane.getPrimaryEditorPane();
                if (primary instanceof BaseBinaryResourceEditor) {
                    binaryEditors.push(primary);
                }
                const secondary = activeEditorPane.getSecondaryEditorPane();
                if (secondary instanceof BaseBinaryResourceEditor) {
                    binaryEditors.push(secondary);
                }
            }
            else {
                binaryEditors.push(activeEditorPane);
            }
            for (const editor of binaryEditors) {
                this.activeEditorListeners.add(editor.onDidChangeMetadata(() => {
                    this.onMetadataChange(activeEditorPane);
                }));
                this.activeEditorListeners.add(editor.onDidOpenInPlace(() => {
                    this.updateStatusBar();
                }));
            }
        }
    }
    onLanguageChange(editorWidget, editorInput) {
        const info = { type: 'languageId', languageId: undefined };
        // We only support text based editors
        if (editorWidget && editorInput && toEditorWithLanguageSupport(editorInput)) {
            const textModel = editorWidget.getModel();
            if (textModel) {
                const languageId = textModel.getLanguageId();
                info.languageId = this.languageService.getLanguageName(languageId) ?? undefined;
            }
        }
        this.updateState(info);
    }
    onIndentationChange(editorWidget) {
        const update = { type: 'indentation', indentation: undefined };
        if (editorWidget) {
            const model = editorWidget.getModel();
            if (model) {
                const modelOpts = model.getOptions();
                update.indentation = (modelOpts.insertSpaces
                    ? modelOpts.tabSize === modelOpts.indentSize
                        ? localize('spacesSize', "Spaces: {0}", modelOpts.indentSize)
                        : localize('spacesAndTabsSize', "Spaces: {0} (Tab Size: {1})", modelOpts.indentSize, modelOpts.tabSize)
                    : localize({ key: 'tabSize', comment: ['Tab corresponds to the tab key'] }, "Tab Size: {0}", modelOpts.tabSize));
            }
        }
        this.updateState(update);
    }
    onMetadataChange(editor) {
        const update = { type: 'metadata', metadata: undefined };
        if (editor instanceof BaseBinaryResourceEditor || editor instanceof BinaryResourceDiffEditor) {
            update.metadata = editor.getMetadata();
        }
        this.updateState(update);
    }
    onColumnSelectionModeChange(editorWidget) {
        const info = { type: 'columnSelectionMode', columnSelectionMode: false };
        if (editorWidget?.getOption(22 /* EditorOption.columnSelection */)) {
            info.columnSelectionMode = true;
        }
        this.updateState(info);
    }
    onSelectionChange(editorWidget) {
        const info = Object.create(null);
        // We only support text based editors
        if (editorWidget) {
            // Compute selection(s)
            info.selections = editorWidget.getSelections() || [];
            // Compute selection length
            info.charactersSelected = 0;
            const textModel = editorWidget.getModel();
            if (textModel) {
                for (const selection of info.selections) {
                    if (typeof info.charactersSelected !== 'number') {
                        info.charactersSelected = 0;
                    }
                    info.charactersSelected += textModel.getCharacterCountInRange(selection);
                }
            }
            // Compute the visible column for one selection. This will properly handle tabs and their configured widths
            if (info.selections.length === 1) {
                const editorPosition = editorWidget.getPosition();
                const selectionClone = new Selection(info.selections[0].selectionStartLineNumber, info.selections[0].selectionStartColumn, info.selections[0].positionLineNumber, editorPosition ? editorWidget.getStatusbarColumn(editorPosition) : info.selections[0].positionColumn);
                info.selections[0] = selectionClone;
            }
        }
        this.updateState({ type: 'selectionStatus', selectionStatus: this.getSelectionLabel(info) });
    }
    onEOLChange(editorWidget) {
        const info = { type: 'EOL', EOL: undefined };
        if (editorWidget && !editorWidget.getOption(96 /* EditorOption.readOnly */)) {
            const codeEditorModel = editorWidget.getModel();
            if (codeEditorModel) {
                info.EOL = codeEditorModel.getEOL();
            }
        }
        this.updateState(info);
    }
    onEncodingChange(editor, editorWidget) {
        if (editor && !this.isActiveEditor(editor)) {
            return;
        }
        const info = { type: 'encoding', encoding: undefined };
        // We only support text based editors that have a model associated
        // This ensures we do not show the encoding picker while an editor
        // is still loading.
        if (editor && editorWidget?.hasModel()) {
            const encodingSupport = editor.input ? toEditorWithEncodingSupport(editor.input) : null;
            if (encodingSupport) {
                const rawEncoding = encodingSupport.getEncoding();
                const encodingInfo = typeof rawEncoding === 'string' ? SUPPORTED_ENCODINGS[rawEncoding] : undefined;
                if (encodingInfo) {
                    info.encoding = encodingInfo.labelShort; // if we have a label, take it from there
                }
                else {
                    info.encoding = rawEncoding; // otherwise use it raw
                }
            }
        }
        this.updateState(info);
    }
    onResourceEncodingChange(resource) {
        const activeEditorPane = this.editorService.activeEditorPane;
        if (activeEditorPane) {
            const activeResource = EditorResourceAccessor.getCanonicalUri(activeEditorPane.input, { supportSideBySide: SideBySideEditor.PRIMARY });
            if (activeResource && isEqual(activeResource, resource)) {
                const activeCodeEditor = getCodeEditor(activeEditorPane.getControl()) ?? undefined;
                return this.onEncodingChange(activeEditorPane, activeCodeEditor); // only update if the encoding changed for the active resource
            }
        }
    }
    onTabFocusModeChange(tabFocusMode) {
        const info = { type: 'tabFocusMode', tabFocusMode };
        this.updateState(info);
    }
    onInputModeChange(inputMode) {
        const info = { type: 'inputMode', inputMode };
        this.updateState(info);
    }
    isActiveEditor(control) {
        const activeEditorPane = this.editorService.activeEditorPane;
        return !!activeEditorPane && activeEditorPane === control;
    }
};
EditorStatus = __decorate([
    __param(1, IEditorService),
    __param(2, IQuickInputService),
    __param(3, ILanguageService),
    __param(4, ITextFileService),
    __param(5, IStatusbarService),
    __param(6, IInstantiationService),
    __param(7, IConfigurationService)
], EditorStatus);
let EditorStatusContribution = class EditorStatusContribution extends Disposable {
    static { this.ID = 'workbench.contrib.editorStatus'; }
    constructor(editorGroupService) {
        super();
        this.editorGroupService = editorGroupService;
        for (const part of editorGroupService.parts) {
            this.createEditorStatus(part);
        }
        this._register(editorGroupService.onDidCreateAuxiliaryEditorPart(part => this.createEditorStatus(part)));
    }
    createEditorStatus(part) {
        const disposables = new DisposableStore();
        Event.once(part.onWillDispose)(() => disposables.dispose());
        const scopedInstantiationService = this.editorGroupService.getScopedInstantiationService(part);
        disposables.add(scopedInstantiationService.createInstance(EditorStatus, part.windowId));
    }
};
EditorStatusContribution = __decorate([
    __param(0, IEditorGroupsService)
], EditorStatusContribution);
export { EditorStatusContribution };
let ShowCurrentMarkerInStatusbarContribution = class ShowCurrentMarkerInStatusbarContribution extends Disposable {
    constructor(statusbarService, markerService, configurationService) {
        super();
        this.statusbarService = statusbarService;
        this.markerService = markerService;
        this.configurationService = configurationService;
        this.editor = undefined;
        this.markers = [];
        this.currentMarker = null;
        this.statusBarEntryAccessor = this._register(new MutableDisposable());
        this._register(markerService.onMarkerChanged(changedResources => this.onMarkerChanged(changedResources)));
        this._register(Event.filter(configurationService.onDidChangeConfiguration, e => e.affectsConfiguration('problems.showCurrentInStatus'))(() => this.updateStatus()));
    }
    update(editor) {
        this.editor = editor;
        this.updateMarkers();
        this.updateStatus();
    }
    updateStatus() {
        const previousMarker = this.currentMarker;
        this.currentMarker = this.getMarker();
        if (this.hasToUpdateStatus(previousMarker, this.currentMarker)) {
            if (this.currentMarker) {
                const line = splitLines(this.currentMarker.message)[0];
                const text = `${this.getType(this.currentMarker)} ${line}`;
                if (!this.statusBarEntryAccessor.value) {
                    this.statusBarEntryAccessor.value = this.statusbarService.addEntry({ name: localize('currentProblem', "Current Problem"), text, ariaLabel: text }, 'statusbar.currentProblem', 0 /* StatusbarAlignment.LEFT */);
                }
                else {
                    this.statusBarEntryAccessor.value.update({ name: localize('currentProblem', "Current Problem"), text, ariaLabel: text });
                }
            }
            else {
                this.statusBarEntryAccessor.clear();
            }
        }
    }
    hasToUpdateStatus(previousMarker, currentMarker) {
        if (!currentMarker) {
            return true;
        }
        if (!previousMarker) {
            return true;
        }
        return IMarkerData.makeKey(previousMarker) !== IMarkerData.makeKey(currentMarker);
    }
    getType(marker) {
        switch (marker.severity) {
            case MarkerSeverity.Error: return '$(error)';
            case MarkerSeverity.Warning: return '$(warning)';
            case MarkerSeverity.Info: return '$(info)';
        }
        return '';
    }
    getMarker() {
        if (!this.configurationService.getValue('problems.showCurrentInStatus')) {
            return null;
        }
        if (!this.editor) {
            return null;
        }
        const model = this.editor.getModel();
        if (!model) {
            return null;
        }
        const position = this.editor.getPosition();
        if (!position) {
            return null;
        }
        return this.markers.find(marker => Range.containsPosition(marker, position)) || null;
    }
    onMarkerChanged(changedResources) {
        if (!this.editor) {
            return;
        }
        const model = this.editor.getModel();
        if (!model) {
            return;
        }
        if (model && !changedResources.some(r => isEqual(model.uri, r))) {
            return;
        }
        this.updateMarkers();
    }
    updateMarkers() {
        if (!this.editor) {
            return;
        }
        const model = this.editor.getModel();
        if (!model) {
            return;
        }
        if (model) {
            this.markers = this.markerService.read({
                resource: model.uri,
                severities: MarkerSeverity.Error | MarkerSeverity.Warning | MarkerSeverity.Info
            });
            this.markers.sort(this.compareMarker);
        }
        else {
            this.markers = [];
        }
        this.updateStatus();
    }
    compareMarker(a, b) {
        let res = compare(a.resource.toString(), b.resource.toString());
        if (res === 0) {
            res = MarkerSeverity.compare(a.severity, b.severity);
        }
        if (res === 0) {
            res = Range.compareRangesUsingStarts(a, b);
        }
        return res;
    }
};
ShowCurrentMarkerInStatusbarContribution = __decorate([
    __param(0, IStatusbarService),
    __param(1, IMarkerService),
    __param(2, IConfigurationService)
], ShowCurrentMarkerInStatusbarContribution);
let ShowLanguageExtensionsAction = class ShowLanguageExtensionsAction extends Action {
    static { ShowLanguageExtensionsAction_1 = this; }
    static { this.ID = 'workbench.action.showLanguageExtensions'; }
    constructor(fileExtension, commandService, galleryService) {
        super(ShowLanguageExtensionsAction_1.ID, localize('showLanguageExtensions', "Search Marketplace Extensions for '{0}'...", fileExtension));
        this.fileExtension = fileExtension;
        this.commandService = commandService;
        this.enabled = galleryService.isEnabled();
    }
    async run() {
        await this.commandService.executeCommand('workbench.extensions.action.showExtensionsForLanguage', this.fileExtension);
    }
};
ShowLanguageExtensionsAction = ShowLanguageExtensionsAction_1 = __decorate([
    __param(1, ICommandService),
    __param(2, IExtensionGalleryService)
], ShowLanguageExtensionsAction);
export { ShowLanguageExtensionsAction };
export class ChangeLanguageAction extends Action2 {
    static { this.ID = 'workbench.action.editor.changeLanguageMode'; }
    constructor() {
        super({
            id: ChangeLanguageAction.ID,
            title: localize2('changeMode', 'Change Language Mode'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 43 /* KeyCode.KeyM */)
            },
            precondition: ContextKeyExpr.not('notebookEditorFocused'),
            metadata: {
                description: localize('changeLanguageMode.description', "Change the language mode of the active text editor."),
                args: [
                    {
                        name: localize('changeLanguageMode.arg.name', "The name of the language mode to change to."),
                        constraint: (value) => typeof value === 'string',
                    }
                ]
            }
        });
    }
    async run(accessor, languageMode) {
        const quickInputService = accessor.get(IQuickInputService);
        const editorService = accessor.get(IEditorService);
        const languageService = accessor.get(ILanguageService);
        const languageDetectionService = accessor.get(ILanguageDetectionService);
        const textFileService = accessor.get(ITextFileService);
        const preferencesService = accessor.get(IPreferencesService);
        const instantiationService = accessor.get(IInstantiationService);
        const configurationService = accessor.get(IConfigurationService);
        const telemetryService = accessor.get(ITelemetryService);
        const activeTextEditorControl = getCodeEditor(editorService.activeTextEditorControl);
        if (!activeTextEditorControl) {
            await quickInputService.pick([{ label: localize('noEditor', "No text editor active at this time") }]);
            return;
        }
        const textModel = activeTextEditorControl.getModel();
        const resource = EditorResourceAccessor.getOriginalUri(editorService.activeEditor, { supportSideBySide: SideBySideEditor.PRIMARY });
        // Compute language
        let currentLanguageName;
        let currentLanguageId;
        if (textModel) {
            currentLanguageId = textModel.getLanguageId();
            currentLanguageName = languageService.getLanguageName(currentLanguageId) ?? undefined;
        }
        let hasLanguageSupport = !!resource;
        if (resource?.scheme === Schemas.untitled && !textFileService.untitled.get(resource)?.hasAssociatedFilePath) {
            hasLanguageSupport = false; // no configuration for untitled resources (e.g. "Untitled-1")
        }
        // All languages are valid picks
        const languages = languageService.getSortedRegisteredLanguageNames();
        const picks = languages
            .map(({ languageName, languageId }) => {
            const extensions = languageService.getExtensions(languageId).join(' ');
            let description;
            if (currentLanguageName === languageName) {
                description = localize('languageDescription', "({0}) - Configured Language", languageId);
            }
            else {
                description = localize('languageDescriptionConfigured', "({0})", languageId);
            }
            return {
                label: languageName,
                meta: extensions,
                iconClasses: getIconClassesForLanguageId(languageId),
                description
            };
        });
        picks.unshift({ type: 'separator', label: localize('languagesPicks', "languages (identifier)") });
        // Offer action to configure via settings
        let configureLanguageAssociations;
        let configureLanguageSettings;
        let galleryAction;
        if (hasLanguageSupport && resource) {
            const ext = extname(resource) || basename(resource);
            galleryAction = instantiationService.createInstance(ShowLanguageExtensionsAction, ext);
            if (galleryAction.enabled) {
                picks.unshift(galleryAction);
            }
            configureLanguageSettings = { label: localize('configureModeSettings', "Configure '{0}' language based settings...", currentLanguageName) };
            picks.unshift(configureLanguageSettings);
            configureLanguageAssociations = { label: localize('configureAssociationsExt', "Configure File Association for '{0}'...", ext) };
            picks.unshift(configureLanguageAssociations);
        }
        // Offer to "Auto Detect"
        const autoDetectLanguage = {
            label: localize('autoDetect', "Auto Detect")
        };
        picks.unshift(autoDetectLanguage);
        const pick = typeof languageMode === 'string' ? { label: languageMode } : await quickInputService.pick(picks, { placeHolder: localize('pickLanguage', "Select Language Mode"), matchOnDescription: true });
        if (!pick) {
            return;
        }
        if (pick === galleryAction) {
            galleryAction.run();
            return;
        }
        // User decided to permanently configure associations, return right after
        if (pick === configureLanguageAssociations) {
            if (resource) {
                this.configureFileAssociation(resource, languageService, quickInputService, configurationService);
            }
            return;
        }
        // User decided to configure settings for current language
        if (pick === configureLanguageSettings) {
            preferencesService.openUserSettings({ jsonEditor: true, revealSetting: { key: `[${currentLanguageId ?? null}]`, edit: true } });
            return;
        }
        // Change language for active editor
        const activeEditor = editorService.activeEditor;
        if (activeEditor) {
            const languageSupport = toEditorWithLanguageSupport(activeEditor);
            if (languageSupport) {
                // Find language
                let languageSelection;
                let detectedLanguage;
                if (pick === autoDetectLanguage) {
                    if (textModel) {
                        const resource = EditorResourceAccessor.getOriginalUri(activeEditor, { supportSideBySide: SideBySideEditor.PRIMARY });
                        if (resource) {
                            // Detect languages since we are in an untitled file
                            let languageId = languageService.guessLanguageIdByFilepathOrFirstLine(resource, textModel.getLineContent(1)) ?? undefined;
                            if (!languageId || languageId === 'unknown') {
                                detectedLanguage = await languageDetectionService.detectLanguage(resource);
                                languageId = detectedLanguage;
                            }
                            if (languageId) {
                                languageSelection = languageService.createById(languageId);
                            }
                        }
                    }
                }
                else {
                    const languageId = languageService.getLanguageIdByLanguageName(pick.label);
                    languageSelection = languageService.createById(languageId);
                    if (resource) {
                        // fire and forget to not slow things down
                        languageDetectionService.detectLanguage(resource).then(detectedLanguageId => {
                            const chosenLanguageId = languageService.getLanguageIdByLanguageName(pick.label) || 'unknown';
                            if (detectedLanguageId === currentLanguageId && currentLanguageId !== chosenLanguageId) {
                                // If they didn't choose the detected language (which should also be the active language if automatic detection is enabled)
                                // then the automatic language detection was likely wrong and the user is correcting it. In this case, we want telemetry.
                                // Keep track of what model was preferred and length of input to help track down potential differences between the result quality across models and content size.
                                const modelPreference = configurationService.getValue('workbench.editor.preferHistoryBasedLanguageDetection') ? 'history' : 'classic';
                                telemetryService.publicLog2(AutomaticLanguageDetectionLikelyWrongId, {
                                    currentLanguageId: currentLanguageName ?? 'unknown',
                                    nextLanguageId: pick.label,
                                    lineCount: textModel?.getLineCount() ?? -1,
                                    modelPreference,
                                });
                            }
                        });
                    }
                }
                // Change language
                if (typeof languageSelection !== 'undefined') {
                    languageSupport.setLanguageId(languageSelection.languageId, ChangeLanguageAction.ID);
                    if (resource?.scheme === Schemas.untitled) {
                        const modelPreference = configurationService.getValue('workbench.editor.preferHistoryBasedLanguageDetection') ? 'history' : 'classic';
                        telemetryService.publicLog2('setUntitledDocumentLanguage', {
                            to: languageSelection.languageId,
                            from: currentLanguageId ?? 'none',
                            modelPreference,
                        });
                    }
                }
            }
            activeTextEditorControl.focus();
        }
    }
    configureFileAssociation(resource, languageService, quickInputService, configurationService) {
        const extension = extname(resource);
        const base = basename(resource);
        const currentAssociation = languageService.guessLanguageIdByFilepathOrFirstLine(URI.file(base));
        const languages = languageService.getSortedRegisteredLanguageNames();
        const picks = languages.map(({ languageName, languageId }) => {
            return {
                id: languageId,
                label: languageName,
                iconClasses: getIconClassesForLanguageId(languageId),
                description: (languageId === currentAssociation) ? localize('currentAssociation', "Current Association") : undefined
            };
        });
        setTimeout(async () => {
            const language = await quickInputService.pick(picks, { placeHolder: localize('pickLanguageToConfigure', "Select Language Mode to Associate with '{0}'", extension || base) });
            if (language) {
                const fileAssociationsConfig = configurationService.inspect(FILES_ASSOCIATIONS_CONFIG);
                let associationKey;
                if (extension && base[0] !== '.') {
                    associationKey = `*${extension}`; // only use "*.ext" if the file path is in the form of <name>.<ext>
                }
                else {
                    associationKey = base; // otherwise use the basename (e.g. .gitignore, Dockerfile)
                }
                // If the association is already being made in the workspace, make sure to target workspace settings
                let target = 2 /* ConfigurationTarget.USER */;
                if (fileAssociationsConfig.workspaceValue && !!fileAssociationsConfig.workspaceValue[associationKey]) {
                    target = 5 /* ConfigurationTarget.WORKSPACE */;
                }
                // Make sure to write into the value of the target and not the merged value from USER and WORKSPACE config
                const currentAssociations = deepClone((target === 5 /* ConfigurationTarget.WORKSPACE */) ? fileAssociationsConfig.workspaceValue : fileAssociationsConfig.userValue) || Object.create(null);
                currentAssociations[associationKey] = language.id;
                configurationService.updateValue(FILES_ASSOCIATIONS_CONFIG, currentAssociations, target);
            }
        }, 50 /* quick input is sensitive to being opened so soon after another */);
    }
}
export class ChangeEOLAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.editor.changeEOL',
            title: localize2('changeEndOfLine', 'Change End of Line Sequence'),
            f1: true
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const quickInputService = accessor.get(IQuickInputService);
        const activeTextEditorControl = getCodeEditor(editorService.activeTextEditorControl);
        if (!activeTextEditorControl) {
            await quickInputService.pick([{ label: localize('noEditor', "No text editor active at this time") }]);
            return;
        }
        if (editorService.activeEditor?.isReadonly()) {
            await quickInputService.pick([{ label: localize('noWritableCodeEditor', "The active code editor is read-only.") }]);
            return;
        }
        let textModel = activeTextEditorControl.getModel();
        const EOLOptions = [
            { label: nlsEOLLF, eol: 0 /* EndOfLineSequence.LF */ },
            { label: nlsEOLCRLF, eol: 1 /* EndOfLineSequence.CRLF */ },
        ];
        const selectedIndex = (textModel?.getEOL() === '\n') ? 0 : 1;
        const eol = await quickInputService.pick(EOLOptions, { placeHolder: localize('pickEndOfLine', "Select End of Line Sequence"), activeItem: EOLOptions[selectedIndex] });
        if (eol) {
            const activeCodeEditor = getCodeEditor(editorService.activeTextEditorControl);
            if (activeCodeEditor?.hasModel() && !editorService.activeEditor?.isReadonly()) {
                textModel = activeCodeEditor.getModel();
                textModel.pushStackElement();
                textModel.pushEOL(eol.eol);
                textModel.pushStackElement();
            }
        }
        activeTextEditorControl.focus();
    }
}
export class ChangeEncodingAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.editor.changeEncoding',
            title: localize2('changeEncoding', 'Change File Encoding'),
            f1: true
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const quickInputService = accessor.get(IQuickInputService);
        const fileService = accessor.get(IFileService);
        const textFileService = accessor.get(ITextFileService);
        const textResourceConfigurationService = accessor.get(ITextResourceConfigurationService);
        const activeTextEditorControl = getCodeEditor(editorService.activeTextEditorControl);
        if (!activeTextEditorControl) {
            await quickInputService.pick([{ label: localize('noEditor', "No text editor active at this time") }]);
            return;
        }
        const activeEditorPane = editorService.activeEditorPane;
        if (!activeEditorPane) {
            await quickInputService.pick([{ label: localize('noEditor', "No text editor active at this time") }]);
            return;
        }
        const encodingSupport = toEditorWithEncodingSupport(activeEditorPane.input);
        if (!encodingSupport) {
            await quickInputService.pick([{ label: localize('noFileEditor', "No file active at this time") }]);
            return;
        }
        const saveWithEncodingPick = { label: localize('saveWithEncoding', "Save with Encoding") };
        const reopenWithEncodingPick = { label: localize('reopenWithEncoding', "Reopen with Encoding") };
        if (!Language.isDefaultVariant()) {
            const saveWithEncodingAlias = 'Save with Encoding';
            if (saveWithEncodingAlias !== saveWithEncodingPick.label) {
                saveWithEncodingPick.detail = saveWithEncodingAlias;
            }
            const reopenWithEncodingAlias = 'Reopen with Encoding';
            if (reopenWithEncodingAlias !== reopenWithEncodingPick.label) {
                reopenWithEncodingPick.detail = reopenWithEncodingAlias;
            }
        }
        let action;
        if (encodingSupport instanceof UntitledTextEditorInput) {
            action = saveWithEncodingPick;
        }
        else if (activeEditorPane.input.isReadonly()) {
            action = reopenWithEncodingPick;
        }
        else {
            action = await quickInputService.pick([reopenWithEncodingPick, saveWithEncodingPick], { placeHolder: localize('pickAction', "Select Action"), matchOnDetail: true });
        }
        if (!action) {
            return;
        }
        await timeout(50); // quick input is sensitive to being opened so soon after another
        const resource = EditorResourceAccessor.getOriginalUri(activeEditorPane.input, { supportSideBySide: SideBySideEditor.PRIMARY });
        if (!resource || (!fileService.hasProvider(resource) && resource.scheme !== Schemas.untitled)) {
            return; // encoding detection only possible for resources the file service can handle or that are untitled
        }
        let guessedEncoding = undefined;
        if (fileService.hasProvider(resource)) {
            const content = await textFileService.readStream(resource, {
                autoGuessEncoding: true,
                candidateGuessEncodings: textResourceConfigurationService.getValue(resource, 'files.candidateGuessEncodings')
            });
            guessedEncoding = content.encoding;
        }
        const isReopenWithEncoding = (action === reopenWithEncodingPick);
        const configuredEncoding = textResourceConfigurationService.getValue(resource, 'files.encoding');
        let directMatchIndex;
        let aliasMatchIndex;
        // All encodings are valid picks
        const picks = Object.keys(SUPPORTED_ENCODINGS)
            .sort((k1, k2) => {
            if (k1 === configuredEncoding) {
                return -1;
            }
            else if (k2 === configuredEncoding) {
                return 1;
            }
            return SUPPORTED_ENCODINGS[k1].order - SUPPORTED_ENCODINGS[k2].order;
        })
            .filter(k => {
            if (k === guessedEncoding && guessedEncoding !== configuredEncoding) {
                return false; // do not show encoding if it is the guessed encoding that does not match the configured
            }
            return !isReopenWithEncoding || !SUPPORTED_ENCODINGS[k].encodeOnly; // hide those that can only be used for encoding if we are about to decode
        })
            .map((key, index) => {
            if (key === encodingSupport.getEncoding()) {
                directMatchIndex = index;
            }
            else if (SUPPORTED_ENCODINGS[key].alias === encodingSupport.getEncoding()) {
                aliasMatchIndex = index;
            }
            return { id: key, label: SUPPORTED_ENCODINGS[key].labelLong, description: key };
        });
        const items = picks.slice();
        // If we have a guessed encoding, show it first unless it matches the configured encoding
        if (guessedEncoding && configuredEncoding !== guessedEncoding && SUPPORTED_ENCODINGS[guessedEncoding]) {
            picks.unshift({ type: 'separator' });
            picks.unshift({ id: guessedEncoding, label: SUPPORTED_ENCODINGS[guessedEncoding].labelLong, description: localize('guessedEncoding', "Guessed from content") });
        }
        const encoding = await quickInputService.pick(picks, {
            placeHolder: isReopenWithEncoding ? localize('pickEncodingForReopen', "Select File Encoding to Reopen File") : localize('pickEncodingForSave', "Select File Encoding to Save with"),
            activeItem: items[typeof directMatchIndex === 'number' ? directMatchIndex : typeof aliasMatchIndex === 'number' ? aliasMatchIndex : -1]
        });
        if (!encoding) {
            return;
        }
        if (!editorService.activeEditorPane) {
            return;
        }
        const activeEncodingSupport = toEditorWithEncodingSupport(editorService.activeEditorPane.input);
        if (typeof encoding.id !== 'undefined' && activeEncodingSupport) {
            await activeEncodingSupport.setEncoding(encoding.id, isReopenWithEncoding ? 1 /* EncodingMode.Decode */ : 0 /* EncodingMode.Encode */); // Set new encoding
        }
        activeTextEditorControl.focus();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yU3RhdHVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvZWRpdG9yL2VkaXRvclN0YXR1cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTywwQkFBMEIsQ0FBQztBQUNsQyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ3pELE9BQU8sRUFBRSxhQUFhLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN6RyxPQUFPLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNqRixPQUFPLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRixPQUFPLEVBQUUsWUFBWSxFQUFFLGVBQWUsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDNUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBQ3ZHLE9BQU8sRUFBb0Isc0JBQXNCLEVBQWUsZ0JBQWdCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUVwSCxPQUFPLEVBQUUsVUFBVSxFQUFFLGlCQUFpQixFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBR3RHLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLHVFQUF1RSxDQUFDO0FBQ3JILE9BQU8sRUFBRSxpQkFB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