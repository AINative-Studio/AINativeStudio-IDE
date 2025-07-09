/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { Range } from '../../../common/core/range.js';
import { InlineDecoration } from '../../../common/viewModel.js';
import { testViewModel } from './testViewModel.js';
suite('ViewModelDecorations', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('getDecorationsViewportData', () => {
        const text = [
            'hello world, this is a buffer that will be wrapped'
        ];
        const opts = {
            wordWrap: 'wordWrapColumn',
            wordWrapColumn: 13
        };
        testViewModel(text, opts, (viewModel, model) => {
            assert.strictEqual(viewModel.getLineContent(1), 'hello world, ');
            assert.strictEqual(viewModel.getLineContent(2), 'this is a ');
            assert.strictEqual(viewModel.getLineContent(3), 'buffer that ');
            assert.strictEqual(viewModel.getLineContent(4), 'will be ');
            assert.strictEqual(viewModel.getLineContent(5), 'wrapped');
            model.changeDecorations((accessor) => {
                const createOpts = (id) => {
                    return {
                        description: 'test',
                        className: id,
                        inlineClassName: 'i-' + id,
                        beforeContentClassName: 'b-' + id,
                        afterContentClassName: 'a-' + id
                    };
                };
                // VIEWPORT will be (1,14) -> (1,36)
                // completely before viewport
                accessor.addDecoration(new Range(1, 2, 1, 3), createOpts('dec1'));
                // starts before viewport, ends at viewport start
                accessor.addDecoration(new Range(1, 2, 1, 14), createOpts('dec2'));
                // starts before viewport, ends inside viewport
                accessor.addDecoration(new Range(1, 2, 1, 15), createOpts('dec3'));
                // starts before viewport, ends at viewport end
                accessor.addDecoration(new Range(1, 2, 1, 36), createOpts('dec4'));
                // starts before viewport, ends after viewport
                accessor.addDecoration(new Range(1, 2, 1, 51), createOpts('dec5'));
                // starts at viewport start, ends at viewport start (will not be visible on view line 2)
                accessor.addDecoration(new Range(1, 14, 1, 14), createOpts('dec6'));
                // starts at viewport start, ends inside viewport
                accessor.addDecoration(new Range(1, 14, 1, 16), createOpts('dec7'));
                // starts at viewport start, ends at viewport end
                accessor.addDecoration(new Range(1, 14, 1, 36), createOpts('dec8'));
                // starts at viewport start, ends after viewport
                accessor.addDecoration(new Range(1, 14, 1, 51), createOpts('dec9'));
                // starts inside viewport, ends inside viewport
                accessor.addDecoration(new Range(1, 16, 1, 18), createOpts('dec10'));
                // starts inside viewport, ends at viewport end
                accessor.addDecoration(new Range(1, 16, 1, 36), createOpts('dec11'));
                // starts inside viewport, ends after viewport
                accessor.addDecoration(new Range(1, 16, 1, 51), createOpts('dec12'));
                // starts at viewport end, ends at viewport end
                accessor.addDecoration(new Range(1, 36, 1, 36), createOpts('dec13'));
                // starts at viewport end, ends after viewport
                accessor.addDecoration(new Range(1, 36, 1, 51), createOpts('dec14'));
                // starts after viewport, ends after viewport
                accessor.addDecoration(new Range(1, 40, 1, 51), createOpts('dec15'));
            });
            const actualDecorations = viewModel.getDecorationsInViewport(new Range(2, viewModel.getLineMinColumn(2), 3, viewModel.getLineMaxColumn(3))).map((dec) => {
                return dec.options.className;
            }).filter(Boolean);
            assert.deepStrictEqual(actualDecorations, [
                'dec1',
                'dec2',
                'dec3',
                'dec4',
                'dec5',
                'dec6',
                'dec7',
                'dec8',
                'dec9',
                'dec10',
                'dec11',
                'dec12',
                'dec13',
                'dec14',
            ]);
            const inlineDecorations1 = viewModel.getViewportViewLineRenderingData(new Range(1, viewModel.getLineMinColumn(1), 2, viewModel.getLineMaxColumn(2)), 1).inlineDecorations;
            // view line 1: (1,1 -> 1,14)
            assert.deepStrictEqual(inlineDecorations1, [
                new InlineDecoration(new Range(1, 2, 1, 3), 'i-dec1', 0 /* InlineDecorationType.Regular */),
                new InlineDecoration(new Range(1, 2, 1, 2), 'b-dec1', 1 /* InlineDecorationType.Before */),
                new InlineDecoration(new Range(1, 3, 1, 3), 'a-dec1', 2 /* InlineDecorationType.After */),
                new InlineDecoration(new Range(1, 2, 1, 14), 'i-dec2', 0 /* InlineDecorationType.Regular */),
                new InlineDecoration(new Range(1, 2, 1, 2), 'b-dec2', 1 /* InlineDecorationType.Before */),
                new InlineDecoration(new Range(1, 14, 1, 14), 'a-dec2', 2 /* InlineDecorationType.After */),
                new InlineDecoration(new Range(1, 2, 2, 2), 'i-dec3', 0 /* InlineDecorationType.Regular */),
                new InlineDecoration(new Range(1, 2, 1, 2), 'b-dec3', 1 /* InlineDecorationType.Before */),
                new InlineDecoration(new Range(1, 2, 3, 13), 'i-dec4', 0 /* InlineDecorationType.Regular */),
                new InlineDecoration(new Range(1, 2, 1, 2), 'b-dec4', 1 /* InlineDecorationType.Before */),
                new InlineDecoration(new Range(1, 2, 5, 8), 'i-dec5', 0 /* InlineDecorationType.Regular */),
                new InlineDecoration(new Range(1, 2, 1, 2), 'b-dec5', 1 /* InlineDecorationType.Before */),
            ]);
            const inlineDecorations2 = viewModel.getViewportViewLineRenderingData(new Range(2, viewModel.getLineMinColumn(2), 3, viewModel.getLineMaxColumn(3)), 2).inlineDecorations;
            // view line 2: (1,14 -> 1,24)
            assert.deepStrictEqual(inlineDecorations2, [
                new InlineDecoration(new Range(1, 2, 2, 2), 'i-dec3', 0 /* InlineDecorationType.Regular */),
                new InlineDecoration(new Range(2, 2, 2, 2), 'a-dec3', 2 /* InlineDecorationType.After */),
                new InlineDecoration(new Range(1, 2, 3, 13), 'i-dec4', 0 /* InlineDecorationType.Regular */),
                new InlineDecoration(new Range(1, 2, 5, 8), 'i-dec5', 0 /* InlineDecorationType.Regular */),
                new InlineDecoration(new Range(2, 1, 2, 1), 'i-dec6', 0 /* InlineDecorationType.Regular */),
                new InlineDecoration(new Range(2, 1, 2, 1), 'b-dec6', 1 /* InlineDecorationType.Before */),
                new InlineDecoration(new Range(2, 1, 2, 1), 'a-dec6', 2 /* InlineDecorationType.After */),
                new InlineDecoration(new Range(2, 1, 2, 3), 'i-dec7', 0 /* InlineDecorationType.Regular */),
                new InlineDecoration(new Range(2, 1, 2, 1), 'b-dec7', 1 /* InlineDecorationType.Before */),
                new InlineDecoration(new Range(2, 3, 2, 3), 'a-dec7', 2 /* InlineDecorationType.After */),
                new InlineDecoration(new Range(2, 1, 3, 13), 'i-dec8', 0 /* InlineDecorationType.Regular */),
                new InlineDecoration(new Range(2, 1, 2, 1), 'b-dec8', 1 /* InlineDecorationType.Before */),
                new InlineDecoration(new Range(2, 1, 5, 8), 'i-dec9', 0 /* InlineDecorationType.Regular */),
                new InlineDecoration(new Range(2, 1, 2, 1), 'b-dec9', 1 /* InlineDecorationType.Before */),
                new InlineDecoration(new Range(2, 3, 2, 5), 'i-dec10', 0 /* InlineDecorationType.Regular */),
                new InlineDecoration(new Range(2, 3, 2, 3), 'b-dec10', 1 /* InlineDecorationType.Before */),
                new InlineDecoration(new Range(2, 5, 2, 5), 'a-dec10', 2 /* InlineDecorationType.After */),
                new InlineDecoration(new Range(2, 3, 3, 13), 'i-dec11', 0 /* InlineDecorationType.Regular */),
                new InlineDecoration(new Range(2, 3, 2, 3), 'b-dec11', 1 /* InlineDecorationType.Before */),
                new InlineDecoration(new Range(2, 3, 5, 8), 'i-dec12', 0 /* InlineDecorationType.Regular */),
                new InlineDecoration(new Range(2, 3, 2, 3), 'b-dec12', 1 /* InlineDecorationType.Before */),
            ]);
            const inlineDecorations3 = viewModel.getViewportViewLineRenderingData(new Range(2, viewModel.getLineMinColumn(2), 3, viewModel.getLineMaxColumn(3)), 3).inlineDecorations;
            // view line 3 (24 -> 36)
            assert.deepStrictEqual(inlineDecorations3, [
                new InlineDecoration(new Range(1, 2, 3, 13), 'i-dec4', 0 /* InlineDecorationType.Regular */),
                new InlineDecoration(new Range(3, 13, 3, 13), 'a-dec4', 2 /* InlineDecorationType.After */),
                new InlineDecoration(new Range(1, 2, 5, 8), 'i-dec5', 0 /* InlineDecorationType.Regular */),
                new InlineDecoration(new Range(2, 1, 3, 13), 'i-dec8', 0 /* InlineDecorationType.Regular */),
                new InlineDecoration(new Range(3, 13, 3, 13), 'a-dec8', 2 /* InlineDecorationType.After */),
                new InlineDecoration(new Range(2, 1, 5, 8), 'i-dec9', 0 /* InlineDecorationType.Regular */),
                new InlineDecoration(new Range(2, 3, 3, 13), 'i-dec11', 0 /* InlineDecorationType.Regular */),
                new InlineDecoration(new Range(3, 13, 3, 13), 'a-dec11', 2 /* InlineDecorationType.After */),
                new InlineDecoration(new Range(2, 3, 5, 8), 'i-dec12', 0 /* InlineDecorationType.Regular */),
            ]);
        });
    });
    test('issue #17208: Problem scrolling in 1.8.0', () => {
        const text = [
            'hello world, this is a buffer that will be wrapped'
        ];
        const opts = {
            wordWrap: 'wordWrapColumn',
            wordWrapColumn: 13
        };
        testViewModel(text, opts, (viewModel, model) => {
            assert.strictEqual(viewModel.getLineContent(1), 'hello world, ');
            assert.strictEqual(viewModel.getLineContent(2), 'this is a ');
            assert.strictEqual(viewModel.getLineContent(3), 'buffer that ');
            assert.strictEqual(viewModel.getLineContent(4), 'will be ');
            assert.strictEqual(viewModel.getLineContent(5), 'wrapped');
            model.changeDecorations((accessor) => {
                accessor.addDecoration(new Range(1, 50, 1, 51), {
                    description: 'test',
                    beforeContentClassName: 'dec1'
                });
            });
            const decorations = viewModel.getDecorationsInViewport(new Range(2, viewModel.getLineMinColumn(2), 3, viewModel.getLineMaxColumn(3))).filter(x => Boolean(x.options.beforeContentClassName));
            assert.deepStrictEqual(decorations, []);
            const inlineDecorations1 = viewModel.getViewportViewLineRenderingData(new Range(2, viewModel.getLineMinColumn(2), 3, viewModel.getLineMaxColumn(3)), 2).inlineDecorations;
            assert.deepStrictEqual(inlineDecorations1, []);
            const inlineDecorations2 = viewModel.getViewportViewLineRenderingData(new Range(2, viewModel.getLineMinColumn(2), 3, viewModel.getLineMaxColumn(3)), 3).inlineDecorations;
            assert.deepStrictEqual(inlineDecorations2, []);
        });
    });
    test('issue #37401: Allow both before and after decorations on empty line', () => {
        const text = [
            ''
        ];
        testViewModel(text, {}, (viewModel, model) => {
            model.changeDecorations((accessor) => {
                accessor.addDecoration(new Range(1, 1, 1, 1), {
                    description: 'test',
                    beforeContentClassName: 'before1',
                    afterContentClassName: 'after1'
                });
            });
            const inlineDecorations = viewModel.getViewportViewLineRenderingData(new Range(1, 1, 1, 1), 1).inlineDecorations;
            assert.deepStrictEqual(inlineDecorations, [
                new InlineDecoration(new Range(1, 1, 1, 1), 'before1', 1 /* InlineDecorationType.Before */),
                new InlineDecoration(new Range(1, 1, 1, 1), 'after1', 2 /* InlineDecorationType.After */)
            ]);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld01vZGVsRGVjb3JhdGlvbnMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9icm93c2VyL3ZpZXdNb2RlbC92aWV3TW9kZWxEZWNvcmF0aW9ucy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDdEQsT0FBTyxFQUFFLGdCQUFnQixFQUF3QixNQUFNLDhCQUE4QixDQUFDO0FBQ3RGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUVuRCxLQUFLLENBQUMsc0JBQXNCLEVBQUUsR0FBRyxFQUFFO0lBRWxDLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsSUFBSSxDQUFDLDRCQUE0QixFQUFFLEdBQUcsRUFBRTtRQUN2QyxNQUFNLElBQUksR0FBRztZQUNaLG9EQUFvRDtTQUNwRCxDQUFDO1FBQ0YsTUFBTSxJQUFJLEdBQW1CO1lBQzVCLFFBQVEsRUFBRSxnQkFBZ0I7WUFDMUIsY0FBYyxFQUFFLEVBQUU7U0FDbEIsQ0FBQztRQUNGLGFBQWEsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsU0FBUyxFQUFFLEtBQUssRUFBRSxFQUFFO1lBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxlQUFlLENBQUMsQ0FBQztZQUNqRSxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFDOUQsTUFBTSxD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QkFDcEYsSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxRQUFRLHNDQUE4QjtnQkFDbEYsSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxRQUFRLHFDQUE2QjtnQkFDbkYsSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxRQUFRLHVDQUErQjtnQkFDbkYsSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxRQUFRLHNDQUE4QjtnQkFDbEYsSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxRQUFRLHVDQUErQjtnQkFDcEYsSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxRQUFRLHNDQUE4QjtnQkFDbEYsSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxRQUFRLHVDQUErQjtnQkFDbkYsSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxRQUFRLHNDQUE4QjthQUNsRixDQUFDLENBQUM7WUFFSCxNQUFNLGtCQUFrQixHQUFHLFNBQVMsQ0FBQyxnQ0FBZ0MsQ0FDcEUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsU0FBUyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQzdFLENBQUMsQ0FDRCxDQUFDLGlCQUFpQixDQUFDO1lBRXBCLDhCQUE4QjtZQUM5QixNQUFNLENBQUMsZUFBZSxDQUFDLGtCQUFrQixFQUFFO2dCQUMxQyxJQUFJLGdCQUFnQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEsdUNBQStCO2dCQUNuRixJQUFJLGdCQUFnQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEscUNBQTZCO2dCQUNqRixJQUFJLGdCQUFnQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLFFBQVEsdUNBQStCO2dCQUNwRixJQUFJLGdCQUFnQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEsdUNBQStCO2dCQUNuRixJQUFJLGdCQUFnQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEsdUNBQStCO2dCQUNuRixJQUFJLGdCQUFnQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEsc0NBQThCO2dCQUNsRixJQUFJLGdCQUFnQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEscUNBQTZCO2dCQUNqRixJQUFJLGdCQUFnQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEsdUNBQStCO2dCQUNuRixJQUFJLGdCQUFnQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEsc0NBQThCO2dCQUNsRixJQUFJLGdCQUFnQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEscUNBQTZCO2dCQUNqRixJQUFJLGdCQUFnQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLFFBQVEsdUNBQStCO2dCQUNwRixJQUFJLGdCQUFnQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEsc0NBQThCO2dCQUNsRixJQUFJLGdCQUFnQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEsdUNBQStCO2dCQUNuRixJQUFJLGdCQUFnQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEsc0NBQThCO2dCQUNsRixJQUFJLGdCQUFnQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFNBQVMsdUNBQStCO2dCQUNwRixJQUFJLGdCQUFnQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFNBQVMsc0NBQThCO2dCQUNuRixJQUFJLGdCQUFnQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFNBQVMscUNBQTZCO2dCQUNsRixJQUFJLGdCQUFnQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFB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