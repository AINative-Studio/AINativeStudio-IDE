/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class BasicInplaceReplace {
    constructor() {
        this._defaultValueSet = [
            ['true', 'false'],
            ['True', 'False'],
            ['Private', 'Public', 'Friend', 'ReadOnly', 'Partial', 'Protected', 'WriteOnly'],
            ['public', 'protected', 'private'],
        ];
    }
    static { this.INSTANCE = new BasicInplaceReplace(); }
    navigateValueSet(range1, text1, range2, text2, up) {
        if (range1 && text1) {
            const result = this.doNavigateValueSet(text1, up);
            if (result) {
                return {
                    range: range1,
                    value: result
                };
            }
        }
        if (range2 && text2) {
            const result = this.doNavigateValueSet(text2, up);
            if (result) {
                return {
                    range: range2,
                    value: result
                };
            }
        }
        return null;
    }
    doNavigateValueSet(text, up) {
        const numberResult = this.numberReplace(text, up);
        if (numberResult !== null) {
            return numberResult;
        }
        return this.textReplace(text, up);
    }
    numberReplace(value, up) {
        const precision = Math.pow(10, value.length - (value.lastIndexOf('.') + 1));
        let n1 = Number(value);
        const n2 = parseFloat(value);
        if (!isNaN(n1) && !isNaN(n2) && n1 === n2) {
            if (n1 === 0 && !up) {
                return null; // don't do negative
                //			} else if(n1 === 9 && up) {
                //				return null; // don't insert 10 into a number
            }
            else {
                n1 = Math.floor(n1 * precision);
                n1 += up ? precision : -precision;
                return String(n1 / precision);
            }
        }
        return null;
    }
    textReplace(value, up) {
        return this.valueSetsReplace(this._defaultValueSet, value, up);
    }
    valueSetsReplace(valueSets, value, up) {
        let result = null;
        for (let i = 0, len = valueSets.length; result === null && i < len; i++) {
            result = this.valueSetReplace(valueSets[i], value, up);
        }
        return result;
    }
    valueSetReplace(valueSet, value, up) {
        let idx = valueSet.indexOf(value);
        if (idx >= 0) {
            idx += up ? +1 : -1;
            if (idx < 0) {
                idx = valueSet.length - 1;
            }
            else {
                idx %= valueSet.length;
            }
            return valueSet[idx];
        }
        return null;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5wbGFjZVJlcGxhY2VTdXBwb3J0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vbGFuZ3VhZ2VzL3N1cHBvcnRzL2lucGxhY2VSZXBsYWNlU3VwcG9ydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUtoRyxNQUFNLE9BQU8sbUJBQW1CO0lBQWhDO1FBMERrQixxQkFBZ0IsR0FBZTtZQUMvQyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUM7WUFDakIsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDO1lBQ2pCLENBQUMsU0FBUyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsV0FBVyxDQUFDO1lBQ2hGLENBQUMsUUFBUSxFQUFFLFdBQVcsRUFBRSxTQUFTLENBQUM7U0FDbEMsQ0FBQztJQTJCSCxDQUFDO2FBeEZ1QixhQUFRLEdBQUcsSUFBSSxtQkFBbUIsRUFBRSxBQUE1QixDQUE2QjtJQUVyRCxnQkFBZ0IsQ0FBQyxNQUFjLEVBQUUsS0FBYSxFQUFFLE1BQWMsRUFBRSxLQUFvQixFQUFFLEVBQVc7UUFFdkcsSUFBSSxNQUFNLElBQUksS0FBSyxFQUFFLENBQUM7WUFDckIsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztZQUNsRCxJQUFJLE1BQU0sRUFBRSxDQUFDO2dCQUNaLE9BQU87b0JBQ04sS0FBSyxFQUFFLE1BQU07b0JBQ2IsS0FBSyxFQUFFLE1BQU07aUJBQ2IsQ0FBQztZQUNILENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxNQUFNLElBQUksS0FBSyxFQUFFLENBQUM7WUFDckIsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUss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