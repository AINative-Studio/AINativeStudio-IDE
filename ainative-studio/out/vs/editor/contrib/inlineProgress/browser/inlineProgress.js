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
import { disposableTimeout } from '../../../../base/common/async.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { noBreakWhitespace } from '../../../../base/common/strings.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import './inlineProgressWidget.css';
import { Range } from '../../../common/core/range.js';
import { ModelDecorationOptions } from '../../../common/model/textModel.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
const inlineProgressDecoration = ModelDecorationOptions.register({
    description: 'inline-progress-widget',
    stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
    showIfCollapsed: true,
    after: {
        content: noBreakWhitespace,
        inlineClassName: 'inline-editor-progress-decoration',
        inlineClassNameAffectsLetterSpacing: true,
    }
});
class InlineProgressWidget extends Disposable {
    static { this.baseId = 'editor.widget.inlineProgressWidget'; }
    constructor(typeId, editor, range, title, delegate) {
        super();
        this.typeId = typeId;
        this.editor = editor;
        this.range = range;
        this.delegate = delegate;
        this.allowEditorOverflow = false;
        this.suppressMouseDown = true;
        this.create(title);
        this.editor.addContentWidget(this);
        this.editor.layoutContentWidget(this);
    }
    create(title) {
        this.domNode = dom.$('.inline-progress-widget');
        this.domNode.role = 'button';
        this.domNode.title = title;
        const iconElement = dom.$('span.icon');
        this.domNode.append(iconElement);
        iconElement.classList.add(...ThemeIcon.asClassNameArray(Codicon.loading), 'codicon-modifier-spin');
        const updateSize = () => {
            const lineHeight = this.editor.getOption(68 /* EditorOption.lineHeight */);
            this.domNode.style.height = `${lineHeight}px`;
            this.domNode.style.width = `${Math.ceil(0.8 * lineHeight)}px`;
        };
        updateSize();
        this._register(this.editor.onDidChangeConfiguration(c => {
            if (c.hasChanged(54 /* EditorOption.fontSize */) || c.hasChanged(68 /* EditorOption.lineHeight */)) {
                updateSize();
            }
        }));
        this._register(dom.addDisposableListener(this.domNode, dom.EventType.CLICK, e => {
            this.delegate.cancel();
        }));
    }
    getId() {
        return InlineProgressWidget.baseId + '.' + this.typeId;
    }
    getDomNode() {
        return this.domNode;
    }
    getPosition() {
        return {
            position: { lineNumber: this.range.startLineNumber, column: this.range.startColumn },
            preference: [0 /* ContentWidgetPositionPreference.EXACT */]
        };
    }
    dispose() {
        super.dispose();
        this.editor.removeContentWidget(this);
    }
}
let InlineProgressManager = class InlineProgressManager extends Disposable {
    constructor(id, _editor, _instantiationService) {
        super();
        this.id = id;
        this._editor = _editor;
        this._instantiationService = _instantiationService;
        /** Delay before showing the progress widget */
        this._showDelay = 500; // ms
        this._showPromise = this._register(new MutableDisposable());
        this._currentWidget = this._register(new MutableDisposable());
        this._operationIdPool = 0;
        this._currentDecorations = _editor.createDecorationsCollection();
    }
    dispose() {
        super.dispose();
        this._currentDecorations.clear();
    }
    async showWhile(position, title, promise, delegate, delayOverride) {
        const operationId = this._operationIdPool++;
        this._currentOperation = operationId;
        this.clear();
        this._showPromise.value = disposableTimeout(() => {
            const range = Range.fromPositions(position);
            const decorationIds = this._currentDecorations.set([{
                    range: range,
                    options: inlineProgressDecoration,
                }]);
            if (decorationIds.length > 0) {
                this._currentWidget.value = this._instantiationService.createInstance(InlineProgressWidget, this.id, this._editor, range, title, delegate);
            }
        }, delayOverride ?? this._showDelay);
        try {
            return await promise;
        }
        finally {
            if (this._currentOperation === operationId) {
                this.clear();
                this._currentOperation = undefined;
            }
        }
    }
    clear() {
        this._showPromise.clear();
        this._currentDecorations.clear();
        this._currentWidget.clear();
    }
};
InlineProgressManager = __decorate([
    __param(2, IInstantiationService)
], InlineProgressManager);
export { InlineProgressManager };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lUHJvZ3Jlc3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lUHJvZ3Jlc3MvYnJvd3Nlci9pbmxpbmVQcm9ncmVzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDckYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDdkUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pFLE9BQU8sNEJBQTRCLENBQUM7QUFJcEMsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBR3RELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRW5HLE1BQU0sd0JBQXdCLEdBQUcsc0JBQXNCLENBQUMsUUFBUSxDQUFDO0lBQ2hFLFdBQVcsRUFBRSx3QkFBd0I7SUFDckMsVUFBVSw0REFBb0Q7SUFDOUQsZUFBZSxFQUFFLElBQUk7SUFDckIsS0FBSyxFQUFFO1FBQ04sT0FBTyxFQUFFLGlCQUFpQjtRQUMxQixlQUFlLEVBQUUsbUNBQW1DO1FBQ3BELG1DQUFtQyxFQUFFLElBQUk7S0FDekM7Q0FDRCxDQUFDLENBQUM7QUFHSCxNQUFNLG9CQUFxQixTQUFRLFVB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