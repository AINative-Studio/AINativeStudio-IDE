/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { derivedWithStore } from '../../../../../../../base/common/observable.js';
export function setVisualization(data, visualization) {
    data['$$visualization'] = visualization;
}
export function debugLogRects(rects, elem) {
    setVisualization(rects, new ManyRectVisualizer(rects, elem));
    return rects;
}
export function debugLogRect(rect, elem, name) {
    setVisualization(rect, new HtmlRectVisualizer(rect, elem, name));
    return rect;
}
class ManyRectVisualizer {
    constructor(_rects, _elem) {
        this._rects = _rects;
        this._elem = _elem;
    }
    visualize() {
        const d = [];
        for (const key in this._rects) {
            const v = new HtmlRectVisualizer(this._rects[key], this._elem, key);
            d.push(v.visualize());
        }
        return {
            dispose: () => {
                d.forEach(d => d.dispose());
            }
        };
    }
}
class HtmlRectVisualizer {
    constructor(_rect, _elem, _name) {
        this._rect = _rect;
        this._elem = _elem;
        this._name = _name;
    }
    visualize() {
        const div = document.createElement('div');
        div.style.position = 'fixed';
        div.style.border = '1px solid red';
        div.style.pointerEvents = 'none';
        div.style.zIndex = '100000';
        const label = document.createElement('div');
        label.textContent = this._name;
        label.style.position = 'absolute';
        label.style.top = '-20px';
        label.style.left = '0';
        label.style.color = 'red';
        label.style.fontSize = '12px';
        label.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
        div.appendChild(label);
        const updatePosition = () => {
            const elemRect = this._elem.getBoundingClientRect();
            console.log(elemRect);
            div.style.left = (elemRect.left + this._rect.left) + 'px';
            div.style.top = (elemRect.top + this._rect.top) + 'px';
            div.style.width = this._rect.width + 'px';
            div.style.height = this._rect.height + 'px';
        };
        // This is for debugging only
        // eslint-disable-next-line no-restricted-syntax
        document.body.appendChild(div);
        updatePosition();
        const observer = new ResizeObserver(updatePosition);
        observer.observe(this._elem);
        return {
            dispose: () => {
                observer.disconnect();
                div.remove();
            }
        };
    }
}
export function debugView(value, reader) {
    if (typeof value === 'object' && value && '$$visualization' in value) {
        const vis = value['$$visualization'];
        debugReadDisposable(vis.visualize(), reader);
    }
}
function debugReadDisposable(d, reader) {
    derivedWithStore((_reader, store) => {
        store.add(d);
        return undefined;
    }).read(reader);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdWaXN1YWxpemF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL2Jyb3dzZXIvdmlldy9pbmxpbmVFZGl0cy9pbmxpbmVFZGl0c1ZpZXdzL2RlYnVnVmlzdWFsaXphdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQVcsZ0JBQWdCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQU8zRixNQUFNLFVBQVUsZ0JBQWdCLENBQUMsSUFBWSxFQUFFLGFBQW1DO0lBQ2hGLElBQVksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLGFBQWEsQ0FBQztBQUNsRCxDQUFDO0FBRUQsTUFBTSxVQUFVLGFBQWEsQ0FBQyxLQUEyQixFQUFFLElBQWlCO0lBQzNFLGdCQUFnQixDQUFDLEtBQUssRUFBRSxJQUFJLGtCQUFrQixDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQzdELE9BQU8sS0FBSyxDQUFDO0FBQ2QsQ0FBQztBQUVELE1BQU0sVUFBVSxZQUFZLENBQUMsSUFBVSxFQUFFLElBQWlCLEVBQUUsSUFBWTtJQUN2RSxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsSUFBSSxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDakUsT0FBTyxJQUFJLENBQUM7QUFDYixDQUFDO0FBRUQsTUFBTSxrQkFBa0I7SUFDdkIsWUFDa0IsTUFBNEIsRUFDNUIsS0FBa0I7UUFEbEIsV0FBTSxHQUFOLE1BQU0sQ0FBc0I7UUFDNUIsVUFBSyxHQUFMLEtBQUssQ0FBYTtJQUNoQyxDQUFDO0lBRUwsU0FBUztRQUNSLE1BQU0sQ0FBQyxHQUFrQixFQUFFLENBQUM7UUFDNUIsS0FBSyxNQUFN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