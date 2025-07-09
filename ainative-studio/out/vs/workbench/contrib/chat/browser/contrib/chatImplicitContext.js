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
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore, MutableDisposable } from '../../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../../base/common/network.js';
import { autorun } from '../../../../../base/common/observable.js';
import { basename } from '../../../../../base/common/resources.js';
import { URI } from '../../../../../base/common/uri.js';
import { isCodeEditor, isDiffEditor } from '../../../../../editor/browser/editorBrowser.js';
import { ICodeEditorService } from '../../../../../editor/browser/services/codeEditorService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { getNotebookEditorFromEditorPane } from '../../../notebook/browser/notebookBrowser.js';
import { IChatEditingService } from '../../common/chatEditingService.js';
import { IChatService } from '../../common/chatService.js';
import { ChatAgentLocation } from '../../common/constants.js';
import { ILanguageModelIgnoredFilesService } from '../../common/ignoredFiles.js';
import { IChatWidgetService } from '../chat.js';
let ChatImplicitContextContribution = class ChatImplicitContextContribution extends Disposable {
    static { this.ID = 'chat.implicitContext'; }
    constructor(codeEditorService, editorService, chatWidgetService, chatService, chatEditingService, configurationService, ignoredFilesService) {
        super();
        this.codeEditorService = codeEditorService;
        this.editorService = editorService;
        this.chatWidgetService = chatWidgetService;
        this.chatService = chatService;
        this.chatEditingService = chatEditingService;
        this.configurationService = configurationService;
        this.ignoredFilesService = ignoredFilesService;
        this._currentCancelTokenSource = this._register(new MutableDisposable());
        this._implicitContextEnablement = this.configurationService.getValue('chat.implicitContext.enabled');
        const activeEditorDisposables = this._register(new DisposableStore());
        this._register(Event.runAndSubscribe(editorService.onDidActiveEditorChange, (() => {
            activeEditorDisposables.clear();
            const codeEditor = this.findActiveCodeEditor();
            if (codeEditor) {
                activeEditorDisposables.add(Event.debounce(Event.any(codeEditor.onDidChangeModel, codeEditor.onDidChangeCursorSelection, codeEditor.onDidScrollChange), () => undefined, 500)(() => this.updateImplicitContext()));
            }
            const notebookEditor = this.findActiveNotebookEditor();
            if (notebookEditor) {
                activeEditorDisposables.add(Event.debounce(Event.any(notebookEditor.onDidChangeModel, notebookEditor.onDidChangeActiveCell), () => undefined, 500)(() => this.updateImplicitContext()));
            }
            this.updateImplicitContext();
        })));
        this._register(autorun((reader) => {
            this.chatEditingService.editingSessionsObs.read(reader);
            this.updateImplicitContext();
        }));
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('chat.implicitContext.enabled')) {
                this._implicitContextEnablement = this.configurationService.getValue('chat.implicitContext.enabled');
                this.updateImplicitContext();
            }
        }));
        this._register(this.chatService.onDidSubmitRequest(({ chatSessionId }) => {
            const widget = this.chatWidgetService.getWidgetBySessionId(chatSessionId);
            if (!widget?.input.implicitContext) {
                return;
            }
            if (this._implicitContextEnablement[widget.location] === 'first' && widget.viewModel?.getItems().length !== 0) {
                widget.input.implicitContext.setValue(undefined, false);
            }
        }));
        this._register(this.chatWidgetService.onDidAddWidget(async (widget) => {
            await this.updateImplicitContext(widget);
        }));
    }
    findActiveCodeEditor() {
        const codeEditor = this.codeEditorService.getActiveCodeEditor();
        if (codeEditor) {
            const model = codeEditor.getModel();
            if (model?.uri.scheme === Schemas.vscodeNotebookCell) {
                return undefined;
            }
            if (model) {
                return codeEditor;
            }
        }
        for (const codeOrDiffEditor of this.editorService.getVisibleTextEditorControls(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)) {
            let codeEditor;
            if (isDiffEditor(codeOrDiffEditor)) {
                codeEditor = codeOrDiffEditor.getModifiedEditor();
            }
            else if (isCodeEditor(codeOrDiffEditor)) {
                codeEditor = codeOrDiffEditor;
            }
            else {
                continue;
            }
            const model = codeEditor.getModel();
            if (model) {
                return codeEditor;
            }
        }
        return undefined;
    }
    findActiveNotebookEditor() {
        return getNotebookEditorFromEditorPane(this.editorService.activeEditorPane);
    }
    async updateImplicitContext(updateWidget) {
        const cancelTokenSource = this._currentCancelTokenSource.value = new CancellationTokenSource();
        const codeEditor = this.findActiveCodeEditor();
        const model = codeEditor?.getModel();
        const selection = codeEditor?.getSelection();
        let newValue;
        let isSelection = false;
        if (model) {
            if (selection && !selection.isEmpty()) {
                newValue = { uri: model.uri, range: selection };
                isSelection = true;
            }
            else {
                const visibleRanges = codeEditor?.getVisibleRanges();
                if (visibleRanges && visibleRanges.length > 0) {
                    // Merge visible ranges. Maybe the reference value could actually be an array of Locations?
                    // Something like a Location with an array of Ranges?
                    let range = visibleRanges[0];
                    visibleRanges.slice(1).forEach(r => {
                        range = range.plusRange(r);
                    });
                    newValue = { uri: model.uri, range };
                }
                else {
                    newValue = model.uri;
                }
            }
        }
        const notebookEditor = this.findActiveNotebookEditor();
        if (notebookEditor) {
            const activeCell = notebookEditor.getActiveCell();
            if (activeCell) {
                newValue = activeCell.uri;
            }
            else {
                newValue = notebookEditor.textModel?.uri;
            }
        }
        const uri = newValue instanceof URI ? newValue : newValue?.uri;
        if (uri && await this.ignoredFilesService.fileIsIgnored(uri, cancelTokenSource.token)) {
            newValue = undefined;
        }
        if (cancelTokenSource.token.isCancellationRequested) {
            return;
        }
        const widgets = updateWidget ? [updateWidget] : [...this.chatWidgetService.getWidgetsByLocations(ChatAgentLocation.Panel), ...this.chatWidgetService.getWidgetsByLocations(ChatAgentLocation.EditingSession), ...this.chatWidgetService.getWidgetsByLocations(ChatAgentLocation.Editor)];
        for (const widget of widgets) {
            if (!widget.input.implicitContext) {
                continue;
            }
            const setting = this._implicitContextEnablement[widget.location];
            const isFirstInteraction = widget.viewModel?.getItems().length === 0;
            if (setting === 'first' && !isFirstInteraction) {
                widget.input.implicitContext.setValue(undefined, false);
            }
            else if (setting === 'always' || setting === 'first' && isFirstInteraction) {
                widget.input.implicitContext.setValue(newValue, isSelection);
            }
            else if (setting === 'never') {
                widget.input.implicitContext.setValue(undefined, false);
            }
        }
    }
};
ChatImplicitContextContribution = __decorate([
    __param(0, ICodeEditorService),
    __param(1, IEditorService),
    __param(2, IChatWidgetService),
    __param(3, IChatService),
    __param(4, IChatEditingService),
    __param(5, IConfigurationService),
    __param(6, ILanguageModelIgnoredFilesService)
], ChatImplicitContextContribution);
export { ChatImplicitContextContribution };
export class ChatImplicitContext extends Disposable {
    get id() {
        if (URI.isUri(this.value)) {
            return 'vscode.implicit.file';
        }
        else if (this.value) {
            if (this._isSelection) {
                return 'vscode.implicit.selection';
            }
            else {
                return 'vscode.implicit.viewport';
            }
        }
        else {
            return 'vscode.implicit';
        }
    }
    get name() {
        if (URI.isUri(this.value)) {
            return `file:${basename(this.value)}`;
        }
        else if (this.value) {
            return `file:${basename(this.value.uri)}`;
        }
        else {
            return 'implicit';
        }
    }
    get modelDescription() {
        if (URI.isUri(this.value)) {
            return `User's active file`;
        }
        else if (this._isSelection) {
            return `User's active selection`;
        }
        else {
            return `User's current visible code`;
        }
    }
    get isSelection() {
        return this._isSelection;
    }
    get value() {
        return this._value;
    }
    get enabled() {
        return this._enabled;
    }
    set enabled(value) {
        this._enabled = value;
        this._onDidChangeValue.fire();
    }
    constructor(value) {
        super();
        this.kind = 'implicit';
        this.isFile = true;
        this._isSelection = false;
        this._onDidChangeValue = new Emitter();
        this.onDidChangeValue = this._onDidChangeValue.event;
        this._enabled = true;
        this._value = value;
    }
    setValue(value, isSelection) {
        this._value = value;
        this._isSelection = isSelection;
        this._onDidChangeValue.fire();
    }
    toBaseEntry() {
        return {
            id: this.id,
            name: this.name,
            value: this.value,
            isFile: true,
            modelDescription: this.modelDescription
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEltcGxpY2l0Q29udGV4dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY29udHJpYi9jaGF0SW1wbGljaXRDb250ZXh0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDckUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN6RyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFlLFlBQVksRUFBRSxZQUFZLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN6RyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUVqRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUd0RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDckYsT0FBTyxFQUFFLCtCQUErQixFQUFtQixNQUFNLDhDQUE4QyxDQUFDO0FBQ2hILE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRXpFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2QkFBNkIs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