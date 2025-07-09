/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export var RectangleRendererBindingId;
(function (RectangleRendererBindingId) {
    RectangleRendererBindingId[RectangleRendererBindingId["Shapes"] = 0] = "Shapes";
    RectangleRendererBindingId[RectangleRendererBindingId["LayoutInfoUniform"] = 1] = "LayoutInfoUniform";
    RectangleRendererBindingId[RectangleRendererBindingId["ScrollOffset"] = 2] = "ScrollOffset";
})(RectangleRendererBindingId || (RectangleRendererBindingId = {}));
export const rectangleRendererWgsl = /*wgsl*/ `

struct Vertex {
	@location(0) position: vec2f,
};

struct LayoutInfo {
	canvasDims: vec2f,
	viewportOffset: vec2f,
	viewportDims: vec2f,
}

struct ScrollOffset {
	offset: vec2f,
}

struct Shape {
	position: vec2f,
	size: vec2f,
	color: vec4f,
};

struct VSOutput {
	@builtin(position) position: vec4f,
	@location(1)       color:    vec4f,
};

// Uniforms
@group(0) @binding(${1 /* RectangleRendererBindingId.LayoutInfoUniform */}) var<uniform>       layoutInfo:      LayoutInfo;

// Storage buffers
@group(0) @binding(${0 /* RectangleRendererBindingId.Shapes */})            var<storage, read> shapes:          array<Shape>;
@group(0) @binding(${2 /* RectangleRendererBindingId.ScrollOffset */})      var<uniform>       scrollOffset:    ScrollOffset;

@vertex fn vs(
	vert: Vertex,
	@builtin(instance_index) instanceIndex: u32,
	@builtin(vertex_index) vertexIndex : u32
) -> VSOutput {
	let shape = shapes[instanceIndex];

	var vsOut: VSOutput;
	vsOut.position = vec4f(
		(
			// Top left corner
			vec2f(-1,  1) +
			// Convert pixel position to clipspace
			vec2f( 2, -2) / layoutInfo.canvasDims *
			// Shape position and size
			(layoutInfo.viewportOffset - scrollOffset.offset + shape.position + vert.position * shape.size)
		),
		0.0,
		1.0
	);
	vsOut.color = shape.color;
	return vsOut;
}

@fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
	return vsOut.color;
}
`;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVjdGFuZ2xlUmVuZGVyZXIud2dzbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci9ncHUvcmVjdGFuZ2xlUmVuZGVyZXIud2dzbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxNQUFNLENBQU4sSUFBa0IsMEJBSWpCO0FBSkQsV0FBa0IsMEJBQTBCO0lBQzNDLCtFQUFNLENBQUE7SUFDTixxR0FBaUIsQ0FBQTtJQUNqQiwyRkFBWSxDQUFBO0FBQ2IsQ0FBQyxFQUppQiwwQkFBMEIsS0FBMUIsMEJBQTBCLFFBSTNDO0FBRUQsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUcsUUFBUSxDQUFDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O3FCQTRCekIsb0RBQTRDOzs7cUJBRzVDLHlDQUFpQztxQkFDakMsK0NBQXVDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztDQTZCM0QsQ0FBQyJ9