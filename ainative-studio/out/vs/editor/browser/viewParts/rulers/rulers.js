/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './rulers.css';
import { createFastDomNode } from '../../../../base/browser/fastDomNode.js';
import { ViewPart } from '../../view/viewPart.js';
/**
 * Rulers are vertical lines that appear at certain columns in the editor. There can be >= 0 rulers
 * at a time.
 */
export class Rulers extends ViewPart {
    constructor(context) {
        super(context);
        this.domNode = createFastDomNode(document.createElement('div'));
        this.domNode.setAttribute('role', 'presentation');
        this.domNode.setAttribute('aria-hidden', 'true');
        this.domNode.setClassName('view-rulers');
        this._renderedRulers = [];
        const options = this._context.configuration.options;
        this._rulers = options.get(107 /* EditorOption.rulers */);
        this._typicalHalfwidthCharacterWidth = options.get(52 /* EditorOption.fontInfo */).typicalHalfwidthCharacterWidth;
    }
    dispose() {
        super.dispose();
    }
    // --- begin event handlers
    onConfigurationChanged(e) {
        const options = this._context.configuration.options;
        this._rulers = options.get(107 /* EditorOption.rulers */);
        this._typicalHalfwidthCharacterWidth = options.get(52 /* EditorOption.fontInfo */).typicalHalfwidthCharacterWidth;
        return true;
    }
    onScrollChanged(e) {
        return e.scrollHeightChanged;
    }
    // --- end event handlers
    prepareRender(ctx) {
        // Nothing to read
    }
    _ensureRulersCount() {
        const currentCount = this._renderedRulers.length;
        const desiredCount = this._rulers.length;
        if (currentCount === desiredCount) {
            // Nothing to do
            return;
        }
        if (currentCount < desiredCount) {
            const { tabSize } = this._context.viewModel.model.getOptions();
            const rulerWidth = tabSize;
            let addCount = desiredCount - currentCount;
            while (addCount > 0) {
                const node = createFastDomNode(document.createElement('div'));
                node.setClassName('view-ruler');
                node.setWidth(rulerWidth);
                this.domNode.appendChild(node);
                this._renderedRulers.push(node);
                addCount--;
            }
            return;
        }
        let removeCount = currentCount - desiredCount;
        while (removeCount > 0) {
            const node = this._renderedRulers.pop();
            this.domNode.removeChild(node);
            removeCount--;
        }
    }
    render(ctx) {
        this._ensureRulersCount();
        for (let i = 0, len = this._rulers.length; i < len; i++) {
            const node = this._renderedRulers[i];
            const ruler = this._rulers[i];
            node.setBoxShadow(ruler.color ? `1px 0 0 0 ${ruler.color} inset` : ``);
            node.setHeight(Math.min(ctx.scrollHeight, 1000000));
            node.setLeft(ruler.column * this._typicalHalfwidthCharacterWidth);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZXJzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3ZpZXdQYXJ0cy9ydWxlcnMvcnVsZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sY0FBYyxDQUFDO0FBQ3RCLE9BQU8sRUFBZSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQU1sRDs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sTUFBTyxTQUFRLFFBQVE7SUFPbkMsWUFBWSxPQUFvQjtRQUMvQixLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDZixJQUFJLENBQUMsT0FBTyxHQUFHLGlCQUFpQixDQUFjLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUM3RSxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDbEQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsYUFBYSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ2pELElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ3pDLElBQUksQ0FBQyxlQUFlLEdBQUcsRUFBRSxDQUFDO1FBQzFCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQztRQUNwRCxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQyxHQUFHLCtCQUFxQixDQUFDO1FBQ2hELElBQUksQ0FBQywrQkFBK0IsR0FBRyxPQUFPLENBQUMsR0FBRyxnQ0FBdUIsQ0FBQyw4QkFBOEIsQ0FBQztJQUMxRyxDQUFDO0lBRWUsT0FBTztRQUN0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