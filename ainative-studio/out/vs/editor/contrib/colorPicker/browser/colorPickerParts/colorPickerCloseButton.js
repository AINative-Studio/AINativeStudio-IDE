/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import '../colorPicker.css';
import * as dom from '../../../../../base/browser/dom.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../nls.js';
import { Emitter } from '../../../../../base/common/event.js';
import { registerIcon } from '../../../../../platform/theme/common/iconRegistry.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { Codicon } from '../../../../../base/common/codicons.js';
const $ = dom.$;
export class CloseButton extends Disposable {
    constructor(container) {
        super();
        this._onClicked = this._register(new Emitter());
        this.onClicked = this._onClicked.event;
        this._button = document.createElement('div');
        this._button.classList.add('close-button');
        dom.append(container, this._button);
        const innerDiv = document.createElement('div');
        innerDiv.classList.add('close-button-inner-div');
        dom.append(this._button, innerDiv);
        const closeButton = dom.append(innerDiv, $('.button' + ThemeIcon.asCSSSelector(registerIcon('color-picker-close', Codicon.close, localize('closeIcon', 'Icon to close the color picker')))));
        closeButton.classList.add('close-icon');
        this._register(dom.addDisposableListener(this._button, dom.EventType.CLICK, () => {
            this._onClicked.fire();
        }));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sb3JQaWNrZXJDbG9zZUJ1dHRvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9jb2xvclBpY2tlci9icm93c2VyL2NvbG9yUGlja2VyUGFydHMvY29sb3JQaWNrZXJDbG9zZUJ1dHRvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLG9CQUFvQixDQUFDO0FBQzVCLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUM7QUFDMUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNqRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFakUsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUVoQixNQUFNLE9BQU8sV0FBWSxTQUFRLFVBQVU7SUFNMUMsWUFBWSxTQUFzQjtRQUNqQyxLQUFLLEVBQUUsQ0FBQztRQUpRLGVBQVUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQztRQUNsRCxjQUFTLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUM7UUFJakQsSUFBSSxDQUFDLE9BQU8sR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzdDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUMzQyxHQUFHLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFcEMsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMvQyxRQUFRLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1FBQ2pELEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQztRQUVuQyxNQUFNLFdBQVcsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLG9CQUFvQixFQUFFLE9BQU8sQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLFdBQVcsRUFBRSxnQ0FBZ0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDN0wsV0FBVyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDeEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUU7WUFDaEYsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUN4QixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNEIn0=