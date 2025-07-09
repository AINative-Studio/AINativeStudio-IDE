/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { n } from '../../../../../../../base/browser/dom.js';
import { Emitter } from '../../../../../../../base/common/event.js';
import { Disposable } from '../../../../../../../base/common/lifecycle.js';
import { constObservable, derived, derivedObservableWithCache } from '../../../../../../../base/common/observable.js';
import { editorBackground } from '../../../../../../../platform/theme/common/colorRegistry.js';
import { asCssVariable } from '../../../../../../../platform/theme/common/colorUtils.js';
import { observableCodeEditor } from '../../../../../../browser/observableCodeEditor.js';
import { Rect } from '../../../../../../browser/rect.js';
import { OffsetRange } from '../../../../../../common/core/offsetRange.js';
import { Position } from '../../../../../../common/core/position.js';
import { getOriginalBorderColor, originalBackgroundColor } from '../theme.js';
import { getPrefixTrim, mapOutFalsy, maxContentWidthInRange } from '../utils/utils.js';
const HORIZONTAL_PADDING = 0;
const VERTICAL_PADDING = 0;
const BORDER_WIDTH = 1;
const WIDGET_SEPARATOR_WIDTH = 1;
const BORDER_RADIUS = 4;
export class InlineEditsDeletionView extends Disposable {
    constructor(_editor, _edit, _uiState, _tabAction) {
        super();
        this._editor = _editor;
        this._edit = _edit;
        this._uiState = _uiState;
        this._tabAction = _tabAction;
        this._onDidClick = this._register(new Emitter());
        this.onDidClick = this._onDidClick.event;
        this._display = derived(this, reader => !!this._uiState.read(reader) ? 'block' : 'none');
        this._editorMaxContentWidthInRange = derived(this, reader => {
            const originalDisplayRange = this._originalDisplayRange.read(reader);
            if (!originalDisplayRange) {
                return constObservable(0);
            }
            this._editorObs.versionId.read(reader);
            // Take the max value that we observed.
            // Reset when either the edit changes or the editor text version.
            return derivedObservableWithCache(this, (reader, lastValue) => {
                const maxWidth = maxContentWidthInRange(this._editorObs, originalDisplayRange, reader);
                return Math.max(maxWidth, lastValue ?? 0);
            });
        }).map((v, r) => v.read(r));
        this._maxPrefixTrim = derived(reader => {
            const state = this._uiState.read(reader);
            if (!state) {
                return { prefixTrim: 0, prefixLeftOffset: 0 };
            }
            return getPrefixTrim(state.deletions, state.originalRange, [], this._editor);
        });
        this._editorLayoutInfo = derived(this, (reader) => {
            const inlineEdit = this._edit.read(reader);
            if (!inlineEdit) {
                return null;
            }
            const state = this._uiState.read(reader);
            if (!state) {
                return null;
            }
            const editorLayout = this._editorObs.layoutInfo.read(reader);
            const horizontalScrollOffset = this._editorObs.scrollLeft.read(reader);
            const w = this._editorObs.getOption(52 /* EditorOption.fontInfo */).map(f => f.typicalHalfwidthCharacterWidth).read(reader);
            const right = editorLayout.contentLeft + Math.max(this._editorMaxContentWidthInRange.read(reader), w) - horizontalScrollOffset;
            const range = inlineEdit.originalLineRange;
            const selectionTop = this._originalVerticalStartPosition.read(reader) ?? this._editor.getTopForLineNumber(range.startLineNumber) - this._editorObs.scrollTop.read(reader);
            const selectionBottom = this._originalVerticalEndPosition.read(reader) ?? this._editor.getTopForLineNumber(range.endLineNumberExclusive) - this._editorObs.scrollTop.read(reader);
            const left = editorLayout.contentLeft + this._maxPrefixTrim.read(reader).prefixLeftOffset - horizontalScrollOffset;
            if (right <= left) {
                return null;
            }
            const codeRect = Rect.fromLeftTopRightBottom(left, selectionTop, right, selectionBottom).withMargin(VERTICAL_PADDING, HORIZONTAL_PADDING);
            return {
                codeRect,
                contentLeft: editorLayout.contentLeft,
            };
        }).recomputeInitiallyAndOnChange(this._store);
        this._originalOverlay = n.div({
            style: { pointerEvents: 'none', }
        }, derived(reader => {
            const layoutInfoObs = mapOutFalsy(this._editorLayoutInfo).read(reader);
            if (!layoutInfoObs) {
                return undefined;
            }
            // Create an overlay which hides the left hand side of the original overlay when it overflows to the left
            // such that there is a smooth transition at the edge of content left
            const overlayhider = layoutInfoObs.map(layoutInfo => Rect.fromLeftTopRightBottom(layoutInfo.contentLeft - BORDER_RADIUS - BORDER_WIDTH, layoutInfo.codeRect.top, layoutInfo.contentLeft, layoutInfo.codeRect.bottom));
            const overlayRect = derived(reader => {
                const rect = layoutInfoObs.read(reader).codeRect;
                const overlayHider = overlayhider.read(reader);
                return rect.intersectHorizontal(new OffsetRange(overlayHider.left, Number.MAX_SAFE_INTEGER));
            });
            const separatorRect = overlayRect.map(rect => rect.withMargin(WIDGET_SEPARATOR_WIDTH, WIDGET_SEPARATOR_WIDTH));
            return [
                n.div({
                    class: 'originalSeparatorDeletion',
                    style: {
                        ...separatorRect.read(reader).toStyles(),
                        borderRadius: `${BORDER_RADIUS}px`,
                        border: `${BORDER_WIDTH + WIDGET_SEPARATOR_WIDTH}px solid ${asCssVariable(editorBackground)}`,
                        boxSizing: 'border-box',
                    }
                }),
                n.div({
                    class: 'originalOverlayDeletion',
                    style: {
                        ...overlayRect.read(reader).toStyles(),
                        borderRadius: `${BORDER_RADIUS}px`,
                        border: getOriginalBorderColor(this._tabAction).map(bc => `${BORDER_WIDTH}px solid ${asCssVariable(bc)}`),
                        boxSizing: 'border-box',
                        backgroundColor: asCssVariable(originalBackgroundColor),
                    }
                }),
                n.div({
                    class: 'originalOverlayHiderDeletion',
                    style: {
                        ...overlayhider.read(reader).toStyles(),
                        backgroundColor: asCssVariable(editorBackground),
                    }
                })
            ];
        })).keepUpdated(this._store);
        this._nonOverflowView = n.div({
            class: 'inline-edits-view',
            style: {
                position: 'absolute',
                overflow: 'visible',
                top: '0px',
                left: '0px',
                zIndex: '0',
                display: this._display,
            },
        }, [
            [this._originalOverlay],
        ]).keepUpdated(this._store);
        this.isHovered = constObservable(false);
        this._editorObs = observableCodeEditor(this._editor);
        const originalStartPosition = derived(this, (reader) => {
            const inlineEdit = this._edit.read(reader);
            return inlineEdit ? new Position(inlineEdit.originalLineRange.startLineNumber, 1) : null;
        });
        const originalEndPosition = derived(this, (reader) => {
            const inlineEdit = this._edit.read(reader);
            return inlineEdit ? new Position(inlineEdit.originalLineRange.endLineNumberExclusive, 1) : null;
        });
        this._originalDisplayRange = this._uiState.map(s => s?.originalRange);
        this._originalVerticalStartPosition = this._editorObs.observePosition(originalStartPosition, this._store).map(p => p?.y);
        this._originalVerticalEndPosition = this._editorObs.observePosition(originalEndPosition, this._store).map(p => p?.y);
        this._register(this._editorObs.createOverlayWidget({
            domNode: this._nonOverflowView.element,
            position: constObservable(null),
            allowEditorOverflow: false,
            minContentWidthInPx: derived(reader => {
                const info = this._editorLayoutInfo.read(reader);
                if (info === null) {
                    return 0;
                }
                return info.codeRect.width;
            }),
        }));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lRWRpdHNEZWxldGlvblZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci92aWV3L2lubGluZUVkaXRzL2lubGluZUVkaXRzVmlld3MvaW5saW5lRWRpdHNEZWxldGlvblZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRTdELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDM0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsMEJBQTBCLEVBQWUsTUFBTSxnREFBZ0QsQ0FBQztBQUNuSSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUMvRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFFekYsT0FBTyxFQUF3QixvQkFBb0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUd6RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDM0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBSXJFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUM5RSxPQUFPLEVBQUUsYUFBYSxFQUFFLFdBQVcsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBRXZGLE1BQU0sa0JBQWtCLEdBQUcsQ0FBQyxDQUFDO0FBQzdCLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxDQUFDO0FBQzNCLE1BQU0sWUFBWSxHQUFHLENBQUMsQ0FBQztBQUN2QixNQUFNLHNCQUFzQixHQUFHLENBQUMsQ0FBQztBQUNqQyxNQUFNLGFBQWEsR0FBRyxDQUFDLENBQUM7QUFFeEIsTUFBTSxPQUFPLHVCQUF3QixTQUFRLFVBQVU7SUFZdEQsWUFDa0IsT0FBb0IsRUFDcEIsS0FBcUQsRUFDckQsUUFHSCxFQUNHLFVBQTRDO1FBRTdELEtBQUssRUFBRSxDQUFDO1FBUlMsWUFBTyxHQUFQLE9BQU8sQ0FBYTtRQUNwQixVQUFLLEdBQUwsS0FBSyxDQUFnRDtRQUNyRCxhQUFRLEdBQVIsUUFBUSxDQUdYO1FBQ0csZUFBVSxHQUFWLFVBQVUsQ0FBa0M7UUFqQjdDLGdCQUFXLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBZSxDQUFDLENBQUM7UUFDakUsZUFBVSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDO1FBZ0Q1QixhQUFRLEdBQUcsT0FBTyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUVwRixrQ0FBNkIsR0FBRyxPQUFPLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxFQUFFO1lBQ3ZFLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNyRSxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztnQkFDM0IsT0FBTyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDM0IsQ0FBQztZQUNELElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUV2Qyx1Q0FBdUM7WUFDdkMsaUVBQWlFO1lBQ2pFLE9BQU8sMEJBQTBCLENBQVMsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFO2dCQUNyRSxNQUFNLFFBQVEsR0FBRyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLG9CQUFvQixFQUFFLE1BQU0sQ0FBQyxDQUFDO2dCQUN2RixPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLFNBQVMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUMzQyxDQUFDLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVYLG1CQUFjLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQ2xELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3pDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDWixPQUFPLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRSxnQkFBZ0IsRUFBRSxDQUFDLEVBQUUsQ0FBQztZQUMvQyxDQUFDO1lBQ0QsT0FBTyxhQUFhLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsYUFBYSxFQUFFLEVBQUUsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDOUUsQ0FBQyxDQUFDLENBQUM7UUFFYyxzQkFBaUIsR0FBRyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDN0QsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDM0MsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUNqQixPQUFPLElBQUksQ0FBQztZQUNiLENBQUM7WUFDRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN6QyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ1osT0FBTyxJQUFJLENBQUM7WUFDYixDQUFDO1lBRUQsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzdELE1BQU0sc0JBQXNCLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3ZFLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxnQ0FBdUIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsOEJBQThCLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFFbkgsTUFBTSxLQUFLLEdBQUcsWUFBWSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsc0JBQXNCLENBQUM7WUFFL0gsTUFBTSxLQUFLLEdBQUcsVUFBVSxDQUFDLGlCQUFpQixDQUFDO1lBQzNDLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzFLLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsc0JBQXNCLENBQUMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFFbEwsTUFBTSxJQUFJLEdBQUcsWUFBWSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxnQkFBZ0IsR0FBRyxzQkFBc0IsQ0FBQztZQUVuSCxJQUFJLEtBQUssSUFBSSxJQUFJLEVBQUUsQ0FBQztnQkFDbkIsT0FBTyxJQUFJLENBQUM7WUFDYixDQUFDO1lBRUQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUksRUFBRSxZQUFZLEVBQUUsS0FBSyxFQUFFLGVBQWUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1lBRTFJLE9BQU87Z0JBQ04sUUFBUTtnQkFDUixXQUFXLEVBQUUsWUFBWSxDQUFDLFdBQVc7YUFDckMsQ0FBQztRQUNILENBQUMsQ0FBQyxDQUFDLDZCQUE2QixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUU3QixxQkFBZ0IsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDO1lBQ3pDLEtBQUssRUFBRSxFQUFFLGFBQWEsRUFBRSxNQUFNLEdBQUc7U0FDakMsRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDbkIsTUFBTSxhQUFhLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN2RSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7Z0JBQUMsT0FBTyxTQUFTLENBQUM7WUFBQyxDQUFDO1lBRXpDLHlHQUF5RztZQUN6RyxxRUFBcUU7WUFDckUsTUFBTSxZQUFZLEdBQUcsYUFBYSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FDL0UsVUFBVSxDQUFDLFdBQVcsR0FBRyxhQUFhLEdBQUcsWUFBWSxFQUNyRCxVQUFVLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFDdkIsVUFBVSxDQUFDLFdBQVcsRUFDdEIsVUFBVSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQzFCLENBQUMsQ0FBQztZQUVILE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRTtnQkFDcEMsTUFBTSxJQUFJLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLENBQUM7Z0JBQ2pELE1BQU0sWUFBWSxHQUFHLFlBQVksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQy9DLE9BQU8sSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksV0FBVyxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQztZQUM5RixDQUFDLENBQUMsQ0FBQztZQUVILE1BQU0sYUFBYSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLHNCQUFzQixFQUFFLHNCQUFzQixDQUFDLENBQUMsQ0FBQztZQUUvRyxPQUFPO2dCQUNOLENBQUMsQ0FBQyxHQUFHLENBQUM7b0JBQ0wsS0FBSyxFQUFFLDJCQUEyQjtvQkFDbEMsS0FBSyxFQUFFO3dCQUNOLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUU7d0JBQ3hDLFlBQVksRUFBRSxHQUFHLGFBQWEsSUFBSTt3QkFDbEMsTUFBTSxFQUFFLEdBQUcsWUFBWSxHQUFHLHNCQUFzQixZQUFZLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFO3dCQUM3RixTQUFTLEVBQUUsWUFBWTtxQkFDdkI7aUJBQ0QsQ0FBQztnQkFDRixDQUFDLENBQUMsR0FBRyxDQUFDO29CQUNMLEtBQUssRUFBRSx5QkFBeUI7b0JBQ2hDLEtBQUssRUFBRTt3QkFDTixHQUFHLFdBQVcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxFQUFFO3dCQUN0QyxZQUFZLEVBQUUsR0FBRyxhQUFhLElBQUk7d0JBQ2xDLE1BQU0sRUFBRSxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxZQUFZLFlBQVksYUFBYSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7d0JBQ3pHLFNBQVMsRUFBRSxZQUFZO3dCQUN2QixlQUFlLEVBQUUsYUFBYSxDQUFDLHVCQUF1QixDQUFDO3FCQUN2RDtpQkFDRCxDQUFDO2dCQUNGLENBQUMsQ0FBQyxHQUFHLENBQUM7b0JBQ0wsS0FBSyxFQUFFLDhCQUE4QjtvQkFDckMsS0FBSyxFQUFFO3dCQUNOLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUU7d0JBQ3ZDLGVBQWUsRUFBRSxhQUFhLENBQUMsZ0JBQWdCLENBQUM7cUJBQ2hEO2lCQUNELENBQUM7YUFDRixDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRVoscUJBQWdCLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQztZQUN6QyxLQUFLLEVBQUUsbUJBQW1CO1lBQzFCLEtBQUssRUFBRTtnQkFDTixRQUFRLEVBQUUsVUFBVTtnQkFDcEIsUUFBUSxFQUFFLFNBQVM7Z0JBQ25CLEdBQUcsRUFBRSxLQUFLO2dCQUNWLElBQUksRUFBRSxLQUFLO2dCQUNYLE1BQU0sRUFBRSxHQUFHO2dCQUNYLE9BQU8sRUFBRSxJQUFJLENBQUMsUUFBUTthQUN0QjtTQUNELEVBQUU7WUFDRixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQztTQUN2QixDQUFDLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUVuQixjQUFTLEdBQUcsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBMUozQyxJQUFJLENBQUMsVUFBVSxHQUFHLG9CQUFvQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUVyRCxNQUFNLHFCQUFxQixHQUFHLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUN0RCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUMzQyxPQUFPLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxRQUFRLENBQUMsVUFBVSxDQUFDLGlCQUFpQixDQUFDLGVBQWUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBQzFGLENBQUMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxtQkFBbUIsR0FBRyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDcEQsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDM0MsT0FBTyxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksUUFBUSxDQUFDLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBQ2pHLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHFCQUFxQixHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQ3RFLElBQUksQ0FBQyw4QkFBOEIsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxxQkFBcUIsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pILElBQUksQ0FBQyw0QkFBNEIsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxtQkFBbUIsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXJILElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxtQkFBbUIsQ0FBQztZQUNsRCxPQUFPLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE9BQU87WUFDdEMsUUFBUSxFQUFFLGVBQWUsQ0FBQyxJQUFJLENBQUM7WUFDL0IsbUJBQW1CLEVBQUUsS0FBSztZQUMxQixtQkFBbUIsRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7Z0JBQ3JDLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ2pELElBQUksSUFBSSxLQUFLLElBQUksRUFBRSxDQUFDO29CQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUFDLENBQUM7Z0JBQ2hDLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUM7WUFDNUIsQ0FBQyxDQUFDO1NBQ0YsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBaUlEIn0=