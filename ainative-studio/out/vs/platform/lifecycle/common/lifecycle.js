/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isThenable, Promises } from '../../../base/common/async.js';
// Shared veto handling across main and renderer
export function handleVetos(vetos, onError) {
    if (vetos.length === 0) {
        return Promise.resolve(false);
    }
    const promises = [];
    let lazyValue = false;
    for (const valueOrPromise of vetos) {
        // veto, done
        if (valueOrPromise === true) {
            return Promise.resolve(true);
        }
        if (isThenable(valueOrPromise)) {
            promises.push(valueOrPromise.then(value => {
                if (value) {
                    lazyValue = true; // veto, done
                }
            }, err => {
                onError(err); // error, treated like a veto, done
                lazyValue = true;
            }));
        }
    }
    return Promises.settled(promises).then(() => lazyValue);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlmZWN5Y2xlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2xpZmVjeWNsZS9jb21tb24vbGlmZWN5Y2xlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFckUsZ0RBQWdEO0FBQ2hELE1BQU0sVUFBVSxXQUFXLENBQUMsS0FBcUMsRUFBRSxPQUErQjtJQUNqRyxJQUFJLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDeEIsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQy9CLENBQUM7SUFFRCxNQUFNLFFBQVEsR0FBb0IsRUFBRSxDQUFDO0lBQ3JDLElBQUksU0FBUyxHQUFHLEtBQUssQ0FBQztJQUV0QixLQUFLLE1BQU0sY0FBYyxJQUFJLEtBQUssRUFBRSxDQUFDO1FBRXBDLGFBQWE7UUFDYixJQUFJLGNBQWMsS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUM3QixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDOUIsQ0FBQztRQUVELElBQUksVUFBVSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUM7WUFDaEMsUUFBUSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFO2dCQUN6QyxJQUFJLEtBQUssRUFBRSxDQUFDO29CQUNYLFNBQVMsR0FBRyxJQUFJLENBQUMsQ0FBQyxhQUFhO2dCQUNoQyxDQUFDO1lBQ0YsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFO2dCQUNSLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLG1DQUFtQztnQkFDakQsU0FBUyxHQUFHLElBQUksQ0FBQztZQUNsQixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztJQUNGLENBQUM7SUFFRCxPQUFPLFFBQVEsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ3pELENBQUMifQ==