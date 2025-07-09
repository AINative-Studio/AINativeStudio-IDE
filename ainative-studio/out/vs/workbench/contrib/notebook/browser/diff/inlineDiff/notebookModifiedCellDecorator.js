/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable, DisposableStore, toDisposable } from '../../../../../../base/common/lifecycle.js';
import { NotebookOverviewRulerLane } from '../../notebookBrowser.js';
import { overviewRulerModifiedForeground } from '../../../../scm/common/quickDiff.js';
export class NotebookModifiedCellDecorator extends Disposable {
    constructor(notebookEditor) {
        super();
        this.notebookEditor = notebookEditor;
        this.decorators = this._register(new DisposableStore());
    }
    apply(diffInfo) {
        const model = this.notebookEditor.textModel;
        if (!model) {
            return;
        }
        const modifiedCells = [];
        for (const diff of diffInfo) {
            if (diff.type === 'modified') {
                const cell = model.cells[diff.modifiedCellIndex];
                modifiedCells.push(cell);
            }
        }
        const ids = this.notebookEditor.deltaCellDecorations([], modifiedCells.map(cell => ({
            handle: cell.handle,
            options: {
                overviewRuler: {
                    color: overviewRulerModifiedForeground,
                    modelRanges: [],
                    includeOutput: true,
                    position: NotebookOverviewRulerLane.Full
                }
            }
        })));
        this.clear();
        this.decorators.add(toDisposable(() => {
            if (!this.notebookEditor.isDisposed) {
                this.notebookEditor.deltaCellDecorations(ids, []);
            }
        }));
    }
    clear() {
        this.decorators.clear();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tNb2RpZmllZENlbGxEZWNvcmF0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9kaWZmL2lubGluZURpZmYvbm90ZWJvb2tNb2RpZmllZENlbGxEZWNvcmF0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFFdkcsT0FBTyxFQUFtQix5QkFBeUIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBRXRGLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRXRGLE1BQU0sT0FBTyw2QkFBOEIsU0FBUSxVQUFVO0lBRTVELFlBQ2tCLGNBQStCO1FBRWhELEtBQUssRUFBRSxDQUFDO1FBRlMsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBRmhDLGVBQVUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksZUFBZSxFQUFFLENBQUMsQ0FBQztJQUtwRSxDQUFDO0lBRU0sS0FBSyxDQUFDLFFBQXdCO1FBQ3BDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDO1FBQzVDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNaLE9BQU87UUFDUixDQUFDO1FBRUQsTUFBTSxhQUFhLEdBQTRCLEVBQUUsQ0FBQztRQUNsRCxLQUFLLE1BQU0sSUFBSSxJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQzdCLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxVQUFVLEVBQUUsQ0FBQztnQkFDOUIsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQztnQkFDakQsYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMxQixDQUFDO1FBQ0YsQ0FBQztRQUVELE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsb0JBQW9CLENBQUMsRUFBRSxFQUFFLGFBQWEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ25GLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTTtZQUNuQixPQUFPLEVBQUU7Z0JBQ1IsYUFBYSxFQUFFO29CQUNkLEtBQUssRUFBRSwrQkFBK0I7b0JBQ3RDLFdBQVcsRUFBRSxFQUFFO29CQUNmLGFBQWEsRUFBRSxJQUFJO29CQUNuQixRQUFRLEVBQUUseUJBQXlCLENBQUMsSUFBSTtpQkFDeEM7YUFDRDtTQUNELENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFTCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDYixJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFO1lBQ3JDLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUNyQyxJQUFJLENBQUMsY0FBYyxDQUFDLG9CQUFvQixDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUNuRCxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFDTSxLQUFLO1FBQ1gsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUN6QixDQUFDO0NBQ0QifQ==