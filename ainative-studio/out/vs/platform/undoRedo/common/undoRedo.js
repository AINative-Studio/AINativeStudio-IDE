/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../instantiation/common/instantiation.js';
export const IUndoRedoService = createDecorator('undoRedoService');
export var UndoRedoElementType;
(function (UndoRedoElementType) {
    UndoRedoElementType[UndoRedoElementType["Resource"] = 0] = "Resource";
    UndoRedoElementType[UndoRedoElementType["Workspace"] = 1] = "Workspace";
})(UndoRedoElementType || (UndoRedoElementType = {}));
export class ResourceEditStackSnapshot {
    constructor(resource, elements) {
        this.resource = resource;
        this.elements = elements;
    }
}
export class UndoRedoGroup {
    static { this._ID = 0; }
    constructor() {
        this.id = UndoRedoGroup._ID++;
        this.order = 1;
    }
    nextOrder() {
        if (this.id === 0) {
            return 0;
        }
        return this.order++;
    }
    static { this.None = new UndoRedoGroup(); }
}
export class UndoRedoSource {
    static { this._ID = 0; }
    constructor() {
        this.id = UndoRedoSource._ID++;
        this.order = 1;
    }
    nextOrder() {
        if (this.id === 0) {
            return 0;
        }
        return this.order++;
    }
    static { this.None = new UndoRedoSource(); }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW5kb1JlZG8uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdW5kb1JlZG8vY29tbW9uL3VuZG9SZWRvLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUU5RSxNQUFNLENBQUMsTUFBTSxnQkFBZ0IsR0FBRyxlQUFlLENBQW1CLGlCQUFpQixDQUFDLENBQUM7QUFFckYsTUFBTSxDQUFOLElBQWtCLG1CQUdqQjtBQUhELFdBQWtCLG1CQUFtQjtJQUNwQyxxRUFBUSxDQUFBO0lBQ1IsdUVBQVMsQ0FBQTtBQUNWLENBQUMsRUFIaUIsbUJBQW1CLEtBQW5CLG1CQUFtQixRQUdwQztBQXFFRCxNQUFNLE9BQU8seUJBQXlCO0lBQ3JDLFlBQ2lCLFFBQWEsRUFDYixRQUFrQjtRQURsQixhQUFRLEdBQVIsUUFBUSxDQUFLO1FBQ2IsYUFBUSxHQUFSLFFBQVEsQ0FBVTtJQUMvQixDQUFDO0NBQ0w7QUFFRCxNQUFNLE9BQU8sYUFBYTthQUNWLFFBQUcsR0FBRyxDQUFDLENBQUM7SUFLdkI7UUFDQyxJQUFJLENBQUMsRUFBRSxHQUFHLGFBQWEsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUM5QixJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQztJQUNoQixDQUFDO0lBRU0sU0FBUztRQUNmLElBQUksSUFBSSxDQUFDLEVBQUUsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNuQixPQUFPLENBQUMsQ0FBQztRQUNWLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUNyQixDQUFDO2FBRWEsU0FBSSxHQUFHLElBQUksYUFBYSxFQUFFLENBQUM7O0FBRzFDLE1BQU0sT0FBTyxjQUFjO2FBQ1gsUUFBRyxHQUFHLENBQUMsQ0FBQztJQUt2QjtRQUNDLElBQUksQ0FBQyxFQUFFLEdBQUcsY0FBYyxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQy9CLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDO0lBQ2hCLENBQUM7SUFFTSxTQUFTO1FBQ2YsSUFBSSxJQUFJLENBQUMsRUFBRSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ25CLE9BQU8sQ0FBQyxDQUFDO1FBQ1YsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3JCLENBQUM7YUFFYSxTQUFJLEdBQUcsSUFBSSxjQUFjLEVBQUUsQ0FBQyJ9