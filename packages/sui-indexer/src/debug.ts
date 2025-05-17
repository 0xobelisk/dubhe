import createDebug from 'debug';

export const debug = createDebug('dubhe:store-indexer');
export const error = createDebug('dubhe:store-indexer');

// Pipe debug output to stdout instead of stderr
debug.log = console.debug.bind(console);

// Pipe error output to stderr
error.log = console.error.bind(console);
