/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditorAction2 } from '../../../../../editor/browser/editorExtensions.js';
import { localize2 } from '../../../../../nls.js';
import { Action2 } from '../../../../../platform/actions/common/actions.js';
const defaultOptions = {
    category: localize2('snippets', "Snippets"),
};
export class SnippetsAction extends Action2 {
    constructor(desc) {
        super({ ...defaultOptions, ...desc });
    }
}
export class SnippetEditorAction extends EditorAction2 {
    constructor(desc) {
        super({ ...defaultOptions, ...desc });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3RTbmlwcGV0c0FjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc25pcHBldHMvYnJvd3Nlci9jb21tYW5kcy9hYnN0cmFjdFNuaXBwZXRzQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbEYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2xELE9BQU8sRUFBRSxPQUFPLEVBQW1CLE1BQU0sbURBQW1ELENBQUM7QUFFN0YsTUFBTSxjQUFjLEdBQUc7SUFDdEIsUUFBUSxFQUFFLFNBQVMsQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDO0NBQ2xDLENBQUM7QUFFWCxNQUFNLE9BQWdCLGNBQWUsU0FBUSxPQUFPO0lBRW5ELFlBQVksSUFBK0I7UUFDMUMsS0FBSyxDQUFDLEVBQUUsR0FBRyxjQUFjLEVBQUUsR0FBRyxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZDLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBZ0IsbUJBQW9CLFNBQVEsYUFBYTtJQUU5RCxZQUFZLElBQStCO1FBQzFDLEtBQUssQ0FBQyxFQUFFLEdBQUcsY0FBYyxFQUFFLEdBQUcsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUN2QyxDQUFDO0NBQ0QifQ==