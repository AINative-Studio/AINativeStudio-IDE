/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { n } from '../../../../../../../base/browser/dom.js';
import { Emitter } from '../../../../../../../base/common/event.js';
import { Disposable } from '../../../../../../../base/common/lifecycle.js';
import { constObservable, derived } from '../../../../../../../base/common/observable.js';
import { asCssVariable } from '../../../../../../../platform/theme/common/colorUtils.js';
import { Point } from '../../../../../../browser/point.js';
import { Rect } from '../../../../../../browser/rect.js';
import { OffsetRange } from '../../../../../../common/core/offsetRange.js';
import { getModifiedBorderColor } from '../theme.js';
import { mapOutFalsy, rectToProps } from '../utils/utils.js';
export class InlineEditsWordInsertView extends Disposable {
    constructor(_editor, 
    /** Must be single-line in both sides */
    _edit, _tabAction) {
        super();
        this._editor = _editor;
        this._edit = _edit;
        this._tabAction = _tabAction;
        this._onDidClick = this._register(new Emitter());
        this.onDidClick = this._onDidClick.event;
        this._start = this._editor.observePosition(constObservable(this._edit.range.getStartPosition()), this._store);
        this._layout = derived(this, reader => {
            const start = this._start.read(reader);
            if (!start) {
                return undefined;
            }
            const contentLeft = this._editor.layoutInfoContentLeft.read(reader);
            const lineHeight = this._editor.getOption(68 /* EditorOption.lineHeight */).read(reader);
            const w = this._editor.getOption(52 /* EditorOption.fontInfo */).read(reader).typicalHalfwidthCharacterWidth;
            const width = this._edit.text.length * w + 5;
            const center = new Point(contentLeft + start.x + w / 2 - this._editor.scrollLeft.read(reader), start.y);
            const modified = Rect.fromLeftTopWidthHeight(center.x - width / 2, center.y + lineHeight + 5, width, lineHeight);
            const background = Rect.hull([Rect.fromPoint(center), modified]).withMargin(4);
            return {
                modified,
                center,
                background,
                lowerBackground: background.intersectVertical(new OffsetRange(modified.top - 2, Number.MAX_SAFE_INTEGER)),
            };
        });
        this._div = n.div({
            class: 'word-insert',
        }, [
            derived(reader => {
                const layout = mapOutFalsy(this._layout).read(reader);
                if (!layout) {
                    return [];
                }
                const modifiedBorderColor = asCssVariable(getModifiedBorderColor(this._tabAction).read(reader));
                return [
                    n.div({
                        style: {
                            position: 'absolute',
                            ...rectToProps(reader => layout.read(reader).lowerBackground),
                            borderRadius: '4px',
                            background: 'var(--vscode-editor-background)'
                        }
                    }, []),
                    n.div({
                        style: {
                            position: 'absolute',
                            ...rectToProps(reader => layout.read(reader).modified),
                            borderRadius: '4px',
                            padding: '0px',
                            textAlign: 'center',
                            background: 'var(--vscode-inlineEdit-modifiedChangedTextBackground)',
                            fontFamily: this._editor.getOption(51 /* EditorOption.fontFamily */),
                            fontSize: this._editor.getOption(54 /* EditorOption.fontSize */),
                            fontWeight: this._editor.getOption(55 /* EditorOption.fontWeight */),
                        }
                    }, [
                        this._edit.text,
                    ]),
                    n.div({
                        style: {
                            position: 'absolute',
                            ...rectToProps(reader => layout.read(reader).background),
                            borderRadius: '4px',
                            border: `1px solid ${modifiedBorderColor}`,
                            //background: 'rgba(122, 122, 122, 0.12)', looks better
                            background: 'var(--vscode-inlineEdit-wordReplacementView-background)',
                        }
                    }, []),
                    n.svg({
                        viewBox: '0 0 12 18',
                        width: 12,
                        height: 18,
                        fill: 'none',
                        style: {
                            position: 'absolute',
                            left: derived(reader => layout.read(reader).center.x - 9),
                            top: derived(reader => layout.read(reader).center.y + 4),
                            transform: 'scale(1.4, 1.4)',
                        }
                    }, [
                        n.svgElem('path', {
                            d: 'M5.06445 0H7.35759C7.35759 0 7.35759 8.47059 7.35759 11.1176C7.35759 13.7647 9.4552 18 13.4674 18C17.4795 18 -2.58445 18 0.281373 18C3.14719 18 5.06477 14.2941 5.06477 11.1176C5.06477 7.94118 5.06445 0 5.06445 0Z',
                            fill: 'var(--vscode-inlineEdit-modifiedChangedTextBackground)',
                        })
                    ])
                ];
            })
        ]).keepUpdated(this._store);
        this.isHovered = constObservable(false);
        this._register(this._editor.createOverlayWidget({
            domNode: this._div.element,
            minContentWidthInPx: constObservable(0),
            position: constObservable({ preference: { top: 0, left: 0 } }),
            allowEditorOverflow: false,
        }));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lRWRpdHNXb3JkSW5zZXJ0Vmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9pbmxpbmVDb21wbGV0aW9ucy9icm93c2VyL3ZpZXcvaW5saW5lRWRpdHMvaW5saW5lRWRpdHNWaWV3cy9pbmxpbmVFZGl0c1dvcmRJbnNlcnRWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUU3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDcEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFlLE1BQU0sZ0RBQWdELENBQUM7QUFDdkcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBRXpGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFekQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBRzNFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUNyRCxPQUFPLEVBQUUsV0FBVyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBRTdELE1BQU0sT0FBTyx5QkFBMEIsU0FBUSxVQUFVO0lBbUd4RCxZQUNrQixPQUE2QjtJQUM5Qyx3Q0FBd0M7SUFDdkIsS0FBcUIsRUFDckIsVUFBNEM7UUFFN0QsS0FBSyxFQUFFLENBQUM7UUFMUyxZQUFPLEdBQVAsT0FBTyxDQUFzQjtRQUU3QixVQUFLLEdBQUwsS0FBSyxDQUFn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