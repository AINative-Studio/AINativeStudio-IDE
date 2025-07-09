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
var InlayHintsAccessibility_1;
import * as dom from '../../../../base/browser/dom.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { EditorAction2, registerEditorContribution } from '../../../../editor/browser/editorExtensions.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { asCommandLink } from '../../../../editor/contrib/inlayHints/browser/inlayHints.js';
import { InlayHintsController } from '../../../../editor/contrib/inlayHints/browser/inlayHintsController.js';
import { localize, localize2 } from '../../../../nls.js';
import { registerAction2 } from '../../../../platform/actions/common/actions.js';
import { AccessibilitySignal, IAccessibilitySignalService } from '../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Link } from '../../../../platform/opener/browser/link.js';
let InlayHintsAccessibility = class InlayHintsAccessibility {
    static { InlayHintsAccessibility_1 = this; }
    static { this.IsReading = new RawContextKey('isReadingLineWithInlayHints', false, { type: 'boolean', description: localize('isReadingLineWithInlayHints', "Whether the current line and its inlay hints are currently focused") }); }
    static { this.ID = 'editor.contrib.InlayHintsAccessibility'; }
    static get(editor) {
        return editor.getContribution(InlayHintsAccessibility_1.ID) ?? undefined;
    }
    constructor(_editor, contextKeyService, _accessibilitySignalService, _instaService) {
        this._editor = _editor;
        this._accessibilitySignalService = _accessibilitySignalService;
        this._instaService = _instaService;
        this._sessionDispoosables = new DisposableStore();
        this._ariaElement = document.createElement('span');
        this._ariaElement.style.position = 'fixed';
        this._ariaElement.className = 'inlayhint-accessibility-element';
        this._ariaElement.tabIndex = 0;
        this._ariaElement.setAttribute('aria-description', localize('description', "Code with Inlay Hint Information"));
        this._ctxIsReading = InlayHintsAccessibility_1.IsReading.bindTo(contextKeyService);
    }
    dispose() {
        this._sessionDispoosables.dispose();
        this._ctxIsReading.reset();
        this._ariaElement.remove();
    }
    _reset() {
        dom.clearNode(this._ariaElement);
        this._sessionDispoosables.clear();
        this._ctxIsReading.reset();
    }
    async _read(line, hints) {
        this._sessionDispoosables.clear();
        if (!this._ariaElement.isConnected) {
            this._editor.getDomNode()?.appendChild(this._ariaElement);
        }
        if (!this._editor.hasModel() || !this._ariaElement.isConnected) {
            this._ctxIsReading.set(false);
            return;
        }
        const cts = new CancellationTokenSource();
        this._sessionDispoosables.add(cts);
        for (const hint of hints) {
            await hint.resolve(cts.token);
        }
        if (cts.token.isCancellationRequested) {
            return;
        }
        const model = this._editor.getModel();
        // const text = this._editor.getModel().getLineContent(line);
        const newChildren = [];
        let start = 0;
        let tooLongToRead = false;
        for (const item of hints) {
            // text
            const part = model.getValueInRange({ startLineNumber: line, startColumn: start + 1, endLineNumber: line, endColumn: item.hint.position.column });
            if (part.length > 0) {
                newChildren.push(part);
                start = item.hint.position.column - 1;
            }
            // check length
            if (start > 750) {
                newChildren.push('…');
                tooLongToRead = true;
                break;
            }
            // hint
            const em = document.createElement('em');
            const { label } = item.hint;
            if (typeof label === 'string') {
                em.innerText = label;
            }
            else {
                for (const part of label) {
                    if (part.command) {
                        const link = this._instaService.createInstance(Link, em, { href: asCommandLink(part.command), label: part.label, title: part.command.title }, undefined);
                        this._sessionDispoosables.add(link);
                    }
                    else {
                        em.innerText += part.label;
                    }
                }
            }
            newChildren.push(em);
        }
        // trailing text
        if (!tooLongToRead) {
            newChildren.push(model.getValueInRange({ startLineNumber: line, startColumn: start + 1, endLineNumber: line, endColumn: Number.MAX_SAFE_INTEGER }));
        }
        dom.reset(this._ariaElement, ...newChildren);
        this._ariaElement.focus();
        this._ctxIsReading.set(true);
        // reset on blur
        this._sessionDispoosables.add(dom.addDisposableListener(this._ariaElement, 'focusout', () => {
            this._reset();
        }));
    }
    startInlayHintsReading() {
        if (!this._editor.hasModel()) {
            return;
        }
        const line = this._editor.getPosition().lineNumber;
        const hints = InlayHintsController.get(this._editor)?.getInlayHintsForLine(line);
        if (!hints || hints.length === 0) {
            this._accessibilitySignalService.playSignal(AccessibilitySignal.noInlayHints);
        }
        else {
            this._read(line, hints);
        }
    }
    stopInlayHintsReading() {
        this._reset();
        this._editor.focus();
    }
};
InlayHintsAccessibility = InlayHintsAccessibility_1 = __decorate([
    __param(1, IContextKeyService),
    __param(2, IAccessibilitySignalService),
    __param(3, IInstantiationService)
], InlayHintsAccessibility);
export { InlayHintsAccessibility };
registerAction2(class StartReadHints extends EditorAction2 {
    constructor() {
        super({
            id: 'inlayHints.startReadingLineWithHint',
            title: localize2('read.title', "Read Line with Inline Hints"),
            precondition: EditorContextKeys.hasInlayHintsProvider,
            f1: true
        });
    }
    runEditorCommand(_accessor, editor) {
        const ctrl = InlayHintsAccessibility.get(editor);
        ctrl?.startInlayHintsReading();
    }
});
registerAction2(class StopReadHints extends EditorAction2 {
    constructor() {
        super({
            id: 'inlayHints.stopReadingLineWithHint',
            title: localize2('stop.title', "Stop Inlay Hints Reading"),
            precondition: InlayHintsAccessibility.IsReading,
            f1: true,
            keybinding: {
                weight: 100 /* KeybindingWeight.EditorContrib */,
                primary: 9 /* KeyCode.Escape */
            }
        });
    }
    runEditorCommand(_accessor, editor) {
        const ctrl = InlayHintsAccessibility.get(editor);
        ctrl?.stopInlayHintsReading();
    }
});
registerEditorContribution(InlayHintsAccessibility.ID, InlayHintsAccessibility, 4 /* EditorContributionInstantiation.Lazy */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5sYXlIaW50c0FjY2Vzc2liaWx0eS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9pbmxheUhpbnRzL2Jyb3dzZXIvaW5sYXlIaW50c0FjY2Vzc2liaWx0eS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUVsRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFdkUsT0FBTyxFQUFFLGFBQWEsRUFBbUMsMEJBQTBCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUU1SSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNuRixPQUFPLEVBQWlCLGFBQWEsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQzNHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVFQUF1RSxDQUFDO0FBQzdHLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDekQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSwyQkFBMkIsRUFBRSxNQUFNLGdGQUFnRixDQUFDO0FBQ2xKLE9BQU8sRUFBZSxrQkFBa0IsRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN0SCxPQUFPLEVBQUUscUJBQXFCLEVBQW9CLE1BQU0sNERBQTRELENBQUM7QUFFckgsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBRzVELElBQU0sdUJBQXVCLEdBQTdCLE1BQU0sdUJBQXVCOzthQUVuQixjQUFTLEdBQUcsSUFBSSxhQUFhLENBQVUsNkJBQTZCLEVBQUUsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsUUFBUSxDQUFDLDZCQUE2QixFQUFFLG9FQUFvRSxDQUFDLEVBQUUsQ0FBQyxBQUFwTixDQUFxTjthQUU5TixPQUFFLEdBQVcsd0NBQXdDLEFBQW5ELENBQW9EO0lBRXRFLE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBbUI7UUFDN0IsT0FBTyxNQUFNLENBQUMsZUFBZSxDQUEwQix5QkFBdUIsQ0FBQyxFQUFFLENBQUMsSUFBSSxTQUFTLENBQUM7SUFDakcsQ0FBQztJQU9ELFlBQ2tCLE9BQW9CLEVBQ2pCLGlCQUFxQyxFQUM1QiwyQkFBeUUsRUFDL0UsYUFBcUQ7UUFIM0QsWUFBTyxHQUFQLE9BQU8sQ0FBYTtRQUVTLGdDQUEyQixHQUEzQiwyQkFBMkIsQ0FBNkI7UUFDOUQsa0JBQWEsR0FBYixhQUFhLENBQXVCO1FBTjVELHlCQUFvQixHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFRN0QsSUFBSSxDQUFDLFlBQVksR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ25ELElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUM7UUFDM0MsSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLEdBQUcsaUNBQWlDLENBQUM7UUFDaEUsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDO1FBQy9CLElBQUksQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDLGtCQUFrQixFQUFFLFFBQVEsQ0FBQyxhQUFhLEVBQUUsa0NBQWtDLENBQUMsQ0FBQyxDQUFDO1FBRWhILElBQUksQ0FBQyxhQUFhLEdBQUcseUJBQXVCLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ2xGLENBQUM7SUFFRCxPQUFPO1FBQ04sSUFBSSxDQUFDLG9CQUFvQixDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3BDLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDM0IsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUM1QixDQUFDO0lBRU8sTUFBTTtRQUNiLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ2pDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNsQyxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQzVCLENBQUM7SUFFTyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQVksRUFBRSxLQUFzQjtRQUV2RCxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxFQUFFLENBQUM7UUFFbEMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDcEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsRUFBRSxXQUFXLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQzNELENBQUM7UUFFRCxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDaEUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDOUIsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLEdBQUcsR0FBRyxJQUFJLHVCQUF1QixFQUFFLENBQUM7UUFDMUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUVuQyxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQzFCLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDL0IsQ0FBQztRQUVELElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO1lBQ3ZDLE9BQU87UUFDUixDQUFDO1FBQ0QsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUN0Qyw2REFBNkQ7UUFDN0QsTUFBTSxXQUFXLEdBQTZCLEVBQUUsQ0FBQztRQUVqRCxJQUFJLEtBQUssR0FBRyxDQUFDLENBQUM7UUFDZCxJQUFJLGFBQWEsR0FBRyxLQUFLLENBQUM7UUFFMUIsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUUxQixPQUFPO1lBQ1AsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLGVBQWUsQ0FBQyxFQUFFLGVBQWUsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLEtBQUssR0FBRyxDQUFDLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztZQUNqSixJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ3JCLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3ZCLEtBQUssR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1lBQ3ZDLENBQUM7WUFFRCxlQUFlO1lBQ2YsSUFBSSxLQUFLLEdBQUcsR0FBRyxFQUFFLENBQUM7Z0JBQ2pCLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ3RCLGFBQWEsR0FBRyxJQUFJLENBQUM7Z0JBQ3JCLE1BQU07WUFDUCxDQUFDO1lBRUQsT0FBTztZQUNQLE1BQU0sRUFBRSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDeEMsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7WUFDNUIsSUFBSSxPQUFPLEtBQUssS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDL0IsRUFBRSxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUM7WUFDdEIsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFLENBQUM7b0JBQzFCLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO3dCQUNsQixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUN0RCxFQUFFLElBQUksRUFBRSxhQUFhLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxFQUNuRixTQUFTLENBQ1QsQ0FBQzt3QkFDRixJQUFJLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUVyQyxDQUFDO3lCQUFNLENBQUM7d0JBQ1AsRUFBRSxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDO29CQUM1QixDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1lBQ0QsV0FBVyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN0QixDQUFDO1FBRUQsZ0JBQWdCO1FBQ2hCLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUNwQixXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsRUFBRSxlQUFlLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxLQUFLLEdBQUcsQ0FBQyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNySixDQUFDO1FBRUQsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLEdBQUcsV0FBVyxDQUFDLENBQUM7UUFDN0MsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUMxQixJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUU3QixnQkFBZ0I7UUFDaEIsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxVQUFVLEVBQUUsR0FBRyxFQUFFO1lBQzNGLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNmLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBSUQsc0JBQXNCO1FBQ3JCLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7WUFDOUIsT0FBTztRQUNSLENBQUM7UUFDRCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFDLFVBQVUsQ0FBQztRQUNuRCxNQUFNLEtBQUssR0FBRyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLG9CQUFvQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2pGLElBQUksQ0FBQyxLQUFLLElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNsQyxJQUFJLENBQUMsMkJBQTJCLENBQUMsVUFBVSxDQUFDLG1CQUFtQixDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQy9FLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDekIsQ0FBQztJQUNGLENBQUM7SUFFRCxxQkFBcUI7UUFDcEIsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ2QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUN0QixDQUFDOztBQS9JVyx1QkFBdUI7SUFpQmpDLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSwyQkFBMkIsQ0FBQTtJQUMzQixXQUFBLHFCQUFxQixDQUFBO0dBbkJYLHVCQUF1QixDQWdKbkM7O0FBR0QsZUFBZSxDQUFDLE1BQU0sY0FBZSxTQUFRLGFBQWE7SUFFekQ7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUscUNBQXFDO1lBQ3pDLEtBQUssRUFBRSxTQUFTLENBQUMsWUFBWSxFQUFFLDZCQUE2QixDQUFDO1lBQzdELFlBQVksRUFBRSxpQkFBaUIsQ0FBQyxxQkFBcUI7WUFDckQsRUFBRSxFQUFFLElBQUk7U0FDUixDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsZ0JBQWdCLENBQUMsU0FBMkIsRUFBRSxNQUFtQjtRQUNoRSxNQUFNLElBQUksR0FBRyx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDakQsSUFBSSxFQUFFLHNCQUFzQixFQUFFLENBQUM7SUFDaEMsQ0FBQztDQUNELENBQUMsQ0FBQztBQUVILGVBQWUsQ0FBQyxNQUFNLGFBQWMsU0FBUSxhQUFhO0lBRXhEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLG9DQUFvQztZQUN4QyxLQUFLLEVBQUUsU0FBUyxDQUFDLFlBQVksRUFBRSwwQkFBMEIsQ0FBQztZQUMxRCxZQUFZLEVBQUUsdUJBQXVCLENBQUMsU0FBUztZQUMvQyxFQUFFLEVBQUUsSUFBSTtZQUNSLFVBQVUsRUFBRTtnQkFDWCxNQUFNLDBDQUFnQztnQkFDdEMsT0FBTyx3QkFBZ0I7YUFDdkI7U0FDRCxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsZ0JBQWdCLENBQUMsU0FBMkIsRUFBRSxNQUFtQjtRQUNoRSxNQUFNLElBQUksR0FBRyx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDakQsSUFBSSxFQUFFLHFCQUFxQixFQUFFLENBQUM7SUFDL0IsQ0FBQztDQUNELENBQUMsQ0FBQztBQUVILDBCQUEwQixDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFBRSx1QkFBdUIsK0NBQXVDLENBQUMifQ==