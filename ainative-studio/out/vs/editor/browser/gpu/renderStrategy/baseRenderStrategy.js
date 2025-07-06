/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ViewEventHandler } from '../../../common/viewEventHandler.js';
export class BaseRenderStrategy extends ViewEventHandler {
    get glyphRasterizer() { return this._glyphRasterizer.value; }
    constructor(_context, _viewGpuContext, _device, _glyphRasterizer) {
        super();
        this._context = _context;
        this._viewGpuContext = _viewGpuContext;
        this._device = _device;
        this._glyphRasterizer = _glyphRasterizer;
        this._context.addEventHandler(this);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZVJlbmRlclN0cmF0ZWd5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci9ncHUvcmVuZGVyU3RyYXRlZ3kvYmFzZVJlbmRlclN0cmF0ZWd5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBUXZFLE1BQU0sT0FBZ0Isa0JBQW1CLFNBQVEsZ0JBQWdCO0lBRWhFLElBQUksZUFBZSxLQUFLLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFNN0QsWUFDb0IsUUFBcUIsRUFDckIsZUFBK0IsRUFDL0IsT0FBa0IsRUFDbEIsZ0JBQTRDO1FBRS9ELEtBQUssRUFBRSxDQUFDO1FBTFcsYUFBUSxHQUFSLFFBQVEsQ0FBYTtRQUNyQixvQkFBZSxHQUFmLGVBQWUsQ0FBZ0I7UUFDL0IsWUFBTyxHQUFQLE9BQU8sQ0FBVztRQUNsQixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQTRCO1FBSS9ELElBQUksQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3JDLENBQUM7Q0FLRCJ9