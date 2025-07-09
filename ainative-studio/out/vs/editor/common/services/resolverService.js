/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
export const ITextModelService = createDecorator('textModelService');
export function isResolvedTextEditorModel(model) {
    const candidate = model;
    return !!candidate.textEditorModel;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzb2x2ZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vc2VydmljZXMvcmVzb2x2ZXJTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBUWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUUxRixNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBRyxlQUFlLENBQW9CLGtCQUFrQixDQUFDLENBQUM7QUF3RXhGLE1BQU0sVUFBVSx5QkFBeUIsQ0FBQyxLQUF1QjtJQUNoRSxNQUFNLFNBQVMsR0FBRyxLQUFpQyxDQUFDO0lBRXBELE9BQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUM7QUFDcEMsQ0FBQyJ9