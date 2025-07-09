/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable, DisposableStore, toDisposable } from '../../../../../../base/common/lifecycle.js';
import { NotebookOverviewRulerLane } from '../../notebookBrowser.js';
import { overviewRulerAddedForeground } from '../../../../scm/common/quickDiff.js';
export class NotebookInsertedCellDecorator extends Disposable {
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
        const cells = diffInfo.filter(diff => diff.type === 'insert').map((diff) => model.cells[diff.modifiedCellIndex]);
        const ids = this.notebookEditor.deltaCellDecorations([], cells.map(cell => ({
            handle: cell.handle,
            options: {
                className: 'nb-insertHighlight', outputClassName: 'nb-insertHighlight', overviewRuler: {
                    color: overviewRulerAddedForeground,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tJbnNlcnRlZENlbGxEZWNvcmF0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9kaWZmL2lubGluZURpZmYvbm90ZWJvb2tJbnNlcnRlZENlbGxEZWNvcmF0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFFdkcsT0FBTyxFQUFtQix5QkFBeUIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3RGLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRW5GLE1BQU0sT0FBTyw2QkFBOEIsU0FBUSxVQUFVO0lBRTVELFlBQ2tCLGNBQStCO1FBRWhELEtBQUssRUFBRSxDQUFDO1FBRlMsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBRmhDLGVBQVUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksZUFBZSxFQUFFLENBQUMsQ0FBQztJQU1wRSxDQUFDO0lBQ00sS0FBSyxDQUFDLFFBQXdCO1FBQ3BDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDO1FBQzVDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNaLE9BQU87UUFDUixDQUFDO1FBQ0QsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssUUFBUSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUM7UUFDakgsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDM0UsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNO1lBQ25CLE9BQU8sRUFBRTtnQkFDUixTQUFTLEVBQUUsb0JBQW9CLEVBQUUsZUFBZSxFQUFFLG9CQUFvQixFQUFFLGFBQWEsRUFBRTtvQkFDdEYsS0FBSyxFQUFFLDRCQUE0QjtvQkFDbkMsV0FBVyxFQUFFLEVBQUU7b0JBQ2YsYUFBYSxFQUFFLElBQUk7b0JBQ25CLFFBQVEsRUFBRSx5QkFBeUIsQ0FBQyxJQUFJO2lCQUN4QzthQUNEO1NBQ0QsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNMLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNiLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUU7WUFDckMsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQ3JDLElBQUksQ0FBQyxjQUFjLENBQUMsb0JBQW9CLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ25ELENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUNNLEtBQUs7UUFDWCxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3pCLENBQUM7Q0FDRCJ9