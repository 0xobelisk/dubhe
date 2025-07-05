import createDebug from 'debug';

export const debug = createDebug('dubhe:common');
export const error = createDebug('dubhe:common');

// Pipe debug output to stdout instead of stderr
debug.log = console.debug.bind(console);

// Pipe error output to stderr
error.log = console.error.bind(console);
