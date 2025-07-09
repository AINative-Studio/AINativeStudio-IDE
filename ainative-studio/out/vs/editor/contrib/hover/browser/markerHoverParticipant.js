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
import { isNonEmptyArray } from '../../../../base/common/arrays.js';
import { createCancelablePromise, disposableTimeout } from '../../../../base/common/async.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { basename } from '../../../../base/common/resources.js';
import { Range } from '../../../common/core/range.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { IMarkerDecorationsService } from '../../../common/services/markerDecorations.js';
import { ApplyCodeActionReason, getCodeActions, quickFixCommandId } from '../../codeAction/browser/codeAction.js';
import { CodeActionController } from '../../codeAction/browser/codeActionController.js';
import { CodeActionKind, CodeActionTriggerSource } from '../../codeAction/common/types.js';
import { MarkerController, NextMarkerAction } from '../../gotoError/browser/gotoError.js';
import { RenderedHoverParts } from './hoverTypes.js';
import * as nls from '../../../../nls.js';
import { IMarkerData, MarkerSeverity } from '../../../../platform/markers/common/markers.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { Progress } from '../../../../platform/progress/common/progress.js';
const $ = dom.$;
export class MarkerHover {
    constructor(owner, range, marker) {
        this.owner = owner;
        this.range = range;
        this.marker = marker;
    }
    isValidForHoverAnchor(anchor) {
        return (anchor.type === 1 /* HoverAnchorType.Range */
            && this.range.startColumn <= anchor.range.startColumn
            && this.range.endColumn >= anchor.range.endColumn);
    }
}
const markerCodeActionTrigger = {
    type: 1 /* CodeActionTriggerType.Invoke */,
    filter: { include: CodeActionKind.QuickFix },
    triggerAction: CodeActionTriggerSource.QuickFixHover
};
let MarkerHoverParticipant = class MarkerHoverParticipant {
    constructor(_editor, _markerDecorationsService, _openerService, _languageFeaturesService) {
        this._editor = _editor;
        this._markerDecorationsService = _markerDecorationsService;
        this._openerService = _openerService;
        this._languageFeaturesService = _languageFeaturesService;
        this.hoverOrdinal = 1;
        this.recentMarkerCodeActionsInfo = undefined;
    }
    computeSync(anchor, lineDecorations) {
        if (!this._editor.hasModel() || anchor.type !== 1 /* HoverAnchorType.Range */ && !anchor.supportsMarkerHover) {
            return [];
        }
        const model = this._editor.getModel();
        const lineNumber = anchor.range.startLineNumber;
        const maxColumn = model.getLineMaxColumn(lineNumber);
        const result = [];
        for (const d of lineDecorations) {
            const startColumn = (d.range.startLineNumber === lineNumber) ? d.range.startColumn : 1;
            const endColumn = (d.range.endLineNumber === lineNumber) ? d.range.endColumn : maxColumn;
            const marker = this._markerDecorationsService.getMarker(model.uri, d);
            if (!marker) {
                continue;
            }
            const range = new Range(anchor.range.startLineNumber, startColumn, anchor.range.startLineNumber, endColumn);
            result.push(new MarkerHover(this, range, marker));
        }
        return result;
    }
    renderHoverParts(context, hoverParts) {
        if (!hoverParts.length) {
            return new RenderedHoverParts([]);
        }
        const renderedHoverParts = [];
        hoverParts.forEach(hoverPart => {
            const renderedMarkerHover = this._renderMarkerHover(hoverPart);
            context.fragment.appendChild(renderedMarkerHover.hoverElement);
            renderedHoverParts.push(renderedMarkerHover);
        });
        const markerHoverForStatusbar = hoverParts.length === 1 ? hoverParts[0] : hoverParts.sort((a, b) => MarkerSeverity.compare(a.marker.severity, b.marker.severity))[0];
        const disposables = this._renderMarkerStatusbar(context, markerHoverForStatusbar);
        return new RenderedHoverParts(renderedHoverParts, disposables);
    }
    getAccessibleContent(hoverPart) {
        return hoverPart.marker.message;
    }
    _renderMarkerHover(markerHover) {
        const disposables = new DisposableStore();
        const hoverElement = $('div.hover-row');
        const markerElement = dom.append(hoverElement, $('div.marker.hover-contents'));
        const { source, message, code, relatedInformation } = markerHover.marker;
        this._editor.applyFontInfo(markerElement);
        const messageElement = dom.append(markerElement, $('span'));
        messageElement.style.whiteSpace = 'pre-wrap';
        messageElement.innerText = message;
        if (source || code) {
            // Code has link
            if (code && typeof code !== 'string') {
                const sourceAndCodeElement = $('span');
                if (source) {
                    const sourceElement = dom.append(sourceAndCodeElement, $('span'));
                    sourceElement.innerText = source;
                }
                const codeLink = dom.append(sourceAndCodeElement, $('a.code-link'));
                codeLink.setAttribute('href', code.target.toString(true));
                disposables.add(dom.addDisposableListener(codeLink, 'click', (e) => {
                    this._openerService.open(code.target, { allowCommands: true });
                    e.preventDefault();
                    e.stopPropagation();
                }));
                const codeElement = dom.append(codeLink, $('span'));
                codeElement.innerText = code.value;
                const detailsElement = dom.append(markerElement, sourceAndCodeElement);
                detailsElement.style.opacity = '0.6';
                detailsElement.style.paddingLeft = '6px';
            }
            else {
                const detailsElement = dom.append(markerElement, $('span'));
                detailsElement.style.opacity = '0.6';
                detailsElement.style.paddingLeft = '6px';
                detailsElement.innerText = source && code ? `${source}(${code})` : source ? source : `(${code})`;
            }
        }
        if (isNonEmptyArray(relatedInformation)) {
            for (const { message, resource, startLineNumber, startColumn } of relatedInformation) {
                const relatedInfoContainer = dom.append(markerElement, $('div'));
                relatedInfoContainer.style.marginTop = '8px';
                const a = dom.append(relatedInfoContainer, $('a'));
                a.innerText = `${basename(resource)}(${startLineNumber}, ${startColumn}): `;
                a.style.cursor = 'pointer';
                disposables.add(dom.addDisposableListener(a, 'click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (this._openerService) {
                        const editorOptions = { selection: { startLineNumber, startColumn } };
                        this._openerService.open(resource, {
                            fromUserGesture: true,
                            editorOptions
                        }).catch(onUnexpectedError);
                    }
                }));
                const messageElement = dom.append(relatedInfoContainer, $('span'));
                messageElement.innerText = message;
                this._editor.applyFontInfo(messageElement);
            }
        }
        const renderedHoverPart = {
            hoverPart: markerHover,
            hoverElement,
            dispose: () => disposables.dispose()
        };
        return renderedHoverPart;
    }
    _renderMarkerStatusbar(context, markerHover) {
        const disposables = new DisposableStore();
        if (markerHover.marker.severity === MarkerSeverity.Error || markerHover.marker.severity === MarkerSeverity.Warning || markerHover.marker.severity === MarkerSeverity.Info) {
            const markerController = MarkerController.get(this._editor);
            if (markerController) {
                context.statusBar.addAction({
                    label: nls.localize('view problem', "View Problem"),
                    commandId: NextMarkerAction.ID,
                    run: () => {
                        context.hide();
                        markerController.showAtMarker(markerHover.marker);
                        this._editor.focus();
                    }
                });
            }
        }
        if (!this._editor.getOption(96 /* EditorOption.readOnly */)) {
            const quickfixPlaceholderElement = context.statusBar.append($('div'));
            if (this.recentMarkerCodeActionsInfo) {
                if (IMarkerData.makeKey(this.recentMarkerCodeActionsInfo.marker) === IMarkerData.makeKey(markerHover.marker)) {
                    if (!this.recentMarkerCodeActionsInfo.hasCodeActions) {
                        quickfixPlaceholderElement.textContent = nls.localize('noQuickFixes', "No quick fixes available");
                    }
                }
                else {
                    this.recentMarkerCodeActionsInfo = undefined;
                }
            }
            const updatePlaceholderDisposable = this.recentMarkerCodeActionsInfo && !this.recentMarkerCodeActionsInfo.hasCodeActions ? Disposable.None : disposableTimeout(() => quickfixPlaceholderElement.textContent = nls.localize('checkingForQuickFixes', "Checking for quick fixes..."), 200, disposables);
            if (!quickfixPlaceholderElement.textContent) {
                // Have some content in here to avoid flickering
                quickfixPlaceholderElement.textContent = String.fromCharCode(0xA0); // &nbsp;
            }
            const codeActionsPromise = this.getCodeActions(markerHover.marker);
            disposables.add(toDisposable(() => codeActionsPromise.cancel()));
            codeActionsPromise.then(actions => {
                updatePlaceholderDisposable.dispose();
                this.recentMarkerCodeActionsInfo = { marker: markerHover.marker, hasCodeActions: actions.validActions.length > 0 };
                if (!this.recentMarkerCodeActionsInfo.hasCodeActions) {
                    actions.dispose();
                    quickfixPlaceholderElement.textContent = nls.localize('noQuickFixes', "No quick fixes available");
                    return;
                }
                quickfixPlaceholderElement.style.display = 'none';
                let showing = false;
                disposables.add(toDisposable(() => {
                    if (!showing) {
                        actions.dispose();
                    }
                }));
                context.statusBar.addAction({
                    label: nls.localize('quick fixes', "Quick Fix..."),
                    commandId: quickFixCommandId,
                    run: (target) => {
                        showing = true;
                        const controller = CodeActionController.get(this._editor);
                        const elementPosition = dom.getDomNodePagePosition(target);
                        // Hide the hover pre-emptively, otherwise the editor can close the code actions
                        // context menu as well when using keyboard navigation
                        context.hide();
                        controller?.showCodeActions(markerCodeActionTrigger, actions, {
                            x: elementPosition.left,
                            y: elementPosition.top,
                            width: elementPosition.width,
                            height: elementPosition.height
                        });
                    }
                });
                const aiCodeAction = actions.validActions.find(action => action.action.isAI);
                if (aiCodeAction) {
                    context.statusBar.addAction({
                        label: aiCodeAction.action.title,
                        commandId: aiCodeAction.action.command?.id ?? '',
                        run: () => {
                            const controller = CodeActionController.get(this._editor);
                            controller?.applyCodeAction(aiCodeAction, false, false, ApplyCodeActionReason.FromProblemsHover);
                        }
                    });
                }
            }, onUnexpectedError);
        }
        return disposables;
    }
    getCodeActions(marker) {
        return createCancelablePromise(cancellationToken => {
            return getCodeActions(this._languageFeaturesService.codeActionProvider, this._editor.getModel(), new Range(marker.startLineNumber, marker.startColumn, marker.endLineNumber, marker.endColumn), markerCodeActionTrigger, Progress.None, cancellationToken);
        });
    }
};
MarkerHoverParticipant = __decorate([
    __param(1, IMarkerDecorationsService),
    __param(2, IOpenerService),
    __param(3, ILanguageFeaturesService)
], MarkerHoverParticipant);
export { MarkerHoverParticipant };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2VySG92ZXJQYXJ0aWNpcGFudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9ob3Zlci9icm93c2VyL21hcmtlckhvdmVyUGFydGljaXBhbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDcEUsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2pILE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzlHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUdoRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFHdEQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDeEYsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDMUYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLGNBQWMsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2xILE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxjQUFjLEVBQW9DLHVCQUF1QixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDN0gsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGdCQUFnQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDMUYs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