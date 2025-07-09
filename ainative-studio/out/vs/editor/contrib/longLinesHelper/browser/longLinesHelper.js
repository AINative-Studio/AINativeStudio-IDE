/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerEditorContribution } from '../../../browser/editorExtensions.js';
class LongLinesHelper extends Disposable {
    static { this.ID = 'editor.contrib.longLinesHelper'; }
    static get(editor) {
        return editor.getContribution(LongLinesHelper.ID);
    }
    constructor(_editor) {
        super();
        this._editor = _editor;
        this._register(this._editor.onMouseDown((e) => {
            const stopRenderingLineAfter = this._editor.getOption(122 /* EditorOption.stopRenderingLineAfter */);
            if (stopRenderingLineAfter >= 0 && e.target.type === 6 /* MouseTargetType.CONTENT_TEXT */ && e.target.position.column >= stopRenderingLineAfter) {
                this._editor.updateOptions({
                    stopRenderingLineAfter: -1
                });
            }
        }));
    }
}
registerEditorContribution(LongLinesHelper.ID, LongLinesHelper, 2 /* EditorContributionInstantiation.BeforeFirstInteraction */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9uZ0xpbmVzSGVscGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2xvbmdMaW5lc0hlbHBlci9icm93c2VyL2xvbmdMaW5lc0hlbHBlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFbEUsT0FBTyxFQUFtQywwQkFBMEIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBSW5ILE1BQU0sZUFBZ0IsU0FBUSxVQUFVO2FBQ2hCLE9BQUUsR0FBRyxnQ0FBZ0MsQ0FBQztJQUV0RCxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQW1CO1FBQ3BDLE9BQU8sTUFBTSxDQUFDLGVBQWUsQ0FBa0IsZUFBZSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3BFLENBQUM7SUFFRCxZQUNrQixPQUFvQjtRQUVyQyxLQUFLLEVBQUUsQ0FBQztRQUZTLFlBQU8sR0FBUCxPQUFPLENBQWE7UUFJckMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQzdDLE1BQU0sc0JBQXNCLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLCtDQUFxQyxDQUFDO1lBQzNGLElBQUksc0JBQXNCLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSx5Q0FBaUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLElBQUksc0JBQXNCLEVBQUUsQ0FBQztnQkFDekksSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUM7b0JBQzFCLHNCQUFzQixFQUFFLENBQUMsQ0FBQztpQkFDMUIsQ0FBQyxDQUFDO1lBQ0osQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDOztBQUdGLDBCQUEwQixDQUFDLGVBQWUsQ0FBQyxFQUFFLEVBQUUsZUFBZSxpRUFBeUQsQ0FBQyJ9