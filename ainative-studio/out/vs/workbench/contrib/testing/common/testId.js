/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export var TestIdPathParts;
(function (TestIdPathParts) {
    /** Delimiter for path parts in test IDs */
    TestIdPathParts["Delimiter"] = "\0";
})(TestIdPathParts || (TestIdPathParts = {}));
/**
 * Enum for describing relative positions of tests. Similar to
 * `node.compareDocumentPosition` in the DOM.
 */
export var TestPosition;
(function (TestPosition) {
    /** a === b */
    TestPosition[TestPosition["IsSame"] = 0] = "IsSame";
    /** Neither a nor b are a child of one another. They may share a common parent, though. */
    TestPosition[TestPosition["Disconnected"] = 1] = "Disconnected";
    /** b is a child of a */
    TestPosition[TestPosition["IsChild"] = 2] = "IsChild";
    /** b is a parent of a */
    TestPosition[TestPosition["IsParent"] = 3] = "IsParent";
})(TestPosition || (TestPosition = {}));
/**
 * The test ID is a stringifiable client that
 */
export class TestId {
    /**
     * Creates a test ID from an ext host test item.
     */
    static fromExtHostTestItem(item, rootId, parent = item.parent) {
        if (item._isRoot) {
            return new TestId([rootId]);
        }
        const path = [item.id];
        for (let i = parent; i && i.id !== rootId; i = i.parent) {
            path.push(i.id);
        }
        path.push(rootId);
        return new TestId(path.reverse());
    }
    /**
     * Cheaply ets whether the ID refers to the root .
     */
    static isRoot(idString) {
        return !idString.includes("\0" /* TestIdPathParts.Delimiter */);
    }
    /**
     * Cheaply gets whether the ID refers to the root .
     */
    static root(idString) {
        const idx = idString.indexOf("\0" /* TestIdPathParts.Delimiter */);
        return idx === -1 ? idString : idString.slice(0, idx);
    }
    /**
     * Creates a test ID from a serialized TestId instance.
     */
    static fromString(idString) {
        return new TestId(idString.split("\0" /* TestIdPathParts.Delimiter */));
    }
    /**
     * Gets the ID resulting from adding b to the base ID.
     */
    static join(base, b) {
        return new TestId([...base.path, b]);
    }
    /**
     * Splits a test ID into its parts.
     */
    static split(idString) {
        return idString.split("\0" /* TestIdPathParts.Delimiter */);
    }
    /**
     * Gets the string ID resulting from adding b to the base ID.
     */
    static joinToString(base, b) {
        return base.toString() + "\0" /* TestIdPathParts.Delimiter */ + b;
    }
    /**
     * Cheaply gets the parent ID of a test identified with the string.
     */
    static parentId(idString) {
        const idx = idString.lastIndexOf("\0" /* TestIdPathParts.Delimiter */);
        return idx === -1 ? undefined : idString.slice(0, idx);
    }
    /**
     * Cheaply gets the local ID of a test identified with the string.
     */
    static localId(idString) {
        const idx = idString.lastIndexOf("\0" /* TestIdPathParts.Delimiter */);
        return idx === -1 ? idString : idString.slice(idx + "\0" /* TestIdPathParts.Delimiter */.length);
    }
    /**
     * Gets whether maybeChild is a child of maybeParent.
     * todo@connor4312: review usages of this to see if using the WellDefinedPrefixTree is better
     */
    static isChild(maybeParent, maybeChild) {
        return maybeChild[maybeParent.length] === "\0" /* TestIdPathParts.Delimiter */ && maybeChild.startsWith(maybeParent);
    }
    /**
     * Compares the position of the two ID strings.
     * todo@connor4312: review usages of this to see if using the WellDefinedPrefixTree is better
     */
    static compare(a, b) {
        if (a === b) {
            return 0 /* TestPosition.IsSame */;
        }
        if (TestId.isChild(a, b)) {
            return 2 /* TestPosition.IsChild */;
        }
        if (TestId.isChild(b, a)) {
            return 3 /* TestPosition.IsParent */;
        }
        return 1 /* TestPosition.Disconnected */;
    }
    static getLengthOfCommonPrefix(length, getId) {
        if (length === 0) {
            return 0;
        }
        let commonPrefix = 0;
        while (commonPrefix < length - 1) {
            for (let i = 1; i < length; i++) {
                const a = getId(i - 1);
                const b = getId(i);
                if (a.path[commonPrefix] !== b.path[commonPrefix]) {
                    return commonPrefix;
                }
            }
            commonPrefix++;
        }
        return commonPrefix;
    }
    constructor(path, viewEnd = path.length) {
        this.path = path;
        this.viewEnd = viewEnd;
        if (path.length === 0 || viewEnd < 1) {
            throw new Error('cannot create test with empty path');
        }
    }
    /**
     * Gets the ID of the parent test.
     */
    get rootId() {
        return new TestId(this.path, 1);
    }
    /**
     * Gets the ID of the parent test.
     */
    get parentId() {
        return this.viewEnd > 1 ? new TestId(this.path, this.viewEnd - 1) : undefined;
    }
    /**
     * Gets the local ID of the current full test ID.
     */
    get localId() {
        return this.path[this.viewEnd - 1];
    }
    /**
     * Gets whether this ID refers to the root.
     */
    get controllerId() {
        return this.path[0];
    }
    /**
     * Gets whether this ID refers to the root.
     */
    get isRoot() {
        return this.viewEnd === 1;
    }
    /**
     * Returns an iterable that yields IDs of all parent items down to and
     * including the current item.
     */
    *idsFromRoot() {
        for (let i = 1; i <= this.viewEnd; i++) {
            yield new TestId(this.path, i);
        }
    }
    /**
     * Returns an iterable that yields IDs of the current item up to the root
     * item.
     */
    *idsToRoot() {
        for (let i = this.viewEnd; i > 0; i--) {
            yield new TestId(this.path, i);
        }
    }
    /**
     * Compares the other test ID with this one.
     */
    compare(other) {
        if (typeof other === 'string') {
            return TestId.compare(this.toString(), other);
        }
        for (let i = 0; i < other.viewEnd && i < this.viewEnd; i++) {
            if (other.path[i] !== this.path[i]) {
                return 1 /* TestPosition.Disconnected */;
            }
        }
        if (other.viewEnd > this.viewEnd) {
            return 2 /* TestPosition.IsChild */;
        }
        if (other.viewEnd < this.viewEnd) {
            return 3 /* TestPosition.IsParent */;
        }
        return 0 /* TestPosition.IsSame */;
    }
    /**
     * Serializes the ID.
     */
    toJSON() {
        return this.toString();
    }
    /**
     * Serializes the ID to a string.
     */
    toString() {
        if (!this.stringifed) {
            this.stringifed = this.path[0];
            for (let i = 1; i < this.viewEnd; i++) {
                this.stringifed += "\0" /* TestIdPathParts.Delimiter */;
                this.stringifed += this.path[i];
            }
        }
        return this.stringifed;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdElkLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvY29tbW9uL3Rlc3RJZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxNQUFNLENBQU4sSUFBa0IsZUFHakI7QUFIRCxXQUFrQixlQUFlO0lBQ2hDLDJDQUEyQztJQUMzQyxtQ0FBZ0IsQ0FBQTtBQUNqQixDQUFDLEVBSGlCLGVBQWUsS0FBZixlQUFlLFFBR2hDO0FBRUQ7OztHQUdHO0FBQ0gsTUFBTSxDQUFOLElBQWtCLFlBU2pCO0FBVEQsV0FBa0IsWUFBWTtJQUM3QixjQUFjO0lBQ2QsbURBQU0sQ0FBQTtJQUNOLDBGQUEwRjtJQUMxRiwrREFBWSxDQUFBO0lBQ1osd0JBQXdCO0lBQ3hCLHFEQUFPLENBQUE7SUFDUCx5QkFBeUI7SUFDekIsdURBQVEsQ0FBQTtBQUNULENBQUMsRUFUaUIsWUFBWSxLQUFaLFlBQVksUUFTN0I7QUFJRDs7R0FFRztBQUNILE1BQU0sT0FBTyxNQUFNO0lBR2xCOztPQUVHO0lBQ0ksTUFBTSxDQUFDLG1CQUFtQixDQUFDLElBQWtCLEVBQUUsTUFBYyxFQUFFLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTTtRQUN6RixJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNsQixPQUFPLElBQUksTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUM3QixDQUFDO1FBRUQsTUFBTSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDdkIsS0FBSyxJQUFJLENBQUMsR0FBRyxNQUFNLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEtBQUssTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLENB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