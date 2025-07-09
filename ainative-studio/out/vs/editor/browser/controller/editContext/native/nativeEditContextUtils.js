/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { addDisposableListener, getActiveElement, getShadowRoot } from '../../../../../base/browser/dom.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
export class FocusTracker extends Disposable {
    constructor(_domNode, _onFocusChange) {
        super();
        this._domNode = _domNode;
        this._onFocusChange = _onFocusChange;
        this._isFocused = false;
        this._isPaused = false;
        this._register(addDisposableListener(this._domNode, 'focus', () => {
            if (this._isPaused) {
                return;
            }
            // Here we don't trust the browser and instead we check
            // that the active element is the one we are tracking
            // (this happens when cmd+tab is used to switch apps)
            this.refreshFocusState();
        }));
        this._register(addDisposableListener(this._domNode, 'blur', () => {
            if (this._isPaused) {
                return;
            }
            this._handleFocusedChanged(false);
        }));
    }
    pause() {
        this._isPaused = true;
    }
    resume() {
        this._isPaused = false;
        this.refreshFocusState();
    }
    _handleFocusedChanged(focused) {
        if (this._isFocused === focused) {
            return;
        }
        this._isFocused = focused;
        this._onFocusChange(this._isFocused);
    }
    focus() {
        this._domNode.focus();
        this.refreshFocusState();
    }
    refreshFocusState() {
        const shadowRoot = getShadowRoot(this._domNode);
        const activeElement = shadowRoot ? shadowRoot.activeElement : getActiveElement();
        const focused = this._domNode === activeElement;
        this._handleFocusedChanged(focused);
    }
    get isFocused() {
        return this._isFocused;
    }
}
export function editContextAddDisposableListener(target, type, listener, options) {
    target.addEventListener(type, listener, options);
    return {
        dispose() {
            target.removeEventListener(type, listener);
        }
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlRWRpdENvbnRleHRVdGlscy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci9jb250cm9sbGVyL2VkaXRDb250ZXh0L25hdGl2ZS9uYXRpdmVFZGl0Q29udGV4dFV0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxnQkFBZ0IsRUFBRSxhQUFhLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM1RyxPQUFPLEVBQWUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFTbEYsTUFBTSxPQUFPLFlBQWEsU0FBUSxVQUFVO0lBSTNDLFlBQ2tCLFFBQXFCLEVBQ3JCLGNBQWdEO1FBRWpFLEtBQUssRUFBRSxDQUFDO1FBSFMsYUFBUSxHQUFSLFFBQVEsQ0FBYTtRQUNyQixtQkFBYyxHQUFkLGNBQWMsQ0FBa0M7UUFMMUQsZUFBVSxHQUFZLEtBQUssQ0FBQztRQUM1QixjQUFTLEdBQVksS0FBSyxDQUFDO1FBT2xDLElBQUksQ0FBQyxTQUFTLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFO1lBQ2pFLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUNwQixPQUFPO1lBQ1IsQ0FBQztZQUNELHVEQUF1RDtZQUN2RCxxREFBcUQ7WUFDckQscURBQXFEO1lBQ3JELElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1FBQzFCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDSixJQUFJLENBQUMsU0FBUyxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRTtZQUNoRSxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDcEIsT0FBTztZQUNSLENBQUM7WUFDRCxJQUFJLENBQUMscUJBQXFCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDbkMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFTSxLQUFLO1FBQ1gsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUM7SUFDdkIsQ0FBQztJQUVNLE1BQU07UUFDWixJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztRQUN2QixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztJQUMxQixDQUFDO0lBRU8scUJBQXFCLENBQUMsT0FBZ0I7UUFDN0MsSUFBSSxJQUFJLENBQUMsVUFBVSxLQUFLLE9BQU8sRUFBRSxDQUFDO1lBQ2pDLE9BQU87UUFDUixDQUFDO1FBQ0QsSUFBSSxDQUFDLFVBQVUsR0FBRyxPQUFPLENBQUM7UUFDMUIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDdEMsQ0FBQztJQUVNLEtBQUs7UUFDWCxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ3RCLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO0lBQzFCLENBQUM7SUFFTSxpQkFBaUI7UUFDdkIsTUFBTSxVQUFVLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNoRCxNQUFNLGFBQWEsR0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixFQUFFLENBQUM7UUFDakYsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsS0FBSyxhQUFhLENBQUM7UUFDaEQsSUFBSSxDQUFDLHFCQUFxQixDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3JDLENBQUM7SUFFRCxJQUFJLFNBQVM7UUFDWixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUM7SUFDeEIsQ0FBQztDQUNEO0FBRUQsTUFBTSxVQUFVLGdDQUFnQyxDQUFtRCxNQUFtQixFQUFFLElBQU8sRUFBRSxRQUFxRixFQUFFLE9BQTJDO0lBQ2xRLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsUUFBZSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ3hELE9BQU87UUFDTixPQUFPO1lBQ04sTUFBTSxDQUFDLG1CQUFtQixDQUFDLElBQUksRUFBRSxRQUFlLENBQUMsQ0FBQztRQUNuRCxDQUFDO0tBQ0QsQ0FBQztBQUNILENBQUMifQ==