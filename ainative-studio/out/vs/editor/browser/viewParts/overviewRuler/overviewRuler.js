/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createFastDomNode } from '../../../../base/browser/fastDomNode.js';
import { OverviewZoneManager } from '../../../common/viewModel/overviewZoneManager.js';
import { ViewEventHandler } from '../../../common/viewEventHandler.js';
/**
 * The overview ruler appears underneath the editor scroll bar and shows things
 * like the cursor, various decorations, etc.
 */
export class OverviewRuler extends ViewEventHandler {
    constructor(context, cssClassName) {
        super();
        this._context = context;
        const options = this._context.configuration.options;
        this._domNode = createFastDomNode(document.createElement('canvas'));
        this._domNode.setClassName(cssClassName);
        this._domNode.setPosition('absolute');
        this._domNode.setLayerHinting(true);
        this._domNode.setContain('strict');
        this._zoneManager = new OverviewZoneManager((lineNumber) => this._context.viewLayout.getVerticalOffsetForLineNumber(lineNumber));
        this._zoneManager.setDOMWidth(0);
        this._zoneManager.setDOMHeight(0);
        this._zoneManager.setOuterHeight(this._context.viewLayout.getScrollHeight());
        this._zoneManager.setLineHeight(options.get(68 /* EditorOption.lineHeight */));
        this._zoneManager.setPixelRatio(options.get(149 /* EditorOption.pixelRatio */));
        this._context.addEventHandler(this);
    }
    dispose() {
        this._context.removeEventHandler(this);
        super.dispose();
    }
    // ---- begin view event handlers
    onConfigurationChanged(e) {
        const options = this._context.configuration.options;
        if (e.hasChanged(68 /* EditorOption.lineHeight */)) {
            this._zoneManager.setLineHeight(options.get(68 /* EditorOption.lineHeight */));
            this._render();
        }
        if (e.hasChanged(149 /* EditorOption.pixelRatio */)) {
            this._zoneManager.setPixelRatio(options.get(149 /* EditorOption.pixelRatio */));
            this._domNode.setWidth(this._zoneManager.getDOMWidth());
            this._domNode.setHeight(this._zoneManager.getDOMHeight());
            this._domNode.domNode.width = this._zoneManager.getCanvasWidth();
            this._domNode.domNode.height = this._zoneManager.getCanvasHeight();
            this._render();
        }
        return true;
    }
    onFlushed(e) {
        this._render();
        return true;
    }
    onScrollChanged(e) {
        if (e.scrollHeightChanged) {
            this._zoneManager.setOuterHeight(e.scrollHeight);
            this._render();
        }
        return true;
    }
    onZonesChanged(e) {
        this._render();
        return true;
    }
    // ---- end view event handlers
    getDomNode() {
        return this._domNode.domNode;
    }
    setLayout(position) {
        this._domNode.setTop(position.top);
        this._domNode.setRight(position.right);
        let hasChanged = false;
        hasChanged = this._zoneManager.setDOMWidth(position.width) || hasChanged;
        hasChanged = this._zoneManager.setDOMHeight(position.height) || hasChanged;
        if (hasChanged) {
            this._domNode.setWidth(this._zoneManager.getDOMWidth());
            this._domNode.setHeight(this._zoneManager.getDOMHeight());
            this._domNode.domNode.width = this._zoneManager.getCanvasWidth();
            this._domNode.domNode.height = this._zoneManager.getCanvasHeight();
            this._render();
        }
    }
    setZones(zones) {
        this._zoneManager.setZones(zones);
        this._render();
    }
    _render() {
        if (this._zoneManager.getOuterHeight() === 0) {
            return false;
        }
        const width = this._zoneManager.getCanvasWidth();
        const height = this._zoneManager.getCanvasHeight();
        const colorZones = this._zoneManager.resolveColorZones();
        const id2Color = this._zoneManager.getId2Color();
        const ctx = this._domNode.domNode.getContext('2d');
        ctx.clearRect(0, 0, width, height);
        if (colorZones.length > 0) {
            this._renderOneLane(ctx, colorZones, id2Color, width);
        }
        return true;
    }
    _renderOneLane(ctx, colorZones, id2Color, width) {
        let currentColorId = 0;
        let currentFrom = 0;
        let currentTo = 0;
        for (const zone of colorZones) {
            const zoneColorId = zone.colorId;
            const zoneFrom = zone.from;
            const zoneTo = zone.to;
            if (zoneColorId !== currentColorId) {
                ctx.fillRect(0, currentFrom, width, currentTo - currentFrom);
                currentColorId = zoneColorId;
                ctx.fillStyle = id2Color[currentColorId];
                currentFrom = zoneFrom;
                currentTo = zoneTo;
            }
            else {
                if (currentTo >= zoneFrom) {
                    currentTo = Math.max(currentTo, zoneTo);
                }
                else {
                    ctx.fillRect(0, currentFrom, width, currentTo - currentFrom);
                    currentFrom = zoneFrom;
                    currentTo = zoneTo;
                }
            }
        }
        ctx.fillRect(0, currentFrom, width, currentTo - currentFrom);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3ZlcnZpZXdSdWxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci92aWV3UGFydHMvb3ZlcnZpZXdSdWxlci9vdmVydmlld1J1bGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBZSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBR3pGLE9BQU8sRUFBZ0MsbUJBQW1CLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUdySCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUV2RTs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sYUFBYyxTQUFRLGdCQUFnQjtJQU1sRCxZQUFZLE9BQW9CLEVBQUUsWUFBb0I7UUFDckQsS0FBSyxFQUFFLENBQUM7UUFDUixJQUFJLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQztRQUN4QixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUM7UUFFcEQsSUFBSSxDQUFDLFFBQVEsR0FBRyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFDcEUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDekMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDdEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDcEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFbkMsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLG1CQUFtQixDQUFDLENBQUMsVUFBa0IsRUFBRSxFQUFF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