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
import { createCancelablePromise, disposableTimeout, RunOnceScheduler } from '../../../../base/common/async.js';
import { onUnexpectedError, onUnexpectedExternalError } from '../../../../base/common/errors.js';
import { DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { StableEditorScrollState } from '../../../browser/stableEditorScroll.js';
import { EditorAction, registerEditorAction, registerEditorContribution } from '../../../browser/editorExtensions.js';
import { EDITOR_FONT_DEFAULTS } from '../../../common/config/editorOptions.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { getCodeLensModel } from './codelens.js';
import { ICodeLensCache } from './codeLensCache.js';
import { CodeLensHelper, CodeLensWidget } from './codelensWidget.js';
import { localize, localize2 } from '../../../../nls.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { ILanguageFeatureDebounceService } from '../../../common/services/languageFeatureDebounce.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
let CodeLensContribution = class CodeLensContribution {
    static { this.ID = 'css.editor.codeLens'; }
    constructor(_editor, _languageFeaturesService, debounceService, _commandService, _notificationService, _codeLensCache) {
        this._editor = _editor;
        this._languageFeaturesService = _languageFeaturesService;
        this._commandService = _commandService;
        this._notificationService = _notificationService;
        this._codeLensCache = _codeLensCache;
        this._disposables = new DisposableStore();
        this._localToDispose = new DisposableStore();
        this._lenses = [];
        this._oldCodeLensModels = new DisposableStore();
        this._provideCodeLensDebounce = debounceService.for(_languageFeaturesService.codeLensProvider, 'CodeLensProvide', { min: 250 });
        this._resolveCodeLensesDebounce = debounceService.for(_languageFeaturesService.codeLensProvider, 'CodeLensResolve', { min: 250, salt: 'resolve' });
        this._resolveCodeLensesScheduler = new RunOnceScheduler(() => this._resolveCodeLensesInViewport(), this._resolveCodeLensesDebounce.default());
        this._disposables.add(this._editor.onDidChangeModel(() => this._onModelChange()));
        this._disposables.add(this._editor.onDidChangeModelLanguage(() => this._onModelChange()));
        this._disposables.add(this._editor.onDidChangeConfiguration((e) => {
            if (e.hasChanged(52 /* EditorOption.fontInfo */) || e.hasChanged(19 /* EditorOption.codeLensFontSize */) || e.hasChanged(18 /* EditorOption.codeLensFontFamily */)) {
                this._updateLensStyle();
            }
            if (e.hasChanged(17 /* EditorOption.codeLens */)) {
                this._onModelChange();
            }
        }));
        this._disposables.add(_languageFeaturesService.codeLensProvider.onDidChange(this._onModelChange, this));
        this._onModelChange();
        this._updateLensStyle();
    }
    dispose() {
        this._localDispose();
        this._localToDispose.dispose();
        this._disposables.dispose();
        this._oldCodeLensModels.dispose();
        this._currentCodeLensModel?.dispose();
    }
    _getLayoutInfo() {
        const lineHeightFactor = Math.max(1.3, this._editor.getOption(68 /* EditorOption.lineHeight */) / this._editor.getOption(54 /* EditorOption.fontSize */));
        let fontSize = this._editor.getOption(19 /* EditorOption.codeLensFontSize */);
        if (!fontSize || fontSize < 5) {
            fontSize = (this._editor.getOption(54 /* EditorOption.fontSize */) * .9) | 0;
        }
        return {
            fontSize,
            codeLensHeight: (fontSize * lineHeightFactor) | 0,
        };
    }
    _updateLensStyle() {
        const { codeLensHeight, fontSize } = this._getLayoutInfo();
        const fontFamily = this._editor.getOption(18 /* EditorOption.codeLensFontFamily */);
        const editorFontInfo = this._editor.getOption(52 /* EditorOption.fontInfo */);
        const { style } = this._editor.getContainerDomNode();
        style.setProperty('--vscode-editorCodeLens-lineHeight', `${codeLensHeight}px`);
        style.setProperty('--vscode-editorCodeLens-fontSize', `${fontSize}px`);
        style.setProperty('--vscode-editorCodeLens-fontFeatureSettings', editorFontInfo.fontFeatureSettings);
        if (fontFamily) {
            style.setProperty('--vscode-editorCodeLens-fontFamily', fontFamily);
            style.setProperty('--vscode-editorCodeLens-fontFamilyDefault', EDITOR_FONT_DEFAULTS.fontFamily);
        }
        //
        this._editor.changeViewZones(accessor => {
            for (const lens of this._lenses) {
                lens.updateHeight(codeLensHeight, accessor);
            }
        });
    }
    _localDispose() {
        this._getCodeLensModelPromise?.cancel();
        this._getCodeLensModelPromise = undefined;
        this._resolveCodeLensesPromise?.cancel();
        this._resolveCodeLensesPromise = undefined;
        this._localToDispose.clear();
        this._oldCodeLensModels.clear();
        this._currentCodeLensModel?.dispose();
    }
    _onModelChange() {
        this._localDispose();
        const model = this._editor.getModel();
        if (!model) {
            return;
        }
        if (!this._editor.getOption(17 /* EditorOption.codeLens */) || model.isTooLargeForTokenization()) {
            return;
        }
        const cachedLenses = this._codeLensCache.get(model);
        if (cachedLenses) {
            this._renderCodeLensSymbols(cachedLenses);
        }
        if (!this._languageFeaturesService.codeLensProvider.has(model)) {
            // no provider -> return but check with
            // cached lenses. they expire after 30 seconds
            if (cachedLenses) {
                disposableTimeout(() => {
                    const cachedLensesNow = this._codeLensCache.get(model);
                    if (cachedLenses === cachedLensesNow) {
                        this._codeLensCache.delete(model);
                        this._onModelChange();
                    }
                }, 30 * 1000, this._localToDispose);
            }
            return;
        }
        for (const provider of this._languageFeaturesService.codeLensProvider.all(model)) {
            if (typeof provider.onDidChange === 'function') {
                const registration = provider.onDidChange(() => scheduler.schedule());
                this._localToDispose.add(registration);
            }
        }
        const scheduler = new RunOnceScheduler(() => {
            const t1 = Date.now();
            this._getCodeLensModelPromise?.cancel();
            this._getCodeLensModelPromise = createCancelablePromise(token => getCodeLensModel(this._languageFeaturesService.codeLensProvider, model, token));
            this._getCodeLensModelPromise.then(result => {
                if (this._currentCodeLensModel) {
                    this._oldCodeLensModels.add(this._currentCodeLensModel);
                }
                this._currentCodeLensModel = result;
                // cache model to reduce flicker
                this._codeLensCache.put(model, result);
                // update moving average
                const newDelay = this._provideCodeLensDebounce.update(model, Date.now() - t1);
                scheduler.delay = newDelay;
                // render lenses
                this._renderCodeLensSymbols(result);
                // dom.scheduleAtNextAnimationFrame(() => this._resolveCodeLensesInViewport());
                this._resolveCodeLensesInViewportSoon();
            }, onUnexpectedError);
        }, this._provideCodeLensDebounce.get(model));
        this._localToDispose.add(scheduler);
        this._localToDispose.add(toDisposable(() => this._resolveCodeLensesScheduler.cancel()));
        this._localToDispose.add(this._editor.onDidChangeModelContent(() => {
            this._editor.changeDecorations(decorationsAccessor => {
                this._editor.changeViewZones(viewZonesAccessor => {
                    const toDispose = [];
                    let lastLensLineNumber = -1;
                    this._lenses.forEach((lens) => {
                        if (!lens.isValid() || lastLensLineNumber === lens.getLineNumber()) {
                            // invalid -> lens collapsed, attach range doesn't exist anymore
                            // line_number -> lenses should never be on the same line
                            toDispose.push(lens);
                        }
                        else {
                            lens.update(viewZonesAccessor);
                            lastLensLineNumber = lens.getLineNumber();
                        }
                    });
                    const helper = new CodeLensHelper();
                    toDispose.forEach((l) => {
                        l.dispose(helper, viewZonesAccessor);
                        this._lenses.splice(this._lenses.indexOf(l), 1);
                    });
                    helper.commit(decorationsAccessor);
                });
            });
            // Ask for all references again
            scheduler.schedule();
            // Cancel pending and active resolve requests
            this._resolveCodeLensesScheduler.cancel();
            this._resolveCodeLensesPromise?.cancel();
            this._resolveCodeLensesPromise = undefined;
        }));
        this._localToDispose.add(this._editor.onDidFocusEditorText(() => {
            scheduler.schedule();
        }));
        this._localToDispose.add(this._editor.onDidBlurEditorText(() => {
            scheduler.cancel();
        }));
        this._localToDispose.add(this._editor.onDidScrollChange(e => {
            if (e.scrollTopChanged && this._lenses.length > 0) {
                this._resolveCodeLensesInViewportSoon();
            }
        }));
        this._localToDispose.add(this._editor.onDidLayoutChange(() => {
            this._resolveCodeLensesInViewportSoon();
        }));
        this._localToDispose.add(toDisposable(() => {
            if (this._editor.getModel()) {
                const scrollState = StableEditorScrollState.capture(this._editor);
                this._editor.changeDecorations(decorationsAccessor => {
                    this._editor.changeViewZones(viewZonesAccessor => {
                        this._disposeAllLenses(decorationsAccessor, viewZonesAccessor);
                    });
                });
                scrollState.restore(this._editor);
            }
            else {
                // No accessors available
                this._disposeAllLenses(undefined, undefined);
            }
        }));
        this._localToDispose.add(this._editor.onMouseDown(e => {
            if (e.target.type !== 9 /* MouseTargetType.CONTENT_WIDGET */) {
                return;
            }
            let target = e.target.element;
            if (target?.tagName === 'SPAN') {
                target = target.parentElement;
            }
            if (target?.tagName === 'A') {
                for (const lens of this._lenses) {
                    const command = lens.getCommand(target);
                    if (command) {
                        this._commandService.executeCommand(command.id, ...(command.arguments || [])).catch(err => this._notificationService.error(err));
                        break;
                    }
                }
            }
        }));
        scheduler.schedule();
    }
    _disposeAllLenses(decChangeAccessor, viewZoneChangeAccessor) {
        const helper = new CodeLensHelper();
        for (const lens of this._lenses) {
            lens.dispose(helper, viewZoneChangeAccessor);
        }
        if (decChangeAccessor) {
            helper.commit(decChangeAccessor);
        }
        this._lenses.length = 0;
    }
    _renderCodeLensSymbols(symbols) {
        if (!this._editor.hasModel()) {
            return;
        }
        const maxLineNumber = this._editor.getModel().getLineCount();
        const groups = [];
        let lastGroup;
        for (const symbol of symbols.lenses) {
            const line = symbol.symbol.range.startLineNumber;
            if (line < 1 || line > maxLineNumber) {
                // invalid code lens
                continue;
            }
            else if (lastGroup && lastGroup[lastGroup.length - 1].symbol.range.startLineNumber === line) {
                // on same line as previous
                lastGroup.push(symbol);
            }
            else {
                // on later line as previous
                lastGroup = [symbol];
                groups.push(lastGroup);
            }
        }
        if (!groups.length && !this._lenses.length) {
            // Nothing to change
            return;
        }
        const scrollState = StableEditorScrollState.capture(this._editor);
        const layoutInfo = this._getLayoutInfo();
        this._editor.changeDecorations(decorationsAccessor => {
            this._editor.changeViewZones(viewZoneAccessor => {
                const helper = new CodeLensHelper();
                let codeLensIndex = 0;
                let groupsIndex = 0;
                while (groupsIndex < groups.length && codeLensIndex < this._lenses.length) {
                    const symbolsLineNumber = groups[groupsIndex][0].symbol.range.startLineNumber;
                    const codeLensLineNumber = this._lenses[codeLensIndex].getLineNumber();
                    if (codeLensLineNumber < symbolsLineNumber) {
                        this._lenses[codeLensIndex].dispose(helper, viewZoneAccessor);
                        this._lenses.splice(codeLensIndex, 1);
                    }
                    else if (codeLensLineNumber === symbolsLineNumber) {
                        this._lenses[codeLensIndex].updateCodeLensSymbols(groups[groupsIndex], helper);
                        groupsIndex++;
                        codeLensIndex++;
                    }
                    else {
                        this._lenses.splice(codeLensIndex, 0, new CodeLensWidget(groups[groupsIndex], this._editor, helper, viewZoneAccessor, layoutInfo.codeLensHeight, () => this._resolveCodeLensesInViewportSoon()));
                        codeLensIndex++;
                        groupsIndex++;
                    }
                }
                // Delete extra code lenses
                while (codeLensIndex < this._lenses.length) {
                    this._lenses[codeLensIndex].dispose(helper, viewZoneAccessor);
                    this._lenses.splice(codeLensIndex, 1);
                }
                // Create extra symbols
                while (groupsIndex < groups.length) {
                    this._lenses.push(new CodeLensWidget(groups[groupsIndex], this._editor, helper, viewZoneAccessor, layoutInfo.codeLensHeight, () => this._resolveCodeLensesInViewportSoon()));
                    groupsIndex++;
                }
                helper.commit(decorationsAccessor);
            });
        });
        scrollState.restore(this._editor);
    }
    _resolveCodeLensesInViewportSoon() {
        const model = this._editor.getModel();
        if (model) {
            this._resolveCodeLensesScheduler.schedule();
        }
    }
    _resolveCodeLensesInViewport() {
        this._resolveCodeLensesPromise?.cancel();
        this._resolveCodeLensesPromise = undefined;
        const model = this._editor.getModel();
        if (!model) {
            return;
        }
        const toResolve = [];
        const lenses = [];
        this._lenses.forEach((lens) => {
            const request = lens.computeIfNecessary(model);
            if (request) {
                toResolve.push(request);
                lenses.push(lens);
            }
        });
        if (toResolve.length === 0) {
            return;
        }
        const t1 = Date.now();
        const resolvePromise = createCancelablePromise(token => {
            const promises = toResolve.map((request, i) => {
                const resolvedSymbols = new Array(request.length);
                const promises = request.map((request, i) => {
                    if (!request.symbol.command && typeof request.provider.resolveCodeLens === 'function') {
                        return Promise.resolve(request.provider.resolveCodeLens(model, request.symbol, token)).then(symbol => {
                            resolvedSymbols[i] = symbol;
                        }, onUnexpectedExternalError);
                    }
                    else {
                        resolvedSymbols[i] = request.symbol;
                        return Promise.resolve(undefined);
                    }
                });
                return Promise.all(promises).then(() => {
                    if (!token.isCancellationRequested && !lenses[i].isDisposed()) {
                        lenses[i].updateCommands(resolvedSymbols);
                    }
                });
            });
            return Promise.all(promises);
        });
        this._resolveCodeLensesPromise = resolvePromise;
        this._resolveCodeLensesPromise.then(() => {
            // update moving average
            const newDelay = this._resolveCodeLensesDebounce.update(model, Date.now() - t1);
            this._resolveCodeLensesScheduler.delay = newDelay;
            if (this._currentCodeLensModel) { // update the cached state with new resolved items
                this._codeLensCache.put(model, this._currentCodeLensModel);
            }
            this._oldCodeLensModels.clear(); // dispose old models once we have updated the UI with the current model
            if (resolvePromise === this._resolveCodeLensesPromise) {
                this._resolveCodeLensesPromise = undefined;
            }
        }, err => {
            onUnexpectedError(err); // can also be cancellation!
            if (resolvePromise === this._resolveCodeLensesPromise) {
                this._resolveCodeLensesPromise = undefined;
            }
        });
    }
    async getModel() {
        await this._getCodeLensModelPromise;
        await this._resolveCodeLensesPromise;
        return !this._currentCodeLensModel?.isDisposed
            ? this._currentCodeLensModel
            : undefined;
    }
};
CodeLensContribution = __decorate([
    __param(1, ILanguageFeaturesService),
    __param(2, ILanguageFeatureDebounceService),
    __param(3, ICommandService),
    __param(4, INotificationService),
    __param(5, ICodeLensCache)
], CodeLensContribution);
export { CodeLensContribution };
registerEditorContribution(CodeLensContribution.ID, CodeLensContribution, 1 /* EditorContributionInstantiation.AfterFirstRender */);
registerEditorAction(class ShowLensesInCurrentLine extends EditorAction {
    constructor() {
        super({
            id: 'codelens.showLensesInCurrentLine',
            precondition: EditorContextKeys.hasCodeLensProvider,
            label: localize2('showLensOnLine', "Show CodeLens Commands for Current Line"),
        });
    }
    async run(accessor, editor) {
        if (!editor.hasModel()) {
            return;
        }
        const quickInputService = accessor.get(IQuickInputService);
        const commandService = accessor.get(ICommandService);
        const notificationService = accessor.get(INotificationService);
        const lineNumber = editor.getSelection().positionLineNumber;
        const codelensController = editor.getContribution(CodeLensContribution.ID);
        if (!codelensController) {
            return;
        }
        const model = await codelensController.getModel();
        if (!model) {
            // nothing
            return;
        }
        const items = [];
        for (const lens of model.lenses) {
            if (lens.symbol.command && lens.symbol.range.startLineNumber === lineNumber) {
                items.push({
                    label: lens.symbol.command.title,
                    command: lens.symbol.command
                });
            }
        }
        if (items.length === 0) {
            // We dont want an empty picker
            return;
        }
        const item = await quickInputService.pick(items, {
            canPickMany: false,
            placeHolder: localize('placeHolder', "Select a command")
        });
        if (!item) {
            // Nothing picked
            return;
        }
        let command = item.command;
        if (model.isDisposed) {
            // try to find the same command again in-case the model has been re-created in the meantime
            // this is a best attempt approach which shouldn't be needed because eager model re-creates
            // shouldn't happen due to focus in/out anymore
            const newModel = await codelensController.getModel();
            const newLens = newModel?.lenses.find(lens => lens.symbol.range.startLineNumber === lineNumber && lens.symbol.command?.title === command.title);
            if (!newLens || !newLens.symbol.command) {
                return;
            }
            command = newLens.symbol.command;
        }
        try {
            await commandService.executeCommand(command.id, ...(command.arguments || []));
        }
        catch (err) {
            notificationService.error(err);
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZWxlbnNDb250cm9sbGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2NvZGVsZW5zL2Jyb3dzZXIvY29kZWxlbnNDb250cm9sbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsaUJBQWlCLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNuSSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNqRyxPQUFPLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRWpGLE9BQU8sRUFBRSxZQUFZLEVBQW1DLG9CQUFvQixFQUFFLDBCQUEwQixFQUFvQixNQUFNLHNDQUFzQyxDQUFDO0FBQ3pLLE9BQU8sRUFBZ0Isb0JBQW9CLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUU3RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUd6RSxPQUFPLEVBQStCLGdCQUFnQixFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQzlFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUNwRCxPQUFPLEVBQUUsY0FBYyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQ3JFLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDekQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEw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