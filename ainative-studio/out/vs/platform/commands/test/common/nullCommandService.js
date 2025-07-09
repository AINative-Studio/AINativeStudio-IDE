/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../base/common/lifecycle.js';
export const NullCommandService = {
    _serviceBrand: undefined,
    onWillExecuteCommand: () => Disposable.None,
    onDidExecuteCommand: () => Disposable.None,
    executeCommand() {
        return Promise.resolve(undefined);
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibnVsbENvbW1hbmRTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2NvbW1hbmRzL3Rlc3QvY29tbW9uL251bGxDb21tYW5kU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFHbEUsTUFBTSxDQUFDLE1BQU0sa0JBQWtCLEdBQW9CO0lBQ2xELGFBQWEsRUFBRSxTQUFTO0lBQ3hCLG9CQUFvQixFQUFFLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJO0lBQzNDLG1CQUFtQixFQUFFLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJO0lBQzFDLGNBQWM7UUFDYixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDbkMsQ0FBQztDQUNELENBQUMifQ==