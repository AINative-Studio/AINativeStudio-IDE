/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { assertType } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { ITextModelService } from '../../../common/services/resolverService.js';
import { IOutlineModelService } from './outlineModel.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
CommandsRegistry.registerCommand('_executeDocumentSymbolProvider', async function (accessor, ...args) {
    const [resource] = args;
    assertType(URI.isUri(resource));
    const outlineService = accessor.get(IOutlineModelService);
    const modelService = accessor.get(ITextModelService);
    const reference = await modelService.createModelReference(resource);
    try {
        return (await outlineService.getOrCreate(reference.object.textEditorModel, CancellationToken.None)).getTopLevelSymbols();
    }
    finally {
        reference.dispose();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9jdW1lbnRTeW1ib2xzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2RvY3VtZW50U3ltYm9scy9icm93c2VyL2RvY3VtZW50U3ltYm9scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDOUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQ3pELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRXBGLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxnQ0FBZ0MsRUFBRSxLQUFLLFdBQVcsUUFBUSxFQUFFLEdBQUcsSUFBSTtJQUNuRyxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQ3hCLFVBQVUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFFaEMsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0lBQzFELE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUVyRCxNQUFNLFNBQVMsR0FBRyxNQUFNLFlBQVksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNwRSxJQUFJLENBQUM7UUFDSixPQUFPLENBQUMsTUFBTSxjQUFjLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsZUFBZSxFQUFFLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztJQUMxSCxDQUFDO1lBQVMsQ0FBQztRQUNWLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNyQixDQUFDO0FBQ0YsQ0FBQyxDQUFDLENBQUMifQ==