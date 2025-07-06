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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lRWRpdHNXb3JkSW5zZXJ0Vmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL2Jyb3dzZXIvdmlldy9pbmxpbmVFZGl0cy9pbmxpbmVFZGl0c1ZpZXdzL2lubGluZUVkaXRzV29yZEluc2VydFZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRTdELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDM0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQWUsTUFBTSxnREFBZ0QsQ0FBQztBQUN2RyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFFekYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUV6RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFHM0UsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sYUFBYSxDQUFDO0FBQ3JELE9BQU8sRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFFN0QsTUFBTSxPQUFPLHlCQUEwQixTQUFRLFVBQVU7SUFtR3hELFlBQ2tCLE9BQTZCO0lBQzlDLHdDQUF3QztJQUN2QixLQUFxQixFQUNyQixVQUE0QztRQUU3RCxLQUFLLEVBQUUsQ0FBQztRQUxTLFlBQU8sR0FBUCxPQUFPLENBQXNCO1FBRTdCLFVBQUssR0FBTCxLQUFLLENBQWdC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