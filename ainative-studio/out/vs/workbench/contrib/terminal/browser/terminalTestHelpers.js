/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { timeout } from '../../../../base/common/async.js';
export async function writeP(terminal, data) {
    return new Promise((resolve, reject) => {
        const failTimeout = timeout(2000);
        failTimeout.then(() => reject('Writing to xterm is taking longer than 2 seconds'));
        terminal.write(data, () => {
            failTimeout.cancel();
            resolve();
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxUZXN0SGVscGVycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC9icm93c2VyL3Rlcm1pbmFsVGVzdEhlbHBlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRzNELE1BQU0sQ0FBQyxLQUFLLFVBQVUsTUFBTSxDQUFDLFFBQWtCLEVBQUUsSUFBWTtJQUM1RCxPQUFPLElBQUksT0FBTyxDQUFPLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1FBQzVDLE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNsQyxXQUFXLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxrREFBa0QsQ0FBQyxDQUFDLENBQUM7UUFDbkYsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFO1lBQ3pCLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNyQixPQUFPLEVBQUUsQ0FBQztRQUNYLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDIn0=