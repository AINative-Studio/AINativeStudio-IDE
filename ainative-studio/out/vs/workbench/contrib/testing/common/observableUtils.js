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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JzZXJ2YWJsZVV0aWxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL2NvbW1vbi9vYnNlcnZhYmxlVXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFLaEcsTUFBTSxVQUFVLGtCQUFrQixDQUFJLFVBQTZDLEVBQUUsUUFBNEI7SUFDaEgsTUFBTSxDQUFDLEdBQWM7UUFDcEIsV0FBVyxLQUFLLENBQUM7UUFDakIsU0FBUyxLQUFLLENBQUM7UUFDZixvQkFBb0IsQ0FBQyxVQUFVO1lBQzlCLFVBQVUsQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUM1QixDQUFDO1FBQ0QsWUFBWSxDQUFjLFdBQStDLEVBQUUsTUFBZTtZQUN6RixRQUFRLENBQUMsTUFBa0IsQ0FBQyxDQUFDO1FBQzlCLENBQUM7S0FDRCxDQUFDO0lBRUYsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMxQixPQUFPO1FBQ04sT0FBTztZQUNOLFVBQVUsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDOUIsQ0FBQztLQUNELENBQUM7QUFDSCxDQUFDIn0=