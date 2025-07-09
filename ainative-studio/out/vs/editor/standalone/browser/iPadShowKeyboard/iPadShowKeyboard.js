/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './iPadShowKeyboard.css';
import * as dom from '../../../../base/browser/dom.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerEditorContribution } from '../../../browser/editorExtensions.js';
import { isIOS } from '../../../../base/common/platform.js';
export class IPadShowKeyboard extends Disposable {
    static { this.ID = 'editor.contrib.iPadShowKeyboard'; }
    constructor(editor) {
        super();
        this.editor = editor;
        this.widget = null;
        if (isIOS) {
            this._register(editor.onDidChangeConfiguration(() => this.update()));
            this.update();
        }
    }
    update() {
        const shouldHaveWidget = (!this.editor.getOption(96 /* EditorOption.readOnly */));
        if (!this.widget && shouldHaveWidget) {
            this.widget = new ShowKeyboardWidget(this.editor);
        }
        else if (this.widget && !shouldHaveWidget) {
            this.widget.dispose();
            this.widget = null;
        }
    }
    dispose() {
        super.dispose();
        if (this.widget) {
            this.widget.dispose();
            this.widget = null;
        }
    }
}
class ShowKeyboardWidget extends Disposable {
    static { this.ID = 'editor.contrib.ShowKeyboardWidget'; }
    constructor(editor) {
        super();
        this.editor = editor;
        this._domNode = document.createElement('textarea');
        this._domNode.className = 'iPadShowKeyboard';
        this._register(dom.addDisposableListener(this._domNode, 'touchstart', (e) => {
            this.editor.focus();
        }));
        this._register(dom.addDisposableListener(this._domNode, 'focus', (e) => {
            this.editor.focus();
        }));
        this.editor.addOverlayWidget(this);
    }
    dispose() {
        this.editor.removeOverlayWidget(this);
        super.dispose();
    }
    // ----- IOverlayWidget API
    getId() {
        return ShowKeyboardWidget.ID;
    }
    getDomNode() {
        return this._domNode;
    }
    getPosition() {
        return {
            preference: 1 /* OverlayWidgetPositionPreference.BOTTOM_RIGHT_CORNER */
        };
    }
}
registerEditorContribution(IPadShowKeyboard.ID, IPadShowKeyboard, 3 /* EditorContributionInstantiation.Eventually */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaVBhZFNob3dLZXlib2FyZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3Ivc3RhbmRhbG9uZS9icm93c2VyL2lQYWRTaG93S2V5Ym9hcmQvaVBhZFNob3dLZXlib2FyZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLHdCQUF3QixDQUFDO0FBQ2hDLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRWxFLE9BQU8sRUFBbUMsMEJBQTBCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUduSCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFNUQsTUFBTSxPQUFPLGdCQUFpQixTQUFRLFVBQVU7YUFFeEIsT0FBRSxHQUFHLGlDQUFpQyxDQUFDO0lBSzlELFlBQVksTUFBbUI7UUFDOUIsS0FBSyxFQUFFLENBQUM7UUFDUixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUNyQixJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztRQUNuQixJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ1gsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsd0JBQXdCLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNyRSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDZixDQUFDO0lBQ0YsQ0FBQztJQUVPLE1BQU07UUFDYixNQUFNLGdCQUFnQixHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsZ0NBQXVCLENBQUMsQ0FBQztRQUV6RSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO1lBRXRDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFbkQsQ0FBQzthQUFNLElBQUksSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFFN0MsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUN0QixJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztRQUVwQixDQUFDO0lBQ0YsQ0FBQztJQUVlLE9BQU87UUFDdEIsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2hCLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2pCLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDdEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7UUFDcEIsQ0FBQztJQUNGLENBQUM7O0FBR0YsTUFBTSxrQkFBbUIsU0FBUSxVQUFVO2FBRWxCLE9BQUUsR0FBRyxtQ0FBbUMsQ0FBQztJQU1qRSxZQUFZLE1BQW1CO1FBQzlCLEtBQUssRUFBRSxDQUFDO1FBQ1IsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFDckIsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ25ELElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxHQUFHLGtCQUFrQixDQUFDO1FBRTdDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsWUFBWSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDM0UsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNyQixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0osSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUN0RSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ3JCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFZSxPQUFPO1FBQ3RCLElBQUksQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdEMsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ2pCLENBQUM7SUFFRCwyQkFBMkI7SUFFcEIsS0FBSztRQUNYLE9BQU8sa0JBQWtCLENBQUMsRUFBRSxDQUFDO0lBQzlCLENBQUM7SUFFTSxVQUFVO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQztJQUN0QixDQUFDO0lBRU0sV0FBVztRQUNqQixPQUFPO1lBQ04sVUFBVSw2REFBcUQ7U0FDL0QsQ0FBQztJQUNILENBQUM7O0FBR0YsMEJBQTBCLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLGdCQUFnQixxREFBNkMsQ0FBQyJ9