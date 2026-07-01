#!/usr/bin/env node
'use strict';

// Backward-compatible shim — delegates to preview.js
require('./preview').main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
