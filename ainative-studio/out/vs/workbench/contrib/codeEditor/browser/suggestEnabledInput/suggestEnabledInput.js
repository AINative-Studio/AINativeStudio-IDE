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
import { $, append } from '../../../../../base/browser/dom.js';
import { DEFAULT_FONT_FAMILY } from '../../../../../base/browser/fonts.js';
import { Widget } from '../../../../../base/browser/ui/widget.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { HistoryNavigator } from '../../../../../base/common/history.js';
import { mixin } from '../../../../../base/common/objects.js';
import { isMacintosh } from '../../../../../base/common/platform.js';
import { URI as uri } from '../../../../../base/common/uri.js';
import './suggestEnabledInput.css';
import { EditorExtensionsRegistry } from '../../../../../editor/browser/editorExtensions.js';
import { CodeEditorWidget } from '../../../../../editor/browser/widget/codeEditor/codeEditorWidget.js';
import { EditOperation } from '../../../../../editor/common/core/editOperation.js';
import { Position } from '../../../../../editor/common/core/position.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { ensureValidWordDefinition, getWordAtText } from '../../../../../editor/common/core/wordHelper.js';
import { ILanguageFeaturesService } from '../../../../../editor/common/services/languageFeatures.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { ContextMenuController } from '../../../../../editor/contrib/contextmenu/browser/contextmenu.js';
import { SnippetController2 } from '../../../../../editor/contrib/snippet/browser/snippetController2.js';
import { SuggestController } from '../../../../../editor/contrib/suggest/browser/suggestController.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { registerAndCreateHistoryNavigationContext } from '../../../../../platform/history/browser/contextScopedHistoryWidget.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { asCssVariable, asCssVariableWithDefault, inputBackground, inputBorder, inputForeground, inputPlaceholderForeground } from '../../../../../platform/theme/common/colorRegistry.js';
import { MenuPreventer } from '../menuPreventer.js';
import { SelectionClipboardContributionID } from '../selectionClipboard.js';
import { getSimpleEditorOptions, setupSimpleEditorSelectionStyling } from '../simpleEditorOptions.js';
let SuggestEnabledInput = class SuggestEnabledInput extends Widget {
    constructor(id, parent, suggestionProvider, ariaLabel, resourceHandle, options, defaultInstantiationService, modelService, contextKeyService, languageFeaturesService, configurationService) {
        super();
        this._onShouldFocusResults = new Emitter();
        this.onShouldFocusResults = this._onShouldFocusResults.event;
        this._onInputDidChange = new Emitter();
        this.onInputDidChange = this._onInputDidChange.event;
        this._onDidFocus = this._register(new Emitter());
        this.onDidFocus = this._onDidFocus.event;
        this._onDidBlur = this._register(new Emitter());
        this.onDidBlur = this._onDidBlur.event;
        this.stylingContainer = append(parent, $('.suggest-input-container'));
        this.element = parent;
        this.placeholderText = append(this.stylingContainer, $('.suggest-input-placeholder', undefined, options.placeholderText || ''));
        const editorOptions = mixin(getSimpleEditorOptions(configurationService), getSuggestEnabledInputOptions(ariaLabel));
        editorOptions.overflowWidgetsDomNode = options.overflowWidgetsDomNode;
        const scopedContextKeyService = this.getScopedContextKeyService(contextKeyService);
        const instantiationService = scopedContextKeyService
            ? this._register(defaultInstantiationService.createChild(new ServiceCollection([IContextKeyService, scopedContextKeyService])))
            : defaultInstantiationService;
        this.inputWidget = this._register(instantiationService.createInstance(CodeEditorWidget, this.stylingContainer, editorOptions, {
            contributions: EditorExtensionsRegistry.getSomeEditorContributions([
                SuggestController.ID,
                SnippetController2.ID,
                ContextMenuController.ID,
                MenuPreventer.ID,
                SelectionClipboardContributionID,
            ]),
            isSimpleWidget: true,
        }));
        this._register(configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('editor.accessibilitySupport') ||
                e.affectsConfiguration('editor.cursorBlinking')) {
                const accessibilitySupport = configurationService.getValue('editor.accessibilitySupport');
                const cursorBlinking = configurationService.getValue('editor.cursorBlinking');
                this.inputWidget.updateOptions({
                    accessibilitySupport,
                    cursorBlinking
                });
            }
        }));
        this._register(this.inputWidget.onDidFocusEditorText(() => this._onDidFocus.fire()));
        this._register(this.inputWidget.onDidBlurEditorText(() => this._onDidBlur.fire()));
        const scopeHandle = uri.parse(resourceHandle);
        this.inputModel = modelService.createModel('', null, scopeHandle, true);
        this._register(this.inputModel);
        this.inputWidget.setModel(this.inputModel);
        this._register(this.inputWidget.onDidPaste(() => this.setValue(this.getValue()))); // setter cleanses
        this._register((this.inputWidget.onDidFocusEditorText(() => {
            if (options.focusContextKey) {
                options.focusContextKey.set(true);
            }
            this.stylingContainer.classList.add('synthetic-focus');
        })));
        this._register((this.inputWidget.onDidBlurEditorText(() => {
            if (options.focusContextKey) {
                options.focusContextKey.set(false);
            }
            this.stylingContainer.classList.remove('synthetic-focus');
        })));
        this._register(Event.chain(this.inputWidget.onKeyDown, $ => $.filter(e => e.keyCode === 3 /* KeyCode.Enter */))(e => { e.preventDefault(); /** Do nothing. Enter causes new line which is not expected. */ }, this));
        this._register(Event.chain(this.inputWidget.onKeyDown, $ => $.filter(e => e.keyCode === 18 /* KeyCode.DownArrow */ && (isMacintosh ? e.metaKey : e.ctrlKey)))(() => this._onShouldFocusResults.fire(), this));
        let preexistingContent = this.getValue();
        const inputWidgetModel = this.inputWidget.getModel();
        if (inputWidgetModel) {
            this._register(inputWidgetModel.onDidChangeContent(() => {
                const content = this.getValue();
                this.placeholderText.style.visibility = content ? 'hidden' : 'visible';
                if (preexistingContent.trim() === content.trim()) {
                    return;
                }
                this._onInputDidChange.fire(undefined);
                preexistingContent = content;
            }));
        }
        const validatedSuggestProvider = {
            provideResults: suggestionProvider.provideResults,
            sortKey: suggestionProvider.sortKey || (a => a),
            triggerCharacters: suggestionProvider.triggerCharacters || [],
            wordDefinition: suggestionProvider.wordDefinition ? ensureValidWordDefinition(suggestionProvider.wordDefinition) : undefined,
            alwaysShowSuggestions: !!suggestionProvider.alwaysShowSuggestions,
        };
        this.setValue(options.value || '');
        this._register(languageFeaturesService.completionProvider.register({ scheme: scopeHandle.scheme, pattern: '**/' + scopeHandle.path, hasAccessToAllModels: true }, {
            _debugDisplayName: `suggestEnabledInput/${id}`,
            triggerCharacters: validatedSuggestProvider.triggerCharacters,
            provideCompletionItems: (model, position, _context) => {
                const query = model.getValue();
                const zeroIndexedColumn = position.column - 1;
                let alreadyTypedCount = 0, zeroIndexedWordStart = 0;
                if (validatedSuggestProvider.wordDefinition) {
                    const wordAtText = getWordAtText(position.column, validatedSuggestProvider.wordDefinition, query, 0);
                    alreadyTypedCount = wordAtText?.word.length ?? 0;
                    zeroIndexedWordStart = wordAtText ? wordAtText.startColumn - 1 : 0;
                }
                else {
                    zeroIndexedWordStart = query.lastIndexOf(' ', zeroIndexedColumn - 1) + 1;
                    alreadyTypedCount = zeroIndexedColumn - zeroIndexedWordStart;
                }
                // dont show suggestions if the user has typed something, but hasn't used the trigger character
                if (!validatedSuggestProvider.alwaysShowSuggestions && alreadyTypedCount > 0 && validatedSuggestProvider.triggerCharacters?.indexOf(query[zeroIndexedWordStart]) === -1) {
                    return { suggestions: [] };
                }
                return {
                    suggestions: suggestionProvider.provideResults(query).map((result) => {
                        let label;
                        let rest;
                        if (typeof result === 'string') {
                            label = result;
                        }
                        else {
                            label = result.label;
                            rest = result;
                        }
                        return {
                            label,
                            insertText: label,
                            range: Range.fromPositions(position.delta(0, -alreadyTypedCount), position),
                            sortText: validatedSuggestProvider.sortKey(label),
                            kind: 17 /* languages.CompletionItemKind.Keyword */,
                            ...rest
                        };
                    })
                };
            }
        }));
        this.style(options.styleOverrides || {});
    }
    getScopedContextKeyService(_contextKeyService) {
        return undefined;
    }
    updateAriaLabel(label) {
        this.inputWidget.updateOptions({ ariaLabel: label });
    }
    setValue(val) {
        val = val.replace(/\s/g, ' ');
        const fullRange = this.inputModel.getFullModelRange();
        this.inputWidget.executeEdits('suggestEnabledInput.setValue', [EditOperation.replace(fullRange, val)]);
        this.inputWidget.setScrollTop(0);
        this.inputWidget.setPosition(new Position(1, val.length + 1));
    }
    getValue() {
        return this.inputWidget.getValue();
    }
    style(styleOverrides) {
        this.stylingContainer.style.backgroundColor = asCssVariable(styleOverrides.inputBackground ?? inputBackground);
        this.stylingContainer.style.color = asCssVariable(styleOverrides.inputForeground ?? inputForeground);
        this.placeholderText.style.color = asCssVariable(styleOverrides.inputPlaceholderForeground ?? inputPlaceholderForeground);
        this.stylingContainer.style.borderWidth = '1px';
        this.stylingContainer.style.borderStyle = 'solid';
        this.stylingContainer.style.borderColor = asCssVariableWithDefault(styleOverrides.inputBorder ?? inputBorder, 'transparent');
        const cursor = this.stylingContainer.getElementsByClassName('cursor')[0];
        if (cursor) {
            cursor.style.backgroundColor = asCssVariable(styleOverrides.inputForeground ?? inputForeground);
        }
    }
    focus(selectAll) {
        this.inputWidget.focus();
        if (selectAll && this.inputWidget.getValue()) {
            this.selectAll();
        }
    }
    onHide() {
        this.inputWidget.onHide();
    }
    layout(dimension) {
        this.inputWidget.layout(dimension);
        this.placeholderText.style.width = `${dimension.width - 2}px`;
    }
    selectAll() {
        this.inputWidget.setSelection(new Range(1, 1, 1, this.getValue().length + 1));
    }
};
SuggestEnabledInput = __decorate([
    __param(6, IInstantiationService),
    __param(7, IModelService),
    __param(8, IContextKeyService),
    __param(9, ILanguageFeaturesService),
    __param(10, IConfigurationService)
], SuggestEnabledInput);
export { SuggestEnabledInput };
let SuggestEnabledInputWithHistory = class SuggestEnabledInputWithHistory extends SuggestEnabledInput {
    constructor({ id, parent, ariaLabel, suggestionProvider, resourceHandle, suggestOptions, history }, instantiationService, modelService, contextKeyService, languageFeaturesService, configurationService) {
        super(id, parent, suggestionProvider, ariaLabel, resourceHandle, suggestOptions, instantiationService, modelService, contextKeyService, languageFeaturesService, configurationService);
        this.history = this._register(new HistoryNavigator(new Set(history), 100));
    }
    addToHistory() {
        const value = this.getValue();
        if (value && value !== this.getCurrentValue()) {
            this.history.add(value);
        }
    }
    getHistory() {
        return this.history.getHistory();
    }
    showNextValue() {
        if (!this.history.has(this.getValue())) {
            this.addToHistory();
        }
        let next = this.getNextValue();
        if (next) {
            next = next === this.getValue() ? this.getNextValue() : next;
        }
        this.setValue(next ?? '');
    }
    showPreviousValue() {
        if (!this.history.has(this.getValue())) {
            this.addToHistory();
        }
        let previous = this.getPreviousValue();
        if (previous) {
            previous = previous === this.getValue() ? this.getPreviousValue() : previous;
        }
        if (previous) {
            this.setValue(previous);
            this.inputWidget.setPosition({ lineNumber: 0, column: 0 });
        }
    }
    clearHistory() {
        this.history.clear();
    }
    getCurrentValue() {
        let currentValue = this.history.current();
        if (!currentValue) {
            currentValue = this.history.last();
            this.history.next();
        }
        return currentValue;
    }
    getPreviousValue() {
        return this.history.previous() || this.history.first();
    }
    getNextValue() {
        return this.history.next();
    }
};
SuggestEnabledInputWithHistory = __decorate([
    __param(1, IInstantiationService),
    __param(2, IModelService),
    __param(3, IContextKeyService),
    __param(4, ILanguageFeaturesService),
    __param(5, IConfigurationService)
], SuggestEnabledInputWithHistory);
export { SuggestEnabledInputWithHistory };
let ContextScopedSuggestEnabledInputWithHistory = class ContextScopedSuggestEnabledInputWithHistory extends SuggestEnabledInputWithHistory {
    constructor(options, instantiationService, modelService, contextKeyService, languageFeaturesService, configurationService) {
        super(options, instantiationService, modelService, contextKeyService, languageFeaturesService, configurationService);
        const { historyNavigationBackwardsEnablement, historyNavigationForwardsEnablement } = this.historyContext;
        this._register(this.inputWidget.onDidChangeCursorPosition(({ position }) => {
            const viewModel = this.inputWidget._getViewModel();
            const lastLineNumber = viewModel.getLineCount();
            const lastLineCol = viewModel.getLineLength(lastLineNumber) + 1;
            const viewPosition = viewModel.coordinatesConverter.convertModelPositionToViewPosition(position);
            historyNavigationBackwardsEnablement.set(viewPosition.lineNumber === 1 && viewPosition.column === 1);
            historyNavigationForwardsEnablement.set(viewPosition.lineNumber === lastLineNumber && viewPosition.column === lastLineCol);
        }));
    }
    getScopedContextKeyService(contextKeyService) {
        const scopedContextKeyService = this._register(contextKeyService.createScoped(this.element));
        this.historyContext = this._register(registerAndCreateHistoryNavigationContext(scopedContextKeyService, this));
        return scopedContextKeyService;
    }
};
ContextScopedSuggestEnabledInputWithHistory = __decorate([
    __param(1, IInstantiationService),
    __param(2, IModelService),
    __param(3, IContextKeyService),
    __param(4, ILanguageFeaturesService),
    __param(5, IConfigurationService)
], ContextScopedSuggestEnabledInputWithHistory);
export { ContextScopedSuggestEnabledInputWithHistory };
setupSimpleEditorSelectionStyling('.suggest-input-container');
function getSuggestEnabledInputOptions(ariaLabel) {
    return {
        fontSize: 13,
        lineHeight: 20,
        wordWrap: 'off',
        scrollbar: { vertical: 'hidden', },
        roundedSelection: false,
        guides: {
            indentation: false
        },
        cursorWidth: 1,
        fontFamily: DEFAULT_FONT_FAMILY,
        ariaLabel: ariaLabel || '',
        snippetSuggestions: 'none',
        suggest: { filterGraceful: false, showIcons: false },
        autoClosingBrackets: 'never'
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VnZ2VzdEVuYWJsZWRJbnB1dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvZGVFZGl0b3IvYnJvd3Nlci9zdWdnZXN0RW5hYmxlZElucHV0L3N1Z2dlc3RFbmFibGVkSW5wdXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLENBQUMsRUFBYSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUMxRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUUzRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUV6RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDOUQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxHQUFHLElBQUksR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDL0QsT0FBTywyQkFBMkIsQ0FBQztBQUVuQyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUM3RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQztBQUV2RyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDbkYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNuRSxPQUFPLEVB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