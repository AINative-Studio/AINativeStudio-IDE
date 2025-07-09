/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { parseLogEntryAt } from '../../common/outputChannelModel.js';
import { TextModel } from '../../../../../editor/common/model/textModel.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { LogLevel } from '../../../../../platform/log/common/log.js';
import { workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
suite('Logs Parsing', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    setup(() => {
        instantiationService = disposables.add(workbenchInstantiationService({}, disposables));
    });
    test('should parse log entry with all components', () => {
        const text = '2023-10-15 14:30:45.123 [info] [Git] Initializing repository';
        const model = createModel(text);
        const entry = parseLogEntryAt(model, 1);
        assert.strictEqual(entry?.timestamp, new Date('2023-10-15 14:30:45.123').getTime());
        assert.strictEqual(entry?.logLevel, LogLevel.Info);
        assert.strictEqual(entry?.category, 'Git');
        assert.strictEqual(model.getValueInRange(entry?.range), text);
    });
    test('should parse multi-line log entry', () => {
        const text = [
            '2023-10-15 14:30:45.123 [error] [Extension] Failed with error:',
            'Error: Could not load extension',
            '    at Object.load (/path/to/file:10:5)'
        ].join('\n');
        const model = createModel(text);
        const entry = parseLogEntryAt(model, 1);
        assert.strictEqual(entry?.timestamp, new Date('2023-10-15 14:30:45.123').getTime());
        assert.strictEqual(entry?.logLevel, LogLevel.Error);
        assert.strictEqual(entry?.category, 'Extension');
        assert.strictEqual(model.getValueInRange(entry?.range), text);
    });
    test('should parse log entry without category', () => {
        const text = '2023-10-15 14:30:45.123 [warning] System is running low on memory';
        const model = createModel(text);
        const entry = parseLogEntryAt(model, 1);
        assert.strictEqual(entry?.timestamp, new Date('2023-10-15 14:30:45.123').getTime());
        assert.strictEqual(entry?.logLevel, LogLevel.Warning);
        assert.strictEqual(entry?.category, undefined);
        assert.strictEqual(model.getValueInRange(entry?.range), text);
    });
    test('should return null for invalid log entry', () => {
        const model = createModel('Not a valid log entry');
        const entry = parseLogEntryAt(model, 1);
        assert.strictEqual(entry, null);
    });
    test('should parse all supported log levels', () => {
        const levels = {
            info: LogLevel.Info,
            trace: LogLevel.Trace,
            debug: LogLevel.Debug,
            warning: LogLevel.Warning,
            error: LogLevel.Error
        };
        for (const [levelText, expectedLevel] of Object.entries(levels)) {
            const model = createModel(`2023-10-15 14:30:45.123 [${levelText}] Test message`);
            const entry = parseLogEntryAt(model, 1);
            assert.strictEqual(entry?.logLevel, expectedLevel, `Failed for log level: ${levelText}`);
        }
    });
    test('should parse timestamp correctly', () => {
        const timestamps = [
            '2023-01-01 00:00:00.000',
            '2023-12-31 23:59:59.999',
            '2023-06-15 12:30:45.500'
        ];
        for (const timestamp of timestamps) {
            const model = createModel(`${timestamp} [info] Test message`);
            const entry = parseLogEntryAt(model, 1);
            assert.strictEqual(entry?.timestamp, new Date(timestamp).getTime(), `Failed for timestamp: ${timestamp}`);
        }
    });
    test('should handle last line of file', () => {
        const model = createModel([
            '2023-10-15 14:30:45.123 [info] First message',
            '2023-10-15 14:30:45.124 [info] Last message',
            ''
        ].join('\n'));
        let actual = parseLogEntryAt(model, 1);
        assert.strictEqual(actual?.timestamp, new Date('2023-10-15 14:30:45.123').getTime());
        assert.strictEqual(actual?.logLevel, LogLevel.Info);
        assert.strictEqual(actual?.category, undefined);
        assert.strictEqual(model.getValueInRange(actual?.range), '2023-10-15 14:30:45.123 [info] First message');
        actual = parseLogEntryAt(model, 2);
        assert.strictEqual(actual?.timestamp, new Date('2023-10-15 14:30:45.124').getTime());
        assert.strictEqual(actual?.logLevel, LogLevel.Info);
        assert.strictEqual(actual?.category, undefined);
        assert.strictEqual(model.getValueInRange(actual?.range), '2023-10-15 14:30:45.124 [info] Last message');
        actual = parseLogEntryAt(model, 3);
        assert.strictEqual(actual, null);
    });
    test('should parse multi-line log entry with empty lines', () => {
        const text = [
            '2025-01-27 09:53:00.450 [info] Found with version <20.18.1>',
            'Now using node v20.18.1 (npm v10.8.2)',
            '',
            '> husky - npm run -s precommit',
            '> husky - node v20.18.1',
            '',
            'Reading git index versions...'
        ].join('\n');
        const model = createModel(text);
        const entry = parseLogEntryAt(model, 1);
        assert.strictEqual(entry?.timestamp, new Date('2025-01-27 09:53:00.450').getTime());
        assert.strictEqual(entry?.logLevel, LogLevel.Info);
        assert.strictEqual(entry?.category, undefined);
        assert.strictEqual(model.getValueInRange(entry?.range), text);
    });
    function createModel(content) {
        return disposables.add(instantiationService.createInstance(TextModel, content, 'log', TextModel.DEFAULT_CREATION_OPTIONS, null));
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0cHV0Q2hhbm5lbE1vZGVsLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvb3V0cHV0L3Rlc3QvYnJvd3Nlci9vdXRwdXRDaGFubmVsTW9kZWwudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUNqQyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDckUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUdsRyxLQUFLLENBQUMsY0FBYyxFQUFFLEdBQUcsRUFBRTtJQUUxQixNQUFNLFdBQVcsR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTlELElBQUksb0JBQThDLENBQUM7SUFFbkQsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLG9CQUFvQixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsNkJBQTZCLENBQUMsRUFBRSxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUM7SUFDeEYsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsNENBQTRDLEVBQUUsR0FBRyxFQUFFO1FBQ3ZELE1BQU0sSUFBSSxHQUFHLDhEQUE4RCxDQUFDO1FBQzVFLE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNoQyxNQUFNLEtBQUssR0FBRyxlQUFlLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FB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