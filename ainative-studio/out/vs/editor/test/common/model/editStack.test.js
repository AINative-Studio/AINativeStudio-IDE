/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { Selection } from '../../../common/core/selection.js';
import { TextChange } from '../../../common/core/textChange.js';
import { SingleModelEditStackData } from '../../../common/model/editStack.js';
suite('EditStack', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('issue #118041: unicode character undo bug', () => {
        const stackData = new SingleModelEditStackData(1, 2, 0 /* EndOfLineSequence.LF */, 0 /* EndOfLineSequence.LF */, [new Selection(10, 2, 10, 2)], [new Selection(10, 1, 10, 1)], [new TextChange(428, '﻿', 428, '')]);
        const buff = stackData.serialize();
        const actual = SingleModelEditStackData.deserialize(buff);
        assert.deepStrictEqual(actual, stackData);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdFN0YWNrLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL21vZGVsL2VkaXRTdGFjay50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRWhFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRTlFLEtBQUssQ0FBQyxXQUFXLEVBQUUsR0FBRyxFQUFFO0lBRXZCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsSUFBSSxDQUFDLDJDQUEyQyxFQUFFLEdBQUcsRUFBRTtRQUN0RCxNQUFNLFNBQVMsR0FBRyxJQUFJLHdCQUF3QixDQUM3QyxDQUFDLEVBQ0QsQ0FBQyw4REFHRCxDQUFDLElBQUksU0FBUyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQzdCLENBQUMsSUFBSSxTQUFTLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFDN0IsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUNuQyxDQUFDO1FBRUYsTUFBTSxJQUFJLEdBQUcsU0FBUyxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ25DLE1BQU0sTUFBTSxHQUFHLHdCQUF3QixDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUUxRCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztJQUMzQyxDQUFDLENBQUMsQ0FBQztBQUVKLENBQUMsQ0FBQyxDQUFDIn0=