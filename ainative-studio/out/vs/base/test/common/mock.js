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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9jay5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvY29tbW9uL21vY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFhLElBQUksRUFBRSxNQUFNLE9BQU8sQ0FBQztBQU14QyxNQUFNLFVBQVUsSUFBSTtJQUNuQixPQUFPLGNBQWMsQ0FBUSxDQUFDO0FBQy9CLENBQUM7QUFJRCxtRkFBbUY7QUFDbkYseUJBQXlCO0FBQ3pCLE1BQU0sQ0FBQyxNQUFNLFVBQVUsR0FBRyxHQUFxQixFQUFFLENBQUMsQ0FBNkIsVUFBZSxFQUEyQixFQUFFO0lBQzFILE9BQU8sSUFBSSxLQUFLLENBQUMsRUFBRSxHQUFHLFVBQVUsRUFBUyxFQUFFO1FBQzFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsR0FBRztZQUNkLElBQUksQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ2pDLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLEVBQUUsQ0FBQztZQUN0QixDQUFDO1lBRUQsT0FBTyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDcEIsQ0FBQztRQUNELEdBQUcsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLEtBQUs7WUFDckIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEtBQUssQ0FBQztZQUNwQixPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7S0FDRCxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMifQ==