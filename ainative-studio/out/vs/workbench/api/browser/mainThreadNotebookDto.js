/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CellExecutionUpdateType } from '../../contrib/notebook/common/notebookExecutionService.js';
export var NotebookDto;
(function (NotebookDto) {
    function toNotebookOutputItemDto(item) {
        return {
            mime: item.mime,
            valueBytes: item.data
        };
    }
    NotebookDto.toNotebookOutputItemDto = toNotebookOutputItemDto;
    function toNotebookOutputDto(output) {
        return {
            outputId: output.outputId,
            metadata: output.metadata,
            items: output.outputs.map(toNotebookOutputItemDto)
        };
    }
    NotebookDto.toNotebookOutputDto = toNotebookOutputDto;
    function toNotebookCellDataDto(cell) {
        return {
            cellKind: cell.cellKind,
            language: cell.language,
            mime: cell.mime,
            source: cell.source,
            internalMetadata: cell.internalMetadata,
            metadata: cell.metadata,
            outputs: cell.outputs.map(toNotebookOutputDto)
        };
    }
    NotebookDto.toNotebookCellDataDto = toNotebookCellDataDto;
    function toNotebookDataDto(data) {
        return {
            metadata: data.metadata,
            cells: data.cells.map(toNotebookCellDataDto)
        };
    }
    NotebookDto.toNotebookDataDto = toNotebookDataDto;
    function fromNotebookOutputItemDto(item) {
        return {
            mime: item.mime,
            data: item.valueBytes
        };
    }
    NotebookDto.fromNotebookOutputItemDto = fromNotebookOutputItemDto;
    function fromNotebookOutputDto(output) {
        return {
            outputId: output.outputId,
            metadata: output.metadata,
            outputs: output.items.map(fromNotebookOutputItemDto)
        };
    }
    NotebookDto.fromNotebookOutputDto = fromNotebookOutputDto;
    function fromNotebookCellDataDto(cell) {
        return {
            cellKind: cell.cellKind,
            language: cell.language,
            mime: cell.mime,
            source: cell.source,
            outputs: cell.outputs.map(fromNotebookOutputDto),
            metadata: cell.metadata,
            internalMetadata: cell.internalMetadata
        };
    }
    NotebookDto.fromNotebookCellDataDto = fromNotebookCellDataDto;
    function fromNotebookDataDto(data) {
        return {
            metadata: data.metadata,
            cells: data.cells.map(fromNotebookCellDataDto)
        };
    }
    NotebookDto.fromNotebookDataDto = fromNotebookDataDto;
    function toNotebookCellDto(cell) {
        return {
            handle: cell.handle,
            uri: cell.uri,
            source: cell.textBuffer.getLinesContent(),
            eol: cell.textBuffer.getEOL(),
            language: cell.language,
            cellKind: cell.cellKind,
            outputs: cell.outputs.map(toNotebookOutputDto),
            metadata: cell.metadata,
            internalMetadata: cell.internalMetadata,
        };
    }
    NotebookDto.toNotebookCellDto = toNotebookCellDto;
    function fromCellExecuteUpdateDto(data) {
        if (data.editType === CellExecutionUpdateType.Output) {
            return {
                editType: data.editType,
                cellHandle: data.cellHandle,
                append: data.append,
                outputs: data.outputs.map(fromNotebookOutputDto)
            };
        }
        else if (data.editType === CellExecutionUpdateType.OutputItems) {
            return {
                editType: data.editType,
                append: data.append,
                outputId: data.outputId,
                items: data.items.map(fromNotebookOutputItemDto)
            };
        }
        else {
            return data;
        }
    }
    NotebookDto.fromCellExecuteUpdateDto = fromCellExecuteUpdateDto;
    function fromCellExecuteCompleteDto(data) {
        return data;
    }
    NotebookDto.fromCellExecuteCompleteDto = fromCellExecuteCompleteDto;
    function fromCellEditOperationDto(edit) {
        if (edit.editType === 1 /* notebookCommon.CellEditType.Replace */) {
            return {
                editType: edit.editType,
                index: edit.index,
                count: edit.count,
                cells: edit.cells.map(fromNotebookCellDataDto)
            };
        }
        else {
            return edit;
        }
    }
    NotebookDto.fromCellEditOperationDto = fromCellEditOperationDto;
})(NotebookDto || (NotebookDto = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZE5vdGVib29rRHRvLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkTm90ZWJvb2tEdG8udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFHcEcsTUFBTSxLQUFXLFdBQVcsQ0F3SDNCO0FBeEhELFdBQWlCLFdBQVc7SUFFM0IsU0FBZ0IsdUJBQXVCLENBQUMsSUFBbUM7UUFDMUUsT0FBTztZQUNOLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtZQUNmLFVBQVUsRUFBRSxJQUFJLENBQUMsSUFBSTtTQUNyQixDQUFDO0lBQ0gsQ0FBQztJQUxlLG1DQUF1QiwwQkFLdEMsQ0FBQTtJQUVELFNBQWdCLG1CQUFtQixDQUFDLE1BQWlDO1FBQ3BFLE9BQU87WUFDTixRQUFRLEVBQUUsTUFBTSxDQUFDLFFBQVE7WUFDekIsUUFBUSxFQUFFLE1BQU0sQ0FBQyxRQUFRO1lBQ3pCLEtBQUssRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQztTQUNsRCxDQUFDO0lBQ0gsQ0FBQztJQU5lLCtCQUFtQixzQkFNbEMsQ0FBQTtJQUVELFNBQWdCLHFCQUFxQixDQUFDLElBQThCO1FBQ25FLE9BQU87WUFDTixRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7WUFDdkIsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRO1lBQ3ZCLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtZQUNmLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTTtZQUNuQixnQkFBZ0IsRUFBRSxJQUFJLENBQUMsZ0JBQWdCO1lBQ3ZDLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUTtZQUN2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