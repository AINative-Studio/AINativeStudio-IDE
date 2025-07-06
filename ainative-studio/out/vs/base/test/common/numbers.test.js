/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
import { isPointWithinTriangle, randomInt } from '../../common/numbers.js';
suite('isPointWithinTriangle', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('should return true if the point is within the triangle', () => {
        const result = isPointWithinTriangle(0.25, 0.25, 0, 0, 1, 0, 0, 1);
        assert.ok(result);
    });
    test('should return false if the point is outside the triangle', () => {
        const result = isPointWithinTriangle(2, 2, 0, 0, 1, 0, 0, 1);
        assert.ok(!result);
    });
    test('should return true if the point is on the edge of the triangle', () => {
        const result = isPointWithinTriangle(0.5, 0, 0, 0, 1, 0, 0, 1);
        assert.ok(result);
    });
});
suite('randomInt', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    /**
     * Test helper that allows to run a test on the `randomInt()`
     * utility with specified `max` and `min` values.
     */
    const testRandomIntUtil = (max, min, testName) => {
        suite(testName, () => {
            let i = 0;
            while (++i < 5) {
                test(`should generate random boolean attempt#${i}`, async () => {
                    let iterations = 100;
                    while (iterations-- > 0) {
                        const int = randomInt(max, min);
                        assert(int <= max, `Expected ${int} to be less than or equal to ${max}.`);
                        assert(int >= (min ?? 0), `Expected ${int} to be greater than or equal to ${min ?? 0}.`);
                    }
                });
            }
            test('should include min and max', async () => {
                let iterations = 125;
                const results = [];
                while (iterations-- > 0) {
                    results.push(randomInt(max, min));
                }
                assert(results.includes(max), `Expected ${results} to include ${max}.`);
                assert(results.includes(min ?? 0), `Expected ${results} to include ${min ?? 0}.`);
            });
        });
    };
    suite('positive numbers', () => {
        testRandomIntUtil(4, 2, 'max: 4, min: 2');
        testRandomIntUtil(4, 0, 'max: 4, min: 0');
        testRandomIntUtil(4, undefined, 'max: 4, min: undefined');
        testRandomIntUtil(1, 0, 'max: 0, min: 0');
    });
    suite('negative numbers', () => {
        testRandomIntUtil(-2, -5, 'max: -2, min: -5');
        testRandomIntUtil(0, -5, 'max: 0, min: -5');
        testRandomIntUtil(0, -1, 'max: 0, min: -1');
    });
    suite('split numbers', () => {
        testRandomIntUtil(3, -1, 'max: 3, min: -1');
        testRandomIntUtil(2, -2, 'max: 2, min: -2');
        testRandomIntUtil(1, -3, 'max: 2, min: -2');
    });
    suite('errors', () => {
        test('should throw if "min" is == "max" #1', () => {
            assert.throws(() => {
                randomInt(200, 200);
            }, `"max"(200) param should be greater than "min"(200)."`);
        });
        test('should throw if "min" is == "max" #2', () => {
            assert.throws(() => {
                randomInt(2, 2);
            }, `"max"(2) param should be greater than "min"(2)."`);
        });
        test('should throw if "min" is == "max" #3', () => {
            assert.throws(() => {
                randomInt(0);
            }, `"max"(0) param should be greater than "min"(0)."`);
        });
        test('should throw if "min" is > "max" #1', () => {
            assert.throws(() => {
                randomInt(2, 3);
            }, `"max"(2) param should be greater than "min"(3)."`);
        });
        test('should throw if "min" is > "max" #2', () => {
            assert.throws(() => {
                randomInt(999, 2000);
            }, `"max"(999) param should be greater than "min"(2000)."`);
        });
        test('should throw if "min" is > "max" #3', () => {
            assert.throws(() => {
                randomInt(0, 1);
            }, `"max"(0) param should be greater than "min"(1)."`);
        });
        test('should throw if "min" is > "max" #4', () => {
            assert.throws(() => {
                randomInt(-5, 2);
            }, `"max"(-5) param should be greater than "min"(2)."`);
        });
        test('should throw if "min" is > "max" #5', () => {
            assert.throws(() => {
                randomInt(-4, 0);
            }, `"max"(-4) param should be greater than "min"(0)."`);
        });
        test('should throw if "min" is > "max" #6', () => {
            assert.throws(() => {
                randomInt(-4);
            }, `"max"(-4) param should be greater than "min"(0)."`);
        });
        test('should throw if "max" is `NaN`', () => {
            assert.throws(() => {
                randomInt(NaN);
            }, `"max" param is not a number."`);
        });
        test('should throw if "min" is `NaN`', () => {
            assert.throws(() => {
                randomInt(4, NaN);
            }, `"min" param is not a number."`);
        });
        suite('infinite arguments', () => {
            test('should throw if "max" is infinite [Infinity]', () => {
                assert.throws(() => {
                    randomInt(Infinity);
                }, `"max" param is not finite."`);
            });
            test('should throw if "max" is infinite [-Infinity]', () => {
                assert.throws(() => {
                    randomInt(-Infinity);
                }, `"max" param is not finite."`);
            });
            test('should throw if "max" is infinite [+Infinity]', () => {
                assert.throws(() => {
                    randomInt(+Infinity);
                }, `"max" param is not finite."`);
            });
            test('should throw if "min" is infinite [Infinity]', () => {
                assert.throws(() => {
                    randomInt(Infinity, Infinity);
                }, `"max" param is not finite."`);
            });
            test('should throw if "min" is infinite [-Infinity]', () => {
                assert.throws(() => {
                    randomInt(Infinity, -Infinity);
                }, `"max" param is not finite."`);
            });
            test('should throw if "min" is infinite [+Infinity]', () => {
                assert.throws(() => {
                    randomInt(Infinity, +Infinity);
                }, `"max" param is not finite."`);
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibnVtYmVycy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2NvbW1vbi9udW1iZXJzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUNyRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsU0FBUyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFFM0UsS0FBSyxDQUFDLHVCQUF1QixFQUFFLEdBQUcsRUFBRTtJQUNuQyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQyx3REFBd0QsRUFBRSxHQUFHLEVBQUU7UUFDbkUsTUFBTSxNQUFNLEdBQUcscUJBQXFCLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ25FLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDbkIsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsMERBQTBELEVBQUUsR0FBRyxFQUFFO1FBQ3JFLE1BQU0sTUFBTSxHQUFHLHFCQUFxQixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM3RCxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDcEIsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsZ0VBQWdFLEVBQUUsR0FBRyxFQUFFO1FBQzNFLE1BQU0sTUFBTSxHQUFHLHFCQUFxQixD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