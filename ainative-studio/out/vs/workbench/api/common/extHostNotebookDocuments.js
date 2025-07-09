/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../base/common/event.js';
import { URI } from '../../../base/common/uri.js';
export class ExtHostNotebookDocuments {
    constructor(_notebooksAndEditors) {
        this._notebooksAndEditors = _notebooksAndEditors;
        this._onDidSaveNotebookDocument = new Emitter();
        this.onDidSaveNotebookDocument = this._onDidSaveNotebookDocument.event;
        this._onDidChangeNotebookDocument = new Emitter();
        this.onDidChangeNotebookDocument = this._onDidChangeNotebookDocument.event;
    }
    $acceptModelChanged(uri, event, isDirty, newMetadata) {
        const document = this._notebooksAndEditors.getNotebookDocument(URI.revive(uri));
        const e = document.acceptModelChanged(event.value, isDirty, newMetadata);
        this._onDidChangeNotebookDocument.fire(e);
    }
    $acceptDirtyStateChanged(uri, isDirty) {
        const document = this._notebooksAndEditors.getNotebookDocument(URI.revive(uri));
        document.acceptDirty(isDirty);
    }
    $acceptModelSaved(uri) {
        const document = this._notebooksAndEditors.getNotebookDocument(URI.revive(uri));
        this._onDidSaveNotebookDocument.fire(document.apiNotebook);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdE5vdGVib29rRG9jdW1lbnRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3ROb3RlYm9va0RvY3VtZW50cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDeEQsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQztBQU9qRSxNQUFNLE9BQU8sd0JBQXdCO0lBUXBDLFlBQ2tCLG9CQUErQztRQUEvQyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQTJCO1FBUGhELCtCQUEwQixHQUFHLElBQUksT0FBTyxFQUEyQixDQUFDO1FBQzVFLDhCQUF5QixHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxLQUFLLENBQUM7UUFFMUQsaUNBQTRCLEdBQUcsSUFBSSxPQUFPLEVBQXNDLENBQUM7UUFDekYsZ0NBQTJCLEdBQUcsSUFBSSxDQUFDLDRCQUE0QixDQUFDLEtBQUssQ0FBQztJQUkzRSxDQUFDO0lBRUwsbUJBQW1CLENBQUMsR0FBa0IsRUFBRSxLQUFrRixFQUFFLE9BQWdCLEVBQUUsV0FBc0M7UUFDbkwsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNoRixNQUFNLENBQUMsR0FBRyxRQUFRLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDekUsSUFBSSxDQUFDLDRCQUE0QixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMzQyxDQUFDO0lBRUQsd0JBQXdCLENBQUMsR0FBa0IsRUFBRSxPQUFnQjtRQUM1RCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ2hGLFFBQVEsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDL0IsQ0FBQztJQUVELGlCQUFpQixDQUFDLEdBQWtCO1FBQ25DLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDaEYsSUFBSSxDQUFDLDBCQUEwQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDNUQsQ0FBQztDQUNEIn0=