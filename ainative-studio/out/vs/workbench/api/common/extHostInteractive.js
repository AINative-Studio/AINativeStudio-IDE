/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../base/common/uri.js';
import { ApiCommand, ApiCommandArgument, ApiCommandResult } from './extHostCommands.js';
export class ExtHostInteractive {
    constructor(mainContext, _extHostNotebooks, _textDocumentsAndEditors, _commands, _logService) {
        this._extHostNotebooks = _extHostNotebooks;
        this._textDocumentsAndEditors = _textDocumentsAndEditors;
        this._commands = _commands;
        const openApiCommand = new ApiCommand('interactive.open', '_interactive.open', 'Open interactive window and return notebook editor and input URI', [
            new ApiCommandArgument('showOptions', 'Show Options', v => true, v => v),
            new ApiCommandArgument('resource', 'Interactive resource Uri', v => true, v => v),
            new ApiCommandArgument('controllerId', 'Notebook controller Id', v => true, v => v),
            new ApiCommandArgument('title', 'Interactive editor title', v => true, v => v)
        ], new ApiCommandResult('Notebook and input URI', (v) => {
            _logService.debug('[ExtHostInteractive] open iw with notebook editor id', v.notebookEditorId);
            if (v.notebookEditorId !== undefined) {
                const editor = this._extHostNotebooks.getEditorById(v.notebookEditorId);
                _logService.debug('[ExtHostInteractive] notebook editor found', editor.id);
                return { notebookUri: URI.revive(v.notebookUri), inputUri: URI.revive(v.inputUri), notebookEditor: editor.apiEditor };
            }
            _logService.debug('[ExtHostInteractive] notebook editor not found, uris for the interactive document', v.notebookUri, v.inputUri);
            return { notebookUri: URI.revive(v.notebookUri), inputUri: URI.revive(v.inputUri) };
        }));
        this._commands.registerApiCommand(openApiCommand);
    }
    $willAddInteractiveDocument(uri, eol, languageId, notebookUri) {
        this._textDocumentsAndEditors.acceptDocumentsAndEditorsDelta({
            addedDocuments: [{
                    EOL: eol,
                    lines: [''],
                    languageId: languageId,
                    uri: uri,
                    isDirty: false,
                    versionId: 1,
                    encoding: 'utf8'
                }]
        });
    }
    $willRemoveInteractiveDocument(uri, notebookUri) {
        this._textDocumentsAndEditors.acceptDocumentsAndEditorsDelta({
            removedDocuments: [uri]
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEludGVyYWN0aXZlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RJbnRlcmFjdGl2ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFDO0FBR2pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsa0JBQWtCLEVBQUUsZ0JBQWdCLEVBQW1CLE1BQU0sc0JBQXNCLENBQUM7QUFLekcsTUFBTSxPQUFPLGtCQUFrQjtJQUM5QixZQUNDLFdBQXlCLEVBQ2pCLGlCQUE0QyxFQUM1Qyx3QkFBb0QsRUFDcEQsU0FBMEIsRUFDbEMsV0FBd0I7UUFIaEIsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUEyQjtRQUM1Qyw2QkFBd0IsR0FBeEIsd0JBQXdCLENBQTRCO1FBQ3BELGNBQVMsR0FBVCxTQUFTLENBQWlCO1FBR2xDLE1BQU0sY0FBYyxHQUFHLElBQUksVUFBVSxDQUNwQyxrQkFBa0IsRUFDbEIsbUJBQW1CLEVBQ25CLGtFQUFrRSxFQUNsRTtZQUNDLElBQUksa0JBQWtCLENBQUMsYUFBYSxFQUFFLGNBQWMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUN4RSxJQUFJLGtCQUFrQixDQUFDLFVBQVUsRUFBRSwwQkFBMEIsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNqRixJQUFJLGtCQUFrQixDQUFDLGNBQWMsRUFBRSx3QkFBd0IsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNuRixJQUFJLGtCQUFrQixDQUFDLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztTQUM5RSxFQUNELElBQUksZ0JBQWdCLENBQTJKLHdCQUF3QixFQUFFLENBQUMsQ0FBcUYsRUFBRSxFQUFFO1lBQ2xTLFdBQVcsQ0FBQyxLQUFLLENBQUMsc0RBQXNELEVBQUUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFDOUYsSUFBSSxDQUFDLENBQUMsZ0JBQWdCLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQ3RDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUM7Z0JBQ3hFLFdBQVcsQ0FBQyxLQUFLLENBQUMsNENBQTRDLEVBQUUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUMzRSxPQUFPLEVBQUUsV0FBVyxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxjQUFjLEVBQUUsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3ZILENBQUM7WUFDRCxXQUFXLENBQUMsS0FBSyxDQUFDLG1GQUFtRixFQUFFLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ2xJLE9BQU8sRUFBRSxXQUFXLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7UUFDckYsQ0FBQyxDQUFDLENBQ0YsQ0FBQztRQUNGLElBQUksQ0FBQyxTQUFTLENBQUMsa0JBQWtCLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDbkQsQ0FBQztJQUVELDJCQUEyQixDQUFDLEdBQWtCLEVBQUUsR0FBVyxFQUFFLFVBQWtCLEVBQUUsV0FBMEI7UUFDMUcsSUFBSSxDQUFDLHdCQUF3QixDQUFDLDhCQUE4QixDQUFDO1lBQzVELGNBQWMsRUFBRSxDQUFDO29CQUNoQixHQUFHLEVBQUUsR0FBRztvQkFDUixLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUM7b0JBQ1gsVUFBVSxFQUFFLFVBQVU7b0JBQ3RCLEdBQUcsRUFBRSxHQUFHO29CQUNSLE9BQU8sRUFBRSxLQUFLO29CQUNkLFNBQVMsRUFBRSxDQUFDO29CQUNaLFFBQVEsRUFBRSxNQUFNO2lCQUNoQixDQUFDO1NBQ0YsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELDhCQUE4QixDQUFDLEdBQWtCLEVBQUUsV0FBMEI7UUFDNUUsSUFBSSxDQUFDLHdCQUF3QixDQUFDLDhCQUE4QixDQUFDO1lBQzVELGdCQUFnQixFQUFFLENBQUMsR0FBRyxDQUFDO1NBQ3ZCLENBQUMsQ0FBQztJQUNKLENBQUM7Q0FDRCJ9