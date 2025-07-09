/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export function getCompressedContent(schema) {
    let hasDups = false;
    // visit all schema nodes and collect the ones that are equal
    const equalsByString = new Map();
    const nodeToEquals = new Map();
    const visitSchemas = (next) => {
        if (schema === next) {
            return true;
        }
        const val = JSON.stringify(next);
        if (val.length < 30) {
            // the $ref takes around 25 chars, so we don't save anything
            return true;
        }
        const eq = equalsByString.get(val);
        if (!eq) {
            const newEq = { schemas: [next] };
            equalsByString.set(val, newEq);
            nodeToEquals.set(next, newEq);
            return true;
        }
        eq.schemas.push(next);
        nodeToEquals.set(next, eq);
        hasDups = true;
        return false;
    };
    traverseNodes(schema, visitSchemas);
    equalsByString.clear();
    if (!hasDups) {
        return JSON.stringify(schema);
    }
    let defNodeName = '$defs';
    while (schema.hasOwnProperty(defNodeName)) {
        defNodeName += '_';
    }
    // used to collect all schemas that are later put in `$defs`. The index in the array is the id of the schema.
    const definitions = [];
    function stringify(root) {
        return JSON.stringify(root, (_key, value) => {
            if (value !== root) {
                const eq = nodeToEquals.get(value);
                if (eq && eq.schemas.length > 1) {
                    if (!eq.id) {
                        eq.id = `_${definitions.length}`;
                        definitions.push(eq.schemas[0]);
                    }
                    return { $ref: `#/${defNodeName}/${eq.id}` };
                }
            }
            return value;
        });
    }
    // stringify the schema and replace duplicate subtrees with $ref
    // this will add new items to the definitions array
    const str = stringify(schema);
    // now stringify the definitions. Each invication of stringify cann add new items to the definitions array, so the length can grow while we iterate
    const defStrings = [];
    for (let i = 0; i < definitions.length; i++) {
        defStrings.push(`"_${i}":${stringify(definitions[i])}`);
    }
    if (defStrings.length) {
        return `${str.substring(0, str.length - 1)},"${defNodeName}":{${defStrings.join(',')}}}`;
    }
    return str;
}
function isObject(thing) {
    return typeof thing === 'object' && thing !== null;
}
/*
 * Traverse a JSON schema and visit each schema node
*/
function traverseNodes(root, visit) {
    if (!root || typeof root !== 'object') {
        return;
    }
    const collectEntries = (...entries) => {
        for (const entry of entries) {
            if (isObject(entry)) {
                toWalk.push(entry);
            }
        }
    };
    const collectMapEntries = (...maps) => {
        for (const map of maps) {
            if (isObject(map)) {
                for (const key in map) {
                    const entry = map[key];
                    if (isObject(entry)) {
                        toWalk.push(entry);
                    }
                }
            }
        }
    };
    const collectArrayEntries = (...arrays) => {
        for (const array of arrays) {
            if (Array.isArray(array)) {
                for (const entry of array) {
                    if (isObject(entry)) {
                        toWalk.push(entry);
                    }
                }
            }
        }
    };
    const collectEntryOrArrayEntries = (items) => {
        if (Array.isArray(items)) {
            for (const entry of items) {
                if (isObject(entry)) {
                    toWalk.push(entry);
                }
            }
        }
        else if (isObject(items)) {
            toWalk.push(items);
        }
    };
    const toWalk = [root];
    let next = toWalk.pop();
    while (next) {
        const visitChildern = visit(next);
        if (visitChildern) {
            collectEntries(next.additionalItems, next.additionalProperties, next.not, next.contains, next.propertyNames, next.if, next.then, next.else, next.unevaluatedItems, next.unevaluatedProperties);
            collectMapEntries(next.definitions, next.$defs, next.properties, next.patternProperties, next.dependencies, next.dependentSchemas);
            collectArrayEntries(next.anyOf, next.allOf, next.oneOf, next.prefixItems);
            collectEntryOrArrayEntries(next.items);
        }
        next = toWalk.pop();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvblNjaGVtYS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9qc29uU2NoZW1hLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBa0loRyxNQUFNLFVBQVUsb0JBQW9CLENBQUMsTUFBbUI7SUFDdkQsSUFBSSxPQUFPLEdBQUcsS0FBSyxDQUFDO0lBR3BCLDZEQUE2RDtJQUM3RCxNQUFNLGNBQWMsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztJQUNqRCxNQUFNLFlBQVksR0FBRyxJQUFJLEdBQUcsRUFBdUIsQ0FBQztJQUNwRCxNQUFNLFlBQVksR0FBRyxDQUFDLElBQWlCLEVBQUUsRUFBRTtRQUMxQyxJQUFJLE1BQU0sS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUNyQixPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFDRCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2pDLElBQUksR0FBRyxDQUFDLE1BQU0sR0FBRyxFQUFFLEVBQUUsQ0FBQztZQUNyQiw0REFBNEQ7WUFDNUQsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBQ0QsTUFBTSxFQUFFLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNuQyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDVCxNQUFNLEtBQUssR0FBRyxFQUFFLE9BQU8sRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDbEMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDL0IsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDOUIsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBQ0QsRUFB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