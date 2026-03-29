import { debug as parentDebug } from '../debug';

export const debug = parentDebug.extend('codegen');

// Pipe debug output to stdout instead of stderr
debug.log = console.debug.bind(console);
