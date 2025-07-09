/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerEditorContribution } from '../../../browser/editorExtensions.js';
import { MessageController } from '../../message/browser/messageController.js';
import * as nls from '../../../../nls.js';
export class ReadOnlyMessageController extends Disposable {
    static { this.ID = 'editor.contrib.readOnlyMessageController'; }
    constructor(editor) {
        super();
        this.editor = editor;
        this._register(this.editor.onDidAttemptReadOnlyEdit(() => this._onDidAttemptReadOnlyEdit()));
    }
    _onDidAttemptReadOnlyEdit() {
        const messageController = MessageController.get(this.editor);
        if (messageController && this.editor.hasModel()) {
            let message = this.editor.getOptions().get(97 /* EditorOption.readOnlyMessage */);
            if (!message) {
                if (this.editor.isSimpleWidget) {
                    message = new MarkdownString(nls.localize('editor.simple.readonly', "Cannot edit in read-only input"));
                }
                else {
                    message = new MarkdownString(nls.localize('editor.readonly', "Cannot edit in read-only editor"));
                }
            }
            messageController.showMessage(message, this.editor.getPosition());
        }
    }
}
registerEditorContribution(ReadOnlyMessageController.ID, ReadOnlyMessageController, 2 /* EditorContributionInstantiation.BeforeFirstInteraction */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3JlYWRPbmx5TWVzc2FnZS9icm93c2VyL2NvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDeEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRWxFLE9BQU8sRUFBbUMsMEJBQTBCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUduSCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMvRSxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBRTFDLE1BQU0sT0FBTyx5QkFBMEIsU0FBUSxVQUFVO2FBRWpDLE9BQUUsR0FBRywwQ0FBMEMsQ0FBQztJQUV2RSxZQUNrQixNQUFtQjtRQUVwQyxLQUFLLEVBQUUsQ0FBQztRQUZTLFdBQU0sR0FBTixNQUFNLENBQWE7UUFHcEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUM5RixDQUFDO0lBRU8seUJBQXlCO1FBQ2hDLE1BQU0saUJBQWlCLEdBQUcsaUJBQWlCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM3RCxJQUFJLGlCQUFpQixJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztZQUNqRCxJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFDLEdBQUcsdUNBQThCLENBQUM7WUFDekUsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNkLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsQ0FBQztvQkFDaEMsT0FBTyxHQUFHLElBQUksY0FBYyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsd0JBQXdCLEVBQUUsZ0NBQWdDLENBQUMsQ0FBQyxDQUFDO2dCQUN4RyxDQUFDO3FCQUFNLENBQUM7b0JBQ1AsT0FBTyxHQUFHLElBQUksY0FBYyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLEVBQUUsaUNBQWlDLENBQUMsQ0FBQyxDQUFDO2dCQUNsRyxDQUFDO1lBQ0YsQ0FBQztZQUVELGlCQUFpQixDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO1FBQ25FLENBQUM7SUFDRixDQUFDOztBQUdGLDBCQUEwQixDQUFDLHlCQUF5QixDQUFDLEVBQUUsRUFBRSx5QkFBeUIsaUVBQXlELENBQUMifQ==