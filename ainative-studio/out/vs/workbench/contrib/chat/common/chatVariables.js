/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const isIChatRequestProblemsVariable = (obj) => typeof obj === 'object' && obj !== null && 'id' in obj && obj.id === 'vscode.problems';
export const IChatVariablesService = createDecorator('IChatVariablesService');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFZhcmlhYmxlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9jaGF0VmFyaWFibGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBT2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQXFCN0YsTUFBTSxDQUFDLE1BQU0sOEJBQThCLEdBQUcsQ0FBQyxHQUFZLEVBQXVDLEVBQUUsQ0FDbkcsT0FBTyxHQUFHLEtBQUssUUFBUSxJQUFJLEdBQUcsS0FBSyxJQUFJLElBQUksSUFBSSxJQUFJLEdBQUcsSUFBSyxHQUFvQyxDQUFDLEVBQUUsS0FBSyxpQkFBaUIsQ0FBQztBQVkxSCxNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRyxlQUFlLENBQXdCLHVCQUF1QixDQUFDLENBQUMifQ==