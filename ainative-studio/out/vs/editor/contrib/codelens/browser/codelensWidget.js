/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../../../base/browser/dom.js';
import { renderLabelWithIcons } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import './codelensWidget.css';
import { Range } from '../../../common/core/range.js';
import { ModelDecorationOptions } from '../../../common/model/textModel.js';
class CodeLensViewZone {
    constructor(afterLineNumber, heightInPx, onHeight) {
        /**
         * We want that this view zone, which reserves space for a code lens appears
         * as close as possible to the next line, so we use a very large value here.
         */
        this.afterColumn = 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */;
        this.afterLineNumber = afterLineNumber;
        this.heightInPx = heightInPx;
        this._onHeight = onHeight;
        this.suppressMouseDown = true;
        this.domNode = document.createElement('div');
    }
    onComputedHeight(height) {
        if (this._lastHeight === undefined) {
            this._lastHeight = height;
        }
        else if (this._lastHeight !== height) {
            this._lastHeight = height;
            this._onHeight();
        }
    }
    isVisible() {
        return this._lastHeight !== 0
            && this.domNode.hasAttribute('monaco-visible-view-zone');
    }
}
class CodeLensContentWidget {
    static { this._idPool = 0; }
    constructor(editor, line) {
        // Editor.IContentWidget.allowEditorOverflow
        this.allowEditorOverflow = false;
        this.suppressMouseDown = true;
        this._commands = new Map();
        this._isEmpty = true;
        this._editor = editor;
        this._id = `codelens.widget-${(CodeLensContentWidget._idPool++)}`;
        this.updatePosition(line);
        this._domNode = document.createElement('span');
        this._domNode.className = `codelens-decoration`;
    }
    withCommands(lenses, animate) {
        this._commands.clear();
        const children = [];
        let hasSymbol = false;
        for (let i = 0; i < lenses.length; i++) {
            const lens = lenses[i];
            if (!lens) {
                continue;
            }
            hasSymbol = true;
            if (lens.command) {
                const title = renderLabelWithIcons(lens.command.title.trim());
                if (lens.command.id) {
                    const id = `c${(CodeLensContentWidget._idPool++)}`;
                    children.push(dom.$('a', { id, title: lens.command.tooltip, role: 'button' }, ...title));
                    this._commands.set(id, lens.command);
                }
                else {
                    children.push(dom.$('span', { title: lens.command.tooltip }, ...title));
                }
                if (i + 1 < lenses.length) {
                    children.push(dom.$('span', undefined, '\u00a0|\u00a0'));
                }
            }
        }
        if (!hasSymbol) {
            // symbols but no commands
            dom.reset(this._domNode, dom.$('span', undefined, 'no commands'));
        }
        else {
            // symbols and commands
            dom.reset(this._domNode, ...children);
            if (this._isEmpty && animate) {
                this._domNode.classList.add('fadein');
            }
            this._isEmpty = false;
        }
    }
    getCommand(link) {
        return link.parentElement === this._domNode
            ? this._commands.get(link.id)
            : undefined;
    }
    getId() {
        return this._id;
    }
    getDomNode() {
        return this._domNode;
    }
    updatePosition(line) {
        const column = this._editor.getModel().getLineFirstNonWhitespaceColumn(line);
        this._widgetPosition = {
            position: { lineNumber: line, column: column },
            preference: [1 /* ContentWidgetPositionPreference.ABOVE */]
        };
    }
    getPosition() {
        return this._widgetPosition || null;
    }
}
export class CodeLensHelper {
    constructor() {
        this._removeDecorations = [];
        this._addDecorations = [];
        this._addDecorationsCallbacks = [];
    }
    addDecoration(decoration, callback) {
        this._addDecorations.push(decoration);
        this._addDecorationsCallbacks.push(callback);
    }
    removeDecoration(decorationId) {
        this._removeDecorations.push(decorationId);
    }
    commit(changeAccessor) {
        const resultingDecorations = changeAccessor.deltaDecorations(this._removeDecorations, this._addDecorations);
        for (let i = 0, len = resultingDecorations.length; i < len; i++) {
            this._addDecorationsCallbacks[i](resultingDecorations[i]);
        }
    }
}
const codeLensDecorationOptions = ModelDecorationOptions.register({
    collapseOnReplaceEdit: true,
    description: 'codelens'
});
export class CodeLensWidget {
    constructor(data, editor, helper, viewZoneChangeAccessor, heightInPx, updateCallback) {
        this._isDisposed = false;
        this._editor = editor;
        this._data = data;
        // create combined range, track all ranges with decorations,
        // check if there is already something to render
        this._decorationIds = [];
        let range;
        const lenses = [];
        this._data.forEach((codeLensData, i) => {
            if (codeLensData.symbol.command) {
                lenses.push(codeLensData.symbol);
            }
            helper.addDecoration({
                range: codeLensData.symbol.range,
                options: codeLensDecorationOptions
            }, id => this._decorationIds[i] = id);
            // the range contains all lenses on this line
            if (!range) {
                range = Range.lift(codeLensData.symbol.range);
            }
            else {
                range = Range.plusRange(range, codeLensData.symbol.range);
            }
        });
        this._viewZone = new CodeLensViewZone(range.startLineNumber - 1, heightInPx, updateCallback);
        this._viewZoneId = viewZoneChangeAccessor.addZone(this._viewZone);
        if (lenses.length > 0) {
            this._createContentWidgetIfNecessary();
            this._contentWidget.withCommands(lenses, false);
        }
    }
    _createContentWidgetIfNecessary() {
        if (!this._contentWidget) {
            this._contentWidget = new CodeLensContentWidget(this._editor, this._viewZone.afterLineNumber + 1);
            this._editor.addContentWidget(this._contentWidget);
        }
        else {
            this._editor.layoutContentWidget(this._contentWidget);
        }
    }
    dispose(helper, viewZoneChangeAccessor) {
        this._decorationIds.forEach(helper.removeDecoration, helper);
        this._decorationIds = [];
        viewZoneChangeAccessor?.removeZone(this._viewZoneId);
        if (this._contentWidget) {
            this._editor.removeContentWidget(this._contentWidget);
            this._contentWidget = undefined;
        }
        this._isDisposed = true;
    }
    isDisposed() {
        return this._isDisposed;
    }
    isValid() {
        return this._decorationIds.some((id, i) => {
            const range = this._editor.getModel().getDecorationRange(id);
            const symbol = this._data[i].symbol;
            return !!(range && Range.isEmpty(symbol.range) === range.isEmpty());
        });
    }
    updateCodeLensSymbols(data, helper) {
        this._decorationIds.forEach(helper.removeDecoration, helper);
        this._decorationIds = [];
        this._data = data;
        this._data.forEach((codeLensData, i) => {
            helper.addDecoration({
                range: codeLensData.symbol.range,
                options: codeLensDecorationOptions
            }, id => this._decorationIds[i] = id);
        });
    }
    updateHeight(height, viewZoneChangeAccessor) {
        this._viewZone.heightInPx = height;
        viewZoneChangeAccessor.layoutZone(this._viewZoneId);
        if (this._contentWidget) {
            this._editor.layoutContentWidget(this._contentWidget);
        }
    }
    computeIfNecessary(model) {
        if (!this._viewZone.isVisible()) {
            return null;
        }
        // Read editor current state
        for (let i = 0; i < this._decorationIds.length; i++) {
            const range = model.getDecorationRange(this._decorationIds[i]);
            if (range) {
                this._data[i].symbol.range = range;
            }
        }
        return this._data;
    }
    updateCommands(symbols) {
        this._createContentWidgetIfNecessary();
        this._contentWidget.withCommands(symbols, true);
        for (let i = 0; i < this._data.length; i++) {
            const resolved = symbols[i];
            if (resolved) {
                const { symbol } = this._data[i];
                symbol.command = resolved.command || symbol.command;
            }
        }
    }
    getCommand(link) {
        return this._contentWidget?.getCommand(link);
    }
    getLineNumber() {
        const range = this._editor.getModel().getDecorationRange(this._decorationIds[0]);
        if (range) {
            return range.startLineNumber;
        }
        return -1;
    }
    update(viewZoneChangeAccessor) {
        if (this.isValid()) {
            const range = this._editor.getModel().getDecorationRange(this._decorationIds[0]);
            if (range) {
                this._viewZone.afterLineNumber = range.startLineNumber - 1;
                viewZoneChangeAccessor.layoutZone(this._viewZoneId);
                if (this._contentWidget) {
                    this._contentWidget.updatePosition(range.startLineNumber);
                    this._editor.layoutContentWidget(this._contentWidget);
                }
            }
        }
    }
    getItems() {
        return this._data;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZWxlbnNXaWRnZXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvY29kZWxlbnMvYnJvd3Nlci9jb2RlbGVuc1dpZGdldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBRTNGLE9BQU8sc0JBQXNCLENBQUM7QUFFOUIsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRXRELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBSTVFLE1BQU0sZ0JBQWdCO0lBZ0JyQixZQUFZLGVBQXVCLEVBQUUsVUFBa0IsRUFBRSxRQUFvQjtRQVY3RTs7O1dBR0c7UUFDTSxnQkFBVyxxREFBb0M7UUFPdkQsSUFBSSxDQUFDLGVBQWUsR0FBRyxlQUFlLENBQUM7UUFDdkMsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7UUFFN0IsSUFBSSxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUM7UUFDMUIsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQztRQUM5QixJQUFJLENBQUMsT0FBTyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDOUMsQ0FBQztJQUVELGdCQUFnQixDQUFDLE1BQWM7UUFDOUIsSUFBSSxJQUFJLENBQUMsV0FBVyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ3BDLElBQUksQ0FBQyxXQUFXLEdBQUcsTUFBTSxDQUFDO1FBQzNCLENBQUM7YUFBTSxJQUFJLElBQUksQ0FBQyxXQUFXLEtBQUssTUFBTSxFQUFFLENBQUM7WUFDeEMsSUFBSSxDQUFDLFdBQVcsR0FBRyxNQUFNLENBQUM7WUFDMUIsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ2xCLENBQUM7SUFDRixDQUFDO0lBRUQsU0FBUztRQUNSLE9BQU8sSUFBSSxDQUFDLFdBQVcsS0FBSyxDQUFDO2VBQ3pCLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLDBCQUEwQixDQUFDLENBQUM7SUFDM0QsQ0FBQztDQUNEO0FBRUQsTUFBTSxxQkFBcUI7YUFFWCxZQUFPLEdBQVcsQ0FBQyxBQUFaLENBQWE7SUFjbkMsWUFDQyxNQUF5QixFQUN6QixJQUFZO1FBZGIsNENBQTRDO1FBQ25DLHdCQUFtQixHQUFZLEtBQUssQ0FBQztRQUNyQyxzQkFBaUIsR0FBWSxJQUFJLENBQUM7UUFLMUIsY0FBUyxHQUFHLElBQUksR0FBRyxFQUFtQixDQUFDO1FBR2hELGFBQVEsR0FBWSxJQUFJLENBQUM7UUFNaEMsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUM7UUFDdEIsSUFBSSxDQUFDLEdBQUcsR0FBRyxtQkFBbUIsQ0FBQyxxQkFBcUIsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLENBQUM7UUFFbEUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUUxQixJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDL0MsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLEdBQUcscUJBQXFCLENBQUM7SUFDakQsQ0FBQztJQUVELFlBQVksQ0FBQyxNQUEwQyxFQUFFLE9BQWdCO1FBQ3hFLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUM7UUFFdkIsTUFBTSxRQUFRLEdBQWtCLEVBQUUsQ0FBQztRQUNuQyxJQUFJLFNBQVMsR0FBRyxLQUFLLENBQUM7UUFDdEIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN4QyxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDdkIsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNYLFNBQVM7WUFDVixDQUFDO1lBQ0QsU0FBUyxHQUFHLElBQUksQ0FBQztZQUNqQixJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDbEIsTUFBTSxLQUFLLEdBQUcsb0JBQW9CLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztnQkFDOUQsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRSxDQUFDO29CQUNyQixNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsT0FBTyxFQUFFLENBQUMsRUFBRSxDQUFDO29CQUNuRCxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEVBQUUsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDO29CQUN6RixJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUN0QyxDQUFDO3FCQUFNLENBQUM7b0JBQ1AsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQztnQkFDekUsQ0FBQztnQkFDRCxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO29CQUMzQixRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxlQUFlLENBQUMsQ0FBQyxDQUFDO2dCQUMxRCxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDaEIsMEJBQTBCO1lBQzFCLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsYUFBYSxDQUFDLENBQUMsQ0FBQztRQUVuRSxDQUFDO2FBQU0sQ0FBQztZQUNQLHVCQUF1QjtZQUN2QixHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsR0FBRyxRQUFRLENBQUMsQ0FBQztZQUN0QyxJQUFJLElBQUksQ0FBQyxRQUFRLElBQUksT0FBTyxFQUFFLENBQUM7Z0JBQzlCLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUN2QyxDQUFDO1lBQ0QsSUFBSSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUM7UUFDdkIsQ0FBQztJQUNGLENBQUM7SUFFRCxVQUFVLENBQUMsSUFBcUI7UUFDL0IsT0FBTyxJQUFJLENBQUMsYUFBYSxLQUFLLElBQUksQ0FBQyxRQUFRO1lBQzFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQzdCLENBQUMsQ0FBQyxTQUFTLENBQUM7SUFDZCxDQUFDO0lBRUQsS0FBSztRQUNKLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQztJQUNqQixDQUFDO0lBRUQsVUFBVTtRQUNULE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQztJQUN0QixDQUFDO0lBRUQsY0FBYyxDQUFDLElBQVk7UUFDMUIsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQywrQkFBK0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM3RSxJQUFJLENBQUMsZUFBZSxHQUFHO1lBQ3RCLFFBQVEsRUFBRSxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRTtZQUM5QyxVQUFVLEVBQUUsK0NBQXVDO1NBQ25ELENBQUM7SUFDSCxDQUFDO0lBRUQsV0FBVztRQUNWLE9BQU8sSUFBSSxDQUFDLGVBQWUsSUFBSSxJQUFJLENBQUM7SUFDckMsQ0FBQzs7QUFPRixNQUFNLE9BQU8sY0FBYztJQU0xQjtRQUNDLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxFQUFFLENBQUM7UUFDN0IsSUFBSSxDQUFDLGVBQWUsR0FBRyxFQUFFLENBQUM7UUFDMUIsSUFBSSxDQUFDLHdCQUF3QixHQUFHLEVBQUUsQ0FBQztJQUNwQyxDQUFDO0lBRUQsYUFBYSxDQUFDLFVBQWlDLEVBQUUsUUFBK0I7UUFDL0UsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDdEMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUM5QyxDQUFDO0lBRUQsZ0JBQWdCLENBQUMsWUFBb0I7UUFDcEMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBRUQsTUFBTSxDQUFDLGNBQStDO1FBQ3JELE1BQU0sb0JBQW9CLEdBQUcsY0FBYyxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDNUcsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLG9CQUFvQixDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDakUsSUFBSSxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0QsQ0FBQztJQUNGLENBQUM7Q0FDRDtBQUVELE1BQU0seUJBQXlCLEdBQUcsc0JBQXNCLENBQUMsUUFBUSxDQUFDO0lBQ2pFLHFCQUFxQixFQUFFLElBQUk7SUFDM0IsV0FBVyxFQUFFLFVBQVU7Q0FDdkIsQ0FBQyxDQUFDO0FBRUgsTUFBTSxPQUFPLGNBQWM7SUFXMUIsWUFDQyxJQUFvQixFQUNwQixNQUF5QixFQUN6QixNQUFzQixFQUN0QixzQkFBK0MsRUFDL0MsVUFBa0IsRUFDbEIsY0FBMEI7UUFSbkIsZ0JBQVcsR0FBWSxLQUFLLENBQUM7UUFVcEMsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUM7UUFDdEIsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7UUFFbEIsNERBQTREO1FBQzVELGdEQUFnRDtRQUNoRCxJQUFJLENBQUMsY0FBYyxHQUFHLEVBQUUsQ0FBQztRQUN6QixJQUFJLEtBQXdCLENBQUM7UUFDN0IsTUFBTSxNQUFNLEdBQWUsRUFBRSxDQUFDO1FBRTlCLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsWUFBWSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBRXRDLElBQUksWUFBWSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDakMsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDbEMsQ0FBQztZQUVELE1BQU0sQ0FBQyxhQUFhLENBQUM7Z0JBQ3BCLEtBQUssRUFBRSxZQUFZLENBQUMsTUFBTSxDQUFDLEtBQUs7Z0JBQ2hDLE9BQU8sRUFBRSx5QkFBeUI7YUFDbEMsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUM7WUFFdEMsNkNBQTZDO1lBQzdDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDWixLQUFLLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQy9DLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxLQUFLLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsWUFBWSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUMzRCxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksZ0JBQWdCLENBQUMsS0FBTSxDQUFDLGVBQWUsR0FBRyxDQUFDLEVBQUUsVUFBVSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQzlGLElBQUksQ0FBQyxXQUFXLEdBQUcsc0JBQXNCLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUVsRSxJQUFJLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDdkIsSUFBSSxDQUFDLCtCQUErQixFQUFFLENBQUM7WUFDdkMsSUFBSSxDQUFDLGNBQWUsQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2xELENBQUM7SUFDRixDQUFDO0lBRU8sK0JBQStCO1FBQ3RDLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDMUIsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLHFCQUFxQixDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxlQUFlLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDbEcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDcEQsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUN2RCxDQUFDO0lBQ0YsQ0FBQztJQUVELE9BQU8sQ0FBQyxNQUFzQixFQUFFLHNCQUFnRDtRQUMvRSxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDN0QsSUFBSSxDQUFDLGNBQWMsR0FBRyxFQUFFLENBQUM7UUFDekIsc0JBQXNCLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUNyRCxJQUFJLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUN6QixJQUFJLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUN0RCxJQUFJLENBQUMsY0FBYyxHQUFHLFNBQVMsQ0FBQztRQUNqQyxDQUFDO1FBQ0QsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7SUFDekIsQ0FBQztJQUVELFVBQVU7UUFDVCxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUM7SUFDekIsQ0FBQztJQUVELE9BQU87UUFDTixPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ3pDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUMsa0JBQWtCLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDN0QsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7WUFDcEMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7UUFDckUsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQscUJBQXFCLENBQUMsSUFBb0IsRUFBRSxNQUFzQjtRQUNqRSxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDN0QsSUFBSSxDQUFDLGNBQWMsR0FBRyxFQUFFLENBQUM7UUFDekIsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7UUFDbEIsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDdEMsTUFBTSxDQUFDLGFBQWEsQ0FBQztnQkFDcEIsS0FBSyxFQUFFLFlBQVksQ0FBQyxNQUFNLENBQUMsS0FBSztnQkFDaEMsT0FBTyxFQUFFLHlCQUF5QjthQUNsQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztRQUN2QyxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxZQUFZLENBQUMsTUFBYyxFQUFFLHNCQUErQztRQUMzRSxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBRyxNQUFNLENBQUM7UUFDbkMsc0JBQXNCLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUNwRCxJQUFJLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUN6QixJQUFJLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUN2RCxDQUFDO0lBQ0YsQ0FBQztJQUVELGtCQUFrQixDQUFDLEtBQWlCO1FBQ25DLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUM7WUFDakMsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBRUQsNEJBQTRCO1FBQzVCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3JELE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDL0QsSUFBSSxLQUFLLEVBQUUsQ0FBQztnQkFDWCxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO1lBQ3BDLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDO0lBQ25CLENBQUM7SUFFRCxjQUFjLENBQUMsT0FBMkM7UUFFekQsSUFBSSxDQUFDLCtCQUErQixFQUFFLENBQUM7UUFDdkMsSUFBSSxDQUFDLGNBQWUsQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRWpELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzVDLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM1QixJQUFJLFFBQVEsRUFBRSxDQUFDO2dCQUNkLE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNqQyxNQUFNLENBQUMsT0FBTyxHQUFHLFFBQVEsQ0FBQyxPQUFPLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQztZQUNyRCxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCxVQUFVLENBQUMsSUFBcUI7UUFDL0IsT0FBTyxJQUFJLENBQUMsY0FBYyxFQUFFLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM5QyxDQUFDO0lBRUQsYUFBYTtRQUNaLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2pGLElBQUksS0FBSyxFQUFFLENBQUM7WUFDWCxPQUFPLEtBQUssQ0FBQyxlQUFlLENBQUM7UUFDOUIsQ0FBQztRQUNELE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDWCxDQUFDO0lBRUQsTUFBTSxDQUFDLHNCQUErQztRQUNyRCxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO1lBQ3BCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2pGLElBQUksS0FBSyxFQUFFLENBQUM7Z0JBQ1gsSUFBSSxDQUFDLFNBQVMsQ0FBQyxlQUFlLEdBQUcsS0FBSyxDQUFDLGVBQWUsR0FBRyxDQUFDLENBQUM7Z0JBQzNELHNCQUFzQixDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7Z0JBRXBELElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO29CQUN6QixJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUM7b0JBQzFELElBQUksQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO2dCQUN2RCxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsUUFBUTtRQUNQLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQztJQUNuQixDQUFDO0NBQ0QifQ==