/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../dom.js';
import { getBaseLayerHoverDelegate } from '../hover/hoverDelegate2.js';
import { getDefaultHoverDelegate } from '../hover/hoverDelegateFactory.js';
import { renderLabelWithIcons } from '../iconLabel/iconLabels.js';
import { Disposable } from '../../../common/lifecycle.js';
import * as objects from '../../../common/objects.js';
/**
 * A widget which can render a label with substring highlights, often
 * originating from a filter function like the fuzzy matcher.
 */
export class HighlightedLabel extends Disposable {
    /**
     * Create a new {@link HighlightedLabel}.
     *
     * @param container The parent container to append to.
     */
    constructor(container, options) {
        super();
        this.options = options;
        this.text = '';
        this.title = '';
        this.highlights = [];
        this.didEverRender = false;
        this.supportIcons = options?.supportIcons ?? false;
        this.domNode = dom.append(container, dom.$('span.monaco-highlighted-label'));
    }
    /**
     * The label's DOM node.
     */
    get element() {
        return this.domNode;
    }
    /**
     * Set the label and highlights.
     *
     * @param text The label to display.
     * @param highlights The ranges to highlight.
     * @param title An optional title for the hover tooltip.
     * @param escapeNewLines Whether to escape new lines.
     * @returns
     */
    set(text, highlights = [], title = '', escapeNewLines) {
        if (!text) {
            text = '';
        }
        if (escapeNewLines) {
            // adjusts highlights inplace
            text = HighlightedLabel.escapeNewLines(text, highlights);
        }
        if (this.didEverRender && this.text === text && this.title === title && objects.equals(this.highlights, highlights)) {
            return;
        }
        this.text = text;
        this.title = title;
        this.highlights = highlights;
        this.render();
    }
    render() {
        const children = [];
        let pos = 0;
        for (const highlight of this.highlights) {
            if (highlight.end === highlight.start) {
                continue;
            }
            if (pos < highlight.start) {
                const substring = this.text.substring(pos, highlight.start);
                if (this.supportIcons) {
                    children.push(...renderLabelWithIcons(substring));
                }
                else {
                    children.push(substring);
                }
                pos = highlight.start;
            }
            const substring = this.text.substring(pos, highlight.end);
            const element = dom.$('span.highlight', undefined, ...this.supportIcons ? renderLabelWithIcons(substring) : [substring]);
            if (highlight.extraClasses) {
                element.classList.add(...highlight.extraClasses);
            }
            children.push(element);
            pos = highlight.end;
        }
        if (pos < this.text.length) {
            const substring = this.text.substring(pos);
            if (this.supportIcons) {
                children.push(...renderLabelWithIcons(substring));
            }
            else {
                children.push(substring);
            }
        }
        dom.reset(this.domNode, ...children);
        if (this.options?.hoverDelegate?.showNativeHover) {
            /* While custom hover is not inside custom hover */
            this.domNode.title = this.title;
        }
        else {
            if (!this.customHover && this.title !== '') {
                const hoverDelegate = this.options?.hoverDelegate ?? getDefaultHoverDelegate('mouse');
                this.customHover = this._register(getBaseLayerHoverDelegate().setupManagedHover(hoverDelegate, this.domNode, this.title));
            }
            else if (this.customHover) {
                this.customHover.update(this.title);
            }
        }
        this.didEverRender = true;
    }
    static escapeNewLines(text, highlights) {
        let total = 0;
        let extra = 0;
        return text.replace(/\r\n|\r|\n/g, (match, offset) => {
            extra = match === '\r\n' ? -1 : 0;
            offset += total;
            for (const highlight of highlights) {
                if (highlight.end <= offset) {
                    continue;
                }
                if (highlight.start >= offset) {
                    highlight.start += extra;
                }
                if (highlight.end >= offset) {
                    highlight.end += extra;
                }
            }
            total += extra;
            return '\u23CE';
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGlnaGxpZ2h0ZWRMYWJlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvdWkvaGlnaGxpZ2h0ZWRsYWJlbC9oaWdobGlnaHRlZExhYmVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sY0FBYyxDQUFDO0FBR3BDLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ3ZFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ2xFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUMxRCxPQUFPLEtBQUssT0FBTyxNQUFNLDRCQUE0QixDQUFDO0FBcUJ0RDs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sZ0JBQWlCLFNBQVEsVUFBVTtJQVUvQzs7OztPQUlHO0lBQ0gsWUFBWSxTQUFzQixFQUFtQixPQUFrQztRQUN0RixLQUFLLEVBQUUsQ0FBQztRQUQ0QyxZQUFPLEdBQVAsT0FBTyxDQUEyQjtRQVovRSxTQUFJLEdBQVcsRUFBRSxDQUFDO1FBQ2xCLFVBQUssR0FBVyxFQUFFLENBQUM7UUFDbkIsZUFBVSxHQUEwQixFQUFFLENBQUM7UUFFdkMsa0JBQWEsR0FBWSxLQUFLLENBQUM7UUFXdEMsSUFBSSxDQUFDLFlBQVksR0FBRyxPQUFPLEVBQUUsWUFBWSxJQUFJLEtBQUssQ0FBQztRQUNuRCxJQUFJLENBQUMsT0FBTyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsK0JBQStCLENBQUMsQ0FBQyxDQUFDO0lBQzlFLENBQUM7SUFFRDs7T0FFRztJ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