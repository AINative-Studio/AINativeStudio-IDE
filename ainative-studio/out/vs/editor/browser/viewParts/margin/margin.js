/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './margin.css';
import { createFastDomNode } from '../../../../base/browser/fastDomNode.js';
import { ViewPart } from '../../view/viewPart.js';
/**
 * Margin is a vertical strip located on the left of the editor's content area.
 * It is used for various features such as line numbers, folding markers, and
 * decorations that provide additional information about the lines of code.
 */
export class Margin extends ViewPart {
    static { this.CLASS_NAME = 'glyph-margin'; }
    static { this.OUTER_CLASS_NAME = 'margin'; }
    constructor(context) {
        super(context);
        const options = this._context.configuration.options;
        const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
        this._canUseLayerHinting = !options.get(32 /* EditorOption.disableLayerHinting */);
        this._contentLeft = layoutInfo.contentLeft;
        this._glyphMarginLeft = layoutInfo.glyphMarginLeft;
        this._glyphMarginWidth = layoutInfo.glyphMarginWidth;
        this._domNode = createFastDomNode(document.createElement('div'));
        this._domNode.setClassName(Margin.OUTER_CLASS_NAME);
        this._domNode.setPosition('absolute');
        this._domNode.setAttribute('role', 'presentation');
        this._domNode.setAttribute('aria-hidden', 'true');
        this._glyphMarginBackgroundDomNode = createFastDomNode(document.createElement('div'));
        this._glyphMarginBackgroundDomNode.setClassName(Margin.CLASS_NAME);
        this._domNode.appendChild(this._glyphMarginBackgroundDomNode);
    }
    dispose() {
        super.dispose();
    }
    getDomNode() {
        return this._domNode;
    }
    // --- begin event handlers
    onConfigurationChanged(e) {
        const options = this._context.configuration.options;
        const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
        this._canUseLayerHinting = !options.get(32 /* EditorOption.disableLayerHinting */);
        this._contentLeft = layoutInfo.contentLeft;
        this._glyphMarginLeft = layoutInfo.glyphMarginLeft;
        this._glyphMarginWidth = layoutInfo.glyphMarginWidth;
        return true;
    }
    onScrollChanged(e) {
        return super.onScrollChanged(e) || e.scrollTopChanged;
    }
    // --- end event handlers
    prepareRender(ctx) {
        // Nothing to read
    }
    render(ctx) {
        this._domNode.setLayerHinting(this._canUseLayerHinting);
        this._domNode.setContain('strict');
        const adjustedScrollTop = ctx.scrollTop - ctx.bigNumbersDelta;
        this._domNode.setTop(-adjustedScrollTop);
        const height = Math.min(ctx.scrollHeight, 1000000);
        this._domNode.setHeight(height);
        this._domNode.setWidth(this._contentLeft);
        this._glyphMarginBackgroundDomNode.setLeft(this._glyphMarginLeft);
        this._glyphMarginBackgroundDomNode.setWidth(this._glyphMarginWidth);
        this._glyphMarginBackgroundDomNode.setHeight(height);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFyZ2luLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3ZpZXdQYXJ0cy9tYXJnaW4vbWFyZ2luLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sY0FBYyxDQUFDO0FBQ3RCLE9BQU8sRUFBZSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQU1sRDs7OztHQUlHO0FBQ0gsTUFBTSxPQUFPLE1BQU8sU0FBUSxRQUFRO2FBRVosZUFBVSxHQUFHLGNBQWMsQ0FBQzthQUM1QixxQkFBZ0IsR0FBRyxRQUFRLENBQUM7SUFTbkQsWUFBWSxPQUFvQjtRQUMvQixLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDZixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUM7UUFDcEQsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsbUNBQXlCLENBQUM7UUFFeEQsSUFBSSxDQUFDLG1CQUFtQixHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsMkNBQWtDLENBQUM7UUFDMUUsSUFBSSxDQUFDLFlBQVksR0FBRyxVQUFVLENBQUMsV0FBVyxDQUFDO1FBQzNDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxVQUFVLENBQUMsZUFBZSxDQUFDO1FBQ25ELElBQUksQ0FBQyxpQkFBaUIsR0FBRyxVQUFVLENBQUMsZ0JBQWdCLENBQUM7UUFFckQsSUFBSSxDQUFDLFFBQVEsR0FBRyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDakUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDcEQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDdEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ25ELElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLGFBQWEsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUVsRCxJQUFJLENBQUMsNkJBQTZCLEdBQUcsaUJBQWlCLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ3RGLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRW5FLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO0lBQy9ELENBQUM7SUFFZSxPQUFPO1FBQ3RCLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNqQixDQUFDO0lBRU0sVUFBVTtRQUNoQixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUM7SUFDdEIsQ0FBQztJQUVELDJCQUEyQjtJQUVYLHNCQUFzQixDQUFDLENBQTJDO1FBQ2pGLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQztRQUNwRCxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsR0FBRyxtQ0FBeUIsQ0FBQztRQUV4RCxJQUFJLENBQUMsbUJBQW1CLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRywyQ0FBa0MsQ0FBQztRQUMxRSxJQUFJLENBQUMsWUFBWSxHQUFHLFVBQVUsQ0FBQyxXQUFXLENBQUM7UUFDM0MsSUFBSSxDQUFDLGdCQUFnQixHQUFHLFVBQVUsQ0FBQyxlQUFlLENBQUM7UUFDbkQsSUFBSSxDQUFDLGlCQUFpQixHQUFHLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQztRQUVyRCxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFDZSxlQUFlLENBQUMsQ0FBb0M7UUFDbkUsT0FBTyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQztJQUN2RCxDQUFDO0lBRUQseUJBQXlCO0lBRWxCLGFBQWEsQ0FBQyxHQUFxQjtRQUN6QyxrQkFBa0I7SUFDbkIsQ0FBQztJQUVNLE1BQU0sQ0FBQyxHQUErQjtRQUM1QyxJQUFJLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUN4RCxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNuQyxNQUFNLGlCQUFpQixHQUFHLEdBQUcsQ0FBQyxTQUFTLEdBQUcsR0FBRyxDQUFDLGVBQWUsQ0FBQztRQUM5RCxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFFekMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ25ELElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2hDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUUxQyxJQUFJLENBQUMsNkJBQTZCLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ2xFLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDcEUsSUFBSSxDQUFDLDZCQUE2QixDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUN0RCxDQUFDIn0=