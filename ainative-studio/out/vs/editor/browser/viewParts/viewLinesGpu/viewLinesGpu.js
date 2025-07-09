/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { getActiveWindow } from '../../../../base/browser/dom.js';
import { BugIndicatingError } from '../../../../base/common/errors.js';
import { autorun, runOnChange } from '../../../../base/common/observable.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { TextureAtlasPage } from '../../gpu/atlas/textureAtlasPage.js';
import { GPULifecycle } from '../../gpu/gpuDisposable.js';
import { quadVertices } from '../../gpu/gpuUtils.js';
import { ViewGpuContext } from '../../gpu/viewGpuContext.js';
import { FloatHorizontalRange, HorizontalPosition, HorizontalRange, LineVisibleRanges, VisibleRanges } from '../../view/renderingContext.js';
import { ViewPart } from '../../view/viewPart.js';
import { ViewLineOptions } from '../viewLines/viewLineOptions.js';
import { CursorColumns } from '../../../common/core/cursorColumns.js';
import { TextureAtlas } from '../../gpu/atlas/textureAtlas.js';
import { createContentSegmenter } from '../../gpu/contentSegmenter.js';
import { ViewportRenderStrategy } from '../../gpu/renderStrategy/viewportRenderStrategy.js';
import { FullFileRenderStrategy } from '../../gpu/renderStrategy/fullFileRenderStrategy.js';
import { MutableDisposable } from '../../../../base/common/lifecycle.js';
import { GlyphRasterizer } from '../../gpu/raster/glyphRasterizer.js';
var GlyphStorageBufferInfo;
(function (GlyphStorageBufferInfo) {
    GlyphStorageBufferInfo[GlyphStorageBufferInfo["FloatsPerEntry"] = 6] = "FloatsPerEntry";
    GlyphStorageBufferInfo[GlyphStorageBufferInfo["BytesPerEntry"] = 24] = "BytesPerEntry";
    GlyphStorageBufferInfo[GlyphStorageBufferInfo["Offset_TexturePosition"] = 0] = "Offset_TexturePosition";
    GlyphStorageBufferInfo[GlyphStorageBufferInfo["Offset_TextureSize"] = 2] = "Offset_TextureSize";
    GlyphStorageBufferInfo[GlyphStorageBufferInfo["Offset_OriginPosition"] = 4] = "Offset_OriginPosition";
})(GlyphStorageBufferInfo || (GlyphStorageBufferInfo = {}));
/**
 * The GPU implementation of the ViewLines part.
 */
let ViewLinesGpu = class ViewLinesGpu extends ViewPart {
    constructor(context, _viewGpuContext, _instantiationService, _logService) {
        super(context);
        this._viewGpuContext = _viewGpuContext;
        this._instantiationService = _instantiationService;
        this._logService = _logService;
        this._atlasGpuTextureVersions = [];
        this._initialized = false;
        this._glyphRasterizer = this._register(new MutableDisposable());
        this._renderStrategy = this._register(new MutableDisposable());
        this.canvas = this._viewGpuContext.canvas.domNode;
        // Re-render the following frame after canvas device pixel dimensions change, provided a
        // new render does not occur.
        this._register(autorun(reader => {
            this._viewGpuContext.canvasDevicePixelDimensions.read(reader);
            const lastViewportData = this._lastViewportData;
            if (lastViewportData) {
                setTimeout(() => {
                    if (lastViewportData === this._lastViewportData) {
                        this.renderText(lastViewportData);
                    }
                });
            }
        }));
        this.initWebgpu();
    }
    async initWebgpu() {
        // #region General
        this._device = ViewGpuContext.deviceSync || await ViewGpuContext.device;
        if (this._store.isDisposed) {
            return;
        }
        const atlas = ViewGpuContext.atlas;
        // Rerender when the texture atlas deletes glyphs
        this._register(atlas.onDidDeleteGlyphs(() => {
            this._atlasGpuTextureVersions.length = 0;
            this._atlasGpuTextureVersions[0] = 0;
            this._atlasGpuTextureVersions[1] = 0;
            this._renderStrategy.value.reset();
        }));
        const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
        this._viewGpuContext.ctx.configure({
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
            label: 'Monaco render pass',
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
            const updateBufferValues = (canvasDevicePixelWidth = this.canvas.width, canvasDevicePixelHeight = this.canvas.height) => {
                bufferValues[0 /* Info.Offset_CanvasWidth____ */] = canvasDevicePixelWidth;
                bufferValues[1 /* Info.Offset_CanvasHeight___ */] = canvasDevicePixelHeight;
                bufferValues[2 /* Info.Offset_ViewportOffsetX */] = Math.ceil(this._context.configuration.options.get(151 /* EditorOption.layoutInfo */).contentLeft * getActiveWindow().devicePixelRatio);
                bufferValues[3 /* Info.Offset_ViewportOffsetY */] = 0;
                bufferValues[4 /* Info.Offset_ViewportWidth__ */] = bufferValues[0 /* Info.Offset_CanvasWidth____ */] - bufferValues[2 /* Info.Offset_ViewportOffsetX */];
                bufferValues[5 /* Info.Offset_ViewportHeight_ */] = bufferValues[1 /* Info.Offset_CanvasHeight___ */] - bufferValues[3 /* Info.Offset_ViewportOffsetY */];
                return bufferValues;
            };
            layoutInfoUniformBuffer = this._register(GPULifecycle.createBuffer(this._device, {
                label: 'Monaco uniform buffer',
                size: 24 /* Info.BytesPerEntry */,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            }, () => updateBufferValues())).object;
            this._register(runOnChange(this._viewGpuContext.canvasDevicePixelDimensions, ({ width, height }) => {
                this._device.queue.writeBuffer(layoutInfoUniformBuffer, 0, updateBufferValues(width, height));
            }));
            this._register(runOnChange(this._viewGpuContext.contentLeft, () => {
                this._device.queue.writeBuffer(layoutInfoUniformBuffer, 0, updateBufferValues());
            }));
        }
        let atlasInfoUniformBuffer;
        {
            let Info;
            (function (Info) {
                Info[Info["FloatsPerEntry"] = 2] = "FloatsPerEntry";
                Info[Info["BytesPerEntry"] = 8] = "BytesPerEntry";
                Info[Info["Offset_Width_"] = 0] = "Offset_Width_";
                Info[Info["Offset_Height"] = 1] = "Offset_Height";
            })(Info || (Info = {}));
            atlasInfoUniformBuffer = this._register(GPULifecycle.createBuffer(this._device, {
                label: 'Monaco atlas info uniform buffer',
                size: 8 /* Info.BytesPerEntry */,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            }, () => {
                const values = new Float32Array(2 /* Info.FloatsPerEntry */);
                values[0 /* Info.Offset_Width_ */] = atlas.pageSize;
                values[1 /* Info.Offset_Height */] = atlas.pageSize;
                return values;
            })).object;
        }
        // #endregion Uniforms
        // #region Storage buffers
        const fontFamily = this._context.configuration.options.get(51 /* EditorOption.fontFamily */);
        const fontSize = this._context.configuration.options.get(54 /* EditorOption.fontSize */);
        this._glyphRasterizer.value = this._register(new GlyphRasterizer(fontSize, fontFamily, this._viewGpuContext.devicePixelRatio.get()));
        this._register(runOnChange(this._viewGpuContext.devicePixelRatio, () => {
            this._refreshGlyphRasterizer();
        }));
        this._renderStrategy.value = this._instantiationService.createInstance(FullFileRenderStrategy, this._context, this._viewGpuContext, this._device, this._glyphRasterizer);
        // this._renderStrategy.value = this._instantiationService.createInstance(ViewportRenderStrategy, this._context, this._viewGpuContext, this._device);
        this._glyphStorageBuffer = this._register(GPULifecycle.createBuffer(this._device, {
            label: 'Monaco glyph storage buffer',
            size: TextureAtlas.maximumPageCount * (TextureAtlasPage.maximumGlyphCount * 24 /* GlyphStorageBufferInfo.BytesPerEntry */),
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        })).object;
        this._atlasGpuTextureVersions[0] = 0;
        this._atlasGpuTextureVersions[1] = 0;
        this._atlasGpuTexture = this._register(GPULifecycle.createTexture(this._device, {
            label: 'Monaco atlas texture',
            format: 'rgba8unorm',
            size: { width: atlas.pageSize, height: atlas.pageSize, depthOrArrayLayers: TextureAtlas.maximumPageCount },
            dimension: '2d',
            usage: GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_DST |
                GPUTextureUsage.RENDER_ATTACHMENT,
        })).object;
        this._updateAtlasStorageBufferAndTexture();
        // #endregion Storage buffers
        // #region Vertex buffer
        this._vertexBuffer = this._register(GPULifecycle.createBuffer(this._device, {
            label: 'Monaco vertex buffer',
            size: quadVertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        }, quadVertices)).object;
        // #endregion Vertex buffer
        // #region Shader module
        const module = this._device.createShaderModule({
            label: 'Monaco shader module',
            code: this._renderStrategy.value.wgsl,
        });
        // #endregion Shader module
        // #region Pipeline
        this._pipeline = this._device.createRenderPipeline({
            label: 'Monaco render pipeline',
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
        this._rebuildBindGroup = () => {
            this._bindGroup = this._device.createBindGroup({
                label: 'Monaco bind group',
                layout: this._pipeline.getBindGroupLayout(0),
                entries: [
                    // TODO: Pass in generically as array?
                    { binding: 0 /* BindingId.GlyphInfo */, resource: { buffer: this._glyphStorageBuffer } },
                    {
                        binding: 2 /* BindingId.TextureSampler */, resource: this._device.createSampler({
                            label: 'Monaco atlas sampler',
                            magFilter: 'nearest',
                            minFilter: 'nearest',
                        })
                    },
                    { binding: 3 /* BindingId.Texture */, resource: this._atlasGpuTexture.createView() },
                    { binding: 4 /* BindingId.LayoutInfoUniform */, resource: { buffer: layoutInfoUniformBuffer } },
                    { binding: 5 /* BindingId.AtlasDimensionsUniform */, resource: { buffer: atlasInfoUniformBuffer } },
                    ...this._renderStrategy.value.bindGroupEntries
                ],
            });
        };
        this._rebuildBindGroup();
        // endregion Bind group
        this._initialized = true;
        // Render the initial viewport immediately after initialization
        if (this._initViewportData) {
            // HACK: Rendering multiple times in the same frame like this isn't ideal, but there
            //       isn't an easy way to merge viewport data
            for (const viewportData of this._initViewportData) {
                this.renderText(viewportData);
            }
            this._initViewportData = undefined;
        }
    }
    _refreshRenderStrategy(viewportData) {
        if (this._renderStrategy.value?.type === 'viewport') {
            return;
        }
        if (viewportData.endLineNumber < FullFileRenderStrategy.maxSupportedLines && this._viewportMaxColumn(viewportData) < FullFileRenderStrategy.maxSupportedColumns) {
            return;
        }
        this._logService.trace(`File is larger than ${FullFileRenderStrategy.maxSupportedLines} lines or ${FullFileRenderStrategy.maxSupportedColumns} columns, switching to viewport render strategy`);
        const viewportRenderStrategy = this._instantiationService.createInstance(ViewportRenderStrategy, this._context, this._viewGpuContext, this._device, this._glyphRasterizer);
        this._renderStrategy.value = viewportRenderStrategy;
        this._register(viewportRenderStrategy.onDidChangeBindGroupEntries(() => this._rebuildBindGroup?.()));
        this._rebuildBindGroup?.();
    }
    _viewportMaxColumn(viewportData) {
        let maxColumn = 0;
        let lineData;
        for (let i = viewportData.startLineNumber; i <= viewportData.endLineNumber; i++) {
            lineData = viewportData.getViewLineRenderingData(i);
            maxColumn = Math.max(maxColumn, lineData.maxColumn);
        }
        return maxColumn;
    }
    _updateAtlasStorageBufferAndTexture() {
        for (const [layerIndex, page] of ViewGpuContext.atlas.pages.entries()) {
            if (layerIndex >= TextureAtlas.maximumPageCount) {
                console.log(`Attempt to upload atlas page [${layerIndex}], only ${TextureAtlas.maximumPageCount} are supported currently`);
                continue;
            }
            // Skip the update if it's already the latest version
            if (page.version === this._atlasGpuTextureVersions[layerIndex]) {
                continue;
            }
            this._logService.trace('Updating atlas page[', layerIndex, '] from version ', this._atlasGpuTextureVersions[layerIndex], ' to version ', page.version);
            const entryCount = 6 /* GlyphStorageBufferInfo.FloatsPerEntry */ * TextureAtlasPage.maximumGlyphCount;
            const values = new Float32Array(entryCount);
            let entryOffset = 0;
            for (const glyph of page.glyphs) {
                values[entryOffset + 0 /* GlyphStorageBufferInfo.Offset_TexturePosition */] = glyph.x;
                values[entryOffset + 0 /* GlyphStorageBufferInfo.Offset_TexturePosition */ + 1] = glyph.y;
                values[entryOffset + 2 /* GlyphStorageBufferInfo.Offset_TextureSize */] = glyph.w;
                values[entryOffset + 2 /* GlyphStorageBufferInfo.Offset_TextureSize */ + 1] = glyph.h;
                values[entryOffset + 4 /* GlyphStorageBufferInfo.Offset_OriginPosition */] = glyph.originOffsetX;
                values[entryOffset + 4 /* GlyphStorageBufferInfo.Offset_OriginPosition */ + 1] = glyph.originOffsetY;
                entryOffset += 6 /* GlyphStorageBufferInfo.FloatsPerEntry */;
            }
            if (entryOffset / 6 /* GlyphStorageBufferInfo.FloatsPerEntry */ > TextureAtlasPage.maximumGlyphCount) {
                throw new Error(`Attempting to write more glyphs (${entryOffset / 6 /* GlyphStorageBufferInfo.FloatsPerEntry */}) than the GPUBuffer can hold (${TextureAtlasPage.maximumGlyphCount})`);
            }
            this._device.queue.writeBuffer(this._glyphStorageBuffer, layerIndex * 6 /* GlyphStorageBufferInfo.FloatsPerEntry */ * TextureAtlasPage.maximumGlyphCount * Float32Array.BYTES_PER_ELEMENT, values, 0, 6 /* GlyphStorageBufferInfo.FloatsPerEntry */ * TextureAtlasPage.maximumGlyphCount);
            if (page.usedArea.right - page.usedArea.left > 0 && page.usedArea.bottom - page.usedArea.top > 0) {
                this._device.queue.copyExternalImageToTexture({ source: page.source }, {
                    texture: this._atlasGpuTexture,
                    origin: {
                        x: page.usedArea.left,
                        y: page.usedArea.top,
                        z: layerIndex
                    }
                }, {
                    width: page.usedArea.right - page.usedArea.left + 1,
                    height: page.usedArea.bottom - page.usedArea.top + 1
                });
            }
            this._atlasGpuTextureVersions[layerIndex] = page.version;
        }
    }
    prepareRender(ctx) {
        throw new BugIndicatingError('Should not be called');
    }
    render(ctx) {
        throw new BugIndicatingError('Should not be called');
    }
    // #region Event handlers
    // Since ViewLinesGpu currently coordinates rendering to the canvas, it must listen to all
    // changed events that any GPU part listens to. This is because any drawing to the canvas will
    // clear it for that frame, so all parts must be rendered every time.
    //
    // Additionally, since this is intrinsically linked to ViewLines, it must also listen to events
    // from that side. Luckily rendering is cheap, it's only when uploaded data changes does it
    // start to cost.
    onConfigurationChanged(e) {
        this._refreshGlyphRasterizer();
        return true;
    }
    onCursorStateChanged(e) { return true; }
    onDecorationsChanged(e) { return true; }
    onFlushed(e) { return true; }
    onLinesChanged(e) { return true; }
    onLinesDeleted(e) { return true; }
    onLinesInserted(e) { return true; }
    onLineMappingChanged(e) { return true; }
    onRevealRangeRequest(e) { return true; }
    onScrollChanged(e) { return true; }
    onThemeChanged(e) { return true; }
    onZonesChanged(e) { return true; }
    // #endregion
    _refreshGlyphRasterizer() {
        const glyphRasterizer = this._glyphRasterizer.value;
        if (!glyphRasterizer) {
            return;
        }
        const fontFamily = this._context.configuration.options.get(51 /* EditorOption.fontFamily */);
        const fontSize = this._context.configuration.options.get(54 /* EditorOption.fontSize */);
        const devicePixelRatio = this._viewGpuContext.devicePixelRatio.get();
        if (glyphRasterizer.fontFamily !== fontFamily ||
            glyphRasterizer.fontSize !== fontSize ||
            glyphRasterizer.devicePixelRatio !== devicePixelRatio) {
            this._glyphRasterizer.value = new GlyphRasterizer(fontSize, fontFamily, devicePixelRatio);
        }
    }
    renderText(viewportData) {
        if (this._initialized) {
            this._refreshRenderStrategy(viewportData);
            return this._renderText(viewportData);
        }
        else {
            this._initViewportData = this._initViewportData ?? [];
            this._initViewportData.push(viewportData);
        }
    }
    _renderText(viewportData) {
        this._viewGpuContext.rectangleRenderer.draw(viewportData);
        const options = new ViewLineOptions(this._context.configuration, this._context.theme.type);
        this._renderStrategy.value.update(viewportData, options);
        this._updateAtlasStorageBufferAndTexture();
        const encoder = this._device.createCommandEncoder({ label: 'Monaco command encoder' });
        this._renderPassColorAttachment.view = this._viewGpuContext.ctx.getCurrentTexture().createView({ label: 'Monaco canvas texture view' });
        const pass = encoder.beginRenderPass(this._renderPassDescriptor);
        pass.setPipeline(this._pipeline);
        pass.setVertexBuffer(0, this._vertexBuffer);
        // Only draw the content area
        const contentLeft = Math.ceil(this._viewGpuContext.contentLeft.get() * this._viewGpuContext.devicePixelRatio.get());
        pass.setScissorRect(contentLeft, 0, this.canvas.width - contentLeft, this.canvas.height);
        pass.setBindGroup(0, this._bindGroup);
        this._renderStrategy.value.draw(pass, viewportData);
        pass.end();
        const commandBuffer = encoder.finish();
        this._device.queue.submit([commandBuffer]);
        this._lastViewportData = viewportData;
        this._lastViewLineOptions = options;
    }
    linesVisibleRangesForRange(_range, includeNewLines) {
        if (!this._lastViewportData) {
            return null;
        }
        const originalEndLineNumber = _range.endLineNumber;
        const range = Range.intersectRanges(_range, this._lastViewportData.visibleRange);
        if (!range) {
            return null;
        }
        const rendStartLineNumber = this._lastViewportData.startLineNumber;
        const rendEndLineNumber = this._lastViewportData.endLineNumber;
        const viewportData = this._lastViewportData;
        const viewLineOptions = this._lastViewLineOptions;
        if (!viewportData || !viewLineOptions) {
            return null;
        }
        const visibleRanges = [];
        let nextLineModelLineNumber = 0;
        if (includeNewLines) {
            nextLineModelLineNumber = this._context.viewModel.coordinatesConverter.convertViewPositionToModelPosition(new Position(range.startLineNumber, 1)).lineNumber;
        }
        for (let lineNumber = range.startLineNumber; lineNumber <= range.endLineNumber; lineNumber++) {
            if (lineNumber < rendStartLineNumber || lineNumber > rendEndLineNumber) {
                continue;
            }
            const startColumn = lineNumber === range.startLineNumber ? range.startColumn : 1;
            const continuesInNextLine = lineNumber !== range.endLineNumber;
            const endColumn = continuesInNextLine ? this._context.viewModel.getLineMaxColumn(lineNumber) : range.endColumn;
            const visibleRangesForLine = this._visibleRangesForLineRange(lineNumber, startColumn, endColumn);
            if (!visibleRangesForLine) {
                continue;
            }
            if (includeNewLines && lineNumber < originalEndLineNumber) {
                const currentLineModelLineNumber = nextLineModelLineNumber;
                nextLineModelLineNumber = this._context.viewModel.coordinatesConverter.convertViewPositionToModelPosition(new Position(lineNumber + 1, 1)).lineNumber;
                if (currentLineModelLineNumber !== nextLineModelLineNumber) {
                    visibleRangesForLine.ranges[visibleRangesForLine.ranges.length - 1].width += viewLineOptions.spaceWidth;
                }
            }
            visibleRanges.push(new LineVisibleRanges(visibleRangesForLine.outsideRenderedLine, lineNumber, HorizontalRange.from(visibleRangesForLine.ranges), continuesInNextLine));
        }
        if (visibleRanges.length === 0) {
            return null;
        }
        return visibleRanges;
    }
    _visibleRangesForLineRange(lineNumber, startColumn, endColumn) {
        if (this.shouldRender()) {
            // Cannot read from the DOM because it is dirty
            // i.e. the model & the dom are out of sync, so I'd be reading something stale
            return null;
        }
        const viewportData = this._lastViewportData;
        const viewLineOptions = this._lastViewLineOptions;
        if (!viewportData || !viewLineOptions || lineNumber < viewportData.startLineNumber || lineNumber > viewportData.endLineNumber) {
            return null;
        }
        // Resolve tab widths for this line
        const lineData = viewportData.getViewLineRenderingData(lineNumber);
        const content = lineData.content;
        let contentSegmenter;
        if (!(lineData.isBasicASCII && viewLineOptions.useMonospaceOptimizations)) {
            contentSegmenter = createContentSegmenter(lineData, viewLineOptions);
        }
        let chars = '';
        let resolvedStartColumn = 0;
        let resolvedStartCssPixelOffset = 0;
        for (let x = 0; x < startColumn - 1; x++) {
            if (lineData.isBasicASCII && viewLineOptions.useMonospaceOptimizations) {
                chars = content.charAt(x);
            }
            else {
                chars = contentSegmenter.getSegmentAtIndex(x);
                if (chars === undefined) {
                    continue;
                }
                resolvedStartCssPixelOffset += (this._renderStrategy.value.glyphRasterizer.getTextMetrics(chars).width / getActiveWindow().devicePixelRatio) - viewLineOptions.spaceWidth;
            }
            if (chars === '\t') {
                resolvedStartColumn = CursorColumns.nextRenderTabStop(resolvedStartColumn, lineData.tabSize);
            }
            else {
                resolvedStartColumn++;
            }
        }
        let resolvedEndColumn = resolvedStartColumn;
        let resolvedEndCssPixelOffset = 0;
        for (let x = startColumn - 1; x < endColumn - 1; x++) {
            if (lineData.isBasicASCII && viewLineOptions.useMonospaceOptimizations) {
                chars = content.charAt(x);
            }
            else {
                chars = contentSegmenter.getSegmentAtIndex(x);
                if (chars === undefined) {
                    continue;
                }
                resolvedEndCssPixelOffset += (this._renderStrategy.value.glyphRasterizer.getTextMetrics(chars).width / getActiveWindow().devicePixelRatio) - viewLineOptions.spaceWidth;
            }
            if (chars === '\t') {
                resolvedEndColumn = CursorColumns.nextRenderTabStop(resolvedEndColumn, lineData.tabSize);
            }
            else {
                resolvedEndColumn++;
            }
        }
        // Visible horizontal range in _scaled_ pixels
        const result = new VisibleRanges(false, [new FloatHorizontalRange(resolvedStartColumn * viewLineOptions.spaceWidth + resolvedStartCssPixelOffset, (resolvedEndColumn - resolvedStartColumn) * viewLineOptions.spaceWidth + resolvedEndCssPixelOffset)
        ]);
        return result;
    }
    visibleRangeForPosition(position) {
        const visibleRanges = this._visibleRangesForLineRange(position.lineNumber, position.column, position.column);
        if (!visibleRanges) {
            return null;
        }
        return new HorizontalPosition(visibleRanges.outsideRenderedLine, visibleRanges.ranges[0].left);
    }
    getLineWidth(lineNumber) {
        if (!this._lastViewportData || !this._lastViewLineOptions) {
            return undefined;
        }
        if (!this._viewGpuContext.canRender(this._lastViewLineOptions, this._lastViewportData, lineNumber)) {
            return undefined;
        }
        const lineData = this._lastViewportData.getViewLineRenderingData(lineNumber);
        const lineRange = this._visibleRangesForLineRange(lineNumber, 1, lineData.maxColumn);
        const lastRange = lineRange?.ranges.at(-1);
        if (lastRange) {
            return lastRange.width;
        }
        return undefined;
    }
    getPositionAtCoordinate(lineNumber, mouseContentHorizontalOffset) {
        if (!this._lastViewportData || !this._lastViewLineOptions) {
            return undefined;
        }
        if (!this._viewGpuContext.canRender(this._lastViewLineOptions, this._lastViewportData, lineNumber)) {
            return undefined;
        }
        const lineData = this._lastViewportData.getViewLineRenderingData(lineNumber);
        const content = lineData.content;
        const dpr = getActiveWindow().devicePixelRatio;
        const mouseContentHorizontalOffsetDevicePixels = mouseContentHorizontalOffset * dpr;
        const spaceWidthDevicePixels = this._lastViewLineOptions.spaceWidth * dpr;
        const contentSegmenter = createContentSegmenter(lineData, this._lastViewLineOptions);
        let widthSoFar = 0;
        let charWidth = 0;
        let tabXOffset = 0;
        let column = 0;
        for (let x = 0; x < content.length; x++) {
            const chars = contentSegmenter.getSegmentAtIndex(x);
            // Part of an earlier segment
            if (chars === undefined) {
                column++;
                continue;
            }
            // Get the width of the character
            if (chars === '\t') {
                // Find the pixel offset between the current position and the next tab stop
                const offsetBefore = x + tabXOffset;
                tabXOffset = CursorColumns.nextRenderTabStop(x + tabXOffset, lineData.tabSize);
                charWidth = spaceWidthDevicePixels * (tabXOffset - offsetBefore);
                // Convert back to offset excluding x and the current character
                tabXOffset -= x + 1;
            }
            else if (lineData.isBasicASCII && this._lastViewLineOptions.useMonospaceOptimizations) {
                charWidth = spaceWidthDevicePixels;
            }
            else {
                charWidth = this._renderStrategy.value.glyphRasterizer.getTextMetrics(chars).width;
            }
            if (mouseContentHorizontalOffsetDevicePixels < widthSoFar + charWidth / 2) {
                break;
            }
            widthSoFar += charWidth;
            column++;
        }
        return new Position(lineNumber, column + 1);
    }
};
ViewLinesGpu = __decorate([
    __param(2, IInstantiationService),
    __param(3, ILogService)
], ViewLinesGpu);
export { ViewLinesGpu };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld0xpbmVzR3B1LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3ZpZXdQYXJ0cy92aWV3TGluZXNHcHUvdmlld0xpbmVzR3B1LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN2RSxPQUFPLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUVyRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDNUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBR3RELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRXZFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUMxRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDckQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQzdELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxrQkFBa0IsRUFBRSxlQUFlLEVBQWMsaUJBQWlCLEVBQWdELGFBQWEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3ZNLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUNsRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUM7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