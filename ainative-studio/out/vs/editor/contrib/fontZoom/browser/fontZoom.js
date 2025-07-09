/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditorAction, registerEditorAction } from '../../../browser/editorExtensions.js';
import { EditorZoom } from '../../../common/config/editorZoom.js';
import * as nls from '../../../../nls.js';
class EditorFontZoomIn extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.fontZoomIn',
            label: nls.localize2('EditorFontZoomIn.label', "Increase Editor Font Size"),
            precondition: undefined
        });
    }
    run(accessor, editor) {
        EditorZoom.setZoomLevel(EditorZoom.getZoomLevel() + 1);
    }
}
class EditorFontZoomOut extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.fontZoomOut',
            label: nls.localize2('EditorFontZoomOut.label', "Decrease Editor Font Size"),
            precondition: undefined
        });
    }
    run(accessor, editor) {
        EditorZoom.setZoomLevel(EditorZoom.getZoomLevel() - 1);
    }
}
class EditorFontZoomReset extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.fontZoomReset',
            label: nls.localize2('EditorFontZoomReset.label', "Reset Editor Font Size"),
            precondition: undefined
        });
    }
    run(accessor, editor) {
        EditorZoom.setZoomLevel(0);
    }
}
registerEditorAction(EditorFontZoomIn);
registerEditorAction(EditorFontZoomOut);
registerEditorAction(EditorFontZoomReset);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9udFpvb20uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvZm9udFpvb20vYnJvd3Nlci9mb250Wm9vbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLG9CQUFvQixFQUFvQixNQUFNLHNDQUFzQyxDQUFDO0FBQzVHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBRTFDLE1BQU0sZ0JBQWlCLFNBQVEsWUFBWTtJQUUxQztRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSwwQkFBMEI7WUFDOUIsS0FBSyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsd0JBQXdCLEVBQUUsMkJBQTJCLENBQUM7WUFDM0UsWUFBWSxFQUFFLFNBQVM7U0FDdkIsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVNLEdBQUcsQ0FBQyxRQUEwQixFQUFFLE1BQW1CO1FBQ3pELFVBQVUsQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLFlBQVksRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ3hELENBQUM7Q0FDRDtBQUVELE1BQU0saUJBQWtCLFNBQVEsWUFBWTtJQUUzQztRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSwyQkFBMkI7WUFDL0IsS0FBSyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMseUJBQXlCLEVBQUUsMkJBQTJCLENBQUM7WUFDNUUsWUFBWSxFQUFFLFNBQVM7U0FDdkIsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVNLEdBQUcsQ0FBQyxRQUEwQixFQUFFLE1BQW1CO1FBQ3pELFVBQVUsQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLFlBQVksRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ3hELENBQUM7Q0FDRDtBQUVELE1BQU0sbUJBQW9CLFNBQVEsWUFBWTtJQUU3QztRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSw2QkFBNkI7WUFDakMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsMkJBQTJCLEVBQUUsd0JBQXdCLENBQUM7WUFDM0UsWUFBWSxFQUFFLFNBQVM7U0FDdkIsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVNLEdBQUcsQ0FBQyxRQUEwQixFQUFFLE1BQW1CO1FBQ3pELFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDNUIsQ0FBQztDQUNEO0FBRUQsb0JBQW9CLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztBQUN2QyxvQkFBb0IsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0FBQ3hDLG9CQUFvQixDQUFDLG1CQUFtQixDQUFDLENBQUMifQ==