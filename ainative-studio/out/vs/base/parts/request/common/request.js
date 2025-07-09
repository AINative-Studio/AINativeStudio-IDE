/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const offlineName = 'Offline';
/**
 * Checks if the given error is offline error
 */
export function isOfflineError(error) {
    if (error instanceof OfflineError) {
        return true;
    }
    return error instanceof Error && error.name === offlineName && error.message === offlineName;
}
export class OfflineError extends Error {
    constructor() {
        super(offlineName);
        this.name = this.message;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVxdWVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3BhcnRzL3JlcXVlc3QvY29tbW9uL3JlcXVlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsTUFBTSxXQUFXLEdBQUcsU0FBUyxDQUFDO0FBRTlCOztHQUVHO0FBQ0gsTUFBTSxVQUFVLGNBQWMsQ0FBQyxLQUFVO0lBQ3hDLElBQUksS0FBSyxZQUFZLFlBQVksRUFBRSxDQUFDO1FBQ25DLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUNELE9BQU8sS0FBSyxZQUFZLEtBQUssSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLFdBQVcsSUFBSSxLQUFLLENBQUMsT0FBTyxLQUFLLFdBQVcsQ0FBQztBQUM5RixDQUFDO0FBRUQsTUFBTSxPQUFPLFlBQWEsU0FBUSxLQUFLO0lBQ3RDO1FBQ0MsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ25CLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQztJQUMxQixDQUFDO0NBQ0QifQ==