/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isNonEmptyArray } from '../../../../base/common/arrays.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { CharacterSet } from '../../../common/core/characterClassifier.js';
export class CommitCharacterController {
    constructor(editor, widget, model, accept) {
        this._disposables = new DisposableStore();
        this._disposables.add(model.onDidSuggest(e => {
            if (e.completionModel.items.length === 0) {
                this.reset();
            }
        }));
        this._disposables.add(model.onDidCancel(e => {
            this.reset();
        }));
        this._disposables.add(widget.onDidShow(() => this._onItem(widget.getFocusedItem())));
        this._disposables.add(widget.onDidFocus(this._onItem, this));
        this._disposables.add(widget.onDidHide(this.reset, this));
        this._disposables.add(editor.onWillType(text => {
            if (this._active && !widget.isFrozen() && model.state !== 0 /* State.Idle */) {
                const ch = text.charCodeAt(text.length - 1);
                if (this._active.acceptCharacters.has(ch) && editor.getOption(0 /* EditorOption.acceptSuggestionOnCommitCharacter */)) {
                    accept(this._active.item);
                }
            }
        }));
    }
    _onItem(selected) {
        if (!selected || !isNonEmptyArray(selected.item.completion.commitCharacters)) {
            // no item or no commit characters
            this.reset();
            return;
        }
        if (this._active && this._active.item.item === selected.item) {
            // still the same item
            return;
        }
        // keep item and its commit characters
        const acceptCharacters = new CharacterSet();
        for (const ch of selected.item.completion.commitCharacters) {
            if (ch.length > 0) {
                acceptCharacters.add(ch.charCodeAt(0));
            }
        }
        this._active = { acceptCharacters, item: selected };
    }
    reset() {
        this._active = undefined;
    }
    dispose() {
        this._disposables.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VnZ2VzdENvbW1pdENoYXJhY3RlcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvc3VnZ2VzdC9icm93c2VyL3N1Z2dlc3RDb21taXRDaGFyYWN0ZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFHdkUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBSTNFLE1BQU0sT0FBTyx5QkFBeUI7SUFTckMsWUFBWSxNQUFtQixFQUFFLE1BQXFCLEVBQUUsS0FBbUIsRUFBRSxNQUE4QztRQVAxRyxpQkFBWSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFTckQsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUM1QyxJQUFJLENBQUMsQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDMUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ2QsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDSixJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQzNDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNkLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JGLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzdELElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBRTFELElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDOUMsSUFBSSxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxJQUFJLEtBQUssQ0FBQyxLQUFLLHVCQUFlLEVBQUUsQ0FBQztnQkFDdEUsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUM1QyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxTQUFTLHdEQUFnRCxFQUFFLENBQUM7b0JBQy9HLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUMzQixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRU8sT0FBTyxDQUFDLFFBQXlDO1FBQ3hELElBQUksQ0FBQyxRQUFRLElBQUksQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDO1lBQzlFLGtDQUFrQztZQUNsQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDYixPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzlELHNCQUFzQjtZQUN0QixPQUFPO1FBQ1IsQ0FBQztRQUVELHNDQUFzQztRQUN0QyxNQUFNLGdCQUFnQixHQUFHLElBQUksWUFBWSxFQUFFLENBQUM7UUFDNUMsS0FBSyxNQUFNLEVBQUUsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQzVELElBQUksRUFBRSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDbkIsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN4QyxDQUFDO1FBQ0YsQ0FBQztRQUNELElBQUksQ0FBQyxPQUFPLEdBQUcsRUFBRSxnQkFBZ0IsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLENBQUM7SUFDckQsQ0FBQztJQUVELEtBQUs7UUFDSixJQUFJLENBQUMsT0FBTyxHQUFHLFNBQVMsQ0FBQztJQUMxQixDQUFDO0lBRUQsT0FBTztRQUNOLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDN0IsQ0FBQztDQUNEIn0=