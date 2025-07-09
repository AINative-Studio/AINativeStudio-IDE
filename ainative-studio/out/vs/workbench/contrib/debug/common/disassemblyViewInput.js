/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditorInput } from '../../../common/editor/editorInput.js';
import { localize } from '../../../../nls.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
const DisassemblyEditorIcon = registerIcon('disassembly-editor-label-icon', Codicon.debug, localize('disassemblyEditorLabelIcon', 'Icon of the disassembly editor label.'));
export class DisassemblyViewInput extends EditorInput {
    constructor() {
        super(...arguments);
        this.resource = undefined;
    }
    static { this.ID = 'debug.disassemblyView.input'; }
    get typeId() {
        return DisassemblyViewInput.ID;
    }
    static get instance() {
        if (!DisassemblyViewInput._instance || DisassemblyViewInput._instance.isDisposed()) {
            DisassemblyViewInput._instance = new DisassemblyViewInput();
        }
        return DisassemblyViewInput._instance;
    }
    getName() {
        return localize('disassemblyInputName', "Disassembly");
    }
    getIcon() {
        return DisassemblyEditorIcon;
    }
    matches(other) {
        return other instanceof DisassemblyViewInput;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlzYXNzZW1ibHlWaWV3SW5wdXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvY29tbW9uL2Rpc2Fzc2VtYmx5Vmlld0lucHV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFFOUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUVqRixNQUFNLHFCQUFxQixHQUFHLFlBQVksQ0FBQywrQkFBK0IsRUFBRSxPQUFPLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyw0QkFBNEIsRUFBRSx1Q0FBdUMsQ0FBQyxDQUFDLENBQUM7QUFFNUssTUFBTSxPQUFPLG9CQUFxQixTQUFRLFdBQVc7SUFBckQ7O1FBaUJVLGFBQVEsR0FBRyxTQUFTLENBQUM7SUFjL0IsQ0FBQzthQTdCZ0IsT0FBRSxHQUFHLDZCQUE2QixBQUFoQyxDQUFpQztJQUVuRCxJQUFhLE1BQU07UUFDbEIsT0FBTyxvQkFBb0IsQ0FBQyxFQUFFLENBQUM7SUFDaEMsQ0FBQztJQUdELE1BQU0sS0FBSyxRQUFRO1FBQ2xCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxTQUFTLElBQUksb0JBQW9CLENBQUMsU0FBUyxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUM7WUFDcEYsb0JBQW9CLENBQUMsU0FBUyxHQUFHLElBQUksb0JBQW9CLEVBQUUsQ0FBQztRQUM3RCxDQUFDO1FBRUQsT0FBTyxvQkFBb0IsQ0FBQyxTQUFTLENBQUM7SUFDdkMsQ0FBQztJQUlRLE9BQU87UUFDZixPQUFPLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSxhQUFhLENBQUMsQ0FBQztJQUN4RCxDQUFDO0lBRVEsT0FBTztRQUNmLE9BQU8scUJBQXFCLENBQUM7SUFDOUIsQ0FBQztJQUVRLE9BQU8sQ0FBQyxLQUFjO1FBQzlCLE9BQU8sS0FBSyxZQUFZLG9CQUFvQixDQUFDO0lBQzlDLENBQUMifQ==