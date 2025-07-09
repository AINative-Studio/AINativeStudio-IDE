/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isObject } from './types.js';
class Verifier {
    constructor(defaultValue) {
        this.defaultValue = defaultValue;
    }
    verify(value) {
        if (!this.isType(value)) {
            return this.defaultValue;
        }
        return value;
    }
}
export class BooleanVerifier extends Verifier {
    isType(value) {
        return typeof value === 'boolean';
    }
}
export class NumberVerifier extends Verifier {
    isType(value) {
        return typeof value === 'number';
    }
}
export class SetVerifier extends Verifier {
    isType(value) {
        return value instanceof Set;
    }
}
export class EnumVerifier extends Verifier {
    constructor(defaultValue, allowedValues) {
        super(defaultValue);
        this.allowedValues = allowedValues;
    }
    isType(value) {
        return this.allowedValues.includes(value);
    }
}
export class ObjectVerifier extends Verifier {
    constructor(defaultValue, verifier) {
        super(defaultValue);
        this.verifier = verifier;
    }
    verify(value) {
        if (!this.isType(value)) {
            return this.defaultValue;
        }
        return verifyObject(this.verifier, value);
    }
    isType(value) {
        return isObject(value);
    }
}
export function verifyObject(verifiers, value) {
    const result = Object.create(null);
    for (const key in verifiers) {
        if (Object.hasOwnProperty.call(verifiers, key)) {
            const verifier = verifiers[key];
            result[key] = verifier.verify(value[key]);
        }
    }
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmVyaWZpZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vdmVyaWZpZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLFlBQVksQ0FBQztBQU10QyxNQUFlLFFBQVE7SUFFdEIsWUFBK0IsWUFBZTtRQUFmLGlCQUFZLEdBQVosWUFBWSxDQUFHO0lBQUksQ0FBQztJQUVuRCxNQUFNLENBQUMsS0FBYztRQUNwQixJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3pCLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQztRQUMxQixDQUFDO1FBRUQsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0NBR0Q7QUFFRCxNQUFNLE9BQU8sZUFBZ0IsU0FBUSxRQUFpQjtJQUMzQyxNQUFNLENBQUMsS0FBYztRQUM5QixPQUFPLE9BQU8sS0FBSyxLQUFLLFNBQVMsQ0FBQztJQUNuQyxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sY0FBZSxTQUFRLFFBQWdCO0lBQ3pDLE1BQU0sQ0FBQyxLQUFjO1FBQzlCLE9BQU8sT0FBTyxLQUFLLEtBQUssUUFBUSxDQUFDO0lBQ2xDLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxXQUFlLFNBQVEsUUFBZ0I7SUFDekMsTUFBTSxDQUFDLEtBQWM7UUFDOUIsT0FBTyxLQUFLLFlBQVksR0FBRyxDQUFDO0lBQzdCLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxZQUFnQixTQUFRLFFBQVc7SUFHL0MsWUFBWSxZQUFlLEVBQUUsYUFBK0I7UUFDM0QsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ3BCLElBQUksQ0FBQyxhQUFhLEdBQUcsYUFBYSxDQUFDO0lBQ3BDLENBQUM7SUFFUyxNQUFNLENBQUMsS0FBYztRQUM5QixPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLEtBQVUsQ0FBQyxDQUFDO0lBQ2hELENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxjQUFpQyxTQUFRLFFBQVc7SUFFaEUsWUFBWSxZQUFlLEVBQW1CLFFBQTZDO1FBQzFGLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUR5QixhQUFRLEdBQVIsUUFBUSxDQUFxQztJQUUzRixDQUFDO0lBRVEsTUFBTSxDQUFDLEtBQWM7UUFDN0IsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN6QixPQUFPLElBQUksQ0FBQyxZQUFZLENBQUM7UUFDMUIsQ0FBQztRQUNELE9BQU8sWUFBWSxDQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDOUMsQ0FBQztJQUVTLE1BQU0sQ0FBQyxLQUFjO1FBQzlCLE9BQU8sUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3hCLENBQUM7Q0FDRDtBQUVELE1BQU0sVUFBVSxZQUFZLENBQW1CLFNBQThDLEVBQUUsS0FBYTtJQUMzRyxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBRW5DLEtBQUssTUFBTSxHQUFHLElBQUksU0FBUyxFQUFFLENBQUM7UUFDN0IsSUFBSSxNQUFNLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNoRCxNQUFNLFFBQVEsR0FBRyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDaEMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUUsS0FBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDcEQsQ0FBQztJQUNGLENBQUM7SUFFRCxPQUFPLE1BQU0sQ0FBQztBQUNmLENBQUMifQ==