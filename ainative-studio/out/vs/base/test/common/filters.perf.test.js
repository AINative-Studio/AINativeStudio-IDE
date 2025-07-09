/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { importAMDNodeModule } from '../../../amdX.js';
import * as filters from '../../common/filters.js';
import { FileAccess } from '../../common/network.js';
const patterns = ['cci', 'ida', 'pos', 'CCI', 'enbled', 'callback', 'gGame', 'cons', 'zyx', 'aBc'];
const _enablePerf = false;
function perfSuite(name, callback) {
    if (_enablePerf) {
        suite(name, callback);
    }
}
perfSuite('Performance - fuzzyMatch', async function () {
    const uri = FileAccess.asBrowserUri('vs/base/test/common/filters.perf.data').toString(true);
    const { data } = await importAMDNodeModule(uri, '');
    // suiteSetup(() => console.profile());
    // suiteTeardown(() => console.profileEnd());
    console.log(`Matching ${data.length} items against ${patterns.length} patterns (${data.length * patterns.length} operations) `);
    function perfTest(name, match) {
        test(name, () => {
            const t1 = Date.now();
            let count = 0;
            for (let i = 0; i < 2; i++) {
                for (const pattern of patterns) {
                    const patternLow = pattern.toLowerCase();
                    for (const item of data) {
                        count += 1;
                        match(pattern, patternLow, 0, item, item.toLowerCase(), 0);
                    }
                }
            }
            const d = Date.now() - t1;
            console.log(name, `${d}ms, ${Math.round(count / d) * 15}/15ms, ${Math.round(count / d)}/1ms`);
        });
    }
    perfTest('fuzzyScore', filters.fuzzyScore);
    perfTest('fuzzyScoreGraceful', filters.fuzzyScoreGraceful);
    perfTest('fuzzyScoreGracefulAggressive', filters.fuzzyScoreGracefulAggressive);
});
perfSuite('Performance - IFilter', async function () {
    const uri = FileAccess.asBrowserUri('vs/base/test/common/filters.perf.data').toString(true);
    const { data } = await importAMDNodeModule(uri, '');
    function perfTest(name, match) {
        test(name, () => {
            const t1 = Date.now();
            let count = 0;
            for (let i = 0; i < 2; i++) {
                for (const pattern of patterns) {
                    for (const item of data) {
                        count += 1;
                        match(pattern, item);
                    }
                }
            }
            const d = Date.now() - t1;
            console.log(name, `${d}ms, ${Math.round(count / d) * 15}/15ms, ${Math.round(count / d)}/1ms`);
        });
    }
    perfTest('matchesFuzzy', filters.matchesFuzzy);
    perfTest('matchesFuzzy2', filters.matchesFuzzy2);
    perfTest('matchesPrefix', filters.matchesPrefix);
    perfTest('matchesContiguousSubString', filters.matchesContiguousSubString);
    perfTest('matchesCamelCase', filters.matchesCamelCase);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsdGVycy5wZXJmLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2NvbW1vbi9maWx0ZXJzLnBlcmYudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUN2RCxPQUFPLEtBQUssT0FBTyxNQUFNLHlCQUF5QixDQUFDO0FBQ25ELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUVyRCxNQUFNLFFBQVEsR0FBRyxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBRW5HLE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQztBQUUxQixTQUFTLFNBQVMsQ0FBQyxJQUFZLEVBQUUsUUFBcUM7SUFDckUsSUFBSSxXQUFXLEVBQUUsQ0FBQztRQUNqQixLQUFLLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ3ZCLENBQUM7QUFDRixDQUFDO0FBRUQsU0FBUyxDQUFDLDBCQUEwQixFQUFFLEtBQUs7SUFFMUMsTUFBTSxHQUFHLEdBQUcsVUFBVSxDQUFDLFlBQVksQ0FBQyx1Q0FBdUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM1RixNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsTUFBTSxtQkFBbUIsQ0FBMEMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBRTdGLHVDQUF1QztJQUN2Qyw2Q0FBNkM7SUFFN0MsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLElBQUksQ0FBQyxNQUFNLGtCQUFrQixRQUFR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