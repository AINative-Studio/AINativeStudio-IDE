/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isEqual } from '../../../../../base/common/resources.js';
import { findDiffEditorContainingCodeEditor } from '../../../../../editor/browser/widget/diffEditor/commands.js';
export function isTextDiffEditorForEntry(accessor, entry, editor) {
    const diffEditor = findDiffEditorContainingCodeEditor(accessor, editor);
    if (!diffEditor) {
        return false;
    }
    const originalModel = diffEditor.getOriginalEditor().getModel();
    const modifiedModel = diffEditor.getModifiedEditor().getModel();
    return isEqual(originalModel?.uri, entry.originalURI) && isEqual(modifiedModel?.uri, entry.modifiedURI);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRFZGl0aW5nL2NoYXRFZGl0aW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUVsRSxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUlqSCxNQUFNLFVBQVUsd0JBQXdCLENBQUMsUUFBMEIsRUFBRSxLQUF5QixFQUFFLE1BQW1CO0lBQ2xILE1BQU0sVUFBVSxHQUFHLGtDQUFrQyxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUN4RSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDakIsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBQ0QsTUFBTSxhQUFhLEdBQUcsVUFBVSxDQUFDLGlCQUFpQixFQUFFLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDaEUsTUFBTSxhQUFhLEdBQUcsVUFBVSxDQUFDLGlCQUFpQixFQUFFLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDaEUsT0FBTyxPQUFPLENBQUMsYUFBYSxFQUFFLEdBQUcsRUFBRSxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksT0FBTyxDQUFDLGFBQWEsRUFBRSxHQUFHLEVBQUUsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQ3pHLENBQUMifQ==