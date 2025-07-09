/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable, dispose } from '../../../../base/common/lifecycle.js';
import { CommentThreadCollapsibleState } from '../../../../editor/common/languages.js';
import { ModelDecorationOptions } from '../../../../editor/common/model/textModel.js';
class CommentThreadRangeDecoration {
    get id() {
        return this._decorationId;
    }
    set id(id) {
        this._decorationId = id;
    }
    constructor(range, options) {
        this.range = range;
        this.options = options;
    }
}
export class CommentThreadRangeDecorator extends Disposable {
    static { this.description = 'comment-thread-range-decorator'; }
    constructor(commentService) {
        super();
        this.decorationIds = [];
        this.activeDecorationIds = [];
        this.threadCollapseStateListeners = [];
        const decorationOptions = {
            description: CommentThreadRangeDecorator.description,
            isWholeLine: false,
            zIndex: 20,
            className: 'comment-thread-range',
            shouldFillLineOnLineBreak: true
        };
        this.decorationOptions = ModelDecorationOptions.createDynamic(decorationOptions);
        const activeDecorationOptions = {
            description: CommentThreadRangeDecorator.description,
            isWholeLine: false,
            zIndex: 20,
            className: 'comment-thread-range-current',
            shouldFillLineOnLineBreak: true
        };
        this.activeDecorationOptions = ModelDecorationOptions.createDynamic(activeDecorationOptions);
        this._register(commentService.onDidChangeCurrentCommentThread(thread => {
            this.updateCurrent(thread);
        }));
        this._register(commentService.onDidUpdateCommentThreads(() => {
            this.updateCurrent(undefined);
        }));
    }
    updateCurrent(thread) {
        if (!this.editor || (thread?.resource && (thread.resource?.toString() !== this.editor.getModel()?.uri.toString()))) {
            return;
        }
        this.currentThreadCollapseStateListener?.dispose();
        const newDecoration = [];
        if (thread) {
            const range = thread.range;
            if (range && !((range.startLineNumber === range.endLineNumber) && (range.startColumn === range.endColumn))) {
                if (thread.collapsibleState === CommentThreadCollapsibleState.Expanded) {
                    this.currentThreadCollapseStateListener = thread.onDidChangeCollapsibleState(state => {
                        if (state === CommentThreadCollapsibleState.Collapsed) {
                            this.updateCurrent(undefined);
                        }
                    });
                    newDecoration.push(new CommentThreadRangeDecoration(range, this.activeDecorationOptions));
                }
            }
        }
        this.editor.changeDecorations((changeAccessor) => {
            this.activeDecorationIds = changeAccessor.deltaDecorations(this.activeDecorationIds, newDecoration);
            newDecoration.forEach((decoration, index) => decoration.id = this.decorationIds[index]);
        });
    }
    update(editor, commentInfos) {
        const model = editor?.getModel();
        if (!editor || !model) {
            return;
        }
        dispose(this.threadCollapseStateListeners);
        this.editor = editor;
        const commentThreadRangeDecorations = [];
        for (const info of commentInfos) {
            info.threads.forEach(thread => {
                if (thread.isDisposed) {
                    return;
                }
                const range = thread.range;
                // We only want to show a range decoration when there's the range spans either multiple lines
                // or, when is spans multiple characters on the sample line
                if (!range || (range.startLineNumber === range.endLineNumber) && (range.startColumn === range.endColumn)) {
                    return;
                }
                this.threadCollapseStateListeners.push(thread.onDidChangeCollapsibleState(() => {
                    this.update(editor, commentInfos);
                }));
                if (thread.collapsibleState === CommentThreadCollapsibleState.Collapsed) {
                    return;
                }
                commentThreadRangeDecorations.push(new CommentThreadRangeDecoration(range, this.decorationOptions));
            });
        }
        editor.changeDecorations((changeAccessor) => {
            this.decorationIds = changeAccessor.deltaDecorations(this.decorationIds, commentThreadRangeDecorations);
            commentThreadRangeDecorations.forEach((decoration, index) => decoration.id = this.decorationIds[index]);
        });
    }
    dispose() {
        dispose(this.threadCollapseStateListeners);
        this.currentThreadCollapseStateListener?.dispose();
        super.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudFRocmVhZFJhbmdlRGVjb3JhdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvbW1lbnRzL2Jyb3dzZXIvY29tbWVudFRocmVhZFJhbmdlRGVjb3JhdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFlLE1BQU0sc0NBQXNDLENBQUM7QUFHeEYsT0FBTyxFQUFpQiw2QkFBNkIsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRXRHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBR3RGLE1BQU0sNEJBQTRCO0lBR2pDLElBQVcsRUFBRTtRQUNaLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQztJQUMzQixDQUFDO0lBRUQsSUFBVyxFQUFFLENBQUMsRUFBc0I7UUFDbkMsSUFBSSxDQUFDLGFBQWEsR0FBRyxFQUFFLENBQUM7SUFDekIsQ0FBQztJQUVELFlBQ2lCLEtBQWEsRUFDYixPQUErQjtRQUQvQixVQUFLLEdBQUwsS0FBSyxDQUFRO1FBQ2IsWUFBTyxHQUFQLE9BQU8sQ0FBd0I7SUFDaEQsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLDJCQUE0QixTQUFRLFVBQVU7YUFDM0MsZ0JBQVcsR0FBRyxnQ0FBZ0MsQUFBbkMsQ0FBb0M7SUFTOUQsWUFBWSxjQUErQjtRQUMxQyxLQUFLLEVBQUUsQ0FBQztRQVBELGtCQUFhLEdBQWEsRUFBRSxDQUFDO1FBQzdCLHdCQUFtQixHQUFhLEVBQUUsQ0FBQztRQUVuQyxpQ0FBNEIsR0FBa0IsRUFBRSxDQUFDO1FBS3hELE1BQU0saUJBQWlCLEdBQTRCO1lBQ2xELFdBQVcsRUFBRSwyQkFBMkIsQ0FBQyxXQUFXO1lBQ3BELFdBQVcsRUFB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