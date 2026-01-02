#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PRODUCT_JSON_PATH = path.join(__dirname, '../product.json');

function main() {
  try {
    // Get current commit hash
    const commit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();

    console.log(`[inject-commit] Git commit: ${commit}`);

    // Read product.json
    const productJson = JSON.parse(fs.readFileSync(PRODUCT_JSON_PATH, 'utf8'));

    // Replace ${COMMIT_HASH} placeholder with actual commit
    const updatedJson = JSON.stringify(productJson)
      .replace(/\$\{COMMIT_HASH\}/g, commit);

    const finalJson = JSON.parse(updatedJson);

    // Write back with same formatting (tabs)
    fs.writeFileSync(
      PRODUCT_JSON_PATH,
      JSON.stringify(finalJson, null, '\t') + '\n'
    );

    console.log(`[inject-commit] ✓ Injected commit hash: ${commit.substring(0, 8)}...`);
    console.log(`[inject-commit] ✓ Updated product.json`);

  } catch (error) {
    console.error('[inject-commit] ERROR:', error.message);
    process.exit(1);
  }
}

main();
