/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class ViewLineOptions {
    constructor(config, themeType) {
        this.themeType = themeType;
        const options = config.options;
        const fontInfo = options.get(52 /* EditorOption.fontInfo */);
        const experimentalWhitespaceRendering = options.get(40 /* EditorOption.experimentalWhitespaceRendering */);
        if (experimentalWhitespaceRendering === 'off') {
            this.renderWhitespace = options.get(104 /* EditorOption.renderWhitespace */);
        }
        else {
            // whitespace is rendered in a different layer
            this.renderWhitespace = 'none';
        }
        this.renderControlCharacters = options.get(99 /* EditorOption.renderControlCharacters */);
        this.spaceWidth = fontInfo.spaceWidth;
        this.middotWidth = fontInfo.middotWidth;
        this.wsmiddotWidth = fontInfo.wsmiddotWidth;
        this.useMonospaceOptimizations = (fontInfo.isMonospace
            && !options.get(33 /* EditorOption.disableMonospaceOptimizations */));
        this.canUseHalfwidthRightwardsArrow = fontInfo.canUseHalfwidthRightwardsArrow;
        this.lineHeight = options.get(68 /* EditorOption.lineHeight */);
        this.stopRenderingLineAfter = options.get(122 /* EditorOption.stopRenderingLineAfter */);
        this.fontLigatures = options.get(53 /* EditorOption.fontLigatures */);
        this.useGpu = options.get(39 /* EditorOption.experimentalGpuAcceleration */) === 'on';
    }
    equals(other) {
        return (this.themeType === other.themeType
            && this.renderWhitespace === other.renderWhitespace
            && this.renderControlCharacters === other.renderControlCharacters
            && this.spaceWidth === other.spaceWidth
            && this.middotWidth === other.middotWidth
            && this.wsmiddotWidth === other.wsmiddotWidth
            && this.useMonospaceOptimizations === other.useMonospaceOptimizations
            && this.canUseHalfwidthRightwardsArrow === other.canUseHalfwidthRightwardsArrow
            && this.lineHeight === other.lineHeight
            && this.stopRenderingLineAfter === other.stopRenderingLineAfter
            && this.fontLigatures === other.fontLigatures
            && this.useGpu === other.useGpu);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld0xpbmVPcHRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3ZpZXdQYXJ0cy92aWV3TGluZXMvdmlld0xpbmVPcHRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBTWhHLE1BQU0sT0FBTyxlQUFlO0lBYzNCLFlBQVksTUFBNEIsRUFBRSxTQUFzQjtRQUMvRCxJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztRQUMzQixNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDO1FBQy9CLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxHQUFHLGdDQUF1QixDQUFDO1FBQ3BELE1BQU0sK0JBQStCLEdBQUcsT0FBTyxDQUFDLEdBQUcsdURBQThDLENBQUM7UUFDbEcsSUFBSSwrQkFBK0IsS0FBSyxLQUFLLEVBQUUsQ0FBQztZQUMvQyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLEdBQUcseUNBQStCLENBQUM7UUFDcEUsQ0FBQzthQUFNLENBQUM7WUFDUCw4Q0FBOEM7WUFDOUMsSUFBSSxDQUFDLGdCQUFnQixHQUFHLE1BQU0sQ0FBQztRQUNoQyxDQUFDO1FBQ0QsSUFBSSxDQUFDLHVCQUF1QixHQUFHLE9BQU8sQ0FBQyxHQUFHLCtDQUFzQyxDQUFDO1FBQ2pGLElBQUksQ0FBQyxVQUFVLEdBQUcsUUFBUSxDQUFDLFVBQVUsQ0FBQztRQUN0QyxJQUFJLENBQUMsV0FBVyxHQUFHLFFBQVEsQ0FBQyxXQUFXLENBQUM7UUFDeEMsSUFBSSxDQUFDLGFBQWEsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDO1FBQzVDLElBQUksQ0FBQyx5QkFBeUIsR0FBRyxDQUNoQyxRQUFRLENBQUMsV0FBVztlQUNqQixDQUFDLE9BQU8sQ0FBQyxHQUFHLHFEQUE0QyxDQUMzRCxDQUFDO1FBQ0YsSUFBSSxDQUFDLDhCQUE4QixHQUFHLFFBQVEsQ0FBQyw4QkFBOEIsQ0FBQztRQUM5RSxJQUFJLENBQUMsVUFBVSxHQUFHLE9BQU8sQ0FBQyxHQUFHLGtDQUF5QixDQUFDO1FBQ3ZELElBQUksQ0FBQyxzQkFBc0IsR0FBRyxPQUFPLENBQUMsR0FBRywrQ0FBcUMsQ0FBQztRQUMvRSxJQUFJLENBQUMsYUFBYSxHQUFHLE9BQU8sQ0FBQyxHQUFHLHFDQUE0QixDQUFDO1FBQzdELElBQUksQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDLEdBQUcsbURBQTBDLEtBQUssSUFBSSxDQUFDO0lBQzlFLENBQUM7SUFFTSxNQUFNLENBQUMsS0FBc0I7UUFDbkMsT0FBTyxDQUNOLElBQUksQ0FBQyxTQUFTLEtBQUssS0FBSyxDQUFDLFNBQVM7ZUFDL0IsSUFBSSxDQUFDLGdCQUFnQixLQUFLLEtBQUssQ0FBQyxnQkFBZ0I7ZUFDaEQsSUFBSSxDQUFDLHVCQUF1QixLQUFLLEtBQUssQ0FBQyx1QkFBdUI7ZUFDOUQsSUFBSSxDQUFDLFVBQVUsS0FBSyxLQUFLLENBQUMsVUFBVTtlQUNwQyxJQUFJLENBQUMsV0FBVyxLQUFLLEtBQUssQ0FBQyxXQUFXO2VBQ3RDLElBQUksQ0FBQyxhQUFhLEtBQUssS0FBSyxDQUFDLGFBQWE7ZUFDMUMsSUFBSSxDQUFDLHlCQUF5QixLQUFLLEtBQUssQ0FBQyx5QkFBeUI7ZUFDbEUsSUFBSSxDQUFDLDhCQUE4QixLQUFLLEtBQUssQ0FBQyw4QkFBOEI7ZUFDNUUsSUFBSSxDQUFDLFVBQVUsS0FBSyxLQUFLLENBQUMsVUFBVTtlQUNwQyxJQUFJLENBQUMsc0JBQXNCLEtBQUssS0FBSyxDQUFDLHNCQUFzQjtlQUM1RCxJQUFJLENBQUMsYUFBYSxLQUFLLEtBQUssQ0FBQyxhQUFhO2VBQzFDLElBQUksQ0FBQyxNQUFNLEtBQUssS0FBSyxDQUFDLE1BQU0sQ0FDL0IsQ0FBQztJQUNILENBQUM7Q0FDRCJ9