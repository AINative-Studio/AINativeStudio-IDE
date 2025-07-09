/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export function onObservableChange(observable, callback) {
    const o = {
        beginUpdate() { },
        endUpdate() { },
        handlePossibleChange(observable) {
            observable.reportChanges();
        },
        handleChange(_observable, change) {
            callback(change);
        }
    };
    observable.addObserver(o);
    return {
        dispose() {
            observable.removeObserver(o);
        }
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JzZXJ2YWJsZVV0aWxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvY29tbW9uL29ic2VydmFibGVVdGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUtoRyxNQUFNLFVBQVUsa0JBQWtCLENBQUksVUFBNkMsRUFBRSxRQUE0QjtJQUNoSCxNQUFNLENBQUMsR0FBYztRQUNwQixXQUFXLEtBQUssQ0FBQztRQUNqQixTQUFTLEtBQUssQ0FBQztRQUNmLG9CQUFvQixDQUFDLFVBQVU7WUFDOUIsVUFBVSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQzVCLENBQUM7UUFDRCxZQUFZLENBQWMsV0FBK0MsRUFBRSxNQUFlO1lBQ3pGLFFBQVEsQ0FBQyxNQUFrQixDQUFDLENBQUM7UUFDOUIsQ0FBQztLQUNELENBQUM7SUFFRixVQUFVLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzFCLE9BQU87UUFDTixPQUFPO1lBQ04sVUFBVSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM5QixDQUFDO0tBQ0QsQ0FBQztBQUNILENBQUMifQ==