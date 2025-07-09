/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { addStandardDisposableListener, getDomNodePagePosition } from '../../../../../../base/browser/dom.js';
import { Action } from '../../../../../../base/common/actions.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { isIOS } from '../../../../../../base/common/platform.js';
import { ThemeIcon } from '../../../../../../base/common/themables.js';
import { localize } from '../../../../../../nls.js';
export class InlineDiffDeletedCodeMargin extends Disposable {
    get visibility() {
        return this._visibility;
    }
    set visibility(_visibility) {
        if (this._visibility !== _visibility) {
            this._visibility = _visibility;
            this._diffActions.style.visibility = _visibility ? 'visible' : 'hidden';
        }
    }
    constructor(_getViewZoneId, _marginDomNode, _modifiedEditor, _diff, _editor, _viewLineCounts, _originalTextModel, _contextMenuService, _clipboardService) {
        super();
        this._getViewZoneId = _getViewZoneId;
        this._marginDomNode = _marginDomNode;
        this._modifiedEditor = _modifiedEditor;
        this._diff = _diff;
        this._editor = _editor;
        this._viewLineCounts = _viewLineCounts;
        this._originalTextModel = _originalTextModel;
        this._contextMenuService = _contextMenuService;
        this._clipboardService = _clipboardService;
        this._visibility = false;
        // make sure the diff margin shows above overlay.
        this._marginDomNode.style.zIndex = '10';
        this._diffActions = document.createElement('div');
        this._diffActions.className = ThemeIcon.asClassName(Codicon.lightBulb) + ' lightbulb-glyph';
        this._diffActions.style.position = 'absolute';
        const lineHeight = this._modifiedEditor.getOption(68 /* EditorOption.lineHeight */);
        this._diffActions.style.right = '0px';
        this._diffActions.style.visibility = 'hidden';
        this._diffActions.style.height = `${lineHeight}px`;
        this._diffActions.style.lineHeight = `${lineHeight}px`;
        this._marginDomNode.appendChild(this._diffActions);
        let currentLineNumberOffset = 0;
        const useShadowDOM = _modifiedEditor.getOption(132 /* EditorOption.useShadowDOM */) && !isIOS; // Do not use shadow dom on IOS #122035
        const showContextMenu = (x, y) => {
            this._contextMenuService.showContextMenu({
                domForShadowRoot: useShadowDOM ? _modifiedEditor.getDomNode() ?? undefined : undefined,
                getAnchor: () => ({ x, y }),
                getActions: () => {
                    const actions = [];
                    const isDeletion = _diff.modified.isEmpty;
                    // default action
                    actions.push(new Action('diff.clipboard.copyDeletedContent', isDeletion
                        ? (_diff.original.length > 1
                            ? localize('diff.clipboard.copyDeletedLinesContent.label', "Copy deleted lines")
                            : localize('diff.clipboard.copyDeletedLinesContent.single.label', "Copy deleted line"))
                        : (_diff.original.length > 1
                            ? localize('diff.clipboard.copyChangedLinesContent.label', "Copy changed lines")
                            : localize('diff.clipboard.copyChangedLinesContent.single.label', "Copy changed line")), undefined, true, async () => {
                        const originalText = this._originalTextModel.getValueInRange(_diff.original.toExclusiveRange());
                        await this._clipboardService.writeText(originalText);
                    }));
                    if (_diff.original.length > 1) {
                        actions.push(new Action('diff.clipboard.copyDeletedLineContent', isDeletion
                            ? localize('diff.clipboard.copyDeletedLineContent.label', "Copy deleted line ({0})", _diff.original.startLineNumber + currentLineNumberOffset)
                            : localize('diff.clipboard.copyChangedLineContent.label', "Copy changed line ({0})", _diff.original.startLineNumber + currentLineNumberOffset), undefined, true, async () => {
                            let lineContent = this._originalTextModel.getLineContent(_diff.original.startLineNumber + currentLineNumberOffset);
                            if (lineContent === '') {
                                // empty line -> new line
                                const eof = this._originalTextModel.getEndOfLineSequence();
                                lineContent = eof === 0 /* EndOfLineSequence.LF */ ? '\n' : '\r\n';
                            }
                            await this._clipboardService.writeText(lineContent);
                        }));
                    }
                    const readOnly = _modifiedEditor.getOption(96 /* EditorOption.readOnly */);
                    if (!readOnly) {
                        actions.push(new Action('diff.inline.revertChange', localize('diff.inline.revertChange.label', "Revert this change"), undefined, true, async () => {
                            this._editor.revert(this._diff);
                        }));
                    }
                    return actions;
                },
                autoSelectFirstItem: true
            });
        };
        this._register(addStandardDisposableListener(this._diffActions, 'mousedown', e => {
            if (!e.leftButton) {
                return;
            }
            const { top, height } = getDomNodePagePosition(this._diffActions);
            const pad = Math.floor(lineHeight / 3);
            e.preventDefault();
            showContextMenu(e.posx, top + height + pad);
        }));
        this._register(_modifiedEditor.onMouseMove((e) => {
            if ((e.target.type === 8 /* MouseTargetType.CONTENT_VIEW_ZONE */ || e.target.type === 5 /* MouseTargetType.GUTTER_VIEW_ZONE */) && e.target.detail.viewZoneId === this._getViewZoneId()) {
                currentLineNumberOffset = this._updateLightBulbPosition(this._marginDomNode, e.event.browserEvent.y, lineHeight);
                this.visibility = true;
            }
            else {
                this.visibility = false;
            }
        }));
        this._register(_modifiedEditor.onMouseDown((e) => {
            if (!e.event.leftButton) {
                return;
            }
            if (e.target.type === 8 /* MouseTargetType.CONTENT_VIEW_ZONE */ || e.target.type === 5 /* MouseTargetType.GUTTER_VIEW_ZONE */) {
                const viewZoneId = e.target.detail.viewZoneId;
                if (viewZoneId === this._getViewZoneId()) {
                    e.event.preventDefault();
                    currentLineNumberOffset = this._updateLightBulbPosition(this._marginDomNode, e.event.browserEvent.y, lineHeight);
                    showContextMenu(e.event.posx, e.event.posy + lineHeight);
                }
            }
        }));
    }
    _updateLightBulbPosition(marginDomNode, y, lineHeight) {
        const { top } = getDomNodePagePosition(marginDomNode);
        const offset = y - top;
        const lineNumberOffset = Math.floor(offset / lineHeight);
        const newTop = lineNumberOffset * lineHeight;
        this._diffActions.style.top = `${newTop}px`;
        if (this._viewLineCounts) {
            let acc = 0;
            for (let i = 0; i < this._viewLineCounts.length; i++) {
                acc += this._viewLineCounts[i];
                if (lineNumberOffset < acc) {
                    return i;
                }
            }
        }
        return lineNumberOffset;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lRGlmZkRlbGV0ZWRDb2RlTWFyZ2luLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3dpZGdldC9kaWZmRWRpdG9yL2NvbXBvbmVudHMvZGlmZkVkaXRvclZpZXdab25lcy9pbmxpbmVEaWZmRGVsZXRlZENvZGVNYXJnaW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLDZCQUE2QixFQUFFLHNCQUFzQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDOUcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDeEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQU92RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFJcEQsTUFBTSxPQUFPLDJCQUE0QixTQUFRLFVBQVU7SUFLMUQsSUFBSSxVQUFVO1FBQ2IsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDO0lBQ3pCLENBQUM7SUFFRCxJQUFJLFVBQVUsQ0FBQyxXQUFvQjtRQUNsQyxJQUFJLElBQUksQ0FBQyxXQUFXLEtBQUssV0FBVyxFQUFFLENBQUM7WUFDdEMsSUFBSSxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUM7WUFDL0IsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUM7UUFDekUsQ0FB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