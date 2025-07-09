/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditorTheme } from '../editorTheme.js';
export class ViewContext {
    constructor(configuration, theme, model) {
        this.configuration = configuration;
        this.theme = new EditorTheme(theme);
        this.viewModel = model;
        this.viewLayout = model.viewLayout;
    }
    addEventHandler(eventHandler) {
        this.viewModel.addViewEventHandler(eventHandler);
    }
    removeEventHandler(eventHandler) {
        this.viewModel.removeViewEventHandler(eventHandler);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld0NvbnRleHQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi92aWV3TW9kZWwvdmlld0NvbnRleHQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFNaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBRWhELE1BQU0sT0FBTyxXQUFXO0lBT3ZCLFlBQ0MsYUFBbUMsRUFDbkMsS0FBa0IsRUFDbEIsS0FBaUI7UUFFakIsSUFBSSxDQUFDLGFBQWEsR0FBRyxhQUFhLENBQUM7UUFDbkMsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNwQyxJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztRQUN2QixJQUFJLENBQUMsVUFBVSxHQUFHLEtBQUssQ0FBQyxVQUFVLENBQUM7SUFDcEMsQ0FBQztJQUVNLGVBQWUsQ0FBQyxZQUE4QjtRQUNwRCxJQUFJLENBQUMsU0FBUyxDQUFDLG1CQUFtQixDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQ2xELENBQUM7SUFFTSxrQkFBa0IsQ0FBQyxZQUE4QjtRQUN2RCxJQUFJLENBQUMsU0FBUyxDQUFDLHNCQUFzQixDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQ3JELENBQUM7Q0FDRCJ9