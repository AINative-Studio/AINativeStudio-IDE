/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { formatGitPullOutput } from '../../node/skills/gitOperations.js';
suite('GitOperations', () => {
    suite('formatGitPullOutput', () => {
        test('should format failed pull', () => {
            const result = {
                success: false,
                stdout: '',
                stderr: '',
                errorMessage: 'Network error'
            };
            const output = formatGitPullOutput(result);
            assert.ok(output.includes('✗'));
            assert.ok(output.includes('Network error'));
        });
        test('should format already up to date', () => {
            const result = {
                success: true,
                stdout: 'Already up to date.',
                stderr: ''
            };
            const output = formatGitPullOutput(result);
            assert.ok(output.includes('✓'));
            assert.ok(output.includes('already up to date'));
        });
        test('should format fast-forward update', () => {
            const result = {
                success: true,
                stdout: 'Fast-forward\n 1 file changed, 10 insertions(+)',
                stderr: ''
            };
            const output = formatGitPullOutput(result);
            assert.ok(output.includes('✓'));
            assert.ok(output.includes('fast-forward'));
        });
        test('should format merge update', () => {
            const result = {
                success: true,
                stdout: 'Merge made by the \'recursive\' strategy.',
                stderr: ''
            };
            const output = formatGitPullOutput(result);
            assert.ok(output.includes('✓'));
            assert.ok(output.includes('merge'));
        });
        test('should handle generic success', () => {
            const result = {
                success: true,
                stdout: 'Updated',
                stderr: ''
            };
            const output = formatGitPullOutput(result);
            assert.ok(output.includes('✓'));
            assert.ok(output.includes('updated successfully'));
        });
        test('should handle error without message', () => {
            const result = {
                success: false,
                stdout: '',
                stderr: ''
            };
            const output = formatGitPullOutput(result);
            assert.ok(output.includes('✗'));
            assert.ok(output.includes('failed'));
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2l0T3BlcmF0aW9ucy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9haW5hdGl2ZS90ZXN0L2NvbW1vbi9naXRPcGVyYXRpb25zLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDakMsT0FBTyxFQUFFLG1CQUFtQixFQUFzQixNQUFNLG9DQUFvQyxDQUFDO0FBRTdGLEtBQUssQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO0lBRTNCLEtBQUssQ0FBQyxxQkFBcUIsRUFBRSxHQUFHLEVBQUU7UUFFakMsSUFBSSxDQUFDLDJCQUEyQixFQUFFLEdBQUcsRUFBRTtZQUN0QyxNQUFNLE1BQU0sR0FBdUI7Z0JBQ2xDLE9BQU8sRUFBRSxLQUFLO2dCQUNkLE1BQU0sRUFBRSxFQUFFO2dCQUNWLE1BQU0sRUFBRSxFQUFFO2dCQUNWLFlBQVksRUFBRSxlQUFlO2FBQzdCLENBQUM7WUFFRixNQUFNLE1BQU0sR0FBRyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUMzQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNoQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQztRQUM3QyxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxrQ0FBa0MsRUFBRSxHQUFHLEVBQUU7WUFDN0MsTUFBTSxNQUFNLEdBQXVCO2dCQUNsQyxPQUFPLEVBQUUsSUFBSTtnQkFDYixNQUFNLEVBQUUscUJBQXFCO2dCQUM3QixNQUFNLEVBQUUsRUFBRTthQUNWLENBQUM7WUFFRixNQUFNLE1B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