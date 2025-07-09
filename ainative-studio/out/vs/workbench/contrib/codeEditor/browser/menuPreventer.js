/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerEditorContribution } from '../../../../editor/browser/editorExtensions.js';
/**
 * Prevents the top-level menu from showing up when doing Alt + Click in the editor
 */
export class MenuPreventer extends Disposable {
    static { this.ID = 'editor.contrib.menuPreventer'; }
    constructor(editor) {
        super();
        this._editor = editor;
        this._altListeningMouse = false;
        this._altMouseTriggered = false;
        // A global crossover handler to prevent menu bar from showing up
        // When <alt> is hold, we will listen to mouse events and prevent
        // the release event up <alt> if the mouse is triggered.
        this._register(this._editor.onMouseDown((e) => {
            if (this._altListeningMouse) {
                this._altMouseTriggered = true;
            }
        }));
        this._register(this._editor.onKeyDown((e) => {
            if (e.equals(512 /* KeyMod.Alt */)) {
                if (!this._altListeningMouse) {
                    this._altMouseTriggered = false;
                }
                this._altListeningMouse = true;
            }
        }));
        this._register(this._editor.onKeyUp((e) => {
            if (e.equals(512 /* KeyMod.Alt */)) {
                if (this._altMouseTriggered) {
                    e.preventDefault();
                }
                this._altListeningMouse = false;
                this._altMouseTriggered = false;
            }
        }));
    }
}
registerEditorContribution(MenuPreventer.ID, MenuPreventer, 2 /* EditorContributionInstantiation.BeforeFirstInteraction */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVudVByZXZlbnRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb2RlRWRpdG9yL2Jyb3dzZXIvbWVudVByZXZlbnRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFbEUsT0FBTyxFQUFtQywwQkFBMEIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBRzdIOztHQUVHO0FBQ0gsTUFBTSxPQUFPLGFBQWMsU0FBUSxVQUFVO2FBRXJCLE9BQUUsR0FBRyw4QkFBOEIsQ0FBQztJQU0zRCxZQUFZLE1BQW1CO1FBQzlCLEtBQUssRUFBRSxDQUFDO1FBQ1IsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUM7UUFDdEIsSUFBSSxDQUFDLGtCQUFrQixHQUFHLEtBQUssQ0FBQztRQUNoQyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsS0FBSyxDQUFDO1FBRWhDLGlFQUFpRTtRQUNqRSxpRUFBaUU7UUFDakUsd0RBQXdEO1FBRXhELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUM3QyxJQUFJLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO2dCQUM3QixJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFDO1lBQ2hDLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQzNDLElBQUksQ0FBQyxDQUFDLE1BQU0sc0JBQVksRUFBRSxDQUFDO2dCQUMxQixJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7b0JBQzlCLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxLQUFLLENBQUM7Z0JBQ2pDLENBQUM7Z0JBQ0QsSUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksQ0FBQztZQUNoQyxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUN6QyxJQUFJLENBQUMsQ0FBQyxNQUFNLHNCQUFZLEVBQUUsQ0FBQztnQkFDMUIsSUFBSSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztvQkFDN0IsQ0FBQyxDQUFDLGNBQWMsRUFBRSxDQUFDO2dCQUNwQixDQUFDO2dCQUNELElBQUksQ0FBQyxrQkFBa0IsR0FBRyxLQUFLLENBQUM7Z0JBQ2hDLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxLQUFLLENBQUM7WUFDakMsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDOztBQUdGLDBCQUEwQixDQUFDLGFBQWEsQ0FBQyxFQUFFLEVBQUUsYUFBYSxpRUFBeUQsQ0FBQyJ9