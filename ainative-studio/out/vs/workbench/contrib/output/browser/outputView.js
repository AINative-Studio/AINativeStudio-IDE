var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './output.css';
import * as nls from '../../../../nls.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IContextKeyService, ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { AbstractTextResourceEditor } from '../../../browser/parts/editor/textResourceEditor.js';
import { OUTPUT_VIEW_ID, CONTEXT_IN_OUTPUT, CONTEXT_OUTPUT_SCROLL_LOCK, IOutputService, OUTPUT_FILTER_FOCUS_CONTEXT, HIDE_CATEGORY_FILTER_CONTEXT } from '../../../services/output/common/output.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { FilterViewPane } from '../../../browser/parts/views/viewPane.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { TextResourceEditorInput } from '../../../common/editor/textResourceEditorInput.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { Dimension } from '../../../../base/browser/dom.js';
import { createCancelablePromise } from '../../../../base/common/async.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ResourceContextKey } from '../../../common/contextkeys.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { computeEditorAriaLabel } from '../../../browser/editor.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { localize } from '../../../../nls.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { LogLevel } from '../../../../platform/log/common/log.js';
import { EditorExtensionsRegistry } from '../../../../editor/browser/editorExtensions.js';
import { Range } from '../../../../editor/common/core/range.js';
import { FindDecorations } from '../../../../editor/contrib/find/browser/findDecorations.js';
import { Memento } from '../../../common/memento.js';
import { Markers } from '../../markers/common/markers.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { viewFilterSubmenu } from '../../../browser/parts/views/viewFilter.js';
import { escapeRegExpCharacters } from '../../../../base/common/strings.js';
let OutputViewPane = class OutputViewPane extends FilterViewPane {
    get scrollLock() { return !!this.scrollLockContextKey.get(); }
    set scrollLock(scrollLock) { this.scrollLockContextKey.set(scrollLock); }
    constructor(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService, outputService, storageService) {
        const memento = new Memento(Markers.MARKERS_VIEW_STORAGE_ID, storageService);
        const viewState = memento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        super({
            ...options,
            filterOptions: {
                placeholder: localize('outputView.filter.placeholder', "Filter"),
                focusContextKey: OUTPUT_FILTER_FOCUS_CONTEXT.key,
                text: viewState['filter'] || '',
                history: []
            }
        }, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.outputService = outputService;
        this.editorPromise = null;
        this.memento = memento;
        this.panelState = viewState;
        const filters = outputService.filters;
        filters.text = this.panelState['filter'] || '';
        filters.trace = this.panelState['showTrace'] ?? true;
        filters.debug = this.panelState['showDebug'] ?? true;
        filters.info = this.panelState['showInfo'] ?? true;
        filters.warning = this.panelState['showWarning'] ?? true;
        filters.error = this.panelState['showError'] ?? true;
        filters.categories = this.panelState['categories'] ?? '';
        this.scrollLockContextKey = CONTEXT_OUTPUT_SCROLL_LOCK.bindTo(this.contextKeyService);
        const editorInstantiationService = this._register(instantiationService.createChild(new ServiceCollection([IContextKeyService, this.scopedContextKeyService])));
        this.editor = this._register(editorInstantiationService.createInstance(OutputEditor));
        this._register(this.editor.onTitleAreaUpdate(() => {
            this.updateTitle(this.editor.getTitle());
            this.updateActions();
        }));
        this._register(this.onDidChangeBodyVisibility(() => this.onDidChangeVisibility(this.isBodyVisible())));
        this._register(this.filterWidget.onDidChangeFilterText(text => outputService.filters.text = text));
        this.checkMoreFilters();
        this._register(outputService.filters.onDidChange(() => this.checkMoreFilters()));
    }
    showChannel(channel, preserveFocus) {
        if (this.channelId !== channel.id) {
            this.setInput(channel);
        }
        if (!preserveFocus) {
            this.focus();
        }
    }
    focus() {
        super.focus();
        this.editorPromise?.then(() => this.editor.focus());
    }
    clearFilterText() {
        this.filterWidget.setFilterText('');
    }
    renderBody(container) {
        super.renderBody(container);
        this.editor.create(container);
        container.classList.add('output-view');
        const codeEditor = this.editor.getControl();
        codeEditor.setAriaOptions({ role: 'document', activeDescendant: undefined });
        this._register(codeEditor.onDidChangeModelContent(() => {
            if (!this.scrollLock) {
                this.editor.revealLastLine();
            }
        }));
        this._register(codeEditor.onDidChangeCursorPosition((e) => {
            if (e.reason !== 3 /* CursorChangeReason.Explicit */) {
                return;
            }
            if (!this.configurationService.getValue('output.smartScroll.enabled')) {
                return;
            }
            const model = codeEditor.getModel();
            if (model) {
                const newPositionLine = e.position.lineNumber;
                const lastLine = model.getLineCount();
                this.scrollLock = lastLine !== newPositionLine;
            }
        }));
    }
    layoutBodyContent(height, width) {
        this.editor.layout(new Dimension(width, height));
    }
    onDidChangeVisibility(visible) {
        this.editor.setVisible(visible);
        if (!visible) {
            this.clearInput();
        }
    }
    setInput(channel) {
        this.channelId = channel.id;
        this.checkMoreFilters();
        const input = this.createInput(channel);
        if (!this.editor.input || !input.matches(this.editor.input)) {
            this.editorPromise?.cancel();
            this.editorPromise = createCancelablePromise(token => this.editor.setInput(this.createInput(channel), { preserveFocus: true }, Object.create(null), token)
                .then(() => this.editor));
        }
    }
    checkMoreFilters() {
        const filters = this.outputService.filters;
        this.filterWidget.checkMoreFilters(!filters.trace || !filters.debug || !filters.info || !filters.warning || !filters.error || (!!this.channelId && filters.categories.includes(`,${this.channelId}:`)));
    }
    clearInput() {
        this.channelId = undefined;
        this.editor.clearInput();
        this.editorPromise = null;
    }
    createInput(channel) {
        return this.instantiationService.createInstance(TextResourceEditorInput, channel.uri, nls.localize('output model title', "{0} - Output", channel.label), nls.localize('channel', "Output channel for '{0}'", channel.label), undefined, undefined);
    }
    saveState() {
        const filters = this.outputService.filters;
        this.panelState['filter'] = filters.text;
        this.panelState['showTrace'] = filters.trace;
        this.panelState['showDebug'] = filters.debug;
        this.panelState['showInfo'] = filters.info;
        this.panelState['showWarning'] = filters.warning;
        this.panelState['showError'] = filters.error;
        this.panelState['categories'] = filters.categories;
        this.memento.saveMemento();
        super.saveState();
    }
};
OutputViewPane = __decorate([
    __param(1, IKeybindingService),
    __param(2, IContextMenuService),
    __param(3, IConfigurationService),
    __param(4, IContextKeyService),
    __param(5, IViewDescriptorService),
    __param(6, IInstantiationService),
    __param(7, IOpenerService),
    __param(8, IThemeService),
    __param(9, IHoverService),
    __param(10, IOutputService),
    __param(11, IStorageService)
], OutputViewPane);
export { OutputViewPane };
let OutputEditor = class OutputEditor extends AbstractTextResourceEditor {
    constructor(telemetryService, instantiationService, storageService, configurationService, textResourceConfigurationService, themeService, editorGroupService, editorService, fileService) {
        super(OUTPUT_VIEW_ID, editorGroupService.activeGroup /* this is not correct but pragmatic */, telemetryService, instantiationService, storageService, textResourceConfigurationService, themeService, editorGroupService, editorService, fileService);
        this.configurationService = configurationService;
        this.resourceContext = this._register(instantiationService.createInstance(ResourceContextKey));
    }
    getId() {
        return OUTPUT_VIEW_ID;
    }
    getTitle() {
        return nls.localize('output', "Output");
    }
    getConfigurationOverrides(configuration) {
        const options = super.getConfigurationOverrides(configuration);
        options.wordWrap = 'on'; // all output editors wrap
        options.lineNumbers = 'off'; // all output editors hide line numbers
        options.glyphMargin = false;
        options.lineDecorationsWidth = 20;
        options.rulers = [];
        options.folding = false;
        options.scrollBeyondLastLine = false;
        options.renderLineHighlight = 'none';
        options.minimap = { enabled: false };
        options.renderValidationDecorations = 'editable';
        options.padding = undefined;
        options.readOnly = true;
        options.domReadOnly = true;
        options.unicodeHighlight = {
            nonBasicASCII: false,
            invisibleCharacters: false,
            ambiguousCharacters: false,
        };
        const outputConfig = this.configurationService.getValue('[Log]');
        if (outputConfig) {
            if (outputConfig['editor.minimap.enabled']) {
                options.minimap = { enabled: true };
            }
            if ('editor.wordWrap' in outputConfig) {
                options.wordWrap = outputConfig['editor.wordWrap'];
            }
        }
        return options;
    }
    getAriaLabel() {
        return this.input ? this.input.getAriaLabel() : nls.localize('outputViewAriaLabel', "Output panel");
    }
    computeAriaLabel() {
        return this.input ? computeEditorAriaLabel(this.input, undefined, undefined, this.editorGroupService.count) : this.getAriaLabel();
    }
    async setInput(input, options, context, token) {
        const focus = !(options && options.preserveFocus);
        if (this.input && input.matches(this.input)) {
            return;
        }
        if (this.input) {
            // Dispose previous input (Output panel is not a workbench editor)
            this.input.dispose();
        }
        await super.setInput(input, options, context, token);
        this.resourceContext.set(input.resource);
        if (focus) {
            this.focus();
        }
        this.revealLastLine();
    }
    clearInput() {
        if (this.input) {
            // Dispose current input (Output panel is not a workbench editor)
            this.input.dispose();
        }
        super.clearInput();
        this.resourceContext.reset();
    }
    createEditor(parent) {
        parent.setAttribute('role', 'document');
        super.createEditor(parent);
        const scopedContextKeyService = this.scopedContextKeyService;
        if (scopedContextKeyService) {
            CONTEXT_IN_OUTPUT.bindTo(scopedContextKeyService).set(true);
        }
    }
    _getContributions() {
        return [
            ...EditorExtensionsRegistry.getEditorContributions(),
            {
                id: FilterController.ID,
                ctor: FilterController,
                instantiation: 0 /* EditorContributionInstantiation.Eager */
            }
        ];
    }
    getCodeEditorWidgetOptions() {
        return { contributions: this._getContributions() };
    }
};
OutputEditor = __decorate([
    __param(0, ITelemetryService),
    __param(1, IInstantiationService),
    __param(2, IStorageService),
    __param(3, IConfigurationService),
    __param(4, ITextResourceConfigurationService),
    __param(5, IThemeService),
    __param(6, IEditorGroupsService),
    __param(7, IEditorService),
    __param(8, IFileService)
], OutputEditor);
export { OutputEditor };
let FilterController = class FilterController extends Disposable {
    static { this.ID = 'output.editor.contrib.filterController'; }
    constructor(editor, outputService) {
        super();
        this.editor = editor;
        this.outputService = outputService;
        this.modelDisposables = this._register(new DisposableStore());
        this.hiddenAreas = [];
        this.categories = new Map();
        this.decorationsCollection = editor.createDecorationsCollection();
        this._register(editor.onDidChangeModel(() => this.onDidChangeModel()));
        this._register(this.outputService.filters.onDidChange(() => editor.hasModel() && this.filter(editor.getModel())));
    }
    onDidChangeModel() {
        this.modelDisposables.clear();
        this.hiddenAreas = [];
        this.categories.clear();
        if (!this.editor.hasModel()) {
            return;
        }
        const model = this.editor.getModel();
        this.filter(model);
        const computeEndLineNumber = () => {
            const endLineNumber = model.getLineCount();
            return endLineNumber > 1 && model.getLineMaxColumn(endLineNumber) === 1 ? endLineNumber - 1 : endLineNumber;
        };
        let endLineNumber = computeEndLineNumber();
        this.modelDisposables.add(model.onDidChangeContent(e => {
            if (e.changes.every(e => e.range.startLineNumber > endLineNumber)) {
                this.filterIncremental(model, endLineNumber + 1);
            }
            else {
                this.filter(model);
            }
            endLineNumber = computeEndLineNumber();
        }));
    }
    filter(model) {
        this.hiddenAreas = [];
        this.decorationsCollection.clear();
        this.filterIncremental(model, 1);
    }
    filterIncremental(model, fromLineNumber) {
        const { findMatches, hiddenAreas, categories: sources } = this.compute(model, fromLineNumber);
        this.hiddenAreas.push(...hiddenAreas);
        this.editor.setHiddenAreas(this.hiddenAreas, this);
        if (findMatches.length) {
            this.decorationsCollection.append(findMatches);
        }
        if (sources.size) {
            const that = this;
            for (const [categoryFilter, categoryName] of sources) {
                if (this.categories.has(categoryFilter)) {
                    continue;
                }
                this.categories.set(categoryFilter, categoryName);
                this.modelDisposables.add(registerAction2(class extends Action2 {
                    constructor() {
                        super({
                            id: `workbench.actions.${OUTPUT_VIEW_ID}.toggle.${categoryFilter}`,
                            title: categoryName,
                            toggled: ContextKeyExpr.regex(HIDE_CATEGORY_FILTER_CONTEXT.key, new RegExp(`.*,${escapeRegExpCharacters(categoryFilter)},.*`)).negate(),
                            menu: {
                                id: viewFilterSubmenu,
                                group: '1_category_filter',
                                when: ContextKeyExpr.and(ContextKeyExpr.equals('view', OUTPUT_VIEW_ID)),
                            }
                        });
                    }
                    async run() {
                        that.outputService.filters.toggleCategory(categoryFilter);
                    }
                }));
            }
        }
    }
    compute(model, fromLineNumber) {
        const filters = this.outputService.filters;
        const activeChannel = this.outputService.getActiveChannel();
        const findMatches = [];
        const hiddenAreas = [];
        const categories = new Map();
        const logEntries = activeChannel?.getLogEntries();
        if (activeChannel && logEntries?.length) {
            const hasLogLevelFilter = !filters.trace || !filters.debug || !filters.info || !filters.warning || !filters.error;
            const fromLogLevelEntryIndex = logEntries.findIndex(entry => fromLineNumber >= entry.range.startLineNumber && fromLineNumber <= entry.range.endLineNumber);
            if (fromLogLevelEntryIndex === -1) {
                return { findMatches, hiddenAreas, categories };
            }
            for (let i = fromLogLevelEntryIndex; i < logEntries.length; i++) {
                const entry = logEntries[i];
                if (entry.category) {
                    categories.set(`${activeChannel.id}:${entry.category}`, entry.category);
                }
                if (hasLogLevelFilter && !this.shouldShowLogLevel(entry, filters)) {
                    hiddenAreas.push(entry.range);
                    continue;
                }
                if (!this.shouldShowCategory(activeChannel.id, entry, filters)) {
                    hiddenAreas.push(entry.range);
                    continue;
                }
                if (filters.text) {
                    const matches = model.findMatches(filters.text, entry.range, false, false, null, false);
                    if (matches.length) {
                        for (const match of matches) {
                            findMatches.push({ range: match.range, options: FindDecorations._FIND_MATCH_DECORATION });
                        }
                    }
                    else {
                        hiddenAreas.push(entry.range);
                    }
                }
            }
            return { findMatches, hiddenAreas, categories };
        }
        if (!filters.text) {
            return { findMatches, hiddenAreas, categories };
        }
        const lineCount = model.getLineCount();
        for (let lineNumber = fromLineNumber; lineNumber <= lineCount; lineNumber++) {
            const lineRange = new Range(lineNumber, 1, lineNumber, model.getLineMaxColumn(lineNumber));
            const matches = model.findMatches(filters.text, lineRange, false, false, null, false);
            if (matches.length) {
                for (const match of matches) {
                    findMatches.push({ range: match.range, options: FindDecorations._FIND_MATCH_DECORATION });
                }
            }
            else {
                hiddenAreas.push(lineRange);
            }
        }
        return { findMatches, hiddenAreas, categories };
    }
    shouldShowLogLevel(entry, filters) {
        switch (entry.logLevel) {
            case LogLevel.Trace:
                return filters.trace;
            case LogLevel.Debug:
                return filters.debug;
            case LogLevel.Info:
                return filters.info;
            case LogLevel.Warning:
                return filters.warning;
            case LogLevel.Error:
                return filters.error;
        }
        return true;
    }
    shouldShowCategory(activeChannelId, entry, filters) {
        if (!entry.category) {
            return true;
        }
        return !filters.hasCategory(`${activeChannelId}:${entry.category}`);
    }
};
FilterController = __decorate([
    __param(1, IOutputService)
], FilterController);
export { FilterController };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0cHV0Vmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9vdXRwdXQvYnJvd3Nlci9vdXRwdXRWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sY0FBYyxDQUFDO0FBQ3RCLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFHMUMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdkYsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxnREFBZ0QsQ0FBQztBQUM5RyxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztBQUNwSCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsa0JBQWtCLEVBQWUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFFdkgsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDakcsT0FBTyxFQUFFLGNBQWMsRUFBRSxpQkFBaUIsRUFBa0IsMEJBQTBCLEVBQUUsY0FBYyxFQUFzQiwyQkFBMkIsRUFBYSw0QkFBNEIsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3BQLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNsRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUU5RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFFbEYsT0FBTyxFQUFvQixjQUFjLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUM1RixPQUFPLEVB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