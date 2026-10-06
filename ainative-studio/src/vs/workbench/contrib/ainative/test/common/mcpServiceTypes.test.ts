/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { isMCPToolDisabled, getMCPRegistry, findMCPRegistryEntry, mergeRegistryEntryIntoConfig } from '../../common/mcpServiceTypes.js';

suite('isMCPToolDisabled Tests', () => {

	test('returns false when disabledToolNames is undefined (never-configured server)', () => {
		assert.strictEqual(isMCPToolDisabled(undefined, 'read_file'), false);
	});

	test('returns false when disabledToolNames is an empty array', () => {
		assert.strictEqual(isMCPToolDisabled([], 'read_file'), false);
	});

	test('returns false for a tool not present in disabledToolNames', () => {
		assert.strictEqual(isMCPToolDisabled(['write_file'], 'read_file'), false);
	});

	test('returns true for a tool present in disabledToolNames', () => {
		assert.strictEqual(isMCPToolDisabled(['read_file'], 'read_file'), true);
	});

	test('returns true for one of several disabled tools', () => {
		assert.strictEqual(isMCPToolDisabled(['write_file', 'read_file', 'delete_file'], 'read_file'), true);
	});

	test('is exact-match, not a substring/prefix match', () => {
		assert.strictEqual(isMCPToolDisabled(['read_file'], 'read_file_v2'), false);
		assert.strictEqual(isMCPToolDisabled(['read_file_v2'], 'read_file'), false);
	});
});

suite('MCP registry (#176) Tests', () => {

	test('getMCPRegistry returns a non-empty, stable list', () => {
		const registry = getMCPRegistry();
		assert.ok(registry.length > 0);
		// every entry must have a usable config (command-based or URL-based)
		for (const entry of registry) {
			assert.ok(entry.config.command || entry.config.url, `entry ${entry.id} has neither command nor url`);
		}
	});

	test('registry entry ids are unique', () => {
		const registry = getMCPRegistry();
		const ids = registry.map(e => e.id);
		assert.strictEqual(ids.length, new Set(ids).size);
	});

	test('findMCPRegistryEntry finds a known entry by id', () => {
		const entry = findMCPRegistryEntry('memory');
		assert.ok(entry);
		assert.strictEqual(entry!.id, 'memory');
	});

	test('findMCPRegistryEntry returns undefined for an unknown id', () => {
		assert.strictEqual(findMCPRegistryEntry('does-not-exist'), undefined);
	});

	test('mergeRegistryEntryIntoConfig installs under the entry id by default', () => {
		const entry = findMCPRegistryEntry('memory')!;
		const result = mergeRegistryEntryIntoConfig({ mcpServers: {} }, entry);
		assert.ok(result.ok);
		if (!result.ok) return;
		assert.strictEqual(result.overwritten, false);
		assert.deepStrictEqual(result.configFileJSON.mcpServers['memory'], entry.config);
	});

	test('mergeRegistryEntryIntoConfig installs under a custom name when given one', () => {
		const entry = findMCPRegistryEntry('memory')!;
		const result = mergeRegistryEntryIntoConfig({ mcpServers: {} }, entry, 'my-memory-server');
		assert.ok(result.ok);
		if (!result.ok) return;
		assert.ok('my-memory-server' in result.configFileJSON.mcpServers);
		assert.ok(!('memory' in result.configFileJSON.mcpServers));
	});

	test('mergeRegistryEntryIntoConfig preserves existing unrelated servers', () => {
		const entry = findMCPRegistryEntry('fetch')!;
		const existing = { mcpServers: { memory: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-memory'] } } };
		const result = mergeRegistryEntryIntoConfig(existing, entry);
		assert.ok(result.ok);
		if (!result.ok) return;
		assert.ok('memory' in result.configFileJSON.mcpServers);
		assert.ok('fetch' in result.configFileJSON.mcpServers);
	});

	test('mergeRegistryEntryIntoConfig reports overwritten:true when the name collides', () => {
		const entry = findMCPRegistryEntry('memory')!;
		const existing = { mcpServers: { memory: { command: 'something-else' } } };
		const result = mergeRegistryEntryIntoConfig(existing, entry);
		assert.ok(result.ok);
		if (!result.ok) return;
		assert.strictEqual(result.overwritten, true);
		assert.deepStrictEqual(result.configFileJSON.mcpServers['memory'], entry.config);
	});

	test('mergeRegistryEntryIntoConfig rejects an empty custom name', () => {
		const entry = findMCPRegistryEntry('memory')!;
		const result = mergeRegistryEntryIntoConfig({ mcpServers: {} }, entry, '   ');
		assert.strictEqual(result.ok, false);
	});
});
