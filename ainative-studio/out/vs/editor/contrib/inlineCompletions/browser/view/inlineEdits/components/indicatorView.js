/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { addDisposableListener, h } from '../../../../../../../base/browser/dom.js';
import { renderIcon } from '../../../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { Codicon } from '../../../../../../../base/common/codicons.js';
import { Disposable } from '../../../../../../../base/common/lifecycle.js';
import { autorun, constObservable } from '../../../../../../../base/common/observable.js';
import { localize } from '../../../../../../../nls.js';
import { buttonBackground, buttonForeground, buttonSeparator } from '../../../../../../../platform/theme/common/colorRegistry.js';
import { registerColor } from '../../../../../../../platform/theme/common/colorUtils.js';
import { OffsetRange } from '../../../../../../common/core/offsetRange.js';
export const inlineEditIndicatorForeground = registerColor('inlineEdit.indicator.foreground', buttonForeground, localize('inlineEdit.indicator.foreground', 'Foreground color for the inline edit indicator.'));
export const inlineEditIndicatorBackground = registerColor('inlineEdit.indicator.background', buttonBackground, localize('inlineEdit.indicator.background', 'Background color for the inline edit indicator.'));
export const inlineEditIndicatorBorder = registerColor('inlineEdit.indicator.border', buttonSeparator, localize('inlineEdit.indicator.border', 'Border color for the inline edit indicator.'));
export class InlineEditsIndicator extends Disposable {
    constructor(_editorObs, _state, _model) {
        super();
        this._editorObs = _editorObs;
        this._state = _state;
        this._model = _model;
        this._indicator = h('div.inline-edits-view-indicator', {
            style: {
                position: 'absolute',
                overflow: 'visible',
                cursor: 'pointer',
            },
        }, [
            h('div.icon', {}, [
                renderIcon(Codicon.arrowLeft),
            ]),
            h('div.label', {}, [
                ' inline edit'
            ])
        ]);
        this.isHoverVisible = constObservable(false);
        this._register(addDisposableListener(this._indicator.root, 'click', () => {
            this._model.get()?.jump();
        }));
        this._register(this._editorObs.createOverlayWidget({
            domNode: this._indicator.root,
            position: constObservable(null),
            allowEditorOverflow: false,
            minContentWidthInPx: constObservable(0),
        }));
        this._register(autorun(reader => {
            const state = this._state.read(reader);
            if (!state) {
                this._indicator.root.style.visibility = 'hidden';
                return;
            }
            this._indicator.root.style.visibility = '';
            const i = this._editorObs.layoutInfo.read(reader);
            const range = new OffsetRange(0, i.height - 30);
            const topEdit = state.editTop;
            this._indicator.root.classList.toggle('top', topEdit < range.start);
            this._indicator.root.classList.toggle('bottom', topEdit > range.endExclusive);
            const showAnyway = state.showAlways;
            this._indicator.root.classList.toggle('visible', showAnyway);
            this._indicator.root.classList.toggle('contained', range.contains(topEdit));
            this._indicator.root.style.top = `${range.clip(topEdit)}px`;
            this._indicator.root.style.right = `${i.minimap.minimapWidth + i.verticalScrollbarWidth}px`;
        }));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kaWNhdG9yVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL2Jyb3dzZXIvdmlldy9pbmxpbmVFZGl0cy9jb21wb25lbnRzL2luZGljYXRvclZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLENBQUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUMxRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDdkUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQzNFLE9BQU8sRUFBZSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDdkcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ3ZELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxnQkFBZ0IsRUFBRSxlQUFlLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUNsSSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFFekYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBTzNFLE1BQU0sQ0FBQyxNQUFNLDZCQUE2QixHQUFHLGFBQWEsQ0FBQyxpQ0FBaUMsRUFBRSxnQkFBZ0IsRUFBRSxRQUFRLENBQUMsaUNBQWlDLEVBQUUsaURBQWlELENBQUMsQ0FBQyxDQUFDO0FBQ2hOLE1BQU0sQ0FBQyxNQUFNLDZCQUE2QixHQUFHLGFBQWEsQ0FBQyxpQ0FBaUMsRUFBRSxnQkFBZ0IsRUFBRSxRQUFRLENBQUMsaUNBQWlDLEVBQUUsaURBQWlELENB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