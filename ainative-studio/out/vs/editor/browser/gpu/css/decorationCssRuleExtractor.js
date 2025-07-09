/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { $, getActiveDocument } from '../../../../base/browser/dom.js';
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import './media/decorationCssRuleExtractor.css';
/**
 * Extracts CSS rules that would be applied to certain decoration classes.
 */
export class DecorationCssRuleExtractor extends Disposable {
    constructor() {
        super();
        this._ruleCache = new Map();
        this._container = $('div.monaco-decoration-css-rule-extractor');
        this._dummyElement = $('span');
        this._container.appendChild(this._dummyElement);
        this._register(toDisposable(() => this._container.remove()));
    }
    getStyleRules(canvas, decorationClassName) {
        // Check cache
        const existing = this._ruleCache.get(decorationClassName);
        if (existing) {
            return existing;
        }
        // Set up DOM
        this._dummyElement.className = decorationClassName;
        canvas.appendChild(this._container);
        // Get rules
        const rules = this._getStyleRules(decorationClassName);
        this._ruleCache.set(decorationClassName, rules);
        // Tear down DOM
        canvas.removeChild(this._container);
        return rules;
    }
    _getStyleRules(className) {
        // Iterate through all stylesheets and imported stylesheets to find matching rules
        const rules = [];
        const doc = getActiveDocument();
        const stylesheets = [...doc.styleSheets];
        for (let i = 0; i < stylesheets.length; i++) {
            const stylesheet = stylesheets[i];
            for (const rule of stylesheet.cssRules) {
                if (rule instanceof CSSImportRule) {
                    if (rule.styleSheet) {
                        stylesheets.push(rule.styleSheet);
                    }
                }
                else if (rule instanceof CSSStyleRule) {
                    // Note that originally `.matches(rule.selectorText)` was used but this would
                    // not pick up pseudo-classes which are important to determine support of the
                    // returned styles.
                    //
                    // Since a selector could contain a class name lookup that is simple a prefix of
                    // the class name we are looking for, we need to also check the character after
                    // it.
                    const searchTerm = `.${className}`;
                    const index = rule.selectorText.indexOf(searchTerm);
                    if (index !== -1) {
                        const endOfResult = index + searchTerm.length;
                        if (rule.selectorText.length === endOfResult || rule.selectorText.substring(endOfResult, endOfResult + 1).match(/[ :]/)) {
                            rules.push(rule);
                        }
                    }
                }
            }
        }
        return rules;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvbkNzc1J1bGVFeHRyYWN0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvZ3B1L2Nzcy9kZWNvcmF0aW9uQ3NzUnVsZUV4dHJhY3Rvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsQ0FBQyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDdkUsT0FBTyxFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRixPQUFPLHdDQUF3QyxDQUFDO0FBRWhEOztHQUVHO0FBQ0gsTUFBTSxPQUFPLDBCQUEyQixTQUFRLFVBQVU7SUFNekQ7UUFDQyxLQUFLLEVBQUUsQ0FBQztRQUhELGVBQVUsR0FBK0MsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUsxRSxJQUFJLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQywwQ0FBMEMsQ0FBQyxDQUFDO1FBQ2hFLElBQUksQ0FBQyxhQUFhLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQy9CLElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUVoRCxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztJQUM5RCxDQUFDO0lBRUQsYUFBYSxDQUFDLE1BQW1CLEVBQUUsbUJBQTJCO1FBQzdELGNBQWM7UUFDZCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBQzFELElBQUksUUFBUSxFQUFFLENBQUM7WUFDZCxPQUFPLFFBQVEsQ0FBQztRQUNqQixDQUFDO1FBRUQsYUFBYTtRQUNiLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxHQUFHLG1CQUFtQixDQUFDO1FBQ25ELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRXBDLFlBQVk7UUFDWixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFDdkQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsbUJBQW1CLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFaEQsZ0JBQWdCO1FBQ2hCLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRXBDLE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUVPLGNBQWMsQ0FBQyxTQUFpQjtRQUN2QyxrRkFBa0Y7UUFDbEYsTUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDO1FBQ2pCLE1BQU0sR0FBRyxHQUFHLGlCQUFpQixFQUFFLENBQUM7UUFDaEMsTUFBTSxXQUFXLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUN6QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzdDLE1BQU0sVUFBVSxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNsQyxLQUFLLE1BQU0sSUFBSSxJQUFJLFVBQVUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDeEMsSUFBSSxJQUFJLFlBQVksYUFBYSxFQUFFLENBQUM7b0JBQ25DLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO3dCQUNyQixXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztvQkFDbkMsQ0FBQztnQkFDRixDQUFDO3FCQUFNLElBQUksSUFBSSxZQUFZLFlBQVksRUFBRSxDQUFDO29CQUN6Qyw2RUFBNkU7b0JBQzdFLDZFQUE2RTtvQkFDN0UsbUJBQW1CO29CQUNuQixFQUFFO29CQUNGLGdGQUFnRjtvQkFDaEYsK0VBQStFO29CQUMvRSxNQUFNO29CQUNOLE1BQU0sVUFBVSxHQUFHLElBQUksU0FBUyxFQUFFLENBQUM7b0JBQ25DLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO29CQUNwRCxJQUFJLEtBQUssS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO3dCQUNsQixNQUFNLFdBQVcsR0FBRyxLQUFLLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQzt3QkFDOUMsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sS0FBSyxXQUFXLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLFdBQVcsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQzs0QkFDekgsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzt3QkFDbEIsQ0FBQztvQkFDRixDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztDQUNEIn0=