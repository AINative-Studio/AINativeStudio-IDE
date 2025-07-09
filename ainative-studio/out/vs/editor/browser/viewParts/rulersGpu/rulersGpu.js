/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ViewPart } from '../../view/viewPart.js';
import { Color } from '../../../../base/common/color.js';
import { editorRuler } from '../../../common/core/editorColorRegistry.js';
import { autorun } from '../../../../base/common/observable.js';
/**
 * Rulers are vertical lines that appear at certain columns in the editor. There can be >= 0 rulers
 * at a time.
 */
export class RulersGpu extends ViewPart {
    constructor(context, _viewGpuContext) {
        super(context);
        this._viewGpuContext = _viewGpuContext;
        this._gpuShapes = [];
        this._register(autorun(reader => this._updateEntries(reader)));
    }
    // --- begin event handlers
    onConfigurationChanged(e) {
        this._updateEntries(undefined);
        return true;
    }
    // --- end event handlers
    prepareRender(ctx) {
        // Nothing to read
    }
    render(ctx) {
        // Rendering is handled by RectangleRenderer
    }
    _updateEntries(reader) {
        const options = this._context.configuration.options;
        const rulers = options.get(107 /* EditorOption.rulers */);
        const typicalHalfwidthCharacterWidth = options.get(52 /* EditorOption.fontInfo */).typicalHalfwidthCharacterWidth;
        const devicePixelRatio = this._viewGpuContext.devicePixelRatio.read(reader);
        for (let i = 0, len = rulers.length; i < len; i++) {
            const ruler = rulers[i];
            const shape = this._gpuShapes[i];
            const color = ruler.color ? Color.fromHex(ruler.color) : this._context.theme.getColor(editorRuler) ?? Color.white;
            const rulerData = [
                ruler.column * typicalHalfwidthCharacterWidth * devicePixelRatio,
                0,
                Math.max(1, Math.ceil(devicePixelRatio)),
                Number.MAX_SAFE_INTEGER,
                color.rgba.r / 255,
                color.rgba.g / 255,
                color.rgba.b / 255,
                color.rgba.a,
            ];
            if (!shape) {
                this._gpuShapes[i] = this._viewGpuContext.rectangleRenderer.register(...rulerData);
            }
            else {
                shape.setRaw(rulerData);
            }
        }
        while (this._gpuShapes.length > rulers.length) {
            this._gpuShapes.splice(-1, 1)[0].dispose();
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZXJzR3B1LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3ZpZXdQYXJ0cy9ydWxlcnNHcHUvcnVsZXJzR3B1LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQVFsRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxPQUFPLEVBQWdCLE1BQU0sdUNBQXVDLENBQUM7QUFFOUU7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLFNBQVUsU0FBUSxRQUFRO0lBSXRDLFlBQ0MsT0FBb0IsRUFDSCxlQUErQjtRQUVoRCxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7UUFGRSxvQkFBZSxHQUFmLGVBQWUsQ0FBZ0I7UUFKaEMsZUFBVSxHQUErRCxFQUFFLENBQUM7UUFPNUYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNoRSxDQUFDO0lBRUQsMkJBQTJCO0lBRVgsc0JBQXNCLENBQUMsQ0FBMkM7UUFDakYsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUMvQixPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFRCx5QkFBeUI7SUFFbEIsYUFBYSxDQUFDLEdBQXFCO1FBQ3pDLGtCQUFrQjtJQUNuQixDQUFDO0lBRU0sTUFBTSxDQUFDLEdBQStCO1FBQzVDLDRDQUE0QztJQUM3QyxDQUFDO0lBRU8sY0FBYyxDQUFDLE1BQTJCO1FBQ2pELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQztRQUNwRCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsR0FBRywrQkFBcUIsQ0FBQztRQUNoRCxNQUFNLDhCQUE4QixHQUFHLE9BQU8sQ0FBQyxHQUFHLGdDQUF1QixDQUFDLDhCQUE4QixDQUFDO1FBQ3pHLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDNUUsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ25ELE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN4QixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2pDLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQztZQUNsSCxNQUFNLFNBQVMsR0FBOEM7Z0JBQzVELEtBQUssQ0FBQyxNQUFNLEdBQUcsOEJBQThCLEdBQUcsZ0JBQWdCO2dCQUNoRSxDQUFDO2dCQUNELElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztnQkFDeEMsTUFBTSxDQUFDLGdCQUFnQjtnQkFDdkIsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRztnQkFDbEIsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRztnQkFDbEIsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRztnQkFDbEIsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ1osQ0FBQztZQUNGLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDWixJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLEdBQUcsU0FBUyxDQUFDLENBQUM7WUFDcEYsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLEtBQUssQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDekIsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUMvQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUM1QyxDQUFDO0lBQ0YsQ0FBQztDQUNEIn0=