/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * @internal
 */
export var RawContentChangedType;
(function (RawContentChangedType) {
    RawContentChangedType[RawContentChangedType["Flush"] = 1] = "Flush";
    RawContentChangedType[RawContentChangedType["LineChanged"] = 2] = "LineChanged";
    RawContentChangedType[RawContentChangedType["LinesDeleted"] = 3] = "LinesDeleted";
    RawContentChangedType[RawContentChangedType["LinesInserted"] = 4] = "LinesInserted";
    RawContentChangedType[RawContentChangedType["EOLChanged"] = 5] = "EOLChanged";
})(RawContentChangedType || (RawContentChangedType = {}));
/**
 * An event describing that a model has been reset to a new value.
 * @internal
 */
export class ModelRawFlush {
    constructor() {
        this.changeType = 1 /* RawContentChangedType.Flush */;
    }
}
/**
 * Represents text injected on a line
 * @internal
 */
export class LineInjectedText {
    static applyInjectedText(lineText, injectedTexts) {
        if (!injectedTexts || injectedTexts.length === 0) {
            return lineText;
        }
        let result = '';
        let lastOriginalOffset = 0;
        for (const injectedText of injectedTexts) {
            result += lineText.substring(lastOriginalOffset, injectedText.column - 1);
            lastOriginalOffset = injectedText.column - 1;
            result += injectedText.options.content;
        }
        result += lineText.substring(lastOriginalOffset);
        return result;
    }
    static fromDecorations(decorations) {
        const result = [];
        for (const decoration of decorations) {
            if (decoration.options.before && decoration.options.before.content.length > 0) {
                result.push(new LineInjectedText(decoration.ownerId, decoration.range.startLineNumber, decoration.range.startColumn, decoration.options.before, 0));
            }
            if (decoration.options.after && decoration.options.after.content.length > 0) {
                result.push(new LineInjectedText(decoration.ownerId, decoration.range.endLineNumber, decoration.range.endColumn, decoration.options.after, 1));
            }
        }
        result.sort((a, b) => {
            if (a.lineNumber === b.lineNumber) {
                if (a.column === b.column) {
                    return a.order - b.order;
                }
                return a.column - b.column;
            }
            return a.lineNumber - b.lineNumber;
        });
        return result;
    }
    constructor(ownerId, lineNumber, column, options, order) {
        this.ownerId = ownerId;
        this.lineNumber = lineNumber;
        this.column = column;
        this.options = options;
        this.order = order;
    }
    withText(text) {
        return new LineInjectedText(this.ownerId, this.lineNumber, this.column, { ...this.options, content: text }, this.order);
    }
}
/**
 * An event describing that a line has changed in a model.
 * @internal
 */
export class ModelRawLineChanged {
    constructor(lineNumber, detail, injectedText) {
        this.changeType = 2 /* RawContentChangedType.LineChanged */;
        this.lineNumber = lineNumber;
        this.detail = detail;
        this.injectedText = injectedText;
    }
}
/**
 * An event describing that line(s) have been deleted in a model.
 * @internal
 */
export class ModelRawLinesDeleted {
    constructor(fromLineNumber, toLineNumber) {
        this.changeType = 3 /* RawContentChangedType.LinesDeleted */;
        this.fromLineNumber = fromLineNumber;
        this.toLineNumber = toLineNumber;
    }
}
/**
 * An event describing that line(s) have been inserted in a model.
 * @internal
 */
export class ModelRawLinesInserted {
    constructor(fromLineNumber, toLineNumber, detail, injectedTexts) {
        this.changeType = 4 /* RawContentChangedType.LinesInserted */;
        this.injectedTexts = injectedTexts;
        this.fromLineNumber = fromLineNumber;
        this.toLineNumber = toLineNumber;
        this.detail = detail;
    }
}
/**
 * An event describing that a model has had its EOL changed.
 * @internal
 */
export class ModelRawEOLChanged {
    constructor() {
        this.changeType = 5 /* RawContentChangedType.EOLChanged */;
    }
}
/**
 * An event describing a change in the text of a model.
 * @internal
 */
export class ModelRawContentChangedEvent {
    constructor(changes, versionId, isUndoing, isRedoing) {
        this.changes = changes;
        this.versionId = versionId;
        this.isUndoing = isUndoing;
        this.isRedoing = isRedoing;
        this.resultingSelection = null;
    }
    containsEvent(type) {
        for (let i = 0, len = this.changes.length; i < len; i++) {
            const change = this.changes[i];
            if (change.changeType === type) {
                return true;
            }
        }
        return false;
    }
    static merge(a, b) {
        const changes = [].concat(a.changes).concat(b.changes);
        const versionId = b.versionId;
        const isUndoing = (a.isUndoing || b.isUndoing);
        const isRedoing = (a.isRedoing || b.isRedoing);
        return new ModelRawContentChangedEvent(changes, versionId, isUndoing, isRedoing);
    }
}
/**
 * An event describing a change in injected text.
 * @internal
 */
export class ModelInjectedTextChangedEvent {
    constructor(changes) {
        this.changes = changes;
    }
}
/**
 * @internal
 */
export class InternalModelContentChangeEvent {
    constructor(rawContentChangedEvent, contentChangedEvent) {
        this.rawContentChangedEvent = rawContentChangedEvent;
        this.contentChangedEvent = contentChangedEvent;
    }
    merge(other) {
        const rawContentChangedEvent = ModelRawContentChangedEvent.merge(this.rawContentChangedEvent, other.rawContentChangedEvent);
        const contentChangedEvent = InternalModelContentChangeEvent._mergeChangeEvents(this.contentChangedEvent, other.contentChangedEvent);
        return new InternalModelContentChangeEvent(rawContentChangedEvent, contentChangedEvent);
    }
    static _mergeChangeEvents(a, b) {
        const changes = [].concat(a.changes).concat(b.changes);
        const eol = b.eol;
        const versionId = b.versionId;
        const isUndoing = (a.isUndoing || b.isUndoing);
        const isRedoing = (a.isRedoing || b.isRedoing);
        const isFlush = (a.isFlush || b.isFlush);
        const isEolChange = a.isEolChange && b.isEolChange; // both must be true to not confuse listeners who skip such edits
        return {
            changes: changes,
            eol: eol,
            isEolChange: isEolChange,
            versionId: versionId,
            isUndoing: isUndoing,
            isRedoing: isRedoing,
            isFlush: isFlush,
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1vZGVsRXZlbnRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vdGV4dE1vZGVsRXZlbnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBeUhoRzs7R0FFRztBQUNILE1BQU0sQ0FBTixJQUFrQixxQkFNakI7QUFORCxXQUFrQixxQkFBcUI7SUFDdEMsbUVBQVMsQ0FBQTtJQUNULCtFQUFlLENBQUE7SUFDZixpRkFBZ0IsQ0FBQTtJQUNoQixtRkFBaUIsQ0FBQTtJQUNqQiw2RUFBYyxDQUFBO0FBQ2YsQ0FBQyxFQU5pQixxQkFBcUIsS0FBckIscUJBQXFCLFFBTXRDO0FBRUQ7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLGFBQWE7SUFBMUI7UUFDaUIsZUFBVSx1Q0FBK0I7SUFDMUQsQ0FBQztDQUFBO0FBRUQ7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLGdCQUFnQjtJQUNyQixNQUFNLENBQUMsaUJBQWlCLENBQUMsUUFBZ0IsRUFBRSxhQUF3QztRQUN6RixJQUFJLENBQUMsYUFBYSxJQUFJLGFBQWEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDbEQsT0FBTyxRQUFRLENBQUM7UUFDakIsQ0FBQztRQUNELElBQUksTUFBTSxHQUFHLEVBQUUsQ0FBQztRQUNoQixJQUFJLGtCQUFrQixHQUFHLENBQUMsQ0FBQztRQUMzQixLQUFLLE1BQU0sWUFBWSxJQUFJLGFBQWEsRUFBRSxDQUFDO1lBQzFDLE1BQU0sSUFBSSxRQUFRLENBQUMsU0FBUyxDQUFDLGtCQUFrQixFQUFFLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDMUUsa0JBQWtCLEdBQUcsWUFBWSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7WUFDN0MsTUFBTSxJQUFJLFlBQVksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDO1FBQ3hDLENBQUM7UUFDRCxNQUFNLElBQUksUUFBUSxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQ2pELE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQztJQUVNLE1BQU0sQ0FBQyxlQUFlLENBQUMsV0FBK0I7UUFDNUQsTUFBTSxNQUFNLEdBQXVCLEVBQUUsQ0FBQztRQUN0QyxLQUFLLE1BQU0sVUFBVSxJQUFJLFdBQVcsRUFBRSxDQUFDO1lBQ3RDLElBQUksVUFBVSxDQUFDLE9BQU8sQ0FBQyxNQUFNLElBQUksVUFBVSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDL0UsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLGdCQUFnQixDQUMvQixVQUFVLENBQUMsT0FBTyxFQUNsQixVQUFVLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFDaEMsVUFBVSxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQzVCLFVBQVUsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUN6QixDQUFDLENBQ0QsQ0FBQyxDQUFDO1lBQ0osQ0FBQztZQUNELElBQUksVUFBVSxDQUFDLE9BQU8sQ0FBQyxLQUFLLElBQUksVUFBVSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDN0UsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLGdCQUFnQixDQUMvQixVQUFVLENBQUMsT0FBTyxFQUNsQixVQUFVLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFDOUIsVUFBVSxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQzFCLFVBQVUsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUN4QixDQUFDLENBQ0QsQ0FBQyxDQUFDO1lBQ0osQ0FBQztRQUNGLENBQUM7UUFDRCxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ3BCLElBQUksQ0FBQyxDQUFDLFVBQVUsS0FBSyxDQUFDLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQ25DLElBQUksQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUM7b0JBQzNCLE9BQU8sQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDO2dCQUMxQixDQUFDO2dCQUNELE9BQU8sQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDO1lBQzVCLENBQUM7WUFDRCxPQUFPLENBQUMsQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLFVBQVUsQ0FBQztRQUNwQyxDQUFDLENBQUMsQ0FBQztRQUNILE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQztJQUVELFlBQ2lCLE9BQWUsRUFDZixVQUFrQixFQUNsQixNQUFjLEVBQ2QsT0FBNEIsRUFDNUIsS0FBYTtRQUpiLFlBQU8sR0FBUCxPQUFPLENBQVE7UUFDZixlQUFVLEdBQVYsVUFBVSxDQUFRO1FBQ2xCLFdBQU0sR0FBTixNQUFNLENBQVE7UUFDZCxZQUFPLEdBQVAsT0FBTyxDQUFxQjtRQUM1QixVQUFLLEdBQUwsS0FBSyxDQUFRO0lBQzFCLENBQUM7SUFFRSxRQUFRLENBQUMsSUFBWTtRQUMzQixPQUFPLElBQUksZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRSxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUN6SCxDQUFDO0NBQ0Q7QUFFRDs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sbUJBQW1CO0lBZS9CLFlBQVksVUFBa0IsRUFBRSxNQUFjLEVBQUUsWUFBdUM7UUFkdkUsZUFBVSw2Q0FBcUM7UUFlOUQsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7UUFDN0IsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFDckIsSUFBSSxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUM7SUFDbEMsQ0FBQztDQUNEO0FBRUQ7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLG9CQUFvQjtJQVdoQyxZQUFZLGNBQXNCLEVBQUUsWUFBb0I7UUFWeEMsZUFBVSw4Q0FBc0M7UUFXL0QsSUFBSSxDQUFDLGNBQWMsR0FBRyxjQUFjLENBQUM7UUFDckMsSUFBSSxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUM7SUFDbEMsQ0FBQztDQUNEO0FBRUQ7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLHFCQUFxQjtJQW1CakMsWUFBWSxjQUFzQixFQUFFLFlBQW9CLEVBQUUsTUFBZ0IsRUFBRSxhQUE0QztRQWxCeEcsZUFBVSwrQ0FBdUM7UUFtQmhFLElBQUksQ0FBQyxhQUFhLEdBQUcsYUFBYSxDQUFDO1FBQ25DLElBQUksQ0FBQyxjQUFjLEdBQUcsY0FBYyxDQUFDO1FBQ3JDLElBQUksQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFDO1FBQ2pDLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO0lBQ3RCLENBQUM7Q0FDRDtBQUVEOzs7R0FHRztBQUNILE1BQU0sT0FBTyxrQkFBa0I7SUFBL0I7UUFDaUIsZUFBVSw0Q0FBb0M7SUFDL0QsQ0FBQztDQUFBO0FBT0Q7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLDJCQUEyQjtJQWtCdkMsWUFBWSxPQUF5QixFQUFFLFNBQWlCLEVBQUUsU0FBa0IsRUFBRSxTQUFrQjtRQUMvRixJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztRQUN2QixJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztRQUMzQixJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztRQUMzQixJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztRQUMzQixJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFDO0lBQ2hDLENBQUM7SUFFTSxhQUFhLENBQUMsSUFBMkI7UUFDL0MsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN6RCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQy9CLElBQUksTUFBTSxDQUFDLFVBQVUsS0FBSyxJQUFJLEVBQUUsQ0FBQztnQkFDaEMsT0FBTyxJQUFJLENBQUM7WUFDYixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUVNLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBOEIsRUFBRSxDQUE4QjtRQUNqRixNQUFNLE9BQU8sR0FBSSxFQUF1QixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM3RSxNQUFNLFNBQVMsR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFDO1FBQzlCLE1BQU0sU0FBUyxHQUFHLENBQUMsQ0FBQyxDQUFDLFNBQVMsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDL0MsTUFBTSxTQUFTLEdBQUcsQ0FBQyxDQUFDLENBQUMsU0FBUyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUMvQyxPQUFPLElBQUksMkJBQTJCLENBQUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDbEYsQ0FBQztDQUNEO0FBRUQ7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLDZCQUE2QjtJQUl6QyxZQUFZLE9BQThCO1FBQ3pDLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO0lBQ3hCLENBQUM7Q0FDRDtBQUVEOztHQUVHO0FBQ0gsTUFBTSxPQUFPLCtCQUErQjtJQUMzQyxZQUNpQixzQkFBbUQsRUFDbkQsbUJBQThDO1FBRDlDLDJCQUFzQixHQUF0QixzQkFBc0IsQ0FBNkI7UUFDbkQsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUEyQjtJQUMzRCxDQUFDO0lBRUUsS0FBSyxDQUFDLEtBQXNDO1FBQ2xELE1BQU0sc0JBQXNCLEdBQUcsMkJBQTJCLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxLQUFLLENBQUMsc0JBQXNCLENBQUMsQ0FBQztRQUM1SCxNQUFNLG1CQUFtQixHQUFHLCtCQUErQixDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxLQUFLLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUNwSSxPQUFPLElBQUksK0JBQStCLENBQUMsc0JBQXNCLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztJQUN6RixDQUFDO0lBRU8sTUFBTSxDQUFDLGtCQUFrQixDQUFDLENBQTRCLEVBQUUsQ0FBNEI7UUFDM0YsTUFBTSxPQUFPLEdBQUksRUFBNEIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDbEYsTUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQztRQUNsQixNQUFNLFNBQVMsR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFDO1FBQzlCLE1BQU0sU0FBUyxHQUFHLENBQUMsQ0FBQyxDQUFDLFNBQVMsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDL0MsTUFBTSxTQUFTLEdBQUcsQ0FBQyxDQUFDLENBQUMsU0FBUyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUMvQyxNQUFNLE9BQU8sR0FBRyxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3pDLE1BQU0sV0FBVyxHQUFHLENBQUMsQ0FBQyxXQUFXLElBQUksQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLGlFQUFpRTtRQUNySCxPQUFPO1lBQ04sT0FBTyxFQUFFLE9BQU87WUFDaEIsR0FBRyxFQUFFLEdBQUc7WUFDUixXQUFXLEVBQUUsV0FBVztZQUN4QixTQUFTLEVBQUUsU0FBUztZQUNwQixTQUFTLEVBQUUsU0FBUztZQUNwQixTQUFTLEVBQUUsU0FBUztZQUNwQixPQUFPLEVBQUUsT0FBTztTQUNoQixDQUFDO0lBQ0gsQ0FBQztDQUNEIn0=