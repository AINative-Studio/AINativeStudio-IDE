/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { removeAccents } from '../../common/normalization.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
suite('Normalization', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('removeAccents', function () {
        assert.strictEqual(removeAccents('joào'), 'joao');
        assert.strictEqual(removeAccents('joáo'), 'joao');
        assert.strictEqual(removeAccents('joâo'), 'joao');
        assert.strictEqual(removeAccents('joäo'), 'joao');
        // assert.strictEqual(strings.removeAccents('joæo'), 'joao'); // not an accent
        assert.strictEqual(removeAccents('joão'), 'joao');
        assert.strictEqual(removeAccents('joåo'), 'joao');
        assert.strictEqual(removeAccents('joåo'), 'joao');
        assert.strictEqual(removeAccents('joāo'), 'joao');
        assert.strictEqual(removeAccents('fôo'), 'foo');
        assert.strictEqual(removeAccents('föo'), 'foo');
        assert.strictEqual(removeAccents('fòo'), 'foo');
        assert.strictEqual(removeAccents('fóo'), 'foo');
        // assert.strictEqual(strings.removeAccents('fœo'), 'foo');
        // assert.strictEqual(strings.removeAccents('føo'), 'foo');
        assert.strictEqual(removeAccents('fōo'), 'foo');
        assert.strictEqual(removeAccents('fõo'), 'foo');
        assert.strictEqual(removeAccents('andrè'), 'andre');
        assert.strictEqual(removeAccents('andré'), 'andre');
        assert.strictEqual(removeAccents('andrê'), 'andre');
        assert.strictEqual(removeAccents('andrë'), 'andre');
        assert.strictEqual(removeAccents('andrē'), 'andre');
        assert.strictEqual(removeAccents('andrė'), 'andre');
        assert.strictEqual(removeAccents('andrę'), 'andre');
        assert.strictEqual(removeAccents('hvîc'), 'hvic');
        assert.strictEqual(removeAccents('hvïc'), 'hvic');
        assert.strictEqual(removeAccents('hvíc'), 'hvic');
        assert.strictEqual(removeAccents('hvīc'), 'hvic');
        assert.strictEqual(removeAccents('hvįc'), 'hvic');
        assert.strictEqual(removeAccents('hvìc'), 'hvic');
        assert.strictEqual(removeAccents('ûdo'), 'udo');
        assert.strictEqual(removeAccents('üdo'), 'udo');
        assert.strictEqual(removeAccents('ùdo'), 'udo');
        assert.strictEqual(removeAccents('údo'), 'udo');
        assert.strictEqual(removeAccents('ūdo'), 'udo');
        assert.strictEqual(removeAccents('heÿ'), 'hey');
        // assert.strictEqual(strings.removeAccents('gruß'), 'grus');
        assert.strictEqual(removeAccents('gruś'), 'grus');
        assert.strictEqual(removeAccents('gruš'), 'grus');
        assert.strictEqual(removeAccents('çool'), 'cool');
        assert.strictEqual(removeAccents('ćool'), 'cool');
        assert.strictEqual(removeAccents('čool'), 'cool');
        assert.strictEqual(removeAccents('ñice'), 'nice');
        assert.strictEqual(removeAccents('ńice'), 'nice');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9ybWFsaXphdGlvbi50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9jb21tb24vbm9ybWFsaXphdGlvbi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDOUQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBRXJFLEtBQUssQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO0lBQzNCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsSUFBSSxDQUFDLGVBQWUsRUFBRTtRQUNyQixNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNsRCw4RUFBOEU7UUFDOUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFFbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDaEQsMkRBQTJEO1FBQzNELDJEQUEyRDtRQUMzRCxNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUVoRCxNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUVwRCxNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUVsRCxNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUVoRCxNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUVoRCw2REFBNkQ7UUFDN0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFFbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFFbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDbkQsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyJ9