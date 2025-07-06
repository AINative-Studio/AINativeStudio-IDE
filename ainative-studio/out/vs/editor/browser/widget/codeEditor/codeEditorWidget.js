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
var CodeEditorWidget_1;
import '../../services/markerDecorations.js';
import * as dom from '../../../../base/browser/dom.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { Emitter, createEventDeliveryQueue } from '../../../../base/common/event.js';
import { hash } from '../../../../base/common/hash.js';
import { Disposable, dispose } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import './editor.css';
import { applyFontInfo } from '../../config/domFontInfo.js';
import { EditorConfiguration } from '../../config/editorConfiguration.js';
import { TabFocus } from '../../config/tabFocus.js';
import { EditorExtensionsRegistry } from '../../editorExtensions.js';
import { ICodeEditorService } from '../../services/codeEditorService.js';
import { View } from '../../view.js';
import { DOMLineBreaksComputerFactory } from '../../view/domLineBreaksComputer.js';
import { ViewUserInputEvents } from '../../view/viewUserInputEvents.js';
import { CodeEditorContributions } from './codeEditorContributions.js';
import { filterValidationDecorations } from '../../../common/config/editorOptions.js';
import { CursorColumns } from '../../../common/core/cursorColumns.js';
import { editorUnnecessaryCodeOpacity } from '../../../common/core/editorColorRegistry.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { Selection } from '../../../common/core/selection.js';
import { WordOperations } from '../../../common/cursor/cursorWordOperations.js';
import { InternalEditorAction } from '../../../common/editorAction.js';
import * as editorCommon from '../../../common/editorCommon.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { ILanguageConfigurationService } from '../../../common/languages/languageConfigurationRegistry.js';
import { ModelDecorationOptions } from '../../../common/model/textModel.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { MonospaceLineBreaksComputerFactory } from '../../../common/viewModel/monospaceLineBreaksComputer.js';
import { ViewModel } from '../../../common/viewModel/viewModelImpl.js';
import * as nls from '../../../../nls.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { editorErrorForeground, editorHintForeground, editorInfoForeground, editorWarningForeground } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService, registerThemingParticipant } from '../../../../platform/theme/common/themeService.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
let CodeEditorWidget = class CodeEditorWidget extends Disposable {
    static { CodeEditorWidget_1 = this; }
    static { this.dropIntoEditorDecorationOptions = ModelDecorationOptions.register({
        description: 'workbench-dnd-target',
        className: 'dnd-target'
    }); }
    //#endregion
    get isSimpleWidget() {
        return this._configuration.isSimpleWidget;
    }
    get contextMenuId() {
        return this._configuration.contextMenuId;
    }
    get contextKeyService() { return this._contextKeyService; }
    constructor(domElement, _options, codeEditorWidgetOptions, instantiationService, codeEditorService, commandService, contextKeyService, themeService, notificationService, accessibilityService, languageConfigurationService, languageFeaturesService) {
        super();
        this.languageConfigurationService = languageConfigurationService;
        //#region Eventing
        this._deliveryQueue = createEventDeliveryQueue();
        this._contributions = this._register(new CodeEditorContributions());
        this._onDidDispose = this._register(new Emitter());
        this.onDidDispose = this._onDidDispose.event;
        this._onDidChangeModelContent = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeModelContent = this._onDidChangeModelContent.event;
        this._onDidChangeModelLanguage = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeModelLanguage = this._onDidChangeModelLanguage.event;
        this._onDidChangeModelLanguageConfiguration = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeModelLanguageConfiguration = this._onDidChangeModelLanguageConfiguration.event;
        this._onDidChangeModelOptions = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeModelOptions = this._onDidChangeModelOptions.event;
        this._onDidChangeModelDecorations = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeModelDecorations = this._onDidChangeModelDecorations.event;
        this._onDidChangeModelTokens = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeModelTokens = this._onDidChangeModelTokens.event;
        this._onDidChangeConfiguration = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeConfiguration = this._onDidChangeConfiguration.event;
        this._onWillChangeModel = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onWillChangeModel = this._onWillChangeModel.event;
        this._onDidChangeModel = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeModel = this._onDidChangeModel.event;
        this._onDidChangeCursorPosition = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeCursorPosition = this._onDidChangeCursorPosition.event;
        this._onDidChangeCursorSelection = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeCursorSelection = this._onDidChangeCursorSelection.event;
        this._onDidAttemptReadOnlyEdit = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onDidAttemptReadOnlyEdit = this._onDidAttemptReadOnlyEdit.event;
        this._onDidLayoutChange = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidLayoutChange = this._onDidLayoutChange.event;
        this._editorTextFocus = this._register(new BooleanEventEmitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidFocusEditorText = this._editorTextFocus.onDidChangeToTrue;
        this.onDidBlurEditorText = this._editorTextFocus.onDidChangeToFalse;
        this._editorWidgetFocus = this._register(new BooleanEventEmitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidFocusEditorWidget = this._editorWidgetFocus.onDidChangeToTrue;
        this.onDidBlurEditorWidget = this._editorWidgetFocus.onDidChangeToFalse;
        this._onWillType = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onWillType = this._onWillType.event;
        this._onDidType = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onDidType = this._onDidType.event;
        this._onDidCompositionStart = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onDidCompositionStart = this._onDidCompositionStart.event;
        this._onDidCompositionEnd = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onDidCompositionEnd = this._onDidCompositionEnd.event;
        this._onDidPaste = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onDidPaste = this._onDidPaste.event;
        this._onMouseUp = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onMouseUp = this._onMouseUp.event;
        this._onMouseDown = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onMouseDown = this._onMouseDown.event;
        this._onMouseDrag = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onMouseDrag = this._onMouseDrag.event;
        this._onMouseDrop = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onMouseDrop = this._onMouseDrop.event;
        this._onMouseDropCanceled = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onMouseDropCanceled = this._onMouseDropCanceled.event;
        this._onDropIntoEditor = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onDropIntoEditor = this._onDropIntoEditor.event;
        this._onContextMenu = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onContextMenu = this._onContextMenu.event;
        this._onMouseMove = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onMouseMove = this._onMouseMove.event;
        this._onMouseLeave = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onMouseLeave = this._onMouseLeave.event;
        this._onMouseWheel = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onMouseWheel = this._onMouseWheel.event;
        this._onKeyUp = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onKeyUp = this._onKeyUp.event;
        this._onKeyDown = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onKeyDown = this._onKeyDown.event;
        this._onDidContentSizeChange = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidContentSizeChange = this._onDidContentSizeChange.event;
        this._onDidScrollChange = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidScrollChange = this._onDidScrollChange.event;
        this._onDidChangeViewZones = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeViewZones = this._onDidChangeViewZones.event;
        this._onDidChangeHiddenAreas = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeHiddenAreas = this._onDidChangeHiddenAreas.event;
        this._updateCounter = 0;
        this._onWillTriggerEditorOperationEvent = this._register(new Emitter());
        this.onWillTriggerEditorOperationEvent = this._onWillTriggerEditorOperationEvent.event;
        this._onBeginUpdate = this._register(new Emitter());
        this.onBeginUpdate = this._onBeginUpdate.event;
        this._onEndUpdate = this._register(new Emitter());
        this.onEndUpdate = this._onEndUpdate.event;
        this._onBeforeExecuteEdit = this._register(new Emitter());
        this.onBeforeExecuteEdit = this._onBeforeExecuteEdit.event;
        this._actions = new Map();
        this._bannerDomNode = null;
        this._dropIntoEditorDecorations = this.createDecorationsCollection();
        this.inComposition = false;
        codeEditorService.willCreateCodeEditor();
        const options = { ..._options };
        this._domElement = domElement;
        this._overflowWidgetsDomNode = options.overflowWidgetsDomNode;
        delete options.overflowWidgetsDomNode;
        this._id = (++EDITOR_ID);
        this._decorationTypeKeysToIds = {};
        this._decorationTypeSubtypes = {};
        this._telemetryData = codeEditorWidgetOptions.telemetryData;
        this._configuration = this._register(this._createConfiguration(codeEditorWidgetOptions.isSimpleWidget || false, codeEditorWidgetOptions.contextMenuId ?? (codeEditorWidgetOptions.isSimpleWidget ? MenuId.SimpleEditorContext : MenuId.EditorContext), options, accessibilityService));
        this._register(this._configuration.onDidChange((e) => {
            this._onDidChangeConfiguration.fire(e);
            const options = this._configuration.options;
            if (e.hasChanged(151 /* EditorOption.layoutInfo */)) {
                const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
                this._onDidLayoutChange.fire(layoutInfo);
            }
        }));
        this._contextKeyService = this._register(contextKeyService.createScoped(this._domElement));
        if (codeEditorWidgetOptions.contextKeyValues) {
            for (const [key, value] of Object.entries(codeEditorWidgetOptions.contextKeyValues)) {
                this._contextKeyService.createKey(key, value);
            }
        }
        this._notificationService = notificationService;
        this._codeEditorService = codeEditorService;
        this._commandService = commandService;
        this._themeService = themeService;
        this._register(new EditorContextKeysManager(this, this._contextKeyService));
        this._register(new EditorModeContext(this, this._contextKeyService, languageFeaturesService));
        this._instantiationService = this._register(instantiationService.createChild(new ServiceCollection([IContextKeyService, this._contextKeyService])));
        this._modelData = null;
        this._contentWidgets = {};
        this._overlayWidgets = {};
        this._glyphMarginWidgets = {};
        let contributions;
        if (Array.isArray(codeEditorWidgetOptions.contributions)) {
            contributions = codeEditorWidgetOptions.contributions;
        }
        else {
            contributions = EditorExtensionsRegistry.getEditorContributions();
        }
        this._contributions.initialize(this, contributions, this._instantiationService);
        for (const action of EditorExtensionsRegistry.getEditorActions()) {
            if (this._actions.has(action.id)) {
                onUnexpectedError(new Error(`Cannot have two actions with the same id ${action.id}`));
                continue;
            }
            const internalAction = new InternalEditorAction(action.id, action.label, action.alias, action.metadata, action.precondition ?? undefined, (args) => {
                return this._instantiationService.invokeFunction((accessor) => {
                    return Promise.resolve(action.runEditorCommand(accessor, this, args));
                });
            }, this._contextKeyService);
            this._actions.set(internalAction.id, internalAction);
        }
        const isDropIntoEnabled = () => {
            return !this._configuration.options.get(96 /* EditorOption.readOnly */)
                && this._configuration.options.get(36 /* EditorOption.dropIntoEditor */).enabled;
        };
        this._register(new dom.DragAndDropObserver(this._domElement, {
            onDragOver: e => {
                if (!isDropIntoEnabled()) {
                    return;
                }
                const target = this.getTargetAtClientPoint(e.clientX, e.clientY);
                if (target?.position) {
                    this.showDropIndicatorAt(target.position);
                }
            },
            onDrop: async (e) => {
                if (!isDropIntoEnabled()) {
                    return;
                }
                this.removeDropIndicator();
                if (!e.dataTransfer) {
                    return;
                }
                const target = this.getTargetAtClientPoint(e.clientX, e.clientY);
                if (target?.position) {
                    this._onDropIntoEditor.fire({ position: target.position, event: e });
                }
            },
            onDragLeave: () => {
                this.removeDropIndicator();
            },
            onDragEnd: () => {
                this.removeDropIndicator();
            },
        }));
        this._codeEditorService.addCodeEditor(this);
    }
    writeScreenReaderContent(reason) {
        this._modelData?.view.writeScreenReaderContent(reason);
    }
    _createConfiguration(isSimpleWidget, contextMenuId, options, accessibilityService) {
        return new EditorConfiguration(isSimpleWidget, contextMenuId, options, this._domElement, accessibilityService);
    }
    getId() {
        return this.getEditorType() + ':' + this._id;
    }
    getEditorType() {
        return editorCommon.EditorType.ICodeEditor;
    }
    dispose() {
        this._codeEditorService.removeCodeEditor(this);
        this._actions.clear();
        this._contentWidgets = {};
        this._overlayWidgets = {};
        this._removeDecorationTypes();
        this._postDetachModelCleanup(this._detachModel());
        this._onDidDispose.fire();
        super.dispose();
    }
    invokeWithinContext(fn) {
        return this._instantiationService.invokeFunction(fn);
    }
    updateOptions(newOptions) {
        this._configuration.updateOptions(newOptions || {});
    }
    getOptions() {
        return this._configuration.options;
    }
    getOption(id) {
        return this._configuration.options.get(id);
    }
    getRawOptions() {
        return this._configuration.getRawOptions();
    }
    getOverflowWidgetsDomNode() {
        return this._overflowWidgetsDomNode;
    }
    getConfiguredWordAtPosition(position) {
        if (!this._modelData) {
            return null;
        }
        return WordOperations.getWordAtPosition(this._modelData.model, this._configuration.options.get(136 /* EditorOption.wordSeparators */), this._configuration.options.get(135 /* EditorOption.wordSegmenterLocales */), position);
    }
    getValue(options = null) {
        if (!this._modelData) {
            return '';
        }
        const preserveBOM = (options && options.preserveBOM) ? true : false;
        let eolPreference = 0 /* EndOfLinePreference.TextDefined */;
        if (options && options.lineEnding && options.lineEnding === '\n') {
            eolPreference = 1 /* EndOfLinePreference.LF */;
        }
        else if (options && options.lineEnding && options.lineEnding === '\r\n') {
            eolPreference = 2 /* EndOfLinePreference.CRLF */;
        }
        return this._modelData.model.getValue(eolPreference, preserveBOM);
    }
    setValue(newValue) {
        try {
            this._beginUpdate();
            if (!this._modelData) {
                return;
            }
            this._modelData.model.setValue(newValue);
        }
        finally {
            this._endUpdate();
        }
    }
    getModel() {
        if (!this._modelData) {
            return null;
        }
        return this._modelData.model;
    }
    setModel(_model = null) {
        try {
            this._beginUpdate();
            const model = _model;
            if (this._modelData === null && model === null) {
                // Current model is the new model
                return;
            }
            if (this._modelData && this._modelData.model === model) {
                // Current model is the new model
                return;
            }
            const e = {
                oldModelUrl: this._modelData?.model.uri || null,
                newModelUrl: model?.uri || null
            };
            this._onWillChangeModel.fire(e);
            const hasTextFocus = this.hasTextFocus();
            const detachedModel = this._detachModel();
            this._attachModel(model);
            if (this.hasModel()) {
                // we have a new model (with a new view)!
                if (hasTextFocus) {
                    this.focus();
                }
            }
            else {
                // we have no model (and no view) anymore
                // make sure the outside world knows we are not focused
                this._editorTextFocus.setValue(false);
                this._editorWidgetFocus.setValue(false);
            }
            this._removeDecorationTypes();
            this._onDidChangeModel.fire(e);
            this._postDetachModelCleanup(detachedModel);
            this._contributionsDisposable = this._contributions.onAfterModelAttached();
        }
        finally {
            this._endUpdate();
        }
    }
    _removeDecorationTypes() {
        this._decorationTypeKeysToIds = {};
        if (this._decorationTypeSubtypes) {
            for (const decorationType in this._decorationTypeSubtypes) {
                const subTypes = this._decorationTypeSubtypes[decorationType];
                for (const subType in subTypes) {
                    this._removeDecorationType(decorationType + '-' + subType);
                }
            }
            this._decorationTypeSubtypes = {};
        }
    }
    getVisibleRanges() {
        if (!this._modelData) {
            return [];
        }
        return this._modelData.viewModel.getVisibleRanges();
    }
    getVisibleRangesPlusViewportAboveBelow() {
        if (!this._modelData) {
            return [];
        }
        return this._modelData.viewModel.getVisibleRangesPlusViewportAboveBelow();
    }
    getWhitespaces() {
        if (!this._modelData) {
            return [];
        }
        return this._modelData.viewModel.viewLayout.getWhitespaces();
    }
    static _getVerticalOffsetAfterPosition(modelData, modelLineNumber, modelColumn, includeViewZones) {
        const modelPosition = modelData.model.validatePosition({
            lineNumber: modelLineNumber,
            column: modelColumn
        });
        const viewPosition = modelData.viewModel.coordinatesConverter.convertModelPositionToViewPosition(modelPosition);
        return modelData.viewModel.viewLayout.getVerticalOffsetAfterLineNumber(viewPosition.lineNumber, includeViewZones);
    }
    getTopForLineNumber(lineNumber, includeViewZones = false) {
        if (!this._modelData) {
            return -1;
        }
        return CodeEditorWidget_1._getVerticalOffsetForPosition(this._modelData, lineNumber, 1, includeViewZones);
    }
    getTopForPosition(lineNumber, column) {
        if (!this._modelData) {
            return -1;
        }
        return CodeEditorWidget_1._getVerticalOffsetForPosition(this._modelData, lineNumber, column, false);
    }
    static _getVerticalOffsetForPosition(modelData, modelLineNumber, modelColumn, includeViewZones = false) {
        const modelPosition = modelData.model.validatePosition({
            lineNumber: modelLineNumber,
            column: modelColumn
        });
        const viewPosition = modelData.viewModel.coordinatesConverter.convertModelPositionToViewPosition(modelPosition);
        return modelData.viewModel.viewLayout.getVerticalOffsetForLineNumber(viewPosition.lineNumber, includeViewZones);
    }
    getBottomForLineNumber(lineNumber, includeViewZones = false) {
        if (!this._modelData) {
            return -1;
        }
        const maxCol = this._modelData.model.getLineMaxColumn(lineNumber);
        return CodeEditorWidget_1._getVerticalOffsetAfterPosition(this._modelData, lineNumber, maxCol, includeViewZones);
    }
    setHiddenAreas(ranges, source, forceUpdate) {
        this._modelData?.viewModel.setHiddenAreas(ranges.map(r => Range.lift(r)), source, forceUpdate);
    }
    getVisibleColumnFromPosition(rawPosition) {
        if (!this._modelData) {
            return rawPosition.column;
        }
        const position = this._modelData.model.validatePosition(rawPosition);
        const tabSize = this._modelData.model.getOptions().tabSize;
        return CursorColumns.visibleColumnFromColumn(this._modelData.model.getLineContent(position.lineNumber), position.column, tabSize) + 1;
    }
    getStatusbarColumn(rawPosition) {
        if (!this._modelData) {
            return rawPosition.column;
        }
        const position = this._modelData.model.validatePosition(rawPosition);
        const tabSize = this._modelData.model.getOptions().tabSize;
        return CursorColumns.toStatusbarColumn(this._modelData.model.getLineContent(position.lineNumber), position.column, tabSize);
    }
    getPosition() {
        if (!this._modelData) {
            return null;
        }
        return this._modelData.viewModel.getPosition();
    }
    setPosition(position, source = 'api') {
        if (!this._modelData) {
            return;
        }
        if (!Position.isIPosition(position)) {
            throw new Error('Invalid arguments');
        }
        this._modelData.viewModel.setSelections(source, [{
                selectionStartLineNumber: position.lineNumber,
                selectionStartColumn: position.column,
                positionLineNumber: position.lineNumber,
                positionColumn: position.column
            }]);
    }
    _sendRevealRange(modelRange, verticalType, revealHorizontal, scrollType) {
        if (!this._modelData) {
            return;
        }
        if (!Range.isIRange(modelRange)) {
            throw new Error('Invalid arguments');
        }
        const validatedModelRange = this._modelData.model.validateRange(modelRange);
        const viewRange = this._modelData.viewModel.coordinatesConverter.convertModelRangeToViewRange(validatedModelRange);
        this._modelData.viewModel.revealRange('api', revealHorizontal, viewRange, verticalType, scrollType);
    }
    revealLine(lineNumber, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealLine(lineNumber, 0 /* VerticalRevealType.Simple */, scrollType);
    }
    revealLineInCenter(lineNumber, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealLine(lineNumber, 1 /* VerticalRevealType.Center */, scrollType);
    }
    revealLineInCenterIfOutsideViewport(lineNumber, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealLine(lineNumber, 2 /* VerticalRevealType.CenterIfOutsideViewport */, scrollType);
    }
    revealLineNearTop(lineNumber, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealLine(lineNumber, 5 /* VerticalRevealType.NearTop */, scrollType);
    }
    _revealLine(lineNumber, revealType, scrollType) {
        if (typeof lineNumber !== 'number') {
            throw new Error('Invalid arguments');
        }
        this._sendRevealRange(new Range(lineNumber, 1, lineNumber, 1), revealType, false, scrollType);
    }
    revealPosition(position, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealPosition(position, 0 /* VerticalRevealType.Simple */, true, scrollType);
    }
    revealPositionInCenter(position, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealPosition(position, 1 /* VerticalRevealType.Center */, true, scrollType);
    }
    revealPositionInCenterIfOutsideViewport(position, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealPosition(position, 2 /* VerticalRevealType.CenterIfOutsideViewport */, true, scrollType);
    }
    revealPositionNearTop(position, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealPosition(position, 5 /* VerticalRevealType.NearTop */, true, scrollType);
    }
    _revealPosition(position, verticalType, revealHorizontal, scrollType) {
        if (!Position.isIPosition(position)) {
            throw new Error('Invalid arguments');
        }
        this._sendRevealRange(new Range(position.lineNumber, position.column, position.lineNumber, position.column), verticalType, revealHorizontal, scrollType);
    }
    getSelection() {
        if (!this._modelData) {
            return null;
        }
        return this._modelData.viewModel.getSelection();
    }
    getSelections() {
        if (!this._modelData) {
            return null;
        }
        return this._modelData.viewModel.getSelections();
    }
    setSelection(something, source = 'api') {
        const isSelection = Selection.isISelection(something);
        const isRange = Range.isIRange(something);
        if (!isSelection && !isRange) {
            throw new Error('Invalid arguments');
        }
        if (isSelection) {
            this._setSelectionImpl(something, source);
        }
        else if (isRange) {
            // act as if it was an IRange
            const selection = {
                selectionStartLineNumber: something.startLineNumber,
                selectionStartColumn: something.startColumn,
                positionLineNumber: something.endLineNumber,
                positionColumn: something.endColumn
            };
            this._setSelectionImpl(selection, source);
        }
    }
    _setSelectionImpl(sel, source) {
        if (!this._modelData) {
            return;
        }
        const selection = new Selection(sel.selectionStartLineNumber, sel.selectionStartColumn, sel.positionLineNumber, sel.positionColumn);
        this._modelData.viewModel.setSelections(source, [selection]);
    }
    revealLines(startLineNumber, endLineNumber, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealLines(startLineNumber, endLineNumber, 0 /* VerticalRevealType.Simple */, scrollType);
    }
    revealLinesInCenter(startLineNumber, endLineNumber, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealLines(startLineNumber, endLineNumber, 1 /* VerticalRevealType.Center */, scrollType);
    }
    revealLinesInCenterIfOutsideViewport(startLineNumber, endLineNumber, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealLines(startLineNumber, endLineNumber, 2 /* VerticalRevealType.CenterIfOutsideViewport */, scrollType);
    }
    revealLinesNearTop(startLineNumber, endLineNumber, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealLines(startLineNumber, endLineNumber, 5 /* VerticalRevealType.NearTop */, scrollType);
    }
    _revealLines(startLineNumber, endLineNumber, verticalType, scrollType) {
        if (typeof startLineNumber !== 'number' || typeof endLineNumber !== 'number') {
            throw new Error('Invalid arguments');
        }
        this._sendRevealRange(new Range(startLineNumber, 1, endLineNumber, 1), verticalType, false, scrollType);
    }
    revealRange(range, scrollType = 0 /* editorCommon.ScrollType.Smooth */, revealVerticalInCenter = false, revealHorizontal = true) {
        this._revealRange(range, revealVerticalInCenter ? 1 /* VerticalRevealType.Center */ : 0 /* VerticalRevealType.Simple */, revealHorizontal, scrollType);
    }
    revealRangeInCenter(range, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealRange(range, 1 /* VerticalRevealType.Center */, true, scrollType);
    }
    revealRangeInCenterIfOutsideViewport(range, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealRange(range, 2 /* VerticalRevealType.CenterIfOutsideViewport */, true, scrollType);
    }
    revealRangeNearTop(range, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealRange(range, 5 /* VerticalRevealType.NearTop */, true, scrollType);
    }
    revealRangeNearTopIfOutsideViewport(range, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealRange(range, 6 /* VerticalRevealType.NearTopIfOutsideViewport */, true, scrollType);
    }
    revealRangeAtTop(range, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealRange(range, 3 /* VerticalRevealType.Top */, true, scrollType);
    }
    _revealRange(range, verticalType, revealHorizontal, scrollType) {
        if (!Range.isIRange(range)) {
            throw new Error('Invalid arguments');
        }
        this._sendRevealRange(Range.lift(range), verticalType, revealHorizontal, scrollType);
    }
    setSelections(ranges, source = 'api', reason = 0 /* CursorChangeReason.NotSet */) {
        if (!this._modelData) {
            return;
        }
        if (!ranges || ranges.length === 0) {
            throw new Error('Invalid arguments');
        }
        for (let i = 0, len = ranges.length; i < len; i++) {
            if (!Selection.isISelection(ranges[i])) {
                throw new Error('Invalid arguments');
            }
        }
        this._modelData.viewModel.setSelections(source, ranges, reason);
    }
    getContentWidth() {
        if (!this._modelData) {
            return -1;
        }
        return this._modelData.viewModel.viewLayout.getContentWidth();
    }
    getScrollWidth() {
        if (!this._modelData) {
            return -1;
        }
        return this._modelData.viewModel.viewLayout.getScrollWidth();
    }
    getScrollLeft() {
        if (!this._modelData) {
            return -1;
        }
        return this._modelData.viewModel.viewLayout.getCurrentScrollLeft();
    }
    getContentHeight() {
        if (!this._modelData) {
            return -1;
        }
        return this._modelData.viewModel.viewLayout.getContentHeight();
    }
    getScrollHeight() {
        if (!this._modelData) {
            return -1;
        }
        return this._modelData.viewModel.viewLayout.getScrollHeight();
    }
    getScrollTop() {
        if (!this._modelData) {
            return -1;
        }
        return this._modelData.viewModel.viewLayout.getCurrentScrollTop();
    }
    setScrollLeft(newScrollLeft, scrollType = 1 /* editorCommon.ScrollType.Immediate */) {
        if (!this._modelData) {
            return;
        }
        if (typeof newScrollLeft !== 'number') {
            throw new Error('Invalid arguments');
        }
        this._modelData.viewModel.viewLayout.setScrollPosition({
            scrollLeft: newScrollLeft
        }, scrollType);
    }
    setScrollTop(newScrollTop, scrollType = 1 /* editorCommon.ScrollType.Immediate */) {
        if (!this._modelData) {
            return;
        }
        if (typeof newScrollTop !== 'number') {
            throw new Error('Invalid arguments');
        }
        this._modelData.viewModel.viewLayout.setScrollPosition({
            scrollTop: newScrollTop
        }, scrollType);
    }
    setScrollPosition(position, scrollType = 1 /* editorCommon.ScrollType.Immediate */) {
        if (!this._modelData) {
            return;
        }
        this._modelData.viewModel.viewLayout.setScrollPosition(position, scrollType);
    }
    hasPendingScrollAnimation() {
        if (!this._modelData) {
            return false;
        }
        return this._modelData.viewModel.viewLayout.hasPendingScrollAnimation();
    }
    saveViewState() {
        if (!this._modelData) {
            return null;
        }
        const contributionsState = this._contributions.saveViewState();
        const cursorState = this._modelData.viewModel.saveCursorState();
        const viewState = this._modelData.viewModel.saveState();
        return {
            cursorState: cursorState,
            viewState: viewState,
            contributionsState: contributionsState
        };
    }
    restoreViewState(s) {
        if (!this._modelData || !this._modelData.hasRealView) {
            return;
        }
        const codeEditorState = s;
        if (codeEditorState && codeEditorState.cursorState && codeEditorState.viewState) {
            const cursorState = codeEditorState.cursorState;
            if (Array.isArray(cursorState)) {
                if (cursorState.length > 0) {
                    this._modelData.viewModel.restoreCursorState(cursorState);
                }
            }
            else {
                // Backwards compatibility
                this._modelData.viewModel.restoreCursorState([cursorState]);
            }
            this._contributions.restoreViewState(codeEditorState.contributionsState || {});
            const reducedState = this._modelData.viewModel.reduceRestoreState(codeEditorState.viewState);
            this._modelData.view.restoreState(reducedState);
        }
    }
    handleInitialized() {
        this._getViewModel()?.visibleLinesStabilized();
    }
    onVisible() {
        this._modelData?.view.refreshFocusState();
    }
    onHide() {
        this._modelData?.view.refreshFocusState();
    }
    getContribution(id) {
        return this._contributions.get(id);
    }
    getActions() {
        return Array.from(this._actions.values());
    }
    getSupportedActions() {
        let result = this.getActions();
        result = result.filter(action => action.isSupported());
        return result;
    }
    getAction(id) {
        return this._actions.get(id) || null;
    }
    trigger(source, handlerId, payload) {
        payload = payload || {};
        try {
            this._onWillTriggerEditorOperationEvent.fire({ source: source, handlerId: handlerId, payload: payload });
            this._beginUpdate();
            switch (handlerId) {
                case "compositionStart" /* editorCommon.Handler.CompositionStart */:
                    this._startComposition();
                    return;
                case "compositionEnd" /* editorCommon.Handler.CompositionEnd */:
                    this._endComposition(source);
                    return;
                case "type" /* editorCommon.Handler.Type */: {
                    const args = payload;
                    this._type(source, args.text || '');
                    return;
                }
                case "replacePreviousChar" /* editorCommon.Handler.ReplacePreviousChar */: {
                    const args = payload;
                    this._compositionType(source, args.text || '', args.replaceCharCnt || 0, 0, 0);
                    return;
                }
                case "compositionType" /* editorCommon.Handler.CompositionType */: {
                    const args = payload;
                    this._compositionType(source, args.text || '', args.replacePrevCharCnt || 0, args.replaceNextCharCnt || 0, args.positionDelta || 0);
                    return;
                }
                case "paste" /* editorCommon.Handler.Paste */: {
                    const args = payload;
                    this._paste(source, args.text || '', args.pasteOnNewLine || false, args.multicursorText || null, args.mode || null, args.clipboardEvent);
                    return;
                }
                case "cut" /* editorCommon.Handler.Cut */:
                    this._cut(source);
                    return;
            }
            const action = this.getAction(handlerId);
            if (action) {
                Promise.resolve(action.run(payload)).then(undefined, onUnexpectedError);
                return;
            }
            if (!this._modelData) {
                return;
            }
            if (this._triggerEditorCommand(source, handlerId, payload)) {
                return;
            }
            this._triggerCommand(handlerId, payload);
        }
        finally {
            this._endUpdate();
        }
    }
    _triggerCommand(handlerId, payload) {
        this._commandService.executeCommand(handlerId, payload);
    }
    _startComposition() {
        if (!this._modelData) {
            return;
        }
        this.inComposition = true;
        this._modelData.viewModel.startComposition();
        this._onDidCompositionStart.fire();
    }
    _endComposition(source) {
        if (!this._modelData) {
            return;
        }
        this.inComposition = false;
        this._modelData.viewModel.endComposition(source);
        this._onDidCompositionEnd.fire();
    }
    _type(source, text) {
        if (!this._modelData || text.length === 0) {
            return;
        }
        if (source === 'keyboard') {
            this._onWillType.fire(text);
        }
        this._modelData.viewModel.type(text, source);
        if (source === 'keyboard') {
            this._onDidType.fire(text);
        }
    }
    _compositionType(source, text, replacePrevCharCnt, replaceNextCharCnt, positionDelta) {
        if (!this._modelData) {
            return;
        }
        this._modelData.viewModel.compositionType(text, replacePrevCharCnt, replaceNextCharCnt, positionDelta, source);
    }
    _paste(source, text, pasteOnNewLine, multicursorText, mode, clipboardEvent) {
        if (!this._modelData) {
            return;
        }
        const viewModel = this._modelData.viewModel;
        const startPosition = viewModel.getSelection().getStartPosition();
        viewModel.paste(text, pasteOnNewLine, multicursorText, source);
        const endPosition = viewModel.getSelection().getStartPosition();
        if (source === 'keyboard') {
            this._onDidPaste.fire({
                clipboardEvent,
                range: new Range(startPosition.lineNumber, startPosition.column, endPosition.lineNumber, endPosition.column),
                languageId: mode
            });
        }
    }
    _cut(source) {
        if (!this._modelData) {
            return;
        }
        this._modelData.viewModel.cut(source);
    }
    _triggerEditorCommand(source, handlerId, payload) {
        const command = EditorExtensionsRegistry.getEditorCommand(handlerId);
        if (command) {
            payload = payload || {};
            payload.source = source;
            this._instantiationService.invokeFunction((accessor) => {
                Promise.resolve(command.runEditorCommand(accessor, this, payload)).then(undefined, onUnexpectedError);
            });
            return true;
        }
        return false;
    }
    _getViewModel() {
        if (!this._modelData) {
            return null;
        }
        return this._modelData.viewModel;
    }
    pushUndoStop() {
        if (!this._modelData) {
            return false;
        }
        if (this._configuration.options.get(96 /* EditorOption.readOnly */)) {
            // read only editor => sorry!
            return false;
        }
        this._modelData.model.pushStackElement();
        return true;
    }
    popUndoStop() {
        if (!this._modelData) {
            return false;
        }
        if (this._configuration.options.get(96 /* EditorOption.readOnly */)) {
            // read only editor => sorry!
            return false;
        }
        this._modelData.model.popStackElement();
        return true;
    }
    executeEdits(source, edits, endCursorState) {
        if (!this._modelData) {
            return false;
        }
        if (this._configuration.options.get(96 /* EditorOption.readOnly */)) {
            // read only editor => sorry!
            return false;
        }
        let cursorStateComputer;
        if (!endCursorState) {
            cursorStateComputer = () => null;
        }
        else if (Array.isArray(endCursorState)) {
            cursorStateComputer = () => endCursorState;
        }
        else {
            cursorStateComputer = endCursorState;
        }
        this._onBeforeExecuteEdit.fire({ source: source ?? undefined });
        this._modelData.viewModel.executeEdits(source, edits, cursorStateComputer);
        return true;
    }
    executeCommand(source, command) {
        if (!this._modelData) {
            return;
        }
        this._modelData.viewModel.executeCommand(command, source);
    }
    executeCommands(source, commands) {
        if (!this._modelData) {
            return;
        }
        this._modelData.viewModel.executeCommands(commands, source);
    }
    createDecorationsCollection(decorations) {
        return new EditorDecorationsCollection(this, decorations);
    }
    changeDecorations(callback) {
        if (!this._modelData) {
            // callback will not be called
            return null;
        }
        return this._modelData.model.changeDecorations(callback, this._id);
    }
    getLineDecorations(lineNumber) {
        if (!this._modelData) {
            return null;
        }
        return this._modelData.model.getLineDecorations(lineNumber, this._id, filterValidationDecorations(this._configuration.options));
    }
    getDecorationsInRange(range) {
        if (!this._modelData) {
            return null;
        }
        return this._modelData.model.getDecorationsInRange(range, this._id, filterValidationDecorations(this._configuration.options));
    }
    /**
     * @deprecated
     */
    deltaDecorations(oldDecorations, newDecorations) {
        if (!this._modelData) {
            return [];
        }
        if (oldDecorations.length === 0 && newDecorations.length === 0) {
            return oldDecorations;
        }
        return this._modelData.model.deltaDecorations(oldDecorations, newDecorations, this._id);
    }
    removeDecorations(decorationIds) {
        if (!this._modelData || decorationIds.length === 0) {
            return;
        }
        this._modelData.model.changeDecorations((changeAccessor) => {
            changeAccessor.deltaDecorations(decorationIds, []);
        });
    }
    setDecorationsByType(description, decorationTypeKey, decorationOptions) {
        const newDecorationsSubTypes = {};
        const oldDecorationsSubTypes = this._decorationTypeSubtypes[decorationTypeKey] || {};
        this._decorationTypeSubtypes[decorationTypeKey] = newDecorationsSubTypes;
        const newModelDecorations = [];
        for (const decorationOption of decorationOptions) {
            let typeKey = decorationTypeKey;
            if (decorationOption.renderOptions) {
                // identify custom render options by a hash code over all keys and values
                // For custom render options register a decoration type if necessary
                const subType = hash(decorationOption.renderOptions).toString(16);
                // The fact that `decorationTypeKey` appears in the typeKey has no influence
                // it is just a mechanism to get predictable and unique keys (repeatable for the same options and unique across clients)
                typeKey = decorationTypeKey + '-' + subType;
                if (!oldDecorationsSubTypes[subType] && !newDecorationsSubTypes[subType]) {
                    // decoration type did not exist before, register new one
                    this._registerDecorationType(description, typeKey, decorationOption.renderOptions, decorationTypeKey);
                }
                newDecorationsSubTypes[subType] = true;
            }
            const opts = this._resolveDecorationOptions(typeKey, !!decorationOption.hoverMessage);
            if (decorationOption.hoverMessage) {
                opts.hoverMessage = decorationOption.hoverMessage;
            }
            newModelDecorations.push({ range: decorationOption.range, options: opts });
        }
        // remove decoration sub types that are no longer used, deregister decoration type if necessary
        for (const subType in oldDecorationsSubTypes) {
            if (!newDecorationsSubTypes[subType]) {
                this._removeDecorationType(decorationTypeKey + '-' + subType);
            }
        }
        // update all decorations
        const oldDecorationsIds = this._decorationTypeKeysToIds[decorationTypeKey] || [];
        this.changeDecorations(accessor => this._decorationTypeKeysToIds[decorationTypeKey] = accessor.deltaDecorations(oldDecorationsIds, newModelDecorations));
    }
    setDecorationsByTypeFast(decorationTypeKey, ranges) {
        // remove decoration sub types that are no longer used, deregister decoration type if necessary
        const oldDecorationsSubTypes = this._decorationTypeSubtypes[decorationTypeKey] || {};
        for (const subType in oldDecorationsSubTypes) {
            this._removeDecorationType(decorationTypeKey + '-' + subType);
        }
        this._decorationTypeSubtypes[decorationTypeKey] = {};
        const opts = ModelDecorationOptions.createDynamic(this._resolveDecorationOptions(decorationTypeKey, false));
        const newModelDecorations = new Array(ranges.length);
        for (let i = 0, len = ranges.length; i < len; i++) {
            newModelDecorations[i] = { range: ranges[i], options: opts };
        }
        // update all decorations
        const oldDecorationsIds = this._decorationTypeKeysToIds[decorationTypeKey] || [];
        this.changeDecorations(accessor => this._decorationTypeKeysToIds[decorationTypeKey] = accessor.deltaDecorations(oldDecorationsIds, newModelDecorations));
    }
    removeDecorationsByType(decorationTypeKey) {
        // remove decorations for type and sub type
        const oldDecorationsIds = this._decorationTypeKeysToIds[decorationTypeKey];
        if (oldDecorationsIds) {
            this.changeDecorations(accessor => accessor.deltaDecorations(oldDecorationsIds, []));
        }
        if (this._decorationTypeKeysToIds.hasOwnProperty(decorationTypeKey)) {
            delete this._decorationTypeKeysToIds[decorationTypeKey];
        }
        if (this._decorationTypeSubtypes.hasOwnProperty(decorationTypeKey)) {
            delete this._decorationTypeSubtypes[decorationTypeKey];
        }
    }
    getLayoutInfo() {
        const options = this._configuration.options;
        const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
        return layoutInfo;
    }
    createOverviewRuler(cssClassName) {
        if (!this._modelData || !this._modelData.hasRealView) {
            return null;
        }
        return this._modelData.view.createOverviewRuler(cssClassName);
    }
    getContainerDomNode() {
        return this._domElement;
    }
    getDomNode() {
        if (!this._modelData || !this._modelData.hasRealView) {
            return null;
        }
        return this._modelData.view.domNode.domNode;
    }
    delegateVerticalScrollbarPointerDown(browserEvent) {
        if (!this._modelData || !this._modelData.hasRealView) {
            return;
        }
        this._modelData.view.delegateVerticalScrollbarPointerDown(browserEvent);
    }
    delegateScrollFromMouseWheelEvent(browserEvent) {
        if (!this._modelData || !this._modelData.hasRealView) {
            return;
        }
        this._modelData.view.delegateScrollFromMouseWheelEvent(browserEvent);
    }
    layout(dimension, postponeRendering = false) {
        this._configuration.observeContainer(dimension);
        if (!postponeRendering) {
            this.render();
        }
    }
    focus() {
        if (!this._modelData || !this._modelData.hasRealView) {
            return;
        }
        this._modelData.view.focus();
    }
    hasTextFocus() {
        if (!this._modelData || !this._modelData.hasRealView) {
            return false;
        }
        return this._modelData.view.isFocused();
    }
    hasWidgetFocus() {
        if (!this._modelData || !this._modelData.hasRealView) {
            return false;
        }
        return this._modelData.view.isWidgetFocused();
    }
    addContentWidget(widget) {
        const widgetData = {
            widget: widget,
            position: widget.getPosition()
        };
        if (this._contentWidgets.hasOwnProperty(widget.getId())) {
            console.warn('Overwriting a content widget with the same id:' + widget.getId());
        }
        this._contentWidgets[widget.getId()] = widgetData;
        if (this._modelData && this._modelData.hasRealView) {
            this._modelData.view.addContentWidget(widgetData);
        }
    }
    layoutContentWidget(widget) {
        const widgetId = widget.getId();
        if (this._contentWidgets.hasOwnProperty(widgetId)) {
            const widgetData = this._contentWidgets[widgetId];
            widgetData.position = widget.getPosition();
            if (this._modelData && this._modelData.hasRealView) {
                this._modelData.view.layoutContentWidget(widgetData);
            }
        }
    }
    removeContentWidget(widget) {
        const widgetId = widget.getId();
        if (this._contentWidgets.hasOwnProperty(widgetId)) {
            const widgetData = this._contentWidgets[widgetId];
            delete this._contentWidgets[widgetId];
            if (this._modelData && this._modelData.hasRealView) {
                this._modelData.view.removeContentWidget(widgetData);
            }
        }
    }
    addOverlayWidget(widget) {
        const widgetData = {
            widget: widget,
            position: widget.getPosition()
        };
        if (this._overlayWidgets.hasOwnProperty(widget.getId())) {
            console.warn('Overwriting an overlay widget with the same id.');
        }
        this._overlayWidgets[widget.getId()] = widgetData;
        if (this._modelData && this._modelData.hasRealView) {
            this._modelData.view.addOverlayWidget(widgetData);
        }
    }
    layoutOverlayWidget(widget) {
        const widgetId = widget.getId();
        if (this._overlayWidgets.hasOwnProperty(widgetId)) {
            const widgetData = this._overlayWidgets[widgetId];
            widgetData.position = widget.getPosition();
            if (this._modelData && this._modelData.hasRealView) {
                this._modelData.view.layoutOverlayWidget(widgetData);
            }
        }
    }
    removeOverlayWidget(widget) {
        const widgetId = widget.getId();
        if (this._overlayWidgets.hasOwnProperty(widgetId)) {
            const widgetData = this._overlayWidgets[widgetId];
            delete this._overlayWidgets[widgetId];
            if (this._modelData && this._modelData.hasRealView) {
                this._modelData.view.removeOverlayWidget(widgetData);
            }
        }
    }
    addGlyphMarginWidget(widget) {
        const widgetData = {
            widget: widget,
            position: widget.getPosition()
        };
        if (this._glyphMarginWidgets.hasOwnProperty(widget.getId())) {
            console.warn('Overwriting a glyph margin widget with the same id.');
        }
        this._glyphMarginWidgets[widget.getId()] = widgetData;
        if (this._modelData && this._modelData.hasRealView) {
            this._modelData.view.addGlyphMarginWidget(widgetData);
        }
    }
    layoutGlyphMarginWidget(widget) {
        const widgetId = widget.getId();
        if (this._glyphMarginWidgets.hasOwnProperty(widgetId)) {
            const widgetData = this._glyphMarginWidgets[widgetId];
            widgetData.position = widget.getPosition();
            if (this._modelData && this._modelData.hasRealView) {
                this._modelData.view.layoutGlyphMarginWidget(widgetData);
            }
        }
    }
    removeGlyphMarginWidget(widget) {
        const widgetId = widget.getId();
        if (this._glyphMarginWidgets.hasOwnProperty(widgetId)) {
            const widgetData = this._glyphMarginWidgets[widgetId];
            delete this._glyphMarginWidgets[widgetId];
            if (this._modelData && this._modelData.hasRealView) {
                this._modelData.view.removeGlyphMarginWidget(widgetData);
            }
        }
    }
    changeViewZones(callback) {
        if (!this._modelData || !this._modelData.hasRealView) {
            return;
        }
        this._modelData.view.change(callback);
    }
    getTargetAtClientPoint(clientX, clientY) {
        if (!this._modelData || !this._modelData.hasRealView) {
            return null;
        }
        return this._modelData.view.getTargetAtClientPoint(clientX, clientY);
    }
    getScrolledVisiblePosition(rawPosition) {
        if (!this._modelData || !this._modelData.hasRealView) {
            return null;
        }
        const position = this._modelData.model.validatePosition(rawPosition);
        const options = this._configuration.options;
        const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
        const top = CodeEditorWidget_1._getVerticalOffsetForPosition(this._modelData, position.lineNumber, position.column) - this.getScrollTop();
        const left = this._modelData.view.getOffsetForColumn(position.lineNumber, position.column) + layoutInfo.glyphMarginWidth + layoutInfo.lineNumbersWidth + layoutInfo.decorationsWidth - this.getScrollLeft();
        return {
            top: top,
            left: left,
            height: options.get(68 /* EditorOption.lineHeight */)
        };
    }
    getOffsetForColumn(lineNumber, column) {
        if (!this._modelData || !this._modelData.hasRealView) {
            return -1;
        }
        return this._modelData.view.getOffsetForColumn(lineNumber, column);
    }
    render(forceRedraw = false) {
        if (!this._modelData || !this._modelData.hasRealView) {
            return;
        }
        this._modelData.viewModel.batchEvents(() => {
            this._modelData.view.render(true, forceRedraw);
        });
    }
    setAriaOptions(options) {
        if (!this._modelData || !this._modelData.hasRealView) {
            return;
        }
        this._modelData.view.setAriaOptions(options);
    }
    applyFontInfo(target) {
        applyFontInfo(target, this._configuration.options.get(52 /* EditorOption.fontInfo */));
    }
    setBanner(domNode, domNodeHeight) {
        if (this._bannerDomNode && this._domElement.contains(this._bannerDomNode)) {
            this._bannerDomNode.remove();
        }
        this._bannerDomNode = domNode;
        this._configuration.setReservedHeight(domNode ? domNodeHeight : 0);
        if (this._bannerDomNode) {
            this._domElement.prepend(this._bannerDomNode);
        }
    }
    _attachModel(model) {
        if (!model) {
            this._modelData = null;
            return;
        }
        const listenersToRemove = [];
        this._domElement.setAttribute('data-mode-id', model.getLanguageId());
        this._configuration.setIsDominatedByLongLines(model.isDominatedByLongLines());
        this._configuration.setModelLineCount(model.getLineCount());
        const attachedView = model.onBeforeAttached();
        const viewModel = new ViewModel(this._id, this._configuration, model, DOMLineBreaksComputerFactory.create(dom.getWindow(this._domElement)), MonospaceLineBreaksComputerFactory.create(this._configuration.options), (callback) => dom.scheduleAtNextAnimationFrame(dom.getWindow(this._domElement), callback), this.languageConfigurationService, this._themeService, attachedView, {
            batchChanges: (cb) => {
                try {
                    this._beginUpdate();
                    return cb();
                }
                finally {
                    this._endUpdate();
                }
            },
        });
        // Someone might destroy the model from under the editor, so prevent any exceptions by setting a null model
        listenersToRemove.push(model.onWillDispose(() => this.setModel(null)));
        listenersToRemove.push(viewModel.onEvent((e) => {
            switch (e.kind) {
                case 0 /* OutgoingViewModelEventKind.ContentSizeChanged */:
                    this._onDidContentSizeChange.fire(e);
                    break;
                case 1 /* OutgoingViewModelEventKind.FocusChanged */:
                    this._editorTextFocus.setValue(e.hasFocus);
                    break;
                case 2 /* OutgoingViewModelEventKind.WidgetFocusChanged */:
                    this._editorWidgetFocus.setValue(e.hasFocus);
                    break;
                case 3 /* OutgoingViewModelEventKind.ScrollChanged */:
                    this._onDidScrollChange.fire(e);
                    break;
                case 4 /* OutgoingViewModelEventKind.ViewZonesChanged */:
                    this._onDidChangeViewZones.fire();
                    break;
                case 5 /* OutgoingViewModelEventKind.HiddenAreasChanged */:
                    this._onDidChangeHiddenAreas.fire();
                    break;
                case 6 /* OutgoingViewModelEventKind.ReadOnlyEditAttempt */:
                    this._onDidAttemptReadOnlyEdit.fire();
                    break;
                case 7 /* OutgoingViewModelEventKind.CursorStateChanged */: {
                    if (e.reachedMaxCursorCount) {
                        const multiCursorLimit = this.getOption(81 /* EditorOption.multiCursorLimit */);
                        const message = nls.localize('cursors.maximum', "The number of cursors has been limited to {0}. Consider using [find and replace](https://code.visualstudio.com/docs/editor/codebasics#_find-and-replace) for larger changes or increase the editor multi cursor limit setting.", multiCursorLimit);
                        this._notificationService.prompt(Severity.Warning, message, [
                            {
                                label: 'Find and Replace',
                                run: () => {
                                    this._commandService.executeCommand('editor.action.startFindReplaceAction');
                                }
                            },
                            {
                                label: nls.localize('goToSetting', 'Increase Multi Cursor Limit'),
                                run: () => {
                                    this._commandService.executeCommand('workbench.action.openSettings2', {
                                        query: 'editor.multiCursorLimit'
                                    });
                                }
                            }
                        ]);
                    }
                    const positions = [];
                    for (let i = 0, len = e.selections.length; i < len; i++) {
                        positions[i] = e.selections[i].getPosition();
                    }
                    const e1 = {
                        position: positions[0],
                        secondaryPositions: positions.slice(1),
                        reason: e.reason,
                        source: e.source
                    };
                    this._onDidChangeCursorPosition.fire(e1);
                    const e2 = {
                        selection: e.selections[0],
                        secondarySelections: e.selections.slice(1),
                        modelVersionId: e.modelVersionId,
                        oldSelections: e.oldSelections,
                        oldModelVersionId: e.oldModelVersionId,
                        source: e.source,
                        reason: e.reason
                    };
                    this._onDidChangeCursorSelection.fire(e2);
                    break;
                }
                case 8 /* OutgoingViewModelEventKind.ModelDecorationsChanged */:
                    this._onDidChangeModelDecorations.fire(e.event);
                    break;
                case 9 /* OutgoingViewModelEventKind.ModelLanguageChanged */:
                    this._domElement.setAttribute('data-mode-id', model.getLanguageId());
                    this._onDidChangeModelLanguage.fire(e.event);
                    break;
                case 10 /* OutgoingViewModelEventKind.ModelLanguageConfigurationChanged */:
                    this._onDidChangeModelLanguageConfiguration.fire(e.event);
                    break;
                case 11 /* OutgoingViewModelEventKind.ModelContentChanged */:
                    this._onDidChangeModelContent.fire(e.event);
                    break;
                case 12 /* OutgoingViewModelEventKind.ModelOptionsChanged */:
                    this._onDidChangeModelOptions.fire(e.event);
                    break;
                case 13 /* OutgoingViewModelEventKind.ModelTokensChanged */:
                    this._onDidChangeModelTokens.fire(e.event);
                    break;
            }
        }));
        const [view, hasRealView] = this._createView(viewModel);
        if (hasRealView) {
            this._domElement.appendChild(view.domNode.domNode);
            let keys = Object.keys(this._contentWidgets);
            for (let i = 0, len = keys.length; i < len; i++) {
                const widgetId = keys[i];
                view.addContentWidget(this._contentWidgets[widgetId]);
            }
            keys = Object.keys(this._overlayWidgets);
            for (let i = 0, len = keys.length; i < len; i++) {
                const widgetId = keys[i];
                view.addOverlayWidget(this._overlayWidgets[widgetId]);
            }
            keys = Object.keys(this._glyphMarginWidgets);
            for (let i = 0, len = keys.length; i < len; i++) {
                const widgetId = keys[i];
                view.addGlyphMarginWidget(this._glyphMarginWidgets[widgetId]);
            }
            view.render(false, true);
            view.domNode.domNode.setAttribute('data-uri', model.uri.toString());
        }
        this._modelData = new ModelData(model, viewModel, view, hasRealView, listenersToRemove, attachedView);
    }
    _createView(viewModel) {
        let commandDelegate;
        if (this.isSimpleWidget) {
            commandDelegate = {
                paste: (text, pasteOnNewLine, multicursorText, mode) => {
                    this._paste('keyboard', text, pasteOnNewLine, multicursorText, mode);
                },
                type: (text) => {
                    this._type('keyboard', text);
                },
                compositionType: (text, replacePrevCharCnt, replaceNextCharCnt, positionDelta) => {
                    this._compositionType('keyboard', text, replacePrevCharCnt, replaceNextCharCnt, positionDelta);
                },
                startComposition: () => {
                    this._startComposition();
                },
                endComposition: () => {
                    this._endComposition('keyboard');
                },
                cut: () => {
                    this._cut('keyboard');
                }
            };
        }
        else {
            commandDelegate = {
                paste: (text, pasteOnNewLine, multicursorText, mode) => {
                    const payload = { text, pasteOnNewLine, multicursorText, mode };
                    this._commandService.executeCommand("paste" /* editorCommon.Handler.Paste */, payload);
                },
                type: (text) => {
                    const payload = { text };
                    this._commandService.executeCommand("type" /* editorCommon.Handler.Type */, payload);
                },
                compositionType: (text, replacePrevCharCnt, replaceNextCharCnt, positionDelta) => {
                    // Try if possible to go through the existing `replacePreviousChar` command
                    if (replaceNextCharCnt || positionDelta) {
                        // must be handled through the new command
                        const payload = { text, replacePrevCharCnt, replaceNextCharCnt, positionDelta };
                        this._commandService.executeCommand("compositionType" /* editorCommon.Handler.CompositionType */, payload);
                    }
                    else {
                        const payload = { text, replaceCharCnt: replacePrevCharCnt };
                        this._commandService.executeCommand("replacePreviousChar" /* editorCommon.Handler.ReplacePreviousChar */, payload);
                    }
                },
                startComposition: () => {
                    this._commandService.executeCommand("compositionStart" /* editorCommon.Handler.CompositionStart */, {});
                },
                endComposition: () => {
                    this._commandService.executeCommand("compositionEnd" /* editorCommon.Handler.CompositionEnd */, {});
                },
                cut: () => {
                    this._commandService.executeCommand("cut" /* editorCommon.Handler.Cut */, {});
                }
            };
        }
        const viewUserInputEvents = new ViewUserInputEvents(viewModel.coordinatesConverter);
        viewUserInputEvents.onKeyDown = (e) => this._onKeyDown.fire(e);
        viewUserInputEvents.onKeyUp = (e) => this._onKeyUp.fire(e);
        viewUserInputEvents.onContextMenu = (e) => this._onContextMenu.fire(e);
        viewUserInputEvents.onMouseMove = (e) => this._onMouseMove.fire(e);
        viewUserInputEvents.onMouseLeave = (e) => this._onMouseLeave.fire(e);
        viewUserInputEvents.onMouseDown = (e) => this._onMouseDown.fire(e);
        viewUserInputEvents.onMouseUp = (e) => this._onMouseUp.fire(e);
        viewUserInputEvents.onMouseDrag = (e) => this._onMouseDrag.fire(e);
        viewUserInputEvents.onMouseDrop = (e) => this._onMouseDrop.fire(e);
        viewUserInputEvents.onMouseDropCanceled = (e) => this._onMouseDropCanceled.fire(e);
        viewUserInputEvents.onMouseWheel = (e) => this._onMouseWheel.fire(e);
        const view = new View(this._domElement, this.getId(), commandDelegate, this._configuration, this._themeService.getColorTheme(), viewModel, viewUserInputEvents, this._overflowWidgetsDomNode, this._instantiationService);
        return [view, true];
    }
    _postDetachModelCleanup(detachedModel) {
        detachedModel?.removeAllDecorationsWithOwnerId(this._id);
    }
    _detachModel() {
        this._contributionsDisposable?.dispose();
        this._contributionsDisposable = undefined;
        if (!this._modelData) {
            return null;
        }
        const model = this._modelData.model;
        const removeDomNode = this._modelData.hasRealView ? this._modelData.view.domNode.domNode : null;
        this._modelData.dispose();
        this._modelData = null;
        this._domElement.removeAttribute('data-mode-id');
        if (removeDomNode && this._domElement.contains(removeDomNode)) {
            removeDomNode.remove();
        }
        if (this._bannerDomNode && this._domElement.contains(this._bannerDomNode)) {
            this._bannerDomNode.remove();
        }
        return model;
    }
    _registerDecorationType(description, key, options, parentTypeKey) {
        this._codeEditorService.registerDecorationType(description, key, options, parentTypeKey, this);
    }
    _removeDecorationType(key) {
        this._codeEditorService.removeDecorationType(key);
    }
    _resolveDecorationOptions(typeKey, writable) {
        return this._codeEditorService.resolveDecorationOptions(typeKey, writable);
    }
    getTelemetryData() {
        return this._telemetryData;
    }
    hasModel() {
        return (this._modelData !== null);
    }
    showDropIndicatorAt(position) {
        const newDecorations = [{
                range: new Range(position.lineNumber, position.column, position.lineNumber, position.column),
                options: CodeEditorWidget_1.dropIntoEditorDecorationOptions
            }];
        this._dropIntoEditorDecorations.set(newDecorations);
        this.revealPosition(position, 1 /* editorCommon.ScrollType.Immediate */);
    }
    removeDropIndicator() {
        this._dropIntoEditorDecorations.clear();
    }
    setContextValue(key, value) {
        this._contextKeyService.createKey(key, value);
    }
    _beginUpdate() {
        this._updateCounter++;
        if (this._updateCounter === 1) {
            this._onBeginUpdate.fire();
        }
    }
    _endUpdate() {
        this._updateCounter--;
        if (this._updateCounter === 0) {
            this._onEndUpdate.fire();
        }
    }
};
CodeEditorWidget = CodeEditorWidget_1 = __decorate([
    __param(3, IInstantiationService),
    __param(4, ICodeEditorService),
    __param(5, ICommandService),
    __param(6, IContextKeyService),
    __param(7, IThemeService),
    __param(8, INotificationService),
    __param(9, IAccessibilityService),
    __param(10, ILanguageConfigurationService),
    __param(11, ILanguageFeaturesService)
], CodeEditorWidget);
export { CodeEditorWidget };
let EDITOR_ID = 0;
class ModelData {
    constructor(model, viewModel, view, hasRealView, listenersToRemove, attachedView) {
        this.model = model;
        this.viewModel = viewModel;
        this.view = view;
        this.hasRealView = hasRealView;
        this.listenersToRemove = listenersToRemove;
        this.attachedView = attachedView;
    }
    dispose() {
        dispose(this.listenersToRemove);
        this.model.onBeforeDetached(this.attachedView);
        if (this.hasRealView) {
            this.view.dispose();
        }
        this.viewModel.dispose();
    }
}
var BooleanEventValue;
(function (BooleanEventValue) {
    BooleanEventValue[BooleanEventValue["NotSet"] = 0] = "NotSet";
    BooleanEventValue[BooleanEventValue["False"] = 1] = "False";
    BooleanEventValue[BooleanEventValue["True"] = 2] = "True";
})(BooleanEventValue || (BooleanEventValue = {}));
export class BooleanEventEmitter extends Disposable {
    constructor(_emitterOptions) {
        super();
        this._emitterOptions = _emitterOptions;
        this._onDidChangeToTrue = this._register(new Emitter(this._emitterOptions));
        this.onDidChangeToTrue = this._onDidChangeToTrue.event;
        this._onDidChangeToFalse = this._register(new Emitter(this._emitterOptions));
        this.onDidChangeToFalse = this._onDidChangeToFalse.event;
        this._value = 0 /* BooleanEventValue.NotSet */;
    }
    setValue(_value) {
        const value = (_value ? 2 /* BooleanEventValue.True */ : 1 /* BooleanEventValue.False */);
        if (this._value === value) {
            return;
        }
        this._value = value;
        if (this._value === 2 /* BooleanEventValue.True */) {
            this._onDidChangeToTrue.fire();
        }
        else if (this._value === 1 /* BooleanEventValue.False */) {
            this._onDidChangeToFalse.fire();
        }
    }
}
/**
 * A regular event emitter that also makes sure contributions are instantiated if necessary
 */
class InteractionEmitter extends Emitter {
    constructor(_contributions, deliveryQueue) {
        super({ deliveryQueue });
        this._contributions = _contributions;
    }
    fire(event) {
        this._contributions.onBeforeInteractionEvent();
        super.fire(event);
    }
}
class EditorContextKeysManager extends Disposable {
    constructor(editor, contextKeyService) {
        super();
        this._editor = editor;
        contextKeyService.createKey('editorId', editor.getId());
        this._editorSimpleInput = EditorContextKeys.editorSimpleInput.bindTo(contextKeyService);
        this._editorFocus = EditorContextKeys.focus.bindTo(contextKeyService);
        this._textInputFocus = EditorContextKeys.textInputFocus.bindTo(contextKeyService);
        this._editorTextFocus = EditorContextKeys.editorTextFocus.bindTo(contextKeyService);
        this._tabMovesFocus = EditorContextKeys.tabMovesFocus.bindTo(contextKeyService);
        this._editorReadonly = EditorContextKeys.readOnly.bindTo(contextKeyService);
        this._inDiffEditor = EditorContextKeys.inDiffEditor.bindTo(contextKeyService);
        this._editorColumnSelection = EditorContextKeys.columnSelection.bindTo(contextKeyService);
        this._hasMultipleSelections = EditorContextKeys.hasMultipleSelections.bindTo(contextKeyService);
        this._hasNonEmptySelection = EditorContextKeys.hasNonEmptySelection.bindTo(contextKeyService);
        this._canUndo = EditorContextKeys.canUndo.bindTo(contextKeyService);
        this._canRedo = EditorContextKeys.canRedo.bindTo(contextKeyService);
        this._register(this._editor.onDidChangeConfiguration(() => this._updateFromConfig()));
        this._register(this._editor.onDidChangeCursorSelection(() => this._updateFromSelection()));
        this._register(this._editor.onDidFocusEditorWidget(() => this._updateFromFocus()));
        this._register(this._editor.onDidBlurEditorWidget(() => this._updateFromFocus()));
        this._register(this._editor.onDidFocusEditorText(() => this._updateFromFocus()));
        this._register(this._editor.onDidBlurEditorText(() => this._updateFromFocus()));
        this._register(this._editor.onDidChangeModel(() => this._updateFromModel()));
        this._register(this._editor.onDidChangeConfiguration(() => this._updateFromModel()));
        this._register(TabFocus.onDidChangeTabFocus((tabFocusMode) => this._tabMovesFocus.set(tabFocusMode)));
        this._updateFromConfig();
        this._updateFromSelection();
        this._updateFromFocus();
        this._updateFromModel();
        this._editorSimpleInput.set(this._editor.isSimpleWidget);
    }
    _updateFromConfig() {
        const options = this._editor.getOptions();
        this._tabMovesFocus.set(TabFocus.getTabFocusMode());
        this._editorReadonly.set(options.get(96 /* EditorOption.readOnly */));
        this._inDiffEditor.set(options.get(63 /* EditorOption.inDiffEditor */));
        this._editorColumnSelection.set(options.get(22 /* EditorOption.columnSelection */));
    }
    _updateFromSelection() {
        const selections = this._editor.getSelections();
        if (!selections) {
            this._hasMultipleSelections.reset();
            this._hasNonEmptySelection.reset();
        }
        else {
            this._hasMultipleSelections.set(selections.length > 1);
            this._hasNonEmptySelection.set(selections.some(s => !s.isEmpty()));
        }
    }
    _updateFromFocus() {
        this._editorFocus.set(this._editor.hasWidgetFocus() && !this._editor.isSimpleWidget);
        this._editorTextFocus.set(this._editor.hasTextFocus() && !this._editor.isSimpleWidget);
        this._textInputFocus.set(this._editor.hasTextFocus());
    }
    _updateFromModel() {
        const model = this._editor.getModel();
        this._canUndo.set(Boolean(model && model.canUndo()));
        this._canRedo.set(Boolean(model && model.canRedo()));
    }
}
export class EditorModeContext extends Disposable {
    constructor(_editor, _contextKeyService, _languageFeaturesService) {
        super();
        this._editor = _editor;
        this._contextKeyService = _contextKeyService;
        this._languageFeaturesService = _languageFeaturesService;
        this._langId = EditorContextKeys.languageId.bindTo(_contextKeyService);
        this._hasCompletionItemProvider = EditorContextKeys.hasCompletionItemProvider.bindTo(_contextKeyService);
        this._hasCodeActionsProvider = EditorContextKeys.hasCodeActionsProvider.bindTo(_contextKeyService);
        this._hasCodeLensProvider = EditorContextKeys.hasCodeLensProvider.bindTo(_contextKeyService);
        this._hasDefinitionProvider = EditorContextKeys.hasDefinitionProvider.bindTo(_contextKeyService);
        this._hasDeclarationProvider = EditorContextKeys.hasDeclarationProvider.bindTo(_contextKeyService);
        this._hasImplementationProvider = EditorContextKeys.hasImplementationProvider.bindTo(_contextKeyService);
        this._hasTypeDefinitionProvider = EditorContextKeys.hasTypeDefinitionProvider.bindTo(_contextKeyService);
        this._hasHoverProvider = EditorContextKeys.hasHoverProvider.bindTo(_contextKeyService);
        this._hasDocumentHighlightProvider = EditorContextKeys.hasDocumentHighlightProvider.bindTo(_contextKeyService);
        this._hasDocumentSymbolProvider = EditorContextKeys.hasDocumentSymbolProvider.bindTo(_contextKeyService);
        this._hasReferenceProvider = EditorContextKeys.hasReferenceProvider.bindTo(_contextKeyService);
        this._hasRenameProvider = EditorContextKeys.hasRenameProvider.bindTo(_contextKeyService);
        this._hasSignatureHelpProvider = EditorContextKeys.hasSignatureHelpProvider.bindTo(_contextKeyService);
        this._hasInlayHintsProvider = EditorContextKeys.hasInlayHintsProvider.bindTo(_contextKeyService);
        this._hasDocumentFormattingProvider = EditorContextKeys.hasDocumentFormattingProvider.bindTo(_contextKeyService);
        this._hasDocumentSelectionFormattingProvider = EditorContextKeys.hasDocumentSelectionFormattingProvider.bindTo(_contextKeyService);
        this._hasMultipleDocumentFormattingProvider = EditorContextKeys.hasMultipleDocumentFormattingProvider.bindTo(_contextKeyService);
        this._hasMultipleDocumentSelectionFormattingProvider = EditorContextKeys.hasMultipleDocumentSelectionFormattingProvider.bindTo(_contextKeyService);
        this._isInEmbeddedEditor = EditorContextKeys.isInEmbeddedEditor.bindTo(_contextKeyService);
        const update = () => this._update();
        // update when model/mode changes
        this._register(_editor.onDidChangeModel(update));
        this._register(_editor.onDidChangeModelLanguage(update));
        // update when registries change
        this._register(_languageFeaturesService.completionProvider.onDidChange(update));
        this._register(_languageFeaturesService.codeActionProvider.onDidChange(update));
        this._register(_languageFeaturesService.codeLensProvider.onDidChange(update));
        this._register(_languageFeaturesService.definitionProvider.onDidChange(update));
        this._register(_languageFeaturesService.declarationProvider.onDidChange(update));
        this._register(_languageFeaturesService.implementationProvider.onDidChange(update));
        this._register(_languageFeaturesService.typeDefinitionProvider.onDidChange(update));
        this._register(_languageFeaturesService.hoverProvider.onDidChange(update));
        this._register(_languageFeaturesService.documentHighlightProvider.onDidChange(update));
        this._register(_languageFeaturesService.documentSymbolProvider.onDidChange(update));
        this._register(_languageFeaturesService.referenceProvider.onDidChange(update));
        this._register(_languageFeaturesService.renameProvider.onDidChange(update));
        this._register(_languageFeaturesService.documentFormattingEditProvider.onDidChange(update));
        this._register(_languageFeaturesService.documentRangeFormattingEditProvider.onDidChange(update));
        this._register(_languageFeaturesService.signatureHelpProvider.onDidChange(update));
        this._register(_languageFeaturesService.inlayHintsProvider.onDidChange(update));
        update();
    }
    dispose() {
        super.dispose();
    }
    reset() {
        this._contextKeyService.bufferChangeEvents(() => {
            this._langId.reset();
            this._hasCompletionItemProvider.reset();
            this._hasCodeActionsProvider.reset();
            this._hasCodeLensProvider.reset();
            this._hasDefinitionProvider.reset();
            this._hasDeclarationProvider.reset();
            this._hasImplementationProvider.reset();
            this._hasTypeDefinitionProvider.reset();
            this._hasHoverProvider.reset();
            this._hasDocumentHighlightProvider.reset();
            this._hasDocumentSymbolProvider.reset();
            this._hasReferenceProvider.reset();
            this._hasRenameProvider.reset();
            this._hasDocumentFormattingProvider.reset();
            this._hasDocumentSelectionFormattingProvider.reset();
            this._hasSignatureHelpProvider.reset();
            this._isInEmbeddedEditor.reset();
        });
    }
    _update() {
        const model = this._editor.getModel();
        if (!model) {
            this.reset();
            return;
        }
        this._contextKeyService.bufferChangeEvents(() => {
            this._langId.set(model.getLanguageId());
            this._hasCompletionItemProvider.set(this._languageFeaturesService.completionProvider.has(model));
            this._hasCodeActionsProvider.set(this._languageFeaturesService.codeActionProvider.has(model));
            this._hasCodeLensProvider.set(this._languageFeaturesService.codeLensProvider.has(model));
            this._hasDefinitionProvider.set(this._languageFeaturesService.definitionProvider.has(model));
            this._hasDeclarationProvider.set(this._languageFeaturesService.declarationProvider.has(model));
            this._hasImplementationProvider.set(this._languageFeaturesService.implementationProvider.has(model));
            this._hasTypeDefinitionProvider.set(this._languageFeaturesService.typeDefinitionProvider.has(model));
            this._hasHoverProvider.set(this._languageFeaturesService.hoverProvider.has(model));
            this._hasDocumentHighlightProvider.set(this._languageFeaturesService.documentHighlightProvider.has(model));
            this._hasDocumentSymbolProvider.set(this._languageFeaturesService.documentSymbolProvider.has(model));
            this._hasReferenceProvider.set(this._languageFeaturesService.referenceProvider.has(model));
            this._hasRenameProvider.set(this._languageFeaturesService.renameProvider.has(model));
            this._hasSignatureHelpProvider.set(this._languageFeaturesService.signatureHelpProvider.has(model));
            this._hasInlayHintsProvider.set(this._languageFeaturesService.inlayHintsProvider.has(model));
            this._hasDocumentFormattingProvider.set(this._languageFeaturesService.documentFormattingEditProvider.has(model) || this._languageFeaturesService.documentRangeFormattingEditProvider.has(model));
            this._hasDocumentSelectionFormattingProvider.set(this._languageFeaturesService.documentRangeFormattingEditProvider.has(model));
            this._hasMultipleDocumentFormattingProvider.set(this._languageFeaturesService.documentFormattingEditProvider.all(model).length + this._languageFeaturesService.documentRangeFormattingEditProvider.all(model).length > 1);
            this._hasMultipleDocumentSelectionFormattingProvider.set(this._languageFeaturesService.documentRangeFormattingEditProvider.all(model).length > 1);
            this._isInEmbeddedEditor.set(model.uri.scheme === Schemas.walkThroughSnippet || model.uri.scheme === Schemas.vscodeChatCodeBlock);
        });
    }
}
class EditorDecorationsCollection {
    get length() {
        return this._decorationIds.length;
    }
    constructor(_editor, decorations) {
        this._editor = _editor;
        this._decorationIds = [];
        this._isChangingDecorations = false;
        if (Array.isArray(decorations) && decorations.length > 0) {
            this.set(decorations);
        }
    }
    onDidChange(listener, thisArgs, disposables) {
        return this._editor.onDidChangeModelDecorations((e) => {
            if (this._isChangingDecorations) {
                return;
            }
            listener.call(thisArgs, e);
        }, disposables);
    }
    getRange(index) {
        if (!this._editor.hasModel()) {
            return null;
        }
        if (index >= this._decorationIds.length) {
            return null;
        }
        return this._editor.getModel().getDecorationRange(this._decorationIds[index]);
    }
    getRanges() {
        if (!this._editor.hasModel()) {
            return [];
        }
        const model = this._editor.getModel();
        const result = [];
        for (const decorationId of this._decorationIds) {
            const range = model.getDecorationRange(decorationId);
            if (range) {
                result.push(range);
            }
        }
        return result;
    }
    has(decoration) {
        return this._decorationIds.includes(decoration.id);
    }
    clear() {
        if (this._decorationIds.length === 0) {
            // nothing to do
            return;
        }
        this.set([]);
    }
    set(newDecorations) {
        try {
            this._isChangingDecorations = true;
            this._editor.changeDecorations((accessor) => {
                this._decorationIds = accessor.deltaDecorations(this._decorationIds, newDecorations);
            });
        }
        finally {
            this._isChangingDecorations = false;
        }
        return this._decorationIds;
    }
    append(newDecorations) {
        let newDecorationIds = [];
        try {
            this._isChangingDecorations = true;
            this._editor.changeDecorations((accessor) => {
                newDecorationIds = accessor.deltaDecorations([], newDecorations);
                this._decorationIds = this._decorationIds.concat(newDecorationIds);
            });
        }
        finally {
            this._isChangingDecorations = false;
        }
        return newDecorationIds;
    }
}
const squigglyStart = encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 6 3' enable-background='new 0 0 6 3' height='3' width='6'><g fill='`);
const squigglyEnd = encodeURIComponent(`'><polygon points='5.5,0 2.5,3 1.1,3 4.1,0'/><polygon points='4,0 6,2 6,0.6 5.4,0'/><polygon points='0,2 1,3 2.4,3 0,0.6'/></g></svg>`);
function getSquigglySVGData(color) {
    return squigglyStart + encodeURIComponent(color.toString()) + squigglyEnd;
}
const dotdotdotStart = encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" height="3" width="12"><g fill="`);
const dotdotdotEnd = encodeURIComponent(`"><circle cx="1" cy="1" r="1"/><circle cx="5" cy="1" r="1"/><circle cx="9" cy="1" r="1"/></g></svg>`);
function getDotDotDotSVGData(color) {
    return dotdotdotStart + encodeURIComponent(color.toString()) + dotdotdotEnd;
}
registerThemingParticipant((theme, collector) => {
    const errorForeground = theme.getColor(editorErrorForeground);
    if (errorForeground) {
        collector.addRule(`.monaco-editor .${"squiggly-error" /* ClassName.EditorErrorDecoration */} { background: url("data:image/svg+xml,${getSquigglySVGData(errorForeground)}") repeat-x bottom left; }`);
        collector.addRule(`:root { --monaco-editor-error-decoration: url("data:image/svg+xml,${getSquigglySVGData(errorForeground)}"); }`);
    }
    const warningForeground = theme.getColor(editorWarningForeground);
    if (warningForeground) {
        collector.addRule(`.monaco-editor .${"squiggly-warning" /* ClassName.EditorWarningDecoration */} { background: url("data:image/svg+xml,${getSquigglySVGData(warningForeground)}") repeat-x bottom left; }`);
        collector.addRule(`:root { --monaco-editor-warning-decoration: url("data:image/svg+xml,${getSquigglySVGData(warningForeground)}"); }`);
    }
    const infoForeground = theme.getColor(editorInfoForeground);
    if (infoForeground) {
        collector.addRule(`.monaco-editor .${"squiggly-info" /* ClassName.EditorInfoDecoration */} { background: url("data:image/svg+xml,${getSquigglySVGData(infoForeground)}") repeat-x bottom left; }`);
        collector.addRule(`:root { --monaco-editor-info-decoration: url("data:image/svg+xml,${getSquigglySVGData(infoForeground)}"); }`);
    }
    const hintForeground = theme.getColor(editorHintForeground);
    if (hintForeground) {
        collector.addRule(`.monaco-editor .${"squiggly-hint" /* ClassName.EditorHintDecoration */} { background: url("data:image/svg+xml,${getDotDotDotSVGData(hintForeground)}") no-repeat bottom left; }`);
        collector.addRule(`:root { --monaco-editor-hint-decoration: url("data:image/svg+xml,${getDotDotDotSVGData(hintForeground)}"); }`);
    }
    const unnecessaryForeground = theme.getColor(editorUnnecessaryCodeOpacity);
    if (unnecessaryForeground) {
        collector.addRule(`.monaco-editor.showUnused .${"squiggly-inline-unnecessary" /* ClassName.EditorUnnecessaryInlineDecoration */} { opacity: ${unnecessaryForeground.rgba.a}; }`);
        collector.addRule(`:root { --monaco-editor-unnecessary-decoration-opacity: ${unnecessaryForeground.rgba.a}; }`);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUVkaXRvcldpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3dpZGdldC9jb2RlRWRpdG9yL2NvZGVFZGl0b3JXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8scUNBQXFDLENBQUM7QUFDN0MsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUl2RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsT0FBTyxFQUE2Qyx3QkFBd0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2hJLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsVUFBVSxFQUFnQyxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN6RyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxjQUFjLENBQUM7QUFDdEIsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQzVELE9BQU8sRUFBRSxtQkFBbUIsRUFBOEIsTUFBTSxxQ0FBcUMsQ0FBQztBQUN0RyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFFcEQsT0FBTyxFQUFFLHdCQUF3QixFQUFrQyxNQUFNLDJCQUEyQixDQUFDO0FBQ3JHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3pFLE9BQU8sRUFBa0UsSUFBSSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ3JHLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRW5GLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxN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