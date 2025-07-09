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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yU3RhdHVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL2VkaXRvci9lZGl0b3JTdGF0dXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sMEJBQTBCLENBQUM7QUFDbEMsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUN6RCxPQUFPLEVBQUUsYUFBYSxFQUFFLHVDQUF1QyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDekcsT0FBTyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDakYsT0FBTyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEYsT0FBTyxFQUFFLFlBQVksRUFBRSxlQUFlLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNqRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUN2RyxPQUFPLEVBQW9CLHNCQUFzQixFQUFlLGdCQUFnQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFFcEgsT0FBTyxFQUFFLFVBQVUsRUFBRSxpQkFBaUIsRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUd0RyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSx1RUFBdUUsQ0FBQztBQUNySCxPQUFPLEVBQUUsaUJB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