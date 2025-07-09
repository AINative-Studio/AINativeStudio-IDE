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
import * as dom from '../../../../base/browser/dom.js';
import { asArray, compareBy, numberComparator } from '../../../../base/common/arrays.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { isEmptyMarkdownString, MarkdownString } from '../../../../base/common/htmlContent.js';
import { DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { MarkdownRenderer } from '../../../browser/widget/markdownRenderer/browser/markdownRenderer.js';
import { DECREASE_HOVER_VERBOSITY_ACTION_ID, INCREASE_HOVER_VERBOSITY_ACTION_ID } from './hoverActionIds.js';
import { Range } from '../../../common/core/range.js';
import { ILanguageService } from '../../../common/languages/language.js';
import { RenderedHoverParts } from './hoverTypes.js';
import * as nls from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { HoverVerbosityAction } from '../../../common/languages.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { onUnexpectedExternalError } from '../../../../base/common/errors.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ClickAction, KeyDownAction } from '../../../../base/browser/ui/hover/hoverWidget.js';
import { IHoverService, WorkbenchHoverDelegate } from '../../../../platform/hover/browser/hover.js';
import { AsyncIterableObject } from '../../../../base/common/async.js';
import { getHoverProviderResultsAsAsyncIterable } from './getHover.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
const $ = dom.$;
const increaseHoverVerbosityIcon = registerIcon('hover-increase-verbosity', Codicon.add, nls.localize('increaseHoverVerbosity', 'Icon for increaseing hover verbosity.'));
const decreaseHoverVerbosityIcon = registerIcon('hover-decrease-verbosity', Codicon.remove, nls.localize('decreaseHoverVerbosity', 'Icon for decreasing hover verbosity.'));
export class MarkdownHover {
    constructor(owner, range, contents, isBeforeContent, ordinal, source = undefined) {
        this.owner = owner;
        this.range = range;
        this.contents = contents;
        this.isBeforeContent = isBeforeContent;
        this.ordinal = ordinal;
        this.source = source;
    }
    isValidForHoverAnchor(anchor) {
        return (anchor.type === 1 /* HoverAnchorType.Range */
            && this.range.startColumn <= anchor.range.startColumn
            && this.range.endColumn >= anchor.range.endColumn);
    }
}
class HoverSource {
    constructor(hover, hoverProvider, hoverPosition) {
        this.hover = hover;
        this.hoverProvider = hoverProvider;
        this.hoverPosition = hoverPosition;
    }
    supportsVerbosityAction(hoverVerbosityAction) {
        switch (hoverVerbosityAction) {
            case HoverVerbosityAction.Increase:
                return this.hover.canIncreaseVerbosity ?? false;
            case HoverVerbosityAction.Decrease:
                return this.hover.canDecreaseVerbosity ?? false;
        }
    }
}
let MarkdownHoverParticipant = class MarkdownHoverParticipant {
    constructor(_editor, _languageService, _openerService, _configurationService, _languageFeaturesService, _keybindingService, _hoverService, _commandService) {
        this._editor = _editor;
        this._languageService = _languageService;
        this._openerService = _openerService;
        this._configurationService = _configurationService;
        this._languageFeaturesService = _languageFeaturesService;
        this._keybindingService = _keybindingService;
        this._hoverService = _hoverService;
        this._commandService = _commandService;
        this.hoverOrdinal = 3;
    }
    createLoadingMessage(anchor) {
        return new MarkdownHover(this, anchor.range, [new MarkdownString().appendText(nls.localize('modesContentHover.loading', "Loading..."))], false, 2000);
    }
    computeSync(anchor, lineDecorations) {
        if (!this._editor.hasModel() || anchor.type !== 1 /* HoverAnchorType.Range */) {
            return [];
        }
        const model = this._editor.getModel();
        const lineNumber = anchor.range.startLineNumber;
        const maxColumn = model.getLineMaxColumn(lineNumber);
        const result = [];
        let index = 1000;
        const lineLength = model.getLineLength(lineNumber);
        const languageId = model.getLanguageIdAtPosition(anchor.range.startLineNumber, anchor.range.startColumn);
        const stopRenderingLineAfter = this._editor.getOption(122 /* EditorOption.stopRenderingLineAfter */);
        const maxTokenizationLineLength = this._configurationService.getValue('editor.maxTokenizationLineLength', {
            overrideIdentifier: languageId
        });
        let stopRenderingMessage = false;
        if (stopRenderingLineAfter >= 0 && lineLength > stopRenderingLineAfter && anchor.range.startColumn >= stopRenderingLineAfter) {
            stopRenderingMessage = true;
            result.push(new MarkdownHover(this, anchor.range, [{
                    value: nls.localize('stopped rendering', "Rendering paused for long line for performance reasons. This can be configured via `editor.stopRenderingLineAfter`.")
                }], false, index++));
        }
        if (!stopRenderingMessage && typeof maxTokenizationLineLength === 'number' && lineLength >= maxTokenizationLineLength) {
            result.push(new MarkdownHover(this, anchor.range, [{
                    value: nls.localize('too many characters', "Tokenization is skipped for long lines for performance reasons. This can be configured via `editor.maxTokenizationLineLength`.")
                }], false, index++));
        }
        let isBeforeContent = false;
        for (const d of lineDecorations) {
            const startColumn = (d.range.startLineNumber === lineNumber) ? d.range.startColumn : 1;
            const endColumn = (d.range.endLineNumber === lineNumber) ? d.range.endColumn : maxColumn;
            const hoverMessage = d.options.hoverMessage;
            if (!hoverMessage || isEmptyMarkdownString(hoverMessage)) {
                continue;
            }
            if (d.options.beforeContentClassName) {
                isBeforeContent = true;
            }
            const range = new Range(anchor.range.startLineNumber, startColumn, anchor.range.startLineNumber, endColumn);
            result.push(new MarkdownHover(this, range, asArray(hoverMessage), isBeforeContent, index++));
        }
        return result;
    }
    computeAsync(anchor, lineDecorations, source, token) {
        if (!this._editor.hasModel() || anchor.type !== 1 /* HoverAnchorType.Range */) {
            return AsyncIterableObject.EMPTY;
        }
        const model = this._editor.getModel();
        const hoverProviderRegistry = this._languageFeaturesService.hoverProvider;
        if (!hoverProviderRegistry.has(model)) {
            return AsyncIterableObject.EMPTY;
        }
        const markdownHovers = this._getMarkdownHovers(hoverProviderRegistry, model, anchor, token);
        return markdownHovers;
    }
    _getMarkdownHovers(hoverProviderRegistry, model, anchor, token) {
        const position = anchor.range.getStartPosition();
        const hoverProviderResults = getHoverProviderResultsAsAsyncIterable(hoverProviderRegistry, model, position, token);
        const markdownHovers = hoverProviderResults.filter(item => !isEmptyMarkdownString(item.hover.contents))
            .map(item => {
            const range = item.hover.range ? Range.lift(item.hover.range) : anchor.range;
            const hoverSource = new HoverSource(item.hover, item.provider, position);
            return new MarkdownHover(this, range, item.hover.contents, false, item.ordinal, hoverSource);
        });
        return markdownHovers;
    }
    renderHoverParts(context, hoverParts) {
        this._renderedHoverParts = new MarkdownRenderedHoverParts(hoverParts, context.fragment, this, this._editor, this._languageService, this._openerService, this._commandService, this._keybindingService, this._hoverService, this._configurationService, context.onContentsChanged);
        return this._renderedHoverParts;
    }
    handleScroll(e) {
        this._renderedHoverParts?.handleScroll(e);
    }
    getAccessibleContent(hoverPart) {
        return this._renderedHoverParts?.getAccessibleContent(hoverPart) ?? '';
    }
    doesMarkdownHoverAtIndexSupportVerbosityAction(index, action) {
        return this._renderedHoverParts?.doesMarkdownHoverAtIndexSupportVerbosityAction(index, action) ?? false;
    }
    updateMarkdownHoverVerbosityLevel(action, index) {
        return Promise.resolve(this._renderedHoverParts?.updateMarkdownHoverPartVerbosityLevel(action, index));
    }
};
MarkdownHoverParticipant = __decorate([
    __param(1, ILanguageService),
    __param(2, IOpenerService),
    __param(3, IConfigurationService),
    __param(4, ILanguageFeaturesService),
    __param(5, IKeybindingService),
    __param(6, IHoverService),
    __param(7, ICommandService)
], MarkdownHoverParticipant);
export { MarkdownHoverParticipant };
class RenderedMarkdownHoverPart {
    constructor(hoverPart, hoverElement, disposables, actionsContainer) {
        this.hoverPart = hoverPart;
        this.hoverElement = hoverElement;
        this.disposables = disposables;
        this.actionsContainer = actionsContainer;
    }
    get hoverAccessibleContent() {
        return this.hoverElement.innerText.trim();
    }
    dispose() {
        this.disposables.dispose();
    }
}
class MarkdownRenderedHoverParts {
    constructor(hoverParts, hoverPartsContainer, _hoverParticipant, _editor, _languageService, _openerService, _commandService, _keybindingService, _hoverService, _configurationService, _onFinishedRendering) {
        this._hoverParticipant = _hoverParticipant;
        this._editor = _editor;
        this._languageService = _languageService;
        this._openerService = _openerService;
        this._commandService = _commandService;
        this._keybindingService = _keybindingService;
        this._hoverService = _hoverService;
        this._configurationService = _configurationService;
        this._onFinishedRendering = _onFinishedRendering;
        this._ongoingHoverOperations = new Map();
        this._disposables = new DisposableStore();
        this.renderedHoverParts = this._renderHoverParts(hoverParts, hoverPartsContainer, this._onFinishedRendering);
        this._disposables.add(toDisposable(() => {
            this.renderedHoverParts.forEach(renderedHoverPart => {
                renderedHoverPart.dispose();
            });
            this._ongoingHoverOperations.forEach(operation => {
                operation.tokenSource.dispose(true);
            });
        }));
    }
    _renderHoverParts(hoverParts, hoverPartsContainer, onFinishedRendering) {
        hoverParts.sort(compareBy(hover => hover.ordinal, numberComparator));
        return hoverParts.map(hoverPart => {
            const renderedHoverPart = this._renderHoverPart(hoverPart, onFinishedRendering);
            hoverPartsContainer.appendChild(renderedHoverPart.hoverElement);
            return renderedHoverPart;
        });
    }
    _renderHoverPart(hoverPart, onFinishedRendering) {
        const renderedMarkdownPart = this._renderMarkdownHover(hoverPart, onFinishedRendering);
        const renderedMarkdownElement = renderedMarkdownPart.hoverElement;
        const hoverSource = hoverPart.source;
        const disposables = new DisposableStore();
        disposables.add(renderedMarkdownPart);
        if (!hoverSource) {
            return new RenderedMarkdownHoverPart(hoverPart, renderedMarkdownElement, disposables);
        }
        const canIncreaseVerbosity = hoverSource.supportsVerbosityAction(HoverVerbosityAction.Increase);
        const canDecreaseVerbosity = hoverSource.supportsVerbosityAction(HoverVerbosityAction.Decrease);
        if (!canIncreaseVerbosity && !canDecreaseVerbosity) {
            return new RenderedMarkdownHoverPart(hoverPart, renderedMarkdownElement, disposables);
        }
        const actionsContainer = $('div.verbosity-actions');
        renderedMarkdownElement.prepend(actionsContainer);
        const actionsContainerInner = $('div.verbosity-actions-inner');
        actionsContainer.append(actionsContainerInner);
        disposables.add(this._renderHoverExpansionAction(actionsContainerInner, HoverVerbosityAction.Increase, canIncreaseVerbosity));
        disposables.add(this._renderHoverExpansionAction(actionsContainerInner, HoverVerbosityAction.Decrease, canDecreaseVerbosity));
        return new RenderedMarkdownHoverPart(hoverPart, renderedMarkdownElement, disposables, actionsContainerInner);
    }
    _renderMarkdownHover(markdownHover, onFinishedRendering) {
        const renderedMarkdownHover = renderMarkdownInContainer(this._editor, markdownHover, this._languageService, this._openerService, onFinishedRendering);
        return renderedMarkdownHover;
    }
    _renderHoverExpansionAction(container, action, actionEnabled) {
        const store = new DisposableStore();
        const isActionIncrease = action === HoverVerbosityAction.Increase;
        const actionElement = dom.append(container, $(ThemeIcon.asCSSSelector(isActionIncrease ? increaseHoverVerbosityIcon : decreaseHoverVerbosityIcon)));
        actionElement.tabIndex = 0;
        const hoverDelegate = new WorkbenchHoverDelegate('mouse', undefined, { target: container, position: { hoverPosition: 0 /* HoverPosition.LEFT */ } }, this._configurationService, this._hoverService);
        store.add(this._hoverService.setupManagedHover(hoverDelegate, actionElement, labelForHoverVerbosityAction(this._keybindingService, action)));
        if (!actionEnabled) {
            actionElement.classList.add('disabled');
            return store;
        }
        actionElement.classList.add('enabled');
        const actionFunction = () => this._commandService.executeCommand(action === HoverVerbosityAction.Increase ? INCREASE_HOVER_VERBOSITY_ACTION_ID : DECREASE_HOVER_VERBOSITY_ACTION_ID, { focus: true });
        store.add(new ClickAction(actionElement, actionFunction));
        store.add(new KeyDownAction(actionElement, actionFunction, [3 /* KeyCode.Enter */, 10 /* KeyCode.Space */]));
        return store;
    }
    handleScroll(e) {
        this.renderedHoverParts.forEach(renderedHoverPart => {
            const actionsContainerInner = renderedHoverPart.actionsContainer;
            if (!actionsContainerInner) {
                return;
            }
            const hoverElement = renderedHoverPart.hoverElement;
            const topOfHoverScrollPosition = e.scrollTop;
            const bottomOfHoverScrollPosition = topOfHoverScrollPosition + e.height;
            const topOfRenderedPart = hoverElement.offsetTop;
            const hoverElementHeight = hoverElement.clientHeight;
            const bottomOfRenderedPart = topOfRenderedPart + hoverElementHeight;
            const iconsHeight = 22;
            let top;
            if (bottomOfRenderedPart <= bottomOfHoverScrollPosition || topOfRenderedPart >= bottomOfHoverScrollPosition) {
                top = hoverElementHeight - iconsHeight;
            }
            else {
                top = bottomOfHoverScrollPosition - topOfRenderedPart - iconsHeight;
            }
            actionsContainerInner.style.top = `${top}px`;
        });
    }
    async updateMarkdownHoverPartVerbosityLevel(action, index) {
        const model = this._editor.getModel();
        if (!model) {
            return undefined;
        }
        const hoverRenderedPart = this._getRenderedHoverPartAtIndex(index);
        const hoverSource = hoverRenderedPart?.hoverPart.source;
        if (!hoverRenderedPart || !hoverSource?.supportsVerbosityAction(action)) {
            return undefined;
        }
        const newHover = await this._fetchHover(hoverSource, model, action);
        if (!newHover) {
            return undefined;
        }
        const newHoverSource = new HoverSource(newHover, hoverSource.hoverProvider, hoverSource.hoverPosition);
        const initialHoverPart = hoverRenderedPart.hoverPart;
        const newHoverPart = new MarkdownHover(this._hoverParticipant, initialHoverPart.range, newHover.contents, initialHoverPart.isBeforeContent, initialHoverPart.ordinal, newHoverSource);
        const newHoverRenderedPart = this._updateRenderedHoverPart(index, newHoverPart);
        if (!newHoverRenderedPart) {
            return undefined;
        }
        return {
            hoverPart: newHoverPart,
            hoverElement: newHoverRenderedPart.hoverElement
        };
    }
    getAccessibleContent(hoverPart) {
        const renderedHoverPartIndex = this.renderedHoverParts.findIndex(renderedHoverPart => renderedHoverPart.hoverPart === hoverPart);
        if (renderedHoverPartIndex === -1) {
            return undefined;
        }
        const renderedHoverPart = this._getRenderedHoverPartAtIndex(renderedHoverPartIndex);
        if (!renderedHoverPart) {
            return undefined;
        }
        const hoverElementInnerText = renderedHoverPart.hoverElement.innerText;
        const accessibleContent = hoverElementInnerText.replace(/[^\S\n\r]+/gu, ' ');
        return accessibleContent;
    }
    doesMarkdownHoverAtIndexSupportVerbosityAction(index, action) {
        const hoverRenderedPart = this._getRenderedHoverPartAtIndex(index);
        const hoverSource = hoverRenderedPart?.hoverPart.source;
        if (!hoverRenderedPart || !hoverSource?.supportsVerbosityAction(action)) {
            return false;
        }
        return true;
    }
    async _fetchHover(hoverSource, model, action) {
        let verbosityDelta = action === HoverVerbosityAction.Increase ? 1 : -1;
        const provider = hoverSource.hoverProvider;
        const ongoingHoverOperation = this._ongoingHoverOperations.get(provider);
        if (ongoingHoverOperation) {
            ongoingHoverOperation.tokenSource.cancel();
            verbosityDelta += ongoingHoverOperation.verbosityDelta;
        }
        const tokenSource = new CancellationTokenSource();
        this._ongoingHoverOperations.set(provider, { verbosityDelta, tokenSource });
        const context = { verbosityRequest: { verbosityDelta, previousHover: hoverSource.hover } };
        let hover;
        try {
            hover = await Promise.resolve(provider.provideHover(model, hoverSource.hoverPosition, tokenSource.token, context));
        }
        catch (e) {
            onUnexpectedExternalError(e);
        }
        tokenSource.dispose();
        this._ongoingHoverOperations.delete(provider);
        return hover;
    }
    _updateRenderedHoverPart(index, hoverPart) {
        if (index >= this.renderedHoverParts.length || index < 0) {
            return undefined;
        }
        const renderedHoverPart = this._renderHoverPart(hoverPart, this._onFinishedRendering);
        const currentRenderedHoverPart = this.renderedHoverParts[index];
        const currentRenderedMarkdown = currentRenderedHoverPart.hoverElement;
        const renderedMarkdown = renderedHoverPart.hoverElement;
        const renderedChildrenElements = Array.from(renderedMarkdown.children);
        currentRenderedMarkdown.replaceChildren(...renderedChildrenElements);
        const newRenderedHoverPart = new RenderedMarkdownHoverPart(hoverPart, currentRenderedMarkdown, renderedHoverPart.disposables, renderedHoverPart.actionsContainer);
        currentRenderedHoverPart.dispose();
        this.renderedHoverParts[index] = newRenderedHoverPart;
        return newRenderedHoverPart;
    }
    _getRenderedHoverPartAtIndex(index) {
        return this.renderedHoverParts[index];
    }
    dispose() {
        this._disposables.dispose();
    }
}
export function renderMarkdownHovers(context, markdownHovers, editor, languageService, openerService) {
    // Sort hover parts to keep them stable since they might come in async, out-of-order
    markdownHovers.sort(compareBy(hover => hover.ordinal, numberComparator));
    const renderedHoverParts = [];
    for (const markdownHover of markdownHovers) {
        renderedHoverParts.push(renderMarkdownInContainer(editor, markdownHover, languageService, openerService, context.onContentsChanged));
    }
    return new RenderedHoverParts(renderedHoverParts);
}
function renderMarkdownInContainer(editor, markdownHover, languageService, openerService, onFinishedRendering) {
    const disposables = new DisposableStore();
    const renderedMarkdown = $('div.hover-row');
    const renderedMarkdownContents = $('div.hover-row-contents');
    renderedMarkdown.appendChild(renderedMarkdownContents);
    const markdownStrings = markdownHover.contents;
    for (const markdownString of markdownStrings) {
        if (isEmptyMarkdownString(markdownString)) {
            continue;
        }
        const markdownHoverElement = $('div.markdown-hover');
        const hoverContentsElement = dom.append(markdownHoverElement, $('div.hover-contents'));
        const renderer = new MarkdownRenderer({ editor }, languageService, openerService);
        const renderedContents = disposables.add(renderer.render(markdownString, {
            asyncRenderCallback: () => {
                hoverContentsElement.className = 'hover-contents code-hover-contents';
                onFinishedRendering();
            }
        }));
        hoverContentsElement.appendChild(renderedContents.element);
        renderedMarkdownContents.appendChild(markdownHoverElement);
    }
    const renderedHoverPart = {
        hoverPart: markdownHover,
        hoverElement: renderedMarkdown,
        dispose() { disposables.dispose(); }
    };
    return renderedHoverPart;
}
export function labelForHoverVerbosityAction(keybindingService, action) {
    switch (action) {
        case HoverVerbosityAction.Increase: {
            const kb = keybindingService.lookupKeybinding(INCREASE_HOVER_VERBOSITY_ACTION_ID);
            return kb ?
                nls.localize('increaseVerbosityWithKb', "Increase Hover Verbosity ({0})", kb.getLabel()) :
                nls.localize('increaseVerbosity', "Increase Hover Verbosity");
        }
        case HoverVerbosityAction.Decrease: {
            const kb = keybindingService.lookupKeybinding(DECREASE_HOVER_VERBOSITY_ACTION_ID);
            return kb ?
                nls.localize('decreaseVerbosityWithKb', "Decrease Hover Verbosity ({0})", kb.getLabel()) :
                nls.localize('decreaseVerbosity', "Decrease Hover Verbosity");
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25Ib3ZlclBhcnRpY2lwYW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2hvdmVyL2Jyb3dzZXIvbWFya2Rvd25Ib3ZlclBhcnRpY2lwYW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN6RixPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckcsT0FBTyxFQUFtQixxQkFBcUIsRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNoSCxPQUFPLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHNFQUFzRSxDQUFDO0FBQ3hHLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBRzdHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUV0RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUN6RSxPQUFPLEVBQTJKLGtCQUFrQixFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDOU0sT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDOUUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1B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