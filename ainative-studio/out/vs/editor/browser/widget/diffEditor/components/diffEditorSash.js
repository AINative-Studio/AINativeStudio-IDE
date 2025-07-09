/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Sash } from '../../../../../base/browser/ui/sash/sash.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { autorun, derivedWithSetter, observableValue } from '../../../../../base/common/observable.js';
export class SashLayout {
    resetSash() {
        this._sashRatio.set(undefined, undefined);
    }
    constructor(_options, dimensions) {
        this._options = _options;
        this.dimensions = dimensions;
        this.sashLeft = derivedWithSetter(this, reader => {
            const ratio = this._sashRatio.read(reader) ?? this._options.splitViewDefaultRatio.read(reader);
            return this._computeSashLeft(ratio, reader);
        }, (value, tx) => {
            const contentWidth = this.dimensions.width.get();
            this._sashRatio.set(value / contentWidth, tx);
        });
        this._sashRatio = observableValue(this, undefined);
    }
    /** @pure */
    _computeSashLeft(desiredRatio, reader) {
        const contentWidth = this.dimensions.width.read(reader);
        const midPoint = Math.floor(this._options.splitViewDefaultRatio.read(reader) * contentWidth);
        const sashLeft = this._options.enableSplitViewResizing.read(reader) ? Math.floor(desiredRatio * contentWidth) : midPoint;
        const MINIMUM_EDITOR_WIDTH = 100;
        if (contentWidth <= MINIMUM_EDITOR_WIDTH * 2) {
            return midPoint;
        }
        if (sashLeft < MINIMUM_EDITOR_WIDTH) {
            return MINIMUM_EDITOR_WIDTH;
        }
        if (sashLeft > contentWidth - MINIMUM_EDITOR_WIDTH) {
            return contentWidth - MINIMUM_EDITOR_WIDTH;
        }
        return sashLeft;
    }
}
export class DiffEditorSash extends Disposable {
    constructor(_domNode, _dimensions, _enabled, _boundarySashes, sashLeft, _resetSash) {
        super();
        this._domNode = _domNode;
        this._dimensions = _dimensions;
        this._enabled = _enabled;
        this._boundarySashes = _boundarySashes;
        this.sashLeft = sashLeft;
        this._resetSash = _resetSash;
        this._sash = this._register(new Sash(this._domNode, {
            getVerticalSashTop: (_sash) => 0,
            getVerticalSashLeft: (_sash) => this.sashLeft.get(),
            getVerticalSashHeight: (_sash) => this._dimensions.height.get(),
        }, { orientation: 0 /* Orientation.VERTICAL */ }));
        this._startSashPosition = undefined;
        this._register(this._sash.onDidStart(() => {
            this._startSashPosition = this.sashLeft.get();
        }));
        this._register(this._sash.onDidChange((e) => {
            this.sashLeft.set(this._startSashPosition + (e.currentX - e.startX), undefined);
        }));
        this._register(this._sash.onDidEnd(() => this._sash.layout()));
        this._register(this._sash.onDidReset(() => this._resetSash()));
        this._register(autorun(reader => {
            const sashes = this._boundarySashes.read(reader);
            if (sashes) {
                this._sash.orthogonalEndSash = sashes.bottom;
            }
        }));
        this._register(autorun(reader => {
            /** @description DiffEditorSash.layoutSash */
            const enabled = this._enabled.read(reader);
            this._sash.state = enabled ? 3 /* SashState.Enabled */ : 0 /* SashState.Disabled */;
            this.sashLeft.read(reader);
            this._dimensions.height.read(reader);
            this._sash.layout();
        }));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkVkaXRvclNhc2guanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvd2lkZ2V0L2RpZmZFZGl0b3IvY29tcG9uZW50cy9kaWZmRWRpdG9yU2FzaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQTRDLElBQUksRUFBYSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3hILE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRSxPQUFPLEVBQTZDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxlQUFlLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUdsSixNQUFNLE9BQU8sVUFBVTtJQVdmLFNBQVM7UUFDZixJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDM0MsQ0FBQztJQUVELFlBQ2tCLFFBQTJCLEVBQzVCLFVBQXVFO1FBRHRFLGFBQVEsR0FBUixRQUFRLENBQW1CO1FBQzVCLGVBQVUsR0FBVixVQUFVLENBQTZEO1FBaEJ4RSxhQUFRLEdBQUcsaUJBQWlCLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxFQUFFO1lBQzNELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQy9GLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQztRQUM3QyxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEVBQUU7WUFDaEIsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFL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