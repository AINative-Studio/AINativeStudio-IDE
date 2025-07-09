/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { EditorAction, registerEditorAction } from '../../../browser/editorExtensions.js';
import * as nls from '../../../../nls.js';
class ForceRetokenizeAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.forceRetokenize',
            label: nls.localize2('forceRetokenize', "Developer: Force Retokenize"),
            precondition: undefined
        });
    }
    run(accessor, editor) {
        if (!editor.hasModel()) {
            return;
        }
        const model = editor.getModel();
        model.tokenization.resetTokenization();
        const sw = new StopWatch();
        model.tokenization.forceTokenization(model.getLineCount());
        sw.stop();
        console.log(`tokenization took ${sw.elapsed()}`);
    }
}
registerEditorAction(ForceRetokenizeAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW5pemF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3Rva2VuaXphdGlvbi9icm93c2VyL3Rva2VuaXphdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFakUsT0FBTyxFQUFFLFlBQVksRUFBRSxvQkFBb0IsRUFBb0IsTUFBTSxzQ0FBc0MsQ0FBQztBQUM1RyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBRTFDLE1BQU0scUJBQXNCLFNBQVEsWUFBWTtJQUMvQztRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSwrQkFBK0I7WUFDbkMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsaUJBQWlCLEVBQUUsNkJBQTZCLENBQUM7WUFDdEUsWUFBWSxFQUFFLFNBQVM7U0FDdkIsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVNLEdBQUcsQ0FBQyxRQUEwQixFQUFFLE1BQW1CO1FBQ3pELElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztZQUN4QixPQUFPO1FBQ1IsQ0FBQztRQUNELE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNoQyxLQUFLLENBQUMsWUFBWSxDQUFDLGlCQUFpQixFQUFFLENBQUM7UUFDdkMsTUFBTSxFQUFFLEdBQUcsSUFBSSxTQUFTLEVBQUUsQ0FBQztRQUMzQixLQUFLLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDO1FBQzNELEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNWLE9BQU8sQ0FBQyxHQUFHLENBQUMscUJBQXFCLEVBQUUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFFbEQsQ0FBQztDQUNEO0FBRUQsb0JBQW9CLENBQUMscUJBQXFCLENBQUMsQ0FBQyJ9