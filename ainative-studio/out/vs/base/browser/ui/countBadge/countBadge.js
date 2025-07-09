/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { $, append } from '../../dom.js';
import { format } from '../../../common/strings.js';
import './countBadge.css';
import { Disposable, MutableDisposable, toDisposable } from '../../../common/lifecycle.js';
import { getBaseLayerHoverDelegate } from '../hover/hoverDelegate2.js';
export const unthemedCountStyles = {
    badgeBackground: '#4D4D4D',
    badgeForeground: '#FFFFFF',
    badgeBorder: undefined
};
export class CountBadge extends Disposable {
    constructor(container, options, styles) {
        super();
        this.options = options;
        this.styles = styles;
        this.count = 0;
        this.hover = this._register(new MutableDisposable());
        this.element = append(container, $('.monaco-count-badge'));
        this._register(toDisposable(() => container.removeChild(this.element)));
        this.countFormat = this.options.countFormat || '{0}';
        this.titleFormat = this.options.titleFormat || '';
        this.setCount(this.options.count || 0);
        this.updateHover();
    }
    setCount(count) {
        this.count = count;
        this.render();
    }
    setCountFormat(countFormat) {
        this.countFormat = countFormat;
        this.render();
    }
    setTitleFormat(titleFormat) {
        this.titleFormat = titleFormat;
        this.updateHover();
        this.render();
    }
    updateHover() {
        if (this.titleFormat !== '' && !this.hover.value) {
            this.hover.value = getBaseLayerHoverDelegate().setupDelayedHoverAtMouse(this.element, () => ({ content: format(this.titleFormat, this.count), appearance: { compact: true } }));
        }
        else if (this.titleFormat === '' && this.hover.value) {
            this.hover.value = undefined;
        }
    }
    render() {
        this.element.textContent = format(this.countFormat, this.count);
        this.element.style.backgroundColor = this.styles.badgeBackground ?? '';
        this.element.style.color = this.styles.badgeForeground ?? '';
        if (this.styles.badgeBorder) {
            this.element.style.border = `1px solid ${this.styles.badgeBorder}`;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY291bnRCYWRnZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvdWkvY291bnRCYWRnZS9jb3VudEJhZGdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLE1BQU0sY0FBYyxDQUFDO0FBQ3pDLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUNwRCxPQUFPLGtCQUFrQixDQUFDO0FBQzFCLE9BQU8sRUFBRSxVQUFVLEVBQWUsaUJBQWlCLEVBQUUsWUFBWSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDeEcsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFjdkUsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQXNCO0lBQ3JELGVBQWUsRUFBRSxTQUFTO0lBQzFCLGVBQWUsRUFBRSxTQUFTO0lBQzFCLFdBQVcsRUFBRSxTQUFTO0NBQ3RCLENBQUM7QUFFRixNQUFNLE9BQU8sVUFBVyxTQUFRLFVBQVU7SUFRekMsWUFBWSxTQUFzQixFQUFtQixPQUEyQixFQUFtQixNQUF5QjtRQUUzSCxLQUFLLEVBQUUsQ0FBQztRQUY0QyxZQUFPLEdBQVAsT0FBTyxDQUFvQjtRQUFtQixXQUFNLEdBQU4sTUFBTSxDQUFtQjtRQUxwSCxVQUFLLEdBQVcsQ0FBQyxDQUFDO1FBR1QsVUFBSyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxpQkFBaUIsRUFBZSxDQUFDLENBQUM7UUFLN0UsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUM7UUFDM0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsR0FBRyxF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