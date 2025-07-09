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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kaWNhdG9yVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9pbmxpbmVDb21wbGV0aW9ucy9icm93c2VyL3ZpZXcvaW5saW5lRWRpdHMvY29tcG9uZW50cy9pbmRpY2F0b3JWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxDQUFDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNwRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOERBQThELENBQUM7QUFDMUYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUMzRSxPQUFPLEVBQWUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3ZHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUN2RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsZ0JBQWdCLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDbEksT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBRXpGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQU8zRSxNQUFNLENBQUMsTUFBTSw2QkFBNkIsR0FBRyxhQUFhLENBQUMsaUNBQWlDLEVBQUUsZ0JBQWdCLEVBQUUsUUFBUSxDQUFDLGlDQUFpQyxFQUFFLGlEQUFpRCxDQUFDLENBQUMsQ0FBQztBQUNoTixNQUFNLENBQUMsTUFBTSw2QkFBNkIsR0FBRyxhQUFhLENBQUMsaUNBQWlDLEVBQUUsZ0JBQWdCLEVBQUUsUUFBUSxDQUFDLGlDQUFpQyxFQUFFLGlEQUFpRCxDQUFDLENBQUMsQ0FBQztBQUNoTixNQUFNLENBQUMsTUFBTSx5QkFBeUIsR0FBRyxhQUFhLENBQUMsNkJBQTZCLEVBQUUsZUFBZSxFQUFFLFFBQVEsQ0FBQyw2QkFBNkIsRUFBRSw2Q0FBNkMsQ0FBQyxDQUFDLENBQUM7QUFFL0wsTUFBTSxPQUFPLG9CQUFxQixTQUFRLFVBQVU7SUFrQm5ELFlBQ2tCLFVBQWdDLEVBQ2hDLE1BQTJELEVBQzNELE1BQXVEO1FBRXhFLEtBQUssRUFBRSxDQUFDO1FBSlMsZUFBVSxHQUFWLFVBQVUsQ0FBc0I7UUFDaEMsV0FBTSxHQUFOLE1BQU0sQ0FBcUQ7UUFDM0QsV0FBTSxHQUFOLE1BQU0sQ0FBaUQ7UUFwQnhELGVBQVUsR0FBRyxDQUFDLENBQUMsaUNBQWlDLEVBQUU7WUFDbEUsS0FBSyxFQUFFO2dCQUNOLFFBQVEsRUFBRSxVQUFVO2dCQUNwQixRQUFRLEVBQUUsU0FBUztnQkFDbkIsTUFBTSxFQUFFLFNBQVM7YUFDakI7U0FDRCxFQUFFO1lBQ0YsQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFLEVBQUU7Z0JBQ2pCLFVBQVUsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDO2FBQzdCLENBQUM7WUFDRixDQUFDLENBQUMsV0FBVyxFQUFFLEVBQUUsRUFBRTtnQkFDbEIsY0FBYzthQUNkLENBQUM7U0FDRixDQUFDLENBQUM7UUFFSSxtQkFBYyxHQUFHLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQVM5QyxJQUFJLENBQUMsU0FBUyxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUU7WUFDeEUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQztRQUMzQixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLG1CQUFtQixDQUFDO1lBQ2xELE9BQU8sRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUk7WUFDN0IsUUFBUSxFQUFFLGVBQWUsQ0FBQyxJQUFJLENBQUM7WUFDL0IsbUJBQW1CLEVBQUUsS0FBSztZQUMxQixtQkFBbUIsRUFBRSxlQUFlLENBQUMsQ0FBQyxDQUFDO1NBQ3ZDLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDL0IsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDdkMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUNaLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUcsUUFBUSxDQUFDO2dCQUNqRCxPQUFPO1lBQ1IsQ0FBQztZQUVELElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUcsRUFBRSxDQUFDO1lBQzNDLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUVsRCxNQUFNLEtBQUssR0FBRyxJQUFJLFdBQVcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUMsQ0FBQztZQUVoRCxNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDO1lBQzlCLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLE9BQU8sR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDcEUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsT0FBTyxHQUFHLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUM5RSxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsVUFBVSxDQUFDO1lBQ3BDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBQzdELElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUU1RSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFHLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO1lBQzVELElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUMsc0JBQXNCLElBQUksQ0FBQztRQUM3RixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNEIn0=