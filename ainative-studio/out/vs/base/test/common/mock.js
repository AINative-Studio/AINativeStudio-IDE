/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { stub } from 'sinon';
export function mock() {
    return function () { };
}
// Creates an object object that returns sinon mocks for every property. Optionally
// takes base properties.
export const mockObject = () => (properties) => {
    return new Proxy({ ...properties }, {
        get(target, key) {
            if (!target.hasOwnProperty(key)) {
                target[key] = stub();
            }
            return target[key];
        },
        set(target, key, value) {
            target[key] = value;
            return true;
        },
    });
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9jay5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9jb21tb24vbW9jay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQWEsSUFBSSxFQUFFLE1BQU0sT0FBTyxDQUFDO0FBTXhDLE1BQU0sVUFBVSxJQUFJO0lBQ25CLE9BQU8sY0FBYyxDQUFRLENBQUM7QUFDL0IsQ0FBQztBQUlELG1GQUFtRjtBQUNuRix5QkFBeUI7QUFDekIsTUFBTSxDQUFDLE1BQU0sVUFBVSxHQUFHLEdBQXFCLEVBQUUsQ0FBQyxDQUE2QixVQUFlLEVBQTJCLEVBQUU7SUFDMUgsT0FBTyxJQUFJLEtBQUssQ0FBQyxFQUFFLEdBQUcsVUFBVSxFQUFTLEVBQUU7UUFDMUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxHQUFHO1lBQ2QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDakMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDO1lBQ3RCLENBQUM7WUFFRCxPQUFPLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNwQixDQUFDO1FBQ0QsR0FBRyxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsS0FBSztZQUNyQixNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsS0FBSyxDQUFDO1lBQ3BCLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztLQUNELENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyJ9