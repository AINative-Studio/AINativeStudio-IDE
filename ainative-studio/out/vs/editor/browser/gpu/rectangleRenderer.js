/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getActiveWindow } from '../../../base/browser/dom.js';
import { Event } from '../../../base/common/event.js';
import { MutableDisposable } from '../../../base/common/lifecycle.js';
import { ViewEventHandler } from '../../common/viewEventHandler.js';
import { GPULifecycle } from './gpuDisposable.js';
import { observeDevicePixelDimensions, quadVertices } from './gpuUtils.js';
import { createObjectCollectionBuffer } from './objectCollectionBuffer.js';
import { rectangleRendererWgsl } from './rectangleRenderer.wgsl.js';
export class RectangleRenderer extends ViewEventHandler {
    constructor(_context, _contentLeft, _devicePixelRatio, _canvas, _ctx, device) {
        super();
        this._context = _context;
        this._contentLeft = _contentLeft;
        this._devicePixelRatio = _devicePixelRatio;
        this._canvas = _canvas;
        this._ctx = _ctx;
        this._shapeBindBuffer = this._register(new MutableDisposable());
        this._initialized = false;
        this._shapeCollection = this._register(createObjectCollectionBuffer([
            { name: 'x' },
            { name: 'y' },
            { name: 'width' },
            { name: 'height' },
            { name: 'red' },
            { name: 'green' },
            { name: 'blue' },
            { name: 'alpha' },
        ], 32));
        this._context.addEventHandler(this);
        this._initWebgpu(device);
    }
    async _initWebgpu(device) {
        // #region General
        this._device = await device;
        if (this._store.isDisposed) {
            return;
        }
        const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
        this._ctx.configure({
            device: this._device,
            format: presentationFormat,
            alphaMode: 'premultiplied',
        });
        this._renderPassColorAttachment = {
            view: null, // Will be filled at render time
            loadOp: 'load',
            storeOp: 'store',
        };
        this._renderPassDescriptor = {
            label: 'Monaco rectangle renderer render pass',
            colorAttachments: [this._renderPassColorAttachment],
        };
        // #endregion General
        // #region Uniforms
        let layoutInfoUniformBuffer;
        {
            let Info;
            (function (Info) {
                Info[Info["FloatsPerEntry"] = 6] = "FloatsPerEntry";
                Info[Info["BytesPerEntry"] = 24] = "BytesPerEntry";
                Info[Info["Offset_CanvasWidth____"] = 0] = "Offset_CanvasWidth____";
                Info[Info["Offset_CanvasHeight___"] = 1] = "Offset_CanvasHeight___";
                Info[Info["Offset_ViewportOffsetX"] = 2] = "Offset_ViewportOffsetX";
                Info[Info["Offset_ViewportOffsetY"] = 3] = "Offset_ViewportOffsetY";
                Info[Info["Offset_ViewportWidth__"] = 4] = "Offset_ViewportWidth__";
                Info[Info["Offset_ViewportHeight_"] = 5] = "Offset_ViewportHeight_";
            })(Info || (Info = {}));
            const bufferValues = new Float32Array(6 /* Info.FloatsPerEntry */);
            const updateBufferValues = (canvasDevicePixelWidth = this._canvas.width, canvasDevicePixelHeight = this._canvas.height) => {
                bufferValues[0 /* Info.Offset_CanvasWidth____ */] = canvasDevicePixelWidth;
                bufferValues[1 /* Info.Offset_CanvasHeight___ */] = canvasDevicePixelHeight;
                bufferValues[2 /* Info.Offset_ViewportOffsetX */] = Math.ceil(this._context.configuration.options.get(151 /* EditorOption.layoutInfo */).contentLeft * getActiveWindow().devicePixelRatio);
                bufferValues[3 /* Info.Offset_ViewportOffsetY */] = 0;
                bufferValues[4 /* Info.Offset_ViewportWidth__ */] = bufferValues[0 /* Info.Offset_CanvasWidth____ */] - bufferValues[2 /* Info.Offset_ViewportOffsetX */];
                bufferValues[5 /* Info.Offset_ViewportHeight_ */] = bufferValues[1 /* Info.Offset_CanvasHeight___ */] - bufferValues[3 /* Info.Offset_ViewportOffsetY */];
                return bufferValues;
            };
            layoutInfoUniformBuffer = this._register(GPULifecycle.createBuffer(this._device, {
                label: 'Monaco rectangle renderer uniform buffer',
                size: 24 /* Info.BytesPerEntry */,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            }, () => updateBufferValues())).object;
            this._register(observeDevicePixelDimensions(this._canvas, getActiveWindow(), (w, h) => {
                this._device.queue.writeBuffer(layoutInfoUniformBuffer, 0, updateBufferValues(w, h));
            }));
        }
        const scrollOffsetBufferSize = 2;
        this._scrollOffsetBindBuffer = this._register(GPULifecycle.createBuffer(this._device, {
            label: 'Monaco rectangle renderer scroll offset buffer',
            size: scrollOffsetBufferSize * Float32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })).object;
        this._scrollOffsetValueBuffer = new Float32Array(scrollOffsetBufferSize);
        // #endregion Uniforms
        // #region Storage buffers
        const createShapeBindBuffer = () => {
            return GPULifecycle.createBuffer(this._device, {
                label: 'Monaco rectangle renderer shape buffer',
                size: this._shapeCollection.buffer.byteLength,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            });
        };
        this._shapeBindBuffer.value = createShapeBindBuffer();
        this._register(Event.runAndSubscribe(this._shapeCollection.onDidChangeBuffer, () => {
            this._shapeBindBuffer.value = createShapeBindBuffer();
            if (this._pipeline) {
                this._updateBindGroup(this._pipeline, layoutInfoUniformBuffer);
            }
        }));
        // #endregion Storage buffers
        // #region Vertex buffer
        this._vertexBuffer = this._register(GPULifecycle.createBuffer(this._device, {
            label: 'Monaco rectangle renderer vertex buffer',
            size: quadVertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        }, quadVertices)).object;
        // #endregion Vertex buffer
        // #region Shader module
        const module = this._device.createShaderModule({
            label: 'Monaco rectangle renderer shader module',
            code: rectangleRendererWgsl,
        });
        // #endregion Shader module
        // #region Pipeline
        this._pipeline = this._device.createRenderPipeline({
            label: 'Monaco rectangle renderer render pipeline',
            layout: 'auto',
            vertex: {
                module,
                buffers: [
                    {
                        arrayStride: 2 * Float32Array.BYTES_PER_ELEMENT, // 2 floats, 4 bytes each
                        attributes: [
                            { shaderLocation: 0, offset: 0, format: 'float32x2' }, // position
                        ],
                    }
                ]
            },
            fragment: {
                module,
                targets: [
                    {
                        format: presentationFormat,
                        blend: {
                            color: {
                                srcFactor: 'src-alpha',
                                dstFactor: 'one-minus-src-alpha'
                            },
                            alpha: {
                                srcFactor: 'src-alpha',
                                dstFactor: 'one-minus-src-alpha'
                            },
                        },
                    }
                ],
            },
        });
        // #endregion Pipeline
        // #region Bind group
        this._updateBindGroup(this._pipeline, layoutInfoUniformBuffer);
        // endregion Bind group
        this._initialized = true;
    }
    _updateBindGroup(pipeline, layoutInfoUniformBuffer) {
        this._bindGroup = this._device.createBindGroup({
            label: 'Monaco rectangle renderer bind group',
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0 /* RectangleRendererBindingId.Shapes */, resource: { buffer: this._shapeBindBuffer.value.object } },
                { binding: 1 /* RectangleRendererBindingId.LayoutInfoUniform */, resource: { buffer: layoutInfoUniformBuffer } },
                { binding: 2 /* RectangleRendererBindingId.ScrollOffset */, resource: { buffer: this._scrollOffsetBindBuffer } },
            ],
        });
    }
    register(x, y, width, height, red, green, blue, alpha) {
        return this._shapeCollection.createEntry({ x, y, width, height, red, green, blue, alpha });
    }
    // #region Event handlers
    onScrollChanged(e) {
        if (this._device) {
            const dpr = getActiveWindow().devicePixelRatio;
            this._scrollOffsetValueBuffer[0] = this._context.viewLayout.getCurrentScrollLeft() * dpr;
            this._scrollOffsetValueBuffer[1] = this._context.viewLayout.getCurrentScrollTop() * dpr;
            this._device.queue.writeBuffer(this._scrollOffsetBindBuffer, 0, this._scrollOffsetValueBuffer);
        }
        return true;
    }
    // #endregion
    _update() {
        if (!this._device) {
            return;
        }
        const shapes = this._shapeCollection;
        if (shapes.dirtyTracker.isDirty) {
            this._device.queue.writeBuffer(this._shapeBindBuffer.value.object, 0, shapes.buffer, shapes.dirtyTracker.dataOffset, shapes.dirtyTracker.dirtySize * shapes.view.BYTES_PER_ELEMENT);
            shapes.dirtyTracker.clear();
        }
    }
    draw(viewportData) {
        if (!this._initialized) {
            return;
        }
        this._update();
        const encoder = this._device.createCommandEncoder({ label: 'Monaco rectangle renderer command encoder' });
        this._renderPassColorAttachment.view = this._ctx.getCurrentTexture().createView();
        const pass = encoder.beginRenderPass(this._renderPassDescriptor);
        pass.setPipeline(this._pipeline);
        pass.setVertexBuffer(0, this._vertexBuffer);
        pass.setBindGroup(0, this._bindGroup);
        // Only draw the content area
        const contentLeft = Math.ceil(this._contentLeft.get() * this._devicePixelRatio.get());
        pass.setScissorRect(contentLeft, 0, this._canvas.width - contentLeft, this._canvas.height);
        pass.draw(quadVertices.length / 2, this._shapeCollection.entryCount);
        pass.end();
        const commandBuffer = encoder.finish();
        this._device.queue.submit([commandBuffer]);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVjdGFuZ2xlUmVuZGVyZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvZ3B1L3JlY3RhbmdsZVJlbmRlcmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUMvRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDdEQsT0FBTyxFQUFjLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFHbEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFJcEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ2xELE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxZQUFZLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDM0UsT0FBTyxFQUFFLDRCQUE0QixFQUFtRSxNQUFNLDZCQUE2QixDQUFDO0FBQzVJLE9BQU8sRUFBOEIscUJBQXFCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQWFoRyxNQUFNLE9BQU8saUJBQWtCLFNBQVEsZ0JBQWdCO0lBMkJ0RCxZQUNrQixRQUFxQixFQUNyQixZQUFpQyxFQUNqQyxpQkFBc0MsRUFDdEMsT0FBMEIsRUFDMUIsSUFBc0IsRUFDdkMsTUFBMEI7UUFFMUIsS0FBSyxFQUFFLENBQUM7UUFQUyxhQUFRLEdBQVIsUUFBUSxDQUFhO1FBQ3JCLGlCQUFZLEdBQVosWUFBWSxDQUFxQjtRQUNqQyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQXFCO1FBQ3RDLFlBQU8sR0FBUCxPQUFPLENBQW1CO1FBQzFCLFNBQUksR0FBSixJQUFJLENBQWtCO1FBdkJ2QixxQkFBZ0IsR0FBNkMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJ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