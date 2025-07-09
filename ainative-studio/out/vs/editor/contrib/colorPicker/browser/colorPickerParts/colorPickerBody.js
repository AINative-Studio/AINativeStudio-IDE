/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import '../colorPicker.css';
import * as dom from '../../../../../base/browser/dom.js';
import { Color, HSVA } from '../../../../../base/common/color.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { SaturationBox } from './colorPickerSaturationBox.js';
import { InsertButton } from './colorPickerInsertButton.js';
import { HueStrip, OpacityStrip } from './colorPickerStrip.js';
const $ = dom.$;
export class ColorPickerBody extends Disposable {
    constructor(container, model, pixelRatio, type) {
        super();
        this.model = model;
        this.pixelRatio = pixelRatio;
        this._insertButton = null;
        this._domNode = $('.colorpicker-body');
        dom.append(container, this._domNode);
        this._saturationBox = new SaturationBox(this._domNode, this.model, this.pixelRatio);
        this._register(this._saturationBox);
        this._register(this._saturationBox.onDidChange(this.onDidSaturationValueChange, this));
        this._register(this._saturationBox.onColorFlushed(this.flushColor, this));
        this._opacityStrip = new OpacityStrip(this._domNode, this.model, type);
        this._register(this._opacityStrip);
        this._register(this._opacityStrip.onDidChange(this.onDidOpacityChange, this));
        this._register(this._opacityStrip.onColorFlushed(this.flushColor, this));
        this._hueStrip = new HueStrip(this._domNode, this.model, type);
        this._register(this._hueStrip);
        this._register(this._hueStrip.onDidChange(this.onDidHueChange, this));
        this._register(this._hueStrip.onColorFlushed(this.flushColor, this));
        if (type === "standalone" /* ColorPickerWidgetType.Standalone */) {
            this._insertButton = this._register(new InsertButton(this._domNode));
            this._domNode.classList.add('standalone-colorpicker');
        }
    }
    flushColor() {
        this.model.flushColor();
    }
    onDidSaturationValueChange({ s, v }) {
        const hsva = this.model.color.hsva;
        this.model.color = new Color(new HSVA(hsva.h, s, v, hsva.a));
    }
    onDidOpacityChange(a) {
        const hsva = this.model.color.hsva;
        this.model.color = new Color(new HSVA(hsva.h, hsva.s, hsva.v, a));
    }
    onDidHueChange(value) {
        const hsva = this.model.color.hsva;
        const h = (1 - value) * 360;
        this.model.color = new Color(new HSVA(h === 360 ? 0 : h, hsva.s, hsva.v, hsva.a));
    }
    get domNode() {
        return this._domNode;
    }
    get saturationBox() {
        return this._saturationBox;
    }
    get opacityStrip() {
        return this._opacityStrip;
    }
    get hueStrip() {
        return this._hueStrip;
    }
    get enterButton() {
        return this._insertButton;
    }
    layout() {
        this._saturationBox.layout();
        this._opacityStrip.layout();
        this._hueStrip.layout();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sb3JQaWNrZXJCb2R5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2NvbG9yUGlja2VyL2Jyb3dzZXIvY29sb3JQaWNrZXJQYXJ0cy9jb2xvclBpY2tlckJvZHkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxvQkFBb0IsQ0FBQztBQUM1QixPQUFPLEtBQUssR0FBRyxNQUFNLG9DQUFvQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRXJFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUM5RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDNUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQVMsTUFBTSx1QkFBdUIsQ0FBQztBQUd0RSxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBRWhCLE1BQU0sT0FBTyxlQUFnQixTQUFRLFVBQVU7SUFROUMsWUFBWSxTQUFzQixFQUFtQixLQUF1QixFQUFVLFVBQWtCLEVBQUUsSUFBMkI7UUFDcEksS0FBSyxFQUFFLENBQUM7UUFENEMsVUFBSyxHQUFMLEtBQUssQ0FBa0I7UUFBVSxlQUFVLEdBQVYsVUFBVSxDQUFRO1FBRnZGLGtCQUFhLEdBQXdCLElBQUksQ0FBQztRQUsxRCxJQUFJLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBQ3ZDLEdBQUcsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUVyQyxJQUFJLENBQUMsY0FB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