(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],2:[function(require,module,exports){
(function (Buffer){(function (){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

}).call(this)}).call(this,require("buffer").Buffer)
},{"base64-js":1,"buffer":2,"ieee754":3}],3:[function(require,module,exports){
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],4:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],5:[function(require,module,exports){
(function (setImmediate,clearImmediate){(function (){
var nextTick = require('process/browser.js').nextTick;
var apply = Function.prototype.apply;
var slice = Array.prototype.slice;
var immediateIds = {};
var nextImmediateId = 0;

// DOM APIs, for completeness

exports.setTimeout = function() {
  return new Timeout(apply.call(setTimeout, window, arguments), clearTimeout);
};
exports.setInterval = function() {
  return new Timeout(apply.call(setInterval, window, arguments), clearInterval);
};
exports.clearTimeout =
exports.clearInterval = function(timeout) { timeout.close(); };

function Timeout(id, clearFn) {
  this._id = id;
  this._clearFn = clearFn;
}
Timeout.prototype.unref = Timeout.prototype.ref = function() {};
Timeout.prototype.close = function() {
  this._clearFn.call(window, this._id);
};

// Does not start the time, just sets up the members needed.
exports.enroll = function(item, msecs) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = msecs;
};

exports.unenroll = function(item) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = -1;
};

exports._unrefActive = exports.active = function(item) {
  clearTimeout(item._idleTimeoutId);

  var msecs = item._idleTimeout;
  if (msecs >= 0) {
    item._idleTimeoutId = setTimeout(function onTimeout() {
      if (item._onTimeout)
        item._onTimeout();
    }, msecs);
  }
};

// That's not how node.js implements it but the exposed api is the same.
exports.setImmediate = typeof setImmediate === "function" ? setImmediate : function(fn) {
  var id = nextImmediateId++;
  var args = arguments.length < 2 ? false : slice.call(arguments, 1);

  immediateIds[id] = true;

  nextTick(function onNextTick() {
    if (immediateIds[id]) {
      // fn.call() is faster so we optimize for the common use-case
      // @see http://jsperf.com/call-apply-segu
      if (args) {
        fn.apply(null, args);
      } else {
        fn.call(null);
      }
      // Prevent ids from leaking
      exports.clearImmediate(id);
    }
  });

  return id;
};

exports.clearImmediate = typeof clearImmediate === "function" ? clearImmediate : function(id) {
  delete immediateIds[id];
};
}).call(this)}).call(this,require("timers").setImmediate,require("timers").clearImmediate)
},{"process/browser.js":4,"timers":5}],6:[function(require,module,exports){
var obelisk = require('@0xobelisk/aptos-client');

window.obelisk = obelisk;

},{"@0xobelisk/aptos-client":7}],7:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  AptosAccountManager: true,
  AptosContractFactory: true,
  AptosInteractor: true,
  Obelisk: true,
  getDefaultURL: true,
  loadMetadata: true
};
exports.getDefaultURL = exports.Obelisk = exports.AptosInteractor = exports.AptosContractFactory = exports.AptosAccountManager = void 0;
exports.loadMetadata = loadMetadata;
var _aptos = require("aptos");
Object.keys(_aptos).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _aptos[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _aptos[key];
    }
  });
});
var _bip = require("@scure/bip39");
var _english = require("@scure/bip39/wordlists/english");
var __accessCheck = (obj, member, msg) => {
  if (!member.has(obj)) throw TypeError("Cannot " + msg);
};
var __privateGet = (obj, member, getter) => {
  __accessCheck(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd = (obj, member, value) => {
  if (member.has(obj)) throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};

// src/index.ts

// src/obelisk.ts

// src/libs/aptosAccountManager/index.ts

// src/libs/aptosAccountManager/keypair.ts

var getDerivePathForAPTOS = (derivePathParams = {}) => {
  const {
    accountIndex = 0,
    isExternal = false,
    addressIndex = 0
  } = derivePathParams;
  return `m/44'/637'/${accountIndex}'/${isExternal ? 1 : 0}'/${addressIndex}'`;
};
var getKeyPair = (mnemonics, derivePathParams = {}) => {
  const derivePath = getDerivePathForAPTOS(derivePathParams);
  return _aptos.AptosAccount.fromDerivePath(derivePath, mnemonics);
};

// src/libs/aptosAccountManager/crypto.ts

var generateMnemonic = (numberOfWords = 24) => {
  const strength = numberOfWords === 12 ? 128 : 256;
  return (0, _bip.generateMnemonic)(_english.wordlist, strength);
};

// src/libs/aptosAccountManager/index.ts
var AptosAccountManager = class {
  /**
   * Support the following ways to init the SuiToolkit:
   * 1. mnemonics
   * 2. secretKey (base64 or hex)
   * If none of them is provided, will generate a random mnemonics with 24 words.
   *
   * @param mnemonics, 12 or 24 mnemonics words, separated by space
   * @param secretKey, base64 or hex string, when mnemonics is provided, secretKey will be ignored
   */
  constructor({
    mnemonics,
    secretKey
  } = {}) {
    this.mnemonics = mnemonics || "";
    this.secretKey = secretKey || "";
    if (!this.mnemonics && !this.secretKey) {
      this.mnemonics = generateMnemonic(24);
    }
    this.currentKeyPair = this.secretKey ? _aptos.AptosAccount.fromAptosAccountObject({
      privateKeyHex: secretKey
    }) : getKeyPair(this.mnemonics);
    this.currentAddress = this.currentKeyPair.address().toString();
  }
  /**
   * if derivePathParams is not provided or mnemonics is empty, it will return the currentKeyPair.
   * else:
   * it will generate keyPair from the mnemonic with the given derivePathParams.
   */
  getKeyPair(derivePathParams) {
    if (!derivePathParams || !this.mnemonics) return this.currentKeyPair;
    return getKeyPair(this.mnemonics, derivePathParams);
  }
  /**
   * if derivePathParams is not provided or mnemonics is empty, it will return the currentAddress.
   * else:
   * it will generate address from the mnemonic with the given derivePathParams.
   */
  getAddress(derivePathParams) {
    if (!derivePathParams || !this.mnemonics) return this.currentAddress;
    return getKeyPair(this.mnemonics, derivePathParams).address().toString();
  }
  /**
   * Switch the current account with the given derivePathParams.
   * This is only useful when the mnemonics is provided. For secretKey mode, it will always use the same account.
   */
  switchAccount(derivePathParams) {
    if (this.mnemonics) {
      this.currentKeyPair = getKeyPair(this.mnemonics, derivePathParams);
      this.currentAddress = this.currentKeyPair.address().toString();
    }
  }
};

// src/libs/aptosInteractor/aptosInteractor.ts

// src/libs/aptosInteractor/defaultConfig.ts
exports.AptosAccountManager = AptosAccountManager;
// src/types/index.ts
var NetworkNameToIndexerAPI = {
  mainnet: "https://api.mainnet.aptoslabs.com/v1/graphql",
  testnet: "https://api.testnet.aptoslabs.com/v1/graphql",
  devnet: "https://api.devnet.aptoslabs.com/v1/graphql",
  local: "http://127.0.0.1:8090/v1/graphql",
  movementmainnet: "",
  movementtestnet: "",
  movementdevnet: "",
  movementlocal: ""
};

// src/libs/aptosInteractor/defaultConfig.ts
var defaultGasBudget = 10 ** 8;
var getDefaultURL = (networkType = _aptos.Network.DEVNET) => {
  switch (networkType) {
    case _aptos.Network.LOCAL:
      return {
        fullNode: "http://127.0.0.1:8080",
        faucet: "http://127.0.0.1:8081"
      };
    case _aptos.Network.DEVNET:
      return {
        fullNode: "https://fullnode.devnet.aptoslabs.com",
        faucet: "https://faucet.devnet.aptoslabs.com"
      };
    case _aptos.Network.TESTNET:
      return {
        fullNode: "https://fullnode.testnet.aptoslabs.com",
        faucet: "https://faucet.testnet.aptoslabs.com"
      };
    case _aptos.Network.MAINNET:
      return {
        fullNode: "https://fullnode.mainnet.aptoslabs.com"
      };
    case "movementdevnet" /* DEVNET */:
      return {
        fullNode: "https://aptos.devnet.m1.movementlabs.xyz",
        faucet: "https://aptos.devnet.m1.movementlabs.xyz"
      };
    case "movementtestnet" /* TESTNET */:
      return {
        fullNode: "https://aptos.testnet.m1.movementlabs.xyz",
        faucet: "https://aptos.testnet.m1.movementlabs.xyz"
      };
    default:
      return {
        fullNode: "https://fullnode.devnet.aptoslabs.com",
        faucet: "https://faucet.devnet.aptoslabs.com"
      };
  }
};

// src/libs/aptosInteractor/util.ts
exports.getDefaultURL = getDefaultURL;
var delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// src/libs/aptosInteractor/aptosInteractor.ts
var {
  AccountAddress,
  EntryFunction,
  MultiSig,
  MultiSigTransactionPayload,
  TransactionPayloadMultisig
} = _aptos.TxnBuilderTypes;
var AptosInteractor = class {
  constructor(fullNodeUrls, network) {
    if (fullNodeUrls.length === 0) throw new Error("fullNodeUrls must not be empty");
    this.providers = fullNodeUrls.map(url => new _aptos.Provider({
      fullnodeUrl: url,
      indexerUrl: url
    }));
    this.currentProvider = this.providers[0];
    this.currentClient = new _aptos.AptosClient(fullNodeUrls[0]);
    this.network = network;
    if (network !== void 0 && network !== _aptos.Network.LOCAL && network !== "movementlocal" /* LOCAL */) {
      this.indexerClient = new _aptos.IndexerClient(NetworkNameToIndexerAPI[network]);
    }
  }
  switchToNextProvider() {
    const currentProviderIdx = this.providers.indexOf(this.currentProvider);
    this.currentProvider = this.providers[(currentProviderIdx + 1) % this.providers.length];
  }
  async signTransaction(sender, rawTxn) {
    try {
      const signedBcsTxn = await this.currentProvider.signTransaction(sender, rawTxn);
      return signedBcsTxn;
    } catch (err) {
      console.warn(`Failed to sign transaction: ${err}`);
      await delay(2e3);
    }
  }
  async submitTransaction(signedTxn) {
    try {
      const pendingTxn = await this.currentProvider.submitTransaction(signedTxn);
      return pendingTxn;
    } catch (err) {
      console.warn(`Failed to submit transaction: ${err}`);
      await delay(2e3);
    }
  }
  async waitForTransaction(txnHash) {
    try {
      await this.currentProvider.waitForTransaction(txnHash, {
        checkSuccess: true
      });
      return txnHash;
    } catch (err) {
      console.warn(`Failed to sign transaction: ${err}`);
      await delay(2e3);
    }
  }
  async sendTxWithPayload(signer, sender, payload) {
    for (const provider of this.providers) {
      try {
        const rawTxn = await provider.generateTransaction(sender, payload);
        const bcsTxn = _aptos.AptosClient.generateBCSTransaction(signer, rawTxn);
        const txnHash = await provider.submitSignedBCSTransaction(bcsTxn);
        return txnHash;
      } catch (err) {
        console.warn(`Failed to send transaction with fullnode ${provider.nodeUrl}: ${err}`);
        await delay(2e3);
      }
    }
    throw new Error("Failed to send transaction with all fullnodes");
  }
  async signAndSubmitTransaction(sender, rawTransaction) {
    for (const provider of this.providers) {
      try {
        const txnHash = await provider.signAndSubmitTransaction(sender, rawTransaction);
        return txnHash;
      } catch (err) {
        console.warn(`Failed to send transaction with fullnode ${provider.nodeUrl}: ${err}`);
        await delay(2e3);
      }
    }
    throw new Error("Failed to send transaction with all fullnodes");
  }
  async getAccountResources(accountAddress) {
    for (const provider of this.providers) {
      try {
        return provider.getAccountResources(accountAddress);
      } catch (err) {
        await delay(2e3);
        console.warn(`Failed to get AccountResources with fullnode ${provider.nodeUrl}: ${err}`);
      }
    }
    throw new Error("Failed to get AccountResources with all fullnodes");
  }
  async getAccountResource(accountAddress, resourceType, ledgerVersion) {
    for (const provider of this.providers) {
      try {
        let ledgerVersionBig;
        if (ledgerVersion !== void 0) {
          ledgerVersionBig = BigInt(ledgerVersion);
        }
        return provider.getAccountResource(accountAddress, resourceType, {
          ledgerVersion: ledgerVersionBig
        });
      } catch (err) {
        await delay(2e3);
        console.warn(`Failed to get AccountResource with fullnode ${provider.nodeUrl}: ${err}`);
      }
    }
    throw new Error("Failed to get AccountResource with all fullnodes");
  }
  async getAccountModule(accountAddress, moduleName, ledgerVersion) {
    for (const provider of this.providers) {
      try {
        let ledgerVersionBig;
        if (ledgerVersion !== void 0) {
          ledgerVersionBig = BigInt(ledgerVersion);
        }
        return provider.getAccountModule(accountAddress, moduleName, {
          ledgerVersion: ledgerVersionBig
        });
      } catch (err) {
        await delay(2e3);
        console.warn(`Failed to get AccountModule with fullnode ${provider.nodeUrl}: ${err}`);
      }
    }
    throw new Error("Failed to get AccountModule with all fullnodes");
  }
  async getAccountModules(accountAddress) {
    for (const provider of this.providers) {
      try {
        return provider.getAccountModules(accountAddress);
      } catch (err) {
        await delay(2e3);
        console.warn(`Failed to get AccountModules with fullnode ${provider.nodeUrl}: ${err}`);
      }
    }
    throw new Error("Failed to get AccountModules with all fullnodes");
  }
  async view(contractAddress, moduleName, funcName, typeArguments = [], args = []) {
    for (const provider of this.providers) {
      try {
        let request = {
          function: `${contractAddress}::${moduleName}::${funcName}`,
          type_arguments: typeArguments,
          arguments: args
        };
        return provider.view(request);
      } catch (err) {
        await delay(2e3);
        console.warn(`Failed to view with fullnode ${provider.nodeUrl}: ${err}`);
      }
    }
    throw new Error("Failed to view with all fullnodes");
  }
  // /**
  //  * @description Update objects in a batch
  //  * @param suiObjects
  //  */
  // async updateObjects(suiObjects: (SuiOwnedObject | SuiSharedObject)[]) {
  //   const objectIds = suiObjects.map((obj) => obj.objectId);
  //   const objects = await this.getObjects(objectIds);
  //   for (const object of objects) {
  //     const suiObject = suiObjects.find(
  //       (obj) => obj.objectId === object.objectId
  //     );
  //     if (suiObject instanceof SuiSharedObject) {
  //       suiObject.initialSharedVersion = object.initialSharedVersion;
  //     } else if (suiObject instanceof SuiOwnedObject) {
  //       suiObject.version = object.objectVersion;
  //       suiObject.digest = object.objectDigest;
  //     }
  //   }
  // }
  // /**
  //  * @description Select coins that add up to the given amount.
  //  * @param addr the address of the owner
  //  * @param amount the amount that is needed for the coin
  //  * @param coinType the coin type, default is '0x2::SUI::SUI'
  //  */
  // async selectCoins(
  //   addr: string,
  //   amount: number,
  //   coinType: string = '0x2::SUI::SUI'
  // ) {
  //   const selectedCoins: {
  //     objectId: string;
  //     digest: string;
  //     version: string;
  //   }[] = [];
  //   let totalAmount = 0;
  //   let hasNext = true,
  //     nextCursor: string | null = null;
  //   while (hasNext && totalAmount < amount) {
  //     const coins = await this.currentProvider.getCoins({
  //       owner: addr,
  //       coinType: coinType,
  //       cursor: nextCursor,
  //     });
  //     // Sort the coins by balance in descending order
  //     coins.data.sort((a, b) => parseInt(b.balance) - parseInt(a.balance));
  //     for (const coinData of coins.data) {
  //       selectedCoins.push({
  //         objectId: coinData.coinObjectId,
  //         digest: coinData.digest,
  //         version: coinData.version,
  //       });
  //       totalAmount = totalAmount + parseInt(coinData.balance);
  //       if (totalAmount >= amount) {
  //         break;
  //       }
  //     }
  //     nextCursor = coins.nextCursor;
  //     hasNext = coins.hasNextPage;
  //   }
  //   if (!selectedCoins.length) {
  //     throw new Error('No valid coins found for the transaction.');
  //   }
  //   return selectedCoins;
  // }
  async requestFaucet(network, accountAddress, amount) {
    const defaultUrl = getDefaultURL(network);
    if (defaultUrl.faucet === void 0) {
      return false;
    }
    try {
      const faucetClient = new _aptos.FaucetClient(defaultUrl.fullNode, defaultUrl.faucet);
      await faucetClient.fundAccount(accountAddress, amount);
      return true;
    } catch (err) {
      console.warn(`Failed to fund token with faucetClient: ${err}`);
    }
    return false;
  }
};

// src/libs/aptosContractFactory/index.ts
exports.AptosInteractor = AptosInteractor;
var AptosContractFactory = class {
  // readonly #query: MapMessageQuery<ApiTypes> = {};
  // readonly #tx: MapMessageTx<ApiTypes> = {};
  /**
   * Support the following ways to init the Aptos Obelisk:
   * 1. mnemonics
   * 2. secretKey (base64 or hex)
   * If none of them is provided, will generate a random mnemonics with 24 words.
   *
   * @param mnemonics, 12 or 24 mnemonics words, separated by space
   * @param secretKey, base64 or hex string, when mnemonics is provided, secretKey will be ignored
   */
  constructor({
    packageId,
    metadata
  } = {}) {
    this.packageId = packageId || "";
    this.metadata = metadata || void 0;
  }
  // getFuncByModuleName(moduleName: string) {
  //   Object.values(this.metadata as Types.MoveModule).forEach((value) => {
  //     const data = value as SuiMoveMoudleValueType;
  //     console.log(`moudle name: ${data.name}`);
  //     // console.log(data.exposedFunctions)
  //     Object.entries(data.exposedFunctions).forEach(([key, value]) => {
  //       console.log(`\tfunc name: ${key}`);
  //       Object.values(value.parameters).forEach((values) => {
  //         // console.log(values)
  //       });
  //     });
  //   });
  // }
  // getAllFunc() {
  //   Object.values(this.metadata as SuiMoveNormalizedModules).forEach(
  //     (value) => {
  //       const data = value as SuiMoveMoudleValueType;
  //       console.log(`moudle name: ${data.name}`);
  //       // console.log(data.exposedFunctions)
  //       Object.entries(data.exposedFunctions).forEach(([key, value]) => {
  //         console.log(`\tfunc name: ${key}`);
  //         console.log(`\t\t${value.parameters.length}`);
  //         Object.values(value.parameters).forEach((values) => {
  //           // console.log(values)
  //           console.log(`\t\targs: ${values}`);
  //         });
  //       });
  //     }
  //   );
  // }
  // getAllModule() {
  //   Object.values(this.metadata as SuiMoveNormalizedModules).forEach(
  //     (value, index) => {
  //       const data = value as SuiMoveMoudleValueType;
  //       console.log(`${index}. ${data.name}`);
  //     }
  //   );
  // }
  //   async call(arguments: ({
  //     kind: "Input";
  //     index: number;
  //     type?: "object" | "pure" | undefined;
  //     value?: any;
  // } | {
  //     kind: "GasCoin";
  // } | {
  //     kind: "Result";
  //     index: number;
  // } | {
  //     kind: "NestedResult";
  //     index: number;
  //     resultIndex: number;
  // })[], derivePathParams?: DerivePathParams) {
  //     const tx = new TransactionBlock();
  //     tx.moveCall({
  //       target: `${this.packageId}::${}::${}`,
  //       arguments,
  //     })
  //     return ;
  //   }
};

// src/obelisk.ts
exports.AptosContractFactory = AptosContractFactory;
var {
  AccountAddress: AccountAddress2,
  EntryFunction: EntryFunction2,
  MultiSig: MultiSig2,
  MultiSigTransactionPayload: MultiSigTransactionPayload2,
  TransactionPayloadMultisig: TransactionPayloadMultisig2
} = _aptos.TxnBuilderTypes;
function isUndefined(value) {
  return value === void 0;
}
function withMeta(meta, creator) {
  creator.meta = meta;
  return creator;
}
function createQuery(meta, fn) {
  return withMeta(meta, async (params, typeArguments) => {
    const result = await fn(params, typeArguments);
    return result;
  });
}
function createTx(meta, fn) {
  return withMeta(meta, async (sender, params, typeArguments, isRaw) => {
    const result = await fn(sender, params, typeArguments, isRaw);
    return result;
  });
}
var _query, _tx, _exec, _read;
var Obelisk = class {
  /**
   * Support the following ways to init the ObeliskClient:
   * 1. mnemonics
   * 2. secretKey (base64 or hex)
   * If none of them is provided, will generate a random mnemonics with 24 words.
   *
   * @param mnemonics, 12 or 24 mnemonics words, separated by space
   * @param secretKey, base64 or hex string, when mnemonics is provided, secretKey will be ignored
   * @param networkType, 'testnet' | 'mainnet' | 'devnet' | 'localnet', default is 'devnet'
   * @param fullnodeUrl, the fullnode url, default is the preconfig fullnode url for the given network type
   * @param packageId
   */
  constructor({
    mnemonics,
    secretKey,
    networkType,
    fullnodeUrls,
    packageId,
    metadata
  } = {}) {
    __privateAdd(this, _query, {});
    __privateAdd(this, _tx, {});
    __privateAdd(this, _exec, async (meta, sender, params, typeArguments, isRaw) => {
      if (typeArguments === void 0) {
        typeArguments = [];
      }
      if (params === void 0) {
        params = [];
      }
      const payload = await this.generatePayload(`${this.contractFactory.packageId}::${meta.moduleName}::${meta.funcName}`, typeArguments, params);
      if (isRaw === true) {
        return payload;
      }
      return await this.signAndSendTxnWithPayload(payload, sender);
    });
    __privateAdd(this, _read, async (meta, params, typeArguments) => {
      if (typeArguments === void 0) {
        typeArguments = [];
      }
      if (params === void 0) {
        params = [];
      }
      return this.aptosInteractor.view(meta.contractAddress, meta.moduleName, meta.funcName, typeArguments, params);
    });
    this.accountManager = new AptosAccountManager({
      mnemonics,
      secretKey
    });
    fullnodeUrls = fullnodeUrls || [getDefaultURL(networkType).fullNode];
    this.aptosInteractor = new AptosInteractor(fullnodeUrls, networkType);
    this.packageId = packageId;
    if (metadata !== void 0) {
      this.metadata = metadata;
      Object.values(metadata).forEach(metadataRes => {
        let contractAddress = metadataRes.address;
        let moduleName = metadataRes.name;
        Object.values(metadataRes.exposed_functions).forEach(value => {
          const meta = {
            contractAddress,
            moduleName,
            funcName: value.name,
            visibility: value.visibility,
            isEntry: value.is_entry,
            isView: value.is_view,
            typeParameters: value.generic_type_params,
            parameters: value.params,
            return: value.return
          };
          if (value.is_view) {
            if (isUndefined(__privateGet(this, _query)[moduleName])) {
              __privateGet(this, _query)[moduleName] = {};
            }
            if (isUndefined(__privateGet(this, _query)[moduleName][value.name])) {
              __privateGet(this, _query)[moduleName][value.name] = createQuery(meta, (p, type_p) => __privateGet(this, _read).call(this, meta, p, type_p));
            }
          }
          if (value.is_entry) {
            if (isUndefined(__privateGet(this, _tx)[moduleName])) {
              __privateGet(this, _tx)[moduleName] = {};
            }
            if (isUndefined(__privateGet(this, _tx)[moduleName][value.name])) {
              __privateGet(this, _tx)[moduleName][value.name] = createTx(meta, (s, p, type_p, isRaw) => __privateGet(this, _exec).call(this, meta, s, p, type_p, isRaw));
            }
          }
        });
      });
    }
    this.contractFactory = new AptosContractFactory({
      packageId,
      metadata
    });
  }
  get query() {
    return __privateGet(this, _query);
  }
  get tx() {
    return __privateGet(this, _tx);
  }
  /**
   * if derivePathParams is not provided or mnemonics is empty, it will return the currentSigner.
   * else:
   * it will generate signer from the mnemonic with the given derivePathParams.
   * @param derivePathParams, such as { accountIndex: 2, isExternal: false, addressIndex: 10 }, comply with the BIP44 standard
   */
  getSigner(derivePathParams) {
    const keyPair = this.accountManager.getKeyPair(derivePathParams);
    return keyPair;
  }
  /**
   * @description Switch the current account with the given derivePathParams
   * @param derivePathParams, such as { accountIndex: 2, isExternal: false, addressIndex: 10 }, comply with the BIP44 standard
   */
  switchAccount(derivePathParams) {
    this.accountManager.switchAccount(derivePathParams);
  }
  /**
   * @description Get the address of the account for the given derivePathParams
   * @param derivePathParams, such as { accountIndex: 2, isExternal: false, addressIndex: 10 }, comply with the BIP44 standard
   */
  getAddress(derivePathParams) {
    return this.accountManager.getAddress(derivePathParams);
  }
  currentAddress() {
    return this.accountManager.currentAddress;
  }
  provider() {
    return this.aptosInteractor.currentProvider;
  }
  getPackageId() {
    return this.contractFactory.packageId;
  }
  getMetadata() {
    return this.contractFactory.metadata;
  }
  /**
   * Request some APT from faucet
   * @Returns {Promise<boolean>}, true if the request is successful, false otherwise.
   */
  async requestFaucet(network, accountAddress, amount) {
    if (network === _aptos.Network.MAINNET) {
      return false;
    }
    if (accountAddress === void 0) {
      accountAddress = this.getAddress();
    }
    if (amount === void 0) {
      amount = 5e7;
    }
    return this.aptosInteractor.requestFaucet(network, accountAddress, amount);
  }
  async getBalance(accountAddress, coinType) {
    try {
      if (accountAddress === void 0) {
        accountAddress = this.getAddress();
      }
      if (coinType === void 0) {
        coinType = "0x1::aptos_coin::AptosCoin";
      }
      const resource = await this.aptosInteractor.getAccountResource(accountAddress, `0x1::coin::CoinStore<${coinType}>`);
      return parseInt(resource.data["coin"]["value"]);
    } catch (_) {
      return 0;
    }
  }
  async signAndSendTxnWithPayload(payload, sender, derivePathParams) {
    const signer = this.getSigner(derivePathParams);
    if (sender === void 0) {
      sender = signer.address();
    }
    if (typeof sender === "string") {
      sender = new _aptos.HexString(sender);
    }
    return this.aptosInteractor.sendTxWithPayload(signer, sender, payload);
  }
  async generatePayload(target, typeArguments, params) {
    const payload = {
      function: target,
      // `${contractAddress}::${moduleName}::${funcName}`
      type_arguments: typeArguments,
      arguments: params
    };
    return payload;
  }
  async generateTransaction(sender, contractAddress, moduleName, funcName, typeArguments, params) {
    const rawTxn = await this.aptosInteractor.currentClient.generateTransaction(sender, {
      function: `${contractAddress}::${moduleName}::${funcName}`,
      type_arguments: typeArguments,
      arguments: params
    });
    return rawTxn;
  }
  async waitForTransaction(txnHash) {
    return this.aptosInteractor.waitForTransaction(txnHash);
  }
  async signAndSendTxn(tx, derivePathParams) {
    const sender = this.getSigner(derivePathParams);
    return this.aptosInteractor.signAndSubmitTransaction(sender, tx);
  }
  async getEntity(schemaName, entityId) {
    const schemaModuleName = `${schemaName}_schema`;
    let params = [];
    if (entityId !== void 0) {
      params.push(entityId);
    }
    const result = await this.query[schemaModuleName].get(void 0, params);
    return result;
  }
  async containEntity(schemaName, entityId) {
    const schemaModuleName = `${schemaName}_schema`;
    let params = [];
    if (entityId !== void 0) {
      params.push(entityId);
    }
    const result = await this.query[schemaModuleName].contains(void 0, params);
    return result[0];
  }
};
exports.Obelisk = Obelisk;
_query = new WeakMap();
_tx = new WeakMap();
_exec = new WeakMap();
_read = new WeakMap();

// src/metadata/index.ts
async function loadMetadata(networkType, packageId) {
  const fullnodeUrls = [getDefaultURL(networkType).fullNode];
  const aptosInteractor = new AptosInteractor(fullnodeUrls);
  if (packageId !== void 0) {
    const jsonData = await aptosInteractor.getAccountModules(packageId);
    return jsonData.map(data => data.abi);
  } else {
    console.error("please set your package id.");
  }
}

},{"@scure/bip39":18,"@scure/bip39/wordlists/english":19,"aptos":20}],8:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isBytes = isBytes;
exports.number = number;
exports.bool = bool;
exports.bytes = bytes;
exports.hash = hash;
exports.exists = exists;
exports.output = output;
function number(n) {
    if (!Number.isSafeInteger(n) || n < 0)
        throw new Error(`positive integer expected, not ${n}`);
}
function bool(b) {
    if (typeof b !== 'boolean')
        throw new Error(`boolean expected, not ${b}`);
}
// copied from utils
function isBytes(a) {
    return (a instanceof Uint8Array ||
        (a != null && typeof a === 'object' && a.constructor.name === 'Uint8Array'));
}
function bytes(b, ...lengths) {
    if (!isBytes(b))
        throw new Error('Uint8Array expected');
    if (lengths.length > 0 && !lengths.includes(b.length))
        throw new Error(`Uint8Array expected of length ${lengths}, not of length=${b.length}`);
}
function hash(h) {
    if (typeof h !== 'function' || typeof h.create !== 'function')
        throw new Error('Hash should be wrapped by utils.wrapConstructor');
    number(h.outputLen);
    number(h.blockLen);
}
function exists(instance, checkFinished = true) {
    if (instance.destroyed)
        throw new Error('Hash instance has been destroyed');
    if (checkFinished && instance.finished)
        throw new Error('Hash#digest() has already been called');
}
function output(out, instance) {
    bytes(out);
    const min = instance.outputLen;
    if (out.length < min) {
        throw new Error(`digestInto() expects output buffer of length at least ${min}`);
    }
}
const assert = { number, bool, bytes, hash, exists, output };
exports.default = assert;

},{}],9:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HashMD = exports.Maj = exports.Chi = void 0;
const _assert_js_1 = require("./_assert.js");
const utils_js_1 = require("./utils.js");
/**
 * Polyfill for Safari 14
 */
function setBigUint64(view, byteOffset, value, isLE) {
    if (typeof view.setBigUint64 === 'function')
        return view.setBigUint64(byteOffset, value, isLE);
    const _32n = BigInt(32);
    const _u32_max = BigInt(0xffffffff);
    const wh = Number((value >> _32n) & _u32_max);
    const wl = Number(value & _u32_max);
    const h = isLE ? 4 : 0;
    const l = isLE ? 0 : 4;
    view.setUint32(byteOffset + h, wh, isLE);
    view.setUint32(byteOffset + l, wl, isLE);
}
/**
 * Choice: a ? b : c
 */
const Chi = (a, b, c) => (a & b) ^ (~a & c);
exports.Chi = Chi;
/**
 * Majority function, true if any two inputs is true
 */
const Maj = (a, b, c) => (a & b) ^ (a & c) ^ (b & c);
exports.Maj = Maj;
/**
 * Merkle-Damgard hash construction base class.
 * Could be used to create MD5, RIPEMD, SHA1, SHA2.
 */
class HashMD extends utils_js_1.Hash {
    constructor(blockLen, outputLen, padOffset, isLE) {
        super();
        this.blockLen = blockLen;
        this.outputLen = outputLen;
        this.padOffset = padOffset;
        this.isLE = isLE;
        this.finished = false;
        this.length = 0;
        this.pos = 0;
        this.destroyed = false;
        this.buffer = new Uint8Array(blockLen);
        this.view = (0, utils_js_1.createView)(this.buffer);
    }
    update(data) {
        (0, _assert_js_1.exists)(this);
        const { view, buffer, blockLen } = this;
        data = (0, utils_js_1.toBytes)(data);
        const len = data.length;
        for (let pos = 0; pos < len;) {
            const take = Math.min(blockLen - this.pos, len - pos);
            // Fast path: we have at least one block in input, cast it to view and process
            if (take === blockLen) {
                const dataView = (0, utils_js_1.createView)(data);
                for (; blockLen <= len - pos; pos += blockLen)
                    this.process(dataView, pos);
                continue;
            }
            buffer.set(data.subarray(pos, pos + take), this.pos);
            this.pos += take;
            pos += take;
            if (this.pos === blockLen) {
                this.process(view, 0);
                this.pos = 0;
            }
        }
        this.length += data.length;
        this.roundClean();
        return this;
    }
    digestInto(out) {
        (0, _assert_js_1.exists)(this);
        (0, _assert_js_1.output)(out, this);
        this.finished = true;
        // Padding
        // We can avoid allocation of buffer for padding completely if it
        // was previously not allocated here. But it won't change performance.
        const { buffer, view, blockLen, isLE } = this;
        let { pos } = this;
        // append the bit '1' to the message
        buffer[pos++] = 0b10000000;
        this.buffer.subarray(pos).fill(0);
        // we have less than padOffset left in buffer, so we cannot put length in
        // current block, need process it and pad again
        if (this.padOffset > blockLen - pos) {
            this.process(view, 0);
            pos = 0;
        }
        // Pad until full block byte with zeros
        for (let i = pos; i < blockLen; i++)
            buffer[i] = 0;
        // Note: sha512 requires length to be 128bit integer, but length in JS will overflow before that
        // You need to write around 2 exabytes (u64_max / 8 / (1024**6)) for this to happen.
        // So we just write lowest 64 bits of that value.
        setBigUint64(view, blockLen - 8, BigInt(this.length * 8), isLE);
        this.process(view, 0);
        const oview = (0, utils_js_1.createView)(out);
        const len = this.outputLen;
        // NOTE: we do division by 4 later, which should be fused in single op with modulo by JIT
        if (len % 4)
            throw new Error('_sha2: outputLen should be aligned to 32bit');
        const outLen = len / 4;
        const state = this.get();
        if (outLen > state.length)
            throw new Error('_sha2: outputLen bigger than state');
        for (let i = 0; i < outLen; i++)
            oview.setUint32(4 * i, state[i], isLE);
    }
    digest() {
        const { buffer, outputLen } = this;
        this.digestInto(buffer);
        const res = buffer.slice(0, outputLen);
        this.destroy();
        return res;
    }
    _cloneInto(to) {
        to || (to = new this.constructor());
        to.set(...this.get());
        const { blockLen, buffer, length, finished, destroyed, pos } = this;
        to.length = length;
        to.pos = pos;
        to.finished = finished;
        to.destroyed = destroyed;
        if (length % blockLen)
            to.buffer.set(buffer);
        return to;
    }
}
exports.HashMD = HashMD;

},{"./_assert.js":8,"./utils.js":16}],10:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.add5L = exports.add5H = exports.add4H = exports.add4L = exports.add3H = exports.add3L = exports.rotlBL = exports.rotlBH = exports.rotlSL = exports.rotlSH = exports.rotr32L = exports.rotr32H = exports.rotrBL = exports.rotrBH = exports.rotrSL = exports.rotrSH = exports.shrSL = exports.shrSH = exports.toBig = void 0;
exports.fromBig = fromBig;
exports.split = split;
exports.add = add;
const U32_MASK64 = /* @__PURE__ */ BigInt(2 ** 32 - 1);
const _32n = /* @__PURE__ */ BigInt(32);
// We are not using BigUint64Array, because they are extremely slow as per 2022
function fromBig(n, le = false) {
    if (le)
        return { h: Number(n & U32_MASK64), l: Number((n >> _32n) & U32_MASK64) };
    return { h: Number((n >> _32n) & U32_MASK64) | 0, l: Number(n & U32_MASK64) | 0 };
}
function split(lst, le = false) {
    let Ah = new Uint32Array(lst.length);
    let Al = new Uint32Array(lst.length);
    for (let i = 0; i < lst.length; i++) {
        const { h, l } = fromBig(lst[i], le);
        [Ah[i], Al[i]] = [h, l];
    }
    return [Ah, Al];
}
const toBig = (h, l) => (BigInt(h >>> 0) << _32n) | BigInt(l >>> 0);
exports.toBig = toBig;
// for Shift in [0, 32)
const shrSH = (h, _l, s) => h >>> s;
exports.shrSH = shrSH;
const shrSL = (h, l, s) => (h << (32 - s)) | (l >>> s);
exports.shrSL = shrSL;
// Right rotate for Shift in [1, 32)
const rotrSH = (h, l, s) => (h >>> s) | (l << (32 - s));
exports.rotrSH = rotrSH;
const rotrSL = (h, l, s) => (h << (32 - s)) | (l >>> s);
exports.rotrSL = rotrSL;
// Right rotate for Shift in (32, 64), NOTE: 32 is special case.
const rotrBH = (h, l, s) => (h << (64 - s)) | (l >>> (s - 32));
exports.rotrBH = rotrBH;
const rotrBL = (h, l, s) => (h >>> (s - 32)) | (l << (64 - s));
exports.rotrBL = rotrBL;
// Right rotate for shift===32 (just swaps l&h)
const rotr32H = (_h, l) => l;
exports.rotr32H = rotr32H;
const rotr32L = (h, _l) => h;
exports.rotr32L = rotr32L;
// Left rotate for Shift in [1, 32)
const rotlSH = (h, l, s) => (h << s) | (l >>> (32 - s));
exports.rotlSH = rotlSH;
const rotlSL = (h, l, s) => (l << s) | (h >>> (32 - s));
exports.rotlSL = rotlSL;
// Left rotate for Shift in (32, 64), NOTE: 32 is special case.
const rotlBH = (h, l, s) => (l << (s - 32)) | (h >>> (64 - s));
exports.rotlBH = rotlBH;
const rotlBL = (h, l, s) => (h << (s - 32)) | (l >>> (64 - s));
exports.rotlBL = rotlBL;
// JS uses 32-bit signed integers for bitwise operations which means we cannot
// simple take carry out of low bit sum by shift, we need to use division.
function add(Ah, Al, Bh, Bl) {
    const l = (Al >>> 0) + (Bl >>> 0);
    return { h: (Ah + Bh + ((l / 2 ** 32) | 0)) | 0, l: l | 0 };
}
// Addition with more than 2 elements
const add3L = (Al, Bl, Cl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0);
exports.add3L = add3L;
const add3H = (low, Ah, Bh, Ch) => (Ah + Bh + Ch + ((low / 2 ** 32) | 0)) | 0;
exports.add3H = add3H;
const add4L = (Al, Bl, Cl, Dl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0);
exports.add4L = add4L;
const add4H = (low, Ah, Bh, Ch, Dh) => (Ah + Bh + Ch + Dh + ((low / 2 ** 32) | 0)) | 0;
exports.add4H = add4H;
const add5L = (Al, Bl, Cl, Dl, El) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0) + (El >>> 0);
exports.add5L = add5L;
const add5H = (low, Ah, Bh, Ch, Dh, Eh) => (Ah + Bh + Ch + Dh + Eh + ((low / 2 ** 32) | 0)) | 0;
exports.add5H = add5H;
// prettier-ignore
const u64 = {
    fromBig, split, toBig,
    shrSH, shrSL,
    rotrSH, rotrSL, rotrBH, rotrBL,
    rotr32H, rotr32L,
    rotlSH, rotlSL, rotlBH, rotlBL,
    add, add3L, add3H, add4L, add4H, add5H, add5L,
};
exports.default = u64;

},{}],11:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.crypto = void 0;
exports.crypto = typeof globalThis === 'object' && 'crypto' in globalThis ? globalThis.crypto : undefined;

},{}],12:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.hmac = exports.HMAC = void 0;
const _assert_js_1 = require("./_assert.js");
const utils_js_1 = require("./utils.js");
// HMAC (RFC 2104)
class HMAC extends utils_js_1.Hash {
  constructor(hash, _key) {
    super();
    this.finished = false;
    this.destroyed = false;
    (0, _assert_js_1.hash)(hash);
    const key = (0, utils_js_1.toBytes)(_key);
    this.iHash = hash.create();
    if (typeof this.iHash.update !== 'function') throw new Error('Expected instance of class which extends utils.Hash');
    this.blockLen = this.iHash.blockLen;
    this.outputLen = this.iHash.outputLen;
    const blockLen = this.blockLen;
    const pad = new Uint8Array(blockLen);
    // blockLen can be bigger than outputLen
    pad.set(key.length > blockLen ? hash.create().update(key).digest() : key);
    for (let i = 0; i < pad.length; i++) pad[i] ^= 0x36;
    this.iHash.update(pad);
    // By doing update (processing of first block) of outer hash here we can re-use it between multiple calls via clone
    this.oHash = hash.create();
    // Undo internal XOR && apply outer XOR
    for (let i = 0; i < pad.length; i++) pad[i] ^= 0x36 ^ 0x5c;
    this.oHash.update(pad);
    pad.fill(0);
  }
  update(buf) {
    (0, _assert_js_1.exists)(this);
    this.iHash.update(buf);
    return this;
  }
  digestInto(out) {
    (0, _assert_js_1.exists)(this);
    (0, _assert_js_1.bytes)(out, this.outputLen);
    this.finished = true;
    this.iHash.digestInto(out);
    this.oHash.update(out);
    this.oHash.digestInto(out);
    this.destroy();
  }
  digest() {
    const out = new Uint8Array(this.oHash.outputLen);
    this.digestInto(out);
    return out;
  }
  _cloneInto(to) {
    // Create new instance without calling constructor since key already in state and we don't know it.
    to || (to = Object.create(Object.getPrototypeOf(this), {}));
    const {
      oHash,
      iHash,
      finished,
      destroyed,
      blockLen,
      outputLen
    } = this;
    to = to;
    to.finished = finished;
    to.destroyed = destroyed;
    to.blockLen = blockLen;
    to.outputLen = outputLen;
    to.oHash = oHash._cloneInto(to.oHash);
    to.iHash = iHash._cloneInto(to.iHash);
    return to;
  }
  destroy() {
    this.destroyed = true;
    this.oHash.destroy();
    this.iHash.destroy();
  }
}
exports.HMAC = HMAC;
/**
 * HMAC: RFC2104 message authentication code.
 * @param hash - function that would be used e.g. sha256
 * @param key - message key
 * @param message - message data
 * @example
 * import { hmac } from '@noble/hashes/hmac';
 * import { sha256 } from '@noble/hashes/sha2';
 * const mac1 = hmac(sha256, 'key', 'message');
 */
const hmac = (hash, key, message) => new HMAC(hash, key).update(message).digest();
exports.hmac = hmac;
exports.hmac.create = (hash, key) => new HMAC(hash, key);

},{"./_assert.js":8,"./utils.js":16}],13:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pbkdf2 = pbkdf2;
exports.pbkdf2Async = pbkdf2Async;
const _assert_js_1 = require("./_assert.js");
const hmac_js_1 = require("./hmac.js");
const utils_js_1 = require("./utils.js");
// Common prologue and epilogue for sync/async functions
function pbkdf2Init(hash, _password, _salt, _opts) {
    (0, _assert_js_1.hash)(hash);
    const opts = (0, utils_js_1.checkOpts)({ dkLen: 32, asyncTick: 10 }, _opts);
    const { c, dkLen, asyncTick } = opts;
    (0, _assert_js_1.number)(c);
    (0, _assert_js_1.number)(dkLen);
    (0, _assert_js_1.number)(asyncTick);
    if (c < 1)
        throw new Error('PBKDF2: iterations (c) should be >= 1');
    const password = (0, utils_js_1.toBytes)(_password);
    const salt = (0, utils_js_1.toBytes)(_salt);
    // DK = PBKDF2(PRF, Password, Salt, c, dkLen);
    const DK = new Uint8Array(dkLen);
    // U1 = PRF(Password, Salt + INT_32_BE(i))
    const PRF = hmac_js_1.hmac.create(hash, password);
    const PRFSalt = PRF._cloneInto().update(salt);
    return { c, dkLen, asyncTick, DK, PRF, PRFSalt };
}
function pbkdf2Output(PRF, PRFSalt, DK, prfW, u) {
    PRF.destroy();
    PRFSalt.destroy();
    if (prfW)
        prfW.destroy();
    u.fill(0);
    return DK;
}
/**
 * PBKDF2-HMAC: RFC 2898 key derivation function
 * @param hash - hash function that would be used e.g. sha256
 * @param password - password from which a derived key is generated
 * @param salt - cryptographic salt
 * @param opts - {c, dkLen} where c is work factor and dkLen is output message size
 */
function pbkdf2(hash, password, salt, opts) {
    const { c, dkLen, DK, PRF, PRFSalt } = pbkdf2Init(hash, password, salt, opts);
    let prfW; // Working copy
    const arr = new Uint8Array(4);
    const view = (0, utils_js_1.createView)(arr);
    const u = new Uint8Array(PRF.outputLen);
    // DK = T1 + T2 + ⋯ + Tdklen/hlen
    for (let ti = 1, pos = 0; pos < dkLen; ti++, pos += PRF.outputLen) {
        // Ti = F(Password, Salt, c, i)
        const Ti = DK.subarray(pos, pos + PRF.outputLen);
        view.setInt32(0, ti, false);
        // F(Password, Salt, c, i) = U1 ^ U2 ^ ⋯ ^ Uc
        // U1 = PRF(Password, Salt + INT_32_BE(i))
        (prfW = PRFSalt._cloneInto(prfW)).update(arr).digestInto(u);
        Ti.set(u.subarray(0, Ti.length));
        for (let ui = 1; ui < c; ui++) {
            // Uc = PRF(Password, Uc−1)
            PRF._cloneInto(prfW).update(u).digestInto(u);
            for (let i = 0; i < Ti.length; i++)
                Ti[i] ^= u[i];
        }
    }
    return pbkdf2Output(PRF, PRFSalt, DK, prfW, u);
}
async function pbkdf2Async(hash, password, salt, opts) {
    const { c, dkLen, asyncTick, DK, PRF, PRFSalt } = pbkdf2Init(hash, password, salt, opts);
    let prfW; // Working copy
    const arr = new Uint8Array(4);
    const view = (0, utils_js_1.createView)(arr);
    const u = new Uint8Array(PRF.outputLen);
    // DK = T1 + T2 + ⋯ + Tdklen/hlen
    for (let ti = 1, pos = 0; pos < dkLen; ti++, pos += PRF.outputLen) {
        // Ti = F(Password, Salt, c, i)
        const Ti = DK.subarray(pos, pos + PRF.outputLen);
        view.setInt32(0, ti, false);
        // F(Password, Salt, c, i) = U1 ^ U2 ^ ⋯ ^ Uc
        // U1 = PRF(Password, Salt + INT_32_BE(i))
        (prfW = PRFSalt._cloneInto(prfW)).update(arr).digestInto(u);
        Ti.set(u.subarray(0, Ti.length));
        await (0, utils_js_1.asyncLoop)(c - 1, asyncTick, () => {
            // Uc = PRF(Password, Uc−1)
            PRF._cloneInto(prfW).update(u).digestInto(u);
            for (let i = 0; i < Ti.length; i++)
                Ti[i] ^= u[i];
        });
    }
    return pbkdf2Output(PRF, PRFSalt, DK, prfW, u);
}

},{"./_assert.js":8,"./hmac.js":12,"./utils.js":16}],14:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha224 = exports.sha256 = exports.SHA256 = void 0;
const _md_js_1 = require("./_md.js");
const utils_js_1 = require("./utils.js");
// SHA2-256 need to try 2^128 hashes to execute birthday attack.
// BTC network is doing 2^67 hashes/sec as per early 2023.
// Round constants:
// first 32 bits of the fractional parts of the cube roots of the first 64 primes 2..311)
// prettier-ignore
const SHA256_K = /* @__PURE__ */ new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
]);
// Initial state:
// first 32 bits of the fractional parts of the square roots of the first 8 primes 2..19
// prettier-ignore
const SHA256_IV = /* @__PURE__ */ new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
]);
// Temporary buffer, not used to store anything between runs
// Named this way because it matches specification.
const SHA256_W = /* @__PURE__ */ new Uint32Array(64);
class SHA256 extends _md_js_1.HashMD {
    constructor() {
        super(64, 32, 8, false);
        // We cannot use array here since array allows indexing by variable
        // which means optimizer/compiler cannot use registers.
        this.A = SHA256_IV[0] | 0;
        this.B = SHA256_IV[1] | 0;
        this.C = SHA256_IV[2] | 0;
        this.D = SHA256_IV[3] | 0;
        this.E = SHA256_IV[4] | 0;
        this.F = SHA256_IV[5] | 0;
        this.G = SHA256_IV[6] | 0;
        this.H = SHA256_IV[7] | 0;
    }
    get() {
        const { A, B, C, D, E, F, G, H } = this;
        return [A, B, C, D, E, F, G, H];
    }
    // prettier-ignore
    set(A, B, C, D, E, F, G, H) {
        this.A = A | 0;
        this.B = B | 0;
        this.C = C | 0;
        this.D = D | 0;
        this.E = E | 0;
        this.F = F | 0;
        this.G = G | 0;
        this.H = H | 0;
    }
    process(view, offset) {
        // Extend the first 16 words into the remaining 48 words w[16..63] of the message schedule array
        for (let i = 0; i < 16; i++, offset += 4)
            SHA256_W[i] = view.getUint32(offset, false);
        for (let i = 16; i < 64; i++) {
            const W15 = SHA256_W[i - 15];
            const W2 = SHA256_W[i - 2];
            const s0 = (0, utils_js_1.rotr)(W15, 7) ^ (0, utils_js_1.rotr)(W15, 18) ^ (W15 >>> 3);
            const s1 = (0, utils_js_1.rotr)(W2, 17) ^ (0, utils_js_1.rotr)(W2, 19) ^ (W2 >>> 10);
            SHA256_W[i] = (s1 + SHA256_W[i - 7] + s0 + SHA256_W[i - 16]) | 0;
        }
        // Compression function main loop, 64 rounds
        let { A, B, C, D, E, F, G, H } = this;
        for (let i = 0; i < 64; i++) {
            const sigma1 = (0, utils_js_1.rotr)(E, 6) ^ (0, utils_js_1.rotr)(E, 11) ^ (0, utils_js_1.rotr)(E, 25);
            const T1 = (H + sigma1 + (0, _md_js_1.Chi)(E, F, G) + SHA256_K[i] + SHA256_W[i]) | 0;
            const sigma0 = (0, utils_js_1.rotr)(A, 2) ^ (0, utils_js_1.rotr)(A, 13) ^ (0, utils_js_1.rotr)(A, 22);
            const T2 = (sigma0 + (0, _md_js_1.Maj)(A, B, C)) | 0;
            H = G;
            G = F;
            F = E;
            E = (D + T1) | 0;
            D = C;
            C = B;
            B = A;
            A = (T1 + T2) | 0;
        }
        // Add the compressed chunk to the current hash value
        A = (A + this.A) | 0;
        B = (B + this.B) | 0;
        C = (C + this.C) | 0;
        D = (D + this.D) | 0;
        E = (E + this.E) | 0;
        F = (F + this.F) | 0;
        G = (G + this.G) | 0;
        H = (H + this.H) | 0;
        this.set(A, B, C, D, E, F, G, H);
    }
    roundClean() {
        SHA256_W.fill(0);
    }
    destroy() {
        this.set(0, 0, 0, 0, 0, 0, 0, 0);
        this.buffer.fill(0);
    }
}
exports.SHA256 = SHA256;
// Constants from https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.180-4.pdf
class SHA224 extends SHA256 {
    constructor() {
        super();
        this.A = 0xc1059ed8 | 0;
        this.B = 0x367cd507 | 0;
        this.C = 0x3070dd17 | 0;
        this.D = 0xf70e5939 | 0;
        this.E = 0xffc00b31 | 0;
        this.F = 0x68581511 | 0;
        this.G = 0x64f98fa7 | 0;
        this.H = 0xbefa4fa4 | 0;
        this.outputLen = 28;
    }
}
/**
 * SHA2-256 hash function
 * @param message - data that would be hashed
 */
exports.sha256 = (0, utils_js_1.wrapConstructor)(() => new SHA256());
/**
 * SHA2-224 hash function
 */
exports.sha224 = (0, utils_js_1.wrapConstructor)(() => new SHA224());

},{"./_md.js":9,"./utils.js":16}],15:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha384 = exports.sha512_256 = exports.sha512_224 = exports.sha512 = exports.SHA384 = exports.SHA512_256 = exports.SHA512_224 = exports.SHA512 = void 0;
const _md_js_1 = require("./_md.js");
const _u64_js_1 = require("./_u64.js");
const utils_js_1 = require("./utils.js");
// Round contants (first 32 bits of the fractional parts of the cube roots of the first 80 primes 2..409):
// prettier-ignore
const [SHA512_Kh, SHA512_Kl] = /* @__PURE__ */ (() => _u64_js_1.default.split([
    '0x428a2f98d728ae22', '0x7137449123ef65cd', '0xb5c0fbcfec4d3b2f', '0xe9b5dba58189dbbc',
    '0x3956c25bf348b538', '0x59f111f1b605d019', '0x923f82a4af194f9b', '0xab1c5ed5da6d8118',
    '0xd807aa98a3030242', '0x12835b0145706fbe', '0x243185be4ee4b28c', '0x550c7dc3d5ffb4e2',
    '0x72be5d74f27b896f', '0x80deb1fe3b1696b1', '0x9bdc06a725c71235', '0xc19bf174cf692694',
    '0xe49b69c19ef14ad2', '0xefbe4786384f25e3', '0x0fc19dc68b8cd5b5', '0x240ca1cc77ac9c65',
    '0x2de92c6f592b0275', '0x4a7484aa6ea6e483', '0x5cb0a9dcbd41fbd4', '0x76f988da831153b5',
    '0x983e5152ee66dfab', '0xa831c66d2db43210', '0xb00327c898fb213f', '0xbf597fc7beef0ee4',
    '0xc6e00bf33da88fc2', '0xd5a79147930aa725', '0x06ca6351e003826f', '0x142929670a0e6e70',
    '0x27b70a8546d22ffc', '0x2e1b21385c26c926', '0x4d2c6dfc5ac42aed', '0x53380d139d95b3df',
    '0x650a73548baf63de', '0x766a0abb3c77b2a8', '0x81c2c92e47edaee6', '0x92722c851482353b',
    '0xa2bfe8a14cf10364', '0xa81a664bbc423001', '0xc24b8b70d0f89791', '0xc76c51a30654be30',
    '0xd192e819d6ef5218', '0xd69906245565a910', '0xf40e35855771202a', '0x106aa07032bbd1b8',
    '0x19a4c116b8d2d0c8', '0x1e376c085141ab53', '0x2748774cdf8eeb99', '0x34b0bcb5e19b48a8',
    '0x391c0cb3c5c95a63', '0x4ed8aa4ae3418acb', '0x5b9cca4f7763e373', '0x682e6ff3d6b2b8a3',
    '0x748f82ee5defb2fc', '0x78a5636f43172f60', '0x84c87814a1f0ab72', '0x8cc702081a6439ec',
    '0x90befffa23631e28', '0xa4506cebde82bde9', '0xbef9a3f7b2c67915', '0xc67178f2e372532b',
    '0xca273eceea26619c', '0xd186b8c721c0c207', '0xeada7dd6cde0eb1e', '0xf57d4f7fee6ed178',
    '0x06f067aa72176fba', '0x0a637dc5a2c898a6', '0x113f9804bef90dae', '0x1b710b35131c471b',
    '0x28db77f523047d84', '0x32caab7b40c72493', '0x3c9ebe0a15c9bebc', '0x431d67c49c100d4c',
    '0x4cc5d4becb3e42b6', '0x597f299cfc657e2a', '0x5fcb6fab3ad6faec', '0x6c44198c4a475817'
].map(n => BigInt(n))))();
// Temporary buffer, not used to store anything between runs
const SHA512_W_H = /* @__PURE__ */ new Uint32Array(80);
const SHA512_W_L = /* @__PURE__ */ new Uint32Array(80);
class SHA512 extends _md_js_1.HashMD {
    constructor() {
        super(128, 64, 16, false);
        // We cannot use array here since array allows indexing by variable which means optimizer/compiler cannot use registers.
        // Also looks cleaner and easier to verify with spec.
        // Initial state (first 32 bits of the fractional parts of the square roots of the first 8 primes 2..19):
        // h -- high 32 bits, l -- low 32 bits
        this.Ah = 0x6a09e667 | 0;
        this.Al = 0xf3bcc908 | 0;
        this.Bh = 0xbb67ae85 | 0;
        this.Bl = 0x84caa73b | 0;
        this.Ch = 0x3c6ef372 | 0;
        this.Cl = 0xfe94f82b | 0;
        this.Dh = 0xa54ff53a | 0;
        this.Dl = 0x5f1d36f1 | 0;
        this.Eh = 0x510e527f | 0;
        this.El = 0xade682d1 | 0;
        this.Fh = 0x9b05688c | 0;
        this.Fl = 0x2b3e6c1f | 0;
        this.Gh = 0x1f83d9ab | 0;
        this.Gl = 0xfb41bd6b | 0;
        this.Hh = 0x5be0cd19 | 0;
        this.Hl = 0x137e2179 | 0;
    }
    // prettier-ignore
    get() {
        const { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
        return [Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl];
    }
    // prettier-ignore
    set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl) {
        this.Ah = Ah | 0;
        this.Al = Al | 0;
        this.Bh = Bh | 0;
        this.Bl = Bl | 0;
        this.Ch = Ch | 0;
        this.Cl = Cl | 0;
        this.Dh = Dh | 0;
        this.Dl = Dl | 0;
        this.Eh = Eh | 0;
        this.El = El | 0;
        this.Fh = Fh | 0;
        this.Fl = Fl | 0;
        this.Gh = Gh | 0;
        this.Gl = Gl | 0;
        this.Hh = Hh | 0;
        this.Hl = Hl | 0;
    }
    process(view, offset) {
        // Extend the first 16 words into the remaining 64 words w[16..79] of the message schedule array
        for (let i = 0; i < 16; i++, offset += 4) {
            SHA512_W_H[i] = view.getUint32(offset);
            SHA512_W_L[i] = view.getUint32((offset += 4));
        }
        for (let i = 16; i < 80; i++) {
            // s0 := (w[i-15] rightrotate 1) xor (w[i-15] rightrotate 8) xor (w[i-15] rightshift 7)
            const W15h = SHA512_W_H[i - 15] | 0;
            const W15l = SHA512_W_L[i - 15] | 0;
            const s0h = _u64_js_1.default.rotrSH(W15h, W15l, 1) ^ _u64_js_1.default.rotrSH(W15h, W15l, 8) ^ _u64_js_1.default.shrSH(W15h, W15l, 7);
            const s0l = _u64_js_1.default.rotrSL(W15h, W15l, 1) ^ _u64_js_1.default.rotrSL(W15h, W15l, 8) ^ _u64_js_1.default.shrSL(W15h, W15l, 7);
            // s1 := (w[i-2] rightrotate 19) xor (w[i-2] rightrotate 61) xor (w[i-2] rightshift 6)
            const W2h = SHA512_W_H[i - 2] | 0;
            const W2l = SHA512_W_L[i - 2] | 0;
            const s1h = _u64_js_1.default.rotrSH(W2h, W2l, 19) ^ _u64_js_1.default.rotrBH(W2h, W2l, 61) ^ _u64_js_1.default.shrSH(W2h, W2l, 6);
            const s1l = _u64_js_1.default.rotrSL(W2h, W2l, 19) ^ _u64_js_1.default.rotrBL(W2h, W2l, 61) ^ _u64_js_1.default.shrSL(W2h, W2l, 6);
            // SHA256_W[i] = s0 + s1 + SHA256_W[i - 7] + SHA256_W[i - 16];
            const SUMl = _u64_js_1.default.add4L(s0l, s1l, SHA512_W_L[i - 7], SHA512_W_L[i - 16]);
            const SUMh = _u64_js_1.default.add4H(SUMl, s0h, s1h, SHA512_W_H[i - 7], SHA512_W_H[i - 16]);
            SHA512_W_H[i] = SUMh | 0;
            SHA512_W_L[i] = SUMl | 0;
        }
        let { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
        // Compression function main loop, 80 rounds
        for (let i = 0; i < 80; i++) {
            // S1 := (e rightrotate 14) xor (e rightrotate 18) xor (e rightrotate 41)
            const sigma1h = _u64_js_1.default.rotrSH(Eh, El, 14) ^ _u64_js_1.default.rotrSH(Eh, El, 18) ^ _u64_js_1.default.rotrBH(Eh, El, 41);
            const sigma1l = _u64_js_1.default.rotrSL(Eh, El, 14) ^ _u64_js_1.default.rotrSL(Eh, El, 18) ^ _u64_js_1.default.rotrBL(Eh, El, 41);
            //const T1 = (H + sigma1 + Chi(E, F, G) + SHA256_K[i] + SHA256_W[i]) | 0;
            const CHIh = (Eh & Fh) ^ (~Eh & Gh);
            const CHIl = (El & Fl) ^ (~El & Gl);
            // T1 = H + sigma1 + Chi(E, F, G) + SHA512_K[i] + SHA512_W[i]
            // prettier-ignore
            const T1ll = _u64_js_1.default.add5L(Hl, sigma1l, CHIl, SHA512_Kl[i], SHA512_W_L[i]);
            const T1h = _u64_js_1.default.add5H(T1ll, Hh, sigma1h, CHIh, SHA512_Kh[i], SHA512_W_H[i]);
            const T1l = T1ll | 0;
            // S0 := (a rightrotate 28) xor (a rightrotate 34) xor (a rightrotate 39)
            const sigma0h = _u64_js_1.default.rotrSH(Ah, Al, 28) ^ _u64_js_1.default.rotrBH(Ah, Al, 34) ^ _u64_js_1.default.rotrBH(Ah, Al, 39);
            const sigma0l = _u64_js_1.default.rotrSL(Ah, Al, 28) ^ _u64_js_1.default.rotrBL(Ah, Al, 34) ^ _u64_js_1.default.rotrBL(Ah, Al, 39);
            const MAJh = (Ah & Bh) ^ (Ah & Ch) ^ (Bh & Ch);
            const MAJl = (Al & Bl) ^ (Al & Cl) ^ (Bl & Cl);
            Hh = Gh | 0;
            Hl = Gl | 0;
            Gh = Fh | 0;
            Gl = Fl | 0;
            Fh = Eh | 0;
            Fl = El | 0;
            ({ h: Eh, l: El } = _u64_js_1.default.add(Dh | 0, Dl | 0, T1h | 0, T1l | 0));
            Dh = Ch | 0;
            Dl = Cl | 0;
            Ch = Bh | 0;
            Cl = Bl | 0;
            Bh = Ah | 0;
            Bl = Al | 0;
            const All = _u64_js_1.default.add3L(T1l, sigma0l, MAJl);
            Ah = _u64_js_1.default.add3H(All, T1h, sigma0h, MAJh);
            Al = All | 0;
        }
        // Add the compressed chunk to the current hash value
        ({ h: Ah, l: Al } = _u64_js_1.default.add(this.Ah | 0, this.Al | 0, Ah | 0, Al | 0));
        ({ h: Bh, l: Bl } = _u64_js_1.default.add(this.Bh | 0, this.Bl | 0, Bh | 0, Bl | 0));
        ({ h: Ch, l: Cl } = _u64_js_1.default.add(this.Ch | 0, this.Cl | 0, Ch | 0, Cl | 0));
        ({ h: Dh, l: Dl } = _u64_js_1.default.add(this.Dh | 0, this.Dl | 0, Dh | 0, Dl | 0));
        ({ h: Eh, l: El } = _u64_js_1.default.add(this.Eh | 0, this.El | 0, Eh | 0, El | 0));
        ({ h: Fh, l: Fl } = _u64_js_1.default.add(this.Fh | 0, this.Fl | 0, Fh | 0, Fl | 0));
        ({ h: Gh, l: Gl } = _u64_js_1.default.add(this.Gh | 0, this.Gl | 0, Gh | 0, Gl | 0));
        ({ h: Hh, l: Hl } = _u64_js_1.default.add(this.Hh | 0, this.Hl | 0, Hh | 0, Hl | 0));
        this.set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl);
    }
    roundClean() {
        SHA512_W_H.fill(0);
        SHA512_W_L.fill(0);
    }
    destroy() {
        this.buffer.fill(0);
        this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    }
}
exports.SHA512 = SHA512;
class SHA512_224 extends SHA512 {
    constructor() {
        super();
        // h -- high 32 bits, l -- low 32 bits
        this.Ah = 0x8c3d37c8 | 0;
        this.Al = 0x19544da2 | 0;
        this.Bh = 0x73e19966 | 0;
        this.Bl = 0x89dcd4d6 | 0;
        this.Ch = 0x1dfab7ae | 0;
        this.Cl = 0x32ff9c82 | 0;
        this.Dh = 0x679dd514 | 0;
        this.Dl = 0x582f9fcf | 0;
        this.Eh = 0x0f6d2b69 | 0;
        this.El = 0x7bd44da8 | 0;
        this.Fh = 0x77e36f73 | 0;
        this.Fl = 0x04c48942 | 0;
        this.Gh = 0x3f9d85a8 | 0;
        this.Gl = 0x6a1d36c8 | 0;
        this.Hh = 0x1112e6ad | 0;
        this.Hl = 0x91d692a1 | 0;
        this.outputLen = 28;
    }
}
exports.SHA512_224 = SHA512_224;
class SHA512_256 extends SHA512 {
    constructor() {
        super();
        // h -- high 32 bits, l -- low 32 bits
        this.Ah = 0x22312194 | 0;
        this.Al = 0xfc2bf72c | 0;
        this.Bh = 0x9f555fa3 | 0;
        this.Bl = 0xc84c64c2 | 0;
        this.Ch = 0x2393b86b | 0;
        this.Cl = 0x6f53b151 | 0;
        this.Dh = 0x96387719 | 0;
        this.Dl = 0x5940eabd | 0;
        this.Eh = 0x96283ee2 | 0;
        this.El = 0xa88effe3 | 0;
        this.Fh = 0xbe5e1e25 | 0;
        this.Fl = 0x53863992 | 0;
        this.Gh = 0x2b0199fc | 0;
        this.Gl = 0x2c85b8aa | 0;
        this.Hh = 0x0eb72ddc | 0;
        this.Hl = 0x81c52ca2 | 0;
        this.outputLen = 32;
    }
}
exports.SHA512_256 = SHA512_256;
class SHA384 extends SHA512 {
    constructor() {
        super();
        // h -- high 32 bits, l -- low 32 bits
        this.Ah = 0xcbbb9d5d | 0;
        this.Al = 0xc1059ed8 | 0;
        this.Bh = 0x629a292a | 0;
        this.Bl = 0x367cd507 | 0;
        this.Ch = 0x9159015a | 0;
        this.Cl = 0x3070dd17 | 0;
        this.Dh = 0x152fecd8 | 0;
        this.Dl = 0xf70e5939 | 0;
        this.Eh = 0x67332667 | 0;
        this.El = 0xffc00b31 | 0;
        this.Fh = 0x8eb44a87 | 0;
        this.Fl = 0x68581511 | 0;
        this.Gh = 0xdb0c2e0d | 0;
        this.Gl = 0x64f98fa7 | 0;
        this.Hh = 0x47b5481d | 0;
        this.Hl = 0xbefa4fa4 | 0;
        this.outputLen = 48;
    }
}
exports.SHA384 = SHA384;
exports.sha512 = (0, utils_js_1.wrapConstructor)(() => new SHA512());
exports.sha512_224 = (0, utils_js_1.wrapConstructor)(() => new SHA512_224());
exports.sha512_256 = (0, utils_js_1.wrapConstructor)(() => new SHA512_256());
exports.sha384 = (0, utils_js_1.wrapConstructor)(() => new SHA384());

},{"./_md.js":9,"./_u64.js":10,"./utils.js":16}],16:[function(require,module,exports){
"use strict";

/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Hash = exports.nextTick = exports.byteSwapIfBE = exports.byteSwap = exports.isLE = exports.rotl = exports.rotr = exports.createView = exports.u32 = exports.u8 = void 0;
exports.isBytes = isBytes;
exports.byteSwap32 = byteSwap32;
exports.bytesToHex = bytesToHex;
exports.hexToBytes = hexToBytes;
exports.asyncLoop = asyncLoop;
exports.utf8ToBytes = utf8ToBytes;
exports.toBytes = toBytes;
exports.concatBytes = concatBytes;
exports.checkOpts = checkOpts;
exports.wrapConstructor = wrapConstructor;
exports.wrapConstructorWithOpts = wrapConstructorWithOpts;
exports.wrapXOFConstructorWithOpts = wrapXOFConstructorWithOpts;
exports.randomBytes = randomBytes;
// We use WebCrypto aka globalThis.crypto, which exists in browsers and node.js 16+.
// node.js versions earlier than v19 don't declare it in global scope.
// For node.js, package.json#exports field mapping rewrites import
// from `crypto` to `cryptoNode`, which imports native module.
// Makes the utils un-importable in browsers without a bundler.
// Once node.js 18 is deprecated (2025-04-30), we can just drop the import.
const crypto_1 = require("@noble/hashes/crypto");
const _assert_js_1 = require("./_assert.js");
// export { isBytes } from './_assert.js';
// We can't reuse isBytes from _assert, because somehow this causes huge perf issues
function isBytes(a) {
  return a instanceof Uint8Array || a != null && typeof a === 'object' && a.constructor.name === 'Uint8Array';
}
// Cast array to different type
const u8 = arr => new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
exports.u8 = u8;
const u32 = arr => new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
exports.u32 = u32;
// Cast array to view
const createView = arr => new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
exports.createView = createView;
// The rotate right (circular right shift) operation for uint32
const rotr = (word, shift) => word << 32 - shift | word >>> shift;
exports.rotr = rotr;
// The rotate left (circular left shift) operation for uint32
const rotl = (word, shift) => word << shift | word >>> 32 - shift >>> 0;
exports.rotl = rotl;
exports.isLE = new Uint8Array(new Uint32Array([0x11223344]).buffer)[0] === 0x44;
// The byte swap operation for uint32
const byteSwap = word => word << 24 & 0xff000000 | word << 8 & 0xff0000 | word >>> 8 & 0xff00 | word >>> 24 & 0xff;
exports.byteSwap = byteSwap;
// Conditionally byte swap if on a big-endian platform
exports.byteSwapIfBE = exports.isLE ? n => n : n => (0, exports.byteSwap)(n);
// In place byte swap for Uint32Array
function byteSwap32(arr) {
  for (let i = 0; i < arr.length; i++) {
    arr[i] = (0, exports.byteSwap)(arr[i]);
  }
}
// Array where index 0xf0 (240) is mapped to string 'f0'
const hexes = /* @__PURE__ */Array.from({
  length: 256
}, (_, i) => i.toString(16).padStart(2, '0'));
/**
 * @example bytesToHex(Uint8Array.from([0xca, 0xfe, 0x01, 0x23])) // 'cafe0123'
 */
function bytesToHex(bytes) {
  (0, _assert_js_1.bytes)(bytes);
  // pre-caching improves the speed 6x
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += hexes[bytes[i]];
  }
  return hex;
}
// We use optimized technique to convert hex string to byte array
const asciis = {
  _0: 48,
  _9: 57,
  _A: 65,
  _F: 70,
  _a: 97,
  _f: 102
};
function asciiToBase16(char) {
  if (char >= asciis._0 && char <= asciis._9) return char - asciis._0;
  if (char >= asciis._A && char <= asciis._F) return char - (asciis._A - 10);
  if (char >= asciis._a && char <= asciis._f) return char - (asciis._a - 10);
  return;
}
/**
 * @example hexToBytes('cafe0123') // Uint8Array.from([0xca, 0xfe, 0x01, 0x23])
 */
function hexToBytes(hex) {
  if (typeof hex !== 'string') throw new Error('hex string expected, got ' + typeof hex);
  const hl = hex.length;
  const al = hl / 2;
  if (hl % 2) throw new Error('padded hex string expected, got unpadded hex of length ' + hl);
  const array = new Uint8Array(al);
  for (let ai = 0, hi = 0; ai < al; ai++, hi += 2) {
    const n1 = asciiToBase16(hex.charCodeAt(hi));
    const n2 = asciiToBase16(hex.charCodeAt(hi + 1));
    if (n1 === undefined || n2 === undefined) {
      const char = hex[hi] + hex[hi + 1];
      throw new Error('hex string expected, got non-hex character "' + char + '" at index ' + hi);
    }
    array[ai] = n1 * 16 + n2;
  }
  return array;
}
// There is no setImmediate in browser and setTimeout is slow.
// call of async fn will return Promise, which will be fullfiled only on
// next scheduler queue processing step and this is exactly what we need.
const nextTick = async () => {};
exports.nextTick = nextTick;
// Returns control to thread each 'tick' ms to avoid blocking
async function asyncLoop(iters, tick, cb) {
  let ts = Date.now();
  for (let i = 0; i < iters; i++) {
    cb(i);
    // Date.now() is not monotonic, so in case if clock goes backwards we return return control too
    const diff = Date.now() - ts;
    if (diff >= 0 && diff < tick) continue;
    await (0, exports.nextTick)();
    ts += diff;
  }
}
/**
 * @example utf8ToBytes('abc') // new Uint8Array([97, 98, 99])
 */
function utf8ToBytes(str) {
  if (typeof str !== 'string') throw new Error(`utf8ToBytes expected string, got ${typeof str}`);
  return new Uint8Array(new TextEncoder().encode(str)); // https://bugzil.la/1681809
}
/**
 * Normalizes (non-hex) string or Uint8Array to Uint8Array.
 * Warning: when Uint8Array is passed, it would NOT get copied.
 * Keep in mind for future mutable operations.
 */
function toBytes(data) {
  if (typeof data === 'string') data = utf8ToBytes(data);
  (0, _assert_js_1.bytes)(data);
  return data;
}
/**
 * Copies several Uint8Arrays into one.
 */
function concatBytes(...arrays) {
  let sum = 0;
  for (let i = 0; i < arrays.length; i++) {
    const a = arrays[i];
    (0, _assert_js_1.bytes)(a);
    sum += a.length;
  }
  const res = new Uint8Array(sum);
  for (let i = 0, pad = 0; i < arrays.length; i++) {
    const a = arrays[i];
    res.set(a, pad);
    pad += a.length;
  }
  return res;
}
// For runtime check if class implements interface
class Hash {
  // Safe version that clones internal state
  clone() {
    return this._cloneInto();
  }
}
exports.Hash = Hash;
const toStr = {}.toString;
function checkOpts(defaults, opts) {
  if (opts !== undefined && toStr.call(opts) !== '[object Object]') throw new Error('Options should be object or undefined');
  const merged = Object.assign(defaults, opts);
  return merged;
}
function wrapConstructor(hashCons) {
  const hashC = msg => hashCons().update(toBytes(msg)).digest();
  const tmp = hashCons();
  hashC.outputLen = tmp.outputLen;
  hashC.blockLen = tmp.blockLen;
  hashC.create = () => hashCons();
  return hashC;
}
function wrapConstructorWithOpts(hashCons) {
  const hashC = (msg, opts) => hashCons(opts).update(toBytes(msg)).digest();
  const tmp = hashCons({});
  hashC.outputLen = tmp.outputLen;
  hashC.blockLen = tmp.blockLen;
  hashC.create = opts => hashCons(opts);
  return hashC;
}
function wrapXOFConstructorWithOpts(hashCons) {
  const hashC = (msg, opts) => hashCons(opts).update(toBytes(msg)).digest();
  const tmp = hashCons({});
  hashC.outputLen = tmp.outputLen;
  hashC.blockLen = tmp.blockLen;
  hashC.create = opts => hashCons(opts);
  return hashC;
}
/**
 * Secure PRNG. Uses `crypto.getRandomValues`, which defers to OS.
 */
function randomBytes(bytesLength = 32) {
  if (crypto_1.crypto && typeof crypto_1.crypto.getRandomValues === 'function') {
    return crypto_1.crypto.getRandomValues(new Uint8Array(bytesLength));
  }
  // Legacy Node.js compatibility
  if (crypto_1.crypto && typeof crypto_1.crypto.randomBytes === 'function') {
    return crypto_1.crypto.randomBytes(bytesLength);
  }
  throw new Error('crypto.getRandomValues must be defined');
}

},{"./_assert.js":8,"@noble/hashes/crypto":11}],17:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.assertNumber = assertNumber;
exports.utils = exports.utf8 = exports.stringToBytes = exports.str = exports.hex = exports.createBase58check = exports.bytesToString = exports.bytes = exports.bech32m = exports.bech32 = exports.base64urlnopad = exports.base64url = exports.base64nopad = exports.base64 = exports.base58xrp = exports.base58xmr = exports.base58flickr = exports.base58check = exports.base58 = exports.base32nopad = exports.base32hexnopad = exports.base32hex = exports.base32crockford = exports.base32 = exports.base16 = void 0;
/*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) */
// Utilities
/**
 * @__NO_SIDE_EFFECTS__
 */
function assertNumber(n) {
  if (!Number.isSafeInteger(n)) throw new Error(`Wrong integer: ${n}`);
}
function isBytes(a) {
  return a instanceof Uint8Array || a != null && typeof a === 'object' && a.constructor.name === 'Uint8Array';
}
/**
 * @__NO_SIDE_EFFECTS__
 */
function chain(...args) {
  const id = a => a;
  // Wrap call in closure so JIT can inline calls
  const wrap = (a, b) => c => a(b(c));
  // Construct chain of args[-1].encode(args[-2].encode([...]))
  const encode = args.map(x => x.encode).reduceRight(wrap, id);
  // Construct chain of args[0].decode(args[1].decode(...))
  const decode = args.map(x => x.decode).reduce(wrap, id);
  return {
    encode,
    decode
  };
}
/**
 * Encodes integer radix representation to array of strings using alphabet and back
 * @__NO_SIDE_EFFECTS__
 */
function alphabet(alphabet) {
  return {
    encode: digits => {
      if (!Array.isArray(digits) || digits.length && typeof digits[0] !== 'number') throw new Error('alphabet.encode input should be an array of numbers');
      return digits.map(i => {
        assertNumber(i);
        if (i < 0 || i >= alphabet.length) throw new Error(`Digit index outside alphabet: ${i} (alphabet: ${alphabet.length})`);
        return alphabet[i];
      });
    },
    decode: input => {
      if (!Array.isArray(input) || input.length && typeof input[0] !== 'string') throw new Error('alphabet.decode input should be array of strings');
      return input.map(letter => {
        if (typeof letter !== 'string') throw new Error(`alphabet.decode: not string element=${letter}`);
        const index = alphabet.indexOf(letter);
        if (index === -1) throw new Error(`Unknown letter: "${letter}". Allowed: ${alphabet}`);
        return index;
      });
    }
  };
}
/**
 * @__NO_SIDE_EFFECTS__
 */
function join(separator = '') {
  if (typeof separator !== 'string') throw new Error('join separator should be string');
  return {
    encode: from => {
      if (!Array.isArray(from) || from.length && typeof from[0] !== 'string') throw new Error('join.encode input should be array of strings');
      for (let i of from) if (typeof i !== 'string') throw new Error(`join.encode: non-string input=${i}`);
      return from.join(separator);
    },
    decode: to => {
      if (typeof to !== 'string') throw new Error('join.decode input should be string');
      return to.split(separator);
    }
  };
}
/**
 * Pad strings array so it has integer number of bits
 * @__NO_SIDE_EFFECTS__
 */
function padding(bits, chr = '=') {
  assertNumber(bits);
  if (typeof chr !== 'string') throw new Error('padding chr should be string');
  return {
    encode(data) {
      if (!Array.isArray(data) || data.length && typeof data[0] !== 'string') throw new Error('padding.encode input should be array of strings');
      for (let i of data) if (typeof i !== 'string') throw new Error(`padding.encode: non-string input=${i}`);
      while (data.length * bits % 8) data.push(chr);
      return data;
    },
    decode(input) {
      if (!Array.isArray(input) || input.length && typeof input[0] !== 'string') throw new Error('padding.encode input should be array of strings');
      for (let i of input) if (typeof i !== 'string') throw new Error(`padding.decode: non-string input=${i}`);
      let end = input.length;
      if (end * bits % 8) throw new Error('Invalid padding: string should have whole number of bytes');
      for (; end > 0 && input[end - 1] === chr; end--) {
        if (!((end - 1) * bits % 8)) throw new Error('Invalid padding: string has too much padding');
      }
      return input.slice(0, end);
    }
  };
}
/**
 * @__NO_SIDE_EFFECTS__
 */
function normalize(fn) {
  if (typeof fn !== 'function') throw new Error('normalize fn should be function');
  return {
    encode: from => from,
    decode: to => fn(to)
  };
}
/**
 * Slow: O(n^2) time complexity
 * @__NO_SIDE_EFFECTS__
 */
function convertRadix(data, from, to) {
  // base 1 is impossible
  if (from < 2) throw new Error(`convertRadix: wrong from=${from}, base cannot be less than 2`);
  if (to < 2) throw new Error(`convertRadix: wrong to=${to}, base cannot be less than 2`);
  if (!Array.isArray(data)) throw new Error('convertRadix: data should be array');
  if (!data.length) return [];
  let pos = 0;
  const res = [];
  const digits = Array.from(data);
  digits.forEach(d => {
    assertNumber(d);
    if (d < 0 || d >= from) throw new Error(`Wrong integer: ${d}`);
  });
  while (true) {
    let carry = 0;
    let done = true;
    for (let i = pos; i < digits.length; i++) {
      const digit = digits[i];
      const digitBase = from * carry + digit;
      if (!Number.isSafeInteger(digitBase) || from * carry / from !== carry || digitBase - digit !== from * carry) {
        throw new Error('convertRadix: carry overflow');
      }
      carry = digitBase % to;
      const rounded = Math.floor(digitBase / to);
      digits[i] = rounded;
      if (!Number.isSafeInteger(rounded) || rounded * to + carry !== digitBase) throw new Error('convertRadix: carry overflow');
      if (!done) continue;else if (!rounded) pos = i;else done = false;
    }
    res.push(carry);
    if (done) break;
  }
  for (let i = 0; i < data.length - 1 && data[i] === 0; i++) res.push(0);
  return res.reverse();
}
const gcd = /* @__NO_SIDE_EFFECTS__ */(a, b) => !b ? a : gcd(b, a % b);
const radix2carry = /*@__NO_SIDE_EFFECTS__ */(from, to) => from + (to - gcd(from, to));
/**
 * Implemented with numbers, because BigInt is 5x slower
 * @__NO_SIDE_EFFECTS__
 */
function convertRadix2(data, from, to, padding) {
  if (!Array.isArray(data)) throw new Error('convertRadix2: data should be array');
  if (from <= 0 || from > 32) throw new Error(`convertRadix2: wrong from=${from}`);
  if (to <= 0 || to > 32) throw new Error(`convertRadix2: wrong to=${to}`);
  if (radix2carry(from, to) > 32) {
    throw new Error(`convertRadix2: carry overflow from=${from} to=${to} carryBits=${radix2carry(from, to)}`);
  }
  let carry = 0;
  let pos = 0; // bitwise position in current element
  const mask = 2 ** to - 1;
  const res = [];
  for (const n of data) {
    assertNumber(n);
    if (n >= 2 ** from) throw new Error(`convertRadix2: invalid data word=${n} from=${from}`);
    carry = carry << from | n;
    if (pos + from > 32) throw new Error(`convertRadix2: carry overflow pos=${pos} from=${from}`);
    pos += from;
    for (; pos >= to; pos -= to) res.push((carry >> pos - to & mask) >>> 0);
    carry &= 2 ** pos - 1; // clean carry, otherwise it will cause overflow
  }
  carry = carry << to - pos & mask;
  if (!padding && pos >= from) throw new Error('Excess padding');
  if (!padding && carry) throw new Error(`Non-zero padding: ${carry}`);
  if (padding && pos > 0) res.push(carry >>> 0);
  return res;
}
/**
 * @__NO_SIDE_EFFECTS__
 */
function radix(num) {
  assertNumber(num);
  return {
    encode: bytes => {
      if (!isBytes(bytes)) throw new Error('radix.encode input should be Uint8Array');
      return convertRadix(Array.from(bytes), 2 ** 8, num);
    },
    decode: digits => {
      if (!Array.isArray(digits) || digits.length && typeof digits[0] !== 'number') throw new Error('radix.decode input should be array of numbers');
      return Uint8Array.from(convertRadix(digits, num, 2 ** 8));
    }
  };
}
/**
 * If both bases are power of same number (like `2**8 <-> 2**64`),
 * there is a linear algorithm. For now we have implementation for power-of-two bases only.
 * @__NO_SIDE_EFFECTS__
 */
function radix2(bits, revPadding = false) {
  assertNumber(bits);
  if (bits <= 0 || bits > 32) throw new Error('radix2: bits should be in (0..32]');
  if (radix2carry(8, bits) > 32 || radix2carry(bits, 8) > 32) throw new Error('radix2: carry overflow');
  return {
    encode: bytes => {
      if (!isBytes(bytes)) throw new Error('radix2.encode input should be Uint8Array');
      return convertRadix2(Array.from(bytes), 8, bits, !revPadding);
    },
    decode: digits => {
      if (!Array.isArray(digits) || digits.length && typeof digits[0] !== 'number') throw new Error('radix2.decode input should be array of numbers');
      return Uint8Array.from(convertRadix2(digits, bits, 8, revPadding));
    }
  };
}
/**
 * @__NO_SIDE_EFFECTS__
 */
function unsafeWrapper(fn) {
  if (typeof fn !== 'function') throw new Error('unsafeWrapper fn should be function');
  return function (...args) {
    try {
      return fn.apply(null, args);
    } catch (e) {}
  };
}
/**
 * @__NO_SIDE_EFFECTS__
 */
function checksum(len, fn) {
  assertNumber(len);
  if (typeof fn !== 'function') throw new Error('checksum fn should be function');
  return {
    encode(data) {
      if (!isBytes(data)) throw new Error('checksum.encode: input should be Uint8Array');
      const checksum = fn(data).slice(0, len);
      const res = new Uint8Array(data.length + len);
      res.set(data);
      res.set(checksum, data.length);
      return res;
    },
    decode(data) {
      if (!isBytes(data)) throw new Error('checksum.decode: input should be Uint8Array');
      const payload = data.slice(0, -len);
      const newChecksum = fn(payload).slice(0, len);
      const oldChecksum = data.slice(-len);
      for (let i = 0; i < len; i++) if (newChecksum[i] !== oldChecksum[i]) throw new Error('Invalid checksum');
      return payload;
    }
  };
}
// prettier-ignore
const utils = exports.utils = {
  alphabet,
  chain,
  checksum,
  convertRadix,
  convertRadix2,
  radix,
  radix2,
  join,
  padding
};
// RFC 4648 aka RFC 3548
// ---------------------
const base16 = exports.base16 = /* @__PURE__ */chain(radix2(4), alphabet('0123456789ABCDEF'), join(''));
const base32 = exports.base32 = /* @__PURE__ */chain(radix2(5), alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'), padding(5), join(''));
const base32nopad = exports.base32nopad = /* @__PURE__ */chain(radix2(5), alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'), join(''));
const base32hex = exports.base32hex = /* @__PURE__ */chain(radix2(5), alphabet('0123456789ABCDEFGHIJKLMNOPQRSTUV'), padding(5), join(''));
const base32hexnopad = exports.base32hexnopad = /* @__PURE__ */chain(radix2(5), alphabet('0123456789ABCDEFGHIJKLMNOPQRSTUV'), join(''));
const base32crockford = exports.base32crockford = /* @__PURE__ */chain(radix2(5), alphabet('0123456789ABCDEFGHJKMNPQRSTVWXYZ'), join(''), normalize(s => s.toUpperCase().replace(/O/g, '0').replace(/[IL]/g, '1')));
const base64 = exports.base64 = /* @__PURE__ */chain(radix2(6), alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'), padding(6), join(''));
const base64nopad = exports.base64nopad = /* @__PURE__ */chain(radix2(6), alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'), join(''));
const base64url = exports.base64url = /* @__PURE__ */chain(radix2(6), alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'), padding(6), join(''));
const base64urlnopad = exports.base64urlnopad = /* @__PURE__ */chain(radix2(6), alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'), join(''));
// base58 code
// -----------
const genBase58 = abc => chain(radix(58), alphabet(abc), join(''));
const base58 = exports.base58 = /* @__PURE__ */genBase58('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz');
const base58flickr = exports.base58flickr = /* @__PURE__ */genBase58('123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ');
const base58xrp = exports.base58xrp = /* @__PURE__ */genBase58('rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz');
// xmr ver is done in 8-byte blocks (which equals 11 chars in decoding). Last (non-full) block padded with '1' to size in XMR_BLOCK_LEN.
// Block encoding significantly reduces quadratic complexity of base58.
// Data len (index) -> encoded block len
const XMR_BLOCK_LEN = [0, 2, 3, 5, 6, 7, 9, 10, 11];
const base58xmr = exports.base58xmr = {
  encode(data) {
    let res = '';
    for (let i = 0; i < data.length; i += 8) {
      const block = data.subarray(i, i + 8);
      res += base58.encode(block).padStart(XMR_BLOCK_LEN[block.length], '1');
    }
    return res;
  },
  decode(str) {
    let res = [];
    for (let i = 0; i < str.length; i += 11) {
      const slice = str.slice(i, i + 11);
      const blockLen = XMR_BLOCK_LEN.indexOf(slice.length);
      const block = base58.decode(slice);
      for (let j = 0; j < block.length - blockLen; j++) {
        if (block[j] !== 0) throw new Error('base58xmr: wrong padding');
      }
      res = res.concat(Array.from(block.slice(block.length - blockLen)));
    }
    return Uint8Array.from(res);
  }
};
const createBase58check = sha256 => chain(checksum(4, data => sha256(sha256(data))), base58);
// legacy export, bad name
exports.createBase58check = createBase58check;
const base58check = exports.base58check = createBase58check;
const BECH_ALPHABET = /* @__PURE__ */chain(alphabet('qpzry9x8gf2tvdw0s3jn54khce6mua7l'), join(''));
const POLYMOD_GENERATORS = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
/**
 * @__NO_SIDE_EFFECTS__
 */
function bech32Polymod(pre) {
  const b = pre >> 25;
  let chk = (pre & 0x1ffffff) << 5;
  for (let i = 0; i < POLYMOD_GENERATORS.length; i++) {
    if ((b >> i & 1) === 1) chk ^= POLYMOD_GENERATORS[i];
  }
  return chk;
}
/**
 * @__NO_SIDE_EFFECTS__
 */
function bechChecksum(prefix, words, encodingConst = 1) {
  const len = prefix.length;
  let chk = 1;
  for (let i = 0; i < len; i++) {
    const c = prefix.charCodeAt(i);
    if (c < 33 || c > 126) throw new Error(`Invalid prefix (${prefix})`);
    chk = bech32Polymod(chk) ^ c >> 5;
  }
  chk = bech32Polymod(chk);
  for (let i = 0; i < len; i++) chk = bech32Polymod(chk) ^ prefix.charCodeAt(i) & 0x1f;
  for (let v of words) chk = bech32Polymod(chk) ^ v;
  for (let i = 0; i < 6; i++) chk = bech32Polymod(chk);
  chk ^= encodingConst;
  return BECH_ALPHABET.encode(convertRadix2([chk % 2 ** 30], 30, 5, false));
}
/**
 * @__NO_SIDE_EFFECTS__
 */
function genBech32(encoding) {
  const ENCODING_CONST = encoding === 'bech32' ? 1 : 0x2bc830a3;
  const _words = radix2(5);
  const fromWords = _words.decode;
  const toWords = _words.encode;
  const fromWordsUnsafe = unsafeWrapper(fromWords);
  function encode(prefix, words, limit = 90) {
    if (typeof prefix !== 'string') throw new Error(`bech32.encode prefix should be string, not ${typeof prefix}`);
    if (words instanceof Uint8Array) words = Array.from(words);
    if (!Array.isArray(words) || words.length && typeof words[0] !== 'number') throw new Error(`bech32.encode words should be array of numbers, not ${typeof words}`);
    if (prefix.length === 0) throw new TypeError(`Invalid prefix length ${prefix.length}`);
    const actualLength = prefix.length + 7 + words.length;
    if (limit !== false && actualLength > limit) throw new TypeError(`Length ${actualLength} exceeds limit ${limit}`);
    const lowered = prefix.toLowerCase();
    const sum = bechChecksum(lowered, words, ENCODING_CONST);
    return `${lowered}1${BECH_ALPHABET.encode(words)}${sum}`;
  }
  function decode(str, limit = 90) {
    if (typeof str !== 'string') throw new Error(`bech32.decode input should be string, not ${typeof str}`);
    if (str.length < 8 || limit !== false && str.length > limit) throw new TypeError(`Wrong string length: ${str.length} (${str}). Expected (8..${limit})`);
    // don't allow mixed case
    const lowered = str.toLowerCase();
    if (str !== lowered && str !== str.toUpperCase()) throw new Error(`String must be lowercase or uppercase`);
    const sepIndex = lowered.lastIndexOf('1');
    if (sepIndex === 0 || sepIndex === -1) throw new Error(`Letter "1" must be present between prefix and data only`);
    const prefix = lowered.slice(0, sepIndex);
    const data = lowered.slice(sepIndex + 1);
    if (data.length < 6) throw new Error('Data must be at least 6 characters long');
    const words = BECH_ALPHABET.decode(data).slice(0, -6);
    const sum = bechChecksum(prefix, words, ENCODING_CONST);
    if (!data.endsWith(sum)) throw new Error(`Invalid checksum in ${str}: expected "${sum}"`);
    return {
      prefix,
      words
    };
  }
  const decodeUnsafe = unsafeWrapper(decode);
  function decodeToBytes(str) {
    const {
      prefix,
      words
    } = decode(str, false);
    return {
      prefix,
      words,
      bytes: fromWords(words)
    };
  }
  function encodeFromBytes(prefix, bytes) {
    return encode(prefix, toWords(bytes));
  }
  return {
    encode,
    decode,
    encodeFromBytes,
    decodeToBytes,
    decodeUnsafe,
    fromWords,
    fromWordsUnsafe,
    toWords
  };
}
const bech32 = exports.bech32 = /* @__PURE__ */genBech32('bech32');
const bech32m = exports.bech32m = /* @__PURE__ */genBech32('bech32m');
const utf8 = exports.utf8 = {
  encode: data => new TextDecoder().decode(data),
  decode: str => new TextEncoder().encode(str)
};
const hex = exports.hex = /* @__PURE__ */chain(radix2(4), alphabet('0123456789abcdef'), join(''), normalize(s => {
  if (typeof s !== 'string' || s.length % 2) throw new TypeError(`hex.decode: expected string, got ${typeof s} with length ${s.length}`);
  return s.toLowerCase();
}));
// prettier-ignore
const CODERS = {
  utf8,
  hex,
  base16,
  base32,
  base64,
  base64url,
  base58,
  base58xmr
};
const coderTypeError = 'Invalid encoding type. Available types: utf8, hex, base16, base32, base64, base64url, base58, base58xmr';
const bytesToString = (type, bytes) => {
  if (typeof type !== 'string' || !CODERS.hasOwnProperty(type)) throw new TypeError(coderTypeError);
  if (!isBytes(bytes)) throw new TypeError('bytesToString() expects Uint8Array');
  return CODERS[type].encode(bytes);
};
exports.bytesToString = bytesToString;
const str = exports.str = bytesToString; // as in python, but for bytes only
const stringToBytes = (type, str) => {
  if (!CODERS.hasOwnProperty(type)) throw new TypeError(coderTypeError);
  if (typeof str !== 'string') throw new TypeError('stringToBytes() expects string');
  return CODERS[type].decode(str);
};
exports.stringToBytes = stringToBytes;
const bytes = exports.bytes = stringToBytes;

},{}],18:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMnemonic = generateMnemonic;
exports.mnemonicToEntropy = mnemonicToEntropy;
exports.entropyToMnemonic = entropyToMnemonic;
exports.validateMnemonic = validateMnemonic;
exports.mnemonicToSeed = mnemonicToSeed;
exports.mnemonicToSeedSync = mnemonicToSeedSync;
/*! scure-bip39 - MIT License (c) 2022 Patricio Palladino, Paul Miller (paulmillr.com) */
const _assert_1 = require("@noble/hashes/_assert");
const pbkdf2_1 = require("@noble/hashes/pbkdf2");
const sha256_1 = require("@noble/hashes/sha256");
const sha512_1 = require("@noble/hashes/sha512");
const utils_1 = require("@noble/hashes/utils");
const base_1 = require("@scure/base");
// Japanese wordlist
const isJapanese = (wordlist) => wordlist[0] === '\u3042\u3044\u3053\u304f\u3057\u3093';
// Normalization replaces equivalent sequences of characters
// so that any two texts that are equivalent will be reduced
// to the same sequence of code points, called the normal form of the original text.
// https://tonsky.me/blog/unicode/#why-is-a----
function nfkd(str) {
    if (typeof str !== 'string')
        throw new TypeError(`Invalid mnemonic type: ${typeof str}`);
    return str.normalize('NFKD');
}
function normalize(str) {
    const norm = nfkd(str);
    const words = norm.split(' ');
    if (![12, 15, 18, 21, 24].includes(words.length))
        throw new Error('Invalid mnemonic');
    return { nfkd: norm, words };
}
function assertEntropy(entropy) {
    (0, _assert_1.bytes)(entropy, 16, 20, 24, 28, 32);
}
/**
 * Generate x random words. Uses Cryptographically-Secure Random Number Generator.
 * @param wordlist imported wordlist for specific language
 * @param strength mnemonic strength 128-256 bits
 * @example
 * generateMnemonic(wordlist, 128)
 * // 'legal winner thank year wave sausage worth useful legal winner thank yellow'
 */
function generateMnemonic(wordlist, strength = 128) {
    (0, _assert_1.number)(strength);
    if (strength % 32 !== 0 || strength > 256)
        throw new TypeError('Invalid entropy');
    return entropyToMnemonic((0, utils_1.randomBytes)(strength / 8), wordlist);
}
const calcChecksum = (entropy) => {
    // Checksum is ent.length/4 bits long
    const bitsLeft = 8 - entropy.length / 4;
    // Zero rightmost "bitsLeft" bits in byte
    // For example: bitsLeft=4 val=10111101 -> 10110000
    return new Uint8Array([((0, sha256_1.sha256)(entropy)[0] >> bitsLeft) << bitsLeft]);
};
function getCoder(wordlist) {
    if (!Array.isArray(wordlist) || wordlist.length !== 2048 || typeof wordlist[0] !== 'string')
        throw new Error('Wordlist: expected array of 2048 strings');
    wordlist.forEach((i) => {
        if (typeof i !== 'string')
            throw new Error(`Wordlist: non-string element: ${i}`);
    });
    return base_1.utils.chain(base_1.utils.checksum(1, calcChecksum), base_1.utils.radix2(11, true), base_1.utils.alphabet(wordlist));
}
/**
 * Reversible: Converts mnemonic string to raw entropy in form of byte array.
 * @param mnemonic 12-24 words
 * @param wordlist imported wordlist for specific language
 * @example
 * const mnem = 'legal winner thank year wave sausage worth useful legal winner thank yellow';
 * mnemonicToEntropy(mnem, wordlist)
 * // Produces
 * new Uint8Array([
 *   0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f,
 *   0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f
 * ])
 */
function mnemonicToEntropy(mnemonic, wordlist) {
    const { words } = normalize(mnemonic);
    const entropy = getCoder(wordlist).decode(words);
    assertEntropy(entropy);
    return entropy;
}
/**
 * Reversible: Converts raw entropy in form of byte array to mnemonic string.
 * @param entropy byte array
 * @param wordlist imported wordlist for specific language
 * @returns 12-24 words
 * @example
 * const ent = new Uint8Array([
 *   0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f,
 *   0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f
 * ]);
 * entropyToMnemonic(ent, wordlist);
 * // 'legal winner thank year wave sausage worth useful legal winner thank yellow'
 */
function entropyToMnemonic(entropy, wordlist) {
    assertEntropy(entropy);
    const words = getCoder(wordlist).encode(entropy);
    return words.join(isJapanese(wordlist) ? '\u3000' : ' ');
}
/**
 * Validates mnemonic for being 12-24 words contained in `wordlist`.
 */
function validateMnemonic(mnemonic, wordlist) {
    try {
        mnemonicToEntropy(mnemonic, wordlist);
    }
    catch (e) {
        return false;
    }
    return true;
}
const salt = (passphrase) => nfkd(`mnemonic${passphrase}`);
/**
 * Irreversible: Uses KDF to derive 64 bytes of key data from mnemonic + optional password.
 * @param mnemonic 12-24 words
 * @param passphrase string that will additionally protect the key
 * @returns 64 bytes of key data
 * @example
 * const mnem = 'legal winner thank year wave sausage worth useful legal winner thank yellow';
 * await mnemonicToSeed(mnem, 'password');
 * // new Uint8Array([...64 bytes])
 */
function mnemonicToSeed(mnemonic, passphrase = '') {
    return (0, pbkdf2_1.pbkdf2Async)(sha512_1.sha512, normalize(mnemonic).nfkd, salt(passphrase), { c: 2048, dkLen: 64 });
}
/**
 * Irreversible: Uses KDF to derive 64 bytes of key data from mnemonic + optional password.
 * @param mnemonic 12-24 words
 * @param passphrase string that will additionally protect the key
 * @returns 64 bytes of key data
 * @example
 * const mnem = 'legal winner thank year wave sausage worth useful legal winner thank yellow';
 * mnemonicToSeedSync(mnem, 'password');
 * // new Uint8Array([...64 bytes])
 */
function mnemonicToSeedSync(mnemonic, passphrase = '') {
    return (0, pbkdf2_1.pbkdf2)(sha512_1.sha512, normalize(mnemonic).nfkd, salt(passphrase), { c: 2048, dkLen: 64 });
}

},{"@noble/hashes/_assert":8,"@noble/hashes/pbkdf2":13,"@noble/hashes/sha256":14,"@noble/hashes/sha512":15,"@noble/hashes/utils":16,"@scure/base":17}],19:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wordlist = void 0;
exports.wordlist = `abandon
ability
able
about
above
absent
absorb
abstract
absurd
abuse
access
accident
account
accuse
achieve
acid
acoustic
acquire
across
act
action
actor
actress
actual
adapt
add
addict
address
adjust
admit
adult
advance
advice
aerobic
affair
afford
afraid
again
age
agent
agree
ahead
aim
air
airport
aisle
alarm
album
alcohol
alert
alien
all
alley
allow
almost
alone
alpha
already
also
alter
always
amateur
amazing
among
amount
amused
analyst
anchor
ancient
anger
angle
angry
animal
ankle
announce
annual
another
answer
antenna
antique
anxiety
any
apart
apology
appear
apple
approve
april
arch
arctic
area
arena
argue
arm
armed
armor
army
around
arrange
arrest
arrive
arrow
art
artefact
artist
artwork
ask
aspect
assault
asset
assist
assume
asthma
athlete
atom
attack
attend
attitude
attract
auction
audit
august
aunt
author
auto
autumn
average
avocado
avoid
awake
aware
away
awesome
awful
awkward
axis
baby
bachelor
bacon
badge
bag
balance
balcony
ball
bamboo
banana
banner
bar
barely
bargain
barrel
base
basic
basket
battle
beach
bean
beauty
because
become
beef
before
begin
behave
behind
believe
below
belt
bench
benefit
best
betray
better
between
beyond
bicycle
bid
bike
bind
biology
bird
birth
bitter
black
blade
blame
blanket
blast
bleak
bless
blind
blood
blossom
blouse
blue
blur
blush
board
boat
body
boil
bomb
bone
bonus
book
boost
border
boring
borrow
boss
bottom
bounce
box
boy
bracket
brain
brand
brass
brave
bread
breeze
brick
bridge
brief
bright
bring
brisk
broccoli
broken
bronze
broom
brother
brown
brush
bubble
buddy
budget
buffalo
build
bulb
bulk
bullet
bundle
bunker
burden
burger
burst
bus
business
busy
butter
buyer
buzz
cabbage
cabin
cable
cactus
cage
cake
call
calm
camera
camp
can
canal
cancel
candy
cannon
canoe
canvas
canyon
capable
capital
captain
car
carbon
card
cargo
carpet
carry
cart
case
cash
casino
castle
casual
cat
catalog
catch
category
cattle
caught
cause
caution
cave
ceiling
celery
cement
census
century
cereal
certain
chair
chalk
champion
change
chaos
chapter
charge
chase
chat
cheap
check
cheese
chef
cherry
chest
chicken
chief
child
chimney
choice
choose
chronic
chuckle
chunk
churn
cigar
cinnamon
circle
citizen
city
civil
claim
clap
clarify
claw
clay
clean
clerk
clever
click
client
cliff
climb
clinic
clip
clock
clog
close
cloth
cloud
clown
club
clump
cluster
clutch
coach
coast
coconut
code
coffee
coil
coin
collect
color
column
combine
come
comfort
comic
common
company
concert
conduct
confirm
congress
connect
consider
control
convince
cook
cool
copper
copy
coral
core
corn
correct
cost
cotton
couch
country
couple
course
cousin
cover
coyote
crack
cradle
craft
cram
crane
crash
crater
crawl
crazy
cream
credit
creek
crew
cricket
crime
crisp
critic
crop
cross
crouch
crowd
crucial
cruel
cruise
crumble
crunch
crush
cry
crystal
cube
culture
cup
cupboard
curious
current
curtain
curve
cushion
custom
cute
cycle
dad
damage
damp
dance
danger
daring
dash
daughter
dawn
day
deal
debate
debris
decade
december
decide
decline
decorate
decrease
deer
defense
define
defy
degree
delay
deliver
demand
demise
denial
dentist
deny
depart
depend
deposit
depth
deputy
derive
describe
desert
design
desk
despair
destroy
detail
detect
develop
device
devote
diagram
dial
diamond
diary
dice
diesel
diet
differ
digital
dignity
dilemma
dinner
dinosaur
direct
dirt
disagree
discover
disease
dish
dismiss
disorder
display
distance
divert
divide
divorce
dizzy
doctor
document
dog
doll
dolphin
domain
donate
donkey
donor
door
dose
double
dove
draft
dragon
drama
drastic
draw
dream
dress
drift
drill
drink
drip
drive
drop
drum
dry
duck
dumb
dune
during
dust
dutch
duty
dwarf
dynamic
eager
eagle
early
earn
earth
easily
east
easy
echo
ecology
economy
edge
edit
educate
effort
egg
eight
either
elbow
elder
electric
elegant
element
elephant
elevator
elite
else
embark
embody
embrace
emerge
emotion
employ
empower
empty
enable
enact
end
endless
endorse
enemy
energy
enforce
engage
engine
enhance
enjoy
enlist
enough
enrich
enroll
ensure
enter
entire
entry
envelope
episode
equal
equip
era
erase
erode
erosion
error
erupt
escape
essay
essence
estate
eternal
ethics
evidence
evil
evoke
evolve
exact
example
excess
exchange
excite
exclude
excuse
execute
exercise
exhaust
exhibit
exile
exist
exit
exotic
expand
expect
expire
explain
expose
express
extend
extra
eye
eyebrow
fabric
face
faculty
fade
faint
faith
fall
false
fame
family
famous
fan
fancy
fantasy
farm
fashion
fat
fatal
father
fatigue
fault
favorite
feature
february
federal
fee
feed
feel
female
fence
festival
fetch
fever
few
fiber
fiction
field
figure
file
film
filter
final
find
fine
finger
finish
fire
firm
first
fiscal
fish
fit
fitness
fix
flag
flame
flash
flat
flavor
flee
flight
flip
float
flock
floor
flower
fluid
flush
fly
foam
focus
fog
foil
fold
follow
food
foot
force
forest
forget
fork
fortune
forum
forward
fossil
foster
found
fox
fragile
frame
frequent
fresh
friend
fringe
frog
front
frost
frown
frozen
fruit
fuel
fun
funny
furnace
fury
future
gadget
gain
galaxy
gallery
game
gap
garage
garbage
garden
garlic
garment
gas
gasp
gate
gather
gauge
gaze
general
genius
genre
gentle
genuine
gesture
ghost
giant
gift
giggle
ginger
giraffe
girl
give
glad
glance
glare
glass
glide
glimpse
globe
gloom
glory
glove
glow
glue
goat
goddess
gold
good
goose
gorilla
gospel
gossip
govern
gown
grab
grace
grain
grant
grape
grass
gravity
great
green
grid
grief
grit
grocery
group
grow
grunt
guard
guess
guide
guilt
guitar
gun
gym
habit
hair
half
hammer
hamster
hand
happy
harbor
hard
harsh
harvest
hat
have
hawk
hazard
head
health
heart
heavy
hedgehog
height
hello
helmet
help
hen
hero
hidden
high
hill
hint
hip
hire
history
hobby
hockey
hold
hole
holiday
hollow
home
honey
hood
hope
horn
horror
horse
hospital
host
hotel
hour
hover
hub
huge
human
humble
humor
hundred
hungry
hunt
hurdle
hurry
hurt
husband
hybrid
ice
icon
idea
identify
idle
ignore
ill
illegal
illness
image
imitate
immense
immune
impact
impose
improve
impulse
inch
include
income
increase
index
indicate
indoor
industry
infant
inflict
inform
inhale
inherit
initial
inject
injury
inmate
inner
innocent
input
inquiry
insane
insect
inside
inspire
install
intact
interest
into
invest
invite
involve
iron
island
isolate
issue
item
ivory
jacket
jaguar
jar
jazz
jealous
jeans
jelly
jewel
job
join
joke
journey
joy
judge
juice
jump
jungle
junior
junk
just
kangaroo
keen
keep
ketchup
key
kick
kid
kidney
kind
kingdom
kiss
kit
kitchen
kite
kitten
kiwi
knee
knife
knock
know
lab
label
labor
ladder
lady
lake
lamp
language
laptop
large
later
latin
laugh
laundry
lava
law
lawn
lawsuit
layer
lazy
leader
leaf
learn
leave
lecture
left
leg
legal
legend
leisure
lemon
lend
length
lens
leopard
lesson
letter
level
liar
liberty
library
license
life
lift
light
like
limb
limit
link
lion
liquid
list
little
live
lizard
load
loan
lobster
local
lock
logic
lonely
long
loop
lottery
loud
lounge
love
loyal
lucky
luggage
lumber
lunar
lunch
luxury
lyrics
machine
mad
magic
magnet
maid
mail
main
major
make
mammal
man
manage
mandate
mango
mansion
manual
maple
marble
march
margin
marine
market
marriage
mask
mass
master
match
material
math
matrix
matter
maximum
maze
meadow
mean
measure
meat
mechanic
medal
media
melody
melt
member
memory
mention
menu
mercy
merge
merit
merry
mesh
message
metal
method
middle
midnight
milk
million
mimic
mind
minimum
minor
minute
miracle
mirror
misery
miss
mistake
mix
mixed
mixture
mobile
model
modify
mom
moment
monitor
monkey
monster
month
moon
moral
more
morning
mosquito
mother
motion
motor
mountain
mouse
move
movie
much
muffin
mule
multiply
muscle
museum
mushroom
music
must
mutual
myself
mystery
myth
naive
name
napkin
narrow
nasty
nation
nature
near
neck
need
negative
neglect
neither
nephew
nerve
nest
net
network
neutral
never
news
next
nice
night
noble
noise
nominee
noodle
normal
north
nose
notable
note
nothing
notice
novel
now
nuclear
number
nurse
nut
oak
obey
object
oblige
obscure
observe
obtain
obvious
occur
ocean
october
odor
off
offer
office
often
oil
okay
old
olive
olympic
omit
once
one
onion
online
only
open
opera
opinion
oppose
option
orange
orbit
orchard
order
ordinary
organ
orient
original
orphan
ostrich
other
outdoor
outer
output
outside
oval
oven
over
own
owner
oxygen
oyster
ozone
pact
paddle
page
pair
palace
palm
panda
panel
panic
panther
paper
parade
parent
park
parrot
party
pass
patch
path
patient
patrol
pattern
pause
pave
payment
peace
peanut
pear
peasant
pelican
pen
penalty
pencil
people
pepper
perfect
permit
person
pet
phone
photo
phrase
physical
piano
picnic
picture
piece
pig
pigeon
pill
pilot
pink
pioneer
pipe
pistol
pitch
pizza
place
planet
plastic
plate
play
please
pledge
pluck
plug
plunge
poem
poet
point
polar
pole
police
pond
pony
pool
popular
portion
position
possible
post
potato
pottery
poverty
powder
power
practice
praise
predict
prefer
prepare
present
pretty
prevent
price
pride
primary
print
priority
prison
private
prize
problem
process
produce
profit
program
project
promote
proof
property
prosper
protect
proud
provide
public
pudding
pull
pulp
pulse
pumpkin
punch
pupil
puppy
purchase
purity
purpose
purse
push
put
puzzle
pyramid
quality
quantum
quarter
question
quick
quit
quiz
quote
rabbit
raccoon
race
rack
radar
radio
rail
rain
raise
rally
ramp
ranch
random
range
rapid
rare
rate
rather
raven
raw
razor
ready
real
reason
rebel
rebuild
recall
receive
recipe
record
recycle
reduce
reflect
reform
refuse
region
regret
regular
reject
relax
release
relief
rely
remain
remember
remind
remove
render
renew
rent
reopen
repair
repeat
replace
report
require
rescue
resemble
resist
resource
response
result
retire
retreat
return
reunion
reveal
review
reward
rhythm
rib
ribbon
rice
rich
ride
ridge
rifle
right
rigid
ring
riot
ripple
risk
ritual
rival
river
road
roast
robot
robust
rocket
romance
roof
rookie
room
rose
rotate
rough
round
route
royal
rubber
rude
rug
rule
run
runway
rural
sad
saddle
sadness
safe
sail
salad
salmon
salon
salt
salute
same
sample
sand
satisfy
satoshi
sauce
sausage
save
say
scale
scan
scare
scatter
scene
scheme
school
science
scissors
scorpion
scout
scrap
screen
script
scrub
sea
search
season
seat
second
secret
section
security
seed
seek
segment
select
sell
seminar
senior
sense
sentence
series
service
session
settle
setup
seven
shadow
shaft
shallow
share
shed
shell
sheriff
shield
shift
shine
ship
shiver
shock
shoe
shoot
shop
short
shoulder
shove
shrimp
shrug
shuffle
shy
sibling
sick
side
siege
sight
sign
silent
silk
silly
silver
similar
simple
since
sing
siren
sister
situate
six
size
skate
sketch
ski
skill
skin
skirt
skull
slab
slam
sleep
slender
slice
slide
slight
slim
slogan
slot
slow
slush
small
smart
smile
smoke
smooth
snack
snake
snap
sniff
snow
soap
soccer
social
sock
soda
soft
solar
soldier
solid
solution
solve
someone
song
soon
sorry
sort
soul
sound
soup
source
south
space
spare
spatial
spawn
speak
special
speed
spell
spend
sphere
spice
spider
spike
spin
spirit
split
spoil
sponsor
spoon
sport
spot
spray
spread
spring
spy
square
squeeze
squirrel
stable
stadium
staff
stage
stairs
stamp
stand
start
state
stay
steak
steel
stem
step
stereo
stick
still
sting
stock
stomach
stone
stool
story
stove
strategy
street
strike
strong
struggle
student
stuff
stumble
style
subject
submit
subway
success
such
sudden
suffer
sugar
suggest
suit
summer
sun
sunny
sunset
super
supply
supreme
sure
surface
surge
surprise
surround
survey
suspect
sustain
swallow
swamp
swap
swarm
swear
sweet
swift
swim
swing
switch
sword
symbol
symptom
syrup
system
table
tackle
tag
tail
talent
talk
tank
tape
target
task
taste
tattoo
taxi
teach
team
tell
ten
tenant
tennis
tent
term
test
text
thank
that
theme
then
theory
there
they
thing
this
thought
three
thrive
throw
thumb
thunder
ticket
tide
tiger
tilt
timber
time
tiny
tip
tired
tissue
title
toast
tobacco
today
toddler
toe
together
toilet
token
tomato
tomorrow
tone
tongue
tonight
tool
tooth
top
topic
topple
torch
tornado
tortoise
toss
total
tourist
toward
tower
town
toy
track
trade
traffic
tragic
train
transfer
trap
trash
travel
tray
treat
tree
trend
trial
tribe
trick
trigger
trim
trip
trophy
trouble
truck
true
truly
trumpet
trust
truth
try
tube
tuition
tumble
tuna
tunnel
turkey
turn
turtle
twelve
twenty
twice
twin
twist
two
type
typical
ugly
umbrella
unable
unaware
uncle
uncover
under
undo
unfair
unfold
unhappy
uniform
unique
unit
universe
unknown
unlock
until
unusual
unveil
update
upgrade
uphold
upon
upper
upset
urban
urge
usage
use
used
useful
useless
usual
utility
vacant
vacuum
vague
valid
valley
valve
van
vanish
vapor
various
vast
vault
vehicle
velvet
vendor
venture
venue
verb
verify
version
very
vessel
veteran
viable
vibrant
vicious
victory
video
view
village
vintage
violin
virtual
virus
visa
visit
visual
vital
vivid
vocal
voice
void
volcano
volume
vote
voyage
wage
wagon
wait
walk
wall
walnut
want
warfare
warm
warrior
wash
wasp
waste
water
wave
way
wealth
weapon
wear
weasel
weather
web
wedding
weekend
weird
welcome
west
wet
whale
what
wheat
wheel
when
where
whip
whisper
wide
width
wife
wild
will
win
window
wine
wing
wink
winner
winter
wire
wisdom
wise
wish
witness
wolf
woman
wonder
wood
wool
word
work
world
worry
worth
wrap
wreck
wrestle
wrist
write
wrong
yard
year
yellow
you
young
youth
zebra
zero
zone
zoo`.split('\n');

},{}],20:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ansContractsMap = exports.WaitForTransactionError = exports.User_Transactions_Select_Column = exports.Types = exports.TypeTagParser = exports.TxnBuilderTypes = exports.TransactionWorkerEvents = exports.TransactionWorker = exports.TransactionBuilderRemoteABI = exports.TransactionBuilderMultiEd25519 = exports.TransactionBuilderEd25519 = exports.TransactionBuilderABI = exports.TransactionBuilder = exports.Tokens_Select_Column = exports.Token_Ownerships_Select_Column = exports.Token_Datas_Select_Column = exports.Token_Activities_V2_Select_Column = exports.Token_Activities_Select_Column = exports.TokenTypes = exports.TokenClient = exports.Table_Metadatas_Select_Column = exports.Table_Items_Select_Column = exports.TRANSFER_COINS = exports.Provider = exports.Proposal_Votes_Select_Column = exports.PropertyValue = exports.PropertyMap = exports.Processor_Status_Select_Column = exports.Order_By = exports.Num_Active_Delegator_Per_Pool_Select_Column = exports.NodeAPIToNetwork = exports.Nft_Metadata_Crawler_Parsed_Asset_Uris_Select_Column = exports.Nft_Marketplace_V2_Nft_Marketplace_Activities_Select_Column = exports.Nft_Marketplace_V2_Current_Nft_Marketplace_Token_Offers_Select_Column = exports.Nft_Marketplace_V2_Current_Nft_Marketplace_Listings_Select_Column = exports.Nft_Marketplace_V2_Current_Nft_Marketplace_Collection_Offers_Select_Column = exports.Nft_Marketplace_V2_Current_Nft_Marketplace_Auctions_Select_Column = exports.NetworkToNodeAPI = exports.NetworkToIndexerAPI = exports.Network = exports.Move_Resources_Select_Column = exports.Ledger_Infos_Select_Column = exports.Indexer_Status_Select_Column = exports.IndexerClient = exports.HexString = exports.Fungible_Asset_Metadata_Select_Column = exports.Fungible_Asset_Activities_Select_Column = exports.FungibleAssetClient = exports.FaucetClient = exports.FailedTransactionError = exports.Events_Select_Column = exports.Delegator_Distinct_Pool_Select_Column = exports.Delegated_Staking_Pools_Select_Column = exports.Delegated_Staking_Activities_Select_Column = exports.Cursor_Ordering = exports.Current_Token_Pending_Claims_Select_Column = exports.Current_Token_Ownerships_V2_Select_Column = exports.Current_Token_Ownerships_Select_Column = exports.Current_Token_Datas_V2_Select_Column = exports.Current_Token_Datas_Select_Column = exports.Current_Table_Items_Select_Column = exports.Current_Staking_Pool_Voter_Select_Column = exports.Current_Objects_Select_Column = exports.Current_Fungible_Asset_Balances_Select_Column = exports.Current_Delegator_Balances_Select_Column = exports.Current_Delegated_Voter_Select_Column = exports.Current_Delegated_Staking_Pool_Balances_Select_Column = exports.Current_Collections_V2_Select_Column = exports.Current_Collection_Ownership_V2_View_Select_Column = exports.Current_Collection_Datas_Select_Column = exports.Current_Coin_Balances_Select_Column = exports.Current_Aptos_Names_Select_Column = exports.Current_Ans_Lookup_V2_Select_Column = exports.Current_Ans_Lookup_Select_Column = exports.Collection_Datas_Select_Column = exports.Coin_Supply_Select_Column = exports.Coin_Infos_Select_Column = exports.Coin_Balances_Select_Column = exports.Coin_Activities_Select_Column = exports.CoinClient = exports.COIN_TRANSFER = exports.CKDPriv = exports.Block_Metadata_Transactions_Select_Column = exports.BCS = exports.AptosToken = exports.AptosClient = exports.AptosApiError = exports.AptosAccount = exports.ApiError = exports.AnsClient = exports.Address_Version_From_Move_Resources_Select_Column = exports.Address_Version_From_Events_Select_Column = exports.Address_Events_Summary_Select_Column = exports.Account_Transactions_Select_Column = exports.AccountSequenceNumber = exports.APTOS_COIN = void 0;
exports.aptosRequest = aptosRequest;
exports.argToTransactionArgument = argToTransactionArgument;
exports.derivePath = void 0;
exports.deserializePropertyMap = deserializePropertyMap;
exports.deserializeValueBasedOnTypeTag = deserializeValueBasedOnTypeTag;
exports.ensureBigInt = ensureBigInt;
exports.ensureBoolean = ensureBoolean;
exports.ensureNumber = ensureNumber;
exports.get = get;
exports.getAddressFromAccountOrAddress = getAddressFromAccountOrAddress;
exports.getMasterKeyFromSeed = void 0;
exports.getPropertyType = getPropertyType;
exports.getPropertyValueRaw = getPropertyValueRaw;
exports.getPublicKey = void 0;
exports.getSinglePropertyValueRaw = getSinglePropertyValueRaw;
exports.namePattern = exports.nameComponentPattern = exports.isValidPath = void 0;
exports.post = post;
exports.serializeArg = serializeArg;
var _tweetnacl = _interopRequireDefault(require("tweetnacl"));
var bip39 = _interopRequireWildcard(require("@scure/bip39"));
var _utils = require("@noble/hashes/utils");
var _sha = require("@noble/hashes/sha256");
var _sha2 = require("@noble/hashes/sha3");
var _hmac = require("@noble/hashes/hmac");
var _sha3 = require("@noble/hashes/sha512");
var _aptosClient = _interopRequireDefault(require("@aptos-labs/aptos-client"));
var _eventemitter = _interopRequireDefault(require("eventemitter3"));
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __export = (target, all) => {
  for (var name in all) __defProp(target, name, {
    get: all[name],
    enumerable: true
  });
};
var __decorateClass = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc(target, key) : target;
  for (var i = decorators.length - 1, decorator; i >= 0; i--) if (decorator = decorators[i]) result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp(target, key, result);
  return result;
};

// src/account/aptos_account.ts

// src/utils/hd-key.ts

var pathRegex = /^m(\/[0-9]+')+$/;
var replaceDerive = val => val.replace("'", "");
var HMAC_KEY = "ed25519 seed";
var HARDENED_OFFSET = 2147483648;
var getMasterKeyFromSeed = seed => {
  const h = _hmac.hmac.create(_sha3.sha512, HMAC_KEY);
  const I = h.update((0, _utils.hexToBytes)(seed)).digest();
  const IL = I.slice(0, 32);
  const IR = I.slice(32);
  return {
    key: IL,
    chainCode: IR
  };
};
exports.getMasterKeyFromSeed = getMasterKeyFromSeed;
var CKDPriv = ({
  key,
  chainCode
}, index) => {
  const buffer = new ArrayBuffer(4);
  new DataView(buffer).setUint32(0, index);
  const indexBytes = new Uint8Array(buffer);
  const zero = new Uint8Array([0]);
  const data = new Uint8Array([...zero, ...key, ...indexBytes]);
  const I = _hmac.hmac.create(_sha3.sha512, chainCode).update(data).digest();
  const IL = I.slice(0, 32);
  const IR = I.slice(32);
  return {
    key: IL,
    chainCode: IR
  };
};
exports.CKDPriv = CKDPriv;
var getPublicKey = (privateKey, withZeroByte = true) => {
  const keyPair = _tweetnacl.default.sign.keyPair.fromSeed(privateKey);
  const signPk = keyPair.secretKey.subarray(32);
  const zero = new Uint8Array([0]);
  return withZeroByte ? new Uint8Array([...zero, ...signPk]) : signPk;
};
exports.getPublicKey = getPublicKey;
var isValidPath = path => {
  if (!pathRegex.test(path)) {
    return false;
  }
  return !path.split("/").slice(1).map(replaceDerive).some(Number.isNaN);
};
exports.isValidPath = isValidPath;
var derivePath = (path, seed, offset = HARDENED_OFFSET) => {
  if (!isValidPath(path)) {
    throw new Error("Invalid derivation path");
  }
  const {
    key,
    chainCode
  } = getMasterKeyFromSeed(seed);
  const segments = path.split("/").slice(1).map(replaceDerive).map(el => parseInt(el, 10));
  return segments.reduce((parentKeys, segment) => CKDPriv(parentKeys, segment + offset), {
    key,
    chainCode
  });
};

// src/version.ts
exports.derivePath = derivePath;
var VERSION = "1.21.0";

// src/utils/misc.ts
async function sleep(timeMs) {
  return new Promise(resolve => {
    setTimeout(resolve, timeMs);
  });
}
var DEFAULT_VERSION_PATH_BASE = "/v1";
function fixNodeUrl(nodeUrl) {
  let out = `${nodeUrl}`;
  if (out.endsWith("/")) {
    out = out.substring(0, out.length - 1);
  }
  if (!out.endsWith(DEFAULT_VERSION_PATH_BASE)) {
    out = `${out}${DEFAULT_VERSION_PATH_BASE}`;
  }
  return out;
}
var DEFAULT_MAX_GAS_AMOUNT = 2e5;
var DEFAULT_TXN_EXP_SEC_FROM_NOW = 20;
var DEFAULT_TXN_TIMEOUT_SEC = 20;
var APTOS_COIN = exports.APTOS_COIN = "0x1::aptos_coin::AptosCoin";
var CUSTOM_REQUEST_HEADER = {
  "x-aptos-client": `aptos-ts-sdk/${VERSION}`
};

// src/utils/memoize-decorator.ts
function Memoize(args) {
  let hashFunction;
  let ttlMs;
  let tags;
  if (typeof args === "object") {
    hashFunction = args.hashFunction;
    ttlMs = args.ttlMs;
    tags = args.tags;
  } else {
    hashFunction = args;
  }
  return (target, propertyKey, descriptor) => {
    if (descriptor.value != null) {
      descriptor.value = getNewFunction(descriptor.value, hashFunction, ttlMs, tags);
    } else if (descriptor.get != null) {
      descriptor.get = getNewFunction(descriptor.get, hashFunction, ttlMs, tags);
    } else {
      throw new Error("Only put a Memoize() decorator on a method or get accessor.");
    }
  };
}
function MemoizeExpiring(ttlMs, hashFunction) {
  return Memoize({
    ttlMs,
    hashFunction
  });
}
var clearCacheTagsMap = /* @__PURE__ */new Map();
function clear(tags) {
  const cleared = /* @__PURE__ */new Set();
  for (const tag of tags) {
    const maps = clearCacheTagsMap.get(tag);
    if (maps) {
      for (const mp of maps) {
        if (!cleared.has(mp)) {
          mp.clear();
          cleared.add(mp);
        }
      }
    }
  }
  return cleared.size;
}
function getNewFunction(originalMethod, hashFunction, ttlMs = 0, tags) {
  const propMapName = Symbol("__memoized_map__");
  return function (...args) {
    let returnedValue;
    const that = this;
    if (!that.hasOwnProperty(propMapName)) {
      Object.defineProperty(that, propMapName, {
        configurable: false,
        enumerable: false,
        writable: false,
        value: /* @__PURE__ */new Map()
      });
    }
    const myMap = that[propMapName];
    if (Array.isArray(tags)) {
      for (const tag of tags) {
        if (clearCacheTagsMap.has(tag)) {
          clearCacheTagsMap.get(tag).push(myMap);
        } else {
          clearCacheTagsMap.set(tag, [myMap]);
        }
      }
    }
    if (hashFunction || args.length > 0 || ttlMs > 0) {
      let hashKey;
      if (hashFunction === true) {
        hashKey = args.map(a => a.toString()).join("!");
      } else if (hashFunction) {
        hashKey = hashFunction.apply(that, args);
      } else {
        hashKey = args[0];
      }
      const timestampKey = `${hashKey}__timestamp`;
      let isExpired = false;
      if (ttlMs > 0) {
        if (!myMap.has(timestampKey)) {
          isExpired = true;
        } else {
          const timestamp = myMap.get(timestampKey);
          isExpired = Date.now() - timestamp > ttlMs;
        }
      }
      if (myMap.has(hashKey) && !isExpired) {
        returnedValue = myMap.get(hashKey);
      } else {
        returnedValue = originalMethod.apply(that, args);
        myMap.set(hashKey, returnedValue);
        if (ttlMs > 0) {
          myMap.set(timestampKey, Date.now());
        }
      }
    } else {
      const hashKey = that;
      if (myMap.has(hashKey)) {
        returnedValue = myMap.get(hashKey);
      } else {
        returnedValue = originalMethod.apply(that, args);
        myMap.set(hashKey, returnedValue);
      }
    }
    return returnedValue;
  };
}

// src/client/core.ts

// src/client/types.ts
var AptosApiError = class extends Error {
  constructor(request2, response, message) {
    super(message);
    this.name = "AptosApiError";
    this.url = response.url;
    this.status = response.status;
    this.statusText = response.statusText;
    this.data = response.data;
    this.request = request2;
  }
};

// src/client/core.ts
exports.AptosApiError = AptosApiError;
var errors = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  429: "Too Many Requests",
  500: "Internal Server Error",
  502: "Bad Gateway",
  503: "Service Unavailable"
};
async function request(url, method, body, contentType, params, overrides) {
  const headers = {
    ...(overrides == null ? void 0 : overrides.HEADERS),
    "x-aptos-client": `aptos-ts-sdk/${VERSION}`,
    "content-type": contentType != null ? contentType : "application/json"
  };
  if (overrides == null ? void 0 : overrides.TOKEN) {
    headers.Authorization = `Bearer ${overrides == null ? void 0 : overrides.TOKEN}`;
  }
  const response = await (0, _aptosClient.default)({
    url,
    method,
    body,
    params,
    headers,
    overrides
  });
  return response;
}
async function aptosRequest(options) {
  const {
    url,
    endpoint,
    method,
    body,
    contentType,
    params,
    overrides
  } = options;
  const fullEndpoint = `${url}/${endpoint != null ? endpoint : ""}`;
  const response = await request(fullEndpoint, method, body, contentType, params, overrides);
  const result = {
    status: response.status,
    statusText: response.statusText,
    data: response.data,
    headers: response.headers,
    config: response.config,
    url: fullEndpoint
  };
  if (result.status >= 200 && result.status < 300) {
    return result;
  }
  const errorMessage = errors[result.status];
  throw new AptosApiError(options, result, errorMessage != null ? errorMessage : "Generic Error");
}

// src/client/get.ts
async function get(options) {
  const response = await aptosRequest({
    ...options,
    method: "GET"
  });
  return response;
}

// src/client/post.ts
async function post(options) {
  const response = await aptosRequest({
    ...options,
    method: "POST"
  });
  return response;
}

// src/utils/pagination_helpers.ts
async function paginateWithCursor(options) {
  const out = [];
  let cursor;
  const requestParams = options.params;
  while (true) {
    requestParams.start = cursor;
    const response = await get({
      url: options.url,
      endpoint: options.endpoint,
      params: requestParams,
      originMethod: options.originMethod,
      overrides: options.overrides
    });
    cursor = response.headers["x-aptos-cursor"];
    delete response.headers;
    out.push(...response.data);
    if (cursor === null || cursor === void 0) {
      break;
    }
  }
  return out;
}

// src/utils/api-endpoints.ts
var NetworkToIndexerAPI = exports.NetworkToIndexerAPI = {
  mainnet: "https://indexer.mainnet.aptoslabs.com/v1/graphql",
  testnet: "https://indexer-testnet.staging.gcp.aptosdev.com/v1/graphql",
  devnet: "https://indexer-devnet.staging.gcp.aptosdev.com/v1/graphql",
  local: "http://127.0.0.1:8090/v1/graphql"
};
var NetworkToNodeAPI = exports.NetworkToNodeAPI = {
  mainnet: "https://fullnode.mainnet.aptoslabs.com/v1",
  testnet: "https://fullnode.testnet.aptoslabs.com/v1",
  devnet: "https://fullnode.devnet.aptoslabs.com/v1",
  local: "http://127.0.0.1:8080/v1"
};
var NodeAPIToNetwork = exports.NodeAPIToNetwork = {
  "https://fullnode.mainnet.aptoslabs.com/v1": "mainnet",
  "https://fullnode.testnet.aptoslabs.com/v1": "testnet",
  "https://fullnode.devnet.aptoslabs.com/v1": "devnet",
  "http://127.0.0.1:8080/v1": "local"
};
var Network = exports.Network = /* @__PURE__ */(Network3 => {
  Network3["MAINNET"] = "mainnet";
  Network3["TESTNET"] = "testnet";
  Network3["DEVNET"] = "devnet";
  Network3["LOCAL"] = "local";
  return Network3;
})(Network || {});

// src/utils/hex_string.ts

var HexString = exports.HexString = class _HexString {
  /**
   * Creates new hex string from Buffer
   * @param buffer A buffer to convert
   * @returns New HexString
   */
  static fromBuffer(buffer) {
    return _HexString.fromUint8Array(buffer);
  }
  /**
   * Creates new hex string from Uint8Array
   * @param arr Uint8Array to convert
   * @returns New HexString
   */
  static fromUint8Array(arr) {
    return new _HexString((0, _utils.bytesToHex)(arr));
  }
  /**
   * Ensures `hexString` is instance of `HexString` class
   * @param hexString String to check
   * @returns New HexString if `hexString` is regular string or `hexString` if it is HexString instance
   * @example
   * ```
   *  const regularString = "string";
   *  const hexString = new HexString("string"); // "0xstring"
   *  HexString.ensure(regularString); // "0xstring"
   *  HexString.ensure(hexString); // "0xstring"
   * ```
   */
  static ensure(hexString) {
    if (typeof hexString === "string") {
      return new _HexString(hexString);
    }
    return hexString;
  }
  /**
   * Creates new HexString instance from regular string. If specified string already starts with "0x" prefix,
   * it will not add another one
   * @param hexString String to convert
   * @example
   * ```
   *  const string = "string";
   *  new HexString(string); // "0xstring"
   * ```
   */
  constructor(hexString) {
    if (hexString.startsWith("0x")) {
      this.hexString = hexString;
    } else {
      this.hexString = `0x${hexString}`;
    }
  }
  /**
   * Getter for inner hexString
   * @returns Inner hex string
   */
  hex() {
    return this.hexString;
  }
  /**
   * Getter for inner hexString without prefix
   * @returns Inner hex string without prefix
   * @example
   * ```
   *  const hexString = new HexString("string"); // "0xstring"
   *  hexString.noPrefix(); // "string"
   * ```
   */
  noPrefix() {
    return this.hexString.slice(2);
  }
  /**
   * Overrides default `toString` method
   * @returns Inner hex string
   */
  toString() {
    return this.hex();
  }
  /**
   * Trimmes extra zeroes in the begining of a string
   * @returns Inner hexString without leading zeroes
   * @example
   * ```
   *  new HexString("0x000000string").toShortString(); // result = "0xstring"
   * ```
   */
  toShortString() {
    const trimmed = this.hexString.replace(/^0x0*/, "");
    return `0x${trimmed}`;
  }
  /**
   * Converts hex string to a Uint8Array
   * @returns Uint8Array from inner hexString without prefix
   */
  toUint8Array() {
    return Uint8Array.from((0, _utils.hexToBytes)(this.noPrefix()));
  }
};

// src/aptos_types/index.ts
var aptos_types_exports = exports.TxnBuilderTypes = {};
__export(aptos_types_exports, {
  AccountAddress: () => AccountAddress,
  AccountAuthenticator: () => AccountAuthenticator,
  AccountAuthenticatorEd25519: () => AccountAuthenticatorEd25519,
  AccountAuthenticatorMultiEd25519: () => AccountAuthenticatorMultiEd25519,
  ArgumentABI: () => ArgumentABI,
  AuthenticationKey: () => AuthenticationKey,
  ChainId: () => ChainId,
  ChangeSet: () => ChangeSet,
  Ed25519PublicKey: () => Ed25519PublicKey,
  Ed25519Signature: () => Ed25519Signature,
  EntryFunction: () => EntryFunction,
  EntryFunctionABI: () => EntryFunctionABI,
  FeePayerRawTransaction: () => FeePayerRawTransaction,
  Identifier: () => Identifier,
  Module: () => Module,
  ModuleId: () => ModuleId,
  MultiAgentRawTransaction: () => MultiAgentRawTransaction,
  MultiEd25519PublicKey: () => MultiEd25519PublicKey,
  MultiEd25519Signature: () => MultiEd25519Signature,
  MultiSig: () => MultiSig,
  MultiSigTransactionPayload: () => MultiSigTransactionPayload,
  RawTransaction: () => RawTransaction,
  RawTransactionWithData: () => RawTransactionWithData,
  RotationProofChallenge: () => RotationProofChallenge,
  Script: () => Script,
  ScriptABI: () => ScriptABI,
  SignedTransaction: () => SignedTransaction,
  StructTag: () => StructTag,
  Transaction: () => Transaction,
  TransactionArgument: () => TransactionArgument,
  TransactionArgumentAddress: () => TransactionArgumentAddress,
  TransactionArgumentBool: () => TransactionArgumentBool,
  TransactionArgumentU128: () => TransactionArgumentU128,
  TransactionArgumentU16: () => TransactionArgumentU16,
  TransactionArgumentU256: () => TransactionArgumentU256,
  TransactionArgumentU32: () => TransactionArgumentU32,
  TransactionArgumentU64: () => TransactionArgumentU64,
  TransactionArgumentU8: () => TransactionArgumentU8,
  TransactionArgumentU8Vector: () => TransactionArgumentU8Vector,
  TransactionAuthenticator: () => TransactionAuthenticator,
  TransactionAuthenticatorEd25519: () => TransactionAuthenticatorEd25519,
  TransactionAuthenticatorFeePayer: () => TransactionAuthenticatorFeePayer,
  TransactionAuthenticatorMultiAgent: () => TransactionAuthenticatorMultiAgent,
  TransactionAuthenticatorMultiEd25519: () => TransactionAuthenticatorMultiEd25519,
  TransactionPayload: () => TransactionPayload,
  TransactionPayloadEntryFunction: () => TransactionPayloadEntryFunction,
  TransactionPayloadMultisig: () => TransactionPayloadMultisig,
  TransactionPayloadScript: () => TransactionPayloadScript,
  TransactionScriptABI: () => TransactionScriptABI,
  TypeArgumentABI: () => TypeArgumentABI,
  TypeTag: () => TypeTag,
  TypeTagAddress: () => TypeTagAddress,
  TypeTagBool: () => TypeTagBool,
  TypeTagParser: () => TypeTagParser,
  TypeTagParserError: () => TypeTagParserError,
  TypeTagSigner: () => TypeTagSigner,
  TypeTagStruct: () => TypeTagStruct,
  TypeTagU128: () => TypeTagU128,
  TypeTagU16: () => TypeTagU16,
  TypeTagU256: () => TypeTagU256,
  TypeTagU32: () => TypeTagU32,
  TypeTagU64: () => TypeTagU64,
  TypeTagU8: () => TypeTagU8,
  TypeTagVector: () => TypeTagVector,
  UserTransaction: () => UserTransaction,
  WriteSet: () => WriteSet,
  objectStructTag: () => objectStructTag,
  optionStructTag: () => optionStructTag,
  stringStructTag: () => stringStructTag
});

// src/bcs/index.ts
var bcs_exports = exports.BCS = {};
__export(bcs_exports, {
  Deserializer: () => Deserializer,
  Serializer: () => Serializer,
  bcsSerializeBool: () => bcsSerializeBool,
  bcsSerializeBytes: () => bcsSerializeBytes,
  bcsSerializeFixedBytes: () => bcsSerializeFixedBytes,
  bcsSerializeStr: () => bcsSerializeStr,
  bcsSerializeU128: () => bcsSerializeU128,
  bcsSerializeU16: () => bcsSerializeU16,
  bcsSerializeU256: () => bcsSerializeU256,
  bcsSerializeU32: () => bcsSerializeU32,
  bcsSerializeU8: () => bcsSerializeU8,
  bcsSerializeUint64: () => bcsSerializeUint64,
  bcsToBytes: () => bcsToBytes,
  deserializeVector: () => deserializeVector,
  serializeVector: () => serializeVector,
  serializeVectorWithFunc: () => serializeVectorWithFunc
});

// src/bcs/consts.ts
var MAX_U8_NUMBER = 2 ** 8 - 1;
var MAX_U16_NUMBER = 2 ** 16 - 1;
var MAX_U32_NUMBER = 2 ** 32 - 1;
var MAX_U64_BIG_INT = BigInt(2 ** 64) - BigInt(1);
var MAX_U128_BIG_INT = BigInt(2 ** 128) - BigInt(1);
var MAX_U256_BIG_INT = BigInt(2 ** 256) - BigInt(1);

// src/bcs/serializer.ts
var Serializer = class {
  constructor() {
    this.buffer = new ArrayBuffer(64);
    this.offset = 0;
  }
  ensureBufferWillHandleSize(bytes) {
    while (this.buffer.byteLength < this.offset + bytes) {
      const newBuffer = new ArrayBuffer(this.buffer.byteLength * 2);
      new Uint8Array(newBuffer).set(new Uint8Array(this.buffer));
      this.buffer = newBuffer;
    }
  }
  serialize(values) {
    this.ensureBufferWillHandleSize(values.length);
    new Uint8Array(this.buffer, this.offset).set(values);
    this.offset += values.length;
  }
  serializeWithFunction(fn, bytesLength, value) {
    this.ensureBufferWillHandleSize(bytesLength);
    const dv = new DataView(this.buffer, this.offset);
    fn.apply(dv, [0, value, true]);
    this.offset += bytesLength;
  }
  /**
   * Serializes a string. UTF8 string is supported. Serializes the string's bytes length "l" first,
   * and then serializes "l" bytes of the string content.
   *
   * BCS layout for "string": string_length | string_content. string_length is the bytes length of
   * the string that is uleb128 encoded. string_length is a u32 integer.
   *
   * @example
   * ```ts
   * const serializer = new Serializer();
   * serializer.serializeStr("çå∞≠¢õß∂ƒ∫");
   * assert(serializer.getBytes() === new Uint8Array([24, 0xc3, 0xa7, 0xc3, 0xa5, 0xe2, 0x88, 0x9e,
   * 0xe2, 0x89, 0xa0, 0xc2, 0xa2, 0xc3, 0xb5, 0xc3, 0x9f, 0xe2, 0x88, 0x82, 0xc6, 0x92, 0xe2, 0x88, 0xab]));
   * ```
   */
  serializeStr(value) {
    const textEncoder = new TextEncoder();
    this.serializeBytes(textEncoder.encode(value));
  }
  /**
   * Serializes an array of bytes.
   *
   * BCS layout for "bytes": bytes_length | bytes. bytes_length is the length of the bytes array that is
   * uleb128 encoded. bytes_length is a u32 integer.
   */
  serializeBytes(value) {
    this.serializeU32AsUleb128(value.length);
    this.serialize(value);
  }
  /**
   * Serializes an array of bytes with known length. Therefore length doesn't need to be
   * serialized to help deserialization.  When deserializing, the number of
   * bytes to deserialize needs to be passed in.
   */
  serializeFixedBytes(value) {
    this.serialize(value);
  }
  /**
   * Serializes a boolean value.
   *
   * BCS layout for "boolean": One byte. "0x01" for True and "0x00" for False.
   */
  serializeBool(value) {
    if (typeof value !== "boolean") {
      throw new Error("Value needs to be a boolean");
    }
    const byteValue = value ? 1 : 0;
    this.serialize(new Uint8Array([byteValue]));
  }
  serializeU8(value) {
    this.serialize(new Uint8Array([value]));
  }
  serializeU16(value) {
    this.serializeWithFunction(DataView.prototype.setUint16, 2, value);
  }
  serializeU32(value) {
    this.serializeWithFunction(DataView.prototype.setUint32, 4, value);
  }
  serializeU64(value) {
    const low = BigInt(value.toString()) & BigInt(MAX_U32_NUMBER);
    const high = BigInt(value.toString()) >> BigInt(32);
    this.serializeU32(Number(low));
    this.serializeU32(Number(high));
  }
  serializeU128(value) {
    const low = BigInt(value.toString()) & MAX_U64_BIG_INT;
    const high = BigInt(value.toString()) >> BigInt(64);
    this.serializeU64(low);
    this.serializeU64(high);
  }
  serializeU256(value) {
    const low = BigInt(value.toString()) & MAX_U128_BIG_INT;
    const high = BigInt(value.toString()) >> BigInt(128);
    this.serializeU128(low);
    this.serializeU128(high);
  }
  serializeU32AsUleb128(val) {
    let value = val;
    const valueArray = [];
    while (value >>> 7 !== 0) {
      valueArray.push(value & 127 | 128);
      value >>>= 7;
    }
    valueArray.push(value);
    this.serialize(new Uint8Array(valueArray));
  }
  /**
   * Returns the buffered bytes
   */
  getBytes() {
    return new Uint8Array(this.buffer).slice(0, this.offset);
  }
};
__decorateClass([checkNumberRange(0, MAX_U8_NUMBER)], Serializer.prototype, "serializeU8", 1);
__decorateClass([checkNumberRange(0, MAX_U16_NUMBER)], Serializer.prototype, "serializeU16", 1);
__decorateClass([checkNumberRange(0, MAX_U32_NUMBER)], Serializer.prototype, "serializeU32", 1);
__decorateClass([checkNumberRange(BigInt(0), MAX_U64_BIG_INT)], Serializer.prototype, "serializeU64", 1);
__decorateClass([checkNumberRange(BigInt(0), MAX_U128_BIG_INT)], Serializer.prototype, "serializeU128", 1);
__decorateClass([checkNumberRange(BigInt(0), MAX_U256_BIG_INT)], Serializer.prototype, "serializeU256", 1);
__decorateClass([checkNumberRange(0, MAX_U32_NUMBER)], Serializer.prototype, "serializeU32AsUleb128", 1);
function checkNumberRange(minValue, maxValue, message) {
  return (target, propertyKey, descriptor) => {
    const childFunction = descriptor.value;
    descriptor.value = function deco(value) {
      const valueBigInt = BigInt(value.toString());
      if (valueBigInt > BigInt(maxValue.toString()) || valueBigInt < BigInt(minValue.toString())) {
        throw new Error(message || "Value is out of range");
      }
      childFunction.apply(this, [value]);
    };
    return descriptor;
  };
}

// src/bcs/deserializer.ts
var Deserializer = class {
  constructor(data) {
    this.buffer = new ArrayBuffer(data.length);
    new Uint8Array(this.buffer).set(data, 0);
    this.offset = 0;
  }
  read(length) {
    if (this.offset + length > this.buffer.byteLength) {
      throw new Error("Reached to the end of buffer");
    }
    const bytes = this.buffer.slice(this.offset, this.offset + length);
    this.offset += length;
    return bytes;
  }
  /**
   * Deserializes a string. UTF8 string is supported. Reads the string's bytes length "l" first,
   * and then reads "l" bytes of content. Decodes the byte array into a string.
   *
   * BCS layout for "string": string_length | string_content. string_length is the bytes length of
   * the string that is uleb128 encoded. string_length is a u32 integer.
   *
   * @example
   * ```ts
   * const deserializer = new Deserializer(new Uint8Array([24, 0xc3, 0xa7, 0xc3, 0xa5, 0xe2, 0x88, 0x9e,
   * 0xe2, 0x89, 0xa0, 0xc2, 0xa2, 0xc3, 0xb5, 0xc3, 0x9f, 0xe2, 0x88, 0x82, 0xc6, 0x92, 0xe2, 0x88, 0xab]));
   * assert(deserializer.deserializeStr() === "çå∞≠¢õß∂ƒ∫");
   * ```
   */
  deserializeStr() {
    const value = this.deserializeBytes();
    const textDecoder = new TextDecoder();
    return textDecoder.decode(value);
  }
  /**
   * Deserializes an array of bytes.
   *
   * BCS layout for "bytes": bytes_length | bytes. bytes_length is the length of the bytes array that is
   * uleb128 encoded. bytes_length is a u32 integer.
   */
  deserializeBytes() {
    const len = this.deserializeUleb128AsU32();
    return new Uint8Array(this.read(len));
  }
  /**
   * Deserializes an array of bytes. The number of bytes to read is already known.
   *
   */
  deserializeFixedBytes(len) {
    return new Uint8Array(this.read(len));
  }
  /**
   * Deserializes a boolean value.
   *
   * BCS layout for "boolean": One byte. "0x01" for True and "0x00" for False.
   */
  deserializeBool() {
    const bool = new Uint8Array(this.read(1))[0];
    if (bool !== 1 && bool !== 0) {
      throw new Error("Invalid boolean value");
    }
    return bool === 1;
  }
  /**
   * Deserializes a uint8 number.
   *
   * BCS layout for "uint8": One byte. Binary format in little-endian representation.
   */
  deserializeU8() {
    return new DataView(this.read(1)).getUint8(0);
  }
  /**
   * Deserializes a uint16 number.
   *
   * BCS layout for "uint16": Two bytes. Binary format in little-endian representation.
   * @example
   * ```ts
   * const deserializer = new Deserializer(new Uint8Array([0x34, 0x12]));
   * assert(deserializer.deserializeU16() === 4660);
   * ```
   */
  deserializeU16() {
    return new DataView(this.read(2)).getUint16(0, true);
  }
  /**
   * Deserializes a uint32 number.
   *
   * BCS layout for "uint32": Four bytes. Binary format in little-endian representation.
   * @example
   * ```ts
   * const deserializer = new Deserializer(new Uint8Array([0x78, 0x56, 0x34, 0x12]));
   * assert(deserializer.deserializeU32() === 305419896);
   * ```
   */
  deserializeU32() {
    return new DataView(this.read(4)).getUint32(0, true);
  }
  /**
   * Deserializes a uint64 number.
   *
   * BCS layout for "uint64": Eight bytes. Binary format in little-endian representation.
   * @example
   * ```ts
   * const deserializer = new Deserializer(new Uint8Array([0x00, 0xEF, 0xCD, 0xAB, 0x78, 0x56, 0x34, 0x12]));
   * assert(deserializer.deserializeU64() === 1311768467750121216);
   * ```
   */
  deserializeU64() {
    const low = this.deserializeU32();
    const high = this.deserializeU32();
    return BigInt(BigInt(high) << BigInt(32) | BigInt(low));
  }
  /**
   * Deserializes a uint128 number.
   *
   * BCS layout for "uint128": Sixteen bytes. Binary format in little-endian representation.
   */
  deserializeU128() {
    const low = this.deserializeU64();
    const high = this.deserializeU64();
    return BigInt(high << BigInt(64) | low);
  }
  /**
   * Deserializes a uint256 number.
   *
   * BCS layout for "uint256": Thirty-two bytes. Binary format in little-endian representation.
   */
  deserializeU256() {
    const low = this.deserializeU128();
    const high = this.deserializeU128();
    return BigInt(high << BigInt(128) | low);
  }
  /**
   * Deserializes a uleb128 encoded uint32 number.
   *
   * BCS use uleb128 encoding in two cases: (1) lengths of variable-length sequences and (2) tags of enum values
   */
  deserializeUleb128AsU32() {
    let value = BigInt(0);
    let shift = 0;
    while (value < MAX_U32_NUMBER) {
      const byte = this.deserializeU8();
      value |= BigInt(byte & 127) << BigInt(shift);
      if ((byte & 128) === 0) {
        break;
      }
      shift += 7;
    }
    if (value > MAX_U32_NUMBER) {
      throw new Error("Overflow while parsing uleb128-encoded uint32 value");
    }
    return Number(value);
  }
};

// src/bcs/helper.ts
function serializeVector(value, serializer) {
  serializer.serializeU32AsUleb128(value.length);
  value.forEach(item => {
    item.serialize(serializer);
  });
}
function serializeVectorWithFunc(value, func) {
  const serializer = new Serializer();
  serializer.serializeU32AsUleb128(value.length);
  const f = serializer[func];
  value.forEach(item => {
    f.call(serializer, item);
  });
  return serializer.getBytes();
}
function deserializeVector(deserializer, cls) {
  const length = deserializer.deserializeUleb128AsU32();
  const list = [];
  for (let i = 0; i < length; i += 1) {
    list.push(cls.deserialize(deserializer));
  }
  return list;
}
function bcsToBytes(value) {
  const serializer = new Serializer();
  value.serialize(serializer);
  return serializer.getBytes();
}
function bcsSerializeUint64(value) {
  const serializer = new Serializer();
  serializer.serializeU64(value);
  return serializer.getBytes();
}
function bcsSerializeU8(value) {
  const serializer = new Serializer();
  serializer.serializeU8(value);
  return serializer.getBytes();
}
function bcsSerializeU16(value) {
  const serializer = new Serializer();
  serializer.serializeU16(value);
  return serializer.getBytes();
}
function bcsSerializeU32(value) {
  const serializer = new Serializer();
  serializer.serializeU32(value);
  return serializer.getBytes();
}
function bcsSerializeU128(value) {
  const serializer = new Serializer();
  serializer.serializeU128(value);
  return serializer.getBytes();
}
function bcsSerializeU256(value) {
  const serializer = new Serializer();
  serializer.serializeU256(value);
  return serializer.getBytes();
}
function bcsSerializeBool(value) {
  const serializer = new Serializer();
  serializer.serializeBool(value);
  return serializer.getBytes();
}
function bcsSerializeStr(value) {
  const serializer = new Serializer();
  serializer.serializeStr(value);
  return serializer.getBytes();
}
function bcsSerializeBytes(value) {
  const serializer = new Serializer();
  serializer.serializeBytes(value);
  return serializer.getBytes();
}
function bcsSerializeFixedBytes(value) {
  const serializer = new Serializer();
  serializer.serializeFixedBytes(value);
  return serializer.getBytes();
}

// src/aptos_types/transaction.ts

// src/aptos_types/account_address.ts
var _AccountAddress = class _AccountAddress {
  constructor(address) {
    if (address.length !== _AccountAddress.LENGTH) {
      throw new Error("Expected address of length 32");
    }
    this.address = address;
  }
  /**
   * Creates AccountAddress from a hex string.
   * @param addr Hex string can be with a prefix or without a prefix,
   *   e.g. '0x1aa' or '1aa'. Hex string will be left padded with 0s if too short.
   */
  static fromHex(addr) {
    let address = HexString.ensure(addr);
    if (address.noPrefix().length % 2 !== 0) {
      address = new HexString(`0${address.noPrefix()}`);
    }
    const addressBytes = address.toUint8Array();
    if (addressBytes.length > _AccountAddress.LENGTH) {
      throw new Error("Hex string is too long. Address's length is 32 bytes.");
    } else if (addressBytes.length === _AccountAddress.LENGTH) {
      return new _AccountAddress(addressBytes);
    }
    const res = new Uint8Array(_AccountAddress.LENGTH);
    res.set(addressBytes, _AccountAddress.LENGTH - addressBytes.length);
    return new _AccountAddress(res);
  }
  /**
   * Checks if the string is a valid AccountAddress
   * @param addr Hex string can be with a prefix or without a prefix,
   *   e.g. '0x1aa' or '1aa'. Hex string will be left padded with 0s if too short.
   */
  static isValid(addr) {
    if (addr === "") {
      return false;
    }
    let address = HexString.ensure(addr);
    if (address.noPrefix().length % 2 !== 0) {
      address = new HexString(`0${address.noPrefix()}`);
    }
    const addressBytes = address.toUint8Array();
    return addressBytes.length <= _AccountAddress.LENGTH;
  }
  /**
   * Return a hex string from account Address.
   */
  toHexString() {
    return HexString.fromUint8Array(this.address).hex();
  }
  serialize(serializer) {
    serializer.serializeFixedBytes(this.address);
  }
  static deserialize(deserializer) {
    return new _AccountAddress(deserializer.deserializeFixedBytes(_AccountAddress.LENGTH));
  }
  /**
   * Standardizes an address to the format "0x" followed by 64 lowercase hexadecimal digits.
   */
  static standardizeAddress(address) {
    const lowercaseAddress = address.toLowerCase();
    const addressWithoutPrefix = lowercaseAddress.startsWith("0x") ? lowercaseAddress.slice(2) : lowercaseAddress;
    const addressWithPadding = addressWithoutPrefix.padStart(64, "0");
    return `0x${addressWithPadding}`;
  }
};
_AccountAddress.LENGTH = 32;
_AccountAddress.CORE_CODE_ADDRESS = _AccountAddress.fromHex("0x1");
var AccountAddress = _AccountAddress;

// src/aptos_types/ed25519.ts
var _Ed25519PublicKey = class _Ed25519PublicKey {
  constructor(value) {
    if (value.length !== _Ed25519PublicKey.LENGTH) {
      throw new Error(`Ed25519PublicKey length should be ${_Ed25519PublicKey.LENGTH}`);
    }
    this.value = value;
  }
  toBytes() {
    return this.value;
  }
  serialize(serializer) {
    serializer.serializeBytes(this.value);
  }
  static deserialize(deserializer) {
    const value = deserializer.deserializeBytes();
    return new _Ed25519PublicKey(value);
  }
};
_Ed25519PublicKey.LENGTH = 32;
var Ed25519PublicKey = _Ed25519PublicKey;
var _Ed25519Signature = class _Ed25519Signature {
  constructor(value) {
    this.value = value;
    if (value.length !== _Ed25519Signature.LENGTH) {
      throw new Error(`Ed25519Signature length should be ${_Ed25519Signature.LENGTH}`);
    }
  }
  serialize(serializer) {
    serializer.serializeBytes(this.value);
  }
  static deserialize(deserializer) {
    const value = deserializer.deserializeBytes();
    return new _Ed25519Signature(value);
  }
};
_Ed25519Signature.LENGTH = 64;
var Ed25519Signature = _Ed25519Signature;

// src/aptos_types/multi_ed25519.ts
var MAX_SIGNATURES_SUPPORTED = 32;
var MultiEd25519PublicKey = class _MultiEd25519PublicKey {
  /**
   * Public key for a K-of-N multisig transaction. A K-of-N multisig transaction means that for such a
   * transaction to be executed, at least K out of the N authorized signers have signed the transaction
   * and passed the check conducted by the chain.
   *
   * @see {@link
   * https://aptos.dev/guides/creating-a-signed-transaction#multisignature-transactions | Creating a Signed Transaction}
   *
   * @param public_keys A list of public keys
   * @param threshold At least "threshold" signatures must be valid
   */
  constructor(public_keys, threshold) {
    this.public_keys = public_keys;
    this.threshold = threshold;
    if (threshold > MAX_SIGNATURES_SUPPORTED) {
      throw new Error(`"threshold" cannot be larger than ${MAX_SIGNATURES_SUPPORTED}`);
    }
  }
  /**
   * Converts a MultiEd25519PublicKey into bytes with: bytes = p1_bytes | ... | pn_bytes | threshold
   */
  toBytes() {
    const bytes = new Uint8Array(this.public_keys.length * Ed25519PublicKey.LENGTH + 1);
    this.public_keys.forEach((k, i) => {
      bytes.set(k.value, i * Ed25519PublicKey.LENGTH);
    });
    bytes[this.public_keys.length * Ed25519PublicKey.LENGTH] = this.threshold;
    return bytes;
  }
  serialize(serializer) {
    serializer.serializeBytes(this.toBytes());
  }
  static deserialize(deserializer) {
    const bytes = deserializer.deserializeBytes();
    const threshold = bytes[bytes.length - 1];
    const keys = [];
    for (let i = 0; i < bytes.length - 1; i += Ed25519PublicKey.LENGTH) {
      const begin = i;
      keys.push(new Ed25519PublicKey(bytes.subarray(begin, begin + Ed25519PublicKey.LENGTH)));
    }
    return new _MultiEd25519PublicKey(keys, threshold);
  }
};
var _MultiEd25519Signature = class _MultiEd25519Signature {
  /**
   * Signature for a K-of-N multisig transaction.
   *
   * @see {@link
   * https://aptos.dev/guides/creating-a-signed-transaction#multisignature-transactions | Creating a Signed Transaction}
   *
   * @param signatures A list of ed25519 signatures
   * @param bitmap 4 bytes, at most 32 signatures are supported. If Nth bit value is `1`, the Nth
   * signature should be provided in `signatures`. Bits are read from left to right
   */
  constructor(signatures, bitmap) {
    this.signatures = signatures;
    this.bitmap = bitmap;
    if (bitmap.length !== _MultiEd25519Signature.BITMAP_LEN) {
      throw new Error(`"bitmap" length should be ${_MultiEd25519Signature.BITMAP_LEN}`);
    }
  }
  /**
   * Converts a MultiEd25519Signature into bytes with `bytes = s1_bytes | ... | sn_bytes | bitmap`
   */
  toBytes() {
    const bytes = new Uint8Array(this.signatures.length * Ed25519Signature.LENGTH + _MultiEd25519Signature.BITMAP_LEN);
    this.signatures.forEach((k, i) => {
      bytes.set(k.value, i * Ed25519Signature.LENGTH);
    });
    bytes.set(this.bitmap, this.signatures.length * Ed25519Signature.LENGTH);
    return bytes;
  }
  /**
   * Helper method to create a bitmap out of the specified bit positions
   * @param bits The bitmap positions that should be set. A position starts at index 0.
   * Valid position should range between 0 and 31.
   * @example
   * Here's an example of valid `bits`
   * ```
   * [0, 2, 31]
   * ```
   * `[0, 2, 31]` means the 1st, 3rd and 32nd bits should be set in the bitmap.
   * The result bitmap should be 0b1010000000000000000000000000001
   *
   * @returns bitmap that is 32bit long
   */
  static createBitmap(bits) {
    const firstBitInByte = 128;
    const bitmap = new Uint8Array([0, 0, 0, 0]);
    const dupCheckSet = /* @__PURE__ */new Set();
    bits.forEach(bit => {
      if (bit >= MAX_SIGNATURES_SUPPORTED) {
        throw new Error(`Invalid bit value ${bit}.`);
      }
      if (dupCheckSet.has(bit)) {
        throw new Error("Duplicated bits detected.");
      }
      dupCheckSet.add(bit);
      const byteOffset = Math.floor(bit / 8);
      let byte = bitmap[byteOffset];
      byte |= firstBitInByte >> bit % 8;
      bitmap[byteOffset] = byte;
    });
    return bitmap;
  }
  serialize(serializer) {
    serializer.serializeBytes(this.toBytes());
  }
  static deserialize(deserializer) {
    const bytes = deserializer.deserializeBytes();
    const bitmap = bytes.subarray(bytes.length - 4);
    const sigs = [];
    for (let i = 0; i < bytes.length - bitmap.length; i += Ed25519Signature.LENGTH) {
      const begin = i;
      sigs.push(new Ed25519Signature(bytes.subarray(begin, begin + Ed25519Signature.LENGTH)));
    }
    return new _MultiEd25519Signature(sigs, bitmap);
  }
};
_MultiEd25519Signature.BITMAP_LEN = 4;
var MultiEd25519Signature = _MultiEd25519Signature;

// src/aptos_types/authenticator.ts
var TransactionAuthenticator = class {
  static deserialize(deserializer) {
    const index = deserializer.deserializeUleb128AsU32();
    switch (index) {
      case 0:
        return TransactionAuthenticatorEd25519.load(deserializer);
      case 1:
        return TransactionAuthenticatorMultiEd25519.load(deserializer);
      case 2:
        return TransactionAuthenticatorMultiAgent.load(deserializer);
      case 3:
        return TransactionAuthenticatorFeePayer.load(deserializer);
      default:
        throw new Error(`Unknown variant index for TransactionAuthenticator: ${index}`);
    }
  }
};
var TransactionAuthenticatorEd25519 = class _TransactionAuthenticatorEd25519 extends TransactionAuthenticator {
  /**
   * An authenticator for single signature.
   *
   * @param public_key Client's public key.
   * @param signature Signature of a raw transaction.
   * @see {@link https://aptos.dev/guides/creating-a-signed-transaction/ | Creating a Signed Transaction}
   * for details about generating a signature.
   */
  constructor(public_key, signature) {
    super();
    this.public_key = public_key;
    this.signature = signature;
  }
  serialize(serializer) {
    serializer.serializeU32AsUleb128(0);
    this.public_key.serialize(serializer);
    this.signature.serialize(serializer);
  }
  static load(deserializer) {
    const public_key = Ed25519PublicKey.deserialize(deserializer);
    const signature = Ed25519Signature.deserialize(deserializer);
    return new _TransactionAuthenticatorEd25519(public_key, signature);
  }
};
var TransactionAuthenticatorMultiEd25519 = class _TransactionAuthenticatorMultiEd25519 extends TransactionAuthenticator {
  /**
   * An authenticator for multiple signatures.
   *
   * @param public_key
   * @param signature
   *
   */
  constructor(public_key, signature) {
    super();
    this.public_key = public_key;
    this.signature = signature;
  }
  serialize(serializer) {
    serializer.serializeU32AsUleb128(1);
    this.public_key.serialize(serializer);
    this.signature.serialize(serializer);
  }
  static load(deserializer) {
    const public_key = MultiEd25519PublicKey.deserialize(deserializer);
    const signature = MultiEd25519Signature.deserialize(deserializer);
    return new _TransactionAuthenticatorMultiEd25519(public_key, signature);
  }
};
var TransactionAuthenticatorMultiAgent = class _TransactionAuthenticatorMultiAgent extends TransactionAuthenticator {
  constructor(sender, secondary_signer_addresses, secondary_signers) {
    super();
    this.sender = sender;
    this.secondary_signer_addresses = secondary_signer_addresses;
    this.secondary_signers = secondary_signers;
  }
  serialize(serializer) {
    serializer.serializeU32AsUleb128(2);
    this.sender.serialize(serializer);
    serializeVector(this.secondary_signer_addresses, serializer);
    serializeVector(this.secondary_signers, serializer);
  }
  static load(deserializer) {
    const sender = AccountAuthenticator.deserialize(deserializer);
    const secondary_signer_addresses = deserializeVector(deserializer, AccountAddress);
    const secondary_signers = deserializeVector(deserializer, AccountAuthenticator);
    return new _TransactionAuthenticatorMultiAgent(sender, secondary_signer_addresses, secondary_signers);
  }
};
var TransactionAuthenticatorFeePayer = class _TransactionAuthenticatorFeePayer extends TransactionAuthenticator {
  constructor(sender, secondary_signer_addresses, secondary_signers, fee_payer) {
    super();
    this.sender = sender;
    this.secondary_signer_addresses = secondary_signer_addresses;
    this.secondary_signers = secondary_signers;
    this.fee_payer = fee_payer;
  }
  serialize(serializer) {
    serializer.serializeU32AsUleb128(3);
    this.sender.serialize(serializer);
    serializeVector(this.secondary_signer_addresses, serializer);
    serializeVector(this.secondary_signers, serializer);
    this.fee_payer.address.serialize(serializer);
    this.fee_payer.authenticator.serialize(serializer);
  }
  static load(deserializer) {
    const sender = AccountAuthenticator.deserialize(deserializer);
    const secondary_signer_addresses = deserializeVector(deserializer, AccountAddress);
    const secondary_signers = deserializeVector(deserializer, AccountAuthenticator);
    const address = AccountAddress.deserialize(deserializer);
    const authenticator = AccountAuthenticator.deserialize(deserializer);
    const fee_payer = {
      address,
      authenticator
    };
    return new _TransactionAuthenticatorFeePayer(sender, secondary_signer_addresses, secondary_signers, fee_payer);
  }
};
var AccountAuthenticator = class {
  static deserialize(deserializer) {
    const index = deserializer.deserializeUleb128AsU32();
    switch (index) {
      case 0:
        return AccountAuthenticatorEd25519.load(deserializer);
      case 1:
        return AccountAuthenticatorMultiEd25519.load(deserializer);
      default:
        throw new Error(`Unknown variant index for AccountAuthenticator: ${index}`);
    }
  }
};
var AccountAuthenticatorEd25519 = class _AccountAuthenticatorEd25519 extends AccountAuthenticator {
  constructor(public_key, signature) {
    super();
    this.public_key = public_key;
    this.signature = signature;
  }
  serialize(serializer) {
    serializer.serializeU32AsUleb128(0);
    this.public_key.serialize(serializer);
    this.signature.serialize(serializer);
  }
  static load(deserializer) {
    const public_key = Ed25519PublicKey.deserialize(deserializer);
    const signature = Ed25519Signature.deserialize(deserializer);
    return new _AccountAuthenticatorEd25519(public_key, signature);
  }
};
var AccountAuthenticatorMultiEd25519 = class _AccountAuthenticatorMultiEd25519 extends AccountAuthenticator {
  constructor(public_key, signature) {
    super();
    this.public_key = public_key;
    this.signature = signature;
  }
  serialize(serializer) {
    serializer.serializeU32AsUleb128(1);
    this.public_key.serialize(serializer);
    this.signature.serialize(serializer);
  }
  static load(deserializer) {
    const public_key = MultiEd25519PublicKey.deserialize(deserializer);
    const signature = MultiEd25519Signature.deserialize(deserializer);
    return new _AccountAuthenticatorMultiEd25519(public_key, signature);
  }
};

// src/aptos_types/identifier.ts
var Identifier = class _Identifier {
  constructor(value) {
    this.value = value;
  }
  serialize(serializer) {
    serializer.serializeStr(this.value);
  }
  static deserialize(deserializer) {
    const value = deserializer.deserializeStr();
    return new _Identifier(value);
  }
};

// src/aptos_types/type_tag.ts
var TypeTag = class {
  static deserialize(deserializer) {
    const index = deserializer.deserializeUleb128AsU32();
    switch (index) {
      case 0:
        return TypeTagBool.load(deserializer);
      case 1:
        return TypeTagU8.load(deserializer);
      case 2:
        return TypeTagU64.load(deserializer);
      case 3:
        return TypeTagU128.load(deserializer);
      case 4:
        return TypeTagAddress.load(deserializer);
      case 5:
        return TypeTagSigner.load(deserializer);
      case 6:
        return TypeTagVector.load(deserializer);
      case 7:
        return TypeTagStruct.load(deserializer);
      case 8:
        return TypeTagU16.load(deserializer);
      case 9:
        return TypeTagU32.load(deserializer);
      case 10:
        return TypeTagU256.load(deserializer);
      default:
        throw new Error(`Unknown variant index for TypeTag: ${index}`);
    }
  }
};
var TypeTagBool = class _TypeTagBool extends TypeTag {
  serialize(serializer) {
    serializer.serializeU32AsUleb128(0);
  }
  static load(_deserializer) {
    return new _TypeTagBool();
  }
};
var TypeTagU8 = class _TypeTagU8 extends TypeTag {
  serialize(serializer) {
    serializer.serializeU32AsUleb128(1);
  }
  static load(_deserializer) {
    return new _TypeTagU8();
  }
};
var TypeTagU16 = class _TypeTagU16 extends TypeTag {
  serialize(serializer) {
    serializer.serializeU32AsUleb128(8);
  }
  static load(_deserializer) {
    return new _TypeTagU16();
  }
};
var TypeTagU32 = class _TypeTagU32 extends TypeTag {
  serialize(serializer) {
    serializer.serializeU32AsUleb128(9);
  }
  static load(_deserializer) {
    return new _TypeTagU32();
  }
};
var TypeTagU64 = class _TypeTagU64 extends TypeTag {
  serialize(serializer) {
    serializer.serializeU32AsUleb128(2);
  }
  static load(_deserializer) {
    return new _TypeTagU64();
  }
};
var TypeTagU128 = class _TypeTagU128 extends TypeTag {
  serialize(serializer) {
    serializer.serializeU32AsUleb128(3);
  }
  static load(_deserializer) {
    return new _TypeTagU128();
  }
};
var TypeTagU256 = class _TypeTagU256 extends TypeTag {
  serialize(serializer) {
    serializer.serializeU32AsUleb128(10);
  }
  static load(_deserializer) {
    return new _TypeTagU256();
  }
};
var TypeTagAddress = class _TypeTagAddress extends TypeTag {
  serialize(serializer) {
    serializer.serializeU32AsUleb128(4);
  }
  static load(_deserializer) {
    return new _TypeTagAddress();
  }
};
var TypeTagSigner = class _TypeTagSigner extends TypeTag {
  serialize(serializer) {
    serializer.serializeU32AsUleb128(5);
  }
  static load(_deserializer) {
    return new _TypeTagSigner();
  }
};
var TypeTagVector = class _TypeTagVector extends TypeTag {
  constructor(value) {
    super();
    this.value = value;
  }
  serialize(serializer) {
    serializer.serializeU32AsUleb128(6);
    this.value.serialize(serializer);
  }
  static load(deserializer) {
    const value = TypeTag.deserialize(deserializer);
    return new _TypeTagVector(value);
  }
};
var TypeTagStruct = class _TypeTagStruct extends TypeTag {
  constructor(value) {
    super();
    this.value = value;
  }
  serialize(serializer) {
    serializer.serializeU32AsUleb128(7);
    this.value.serialize(serializer);
  }
  static load(deserializer) {
    const value = StructTag.deserialize(deserializer);
    return new _TypeTagStruct(value);
  }
  isStringTypeTag() {
    if (this.value.module_name.value === "string" && this.value.name.value === "String" && this.value.address.toHexString() === AccountAddress.CORE_CODE_ADDRESS.toHexString()) {
      return true;
    }
    return false;
  }
};
var StructTag = class _StructTag {
  constructor(address, module_name, name, type_args) {
    this.address = address;
    this.module_name = module_name;
    this.name = name;
    this.type_args = type_args;
  }
  /**
   * Converts a string literal to a StructTag
   * @param structTag String literal in format "AcountAddress::module_name::ResourceName",
   *   e.g. "0x1::aptos_coin::AptosCoin"
   * @returns
   */
  static fromString(structTag) {
    const typeTagStruct = new TypeTagParser(structTag).parseTypeTag();
    return new _StructTag(typeTagStruct.value.address, typeTagStruct.value.module_name, typeTagStruct.value.name, typeTagStruct.value.type_args);
  }
  serialize(serializer) {
    this.address.serialize(serializer);
    this.module_name.serialize(serializer);
    this.name.serialize(serializer);
    serializeVector(this.type_args, serializer);
  }
  static deserialize(deserializer) {
    const address = AccountAddress.deserialize(deserializer);
    const moduleName = Identifier.deserialize(deserializer);
    const name = Identifier.deserialize(deserializer);
    const typeArgs = deserializeVector(deserializer, TypeTag);
    return new _StructTag(address, moduleName, name, typeArgs);
  }
};
var stringStructTag = new StructTag(AccountAddress.fromHex("0x1"), new Identifier("string"), new Identifier("String"), []);
function optionStructTag(typeArg) {
  return new StructTag(AccountAddress.fromHex("0x1"), new Identifier("option"), new Identifier("Option"), [typeArg]);
}
function objectStructTag(typeArg) {
  return new StructTag(AccountAddress.fromHex("0x1"), new Identifier("object"), new Identifier("Object"), [typeArg]);
}
function bail(message) {
  throw new TypeTagParserError(message);
}
function isWhiteSpace(c) {
  if (c.match(/\s/)) {
    return true;
  }
  return false;
}
function isValidAlphabetic(c) {
  if (c.match(/[_A-Za-z0-9]/g)) {
    return true;
  }
  return false;
}
function isGeneric(c) {
  if (c.match(/T\d+/g)) {
    return true;
  }
  return false;
}
function nextToken(tagStr, pos) {
  const c = tagStr[pos];
  if (c === ":") {
    if (tagStr.slice(pos, pos + 2) === "::") {
      return [["COLON", "::"], 2];
    }
    bail("Unrecognized token.");
  } else if (c === "<") {
    return [["LT", "<"], 1];
  } else if (c === ">") {
    return [["GT", ">"], 1];
  } else if (c === ",") {
    return [["COMMA", ","], 1];
  } else if (isWhiteSpace(c)) {
    let res = "";
    for (let i = pos; i < tagStr.length; i += 1) {
      const char = tagStr[i];
      if (isWhiteSpace(char)) {
        res = `${res}${char}`;
      } else {
        break;
      }
    }
    return [["SPACE", res], res.length];
  } else if (isValidAlphabetic(c)) {
    let res = "";
    for (let i = pos; i < tagStr.length; i += 1) {
      const char = tagStr[i];
      if (isValidAlphabetic(char)) {
        res = `${res}${char}`;
      } else {
        break;
      }
    }
    if (isGeneric(res)) {
      return [["GENERIC", res], res.length];
    }
    return [["IDENT", res], res.length];
  }
  throw new Error("Unrecognized token.");
}
function tokenize(tagStr) {
  let pos = 0;
  const tokens = [];
  while (pos < tagStr.length) {
    const [token, size] = nextToken(tagStr, pos);
    if (token[0] !== "SPACE") {
      tokens.push(token);
    }
    pos += size;
  }
  return tokens;
}
var TypeTagParser = exports.TypeTagParser = class _TypeTagParser {
  constructor(tagStr, typeTags) {
    this.typeTags = [];
    this.tokens = tokenize(tagStr);
    this.typeTags = typeTags || [];
  }
  consume(targetToken) {
    const token = this.tokens.shift();
    if (!token || token[1] !== targetToken) {
      bail("Invalid type tag.");
    }
  }
  /**
   * Consumes all of an unused generic field, mostly applicable to object
   *
   * Note: This is recursive.  it can be problematic if there's bad input
   * @private
   */
  consumeWholeGeneric() {
    this.consume("<");
    while (this.tokens[0][1] !== ">") {
      if (this.tokens[0][1] === "<") {
        this.consumeWholeGeneric();
      } else {
        this.tokens.shift();
      }
    }
    this.consume(">");
  }
  parseCommaList(endToken, allowTraillingComma) {
    const res = [];
    if (this.tokens.length <= 0) {
      bail("Invalid type tag.");
    }
    while (this.tokens[0][1] !== endToken) {
      res.push(this.parseTypeTag());
      if (this.tokens.length > 0 && this.tokens[0][1] === endToken) {
        break;
      }
      this.consume(",");
      if (this.tokens.length > 0 && this.tokens[0][1] === endToken && allowTraillingComma) {
        break;
      }
      if (this.tokens.length <= 0) {
        bail("Invalid type tag.");
      }
    }
    return res;
  }
  parseTypeTag() {
    if (this.tokens.length === 0) {
      bail("Invalid type tag.");
    }
    const [tokenTy, tokenVal] = this.tokens.shift();
    if (tokenVal === "u8") {
      return new TypeTagU8();
    }
    if (tokenVal === "u16") {
      return new TypeTagU16();
    }
    if (tokenVal === "u32") {
      return new TypeTagU32();
    }
    if (tokenVal === "u64") {
      return new TypeTagU64();
    }
    if (tokenVal === "u128") {
      return new TypeTagU128();
    }
    if (tokenVal === "u256") {
      return new TypeTagU256();
    }
    if (tokenVal === "bool") {
      return new TypeTagBool();
    }
    if (tokenVal === "address") {
      return new TypeTagAddress();
    }
    if (tokenVal === "vector") {
      this.consume("<");
      const res = this.parseTypeTag();
      this.consume(">");
      return new TypeTagVector(res);
    }
    if (tokenVal === "string") {
      return new TypeTagStruct(stringStructTag);
    }
    if (tokenTy === "IDENT" && (tokenVal.startsWith("0x") || tokenVal.startsWith("0X"))) {
      const address = AccountAddress.fromHex(tokenVal);
      this.consume("::");
      const [moduleTokenTy, module] = this.tokens.shift();
      if (moduleTokenTy !== "IDENT") {
        bail("Invalid type tag.");
      }
      this.consume("::");
      const [nameTokenTy, name] = this.tokens.shift();
      if (nameTokenTy !== "IDENT") {
        bail("Invalid type tag.");
      }
      if (AccountAddress.CORE_CODE_ADDRESS.toHexString() === address.toHexString() && module === "object" && name === "Object") {
        this.consumeWholeGeneric();
        return new TypeTagAddress();
      }
      let tyTags = [];
      if (this.tokens.length > 0 && this.tokens[0][1] === "<") {
        this.consume("<");
        tyTags = this.parseCommaList(">", true);
        this.consume(">");
      }
      const structTag = new StructTag(address, new Identifier(module), new Identifier(name), tyTags);
      return new TypeTagStruct(structTag);
    }
    if (tokenTy === "GENERIC") {
      if (this.typeTags.length === 0) {
        bail("Can't convert generic type since no typeTags were specified.");
      }
      const idx = parseInt(tokenVal.substring(1), 10);
      return new _TypeTagParser(this.typeTags[idx]).parseTypeTag();
    }
    throw new Error("Invalid type tag.");
  }
};
var TypeTagParserError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "TypeTagParserError";
  }
};

// src/aptos_types/transaction.ts
var RawTransaction = class _RawTransaction {
  /**
   * RawTransactions contain the metadata and payloads that can be submitted to Aptos chain for execution.
   * RawTransactions must be signed before Aptos chain can execute them.
   *
   * @param sender Account address of the sender.
   * @param sequence_number Sequence number of this transaction. This must match the sequence number stored in
   *   the sender's account at the time the transaction executes.
   * @param payload Instructions for the Aptos Blockchain, including publishing a module,
   *   execute a entry function or execute a script payload.
   * @param max_gas_amount Maximum total gas to spend for this transaction. The account must have more
   *   than this gas or the transaction will be discarded during validation.
   * @param gas_unit_price Price to be paid per gas unit.
   * @param expiration_timestamp_secs The blockchain timestamp at which the blockchain would discard this transaction.
   * @param chain_id The chain ID of the blockchain that this transaction is intended to be run on.
   */
  constructor(sender, sequence_number, payload, max_gas_amount, gas_unit_price, expiration_timestamp_secs, chain_id) {
    this.sender = sender;
    this.sequence_number = sequence_number;
    this.payload = payload;
    this.max_gas_amount = max_gas_amount;
    this.gas_unit_price = gas_unit_price;
    this.expiration_timestamp_secs = expiration_timestamp_secs;
    this.chain_id = chain_id;
  }
  serialize(serializer) {
    this.sender.serialize(serializer);
    serializer.serializeU64(this.sequence_number);
    this.payload.serialize(serializer);
    serializer.serializeU64(this.max_gas_amount);
    serializer.serializeU64(this.gas_unit_price);
    serializer.serializeU64(this.expiration_timestamp_secs);
    this.chain_id.serialize(serializer);
  }
  static deserialize(deserializer) {
    const sender = AccountAddress.deserialize(deserializer);
    const sequence_number = deserializer.deserializeU64();
    const payload = TransactionPayload.deserialize(deserializer);
    const max_gas_amount = deserializer.deserializeU64();
    const gas_unit_price = deserializer.deserializeU64();
    const expiration_timestamp_secs = deserializer.deserializeU64();
    const chain_id = ChainId.deserialize(deserializer);
    return new _RawTransaction(sender, sequence_number, payload, max_gas_amount, gas_unit_price, expiration_timestamp_secs, chain_id);
  }
};
var Script = class _Script {
  /**
   * Scripts contain the Move bytecodes payload that can be submitted to Aptos chain for execution.
   * @param code Move bytecode
   * @param ty_args Type arguments that bytecode requires.
   *
   * @example
   * A coin transfer function has one type argument "CoinType".
   * ```
   * public(script) fun transfer<CoinType>(from: &signer, to: address, amount: u64,)
   * ```
   * @param args Arugments to bytecode function.
   *
   * @example
   * A coin transfer function has three arugments "from", "to" and "amount".
   * ```
   * public(script) fun transfer<CoinType>(from: &signer, to: address, amount: u64,)
   * ```
   */
  constructor(code, ty_args, args) {
    this.code = code;
    this.ty_args = ty_args;
    this.args = args;
  }
  serialize(serializer) {
    serializer.serializeBytes(this.code);
    serializeVector(this.ty_args, serializer);
    serializeVector(this.args, serializer);
  }
  static deserialize(deserializer) {
    const code = deserializer.deserializeBytes();
    const ty_args = deserializeVector(deserializer, TypeTag);
    const args = deserializeVector(deserializer, TransactionArgument);
    return new _Script(code, ty_args, args);
  }
};
var EntryFunction = class _EntryFunction {
  /**
   * Contains the payload to run a function within a module.
   * @param module_name Fully qualified module name. ModuleId consists of account address and module name.
   * @param function_name The function to run.
   * @param ty_args Type arguments that move function requires.
   *
   * @example
   * A coin transfer function has one type argument "CoinType".
   * ```
   * public(script) fun transfer<CoinType>(from: &signer, to: address, amount: u64,)
   * ```
   * @param args Arugments to the move function.
   *
   * @example
   * A coin transfer function has three arugments "from", "to" and "amount".
   * ```
   * public(script) fun transfer<CoinType>(from: &signer, to: address, amount: u64,)
   * ```
   */
  constructor(module_name, function_name, ty_args, args) {
    this.module_name = module_name;
    this.function_name = function_name;
    this.ty_args = ty_args;
    this.args = args;
  }
  /**
   *
   * @param module Fully qualified module name in format "AccountAddress::module_name" e.g. "0x1::coin"
   * @param func Function name
   * @param ty_args Type arguments that move function requires.
   *
   * @example
   * A coin transfer function has one type argument "CoinType".
   * ```
   * public(script) fun transfer<CoinType>(from: &signer, to: address, amount: u64,)
   * ```
   * @param args Arugments to the move function.
   *
   * @example
   * A coin transfer function has three arugments "from", "to" and "amount".
   * ```
   * public(script) fun transfer<CoinType>(from: &signer, to: address, amount: u64,)
   * ```
   * @returns
   */
  static natural(module, func, ty_args, args) {
    return new _EntryFunction(ModuleId.fromStr(module), new Identifier(func), ty_args, args);
  }
  /**
   * `natual` is deprecated, please use `natural`
   *
   * @deprecated.
   */
  static natual(module, func, ty_args, args) {
    return _EntryFunction.natural(module, func, ty_args, args);
  }
  serialize(serializer) {
    this.module_name.serialize(serializer);
    this.function_name.serialize(serializer);
    serializeVector(this.ty_args, serializer);
    serializer.serializeU32AsUleb128(this.args.length);
    this.args.forEach(item => {
      serializer.serializeBytes(item);
    });
  }
  static deserialize(deserializer) {
    const module_name = ModuleId.deserialize(deserializer);
    const function_name = Identifier.deserialize(deserializer);
    const ty_args = deserializeVector(deserializer, TypeTag);
    const length = deserializer.deserializeUleb128AsU32();
    const list = [];
    for (let i = 0; i < length; i += 1) {
      list.push(deserializer.deserializeBytes());
    }
    const args = list;
    return new _EntryFunction(module_name, function_name, ty_args, args);
  }
};
var MultiSigTransactionPayload = class _MultiSigTransactionPayload {
  /**
   * Contains the payload to run a multisig account transaction.
   * @param transaction_payload The payload of the multisig transaction. This can only be EntryFunction for now but
   * Script might be supported in the future.
   */
  constructor(transaction_payload) {
    this.transaction_payload = transaction_payload;
  }
  serialize(serializer) {
    serializer.serializeU32AsUleb128(0);
    this.transaction_payload.serialize(serializer);
  }
  static deserialize(deserializer) {
    deserializer.deserializeUleb128AsU32();
    return new _MultiSigTransactionPayload(EntryFunction.deserialize(deserializer));
  }
};
var MultiSig = class _MultiSig {
  /**
   * Contains the payload to run a multisig account transaction.
   * @param multisig_address The multisig account address the transaction will be executed as.
   * @param transaction_payload The payload of the multisig transaction. This is optional when executing a multisig
   *  transaction whose payload is already stored on chain.
   */
  constructor(multisig_address, transaction_payload) {
    this.multisig_address = multisig_address;
    this.transaction_payload = transaction_payload;
  }
  serialize(serializer) {
    this.multisig_address.serialize(serializer);
    if (this.transaction_payload === void 0) {
      serializer.serializeBool(false);
    } else {
      serializer.serializeBool(true);
      this.transaction_payload.serialize(serializer);
    }
  }
  static deserialize(deserializer) {
    const multisig_address = AccountAddress.deserialize(deserializer);
    const payloadPresent = deserializer.deserializeBool();
    let transaction_payload;
    if (payloadPresent) {
      transaction_payload = MultiSigTransactionPayload.deserialize(deserializer);
    }
    return new _MultiSig(multisig_address, transaction_payload);
  }
};
var Module = class _Module {
  /**
   * Contains the bytecode of a Move module that can be published to the Aptos chain.
   * @param code Move bytecode of a module.
   */
  constructor(code) {
    this.code = code;
  }
  serialize(serializer) {
    serializer.serializeBytes(this.code);
  }
  static deserialize(deserializer) {
    const code = deserializer.deserializeBytes();
    return new _Module(code);
  }
};
var ModuleId = class _ModuleId {
  /**
   * Full name of a module.
   * @param address The account address.
   * @param name The name of the module under the account at "address".
   */
  constructor(address, name) {
    this.address = address;
    this.name = name;
  }
  /**
   * Converts a string literal to a ModuleId
   * @param moduleId String literal in format "AccountAddress::module_name", e.g. "0x1::coin"
   * @returns
   */
  static fromStr(moduleId) {
    const parts = moduleId.split("::");
    if (parts.length !== 2) {
      throw new Error("Invalid module id.");
    }
    return new _ModuleId(AccountAddress.fromHex(new HexString(parts[0])), new Identifier(parts[1]));
  }
  serialize(serializer) {
    this.address.serialize(serializer);
    this.name.serialize(serializer);
  }
  static deserialize(deserializer) {
    const address = AccountAddress.deserialize(deserializer);
    const name = Identifier.deserialize(deserializer);
    return new _ModuleId(address, name);
  }
};
var ChangeSet = class {
  serialize(serializer) {
    throw new Error("Not implemented.");
  }
  static deserialize(deserializer) {
    throw new Error("Not implemented.");
  }
};
var WriteSet = class {
  serialize(serializer) {
    throw new Error("Not implmented.");
  }
  static deserialize(deserializer) {
    throw new Error("Not implmented.");
  }
};
var SignedTransaction = class _SignedTransaction {
  /**
   * A SignedTransaction consists of a raw transaction and an authenticator. The authenticator
   * contains a client's public key and the signature of the raw transaction.
   *
   * @see {@link https://aptos.dev/guides/creating-a-signed-transaction/ | Creating a Signed Transaction}
   *
   * @param raw_txn
   * @param authenticator Contains a client's public key and the signature of the raw transaction.
   *   Authenticator has 3 flavors: single signature, multi-signature and multi-agent.
   *   @see authenticator.ts for details.
   */
  constructor(raw_txn, authenticator) {
    this.raw_txn = raw_txn;
    this.authenticator = authenticator;
  }
  serialize(serializer) {
    this.raw_txn.serialize(serializer);
    this.authenticator.serialize(serializer);
  }
  static deserialize(deserializer) {
    const raw_txn = RawTransaction.deserialize(deserializer);
    const authenticator = TransactionAuthenticator.deserialize(deserializer);
    return new _SignedTransaction(raw_txn, authenticator);
  }
};
var RawTransactionWithData = class {
  static deserialize(deserializer) {
    const index = deserializer.deserializeUleb128AsU32();
    switch (index) {
      case 0:
        return MultiAgentRawTransaction.load(deserializer);
      case 1:
        return FeePayerRawTransaction.load(deserializer);
      default:
        throw new Error(`Unknown variant index for RawTransactionWithData: ${index}`);
    }
  }
};
var MultiAgentRawTransaction = class _MultiAgentRawTransaction extends RawTransactionWithData {
  constructor(raw_txn, secondary_signer_addresses) {
    super();
    this.raw_txn = raw_txn;
    this.secondary_signer_addresses = secondary_signer_addresses;
  }
  serialize(serializer) {
    serializer.serializeU32AsUleb128(0);
    this.raw_txn.serialize(serializer);
    serializeVector(this.secondary_signer_addresses, serializer);
  }
  static load(deserializer) {
    const rawTxn = RawTransaction.deserialize(deserializer);
    const secondarySignerAddresses = deserializeVector(deserializer, AccountAddress);
    return new _MultiAgentRawTransaction(rawTxn, secondarySignerAddresses);
  }
};
var FeePayerRawTransaction = class _FeePayerRawTransaction extends RawTransactionWithData {
  constructor(raw_txn, secondary_signer_addresses, fee_payer_address) {
    super();
    this.raw_txn = raw_txn;
    this.secondary_signer_addresses = secondary_signer_addresses;
    this.fee_payer_address = fee_payer_address;
  }
  serialize(serializer) {
    serializer.serializeU32AsUleb128(1);
    this.raw_txn.serialize(serializer);
    serializeVector(this.secondary_signer_addresses, serializer);
    this.fee_payer_address.serialize(serializer);
  }
  static load(deserializer) {
    const rawTxn = RawTransaction.deserialize(deserializer);
    const secondarySignerAddresses = deserializeVector(deserializer, AccountAddress);
    const feePayerAddress = AccountAddress.deserialize(deserializer);
    return new _FeePayerRawTransaction(rawTxn, secondarySignerAddresses, feePayerAddress);
  }
};
var TransactionPayload = class {
  static deserialize(deserializer) {
    const index = deserializer.deserializeUleb128AsU32();
    switch (index) {
      case 0:
        return TransactionPayloadScript.load(deserializer);
      case 2:
        return TransactionPayloadEntryFunction.load(deserializer);
      case 3:
        return TransactionPayloadMultisig.load(deserializer);
      default:
        throw new Error(`Unknown variant index for TransactionPayload: ${index}`);
    }
  }
};
var TransactionPayloadScript = class _TransactionPayloadScript extends TransactionPayload {
  constructor(value) {
    super();
    this.value = value;
  }
  serialize(serializer) {
    serializer.serializeU32AsUleb128(0);
    this.value.serialize(serializer);
  }
  static load(deserializer) {
    const value = Script.deserialize(deserializer);
    return new _TransactionPayloadScript(value);
  }
};
var TransactionPayloadEntryFunction = class _TransactionPayloadEntryFunction extends TransactionPayload {
  constructor(value) {
    super();
    this.value = value;
  }
  serialize(serializer) {
    serializer.serializeU32AsUleb128(2);
    this.value.serialize(serializer);
  }
  static load(deserializer) {
    const value = EntryFunction.deserialize(deserializer);
    return new _TransactionPayloadEntryFunction(value);
  }
};
var TransactionPayloadMultisig = class _TransactionPayloadMultisig extends TransactionPayload {
  constructor(value) {
    super();
    this.value = value;
  }
  serialize(serializer) {
    serializer.serializeU32AsUleb128(3);
    this.value.serialize(serializer);
  }
  static load(deserializer) {
    const value = MultiSig.deserialize(deserializer);
    return new _TransactionPayloadMultisig(value);
  }
};
var ChainId = class _ChainId {
  constructor(value) {
    this.value = value;
  }
  serialize(serializer) {
    serializer.serializeU8(this.value);
  }
  static deserialize(deserializer) {
    const value = deserializer.deserializeU8();
    return new _ChainId(value);
  }
};
var TransactionArgument = class {
  static deserialize(deserializer) {
    const index = deserializer.deserializeUleb128AsU32();
    switch (index) {
      case 0:
        return TransactionArgumentU8.load(deserializer);
      case 1:
        return TransactionArgumentU64.load(deserializer);
      case 2:
        return TransactionArgumentU128.load(deserializer);
      case 3:
        return TransactionArgumentAddress.load(deserializer);
      case 4:
        return TransactionArgumentU8Vector.load(deserializer);
      case 5:
        return TransactionArgumentBool.load(deserializer);
      case 6:
        return TransactionArgumentU16.load(deserializer);
      case 7:
        return TransactionArgumentU32.load(deserializer);
      case 8:
        return TransactionArgumentU256.load(deserializer);
      default:
        throw new Error(`Unknown variant index for TransactionArgument: ${index}`);
    }
  }
};
var TransactionArgumentU8 = class _TransactionArgumentU8 extends TransactionArgument {
  constructor(value) {
    super();
    this.value = value;
  }
  serialize(serializer) {
    serializer.serializeU32AsUleb128(0);
    serializer.serializeU8(this.value);
  }
  static load(deserializer) {
    const value = deserializer.deserializeU8();
    return new _TransactionArgumentU8(value);
  }
};
var TransactionArgumentU16 = class _TransactionArgumentU16 extends TransactionArgument {
  constructor(value) {
    super();
    this.value = value;
  }
  serialize(serializer) {
    serializer.serializeU32AsUleb128(6);
    serializer.serializeU16(this.value);
  }
  static load(deserializer) {
    const value = deserializer.deserializeU16();
    return new _TransactionArgumentU16(value);
  }
};
var TransactionArgumentU32 = class _TransactionArgumentU32 extends TransactionArgument {
  constructor(value) {
    super();
    this.value = value;
  }
  serialize(serializer) {
    serializer.serializeU32AsUleb128(7);
    serializer.serializeU32(this.value);
  }
  static load(deserializer) {
    const value = deserializer.deserializeU32();
    return new _TransactionArgumentU32(value);
  }
};
var TransactionArgumentU64 = class _TransactionArgumentU64 extends TransactionArgument {
  constructor(value) {
    super();
    this.value = value;
  }
  serialize(serializer) {
    serializer.serializeU32AsUleb128(1);
    serializer.serializeU64(this.value);
  }
  static load(deserializer) {
    const value = deserializer.deserializeU64();
    return new _TransactionArgumentU64(value);
  }
};
var TransactionArgumentU128 = class _TransactionArgumentU128 extends TransactionArgument {
  constructor(value) {
    super();
    this.value = value;
  }
  serialize(serializer) {
    serializer.serializeU32AsUleb128(2);
    serializer.serializeU128(this.value);
  }
  static load(deserializer) {
    const value = deserializer.deserializeU128();
    return new _TransactionArgumentU128(value);
  }
};
var TransactionArgumentU256 = class _TransactionArgumentU256 extends TransactionArgument {
  constructor(value) {
    super();
    this.value = value;
  }
  serialize(serializer) {
    serializer.serializeU32AsUleb128(8);
    serializer.serializeU256(this.value);
  }
  static load(deserializer) {
    const value = deserializer.deserializeU256();
    return new _TransactionArgumentU256(value);
  }
};
var TransactionArgumentAddress = class _TransactionArgumentAddress extends TransactionArgument {
  constructor(value) {
    super();
    this.value = value;
  }
  serialize(serializer) {
    serializer.serializeU32AsUleb128(3);
    this.value.serialize(serializer);
  }
  static load(deserializer) {
    const value = AccountAddress.deserialize(deserializer);
    return new _TransactionArgumentAddress(value);
  }
};
var TransactionArgumentU8Vector = class _TransactionArgumentU8Vector extends TransactionArgument {
  constructor(value) {
    super();
    this.value = value;
  }
  serialize(serializer) {
    serializer.serializeU32AsUleb128(4);
    serializer.serializeBytes(this.value);
  }
  static load(deserializer) {
    const value = deserializer.deserializeBytes();
    return new _TransactionArgumentU8Vector(value);
  }
};
var TransactionArgumentBool = class _TransactionArgumentBool extends TransactionArgument {
  constructor(value) {
    super();
    this.value = value;
  }
  serialize(serializer) {
    serializer.serializeU32AsUleb128(5);
    serializer.serializeBool(this.value);
  }
  static load(deserializer) {
    const value = deserializer.deserializeBool();
    return new _TransactionArgumentBool(value);
  }
};
var Transaction = class {
  getHashSalt() {
    const hash = _sha2.sha3_256.create();
    hash.update("APTOS::Transaction");
    return hash.digest();
  }
  static deserialize(deserializer) {
    const index = deserializer.deserializeUleb128AsU32();
    switch (index) {
      case 0:
        return UserTransaction.load(deserializer);
      default:
        throw new Error(`Unknown variant index for Transaction: ${index}`);
    }
  }
};
var UserTransaction = class _UserTransaction extends Transaction {
  constructor(value) {
    super();
    this.value = value;
  }
  hash() {
    const hash = _sha2.sha3_256.create();
    hash.update(this.getHashSalt());
    hash.update(bcsToBytes(this));
    return hash.digest();
  }
  serialize(serializer) {
    serializer.serializeU32AsUleb128(0);
    this.value.serialize(serializer);
  }
  static load(deserializer) {
    return new _UserTransaction(SignedTransaction.deserialize(deserializer));
  }
};

// src/aptos_types/abi.ts
var TypeArgumentABI = class _TypeArgumentABI {
  /**
   * Constructs a TypeArgumentABI instance.
   * @param name
   */
  constructor(name) {
    this.name = name;
  }
  serialize(serializer) {
    serializer.serializeStr(this.name);
  }
  static deserialize(deserializer) {
    const name = deserializer.deserializeStr();
    return new _TypeArgumentABI(name);
  }
};
var ArgumentABI = class _ArgumentABI {
  /**
   * Constructs an ArgumentABI instance.
   * @param name
   * @param type_tag
   */
  constructor(name, type_tag) {
    this.name = name;
    this.type_tag = type_tag;
  }
  serialize(serializer) {
    serializer.serializeStr(this.name);
    this.type_tag.serialize(serializer);
  }
  static deserialize(deserializer) {
    const name = deserializer.deserializeStr();
    const typeTag = TypeTag.deserialize(deserializer);
    return new _ArgumentABI(name, typeTag);
  }
};
var ScriptABI = class {
  static deserialize(deserializer) {
    const index = deserializer.deserializeUleb128AsU32();
    switch (index) {
      case 0:
        return TransactionScriptABI.load(deserializer);
      case 1:
        return EntryFunctionABI.load(deserializer);
      default:
        throw new Error(`Unknown variant index for TransactionPayload: ${index}`);
    }
  }
};
var TransactionScriptABI = class _TransactionScriptABI extends ScriptABI {
  /**
   * Constructs a TransactionScriptABI instance.
   * @param name Entry function name
   * @param doc
   * @param code
   * @param ty_args
   * @param args
   */
  constructor(name, doc, code, ty_args, args) {
    super();
    this.name = name;
    this.doc = doc;
    this.code = code;
    this.ty_args = ty_args;
    this.args = args;
  }
  serialize(serializer) {
    serializer.serializeU32AsUleb128(0);
    serializer.serializeStr(this.name);
    serializer.serializeStr(this.doc);
    serializer.serializeBytes(this.code);
    serializeVector(this.ty_args, serializer);
    serializeVector(this.args, serializer);
  }
  static load(deserializer) {
    const name = deserializer.deserializeStr();
    const doc = deserializer.deserializeStr();
    const code = deserializer.deserializeBytes();
    const tyArgs = deserializeVector(deserializer, TypeArgumentABI);
    const args = deserializeVector(deserializer, ArgumentABI);
    return new _TransactionScriptABI(name, doc, code, tyArgs, args);
  }
};
var EntryFunctionABI = class _EntryFunctionABI extends ScriptABI {
  /**
   * Constructs a EntryFunctionABI instance
   * @param name
   * @param module_name Fully qualified module id
   * @param doc
   * @param ty_args
   * @param args
   */
  constructor(name, module_name, doc, ty_args, args) {
    super();
    this.name = name;
    this.module_name = module_name;
    this.doc = doc;
    this.ty_args = ty_args;
    this.args = args;
  }
  serialize(serializer) {
    serializer.serializeU32AsUleb128(1);
    serializer.serializeStr(this.name);
    this.module_name.serialize(serializer);
    serializer.serializeStr(this.doc);
    serializeVector(this.ty_args, serializer);
    serializeVector(this.args, serializer);
  }
  static load(deserializer) {
    const name = deserializer.deserializeStr();
    const moduleName = ModuleId.deserialize(deserializer);
    const doc = deserializer.deserializeStr();
    const tyArgs = deserializeVector(deserializer, TypeArgumentABI);
    const args = deserializeVector(deserializer, ArgumentABI);
    return new _EntryFunctionABI(name, moduleName, doc, tyArgs, args);
  }
};

// src/aptos_types/authentication_key.ts

var _AuthenticationKey = class _AuthenticationKey {
  constructor(bytes) {
    if (bytes.length !== _AuthenticationKey.LENGTH) {
      throw new Error("Expected a byte array of length 32");
    }
    this.bytes = bytes;
  }
  /**
   * Converts a K-of-N MultiEd25519PublicKey to AuthenticationKey with:
   * `auth_key = sha3-256(p_1 | … | p_n | K | 0x01)`. `K` represents the K-of-N required for
   * authenticating the transaction. `0x01` is the 1-byte scheme for multisig.
   */
  static fromMultiEd25519PublicKey(publicKey) {
    const pubKeyBytes = publicKey.toBytes();
    const bytes = new Uint8Array(pubKeyBytes.length + 1);
    bytes.set(pubKeyBytes);
    bytes.set([_AuthenticationKey.MULTI_ED25519_SCHEME], pubKeyBytes.length);
    const hash = _sha2.sha3_256.create();
    hash.update(bytes);
    return new _AuthenticationKey(hash.digest());
  }
  static fromEd25519PublicKey(publicKey) {
    const pubKeyBytes = publicKey.value;
    const bytes = new Uint8Array(pubKeyBytes.length + 1);
    bytes.set(pubKeyBytes);
    bytes.set([_AuthenticationKey.ED25519_SCHEME], pubKeyBytes.length);
    const hash = _sha2.sha3_256.create();
    hash.update(bytes);
    return new _AuthenticationKey(hash.digest());
  }
  /**
   * Derives an account address from AuthenticationKey. Since current AccountAddress is 32 bytes,
   * AuthenticationKey bytes are directly translated to AccountAddress.
   */
  derivedAddress() {
    return HexString.fromUint8Array(this.bytes);
  }
};
_AuthenticationKey.LENGTH = 32;
_AuthenticationKey.MULTI_ED25519_SCHEME = 1;
_AuthenticationKey.ED25519_SCHEME = 0;
_AuthenticationKey.DERIVE_RESOURCE_ACCOUNT_SCHEME = 255;
var AuthenticationKey = _AuthenticationKey;

// src/aptos_types/rotation_proof_challenge.ts
var RotationProofChallenge = class {
  constructor(accountAddress, moduleName, structName, sequenceNumber, originator, currentAuthKey, newPublicKey) {
    this.accountAddress = accountAddress;
    this.moduleName = moduleName;
    this.structName = structName;
    this.sequenceNumber = sequenceNumber;
    this.originator = originator;
    this.currentAuthKey = currentAuthKey;
    this.newPublicKey = newPublicKey;
  }
  serialize(serializer) {
    this.accountAddress.serialize(serializer);
    serializer.serializeStr(this.moduleName);
    serializer.serializeStr(this.structName);
    serializer.serializeU64(this.sequenceNumber);
    this.originator.serialize(serializer);
    this.currentAuthKey.serialize(serializer);
    serializer.serializeBytes(this.newPublicKey);
  }
};

// src/account/aptos_account.ts
var _AptosAccount = class _AptosAccount {
  static fromAptosAccountObject(obj) {
    return new _AptosAccount(HexString.ensure(obj.privateKeyHex).toUint8Array(), obj.address);
  }
  /**
   * Check's if the derive path is valid
   */
  static isValidPath(path) {
    return /^m\/44'\/637'\/[0-9]+'\/[0-9]+'\/[0-9]+'+$/.test(path);
  }
  /**
   * Creates new account with bip44 path and mnemonics,
   * @param path. (e.g. m/44'/637'/0'/0'/0')
   * Detailed description: {@link https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki}
   * @param mnemonics.
   * @returns AptosAccount
   */
  static fromDerivePath(path, mnemonics) {
    if (!_AptosAccount.isValidPath(path)) {
      throw new Error("Invalid derivation path");
    }
    const normalizeMnemonics = mnemonics.trim().split(/\s+/).map(part => part.toLowerCase()).join(" ");
    const {
      key
    } = derivePath(path, (0, _utils.bytesToHex)(bip39.mnemonicToSeedSync(normalizeMnemonics)));
    return new _AptosAccount(key);
  }
  /**
   * Creates new account instance. Constructor allows passing in an address,
   * to handle account key rotation, where auth_key != public_key
   * @param privateKeyBytes  Private key from which account key pair will be generated.
   * If not specified, new key pair is going to be created.
   * @param address Account address (e.g. 0xe8012714cd17606cee7188a2a365eef3fe760be598750678c8c5954eb548a591).
   * If not specified, a new one will be generated from public key
   */
  constructor(privateKeyBytes, address) {
    if (privateKeyBytes) {
      this.signingKey = _tweetnacl.default.sign.keyPair.fromSeed(privateKeyBytes.slice(0, 32));
    } else {
      this.signingKey = _tweetnacl.default.sign.keyPair();
    }
    this.accountAddress = HexString.ensure(address || this.authKey().hex());
  }
  /**
   * This is the key by which Aptos account is referenced.
   * It is the 32-byte of the SHA-3 256 cryptographic hash
   * of the public key(s) concatenated with a signature scheme identifier byte
   * @returns Address associated with the given account
   */
  address() {
    return this.accountAddress;
  }
  authKey() {
    const pubKey = new Ed25519PublicKey(this.signingKey.publicKey);
    const authKey = AuthenticationKey.fromEd25519PublicKey(pubKey);
    return authKey.derivedAddress();
  }
  /**
   * Takes source address and seeds and returns the resource account address
   * @param sourceAddress Address used to derive the resource account
   * @param seed The seed bytes
   * @returns The resource account address
   */
  static getResourceAccountAddress(sourceAddress, seed) {
    const source = bcsToBytes(AccountAddress.fromHex(sourceAddress));
    const bytes = new Uint8Array([...source, ...seed, AuthenticationKey.DERIVE_RESOURCE_ACCOUNT_SCHEME]);
    const hash = _sha2.sha3_256.create();
    hash.update(bytes);
    return HexString.fromUint8Array(hash.digest());
  }
  /**
   * Takes creator address and collection name and returns the collection id hash.
   * Collection id hash are generated as sha256 hash of (`creator_address::collection_name`)
   *
   * @param creatorAddress Collection creator address
   * @param collectionName The collection name
   * @returns The collection id hash
   */
  static getCollectionID(creatorAddress, collectionName) {
    const seed = new TextEncoder().encode(`${creatorAddress}::${collectionName}`);
    const hash = _sha.sha256.create();
    hash.update(seed);
    return HexString.fromUint8Array(hash.digest());
  }
  /**
   * This key is generated with Ed25519 scheme.
   * Public key is used to check a signature of transaction, signed by given account
   * @returns The public key for the associated account
   */
  pubKey() {
    return HexString.fromUint8Array(this.signingKey.publicKey);
  }
  /**
   * Signs specified `buffer` with account's private key
   * @param buffer A buffer to sign
   * @returns A signature HexString
   */
  signBuffer(buffer) {
    const signature = _tweetnacl.default.sign.detached(buffer, this.signingKey.secretKey);
    return HexString.fromUint8Array(signature);
  }
  /**
   * Signs specified `hexString` with account's private key
   * @param hexString A regular string or HexString to sign
   * @returns A signature HexString
   */
  signHexString(hexString) {
    const toSign = HexString.ensure(hexString).toUint8Array();
    return this.signBuffer(toSign);
  }
  /**
   * Verifies the signature of the message with the public key of the account
   * @param message a signed message
   * @param signature the signature of the message
   */
  verifySignature(message, signature) {
    const rawMessage = HexString.ensure(message).toUint8Array();
    const rawSignature = HexString.ensure(signature).toUint8Array();
    return _tweetnacl.default.sign.detached.verify(rawMessage, rawSignature, this.signingKey.publicKey);
  }
  /**
   * Derives account address, public key and private key
   * @returns AptosAccountObject instance.
   * @example An example of the returned AptosAccountObject object
   * ```
   * {
   *    address: "0xe8012714cd17606cee7188a2a365eef3fe760be598750678c8c5954eb548a591",
   *    publicKeyHex: "0xf56d8524faf79fbc0f48c13aeed3b0ce5dd376b4db93b8130a107c0a5e04ba04",
   *    privateKeyHex: `0x009c9f7c992a06cfafe916f125d8adb7a395fca243e264a8e56a4b3e6accf940
   *      d2b11e9ece3049ce60e3c7b4a1c58aebfa9298e29a30a58a67f1998646135204`
   * }
   * ```
   */
  toPrivateKeyObject() {
    return {
      address: this.address().hex(),
      publicKeyHex: this.pubKey().hex(),
      privateKeyHex: HexString.fromUint8Array(this.signingKey.secretKey.slice(0, 32)).hex()
    };
  }
};
__decorateClass([Memoize()], _AptosAccount.prototype, "authKey", 1);
var AptosAccount = exports.AptosAccount = _AptosAccount;
function getAddressFromAccountOrAddress(accountOrAddress) {
  return accountOrAddress instanceof AptosAccount ? accountOrAddress.address() : HexString.ensure(accountOrAddress);
}

// src/indexer/generated/queries.ts
var CurrentTokenOwnershipFieldsFragmentDoc = `
    fragment CurrentTokenOwnershipFields on current_token_ownerships_v2 {
  token_standard
  token_properties_mutated_v1
  token_data_id
  table_type_v1
  storage_id
  property_version_v1
  owner_address
  last_transaction_version
  last_transaction_timestamp
  is_soulbound_v2
  is_fungible_v2
  amount
  current_token_data {
    collection_id
    description
    is_fungible_v2
    largest_property_version_v1
    last_transaction_timestamp
    last_transaction_version
    maximum
    supply
    token_data_id
    token_name
    token_properties
    token_standard
    token_uri
    current_collection {
      collection_id
      collection_name
      creator_address
      current_supply
      description
      last_transaction_timestamp
      last_transaction_version
      max_supply
      mutable_description
      mutable_uri
      table_handle_v1
      token_standard
      total_minted_v2
      uri
    }
  }
}
    `;
var TokenDataFieldsFragmentDoc = `
    fragment TokenDataFields on current_token_datas {
  creator_address
  collection_name
  description
  metadata_uri
  name
  token_data_id_hash
  collection_data_id_hash
}
    `;
var CollectionDataFieldsFragmentDoc = `
    fragment CollectionDataFields on current_collection_datas {
  metadata_uri
  supply
  description
  collection_name
  collection_data_id_hash
  table_handle
  creator_address
}
    `;
var TokenActivitiesFieldsFragmentDoc = `
    fragment TokenActivitiesFields on token_activities_v2 {
  after_value
  before_value
  entry_function_id_str
  event_account_address
  event_index
  from_address
  is_fungible_v2
  property_version_v1
  to_address
  token_amount
  token_data_id
  token_standard
  transaction_timestamp
  transaction_version
  type
}
    `;
var GetAccountCoinsDataCount = `
    query getAccountCoinsDataCount($address: String) {
  current_fungible_asset_balances_aggregate(
    where: {owner_address: {_eq: $address}}
  ) {
    aggregate {
      count
    }
  }
}
    `;
var GetAccountCoinsData = `
    query getAccountCoinsData($where_condition: current_fungible_asset_balances_bool_exp!, $offset: Int, $limit: Int, $order_by: [current_fungible_asset_balances_order_by!]) {
  current_fungible_asset_balances(
    where: $where_condition
    offset: $offset
    limit: $limit
    order_by: $order_by
  ) {
    amount
    asset_type
    is_frozen
    is_primary
    last_transaction_timestamp
    last_transaction_version
    owner_address
    storage_id
    token_standard
    metadata {
      token_standard
      symbol
      supply_aggregator_table_key_v1
      supply_aggregator_table_handle_v1
      project_uri
      name
      last_transaction_version
      last_transaction_timestamp
      icon_uri
      decimals
      creator_address
      asset_type
    }
  }
}
    `;
var GetAccountCurrentTokens = `
    query getAccountCurrentTokens($address: String!, $offset: Int, $limit: Int) {
  current_token_ownerships(
    where: {owner_address: {_eq: $address}, amount: {_gt: 0}}
    order_by: [{last_transaction_version: desc}, {creator_address: asc}, {collection_name: asc}, {name: asc}]
    offset: $offset
    limit: $limit
  ) {
    amount
    current_token_data {
      ...TokenDataFields
    }
    current_collection_data {
      ...CollectionDataFields
    }
    last_transaction_version
    property_version
  }
}
    ${TokenDataFieldsFragmentDoc}
${CollectionDataFieldsFragmentDoc}`;
var GetAccountTokensCount = `
    query getAccountTokensCount($where_condition: current_token_ownerships_v2_bool_exp, $offset: Int, $limit: Int) {
  current_token_ownerships_v2_aggregate(
    where: $where_condition
    offset: $offset
    limit: $limit
  ) {
    aggregate {
      count
    }
  }
}
    `;
var GetAccountTransactionsCount = `
    query getAccountTransactionsCount($address: String) {
  account_transactions_aggregate(where: {account_address: {_eq: $address}}) {
    aggregate {
      count
    }
  }
}
    `;
var GetAccountTransactionsData = `
    query getAccountTransactionsData($where_condition: account_transactions_bool_exp!, $offset: Int, $limit: Int, $order_by: [account_transactions_order_by!]) {
  account_transactions(
    where: $where_condition
    order_by: $order_by
    limit: $limit
    offset: $offset
  ) {
    token_activities_v2 {
      ...TokenActivitiesFields
    }
    transaction_version
    account_address
  }
}
    ${TokenActivitiesFieldsFragmentDoc}`;
var GetCollectionData = `
    query getCollectionData($where_condition: current_collections_v2_bool_exp!, $offset: Int, $limit: Int, $order_by: [current_collections_v2_order_by!]) {
  current_collections_v2(
    where: $where_condition
    offset: $offset
    limit: $limit
    order_by: $order_by
  ) {
    collection_id
    collection_name
    creator_address
    current_supply
    description
    last_transaction_timestamp
    last_transaction_version
    max_supply
    mutable_description
    mutable_uri
    table_handle_v1
    token_standard
    total_minted_v2
    uri
  }
}
    `;
var GetCollectionsWithOwnedTokens = `
    query getCollectionsWithOwnedTokens($where_condition: current_collection_ownership_v2_view_bool_exp!, $offset: Int, $limit: Int, $order_by: [current_collection_ownership_v2_view_order_by!]) {
  current_collection_ownership_v2_view(
    where: $where_condition
    offset: $offset
    limit: $limit
    order_by: $order_by
  ) {
    current_collection {
      collection_id
      collection_name
      creator_address
      current_supply
      description
      last_transaction_timestamp
      last_transaction_version
      mutable_description
      max_supply
      mutable_uri
      table_handle_v1
      token_standard
      total_minted_v2
      uri
    }
    collection_id
    collection_name
    collection_uri
    creator_address
    distinct_tokens
    last_transaction_version
    owner_address
    single_token_uri
  }
}
    `;
var GetCurrentObjects = `
    query getCurrentObjects($where_condition: current_objects_bool_exp, $offset: Int, $limit: Int, $order_by: [current_objects_order_by!]) {
  current_objects(
    where: $where_condition
    offset: $offset
    limit: $limit
    order_by: $order_by
  ) {
    allow_ungated_transfer
    state_key_hash
    owner_address
    object_address
    last_transaction_version
    last_guid_creation_num
    is_deleted
  }
}
    `;
var GetDelegatedStakingActivities = `
    query getDelegatedStakingActivities($delegatorAddress: String, $poolAddress: String) {
  delegated_staking_activities(
    where: {delegator_address: {_eq: $delegatorAddress}, pool_address: {_eq: $poolAddress}}
  ) {
    amount
    delegator_address
    event_index
    event_type
    pool_address
    transaction_version
  }
}
    `;
var GetIndexerLedgerInfo = `
    query getIndexerLedgerInfo {
  ledger_infos {
    chain_id
  }
}
    `;
var GetNumberOfDelegators = `
    query getNumberOfDelegators($poolAddress: String) {
  num_active_delegator_per_pool(
    where: {pool_address: {_eq: $poolAddress}, num_active_delegator: {_gt: "0"}}
    distinct_on: pool_address
  ) {
    num_active_delegator
    pool_address
  }
}
    `;
var GetOwnedTokens = `
    query getOwnedTokens($where_condition: current_token_ownerships_v2_bool_exp!, $offset: Int, $limit: Int, $order_by: [current_token_ownerships_v2_order_by!]) {
  current_token_ownerships_v2(
    where: $where_condition
    offset: $offset
    limit: $limit
    order_by: $order_by
  ) {
    ...CurrentTokenOwnershipFields
  }
}
    ${CurrentTokenOwnershipFieldsFragmentDoc}`;
var GetOwnedTokensByTokenData = `
    query getOwnedTokensByTokenData($where_condition: current_token_ownerships_v2_bool_exp!, $offset: Int, $limit: Int, $order_by: [current_token_ownerships_v2_order_by!]) {
  current_token_ownerships_v2(
    where: $where_condition
    offset: $offset
    limit: $limit
    order_by: $order_by
  ) {
    ...CurrentTokenOwnershipFields
  }
}
    ${CurrentTokenOwnershipFieldsFragmentDoc}`;
var GetTokenActivities = `
    query getTokenActivities($where_condition: token_activities_v2_bool_exp!, $offset: Int, $limit: Int, $order_by: [token_activities_v2_order_by!]) {
  token_activities_v2(
    where: $where_condition
    order_by: $order_by
    offset: $offset
    limit: $limit
  ) {
    ...TokenActivitiesFields
  }
}
    ${TokenActivitiesFieldsFragmentDoc}`;
var GetTokenActivitiesCount = `
    query getTokenActivitiesCount($token_id: String) {
  token_activities_v2_aggregate(where: {token_data_id: {_eq: $token_id}}) {
    aggregate {
      count
    }
  }
}
    `;
var GetTokenCurrentOwnerData = `
    query getTokenCurrentOwnerData($where_condition: current_token_ownerships_v2_bool_exp!, $offset: Int, $limit: Int, $order_by: [current_token_ownerships_v2_order_by!]) {
  current_token_ownerships_v2(
    where: $where_condition
    offset: $offset
    limit: $limit
    order_by: $order_by
  ) {
    ...CurrentTokenOwnershipFields
  }
}
    ${CurrentTokenOwnershipFieldsFragmentDoc}`;
var GetTokenData = `
    query getTokenData($where_condition: current_token_datas_v2_bool_exp, $offset: Int, $limit: Int, $order_by: [current_token_datas_v2_order_by!]) {
  current_token_datas_v2(
    where: $where_condition
    offset: $offset
    limit: $limit
    order_by: $order_by
  ) {
    collection_id
    description
    is_fungible_v2
    largest_property_version_v1
    last_transaction_timestamp
    last_transaction_version
    maximum
    supply
    token_data_id
    token_name
    token_properties
    token_standard
    token_uri
    current_collection {
      collection_id
      collection_name
      creator_address
      current_supply
      description
      last_transaction_timestamp
      last_transaction_version
      max_supply
      mutable_description
      mutable_uri
      table_handle_v1
      token_standard
      total_minted_v2
      uri
    }
  }
}
    `;
var GetTokenOwnedFromCollection = `
    query getTokenOwnedFromCollection($where_condition: current_token_ownerships_v2_bool_exp!, $offset: Int, $limit: Int, $order_by: [current_token_ownerships_v2_order_by!]) {
  current_token_ownerships_v2(
    where: $where_condition
    offset: $offset
    limit: $limit
    order_by: $order_by
  ) {
    ...CurrentTokenOwnershipFields
  }
}
    ${CurrentTokenOwnershipFieldsFragmentDoc}`;
var GetTokenOwnersData = `
    query getTokenOwnersData($where_condition: current_token_ownerships_v2_bool_exp!, $offset: Int, $limit: Int, $order_by: [current_token_ownerships_v2_order_by!]) {
  current_token_ownerships_v2(
    where: $where_condition
    offset: $offset
    limit: $limit
    order_by: $order_by
  ) {
    ...CurrentTokenOwnershipFields
  }
}
    ${CurrentTokenOwnershipFieldsFragmentDoc}`;
var GetTopUserTransactions = `
    query getTopUserTransactions($limit: Int) {
  user_transactions(limit: $limit, order_by: {version: desc}) {
    version
  }
}
    `;
var GetUserTransactions = `
    query getUserTransactions($where_condition: user_transactions_bool_exp!, $offset: Int, $limit: Int, $order_by: [user_transactions_order_by!]) {
  user_transactions(
    order_by: $order_by
    where: $where_condition
    limit: $limit
    offset: $offset
  ) {
    version
  }
}
    `;

// src/transaction_builder/builder.ts

// src/transaction_builder/builder_utils.ts
function assertType(val, types, message) {
  if (!(types == null ? void 0 : types.includes(typeof val))) {
    throw new Error(message || `Invalid arg: ${val} type should be ${types instanceof Array ? types.join(" or ") : types}`);
  }
}
function ensureBoolean(val) {
  assertType(val, ["boolean", "string"]);
  if (typeof val === "boolean") {
    return val;
  }
  if (val === "true") {
    return true;
  }
  if (val === "false") {
    return false;
  }
  throw new Error("Invalid boolean string.");
}
function ensureNumber(val) {
  assertType(val, ["number", "string"]);
  if (typeof val === "number") {
    return val;
  }
  const res = Number.parseInt(val, 10);
  if (Number.isNaN(res)) {
    throw new Error("Invalid number string.");
  }
  return res;
}
function ensureBigInt(val) {
  assertType(val, ["number", "bigint", "string"]);
  return BigInt(val);
}
function serializeArg(argVal, argType, serializer) {
  serializeArgInner(argVal, argType, serializer, 0);
}
function serializeArgInner(argVal, argType, serializer, depth) {
  if (argType instanceof TypeTagBool) {
    serializer.serializeBool(ensureBoolean(argVal));
  } else if (argType instanceof TypeTagU8) {
    serializer.serializeU8(ensureNumber(argVal));
  } else if (argType instanceof TypeTagU16) {
    serializer.serializeU16(ensureNumber(argVal));
  } else if (argType instanceof TypeTagU32) {
    serializer.serializeU32(ensureNumber(argVal));
  } else if (argType instanceof TypeTagU64) {
    serializer.serializeU64(ensureBigInt(argVal));
  } else if (argType instanceof TypeTagU128) {
    serializer.serializeU128(ensureBigInt(argVal));
  } else if (argType instanceof TypeTagU256) {
    serializer.serializeU256(ensureBigInt(argVal));
  } else if (argType instanceof TypeTagAddress) {
    serializeAddress(argVal, serializer);
  } else if (argType instanceof TypeTagVector) {
    serializeVector2(argVal, argType, serializer, depth);
  } else if (argType instanceof TypeTagStruct) {
    serializeStruct(argVal, argType, serializer, depth);
  } else {
    throw new Error("Unsupported arg type.");
  }
}
function serializeAddress(argVal, serializer) {
  let addr;
  if (typeof argVal === "string" || argVal instanceof HexString) {
    addr = AccountAddress.fromHex(argVal);
  } else if (argVal instanceof AccountAddress) {
    addr = argVal;
  } else {
    throw new Error("Invalid account address.");
  }
  addr.serialize(serializer);
}
function serializeVector2(argVal, argType, serializer, depth) {
  if (argType.value instanceof TypeTagU8) {
    if (argVal instanceof Uint8Array) {
      serializer.serializeBytes(argVal);
      return;
    }
    if (argVal instanceof HexString) {
      serializer.serializeBytes(argVal.toUint8Array());
      return;
    }
    if (typeof argVal === "string") {
      serializer.serializeStr(argVal);
      return;
    }
  }
  if (!Array.isArray(argVal)) {
    throw new Error("Invalid vector args.");
  }
  serializer.serializeU32AsUleb128(argVal.length);
  argVal.forEach(arg => serializeArgInner(arg, argType.value, serializer, depth + 1));
}
function serializeStruct(argVal, argType, serializer, depth) {
  const {
    address,
    module_name: moduleName,
    name,
    type_args: typeArgs
  } = argType.value;
  const structType = `${HexString.fromUint8Array(address.address).toShortString()}::${moduleName.value}::${name.value}`;
  if (structType === "0x1::string::String") {
    assertType(argVal, ["string"]);
    serializer.serializeStr(argVal);
  } else if (structType === "0x1::object::Object") {
    serializeAddress(argVal, serializer);
  } else if (structType === "0x1::option::Option") {
    if (typeArgs.length !== 1) {
      throw new Error(`Option has the wrong number of type arguments ${typeArgs.length}`);
    }
    serializeOption(argVal, typeArgs[0], serializer, depth);
  } else {
    throw new Error("Unsupported struct type in function argument");
  }
}
function serializeOption(argVal, argType, serializer, depth) {
  if (argVal === void 0 || argVal === null) {
    serializer.serializeU32AsUleb128(0);
  } else {
    serializer.serializeU32AsUleb128(1);
    serializeArgInner(argVal, argType, serializer, depth + 1);
  }
}
function argToTransactionArgument(argVal, argType) {
  if (argType instanceof TypeTagBool) {
    return new TransactionArgumentBool(ensureBoolean(argVal));
  }
  if (argType instanceof TypeTagU8) {
    return new TransactionArgumentU8(ensureNumber(argVal));
  }
  if (argType instanceof TypeTagU16) {
    return new TransactionArgumentU16(ensureNumber(argVal));
  }
  if (argType instanceof TypeTagU32) {
    return new TransactionArgumentU32(ensureNumber(argVal));
  }
  if (argType instanceof TypeTagU64) {
    return new TransactionArgumentU64(ensureBigInt(argVal));
  }
  if (argType instanceof TypeTagU128) {
    return new TransactionArgumentU128(ensureBigInt(argVal));
  }
  if (argType instanceof TypeTagU256) {
    return new TransactionArgumentU256(ensureBigInt(argVal));
  }
  if (argType instanceof TypeTagAddress) {
    let addr;
    if (typeof argVal === "string" || argVal instanceof HexString) {
      addr = AccountAddress.fromHex(argVal);
    } else if (argVal instanceof AccountAddress) {
      addr = argVal;
    } else {
      throw new Error("Invalid account address.");
    }
    return new TransactionArgumentAddress(addr);
  }
  if (argType instanceof TypeTagVector && argType.value instanceof TypeTagU8) {
    if (!(argVal instanceof Uint8Array)) {
      throw new Error(`${argVal} should be an instance of Uint8Array`);
    }
    return new TransactionArgumentU8Vector(argVal);
  }
  throw new Error("Unknown type for TransactionArgument.");
}

// src/transaction_builder/builder.ts
var RAW_TRANSACTION_SALT = "APTOS::RawTransaction";
var RAW_TRANSACTION_WITH_DATA_SALT = "APTOS::RawTransactionWithData";
var TransactionBuilder = class {
  constructor(signingFunction, rawTxnBuilder) {
    this.rawTxnBuilder = rawTxnBuilder;
    this.signingFunction = signingFunction;
  }
  /**
   * Builds a RawTransaction. Relays the call to TransactionBuilderABI.build
   * @param func
   * @param ty_tags
   * @param args
   */
  build(func, ty_tags, args) {
    if (!this.rawTxnBuilder) {
      throw new Error("this.rawTxnBuilder doesn't exist.");
    }
    return this.rawTxnBuilder.build(func, ty_tags, args);
  }
  /** Generates a Signing Message out of a raw transaction. */
  static getSigningMessage(rawTxn) {
    const hash = _sha2.sha3_256.create();
    if (rawTxn instanceof RawTransaction) {
      hash.update(RAW_TRANSACTION_SALT);
    } else if (rawTxn instanceof MultiAgentRawTransaction) {
      hash.update(RAW_TRANSACTION_WITH_DATA_SALT);
    } else if (rawTxn instanceof FeePayerRawTransaction) {
      hash.update(RAW_TRANSACTION_WITH_DATA_SALT);
    } else {
      throw new Error("Unknown transaction type.");
    }
    const prefix = hash.digest();
    const body = bcsToBytes(rawTxn);
    const mergedArray = new Uint8Array(prefix.length + body.length);
    mergedArray.set(prefix);
    mergedArray.set(body, prefix.length);
    return mergedArray;
  }
};
exports.TransactionBuilder = TransactionBuilder;
var TransactionBuilderEd25519 = class extends TransactionBuilder {
  constructor(signingFunction, publicKey, rawTxnBuilder) {
    super(signingFunction, rawTxnBuilder);
    this.publicKey = publicKey;
  }
  rawToSigned(rawTxn) {
    const signingMessage = TransactionBuilder.getSigningMessage(rawTxn);
    const signature = this.signingFunction(signingMessage);
    const authenticator = new TransactionAuthenticatorEd25519(new Ed25519PublicKey(this.publicKey), signature);
    return new SignedTransaction(rawTxn, authenticator);
  }
  /** Signs a raw transaction and returns a bcs serialized transaction. */
  sign(rawTxn) {
    return bcsToBytes(this.rawToSigned(rawTxn));
  }
};
exports.TransactionBuilderEd25519 = TransactionBuilderEd25519;
var TransactionBuilderMultiEd25519 = class extends TransactionBuilder {
  constructor(signingFunction, publicKey) {
    super(signingFunction);
    this.publicKey = publicKey;
  }
  rawToSigned(rawTxn) {
    const signingMessage = TransactionBuilder.getSigningMessage(rawTxn);
    const signature = this.signingFunction(signingMessage);
    const authenticator = new TransactionAuthenticatorMultiEd25519(this.publicKey, signature);
    return new SignedTransaction(rawTxn, authenticator);
  }
  /** Signs a raw transaction and returns a bcs serialized transaction. */
  sign(rawTxn) {
    return bcsToBytes(this.rawToSigned(rawTxn));
  }
};
exports.TransactionBuilderMultiEd25519 = TransactionBuilderMultiEd25519;
var TransactionBuilderABI = exports.TransactionBuilderABI = class _TransactionBuilderABI {
  /**
   * Constructs a TransactionBuilderABI instance
   * @param abis List of binary ABIs.
   * @param builderConfig Configs for creating a raw transaction.
   */
  constructor(abis, builderConfig) {
    this.abiMap = /* @__PURE__ */new Map();
    abis.forEach(abi => {
      const deserializer = new Deserializer(abi);
      const scriptABI = ScriptABI.deserialize(deserializer);
      let k;
      if (scriptABI instanceof EntryFunctionABI) {
        const funcABI = scriptABI;
        const {
          address: addr,
          name: moduleName
        } = funcABI.module_name;
        k = `${HexString.fromUint8Array(addr.address).toShortString()}::${moduleName.value}::${funcABI.name}`;
      } else {
        const funcABI = scriptABI;
        k = funcABI.name;
      }
      if (this.abiMap.has(k)) {
        throw new Error("Found conflicting ABI interfaces");
      }
      this.abiMap.set(k, scriptABI);
    });
    this.builderConfig = {
      maxGasAmount: BigInt(DEFAULT_MAX_GAS_AMOUNT),
      expSecFromNow: DEFAULT_TXN_EXP_SEC_FROM_NOW,
      ...builderConfig
    };
  }
  static toBCSArgs(abiArgs, args) {
    if (abiArgs.length !== args.length) {
      throw new Error("Wrong number of args provided.");
    }
    return args.map((arg, i) => {
      const serializer = new Serializer();
      serializeArg(arg, abiArgs[i].type_tag, serializer);
      return serializer.getBytes();
    });
  }
  static toTransactionArguments(abiArgs, args) {
    if (abiArgs.length !== args.length) {
      throw new Error("Wrong number of args provided.");
    }
    return args.map((arg, i) => argToTransactionArgument(arg, abiArgs[i].type_tag));
  }
  setSequenceNumber(seqNumber) {
    this.builderConfig.sequenceNumber = BigInt(seqNumber);
  }
  /**
   * Builds a TransactionPayload. For dApps, chain ID and account sequence numbers are only known to the wallet.
   * Instead of building a RawTransaction (requires chainID and sequenceNumber), dApps can build a TransactionPayload
   * and pass the payload to the wallet for signing and sending.
   * @param func Fully qualified func names, e.g. 0x1::aptos_account::transfer
   * @param ty_tags TypeTag strings
   * @param args Function arguments
   * @returns TransactionPayload
   */
  buildTransactionPayload(func, ty_tags, args) {
    const typeTags = ty_tags.map(ty_arg => new TypeTagParser(ty_arg).parseTypeTag());
    let payload;
    if (!this.abiMap.has(func)) {
      throw new Error(`Cannot find function: ${func}`);
    }
    const scriptABI = this.abiMap.get(func);
    if (scriptABI instanceof EntryFunctionABI) {
      const funcABI = scriptABI;
      const bcsArgs = _TransactionBuilderABI.toBCSArgs(funcABI.args, args);
      payload = new TransactionPayloadEntryFunction(new EntryFunction(funcABI.module_name, new Identifier(funcABI.name), typeTags, bcsArgs));
    } else if (scriptABI instanceof TransactionScriptABI) {
      const funcABI = scriptABI;
      const scriptArgs = _TransactionBuilderABI.toTransactionArguments(funcABI.args, args);
      payload = new TransactionPayloadScript(new Script(funcABI.code, typeTags, scriptArgs));
    } else {
      throw new Error("Unknown ABI format.");
    }
    return payload;
  }
  /**
   * Builds a RawTransaction
   * @param func Fully qualified func names, e.g. 0x1::aptos_account::transfer
   * @param ty_tags TypeTag strings.
   * @example Below are valid value examples
   * ```
   * // Structs are in format `AccountAddress::ModuleName::StructName`
   * 0x1::aptos_coin::AptosCoin
   * // Vectors are in format `vector<other_tag_string>`
   * vector<0x1::aptos_coin::AptosCoin>
   * bool
   * u8
   * u16
   * u32
   * u64
   * u128
   * u256
   * address
   * ```
   * @param args Function arguments
   * @returns RawTransaction
   */
  build(func, ty_tags, args) {
    const {
      sender,
      sequenceNumber,
      gasUnitPrice,
      maxGasAmount,
      expSecFromNow,
      chainId
    } = this.builderConfig;
    if (!gasUnitPrice) {
      throw new Error("No gasUnitPrice provided.");
    }
    const senderAccount = sender instanceof AccountAddress ? sender : AccountAddress.fromHex(sender);
    const expTimestampSec = BigInt(Math.floor(Date.now() / 1e3) + Number(expSecFromNow));
    const payload = this.buildTransactionPayload(func, ty_tags, args);
    if (payload) {
      return new RawTransaction(senderAccount, BigInt(sequenceNumber), payload, BigInt(maxGasAmount), BigInt(gasUnitPrice), expTimestampSec, new ChainId(Number(chainId)));
    }
    throw new Error("Invalid ABI.");
  }
};
var TransactionBuilderRemoteABI = class {
  // We don't want the builder to depend on the actual AptosClient. There might be circular dependencies.
  constructor(aptosClient2, builderConfig) {
    this.aptosClient = aptosClient2;
    this.builderConfig = builderConfig;
  }
  async fetchABI(addr) {
    const modules = await this.aptosClient.getAccountModules(addr);
    const abis = modules.map(module => module.abi).flatMap(abi => abi.exposed_functions.filter(ef => ef.is_entry).map(ef => ({
      fullName: `${abi.address}::${abi.name}::${ef.name}`,
      ...ef
    })));
    const abiMap = /* @__PURE__ */new Map();
    abis.forEach(abi => {
      abiMap.set(abi.fullName, abi);
    });
    return abiMap;
  }
  /**
   * Builds a raw transaction. Only support script function a.k.a entry function payloads
   *
   * @param func fully qualified function name in format <address>::<module>::<function>, e.g. 0x1::coin::transfer
   * @param ty_tags
   * @param args
   * @returns RawTransaction
   */
  async build(func, ty_tags, args) {
    const normlize = s => s.replace(/^0[xX]0*/g, "0x");
    func = normlize(func);
    const funcNameParts = func.split("::");
    if (funcNameParts.length !== 3) {
      throw new Error(
      // eslint-disable-next-line max-len
      "'func' needs to be a fully qualified function name in format <address>::<module>::<function>, e.g. 0x1::coin::transfer");
    }
    const [addr, module] = func.split("::");
    const abiMap = await this.fetchABI(addr);
    if (!abiMap.has(func)) {
      throw new Error(`${func} doesn't exist.`);
    }
    const funcAbi = abiMap.get(func);
    const abiArgs = funcAbi.params.filter(param => param !== "signer" && param !== "&signer");
    const typeArgABIs = abiArgs.map((abiArg, i) => new ArgumentABI(`var${i}`, new TypeTagParser(abiArg, ty_tags).parseTypeTag()));
    const entryFunctionABI = new EntryFunctionABI(funcAbi.name, ModuleId.fromStr(`${addr}::${module}`), "",
    // Doc string
    funcAbi.generic_type_params.map((_, i) => new TypeArgumentABI(`${i}`)), typeArgABIs);
    const {
      sender,
      ...rest
    } = this.builderConfig;
    const senderAddress = sender instanceof AccountAddress ? HexString.fromUint8Array(sender.address) : sender;
    const [{
      sequence_number: sequenceNumber
    }, chainId, {
      gas_estimate: gasUnitPrice
    }] = await Promise.all([(rest == null ? void 0 : rest.sequenceNumber) ? Promise.resolve({
      sequence_number: rest == null ? void 0 : rest.sequenceNumber
    }) : this.aptosClient.getAccount(senderAddress), (rest == null ? void 0 : rest.chainId) ? Promise.resolve(rest == null ? void 0 : rest.chainId) : this.aptosClient.getChainId(), (rest == null ? void 0 : rest.gasUnitPrice) ? Promise.resolve({
      gas_estimate: rest == null ? void 0 : rest.gasUnitPrice
    }) : this.aptosClient.estimateGasPrice()]);
    const builderABI = new TransactionBuilderABI([bcsToBytes(entryFunctionABI)], {
      sender,
      sequenceNumber,
      chainId,
      gasUnitPrice: BigInt(gasUnitPrice),
      ...rest
    });
    return builderABI.build(func, ty_tags, args);
  }
};
exports.TransactionBuilderRemoteABI = TransactionBuilderRemoteABI;
__decorateClass([MemoizeExpiring(10 * 60 * 1e3)], TransactionBuilderRemoteABI.prototype, "fetchABI", 1);

// src/providers/aptos_client.ts
var _AptosClient = class _AptosClient {
  /**
   * Build a client configured to connect to an Aptos node at the given URL.
   *
   * Note: If you forget to append `/v1` to the URL, the client constructor
   * will automatically append it. If you don't want this URL processing to
   * take place, set doNotFixNodeUrl to true.
   *
   * @param nodeUrl URL of the Aptos Node API endpoint.
   * @param config Additional configuration options for the generated Axios client.
   */
  constructor(nodeUrl, config, doNotFixNodeUrl = false) {
    if (!nodeUrl) {
      throw new Error("Node URL cannot be empty.");
    }
    if (doNotFixNodeUrl) {
      this.nodeUrl = nodeUrl;
    } else {
      this.nodeUrl = fixNodeUrl(nodeUrl);
    }
    this.config = config === void 0 || config === null ? {} : {
      ...config
    };
  }
  async getAccount(accountAddress) {
    const {
      data
    } = await get({
      url: this.nodeUrl,
      endpoint: `accounts/${HexString.ensure(accountAddress).hex()}`,
      originMethod: "getAccount",
      overrides: {
        ...this.config
      }
    });
    return data;
  }
  async getAccountTransactions(accountAddress, query) {
    const {
      data
    } = await get({
      url: this.nodeUrl,
      endpoint: `accounts/${HexString.ensure(accountAddress).hex()}/transactions`,
      originMethod: "getAccountTransactions",
      params: {
        start: query == null ? void 0 : query.start,
        limit: query == null ? void 0 : query.limit
      },
      overrides: {
        ...this.config
      }
    });
    return data;
  }
  async getAccountModules(accountAddress, query) {
    const out = await paginateWithCursor({
      url: this.nodeUrl,
      endpoint: `accounts/${accountAddress}/modules`,
      params: {
        ledger_version: query == null ? void 0 : query.ledgerVersion,
        limit: 1e3
      },
      originMethod: "getAccountModules",
      overrides: {
        ...this.config
      }
    });
    return out;
  }
  async getAccountModule(accountAddress, moduleName, query) {
    const {
      data
    } = await get({
      url: this.nodeUrl,
      endpoint: `accounts/${HexString.ensure(accountAddress).hex()}/module/${moduleName}`,
      originMethod: "getAccountModule",
      params: {
        ledger_version: query == null ? void 0 : query.ledgerVersion
      },
      overrides: {
        ...this.config
      }
    });
    return data;
  }
  async getAccountResources(accountAddress, query) {
    const out = await paginateWithCursor({
      url: this.nodeUrl,
      endpoint: `accounts/${accountAddress}/resources`,
      params: {
        ledger_version: query == null ? void 0 : query.ledgerVersion,
        limit: 9999
      },
      originMethod: "getAccountResources",
      overrides: {
        ...this.config
      }
    });
    return out;
  }
  async getAccountResource(accountAddress, resourceType, query) {
    const {
      data
    } = await get({
      url: this.nodeUrl,
      endpoint: `accounts/${HexString.ensure(accountAddress).hex()}/resource/${resourceType}`,
      originMethod: "getAccountResource",
      params: {
        ledger_version: query == null ? void 0 : query.ledgerVersion
      },
      overrides: {
        ...this.config
      }
    });
    return data;
  }
  /** Generates a signed transaction that can be submitted to the chain for execution. */
  static generateBCSTransaction(accountFrom, rawTxn) {
    const txnBuilder = new TransactionBuilderEd25519(signingMessage => {
      const sigHexStr = accountFrom.signBuffer(signingMessage);
      return new aptos_types_exports.Ed25519Signature(sigHexStr.toUint8Array());
    }, accountFrom.pubKey().toUint8Array());
    return txnBuilder.sign(rawTxn);
  }
  /**
   * Note: Unless you have a specific reason for using this, it'll probably be simpler
   * to use `simulateTransaction`.
   *
   * Generates a BCS transaction that can be submitted to the chain for simulation.
   *
   * @param accountFrom The account that will be used to send the transaction
   * for simulation.
   * @param rawTxn The raw transaction to be simulated, likely created by calling
   * the `generateTransaction` function.
   * @returns The BCS encoded signed transaction, which you should then pass into
   * the `submitBCSSimulation` function.
   */
  static generateBCSSimulation(accountFrom, rawTxn) {
    const txnBuilder = new TransactionBuilderEd25519(_signingMessage => {
      const invalidSigBytes = new Uint8Array(64);
      return new aptos_types_exports.Ed25519Signature(invalidSigBytes);
    }, accountFrom.pubKey().toUint8Array());
    return txnBuilder.sign(rawTxn);
  }
  /** Generates an entry function transaction request that can be submitted to produce a raw transaction that
   * can be signed, which upon being signed can be submitted to the blockchain
   * This function fetches the remote ABI and uses it to serialized the data, therefore
   * users don't need to handle serialization by themselves.
   * @param sender Hex-encoded 32 byte Aptos account address of transaction sender
   * @param payload Entry function transaction payload type
   * @param options Options allow to overwrite default transaction options.
   * @returns A raw transaction object
   */
  async generateTransaction(sender, payload, options) {
    const config = {
      sender
    };
    if (options == null ? void 0 : options.sequence_number) {
      config.sequenceNumber = options.sequence_number;
    }
    if (options == null ? void 0 : options.gas_unit_price) {
      config.gasUnitPrice = options.gas_unit_price;
    }
    if (options == null ? void 0 : options.max_gas_amount) {
      config.maxGasAmount = options.max_gas_amount;
    }
    if (options == null ? void 0 : options.expiration_timestamp_secs) {
      const timestamp = Number.parseInt(options.expiration_timestamp_secs, 10);
      config.expSecFromNow = timestamp - Math.floor(Date.now() / 1e3);
    }
    const builder = new TransactionBuilderRemoteABI(this, config);
    return builder.build(payload.function, payload.type_arguments, payload.arguments);
  }
  /**
   * Generates a fee payer transaction that can be signed and submitted to chain
   *
   * @param sender the sender's account address
   * @param payload the transaction payload
   * @param fee_payer the fee payer account
   * @param secondarySignerAccounts an optional array of the secondary signers accounts
   * @returns a fee payer raw transaction that can be signed and submitted to chain
   */
  async generateFeePayerTransaction(sender, payload, feePayer, secondarySignerAccounts = [], options) {
    const rawTxn = await this.generateTransaction(sender, payload, options);
    const signers = secondarySignerAccounts.map(signer => AccountAddress.fromHex(signer));
    const feePayerTxn = new aptos_types_exports.FeePayerRawTransaction(rawTxn, signers, AccountAddress.fromHex(feePayer));
    return feePayerTxn;
  }
  /**
   * Submits fee payer transaction to chain
   *
   * @param feePayerTransaction the raw transaction to be submitted, of type FeePayerRawTransaction
   * @param senderAuthenticator the sender account authenticator (can get from signMultiTransaction() method)
   * @param feePayerAuthenticator the feepayer account authenticator (can get from signMultiTransaction() method)
   * @param signersAuthenticators an optional array of the signer account authenticators
   * @returns The pending transaction
   */
  async submitFeePayerTransaction(feePayerTransaction, senderAuthenticator, feePayerAuthenticator, additionalSignersAuthenticators = []) {
    const txAuthenticatorFeePayer = new aptos_types_exports.TransactionAuthenticatorFeePayer(senderAuthenticator, feePayerTransaction.secondary_signer_addresses, additionalSignersAuthenticators, {
      address: feePayerTransaction.fee_payer_address,
      authenticator: feePayerAuthenticator
    });
    const bcsTxn = bcsToBytes(new aptos_types_exports.SignedTransaction(feePayerTransaction.raw_txn, txAuthenticatorFeePayer));
    const transactionRes = await this.submitSignedBCSTransaction(bcsTxn);
    return transactionRes;
  }
  /**
   * Signs a multi transaction type (multi agent / fee payer) and returns the
   * signer authenticator to be used to submit the transaction.
   *
   * @param signer the account to sign on the transaction
   * @param rawTxn a MultiAgentRawTransaction or FeePayerRawTransaction
   * @returns signer authenticator
   */
  // eslint-disable-next-line class-methods-use-this
  async signMultiTransaction(signer, rawTxn) {
    const signerSignature = new aptos_types_exports.Ed25519Signature(signer.signBuffer(TransactionBuilder.getSigningMessage(rawTxn)).toUint8Array());
    const signerAuthenticator = new aptos_types_exports.AccountAuthenticatorEd25519(new aptos_types_exports.Ed25519PublicKey(signer.signingKey.publicKey), signerSignature);
    return Promise.resolve(signerAuthenticator);
  }
  /** Converts a transaction request produced by `generateTransaction` into a properly
   * signed transaction, which can then be submitted to the blockchain
   * @param accountFrom AptosAccount of transaction sender
   * @param rawTransaction A raw transaction generated by `generateTransaction` method
   * @returns A transaction, signed with sender account
   */
  // eslint-disable-next-line class-methods-use-this
  async signTransaction(accountFrom, rawTransaction) {
    return Promise.resolve(_AptosClient.generateBCSTransaction(accountFrom, rawTransaction));
  }
  async getEventsByCreationNumber(address, creationNumber, query) {
    const {
      data
    } = await get({
      url: this.nodeUrl,
      endpoint: `accounts/${HexString.ensure(address).hex()}/events/${creationNumber}`,
      originMethod: "getEventsByCreationNumber",
      params: {
        start: query == null ? void 0 : query.start,
        limit: query == null ? void 0 : query.limit
      },
      overrides: {
        ...this.config
      }
    });
    return data;
  }
  async getEventsByEventHandle(address, eventHandleStruct, fieldName, query) {
    const {
      data
    } = await get({
      url: this.nodeUrl,
      endpoint: `accounts/${HexString.ensure(address).hex()}/events/${eventHandleStruct}/${fieldName}`,
      originMethod: "getEventsByEventHandle",
      params: {
        start: query == null ? void 0 : query.start,
        limit: query == null ? void 0 : query.limit
      },
      overrides: {
        ...this.config
      }
    });
    return data;
  }
  /**
   * Submits a signed transaction to the transaction endpoint.
   * @param signedTxn A transaction, signed by `signTransaction` method
   * @returns Transaction that is accepted and submitted to mempool
   */
  async submitTransaction(signedTxn) {
    return this.submitSignedBCSTransaction(signedTxn);
  }
  /**
   * Generates and submits a transaction to the transaction simulation
   * endpoint. For this we generate a transaction with a fake signature.
   *
   * @param accountOrPubkey The sender or sender's public key. When private key is available, `AptosAccount` instance
   * can be used to send the transaction for simulation. If private key is not available, sender's public key can be
   * used to send the transaction for simulation.
   * @param rawTransaction The raw transaction to be simulated, likely created
   * by calling the `generateTransaction` function.
   * @param query.estimateGasUnitPrice If set to true, the gas unit price in the
   * transaction will be ignored and the estimated value will be used.
   * @param query.estimateMaxGasAmount If set to true, the max gas value in the
   * transaction will be ignored and the maximum possible gas will be used.
   * @param query.estimatePrioritizedGasUnitPrice If set to true, the transaction will use a higher price than the
   * original estimate.
   * @returns The BCS encoded signed transaction, which you should then provide
   *
   */
  async simulateTransaction(accountOrPubkey, rawTransaction, query) {
    let signedTxn;
    if (accountOrPubkey instanceof AptosAccount) {
      signedTxn = _AptosClient.generateBCSSimulation(accountOrPubkey, rawTransaction);
    } else if (accountOrPubkey instanceof MultiEd25519PublicKey) {
      const txnBuilder = new TransactionBuilderMultiEd25519(() => {
        const {
          threshold
        } = accountOrPubkey;
        const bits = [];
        const signatures = [];
        for (let i = 0; i < threshold; i += 1) {
          bits.push(i);
          signatures.push(new aptos_types_exports.Ed25519Signature(new Uint8Array(64)));
        }
        const bitmap = aptos_types_exports.MultiEd25519Signature.createBitmap(bits);
        return new aptos_types_exports.MultiEd25519Signature(signatures, bitmap);
      }, accountOrPubkey);
      signedTxn = txnBuilder.sign(rawTransaction);
    } else {
      const txnBuilder = new TransactionBuilderEd25519(() => {
        const invalidSigBytes = new Uint8Array(64);
        return new aptos_types_exports.Ed25519Signature(invalidSigBytes);
      }, accountOrPubkey.toBytes());
      signedTxn = txnBuilder.sign(rawTransaction);
    }
    return this.submitBCSSimulation(signedTxn, query);
  }
  async submitSignedBCSTransaction(signedTxn) {
    const {
      data
    } = await post({
      url: this.nodeUrl,
      body: signedTxn,
      endpoint: "transactions",
      originMethod: "submitSignedBCSTransaction",
      contentType: "application/x.aptos.signed_transaction+bcs",
      overrides: {
        ...this.config
      }
    });
    return data;
  }
  async submitBCSSimulation(bcsBody, query) {
    var _a, _b, _c;
    const queryParams = {
      estimate_gas_unit_price: (_a = query == null ? void 0 : query.estimateGasUnitPrice) != null ? _a : false,
      estimate_max_gas_amount: (_b = query == null ? void 0 : query.estimateMaxGasAmount) != null ? _b : false,
      estimate_prioritized_gas_unit_price: (_c = query == null ? void 0 : query.estimatePrioritizedGasUnitPrice) != null ? _c : false
    };
    const {
      data
    } = await post({
      url: this.nodeUrl,
      body: bcsBody,
      endpoint: "transactions/simulate",
      params: queryParams,
      originMethod: "submitBCSSimulation",
      contentType: "application/x.aptos.signed_transaction+bcs",
      overrides: {
        ...this.config
      }
    });
    return data;
  }
  async getTransactions(query) {
    var _a;
    const {
      data
    } = await get({
      url: this.nodeUrl,
      endpoint: "transactions",
      originMethod: "getTransactions",
      params: {
        start: (_a = query == null ? void 0 : query.start) == null ? void 0 : _a.toString(),
        limit: query == null ? void 0 : query.limit
      },
      overrides: {
        ...this.config
      }
    });
    return data;
  }
  async getTransactionByHash(txnHash) {
    const {
      data
    } = await get({
      url: this.nodeUrl,
      endpoint: `transactions/by_hash/${txnHash}`,
      originMethod: "getTransactionByHash",
      overrides: {
        ...this.config
      }
    });
    return data;
  }
  async getTransactionByVersion(txnVersion) {
    const {
      data
    } = await get({
      url: this.nodeUrl,
      endpoint: `transactions/by_version/${txnVersion}`,
      originMethod: "getTransactionByVersion",
      overrides: {
        ...this.config
      }
    });
    return data;
  }
  /**
   * Defines if specified transaction is currently in pending state
   * @param txnHash A hash of transaction
   *
   * To create a transaction hash:
   *
   * 1. Create hash message bytes: "Aptos::Transaction" bytes + BCS bytes of Transaction.
   * 2. Apply hash algorithm SHA3-256 to the hash message bytes.
   * 3. Hex-encode the hash bytes with 0x prefix.
   *
   * @returns `true` if transaction is in pending state and `false` otherwise
   */
  async transactionPending(txnHash) {
    try {
      const response = await this.getTransactionByHash(txnHash);
      return response.type === "pending_transaction";
    } catch (e) {
      if ((e == null ? void 0 : e.status) === 404) {
        return true;
      }
      throw e;
    }
  }
  /**
   * Wait for a transaction to move past pending state.
   *
   * There are 4 possible outcomes:
   * 1. Transaction is processed and successfully committed to the blockchain.
   * 2. Transaction is rejected for some reason, and is therefore not committed
   *    to the blockchain.
   * 3. Transaction is committed but execution failed, meaning no changes were
   *    written to the blockchain state.
   * 4. Transaction is not processed within the specified timeout.
   *
   * In case 1, this function resolves with the transaction response returned
   * by the API.
   *
   * In case 2, the function will throw an ApiError, likely with an HTTP status
   * code indicating some problem with the request (e.g. 400).
   *
   * In case 3, if `checkSuccess` is false (the default), this function returns
   * the transaction response just like in case 1, in which the `success` field
   * will be false. If `checkSuccess` is true, it will instead throw a
   * FailedTransactionError.
   *
   * In case 4, this function throws a WaitForTransactionError.
   *
   * @param txnHash The hash of a transaction previously submitted to the blockchain.
   * @param extraArgs.timeoutSecs Timeout in seconds. Defaults to 20 seconds.
   * @param extraArgs.checkSuccess See above. Defaults to false.
   * @returns See above.
   *
   * @example
   * ```
   * const rawTransaction = await this.generateRawTransaction(sender.address(), payload, extraArgs);
   * const bcsTxn = AptosClient.generateBCSTransaction(sender, rawTransaction);
   * const pendingTransaction = await this.submitSignedBCSTransaction(bcsTxn);
   * const transasction = await this.aptosClient.waitForTransactionWithResult(pendingTransaction.hash);
   * ```
   */
  async waitForTransactionWithResult(txnHash, extraArgs) {
    var _a, _b;
    const timeoutSecs = (_a = extraArgs == null ? void 0 : extraArgs.timeoutSecs) != null ? _a : DEFAULT_TXN_TIMEOUT_SEC;
    const checkSuccess = (_b = extraArgs == null ? void 0 : extraArgs.checkSuccess) != null ? _b : false;
    let isPending = true;
    let count = 0;
    let lastTxn;
    while (isPending) {
      if (count >= timeoutSecs) {
        break;
      }
      try {
        lastTxn = await this.getTransactionByHash(txnHash);
        isPending = lastTxn.type === "pending_transaction";
        if (!isPending) {
          break;
        }
      } catch (e) {
        const isApiError = e instanceof ApiError;
        const isRequestError = isApiError && e.status !== 404 && e.status >= 400 && e.status < 500;
        if (!isApiError || isRequestError) {
          throw e;
        }
      }
      await sleep(1e3);
      count += 1;
    }
    if (lastTxn === void 0) {
      throw new Error(`Waiting for transaction ${txnHash} failed`);
    }
    if (isPending) {
      throw new WaitForTransactionError(`Waiting for transaction ${txnHash} timed out after ${timeoutSecs} seconds`, lastTxn);
    }
    if (!checkSuccess) {
      return lastTxn;
    }
    if (!(lastTxn == null ? void 0 : lastTxn.success)) {
      throw new FailedTransactionError(`Transaction ${txnHash} failed with an error: ${lastTxn.vm_status}`, lastTxn);
    }
    return lastTxn;
  }
  /**
   * This function works the same as `waitForTransactionWithResult` except it
   * doesn't return the transaction in those cases, it returns nothing. For
   * more information, see the documentation for `waitForTransactionWithResult`.
   */
  async waitForTransaction(txnHash, extraArgs) {
    await this.waitForTransactionWithResult(txnHash, extraArgs);
  }
  async getLedgerInfo() {
    const {
      data
    } = await get({
      url: this.nodeUrl,
      originMethod: "getLedgerInfo",
      overrides: {
        ...this.config
      }
    });
    return data;
  }
  async getChainId() {
    const result = await this.getLedgerInfo();
    return result.chain_id;
  }
  async getTableItem(handle, data, query) {
    var _a;
    const response = await post({
      url: this.nodeUrl,
      body: data,
      endpoint: `tables/${handle}/item`,
      originMethod: "getTableItem",
      params: {
        ledger_version: (_a = query == null ? void 0 : query.ledgerVersion) == null ? void 0 : _a.toString()
      },
      overrides: {
        ...this.config
      }
    });
    return response.data;
  }
  /**
   * Generates a raw transaction out of a transaction payload
   * @param accountFrom
   * @param payload
   * @param extraArgs
   * @returns A raw transaction object
   */
  async generateRawTransaction(accountFrom, payload, extraArgs) {
    const [{
      sequence_number: sequenceNumber
    }, chainId, {
      gas_estimate: gasEstimate
    }] = await Promise.all([(extraArgs == null ? void 0 : extraArgs.providedSequenceNumber) ? Promise.resolve({
      sequence_number: extraArgs.providedSequenceNumber
    }) : this.getAccount(accountFrom), this.getChainId(), (extraArgs == null ? void 0 : extraArgs.gasUnitPrice) ? Promise.resolve({
      gas_estimate: extraArgs.gasUnitPrice
    }) : this.estimateGasPrice()]);
    const {
      maxGasAmount,
      gasUnitPrice,
      expireTimestamp
    } = {
      maxGasAmount: BigInt(DEFAULT_MAX_GAS_AMOUNT),
      gasUnitPrice: BigInt(gasEstimate),
      expireTimestamp: BigInt(Math.floor(Date.now() / 1e3) + DEFAULT_TXN_EXP_SEC_FROM_NOW),
      ...extraArgs
    };
    return new aptos_types_exports.RawTransaction(aptos_types_exports.AccountAddress.fromHex(accountFrom), BigInt(sequenceNumber), payload, maxGasAmount, gasUnitPrice, expireTimestamp, new aptos_types_exports.ChainId(chainId));
  }
  /**
   * Helper for generating, signing, and submitting a transaction.
   *
   * @param sender AptosAccount of transaction sender.
   * @param payload Transaction payload.
   * @param extraArgs Extra args for building the transaction payload.
   * @returns The transaction response from the API.
   */
  async generateSignSubmitTransaction(sender, payload, extraArgs) {
    const rawTransaction = await this.generateRawTransaction(sender.address(), payload, extraArgs);
    const bcsTxn = _AptosClient.generateBCSTransaction(sender, rawTransaction);
    const pendingTransaction = await this.submitSignedBCSTransaction(bcsTxn);
    return pendingTransaction.hash;
  }
  /**
   * Helper for signing and submitting a transaction.
   *
   * @param sender AptosAccount of transaction sender.
   * @param transaction A generated Raw transaction payload.
   * @returns The transaction response from the API.
   */
  async signAndSubmitTransaction(sender, transaction) {
    const bcsTxn = _AptosClient.generateBCSTransaction(sender, transaction);
    const pendingTransaction = await this.submitSignedBCSTransaction(bcsTxn);
    return pendingTransaction.hash;
  }
  /**
   * Publishes a move package. `packageMetadata` and `modules` can be generated with command
   * `aptos move compile --save-metadata [ --included-artifacts=<...> ]`.
   * @param sender
   * @param packageMetadata package metadata bytes
   * @param modules bytecodes of modules
   * @param extraArgs
   * @returns Transaction hash
   */
  async publishPackage(sender, packageMetadata, modules, extraArgs) {
    const codeSerializer = new Serializer();
    serializeVector(modules, codeSerializer);
    const payload = new aptos_types_exports.TransactionPayloadEntryFunction(aptos_types_exports.EntryFunction.natural("0x1::code", "publish_package_txn", [], [bcsSerializeBytes(packageMetadata), codeSerializer.getBytes()]));
    return this.generateSignSubmitTransaction(sender, payload, extraArgs);
  }
  /**
   * Publishes a move packages by creating a resource account.
   * The package cannot be upgraded since it is deployed by resource account
   * `packageMetadata` and `modules` can be generated with command
   * `aptos move compile --save-metadata [ --included-artifacts=<...> ]`.
   * @param sender
   * @param seed seeds for creation of resource address
   * @param packageMetadata package metadata bytes
   * @param modules bytecodes of modules
   * @param extraArgs
   * @returns Transaction hash
   */
  async createResourceAccountAndPublishPackage(sender, seed, packageMetadata, modules, extraArgs) {
    const codeSerializer = new Serializer();
    serializeVector(modules, codeSerializer);
    const payload = new aptos_types_exports.TransactionPayloadEntryFunction(aptos_types_exports.EntryFunction.natural("0x1::resource_account", "create_resource_account_and_publish_package", [], [bcsSerializeBytes(seed), bcsSerializeBytes(packageMetadata), codeSerializer.getBytes()]));
    return this.generateSignSubmitTransaction(sender, payload, extraArgs);
  }
  /**
   * Helper for generating, submitting, and waiting for a transaction, and then
   * checking whether it was committed successfully. Under the hood this is just
   * `generateSignSubmitTransaction` and then `waitForTransactionWithResult`, see
   * those for information about the return / error semantics of this function.
   */
  async generateSignSubmitWaitForTransaction(sender, payload, extraArgs) {
    const txnHash = await this.generateSignSubmitTransaction(sender, payload, extraArgs);
    return this.waitForTransactionWithResult(txnHash, extraArgs);
  }
  async estimateGasPrice() {
    const {
      data
    } = await get({
      url: this.nodeUrl,
      endpoint: "estimate_gas_price",
      originMethod: "estimateGasPrice",
      overrides: {
        ...this.config
      }
    });
    return data;
  }
  async estimateMaxGasAmount(forAccount) {
    const typeTag = `0x1::coin::CoinStore<${APTOS_COIN}>`;
    const [{
      gas_estimate: gasUnitPrice
    }, resources] = await Promise.all([this.estimateGasPrice(), this.getAccountResources(forAccount)]);
    const accountResource = resources.find(r => r.type === typeTag);
    const balance = BigInt(accountResource.data.coin.value);
    return balance / BigInt(gasUnitPrice);
  }
  /**
   * Rotate an account's auth key. After rotation, only the new private key can be used to sign txns for
   * the account.
   * WARNING: You must create a new instance of AptosAccount after using this function.
   * @param forAccount Account of which the auth key will be rotated
   * @param toPrivateKeyBytes New private key
   * @param extraArgs Extra args for building the transaction payload.
   * @returns PendingTransaction
   */
  async rotateAuthKeyEd25519(forAccount, toPrivateKeyBytes, extraArgs) {
    const {
      sequence_number: sequenceNumber,
      authentication_key: authKey
    } = await this.getAccount(forAccount.address());
    const helperAccount = new AptosAccount(toPrivateKeyBytes);
    const challenge = new aptos_types_exports.RotationProofChallenge(aptos_types_exports.AccountAddress.CORE_CODE_ADDRESS, "account", "RotationProofChallenge", BigInt(sequenceNumber), aptos_types_exports.AccountAddress.fromHex(forAccount.address()), new aptos_types_exports.AccountAddress(new HexString(authKey).toUint8Array()), helperAccount.pubKey().toUint8Array());
    const challengeHex = HexString.fromUint8Array(bcsToBytes(challenge));
    const proofSignedByCurrentPrivateKey = forAccount.signHexString(challengeHex);
    const proofSignedByNewPrivateKey = helperAccount.signHexString(challengeHex);
    const payload = new aptos_types_exports.TransactionPayloadEntryFunction(aptos_types_exports.EntryFunction.natural("0x1::account", "rotate_authentication_key", [], [bcsSerializeU8(0),
    // ed25519 scheme
    bcsSerializeBytes(forAccount.pubKey().toUint8Array()), bcsSerializeU8(0),
    // ed25519 scheme
    bcsSerializeBytes(helperAccount.pubKey().toUint8Array()), bcsSerializeBytes(proofSignedByCurrentPrivateKey.toUint8Array()), bcsSerializeBytes(proofSignedByNewPrivateKey.toUint8Array())]));
    const rawTransaction = await this.generateRawTransaction(forAccount.address(), payload, extraArgs);
    const bcsTxn = _AptosClient.generateBCSTransaction(forAccount, rawTransaction);
    return this.submitSignedBCSTransaction(bcsTxn);
  }
  /**
   * Lookup the original address by the current derived address
   * @param addressOrAuthKey
   * @returns original address
   */
  async lookupOriginalAddress(addressOrAuthKey) {
    const resource = await this.getAccountResource("0x1", "0x1::account::OriginatingAddress");
    const {
      address_map: {
        handle
      }
    } = resource.data;
    const origAddress = await this.getTableItem(handle, {
      key_type: "address",
      value_type: "address",
      key: HexString.ensure(addressOrAuthKey).hex()
    });
    return new HexString(origAddress);
  }
  async getBlockByHeight(blockHeight, withTransactions) {
    const {
      data
    } = await get({
      url: this.nodeUrl,
      endpoint: `blocks/by_height/${blockHeight}`,
      originMethod: "getBlockByHeight",
      params: {
        with_transactions: withTransactions
      },
      overrides: {
        ...this.config
      }
    });
    return data;
  }
  async getBlockByVersion(version, withTransactions) {
    const {
      data
    } = await get({
      url: this.nodeUrl,
      endpoint: `blocks/by_version/${version}`,
      originMethod: "getBlockByVersion",
      params: {
        with_transactions: withTransactions
      },
      overrides: {
        ...this.config
      }
    });
    return data;
  }
  async view(payload, ledger_version) {
    const {
      data
    } = await post({
      url: this.nodeUrl,
      body: payload,
      endpoint: "view",
      originMethod: "getTableItem",
      params: {
        ledger_version
      },
      overrides: {
        ...this.config
      }
    });
    return data;
  }
  // eslint-disable-next-line class-methods-use-this
  clearCache(tags) {
    clear(tags);
  }
};
__decorateClass([parseApiError], _AptosClient.prototype, "getAccount", 1);
__decorateClass([parseApiError], _AptosClient.prototype, "getAccountTransactions", 1);
__decorateClass([parseApiError, MemoizeExpiring(10 * 60 * 1e3)], _AptosClient.prototype, "getAccountModules", 1);
__decorateClass([parseApiError], _AptosClient.prototype, "getAccountModule", 1);
__decorateClass([parseApiError], _AptosClient.prototype, "getAccountResources", 1);
__decorateClass([parseApiError], _AptosClient.prototype, "getAccountResource", 1);
__decorateClass([parseApiError], _AptosClient.prototype, "getEventsByCreationNumber", 1);
__decorateClass([parseApiError], _AptosClient.prototype, "getEventsByEventHandle", 1);
__decorateClass([parseApiError], _AptosClient.prototype, "submitSignedBCSTransaction", 1);
__decorateClass([parseApiError], _AptosClient.prototype, "submitBCSSimulation", 1);
__decorateClass([parseApiError], _AptosClient.prototype, "getTransactions", 1);
__decorateClass([parseApiError], _AptosClient.prototype, "getTransactionByHash", 1);
__decorateClass([parseApiError], _AptosClient.prototype, "getTransactionByVersion", 1);
__decorateClass([parseApiError], _AptosClient.prototype, "getLedgerInfo", 1);
__decorateClass([Memoize()], _AptosClient.prototype, "getChainId", 1);
__decorateClass([parseApiError], _AptosClient.prototype, "getTableItem", 1);
__decorateClass([parseApiError, Memoize({
  ttlMs: 5 * 60 * 1e3,
  // cache result for 5min
  tags: ["gas_estimates"]
})], _AptosClient.prototype, "estimateGasPrice", 1);
__decorateClass([parseApiError], _AptosClient.prototype, "estimateMaxGasAmount", 1);
__decorateClass([parseApiError], _AptosClient.prototype, "getBlockByHeight", 1);
__decorateClass([parseApiError], _AptosClient.prototype, "getBlockByVersion", 1);
__decorateClass([parseApiError], _AptosClient.prototype, "view", 1);
var AptosClient = exports.AptosClient = _AptosClient;
var WaitForTransactionError = class extends Error {
  constructor(message, lastSubmittedTransaction) {
    super(message);
    this.lastSubmittedTransaction = lastSubmittedTransaction;
  }
};
exports.WaitForTransactionError = WaitForTransactionError;
var FailedTransactionError = class extends Error {
  constructor(message, transaction) {
    super(message);
    this.transaction = transaction;
  }
};
exports.FailedTransactionError = FailedTransactionError;
var ApiError = class extends Error {
  constructor(status, message, errorCode, vmErrorCode) {
    super(message);
    this.status = status;
    this.message = message;
    this.errorCode = errorCode;
    this.vmErrorCode = vmErrorCode;
  }
};
exports.ApiError = ApiError;
function parseApiError(target, propertyKey, descriptor) {
  const childFunction = descriptor.value;
  descriptor.value = async function wrapper(...args) {
    var _a, _b;
    try {
      const res = await childFunction.apply(this, [...args]);
      return res;
    } catch (e) {
      if (e instanceof AptosApiError) {
        throw new ApiError(e.status, JSON.stringify({
          message: e.message,
          ...e.data
        }), (_a = e.data) == null ? void 0 : _a.error_code, (_b = e.data) == null ? void 0 : _b.vm_error_code);
      }
      throw e;
    }
  };
  return descriptor;
}

// src/providers/indexer.ts
var IndexerClient = exports.IndexerClient = class _IndexerClient {
  /**
   * @param endpoint URL of the Aptos Indexer API endpoint.
   */
  constructor(endpoint, config) {
    this.endpoint = endpoint;
    this.config = config;
  }
  /**
   * Indexer only accepts address in the long format, i.e a 66 chars long -> 0x<64 chars>
   * This method makes sure address is 66 chars long.
   * @param address
   */
  static validateAddress(address) {
    if (address.length < 66) {
      throw new Error(`${address} is less than 66 chars long.`);
    }
  }
  /**
   * Makes axios client call to fetch data from Aptos Indexer.
   *
   * @param graphqlQuery A GraphQL query to pass in the `data` axios call.
   */
  async queryIndexer(graphqlQuery) {
    const response = await post({
      url: this.endpoint,
      body: graphqlQuery,
      overrides: {
        WITH_CREDENTIALS: false,
        ...this.config
      }
    });
    if (response.data.errors) {
      throw new ApiError(response.data.errors[0].extensions.code, JSON.stringify({
        message: response.data.errors[0].message,
        error_code: response.data.errors[0].extensions.code
      }));
    }
    return response.data.data;
  }
  /**
   * Queries Indexer Ledger Info
   *
   * @returns GetLedgerInfoQuery response type
   */
  async getIndexerLedgerInfo() {
    const graphqlQuery = {
      query: GetIndexerLedgerInfo
    };
    return this.queryIndexer(graphqlQuery);
  }
  // TOKENS //
  /**
   * @deprecated please use `getOwnedTokens` query
   *
   * Queries an Aptos account's NFTs by owner address
   *
   * @param ownerAddress Hex-encoded 32 byte Aptos account address
   * @returns GetAccountCurrentTokensQuery response type
   */
  async getAccountNFTs(ownerAddress, options) {
    const address = HexString.ensure(ownerAddress).hex();
    _IndexerClient.validateAddress(address);
    const graphqlQuery = {
      query: GetAccountCurrentTokens,
      variables: {
        address,
        offset: options == null ? void 0 : options.offset,
        limit: options == null ? void 0 : options.limit
      }
    };
    return this.queryIndexer(graphqlQuery);
  }
  /**
   * Queries a token activities by token address (v2) or token data id (v1)
   *
   * @param idHash token address (v2) or token data id (v1)
   * @returns GetTokenActivitiesQuery response type
   */
  async getTokenActivities(token, extraArgs) {
    var _a, _b;
    const tokenAddress = HexString.ensure(token).hex();
    _IndexerClient.validateAddress(tokenAddress);
    const whereCondition = {
      token_data_id: {
        _eq: tokenAddress
      }
    };
    if (extraArgs == null ? void 0 : extraArgs.tokenStandard) {
      whereCondition.token_standard = {
        _eq: extraArgs == null ? void 0 : extraArgs.tokenStandard
      };
    }
    const graphqlQuery = {
      query: GetTokenActivities,
      variables: {
        where_condition: whereCondition,
        offset: (_a = extraArgs == null ? void 0 : extraArgs.options) == null ? void 0 : _a.offset,
        limit: (_b = extraArgs == null ? void 0 : extraArgs.options) == null ? void 0 : _b.limit,
        order_by: extraArgs == null ? void 0 : extraArgs.orderBy
      }
    };
    return this.queryIndexer(graphqlQuery);
  }
  /**
   * Gets the count of token's activities by token address (v2) or token data id (v1)
   *
   * @param token token address (v2) or token data id (v1)
   * @returns GetTokenActivitiesCountQuery response type
   */
  async getTokenActivitiesCount(token) {
    const graphqlQuery = {
      query: GetTokenActivitiesCount,
      variables: {
        token_id: token
      }
    };
    return this.queryIndexer(graphqlQuery);
  }
  /**
   * Gets the count of tokens owned by an account
   *
   * @param ownerAddress Owner address
   * @returns AccountTokensCountQuery response type
   */
  async getAccountTokensCount(ownerAddress, extraArgs) {
    var _a, _b;
    const whereCondition = {
      owner_address: {
        _eq: ownerAddress
      },
      amount: {
        _gt: "0"
      }
    };
    if (extraArgs == null ? void 0 : extraArgs.tokenStandard) {
      whereCondition.token_standard = {
        _eq: extraArgs == null ? void 0 : extraArgs.tokenStandard
      };
    }
    const address = HexString.ensure(ownerAddress).hex();
    _IndexerClient.validateAddress(address);
    const graphqlQuery = {
      query: GetAccountTokensCount,
      variables: {
        where_condition: whereCondition,
        offset: (_a = extraArgs == null ? void 0 : extraArgs.options) == null ? void 0 : _a.offset,
        limit: (_b = extraArgs == null ? void 0 : extraArgs.options) == null ? void 0 : _b.limit
      }
    };
    return this.queryIndexer(graphqlQuery);
  }
  /**
   * Queries token data by token address (v2) or token data id (v1)
   *
   * @param token token address (v2) or token data id (v1)
   * @returns GetTokenDataQuery response type
   */
  // :!:>getTokenData
  async getTokenData(token, extraArgs) {
    var _a, _b;
    const tokenAddress = HexString.ensure(token).hex();
    _IndexerClient.validateAddress(tokenAddress);
    const whereCondition = {
      token_data_id: {
        _eq: tokenAddress
      }
    };
    if (extraArgs == null ? void 0 : extraArgs.tokenStandard) {
      whereCondition.token_standard = {
        _eq: extraArgs == null ? void 0 : extraArgs.tokenStandard
      };
    }
    const graphqlQuery = {
      query: GetTokenData,
      variables: {
        where_condition: whereCondition,
        offset: (_a = extraArgs == null ? void 0 : extraArgs.options) == null ? void 0 : _a.offset,
        limit: (_b = extraArgs == null ? void 0 : extraArgs.options) == null ? void 0 : _b.limit,
        order_by: extraArgs == null ? void 0 : extraArgs.orderBy
      }
    };
    return this.queryIndexer(graphqlQuery);
  }
  // <:!:getTokenData
  /**
   * Queries token owners data by token address (v2) or token data id (v1).
   * This query returns historical owners data.
   *
   * To fetch token v2 standard, pass in the optional `tokenStandard` parameter and
   * dont pass `propertyVersion` parameter (as propertyVersion only compatible with v1 standard)
   *
   * @param token token address (v2) or token data id (v1)
   * @param propertyVersion Property version (optional) - only compatible with token v1 standard
   * @returns GetTokenOwnersDataQuery response type
   */
  async getTokenOwnersData(token, propertyVersion, extraArgs) {
    var _a, _b;
    const tokenAddress = HexString.ensure(token).hex();
    _IndexerClient.validateAddress(tokenAddress);
    const whereCondition = {
      token_data_id: {
        _eq: tokenAddress
      },
      amount: {
        _gt: "0"
      }
    };
    if (propertyVersion) {
      whereCondition.property_version_v1 = {
        _eq: propertyVersion
      };
    }
    if (extraArgs == null ? void 0 : extraArgs.tokenStandard) {
      whereCondition.token_standard = {
        _eq: extraArgs == null ? void 0 : extraArgs.tokenStandard
      };
    }
    const graphqlQuery = {
      query: GetTokenOwnersData,
      variables: {
        where_condition: whereCondition,
        offset: (_a = extraArgs == null ? void 0 : extraArgs.options) == null ? void 0 : _a.offset,
        limit: (_b = extraArgs == null ? void 0 : extraArgs.options) == null ? void 0 : _b.limit,
        order_by: extraArgs == null ? void 0 : extraArgs.orderBy
      }
    };
    return this.queryIndexer(graphqlQuery);
  }
  /**
   * Queries current token owner data by token address (v2) or token data id (v1).
   * This query returns the current token owner data.
   *
   * To fetch token v2 standard, pass in the optional `tokenStandard` parameter and
   * dont pass `propertyVersion` parameter (as propertyVersion only compatible with v1 standard)
   *
   * @param token token address (v2) or token data id (v1)
   * @param propertyVersion Property version (optional) - only compatible with token v1 standard
   * @returns GetTokenCurrentOwnerDataQuery response type
   */
  async getTokenCurrentOwnerData(token, propertyVersion, extraArgs) {
    var _a, _b;
    const tokenAddress = HexString.ensure(token).hex();
    _IndexerClient.validateAddress(tokenAddress);
    const whereCondition = {
      token_data_id: {
        _eq: tokenAddress
      },
      amount: {
        _gt: "0"
      }
    };
    if (propertyVersion) {
      whereCondition.property_version_v1 = {
        _eq: propertyVersion
      };
    }
    if (extraArgs == null ? void 0 : extraArgs.tokenStandard) {
      whereCondition.token_standard = {
        _eq: extraArgs == null ? void 0 : extraArgs.tokenStandard
      };
    }
    const graphqlQuery = {
      query: GetTokenCurrentOwnerData,
      variables: {
        where_condition: whereCondition,
        offset: (_a = extraArgs == null ? void 0 : extraArgs.options) == null ? void 0 : _a.offset,
        limit: (_b = extraArgs == null ? void 0 : extraArgs.options) == null ? void 0 : _b.limit,
        order_by: extraArgs == null ? void 0 : extraArgs.orderBy
      }
    };
    return this.queryIndexer(graphqlQuery);
  }
  /**
   * Queries account's current owned tokens.
   * This query returns all tokens (v1 and v2 standards) an account owns, including NFTs, fungible, soulbound, etc.
   * If you want to get only the token from a specific standrd, you can pass an optional tokenStandard param
   *
   * @param ownerAddress The token owner address we want to get the tokens for
   * @returns GetOwnedTokensQuery response type
   */
  async getOwnedTokens(ownerAddress, extraArgs) {
    var _a, _b;
    const address = HexString.ensure(ownerAddress).hex();
    _IndexerClient.validateAddress(address);
    const whereCondition = {
      owner_address: {
        _eq: address
      },
      amount: {
        _gt: 0
      }
    };
    if (extraArgs == null ? void 0 : extraArgs.tokenStandard) {
      whereCondition.token_standard = {
        _eq: extraArgs == null ? void 0 : extraArgs.tokenStandard
      };
    }
    const graphqlQuery = {
      query: GetOwnedTokens,
      variables: {
        where_condition: whereCondition,
        offset: (_a = extraArgs == null ? void 0 : extraArgs.options) == null ? void 0 : _a.offset,
        limit: (_b = extraArgs == null ? void 0 : extraArgs.options) == null ? void 0 : _b.limit,
        order_by: extraArgs == null ? void 0 : extraArgs.orderBy
      }
    };
    return this.queryIndexer(graphqlQuery);
  }
  /**
   * Queries account's current owned tokens by token address (v2) or token data id (v1).
   *
   * @param token token address (v2) or token data id (v1)
   * @returns GetOwnedTokensByTokenDataQuery response type
   */
  async getOwnedTokensByTokenData(token, extraArgs) {
    var _a, _b;
    const address = HexString.ensure(token).hex();
    _IndexerClient.validateAddress(address);
    const whereCondition = {
      token_data_id: {
        _eq: address
      },
      amount: {
        _gt: 0
      }
    };
    if (extraArgs == null ? void 0 : extraArgs.tokenStandard) {
      whereCondition.token_standard = {
        _eq: extraArgs == null ? void 0 : extraArgs.tokenStandard
      };
    }
    const graphqlQuery = {
      query: GetOwnedTokensByTokenData,
      variables: {
        where_condition: whereCondition,
        offset: (_a = extraArgs == null ? void 0 : extraArgs.options) == null ? void 0 : _a.offset,
        limit: (_b = extraArgs == null ? void 0 : extraArgs.options) == null ? void 0 : _b.limit,
        order_by: extraArgs == null ? void 0 : extraArgs.orderBy
      }
    };
    return this.queryIndexer(graphqlQuery);
  }
  /**
   * Queries all tokens of a specific collection that an account owns by the collection address
   *
   * @param ownerAddress owner address that owns the tokens
   * @param collectionAddress the collection address
   * @returns GetTokenOwnedFromCollectionQuery response type
   */
  async getTokenOwnedFromCollectionAddress(ownerAddress, collectionAddress, extraArgs) {
    var _a, _b;
    const ownerHexAddress = HexString.ensure(ownerAddress).hex();
    _IndexerClient.validateAddress(ownerHexAddress);
    const collectionHexAddress = HexString.ensure(collectionAddress).hex();
    _IndexerClient.validateAddress(collectionHexAddress);
    const whereCondition = {
      owner_address: {
        _eq: ownerHexAddress
      },
      current_token_data: {
        collection_id: {
          _eq: collectionHexAddress
        }
      },
      amount: {
        _gt: 0
      }
    };
    if (extraArgs == null ? void 0 : extraArgs.tokenStandard) {
      whereCondition.token_standard = {
        _eq: extraArgs == null ? void 0 : extraArgs.tokenStandard
      };
    }
    const graphqlQuery = {
      query: GetTokenOwnedFromCollection,
      variables: {
        where_condition: whereCondition,
        offset: (_a = extraArgs == null ? void 0 : extraArgs.options) == null ? void 0 : _a.offset,
        limit: (_b = extraArgs == null ? void 0 : extraArgs.options) == null ? void 0 : _b.limit,
        order_by: extraArgs == null ? void 0 : extraArgs.orderBy
      }
    };
    return this.queryIndexer(graphqlQuery);
  }
  /**
   * Queries all tokens of a specific collection that an account owns by the collection name and collection
   * creator address
   *
   * @param ownerAddress owner address that owns the tokens
   * @param collectionName the collection name
   * @param creatorAddress the collection creator address
   * @returns GetTokenOwnedFromCollectionQuery response type
   */
  async getTokenOwnedFromCollectionNameAndCreatorAddress(ownerAddress, collectionName, creatorAddress, extraArgs) {
    const collectionAddress = await this.getCollectionAddress(creatorAddress, collectionName, extraArgs);
    const tokens = await this.getTokenOwnedFromCollectionAddress(ownerAddress, collectionAddress, extraArgs);
    return tokens;
  }
  /**
   * Queries data of a specific collection by the collection creator address and the collection name.
   *
   * if, for some reason, a creator account has 2 collections with the same name in v1 and v2,
   * can pass an optional `tokenStandard` parameter to query a specific standard
   *
   * @param creatorAddress the collection creator address
   * @param collectionName the collection name
   * @returns GetCollectionDataQuery response type
   */
  async getCollectionData(creatorAddress, collectionName, extraArgs) {
    var _a, _b;
    const address = HexString.ensure(creatorAddress).hex();
    _IndexerClient.validateAddress(address);
    const whereCondition = {
      collection_name: {
        _eq: collectionName
      },
      creator_address: {
        _eq: address
      }
    };
    if (extraArgs == null ? void 0 : extraArgs.tokenStandard) {
      whereCondition.token_standard = {
        _eq: extraArgs == null ? void 0 : extraArgs.tokenStandard
      };
    }
    const graphqlQuery = {
      query: GetCollectionData,
      variables: {
        where_condition: whereCondition,
        offset: (_a = extraArgs == null ? void 0 : extraArgs.options) == null ? void 0 : _a.offset,
        limit: (_b = extraArgs == null ? void 0 : extraArgs.options) == null ? void 0 : _b.limit,
        order_by: extraArgs == null ? void 0 : extraArgs.orderBy
      }
    };
    return this.queryIndexer(graphqlQuery);
  }
  /**
   * Queries a collection address.
   *
   * @param creatorAddress the collection creator address
   * @param collectionName the collection name
   * @returns the collection address
   */
  async getCollectionAddress(creatorAddress, collectionName, extraArgs) {
    return (await this.getCollectionData(creatorAddress, collectionName, extraArgs)).current_collections_v2[0].collection_id;
  }
  /**
   * Queries for all collections that an account has tokens for.
   *
   * @param ownerAddress the account address that owns the tokens
   * @returns GetCollectionsWithOwnedTokensQuery response type
   */
  async getCollectionsWithOwnedTokens(ownerAddress, extraArgs) {
    var _a, _b;
    const ownerHexAddress = HexString.ensure(ownerAddress).hex();
    _IndexerClient.validateAddress(ownerHexAddress);
    const whereCondition = {
      owner_address: {
        _eq: ownerHexAddress
      }
    };
    if (extraArgs == null ? void 0 : extraArgs.tokenStandard) {
      whereCondition.current_collection = {
        token_standard: {
          _eq: extraArgs == null ? void 0 : extraArgs.tokenStandard
        }
      };
    }
    const graphqlQuery = {
      query: GetCollectionsWithOwnedTokens,
      variables: {
        where_condition: whereCondition,
        offset: (_a = extraArgs == null ? void 0 : extraArgs.options) == null ? void 0 : _a.offset,
        limit: (_b = extraArgs == null ? void 0 : extraArgs.options) == null ? void 0 : _b.limit,
        order_by: extraArgs == null ? void 0 : extraArgs.orderBy
      }
    };
    return this.queryIndexer(graphqlQuery);
  }
  // TRANSACTIONS //
  /**
   * Gets the count of transactions submitted by an account
   *
   * @param address Account address
   * @returns GetAccountTransactionsCountQuery response type
   */
  async getAccountTransactionsCount(accountAddress) {
    const address = HexString.ensure(accountAddress).hex();
    _IndexerClient.validateAddress(address);
    const graphqlQuery = {
      query: GetAccountTransactionsCount,
      variables: {
        address
      }
    };
    return this.queryIndexer(graphqlQuery);
  }
  /**
   * Queries an account transactions data
   *
   * @param address Account address
   * @returns GetAccountTransactionsDataQuery response type
   */
  async getAccountTransactionsData(accountAddress, extraArgs) {
    var _a, _b;
    const address = HexString.ensure(accountAddress).hex();
    _IndexerClient.validateAddress(address);
    const whereCondition = {
      account_address: {
        _eq: address
      }
    };
    const graphqlQuery = {
      query: GetAccountTransactionsData,
      variables: {
        where_condition: whereCondition,
        offset: (_a = extraArgs == null ? void 0 : extraArgs.options) == null ? void 0 : _a.offset,
        limit: (_b = extraArgs == null ? void 0 : extraArgs.options) == null ? void 0 : _b.limit,
        order_by: extraArgs == null ? void 0 : extraArgs.orderBy
      }
    };
    return this.queryIndexer(graphqlQuery);
  }
  /**
   * Queries top user transactions
   *
   * @param limit
   * @returns GetTopUserTransactionsQuery response type
   */
  async getTopUserTransactions(limit) {
    const graphqlQuery = {
      query: GetTopUserTransactions,
      variables: {
        limit
      }
    };
    return this.queryIndexer(graphqlQuery);
  }
  /**
   * Queries top user transactions
   *
   * @param startVersion optional - can be set to tell indexer what version to start from
   * @returns GetUserTransactionsQuery response type
   */
  async getUserTransactions(extraArgs) {
    var _a, _b;
    const whereCondition = {
      version: {
        _lte: extraArgs == null ? void 0 : extraArgs.startVersion
      }
    };
    const graphqlQuery = {
      query: GetUserTransactions,
      variables: {
        where_condition: whereCondition,
        offset: (_a = extraArgs == null ? void 0 : extraArgs.options) == null ? void 0 : _a.offset,
        limit: (_b = extraArgs == null ? void 0 : extraArgs.options) == null ? void 0 : _b.limit,
        order_by: extraArgs == null ? void 0 : extraArgs.orderBy
      }
    };
    return this.queryIndexer(graphqlQuery);
  }
  // STAKING //
  /**
   * Queries delegated staking activities
   *
   * @param delegatorAddress Delegator address
   * @param poolAddress Pool address
   * @returns GetDelegatedStakingActivitiesQuery response type
   */
  async getDelegatedStakingActivities(delegatorAddress, poolAddress) {
    const delegator = HexString.ensure(delegatorAddress).hex();
    const pool = HexString.ensure(poolAddress).hex();
    _IndexerClient.validateAddress(delegator);
    _IndexerClient.validateAddress(pool);
    const graphqlQuery = {
      query: GetDelegatedStakingActivities,
      variables: {
        delegatorAddress: delegator,
        poolAddress: pool
      }
    };
    return this.queryIndexer(graphqlQuery);
  }
  /**
   * Queries current number of delegators in a pool
   *
   * @returns GetNumberOfDelegatorsQuery response type
   */
  async getNumberOfDelegators(poolAddress) {
    const address = HexString.ensure(poolAddress).hex();
    _IndexerClient.validateAddress(address);
    const graphqlQuery = {
      query: GetNumberOfDelegators,
      variables: {
        poolAddress: address
      }
    };
    return this.queryIndexer(graphqlQuery);
  }
  // ACCOUNT //
  /**
   * Queries an account coin data
   *
   * @param ownerAddress Owner address
   * @returns GetAccountCoinsDataQuery response type
   */
  async getAccountCoinsData(ownerAddress, extraArgs) {
    var _a, _b;
    const address = HexString.ensure(ownerAddress).hex();
    _IndexerClient.validateAddress(address);
    const whereCondition = {
      owner_address: {
        _eq: address
      }
    };
    const graphqlQuery = {
      query: GetAccountCoinsData,
      variables: {
        where_condition: whereCondition,
        offset: (_a = extraArgs == null ? void 0 : extraArgs.options) == null ? void 0 : _a.offset,
        limit: (_b = extraArgs == null ? void 0 : extraArgs.options) == null ? void 0 : _b.limit,
        order_by: extraArgs == null ? void 0 : extraArgs.orderBy
      }
    };
    return this.queryIndexer(graphqlQuery);
  }
  /**
   * Queries an account coin data count
   *
   * @param ownerAddress Owner address
   * @returns GetAccountCoinsDataCountQuery response type
   */
  async getAccountCoinsDataCount(ownerAddress) {
    const address = HexString.ensure(ownerAddress).hex();
    _IndexerClient.validateAddress(address);
    const graphqlQuery = {
      query: GetAccountCoinsDataCount,
      variables: {
        address
      }
    };
    return this.queryIndexer(graphqlQuery);
  }
  /**
   * Queries an account owned objects
   *
   * @param ownerAddress Owner address
   * @returns GetCurrentObjectsQuery response type
   */
  async getAccountOwnedObjects(ownerAddress, extraArgs) {
    var _a, _b;
    const address = HexString.ensure(ownerAddress).hex();
    _IndexerClient.validateAddress(address);
    const whereCondition = {
      owner_address: {
        _eq: address
      }
    };
    const graphqlQuery = {
      query: GetCurrentObjects,
      variables: {
        where_condition: whereCondition,
        offset: (_a = extraArgs == null ? void 0 : extraArgs.options) == null ? void 0 : _a.offset,
        limit: (_b = extraArgs == null ? void 0 : extraArgs.options) == null ? void 0 : _b.limit,
        order_by: extraArgs == null ? void 0 : extraArgs.orderBy
      }
    };
    return this.queryIndexer(graphqlQuery);
  }
};

// src/providers/provider.ts
var Provider = class {
  constructor(network, config, doNotFixNodeUrl = false) {
    let fullNodeUrl = null;
    let indexerUrl = null;
    if (typeof network === "object" && isCustomEndpoints(network)) {
      fullNodeUrl = network.fullnodeUrl;
      indexerUrl = network.indexerUrl;
      this.network = "CUSTOM";
    } else {
      fullNodeUrl = NetworkToNodeAPI[network];
      indexerUrl = NetworkToIndexerAPI[network];
      this.network = network;
    }
    if (this.network === "CUSTOM" && !fullNodeUrl) {
      throw new Error("fullnode url is not provided");
    }
    if (indexerUrl) {
      this.indexerClient = new IndexerClient(indexerUrl, config);
    }
    this.aptosClient = new AptosClient(fullNodeUrl, config, doNotFixNodeUrl);
  }
};
exports.Provider = Provider;
function applyMixin(targetClass, baseClass, baseClassProp) {
  Object.getOwnPropertyNames(baseClass.prototype).forEach(propertyName => {
    const propertyDescriptor = Object.getOwnPropertyDescriptor(baseClass.prototype, propertyName);
    if (!propertyDescriptor) return;
    propertyDescriptor.value = function (...args) {
      return this[baseClassProp][propertyName](...args);
    };
    Object.defineProperty(targetClass.prototype, propertyName, propertyDescriptor);
  });
  Object.getOwnPropertyNames(baseClass).forEach(propertyName => {
    const propertyDescriptor = Object.getOwnPropertyDescriptor(baseClass, propertyName);
    if (!propertyDescriptor) return;
    propertyDescriptor.value = function (...args) {
      return this[baseClassProp][propertyName](...args);
    };
    if (targetClass.hasOwnProperty.call(targetClass, propertyName)) {
      return;
    }
    Object.defineProperty(targetClass, propertyName, propertyDescriptor);
  });
}
applyMixin(Provider, AptosClient, "aptosClient");
applyMixin(Provider, IndexerClient, "indexerClient");
function isCustomEndpoints(network) {
  return network.fullnodeUrl !== void 0 && typeof network.fullnodeUrl === "string";
}

// src/utils/property_map_serde.ts
var PropertyValue = class {
  constructor(type, value) {
    this.type = type;
    this.value = value;
  }
};
exports.PropertyValue = PropertyValue;
var PropertyMap = class {
  constructor() {
    this.data = {};
  }
  setProperty(key, value) {
    this.data[key] = value;
  }
};
exports.PropertyMap = PropertyMap;
function getPropertyType(typ) {
  let typeTag;
  if (typ === "string" || typ === "String") {
    typeTag = new TypeTagStruct(stringStructTag);
  } else {
    typeTag = new TypeTagParser(typ).parseTypeTag();
  }
  return typeTag;
}
function getPropertyValueRaw(values, types) {
  if (values.length !== types.length) {
    throw new Error("Length of property values and types not match");
  }
  const results = new Array();
  types.forEach((typ, index) => {
    try {
      const typeTag = getPropertyType(typ);
      const serializer = new Serializer();
      serializeArg(values[index], typeTag, serializer);
      results.push(serializer.getBytes());
    } catch (error) {
      results.push(new TextEncoder().encode(values[index]));
    }
  });
  return results;
}
function getSinglePropertyValueRaw(value, type) {
  if (!value || !type) {
    throw new Error("value or type can not be empty");
  }
  try {
    const typeTag = getPropertyType(type);
    const serializer = new Serializer();
    serializeArg(value, typeTag, serializer);
    return serializer.getBytes();
  } catch (error) {
    return new TextEncoder().encode(value);
  }
}
function deserializePropertyMap(rawPropertyMap) {
  const entries = rawPropertyMap.map.data;
  const pm = new PropertyMap();
  entries.forEach(prop => {
    const {
      key
    } = prop;
    const val = prop.value.value;
    const typ = prop.value.type;
    const typeTag = getPropertyType(typ);
    const newValue = deserializeValueBasedOnTypeTag(typeTag, val);
    const pv = new PropertyValue(typ, newValue);
    pm.setProperty(key, pv);
  });
  return pm;
}
function deserializeValueBasedOnTypeTag(tag, val) {
  const de = new Deserializer(new HexString(val).toUint8Array());
  let res = "";
  if (tag instanceof TypeTagU8) {
    res = de.deserializeU8().toString();
  } else if (tag instanceof TypeTagU64) {
    res = de.deserializeU64().toString();
  } else if (tag instanceof TypeTagU128) {
    res = de.deserializeU128().toString();
  } else if (tag instanceof TypeTagBool) {
    res = de.deserializeBool() ? "true" : "false";
  } else if (tag instanceof TypeTagAddress) {
    res = HexString.fromUint8Array(de.deserializeFixedBytes(32)).hex();
  } else if (tag instanceof TypeTagStruct && tag.isStringTypeTag()) {
    res = de.deserializeStr();
  } else {
    res = val;
  }
  return res;
}

// src/aptos_types/token_types.ts
var token_types_exports = exports.TokenTypes = {};
__export(token_types_exports, {
  PropertyMap: () => PropertyMap,
  PropertyValue: () => PropertyValue,
  Token: () => Token,
  TokenData: () => TokenData
});
var TokenData = class {
  constructor(collection, description, name, maximum, supply, uri, default_properties, mutability_config) {
    this.collection = collection;
    this.description = description;
    this.name = name;
    this.maximum = maximum;
    this.supply = supply;
    this.uri = uri;
    this.default_properties = deserializePropertyMap(default_properties);
    this.mutability_config = mutability_config;
  }
};
var Token = class {
  constructor(id, amount, token_properties) {
    this.id = id;
    this.amount = amount;
    this.token_properties = deserializePropertyMap(token_properties);
  }
};

// src/plugins/token_client.ts
var TokenClient = class {
  /**
   * Creates new TokenClient instance
   *
   * @param aptosClient AptosClient instance
   */
  constructor(aptosClient2) {
    this.aptosClient = aptosClient2;
  }
  /**
   * Creates a new NFT collection within the specified account
   *
   * @param account AptosAccount where collection will be created
   * @param name Collection name
   * @param description Collection description
   * @param uri URL to additional info about collection
   * @param maxAmount Maximum number of `token_data` allowed within this collection
   * @returns The hash of the transaction submitted to the API
   */
  // :!:>createCollection
  async createCollection(account, name, description, uri, maxAmount = MAX_U64_BIG_INT, extraArgs) {
    const builder = new TransactionBuilderRemoteABI(this.aptosClient, {
      sender: account.address(),
      ...extraArgs
    });
    const rawTxn = await builder.build("0x3::token::create_collection_script", [], [name, description, uri, maxAmount, [false, false, false]]);
    const bcsTxn = AptosClient.generateBCSTransaction(account, rawTxn);
    const pendingTransaction = await this.aptosClient.submitSignedBCSTransaction(bcsTxn);
    return pendingTransaction.hash;
  }
  /**
   * Creates a new NFT within the specified account
   *
   * @param account AptosAccount where token will be created
   * @param collectionName Name of collection, that token belongs to
   * @param name Token name
   * @param description Token description
   * @param supply Token supply
   * @param uri URL to additional info about token
   * @param max The maxium of tokens can be minted from this token
   * @param royalty_payee_address the address to receive the royalty, the address can be a shared account address.
   * @param royalty_points_denominator the denominator for calculating royalty
   * @param royalty_points_numerator the numerator for calculating royalty
   * @param property_keys the property keys for storing on-chain properties
   * @param property_values the property values to be stored on-chain
   * @param property_types the type of property values
   * @returns The hash of the transaction submitted to the API
   */
  // :!:>createToken
  async createToken(account, collectionName, name, description, supply, uri, max = MAX_U64_BIG_INT, royalty_payee_address = account.address(), royalty_points_denominator = 0, royalty_points_numerator = 0, property_keys = [], property_values = [], property_types = [], extraArgs) {
    const builder = new TransactionBuilderRemoteABI(this.aptosClient, {
      sender: account.address(),
      ...extraArgs
    });
    const rawTxn = await builder.build("0x3::token::create_token_script", [], [collectionName, name, description, supply, max, uri, royalty_payee_address, royalty_points_denominator, royalty_points_numerator, [false, false, false, false, false], property_keys, getPropertyValueRaw(property_values, property_types), property_types]);
    const bcsTxn = AptosClient.generateBCSTransaction(account, rawTxn);
    const pendingTransaction = await this.aptosClient.submitSignedBCSTransaction(bcsTxn);
    return pendingTransaction.hash;
  }
  /**
   * Creates a new NFT within the specified account
   *
   * @param account AptosAccount where token will be created
   * @param collectionName Name of collection, that token belongs to
   * @param name Token name
   * @param description Token description
   * @param supply Token supply
   * @param uri URL to additional info about token
   * @param max The maxium of tokens can be minted from this token
   * @param royalty_payee_address the address to receive the royalty, the address can be a shared account address.
   * @param royalty_points_denominator the denominator for calculating royalty
   * @param royalty_points_numerator the numerator for calculating royalty
   * @param property_keys the property keys for storing on-chain properties
   * @param property_values the property values to be stored on-chain
   * @param property_types the type of property values
   * @param mutability_config configs which field is mutable
   * @returns The hash of the transaction submitted to the API
   */
  // :!:>createToken
  async createTokenWithMutabilityConfig(account, collectionName, name, description, supply, uri, max = MAX_U64_BIG_INT, royalty_payee_address = account.address(), royalty_points_denominator = 0, royalty_points_numerator = 0, property_keys = [], property_values = [], property_types = [], mutability_config = [false, false, false, false, false], extraArgs) {
    const builder = new TransactionBuilderRemoteABI(this.aptosClient, {
      sender: account.address(),
      ...extraArgs
    });
    const rawTxn = await builder.build("0x3::token::create_token_script", [], [collectionName, name, description, supply, max, uri, royalty_payee_address, royalty_points_denominator, royalty_points_numerator, mutability_config, property_keys, property_values, property_types]);
    const bcsTxn = AptosClient.generateBCSTransaction(account, rawTxn);
    const pendingTransaction = await this.aptosClient.submitSignedBCSTransaction(bcsTxn);
    return pendingTransaction.hash;
  }
  /**
   * Transfers specified amount of tokens from account to receiver
   *
   * @param account AptosAccount where token from which tokens will be transfered
   * @param receiver  Hex-encoded 32 byte Aptos account address to which tokens will be transfered
   * @param creator Hex-encoded 32 byte Aptos account address to which created tokens
   * @param collectionName Name of collection where token is stored
   * @param name Token name
   * @param amount Amount of tokens which will be transfered
   * @param property_version the version of token PropertyMap with a default value 0.
   * @returns The hash of the transaction submitted to the API
   */
  async offerToken(account, receiver, creator, collectionName, name, amount, property_version = 0, extraArgs) {
    const builder = new TransactionBuilderRemoteABI(this.aptosClient, {
      sender: account.address(),
      ...extraArgs
    });
    const rawTxn = await builder.build("0x3::token_transfers::offer_script", [], [receiver, creator, collectionName, name, property_version, amount]);
    const bcsTxn = AptosClient.generateBCSTransaction(account, rawTxn);
    const pendingTransaction = await this.aptosClient.submitSignedBCSTransaction(bcsTxn);
    return pendingTransaction.hash;
  }
  /**
   * Claims a token on specified account
   *
   * @param account AptosAccount which will claim token
   * @param sender Hex-encoded 32 byte Aptos account address which holds a token
   * @param creator Hex-encoded 32 byte Aptos account address which created a token
   * @param collectionName Name of collection where token is stored
   * @param name Token name
   * @param property_version the version of token PropertyMap with a default value 0.
   * @returns The hash of the transaction submitted to the API
   */
  async claimToken(account, sender, creator, collectionName, name, property_version = 0, extraArgs) {
    const builder = new TransactionBuilderRemoteABI(this.aptosClient, {
      sender: account.address(),
      ...extraArgs
    });
    const rawTxn = await builder.build("0x3::token_transfers::claim_script", [], [sender, creator, collectionName, name, property_version]);
    const bcsTxn = AptosClient.generateBCSTransaction(account, rawTxn);
    const pendingTransaction = await this.aptosClient.submitSignedBCSTransaction(bcsTxn);
    return pendingTransaction.hash;
  }
  /**
   * Removes a token from pending claims list
   *
   * @param account AptosAccount which will remove token from pending list
   * @param receiver Hex-encoded 32 byte Aptos account address which had to claim token
   * @param creator Hex-encoded 32 byte Aptos account address which created a token
   * @param collectionName Name of collection where token is strored
   * @param name Token name
   * @param property_version the version of token PropertyMap with a default value 0.
   * @returns The hash of the transaction submitted to the API
   */
  async cancelTokenOffer(account, receiver, creator, collectionName, name, property_version = 0, extraArgs) {
    const builder = new TransactionBuilderRemoteABI(this.aptosClient, {
      sender: account.address(),
      ...extraArgs
    });
    const rawTxn = await builder.build("0x3::token_transfers::cancel_offer_script", [], [receiver, creator, collectionName, name, property_version]);
    const bcsTxn = AptosClient.generateBCSTransaction(account, rawTxn);
    const pendingTransaction = await this.aptosClient.submitSignedBCSTransaction(bcsTxn);
    return pendingTransaction.hash;
  }
  /**
   * Directly transfer the specified amount of tokens from account to receiver
   * using a single multi signature transaction.
   *
   * @param sender AptosAccount where token from which tokens will be transferred
   * @param receiver Hex-encoded 32 byte Aptos account address to which tokens will be transferred
   * @param creator Hex-encoded 32 byte Aptos account address to which created tokens
   * @param collectionName Name of collection where token is stored
   * @param name Token name
   * @param amount Amount of tokens which will be transferred
   * @param property_version the version of token PropertyMap with a default value 0.
   * @returns The hash of the transaction submitted to the API
   */
  async directTransferToken(sender, receiver, creator, collectionName, name, amount, propertyVersion = 0, extraArgs) {
    const builder = new TransactionBuilderRemoteABI(this.aptosClient, {
      sender: sender.address(),
      ...extraArgs
    });
    const rawTxn = await builder.build("0x3::token::direct_transfer_script", [], [creator, collectionName, name, propertyVersion, amount]);
    const multiAgentTxn = new aptos_types_exports.MultiAgentRawTransaction(rawTxn, [aptos_types_exports.AccountAddress.fromHex(receiver.address())]);
    const senderSignature = new aptos_types_exports.Ed25519Signature(sender.signBuffer(TransactionBuilder.getSigningMessage(multiAgentTxn)).toUint8Array());
    const senderAuthenticator = new aptos_types_exports.AccountAuthenticatorEd25519(new aptos_types_exports.Ed25519PublicKey(sender.signingKey.publicKey), senderSignature);
    const receiverSignature = new aptos_types_exports.Ed25519Signature(receiver.signBuffer(TransactionBuilder.getSigningMessage(multiAgentTxn)).toUint8Array());
    const receiverAuthenticator = new aptos_types_exports.AccountAuthenticatorEd25519(new aptos_types_exports.Ed25519PublicKey(receiver.signingKey.publicKey), receiverSignature);
    const multiAgentAuthenticator = new aptos_types_exports.TransactionAuthenticatorMultiAgent(senderAuthenticator, [aptos_types_exports.AccountAddress.fromHex(receiver.address())],
    // Secondary signer addresses
    [receiverAuthenticator]
    // Secondary signer authenticators
    );
    const bcsTxn = bcsToBytes(new aptos_types_exports.SignedTransaction(rawTxn, multiAgentAuthenticator));
    const transactionRes = await this.aptosClient.submitSignedBCSTransaction(bcsTxn);
    return transactionRes.hash;
  }
  /**
   * Directly transfer the specified amount of tokens from account to receiver
   * using a single multi signature transaction.
   *
   * @param sender AptosAccount where token from which tokens will be transferred
   * @param receiver Hex-encoded 32 byte Aptos account address to which tokens will be transferred
   * @param creator Hex-encoded 32 byte Aptos account address to which created tokens
   * @param collectionName Name of collection where token is stored
   * @param name Token name
   * @param amount Amount of tokens which will be transferred
   * @param fee_payer AptosAccount which will pay fee for transaction
   * @param property_version the version of token PropertyMap with a default value 0.
   * @returns The hash of the transaction submitted to the API
   */
  async directTransferTokenWithFeePayer(sender, receiver, creator, collectionName, name, amount, fee_payer, propertyVersion = 0, extraArgs) {
    const builder = new TransactionBuilderRemoteABI(this.aptosClient, {
      sender: sender.address(),
      ...extraArgs
    });
    const rawTxn = await builder.build("0x3::token::direct_transfer_script", [], [creator, collectionName, name, propertyVersion, amount]);
    const feePayerTxn = new aptos_types_exports.FeePayerRawTransaction(rawTxn, [aptos_types_exports.AccountAddress.fromHex(receiver.address())], aptos_types_exports.AccountAddress.fromHex(fee_payer.address()));
    const senderSignature = new aptos_types_exports.Ed25519Signature(sender.signBuffer(TransactionBuilder.getSigningMessage(feePayerTxn)).toUint8Array());
    const senderAuthenticator = new aptos_types_exports.AccountAuthenticatorEd25519(new aptos_types_exports.Ed25519PublicKey(sender.signingKey.publicKey), senderSignature);
    const receiverSignature = new aptos_types_exports.Ed25519Signature(receiver.signBuffer(TransactionBuilder.getSigningMessage(feePayerTxn)).toUint8Array());
    const receiverAuthenticator = new aptos_types_exports.AccountAuthenticatorEd25519(new aptos_types_exports.Ed25519PublicKey(receiver.signingKey.publicKey), receiverSignature);
    const feePayerSignature = new aptos_types_exports.Ed25519Signature(fee_payer.signBuffer(TransactionBuilder.getSigningMessage(feePayerTxn)).toUint8Array());
    const feePayerAuthenticator = new aptos_types_exports.AccountAuthenticatorEd25519(new aptos_types_exports.Ed25519PublicKey(fee_payer.signingKey.publicKey), feePayerSignature);
    const txAuthenticatorFeePayer = new aptos_types_exports.TransactionAuthenticatorFeePayer(senderAuthenticator, [aptos_types_exports.AccountAddress.fromHex(receiver.address())], [receiverAuthenticator], {
      address: aptos_types_exports.AccountAddress.fromHex(fee_payer.address()),
      authenticator: feePayerAuthenticator
    });
    const bcsTxn = bcsToBytes(new aptos_types_exports.SignedTransaction(rawTxn, txAuthenticatorFeePayer));
    const transactionRes = await this.aptosClient.submitSignedBCSTransaction(bcsTxn);
    return transactionRes.hash;
  }
  /**
   * User opt-in or out direct transfer through a boolean flag
   *
   * @param sender AptosAccount where the token will be transferred
   * @param optIn boolean value indicates user want to opt-in or out of direct transfer
   * @returns The hash of the transaction submitted to the API
   */
  async optInTokenTransfer(sender, optIn, extraArgs) {
    const builder = new TransactionBuilderRemoteABI(this.aptosClient, {
      sender: sender.address(),
      ...extraArgs
    });
    const rawTxn = await builder.build("0x3::token::opt_in_direct_transfer", [], [optIn]);
    const bcsTxn = AptosClient.generateBCSTransaction(sender, rawTxn);
    const pendingTransaction = await this.aptosClient.submitSignedBCSTransaction(bcsTxn);
    return pendingTransaction.hash;
  }
  /**
   * Directly transfer token to a receiver. The receiver should have opted in to direct transfer
   *
   * @param sender AptosAccount where the token will be transferred
   * @param creator  address of the token creator
   * @param collectionName Name of collection where token is stored
   * @param name Token name
   * @param property_version the version of token PropertyMap
   * @param amount Amount of tokens which will be transfered
   * @returns The hash of the transaction submitted to the API
   */
  async transferWithOptIn(sender, creator, collectionName, tokenName, propertyVersion, receiver, amount, extraArgs) {
    const builder = new TransactionBuilderRemoteABI(this.aptosClient, {
      sender: sender.address(),
      ...extraArgs
    });
    const rawTxn = await builder.build("0x3::token::transfer_with_opt_in", [], [creator, collectionName, tokenName, propertyVersion, receiver, amount]);
    const bcsTxn = AptosClient.generateBCSTransaction(sender, rawTxn);
    const pendingTransaction = await this.aptosClient.submitSignedBCSTransaction(bcsTxn);
    return pendingTransaction.hash;
  }
  /**
   * BurnToken by Creator
   *
   * @param creator creator of the token
   * @param ownerAddress address of the token owner
   * @param collectionName Name of collection where token is stored
   * @param name Token name
   * @param amount Amount of tokens which will be transfered
   * @param property_version the version of token PropertyMap
   * @returns The hash of the transaction submitted to the API
   */
  async burnByCreator(creator, ownerAddress, collection, name, PropertyVersion, amount, extraArgs) {
    const builder = new TransactionBuilderRemoteABI(this.aptosClient, {
      sender: creator.address(),
      ...extraArgs
    });
    const rawTxn = await builder.build("0x3::token::burn_by_creator", [], [ownerAddress, collection, name, PropertyVersion, amount]);
    const bcsTxn = AptosClient.generateBCSTransaction(creator, rawTxn);
    const pendingTransaction = await this.aptosClient.submitSignedBCSTransaction(bcsTxn);
    return pendingTransaction.hash;
  }
  /**
   * BurnToken by Owner
   *
   * @param owner creator of the token
   * @param creatorAddress address of the token creator
   * @param collectionName Name of collection where token is stored
   * @param name Token name
   * @param amount Amount of tokens which will be transfered
   * @param property_version the version of token PropertyMap
   * @returns The hash of the transaction submitted to the API
   */
  async burnByOwner(owner, creatorAddress, collection, name, PropertyVersion, amount, extraArgs) {
    const builder = new TransactionBuilderRemoteABI(this.aptosClient, {
      sender: owner.address(),
      ...extraArgs
    });
    const rawTxn = await builder.build("0x3::token::burn", [], [creatorAddress, collection, name, PropertyVersion, amount]);
    const bcsTxn = AptosClient.generateBCSTransaction(owner, rawTxn);
    const pendingTransaction = await this.aptosClient.submitSignedBCSTransaction(bcsTxn);
    return pendingTransaction.hash;
  }
  /**
   * creator mutates the properties of the tokens
   *
   * @param account AptosAccount who modifies the token properties
   * @param tokenOwner the address of account owning the token
   * @param creator the creator of the token
   * @param collection_name the name of the token collection
   * @param tokenName the name of created token
   * @param propertyVersion the property_version of the token to be modified
   * @param amount the number of tokens to be modified
   *
   * @returns The hash of the transaction submitted to the API
   */
  async mutateTokenProperties(account, tokenOwner, creator, collection_name, tokenName, propertyVersion, amount, keys, values, types, extraArgs) {
    const builder = new TransactionBuilderRemoteABI(this.aptosClient, {
      sender: account.address(),
      ...extraArgs
    });
    const rawTxn = await builder.build("0x3::token::mutate_token_properties", [], [tokenOwner, creator, collection_name, tokenName, propertyVersion, amount, keys, values, types]);
    const bcsTxn = AptosClient.generateBCSTransaction(account, rawTxn);
    const pendingTransaction = await this.aptosClient.submitSignedBCSTransaction(bcsTxn);
    return pendingTransaction.hash;
  }
  /**
   * Queries collection data
   * @param creator Hex-encoded 32 byte Aptos account address which created a collection
   * @param collectionName Collection name
   * @returns Collection data in below format
   * ```
   *  Collection {
   *    // Describes the collection
   *    description: string,
   *    // Unique name within this creators account for this collection
   *    name: string,
   *    // URL for additional information/media
   *    uri: string,
   *    // Total number of distinct Tokens tracked by the collection
   *    count: number,
   *    // Optional maximum number of tokens allowed within this collections
   *    maximum: number
   *  }
   * ```
   */
  async getCollectionData(creator, collectionName) {
    const resources = await this.aptosClient.getAccountResources(creator);
    const accountResource = resources.find(r => r.type === "0x3::token::Collections");
    const {
      handle
    } = accountResource.data.collection_data;
    const getCollectionTableItemRequest = {
      key_type: "0x1::string::String",
      value_type: "0x3::token::CollectionData",
      key: collectionName
    };
    const collectionTable = await this.aptosClient.getTableItem(handle, getCollectionTableItemRequest);
    return collectionTable;
  }
  /**
   * Queries token data from collection
   *
   * @param creator Hex-encoded 32 byte Aptos account address which created a token
   * @param collectionName Name of collection, which holds a token
   * @param tokenName Token name
   * @returns Token data in below format
   * ```
   * TokenData {
   *     // Unique name within this creators account for this Token's collection
   *     collection: string;
   *     // Describes this Token
   *     description: string;
   *     // The name of this Token
   *     name: string;
   *     // Optional maximum number of this type of Token.
   *     maximum: number;
   *     // Total number of this type of Token
   *     supply: number;
   *     /// URL for additional information / media
   *     uri: string;
   *   }
   * ```
   */
  // :!:>getTokenData
  async getTokenData(creator, collectionName, tokenName) {
    const creatorHex = creator instanceof HexString ? creator.hex() : creator;
    const collection = await this.aptosClient.getAccountResource(creatorHex, "0x3::token::Collections");
    const {
      handle
    } = collection.data.token_data;
    const tokenDataId = {
      creator: creatorHex,
      collection: collectionName,
      name: tokenName
    };
    const getTokenTableItemRequest = {
      key_type: "0x3::token::TokenDataId",
      value_type: "0x3::token::TokenData",
      key: tokenDataId
    };
    const rawTokenData = await this.aptosClient.getTableItem(handle, getTokenTableItemRequest);
    return new TokenData(rawTokenData.collection, rawTokenData.description, rawTokenData.name, rawTokenData.maximum, rawTokenData.supply, rawTokenData.uri, rawTokenData.default_properties, rawTokenData.mutability_config);
  }
  // <:!:getTokenData
  /**
   * Queries token balance for the token creator
   */
  async getToken(creator, collectionName, tokenName, property_version = "0") {
    const tokenDataId = {
      creator: creator instanceof HexString ? creator.hex() : creator,
      collection: collectionName,
      name: tokenName
    };
    return this.getTokenForAccount(creator, {
      token_data_id: tokenDataId,
      property_version
    });
  }
  /**
   * Queries token balance for a token account
   * @param account Hex-encoded 32 byte Aptos account address which created a token
   * @param tokenId token id
   *
   * TODO: Update this:
   * @example
   * ```
   * {
   *   creator: '0x1',
   *   collection: 'Some collection',
   *   name: 'Awesome token'
   * }
   * ```
   * @returns Token object in below format
   * ```
   * Token {
   *   id: TokenId;
   *   value: number;
   * }
   * ```
   */
  async getTokenForAccount(account, tokenId) {
    const tokenStore = await this.aptosClient.getAccountResource(account instanceof HexString ? account.hex() : account, "0x3::token::TokenStore");
    const {
      handle
    } = tokenStore.data.tokens;
    const getTokenTableItemRequest = {
      key_type: "0x3::token::TokenId",
      value_type: "0x3::token::Token",
      key: tokenId
    };
    try {
      const rawToken = await this.aptosClient.getTableItem(handle, getTokenTableItemRequest);
      return new Token(rawToken.id, rawToken.amount, rawToken.token_properties);
    } catch (error) {
      if ((error == null ? void 0 : error.status) === 404) {
        return {
          id: tokenId,
          amount: "0",
          token_properties: new PropertyMap()
        };
      }
      return error;
    }
  }
};

// src/plugins/fungible_asset_client.ts
exports.TokenClient = TokenClient;
var FungibleAssetClient = class {
  /**
   * Creates new FungibleAssetClient instance
   *
   * @param provider Provider instance
   */
  constructor(provider) {
    this.assetType = "0x1::fungible_asset::Metadata";
    this.provider = provider;
  }
  /**
   *  Transfer `amount` of fungible asset from sender's primary store to recipient's primary store.
   *
   * Use this method to transfer any fungible asset including fungible token.
   *
   * @param sender The sender account
   * @param fungibleAssetMetadataAddress The fungible asset address.
   * For example if you’re transferring USDT this would be the USDT address
   * @param recipient Recipient address
   * @param amount Number of assets to transfer
   * @returns The hash of the transaction submitted to the API
   */
  async transfer(sender, fungibleAssetMetadataAddress, recipient, amount, extraArgs) {
    const rawTransaction = await this.generateTransfer(sender, fungibleAssetMetadataAddress, recipient, amount, extraArgs);
    const txnHash = await this.provider.signAndSubmitTransaction(sender, rawTransaction);
    return txnHash;
  }
  /**
   * Get the balance of a fungible asset from the account's primary fungible store.
   *
   * @param account Account that you want to get the balance of.
   * @param fungibleAssetMetadataAddress The fungible asset address you want to check the balance of
   * @returns Promise that resolves to the balance
   */
  async getPrimaryBalance(account, fungibleAssetMetadataAddress) {
    const payload = {
      function: "0x1::primary_fungible_store::balance",
      type_arguments: [this.assetType],
      arguments: [HexString.ensure(account).hex(), HexString.ensure(fungibleAssetMetadataAddress).hex()]
    };
    const response = await this.provider.view(payload);
    return BigInt(response[0]);
  }
  /**
   *
   * Generate a transfer transaction that can be used to sign and submit to transfer an asset amount
   * from the sender primary fungible store to the recipient primary fungible store.
   *
   * This method can be used if you want/need to get the raw transaction so you can
   * first simulate the transaction and then sign and submit it.
   *
   * @param sender The sender account
   * @param fungibleAssetMetadataAddress The fungible asset address.
   * For example if you’re transferring USDT this would be the USDT address
   * @param recipient Recipient address
   * @param amount Number of assets to transfer
   * @returns Raw Transaction
   */
  async generateTransfer(sender, fungibleAssetMetadataAddress, recipient, amount, extraArgs) {
    const builder = new TransactionBuilderRemoteABI(this.provider, {
      sender: sender.address(),
      ...extraArgs
    });
    const rawTxn = await builder.build("0x1::primary_fungible_store::transfer", [this.assetType], [HexString.ensure(fungibleAssetMetadataAddress).hex(), HexString.ensure(recipient).hex(), amount]);
    return rawTxn;
  }
};

// src/plugins/aptos_token.ts
exports.FungibleAssetClient = FungibleAssetClient;
var PropertyTypeMap = {
  BOOLEAN: "bool",
  U8: "u8",
  U16: "u16",
  U32: "u32",
  U64: "u64",
  U128: "u128",
  U256: "u256",
  ADDRESS: "address",
  VECTOR: "vector<u8>",
  STRING: "string"
};
var AptosToken = class {
  /**
   * Creates new AptosToken instance
   *
   * @param provider Provider instance
   */
  constructor(provider) {
    this.tokenType = "0x4::token::Token";
    this.provider = provider;
  }
  async submitTransaction(account, funcName, typeArgs, args, extraArgs) {
    const builder = new TransactionBuilderRemoteABI(this.provider, {
      sender: account.address(),
      ...extraArgs
    });
    const rawTxn = await builder.build(`0x4::aptos_token::${funcName}`, typeArgs, args);
    const bcsTxn = AptosClient.generateBCSTransaction(account, rawTxn);
    const pendingTransaction = await this.provider.submitSignedBCSTransaction(bcsTxn);
    return pendingTransaction.hash;
  }
  /**
   * Creates a new collection within the specified account
   *
   * @param creator AptosAccount where collection will be created
   * @param description Collection description
   * @param name Collection name
   * @param uri URL to additional info about collection
   * @param options CreateCollectionOptions type. By default all values set to `true` or `0`
   * @returns The hash of the transaction submitted to the API
   */
  // :!:>createCollection
  async createCollection(creator, description, name, uri, maxSupply = MAX_U64_BIG_INT, options, extraArgs) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k;
    return this.submitTransaction(creator, "create_collection", [], [description, maxSupply, name, uri, (_a = options == null ? void 0 : options.mutableDescription) != null ? _a : true, (_b = options == null ? void 0 : options.mutableRoyalty) != null ? _b : true, (_c = options == null ? void 0 : options.mutableURI) != null ? _c : true, (_d = options == null ? void 0 : options.mutableTokenDescription) != null ? _d : true, (_e = options == null ? void 0 : options.mutableTokenName) != null ? _e : true, (_f = options == null ? void 0 : options.mutableTokenProperties) != null ? _f : true, (_g = options == null ? void 0 : options.mutableTokenURI) != null ? _g : true, (_h = options == null ? void 0 : options.tokensBurnableByCreator) != null ? _h : true, (_i = options == null ? void 0 : options.tokensFreezableByCreator) != null ? _i : true, (_j = options == null ? void 0 : options.royaltyNumerator) != null ? _j : 0, (_k = options == null ? void 0 : options.royaltyDenominator) != null ? _k : 1], extraArgs);
  }
  /**
   * Mint a new token within the specified account
   *
   * @param account AptosAccount where token will be created
   * @param collection Name of collection, that token belongs to
   * @param description Token description
   * @param name Token name
   * @param uri URL to additional info about token
   * @param propertyKeys the property keys for storing on-chain properties
   * @param propertyTypes the type of property values
   * @param propertyValues the property values to be stored on-chain
   * @returns The hash of the transaction submitted to the API
   */
  // :!:>mint
  async mint(account, collection, description, name, uri, propertyKeys = [], propertyTypes = [], propertyValues = [], extraArgs) {
    return this.submitTransaction(account, "mint", [], [collection, description, name, uri, propertyKeys, propertyTypes, getPropertyValueRaw(propertyValues, propertyTypes)], extraArgs);
  }
  /**
   * Mint a soul bound token into a recipient's account
   *
   * @param account AptosAccount that mints the token
   * @param collection Name of collection, that token belongs to
   * @param description Token description
   * @param name Token name
   * @param uri URL to additional info about token
   * @param recipient AptosAccount where token will be created
   * @param propertyKeys the property keys for storing on-chain properties
   * @param propertyTypes the type of property values
   * @param propertyValues the property values to be stored on-chain
   * @returns The hash of the transaction submitted to the API
   */
  async mintSoulBound(account, collection, description, name, uri, recipient, propertyKeys = [], propertyTypes = [], propertyValues = [], extraArgs) {
    return this.submitTransaction(account, "mint_soul_bound", [], [collection, description, name, uri, propertyKeys, propertyTypes, getPropertyValueRaw(propertyValues, propertyTypes), recipient.address().hex()], extraArgs);
  }
  /**
   * Burn a token by its creator
   * @param creator Creator account
   * @param token Token address
   * @returns The hash of the transaction submitted to the API
   */
  async burnToken(creator, token, tokenType, extraArgs) {
    return this.submitTransaction(creator, "burn", [tokenType || this.tokenType], [HexString.ensure(token).hex()], extraArgs);
  }
  /**
   * Freeze token transfer ability
   * @param creator Creator account
   * @param token Token address
   * @returns The hash of the transaction submitted to the API
   */
  async freezeTokenTransafer(creator, token, tokenType, extraArgs) {
    return this.submitTransaction(creator, "freeze_transfer", [tokenType || this.tokenType], [HexString.ensure(token).hex()], extraArgs);
  }
  /**
   * Unfreeze token transfer ability
   * @param creator Creator account
   * @param token Token address
   * @returns The hash of the transaction submitted to the API
   */
  async unfreezeTokenTransafer(creator, token, tokenType, extraArgs) {
    return this.submitTransaction(creator, "unfreeze_transfer", [tokenType || this.tokenType], [HexString.ensure(token).hex()], extraArgs);
  }
  /**
   * Set token description
   * @param creator Creator account
   * @param token Token address
   * @param description Token description
   * @returns The hash of the transaction submitted to the API
   */
  async setTokenDescription(creator, token, description, tokenType, extraArgs) {
    return this.submitTransaction(creator, "set_description", [tokenType || this.tokenType], [HexString.ensure(token).hex(), description], extraArgs);
  }
  /**
   * Set token name
   * @param creator Creator account
   * @param token Token address
   * @param name Token name
   * @returns The hash of the transaction submitted to the API
   */
  async setTokenName(creator, token, name, tokenType, extraArgs) {
    return this.submitTransaction(creator, "set_name", [tokenType || this.tokenType], [HexString.ensure(token).hex(), name], extraArgs);
  }
  /**
   * Set token URI
   * @param creator Creator account
   * @param token Token address
   * @param uri Token uri
   * @returns The hash of the transaction submitted to the API
   */
  async setTokenURI(creator, token, uri, tokenType, extraArgs) {
    return this.submitTransaction(creator, "set_uri", [tokenType || this.tokenType], [HexString.ensure(token).hex(), uri], extraArgs);
  }
  /**
   * Add token property
   * @param creator Creator account
   * @param token Token address
   * @param key the property key for storing on-chain property
   * @param type the type of property value
   * @param value the property value to be stored on-chain
   * @returns The hash of the transaction submitted to the API
   */
  async addTokenProperty(creator, token, propertyKey, propertyType, propertyValue, tokenType, extraArgs) {
    return this.submitTransaction(creator, "add_property", [tokenType || this.tokenType], [HexString.ensure(token).hex(), propertyKey, PropertyTypeMap[propertyType], getSinglePropertyValueRaw(propertyValue, PropertyTypeMap[propertyType])], extraArgs);
  }
  /**
   * Remove token property
   * @param creator Creator account
   * @param token Token address
   * @param key the property key stored on-chain
   * @returns The hash of the transaction submitted to the API
   */
  async removeTokenProperty(creator, token, propertyKey, tokenType, extraArgs) {
    return this.submitTransaction(creator, "remove_property", [tokenType || this.tokenType], [HexString.ensure(token).hex(), propertyKey], extraArgs);
  }
  /**
   * Update token property
   * @param creator Creator account
   * @param token Token address
   * @param key the property key stored on-chain
   * @param type the property typed stored on-chain
   * @param value the property value to be stored on-chain
   * @returns The hash of the transaction submitted to the API
   */
  async updateTokenProperty(creator, token, propertyKey, propertyType, propertyValue, tokenType, extraArgs) {
    return this.submitTransaction(creator, "update_property", [tokenType || this.tokenType], [HexString.ensure(token).hex(), propertyKey, PropertyTypeMap[propertyType], getSinglePropertyValueRaw(propertyValue, PropertyTypeMap[propertyType])], extraArgs);
  }
  async addTypedProperty(creator, token, propertyKey, propertyType, propertyValue, tokenType, extraArgs) {
    return this.submitTransaction(creator, "add_typed_property", [tokenType || this.tokenType, PropertyTypeMap[propertyType]], [HexString.ensure(token).hex(), propertyKey, propertyValue], extraArgs);
  }
  async updateTypedProperty(creator, token, propertyKey, propertyType, propertyValue, tokenType, extraArgs) {
    return this.submitTransaction(creator, "update_typed_property", [tokenType || this.tokenType, PropertyTypeMap[propertyType]], [HexString.ensure(token).hex(), propertyKey, propertyValue], extraArgs);
  }
  /**
   * Transfer a non fungible token ownership.
   * We can transfer a token only when the token is not frozen (i.e. owner transfer is not disabled such as for soul bound tokens)
   * @param owner The account of the current token owner
   * @param token Token address
   * @param recipient Recipient address
   * @returns The hash of the transaction submitted to the API
   */
  async transferTokenOwnership(owner, token, recipient, tokenType, extraArgs) {
    const builder = new TransactionBuilderRemoteABI(this.provider, {
      sender: owner.address(),
      ...extraArgs
    });
    const rawTxn = await builder.build("0x1::object::transfer", [tokenType || this.tokenType], [HexString.ensure(token).hex(), HexString.ensure(recipient).hex()]);
    const bcsTxn = AptosClient.generateBCSTransaction(owner, rawTxn);
    const pendingTransaction = await this.provider.submitSignedBCSTransaction(bcsTxn);
    return pendingTransaction.hash;
  }
  /**
   * Transfer a token. This function supports transfer non-fungible token and fungible token.
   *
   * To set the token type, set isFungibleToken param to true or false.
   * If isFungibleToken param is not set, the function would query Indexer
   * for the token data and check whether it is a non-fungible or a fungible token.
   *
   * Note: this function supports only token v2 standard (it does not support the token v1 standard)
   *
   * @param data NonFungibleTokenParameters | FungibleTokenParameters type
   * @param isFungibleToken (optional) The token type, non-fungible or fungible token.
   * @returns The hash of the transaction submitted to the API
   */
  async transfer(data, isFungibleToken) {
    let isFungible = isFungibleToken;
    if (isFungible === void 0 || isFungible === null) {
      const tokenData = await this.provider.getTokenData(HexString.ensure(data.tokenAddress).hex());
      isFungible = tokenData.current_token_datas_v2[0].is_fungible_v2;
    }
    if (isFungible) {
      const token2 = data;
      const fungibleAsset = new FungibleAssetClient(this.provider);
      const txnHash2 = await fungibleAsset.transfer(token2.owner, token2.tokenAddress, token2.recipient, token2.amount, token2.extraArgs);
      return txnHash2;
    }
    const token = data;
    const txnHash = await this.transferTokenOwnership(token.owner, token.tokenAddress, token.recipient, token.tokenType, token.extraArgs);
    return txnHash;
  }
  /**
   * Burn an object by the object owner
   * @param owner The object owner account
   * @param objectId The object address
   * @optional objectType. The object type, default to "0x1::object::ObjectCore"
   * @returns The hash of the transaction submitted to the API
   */
  async burnObject(owner, objectId, objectType, extraArgs) {
    const builder = new TransactionBuilderRemoteABI(this.provider, {
      sender: owner.address(),
      ...extraArgs
    });
    const rawTxn = await builder.build("0x1::object::burn", [objectType || "0x1::object::ObjectCore"], [HexString.ensure(objectId).hex()]);
    const bcsTxn = AptosClient.generateBCSTransaction(owner, rawTxn);
    const pendingTransaction = await this.provider.submitSignedBCSTransaction(bcsTxn);
    return pendingTransaction.hash;
  }
};

// src/plugins/coin_client.ts
exports.AptosToken = AptosToken;
var TRANSFER_COINS = exports.TRANSFER_COINS = "0x1::aptos_account::transfer_coins";
var COIN_TRANSFER = exports.COIN_TRANSFER = "0x1::coin::transfer";
var CoinClient = class {
  /**
   * Creates new CoinClient instance
   * @param aptosClient AptosClient instance
   */
  constructor(aptosClient2) {
    this.aptosClient = aptosClient2;
  }
  /**
   * Generate, sign, and submit a transaction to the Aptos blockchain API to
   * transfer coins from one account to another. By default it transfers
   * 0x1::aptos_coin::AptosCoin, but you can specify a different coin type
   * with the `coinType` argument.
   *
   * You may set `createReceiverIfMissing` to true if you want to create the
   * receiver account if it does not exist on chain yet. If you do not set
   * this to true, the transaction will fail if the receiver account does not
   * exist on-chain.
   *
   * The TS SDK supports fungible assets operations. If you want to use CoinClient
   * with this feature, set the `coinType` to be the fungible asset metadata address.
   * This option uses the `FungibleAssetClient` class and queries the
   * fungible asset primary store.
   *
   * @param from Account sending the coins
   * @param to Account to receive the coins
   * @param amount Number of coins to transfer
   * @param extraArgs Extra args for building the transaction or configuring how
   * the client should submit and wait for the transaction
   * @returns The hash of the transaction submitted to the API
   */
  // :!:>transfer
  async transfer(from, to, amount, extraArgs) {
    var _a, _b, _c;
    const isTypeTag = ((_a = extraArgs == null ? void 0 : extraArgs.coinType) != null ? _a : "").toString().includes("::");
    if ((extraArgs == null ? void 0 : extraArgs.coinType) && !isTypeTag && AccountAddress.isValid(extraArgs.coinType)) {
      console.warn("to transfer a fungible asset, use `FungibleAssetClient()` class for better support");
      const provider = new Provider({
        fullnodeUrl: this.aptosClient.nodeUrl,
        indexerUrl: (_b = NetworkToIndexerAPI[NodeAPIToNetwork[this.aptosClient.nodeUrl]]) != null ? _b : this.aptosClient.nodeUrl
      });
      const fungibleAsset = new FungibleAssetClient(provider);
      const txnHash = await fungibleAsset.transfer(from, extraArgs == null ? void 0 : extraArgs.coinType, getAddressFromAccountOrAddress(to), amount);
      return txnHash;
    }
    const coinTypeToTransfer = (_c = extraArgs == null ? void 0 : extraArgs.coinType) != null ? _c : APTOS_COIN;
    let func;
    if ((extraArgs == null ? void 0 : extraArgs.createReceiverIfMissing) === void 0) {
      func = TRANSFER_COINS;
    } else {
      func = (extraArgs == null ? void 0 : extraArgs.createReceiverIfMissing) ? TRANSFER_COINS : COIN_TRANSFER;
    }
    const toAddress = getAddressFromAccountOrAddress(to);
    const builder = new TransactionBuilderRemoteABI(this.aptosClient, {
      sender: from.address(),
      ...extraArgs
    });
    const rawTxn = await builder.build(func, [coinTypeToTransfer], [toAddress, amount]);
    const bcsTxn = AptosClient.generateBCSTransaction(from, rawTxn);
    const pendingTransaction = await this.aptosClient.submitSignedBCSTransaction(bcsTxn);
    return pendingTransaction.hash;
  }
  // <:!:transfer
  /**
   * Get the balance of the account. By default it checks the balance of
   * 0x1::aptos_coin::AptosCoin, but you can specify a different coin type.
   *
   * to use a different type, set the `coinType` to be the fungible asset type.
   *
   * The TS SDK supports fungible assets operations. If you want to use CoinClient
   * with this feature, set the `coinType` to be the fungible asset metadata address.
   * This option uses the FungibleAssetClient class and queries the
   * fungible asset primary store.
   *
   * @param account Account that you want to get the balance of.
   * @param extraArgs Extra args for checking the balance.
   * @returns Promise that resolves to the balance as a bigint.
   */
  // :!:>checkBalance
  async checkBalance(account, extraArgs) {
    var _a, _b, _c;
    const isTypeTag = ((_a = extraArgs == null ? void 0 : extraArgs.coinType) != null ? _a : "").toString().includes("::");
    if ((extraArgs == null ? void 0 : extraArgs.coinType) && !isTypeTag && AccountAddress.isValid(extraArgs.coinType)) {
      console.warn("to check balance of a fungible asset, use `FungibleAssetClient()` class for better support");
      const provider = new Provider({
        fullnodeUrl: this.aptosClient.nodeUrl,
        indexerUrl: (_b = NetworkToIndexerAPI[NodeAPIToNetwork[this.aptosClient.nodeUrl]]) != null ? _b : this.aptosClient.nodeUrl
      });
      const fungibleAsset = new FungibleAssetClient(provider);
      const balance = await fungibleAsset.getPrimaryBalance(getAddressFromAccountOrAddress(account), extraArgs == null ? void 0 : extraArgs.coinType);
      return balance;
    }
    const coinType = (_c = extraArgs == null ? void 0 : extraArgs.coinType) != null ? _c : APTOS_COIN;
    const typeTag = `0x1::coin::CoinStore<${coinType}>`;
    const address = getAddressFromAccountOrAddress(account);
    const accountResource = await this.aptosClient.getAccountResource(address, typeTag);
    return BigInt(accountResource.data.coin.value);
  }
  // <:!:checkBalance
};

// src/plugins/faucet_client.ts
exports.CoinClient = CoinClient;
var FaucetClient = class extends AptosClient {
  /**
   * Establishes a connection to Aptos node
   * @param nodeUrl A url of the Aptos Node API endpoint
   * @param faucetUrl A faucet url
   * @param config An optional config for inner axios instance
   * Detailed config description: {@link https://github.com/axios/axios#request-config}
   */
  constructor(nodeUrl, faucetUrl, config) {
    super(nodeUrl, config);
    if (!faucetUrl) {
      throw new Error("Faucet URL cannot be empty.");
    }
    this.faucetUrl = faucetUrl;
    this.config = config;
  }
  /**
   * This creates an account if it does not exist and mints the specified amount of
   * coins into that account
   * @param address Hex-encoded 16 bytes Aptos account address wich mints tokens
   * @param amount Amount of tokens to mint
   * @param timeoutSecs
   * @returns Hashes of submitted transactions
   */
  async fundAccount(address, amount, timeoutSecs = DEFAULT_TXN_TIMEOUT_SEC) {
    const {
      data
    } = await post({
      url: this.faucetUrl,
      endpoint: "mint",
      body: null,
      params: {
        address: HexString.ensure(address).noPrefix(),
        amount
      },
      overrides: {
        ...this.config
      },
      originMethod: "fundAccount"
    });
    const promises = [];
    for (let i = 0; i < data.length; i += 1) {
      const tnxHash = data[i];
      promises.push(this.waitForTransaction(tnxHash, {
        timeoutSecs
      }));
    }
    await Promise.all(promises);
    return data;
  }
};

// src/plugins/ans_client.ts
exports.FaucetClient = FaucetClient;
var ansContractsMap = exports.ansContractsMap = {
  testnet: "0x5f8fd2347449685cf41d4db97926ec3a096eaf381332be4f1318ad4d16a8497c",
  mainnet: "0x867ed1f6bf916171b1de3ee92849b8978b7d1b9e0a8cc982a3d19d535dfd9c0c"
};
var nameComponentPattern = exports.nameComponentPattern = /^[a-z\d][a-z\d-]{1,61}[a-z\d]$/;
var namePattern = exports.namePattern = new RegExp("^(?:(?<subdomain>[^.]+)\\.(?!apt$))?(?<domain>[^.]+)(?:\\.apt)?$");
var AnsClient = class {
  /**
   * Creates new AnsClient instance
   * @param provider Provider instance
   * @param contractAddress An optional contract address.
   * If there is no contract address matching to the provided network
   * then the AnsClient class expects a contract address -
   * this is to support both mainnet/testnet networks and local development.
   */
  constructor(provider, contractAddress) {
    var _a;
    this.provider = provider;
    if (!ansContractsMap[this.provider.network] && !contractAddress) {
      throw new Error("Error: For custom providers, you must pass in a contract address");
    }
    this.contractAddress = (_a = ansContractsMap[this.provider.network]) != null ? _a : contractAddress;
  }
  /**
   * Returns the primary name for the given account address
   * @param address An account address
   * @returns Account's primary name | null if there is no primary name defined
   */
  async getPrimaryNameByAddress(address) {
    const ansResource = await this.provider.getAccountResource(this.contractAddress, `${this.contractAddress}::domains::ReverseLookupRegistryV1`);
    const data = ansResource.data;
    const {
      handle
    } = data.registry;
    const domainsTableItemRequest = {
      key_type: "address",
      value_type: `${this.contractAddress}::domains::NameRecordKeyV1`,
      key: address
    };
    try {
      const item = await this.provider.getTableItem(handle, domainsTableItemRequest);
      return item.subdomain_name.vec[0] ? `${item.subdomain_name.vec[0]}.${item.domain_name}` : item.domain_name;
    } catch (error) {
      if (error.status === 404) {
        return null;
      }
      throw new Error(error);
    }
  }
  /**
   * Returns the target account address for the given name
   * @param name ANS name
   * @returns Account address | null
   */
  async getAddressByName(name) {
    var _a, _b;
    const {
      domain,
      subdomain
    } = (_b = (_a = name.match(namePattern)) == null ? void 0 : _a.groups) != null ? _b : {};
    if (!domain) return null;
    const registration = subdomain ? await this.getRegistrationForSubdomainName(domain, subdomain) : await this.getRegistrationForDomainName(domain);
    return registration === null ? null : registration.target;
  }
  /**
   * Mint a new Aptos name
   *
   * @param account AptosAccount where collection will be created
   * @param domainName Aptos domain name to mint
   * @param years year duration of the domain name
   * @returns The hash of the pending transaction submitted to the API
   */
  async mintAptosName(account, domainName, years = 1, extraArgs) {
    if (domainName.match(nameComponentPattern) === null) {
      throw new ApiError(400, `Name ${domainName} is not valid`);
    }
    const registration = await this.getRegistrationForDomainName(domainName);
    if (registration) {
      const now2 = Math.ceil(Date.now() / 1e3);
      if (now2 < registration.expirationTimestampSeconds) {
        throw new ApiError(400, `Name ${domainName} is not available`);
      }
    }
    const builder = new TransactionBuilderRemoteABI(this.provider.aptosClient, {
      sender: account.address(),
      ...extraArgs
    });
    const rawTxn = await builder.build(`${this.contractAddress}::domains::register_domain`, [], [domainName, years]);
    const bcsTxn = AptosClient.generateBCSTransaction(account, rawTxn);
    const pendingTransaction = await this.provider.submitSignedBCSTransaction(bcsTxn);
    return pendingTransaction.hash;
  }
  /**
   * Mint a new Aptos Subdomain
   *
   * @param account AptosAccount the owner of the domain name
   * @param subdomainName subdomain name to mint
   * @param domainName Aptos domain name to mint under
   * @param expirationTimestampSeconds must be set between the domains expiration and the current time
   * @returns The hash of the pending transaction submitted to the API
   */
  async mintAptosSubdomain(account, subdomainName, domainName, expirationTimestampSeconds, extraArgs) {
    if (domainName.match(nameComponentPattern) === null) {
      throw new ApiError(400, `Domain name ${domainName} is not valid`);
    }
    if (subdomainName.match(nameComponentPattern) === null) {
      throw new ApiError(400, `Subdomain name ${subdomainName} is not valid`);
    }
    const subdomainRegistration = await this.getRegistrationForSubdomainName(domainName, subdomainName);
    if (subdomainRegistration) {
      const now3 = Math.ceil(Date.now() / 1e3);
      if (now3 < subdomainRegistration.expirationTimestampSeconds) {
        throw new ApiError(400, `Name ${subdomainName}.${domainName} is not available`);
      }
    }
    const domainRegistration = await this.getRegistrationForDomainName(domainName);
    if (domainRegistration === null) {
      throw new ApiError(400, `Domain name ${domainName} does not exist`);
    }
    const now2 = Math.ceil(Date.now() / 1e3);
    if (domainRegistration.expirationTimestampSeconds < now2) {
      throw new ApiError(400, `Domain name ${domainName} expired`);
    }
    const actualExpirationTimestampSeconds = expirationTimestampSeconds || domainRegistration.expirationTimestampSeconds;
    if (actualExpirationTimestampSeconds < now2) {
      throw new ApiError(400, `Expiration for ${subdomainName}.${domainName} is before now`);
    }
    const builder = new TransactionBuilderRemoteABI(this.provider.aptosClient, {
      sender: account.address(),
      ...extraArgs
    });
    const rawTxn = await builder.build(`${this.contractAddress}::domains::register_subdomain`, [], [subdomainName, domainName, actualExpirationTimestampSeconds]);
    const bcsTxn = AptosClient.generateBCSTransaction(account, rawTxn);
    const pendingTransaction = await this.provider.submitSignedBCSTransaction(bcsTxn);
    return pendingTransaction.hash;
  }
  /**
   * @param account AptosAccount the owner of the domain name
   * @param subdomainName subdomain name to mint
   * @param domainName Aptos domain name to mint
   * @param target the target address for the subdomain
   * @returns The hash of the pending transaction submitted to the API
   */
  async setSubdomainAddress(account, subdomainName, domainName, target, extraArgs) {
    const standardizeAddress = AccountAddress.standardizeAddress(target);
    if (domainName.match(nameComponentPattern) === null) {
      throw new ApiError(400, `Name ${domainName} is not valid`);
    }
    if (subdomainName.match(nameComponentPattern) === null) {
      throw new ApiError(400, `Name ${subdomainName} is not valid`);
    }
    const builder = new TransactionBuilderRemoteABI(this.provider.aptosClient, {
      sender: account.address(),
      ...extraArgs
    });
    const rawTxn = await builder.build(`${this.contractAddress}::domains::set_subdomain_address`, [], [subdomainName, domainName, standardizeAddress]);
    const bcsTxn = AptosClient.generateBCSTransaction(account, rawTxn);
    const pendingTransaction = await this.provider.submitSignedBCSTransaction(bcsTxn);
    return pendingTransaction.hash;
  }
  /**
   * Initialize reverse lookup for contract owner
   *
   * @param owner the `aptos_names` AptosAccount
   * @returns The hash of the pending transaction submitted to the API
   */
  async initReverseLookupRegistry(owner, extraArgs) {
    const builder = new TransactionBuilderRemoteABI(this.provider.aptosClient, {
      sender: owner.address(),
      ...extraArgs
    });
    const rawTxn = await builder.build(`${this.contractAddress}::domains::init_reverse_lookup_registry_v1`, [], []);
    const bcsTxn = AptosClient.generateBCSTransaction(owner, rawTxn);
    const pendingTransaction = await this.provider.submitSignedBCSTransaction(bcsTxn);
    return pendingTransaction.hash;
  }
  /**
   * Returns the AnsRegistry for the given domain name
   * @param domain domain name
   * @example
   * if name is `aptos.apt`
   * domain = aptos
   *
   * @returns AnsRegistry | null
   */
  async getRegistrationForDomainName(domain) {
    if (domain.match(nameComponentPattern) === null) return null;
    const ansResource = await this.provider.getAccountResource(this.contractAddress, `${this.contractAddress}::domains::NameRegistryV1`);
    const data = ansResource.data;
    const {
      handle
    } = data.registry;
    const domainsTableItemRequest = {
      key_type: `${this.contractAddress}::domains::NameRecordKeyV1`,
      value_type: `${this.contractAddress}::domains::NameRecordV1`,
      key: {
        subdomain_name: {
          vec: []
        },
        domain_name: domain
      }
    };
    try {
      const item = await this.provider.getTableItem(handle, domainsTableItemRequest);
      return {
        target: item.target_address.vec.length === 1 ? item.target_address.vec[0] : null,
        expirationTimestampSeconds: item.expiration_time_sec
      };
    } catch (error) {
      if (error.status === 404) {
        return null;
      }
      throw new Error(error);
    }
  }
  /**
   * Returns the AnsRegistry for the given subdomain_name
   * @param domain domain name
   * @param subdomain subdomain name
   * @example
   * if name is `dev.aptos.apt`
   * domain = aptos
   * subdomain = dev
   *
   * @returns AnsRegistry | null
   */
  async getRegistrationForSubdomainName(domain, subdomain) {
    if (domain.match(nameComponentPattern) === null) return null;
    if (subdomain.match(nameComponentPattern) === null) return null;
    const ansResource = await this.provider.getAccountResource(this.contractAddress, `${this.contractAddress}::domains::NameRegistryV1`);
    const data = ansResource.data;
    const {
      handle
    } = data.registry;
    const domainsTableItemRequest = {
      key_type: `${this.contractAddress}::domains::NameRecordKeyV1`,
      value_type: `${this.contractAddress}::domains::NameRecordV1`,
      key: {
        subdomain_name: {
          vec: [subdomain]
        },
        domain_name: domain
      }
    };
    try {
      const item = await this.provider.getTableItem(handle, domainsTableItemRequest);
      return {
        target: item.target_address.vec.length === 1 ? item.target_address.vec[0] : null,
        expirationTimestampSeconds: item.expiration_time_sec
      };
    } catch (error) {
      if (error.status === 404) {
        return null;
      }
      throw new Error(error);
    }
  }
};

// src/transactions/account_sequence_number.ts
exports.AnsClient = AnsClient;
var now = () => Math.floor(Date.now() / 1e3);
var AccountSequenceNumber = class {
  constructor(provider, account, maxWaitTime, maximumInFlight, sleepTime) {
    // sequence number on chain
    this.lastUncommintedNumber = null;
    // local sequence number
    this.currentNumber = null;
    /**
     * We want to guarantee that we preserve ordering of workers to requests.
     *
     * `lock` is used to try to prevent multiple coroutines from accessing a shared resource at the same time,
     * which can result in race conditions and data inconsistency.
     * This code actually doesn't do it though, since we aren't giving out a slot, it is still somewhat a race condition.
     *
     * The ideal solution is likely that each thread grabs the next number from a incremental integer.
     * When they complete, they increment that number and that entity is able to enter the `lock`.
     * That would guarantee ordering.
     */
    this.lock = false;
    this.provider = provider;
    this.account = account;
    this.maxWaitTime = maxWaitTime;
    this.maximumInFlight = maximumInFlight;
    this.sleepTime = sleepTime;
  }
  /**
   * Returns the next available sequence number for this account
   *
   * @returns next available sequence number
   */
  async nextSequenceNumber() {
    while (this.lock) {
      await sleep(this.sleepTime);
    }
    this.lock = true;
    let nextNumber = BigInt(0);
    try {
      if (this.lastUncommintedNumber === null || this.currentNumber === null) {
        await this.initialize();
      }
      if (this.currentNumber - this.lastUncommintedNumber >= this.maximumInFlight) {
        await this.update();
        const startTime = now();
        while (this.currentNumber - this.lastUncommintedNumber >= this.maximumInFlight) {
          await sleep(this.sleepTime);
          if (now() - startTime > this.maxWaitTime) {
            console.warn(`Waited over 30 seconds for a transaction to commit, resyncing ${this.account.address()}`);
            await this.initialize();
          } else {
            await this.update();
          }
        }
      }
      nextNumber = this.currentNumber;
      this.currentNumber += BigInt(1);
    } catch (e) {
      console.error("error in getting next sequence number for this account", e);
    } finally {
      this.lock = false;
    }
    return nextNumber;
  }
  /**
   * Initializes this account with the sequence number on chain
   */
  async initialize() {
    const {
      sequence_number: sequenceNumber
    } = await this.provider.getAccount(this.account.address());
    this.currentNumber = BigInt(sequenceNumber);
    this.lastUncommintedNumber = BigInt(sequenceNumber);
  }
  /**
   * Updates this account sequence number with the one on-chain
   *
   * @returns on-chain sequence number for this account
   */
  async update() {
    const {
      sequence_number: sequenceNumber
    } = await this.provider.getAccount(this.account.address());
    this.lastUncommintedNumber = BigInt(sequenceNumber);
    return this.lastUncommintedNumber;
  }
  /**
   * Synchronizes local sequence number with the seqeunce number on chain for this account.
   *
   * Poll the network until all submitted transactions have either been committed or until
   * the maximum wait time has elapsed
   */
  async synchronize() {
    if (this.lastUncommintedNumber === this.currentNumber) return;
    while (this.lock) {
      await sleep(this.sleepTime);
    }
    this.lock = true;
    try {
      await this.update();
      const startTime = now();
      while (this.lastUncommintedNumber !== this.currentNumber) {
        if (now() - startTime > this.maxWaitTime) {
          console.warn(`Waited over 30 seconds for a transaction to commit, resyncing ${this.account.address()}`);
          await this.initialize();
        } else {
          await sleep(this.sleepTime);
          await this.update();
        }
      }
    } catch (e) {
      console.error("error in synchronizing this account sequence number with the one on chain", e);
    } finally {
      this.lock = false;
    }
  }
};

// src/transactions/transaction_worker.ts
exports.AccountSequenceNumber = AccountSequenceNumber;
// src/transactions/async_queue.ts
var AsyncQueue = class {
  constructor() {
    this.queue = [];
    // The pendingDequeue is used to handle the resolution of promises when items are enqueued and dequeued.
    this.pendingDequeue = [];
    this.cancelled = false;
  }
  /**
   * The enqueue method adds an item to the queue. If there are pending dequeued promises,
   * in the pendingDequeue, it resolves the oldest promise with the enqueued item immediately.
   * Otherwise, it adds the item to the queue.
   *
   * @param item T
   */
  enqueue(item) {
    this.cancelled = false;
    if (this.pendingDequeue.length > 0) {
      const promise = this.pendingDequeue.shift();
      promise == null ? void 0 : promise.resolve(item);
      return;
    }
    this.queue.push(item);
  }
  /**
   * The dequeue method returns a promise that resolves to the next item in the queue.
   * If the queue is not empty, it resolves the promise immediately with the next item.
   * Otherwise, it creates a new promise. The promise's resolve function is stored
   * in the pendingDequeue with a unique counter value as the key.
   * The newly created promise is then returned, and it will be resolved later when an item is enqueued.
   *
   * @returns Promise<T>
   */
  async dequeue() {
    if (this.queue.length > 0) {
      return Promise.resolve(this.queue.shift());
    }
    return new Promise((resolve, reject) => {
      this.pendingDequeue.push({
        resolve,
        reject
      });
    });
  }
  /**
   * The isEmpty method returns whether the queue is empty or not.
   *
   * @returns boolean
   */
  isEmpty() {
    return this.queue.length === 0;
  }
  /**
   * The cancel method cancels all pending promises in the queue.
   * It rejects the promises with a AsyncQueueCancelledError error,
   * ensuring that any awaiting code can handle the cancellation appropriately.
   */
  cancel() {
    this.cancelled = true;
    this.pendingDequeue.forEach(async ({
      reject
    }) => {
      reject(new AsyncQueueCancelledError("Task cancelled"));
    });
    this.pendingDequeue = [];
    this.queue.length = 0;
  }
  /**
   * The isCancelled method returns whether the queue is cancelled or not.
   *
   * @returns boolean
   */
  isCancelled() {
    return this.cancelled;
  }
  /**
   * The pendingDequeueLength method returns the length of the pendingDequeue.
   *
   * @returns number
   */
  pendingDequeueLength() {
    return this.pendingDequeue.length;
  }
};
var AsyncQueueCancelledError = class extends Error {};

// src/transactions/transaction_worker.ts
var promiseFulfilledStatus = "fulfilled";
var TransactionWorkerEvents = exports.TransactionWorkerEvents = /* @__PURE__ */(TransactionWorkerEvents2 => {
  TransactionWorkerEvents2["TransactionSent"] = "transactionSent";
  TransactionWorkerEvents2["TransactionSendFailed"] = "transactionsendFailed";
  TransactionWorkerEvents2["TransactionExecuted"] = "transactionExecuted";
  TransactionWorkerEvents2["TransactionExecutionFailed"] = "transactionexecutionFailed";
  return TransactionWorkerEvents2;
})(TransactionWorkerEvents || {});
var TransactionWorker = class extends _eventemitter.default {
  /**
   * Provides a simple framework for receiving payloads to be processed.
   *
   * @param provider - a client provider
   * @param sender - a sender as AptosAccount
   * @param maxWaitTime - the max wait time to wait before resyncing the sequence number
   * to the current on-chain state, default to 30
   * @param maximumInFlight - submit up to `maximumInFlight` transactions per account.
   * Mempool limits the number of transactions per account to 100, hence why we default to 100.
   * @param sleepTime - If `maximumInFlight` are in flight, wait `sleepTime` seconds before re-evaluating, default to 10
   */
  constructor(provider, account, maxWaitTime = 30, maximumInFlight = 100, sleepTime = 10) {
    super();
    this.taskQueue = new AsyncQueue();
    /**
     * transactions payloads waiting to be generated and signed
     *
     * TODO support entry function payload from ABI builder
     */
    this.transactionsQueue = new AsyncQueue();
    /**
     * signed transactions waiting to be submitted
     */
    this.outstandingTransactions = new AsyncQueue();
    /**
     * transactions that have been submitted to chain
     */
    this.sentTransactions = [];
    /**
     * transactions that have been committed to chain
     */
    this.executedTransactions = [];
    this.provider = provider;
    this.account = account;
    this.started = false;
    this.accountSequnceNumber = new AccountSequenceNumber(provider, account, maxWaitTime, maximumInFlight, sleepTime);
  }
  /**
   * Gets the current account sequence number,
   * generates the transaction with the account sequence number,
   * adds the transaction to the outstanding transaction queue
   * to be processed later.
   */
  async submitNextTransaction() {
    try {
      while (true) {
        if (this.transactionsQueue.isEmpty()) return;
        const sequenceNumber = await this.accountSequnceNumber.nextSequenceNumber();
        if (sequenceNumber === null) return;
        const transaction = await this.generateNextTransaction(this.account, sequenceNumber);
        if (!transaction) return;
        const pendingTransaction = this.provider.submitSignedBCSTransaction(transaction);
        await this.outstandingTransactions.enqueue([pendingTransaction, sequenceNumber]);
      }
    } catch (error) {
      if (error instanceof AsyncQueueCancelledError) {
        return;
      }
      console.log(error);
    }
  }
  /**
   * Reads the outstanding transaction queue and submits the transaction to chain.
   *
   * If the transaction has fulfilled, it pushes the transaction to the processed
   * transactions queue and fires a transactionsFulfilled event.
   *
   * If the transaction has failed, it pushes the transaction to the processed
   * transactions queue with the failure reason and fires a transactionsFailed event.
   */
  async processTransactions() {
    try {
      while (true) {
        const awaitingTransactions = [];
        const sequenceNumbers = [];
        let [pendingTransaction, sequenceNumber] = await this.outstandingTransactions.dequeue();
        awaitingTransactions.push(pendingTransaction);
        sequenceNumbers.push(sequenceNumber);
        while (!this.outstandingTransactions.isEmpty()) {
          [pendingTransaction, sequenceNumber] = await this.outstandingTransactions.dequeue();
          awaitingTransactions.push(pendingTransaction);
          sequenceNumbers.push(sequenceNumber);
        }
        const sentTransactions = await Promise.allSettled(awaitingTransactions);
        for (let i = 0; i < sentTransactions.length && i < sequenceNumbers.length; i += 1) {
          const sentTransaction = sentTransactions[i];
          sequenceNumber = sequenceNumbers[i];
          if (sentTransaction.status === promiseFulfilledStatus) {
            this.sentTransactions.push([sentTransaction.value.hash, sequenceNumber, null]);
            this.emit("transactionSent" /* TransactionSent */, [this.sentTransactions.length, sentTransaction.value.hash]);
            await this.checkTransaction(sentTransaction, sequenceNumber);
          } else {
            this.sentTransactions.push([sentTransaction.status, sequenceNumber, sentTransaction.reason]);
            this.emit("transactionsendFailed" /* TransactionSendFailed */, [this.sentTransactions.length, sentTransaction.reason]);
          }
        }
      }
    } catch (error) {
      if (error instanceof AsyncQueueCancelledError) {
        return;
      }
      console.log(error);
    }
  }
  /**
   * Once transaction has been sent to chain, we check for its execution status.
   * @param sentTransaction transactions that were sent to chain and are now waiting to be executed
   * @param sequenceNumber the account's sequence number that was sent with the transaction
   */
  async checkTransaction(sentTransaction, sequenceNumber) {
    const waitFor = [];
    waitFor.push(this.provider.waitForTransactionWithResult(sentTransaction.value.hash, {
      checkSuccess: true
    }));
    const sentTransactions = await Promise.allSettled(waitFor);
    for (let i = 0; i < sentTransactions.length; i += 1) {
      const executedTransaction = sentTransactions[i];
      if (executedTransaction.status === promiseFulfilledStatus) {
        this.executedTransactions.push([executedTransaction.value.hash, sequenceNumber, null]);
        this.emit("transactionExecuted" /* TransactionExecuted */, [this.executedTransactions.length, executedTransaction.value.hash]);
      } else {
        this.executedTransactions.push([executedTransaction.status, sequenceNumber, executedTransaction.reason]);
        this.emit("transactionexecutionFailed" /* TransactionExecutionFailed */, [this.executedTransactions.length, executedTransaction.reason]);
      }
    }
  }
  /**
   * Push transaction to the transactions queue
   * @param payload Transaction payload
   */
  async push(payload) {
    await this.transactionsQueue.enqueue(payload);
  }
  /**
   * Generates a signed transaction that can be submitted to chain
   * @param account an Aptos account
   * @param sequenceNumber a sequence number the transaction will be generated with
   * @returns
   */
  async generateNextTransaction(account, sequenceNumber) {
    if (this.transactionsQueue.isEmpty()) return void 0;
    const payload = await this.transactionsQueue.dequeue();
    const rawTransaction = await this.provider.generateRawTransaction(account.address(), payload, {
      providedSequenceNumber: sequenceNumber
    });
    const signedTransaction = AptosClient.generateBCSTransaction(account, rawTransaction);
    return signedTransaction;
  }
  /**
   * Starts transaction submission and transaction processing.
   */
  async run() {
    try {
      while (!this.taskQueue.isCancelled()) {
        const task = await this.taskQueue.dequeue();
        await task();
      }
    } catch (error) {
      throw new Error(error);
    }
  }
  /**
   * Starts the transaction management process.
   */
  start() {
    if (this.started) {
      throw new Error("worker has already started");
    }
    this.started = true;
    this.taskQueue.enqueue(() => this.submitNextTransaction());
    this.taskQueue.enqueue(() => this.processTransactions());
    this.run();
  }
  /**
   * Stops the the transaction management process.
   */
  stop() {
    if (this.taskQueue.isCancelled()) {
      throw new Error("worker has already stopped");
    }
    this.started = false;
    this.taskQueue.cancel();
  }
};

// src/generated/index.ts
exports.TransactionWorker = TransactionWorker;
var generated_exports = exports.Types = {};
__export(generated_exports, {
  AptosErrorCode: () => AptosErrorCode,
  MoveFunctionVisibility: () => MoveFunctionVisibility,
  RoleType: () => RoleType
});

// src/generated/models/AptosErrorCode.ts
var AptosErrorCode = /* @__PURE__ */(AptosErrorCode2 => {
  AptosErrorCode2["ACCOUNT_NOT_FOUND"] = "account_not_found";
  AptosErrorCode2["RESOURCE_NOT_FOUND"] = "resource_not_found";
  AptosErrorCode2["MODULE_NOT_FOUND"] = "module_not_found";
  AptosErrorCode2["STRUCT_FIELD_NOT_FOUND"] = "struct_field_not_found";
  AptosErrorCode2["VERSION_NOT_FOUND"] = "version_not_found";
  AptosErrorCode2["TRANSACTION_NOT_FOUND"] = "transaction_not_found";
  AptosErrorCode2["TABLE_ITEM_NOT_FOUND"] = "table_item_not_found";
  AptosErrorCode2["BLOCK_NOT_FOUND"] = "block_not_found";
  AptosErrorCode2["STATE_VALUE_NOT_FOUND"] = "state_value_not_found";
  AptosErrorCode2["VERSION_PRUNED"] = "version_pruned";
  AptosErrorCode2["BLOCK_PRUNED"] = "block_pruned";
  AptosErrorCode2["INVALID_INPUT"] = "invalid_input";
  AptosErrorCode2["INVALID_TRANSACTION_UPDATE"] = "invalid_transaction_update";
  AptosErrorCode2["SEQUENCE_NUMBER_TOO_OLD"] = "sequence_number_too_old";
  AptosErrorCode2["VM_ERROR"] = "vm_error";
  AptosErrorCode2["HEALTH_CHECK_FAILED"] = "health_check_failed";
  AptosErrorCode2["MEMPOOL_IS_FULL"] = "mempool_is_full";
  AptosErrorCode2["INTERNAL_ERROR"] = "internal_error";
  AptosErrorCode2["WEB_FRAMEWORK_ERROR"] = "web_framework_error";
  AptosErrorCode2["BCS_NOT_SUPPORTED"] = "bcs_not_supported";
  AptosErrorCode2["API_DISABLED"] = "api_disabled";
  return AptosErrorCode2;
})(AptosErrorCode || {});

// src/generated/models/MoveFunctionVisibility.ts
var MoveFunctionVisibility = /* @__PURE__ */(MoveFunctionVisibility2 => {
  MoveFunctionVisibility2["PRIVATE"] = "private";
  MoveFunctionVisibility2["PUBLIC"] = "public";
  MoveFunctionVisibility2["FRIEND"] = "friend";
  return MoveFunctionVisibility2;
})(MoveFunctionVisibility || {});

// src/generated/models/RoleType.ts
var RoleType = /* @__PURE__ */(RoleType2 => {
  RoleType2["VALIDATOR"] = "validator";
  RoleType2["FULL_NODE"] = "full_node";
  return RoleType2;
})(RoleType || {});

// src/indexer/generated/types.ts
var Account_Transactions_Select_Column = exports.Account_Transactions_Select_Column = /* @__PURE__ */(Account_Transactions_Select_Column2 => {
  Account_Transactions_Select_Column2["AccountAddress"] = "account_address";
  Account_Transactions_Select_Column2["TransactionVersion"] = "transaction_version";
  return Account_Transactions_Select_Column2;
})(Account_Transactions_Select_Column || {});
var Address_Events_Summary_Select_Column = exports.Address_Events_Summary_Select_Column = /* @__PURE__ */(Address_Events_Summary_Select_Column2 => {
  Address_Events_Summary_Select_Column2["AccountAddress"] = "account_address";
  Address_Events_Summary_Select_Column2["MinBlockHeight"] = "min_block_height";
  Address_Events_Summary_Select_Column2["NumDistinctVersions"] = "num_distinct_versions";
  return Address_Events_Summary_Select_Column2;
})(Address_Events_Summary_Select_Column || {});
var Address_Version_From_Events_Select_Column = exports.Address_Version_From_Events_Select_Column = /* @__PURE__ */(Address_Version_From_Events_Select_Column2 => {
  Address_Version_From_Events_Select_Column2["AccountAddress"] = "account_address";
  Address_Version_From_Events_Select_Column2["TransactionVersion"] = "transaction_version";
  return Address_Version_From_Events_Select_Column2;
})(Address_Version_From_Events_Select_Column || {});
var Address_Version_From_Move_Resources_Select_Column = exports.Address_Version_From_Move_Resources_Select_Column = /* @__PURE__ */(Address_Version_From_Move_Resources_Select_Column2 => {
  Address_Version_From_Move_Resources_Select_Column2["Address"] = "address";
  Address_Version_From_Move_Resources_Select_Column2["TransactionVersion"] = "transaction_version";
  return Address_Version_From_Move_Resources_Select_Column2;
})(Address_Version_From_Move_Resources_Select_Column || {});
var Block_Metadata_Transactions_Select_Column = exports.Block_Metadata_Transactions_Select_Column = /* @__PURE__ */(Block_Metadata_Transactions_Select_Column2 => {
  Block_Metadata_Transactions_Select_Column2["BlockHeight"] = "block_height";
  Block_Metadata_Transactions_Select_Column2["Epoch"] = "epoch";
  Block_Metadata_Transactions_Select_Column2["FailedProposerIndices"] = "failed_proposer_indices";
  Block_Metadata_Transactions_Select_Column2["Id"] = "id";
  Block_Metadata_Transactions_Select_Column2["PreviousBlockVotesBitvec"] = "previous_block_votes_bitvec";
  Block_Metadata_Transactions_Select_Column2["Proposer"] = "proposer";
  Block_Metadata_Transactions_Select_Column2["Round"] = "round";
  Block_Metadata_Transactions_Select_Column2["Timestamp"] = "timestamp";
  Block_Metadata_Transactions_Select_Column2["Version"] = "version";
  return Block_Metadata_Transactions_Select_Column2;
})(Block_Metadata_Transactions_Select_Column || {});
var Coin_Activities_Select_Column = exports.Coin_Activities_Select_Column = /* @__PURE__ */(Coin_Activities_Select_Column2 => {
  Coin_Activities_Select_Column2["ActivityType"] = "activity_type";
  Coin_Activities_Select_Column2["Amount"] = "amount";
  Coin_Activities_Select_Column2["BlockHeight"] = "block_height";
  Coin_Activities_Select_Column2["CoinType"] = "coin_type";
  Coin_Activities_Select_Column2["EntryFunctionIdStr"] = "entry_function_id_str";
  Coin_Activities_Select_Column2["EventAccountAddress"] = "event_account_address";
  Coin_Activities_Select_Column2["EventCreationNumber"] = "event_creation_number";
  Coin_Activities_Select_Column2["EventIndex"] = "event_index";
  Coin_Activities_Select_Column2["EventSequenceNumber"] = "event_sequence_number";
  Coin_Activities_Select_Column2["IsGasFee"] = "is_gas_fee";
  Coin_Activities_Select_Column2["IsTransactionSuccess"] = "is_transaction_success";
  Coin_Activities_Select_Column2["OwnerAddress"] = "owner_address";
  Coin_Activities_Select_Column2["StorageRefundAmount"] = "storage_refund_amount";
  Coin_Activities_Select_Column2["TransactionTimestamp"] = "transaction_timestamp";
  Coin_Activities_Select_Column2["TransactionVersion"] = "transaction_version";
  return Coin_Activities_Select_Column2;
})(Coin_Activities_Select_Column || {});
var Coin_Balances_Select_Column = exports.Coin_Balances_Select_Column = /* @__PURE__ */(Coin_Balances_Select_Column2 => {
  Coin_Balances_Select_Column2["Amount"] = "amount";
  Coin_Balances_Select_Column2["CoinType"] = "coin_type";
  Coin_Balances_Select_Column2["CoinTypeHash"] = "coin_type_hash";
  Coin_Balances_Select_Column2["OwnerAddress"] = "owner_address";
  Coin_Balances_Select_Column2["TransactionTimestamp"] = "transaction_timestamp";
  Coin_Balances_Select_Column2["TransactionVersion"] = "transaction_version";
  return Coin_Balances_Select_Column2;
})(Coin_Balances_Select_Column || {});
var Coin_Infos_Select_Column = exports.Coin_Infos_Select_Column = /* @__PURE__ */(Coin_Infos_Select_Column2 => {
  Coin_Infos_Select_Column2["CoinType"] = "coin_type";
  Coin_Infos_Select_Column2["CoinTypeHash"] = "coin_type_hash";
  Coin_Infos_Select_Column2["CreatorAddress"] = "creator_address";
  Coin_Infos_Select_Column2["Decimals"] = "decimals";
  Coin_Infos_Select_Column2["Name"] = "name";
  Coin_Infos_Select_Column2["SupplyAggregatorTableHandle"] = "supply_aggregator_table_handle";
  Coin_Infos_Select_Column2["SupplyAggregatorTableKey"] = "supply_aggregator_table_key";
  Coin_Infos_Select_Column2["Symbol"] = "symbol";
  Coin_Infos_Select_Column2["TransactionCreatedTimestamp"] = "transaction_created_timestamp";
  Coin_Infos_Select_Column2["TransactionVersionCreated"] = "transaction_version_created";
  return Coin_Infos_Select_Column2;
})(Coin_Infos_Select_Column || {});
var Coin_Supply_Select_Column = exports.Coin_Supply_Select_Column = /* @__PURE__ */(Coin_Supply_Select_Column2 => {
  Coin_Supply_Select_Column2["CoinType"] = "coin_type";
  Coin_Supply_Select_Column2["CoinTypeHash"] = "coin_type_hash";
  Coin_Supply_Select_Column2["Supply"] = "supply";
  Coin_Supply_Select_Column2["TransactionEpoch"] = "transaction_epoch";
  Coin_Supply_Select_Column2["TransactionTimestamp"] = "transaction_timestamp";
  Coin_Supply_Select_Column2["TransactionVersion"] = "transaction_version";
  return Coin_Supply_Select_Column2;
})(Coin_Supply_Select_Column || {});
var Collection_Datas_Select_Column = exports.Collection_Datas_Select_Column = /* @__PURE__ */(Collection_Datas_Select_Column2 => {
  Collection_Datas_Select_Column2["CollectionDataIdHash"] = "collection_data_id_hash";
  Collection_Datas_Select_Column2["CollectionName"] = "collection_name";
  Collection_Datas_Select_Column2["CreatorAddress"] = "creator_address";
  Collection_Datas_Select_Column2["Description"] = "description";
  Collection_Datas_Select_Column2["DescriptionMutable"] = "description_mutable";
  Collection_Datas_Select_Column2["Maximum"] = "maximum";
  Collection_Datas_Select_Column2["MaximumMutable"] = "maximum_mutable";
  Collection_Datas_Select_Column2["MetadataUri"] = "metadata_uri";
  Collection_Datas_Select_Column2["Supply"] = "supply";
  Collection_Datas_Select_Column2["TableHandle"] = "table_handle";
  Collection_Datas_Select_Column2["TransactionTimestamp"] = "transaction_timestamp";
  Collection_Datas_Select_Column2["TransactionVersion"] = "transaction_version";
  Collection_Datas_Select_Column2["UriMutable"] = "uri_mutable";
  return Collection_Datas_Select_Column2;
})(Collection_Datas_Select_Column || {});
var Current_Ans_Lookup_Select_Column = exports.Current_Ans_Lookup_Select_Column = /* @__PURE__ */(Current_Ans_Lookup_Select_Column2 => {
  Current_Ans_Lookup_Select_Column2["Domain"] = "domain";
  Current_Ans_Lookup_Select_Column2["ExpirationTimestamp"] = "expiration_timestamp";
  Current_Ans_Lookup_Select_Column2["IsDeleted"] = "is_deleted";
  Current_Ans_Lookup_Select_Column2["LastTransactionVersion"] = "last_transaction_version";
  Current_Ans_Lookup_Select_Column2["RegisteredAddress"] = "registered_address";
  Current_Ans_Lookup_Select_Column2["Subdomain"] = "subdomain";
  Current_Ans_Lookup_Select_Column2["TokenName"] = "token_name";
  return Current_Ans_Lookup_Select_Column2;
})(Current_Ans_Lookup_Select_Column || {});
var Current_Ans_Lookup_V2_Select_Column = exports.Current_Ans_Lookup_V2_Select_Column = /* @__PURE__ */(Current_Ans_Lookup_V2_Select_Column2 => {
  Current_Ans_Lookup_V2_Select_Column2["Domain"] = "domain";
  Current_Ans_Lookup_V2_Select_Column2["ExpirationTimestamp"] = "expiration_timestamp";
  Current_Ans_Lookup_V2_Select_Column2["IsDeleted"] = "is_deleted";
  Current_Ans_Lookup_V2_Select_Column2["LastTransactionVersion"] = "last_transaction_version";
  Current_Ans_Lookup_V2_Select_Column2["RegisteredAddress"] = "registered_address";
  Current_Ans_Lookup_V2_Select_Column2["Subdomain"] = "subdomain";
  Current_Ans_Lookup_V2_Select_Column2["TokenName"] = "token_name";
  Current_Ans_Lookup_V2_Select_Column2["TokenStandard"] = "token_standard";
  return Current_Ans_Lookup_V2_Select_Column2;
})(Current_Ans_Lookup_V2_Select_Column || {});
var Current_Aptos_Names_Select_Column = exports.Current_Aptos_Names_Select_Column = /* @__PURE__ */(Current_Aptos_Names_Select_Column2 => {
  Current_Aptos_Names_Select_Column2["Domain"] = "domain";
  Current_Aptos_Names_Select_Column2["DomainWithSuffix"] = "domain_with_suffix";
  Current_Aptos_Names_Select_Column2["ExpirationTimestamp"] = "expiration_timestamp";
  Current_Aptos_Names_Select_Column2["IsActive"] = "is_active";
  Current_Aptos_Names_Select_Column2["IsPrimary"] = "is_primary";
  Current_Aptos_Names_Select_Column2["LastTransactionVersion"] = "last_transaction_version";
  Current_Aptos_Names_Select_Column2["OwnerAddress"] = "owner_address";
  Current_Aptos_Names_Select_Column2["RegisteredAddress"] = "registered_address";
  Current_Aptos_Names_Select_Column2["Subdomain"] = "subdomain";
  Current_Aptos_Names_Select_Column2["TokenName"] = "token_name";
  Current_Aptos_Names_Select_Column2["TokenStandard"] = "token_standard";
  return Current_Aptos_Names_Select_Column2;
})(Current_Aptos_Names_Select_Column || {});
var Current_Coin_Balances_Select_Column = exports.Current_Coin_Balances_Select_Column = /* @__PURE__ */(Current_Coin_Balances_Select_Column2 => {
  Current_Coin_Balances_Select_Column2["Amount"] = "amount";
  Current_Coin_Balances_Select_Column2["CoinType"] = "coin_type";
  Current_Coin_Balances_Select_Column2["CoinTypeHash"] = "coin_type_hash";
  Current_Coin_Balances_Select_Column2["LastTransactionTimestamp"] = "last_transaction_timestamp";
  Current_Coin_Balances_Select_Column2["LastTransactionVersion"] = "last_transaction_version";
  Current_Coin_Balances_Select_Column2["OwnerAddress"] = "owner_address";
  return Current_Coin_Balances_Select_Column2;
})(Current_Coin_Balances_Select_Column || {});
var Current_Collection_Datas_Select_Column = exports.Current_Collection_Datas_Select_Column = /* @__PURE__ */(Current_Collection_Datas_Select_Column2 => {
  Current_Collection_Datas_Select_Column2["CollectionDataIdHash"] = "collection_data_id_hash";
  Current_Collection_Datas_Select_Column2["CollectionName"] = "collection_name";
  Current_Collection_Datas_Select_Column2["CreatorAddress"] = "creator_address";
  Current_Collection_Datas_Select_Column2["Description"] = "description";
  Current_Collection_Datas_Select_Column2["DescriptionMutable"] = "description_mutable";
  Current_Collection_Datas_Select_Column2["LastTransactionTimestamp"] = "last_transaction_timestamp";
  Current_Collection_Datas_Select_Column2["LastTransactionVersion"] = "last_transaction_version";
  Current_Collection_Datas_Select_Column2["Maximum"] = "maximum";
  Current_Collection_Datas_Select_Column2["MaximumMutable"] = "maximum_mutable";
  Current_Collection_Datas_Select_Column2["MetadataUri"] = "metadata_uri";
  Current_Collection_Datas_Select_Column2["Supply"] = "supply";
  Current_Collection_Datas_Select_Column2["TableHandle"] = "table_handle";
  Current_Collection_Datas_Select_Column2["UriMutable"] = "uri_mutable";
  return Current_Collection_Datas_Select_Column2;
})(Current_Collection_Datas_Select_Column || {});
var Current_Collection_Ownership_V2_View_Select_Column = exports.Current_Collection_Ownership_V2_View_Select_Column = /* @__PURE__ */(Current_Collection_Ownership_V2_View_Select_Column2 => {
  Current_Collection_Ownership_V2_View_Select_Column2["CollectionId"] = "collection_id";
  Current_Collection_Ownership_V2_View_Select_Column2["CollectionName"] = "collection_name";
  Current_Collection_Ownership_V2_View_Select_Column2["CollectionUri"] = "collection_uri";
  Current_Collection_Ownership_V2_View_Select_Column2["CreatorAddress"] = "creator_address";
  Current_Collection_Ownership_V2_View_Select_Column2["DistinctTokens"] = "distinct_tokens";
  Current_Collection_Ownership_V2_View_Select_Column2["LastTransactionVersion"] = "last_transaction_version";
  Current_Collection_Ownership_V2_View_Select_Column2["OwnerAddress"] = "owner_address";
  Current_Collection_Ownership_V2_View_Select_Column2["SingleTokenUri"] = "single_token_uri";
  return Current_Collection_Ownership_V2_View_Select_Column2;
})(Current_Collection_Ownership_V2_View_Select_Column || {});
var Current_Collections_V2_Select_Column = exports.Current_Collections_V2_Select_Column = /* @__PURE__ */(Current_Collections_V2_Select_Column2 => {
  Current_Collections_V2_Select_Column2["CollectionId"] = "collection_id";
  Current_Collections_V2_Select_Column2["CollectionName"] = "collection_name";
  Current_Collections_V2_Select_Column2["CreatorAddress"] = "creator_address";
  Current_Collections_V2_Select_Column2["CurrentSupply"] = "current_supply";
  Current_Collections_V2_Select_Column2["Description"] = "description";
  Current_Collections_V2_Select_Column2["LastTransactionTimestamp"] = "last_transaction_timestamp";
  Current_Collections_V2_Select_Column2["LastTransactionVersion"] = "last_transaction_version";
  Current_Collections_V2_Select_Column2["MaxSupply"] = "max_supply";
  Current_Collections_V2_Select_Column2["MutableDescription"] = "mutable_description";
  Current_Collections_V2_Select_Column2["MutableUri"] = "mutable_uri";
  Current_Collections_V2_Select_Column2["TableHandleV1"] = "table_handle_v1";
  Current_Collections_V2_Select_Column2["TokenStandard"] = "token_standard";
  Current_Collections_V2_Select_Column2["TotalMintedV2"] = "total_minted_v2";
  Current_Collections_V2_Select_Column2["Uri"] = "uri";
  return Current_Collections_V2_Select_Column2;
})(Current_Collections_V2_Select_Column || {});
var Current_Delegated_Staking_Pool_Balances_Select_Column = exports.Current_Delegated_Staking_Pool_Balances_Select_Column = /* @__PURE__ */(Current_Delegated_Staking_Pool_Balances_Select_Column2 => {
  Current_Delegated_Staking_Pool_Balances_Select_Column2["ActiveTableHandle"] = "active_table_handle";
  Current_Delegated_Staking_Pool_Balances_Select_Column2["InactiveTableHandle"] = "inactive_table_handle";
  Current_Delegated_Staking_Pool_Balances_Select_Column2["LastTransactionVersion"] = "last_transaction_version";
  Current_Delegated_Staking_Pool_Balances_Select_Column2["OperatorCommissionPercentage"] = "operator_commission_percentage";
  Current_Delegated_Staking_Pool_Balances_Select_Column2["StakingPoolAddress"] = "staking_pool_address";
  Current_Delegated_Staking_Pool_Balances_Select_Column2["TotalCoins"] = "total_coins";
  Current_Delegated_Staking_Pool_Balances_Select_Column2["TotalShares"] = "total_shares";
  return Current_Delegated_Staking_Pool_Balances_Select_Column2;
})(Current_Delegated_Staking_Pool_Balances_Select_Column || {});
var Current_Delegated_Voter_Select_Column = exports.Current_Delegated_Voter_Select_Column = /* @__PURE__ */(Current_Delegated_Voter_Select_Column2 => {
  Current_Delegated_Voter_Select_Column2["DelegationPoolAddress"] = "delegation_pool_address";
  Current_Delegated_Voter_Select_Column2["DelegatorAddress"] = "delegator_address";
  Current_Delegated_Voter_Select_Column2["LastTransactionTimestamp"] = "last_transaction_timestamp";
  Current_Delegated_Voter_Select_Column2["LastTransactionVersion"] = "last_transaction_version";
  Current_Delegated_Voter_Select_Column2["PendingVoter"] = "pending_voter";
  Current_Delegated_Voter_Select_Column2["TableHandle"] = "table_handle";
  Current_Delegated_Voter_Select_Column2["Voter"] = "voter";
  return Current_Delegated_Voter_Select_Column2;
})(Current_Delegated_Voter_Select_Column || {});
var Current_Delegator_Balances_Select_Column = exports.Current_Delegator_Balances_Select_Column = /* @__PURE__ */(Current_Delegator_Balances_Select_Column2 => {
  Current_Delegator_Balances_Select_Column2["DelegatorAddress"] = "delegator_address";
  Current_Delegator_Balances_Select_Column2["LastTransactionVersion"] = "last_transaction_version";
  Current_Delegator_Balances_Select_Column2["ParentTableHandle"] = "parent_table_handle";
  Current_Delegator_Balances_Select_Column2["PoolAddress"] = "pool_address";
  Current_Delegator_Balances_Select_Column2["PoolType"] = "pool_type";
  Current_Delegator_Balances_Select_Column2["Shares"] = "shares";
  Current_Delegator_Balances_Select_Column2["TableHandle"] = "table_handle";
  return Current_Delegator_Balances_Select_Column2;
})(Current_Delegator_Balances_Select_Column || {});
var Current_Fungible_Asset_Balances_Select_Column = exports.Current_Fungible_Asset_Balances_Select_Column = /* @__PURE__ */(Current_Fungible_Asset_Balances_Select_Column2 => {
  Current_Fungible_Asset_Balances_Select_Column2["Amount"] = "amount";
  Current_Fungible_Asset_Balances_Select_Column2["AssetType"] = "asset_type";
  Current_Fungible_Asset_Balances_Select_Column2["IsFrozen"] = "is_frozen";
  Current_Fungible_Asset_Balances_Select_Column2["IsPrimary"] = "is_primary";
  Current_Fungible_Asset_Balances_Select_Column2["LastTransactionTimestamp"] = "last_transaction_timestamp";
  Current_Fungible_Asset_Balances_Select_Column2["LastTransactionVersion"] = "last_transaction_version";
  Current_Fungible_Asset_Balances_Select_Column2["OwnerAddress"] = "owner_address";
  Current_Fungible_Asset_Balances_Select_Column2["StorageId"] = "storage_id";
  Current_Fungible_Asset_Balances_Select_Column2["TokenStandard"] = "token_standard";
  return Current_Fungible_Asset_Balances_Select_Column2;
})(Current_Fungible_Asset_Balances_Select_Column || {});
var Current_Objects_Select_Column = exports.Current_Objects_Select_Column = /* @__PURE__ */(Current_Objects_Select_Column2 => {
  Current_Objects_Select_Column2["AllowUngatedTransfer"] = "allow_ungated_transfer";
  Current_Objects_Select_Column2["IsDeleted"] = "is_deleted";
  Current_Objects_Select_Column2["LastGuidCreationNum"] = "last_guid_creation_num";
  Current_Objects_Select_Column2["LastTransactionVersion"] = "last_transaction_version";
  Current_Objects_Select_Column2["ObjectAddress"] = "object_address";
  Current_Objects_Select_Column2["OwnerAddress"] = "owner_address";
  Current_Objects_Select_Column2["StateKeyHash"] = "state_key_hash";
  return Current_Objects_Select_Column2;
})(Current_Objects_Select_Column || {});
var Current_Staking_Pool_Voter_Select_Column = exports.Current_Staking_Pool_Voter_Select_Column = /* @__PURE__ */(Current_Staking_Pool_Voter_Select_Column2 => {
  Current_Staking_Pool_Voter_Select_Column2["LastTransactionVersion"] = "last_transaction_version";
  Current_Staking_Pool_Voter_Select_Column2["OperatorAddress"] = "operator_address";
  Current_Staking_Pool_Voter_Select_Column2["StakingPoolAddress"] = "staking_pool_address";
  Current_Staking_Pool_Voter_Select_Column2["VoterAddress"] = "voter_address";
  return Current_Staking_Pool_Voter_Select_Column2;
})(Current_Staking_Pool_Voter_Select_Column || {});
var Current_Table_Items_Select_Column = exports.Current_Table_Items_Select_Column = /* @__PURE__ */(Current_Table_Items_Select_Column2 => {
  Current_Table_Items_Select_Column2["DecodedKey"] = "decoded_key";
  Current_Table_Items_Select_Column2["DecodedValue"] = "decoded_value";
  Current_Table_Items_Select_Column2["IsDeleted"] = "is_deleted";
  Current_Table_Items_Select_Column2["Key"] = "key";
  Current_Table_Items_Select_Column2["KeyHash"] = "key_hash";
  Current_Table_Items_Select_Column2["LastTransactionVersion"] = "last_transaction_version";
  Current_Table_Items_Select_Column2["TableHandle"] = "table_handle";
  return Current_Table_Items_Select_Column2;
})(Current_Table_Items_Select_Column || {});
var Current_Token_Datas_Select_Column = exports.Current_Token_Datas_Select_Column = /* @__PURE__ */(Current_Token_Datas_Select_Column2 => {
  Current_Token_Datas_Select_Column2["CollectionDataIdHash"] = "collection_data_id_hash";
  Current_Token_Datas_Select_Column2["CollectionName"] = "collection_name";
  Current_Token_Datas_Select_Column2["CreatorAddress"] = "creator_address";
  Current_Token_Datas_Select_Column2["DefaultProperties"] = "default_properties";
  Current_Token_Datas_Select_Column2["Description"] = "description";
  Current_Token_Datas_Select_Column2["DescriptionMutable"] = "description_mutable";
  Current_Token_Datas_Select_Column2["LargestPropertyVersion"] = "largest_property_version";
  Current_Token_Datas_Select_Column2["LastTransactionTimestamp"] = "last_transaction_timestamp";
  Current_Token_Datas_Select_Column2["LastTransactionVersion"] = "last_transaction_version";
  Current_Token_Datas_Select_Column2["Maximum"] = "maximum";
  Current_Token_Datas_Select_Column2["MaximumMutable"] = "maximum_mutable";
  Current_Token_Datas_Select_Column2["MetadataUri"] = "metadata_uri";
  Current_Token_Datas_Select_Column2["Name"] = "name";
  Current_Token_Datas_Select_Column2["PayeeAddress"] = "payee_address";
  Current_Token_Datas_Select_Column2["PropertiesMutable"] = "properties_mutable";
  Current_Token_Datas_Select_Column2["RoyaltyMutable"] = "royalty_mutable";
  Current_Token_Datas_Select_Column2["RoyaltyPointsDenominator"] = "royalty_points_denominator";
  Current_Token_Datas_Select_Column2["RoyaltyPointsNumerator"] = "royalty_points_numerator";
  Current_Token_Datas_Select_Column2["Supply"] = "supply";
  Current_Token_Datas_Select_Column2["TokenDataIdHash"] = "token_data_id_hash";
  Current_Token_Datas_Select_Column2["UriMutable"] = "uri_mutable";
  return Current_Token_Datas_Select_Column2;
})(Current_Token_Datas_Select_Column || {});
var Current_Token_Datas_V2_Select_Column = exports.Current_Token_Datas_V2_Select_Column = /* @__PURE__ */(Current_Token_Datas_V2_Select_Column2 => {
  Current_Token_Datas_V2_Select_Column2["CollectionId"] = "collection_id";
  Current_Token_Datas_V2_Select_Column2["Description"] = "description";
  Current_Token_Datas_V2_Select_Column2["IsFungibleV2"] = "is_fungible_v2";
  Current_Token_Datas_V2_Select_Column2["LargestPropertyVersionV1"] = "largest_property_version_v1";
  Current_Token_Datas_V2_Select_Column2["LastTransactionTimestamp"] = "last_transaction_timestamp";
  Current_Token_Datas_V2_Select_Column2["LastTransactionVersion"] = "last_transaction_version";
  Current_Token_Datas_V2_Select_Column2["Maximum"] = "maximum";
  Current_Token_Datas_V2_Select_Column2["Supply"] = "supply";
  Current_Token_Datas_V2_Select_Column2["TokenDataId"] = "token_data_id";
  Current_Token_Datas_V2_Select_Column2["TokenName"] = "token_name";
  Current_Token_Datas_V2_Select_Column2["TokenProperties"] = "token_properties";
  Current_Token_Datas_V2_Select_Column2["TokenStandard"] = "token_standard";
  Current_Token_Datas_V2_Select_Column2["TokenUri"] = "token_uri";
  return Current_Token_Datas_V2_Select_Column2;
})(Current_Token_Datas_V2_Select_Column || {});
var Current_Token_Ownerships_Select_Column = exports.Current_Token_Ownerships_Select_Column = /* @__PURE__ */(Current_Token_Ownerships_Select_Column2 => {
  Current_Token_Ownerships_Select_Column2["Amount"] = "amount";
  Current_Token_Ownerships_Select_Column2["CollectionDataIdHash"] = "collection_data_id_hash";
  Current_Token_Ownerships_Select_Column2["CollectionName"] = "collection_name";
  Current_Token_Ownerships_Select_Column2["CreatorAddress"] = "creator_address";
  Current_Token_Ownerships_Select_Column2["LastTransactionTimestamp"] = "last_transaction_timestamp";
  Current_Token_Ownerships_Select_Column2["LastTransactionVersion"] = "last_transaction_version";
  Current_Token_Ownerships_Select_Column2["Name"] = "name";
  Current_Token_Ownerships_Select_Column2["OwnerAddress"] = "owner_address";
  Current_Token_Ownerships_Select_Column2["PropertyVersion"] = "property_version";
  Current_Token_Ownerships_Select_Column2["TableType"] = "table_type";
  Current_Token_Ownerships_Select_Column2["TokenDataIdHash"] = "token_data_id_hash";
  Current_Token_Ownerships_Select_Column2["TokenProperties"] = "token_properties";
  return Current_Token_Ownerships_Select_Column2;
})(Current_Token_Ownerships_Select_Column || {});
var Current_Token_Ownerships_V2_Select_Column = exports.Current_Token_Ownerships_V2_Select_Column = /* @__PURE__ */(Current_Token_Ownerships_V2_Select_Column2 => {
  Current_Token_Ownerships_V2_Select_Column2["Amount"] = "amount";
  Current_Token_Ownerships_V2_Select_Column2["IsFungibleV2"] = "is_fungible_v2";
  Current_Token_Ownerships_V2_Select_Column2["IsSoulboundV2"] = "is_soulbound_v2";
  Current_Token_Ownerships_V2_Select_Column2["LastTransactionTimestamp"] = "last_transaction_timestamp";
  Current_Token_Ownerships_V2_Select_Column2["LastTransactionVersion"] = "last_transaction_version";
  Current_Token_Ownerships_V2_Select_Column2["OwnerAddress"] = "owner_address";
  Current_Token_Ownerships_V2_Select_Column2["PropertyVersionV1"] = "property_version_v1";
  Current_Token_Ownerships_V2_Select_Column2["StorageId"] = "storage_id";
  Current_Token_Ownerships_V2_Select_Column2["TableTypeV1"] = "table_type_v1";
  Current_Token_Ownerships_V2_Select_Column2["TokenDataId"] = "token_data_id";
  Current_Token_Ownerships_V2_Select_Column2["TokenPropertiesMutatedV1"] = "token_properties_mutated_v1";
  Current_Token_Ownerships_V2_Select_Column2["TokenStandard"] = "token_standard";
  return Current_Token_Ownerships_V2_Select_Column2;
})(Current_Token_Ownerships_V2_Select_Column || {});
var Current_Token_Pending_Claims_Select_Column = exports.Current_Token_Pending_Claims_Select_Column = /* @__PURE__ */(Current_Token_Pending_Claims_Select_Column2 => {
  Current_Token_Pending_Claims_Select_Column2["Amount"] = "amount";
  Current_Token_Pending_Claims_Select_Column2["CollectionDataIdHash"] = "collection_data_id_hash";
  Current_Token_Pending_Claims_Select_Column2["CollectionId"] = "collection_id";
  Current_Token_Pending_Claims_Select_Column2["CollectionName"] = "collection_name";
  Current_Token_Pending_Claims_Select_Column2["CreatorAddress"] = "creator_address";
  Current_Token_Pending_Claims_Select_Column2["FromAddress"] = "from_address";
  Current_Token_Pending_Claims_Select_Column2["LastTransactionTimestamp"] = "last_transaction_timestamp";
  Current_Token_Pending_Claims_Select_Column2["LastTransactionVersion"] = "last_transaction_version";
  Current_Token_Pending_Claims_Select_Column2["Name"] = "name";
  Current_Token_Pending_Claims_Select_Column2["PropertyVersion"] = "property_version";
  Current_Token_Pending_Claims_Select_Column2["TableHandle"] = "table_handle";
  Current_Token_Pending_Claims_Select_Column2["ToAddress"] = "to_address";
  Current_Token_Pending_Claims_Select_Column2["TokenDataId"] = "token_data_id";
  Current_Token_Pending_Claims_Select_Column2["TokenDataIdHash"] = "token_data_id_hash";
  return Current_Token_Pending_Claims_Select_Column2;
})(Current_Token_Pending_Claims_Select_Column || {});
var Cursor_Ordering = exports.Cursor_Ordering = /* @__PURE__ */(Cursor_Ordering2 => {
  Cursor_Ordering2["Asc"] = "ASC";
  Cursor_Ordering2["Desc"] = "DESC";
  return Cursor_Ordering2;
})(Cursor_Ordering || {});
var Delegated_Staking_Activities_Select_Column = exports.Delegated_Staking_Activities_Select_Column = /* @__PURE__ */(Delegated_Staking_Activities_Select_Column2 => {
  Delegated_Staking_Activities_Select_Column2["Amount"] = "amount";
  Delegated_Staking_Activities_Select_Column2["DelegatorAddress"] = "delegator_address";
  Delegated_Staking_Activities_Select_Column2["EventIndex"] = "event_index";
  Delegated_Staking_Activities_Select_Column2["EventType"] = "event_type";
  Delegated_Staking_Activities_Select_Column2["PoolAddress"] = "pool_address";
  Delegated_Staking_Activities_Select_Column2["TransactionVersion"] = "transaction_version";
  return Delegated_Staking_Activities_Select_Column2;
})(Delegated_Staking_Activities_Select_Column || {});
var Delegated_Staking_Pools_Select_Column = exports.Delegated_Staking_Pools_Select_Column = /* @__PURE__ */(Delegated_Staking_Pools_Select_Column2 => {
  Delegated_Staking_Pools_Select_Column2["FirstTransactionVersion"] = "first_transaction_version";
  Delegated_Staking_Pools_Select_Column2["StakingPoolAddress"] = "staking_pool_address";
  return Delegated_Staking_Pools_Select_Column2;
})(Delegated_Staking_Pools_Select_Column || {});
var Delegator_Distinct_Pool_Select_Column = exports.Delegator_Distinct_Pool_Select_Column = /* @__PURE__ */(Delegator_Distinct_Pool_Select_Column2 => {
  Delegator_Distinct_Pool_Select_Column2["DelegatorAddress"] = "delegator_address";
  Delegator_Distinct_Pool_Select_Column2["PoolAddress"] = "pool_address";
  return Delegator_Distinct_Pool_Select_Column2;
})(Delegator_Distinct_Pool_Select_Column || {});
var Events_Select_Column = exports.Events_Select_Column = /* @__PURE__ */(Events_Select_Column2 => {
  Events_Select_Column2["AccountAddress"] = "account_address";
  Events_Select_Column2["CreationNumber"] = "creation_number";
  Events_Select_Column2["Data"] = "data";
  Events_Select_Column2["EventIndex"] = "event_index";
  Events_Select_Column2["IndexedType"] = "indexed_type";
  Events_Select_Column2["SequenceNumber"] = "sequence_number";
  Events_Select_Column2["TransactionBlockHeight"] = "transaction_block_height";
  Events_Select_Column2["TransactionVersion"] = "transaction_version";
  Events_Select_Column2["Type"] = "type";
  return Events_Select_Column2;
})(Events_Select_Column || {});
var Fungible_Asset_Activities_Select_Column = exports.Fungible_Asset_Activities_Select_Column = /* @__PURE__ */(Fungible_Asset_Activities_Select_Column2 => {
  Fungible_Asset_Activities_Select_Column2["Amount"] = "amount";
  Fungible_Asset_Activities_Select_Column2["AssetType"] = "asset_type";
  Fungible_Asset_Activities_Select_Column2["BlockHeight"] = "block_height";
  Fungible_Asset_Activities_Select_Column2["EntryFunctionIdStr"] = "entry_function_id_str";
  Fungible_Asset_Activities_Select_Column2["EventIndex"] = "event_index";
  Fungible_Asset_Activities_Select_Column2["GasFeePayerAddress"] = "gas_fee_payer_address";
  Fungible_Asset_Activities_Select_Column2["IsFrozen"] = "is_frozen";
  Fungible_Asset_Activities_Select_Column2["IsGasFee"] = "is_gas_fee";
  Fungible_Asset_Activities_Select_Column2["IsTransactionSuccess"] = "is_transaction_success";
  Fungible_Asset_Activities_Select_Column2["OwnerAddress"] = "owner_address";
  Fungible_Asset_Activities_Select_Column2["StorageId"] = "storage_id";
  Fungible_Asset_Activities_Select_Column2["StorageRefundAmount"] = "storage_refund_amount";
  Fungible_Asset_Activities_Select_Column2["TokenStandard"] = "token_standard";
  Fungible_Asset_Activities_Select_Column2["TransactionTimestamp"] = "transaction_timestamp";
  Fungible_Asset_Activities_Select_Column2["TransactionVersion"] = "transaction_version";
  Fungible_Asset_Activities_Select_Column2["Type"] = "type";
  return Fungible_Asset_Activities_Select_Column2;
})(Fungible_Asset_Activities_Select_Column || {});
var Fungible_Asset_Metadata_Select_Column = exports.Fungible_Asset_Metadata_Select_Column = /* @__PURE__ */(Fungible_Asset_Metadata_Select_Column2 => {
  Fungible_Asset_Metadata_Select_Column2["AssetType"] = "asset_type";
  Fungible_Asset_Metadata_Select_Column2["CreatorAddress"] = "creator_address";
  Fungible_Asset_Metadata_Select_Column2["Decimals"] = "decimals";
  Fungible_Asset_Metadata_Select_Column2["IconUri"] = "icon_uri";
  Fungible_Asset_Metadata_Select_Column2["LastTransactionTimestamp"] = "last_transaction_timestamp";
  Fungible_Asset_Metadata_Select_Column2["LastTransactionVersion"] = "last_transaction_version";
  Fungible_Asset_Metadata_Select_Column2["Name"] = "name";
  Fungible_Asset_Metadata_Select_Column2["ProjectUri"] = "project_uri";
  Fungible_Asset_Metadata_Select_Column2["SupplyAggregatorTableHandleV1"] = "supply_aggregator_table_handle_v1";
  Fungible_Asset_Metadata_Select_Column2["SupplyAggregatorTableKeyV1"] = "supply_aggregator_table_key_v1";
  Fungible_Asset_Metadata_Select_Column2["Symbol"] = "symbol";
  Fungible_Asset_Metadata_Select_Column2["TokenStandard"] = "token_standard";
  return Fungible_Asset_Metadata_Select_Column2;
})(Fungible_Asset_Metadata_Select_Column || {});
var Indexer_Status_Select_Column = exports.Indexer_Status_Select_Column = /* @__PURE__ */(Indexer_Status_Select_Column2 => {
  Indexer_Status_Select_Column2["Db"] = "db";
  Indexer_Status_Select_Column2["IsIndexerUp"] = "is_indexer_up";
  return Indexer_Status_Select_Column2;
})(Indexer_Status_Select_Column || {});
var Ledger_Infos_Select_Column = exports.Ledger_Infos_Select_Column = /* @__PURE__ */(Ledger_Infos_Select_Column2 => {
  Ledger_Infos_Select_Column2["ChainId"] = "chain_id";
  return Ledger_Infos_Select_Column2;
})(Ledger_Infos_Select_Column || {});
var Move_Resources_Select_Column = exports.Move_Resources_Select_Column = /* @__PURE__ */(Move_Resources_Select_Column2 => {
  Move_Resources_Select_Column2["Address"] = "address";
  Move_Resources_Select_Column2["TransactionVersion"] = "transaction_version";
  return Move_Resources_Select_Column2;
})(Move_Resources_Select_Column || {});
var Nft_Marketplace_V2_Current_Nft_Marketplace_Auctions_Select_Column = exports.Nft_Marketplace_V2_Current_Nft_Marketplace_Auctions_Select_Column = /* @__PURE__ */(Nft_Marketplace_V2_Current_Nft_Marketplace_Auctions_Select_Column2 => {
  Nft_Marketplace_V2_Current_Nft_Marketplace_Auctions_Select_Column2["BuyItNowPrice"] = "buy_it_now_price";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Auctions_Select_Column2["CoinType"] = "coin_type";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Auctions_Select_Column2["CollectionId"] = "collection_id";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Auctions_Select_Column2["ContractAddress"] = "contract_address";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Auctions_Select_Column2["CurrentBidPrice"] = "current_bid_price";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Auctions_Select_Column2["CurrentBidder"] = "current_bidder";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Auctions_Select_Column2["EntryFunctionIdStr"] = "entry_function_id_str";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Auctions_Select_Column2["ExpirationTime"] = "expiration_time";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Auctions_Select_Column2["FeeScheduleId"] = "fee_schedule_id";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Auctions_Select_Column2["IsDeleted"] = "is_deleted";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Auctions_Select_Column2["LastTransactionTimestamp"] = "last_transaction_timestamp";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Auctions_Select_Column2["LastTransactionVersion"] = "last_transaction_version";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Auctions_Select_Column2["ListingId"] = "listing_id";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Auctions_Select_Column2["Marketplace"] = "marketplace";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Auctions_Select_Column2["Seller"] = "seller";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Auctions_Select_Column2["StartingBidPrice"] = "starting_bid_price";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Auctions_Select_Column2["TokenAmount"] = "token_amount";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Auctions_Select_Column2["TokenDataId"] = "token_data_id";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Auctions_Select_Column2["TokenStandard"] = "token_standard";
  return Nft_Marketplace_V2_Current_Nft_Marketplace_Auctions_Select_Column2;
})(Nft_Marketplace_V2_Current_Nft_Marketplace_Auctions_Select_Column || {});
var Nft_Marketplace_V2_Current_Nft_Marketplace_Collection_Offers_Select_Column = exports.Nft_Marketplace_V2_Current_Nft_Marketplace_Collection_Offers_Select_Column = /* @__PURE__ */(Nft_Marketplace_V2_Current_Nft_Marketplace_Collection_Offers_Select_Column2 => {
  Nft_Marketplace_V2_Current_Nft_Marketplace_Collection_Offers_Select_Column2["Buyer"] = "buyer";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Collection_Offers_Select_Column2["CoinType"] = "coin_type";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Collection_Offers_Select_Column2["CollectionId"] = "collection_id";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Collection_Offers_Select_Column2["CollectionOfferId"] = "collection_offer_id";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Collection_Offers_Select_Column2["ContractAddress"] = "contract_address";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Collection_Offers_Select_Column2["EntryFunctionIdStr"] = "entry_function_id_str";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Collection_Offers_Select_Column2["ExpirationTime"] = "expiration_time";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Collection_Offers_Select_Column2["FeeScheduleId"] = "fee_schedule_id";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Collection_Offers_Select_Column2["IsDeleted"] = "is_deleted";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Collection_Offers_Select_Column2["ItemPrice"] = "item_price";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Collection_Offers_Select_Column2["LastTransactionTimestamp"] = "last_transaction_timestamp";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Collection_Offers_Select_Column2["LastTransactionVersion"] = "last_transaction_version";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Collection_Offers_Select_Column2["Marketplace"] = "marketplace";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Collection_Offers_Select_Column2["RemainingTokenAmount"] = "remaining_token_amount";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Collection_Offers_Select_Column2["TokenStandard"] = "token_standard";
  return Nft_Marketplace_V2_Current_Nft_Marketplace_Collection_Offers_Select_Column2;
})(Nft_Marketplace_V2_Current_Nft_Marketplace_Collection_Offers_Select_Column || {});
var Nft_Marketplace_V2_Current_Nft_Marketplace_Listings_Select_Column = exports.Nft_Marketplace_V2_Current_Nft_Marketplace_Listings_Select_Column = /* @__PURE__ */(Nft_Marketplace_V2_Current_Nft_Marketplace_Listings_Select_Column2 => {
  Nft_Marketplace_V2_Current_Nft_Marketplace_Listings_Select_Column2["CoinType"] = "coin_type";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Listings_Select_Column2["CollectionId"] = "collection_id";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Listings_Select_Column2["ContractAddress"] = "contract_address";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Listings_Select_Column2["EntryFunctionIdStr"] = "entry_function_id_str";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Listings_Select_Column2["FeeScheduleId"] = "fee_schedule_id";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Listings_Select_Column2["IsDeleted"] = "is_deleted";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Listings_Select_Column2["LastTransactionTimestamp"] = "last_transaction_timestamp";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Listings_Select_Column2["LastTransactionVersion"] = "last_transaction_version";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Listings_Select_Column2["ListingId"] = "listing_id";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Listings_Select_Column2["Marketplace"] = "marketplace";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Listings_Select_Column2["Price"] = "price";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Listings_Select_Column2["Seller"] = "seller";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Listings_Select_Column2["TokenAmount"] = "token_amount";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Listings_Select_Column2["TokenDataId"] = "token_data_id";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Listings_Select_Column2["TokenStandard"] = "token_standard";
  return Nft_Marketplace_V2_Current_Nft_Marketplace_Listings_Select_Column2;
})(Nft_Marketplace_V2_Current_Nft_Marketplace_Listings_Select_Column || {});
var Nft_Marketplace_V2_Current_Nft_Marketplace_Token_Offers_Select_Column = exports.Nft_Marketplace_V2_Current_Nft_Marketplace_Token_Offers_Select_Column = /* @__PURE__ */(Nft_Marketplace_V2_Current_Nft_Marketplace_Token_Offers_Select_Column2 => {
  Nft_Marketplace_V2_Current_Nft_Marketplace_Token_Offers_Select_Column2["Buyer"] = "buyer";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Token_Offers_Select_Column2["CoinType"] = "coin_type";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Token_Offers_Select_Column2["CollectionId"] = "collection_id";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Token_Offers_Select_Column2["ContractAddress"] = "contract_address";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Token_Offers_Select_Column2["EntryFunctionIdStr"] = "entry_function_id_str";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Token_Offers_Select_Column2["ExpirationTime"] = "expiration_time";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Token_Offers_Select_Column2["FeeScheduleId"] = "fee_schedule_id";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Token_Offers_Select_Column2["IsDeleted"] = "is_deleted";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Token_Offers_Select_Column2["LastTransactionTimestamp"] = "last_transaction_timestamp";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Token_Offers_Select_Column2["LastTransactionVersion"] = "last_transaction_version";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Token_Offers_Select_Column2["Marketplace"] = "marketplace";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Token_Offers_Select_Column2["OfferId"] = "offer_id";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Token_Offers_Select_Column2["Price"] = "price";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Token_Offers_Select_Column2["TokenAmount"] = "token_amount";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Token_Offers_Select_Column2["TokenDataId"] = "token_data_id";
  Nft_Marketplace_V2_Current_Nft_Marketplace_Token_Offers_Select_Column2["TokenStandard"] = "token_standard";
  return Nft_Marketplace_V2_Current_Nft_Marketplace_Token_Offers_Select_Column2;
})(Nft_Marketplace_V2_Current_Nft_Marketplace_Token_Offers_Select_Column || {});
var Nft_Marketplace_V2_Nft_Marketplace_Activities_Select_Column = exports.Nft_Marketplace_V2_Nft_Marketplace_Activities_Select_Column = /* @__PURE__ */(Nft_Marketplace_V2_Nft_Marketplace_Activities_Select_Column2 => {
  Nft_Marketplace_V2_Nft_Marketplace_Activities_Select_Column2["Buyer"] = "buyer";
  Nft_Marketplace_V2_Nft_Marketplace_Activities_Select_Column2["CoinType"] = "coin_type";
  Nft_Marketplace_V2_Nft_Marketplace_Activities_Select_Column2["CollectionId"] = "collection_id";
  Nft_Marketplace_V2_Nft_Marketplace_Activities_Select_Column2["CollectionName"] = "collection_name";
  Nft_Marketplace_V2_Nft_Marketplace_Activities_Select_Column2["ContractAddress"] = "contract_address";
  Nft_Marketplace_V2_Nft_Marketplace_Activities_Select_Column2["CreatorAddress"] = "creator_address";
  Nft_Marketplace_V2_Nft_Marketplace_Activities_Select_Column2["EntryFunctionIdStr"] = "entry_function_id_str";
  Nft_Marketplace_V2_Nft_Marketplace_Activities_Select_Column2["EventIndex"] = "event_index";
  Nft_Marketplace_V2_Nft_Marketplace_Activities_Select_Column2["EventType"] = "event_type";
  Nft_Marketplace_V2_Nft_Marketplace_Activities_Select_Column2["FeeScheduleId"] = "fee_schedule_id";
  Nft_Marketplace_V2_Nft_Marketplace_Activities_Select_Column2["Marketplace"] = "marketplace";
  Nft_Marketplace_V2_Nft_Marketplace_Activities_Select_Column2["OfferOrListingId"] = "offer_or_listing_id";
  Nft_Marketplace_V2_Nft_Marketplace_Activities_Select_Column2["Price"] = "price";
  Nft_Marketplace_V2_Nft_Marketplace_Activities_Select_Column2["PropertyVersion"] = "property_version";
  Nft_Marketplace_V2_Nft_Marketplace_Activities_Select_Column2["Seller"] = "seller";
  Nft_Marketplace_V2_Nft_Marketplace_Activities_Select_Column2["TokenAmount"] = "token_amount";
  Nft_Marketplace_V2_Nft_Marketplace_Activities_Select_Column2["TokenDataId"] = "token_data_id";
  Nft_Marketplace_V2_Nft_Marketplace_Activities_Select_Column2["TokenName"] = "token_name";
  Nft_Marketplace_V2_Nft_Marketplace_Activities_Select_Column2["TokenStandard"] = "token_standard";
  Nft_Marketplace_V2_Nft_Marketplace_Activities_Select_Column2["TransactionTimestamp"] = "transaction_timestamp";
  Nft_Marketplace_V2_Nft_Marketplace_Activities_Select_Column2["TransactionVersion"] = "transaction_version";
  return Nft_Marketplace_V2_Nft_Marketplace_Activities_Select_Column2;
})(Nft_Marketplace_V2_Nft_Marketplace_Activities_Select_Column || {});
var Nft_Metadata_Crawler_Parsed_Asset_Uris_Select_Column = exports.Nft_Metadata_Crawler_Parsed_Asset_Uris_Select_Column = /* @__PURE__ */(Nft_Metadata_Crawler_Parsed_Asset_Uris_Select_Column2 => {
  Nft_Metadata_Crawler_Parsed_Asset_Uris_Select_Column2["AnimationOptimizerRetryCount"] = "animation_optimizer_retry_count";
  Nft_Metadata_Crawler_Parsed_Asset_Uris_Select_Column2["AssetUri"] = "asset_uri";
  Nft_Metadata_Crawler_Parsed_Asset_Uris_Select_Column2["CdnAnimationUri"] = "cdn_animation_uri";
  Nft_Metadata_Crawler_Parsed_Asset_Uris_Select_Column2["CdnImageUri"] = "cdn_image_uri";
  Nft_Metadata_Crawler_Parsed_Asset_Uris_Select_Column2["CdnJsonUri"] = "cdn_json_uri";
  Nft_Metadata_Crawler_Parsed_Asset_Uris_Select_Column2["ImageOptimizerRetryCount"] = "image_optimizer_retry_count";
  Nft_Metadata_Crawler_Parsed_Asset_Uris_Select_Column2["JsonParserRetryCount"] = "json_parser_retry_count";
  Nft_Metadata_Crawler_Parsed_Asset_Uris_Select_Column2["RawAnimationUri"] = "raw_animation_uri";
  Nft_Metadata_Crawler_Parsed_Asset_Uris_Select_Column2["RawImageUri"] = "raw_image_uri";
  return Nft_Metadata_Crawler_Parsed_Asset_Uris_Select_Column2;
})(Nft_Metadata_Crawler_Parsed_Asset_Uris_Select_Column || {});
var Num_Active_Delegator_Per_Pool_Select_Column = exports.Num_Active_Delegator_Per_Pool_Select_Column = /* @__PURE__ */(Num_Active_Delegator_Per_Pool_Select_Column2 => {
  Num_Active_Delegator_Per_Pool_Select_Column2["NumActiveDelegator"] = "num_active_delegator";
  Num_Active_Delegator_Per_Pool_Select_Column2["PoolAddress"] = "pool_address";
  return Num_Active_Delegator_Per_Pool_Select_Column2;
})(Num_Active_Delegator_Per_Pool_Select_Column || {});
var Order_By = exports.Order_By = /* @__PURE__ */(Order_By2 => {
  Order_By2["Asc"] = "asc";
  Order_By2["AscNullsFirst"] = "asc_nulls_first";
  Order_By2["AscNullsLast"] = "asc_nulls_last";
  Order_By2["Desc"] = "desc";
  Order_By2["DescNullsFirst"] = "desc_nulls_first";
  Order_By2["DescNullsLast"] = "desc_nulls_last";
  return Order_By2;
})(Order_By || {});
var Processor_Status_Select_Column = exports.Processor_Status_Select_Column = /* @__PURE__ */(Processor_Status_Select_Column2 => {
  Processor_Status_Select_Column2["LastSuccessVersion"] = "last_success_version";
  Processor_Status_Select_Column2["LastUpdated"] = "last_updated";
  Processor_Status_Select_Column2["Processor"] = "processor";
  return Processor_Status_Select_Column2;
})(Processor_Status_Select_Column || {});
var Proposal_Votes_Select_Column = exports.Proposal_Votes_Select_Column = /* @__PURE__ */(Proposal_Votes_Select_Column2 => {
  Proposal_Votes_Select_Column2["NumVotes"] = "num_votes";
  Proposal_Votes_Select_Column2["ProposalId"] = "proposal_id";
  Proposal_Votes_Select_Column2["ShouldPass"] = "should_pass";
  Proposal_Votes_Select_Column2["StakingPoolAddress"] = "staking_pool_address";
  Proposal_Votes_Select_Column2["TransactionTimestamp"] = "transaction_timestamp";
  Proposal_Votes_Select_Column2["TransactionVersion"] = "transaction_version";
  Proposal_Votes_Select_Column2["VoterAddress"] = "voter_address";
  return Proposal_Votes_Select_Column2;
})(Proposal_Votes_Select_Column || {});
var Table_Items_Select_Column = exports.Table_Items_Select_Column = /* @__PURE__ */(Table_Items_Select_Column2 => {
  Table_Items_Select_Column2["DecodedKey"] = "decoded_key";
  Table_Items_Select_Column2["DecodedValue"] = "decoded_value";
  Table_Items_Select_Column2["Key"] = "key";
  Table_Items_Select_Column2["TableHandle"] = "table_handle";
  Table_Items_Select_Column2["TransactionVersion"] = "transaction_version";
  Table_Items_Select_Column2["WriteSetChangeIndex"] = "write_set_change_index";
  return Table_Items_Select_Column2;
})(Table_Items_Select_Column || {});
var Table_Metadatas_Select_Column = exports.Table_Metadatas_Select_Column = /* @__PURE__ */(Table_Metadatas_Select_Column2 => {
  Table_Metadatas_Select_Column2["Handle"] = "handle";
  Table_Metadatas_Select_Column2["KeyType"] = "key_type";
  Table_Metadatas_Select_Column2["ValueType"] = "value_type";
  return Table_Metadatas_Select_Column2;
})(Table_Metadatas_Select_Column || {});
var Token_Activities_Select_Column = exports.Token_Activities_Select_Column = /* @__PURE__ */(Token_Activities_Select_Column2 => {
  Token_Activities_Select_Column2["CoinAmount"] = "coin_amount";
  Token_Activities_Select_Column2["CoinType"] = "coin_type";
  Token_Activities_Select_Column2["CollectionDataIdHash"] = "collection_data_id_hash";
  Token_Activities_Select_Column2["CollectionName"] = "collection_name";
  Token_Activities_Select_Column2["CreatorAddress"] = "creator_address";
  Token_Activities_Select_Column2["EventAccountAddress"] = "event_account_address";
  Token_Activities_Select_Column2["EventCreationNumber"] = "event_creation_number";
  Token_Activities_Select_Column2["EventIndex"] = "event_index";
  Token_Activities_Select_Column2["EventSequenceNumber"] = "event_sequence_number";
  Token_Activities_Select_Column2["FromAddress"] = "from_address";
  Token_Activities_Select_Column2["Name"] = "name";
  Token_Activities_Select_Column2["PropertyVersion"] = "property_version";
  Token_Activities_Select_Column2["ToAddress"] = "to_address";
  Token_Activities_Select_Column2["TokenAmount"] = "token_amount";
  Token_Activities_Select_Column2["TokenDataIdHash"] = "token_data_id_hash";
  Token_Activities_Select_Column2["TransactionTimestamp"] = "transaction_timestamp";
  Token_Activities_Select_Column2["TransactionVersion"] = "transaction_version";
  Token_Activities_Select_Column2["TransferType"] = "transfer_type";
  return Token_Activities_Select_Column2;
})(Token_Activities_Select_Column || {});
var Token_Activities_V2_Select_Column = exports.Token_Activities_V2_Select_Column = /* @__PURE__ */(Token_Activities_V2_Select_Column2 => {
  Token_Activities_V2_Select_Column2["AfterValue"] = "after_value";
  Token_Activities_V2_Select_Column2["BeforeValue"] = "before_value";
  Token_Activities_V2_Select_Column2["EntryFunctionIdStr"] = "entry_function_id_str";
  Token_Activities_V2_Select_Column2["EventAccountAddress"] = "event_account_address";
  Token_Activities_V2_Select_Column2["EventIndex"] = "event_index";
  Token_Activities_V2_Select_Column2["FromAddress"] = "from_address";
  Token_Activities_V2_Select_Column2["IsFungibleV2"] = "is_fungible_v2";
  Token_Activities_V2_Select_Column2["PropertyVersionV1"] = "property_version_v1";
  Token_Activities_V2_Select_Column2["ToAddress"] = "to_address";
  Token_Activities_V2_Select_Column2["TokenAmount"] = "token_amount";
  Token_Activities_V2_Select_Column2["TokenDataId"] = "token_data_id";
  Token_Activities_V2_Select_Column2["TokenStandard"] = "token_standard";
  Token_Activities_V2_Select_Column2["TransactionTimestamp"] = "transaction_timestamp";
  Token_Activities_V2_Select_Column2["TransactionVersion"] = "transaction_version";
  Token_Activities_V2_Select_Column2["Type"] = "type";
  return Token_Activities_V2_Select_Column2;
})(Token_Activities_V2_Select_Column || {});
var Token_Datas_Select_Column = exports.Token_Datas_Select_Column = /* @__PURE__ */(Token_Datas_Select_Column2 => {
  Token_Datas_Select_Column2["CollectionDataIdHash"] = "collection_data_id_hash";
  Token_Datas_Select_Column2["CollectionName"] = "collection_name";
  Token_Datas_Select_Column2["CreatorAddress"] = "creator_address";
  Token_Datas_Select_Column2["DefaultProperties"] = "default_properties";
  Token_Datas_Select_Column2["Description"] = "description";
  Token_Datas_Select_Column2["DescriptionMutable"] = "description_mutable";
  Token_Datas_Select_Column2["LargestPropertyVersion"] = "largest_property_version";
  Token_Datas_Select_Column2["Maximum"] = "maximum";
  Token_Datas_Select_Column2["MaximumMutable"] = "maximum_mutable";
  Token_Datas_Select_Column2["MetadataUri"] = "metadata_uri";
  Token_Datas_Select_Column2["Name"] = "name";
  Token_Datas_Select_Column2["PayeeAddress"] = "payee_address";
  Token_Datas_Select_Column2["PropertiesMutable"] = "properties_mutable";
  Token_Datas_Select_Column2["RoyaltyMutable"] = "royalty_mutable";
  Token_Datas_Select_Column2["RoyaltyPointsDenominator"] = "royalty_points_denominator";
  Token_Datas_Select_Column2["RoyaltyPointsNumerator"] = "royalty_points_numerator";
  Token_Datas_Select_Column2["Supply"] = "supply";
  Token_Datas_Select_Column2["TokenDataIdHash"] = "token_data_id_hash";
  Token_Datas_Select_Column2["TransactionTimestamp"] = "transaction_timestamp";
  Token_Datas_Select_Column2["TransactionVersion"] = "transaction_version";
  Token_Datas_Select_Column2["UriMutable"] = "uri_mutable";
  return Token_Datas_Select_Column2;
})(Token_Datas_Select_Column || {});
var Token_Ownerships_Select_Column = exports.Token_Ownerships_Select_Column = /* @__PURE__ */(Token_Ownerships_Select_Column2 => {
  Token_Ownerships_Select_Column2["Amount"] = "amount";
  Token_Ownerships_Select_Column2["CollectionDataIdHash"] = "collection_data_id_hash";
  Token_Ownerships_Select_Column2["CollectionName"] = "collection_name";
  Token_Ownerships_Select_Column2["CreatorAddress"] = "creator_address";
  Token_Ownerships_Select_Column2["Name"] = "name";
  Token_Ownerships_Select_Column2["OwnerAddress"] = "owner_address";
  Token_Ownerships_Select_Column2["PropertyVersion"] = "property_version";
  Token_Ownerships_Select_Column2["TableHandle"] = "table_handle";
  Token_Ownerships_Select_Column2["TableType"] = "table_type";
  Token_Ownerships_Select_Column2["TokenDataIdHash"] = "token_data_id_hash";
  Token_Ownerships_Select_Column2["TransactionTimestamp"] = "transaction_timestamp";
  Token_Ownerships_Select_Column2["TransactionVersion"] = "transaction_version";
  return Token_Ownerships_Select_Column2;
})(Token_Ownerships_Select_Column || {});
var Tokens_Select_Column = exports.Tokens_Select_Column = /* @__PURE__ */(Tokens_Select_Column2 => {
  Tokens_Select_Column2["CollectionDataIdHash"] = "collection_data_id_hash";
  Tokens_Select_Column2["CollectionName"] = "collection_name";
  Tokens_Select_Column2["CreatorAddress"] = "creator_address";
  Tokens_Select_Column2["Name"] = "name";
  Tokens_Select_Column2["PropertyVersion"] = "property_version";
  Tokens_Select_Column2["TokenDataIdHash"] = "token_data_id_hash";
  Tokens_Select_Column2["TokenProperties"] = "token_properties";
  Tokens_Select_Column2["TransactionTimestamp"] = "transaction_timestamp";
  Tokens_Select_Column2["TransactionVersion"] = "transaction_version";
  return Tokens_Select_Column2;
})(Tokens_Select_Column || {});
var User_Transactions_Select_Column = exports.User_Transactions_Select_Column = /* @__PURE__ */(User_Transactions_Select_Column2 => {
  User_Transactions_Select_Column2["BlockHeight"] = "block_height";
  User_Transactions_Select_Column2["EntryFunctionIdStr"] = "entry_function_id_str";
  User_Transactions_Select_Column2["Epoch"] = "epoch";
  User_Transactions_Select_Column2["ExpirationTimestampSecs"] = "expiration_timestamp_secs";
  User_Transactions_Select_Column2["GasUnitPrice"] = "gas_unit_price";
  User_Transactions_Select_Column2["MaxGasAmount"] = "max_gas_amount";
  User_Transactions_Select_Column2["ParentSignatureType"] = "parent_signature_type";
  User_Transactions_Select_Column2["Sender"] = "sender";
  User_Transactions_Select_Column2["SequenceNumber"] = "sequence_number";
  User_Transactions_Select_Column2["Timestamp"] = "timestamp";
  User_Transactions_Select_Column2["Version"] = "version";
  return User_Transactions_Select_Column2;
})(User_Transactions_Select_Column || {});

},{"@aptos-labs/aptos-client":21,"@noble/hashes/hmac":26,"@noble/hashes/sha256":28,"@noble/hashes/sha3":29,"@noble/hashes/sha512":30,"@noble/hashes/utils":31,"@scure/bip39":32,"eventemitter3":84,"tweetnacl":85}],21:[function(require,module,exports){
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.browser.ts
var index_browser_exports = {};
__export(index_browser_exports, {
  default: () => aptosClient
});
module.exports = __toCommonJS(index_browser_exports);
var import_axios = __toESM(require("axios"));
async function aptosClient(options) {
  var _a;
  const { params, method, url, headers, body, overrides } = options;
  const requestConfig = {
    headers,
    method,
    url,
    params,
    data: body,
    withCredentials: (_a = overrides == null ? void 0 : overrides.WITH_CREDENTIALS) != null ? _a : true
  };
  try {
    const response = await (0, import_axios.default)(requestConfig);
    return {
      status: response.status,
      statusText: response.statusText,
      data: response.data,
      headers: response.headers,
      config: response.config
    };
  } catch (error) {
    const axiosError = error;
    if (axiosError.response) {
      return axiosError.response;
    }
    throw error;
  }
}

},{"axios":33}],22:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.output = exports.exists = exports.hash = exports.bytes = exports.bool = exports.number = void 0;
function number(n) {
    if (!Number.isSafeInteger(n) || n < 0)
        throw new Error(`Wrong positive integer: ${n}`);
}
exports.number = number;
function bool(b) {
    if (typeof b !== 'boolean')
        throw new Error(`Expected boolean, not ${b}`);
}
exports.bool = bool;
// copied from utils
function isBytes(a) {
    return (a instanceof Uint8Array ||
        (a != null && typeof a === 'object' && a.constructor.name === 'Uint8Array'));
}
function bytes(b, ...lengths) {
    if (!isBytes(b))
        throw new Error('Expected Uint8Array');
    if (lengths.length > 0 && !lengths.includes(b.length))
        throw new Error(`Expected Uint8Array of length ${lengths}, not of length=${b.length}`);
}
exports.bytes = bytes;
function hash(hash) {
    if (typeof hash !== 'function' || typeof hash.create !== 'function')
        throw new Error('Hash should be wrapped by utils.wrapConstructor');
    number(hash.outputLen);
    number(hash.blockLen);
}
exports.hash = hash;
function exists(instance, checkFinished = true) {
    if (instance.destroyed)
        throw new Error('Hash instance has been destroyed');
    if (checkFinished && instance.finished)
        throw new Error('Hash#digest() has already been called');
}
exports.exists = exists;
function output(out, instance) {
    bytes(out);
    const min = instance.outputLen;
    if (out.length < min) {
        throw new Error(`digestInto() expects output buffer of length at least ${min}`);
    }
}
exports.output = output;
const assert = { number, bool, bytes, hash, exists, output };
exports.default = assert;

},{}],23:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SHA2 = void 0;
const _assert_js_1 = require("./_assert.js");
const utils_js_1 = require("./utils.js");
// Polyfill for Safari 14
function setBigUint64(view, byteOffset, value, isLE) {
    if (typeof view.setBigUint64 === 'function')
        return view.setBigUint64(byteOffset, value, isLE);
    const _32n = BigInt(32);
    const _u32_max = BigInt(0xffffffff);
    const wh = Number((value >> _32n) & _u32_max);
    const wl = Number(value & _u32_max);
    const h = isLE ? 4 : 0;
    const l = isLE ? 0 : 4;
    view.setUint32(byteOffset + h, wh, isLE);
    view.setUint32(byteOffset + l, wl, isLE);
}
// Base SHA2 class (RFC 6234)
class SHA2 extends utils_js_1.Hash {
    constructor(blockLen, outputLen, padOffset, isLE) {
        super();
        this.blockLen = blockLen;
        this.outputLen = outputLen;
        this.padOffset = padOffset;
        this.isLE = isLE;
        this.finished = false;
        this.length = 0;
        this.pos = 0;
        this.destroyed = false;
        this.buffer = new Uint8Array(blockLen);
        this.view = (0, utils_js_1.createView)(this.buffer);
    }
    update(data) {
        (0, _assert_js_1.exists)(this);
        const { view, buffer, blockLen } = this;
        data = (0, utils_js_1.toBytes)(data);
        const len = data.length;
        for (let pos = 0; pos < len;) {
            const take = Math.min(blockLen - this.pos, len - pos);
            // Fast path: we have at least one block in input, cast it to view and process
            if (take === blockLen) {
                const dataView = (0, utils_js_1.createView)(data);
                for (; blockLen <= len - pos; pos += blockLen)
                    this.process(dataView, pos);
                continue;
            }
            buffer.set(data.subarray(pos, pos + take), this.pos);
            this.pos += take;
            pos += take;
            if (this.pos === blockLen) {
                this.process(view, 0);
                this.pos = 0;
            }
        }
        this.length += data.length;
        this.roundClean();
        return this;
    }
    digestInto(out) {
        (0, _assert_js_1.exists)(this);
        (0, _assert_js_1.output)(out, this);
        this.finished = true;
        // Padding
        // We can avoid allocation of buffer for padding completely if it
        // was previously not allocated here. But it won't change performance.
        const { buffer, view, blockLen, isLE } = this;
        let { pos } = this;
        // append the bit '1' to the message
        buffer[pos++] = 0b10000000;
        this.buffer.subarray(pos).fill(0);
        // we have less than padOffset left in buffer, so we cannot put length in current block, need process it and pad again
        if (this.padOffset > blockLen - pos) {
            this.process(view, 0);
            pos = 0;
        }
        // Pad until full block byte with zeros
        for (let i = pos; i < blockLen; i++)
            buffer[i] = 0;
        // Note: sha512 requires length to be 128bit integer, but length in JS will overflow before that
        // You need to write around 2 exabytes (u64_max / 8 / (1024**6)) for this to happen.
        // So we just write lowest 64 bits of that value.
        setBigUint64(view, blockLen - 8, BigInt(this.length * 8), isLE);
        this.process(view, 0);
        const oview = (0, utils_js_1.createView)(out);
        const len = this.outputLen;
        // NOTE: we do division by 4 later, which should be fused in single op with modulo by JIT
        if (len % 4)
            throw new Error('_sha2: outputLen should be aligned to 32bit');
        const outLen = len / 4;
        const state = this.get();
        if (outLen > state.length)
            throw new Error('_sha2: outputLen bigger than state');
        for (let i = 0; i < outLen; i++)
            oview.setUint32(4 * i, state[i], isLE);
    }
    digest() {
        const { buffer, outputLen } = this;
        this.digestInto(buffer);
        const res = buffer.slice(0, outputLen);
        this.destroy();
        return res;
    }
    _cloneInto(to) {
        to || (to = new this.constructor());
        to.set(...this.get());
        const { blockLen, buffer, length, finished, destroyed, pos } = this;
        to.length = length;
        to.pos = pos;
        to.finished = finished;
        to.destroyed = destroyed;
        if (length % blockLen)
            to.buffer.set(buffer);
        return to;
    }
}
exports.SHA2 = SHA2;

},{"./_assert.js":22,"./utils.js":31}],24:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.add5L = exports.add5H = exports.add4H = exports.add4L = exports.add3H = exports.add3L = exports.add = exports.rotlBL = exports.rotlBH = exports.rotlSL = exports.rotlSH = exports.rotr32L = exports.rotr32H = exports.rotrBL = exports.rotrBH = exports.rotrSL = exports.rotrSH = exports.shrSL = exports.shrSH = exports.toBig = exports.split = exports.fromBig = void 0;
const U32_MASK64 = /* @__PURE__ */ BigInt(2 ** 32 - 1);
const _32n = /* @__PURE__ */ BigInt(32);
// We are not using BigUint64Array, because they are extremely slow as per 2022
function fromBig(n, le = false) {
    if (le)
        return { h: Number(n & U32_MASK64), l: Number((n >> _32n) & U32_MASK64) };
    return { h: Number((n >> _32n) & U32_MASK64) | 0, l: Number(n & U32_MASK64) | 0 };
}
exports.fromBig = fromBig;
function split(lst, le = false) {
    let Ah = new Uint32Array(lst.length);
    let Al = new Uint32Array(lst.length);
    for (let i = 0; i < lst.length; i++) {
        const { h, l } = fromBig(lst[i], le);
        [Ah[i], Al[i]] = [h, l];
    }
    return [Ah, Al];
}
exports.split = split;
const toBig = (h, l) => (BigInt(h >>> 0) << _32n) | BigInt(l >>> 0);
exports.toBig = toBig;
// for Shift in [0, 32)
const shrSH = (h, _l, s) => h >>> s;
exports.shrSH = shrSH;
const shrSL = (h, l, s) => (h << (32 - s)) | (l >>> s);
exports.shrSL = shrSL;
// Right rotate for Shift in [1, 32)
const rotrSH = (h, l, s) => (h >>> s) | (l << (32 - s));
exports.rotrSH = rotrSH;
const rotrSL = (h, l, s) => (h << (32 - s)) | (l >>> s);
exports.rotrSL = rotrSL;
// Right rotate for Shift in (32, 64), NOTE: 32 is special case.
const rotrBH = (h, l, s) => (h << (64 - s)) | (l >>> (s - 32));
exports.rotrBH = rotrBH;
const rotrBL = (h, l, s) => (h >>> (s - 32)) | (l << (64 - s));
exports.rotrBL = rotrBL;
// Right rotate for shift===32 (just swaps l&h)
const rotr32H = (_h, l) => l;
exports.rotr32H = rotr32H;
const rotr32L = (h, _l) => h;
exports.rotr32L = rotr32L;
// Left rotate for Shift in [1, 32)
const rotlSH = (h, l, s) => (h << s) | (l >>> (32 - s));
exports.rotlSH = rotlSH;
const rotlSL = (h, l, s) => (l << s) | (h >>> (32 - s));
exports.rotlSL = rotlSL;
// Left rotate for Shift in (32, 64), NOTE: 32 is special case.
const rotlBH = (h, l, s) => (l << (s - 32)) | (h >>> (64 - s));
exports.rotlBH = rotlBH;
const rotlBL = (h, l, s) => (h << (s - 32)) | (l >>> (64 - s));
exports.rotlBL = rotlBL;
// JS uses 32-bit signed integers for bitwise operations which means we cannot
// simple take carry out of low bit sum by shift, we need to use division.
function add(Ah, Al, Bh, Bl) {
    const l = (Al >>> 0) + (Bl >>> 0);
    return { h: (Ah + Bh + ((l / 2 ** 32) | 0)) | 0, l: l | 0 };
}
exports.add = add;
// Addition with more than 2 elements
const add3L = (Al, Bl, Cl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0);
exports.add3L = add3L;
const add3H = (low, Ah, Bh, Ch) => (Ah + Bh + Ch + ((low / 2 ** 32) | 0)) | 0;
exports.add3H = add3H;
const add4L = (Al, Bl, Cl, Dl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0);
exports.add4L = add4L;
const add4H = (low, Ah, Bh, Ch, Dh) => (Ah + Bh + Ch + Dh + ((low / 2 ** 32) | 0)) | 0;
exports.add4H = add4H;
const add5L = (Al, Bl, Cl, Dl, El) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0) + (El >>> 0);
exports.add5L = add5L;
const add5H = (low, Ah, Bh, Ch, Dh, Eh) => (Ah + Bh + Ch + Dh + Eh + ((low / 2 ** 32) | 0)) | 0;
exports.add5H = add5H;
// prettier-ignore
const u64 = {
    fromBig, split, toBig,
    shrSH, shrSL,
    rotrSH, rotrSL, rotrBH, rotrBL,
    rotr32H, rotr32L,
    rotlSH, rotlSL, rotlBH, rotlBL,
    add, add3L, add3H, add4L, add4H, add5H, add5L,
};
exports.default = u64;

},{}],25:[function(require,module,exports){
arguments[4][11][0].apply(exports,arguments)
},{"dup":11}],26:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hmac = exports.HMAC = void 0;
const _assert_js_1 = require("./_assert.js");
const utils_js_1 = require("./utils.js");
// HMAC (RFC 2104)
class HMAC extends utils_js_1.Hash {
    constructor(hash, _key) {
        super();
        this.finished = false;
        this.destroyed = false;
        (0, _assert_js_1.hash)(hash);
        const key = (0, utils_js_1.toBytes)(_key);
        this.iHash = hash.create();
        if (typeof this.iHash.update !== 'function')
            throw new Error('Expected instance of class which extends utils.Hash');
        this.blockLen = this.iHash.blockLen;
        this.outputLen = this.iHash.outputLen;
        const blockLen = this.blockLen;
        const pad = new Uint8Array(blockLen);
        // blockLen can be bigger than outputLen
        pad.set(key.length > blockLen ? hash.create().update(key).digest() : key);
        for (let i = 0; i < pad.length; i++)
            pad[i] ^= 0x36;
        this.iHash.update(pad);
        // By doing update (processing of first block) of outer hash here we can re-use it between multiple calls via clone
        this.oHash = hash.create();
        // Undo internal XOR && apply outer XOR
        for (let i = 0; i < pad.length; i++)
            pad[i] ^= 0x36 ^ 0x5c;
        this.oHash.update(pad);
        pad.fill(0);
    }
    update(buf) {
        (0, _assert_js_1.exists)(this);
        this.iHash.update(buf);
        return this;
    }
    digestInto(out) {
        (0, _assert_js_1.exists)(this);
        (0, _assert_js_1.bytes)(out, this.outputLen);
        this.finished = true;
        this.iHash.digestInto(out);
        this.oHash.update(out);
        this.oHash.digestInto(out);
        this.destroy();
    }
    digest() {
        const out = new Uint8Array(this.oHash.outputLen);
        this.digestInto(out);
        return out;
    }
    _cloneInto(to) {
        // Create new instance without calling constructor since key already in state and we don't know it.
        to || (to = Object.create(Object.getPrototypeOf(this), {}));
        const { oHash, iHash, finished, destroyed, blockLen, outputLen } = this;
        to = to;
        to.finished = finished;
        to.destroyed = destroyed;
        to.blockLen = blockLen;
        to.outputLen = outputLen;
        to.oHash = oHash._cloneInto(to.oHash);
        to.iHash = iHash._cloneInto(to.iHash);
        return to;
    }
    destroy() {
        this.destroyed = true;
        this.oHash.destroy();
        this.iHash.destroy();
    }
}
exports.HMAC = HMAC;
/**
 * HMAC: RFC2104 message authentication code.
 * @param hash - function that would be used e.g. sha256
 * @param key - message key
 * @param message - message data
 */
const hmac = (hash, key, message) => new HMAC(hash, key).update(message).digest();
exports.hmac = hmac;
exports.hmac.create = (hash, key) => new HMAC(hash, key);

},{"./_assert.js":22,"./utils.js":31}],27:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pbkdf2Async = exports.pbkdf2 = void 0;
const _assert_js_1 = require("./_assert.js");
const hmac_js_1 = require("./hmac.js");
const utils_js_1 = require("./utils.js");
// Common prologue and epilogue for sync/async functions
function pbkdf2Init(hash, _password, _salt, _opts) {
    (0, _assert_js_1.hash)(hash);
    const opts = (0, utils_js_1.checkOpts)({ dkLen: 32, asyncTick: 10 }, _opts);
    const { c, dkLen, asyncTick } = opts;
    (0, _assert_js_1.number)(c);
    (0, _assert_js_1.number)(dkLen);
    (0, _assert_js_1.number)(asyncTick);
    if (c < 1)
        throw new Error('PBKDF2: iterations (c) should be >= 1');
    const password = (0, utils_js_1.toBytes)(_password);
    const salt = (0, utils_js_1.toBytes)(_salt);
    // DK = PBKDF2(PRF, Password, Salt, c, dkLen);
    const DK = new Uint8Array(dkLen);
    // U1 = PRF(Password, Salt + INT_32_BE(i))
    const PRF = hmac_js_1.hmac.create(hash, password);
    const PRFSalt = PRF._cloneInto().update(salt);
    return { c, dkLen, asyncTick, DK, PRF, PRFSalt };
}
function pbkdf2Output(PRF, PRFSalt, DK, prfW, u) {
    PRF.destroy();
    PRFSalt.destroy();
    if (prfW)
        prfW.destroy();
    u.fill(0);
    return DK;
}
/**
 * PBKDF2-HMAC: RFC 2898 key derivation function
 * @param hash - hash function that would be used e.g. sha256
 * @param password - password from which a derived key is generated
 * @param salt - cryptographic salt
 * @param opts - {c, dkLen} where c is work factor and dkLen is output message size
 */
function pbkdf2(hash, password, salt, opts) {
    const { c, dkLen, DK, PRF, PRFSalt } = pbkdf2Init(hash, password, salt, opts);
    let prfW; // Working copy
    const arr = new Uint8Array(4);
    const view = (0, utils_js_1.createView)(arr);
    const u = new Uint8Array(PRF.outputLen);
    // DK = T1 + T2 + ⋯ + Tdklen/hlen
    for (let ti = 1, pos = 0; pos < dkLen; ti++, pos += PRF.outputLen) {
        // Ti = F(Password, Salt, c, i)
        const Ti = DK.subarray(pos, pos + PRF.outputLen);
        view.setInt32(0, ti, false);
        // F(Password, Salt, c, i) = U1 ^ U2 ^ ⋯ ^ Uc
        // U1 = PRF(Password, Salt + INT_32_BE(i))
        (prfW = PRFSalt._cloneInto(prfW)).update(arr).digestInto(u);
        Ti.set(u.subarray(0, Ti.length));
        for (let ui = 1; ui < c; ui++) {
            // Uc = PRF(Password, Uc−1)
            PRF._cloneInto(prfW).update(u).digestInto(u);
            for (let i = 0; i < Ti.length; i++)
                Ti[i] ^= u[i];
        }
    }
    return pbkdf2Output(PRF, PRFSalt, DK, prfW, u);
}
exports.pbkdf2 = pbkdf2;
async function pbkdf2Async(hash, password, salt, opts) {
    const { c, dkLen, asyncTick, DK, PRF, PRFSalt } = pbkdf2Init(hash, password, salt, opts);
    let prfW; // Working copy
    const arr = new Uint8Array(4);
    const view = (0, utils_js_1.createView)(arr);
    const u = new Uint8Array(PRF.outputLen);
    // DK = T1 + T2 + ⋯ + Tdklen/hlen
    for (let ti = 1, pos = 0; pos < dkLen; ti++, pos += PRF.outputLen) {
        // Ti = F(Password, Salt, c, i)
        const Ti = DK.subarray(pos, pos + PRF.outputLen);
        view.setInt32(0, ti, false);
        // F(Password, Salt, c, i) = U1 ^ U2 ^ ⋯ ^ Uc
        // U1 = PRF(Password, Salt + INT_32_BE(i))
        (prfW = PRFSalt._cloneInto(prfW)).update(arr).digestInto(u);
        Ti.set(u.subarray(0, Ti.length));
        await (0, utils_js_1.asyncLoop)(c - 1, asyncTick, () => {
            // Uc = PRF(Password, Uc−1)
            PRF._cloneInto(prfW).update(u).digestInto(u);
            for (let i = 0; i < Ti.length; i++)
                Ti[i] ^= u[i];
        });
    }
    return pbkdf2Output(PRF, PRFSalt, DK, prfW, u);
}
exports.pbkdf2Async = pbkdf2Async;

},{"./_assert.js":22,"./hmac.js":26,"./utils.js":31}],28:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha224 = exports.sha256 = void 0;
const _sha2_js_1 = require("./_sha2.js");
const utils_js_1 = require("./utils.js");
// SHA2-256 need to try 2^128 hashes to execute birthday attack.
// BTC network is doing 2^67 hashes/sec as per early 2023.
// Choice: a ? b : c
const Chi = (a, b, c) => (a & b) ^ (~a & c);
// Majority function, true if any two inpust is true
const Maj = (a, b, c) => (a & b) ^ (a & c) ^ (b & c);
// Round constants:
// first 32 bits of the fractional parts of the cube roots of the first 64 primes 2..311)
// prettier-ignore
const SHA256_K = /* @__PURE__ */ new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
]);
// Initial state (first 32 bits of the fractional parts of the square roots of the first 8 primes 2..19):
// prettier-ignore
const IV = /* @__PURE__ */ new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
]);
// Temporary buffer, not used to store anything between runs
// Named this way because it matches specification.
const SHA256_W = /* @__PURE__ */ new Uint32Array(64);
class SHA256 extends _sha2_js_1.SHA2 {
    constructor() {
        super(64, 32, 8, false);
        // We cannot use array here since array allows indexing by variable
        // which means optimizer/compiler cannot use registers.
        this.A = IV[0] | 0;
        this.B = IV[1] | 0;
        this.C = IV[2] | 0;
        this.D = IV[3] | 0;
        this.E = IV[4] | 0;
        this.F = IV[5] | 0;
        this.G = IV[6] | 0;
        this.H = IV[7] | 0;
    }
    get() {
        const { A, B, C, D, E, F, G, H } = this;
        return [A, B, C, D, E, F, G, H];
    }
    // prettier-ignore
    set(A, B, C, D, E, F, G, H) {
        this.A = A | 0;
        this.B = B | 0;
        this.C = C | 0;
        this.D = D | 0;
        this.E = E | 0;
        this.F = F | 0;
        this.G = G | 0;
        this.H = H | 0;
    }
    process(view, offset) {
        // Extend the first 16 words into the remaining 48 words w[16..63] of the message schedule array
        for (let i = 0; i < 16; i++, offset += 4)
            SHA256_W[i] = view.getUint32(offset, false);
        for (let i = 16; i < 64; i++) {
            const W15 = SHA256_W[i - 15];
            const W2 = SHA256_W[i - 2];
            const s0 = (0, utils_js_1.rotr)(W15, 7) ^ (0, utils_js_1.rotr)(W15, 18) ^ (W15 >>> 3);
            const s1 = (0, utils_js_1.rotr)(W2, 17) ^ (0, utils_js_1.rotr)(W2, 19) ^ (W2 >>> 10);
            SHA256_W[i] = (s1 + SHA256_W[i - 7] + s0 + SHA256_W[i - 16]) | 0;
        }
        // Compression function main loop, 64 rounds
        let { A, B, C, D, E, F, G, H } = this;
        for (let i = 0; i < 64; i++) {
            const sigma1 = (0, utils_js_1.rotr)(E, 6) ^ (0, utils_js_1.rotr)(E, 11) ^ (0, utils_js_1.rotr)(E, 25);
            const T1 = (H + sigma1 + Chi(E, F, G) + SHA256_K[i] + SHA256_W[i]) | 0;
            const sigma0 = (0, utils_js_1.rotr)(A, 2) ^ (0, utils_js_1.rotr)(A, 13) ^ (0, utils_js_1.rotr)(A, 22);
            const T2 = (sigma0 + Maj(A, B, C)) | 0;
            H = G;
            G = F;
            F = E;
            E = (D + T1) | 0;
            D = C;
            C = B;
            B = A;
            A = (T1 + T2) | 0;
        }
        // Add the compressed chunk to the current hash value
        A = (A + this.A) | 0;
        B = (B + this.B) | 0;
        C = (C + this.C) | 0;
        D = (D + this.D) | 0;
        E = (E + this.E) | 0;
        F = (F + this.F) | 0;
        G = (G + this.G) | 0;
        H = (H + this.H) | 0;
        this.set(A, B, C, D, E, F, G, H);
    }
    roundClean() {
        SHA256_W.fill(0);
    }
    destroy() {
        this.set(0, 0, 0, 0, 0, 0, 0, 0);
        this.buffer.fill(0);
    }
}
// Constants from https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.180-4.pdf
class SHA224 extends SHA256 {
    constructor() {
        super();
        this.A = 0xc1059ed8 | 0;
        this.B = 0x367cd507 | 0;
        this.C = 0x3070dd17 | 0;
        this.D = 0xf70e5939 | 0;
        this.E = 0xffc00b31 | 0;
        this.F = 0x68581511 | 0;
        this.G = 0x64f98fa7 | 0;
        this.H = 0xbefa4fa4 | 0;
        this.outputLen = 28;
    }
}
/**
 * SHA2-256 hash function
 * @param message - data that would be hashed
 */
exports.sha256 = (0, utils_js_1.wrapConstructor)(() => new SHA256());
exports.sha224 = (0, utils_js_1.wrapConstructor)(() => new SHA224());

},{"./_sha2.js":23,"./utils.js":31}],29:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shake256 = exports.shake128 = exports.keccak_512 = exports.keccak_384 = exports.keccak_256 = exports.keccak_224 = exports.sha3_512 = exports.sha3_384 = exports.sha3_256 = exports.sha3_224 = exports.Keccak = exports.keccakP = void 0;
const _assert_js_1 = require("./_assert.js");
const _u64_js_1 = require("./_u64.js");
const utils_js_1 = require("./utils.js");
// SHA3 (keccak) is based on a new design: basically, the internal state is bigger than output size.
// It's called a sponge function.
// Various per round constants calculations
const [SHA3_PI, SHA3_ROTL, _SHA3_IOTA] = [[], [], []];
const _0n = /* @__PURE__ */ BigInt(0);
const _1n = /* @__PURE__ */ BigInt(1);
const _2n = /* @__PURE__ */ BigInt(2);
const _7n = /* @__PURE__ */ BigInt(7);
const _256n = /* @__PURE__ */ BigInt(256);
const _0x71n = /* @__PURE__ */ BigInt(0x71);
for (let round = 0, R = _1n, x = 1, y = 0; round < 24; round++) {
    // Pi
    [x, y] = [y, (2 * x + 3 * y) % 5];
    SHA3_PI.push(2 * (5 * y + x));
    // Rotational
    SHA3_ROTL.push((((round + 1) * (round + 2)) / 2) % 64);
    // Iota
    let t = _0n;
    for (let j = 0; j < 7; j++) {
        R = ((R << _1n) ^ ((R >> _7n) * _0x71n)) % _256n;
        if (R & _2n)
            t ^= _1n << ((_1n << /* @__PURE__ */ BigInt(j)) - _1n);
    }
    _SHA3_IOTA.push(t);
}
const [SHA3_IOTA_H, SHA3_IOTA_L] = /* @__PURE__ */ (0, _u64_js_1.split)(_SHA3_IOTA, true);
// Left rotation (without 0, 32, 64)
const rotlH = (h, l, s) => (s > 32 ? (0, _u64_js_1.rotlBH)(h, l, s) : (0, _u64_js_1.rotlSH)(h, l, s));
const rotlL = (h, l, s) => (s > 32 ? (0, _u64_js_1.rotlBL)(h, l, s) : (0, _u64_js_1.rotlSL)(h, l, s));
// Same as keccakf1600, but allows to skip some rounds
function keccakP(s, rounds = 24) {
    const B = new Uint32Array(5 * 2);
    // NOTE: all indices are x2 since we store state as u32 instead of u64 (bigints to slow in js)
    for (let round = 24 - rounds; round < 24; round++) {
        // Theta θ
        for (let x = 0; x < 10; x++)
            B[x] = s[x] ^ s[x + 10] ^ s[x + 20] ^ s[x + 30] ^ s[x + 40];
        for (let x = 0; x < 10; x += 2) {
            const idx1 = (x + 8) % 10;
            const idx0 = (x + 2) % 10;
            const B0 = B[idx0];
            const B1 = B[idx0 + 1];
            const Th = rotlH(B0, B1, 1) ^ B[idx1];
            const Tl = rotlL(B0, B1, 1) ^ B[idx1 + 1];
            for (let y = 0; y < 50; y += 10) {
                s[x + y] ^= Th;
                s[x + y + 1] ^= Tl;
            }
        }
        // Rho (ρ) and Pi (π)
        let curH = s[2];
        let curL = s[3];
        for (let t = 0; t < 24; t++) {
            const shift = SHA3_ROTL[t];
            const Th = rotlH(curH, curL, shift);
            const Tl = rotlL(curH, curL, shift);
            const PI = SHA3_PI[t];
            curH = s[PI];
            curL = s[PI + 1];
            s[PI] = Th;
            s[PI + 1] = Tl;
        }
        // Chi (χ)
        for (let y = 0; y < 50; y += 10) {
            for (let x = 0; x < 10; x++)
                B[x] = s[y + x];
            for (let x = 0; x < 10; x++)
                s[y + x] ^= ~B[(x + 2) % 10] & B[(x + 4) % 10];
        }
        // Iota (ι)
        s[0] ^= SHA3_IOTA_H[round];
        s[1] ^= SHA3_IOTA_L[round];
    }
    B.fill(0);
}
exports.keccakP = keccakP;
class Keccak extends utils_js_1.Hash {
    // NOTE: we accept arguments in bytes instead of bits here.
    constructor(blockLen, suffix, outputLen, enableXOF = false, rounds = 24) {
        super();
        this.blockLen = blockLen;
        this.suffix = suffix;
        this.outputLen = outputLen;
        this.enableXOF = enableXOF;
        this.rounds = rounds;
        this.pos = 0;
        this.posOut = 0;
        this.finished = false;
        this.destroyed = false;
        // Can be passed from user as dkLen
        (0, _assert_js_1.number)(outputLen);
        // 1600 = 5x5 matrix of 64bit.  1600 bits === 200 bytes
        if (0 >= this.blockLen || this.blockLen >= 200)
            throw new Error('Sha3 supports only keccak-f1600 function');
        this.state = new Uint8Array(200);
        this.state32 = (0, utils_js_1.u32)(this.state);
    }
    keccak() {
        keccakP(this.state32, this.rounds);
        this.posOut = 0;
        this.pos = 0;
    }
    update(data) {
        (0, _assert_js_1.exists)(this);
        const { blockLen, state } = this;
        data = (0, utils_js_1.toBytes)(data);
        const len = data.length;
        for (let pos = 0; pos < len;) {
            const take = Math.min(blockLen - this.pos, len - pos);
            for (let i = 0; i < take; i++)
                state[this.pos++] ^= data[pos++];
            if (this.pos === blockLen)
                this.keccak();
        }
        return this;
    }
    finish() {
        if (this.finished)
            return;
        this.finished = true;
        const { state, suffix, pos, blockLen } = this;
        // Do the padding
        state[pos] ^= suffix;
        if ((suffix & 0x80) !== 0 && pos === blockLen - 1)
            this.keccak();
        state[blockLen - 1] ^= 0x80;
        this.keccak();
    }
    writeInto(out) {
        (0, _assert_js_1.exists)(this, false);
        (0, _assert_js_1.bytes)(out);
        this.finish();
        const bufferOut = this.state;
        const { blockLen } = this;
        for (let pos = 0, len = out.length; pos < len;) {
            if (this.posOut >= blockLen)
                this.keccak();
            const take = Math.min(blockLen - this.posOut, len - pos);
            out.set(bufferOut.subarray(this.posOut, this.posOut + take), pos);
            this.posOut += take;
            pos += take;
        }
        return out;
    }
    xofInto(out) {
        // Sha3/Keccak usage with XOF is probably mistake, only SHAKE instances can do XOF
        if (!this.enableXOF)
            throw new Error('XOF is not possible for this instance');
        return this.writeInto(out);
    }
    xof(bytes) {
        (0, _assert_js_1.number)(bytes);
        return this.xofInto(new Uint8Array(bytes));
    }
    digestInto(out) {
        (0, _assert_js_1.output)(out, this);
        if (this.finished)
            throw new Error('digest() was already called');
        this.writeInto(out);
        this.destroy();
        return out;
    }
    digest() {
        return this.digestInto(new Uint8Array(this.outputLen));
    }
    destroy() {
        this.destroyed = true;
        this.state.fill(0);
    }
    _cloneInto(to) {
        const { blockLen, suffix, outputLen, rounds, enableXOF } = this;
        to || (to = new Keccak(blockLen, suffix, outputLen, enableXOF, rounds));
        to.state32.set(this.state32);
        to.pos = this.pos;
        to.posOut = this.posOut;
        to.finished = this.finished;
        to.rounds = rounds;
        // Suffix can change in cSHAKE
        to.suffix = suffix;
        to.outputLen = outputLen;
        to.enableXOF = enableXOF;
        to.destroyed = this.destroyed;
        return to;
    }
}
exports.Keccak = Keccak;
const gen = (suffix, blockLen, outputLen) => (0, utils_js_1.wrapConstructor)(() => new Keccak(blockLen, suffix, outputLen));
exports.sha3_224 = gen(0x06, 144, 224 / 8);
/**
 * SHA3-256 hash function
 * @param message - that would be hashed
 */
exports.sha3_256 = gen(0x06, 136, 256 / 8);
exports.sha3_384 = gen(0x06, 104, 384 / 8);
exports.sha3_512 = gen(0x06, 72, 512 / 8);
exports.keccak_224 = gen(0x01, 144, 224 / 8);
/**
 * keccak-256 hash function. Different from SHA3-256.
 * @param message - that would be hashed
 */
exports.keccak_256 = gen(0x01, 136, 256 / 8);
exports.keccak_384 = gen(0x01, 104, 384 / 8);
exports.keccak_512 = gen(0x01, 72, 512 / 8);
const genShake = (suffix, blockLen, outputLen) => (0, utils_js_1.wrapXOFConstructorWithOpts)((opts = {}) => new Keccak(blockLen, suffix, opts.dkLen === undefined ? outputLen : opts.dkLen, true));
exports.shake128 = genShake(0x1f, 168, 128 / 8);
exports.shake256 = genShake(0x1f, 136, 256 / 8);

},{"./_assert.js":22,"./_u64.js":24,"./utils.js":31}],30:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha384 = exports.sha512_256 = exports.sha512_224 = exports.sha512 = exports.SHA512 = void 0;
const _sha2_js_1 = require("./_sha2.js");
const _u64_js_1 = require("./_u64.js");
const utils_js_1 = require("./utils.js");
// Round contants (first 32 bits of the fractional parts of the cube roots of the first 80 primes 2..409):
// prettier-ignore
const [SHA512_Kh, SHA512_Kl] = /* @__PURE__ */ (() => _u64_js_1.default.split([
    '0x428a2f98d728ae22', '0x7137449123ef65cd', '0xb5c0fbcfec4d3b2f', '0xe9b5dba58189dbbc',
    '0x3956c25bf348b538', '0x59f111f1b605d019', '0x923f82a4af194f9b', '0xab1c5ed5da6d8118',
    '0xd807aa98a3030242', '0x12835b0145706fbe', '0x243185be4ee4b28c', '0x550c7dc3d5ffb4e2',
    '0x72be5d74f27b896f', '0x80deb1fe3b1696b1', '0x9bdc06a725c71235', '0xc19bf174cf692694',
    '0xe49b69c19ef14ad2', '0xefbe4786384f25e3', '0x0fc19dc68b8cd5b5', '0x240ca1cc77ac9c65',
    '0x2de92c6f592b0275', '0x4a7484aa6ea6e483', '0x5cb0a9dcbd41fbd4', '0x76f988da831153b5',
    '0x983e5152ee66dfab', '0xa831c66d2db43210', '0xb00327c898fb213f', '0xbf597fc7beef0ee4',
    '0xc6e00bf33da88fc2', '0xd5a79147930aa725', '0x06ca6351e003826f', '0x142929670a0e6e70',
    '0x27b70a8546d22ffc', '0x2e1b21385c26c926', '0x4d2c6dfc5ac42aed', '0x53380d139d95b3df',
    '0x650a73548baf63de', '0x766a0abb3c77b2a8', '0x81c2c92e47edaee6', '0x92722c851482353b',
    '0xa2bfe8a14cf10364', '0xa81a664bbc423001', '0xc24b8b70d0f89791', '0xc76c51a30654be30',
    '0xd192e819d6ef5218', '0xd69906245565a910', '0xf40e35855771202a', '0x106aa07032bbd1b8',
    '0x19a4c116b8d2d0c8', '0x1e376c085141ab53', '0x2748774cdf8eeb99', '0x34b0bcb5e19b48a8',
    '0x391c0cb3c5c95a63', '0x4ed8aa4ae3418acb', '0x5b9cca4f7763e373', '0x682e6ff3d6b2b8a3',
    '0x748f82ee5defb2fc', '0x78a5636f43172f60', '0x84c87814a1f0ab72', '0x8cc702081a6439ec',
    '0x90befffa23631e28', '0xa4506cebde82bde9', '0xbef9a3f7b2c67915', '0xc67178f2e372532b',
    '0xca273eceea26619c', '0xd186b8c721c0c207', '0xeada7dd6cde0eb1e', '0xf57d4f7fee6ed178',
    '0x06f067aa72176fba', '0x0a637dc5a2c898a6', '0x113f9804bef90dae', '0x1b710b35131c471b',
    '0x28db77f523047d84', '0x32caab7b40c72493', '0x3c9ebe0a15c9bebc', '0x431d67c49c100d4c',
    '0x4cc5d4becb3e42b6', '0x597f299cfc657e2a', '0x5fcb6fab3ad6faec', '0x6c44198c4a475817'
].map(n => BigInt(n))))();
// Temporary buffer, not used to store anything between runs
const SHA512_W_H = /* @__PURE__ */ new Uint32Array(80);
const SHA512_W_L = /* @__PURE__ */ new Uint32Array(80);
class SHA512 extends _sha2_js_1.SHA2 {
    constructor() {
        super(128, 64, 16, false);
        // We cannot use array here since array allows indexing by variable which means optimizer/compiler cannot use registers.
        // Also looks cleaner and easier to verify with spec.
        // Initial state (first 32 bits of the fractional parts of the square roots of the first 8 primes 2..19):
        // h -- high 32 bits, l -- low 32 bits
        this.Ah = 0x6a09e667 | 0;
        this.Al = 0xf3bcc908 | 0;
        this.Bh = 0xbb67ae85 | 0;
        this.Bl = 0x84caa73b | 0;
        this.Ch = 0x3c6ef372 | 0;
        this.Cl = 0xfe94f82b | 0;
        this.Dh = 0xa54ff53a | 0;
        this.Dl = 0x5f1d36f1 | 0;
        this.Eh = 0x510e527f | 0;
        this.El = 0xade682d1 | 0;
        this.Fh = 0x9b05688c | 0;
        this.Fl = 0x2b3e6c1f | 0;
        this.Gh = 0x1f83d9ab | 0;
        this.Gl = 0xfb41bd6b | 0;
        this.Hh = 0x5be0cd19 | 0;
        this.Hl = 0x137e2179 | 0;
    }
    // prettier-ignore
    get() {
        const { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
        return [Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl];
    }
    // prettier-ignore
    set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl) {
        this.Ah = Ah | 0;
        this.Al = Al | 0;
        this.Bh = Bh | 0;
        this.Bl = Bl | 0;
        this.Ch = Ch | 0;
        this.Cl = Cl | 0;
        this.Dh = Dh | 0;
        this.Dl = Dl | 0;
        this.Eh = Eh | 0;
        this.El = El | 0;
        this.Fh = Fh | 0;
        this.Fl = Fl | 0;
        this.Gh = Gh | 0;
        this.Gl = Gl | 0;
        this.Hh = Hh | 0;
        this.Hl = Hl | 0;
    }
    process(view, offset) {
        // Extend the first 16 words into the remaining 64 words w[16..79] of the message schedule array
        for (let i = 0; i < 16; i++, offset += 4) {
            SHA512_W_H[i] = view.getUint32(offset);
            SHA512_W_L[i] = view.getUint32((offset += 4));
        }
        for (let i = 16; i < 80; i++) {
            // s0 := (w[i-15] rightrotate 1) xor (w[i-15] rightrotate 8) xor (w[i-15] rightshift 7)
            const W15h = SHA512_W_H[i - 15] | 0;
            const W15l = SHA512_W_L[i - 15] | 0;
            const s0h = _u64_js_1.default.rotrSH(W15h, W15l, 1) ^ _u64_js_1.default.rotrSH(W15h, W15l, 8) ^ _u64_js_1.default.shrSH(W15h, W15l, 7);
            const s0l = _u64_js_1.default.rotrSL(W15h, W15l, 1) ^ _u64_js_1.default.rotrSL(W15h, W15l, 8) ^ _u64_js_1.default.shrSL(W15h, W15l, 7);
            // s1 := (w[i-2] rightrotate 19) xor (w[i-2] rightrotate 61) xor (w[i-2] rightshift 6)
            const W2h = SHA512_W_H[i - 2] | 0;
            const W2l = SHA512_W_L[i - 2] | 0;
            const s1h = _u64_js_1.default.rotrSH(W2h, W2l, 19) ^ _u64_js_1.default.rotrBH(W2h, W2l, 61) ^ _u64_js_1.default.shrSH(W2h, W2l, 6);
            const s1l = _u64_js_1.default.rotrSL(W2h, W2l, 19) ^ _u64_js_1.default.rotrBL(W2h, W2l, 61) ^ _u64_js_1.default.shrSL(W2h, W2l, 6);
            // SHA256_W[i] = s0 + s1 + SHA256_W[i - 7] + SHA256_W[i - 16];
            const SUMl = _u64_js_1.default.add4L(s0l, s1l, SHA512_W_L[i - 7], SHA512_W_L[i - 16]);
            const SUMh = _u64_js_1.default.add4H(SUMl, s0h, s1h, SHA512_W_H[i - 7], SHA512_W_H[i - 16]);
            SHA512_W_H[i] = SUMh | 0;
            SHA512_W_L[i] = SUMl | 0;
        }
        let { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
        // Compression function main loop, 80 rounds
        for (let i = 0; i < 80; i++) {
            // S1 := (e rightrotate 14) xor (e rightrotate 18) xor (e rightrotate 41)
            const sigma1h = _u64_js_1.default.rotrSH(Eh, El, 14) ^ _u64_js_1.default.rotrSH(Eh, El, 18) ^ _u64_js_1.default.rotrBH(Eh, El, 41);
            const sigma1l = _u64_js_1.default.rotrSL(Eh, El, 14) ^ _u64_js_1.default.rotrSL(Eh, El, 18) ^ _u64_js_1.default.rotrBL(Eh, El, 41);
            //const T1 = (H + sigma1 + Chi(E, F, G) + SHA256_K[i] + SHA256_W[i]) | 0;
            const CHIh = (Eh & Fh) ^ (~Eh & Gh);
            const CHIl = (El & Fl) ^ (~El & Gl);
            // T1 = H + sigma1 + Chi(E, F, G) + SHA512_K[i] + SHA512_W[i]
            // prettier-ignore
            const T1ll = _u64_js_1.default.add5L(Hl, sigma1l, CHIl, SHA512_Kl[i], SHA512_W_L[i]);
            const T1h = _u64_js_1.default.add5H(T1ll, Hh, sigma1h, CHIh, SHA512_Kh[i], SHA512_W_H[i]);
            const T1l = T1ll | 0;
            // S0 := (a rightrotate 28) xor (a rightrotate 34) xor (a rightrotate 39)
            const sigma0h = _u64_js_1.default.rotrSH(Ah, Al, 28) ^ _u64_js_1.default.rotrBH(Ah, Al, 34) ^ _u64_js_1.default.rotrBH(Ah, Al, 39);
            const sigma0l = _u64_js_1.default.rotrSL(Ah, Al, 28) ^ _u64_js_1.default.rotrBL(Ah, Al, 34) ^ _u64_js_1.default.rotrBL(Ah, Al, 39);
            const MAJh = (Ah & Bh) ^ (Ah & Ch) ^ (Bh & Ch);
            const MAJl = (Al & Bl) ^ (Al & Cl) ^ (Bl & Cl);
            Hh = Gh | 0;
            Hl = Gl | 0;
            Gh = Fh | 0;
            Gl = Fl | 0;
            Fh = Eh | 0;
            Fl = El | 0;
            ({ h: Eh, l: El } = _u64_js_1.default.add(Dh | 0, Dl | 0, T1h | 0, T1l | 0));
            Dh = Ch | 0;
            Dl = Cl | 0;
            Ch = Bh | 0;
            Cl = Bl | 0;
            Bh = Ah | 0;
            Bl = Al | 0;
            const All = _u64_js_1.default.add3L(T1l, sigma0l, MAJl);
            Ah = _u64_js_1.default.add3H(All, T1h, sigma0h, MAJh);
            Al = All | 0;
        }
        // Add the compressed chunk to the current hash value
        ({ h: Ah, l: Al } = _u64_js_1.default.add(this.Ah | 0, this.Al | 0, Ah | 0, Al | 0));
        ({ h: Bh, l: Bl } = _u64_js_1.default.add(this.Bh | 0, this.Bl | 0, Bh | 0, Bl | 0));
        ({ h: Ch, l: Cl } = _u64_js_1.default.add(this.Ch | 0, this.Cl | 0, Ch | 0, Cl | 0));
        ({ h: Dh, l: Dl } = _u64_js_1.default.add(this.Dh | 0, this.Dl | 0, Dh | 0, Dl | 0));
        ({ h: Eh, l: El } = _u64_js_1.default.add(this.Eh | 0, this.El | 0, Eh | 0, El | 0));
        ({ h: Fh, l: Fl } = _u64_js_1.default.add(this.Fh | 0, this.Fl | 0, Fh | 0, Fl | 0));
        ({ h: Gh, l: Gl } = _u64_js_1.default.add(this.Gh | 0, this.Gl | 0, Gh | 0, Gl | 0));
        ({ h: Hh, l: Hl } = _u64_js_1.default.add(this.Hh | 0, this.Hl | 0, Hh | 0, Hl | 0));
        this.set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl);
    }
    roundClean() {
        SHA512_W_H.fill(0);
        SHA512_W_L.fill(0);
    }
    destroy() {
        this.buffer.fill(0);
        this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    }
}
exports.SHA512 = SHA512;
class SHA512_224 extends SHA512 {
    constructor() {
        super();
        // h -- high 32 bits, l -- low 32 bits
        this.Ah = 0x8c3d37c8 | 0;
        this.Al = 0x19544da2 | 0;
        this.Bh = 0x73e19966 | 0;
        this.Bl = 0x89dcd4d6 | 0;
        this.Ch = 0x1dfab7ae | 0;
        this.Cl = 0x32ff9c82 | 0;
        this.Dh = 0x679dd514 | 0;
        this.Dl = 0x582f9fcf | 0;
        this.Eh = 0x0f6d2b69 | 0;
        this.El = 0x7bd44da8 | 0;
        this.Fh = 0x77e36f73 | 0;
        this.Fl = 0x04c48942 | 0;
        this.Gh = 0x3f9d85a8 | 0;
        this.Gl = 0x6a1d36c8 | 0;
        this.Hh = 0x1112e6ad | 0;
        this.Hl = 0x91d692a1 | 0;
        this.outputLen = 28;
    }
}
class SHA512_256 extends SHA512 {
    constructor() {
        super();
        // h -- high 32 bits, l -- low 32 bits
        this.Ah = 0x22312194 | 0;
        this.Al = 0xfc2bf72c | 0;
        this.Bh = 0x9f555fa3 | 0;
        this.Bl = 0xc84c64c2 | 0;
        this.Ch = 0x2393b86b | 0;
        this.Cl = 0x6f53b151 | 0;
        this.Dh = 0x96387719 | 0;
        this.Dl = 0x5940eabd | 0;
        this.Eh = 0x96283ee2 | 0;
        this.El = 0xa88effe3 | 0;
        this.Fh = 0xbe5e1e25 | 0;
        this.Fl = 0x53863992 | 0;
        this.Gh = 0x2b0199fc | 0;
        this.Gl = 0x2c85b8aa | 0;
        this.Hh = 0x0eb72ddc | 0;
        this.Hl = 0x81c52ca2 | 0;
        this.outputLen = 32;
    }
}
class SHA384 extends SHA512 {
    constructor() {
        super();
        // h -- high 32 bits, l -- low 32 bits
        this.Ah = 0xcbbb9d5d | 0;
        this.Al = 0xc1059ed8 | 0;
        this.Bh = 0x629a292a | 0;
        this.Bl = 0x367cd507 | 0;
        this.Ch = 0x9159015a | 0;
        this.Cl = 0x3070dd17 | 0;
        this.Dh = 0x152fecd8 | 0;
        this.Dl = 0xf70e5939 | 0;
        this.Eh = 0x67332667 | 0;
        this.El = 0xffc00b31 | 0;
        this.Fh = 0x8eb44a87 | 0;
        this.Fl = 0x68581511 | 0;
        this.Gh = 0xdb0c2e0d | 0;
        this.Gl = 0x64f98fa7 | 0;
        this.Hh = 0x47b5481d | 0;
        this.Hl = 0xbefa4fa4 | 0;
        this.outputLen = 48;
    }
}
exports.sha512 = (0, utils_js_1.wrapConstructor)(() => new SHA512());
exports.sha512_224 = (0, utils_js_1.wrapConstructor)(() => new SHA512_224());
exports.sha512_256 = (0, utils_js_1.wrapConstructor)(() => new SHA512_256());
exports.sha384 = (0, utils_js_1.wrapConstructor)(() => new SHA384());

},{"./_sha2.js":23,"./_u64.js":24,"./utils.js":31}],31:[function(require,module,exports){
"use strict";

/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.randomBytes = exports.wrapXOFConstructorWithOpts = exports.wrapConstructorWithOpts = exports.wrapConstructor = exports.checkOpts = exports.Hash = exports.concatBytes = exports.toBytes = exports.utf8ToBytes = exports.asyncLoop = exports.nextTick = exports.hexToBytes = exports.bytesToHex = exports.isLE = exports.rotr = exports.createView = exports.u32 = exports.u8 = void 0;
// We use WebCrypto aka globalThis.crypto, which exists in browsers and node.js 16+.
// node.js versions earlier than v19 don't declare it in global scope.
// For node.js, package.json#exports field mapping rewrites import
// from `crypto` to `cryptoNode`, which imports native module.
// Makes the utils un-importable in browsers without a bundler.
// Once node.js 18 is deprecated (2025-04-30), we can just drop the import.
const crypto_1 = require("@noble/hashes/crypto");
// Cast array to different type
const u8 = arr => new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
exports.u8 = u8;
const u32 = arr => new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
exports.u32 = u32;
function isBytes(a) {
  return a instanceof Uint8Array || a != null && typeof a === 'object' && a.constructor.name === 'Uint8Array';
}
// Cast array to view
const createView = arr => new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
exports.createView = createView;
// The rotate right (circular right shift) operation for uint32
const rotr = (word, shift) => word << 32 - shift | word >>> shift;
exports.rotr = rotr;
// big-endian hardware is rare. Just in case someone still decides to run hashes:
// early-throw an error because we don't support BE yet.
// Other libraries would silently corrupt the data instead of throwing an error,
// when they don't support it.
exports.isLE = new Uint8Array(new Uint32Array([0x11223344]).buffer)[0] === 0x44;
if (!exports.isLE) throw new Error('Non little-endian hardware is not supported');
// Array where index 0xf0 (240) is mapped to string 'f0'
const hexes = /* @__PURE__ */Array.from({
  length: 256
}, (_, i) => i.toString(16).padStart(2, '0'));
/**
 * @example bytesToHex(Uint8Array.from([0xca, 0xfe, 0x01, 0x23])) // 'cafe0123'
 */
function bytesToHex(bytes) {
  if (!isBytes(bytes)) throw new Error('Uint8Array expected');
  // pre-caching improves the speed 6x
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += hexes[bytes[i]];
  }
  return hex;
}
exports.bytesToHex = bytesToHex;
// We use optimized technique to convert hex string to byte array
const asciis = {
  _0: 48,
  _9: 57,
  _A: 65,
  _F: 70,
  _a: 97,
  _f: 102
};
function asciiToBase16(char) {
  if (char >= asciis._0 && char <= asciis._9) return char - asciis._0;
  if (char >= asciis._A && char <= asciis._F) return char - (asciis._A - 10);
  if (char >= asciis._a && char <= asciis._f) return char - (asciis._a - 10);
  return;
}
/**
 * @example hexToBytes('cafe0123') // Uint8Array.from([0xca, 0xfe, 0x01, 0x23])
 */
function hexToBytes(hex) {
  if (typeof hex !== 'string') throw new Error('hex string expected, got ' + typeof hex);
  const hl = hex.length;
  const al = hl / 2;
  if (hl % 2) throw new Error('padded hex string expected, got unpadded hex of length ' + hl);
  const array = new Uint8Array(al);
  for (let ai = 0, hi = 0; ai < al; ai++, hi += 2) {
    const n1 = asciiToBase16(hex.charCodeAt(hi));
    const n2 = asciiToBase16(hex.charCodeAt(hi + 1));
    if (n1 === undefined || n2 === undefined) {
      const char = hex[hi] + hex[hi + 1];
      throw new Error('hex string expected, got non-hex character "' + char + '" at index ' + hi);
    }
    array[ai] = n1 * 16 + n2;
  }
  return array;
}
exports.hexToBytes = hexToBytes;
// There is no setImmediate in browser and setTimeout is slow.
// call of async fn will return Promise, which will be fullfiled only on
// next scheduler queue processing step and this is exactly what we need.
const nextTick = async () => {};
exports.nextTick = nextTick;
// Returns control to thread each 'tick' ms to avoid blocking
async function asyncLoop(iters, tick, cb) {
  let ts = Date.now();
  for (let i = 0; i < iters; i++) {
    cb(i);
    // Date.now() is not monotonic, so in case if clock goes backwards we return return control too
    const diff = Date.now() - ts;
    if (diff >= 0 && diff < tick) continue;
    await (0, exports.nextTick)();
    ts += diff;
  }
}
exports.asyncLoop = asyncLoop;
/**
 * @example utf8ToBytes('abc') // new Uint8Array([97, 98, 99])
 */
function utf8ToBytes(str) {
  if (typeof str !== 'string') throw new Error(`utf8ToBytes expected string, got ${typeof str}`);
  return new Uint8Array(new TextEncoder().encode(str)); // https://bugzil.la/1681809
}
exports.utf8ToBytes = utf8ToBytes;
/**
 * Normalizes (non-hex) string or Uint8Array to Uint8Array.
 * Warning: when Uint8Array is passed, it would NOT get copied.
 * Keep in mind for future mutable operations.
 */
function toBytes(data) {
  if (typeof data === 'string') data = utf8ToBytes(data);
  if (!isBytes(data)) throw new Error(`expected Uint8Array, got ${typeof data}`);
  return data;
}
exports.toBytes = toBytes;
/**
 * Copies several Uint8Arrays into one.
 */
function concatBytes(...arrays) {
  let sum = 0;
  for (let i = 0; i < arrays.length; i++) {
    const a = arrays[i];
    if (!isBytes(a)) throw new Error('Uint8Array expected');
    sum += a.length;
  }
  const res = new Uint8Array(sum);
  for (let i = 0, pad = 0; i < arrays.length; i++) {
    const a = arrays[i];
    res.set(a, pad);
    pad += a.length;
  }
  return res;
}
exports.concatBytes = concatBytes;
// For runtime check if class implements interface
class Hash {
  // Safe version that clones internal state
  clone() {
    return this._cloneInto();
  }
}
exports.Hash = Hash;
const toStr = {}.toString;
function checkOpts(defaults, opts) {
  if (opts !== undefined && toStr.call(opts) !== '[object Object]') throw new Error('Options should be object or undefined');
  const merged = Object.assign(defaults, opts);
  return merged;
}
exports.checkOpts = checkOpts;
function wrapConstructor(hashCons) {
  const hashC = msg => hashCons().update(toBytes(msg)).digest();
  const tmp = hashCons();
  hashC.outputLen = tmp.outputLen;
  hashC.blockLen = tmp.blockLen;
  hashC.create = () => hashCons();
  return hashC;
}
exports.wrapConstructor = wrapConstructor;
function wrapConstructorWithOpts(hashCons) {
  const hashC = (msg, opts) => hashCons(opts).update(toBytes(msg)).digest();
  const tmp = hashCons({});
  hashC.outputLen = tmp.outputLen;
  hashC.blockLen = tmp.blockLen;
  hashC.create = opts => hashCons(opts);
  return hashC;
}
exports.wrapConstructorWithOpts = wrapConstructorWithOpts;
function wrapXOFConstructorWithOpts(hashCons) {
  const hashC = (msg, opts) => hashCons(opts).update(toBytes(msg)).digest();
  const tmp = hashCons({});
  hashC.outputLen = tmp.outputLen;
  hashC.blockLen = tmp.blockLen;
  hashC.create = opts => hashCons(opts);
  return hashC;
}
exports.wrapXOFConstructorWithOpts = wrapXOFConstructorWithOpts;
/**
 * Secure PRNG. Uses `crypto.getRandomValues`, which defers to OS.
 */
function randomBytes(bytesLength = 32) {
  if (crypto_1.crypto && typeof crypto_1.crypto.getRandomValues === 'function') {
    return crypto_1.crypto.getRandomValues(new Uint8Array(bytesLength));
  }
  throw new Error('crypto.getRandomValues must be defined');
}
exports.randomBytes = randomBytes;

},{"@noble/hashes/crypto":25}],32:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mnemonicToSeedSync = exports.mnemonicToSeed = exports.validateMnemonic = exports.entropyToMnemonic = exports.mnemonicToEntropy = exports.generateMnemonic = void 0;
/*! scure-bip39 - MIT License (c) 2022 Patricio Palladino, Paul Miller (paulmillr.com) */
const _assert_1 = require("@noble/hashes/_assert");
const pbkdf2_1 = require("@noble/hashes/pbkdf2");
const sha256_1 = require("@noble/hashes/sha256");
const sha512_1 = require("@noble/hashes/sha512");
const utils_1 = require("@noble/hashes/utils");
const base_1 = require("@scure/base");
// Japanese wordlist
const isJapanese = (wordlist) => wordlist[0] === '\u3042\u3044\u3053\u304f\u3057\u3093';
// Normalization replaces equivalent sequences of characters
// so that any two texts that are equivalent will be reduced
// to the same sequence of code points, called the normal form of the original text.
function nfkd(str) {
    if (typeof str !== 'string')
        throw new TypeError(`Invalid mnemonic type: ${typeof str}`);
    return str.normalize('NFKD');
}
function normalize(str) {
    const norm = nfkd(str);
    const words = norm.split(' ');
    if (![12, 15, 18, 21, 24].includes(words.length))
        throw new Error('Invalid mnemonic');
    return { nfkd: norm, words };
}
function assertEntropy(entropy) {
    _assert_1.default.bytes(entropy, 16, 20, 24, 28, 32);
}
/**
 * Generate x random words. Uses Cryptographically-Secure Random Number Generator.
 * @param wordlist imported wordlist for specific language
 * @param strength mnemonic strength 128-256 bits
 * @example
 * generateMnemonic(wordlist, 128)
 * // 'legal winner thank year wave sausage worth useful legal winner thank yellow'
 */
function generateMnemonic(wordlist, strength = 128) {
    _assert_1.default.number(strength);
    if (strength % 32 !== 0 || strength > 256)
        throw new TypeError('Invalid entropy');
    return entropyToMnemonic((0, utils_1.randomBytes)(strength / 8), wordlist);
}
exports.generateMnemonic = generateMnemonic;
const calcChecksum = (entropy) => {
    // Checksum is ent.length/4 bits long
    const bitsLeft = 8 - entropy.length / 4;
    // Zero rightmost "bitsLeft" bits in byte
    // For example: bitsLeft=4 val=10111101 -> 10110000
    return new Uint8Array([((0, sha256_1.sha256)(entropy)[0] >> bitsLeft) << bitsLeft]);
};
function getCoder(wordlist) {
    if (!Array.isArray(wordlist) || wordlist.length !== 2048 || typeof wordlist[0] !== 'string')
        throw new Error('Worlist: expected array of 2048 strings');
    wordlist.forEach((i) => {
        if (typeof i !== 'string')
            throw new Error(`Wordlist: non-string element: ${i}`);
    });
    return base_1.utils.chain(base_1.utils.checksum(1, calcChecksum), base_1.utils.radix2(11, true), base_1.utils.alphabet(wordlist));
}
/**
 * Reversible: Converts mnemonic string to raw entropy in form of byte array.
 * @param mnemonic 12-24 words
 * @param wordlist imported wordlist for specific language
 * @example
 * const mnem = 'legal winner thank year wave sausage worth useful legal winner thank yellow';
 * mnemonicToEntropy(mnem, wordlist)
 * // Produces
 * new Uint8Array([
 *   0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f,
 *   0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f
 * ])
 */
function mnemonicToEntropy(mnemonic, wordlist) {
    const { words } = normalize(mnemonic);
    const entropy = getCoder(wordlist).decode(words);
    assertEntropy(entropy);
    return entropy;
}
exports.mnemonicToEntropy = mnemonicToEntropy;
/**
 * Reversible: Converts raw entropy in form of byte array to mnemonic string.
 * @param entropy byte array
 * @param wordlist imported wordlist for specific language
 * @returns 12-24 words
 * @example
 * const ent = new Uint8Array([
 *   0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f,
 *   0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f
 * ]);
 * entropyToMnemonic(ent, wordlist);
 * // 'legal winner thank year wave sausage worth useful legal winner thank yellow'
 */
function entropyToMnemonic(entropy, wordlist) {
    assertEntropy(entropy);
    const words = getCoder(wordlist).encode(entropy);
    return words.join(isJapanese(wordlist) ? '\u3000' : ' ');
}
exports.entropyToMnemonic = entropyToMnemonic;
/**
 * Validates mnemonic for being 12-24 words contained in `wordlist`.
 */
function validateMnemonic(mnemonic, wordlist) {
    try {
        mnemonicToEntropy(mnemonic, wordlist);
    }
    catch (e) {
        return false;
    }
    return true;
}
exports.validateMnemonic = validateMnemonic;
const salt = (passphrase) => nfkd(`mnemonic${passphrase}`);
/**
 * Irreversible: Uses KDF to derive 64 bytes of key data from mnemonic + optional password.
 * @param mnemonic 12-24 words
 * @param passphrase string that will additionally protect the key
 * @returns 64 bytes of key data
 * @example
 * const mnem = 'legal winner thank year wave sausage worth useful legal winner thank yellow';
 * await mnemonicToSeed(mnem, 'password');
 * // new Uint8Array([...64 bytes])
 */
function mnemonicToSeed(mnemonic, passphrase = '') {
    return (0, pbkdf2_1.pbkdf2Async)(sha512_1.sha512, normalize(mnemonic).nfkd, salt(passphrase), { c: 2048, dkLen: 64 });
}
exports.mnemonicToSeed = mnemonicToSeed;
/**
 * Irreversible: Uses KDF to derive 64 bytes of key data from mnemonic + optional password.
 * @param mnemonic 12-24 words
 * @param passphrase string that will additionally protect the key
 * @returns 64 bytes of key data
 * @example
 * const mnem = 'legal winner thank year wave sausage worth useful legal winner thank yellow';
 * mnemonicToSeedSync(mnem, 'password');
 * // new Uint8Array([...64 bytes])
 */
function mnemonicToSeedSync(mnemonic, passphrase = '') {
    return (0, pbkdf2_1.pbkdf2)(sha512_1.sha512, normalize(mnemonic).nfkd, salt(passphrase), { c: 2048, dkLen: 64 });
}
exports.mnemonicToSeedSync = mnemonicToSeedSync;

},{"@noble/hashes/_assert":22,"@noble/hashes/pbkdf2":27,"@noble/hashes/sha256":28,"@noble/hashes/sha512":30,"@noble/hashes/utils":31,"@scure/base":17}],33:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.all = exports.VERSION = exports.HttpStatusCode = exports.CanceledError = exports.CancelToken = exports.Cancel = exports.AxiosHeaders = exports.AxiosError = exports.Axios = void 0;
Object.defineProperty(exports, "default", {
  enumerable: true,
  get: function () {
    return _axios.default;
  }
});
exports.toFormData = exports.spread = exports.mergeConfig = exports.isCancel = exports.isAxiosError = exports.getAdapter = exports.formToJSON = void 0;
var _axios = _interopRequireDefault(require("./lib/axios.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
// This module is intended to unwrap Axios default export as named.
// Keep top-level export same with static properties
// so that it can keep same with es module or cjs
const {
  Axios,
  AxiosError,
  CanceledError,
  isCancel,
  CancelToken,
  VERSION,
  all,
  Cancel,
  isAxiosError,
  spread,
  toFormData,
  AxiosHeaders,
  HttpStatusCode,
  formToJSON,
  getAdapter,
  mergeConfig
} = _axios.default;
exports.mergeConfig = mergeConfig;
exports.getAdapter = getAdapter;
exports.formToJSON = formToJSON;
exports.HttpStatusCode = HttpStatusCode;
exports.AxiosHeaders = AxiosHeaders;
exports.toFormData = toFormData;
exports.spread = spread;
exports.isAxiosError = isAxiosError;
exports.Cancel = Cancel;
exports.all = all;
exports.VERSION = VERSION;
exports.CancelToken = CancelToken;
exports.isCancel = isCancel;
exports.CanceledError = CanceledError;
exports.AxiosError = AxiosError;
exports.Axios = Axios;

},{"./lib/axios.js":37}],34:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _utils = _interopRequireDefault(require("../utils.js"));
var _http = _interopRequireDefault(require("./http.js"));
var _xhr = _interopRequireDefault(require("./xhr.js"));
var _fetch = _interopRequireDefault(require("./fetch.js"));
var _AxiosError = _interopRequireDefault(require("../core/AxiosError.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const knownAdapters = {
  http: _http.default,
  xhr: _xhr.default,
  fetch: _fetch.default
};
_utils.default.forEach(knownAdapters, (fn, value) => {
  if (fn) {
    try {
      Object.defineProperty(fn, 'name', {
        value
      });
    } catch (e) {
      // eslint-disable-next-line no-empty
    }
    Object.defineProperty(fn, 'adapterName', {
      value
    });
  }
});
const renderReason = reason => `- ${reason}`;
const isResolvedHandle = adapter => _utils.default.isFunction(adapter) || adapter === null || adapter === false;
var _default = exports.default = {
  getAdapter: adapters => {
    adapters = _utils.default.isArray(adapters) ? adapters : [adapters];
    const {
      length
    } = adapters;
    let nameOrAdapter;
    let adapter;
    const rejectedReasons = {};
    for (let i = 0; i < length; i++) {
      nameOrAdapter = adapters[i];
      let id;
      adapter = nameOrAdapter;
      if (!isResolvedHandle(nameOrAdapter)) {
        adapter = knownAdapters[(id = String(nameOrAdapter)).toLowerCase()];
        if (adapter === undefined) {
          throw new _AxiosError.default(`Unknown adapter '${id}'`);
        }
      }
      if (adapter) {
        break;
      }
      rejectedReasons[id || '#' + i] = adapter;
    }
    if (!adapter) {
      const reasons = Object.entries(rejectedReasons).map(([id, state]) => `adapter ${id} ` + (state === false ? 'is not supported by the environment' : 'is not available in the build'));
      let s = length ? reasons.length > 1 ? 'since :\n' + reasons.map(renderReason).join('\n') : ' ' + renderReason(reasons[0]) : 'as no adapter specified';
      throw new _AxiosError.default(`There is no suitable adapter to dispatch the request ` + s, 'ERR_NOT_SUPPORT');
    }
    return adapter;
  },
  adapters: knownAdapters
};

},{"../core/AxiosError.js":42,"../utils.js":82,"./fetch.js":35,"./http.js":64,"./xhr.js":36}],35:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _index = _interopRequireDefault(require("../platform/index.js"));
var _utils = _interopRequireDefault(require("../utils.js"));
var _AxiosError = _interopRequireDefault(require("../core/AxiosError.js"));
var _composeSignals = _interopRequireDefault(require("../helpers/composeSignals.js"));
var _trackStream = require("../helpers/trackStream.js");
var _AxiosHeaders = _interopRequireDefault(require("../core/AxiosHeaders.js"));
var _progressEventReducer = require("../helpers/progressEventReducer.js");
var _resolveConfig = _interopRequireDefault(require("../helpers/resolveConfig.js"));
var _settle = _interopRequireDefault(require("../core/settle.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const isFetchSupported = typeof fetch === 'function' && typeof Request === 'function' && typeof Response === 'function';
const isReadableStreamSupported = isFetchSupported && typeof ReadableStream === 'function';

// used only inside the fetch adapter
const encodeText = isFetchSupported && (typeof TextEncoder === 'function' ? (encoder => str => encoder.encode(str))(new TextEncoder()) : async str => new Uint8Array(await new Response(str).arrayBuffer()));
const test = (fn, ...args) => {
  try {
    return !!fn(...args);
  } catch (e) {
    return false;
  }
};
const supportsRequestStream = isReadableStreamSupported && test(() => {
  let duplexAccessed = false;
  const hasContentType = new Request(_index.default.origin, {
    body: new ReadableStream(),
    method: 'POST',
    get duplex() {
      duplexAccessed = true;
      return 'half';
    }
  }).headers.has('Content-Type');
  return duplexAccessed && !hasContentType;
});
const DEFAULT_CHUNK_SIZE = 64 * 1024;
const supportsResponseStream = isReadableStreamSupported && test(() => _utils.default.isReadableStream(new Response('').body));
const resolvers = {
  stream: supportsResponseStream && (res => res.body)
};
isFetchSupported && (res => {
  ['text', 'arrayBuffer', 'blob', 'formData', 'stream'].forEach(type => {
    !resolvers[type] && (resolvers[type] = _utils.default.isFunction(res[type]) ? res => res[type]() : (_, config) => {
      throw new _AxiosError.default(`Response type '${type}' is not supported`, _AxiosError.default.ERR_NOT_SUPPORT, config);
    });
  });
})(new Response());
const getBodyLength = async body => {
  if (body == null) {
    return 0;
  }
  if (_utils.default.isBlob(body)) {
    return body.size;
  }
  if (_utils.default.isSpecCompliantForm(body)) {
    return (await new Request(body).arrayBuffer()).byteLength;
  }
  if (_utils.default.isArrayBufferView(body) || _utils.default.isArrayBuffer(body)) {
    return body.byteLength;
  }
  if (_utils.default.isURLSearchParams(body)) {
    body = body + '';
  }
  if (_utils.default.isString(body)) {
    return (await encodeText(body)).byteLength;
  }
};
const resolveBodyLength = async (headers, body) => {
  const length = _utils.default.toFiniteNumber(headers.getContentLength());
  return length == null ? getBodyLength(body) : length;
};
var _default = exports.default = isFetchSupported && (async config => {
  let {
    url,
    method,
    data,
    signal,
    cancelToken,
    timeout,
    onDownloadProgress,
    onUploadProgress,
    responseType,
    headers,
    withCredentials = 'same-origin',
    fetchOptions
  } = (0, _resolveConfig.default)(config);
  responseType = responseType ? (responseType + '').toLowerCase() : 'text';
  let [composedSignal, stopTimeout] = signal || cancelToken || timeout ? (0, _composeSignals.default)([signal, cancelToken], timeout) : [];
  let finished, request;
  const onFinish = () => {
    !finished && setTimeout(() => {
      composedSignal && composedSignal.unsubscribe();
    });
    finished = true;
  };
  let requestContentLength;
  try {
    if (onUploadProgress && supportsRequestStream && method !== 'get' && method !== 'head' && (requestContentLength = await resolveBodyLength(headers, data)) !== 0) {
      let _request = new Request(url, {
        method: 'POST',
        body: data,
        duplex: "half"
      });
      let contentTypeHeader;
      if (_utils.default.isFormData(data) && (contentTypeHeader = _request.headers.get('content-type'))) {
        headers.setContentType(contentTypeHeader);
      }
      if (_request.body) {
        const [onProgress, flush] = (0, _progressEventReducer.progressEventDecorator)(requestContentLength, (0, _progressEventReducer.progressEventReducer)((0, _progressEventReducer.asyncDecorator)(onUploadProgress)));
        data = (0, _trackStream.trackStream)(_request.body, DEFAULT_CHUNK_SIZE, onProgress, flush, encodeText);
      }
    }
    if (!_utils.default.isString(withCredentials)) {
      withCredentials = withCredentials ? 'include' : 'omit';
    }
    request = new Request(url, {
      ...fetchOptions,
      signal: composedSignal,
      method: method.toUpperCase(),
      headers: headers.normalize().toJSON(),
      body: data,
      duplex: "half",
      credentials: withCredentials
    });
    let response = await fetch(request);
    const isStreamResponse = supportsResponseStream && (responseType === 'stream' || responseType === 'response');
    if (supportsResponseStream && (onDownloadProgress || isStreamResponse)) {
      const options = {};
      ['status', 'statusText', 'headers'].forEach(prop => {
        options[prop] = response[prop];
      });
      const responseContentLength = _utils.default.toFiniteNumber(response.headers.get('content-length'));
      const [onProgress, flush] = onDownloadProgress && (0, _progressEventReducer.progressEventDecorator)(responseContentLength, (0, _progressEventReducer.progressEventReducer)((0, _progressEventReducer.asyncDecorator)(onDownloadProgress), true)) || [];
      response = new Response((0, _trackStream.trackStream)(response.body, DEFAULT_CHUNK_SIZE, onProgress, () => {
        flush && flush();
        isStreamResponse && onFinish();
      }, encodeText), options);
    }
    responseType = responseType || 'text';
    let responseData = await resolvers[_utils.default.findKey(resolvers, responseType) || 'text'](response, config);
    !isStreamResponse && onFinish();
    stopTimeout && stopTimeout();
    return await new Promise((resolve, reject) => {
      (0, _settle.default)(resolve, reject, {
        data: responseData,
        headers: _AxiosHeaders.default.from(response.headers),
        status: response.status,
        statusText: response.statusText,
        config,
        request
      });
    });
  } catch (err) {
    onFinish();
    if (err && err.name === 'TypeError' && /fetch/i.test(err.message)) {
      throw Object.assign(new _AxiosError.default('Network Error', _AxiosError.default.ERR_NETWORK, config, request), {
        cause: err.cause || err
      });
    }
    throw _AxiosError.default.from(err, err && err.code, config, request);
  }
});

},{"../core/AxiosError.js":42,"../core/AxiosHeaders.js":43,"../core/settle.js":48,"../helpers/composeSignals.js":58,"../helpers/progressEventReducer.js":67,"../helpers/resolveConfig.js":68,"../helpers/trackStream.js":74,"../platform/index.js":81,"../utils.js":82}],36:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _utils = _interopRequireDefault(require("./../utils.js"));
var _settle = _interopRequireDefault(require("./../core/settle.js"));
var _transitional = _interopRequireDefault(require("../defaults/transitional.js"));
var _AxiosError = _interopRequireDefault(require("../core/AxiosError.js"));
var _CanceledError = _interopRequireDefault(require("../cancel/CanceledError.js"));
var _parseProtocol = _interopRequireDefault(require("../helpers/parseProtocol.js"));
var _index = _interopRequireDefault(require("../platform/index.js"));
var _AxiosHeaders = _interopRequireDefault(require("../core/AxiosHeaders.js"));
var _progressEventReducer = require("../helpers/progressEventReducer.js");
var _resolveConfig = _interopRequireDefault(require("../helpers/resolveConfig.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const isXHRAdapterSupported = typeof XMLHttpRequest !== 'undefined';
var _default = exports.default = isXHRAdapterSupported && function (config) {
  return new Promise(function dispatchXhrRequest(resolve, reject) {
    const _config = (0, _resolveConfig.default)(config);
    let requestData = _config.data;
    const requestHeaders = _AxiosHeaders.default.from(_config.headers).normalize();
    let {
      responseType,
      onUploadProgress,
      onDownloadProgress
    } = _config;
    let onCanceled;
    let uploadThrottled, downloadThrottled;
    let flushUpload, flushDownload;
    function done() {
      flushUpload && flushUpload(); // flush events
      flushDownload && flushDownload(); // flush events

      _config.cancelToken && _config.cancelToken.unsubscribe(onCanceled);
      _config.signal && _config.signal.removeEventListener('abort', onCanceled);
    }
    let request = new XMLHttpRequest();
    request.open(_config.method.toUpperCase(), _config.url, true);

    // Set the request timeout in MS
    request.timeout = _config.timeout;
    function onloadend() {
      if (!request) {
        return;
      }
      // Prepare the response
      const responseHeaders = _AxiosHeaders.default.from('getAllResponseHeaders' in request && request.getAllResponseHeaders());
      const responseData = !responseType || responseType === 'text' || responseType === 'json' ? request.responseText : request.response;
      const response = {
        data: responseData,
        status: request.status,
        statusText: request.statusText,
        headers: responseHeaders,
        config,
        request
      };
      (0, _settle.default)(function _resolve(value) {
        resolve(value);
        done();
      }, function _reject(err) {
        reject(err);
        done();
      }, response);

      // Clean up request
      request = null;
    }
    if ('onloadend' in request) {
      // Use onloadend if available
      request.onloadend = onloadend;
    } else {
      // Listen for ready state to emulate onloadend
      request.onreadystatechange = function handleLoad() {
        if (!request || request.readyState !== 4) {
          return;
        }

        // The request errored out and we didn't get a response, this will be
        // handled by onerror instead
        // With one exception: request that using file: protocol, most browsers
        // will return status as 0 even though it's a successful request
        if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf('file:') === 0)) {
          return;
        }
        // readystate handler is calling before onerror or ontimeout handlers,
        // so we should call onloadend on the next 'tick'
        setTimeout(onloadend);
      };
    }

    // Handle browser request cancellation (as opposed to a manual cancellation)
    request.onabort = function handleAbort() {
      if (!request) {
        return;
      }
      reject(new _AxiosError.default('Request aborted', _AxiosError.default.ECONNABORTED, config, request));

      // Clean up request
      request = null;
    };

    // Handle low level network errors
    request.onerror = function handleError() {
      // Real errors are hidden from us by the browser
      // onerror should only fire if it's a network error
      reject(new _AxiosError.default('Network Error', _AxiosError.default.ERR_NETWORK, config, request));

      // Clean up request
      request = null;
    };

    // Handle timeout
    request.ontimeout = function handleTimeout() {
      let timeoutErrorMessage = _config.timeout ? 'timeout of ' + _config.timeout + 'ms exceeded' : 'timeout exceeded';
      const transitional = _config.transitional || _transitional.default;
      if (_config.timeoutErrorMessage) {
        timeoutErrorMessage = _config.timeoutErrorMessage;
      }
      reject(new _AxiosError.default(timeoutErrorMessage, transitional.clarifyTimeoutError ? _AxiosError.default.ETIMEDOUT : _AxiosError.default.ECONNABORTED, config, request));

      // Clean up request
      request = null;
    };

    // Remove Content-Type if data is undefined
    requestData === undefined && requestHeaders.setContentType(null);

    // Add headers to the request
    if ('setRequestHeader' in request) {
      _utils.default.forEach(requestHeaders.toJSON(), function setRequestHeader(val, key) {
        request.setRequestHeader(key, val);
      });
    }

    // Add withCredentials to request if needed
    if (!_utils.default.isUndefined(_config.withCredentials)) {
      request.withCredentials = !!_config.withCredentials;
    }

    // Add responseType to request if needed
    if (responseType && responseType !== 'json') {
      request.responseType = _config.responseType;
    }

    // Handle progress if needed
    if (onDownloadProgress) {
      [downloadThrottled, flushDownload] = (0, _progressEventReducer.progressEventReducer)(onDownloadProgress, true);
      request.addEventListener('progress', downloadThrottled);
    }

    // Not all browsers support upload events
    if (onUploadProgress && request.upload) {
      [uploadThrottled, flushUpload] = (0, _progressEventReducer.progressEventReducer)(onUploadProgress);
      request.upload.addEventListener('progress', uploadThrottled);
      request.upload.addEventListener('loadend', flushUpload);
    }
    if (_config.cancelToken || _config.signal) {
      // Handle cancellation
      // eslint-disable-next-line func-names
      onCanceled = cancel => {
        if (!request) {
          return;
        }
        reject(!cancel || cancel.type ? new _CanceledError.default(null, config, request) : cancel);
        request.abort();
        request = null;
      };
      _config.cancelToken && _config.cancelToken.subscribe(onCanceled);
      if (_config.signal) {
        _config.signal.aborted ? onCanceled() : _config.signal.addEventListener('abort', onCanceled);
      }
    }
    const protocol = (0, _parseProtocol.default)(_config.url);
    if (protocol && _index.default.protocols.indexOf(protocol) === -1) {
      reject(new _AxiosError.default('Unsupported protocol ' + protocol + ':', _AxiosError.default.ERR_BAD_REQUEST, config));
      return;
    }

    // Send the request
    request.send(requestData || null);
  });
};

},{"../cancel/CanceledError.js":39,"../core/AxiosError.js":42,"../core/AxiosHeaders.js":43,"../defaults/transitional.js":51,"../helpers/parseProtocol.js":66,"../helpers/progressEventReducer.js":67,"../helpers/resolveConfig.js":68,"../platform/index.js":81,"./../core/settle.js":48,"./../utils.js":82}],37:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _utils = _interopRequireDefault(require("./utils.js"));
var _bind = _interopRequireDefault(require("./helpers/bind.js"));
var _Axios = _interopRequireDefault(require("./core/Axios.js"));
var _mergeConfig = _interopRequireDefault(require("./core/mergeConfig.js"));
var _index = _interopRequireDefault(require("./defaults/index.js"));
var _formDataToJSON = _interopRequireDefault(require("./helpers/formDataToJSON.js"));
var _CanceledError = _interopRequireDefault(require("./cancel/CanceledError.js"));
var _CancelToken = _interopRequireDefault(require("./cancel/CancelToken.js"));
var _isCancel = _interopRequireDefault(require("./cancel/isCancel.js"));
var _data = require("./env/data.js");
var _toFormData = _interopRequireDefault(require("./helpers/toFormData.js"));
var _AxiosError = _interopRequireDefault(require("./core/AxiosError.js"));
var _spread = _interopRequireDefault(require("./helpers/spread.js"));
var _isAxiosError = _interopRequireDefault(require("./helpers/isAxiosError.js"));
var _AxiosHeaders = _interopRequireDefault(require("./core/AxiosHeaders.js"));
var _adapters = _interopRequireDefault(require("./adapters/adapters.js"));
var _HttpStatusCode = _interopRequireDefault(require("./helpers/HttpStatusCode.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/**
 * Create an instance of Axios
 *
 * @param {Object} defaultConfig The default config for the instance
 *
 * @returns {Axios} A new instance of Axios
 */
function createInstance(defaultConfig) {
  const context = new _Axios.default(defaultConfig);
  const instance = (0, _bind.default)(_Axios.default.prototype.request, context);

  // Copy axios.prototype to instance
  _utils.default.extend(instance, _Axios.default.prototype, context, {
    allOwnKeys: true
  });

  // Copy context to instance
  _utils.default.extend(instance, context, null, {
    allOwnKeys: true
  });

  // Factory for creating new instances
  instance.create = function create(instanceConfig) {
    return createInstance((0, _mergeConfig.default)(defaultConfig, instanceConfig));
  };
  return instance;
}

// Create the default instance to be exported
const axios = createInstance(_index.default);

// Expose Axios class to allow class inheritance
axios.Axios = _Axios.default;

// Expose Cancel & CancelToken
axios.CanceledError = _CanceledError.default;
axios.CancelToken = _CancelToken.default;
axios.isCancel = _isCancel.default;
axios.VERSION = _data.VERSION;
axios.toFormData = _toFormData.default;

// Expose AxiosError class
axios.AxiosError = _AxiosError.default;

// alias for CanceledError for backward compatibility
axios.Cancel = axios.CanceledError;

// Expose all/spread
axios.all = function all(promises) {
  return Promise.all(promises);
};
axios.spread = _spread.default;

// Expose isAxiosError
axios.isAxiosError = _isAxiosError.default;

// Expose mergeConfig
axios.mergeConfig = _mergeConfig.default;
axios.AxiosHeaders = _AxiosHeaders.default;
axios.formToJSON = thing => (0, _formDataToJSON.default)(_utils.default.isHTMLForm(thing) ? new FormData(thing) : thing);
axios.getAdapter = _adapters.default.getAdapter;
axios.HttpStatusCode = _HttpStatusCode.default;
axios.default = axios;

// this module should only have a default export
var _default = exports.default = axios;

},{"./adapters/adapters.js":34,"./cancel/CancelToken.js":38,"./cancel/CanceledError.js":39,"./cancel/isCancel.js":40,"./core/Axios.js":41,"./core/AxiosError.js":42,"./core/AxiosHeaders.js":43,"./core/mergeConfig.js":47,"./defaults/index.js":50,"./env/data.js":52,"./helpers/HttpStatusCode.js":54,"./helpers/bind.js":55,"./helpers/formDataToJSON.js":60,"./helpers/isAxiosError.js":62,"./helpers/spread.js":70,"./helpers/toFormData.js":72,"./utils.js":82}],38:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _CanceledError = _interopRequireDefault(require("./CanceledError.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/**
 * A `CancelToken` is an object that can be used to request cancellation of an operation.
 *
 * @param {Function} executor The executor function.
 *
 * @returns {CancelToken}
 */
class CancelToken {
  constructor(executor) {
    if (typeof executor !== 'function') {
      throw new TypeError('executor must be a function.');
    }
    let resolvePromise;
    this.promise = new Promise(function promiseExecutor(resolve) {
      resolvePromise = resolve;
    });
    const token = this;

    // eslint-disable-next-line func-names
    this.promise.then(cancel => {
      if (!token._listeners) return;
      let i = token._listeners.length;
      while (i-- > 0) {
        token._listeners[i](cancel);
      }
      token._listeners = null;
    });

    // eslint-disable-next-line func-names
    this.promise.then = onfulfilled => {
      let _resolve;
      // eslint-disable-next-line func-names
      const promise = new Promise(resolve => {
        token.subscribe(resolve);
        _resolve = resolve;
      }).then(onfulfilled);
      promise.cancel = function reject() {
        token.unsubscribe(_resolve);
      };
      return promise;
    };
    executor(function cancel(message, config, request) {
      if (token.reason) {
        // Cancellation has already been requested
        return;
      }
      token.reason = new _CanceledError.default(message, config, request);
      resolvePromise(token.reason);
    });
  }

  /**
   * Throws a `CanceledError` if cancellation has been requested.
   */
  throwIfRequested() {
    if (this.reason) {
      throw this.reason;
    }
  }

  /**
   * Subscribe to the cancel signal
   */

  subscribe(listener) {
    if (this.reason) {
      listener(this.reason);
      return;
    }
    if (this._listeners) {
      this._listeners.push(listener);
    } else {
      this._listeners = [listener];
    }
  }

  /**
   * Unsubscribe from the cancel signal
   */

  unsubscribe(listener) {
    if (!this._listeners) {
      return;
    }
    const index = this._listeners.indexOf(listener);
    if (index !== -1) {
      this._listeners.splice(index, 1);
    }
  }

  /**
   * Returns an object that contains a new `CancelToken` and a function that, when called,
   * cancels the `CancelToken`.
   */
  static source() {
    let cancel;
    const token = new CancelToken(function executor(c) {
      cancel = c;
    });
    return {
      token,
      cancel
    };
  }
}
var _default = exports.default = CancelToken;

},{"./CanceledError.js":39}],39:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _AxiosError = _interopRequireDefault(require("../core/AxiosError.js"));
var _utils = _interopRequireDefault(require("../utils.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/**
 * A `CanceledError` is an object that is thrown when an operation is canceled.
 *
 * @param {string=} message The message.
 * @param {Object=} config The config.
 * @param {Object=} request The request.
 *
 * @returns {CanceledError} The created error.
 */
function CanceledError(message, config, request) {
  // eslint-disable-next-line no-eq-null,eqeqeq
  _AxiosError.default.call(this, message == null ? 'canceled' : message, _AxiosError.default.ERR_CANCELED, config, request);
  this.name = 'CanceledError';
}
_utils.default.inherits(CanceledError, _AxiosError.default, {
  __CANCEL__: true
});
var _default = exports.default = CanceledError;

},{"../core/AxiosError.js":42,"../utils.js":82}],40:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = isCancel;
function isCancel(value) {
  return !!(value && value.__CANCEL__);
}

},{}],41:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _utils = _interopRequireDefault(require("./../utils.js"));
var _buildURL = _interopRequireDefault(require("../helpers/buildURL.js"));
var _InterceptorManager = _interopRequireDefault(require("./InterceptorManager.js"));
var _dispatchRequest = _interopRequireDefault(require("./dispatchRequest.js"));
var _mergeConfig = _interopRequireDefault(require("./mergeConfig.js"));
var _buildFullPath = _interopRequireDefault(require("./buildFullPath.js"));
var _validator = _interopRequireDefault(require("../helpers/validator.js"));
var _AxiosHeaders = _interopRequireDefault(require("./AxiosHeaders.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const validators = _validator.default.validators;

/**
 * Create a new instance of Axios
 *
 * @param {Object} instanceConfig The default config for the instance
 *
 * @return {Axios} A new instance of Axios
 */
class Axios {
  constructor(instanceConfig) {
    this.defaults = instanceConfig;
    this.interceptors = {
      request: new _InterceptorManager.default(),
      response: new _InterceptorManager.default()
    };
  }

  /**
   * Dispatch a request
   *
   * @param {String|Object} configOrUrl The config specific for this request (merged with this.defaults)
   * @param {?Object} config
   *
   * @returns {Promise} The Promise to be fulfilled
   */
  async request(configOrUrl, config) {
    try {
      return await this._request(configOrUrl, config);
    } catch (err) {
      if (err instanceof Error) {
        let dummy;
        Error.captureStackTrace ? Error.captureStackTrace(dummy = {}) : dummy = new Error();

        // slice off the Error: ... line
        const stack = dummy.stack ? dummy.stack.replace(/^.+\n/, '') : '';
        try {
          if (!err.stack) {
            err.stack = stack;
            // match without the 2 top stack lines
          } else if (stack && !String(err.stack).endsWith(stack.replace(/^.+\n.+\n/, ''))) {
            err.stack += '\n' + stack;
          }
        } catch (e) {
          // ignore the case where "stack" is an un-writable property
        }
      }
      throw err;
    }
  }
  _request(configOrUrl, config) {
    /*eslint no-param-reassign:0*/
    // Allow for axios('example/url'[, config]) a la fetch API
    if (typeof configOrUrl === 'string') {
      config = config || {};
      config.url = configOrUrl;
    } else {
      config = configOrUrl || {};
    }
    config = (0, _mergeConfig.default)(this.defaults, config);
    const {
      transitional,
      paramsSerializer,
      headers
    } = config;
    if (transitional !== undefined) {
      _validator.default.assertOptions(transitional, {
        silentJSONParsing: validators.transitional(validators.boolean),
        forcedJSONParsing: validators.transitional(validators.boolean),
        clarifyTimeoutError: validators.transitional(validators.boolean)
      }, false);
    }
    if (paramsSerializer != null) {
      if (_utils.default.isFunction(paramsSerializer)) {
        config.paramsSerializer = {
          serialize: paramsSerializer
        };
      } else {
        _validator.default.assertOptions(paramsSerializer, {
          encode: validators.function,
          serialize: validators.function
        }, true);
      }
    }

    // Set config.method
    config.method = (config.method || this.defaults.method || 'get').toLowerCase();

    // Flatten headers
    let contextHeaders = headers && _utils.default.merge(headers.common, headers[config.method]);
    headers && _utils.default.forEach(['delete', 'get', 'head', 'post', 'put', 'patch', 'common'], method => {
      delete headers[method];
    });
    config.headers = _AxiosHeaders.default.concat(contextHeaders, headers);

    // filter out skipped interceptors
    const requestInterceptorChain = [];
    let synchronousRequestInterceptors = true;
    this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
      if (typeof interceptor.runWhen === 'function' && interceptor.runWhen(config) === false) {
        return;
      }
      synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;
      requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
    });
    const responseInterceptorChain = [];
    this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
      responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
    });
    let promise;
    let i = 0;
    let len;
    if (!synchronousRequestInterceptors) {
      const chain = [_dispatchRequest.default.bind(this), undefined];
      chain.unshift.apply(chain, requestInterceptorChain);
      chain.push.apply(chain, responseInterceptorChain);
      len = chain.length;
      promise = Promise.resolve(config);
      while (i < len) {
        promise = promise.then(chain[i++], chain[i++]);
      }
      return promise;
    }
    len = requestInterceptorChain.length;
    let newConfig = config;
    i = 0;
    while (i < len) {
      const onFulfilled = requestInterceptorChain[i++];
      const onRejected = requestInterceptorChain[i++];
      try {
        newConfig = onFulfilled(newConfig);
      } catch (error) {
        onRejected.call(this, error);
        break;
      }
    }
    try {
      promise = _dispatchRequest.default.call(this, newConfig);
    } catch (error) {
      return Promise.reject(error);
    }
    i = 0;
    len = responseInterceptorChain.length;
    while (i < len) {
      promise = promise.then(responseInterceptorChain[i++], responseInterceptorChain[i++]);
    }
    return promise;
  }
  getUri(config) {
    config = (0, _mergeConfig.default)(this.defaults, config);
    const fullPath = (0, _buildFullPath.default)(config.baseURL, config.url);
    return (0, _buildURL.default)(fullPath, config.params, config.paramsSerializer);
  }
}

// Provide aliases for supported request methods
_utils.default.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function (url, config) {
    return this.request((0, _mergeConfig.default)(config || {}, {
      method,
      url,
      data: (config || {}).data
    }));
  };
});
_utils.default.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  /*eslint func-names:0*/

  function generateHTTPMethod(isForm) {
    return function httpMethod(url, data, config) {
      return this.request((0, _mergeConfig.default)(config || {}, {
        method,
        headers: isForm ? {
          'Content-Type': 'multipart/form-data'
        } : {},
        url,
        data
      }));
    };
  }
  Axios.prototype[method] = generateHTTPMethod();
  Axios.prototype[method + 'Form'] = generateHTTPMethod(true);
});
var _default = exports.default = Axios;

},{"../helpers/buildURL.js":56,"../helpers/validator.js":75,"./../utils.js":82,"./AxiosHeaders.js":43,"./InterceptorManager.js":44,"./buildFullPath.js":45,"./dispatchRequest.js":46,"./mergeConfig.js":47}],42:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _utils = _interopRequireDefault(require("../utils.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/**
 * Create an Error with the specified message, config, error code, request and response.
 *
 * @param {string} message The error message.
 * @param {string} [code] The error code (for example, 'ECONNABORTED').
 * @param {Object} [config] The config.
 * @param {Object} [request] The request.
 * @param {Object} [response] The response.
 *
 * @returns {Error} The created error.
 */
function AxiosError(message, code, config, request, response) {
  Error.call(this);
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, this.constructor);
  } else {
    this.stack = new Error().stack;
  }
  this.message = message;
  this.name = 'AxiosError';
  code && (this.code = code);
  config && (this.config = config);
  request && (this.request = request);
  response && (this.response = response);
}
_utils.default.inherits(AxiosError, Error, {
  toJSON: function toJSON() {
    return {
      // Standard
      message: this.message,
      name: this.name,
      // Microsoft
      description: this.description,
      number: this.number,
      // Mozilla
      fileName: this.fileName,
      lineNumber: this.lineNumber,
      columnNumber: this.columnNumber,
      stack: this.stack,
      // Axios
      config: _utils.default.toJSONObject(this.config),
      code: this.code,
      status: this.response && this.response.status ? this.response.status : null
    };
  }
});
const prototype = AxiosError.prototype;
const descriptors = {};
['ERR_BAD_OPTION_VALUE', 'ERR_BAD_OPTION', 'ECONNABORTED', 'ETIMEDOUT', 'ERR_NETWORK', 'ERR_FR_TOO_MANY_REDIRECTS', 'ERR_DEPRECATED', 'ERR_BAD_RESPONSE', 'ERR_BAD_REQUEST', 'ERR_CANCELED', 'ERR_NOT_SUPPORT', 'ERR_INVALID_URL'
// eslint-disable-next-line func-names
].forEach(code => {
  descriptors[code] = {
    value: code
  };
});
Object.defineProperties(AxiosError, descriptors);
Object.defineProperty(prototype, 'isAxiosError', {
  value: true
});

// eslint-disable-next-line func-names
AxiosError.from = (error, code, config, request, response, customProps) => {
  const axiosError = Object.create(prototype);
  _utils.default.toFlatObject(error, axiosError, function filter(obj) {
    return obj !== Error.prototype;
  }, prop => {
    return prop !== 'isAxiosError';
  });
  AxiosError.call(axiosError, error.message, code, config, request, response);
  axiosError.cause = error;
  axiosError.name = error.name;
  customProps && Object.assign(axiosError, customProps);
  return axiosError;
};
var _default = exports.default = AxiosError;

},{"../utils.js":82}],43:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _utils = _interopRequireDefault(require("../utils.js"));
var _parseHeaders = _interopRequireDefault(require("../helpers/parseHeaders.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const $internals = Symbol('internals');
function normalizeHeader(header) {
  return header && String(header).trim().toLowerCase();
}
function normalizeValue(value) {
  if (value === false || value == null) {
    return value;
  }
  return _utils.default.isArray(value) ? value.map(normalizeValue) : String(value);
}
function parseTokens(str) {
  const tokens = Object.create(null);
  const tokensRE = /([^\s,;=]+)\s*(?:=\s*([^,;]+))?/g;
  let match;
  while (match = tokensRE.exec(str)) {
    tokens[match[1]] = match[2];
  }
  return tokens;
}
const isValidHeaderName = str => /^[-_a-zA-Z0-9^`|~,!#$%&'*+.]+$/.test(str.trim());
function matchHeaderValue(context, value, header, filter, isHeaderNameFilter) {
  if (_utils.default.isFunction(filter)) {
    return filter.call(this, value, header);
  }
  if (isHeaderNameFilter) {
    value = header;
  }
  if (!_utils.default.isString(value)) return;
  if (_utils.default.isString(filter)) {
    return value.indexOf(filter) !== -1;
  }
  if (_utils.default.isRegExp(filter)) {
    return filter.test(value);
  }
}
function formatHeader(header) {
  return header.trim().toLowerCase().replace(/([a-z\d])(\w*)/g, (w, char, str) => {
    return char.toUpperCase() + str;
  });
}
function buildAccessors(obj, header) {
  const accessorName = _utils.default.toCamelCase(' ' + header);
  ['get', 'set', 'has'].forEach(methodName => {
    Object.defineProperty(obj, methodName + accessorName, {
      value: function (arg1, arg2, arg3) {
        return this[methodName].call(this, header, arg1, arg2, arg3);
      },
      configurable: true
    });
  });
}
class AxiosHeaders {
  constructor(headers) {
    headers && this.set(headers);
  }
  set(header, valueOrRewrite, rewrite) {
    const self = this;
    function setHeader(_value, _header, _rewrite) {
      const lHeader = normalizeHeader(_header);
      if (!lHeader) {
        throw new Error('header name must be a non-empty string');
      }
      const key = _utils.default.findKey(self, lHeader);
      if (!key || self[key] === undefined || _rewrite === true || _rewrite === undefined && self[key] !== false) {
        self[key || _header] = normalizeValue(_value);
      }
    }
    const setHeaders = (headers, _rewrite) => _utils.default.forEach(headers, (_value, _header) => setHeader(_value, _header, _rewrite));
    if (_utils.default.isPlainObject(header) || header instanceof this.constructor) {
      setHeaders(header, valueOrRewrite);
    } else if (_utils.default.isString(header) && (header = header.trim()) && !isValidHeaderName(header)) {
      setHeaders((0, _parseHeaders.default)(header), valueOrRewrite);
    } else if (_utils.default.isHeaders(header)) {
      for (const [key, value] of header.entries()) {
        setHeader(value, key, rewrite);
      }
    } else {
      header != null && setHeader(valueOrRewrite, header, rewrite);
    }
    return this;
  }
  get(header, parser) {
    header = normalizeHeader(header);
    if (header) {
      const key = _utils.default.findKey(this, header);
      if (key) {
        const value = this[key];
        if (!parser) {
          return value;
        }
        if (parser === true) {
          return parseTokens(value);
        }
        if (_utils.default.isFunction(parser)) {
          return parser.call(this, value, key);
        }
        if (_utils.default.isRegExp(parser)) {
          return parser.exec(value);
        }
        throw new TypeError('parser must be boolean|regexp|function');
      }
    }
  }
  has(header, matcher) {
    header = normalizeHeader(header);
    if (header) {
      const key = _utils.default.findKey(this, header);
      return !!(key && this[key] !== undefined && (!matcher || matchHeaderValue(this, this[key], key, matcher)));
    }
    return false;
  }
  delete(header, matcher) {
    const self = this;
    let deleted = false;
    function deleteHeader(_header) {
      _header = normalizeHeader(_header);
      if (_header) {
        const key = _utils.default.findKey(self, _header);
        if (key && (!matcher || matchHeaderValue(self, self[key], key, matcher))) {
          delete self[key];
          deleted = true;
        }
      }
    }
    if (_utils.default.isArray(header)) {
      header.forEach(deleteHeader);
    } else {
      deleteHeader(header);
    }
    return deleted;
  }
  clear(matcher) {
    const keys = Object.keys(this);
    let i = keys.length;
    let deleted = false;
    while (i--) {
      const key = keys[i];
      if (!matcher || matchHeaderValue(this, this[key], key, matcher, true)) {
        delete this[key];
        deleted = true;
      }
    }
    return deleted;
  }
  normalize(format) {
    const self = this;
    const headers = {};
    _utils.default.forEach(this, (value, header) => {
      const key = _utils.default.findKey(headers, header);
      if (key) {
        self[key] = normalizeValue(value);
        delete self[header];
        return;
      }
      const normalized = format ? formatHeader(header) : String(header).trim();
      if (normalized !== header) {
        delete self[header];
      }
      self[normalized] = normalizeValue(value);
      headers[normalized] = true;
    });
    return this;
  }
  concat(...targets) {
    return this.constructor.concat(this, ...targets);
  }
  toJSON(asStrings) {
    const obj = Object.create(null);
    _utils.default.forEach(this, (value, header) => {
      value != null && value !== false && (obj[header] = asStrings && _utils.default.isArray(value) ? value.join(', ') : value);
    });
    return obj;
  }
  [Symbol.iterator]() {
    return Object.entries(this.toJSON())[Symbol.iterator]();
  }
  toString() {
    return Object.entries(this.toJSON()).map(([header, value]) => header + ': ' + value).join('\n');
  }
  get [Symbol.toStringTag]() {
    return 'AxiosHeaders';
  }
  static from(thing) {
    return thing instanceof this ? thing : new this(thing);
  }
  static concat(first, ...targets) {
    const computed = new this(first);
    targets.forEach(target => computed.set(target));
    return computed;
  }
  static accessor(header) {
    const internals = this[$internals] = this[$internals] = {
      accessors: {}
    };
    const accessors = internals.accessors;
    const prototype = this.prototype;
    function defineAccessor(_header) {
      const lHeader = normalizeHeader(_header);
      if (!accessors[lHeader]) {
        buildAccessors(prototype, _header);
        accessors[lHeader] = true;
      }
    }
    _utils.default.isArray(header) ? header.forEach(defineAccessor) : defineAccessor(header);
    return this;
  }
}
AxiosHeaders.accessor(['Content-Type', 'Content-Length', 'Accept', 'Accept-Encoding', 'User-Agent', 'Authorization']);

// reserved names hotfix
_utils.default.reduceDescriptors(AxiosHeaders.prototype, ({
  value
}, key) => {
  let mapped = key[0].toUpperCase() + key.slice(1); // map `set` => `Set`
  return {
    get: () => value,
    set(headerValue) {
      this[mapped] = headerValue;
    }
  };
});
_utils.default.freezeMethods(AxiosHeaders);
var _default = exports.default = AxiosHeaders;

},{"../helpers/parseHeaders.js":65,"../utils.js":82}],44:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _utils = _interopRequireDefault(require("./../utils.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
class InterceptorManager {
  constructor() {
    this.handlers = [];
  }

  /**
   * Add a new interceptor to the stack
   *
   * @param {Function} fulfilled The function to handle `then` for a `Promise`
   * @param {Function} rejected The function to handle `reject` for a `Promise`
   *
   * @return {Number} An ID used to remove interceptor later
   */
  use(fulfilled, rejected, options) {
    this.handlers.push({
      fulfilled,
      rejected,
      synchronous: options ? options.synchronous : false,
      runWhen: options ? options.runWhen : null
    });
    return this.handlers.length - 1;
  }

  /**
   * Remove an interceptor from the stack
   *
   * @param {Number} id The ID that was returned by `use`
   *
   * @returns {Boolean} `true` if the interceptor was removed, `false` otherwise
   */
  eject(id) {
    if (this.handlers[id]) {
      this.handlers[id] = null;
    }
  }

  /**
   * Clear all interceptors from the stack
   *
   * @returns {void}
   */
  clear() {
    if (this.handlers) {
      this.handlers = [];
    }
  }

  /**
   * Iterate over all the registered interceptors
   *
   * This method is particularly useful for skipping over any
   * interceptors that may have become `null` calling `eject`.
   *
   * @param {Function} fn The function to call for each interceptor
   *
   * @returns {void}
   */
  forEach(fn) {
    _utils.default.forEach(this.handlers, function forEachHandler(h) {
      if (h !== null) {
        fn(h);
      }
    });
  }
}
var _default = exports.default = InterceptorManager;

},{"./../utils.js":82}],45:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = buildFullPath;
var _isAbsoluteURL = _interopRequireDefault(require("../helpers/isAbsoluteURL.js"));
var _combineURLs = _interopRequireDefault(require("../helpers/combineURLs.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/**
 * Creates a new URL by combining the baseURL with the requestedURL,
 * only when the requestedURL is not already an absolute URL.
 * If the requestURL is absolute, this function returns the requestedURL untouched.
 *
 * @param {string} baseURL The base URL
 * @param {string} requestedURL Absolute or relative URL to combine
 *
 * @returns {string} The combined full path
 */
function buildFullPath(baseURL, requestedURL) {
  if (baseURL && !(0, _isAbsoluteURL.default)(requestedURL)) {
    return (0, _combineURLs.default)(baseURL, requestedURL);
  }
  return requestedURL;
}

},{"../helpers/combineURLs.js":57,"../helpers/isAbsoluteURL.js":61}],46:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = dispatchRequest;
var _transformData = _interopRequireDefault(require("./transformData.js"));
var _isCancel = _interopRequireDefault(require("../cancel/isCancel.js"));
var _index = _interopRequireDefault(require("../defaults/index.js"));
var _CanceledError = _interopRequireDefault(require("../cancel/CanceledError.js"));
var _AxiosHeaders = _interopRequireDefault(require("../core/AxiosHeaders.js"));
var _adapters = _interopRequireDefault(require("../adapters/adapters.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/**
 * Throws a `CanceledError` if cancellation has been requested.
 *
 * @param {Object} config The config that is to be used for the request
 *
 * @returns {void}
 */
function throwIfCancellationRequested(config) {
  if (config.cancelToken) {
    config.cancelToken.throwIfRequested();
  }
  if (config.signal && config.signal.aborted) {
    throw new _CanceledError.default(null, config);
  }
}

/**
 * Dispatch a request to the server using the configured adapter.
 *
 * @param {object} config The config that is to be used for the request
 *
 * @returns {Promise} The Promise to be fulfilled
 */
function dispatchRequest(config) {
  throwIfCancellationRequested(config);
  config.headers = _AxiosHeaders.default.from(config.headers);

  // Transform request data
  config.data = _transformData.default.call(config, config.transformRequest);
  if (['post', 'put', 'patch'].indexOf(config.method) !== -1) {
    config.headers.setContentType('application/x-www-form-urlencoded', false);
  }
  const adapter = _adapters.default.getAdapter(config.adapter || _index.default.adapter);
  return adapter(config).then(function onAdapterResolution(response) {
    throwIfCancellationRequested(config);

    // Transform response data
    response.data = _transformData.default.call(config, config.transformResponse, response);
    response.headers = _AxiosHeaders.default.from(response.headers);
    return response;
  }, function onAdapterRejection(reason) {
    if (!(0, _isCancel.default)(reason)) {
      throwIfCancellationRequested(config);

      // Transform response data
      if (reason && reason.response) {
        reason.response.data = _transformData.default.call(config, config.transformResponse, reason.response);
        reason.response.headers = _AxiosHeaders.default.from(reason.response.headers);
      }
    }
    return Promise.reject(reason);
  });
}

},{"../adapters/adapters.js":34,"../cancel/CanceledError.js":39,"../cancel/isCancel.js":40,"../core/AxiosHeaders.js":43,"../defaults/index.js":50,"./transformData.js":49}],47:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = mergeConfig;
var _utils = _interopRequireDefault(require("../utils.js"));
var _AxiosHeaders = _interopRequireDefault(require("./AxiosHeaders.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const headersToObject = thing => thing instanceof _AxiosHeaders.default ? {
  ...thing
} : thing;

/**
 * Config-specific merge-function which creates a new config-object
 * by merging two configuration objects together.
 *
 * @param {Object} config1
 * @param {Object} config2
 *
 * @returns {Object} New object resulting from merging config2 to config1
 */
function mergeConfig(config1, config2) {
  // eslint-disable-next-line no-param-reassign
  config2 = config2 || {};
  const config = {};
  function getMergedValue(target, source, caseless) {
    if (_utils.default.isPlainObject(target) && _utils.default.isPlainObject(source)) {
      return _utils.default.merge.call({
        caseless
      }, target, source);
    } else if (_utils.default.isPlainObject(source)) {
      return _utils.default.merge({}, source);
    } else if (_utils.default.isArray(source)) {
      return source.slice();
    }
    return source;
  }

  // eslint-disable-next-line consistent-return
  function mergeDeepProperties(a, b, caseless) {
    if (!_utils.default.isUndefined(b)) {
      return getMergedValue(a, b, caseless);
    } else if (!_utils.default.isUndefined(a)) {
      return getMergedValue(undefined, a, caseless);
    }
  }

  // eslint-disable-next-line consistent-return
  function valueFromConfig2(a, b) {
    if (!_utils.default.isUndefined(b)) {
      return getMergedValue(undefined, b);
    }
  }

  // eslint-disable-next-line consistent-return
  function defaultToConfig2(a, b) {
    if (!_utils.default.isUndefined(b)) {
      return getMergedValue(undefined, b);
    } else if (!_utils.default.isUndefined(a)) {
      return getMergedValue(undefined, a);
    }
  }

  // eslint-disable-next-line consistent-return
  function mergeDirectKeys(a, b, prop) {
    if (prop in config2) {
      return getMergedValue(a, b);
    } else if (prop in config1) {
      return getMergedValue(undefined, a);
    }
  }
  const mergeMap = {
    url: valueFromConfig2,
    method: valueFromConfig2,
    data: valueFromConfig2,
    baseURL: defaultToConfig2,
    transformRequest: defaultToConfig2,
    transformResponse: defaultToConfig2,
    paramsSerializer: defaultToConfig2,
    timeout: defaultToConfig2,
    timeoutMessage: defaultToConfig2,
    withCredentials: defaultToConfig2,
    withXSRFToken: defaultToConfig2,
    adapter: defaultToConfig2,
    responseType: defaultToConfig2,
    xsrfCookieName: defaultToConfig2,
    xsrfHeaderName: defaultToConfig2,
    onUploadProgress: defaultToConfig2,
    onDownloadProgress: defaultToConfig2,
    decompress: defaultToConfig2,
    maxContentLength: defaultToConfig2,
    maxBodyLength: defaultToConfig2,
    beforeRedirect: defaultToConfig2,
    transport: defaultToConfig2,
    httpAgent: defaultToConfig2,
    httpsAgent: defaultToConfig2,
    cancelToken: defaultToConfig2,
    socketPath: defaultToConfig2,
    responseEncoding: defaultToConfig2,
    validateStatus: mergeDirectKeys,
    headers: (a, b) => mergeDeepProperties(headersToObject(a), headersToObject(b), true)
  };
  _utils.default.forEach(Object.keys(Object.assign({}, config1, config2)), function computeConfigValue(prop) {
    const merge = mergeMap[prop] || mergeDeepProperties;
    const configValue = merge(config1[prop], config2[prop], prop);
    _utils.default.isUndefined(configValue) && merge !== mergeDirectKeys || (config[prop] = configValue);
  });
  return config;
}

},{"../utils.js":82,"./AxiosHeaders.js":43}],48:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = settle;
var _AxiosError = _interopRequireDefault(require("./AxiosError.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/**
 * Resolve or reject a Promise based on response status.
 *
 * @param {Function} resolve A function that resolves the promise.
 * @param {Function} reject A function that rejects the promise.
 * @param {object} response The response.
 *
 * @returns {object} The response.
 */
function settle(resolve, reject, response) {
  const validateStatus = response.config.validateStatus;
  if (!response.status || !validateStatus || validateStatus(response.status)) {
    resolve(response);
  } else {
    reject(new _AxiosError.default('Request failed with status code ' + response.status, [_AxiosError.default.ERR_BAD_REQUEST, _AxiosError.default.ERR_BAD_RESPONSE][Math.floor(response.status / 100) - 4], response.config, response.request, response));
  }
}

},{"./AxiosError.js":42}],49:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = transformData;
var _utils = _interopRequireDefault(require("./../utils.js"));
var _index = _interopRequireDefault(require("../defaults/index.js"));
var _AxiosHeaders = _interopRequireDefault(require("../core/AxiosHeaders.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/**
 * Transform the data for a request or a response
 *
 * @param {Array|Function} fns A single function or Array of functions
 * @param {?Object} response The response object
 *
 * @returns {*} The resulting transformed data
 */
function transformData(fns, response) {
  const config = this || _index.default;
  const context = response || config;
  const headers = _AxiosHeaders.default.from(context.headers);
  let data = context.data;
  _utils.default.forEach(fns, function transform(fn) {
    data = fn.call(config, data, headers.normalize(), response ? response.status : undefined);
  });
  headers.normalize();
  return data;
}

},{"../core/AxiosHeaders.js":43,"../defaults/index.js":50,"./../utils.js":82}],50:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _utils = _interopRequireDefault(require("../utils.js"));
var _AxiosError = _interopRequireDefault(require("../core/AxiosError.js"));
var _transitional = _interopRequireDefault(require("./transitional.js"));
var _toFormData = _interopRequireDefault(require("../helpers/toFormData.js"));
var _toURLEncodedForm = _interopRequireDefault(require("../helpers/toURLEncodedForm.js"));
var _index = _interopRequireDefault(require("../platform/index.js"));
var _formDataToJSON = _interopRequireDefault(require("../helpers/formDataToJSON.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/**
 * It takes a string, tries to parse it, and if it fails, it returns the stringified version
 * of the input
 *
 * @param {any} rawValue - The value to be stringified.
 * @param {Function} parser - A function that parses a string into a JavaScript object.
 * @param {Function} encoder - A function that takes a value and returns a string.
 *
 * @returns {string} A stringified version of the rawValue.
 */
function stringifySafely(rawValue, parser, encoder) {
  if (_utils.default.isString(rawValue)) {
    try {
      (parser || JSON.parse)(rawValue);
      return _utils.default.trim(rawValue);
    } catch (e) {
      if (e.name !== 'SyntaxError') {
        throw e;
      }
    }
  }
  return (encoder || JSON.stringify)(rawValue);
}
const defaults = {
  transitional: _transitional.default,
  adapter: ['xhr', 'http', 'fetch'],
  transformRequest: [function transformRequest(data, headers) {
    const contentType = headers.getContentType() || '';
    const hasJSONContentType = contentType.indexOf('application/json') > -1;
    const isObjectPayload = _utils.default.isObject(data);
    if (isObjectPayload && _utils.default.isHTMLForm(data)) {
      data = new FormData(data);
    }
    const isFormData = _utils.default.isFormData(data);
    if (isFormData) {
      return hasJSONContentType ? JSON.stringify((0, _formDataToJSON.default)(data)) : data;
    }
    if (_utils.default.isArrayBuffer(data) || _utils.default.isBuffer(data) || _utils.default.isStream(data) || _utils.default.isFile(data) || _utils.default.isBlob(data) || _utils.default.isReadableStream(data)) {
      return data;
    }
    if (_utils.default.isArrayBufferView(data)) {
      return data.buffer;
    }
    if (_utils.default.isURLSearchParams(data)) {
      headers.setContentType('application/x-www-form-urlencoded;charset=utf-8', false);
      return data.toString();
    }
    let isFileList;
    if (isObjectPayload) {
      if (contentType.indexOf('application/x-www-form-urlencoded') > -1) {
        return (0, _toURLEncodedForm.default)(data, this.formSerializer).toString();
      }
      if ((isFileList = _utils.default.isFileList(data)) || contentType.indexOf('multipart/form-data') > -1) {
        const _FormData = this.env && this.env.FormData;
        return (0, _toFormData.default)(isFileList ? {
          'files[]': data
        } : data, _FormData && new _FormData(), this.formSerializer);
      }
    }
    if (isObjectPayload || hasJSONContentType) {
      headers.setContentType('application/json', false);
      return stringifySafely(data);
    }
    return data;
  }],
  transformResponse: [function transformResponse(data) {
    const transitional = this.transitional || defaults.transitional;
    const forcedJSONParsing = transitional && transitional.forcedJSONParsing;
    const JSONRequested = this.responseType === 'json';
    if (_utils.default.isResponse(data) || _utils.default.isReadableStream(data)) {
      return data;
    }
    if (data && _utils.default.isString(data) && (forcedJSONParsing && !this.responseType || JSONRequested)) {
      const silentJSONParsing = transitional && transitional.silentJSONParsing;
      const strictJSONParsing = !silentJSONParsing && JSONRequested;
      try {
        return JSON.parse(data);
      } catch (e) {
        if (strictJSONParsing) {
          if (e.name === 'SyntaxError') {
            throw _AxiosError.default.from(e, _AxiosError.default.ERR_BAD_RESPONSE, this, null, this.response);
          }
          throw e;
        }
      }
    }
    return data;
  }],
  /**
   * A timeout in milliseconds to abort a request. If set to 0 (default) a
   * timeout is not created.
   */
  timeout: 0,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  maxContentLength: -1,
  maxBodyLength: -1,
  env: {
    FormData: _index.default.classes.FormData,
    Blob: _index.default.classes.Blob
  },
  validateStatus: function validateStatus(status) {
    return status >= 200 && status < 300;
  },
  headers: {
    common: {
      'Accept': 'application/json, text/plain, */*',
      'Content-Type': undefined
    }
  }
};
_utils.default.forEach(['delete', 'get', 'head', 'post', 'put', 'patch'], method => {
  defaults.headers[method] = {};
});
var _default = exports.default = defaults;

},{"../core/AxiosError.js":42,"../helpers/formDataToJSON.js":60,"../helpers/toFormData.js":72,"../helpers/toURLEncodedForm.js":73,"../platform/index.js":81,"../utils.js":82,"./transitional.js":51}],51:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _default = exports.default = {
  silentJSONParsing: true,
  forcedJSONParsing: true,
  clarifyTimeoutError: false
};

},{}],52:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.VERSION = void 0;
const VERSION = exports.VERSION = "1.7.4";

},{}],53:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _toFormData = _interopRequireDefault(require("./toFormData.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/**
 * It encodes a string by replacing all characters that are not in the unreserved set with
 * their percent-encoded equivalents
 *
 * @param {string} str - The string to encode.
 *
 * @returns {string} The encoded string.
 */
function encode(str) {
  const charMap = {
    '!': '%21',
    "'": '%27',
    '(': '%28',
    ')': '%29',
    '~': '%7E',
    '%20': '+',
    '%00': '\x00'
  };
  return encodeURIComponent(str).replace(/[!'()~]|%20|%00/g, function replacer(match) {
    return charMap[match];
  });
}

/**
 * It takes a params object and converts it to a FormData object
 *
 * @param {Object<string, any>} params - The parameters to be converted to a FormData object.
 * @param {Object<string, any>} options - The options object passed to the Axios constructor.
 *
 * @returns {void}
 */
function AxiosURLSearchParams(params, options) {
  this._pairs = [];
  params && (0, _toFormData.default)(params, this, options);
}
const prototype = AxiosURLSearchParams.prototype;
prototype.append = function append(name, value) {
  this._pairs.push([name, value]);
};
prototype.toString = function toString(encoder) {
  const _encode = encoder ? function (value) {
    return encoder.call(this, value, encode);
  } : encode;
  return this._pairs.map(function each(pair) {
    return _encode(pair[0]) + '=' + _encode(pair[1]);
  }, '').join('&');
};
var _default = exports.default = AxiosURLSearchParams;

},{"./toFormData.js":72}],54:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
const HttpStatusCode = {
  Continue: 100,
  SwitchingProtocols: 101,
  Processing: 102,
  EarlyHints: 103,
  Ok: 200,
  Created: 201,
  Accepted: 202,
  NonAuthoritativeInformation: 203,
  NoContent: 204,
  ResetContent: 205,
  PartialContent: 206,
  MultiStatus: 207,
  AlreadyReported: 208,
  ImUsed: 226,
  MultipleChoices: 300,
  MovedPermanently: 301,
  Found: 302,
  SeeOther: 303,
  NotModified: 304,
  UseProxy: 305,
  Unused: 306,
  TemporaryRedirect: 307,
  PermanentRedirect: 308,
  BadRequest: 400,
  Unauthorized: 401,
  PaymentRequired: 402,
  Forbidden: 403,
  NotFound: 404,
  MethodNotAllowed: 405,
  NotAcceptable: 406,
  ProxyAuthenticationRequired: 407,
  RequestTimeout: 408,
  Conflict: 409,
  Gone: 410,
  LengthRequired: 411,
  PreconditionFailed: 412,
  PayloadTooLarge: 413,
  UriTooLong: 414,
  UnsupportedMediaType: 415,
  RangeNotSatisfiable: 416,
  ExpectationFailed: 417,
  ImATeapot: 418,
  MisdirectedRequest: 421,
  UnprocessableEntity: 422,
  Locked: 423,
  FailedDependency: 424,
  TooEarly: 425,
  UpgradeRequired: 426,
  PreconditionRequired: 428,
  TooManyRequests: 429,
  RequestHeaderFieldsTooLarge: 431,
  UnavailableForLegalReasons: 451,
  InternalServerError: 500,
  NotImplemented: 501,
  BadGateway: 502,
  ServiceUnavailable: 503,
  GatewayTimeout: 504,
  HttpVersionNotSupported: 505,
  VariantAlsoNegotiates: 506,
  InsufficientStorage: 507,
  LoopDetected: 508,
  NotExtended: 510,
  NetworkAuthenticationRequired: 511
};
Object.entries(HttpStatusCode).forEach(([key, value]) => {
  HttpStatusCode[value] = key;
});
var _default = exports.default = HttpStatusCode;

},{}],55:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = bind;
function bind(fn, thisArg) {
  return function wrap() {
    return fn.apply(thisArg, arguments);
  };
}

},{}],56:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = buildURL;
var _utils = _interopRequireDefault(require("../utils.js"));
var _AxiosURLSearchParams = _interopRequireDefault(require("../helpers/AxiosURLSearchParams.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/**
 * It replaces all instances of the characters `:`, `$`, `,`, `+`, `[`, and `]` with their
 * URI encoded counterparts
 *
 * @param {string} val The value to be encoded.
 *
 * @returns {string} The encoded value.
 */
function encode(val) {
  return encodeURIComponent(val).replace(/%3A/gi, ':').replace(/%24/g, '$').replace(/%2C/gi, ',').replace(/%20/g, '+').replace(/%5B/gi, '[').replace(/%5D/gi, ']');
}

/**
 * Build a URL by appending params to the end
 *
 * @param {string} url The base of the url (e.g., http://www.google.com)
 * @param {object} [params] The params to be appended
 * @param {?object} options
 *
 * @returns {string} The formatted url
 */
function buildURL(url, params, options) {
  /*eslint no-param-reassign:0*/
  if (!params) {
    return url;
  }
  const _encode = options && options.encode || encode;
  const serializeFn = options && options.serialize;
  let serializedParams;
  if (serializeFn) {
    serializedParams = serializeFn(params, options);
  } else {
    serializedParams = _utils.default.isURLSearchParams(params) ? params.toString() : new _AxiosURLSearchParams.default(params, options).toString(_encode);
  }
  if (serializedParams) {
    const hashmarkIndex = url.indexOf("#");
    if (hashmarkIndex !== -1) {
      url = url.slice(0, hashmarkIndex);
    }
    url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams;
  }
  return url;
}

},{"../helpers/AxiosURLSearchParams.js":53,"../utils.js":82}],57:[function(require,module,exports){
'use strict';

/**
 * Creates a new URL by combining the specified URLs
 *
 * @param {string} baseURL The base URL
 * @param {string} relativeURL The relative URL
 *
 * @returns {string} The combined URL
 */
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = combineURLs;
function combineURLs(baseURL, relativeURL) {
  return relativeURL ? baseURL.replace(/\/?\/$/, '') + '/' + relativeURL.replace(/^\/+/, '') : baseURL;
}

},{}],58:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _CanceledError = _interopRequireDefault(require("../cancel/CanceledError.js"));
var _AxiosError = _interopRequireDefault(require("../core/AxiosError.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const composeSignals = (signals, timeout) => {
  let controller = new AbortController();
  let aborted;
  const onabort = function (cancel) {
    if (!aborted) {
      aborted = true;
      unsubscribe();
      const err = cancel instanceof Error ? cancel : this.reason;
      controller.abort(err instanceof _AxiosError.default ? err : new _CanceledError.default(err instanceof Error ? err.message : err));
    }
  };
  let timer = timeout && setTimeout(() => {
    onabort(new _AxiosError.default(`timeout ${timeout} of ms exceeded`, _AxiosError.default.ETIMEDOUT));
  }, timeout);
  const unsubscribe = () => {
    if (signals) {
      timer && clearTimeout(timer);
      timer = null;
      signals.forEach(signal => {
        signal && (signal.removeEventListener ? signal.removeEventListener('abort', onabort) : signal.unsubscribe(onabort));
      });
      signals = null;
    }
  };
  signals.forEach(signal => signal && signal.addEventListener && signal.addEventListener('abort', onabort));
  const {
    signal
  } = controller;
  signal.unsubscribe = unsubscribe;
  return [signal, () => {
    timer && clearTimeout(timer);
    timer = null;
  }];
};
var _default = exports.default = composeSignals;

},{"../cancel/CanceledError.js":39,"../core/AxiosError.js":42}],59:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _utils = _interopRequireDefault(require("./../utils.js"));
var _index = _interopRequireDefault(require("../platform/index.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
var _default = exports.default = _index.default.hasStandardBrowserEnv ?
// Standard browser envs support document.cookie
{
  write(name, value, expires, path, domain, secure) {
    const cookie = [name + '=' + encodeURIComponent(value)];
    _utils.default.isNumber(expires) && cookie.push('expires=' + new Date(expires).toGMTString());
    _utils.default.isString(path) && cookie.push('path=' + path);
    _utils.default.isString(domain) && cookie.push('domain=' + domain);
    secure === true && cookie.push('secure');
    document.cookie = cookie.join('; ');
  },
  read(name) {
    const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
    return match ? decodeURIComponent(match[3]) : null;
  },
  remove(name) {
    this.write(name, '', Date.now() - 86400000);
  }
} :
// Non-standard browser env (web workers, react-native) lack needed support.
{
  write() {},
  read() {
    return null;
  },
  remove() {}
};

},{"../platform/index.js":81,"./../utils.js":82}],60:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _utils = _interopRequireDefault(require("../utils.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/**
 * It takes a string like `foo[x][y][z]` and returns an array like `['foo', 'x', 'y', 'z']
 *
 * @param {string} name - The name of the property to get.
 *
 * @returns An array of strings.
 */
function parsePropPath(name) {
  // foo[x][y][z]
  // foo.x.y.z
  // foo-x-y-z
  // foo x y z
  return _utils.default.matchAll(/\w+|\[(\w*)]/g, name).map(match => {
    return match[0] === '[]' ? '' : match[1] || match[0];
  });
}

/**
 * Convert an array to an object.
 *
 * @param {Array<any>} arr - The array to convert to an object.
 *
 * @returns An object with the same keys and values as the array.
 */
function arrayToObject(arr) {
  const obj = {};
  const keys = Object.keys(arr);
  let i;
  const len = keys.length;
  let key;
  for (i = 0; i < len; i++) {
    key = keys[i];
    obj[key] = arr[key];
  }
  return obj;
}

/**
 * It takes a FormData object and returns a JavaScript object
 *
 * @param {string} formData The FormData object to convert to JSON.
 *
 * @returns {Object<string, any> | null} The converted object.
 */
function formDataToJSON(formData) {
  function buildPath(path, value, target, index) {
    let name = path[index++];
    if (name === '__proto__') return true;
    const isNumericKey = Number.isFinite(+name);
    const isLast = index >= path.length;
    name = !name && _utils.default.isArray(target) ? target.length : name;
    if (isLast) {
      if (_utils.default.hasOwnProp(target, name)) {
        target[name] = [target[name], value];
      } else {
        target[name] = value;
      }
      return !isNumericKey;
    }
    if (!target[name] || !_utils.default.isObject(target[name])) {
      target[name] = [];
    }
    const result = buildPath(path, value, target[name], index);
    if (result && _utils.default.isArray(target[name])) {
      target[name] = arrayToObject(target[name]);
    }
    return !isNumericKey;
  }
  if (_utils.default.isFormData(formData) && _utils.default.isFunction(formData.entries)) {
    const obj = {};
    _utils.default.forEachEntry(formData, (name, value) => {
      buildPath(parsePropPath(name), value, obj, 0);
    });
    return obj;
  }
  return null;
}
var _default = exports.default = formDataToJSON;

},{"../utils.js":82}],61:[function(require,module,exports){
'use strict';

/**
 * Determines whether the specified URL is absolute
 *
 * @param {string} url The URL to test
 *
 * @returns {boolean} True if the specified URL is absolute, otherwise false
 */
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = isAbsoluteURL;
function isAbsoluteURL(url) {
  // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
  // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
  // by any combination of letters, digits, plus, period, or hyphen.
  return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url);
}

},{}],62:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = isAxiosError;
var _utils = _interopRequireDefault(require("./../utils.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/**
 * Determines whether the payload is an error thrown by Axios
 *
 * @param {*} payload The value to test
 *
 * @returns {boolean} True if the payload is an error thrown by Axios, otherwise false
 */
function isAxiosError(payload) {
  return _utils.default.isObject(payload) && payload.isAxiosError === true;
}

},{"./../utils.js":82}],63:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _utils = _interopRequireDefault(require("./../utils.js"));
var _index = _interopRequireDefault(require("../platform/index.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
var _default = exports.default = _index.default.hasStandardBrowserEnv ?
// Standard browser envs have full support of the APIs needed to test
// whether the request URL is of the same origin as current location.
function standardBrowserEnv() {
  const msie = /(msie|trident)/i.test(navigator.userAgent);
  const urlParsingNode = document.createElement('a');
  let originURL;

  /**
  * Parse a URL to discover its components
  *
  * @param {String} url The URL to be parsed
  * @returns {Object}
  */
  function resolveURL(url) {
    let href = url;
    if (msie) {
      // IE needs attribute set twice to normalize properties
      urlParsingNode.setAttribute('href', href);
      href = urlParsingNode.href;
    }
    urlParsingNode.setAttribute('href', href);

    // urlParsingNode provides the UrlUtils interface - http://url.spec.whatwg.org/#urlutils
    return {
      href: urlParsingNode.href,
      protocol: urlParsingNode.protocol ? urlParsingNode.protocol.replace(/:$/, '') : '',
      host: urlParsingNode.host,
      search: urlParsingNode.search ? urlParsingNode.search.replace(/^\?/, '') : '',
      hash: urlParsingNode.hash ? urlParsingNode.hash.replace(/^#/, '') : '',
      hostname: urlParsingNode.hostname,
      port: urlParsingNode.port,
      pathname: urlParsingNode.pathname.charAt(0) === '/' ? urlParsingNode.pathname : '/' + urlParsingNode.pathname
    };
  }
  originURL = resolveURL(window.location.href);

  /**
  * Determine if a URL shares the same origin as the current location
  *
  * @param {String} requestURL The URL to test
  * @returns {boolean} True if URL shares the same origin, otherwise false
  */
  return function isURLSameOrigin(requestURL) {
    const parsed = _utils.default.isString(requestURL) ? resolveURL(requestURL) : requestURL;
    return parsed.protocol === originURL.protocol && parsed.host === originURL.host;
  };
}() :
// Non standard browser envs (web workers, react-native) lack needed support.
function nonStandardBrowserEnv() {
  return function isURLSameOrigin() {
    return true;
  };
}();

},{"../platform/index.js":81,"./../utils.js":82}],64:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
// eslint-disable-next-line strict
var _default = exports.default = null;

},{}],65:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _utils = _interopRequireDefault(require("./../utils.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
// RawAxiosHeaders whose duplicates are ignored by node
// c.f. https://nodejs.org/api/http.html#http_message_headers
const ignoreDuplicateOf = _utils.default.toObjectSet(['age', 'authorization', 'content-length', 'content-type', 'etag', 'expires', 'from', 'host', 'if-modified-since', 'if-unmodified-since', 'last-modified', 'location', 'max-forwards', 'proxy-authorization', 'referer', 'retry-after', 'user-agent']);

/**
 * Parse headers into an object
 *
 * ```
 * Date: Wed, 27 Aug 2014 08:58:49 GMT
 * Content-Type: application/json
 * Connection: keep-alive
 * Transfer-Encoding: chunked
 * ```
 *
 * @param {String} rawHeaders Headers needing to be parsed
 *
 * @returns {Object} Headers parsed into an object
 */
var _default = rawHeaders => {
  const parsed = {};
  let key;
  let val;
  let i;
  rawHeaders && rawHeaders.split('\n').forEach(function parser(line) {
    i = line.indexOf(':');
    key = line.substring(0, i).trim().toLowerCase();
    val = line.substring(i + 1).trim();
    if (!key || parsed[key] && ignoreDuplicateOf[key]) {
      return;
    }
    if (key === 'set-cookie') {
      if (parsed[key]) {
        parsed[key].push(val);
      } else {
        parsed[key] = [val];
      }
    } else {
      parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
    }
  });
  return parsed;
};
exports.default = _default;

},{"./../utils.js":82}],66:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = parseProtocol;
function parseProtocol(url) {
  const match = /^([-+\w]{1,25})(:?\/\/|:)/.exec(url);
  return match && match[1] || '';
}

},{}],67:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.progressEventReducer = exports.progressEventDecorator = exports.asyncDecorator = void 0;
var _speedometer2 = _interopRequireDefault(require("./speedometer.js"));
var _throttle = _interopRequireDefault(require("./throttle.js"));
var _utils = _interopRequireDefault(require("../utils.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const progressEventReducer = (listener, isDownloadStream, freq = 3) => {
  let bytesNotified = 0;
  const _speedometer = (0, _speedometer2.default)(50, 250);
  return (0, _throttle.default)(e => {
    const loaded = e.loaded;
    const total = e.lengthComputable ? e.total : undefined;
    const progressBytes = loaded - bytesNotified;
    const rate = _speedometer(progressBytes);
    const inRange = loaded <= total;
    bytesNotified = loaded;
    const data = {
      loaded,
      total,
      progress: total ? loaded / total : undefined,
      bytes: progressBytes,
      rate: rate ? rate : undefined,
      estimated: rate && total && inRange ? (total - loaded) / rate : undefined,
      event: e,
      lengthComputable: total != null,
      [isDownloadStream ? 'download' : 'upload']: true
    };
    listener(data);
  }, freq);
};
exports.progressEventReducer = progressEventReducer;
const progressEventDecorator = (total, throttled) => {
  const lengthComputable = total != null;
  return [loaded => throttled[0]({
    lengthComputable,
    total,
    loaded
  }), throttled[1]];
};
exports.progressEventDecorator = progressEventDecorator;
const asyncDecorator = fn => (...args) => _utils.default.asap(() => fn(...args));
exports.asyncDecorator = asyncDecorator;

},{"../utils.js":82,"./speedometer.js":69,"./throttle.js":71}],68:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _index = _interopRequireDefault(require("../platform/index.js"));
var _utils = _interopRequireDefault(require("../utils.js"));
var _isURLSameOrigin = _interopRequireDefault(require("./isURLSameOrigin.js"));
var _cookies = _interopRequireDefault(require("./cookies.js"));
var _buildFullPath = _interopRequireDefault(require("../core/buildFullPath.js"));
var _mergeConfig = _interopRequireDefault(require("../core/mergeConfig.js"));
var _AxiosHeaders = _interopRequireDefault(require("../core/AxiosHeaders.js"));
var _buildURL = _interopRequireDefault(require("./buildURL.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
var _default = config => {
  const newConfig = (0, _mergeConfig.default)({}, config);
  let {
    data,
    withXSRFToken,
    xsrfHeaderName,
    xsrfCookieName,
    headers,
    auth
  } = newConfig;
  newConfig.headers = headers = _AxiosHeaders.default.from(headers);
  newConfig.url = (0, _buildURL.default)((0, _buildFullPath.default)(newConfig.baseURL, newConfig.url), config.params, config.paramsSerializer);

  // HTTP basic authentication
  if (auth) {
    headers.set('Authorization', 'Basic ' + btoa((auth.username || '') + ':' + (auth.password ? unescape(encodeURIComponent(auth.password)) : '')));
  }
  let contentType;
  if (_utils.default.isFormData(data)) {
    if (_index.default.hasStandardBrowserEnv || _index.default.hasStandardBrowserWebWorkerEnv) {
      headers.setContentType(undefined); // Let the browser set it
    } else if ((contentType = headers.getContentType()) !== false) {
      // fix semicolon duplication issue for ReactNative FormData implementation
      const [type, ...tokens] = contentType ? contentType.split(';').map(token => token.trim()).filter(Boolean) : [];
      headers.setContentType([type || 'multipart/form-data', ...tokens].join('; '));
    }
  }

  // Add xsrf header
  // This is only done if running in a standard browser environment.
  // Specifically not if we're in a web worker, or react-native.

  if (_index.default.hasStandardBrowserEnv) {
    withXSRFToken && _utils.default.isFunction(withXSRFToken) && (withXSRFToken = withXSRFToken(newConfig));
    if (withXSRFToken || withXSRFToken !== false && (0, _isURLSameOrigin.default)(newConfig.url)) {
      // Add xsrf header
      const xsrfValue = xsrfHeaderName && xsrfCookieName && _cookies.default.read(xsrfCookieName);
      if (xsrfValue) {
        headers.set(xsrfHeaderName, xsrfValue);
      }
    }
  }
  return newConfig;
};
exports.default = _default;

},{"../core/AxiosHeaders.js":43,"../core/buildFullPath.js":45,"../core/mergeConfig.js":47,"../platform/index.js":81,"../utils.js":82,"./buildURL.js":56,"./cookies.js":59,"./isURLSameOrigin.js":63}],69:[function(require,module,exports){
'use strict';

/**
 * Calculate data maxRate
 * @param {Number} [samplesCount= 10]
 * @param {Number} [min= 1000]
 * @returns {Function}
 */
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
function speedometer(samplesCount, min) {
  samplesCount = samplesCount || 10;
  const bytes = new Array(samplesCount);
  const timestamps = new Array(samplesCount);
  let head = 0;
  let tail = 0;
  let firstSampleTS;
  min = min !== undefined ? min : 1000;
  return function push(chunkLength) {
    const now = Date.now();
    const startedAt = timestamps[tail];
    if (!firstSampleTS) {
      firstSampleTS = now;
    }
    bytes[head] = chunkLength;
    timestamps[head] = now;
    let i = tail;
    let bytesCount = 0;
    while (i !== head) {
      bytesCount += bytes[i++];
      i = i % samplesCount;
    }
    head = (head + 1) % samplesCount;
    if (head === tail) {
      tail = (tail + 1) % samplesCount;
    }
    if (now - firstSampleTS < min) {
      return;
    }
    const passed = startedAt && now - startedAt;
    return passed ? Math.round(bytesCount * 1000 / passed) : undefined;
  };
}
var _default = exports.default = speedometer;

},{}],70:[function(require,module,exports){
'use strict';

/**
 * Syntactic sugar for invoking a function and expanding an array for arguments.
 *
 * Common use case would be to use `Function.prototype.apply`.
 *
 *  ```js
 *  function f(x, y, z) {}
 *  var args = [1, 2, 3];
 *  f.apply(null, args);
 *  ```
 *
 * With `spread` this example can be re-written.
 *
 *  ```js
 *  spread(function(x, y, z) {})([1, 2, 3]);
 *  ```
 *
 * @param {Function} callback
 *
 * @returns {Function}
 */
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = spread;
function spread(callback) {
  return function wrap(arr) {
    return callback.apply(null, arr);
  };
}

},{}],71:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
/**
 * Throttle decorator
 * @param {Function} fn
 * @param {Number} freq
 * @return {Function}
 */
function throttle(fn, freq) {
  let timestamp = 0;
  let threshold = 1000 / freq;
  let lastArgs;
  let timer;
  const invoke = (args, now = Date.now()) => {
    timestamp = now;
    lastArgs = null;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    fn.apply(null, args);
  };
  const throttled = (...args) => {
    const now = Date.now();
    const passed = now - timestamp;
    if (passed >= threshold) {
      invoke(args, now);
    } else {
      lastArgs = args;
      if (!timer) {
        timer = setTimeout(() => {
          timer = null;
          invoke(lastArgs);
        }, threshold - passed);
      }
    }
  };
  const flush = () => lastArgs && invoke(lastArgs);
  return [throttled, flush];
}
var _default = exports.default = throttle;

},{}],72:[function(require,module,exports){
(function (Buffer){(function (){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _utils = _interopRequireDefault(require("../utils.js"));
var _AxiosError = _interopRequireDefault(require("../core/AxiosError.js"));
var _FormData = _interopRequireDefault(require("../platform/node/classes/FormData.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
// temporary hotfix to avoid circular references until AxiosURLSearchParams is refactored

/**
 * Determines if the given thing is a array or js object.
 *
 * @param {string} thing - The object or array to be visited.
 *
 * @returns {boolean}
 */
function isVisitable(thing) {
  return _utils.default.isPlainObject(thing) || _utils.default.isArray(thing);
}

/**
 * It removes the brackets from the end of a string
 *
 * @param {string} key - The key of the parameter.
 *
 * @returns {string} the key without the brackets.
 */
function removeBrackets(key) {
  return _utils.default.endsWith(key, '[]') ? key.slice(0, -2) : key;
}

/**
 * It takes a path, a key, and a boolean, and returns a string
 *
 * @param {string} path - The path to the current key.
 * @param {string} key - The key of the current object being iterated over.
 * @param {string} dots - If true, the key will be rendered with dots instead of brackets.
 *
 * @returns {string} The path to the current key.
 */
function renderKey(path, key, dots) {
  if (!path) return key;
  return path.concat(key).map(function each(token, i) {
    // eslint-disable-next-line no-param-reassign
    token = removeBrackets(token);
    return !dots && i ? '[' + token + ']' : token;
  }).join(dots ? '.' : '');
}

/**
 * If the array is an array and none of its elements are visitable, then it's a flat array.
 *
 * @param {Array<any>} arr - The array to check
 *
 * @returns {boolean}
 */
function isFlatArray(arr) {
  return _utils.default.isArray(arr) && !arr.some(isVisitable);
}
const predicates = _utils.default.toFlatObject(_utils.default, {}, null, function filter(prop) {
  return /^is[A-Z]/.test(prop);
});

/**
 * Convert a data object to FormData
 *
 * @param {Object} obj
 * @param {?Object} [formData]
 * @param {?Object} [options]
 * @param {Function} [options.visitor]
 * @param {Boolean} [options.metaTokens = true]
 * @param {Boolean} [options.dots = false]
 * @param {?Boolean} [options.indexes = false]
 *
 * @returns {Object}
 **/

/**
 * It converts an object into a FormData object
 *
 * @param {Object<any, any>} obj - The object to convert to form data.
 * @param {string} formData - The FormData object to append to.
 * @param {Object<string, any>} options
 *
 * @returns
 */
function toFormData(obj, formData, options) {
  if (!_utils.default.isObject(obj)) {
    throw new TypeError('target must be an object');
  }

  // eslint-disable-next-line no-param-reassign
  formData = formData || new (_FormData.default || FormData)();

  // eslint-disable-next-line no-param-reassign
  options = _utils.default.toFlatObject(options, {
    metaTokens: true,
    dots: false,
    indexes: false
  }, false, function defined(option, source) {
    // eslint-disable-next-line no-eq-null,eqeqeq
    return !_utils.default.isUndefined(source[option]);
  });
  const metaTokens = options.metaTokens;
  // eslint-disable-next-line no-use-before-define
  const visitor = options.visitor || defaultVisitor;
  const dots = options.dots;
  const indexes = options.indexes;
  const _Blob = options.Blob || typeof Blob !== 'undefined' && Blob;
  const useBlob = _Blob && _utils.default.isSpecCompliantForm(formData);
  if (!_utils.default.isFunction(visitor)) {
    throw new TypeError('visitor must be a function');
  }
  function convertValue(value) {
    if (value === null) return '';
    if (_utils.default.isDate(value)) {
      return value.toISOString();
    }
    if (!useBlob && _utils.default.isBlob(value)) {
      throw new _AxiosError.default('Blob is not supported. Use a Buffer instead.');
    }
    if (_utils.default.isArrayBuffer(value) || _utils.default.isTypedArray(value)) {
      return useBlob && typeof Blob === 'function' ? new Blob([value]) : Buffer.from(value);
    }
    return value;
  }

  /**
   * Default visitor.
   *
   * @param {*} value
   * @param {String|Number} key
   * @param {Array<String|Number>} path
   * @this {FormData}
   *
   * @returns {boolean} return true to visit the each prop of the value recursively
   */
  function defaultVisitor(value, key, path) {
    let arr = value;
    if (value && !path && typeof value === 'object') {
      if (_utils.default.endsWith(key, '{}')) {
        // eslint-disable-next-line no-param-reassign
        key = metaTokens ? key : key.slice(0, -2);
        // eslint-disable-next-line no-param-reassign
        value = JSON.stringify(value);
      } else if (_utils.default.isArray(value) && isFlatArray(value) || (_utils.default.isFileList(value) || _utils.default.endsWith(key, '[]')) && (arr = _utils.default.toArray(value))) {
        // eslint-disable-next-line no-param-reassign
        key = removeBrackets(key);
        arr.forEach(function each(el, index) {
          !(_utils.default.isUndefined(el) || el === null) && formData.append(
          // eslint-disable-next-line no-nested-ternary
          indexes === true ? renderKey([key], index, dots) : indexes === null ? key : key + '[]', convertValue(el));
        });
        return false;
      }
    }
    if (isVisitable(value)) {
      return true;
    }
    formData.append(renderKey(path, key, dots), convertValue(value));
    return false;
  }
  const stack = [];
  const exposedHelpers = Object.assign(predicates, {
    defaultVisitor,
    convertValue,
    isVisitable
  });
  function build(value, path) {
    if (_utils.default.isUndefined(value)) return;
    if (stack.indexOf(value) !== -1) {
      throw Error('Circular reference detected in ' + path.join('.'));
    }
    stack.push(value);
    _utils.default.forEach(value, function each(el, key) {
      const result = !(_utils.default.isUndefined(el) || el === null) && visitor.call(formData, el, _utils.default.isString(key) ? key.trim() : key, path, exposedHelpers);
      if (result === true) {
        build(el, path ? path.concat(key) : [key]);
      }
    });
    stack.pop();
  }
  if (!_utils.default.isObject(obj)) {
    throw new TypeError('data must be an object');
  }
  build(obj);
  return formData;
}
var _default = exports.default = toFormData;

}).call(this)}).call(this,require("buffer").Buffer)
},{"../core/AxiosError.js":42,"../platform/node/classes/FormData.js":64,"../utils.js":82,"buffer":2}],73:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = toURLEncodedForm;
var _utils = _interopRequireDefault(require("../utils.js"));
var _toFormData = _interopRequireDefault(require("./toFormData.js"));
var _index = _interopRequireDefault(require("../platform/index.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function toURLEncodedForm(data, options) {
  return (0, _toFormData.default)(data, new _index.default.classes.URLSearchParams(), Object.assign({
    visitor: function (value, key, path, helpers) {
      if (_index.default.isNode && _utils.default.isBuffer(value)) {
        this.append(key, value.toString('base64'));
        return false;
      }
      return helpers.defaultVisitor.apply(this, arguments);
    }
  }, options));
}

},{"../platform/index.js":81,"../utils.js":82,"./toFormData.js":72}],74:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.trackStream = exports.streamChunk = exports.readBytes = void 0;
const streamChunk = function* (chunk, chunkSize) {
  let len = chunk.byteLength;
  if (!chunkSize || len < chunkSize) {
    yield chunk;
    return;
  }
  let pos = 0;
  let end;
  while (pos < len) {
    end = pos + chunkSize;
    yield chunk.slice(pos, end);
    pos = end;
  }
};
exports.streamChunk = streamChunk;
const readBytes = async function* (iterable, chunkSize, encode) {
  for await (const chunk of iterable) {
    yield* streamChunk(ArrayBuffer.isView(chunk) ? chunk : await encode(String(chunk)), chunkSize);
  }
};
exports.readBytes = readBytes;
const trackStream = (stream, chunkSize, onProgress, onFinish, encode) => {
  const iterator = readBytes(stream, chunkSize, encode);
  let bytes = 0;
  let done;
  let _onFinish = e => {
    if (!done) {
      done = true;
      onFinish && onFinish(e);
    }
  };
  return new ReadableStream({
    async pull(controller) {
      try {
        const {
          done,
          value
        } = await iterator.next();
        if (done) {
          _onFinish();
          controller.close();
          return;
        }
        let len = value.byteLength;
        if (onProgress) {
          let loadedBytes = bytes += len;
          onProgress(loadedBytes);
        }
        controller.enqueue(new Uint8Array(value));
      } catch (err) {
        _onFinish(err);
        throw err;
      }
    },
    cancel(reason) {
      _onFinish(reason);
      return iterator.return();
    }
  }, {
    highWaterMark: 2
  });
};
exports.trackStream = trackStream;

},{}],75:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _data = require("../env/data.js");
var _AxiosError = _interopRequireDefault(require("../core/AxiosError.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const validators = {};

// eslint-disable-next-line func-names
['object', 'boolean', 'number', 'function', 'string', 'symbol'].forEach((type, i) => {
  validators[type] = function validator(thing) {
    return typeof thing === type || 'a' + (i < 1 ? 'n ' : ' ') + type;
  };
});
const deprecatedWarnings = {};

/**
 * Transitional option validator
 *
 * @param {function|boolean?} validator - set to false if the transitional option has been removed
 * @param {string?} version - deprecated version / removed since version
 * @param {string?} message - some message with additional info
 *
 * @returns {function}
 */
validators.transitional = function transitional(validator, version, message) {
  function formatMessage(opt, desc) {
    return '[Axios v' + _data.VERSION + '] Transitional option \'' + opt + '\'' + desc + (message ? '. ' + message : '');
  }

  // eslint-disable-next-line func-names
  return (value, opt, opts) => {
    if (validator === false) {
      throw new _AxiosError.default(formatMessage(opt, ' has been removed' + (version ? ' in ' + version : '')), _AxiosError.default.ERR_DEPRECATED);
    }
    if (version && !deprecatedWarnings[opt]) {
      deprecatedWarnings[opt] = true;
      // eslint-disable-next-line no-console
      console.warn(formatMessage(opt, ' has been deprecated since v' + version + ' and will be removed in the near future'));
    }
    return validator ? validator(value, opt, opts) : true;
  };
};

/**
 * Assert object's properties type
 *
 * @param {object} options
 * @param {object} schema
 * @param {boolean?} allowUnknown
 *
 * @returns {object}
 */

function assertOptions(options, schema, allowUnknown) {
  if (typeof options !== 'object') {
    throw new _AxiosError.default('options must be an object', _AxiosError.default.ERR_BAD_OPTION_VALUE);
  }
  const keys = Object.keys(options);
  let i = keys.length;
  while (i-- > 0) {
    const opt = keys[i];
    const validator = schema[opt];
    if (validator) {
      const value = options[opt];
      const result = value === undefined || validator(value, opt, options);
      if (result !== true) {
        throw new _AxiosError.default('option ' + opt + ' must be ' + result, _AxiosError.default.ERR_BAD_OPTION_VALUE);
      }
      continue;
    }
    if (allowUnknown !== true) {
      throw new _AxiosError.default('Unknown option ' + opt, _AxiosError.default.ERR_BAD_OPTION);
    }
  }
}
var _default = exports.default = {
  assertOptions,
  validators
};

},{"../core/AxiosError.js":42,"../env/data.js":52}],76:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _default = exports.default = typeof Blob !== 'undefined' ? Blob : null;

},{}],77:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _default = exports.default = typeof FormData !== 'undefined' ? FormData : null;

},{}],78:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _AxiosURLSearchParams = _interopRequireDefault(require("../../../helpers/AxiosURLSearchParams.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
var _default = exports.default = typeof URLSearchParams !== 'undefined' ? URLSearchParams : _AxiosURLSearchParams.default;

},{"../../../helpers/AxiosURLSearchParams.js":53}],79:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _URLSearchParams = _interopRequireDefault(require("./classes/URLSearchParams.js"));
var _FormData = _interopRequireDefault(require("./classes/FormData.js"));
var _Blob = _interopRequireDefault(require("./classes/Blob.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
var _default = exports.default = {
  isBrowser: true,
  classes: {
    URLSearchParams: _URLSearchParams.default,
    FormData: _FormData.default,
    Blob: _Blob.default
  },
  protocols: ['http', 'https', 'file', 'blob', 'url', 'data']
};

},{"./classes/Blob.js":76,"./classes/FormData.js":77,"./classes/URLSearchParams.js":78}],80:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.origin = exports.hasStandardBrowserWebWorkerEnv = exports.hasStandardBrowserEnv = exports.hasBrowserEnv = void 0;
const hasBrowserEnv = exports.hasBrowserEnv = typeof window !== 'undefined' && typeof document !== 'undefined';

/**
 * Determine if we're running in a standard browser environment
 *
 * This allows axios to run in a web worker, and react-native.
 * Both environments support XMLHttpRequest, but not fully standard globals.
 *
 * web workers:
 *  typeof window -> undefined
 *  typeof document -> undefined
 *
 * react-native:
 *  navigator.product -> 'ReactNative'
 * nativescript
 *  navigator.product -> 'NativeScript' or 'NS'
 *
 * @returns {boolean}
 */
const hasStandardBrowserEnv = exports.hasStandardBrowserEnv = (product => {
  return hasBrowserEnv && ['ReactNative', 'NativeScript', 'NS'].indexOf(product) < 0;
})(typeof navigator !== 'undefined' && navigator.product);

/**
 * Determine if we're running in a standard browser webWorker environment
 *
 * Although the `isStandardBrowserEnv` method indicates that
 * `allows axios to run in a web worker`, the WebWorker will still be
 * filtered out due to its judgment standard
 * `typeof window !== 'undefined' && typeof document !== 'undefined'`.
 * This leads to a problem when axios post `FormData` in webWorker
 */
const hasStandardBrowserWebWorkerEnv = exports.hasStandardBrowserWebWorkerEnv = (() => {
  return typeof WorkerGlobalScope !== 'undefined' &&
  // eslint-disable-next-line no-undef
  self instanceof WorkerGlobalScope && typeof self.importScripts === 'function';
})();
const origin = exports.origin = hasBrowserEnv && window.location.href || 'http://localhost';

},{}],81:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _index = _interopRequireDefault(require("./node/index.js"));
var utils = _interopRequireWildcard(require("./common/utils.js"));
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
var _default = exports.default = {
  ...utils,
  ..._index.default
};

},{"./common/utils.js":80,"./node/index.js":79}],82:[function(require,module,exports){
(function (process,global,setImmediate){(function (){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _bind = _interopRequireDefault(require("./helpers/bind.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
// utils is a library of generic helper functions non-specific to axios

const {
  toString
} = Object.prototype;
const {
  getPrototypeOf
} = Object;
const kindOf = (cache => thing => {
  const str = toString.call(thing);
  return cache[str] || (cache[str] = str.slice(8, -1).toLowerCase());
})(Object.create(null));
const kindOfTest = type => {
  type = type.toLowerCase();
  return thing => kindOf(thing) === type;
};
const typeOfTest = type => thing => typeof thing === type;

/**
 * Determine if a value is an Array
 *
 * @param {Object} val The value to test
 *
 * @returns {boolean} True if value is an Array, otherwise false
 */
const {
  isArray
} = Array;

/**
 * Determine if a value is undefined
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if the value is undefined, otherwise false
 */
const isUndefined = typeOfTest('undefined');

/**
 * Determine if a value is a Buffer
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a Buffer, otherwise false
 */
function isBuffer(val) {
  return val !== null && !isUndefined(val) && val.constructor !== null && !isUndefined(val.constructor) && isFunction(val.constructor.isBuffer) && val.constructor.isBuffer(val);
}

/**
 * Determine if a value is an ArrayBuffer
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is an ArrayBuffer, otherwise false
 */
const isArrayBuffer = kindOfTest('ArrayBuffer');

/**
 * Determine if a value is a view on an ArrayBuffer
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a view on an ArrayBuffer, otherwise false
 */
function isArrayBufferView(val) {
  let result;
  if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView) {
    result = ArrayBuffer.isView(val);
  } else {
    result = val && val.buffer && isArrayBuffer(val.buffer);
  }
  return result;
}

/**
 * Determine if a value is a String
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a String, otherwise false
 */
const isString = typeOfTest('string');

/**
 * Determine if a value is a Function
 *
 * @param {*} val The value to test
 * @returns {boolean} True if value is a Function, otherwise false
 */
const isFunction = typeOfTest('function');

/**
 * Determine if a value is a Number
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a Number, otherwise false
 */
const isNumber = typeOfTest('number');

/**
 * Determine if a value is an Object
 *
 * @param {*} thing The value to test
 *
 * @returns {boolean} True if value is an Object, otherwise false
 */
const isObject = thing => thing !== null && typeof thing === 'object';

/**
 * Determine if a value is a Boolean
 *
 * @param {*} thing The value to test
 * @returns {boolean} True if value is a Boolean, otherwise false
 */
const isBoolean = thing => thing === true || thing === false;

/**
 * Determine if a value is a plain Object
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a plain Object, otherwise false
 */
const isPlainObject = val => {
  if (kindOf(val) !== 'object') {
    return false;
  }
  const prototype = getPrototypeOf(val);
  return (prototype === null || prototype === Object.prototype || Object.getPrototypeOf(prototype) === null) && !(Symbol.toStringTag in val) && !(Symbol.iterator in val);
};

/**
 * Determine if a value is a Date
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a Date, otherwise false
 */
const isDate = kindOfTest('Date');

/**
 * Determine if a value is a File
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a File, otherwise false
 */
const isFile = kindOfTest('File');

/**
 * Determine if a value is a Blob
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a Blob, otherwise false
 */
const isBlob = kindOfTest('Blob');

/**
 * Determine if a value is a FileList
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a File, otherwise false
 */
const isFileList = kindOfTest('FileList');

/**
 * Determine if a value is a Stream
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a Stream, otherwise false
 */
const isStream = val => isObject(val) && isFunction(val.pipe);

/**
 * Determine if a value is a FormData
 *
 * @param {*} thing The value to test
 *
 * @returns {boolean} True if value is an FormData, otherwise false
 */
const isFormData = thing => {
  let kind;
  return thing && (typeof FormData === 'function' && thing instanceof FormData || isFunction(thing.append) && ((kind = kindOf(thing)) === 'formdata' ||
  // detect form-data instance
  kind === 'object' && isFunction(thing.toString) && thing.toString() === '[object FormData]'));
};

/**
 * Determine if a value is a URLSearchParams object
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a URLSearchParams object, otherwise false
 */
const isURLSearchParams = kindOfTest('URLSearchParams');
const [isReadableStream, isRequest, isResponse, isHeaders] = ['ReadableStream', 'Request', 'Response', 'Headers'].map(kindOfTest);

/**
 * Trim excess whitespace off the beginning and end of a string
 *
 * @param {String} str The String to trim
 *
 * @returns {String} The String freed of excess whitespace
 */
const trim = str => str.trim ? str.trim() : str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');

/**
 * Iterate over an Array or an Object invoking a function for each item.
 *
 * If `obj` is an Array callback will be called passing
 * the value, index, and complete array for each item.
 *
 * If 'obj' is an Object callback will be called passing
 * the value, key, and complete object for each property.
 *
 * @param {Object|Array} obj The object to iterate
 * @param {Function} fn The callback to invoke for each item
 *
 * @param {Boolean} [allOwnKeys = false]
 * @returns {any}
 */
function forEach(obj, fn, {
  allOwnKeys = false
} = {}) {
  // Don't bother if no value provided
  if (obj === null || typeof obj === 'undefined') {
    return;
  }
  let i;
  let l;

  // Force an array if not already something iterable
  if (typeof obj !== 'object') {
    /*eslint no-param-reassign:0*/
    obj = [obj];
  }
  if (isArray(obj)) {
    // Iterate over array values
    for (i = 0, l = obj.length; i < l; i++) {
      fn.call(null, obj[i], i, obj);
    }
  } else {
    // Iterate over object keys
    const keys = allOwnKeys ? Object.getOwnPropertyNames(obj) : Object.keys(obj);
    const len = keys.length;
    let key;
    for (i = 0; i < len; i++) {
      key = keys[i];
      fn.call(null, obj[key], key, obj);
    }
  }
}
function findKey(obj, key) {
  key = key.toLowerCase();
  const keys = Object.keys(obj);
  let i = keys.length;
  let _key;
  while (i-- > 0) {
    _key = keys[i];
    if (key === _key.toLowerCase()) {
      return _key;
    }
  }
  return null;
}
const _global = (() => {
  /*eslint no-undef:0*/
  if (typeof globalThis !== "undefined") return globalThis;
  return typeof self !== "undefined" ? self : typeof window !== 'undefined' ? window : global;
})();
const isContextDefined = context => !isUndefined(context) && context !== _global;

/**
 * Accepts varargs expecting each argument to be an object, then
 * immutably merges the properties of each object and returns result.
 *
 * When multiple objects contain the same key the later object in
 * the arguments list will take precedence.
 *
 * Example:
 *
 * ```js
 * var result = merge({foo: 123}, {foo: 456});
 * console.log(result.foo); // outputs 456
 * ```
 *
 * @param {Object} obj1 Object to merge
 *
 * @returns {Object} Result of all merge properties
 */
function merge(/* obj1, obj2, obj3, ... */
) {
  const {
    caseless
  } = isContextDefined(this) && this || {};
  const result = {};
  const assignValue = (val, key) => {
    const targetKey = caseless && findKey(result, key) || key;
    if (isPlainObject(result[targetKey]) && isPlainObject(val)) {
      result[targetKey] = merge(result[targetKey], val);
    } else if (isPlainObject(val)) {
      result[targetKey] = merge({}, val);
    } else if (isArray(val)) {
      result[targetKey] = val.slice();
    } else {
      result[targetKey] = val;
    }
  };
  for (let i = 0, l = arguments.length; i < l; i++) {
    arguments[i] && forEach(arguments[i], assignValue);
  }
  return result;
}

/**
 * Extends object a by mutably adding to it the properties of object b.
 *
 * @param {Object} a The object to be extended
 * @param {Object} b The object to copy properties from
 * @param {Object} thisArg The object to bind function to
 *
 * @param {Boolean} [allOwnKeys]
 * @returns {Object} The resulting value of object a
 */
const extend = (a, b, thisArg, {
  allOwnKeys
} = {}) => {
  forEach(b, (val, key) => {
    if (thisArg && isFunction(val)) {
      a[key] = (0, _bind.default)(val, thisArg);
    } else {
      a[key] = val;
    }
  }, {
    allOwnKeys
  });
  return a;
};

/**
 * Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
 *
 * @param {string} content with BOM
 *
 * @returns {string} content value without BOM
 */
const stripBOM = content => {
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  return content;
};

/**
 * Inherit the prototype methods from one constructor into another
 * @param {function} constructor
 * @param {function} superConstructor
 * @param {object} [props]
 * @param {object} [descriptors]
 *
 * @returns {void}
 */
const inherits = (constructor, superConstructor, props, descriptors) => {
  constructor.prototype = Object.create(superConstructor.prototype, descriptors);
  constructor.prototype.constructor = constructor;
  Object.defineProperty(constructor, 'super', {
    value: superConstructor.prototype
  });
  props && Object.assign(constructor.prototype, props);
};

/**
 * Resolve object with deep prototype chain to a flat object
 * @param {Object} sourceObj source object
 * @param {Object} [destObj]
 * @param {Function|Boolean} [filter]
 * @param {Function} [propFilter]
 *
 * @returns {Object}
 */
const toFlatObject = (sourceObj, destObj, filter, propFilter) => {
  let props;
  let i;
  let prop;
  const merged = {};
  destObj = destObj || {};
  // eslint-disable-next-line no-eq-null,eqeqeq
  if (sourceObj == null) return destObj;
  do {
    props = Object.getOwnPropertyNames(sourceObj);
    i = props.length;
    while (i-- > 0) {
      prop = props[i];
      if ((!propFilter || propFilter(prop, sourceObj, destObj)) && !merged[prop]) {
        destObj[prop] = sourceObj[prop];
        merged[prop] = true;
      }
    }
    sourceObj = filter !== false && getPrototypeOf(sourceObj);
  } while (sourceObj && (!filter || filter(sourceObj, destObj)) && sourceObj !== Object.prototype);
  return destObj;
};

/**
 * Determines whether a string ends with the characters of a specified string
 *
 * @param {String} str
 * @param {String} searchString
 * @param {Number} [position= 0]
 *
 * @returns {boolean}
 */
const endsWith = (str, searchString, position) => {
  str = String(str);
  if (position === undefined || position > str.length) {
    position = str.length;
  }
  position -= searchString.length;
  const lastIndex = str.indexOf(searchString, position);
  return lastIndex !== -1 && lastIndex === position;
};

/**
 * Returns new array from array like object or null if failed
 *
 * @param {*} [thing]
 *
 * @returns {?Array}
 */
const toArray = thing => {
  if (!thing) return null;
  if (isArray(thing)) return thing;
  let i = thing.length;
  if (!isNumber(i)) return null;
  const arr = new Array(i);
  while (i-- > 0) {
    arr[i] = thing[i];
  }
  return arr;
};

/**
 * Checking if the Uint8Array exists and if it does, it returns a function that checks if the
 * thing passed in is an instance of Uint8Array
 *
 * @param {TypedArray}
 *
 * @returns {Array}
 */
// eslint-disable-next-line func-names
const isTypedArray = (TypedArray => {
  // eslint-disable-next-line func-names
  return thing => {
    return TypedArray && thing instanceof TypedArray;
  };
})(typeof Uint8Array !== 'undefined' && getPrototypeOf(Uint8Array));

/**
 * For each entry in the object, call the function with the key and value.
 *
 * @param {Object<any, any>} obj - The object to iterate over.
 * @param {Function} fn - The function to call for each entry.
 *
 * @returns {void}
 */
const forEachEntry = (obj, fn) => {
  const generator = obj && obj[Symbol.iterator];
  const iterator = generator.call(obj);
  let result;
  while ((result = iterator.next()) && !result.done) {
    const pair = result.value;
    fn.call(obj, pair[0], pair[1]);
  }
};

/**
 * It takes a regular expression and a string, and returns an array of all the matches
 *
 * @param {string} regExp - The regular expression to match against.
 * @param {string} str - The string to search.
 *
 * @returns {Array<boolean>}
 */
const matchAll = (regExp, str) => {
  let matches;
  const arr = [];
  while ((matches = regExp.exec(str)) !== null) {
    arr.push(matches);
  }
  return arr;
};

/* Checking if the kindOfTest function returns true when passed an HTMLFormElement. */
const isHTMLForm = kindOfTest('HTMLFormElement');
const toCamelCase = str => {
  return str.toLowerCase().replace(/[-_\s]([a-z\d])(\w*)/g, function replacer(m, p1, p2) {
    return p1.toUpperCase() + p2;
  });
};

/* Creating a function that will check if an object has a property. */
const hasOwnProperty = (({
  hasOwnProperty
}) => (obj, prop) => hasOwnProperty.call(obj, prop))(Object.prototype);

/**
 * Determine if a value is a RegExp object
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a RegExp object, otherwise false
 */
const isRegExp = kindOfTest('RegExp');
const reduceDescriptors = (obj, reducer) => {
  const descriptors = Object.getOwnPropertyDescriptors(obj);
  const reducedDescriptors = {};
  forEach(descriptors, (descriptor, name) => {
    let ret;
    if ((ret = reducer(descriptor, name, obj)) !== false) {
      reducedDescriptors[name] = ret || descriptor;
    }
  });
  Object.defineProperties(obj, reducedDescriptors);
};

/**
 * Makes all methods read-only
 * @param {Object} obj
 */

const freezeMethods = obj => {
  reduceDescriptors(obj, (descriptor, name) => {
    // skip restricted props in strict mode
    if (isFunction(obj) && ['arguments', 'caller', 'callee'].indexOf(name) !== -1) {
      return false;
    }
    const value = obj[name];
    if (!isFunction(value)) return;
    descriptor.enumerable = false;
    if ('writable' in descriptor) {
      descriptor.writable = false;
      return;
    }
    if (!descriptor.set) {
      descriptor.set = () => {
        throw Error('Can not rewrite read-only method \'' + name + '\'');
      };
    }
  });
};
const toObjectSet = (arrayOrString, delimiter) => {
  const obj = {};
  const define = arr => {
    arr.forEach(value => {
      obj[value] = true;
    });
  };
  isArray(arrayOrString) ? define(arrayOrString) : define(String(arrayOrString).split(delimiter));
  return obj;
};
const noop = () => {};
const toFiniteNumber = (value, defaultValue) => {
  return value != null && Number.isFinite(value = +value) ? value : defaultValue;
};
const ALPHA = 'abcdefghijklmnopqrstuvwxyz';
const DIGIT = '0123456789';
const ALPHABET = {
  DIGIT,
  ALPHA,
  ALPHA_DIGIT: ALPHA + ALPHA.toUpperCase() + DIGIT
};
const generateString = (size = 16, alphabet = ALPHABET.ALPHA_DIGIT) => {
  let str = '';
  const {
    length
  } = alphabet;
  while (size--) {
    str += alphabet[Math.random() * length | 0];
  }
  return str;
};

/**
 * If the thing is a FormData object, return true, otherwise return false.
 *
 * @param {unknown} thing - The thing to check.
 *
 * @returns {boolean}
 */
function isSpecCompliantForm(thing) {
  return !!(thing && isFunction(thing.append) && thing[Symbol.toStringTag] === 'FormData' && thing[Symbol.iterator]);
}
const toJSONObject = obj => {
  const stack = new Array(10);
  const visit = (source, i) => {
    if (isObject(source)) {
      if (stack.indexOf(source) >= 0) {
        return;
      }
      if (!('toJSON' in source)) {
        stack[i] = source;
        const target = isArray(source) ? [] : {};
        forEach(source, (value, key) => {
          const reducedValue = visit(value, i + 1);
          !isUndefined(reducedValue) && (target[key] = reducedValue);
        });
        stack[i] = undefined;
        return target;
      }
    }
    return source;
  };
  return visit(obj, 0);
};
const isAsyncFn = kindOfTest('AsyncFunction');
const isThenable = thing => thing && (isObject(thing) || isFunction(thing)) && isFunction(thing.then) && isFunction(thing.catch);

// original code
// https://github.com/DigitalBrainJS/AxiosPromise/blob/16deab13710ec09779922131f3fa5954320f83ab/lib/utils.js#L11-L34

const _setImmediate = ((setImmediateSupported, postMessageSupported) => {
  if (setImmediateSupported) {
    return setImmediate;
  }
  return postMessageSupported ? ((token, callbacks) => {
    _global.addEventListener("message", ({
      source,
      data
    }) => {
      if (source === _global && data === token) {
        callbacks.length && callbacks.shift()();
      }
    }, false);
    return cb => {
      callbacks.push(cb);
      _global.postMessage(token, "*");
    };
  })(`axios@${Math.random()}`, []) : cb => setTimeout(cb);
})(typeof setImmediate === 'function', isFunction(_global.postMessage));
const asap = typeof queueMicrotask !== 'undefined' ? queueMicrotask.bind(_global) : typeof process !== 'undefined' && process.nextTick || _setImmediate;

// *********************
var _default = exports.default = {
  isArray,
  isArrayBuffer,
  isBuffer,
  isFormData,
  isArrayBufferView,
  isString,
  isNumber,
  isBoolean,
  isObject,
  isPlainObject,
  isReadableStream,
  isRequest,
  isResponse,
  isHeaders,
  isUndefined,
  isDate,
  isFile,
  isBlob,
  isRegExp,
  isFunction,
  isStream,
  isURLSearchParams,
  isTypedArray,
  isFileList,
  forEach,
  merge,
  extend,
  trim,
  stripBOM,
  inherits,
  toFlatObject,
  kindOf,
  kindOfTest,
  endsWith,
  toArray,
  forEachEntry,
  matchAll,
  isHTMLForm,
  hasOwnProperty,
  hasOwnProp: hasOwnProperty,
  // an alias to avoid ESLint no-prototype-builtins detection
  reduceDescriptors,
  freezeMethods,
  toObjectSet,
  toCamelCase,
  noop,
  toFiniteNumber,
  findKey,
  global: _global,
  isContextDefined,
  ALPHABET,
  generateString,
  isSpecCompliantForm,
  toJSONObject,
  isAsyncFn,
  isThenable,
  setImmediate: _setImmediate,
  asap
};

}).call(this)}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("timers").setImmediate)
},{"./helpers/bind.js":55,"_process":4,"timers":5}],83:[function(require,module,exports){

},{}],84:[function(require,module,exports){
'use strict';

var has = Object.prototype.hasOwnProperty
  , prefix = '~';

/**
 * Constructor to create a storage for our `EE` objects.
 * An `Events` instance is a plain object whose properties are event names.
 *
 * @constructor
 * @private
 */
function Events() {}

//
// We try to not inherit from `Object.prototype`. In some engines creating an
// instance in this way is faster than calling `Object.create(null)` directly.
// If `Object.create(null)` is not supported we prefix the event names with a
// character to make sure that the built-in object properties are not
// overridden or used as an attack vector.
//
if (Object.create) {
  Events.prototype = Object.create(null);

  //
  // This hack is needed because the `__proto__` property is still inherited in
  // some old browsers like Android 4, iPhone 5.1, Opera 11 and Safari 5.
  //
  if (!new Events().__proto__) prefix = false;
}

/**
 * Representation of a single event listener.
 *
 * @param {Function} fn The listener function.
 * @param {*} context The context to invoke the listener with.
 * @param {Boolean} [once=false] Specify if the listener is a one-time listener.
 * @constructor
 * @private
 */
function EE(fn, context, once) {
  this.fn = fn;
  this.context = context;
  this.once = once || false;
}

/**
 * Add a listener for a given event.
 *
 * @param {EventEmitter} emitter Reference to the `EventEmitter` instance.
 * @param {(String|Symbol)} event The event name.
 * @param {Function} fn The listener function.
 * @param {*} context The context to invoke the listener with.
 * @param {Boolean} once Specify if the listener is a one-time listener.
 * @returns {EventEmitter}
 * @private
 */
function addListener(emitter, event, fn, context, once) {
  if (typeof fn !== 'function') {
    throw new TypeError('The listener must be a function');
  }

  var listener = new EE(fn, context || emitter, once)
    , evt = prefix ? prefix + event : event;

  if (!emitter._events[evt]) emitter._events[evt] = listener, emitter._eventsCount++;
  else if (!emitter._events[evt].fn) emitter._events[evt].push(listener);
  else emitter._events[evt] = [emitter._events[evt], listener];

  return emitter;
}

/**
 * Clear event by name.
 *
 * @param {EventEmitter} emitter Reference to the `EventEmitter` instance.
 * @param {(String|Symbol)} evt The Event name.
 * @private
 */
function clearEvent(emitter, evt) {
  if (--emitter._eventsCount === 0) emitter._events = new Events();
  else delete emitter._events[evt];
}

/**
 * Minimal `EventEmitter` interface that is molded against the Node.js
 * `EventEmitter` interface.
 *
 * @constructor
 * @public
 */
function EventEmitter() {
  this._events = new Events();
  this._eventsCount = 0;
}

/**
 * Return an array listing the events for which the emitter has registered
 * listeners.
 *
 * @returns {Array}
 * @public
 */
EventEmitter.prototype.eventNames = function eventNames() {
  var names = []
    , events
    , name;

  if (this._eventsCount === 0) return names;

  for (name in (events = this._events)) {
    if (has.call(events, name)) names.push(prefix ? name.slice(1) : name);
  }

  if (Object.getOwnPropertySymbols) {
    return names.concat(Object.getOwnPropertySymbols(events));
  }

  return names;
};

/**
 * Return the listeners registered for a given event.
 *
 * @param {(String|Symbol)} event The event name.
 * @returns {Array} The registered listeners.
 * @public
 */
EventEmitter.prototype.listeners = function listeners(event) {
  var evt = prefix ? prefix + event : event
    , handlers = this._events[evt];

  if (!handlers) return [];
  if (handlers.fn) return [handlers.fn];

  for (var i = 0, l = handlers.length, ee = new Array(l); i < l; i++) {
    ee[i] = handlers[i].fn;
  }

  return ee;
};

/**
 * Return the number of listeners listening to a given event.
 *
 * @param {(String|Symbol)} event The event name.
 * @returns {Number} The number of listeners.
 * @public
 */
EventEmitter.prototype.listenerCount = function listenerCount(event) {
  var evt = prefix ? prefix + event : event
    , listeners = this._events[evt];

  if (!listeners) return 0;
  if (listeners.fn) return 1;
  return listeners.length;
};

/**
 * Calls each of the listeners registered for a given event.
 *
 * @param {(String|Symbol)} event The event name.
 * @returns {Boolean} `true` if the event had listeners, else `false`.
 * @public
 */
EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
  var evt = prefix ? prefix + event : event;

  if (!this._events[evt]) return false;

  var listeners = this._events[evt]
    , len = arguments.length
    , args
    , i;

  if (listeners.fn) {
    if (listeners.once) this.removeListener(event, listeners.fn, undefined, true);

    switch (len) {
      case 1: return listeners.fn.call(listeners.context), true;
      case 2: return listeners.fn.call(listeners.context, a1), true;
      case 3: return listeners.fn.call(listeners.context, a1, a2), true;
      case 4: return listeners.fn.call(listeners.context, a1, a2, a3), true;
      case 5: return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
      case 6: return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
    }

    for (i = 1, args = new Array(len -1); i < len; i++) {
      args[i - 1] = arguments[i];
    }

    listeners.fn.apply(listeners.context, args);
  } else {
    var length = listeners.length
      , j;

    for (i = 0; i < length; i++) {
      if (listeners[i].once) this.removeListener(event, listeners[i].fn, undefined, true);

      switch (len) {
        case 1: listeners[i].fn.call(listeners[i].context); break;
        case 2: listeners[i].fn.call(listeners[i].context, a1); break;
        case 3: listeners[i].fn.call(listeners[i].context, a1, a2); break;
        case 4: listeners[i].fn.call(listeners[i].context, a1, a2, a3); break;
        default:
          if (!args) for (j = 1, args = new Array(len -1); j < len; j++) {
            args[j - 1] = arguments[j];
          }

          listeners[i].fn.apply(listeners[i].context, args);
      }
    }
  }

  return true;
};

/**
 * Add a listener for a given event.
 *
 * @param {(String|Symbol)} event The event name.
 * @param {Function} fn The listener function.
 * @param {*} [context=this] The context to invoke the listener with.
 * @returns {EventEmitter} `this`.
 * @public
 */
EventEmitter.prototype.on = function on(event, fn, context) {
  return addListener(this, event, fn, context, false);
};

/**
 * Add a one-time listener for a given event.
 *
 * @param {(String|Symbol)} event The event name.
 * @param {Function} fn The listener function.
 * @param {*} [context=this] The context to invoke the listener with.
 * @returns {EventEmitter} `this`.
 * @public
 */
EventEmitter.prototype.once = function once(event, fn, context) {
  return addListener(this, event, fn, context, true);
};

/**
 * Remove the listeners of a given event.
 *
 * @param {(String|Symbol)} event The event name.
 * @param {Function} fn Only remove the listeners that match this function.
 * @param {*} context Only remove the listeners that have this context.
 * @param {Boolean} once Only remove one-time listeners.
 * @returns {EventEmitter} `this`.
 * @public
 */
EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
  var evt = prefix ? prefix + event : event;

  if (!this._events[evt]) return this;
  if (!fn) {
    clearEvent(this, evt);
    return this;
  }

  var listeners = this._events[evt];

  if (listeners.fn) {
    if (
      listeners.fn === fn &&
      (!once || listeners.once) &&
      (!context || listeners.context === context)
    ) {
      clearEvent(this, evt);
    }
  } else {
    for (var i = 0, events = [], length = listeners.length; i < length; i++) {
      if (
        listeners[i].fn !== fn ||
        (once && !listeners[i].once) ||
        (context && listeners[i].context !== context)
      ) {
        events.push(listeners[i]);
      }
    }

    //
    // Reset the array, or remove it completely if we have no more listeners.
    //
    if (events.length) this._events[evt] = events.length === 1 ? events[0] : events;
    else clearEvent(this, evt);
  }

  return this;
};

/**
 * Remove all listeners, or those of the specified event.
 *
 * @param {(String|Symbol)} [event] The event name.
 * @returns {EventEmitter} `this`.
 * @public
 */
EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
  var evt;

  if (event) {
    evt = prefix ? prefix + event : event;
    if (this._events[evt]) clearEvent(this, evt);
  } else {
    this._events = new Events();
    this._eventsCount = 0;
  }

  return this;
};

//
// Alias methods names because people roll like that.
//
EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
EventEmitter.prototype.addListener = EventEmitter.prototype.on;

//
// Expose the prefix.
//
EventEmitter.prefixed = prefix;

//
// Allow `EventEmitter` to be imported as module namespace.
//
EventEmitter.EventEmitter = EventEmitter;

//
// Expose the module.
//
if ('undefined' !== typeof module) {
  module.exports = EventEmitter;
}

},{}],85:[function(require,module,exports){
(function(nacl) {
'use strict';

// Ported in 2014 by Dmitry Chestnykh and Devi Mandiri.
// Public domain.
//
// Implementation derived from TweetNaCl version 20140427.
// See for details: http://tweetnacl.cr.yp.to/

var gf = function(init) {
  var i, r = new Float64Array(16);
  if (init) for (i = 0; i < init.length; i++) r[i] = init[i];
  return r;
};

//  Pluggable, initialized in high-level API below.
var randombytes = function(/* x, n */) { throw new Error('no PRNG'); };

var _0 = new Uint8Array(16);
var _9 = new Uint8Array(32); _9[0] = 9;

var gf0 = gf(),
    gf1 = gf([1]),
    _121665 = gf([0xdb41, 1]),
    D = gf([0x78a3, 0x1359, 0x4dca, 0x75eb, 0xd8ab, 0x4141, 0x0a4d, 0x0070, 0xe898, 0x7779, 0x4079, 0x8cc7, 0xfe73, 0x2b6f, 0x6cee, 0x5203]),
    D2 = gf([0xf159, 0x26b2, 0x9b94, 0xebd6, 0xb156, 0x8283, 0x149a, 0x00e0, 0xd130, 0xeef3, 0x80f2, 0x198e, 0xfce7, 0x56df, 0xd9dc, 0x2406]),
    X = gf([0xd51a, 0x8f25, 0x2d60, 0xc956, 0xa7b2, 0x9525, 0xc760, 0x692c, 0xdc5c, 0xfdd6, 0xe231, 0xc0a4, 0x53fe, 0xcd6e, 0x36d3, 0x2169]),
    Y = gf([0x6658, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666]),
    I = gf([0xa0b0, 0x4a0e, 0x1b27, 0xc4ee, 0xe478, 0xad2f, 0x1806, 0x2f43, 0xd7a7, 0x3dfb, 0x0099, 0x2b4d, 0xdf0b, 0x4fc1, 0x2480, 0x2b83]);

function ts64(x, i, h, l) {
  x[i]   = (h >> 24) & 0xff;
  x[i+1] = (h >> 16) & 0xff;
  x[i+2] = (h >>  8) & 0xff;
  x[i+3] = h & 0xff;
  x[i+4] = (l >> 24)  & 0xff;
  x[i+5] = (l >> 16)  & 0xff;
  x[i+6] = (l >>  8)  & 0xff;
  x[i+7] = l & 0xff;
}

function vn(x, xi, y, yi, n) {
  var i,d = 0;
  for (i = 0; i < n; i++) d |= x[xi+i]^y[yi+i];
  return (1 & ((d - 1) >>> 8)) - 1;
}

function crypto_verify_16(x, xi, y, yi) {
  return vn(x,xi,y,yi,16);
}

function crypto_verify_32(x, xi, y, yi) {
  return vn(x,xi,y,yi,32);
}

function core_salsa20(o, p, k, c) {
  var j0  = c[ 0] & 0xff | (c[ 1] & 0xff)<<8 | (c[ 2] & 0xff)<<16 | (c[ 3] & 0xff)<<24,
      j1  = k[ 0] & 0xff | (k[ 1] & 0xff)<<8 | (k[ 2] & 0xff)<<16 | (k[ 3] & 0xff)<<24,
      j2  = k[ 4] & 0xff | (k[ 5] & 0xff)<<8 | (k[ 6] & 0xff)<<16 | (k[ 7] & 0xff)<<24,
      j3  = k[ 8] & 0xff | (k[ 9] & 0xff)<<8 | (k[10] & 0xff)<<16 | (k[11] & 0xff)<<24,
      j4  = k[12] & 0xff | (k[13] & 0xff)<<8 | (k[14] & 0xff)<<16 | (k[15] & 0xff)<<24,
      j5  = c[ 4] & 0xff | (c[ 5] & 0xff)<<8 | (c[ 6] & 0xff)<<16 | (c[ 7] & 0xff)<<24,
      j6  = p[ 0] & 0xff | (p[ 1] & 0xff)<<8 | (p[ 2] & 0xff)<<16 | (p[ 3] & 0xff)<<24,
      j7  = p[ 4] & 0xff | (p[ 5] & 0xff)<<8 | (p[ 6] & 0xff)<<16 | (p[ 7] & 0xff)<<24,
      j8  = p[ 8] & 0xff | (p[ 9] & 0xff)<<8 | (p[10] & 0xff)<<16 | (p[11] & 0xff)<<24,
      j9  = p[12] & 0xff | (p[13] & 0xff)<<8 | (p[14] & 0xff)<<16 | (p[15] & 0xff)<<24,
      j10 = c[ 8] & 0xff | (c[ 9] & 0xff)<<8 | (c[10] & 0xff)<<16 | (c[11] & 0xff)<<24,
      j11 = k[16] & 0xff | (k[17] & 0xff)<<8 | (k[18] & 0xff)<<16 | (k[19] & 0xff)<<24,
      j12 = k[20] & 0xff | (k[21] & 0xff)<<8 | (k[22] & 0xff)<<16 | (k[23] & 0xff)<<24,
      j13 = k[24] & 0xff | (k[25] & 0xff)<<8 | (k[26] & 0xff)<<16 | (k[27] & 0xff)<<24,
      j14 = k[28] & 0xff | (k[29] & 0xff)<<8 | (k[30] & 0xff)<<16 | (k[31] & 0xff)<<24,
      j15 = c[12] & 0xff | (c[13] & 0xff)<<8 | (c[14] & 0xff)<<16 | (c[15] & 0xff)<<24;

  var x0 = j0, x1 = j1, x2 = j2, x3 = j3, x4 = j4, x5 = j5, x6 = j6, x7 = j7,
      x8 = j8, x9 = j9, x10 = j10, x11 = j11, x12 = j12, x13 = j13, x14 = j14,
      x15 = j15, u;

  for (var i = 0; i < 20; i += 2) {
    u = x0 + x12 | 0;
    x4 ^= u<<7 | u>>>(32-7);
    u = x4 + x0 | 0;
    x8 ^= u<<9 | u>>>(32-9);
    u = x8 + x4 | 0;
    x12 ^= u<<13 | u>>>(32-13);
    u = x12 + x8 | 0;
    x0 ^= u<<18 | u>>>(32-18);

    u = x5 + x1 | 0;
    x9 ^= u<<7 | u>>>(32-7);
    u = x9 + x5 | 0;
    x13 ^= u<<9 | u>>>(32-9);
    u = x13 + x9 | 0;
    x1 ^= u<<13 | u>>>(32-13);
    u = x1 + x13 | 0;
    x5 ^= u<<18 | u>>>(32-18);

    u = x10 + x6 | 0;
    x14 ^= u<<7 | u>>>(32-7);
    u = x14 + x10 | 0;
    x2 ^= u<<9 | u>>>(32-9);
    u = x2 + x14 | 0;
    x6 ^= u<<13 | u>>>(32-13);
    u = x6 + x2 | 0;
    x10 ^= u<<18 | u>>>(32-18);

    u = x15 + x11 | 0;
    x3 ^= u<<7 | u>>>(32-7);
    u = x3 + x15 | 0;
    x7 ^= u<<9 | u>>>(32-9);
    u = x7 + x3 | 0;
    x11 ^= u<<13 | u>>>(32-13);
    u = x11 + x7 | 0;
    x15 ^= u<<18 | u>>>(32-18);

    u = x0 + x3 | 0;
    x1 ^= u<<7 | u>>>(32-7);
    u = x1 + x0 | 0;
    x2 ^= u<<9 | u>>>(32-9);
    u = x2 + x1 | 0;
    x3 ^= u<<13 | u>>>(32-13);
    u = x3 + x2 | 0;
    x0 ^= u<<18 | u>>>(32-18);

    u = x5 + x4 | 0;
    x6 ^= u<<7 | u>>>(32-7);
    u = x6 + x5 | 0;
    x7 ^= u<<9 | u>>>(32-9);
    u = x7 + x6 | 0;
    x4 ^= u<<13 | u>>>(32-13);
    u = x4 + x7 | 0;
    x5 ^= u<<18 | u>>>(32-18);

    u = x10 + x9 | 0;
    x11 ^= u<<7 | u>>>(32-7);
    u = x11 + x10 | 0;
    x8 ^= u<<9 | u>>>(32-9);
    u = x8 + x11 | 0;
    x9 ^= u<<13 | u>>>(32-13);
    u = x9 + x8 | 0;
    x10 ^= u<<18 | u>>>(32-18);

    u = x15 + x14 | 0;
    x12 ^= u<<7 | u>>>(32-7);
    u = x12 + x15 | 0;
    x13 ^= u<<9 | u>>>(32-9);
    u = x13 + x12 | 0;
    x14 ^= u<<13 | u>>>(32-13);
    u = x14 + x13 | 0;
    x15 ^= u<<18 | u>>>(32-18);
  }
   x0 =  x0 +  j0 | 0;
   x1 =  x1 +  j1 | 0;
   x2 =  x2 +  j2 | 0;
   x3 =  x3 +  j3 | 0;
   x4 =  x4 +  j4 | 0;
   x5 =  x5 +  j5 | 0;
   x6 =  x6 +  j6 | 0;
   x7 =  x7 +  j7 | 0;
   x8 =  x8 +  j8 | 0;
   x9 =  x9 +  j9 | 0;
  x10 = x10 + j10 | 0;
  x11 = x11 + j11 | 0;
  x12 = x12 + j12 | 0;
  x13 = x13 + j13 | 0;
  x14 = x14 + j14 | 0;
  x15 = x15 + j15 | 0;

  o[ 0] = x0 >>>  0 & 0xff;
  o[ 1] = x0 >>>  8 & 0xff;
  o[ 2] = x0 >>> 16 & 0xff;
  o[ 3] = x0 >>> 24 & 0xff;

  o[ 4] = x1 >>>  0 & 0xff;
  o[ 5] = x1 >>>  8 & 0xff;
  o[ 6] = x1 >>> 16 & 0xff;
  o[ 7] = x1 >>> 24 & 0xff;

  o[ 8] = x2 >>>  0 & 0xff;
  o[ 9] = x2 >>>  8 & 0xff;
  o[10] = x2 >>> 16 & 0xff;
  o[11] = x2 >>> 24 & 0xff;

  o[12] = x3 >>>  0 & 0xff;
  o[13] = x3 >>>  8 & 0xff;
  o[14] = x3 >>> 16 & 0xff;
  o[15] = x3 >>> 24 & 0xff;

  o[16] = x4 >>>  0 & 0xff;
  o[17] = x4 >>>  8 & 0xff;
  o[18] = x4 >>> 16 & 0xff;
  o[19] = x4 >>> 24 & 0xff;

  o[20] = x5 >>>  0 & 0xff;
  o[21] = x5 >>>  8 & 0xff;
  o[22] = x5 >>> 16 & 0xff;
  o[23] = x5 >>> 24 & 0xff;

  o[24] = x6 >>>  0 & 0xff;
  o[25] = x6 >>>  8 & 0xff;
  o[26] = x6 >>> 16 & 0xff;
  o[27] = x6 >>> 24 & 0xff;

  o[28] = x7 >>>  0 & 0xff;
  o[29] = x7 >>>  8 & 0xff;
  o[30] = x7 >>> 16 & 0xff;
  o[31] = x7 >>> 24 & 0xff;

  o[32] = x8 >>>  0 & 0xff;
  o[33] = x8 >>>  8 & 0xff;
  o[34] = x8 >>> 16 & 0xff;
  o[35] = x8 >>> 24 & 0xff;

  o[36] = x9 >>>  0 & 0xff;
  o[37] = x9 >>>  8 & 0xff;
  o[38] = x9 >>> 16 & 0xff;
  o[39] = x9 >>> 24 & 0xff;

  o[40] = x10 >>>  0 & 0xff;
  o[41] = x10 >>>  8 & 0xff;
  o[42] = x10 >>> 16 & 0xff;
  o[43] = x10 >>> 24 & 0xff;

  o[44] = x11 >>>  0 & 0xff;
  o[45] = x11 >>>  8 & 0xff;
  o[46] = x11 >>> 16 & 0xff;
  o[47] = x11 >>> 24 & 0xff;

  o[48] = x12 >>>  0 & 0xff;
  o[49] = x12 >>>  8 & 0xff;
  o[50] = x12 >>> 16 & 0xff;
  o[51] = x12 >>> 24 & 0xff;

  o[52] = x13 >>>  0 & 0xff;
  o[53] = x13 >>>  8 & 0xff;
  o[54] = x13 >>> 16 & 0xff;
  o[55] = x13 >>> 24 & 0xff;

  o[56] = x14 >>>  0 & 0xff;
  o[57] = x14 >>>  8 & 0xff;
  o[58] = x14 >>> 16 & 0xff;
  o[59] = x14 >>> 24 & 0xff;

  o[60] = x15 >>>  0 & 0xff;
  o[61] = x15 >>>  8 & 0xff;
  o[62] = x15 >>> 16 & 0xff;
  o[63] = x15 >>> 24 & 0xff;
}

function core_hsalsa20(o,p,k,c) {
  var j0  = c[ 0] & 0xff | (c[ 1] & 0xff)<<8 | (c[ 2] & 0xff)<<16 | (c[ 3] & 0xff)<<24,
      j1  = k[ 0] & 0xff | (k[ 1] & 0xff)<<8 | (k[ 2] & 0xff)<<16 | (k[ 3] & 0xff)<<24,
      j2  = k[ 4] & 0xff | (k[ 5] & 0xff)<<8 | (k[ 6] & 0xff)<<16 | (k[ 7] & 0xff)<<24,
      j3  = k[ 8] & 0xff | (k[ 9] & 0xff)<<8 | (k[10] & 0xff)<<16 | (k[11] & 0xff)<<24,
      j4  = k[12] & 0xff | (k[13] & 0xff)<<8 | (k[14] & 0xff)<<16 | (k[15] & 0xff)<<24,
      j5  = c[ 4] & 0xff | (c[ 5] & 0xff)<<8 | (c[ 6] & 0xff)<<16 | (c[ 7] & 0xff)<<24,
      j6  = p[ 0] & 0xff | (p[ 1] & 0xff)<<8 | (p[ 2] & 0xff)<<16 | (p[ 3] & 0xff)<<24,
      j7  = p[ 4] & 0xff | (p[ 5] & 0xff)<<8 | (p[ 6] & 0xff)<<16 | (p[ 7] & 0xff)<<24,
      j8  = p[ 8] & 0xff | (p[ 9] & 0xff)<<8 | (p[10] & 0xff)<<16 | (p[11] & 0xff)<<24,
      j9  = p[12] & 0xff | (p[13] & 0xff)<<8 | (p[14] & 0xff)<<16 | (p[15] & 0xff)<<24,
      j10 = c[ 8] & 0xff | (c[ 9] & 0xff)<<8 | (c[10] & 0xff)<<16 | (c[11] & 0xff)<<24,
      j11 = k[16] & 0xff | (k[17] & 0xff)<<8 | (k[18] & 0xff)<<16 | (k[19] & 0xff)<<24,
      j12 = k[20] & 0xff | (k[21] & 0xff)<<8 | (k[22] & 0xff)<<16 | (k[23] & 0xff)<<24,
      j13 = k[24] & 0xff | (k[25] & 0xff)<<8 | (k[26] & 0xff)<<16 | (k[27] & 0xff)<<24,
      j14 = k[28] & 0xff | (k[29] & 0xff)<<8 | (k[30] & 0xff)<<16 | (k[31] & 0xff)<<24,
      j15 = c[12] & 0xff | (c[13] & 0xff)<<8 | (c[14] & 0xff)<<16 | (c[15] & 0xff)<<24;

  var x0 = j0, x1 = j1, x2 = j2, x3 = j3, x4 = j4, x5 = j5, x6 = j6, x7 = j7,
      x8 = j8, x9 = j9, x10 = j10, x11 = j11, x12 = j12, x13 = j13, x14 = j14,
      x15 = j15, u;

  for (var i = 0; i < 20; i += 2) {
    u = x0 + x12 | 0;
    x4 ^= u<<7 | u>>>(32-7);
    u = x4 + x0 | 0;
    x8 ^= u<<9 | u>>>(32-9);
    u = x8 + x4 | 0;
    x12 ^= u<<13 | u>>>(32-13);
    u = x12 + x8 | 0;
    x0 ^= u<<18 | u>>>(32-18);

    u = x5 + x1 | 0;
    x9 ^= u<<7 | u>>>(32-7);
    u = x9 + x5 | 0;
    x13 ^= u<<9 | u>>>(32-9);
    u = x13 + x9 | 0;
    x1 ^= u<<13 | u>>>(32-13);
    u = x1 + x13 | 0;
    x5 ^= u<<18 | u>>>(32-18);

    u = x10 + x6 | 0;
    x14 ^= u<<7 | u>>>(32-7);
    u = x14 + x10 | 0;
    x2 ^= u<<9 | u>>>(32-9);
    u = x2 + x14 | 0;
    x6 ^= u<<13 | u>>>(32-13);
    u = x6 + x2 | 0;
    x10 ^= u<<18 | u>>>(32-18);

    u = x15 + x11 | 0;
    x3 ^= u<<7 | u>>>(32-7);
    u = x3 + x15 | 0;
    x7 ^= u<<9 | u>>>(32-9);
    u = x7 + x3 | 0;
    x11 ^= u<<13 | u>>>(32-13);
    u = x11 + x7 | 0;
    x15 ^= u<<18 | u>>>(32-18);

    u = x0 + x3 | 0;
    x1 ^= u<<7 | u>>>(32-7);
    u = x1 + x0 | 0;
    x2 ^= u<<9 | u>>>(32-9);
    u = x2 + x1 | 0;
    x3 ^= u<<13 | u>>>(32-13);
    u = x3 + x2 | 0;
    x0 ^= u<<18 | u>>>(32-18);

    u = x5 + x4 | 0;
    x6 ^= u<<7 | u>>>(32-7);
    u = x6 + x5 | 0;
    x7 ^= u<<9 | u>>>(32-9);
    u = x7 + x6 | 0;
    x4 ^= u<<13 | u>>>(32-13);
    u = x4 + x7 | 0;
    x5 ^= u<<18 | u>>>(32-18);

    u = x10 + x9 | 0;
    x11 ^= u<<7 | u>>>(32-7);
    u = x11 + x10 | 0;
    x8 ^= u<<9 | u>>>(32-9);
    u = x8 + x11 | 0;
    x9 ^= u<<13 | u>>>(32-13);
    u = x9 + x8 | 0;
    x10 ^= u<<18 | u>>>(32-18);

    u = x15 + x14 | 0;
    x12 ^= u<<7 | u>>>(32-7);
    u = x12 + x15 | 0;
    x13 ^= u<<9 | u>>>(32-9);
    u = x13 + x12 | 0;
    x14 ^= u<<13 | u>>>(32-13);
    u = x14 + x13 | 0;
    x15 ^= u<<18 | u>>>(32-18);
  }

  o[ 0] = x0 >>>  0 & 0xff;
  o[ 1] = x0 >>>  8 & 0xff;
  o[ 2] = x0 >>> 16 & 0xff;
  o[ 3] = x0 >>> 24 & 0xff;

  o[ 4] = x5 >>>  0 & 0xff;
  o[ 5] = x5 >>>  8 & 0xff;
  o[ 6] = x5 >>> 16 & 0xff;
  o[ 7] = x5 >>> 24 & 0xff;

  o[ 8] = x10 >>>  0 & 0xff;
  o[ 9] = x10 >>>  8 & 0xff;
  o[10] = x10 >>> 16 & 0xff;
  o[11] = x10 >>> 24 & 0xff;

  o[12] = x15 >>>  0 & 0xff;
  o[13] = x15 >>>  8 & 0xff;
  o[14] = x15 >>> 16 & 0xff;
  o[15] = x15 >>> 24 & 0xff;

  o[16] = x6 >>>  0 & 0xff;
  o[17] = x6 >>>  8 & 0xff;
  o[18] = x6 >>> 16 & 0xff;
  o[19] = x6 >>> 24 & 0xff;

  o[20] = x7 >>>  0 & 0xff;
  o[21] = x7 >>>  8 & 0xff;
  o[22] = x7 >>> 16 & 0xff;
  o[23] = x7 >>> 24 & 0xff;

  o[24] = x8 >>>  0 & 0xff;
  o[25] = x8 >>>  8 & 0xff;
  o[26] = x8 >>> 16 & 0xff;
  o[27] = x8 >>> 24 & 0xff;

  o[28] = x9 >>>  0 & 0xff;
  o[29] = x9 >>>  8 & 0xff;
  o[30] = x9 >>> 16 & 0xff;
  o[31] = x9 >>> 24 & 0xff;
}

function crypto_core_salsa20(out,inp,k,c) {
  core_salsa20(out,inp,k,c);
}

function crypto_core_hsalsa20(out,inp,k,c) {
  core_hsalsa20(out,inp,k,c);
}

var sigma = new Uint8Array([101, 120, 112, 97, 110, 100, 32, 51, 50, 45, 98, 121, 116, 101, 32, 107]);
            // "expand 32-byte k"

function crypto_stream_salsa20_xor(c,cpos,m,mpos,b,n,k) {
  var z = new Uint8Array(16), x = new Uint8Array(64);
  var u, i;
  for (i = 0; i < 16; i++) z[i] = 0;
  for (i = 0; i < 8; i++) z[i] = n[i];
  while (b >= 64) {
    crypto_core_salsa20(x,z,k,sigma);
    for (i = 0; i < 64; i++) c[cpos+i] = m[mpos+i] ^ x[i];
    u = 1;
    for (i = 8; i < 16; i++) {
      u = u + (z[i] & 0xff) | 0;
      z[i] = u & 0xff;
      u >>>= 8;
    }
    b -= 64;
    cpos += 64;
    mpos += 64;
  }
  if (b > 0) {
    crypto_core_salsa20(x,z,k,sigma);
    for (i = 0; i < b; i++) c[cpos+i] = m[mpos+i] ^ x[i];
  }
  return 0;
}

function crypto_stream_salsa20(c,cpos,b,n,k) {
  var z = new Uint8Array(16), x = new Uint8Array(64);
  var u, i;
  for (i = 0; i < 16; i++) z[i] = 0;
  for (i = 0; i < 8; i++) z[i] = n[i];
  while (b >= 64) {
    crypto_core_salsa20(x,z,k,sigma);
    for (i = 0; i < 64; i++) c[cpos+i] = x[i];
    u = 1;
    for (i = 8; i < 16; i++) {
      u = u + (z[i] & 0xff) | 0;
      z[i] = u & 0xff;
      u >>>= 8;
    }
    b -= 64;
    cpos += 64;
  }
  if (b > 0) {
    crypto_core_salsa20(x,z,k,sigma);
    for (i = 0; i < b; i++) c[cpos+i] = x[i];
  }
  return 0;
}

function crypto_stream(c,cpos,d,n,k) {
  var s = new Uint8Array(32);
  crypto_core_hsalsa20(s,n,k,sigma);
  var sn = new Uint8Array(8);
  for (var i = 0; i < 8; i++) sn[i] = n[i+16];
  return crypto_stream_salsa20(c,cpos,d,sn,s);
}

function crypto_stream_xor(c,cpos,m,mpos,d,n,k) {
  var s = new Uint8Array(32);
  crypto_core_hsalsa20(s,n,k,sigma);
  var sn = new Uint8Array(8);
  for (var i = 0; i < 8; i++) sn[i] = n[i+16];
  return crypto_stream_salsa20_xor(c,cpos,m,mpos,d,sn,s);
}

/*
* Port of Andrew Moon's Poly1305-donna-16. Public domain.
* https://github.com/floodyberry/poly1305-donna
*/

var poly1305 = function(key) {
  this.buffer = new Uint8Array(16);
  this.r = new Uint16Array(10);
  this.h = new Uint16Array(10);
  this.pad = new Uint16Array(8);
  this.leftover = 0;
  this.fin = 0;

  var t0, t1, t2, t3, t4, t5, t6, t7;

  t0 = key[ 0] & 0xff | (key[ 1] & 0xff) << 8; this.r[0] = ( t0                     ) & 0x1fff;
  t1 = key[ 2] & 0xff | (key[ 3] & 0xff) << 8; this.r[1] = ((t0 >>> 13) | (t1 <<  3)) & 0x1fff;
  t2 = key[ 4] & 0xff | (key[ 5] & 0xff) << 8; this.r[2] = ((t1 >>> 10) | (t2 <<  6)) & 0x1f03;
  t3 = key[ 6] & 0xff | (key[ 7] & 0xff) << 8; this.r[3] = ((t2 >>>  7) | (t3 <<  9)) & 0x1fff;
  t4 = key[ 8] & 0xff | (key[ 9] & 0xff) << 8; this.r[4] = ((t3 >>>  4) | (t4 << 12)) & 0x00ff;
  this.r[5] = ((t4 >>>  1)) & 0x1ffe;
  t5 = key[10] & 0xff | (key[11] & 0xff) << 8; this.r[6] = ((t4 >>> 14) | (t5 <<  2)) & 0x1fff;
  t6 = key[12] & 0xff | (key[13] & 0xff) << 8; this.r[7] = ((t5 >>> 11) | (t6 <<  5)) & 0x1f81;
  t7 = key[14] & 0xff | (key[15] & 0xff) << 8; this.r[8] = ((t6 >>>  8) | (t7 <<  8)) & 0x1fff;
  this.r[9] = ((t7 >>>  5)) & 0x007f;

  this.pad[0] = key[16] & 0xff | (key[17] & 0xff) << 8;
  this.pad[1] = key[18] & 0xff | (key[19] & 0xff) << 8;
  this.pad[2] = key[20] & 0xff | (key[21] & 0xff) << 8;
  this.pad[3] = key[22] & 0xff | (key[23] & 0xff) << 8;
  this.pad[4] = key[24] & 0xff | (key[25] & 0xff) << 8;
  this.pad[5] = key[26] & 0xff | (key[27] & 0xff) << 8;
  this.pad[6] = key[28] & 0xff | (key[29] & 0xff) << 8;
  this.pad[7] = key[30] & 0xff | (key[31] & 0xff) << 8;
};

poly1305.prototype.blocks = function(m, mpos, bytes) {
  var hibit = this.fin ? 0 : (1 << 11);
  var t0, t1, t2, t3, t4, t5, t6, t7, c;
  var d0, d1, d2, d3, d4, d5, d6, d7, d8, d9;

  var h0 = this.h[0],
      h1 = this.h[1],
      h2 = this.h[2],
      h3 = this.h[3],
      h4 = this.h[4],
      h5 = this.h[5],
      h6 = this.h[6],
      h7 = this.h[7],
      h8 = this.h[8],
      h9 = this.h[9];

  var r0 = this.r[0],
      r1 = this.r[1],
      r2 = this.r[2],
      r3 = this.r[3],
      r4 = this.r[4],
      r5 = this.r[5],
      r6 = this.r[6],
      r7 = this.r[7],
      r8 = this.r[8],
      r9 = this.r[9];

  while (bytes >= 16) {
    t0 = m[mpos+ 0] & 0xff | (m[mpos+ 1] & 0xff) << 8; h0 += ( t0                     ) & 0x1fff;
    t1 = m[mpos+ 2] & 0xff | (m[mpos+ 3] & 0xff) << 8; h1 += ((t0 >>> 13) | (t1 <<  3)) & 0x1fff;
    t2 = m[mpos+ 4] & 0xff | (m[mpos+ 5] & 0xff) << 8; h2 += ((t1 >>> 10) | (t2 <<  6)) & 0x1fff;
    t3 = m[mpos+ 6] & 0xff | (m[mpos+ 7] & 0xff) << 8; h3 += ((t2 >>>  7) | (t3 <<  9)) & 0x1fff;
    t4 = m[mpos+ 8] & 0xff | (m[mpos+ 9] & 0xff) << 8; h4 += ((t3 >>>  4) | (t4 << 12)) & 0x1fff;
    h5 += ((t4 >>>  1)) & 0x1fff;
    t5 = m[mpos+10] & 0xff | (m[mpos+11] & 0xff) << 8; h6 += ((t4 >>> 14) | (t5 <<  2)) & 0x1fff;
    t6 = m[mpos+12] & 0xff | (m[mpos+13] & 0xff) << 8; h7 += ((t5 >>> 11) | (t6 <<  5)) & 0x1fff;
    t7 = m[mpos+14] & 0xff | (m[mpos+15] & 0xff) << 8; h8 += ((t6 >>>  8) | (t7 <<  8)) & 0x1fff;
    h9 += ((t7 >>> 5)) | hibit;

    c = 0;

    d0 = c;
    d0 += h0 * r0;
    d0 += h1 * (5 * r9);
    d0 += h2 * (5 * r8);
    d0 += h3 * (5 * r7);
    d0 += h4 * (5 * r6);
    c = (d0 >>> 13); d0 &= 0x1fff;
    d0 += h5 * (5 * r5);
    d0 += h6 * (5 * r4);
    d0 += h7 * (5 * r3);
    d0 += h8 * (5 * r2);
    d0 += h9 * (5 * r1);
    c += (d0 >>> 13); d0 &= 0x1fff;

    d1 = c;
    d1 += h0 * r1;
    d1 += h1 * r0;
    d1 += h2 * (5 * r9);
    d1 += h3 * (5 * r8);
    d1 += h4 * (5 * r7);
    c = (d1 >>> 13); d1 &= 0x1fff;
    d1 += h5 * (5 * r6);
    d1 += h6 * (5 * r5);
    d1 += h7 * (5 * r4);
    d1 += h8 * (5 * r3);
    d1 += h9 * (5 * r2);
    c += (d1 >>> 13); d1 &= 0x1fff;

    d2 = c;
    d2 += h0 * r2;
    d2 += h1 * r1;
    d2 += h2 * r0;
    d2 += h3 * (5 * r9);
    d2 += h4 * (5 * r8);
    c = (d2 >>> 13); d2 &= 0x1fff;
    d2 += h5 * (5 * r7);
    d2 += h6 * (5 * r6);
    d2 += h7 * (5 * r5);
    d2 += h8 * (5 * r4);
    d2 += h9 * (5 * r3);
    c += (d2 >>> 13); d2 &= 0x1fff;

    d3 = c;
    d3 += h0 * r3;
    d3 += h1 * r2;
    d3 += h2 * r1;
    d3 += h3 * r0;
    d3 += h4 * (5 * r9);
    c = (d3 >>> 13); d3 &= 0x1fff;
    d3 += h5 * (5 * r8);
    d3 += h6 * (5 * r7);
    d3 += h7 * (5 * r6);
    d3 += h8 * (5 * r5);
    d3 += h9 * (5 * r4);
    c += (d3 >>> 13); d3 &= 0x1fff;

    d4 = c;
    d4 += h0 * r4;
    d4 += h1 * r3;
    d4 += h2 * r2;
    d4 += h3 * r1;
    d4 += h4 * r0;
    c = (d4 >>> 13); d4 &= 0x1fff;
    d4 += h5 * (5 * r9);
    d4 += h6 * (5 * r8);
    d4 += h7 * (5 * r7);
    d4 += h8 * (5 * r6);
    d4 += h9 * (5 * r5);
    c += (d4 >>> 13); d4 &= 0x1fff;

    d5 = c;
    d5 += h0 * r5;
    d5 += h1 * r4;
    d5 += h2 * r3;
    d5 += h3 * r2;
    d5 += h4 * r1;
    c = (d5 >>> 13); d5 &= 0x1fff;
    d5 += h5 * r0;
    d5 += h6 * (5 * r9);
    d5 += h7 * (5 * r8);
    d5 += h8 * (5 * r7);
    d5 += h9 * (5 * r6);
    c += (d5 >>> 13); d5 &= 0x1fff;

    d6 = c;
    d6 += h0 * r6;
    d6 += h1 * r5;
    d6 += h2 * r4;
    d6 += h3 * r3;
    d6 += h4 * r2;
    c = (d6 >>> 13); d6 &= 0x1fff;
    d6 += h5 * r1;
    d6 += h6 * r0;
    d6 += h7 * (5 * r9);
    d6 += h8 * (5 * r8);
    d6 += h9 * (5 * r7);
    c += (d6 >>> 13); d6 &= 0x1fff;

    d7 = c;
    d7 += h0 * r7;
    d7 += h1 * r6;
    d7 += h2 * r5;
    d7 += h3 * r4;
    d7 += h4 * r3;
    c = (d7 >>> 13); d7 &= 0x1fff;
    d7 += h5 * r2;
    d7 += h6 * r1;
    d7 += h7 * r0;
    d7 += h8 * (5 * r9);
    d7 += h9 * (5 * r8);
    c += (d7 >>> 13); d7 &= 0x1fff;

    d8 = c;
    d8 += h0 * r8;
    d8 += h1 * r7;
    d8 += h2 * r6;
    d8 += h3 * r5;
    d8 += h4 * r4;
    c = (d8 >>> 13); d8 &= 0x1fff;
    d8 += h5 * r3;
    d8 += h6 * r2;
    d8 += h7 * r1;
    d8 += h8 * r0;
    d8 += h9 * (5 * r9);
    c += (d8 >>> 13); d8 &= 0x1fff;

    d9 = c;
    d9 += h0 * r9;
    d9 += h1 * r8;
    d9 += h2 * r7;
    d9 += h3 * r6;
    d9 += h4 * r5;
    c = (d9 >>> 13); d9 &= 0x1fff;
    d9 += h5 * r4;
    d9 += h6 * r3;
    d9 += h7 * r2;
    d9 += h8 * r1;
    d9 += h9 * r0;
    c += (d9 >>> 13); d9 &= 0x1fff;

    c = (((c << 2) + c)) | 0;
    c = (c + d0) | 0;
    d0 = c & 0x1fff;
    c = (c >>> 13);
    d1 += c;

    h0 = d0;
    h1 = d1;
    h2 = d2;
    h3 = d3;
    h4 = d4;
    h5 = d5;
    h6 = d6;
    h7 = d7;
    h8 = d8;
    h9 = d9;

    mpos += 16;
    bytes -= 16;
  }
  this.h[0] = h0;
  this.h[1] = h1;
  this.h[2] = h2;
  this.h[3] = h3;
  this.h[4] = h4;
  this.h[5] = h5;
  this.h[6] = h6;
  this.h[7] = h7;
  this.h[8] = h8;
  this.h[9] = h9;
};

poly1305.prototype.finish = function(mac, macpos) {
  var g = new Uint16Array(10);
  var c, mask, f, i;

  if (this.leftover) {
    i = this.leftover;
    this.buffer[i++] = 1;
    for (; i < 16; i++) this.buffer[i] = 0;
    this.fin = 1;
    this.blocks(this.buffer, 0, 16);
  }

  c = this.h[1] >>> 13;
  this.h[1] &= 0x1fff;
  for (i = 2; i < 10; i++) {
    this.h[i] += c;
    c = this.h[i] >>> 13;
    this.h[i] &= 0x1fff;
  }
  this.h[0] += (c * 5);
  c = this.h[0] >>> 13;
  this.h[0] &= 0x1fff;
  this.h[1] += c;
  c = this.h[1] >>> 13;
  this.h[1] &= 0x1fff;
  this.h[2] += c;

  g[0] = this.h[0] + 5;
  c = g[0] >>> 13;
  g[0] &= 0x1fff;
  for (i = 1; i < 10; i++) {
    g[i] = this.h[i] + c;
    c = g[i] >>> 13;
    g[i] &= 0x1fff;
  }
  g[9] -= (1 << 13);

  mask = (c ^ 1) - 1;
  for (i = 0; i < 10; i++) g[i] &= mask;
  mask = ~mask;
  for (i = 0; i < 10; i++) this.h[i] = (this.h[i] & mask) | g[i];

  this.h[0] = ((this.h[0]       ) | (this.h[1] << 13)                    ) & 0xffff;
  this.h[1] = ((this.h[1] >>>  3) | (this.h[2] << 10)                    ) & 0xffff;
  this.h[2] = ((this.h[2] >>>  6) | (this.h[3] <<  7)                    ) & 0xffff;
  this.h[3] = ((this.h[3] >>>  9) | (this.h[4] <<  4)                    ) & 0xffff;
  this.h[4] = ((this.h[4] >>> 12) | (this.h[5] <<  1) | (this.h[6] << 14)) & 0xffff;
  this.h[5] = ((this.h[6] >>>  2) | (this.h[7] << 11)                    ) & 0xffff;
  this.h[6] = ((this.h[7] >>>  5) | (this.h[8] <<  8)                    ) & 0xffff;
  this.h[7] = ((this.h[8] >>>  8) | (this.h[9] <<  5)                    ) & 0xffff;

  f = this.h[0] + this.pad[0];
  this.h[0] = f & 0xffff;
  for (i = 1; i < 8; i++) {
    f = (((this.h[i] + this.pad[i]) | 0) + (f >>> 16)) | 0;
    this.h[i] = f & 0xffff;
  }

  mac[macpos+ 0] = (this.h[0] >>> 0) & 0xff;
  mac[macpos+ 1] = (this.h[0] >>> 8) & 0xff;
  mac[macpos+ 2] = (this.h[1] >>> 0) & 0xff;
  mac[macpos+ 3] = (this.h[1] >>> 8) & 0xff;
  mac[macpos+ 4] = (this.h[2] >>> 0) & 0xff;
  mac[macpos+ 5] = (this.h[2] >>> 8) & 0xff;
  mac[macpos+ 6] = (this.h[3] >>> 0) & 0xff;
  mac[macpos+ 7] = (this.h[3] >>> 8) & 0xff;
  mac[macpos+ 8] = (this.h[4] >>> 0) & 0xff;
  mac[macpos+ 9] = (this.h[4] >>> 8) & 0xff;
  mac[macpos+10] = (this.h[5] >>> 0) & 0xff;
  mac[macpos+11] = (this.h[5] >>> 8) & 0xff;
  mac[macpos+12] = (this.h[6] >>> 0) & 0xff;
  mac[macpos+13] = (this.h[6] >>> 8) & 0xff;
  mac[macpos+14] = (this.h[7] >>> 0) & 0xff;
  mac[macpos+15] = (this.h[7] >>> 8) & 0xff;
};

poly1305.prototype.update = function(m, mpos, bytes) {
  var i, want;

  if (this.leftover) {
    want = (16 - this.leftover);
    if (want > bytes)
      want = bytes;
    for (i = 0; i < want; i++)
      this.buffer[this.leftover + i] = m[mpos+i];
    bytes -= want;
    mpos += want;
    this.leftover += want;
    if (this.leftover < 16)
      return;
    this.blocks(this.buffer, 0, 16);
    this.leftover = 0;
  }

  if (bytes >= 16) {
    want = bytes - (bytes % 16);
    this.blocks(m, mpos, want);
    mpos += want;
    bytes -= want;
  }

  if (bytes) {
    for (i = 0; i < bytes; i++)
      this.buffer[this.leftover + i] = m[mpos+i];
    this.leftover += bytes;
  }
};

function crypto_onetimeauth(out, outpos, m, mpos, n, k) {
  var s = new poly1305(k);
  s.update(m, mpos, n);
  s.finish(out, outpos);
  return 0;
}

function crypto_onetimeauth_verify(h, hpos, m, mpos, n, k) {
  var x = new Uint8Array(16);
  crypto_onetimeauth(x,0,m,mpos,n,k);
  return crypto_verify_16(h,hpos,x,0);
}

function crypto_secretbox(c,m,d,n,k) {
  var i;
  if (d < 32) return -1;
  crypto_stream_xor(c,0,m,0,d,n,k);
  crypto_onetimeauth(c, 16, c, 32, d - 32, c);
  for (i = 0; i < 16; i++) c[i] = 0;
  return 0;
}

function crypto_secretbox_open(m,c,d,n,k) {
  var i;
  var x = new Uint8Array(32);
  if (d < 32) return -1;
  crypto_stream(x,0,32,n,k);
  if (crypto_onetimeauth_verify(c, 16,c, 32,d - 32,x) !== 0) return -1;
  crypto_stream_xor(m,0,c,0,d,n,k);
  for (i = 0; i < 32; i++) m[i] = 0;
  return 0;
}

function set25519(r, a) {
  var i;
  for (i = 0; i < 16; i++) r[i] = a[i]|0;
}

function car25519(o) {
  var i, v, c = 1;
  for (i = 0; i < 16; i++) {
    v = o[i] + c + 65535;
    c = Math.floor(v / 65536);
    o[i] = v - c * 65536;
  }
  o[0] += c-1 + 37 * (c-1);
}

function sel25519(p, q, b) {
  var t, c = ~(b-1);
  for (var i = 0; i < 16; i++) {
    t = c & (p[i] ^ q[i]);
    p[i] ^= t;
    q[i] ^= t;
  }
}

function pack25519(o, n) {
  var i, j, b;
  var m = gf(), t = gf();
  for (i = 0; i < 16; i++) t[i] = n[i];
  car25519(t);
  car25519(t);
  car25519(t);
  for (j = 0; j < 2; j++) {
    m[0] = t[0] - 0xffed;
    for (i = 1; i < 15; i++) {
      m[i] = t[i] - 0xffff - ((m[i-1]>>16) & 1);
      m[i-1] &= 0xffff;
    }
    m[15] = t[15] - 0x7fff - ((m[14]>>16) & 1);
    b = (m[15]>>16) & 1;
    m[14] &= 0xffff;
    sel25519(t, m, 1-b);
  }
  for (i = 0; i < 16; i++) {
    o[2*i] = t[i] & 0xff;
    o[2*i+1] = t[i]>>8;
  }
}

function neq25519(a, b) {
  var c = new Uint8Array(32), d = new Uint8Array(32);
  pack25519(c, a);
  pack25519(d, b);
  return crypto_verify_32(c, 0, d, 0);
}

function par25519(a) {
  var d = new Uint8Array(32);
  pack25519(d, a);
  return d[0] & 1;
}

function unpack25519(o, n) {
  var i;
  for (i = 0; i < 16; i++) o[i] = n[2*i] + (n[2*i+1] << 8);
  o[15] &= 0x7fff;
}

function A(o, a, b) {
  for (var i = 0; i < 16; i++) o[i] = a[i] + b[i];
}

function Z(o, a, b) {
  for (var i = 0; i < 16; i++) o[i] = a[i] - b[i];
}

function M(o, a, b) {
  var v, c,
     t0 = 0,  t1 = 0,  t2 = 0,  t3 = 0,  t4 = 0,  t5 = 0,  t6 = 0,  t7 = 0,
     t8 = 0,  t9 = 0, t10 = 0, t11 = 0, t12 = 0, t13 = 0, t14 = 0, t15 = 0,
    t16 = 0, t17 = 0, t18 = 0, t19 = 0, t20 = 0, t21 = 0, t22 = 0, t23 = 0,
    t24 = 0, t25 = 0, t26 = 0, t27 = 0, t28 = 0, t29 = 0, t30 = 0,
    b0 = b[0],
    b1 = b[1],
    b2 = b[2],
    b3 = b[3],
    b4 = b[4],
    b5 = b[5],
    b6 = b[6],
    b7 = b[7],
    b8 = b[8],
    b9 = b[9],
    b10 = b[10],
    b11 = b[11],
    b12 = b[12],
    b13 = b[13],
    b14 = b[14],
    b15 = b[15];

  v = a[0];
  t0 += v * b0;
  t1 += v * b1;
  t2 += v * b2;
  t3 += v * b3;
  t4 += v * b4;
  t5 += v * b5;
  t6 += v * b6;
  t7 += v * b7;
  t8 += v * b8;
  t9 += v * b9;
  t10 += v * b10;
  t11 += v * b11;
  t12 += v * b12;
  t13 += v * b13;
  t14 += v * b14;
  t15 += v * b15;
  v = a[1];
  t1 += v * b0;
  t2 += v * b1;
  t3 += v * b2;
  t4 += v * b3;
  t5 += v * b4;
  t6 += v * b5;
  t7 += v * b6;
  t8 += v * b7;
  t9 += v * b8;
  t10 += v * b9;
  t11 += v * b10;
  t12 += v * b11;
  t13 += v * b12;
  t14 += v * b13;
  t15 += v * b14;
  t16 += v * b15;
  v = a[2];
  t2 += v * b0;
  t3 += v * b1;
  t4 += v * b2;
  t5 += v * b3;
  t6 += v * b4;
  t7 += v * b5;
  t8 += v * b6;
  t9 += v * b7;
  t10 += v * b8;
  t11 += v * b9;
  t12 += v * b10;
  t13 += v * b11;
  t14 += v * b12;
  t15 += v * b13;
  t16 += v * b14;
  t17 += v * b15;
  v = a[3];
  t3 += v * b0;
  t4 += v * b1;
  t5 += v * b2;
  t6 += v * b3;
  t7 += v * b4;
  t8 += v * b5;
  t9 += v * b6;
  t10 += v * b7;
  t11 += v * b8;
  t12 += v * b9;
  t13 += v * b10;
  t14 += v * b11;
  t15 += v * b12;
  t16 += v * b13;
  t17 += v * b14;
  t18 += v * b15;
  v = a[4];
  t4 += v * b0;
  t5 += v * b1;
  t6 += v * b2;
  t7 += v * b3;
  t8 += v * b4;
  t9 += v * b5;
  t10 += v * b6;
  t11 += v * b7;
  t12 += v * b8;
  t13 += v * b9;
  t14 += v * b10;
  t15 += v * b11;
  t16 += v * b12;
  t17 += v * b13;
  t18 += v * b14;
  t19 += v * b15;
  v = a[5];
  t5 += v * b0;
  t6 += v * b1;
  t7 += v * b2;
  t8 += v * b3;
  t9 += v * b4;
  t10 += v * b5;
  t11 += v * b6;
  t12 += v * b7;
  t13 += v * b8;
  t14 += v * b9;
  t15 += v * b10;
  t16 += v * b11;
  t17 += v * b12;
  t18 += v * b13;
  t19 += v * b14;
  t20 += v * b15;
  v = a[6];
  t6 += v * b0;
  t7 += v * b1;
  t8 += v * b2;
  t9 += v * b3;
  t10 += v * b4;
  t11 += v * b5;
  t12 += v * b6;
  t13 += v * b7;
  t14 += v * b8;
  t15 += v * b9;
  t16 += v * b10;
  t17 += v * b11;
  t18 += v * b12;
  t19 += v * b13;
  t20 += v * b14;
  t21 += v * b15;
  v = a[7];
  t7 += v * b0;
  t8 += v * b1;
  t9 += v * b2;
  t10 += v * b3;
  t11 += v * b4;
  t12 += v * b5;
  t13 += v * b6;
  t14 += v * b7;
  t15 += v * b8;
  t16 += v * b9;
  t17 += v * b10;
  t18 += v * b11;
  t19 += v * b12;
  t20 += v * b13;
  t21 += v * b14;
  t22 += v * b15;
  v = a[8];
  t8 += v * b0;
  t9 += v * b1;
  t10 += v * b2;
  t11 += v * b3;
  t12 += v * b4;
  t13 += v * b5;
  t14 += v * b6;
  t15 += v * b7;
  t16 += v * b8;
  t17 += v * b9;
  t18 += v * b10;
  t19 += v * b11;
  t20 += v * b12;
  t21 += v * b13;
  t22 += v * b14;
  t23 += v * b15;
  v = a[9];
  t9 += v * b0;
  t10 += v * b1;
  t11 += v * b2;
  t12 += v * b3;
  t13 += v * b4;
  t14 += v * b5;
  t15 += v * b6;
  t16 += v * b7;
  t17 += v * b8;
  t18 += v * b9;
  t19 += v * b10;
  t20 += v * b11;
  t21 += v * b12;
  t22 += v * b13;
  t23 += v * b14;
  t24 += v * b15;
  v = a[10];
  t10 += v * b0;
  t11 += v * b1;
  t12 += v * b2;
  t13 += v * b3;
  t14 += v * b4;
  t15 += v * b5;
  t16 += v * b6;
  t17 += v * b7;
  t18 += v * b8;
  t19 += v * b9;
  t20 += v * b10;
  t21 += v * b11;
  t22 += v * b12;
  t23 += v * b13;
  t24 += v * b14;
  t25 += v * b15;
  v = a[11];
  t11 += v * b0;
  t12 += v * b1;
  t13 += v * b2;
  t14 += v * b3;
  t15 += v * b4;
  t16 += v * b5;
  t17 += v * b6;
  t18 += v * b7;
  t19 += v * b8;
  t20 += v * b9;
  t21 += v * b10;
  t22 += v * b11;
  t23 += v * b12;
  t24 += v * b13;
  t25 += v * b14;
  t26 += v * b15;
  v = a[12];
  t12 += v * b0;
  t13 += v * b1;
  t14 += v * b2;
  t15 += v * b3;
  t16 += v * b4;
  t17 += v * b5;
  t18 += v * b6;
  t19 += v * b7;
  t20 += v * b8;
  t21 += v * b9;
  t22 += v * b10;
  t23 += v * b11;
  t24 += v * b12;
  t25 += v * b13;
  t26 += v * b14;
  t27 += v * b15;
  v = a[13];
  t13 += v * b0;
  t14 += v * b1;
  t15 += v * b2;
  t16 += v * b3;
  t17 += v * b4;
  t18 += v * b5;
  t19 += v * b6;
  t20 += v * b7;
  t21 += v * b8;
  t22 += v * b9;
  t23 += v * b10;
  t24 += v * b11;
  t25 += v * b12;
  t26 += v * b13;
  t27 += v * b14;
  t28 += v * b15;
  v = a[14];
  t14 += v * b0;
  t15 += v * b1;
  t16 += v * b2;
  t17 += v * b3;
  t18 += v * b4;
  t19 += v * b5;
  t20 += v * b6;
  t21 += v * b7;
  t22 += v * b8;
  t23 += v * b9;
  t24 += v * b10;
  t25 += v * b11;
  t26 += v * b12;
  t27 += v * b13;
  t28 += v * b14;
  t29 += v * b15;
  v = a[15];
  t15 += v * b0;
  t16 += v * b1;
  t17 += v * b2;
  t18 += v * b3;
  t19 += v * b4;
  t20 += v * b5;
  t21 += v * b6;
  t22 += v * b7;
  t23 += v * b8;
  t24 += v * b9;
  t25 += v * b10;
  t26 += v * b11;
  t27 += v * b12;
  t28 += v * b13;
  t29 += v * b14;
  t30 += v * b15;

  t0  += 38 * t16;
  t1  += 38 * t17;
  t2  += 38 * t18;
  t3  += 38 * t19;
  t4  += 38 * t20;
  t5  += 38 * t21;
  t6  += 38 * t22;
  t7  += 38 * t23;
  t8  += 38 * t24;
  t9  += 38 * t25;
  t10 += 38 * t26;
  t11 += 38 * t27;
  t12 += 38 * t28;
  t13 += 38 * t29;
  t14 += 38 * t30;
  // t15 left as is

  // first car
  c = 1;
  v =  t0 + c + 65535; c = Math.floor(v / 65536);  t0 = v - c * 65536;
  v =  t1 + c + 65535; c = Math.floor(v / 65536);  t1 = v - c * 65536;
  v =  t2 + c + 65535; c = Math.floor(v / 65536);  t2 = v - c * 65536;
  v =  t3 + c + 65535; c = Math.floor(v / 65536);  t3 = v - c * 65536;
  v =  t4 + c + 65535; c = Math.floor(v / 65536);  t4 = v - c * 65536;
  v =  t5 + c + 65535; c = Math.floor(v / 65536);  t5 = v - c * 65536;
  v =  t6 + c + 65535; c = Math.floor(v / 65536);  t6 = v - c * 65536;
  v =  t7 + c + 65535; c = Math.floor(v / 65536);  t7 = v - c * 65536;
  v =  t8 + c + 65535; c = Math.floor(v / 65536);  t8 = v - c * 65536;
  v =  t9 + c + 65535; c = Math.floor(v / 65536);  t9 = v - c * 65536;
  v = t10 + c + 65535; c = Math.floor(v / 65536); t10 = v - c * 65536;
  v = t11 + c + 65535; c = Math.floor(v / 65536); t11 = v - c * 65536;
  v = t12 + c + 65535; c = Math.floor(v / 65536); t12 = v - c * 65536;
  v = t13 + c + 65535; c = Math.floor(v / 65536); t13 = v - c * 65536;
  v = t14 + c + 65535; c = Math.floor(v / 65536); t14 = v - c * 65536;
  v = t15 + c + 65535; c = Math.floor(v / 65536); t15 = v - c * 65536;
  t0 += c-1 + 37 * (c-1);

  // second car
  c = 1;
  v =  t0 + c + 65535; c = Math.floor(v / 65536);  t0 = v - c * 65536;
  v =  t1 + c + 65535; c = Math.floor(v / 65536);  t1 = v - c * 65536;
  v =  t2 + c + 65535; c = Math.floor(v / 65536);  t2 = v - c * 65536;
  v =  t3 + c + 65535; c = Math.floor(v / 65536);  t3 = v - c * 65536;
  v =  t4 + c + 65535; c = Math.floor(v / 65536);  t4 = v - c * 65536;
  v =  t5 + c + 65535; c = Math.floor(v / 65536);  t5 = v - c * 65536;
  v =  t6 + c + 65535; c = Math.floor(v / 65536);  t6 = v - c * 65536;
  v =  t7 + c + 65535; c = Math.floor(v / 65536);  t7 = v - c * 65536;
  v =  t8 + c + 65535; c = Math.floor(v / 65536);  t8 = v - c * 65536;
  v =  t9 + c + 65535; c = Math.floor(v / 65536);  t9 = v - c * 65536;
  v = t10 + c + 65535; c = Math.floor(v / 65536); t10 = v - c * 65536;
  v = t11 + c + 65535; c = Math.floor(v / 65536); t11 = v - c * 65536;
  v = t12 + c + 65535; c = Math.floor(v / 65536); t12 = v - c * 65536;
  v = t13 + c + 65535; c = Math.floor(v / 65536); t13 = v - c * 65536;
  v = t14 + c + 65535; c = Math.floor(v / 65536); t14 = v - c * 65536;
  v = t15 + c + 65535; c = Math.floor(v / 65536); t15 = v - c * 65536;
  t0 += c-1 + 37 * (c-1);

  o[ 0] = t0;
  o[ 1] = t1;
  o[ 2] = t2;
  o[ 3] = t3;
  o[ 4] = t4;
  o[ 5] = t5;
  o[ 6] = t6;
  o[ 7] = t7;
  o[ 8] = t8;
  o[ 9] = t9;
  o[10] = t10;
  o[11] = t11;
  o[12] = t12;
  o[13] = t13;
  o[14] = t14;
  o[15] = t15;
}

function S(o, a) {
  M(o, a, a);
}

function inv25519(o, i) {
  var c = gf();
  var a;
  for (a = 0; a < 16; a++) c[a] = i[a];
  for (a = 253; a >= 0; a--) {
    S(c, c);
    if(a !== 2 && a !== 4) M(c, c, i);
  }
  for (a = 0; a < 16; a++) o[a] = c[a];
}

function pow2523(o, i) {
  var c = gf();
  var a;
  for (a = 0; a < 16; a++) c[a] = i[a];
  for (a = 250; a >= 0; a--) {
      S(c, c);
      if(a !== 1) M(c, c, i);
  }
  for (a = 0; a < 16; a++) o[a] = c[a];
}

function crypto_scalarmult(q, n, p) {
  var z = new Uint8Array(32);
  var x = new Float64Array(80), r, i;
  var a = gf(), b = gf(), c = gf(),
      d = gf(), e = gf(), f = gf();
  for (i = 0; i < 31; i++) z[i] = n[i];
  z[31]=(n[31]&127)|64;
  z[0]&=248;
  unpack25519(x,p);
  for (i = 0; i < 16; i++) {
    b[i]=x[i];
    d[i]=a[i]=c[i]=0;
  }
  a[0]=d[0]=1;
  for (i=254; i>=0; --i) {
    r=(z[i>>>3]>>>(i&7))&1;
    sel25519(a,b,r);
    sel25519(c,d,r);
    A(e,a,c);
    Z(a,a,c);
    A(c,b,d);
    Z(b,b,d);
    S(d,e);
    S(f,a);
    M(a,c,a);
    M(c,b,e);
    A(e,a,c);
    Z(a,a,c);
    S(b,a);
    Z(c,d,f);
    M(a,c,_121665);
    A(a,a,d);
    M(c,c,a);
    M(a,d,f);
    M(d,b,x);
    S(b,e);
    sel25519(a,b,r);
    sel25519(c,d,r);
  }
  for (i = 0; i < 16; i++) {
    x[i+16]=a[i];
    x[i+32]=c[i];
    x[i+48]=b[i];
    x[i+64]=d[i];
  }
  var x32 = x.subarray(32);
  var x16 = x.subarray(16);
  inv25519(x32,x32);
  M(x16,x16,x32);
  pack25519(q,x16);
  return 0;
}

function crypto_scalarmult_base(q, n) {
  return crypto_scalarmult(q, n, _9);
}

function crypto_box_keypair(y, x) {
  randombytes(x, 32);
  return crypto_scalarmult_base(y, x);
}

function crypto_box_beforenm(k, y, x) {
  var s = new Uint8Array(32);
  crypto_scalarmult(s, x, y);
  return crypto_core_hsalsa20(k, _0, s, sigma);
}

var crypto_box_afternm = crypto_secretbox;
var crypto_box_open_afternm = crypto_secretbox_open;

function crypto_box(c, m, d, n, y, x) {
  var k = new Uint8Array(32);
  crypto_box_beforenm(k, y, x);
  return crypto_box_afternm(c, m, d, n, k);
}

function crypto_box_open(m, c, d, n, y, x) {
  var k = new Uint8Array(32);
  crypto_box_beforenm(k, y, x);
  return crypto_box_open_afternm(m, c, d, n, k);
}

var K = [
  0x428a2f98, 0xd728ae22, 0x71374491, 0x23ef65cd,
  0xb5c0fbcf, 0xec4d3b2f, 0xe9b5dba5, 0x8189dbbc,
  0x3956c25b, 0xf348b538, 0x59f111f1, 0xb605d019,
  0x923f82a4, 0xaf194f9b, 0xab1c5ed5, 0xda6d8118,
  0xd807aa98, 0xa3030242, 0x12835b01, 0x45706fbe,
  0x243185be, 0x4ee4b28c, 0x550c7dc3, 0xd5ffb4e2,
  0x72be5d74, 0xf27b896f, 0x80deb1fe, 0x3b1696b1,
  0x9bdc06a7, 0x25c71235, 0xc19bf174, 0xcf692694,
  0xe49b69c1, 0x9ef14ad2, 0xefbe4786, 0x384f25e3,
  0x0fc19dc6, 0x8b8cd5b5, 0x240ca1cc, 0x77ac9c65,
  0x2de92c6f, 0x592b0275, 0x4a7484aa, 0x6ea6e483,
  0x5cb0a9dc, 0xbd41fbd4, 0x76f988da, 0x831153b5,
  0x983e5152, 0xee66dfab, 0xa831c66d, 0x2db43210,
  0xb00327c8, 0x98fb213f, 0xbf597fc7, 0xbeef0ee4,
  0xc6e00bf3, 0x3da88fc2, 0xd5a79147, 0x930aa725,
  0x06ca6351, 0xe003826f, 0x14292967, 0x0a0e6e70,
  0x27b70a85, 0x46d22ffc, 0x2e1b2138, 0x5c26c926,
  0x4d2c6dfc, 0x5ac42aed, 0x53380d13, 0x9d95b3df,
  0x650a7354, 0x8baf63de, 0x766a0abb, 0x3c77b2a8,
  0x81c2c92e, 0x47edaee6, 0x92722c85, 0x1482353b,
  0xa2bfe8a1, 0x4cf10364, 0xa81a664b, 0xbc423001,
  0xc24b8b70, 0xd0f89791, 0xc76c51a3, 0x0654be30,
  0xd192e819, 0xd6ef5218, 0xd6990624, 0x5565a910,
  0xf40e3585, 0x5771202a, 0x106aa070, 0x32bbd1b8,
  0x19a4c116, 0xb8d2d0c8, 0x1e376c08, 0x5141ab53,
  0x2748774c, 0xdf8eeb99, 0x34b0bcb5, 0xe19b48a8,
  0x391c0cb3, 0xc5c95a63, 0x4ed8aa4a, 0xe3418acb,
  0x5b9cca4f, 0x7763e373, 0x682e6ff3, 0xd6b2b8a3,
  0x748f82ee, 0x5defb2fc, 0x78a5636f, 0x43172f60,
  0x84c87814, 0xa1f0ab72, 0x8cc70208, 0x1a6439ec,
  0x90befffa, 0x23631e28, 0xa4506ceb, 0xde82bde9,
  0xbef9a3f7, 0xb2c67915, 0xc67178f2, 0xe372532b,
  0xca273ece, 0xea26619c, 0xd186b8c7, 0x21c0c207,
  0xeada7dd6, 0xcde0eb1e, 0xf57d4f7f, 0xee6ed178,
  0x06f067aa, 0x72176fba, 0x0a637dc5, 0xa2c898a6,
  0x113f9804, 0xbef90dae, 0x1b710b35, 0x131c471b,
  0x28db77f5, 0x23047d84, 0x32caab7b, 0x40c72493,
  0x3c9ebe0a, 0x15c9bebc, 0x431d67c4, 0x9c100d4c,
  0x4cc5d4be, 0xcb3e42b6, 0x597f299c, 0xfc657e2a,
  0x5fcb6fab, 0x3ad6faec, 0x6c44198c, 0x4a475817
];

function crypto_hashblocks_hl(hh, hl, m, n) {
  var wh = new Int32Array(16), wl = new Int32Array(16),
      bh0, bh1, bh2, bh3, bh4, bh5, bh6, bh7,
      bl0, bl1, bl2, bl3, bl4, bl5, bl6, bl7,
      th, tl, i, j, h, l, a, b, c, d;

  var ah0 = hh[0],
      ah1 = hh[1],
      ah2 = hh[2],
      ah3 = hh[3],
      ah4 = hh[4],
      ah5 = hh[5],
      ah6 = hh[6],
      ah7 = hh[7],

      al0 = hl[0],
      al1 = hl[1],
      al2 = hl[2],
      al3 = hl[3],
      al4 = hl[4],
      al5 = hl[5],
      al6 = hl[6],
      al7 = hl[7];

  var pos = 0;
  while (n >= 128) {
    for (i = 0; i < 16; i++) {
      j = 8 * i + pos;
      wh[i] = (m[j+0] << 24) | (m[j+1] << 16) | (m[j+2] << 8) | m[j+3];
      wl[i] = (m[j+4] << 24) | (m[j+5] << 16) | (m[j+6] << 8) | m[j+7];
    }
    for (i = 0; i < 80; i++) {
      bh0 = ah0;
      bh1 = ah1;
      bh2 = ah2;
      bh3 = ah3;
      bh4 = ah4;
      bh5 = ah5;
      bh6 = ah6;
      bh7 = ah7;

      bl0 = al0;
      bl1 = al1;
      bl2 = al2;
      bl3 = al3;
      bl4 = al4;
      bl5 = al5;
      bl6 = al6;
      bl7 = al7;

      // add
      h = ah7;
      l = al7;

      a = l & 0xffff; b = l >>> 16;
      c = h & 0xffff; d = h >>> 16;

      // Sigma1
      h = ((ah4 >>> 14) | (al4 << (32-14))) ^ ((ah4 >>> 18) | (al4 << (32-18))) ^ ((al4 >>> (41-32)) | (ah4 << (32-(41-32))));
      l = ((al4 >>> 14) | (ah4 << (32-14))) ^ ((al4 >>> 18) | (ah4 << (32-18))) ^ ((ah4 >>> (41-32)) | (al4 << (32-(41-32))));

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      // Ch
      h = (ah4 & ah5) ^ (~ah4 & ah6);
      l = (al4 & al5) ^ (~al4 & al6);

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      // K
      h = K[i*2];
      l = K[i*2+1];

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      // w
      h = wh[i%16];
      l = wl[i%16];

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      b += a >>> 16;
      c += b >>> 16;
      d += c >>> 16;

      th = c & 0xffff | d << 16;
      tl = a & 0xffff | b << 16;

      // add
      h = th;
      l = tl;

      a = l & 0xffff; b = l >>> 16;
      c = h & 0xffff; d = h >>> 16;

      // Sigma0
      h = ((ah0 >>> 28) | (al0 << (32-28))) ^ ((al0 >>> (34-32)) | (ah0 << (32-(34-32)))) ^ ((al0 >>> (39-32)) | (ah0 << (32-(39-32))));
      l = ((al0 >>> 28) | (ah0 << (32-28))) ^ ((ah0 >>> (34-32)) | (al0 << (32-(34-32)))) ^ ((ah0 >>> (39-32)) | (al0 << (32-(39-32))));

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      // Maj
      h = (ah0 & ah1) ^ (ah0 & ah2) ^ (ah1 & ah2);
      l = (al0 & al1) ^ (al0 & al2) ^ (al1 & al2);

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      b += a >>> 16;
      c += b >>> 16;
      d += c >>> 16;

      bh7 = (c & 0xffff) | (d << 16);
      bl7 = (a & 0xffff) | (b << 16);

      // add
      h = bh3;
      l = bl3;

      a = l & 0xffff; b = l >>> 16;
      c = h & 0xffff; d = h >>> 16;

      h = th;
      l = tl;

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      b += a >>> 16;
      c += b >>> 16;
      d += c >>> 16;

      bh3 = (c & 0xffff) | (d << 16);
      bl3 = (a & 0xffff) | (b << 16);

      ah1 = bh0;
      ah2 = bh1;
      ah3 = bh2;
      ah4 = bh3;
      ah5 = bh4;
      ah6 = bh5;
      ah7 = bh6;
      ah0 = bh7;

      al1 = bl0;
      al2 = bl1;
      al3 = bl2;
      al4 = bl3;
      al5 = bl4;
      al6 = bl5;
      al7 = bl6;
      al0 = bl7;

      if (i%16 === 15) {
        for (j = 0; j < 16; j++) {
          // add
          h = wh[j];
          l = wl[j];

          a = l & 0xffff; b = l >>> 16;
          c = h & 0xffff; d = h >>> 16;

          h = wh[(j+9)%16];
          l = wl[(j+9)%16];

          a += l & 0xffff; b += l >>> 16;
          c += h & 0xffff; d += h >>> 16;

          // sigma0
          th = wh[(j+1)%16];
          tl = wl[(j+1)%16];
          h = ((th >>> 1) | (tl << (32-1))) ^ ((th >>> 8) | (tl << (32-8))) ^ (th >>> 7);
          l = ((tl >>> 1) | (th << (32-1))) ^ ((tl >>> 8) | (th << (32-8))) ^ ((tl >>> 7) | (th << (32-7)));

          a += l & 0xffff; b += l >>> 16;
          c += h & 0xffff; d += h >>> 16;

          // sigma1
          th = wh[(j+14)%16];
          tl = wl[(j+14)%16];
          h = ((th >>> 19) | (tl << (32-19))) ^ ((tl >>> (61-32)) | (th << (32-(61-32)))) ^ (th >>> 6);
          l = ((tl >>> 19) | (th << (32-19))) ^ ((th >>> (61-32)) | (tl << (32-(61-32)))) ^ ((tl >>> 6) | (th << (32-6)));

          a += l & 0xffff; b += l >>> 16;
          c += h & 0xffff; d += h >>> 16;

          b += a >>> 16;
          c += b >>> 16;
          d += c >>> 16;

          wh[j] = (c & 0xffff) | (d << 16);
          wl[j] = (a & 0xffff) | (b << 16);
        }
      }
    }

    // add
    h = ah0;
    l = al0;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[0];
    l = hl[0];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[0] = ah0 = (c & 0xffff) | (d << 16);
    hl[0] = al0 = (a & 0xffff) | (b << 16);

    h = ah1;
    l = al1;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[1];
    l = hl[1];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[1] = ah1 = (c & 0xffff) | (d << 16);
    hl[1] = al1 = (a & 0xffff) | (b << 16);

    h = ah2;
    l = al2;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[2];
    l = hl[2];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[2] = ah2 = (c & 0xffff) | (d << 16);
    hl[2] = al2 = (a & 0xffff) | (b << 16);

    h = ah3;
    l = al3;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[3];
    l = hl[3];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[3] = ah3 = (c & 0xffff) | (d << 16);
    hl[3] = al3 = (a & 0xffff) | (b << 16);

    h = ah4;
    l = al4;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[4];
    l = hl[4];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[4] = ah4 = (c & 0xffff) | (d << 16);
    hl[4] = al4 = (a & 0xffff) | (b << 16);

    h = ah5;
    l = al5;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[5];
    l = hl[5];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[5] = ah5 = (c & 0xffff) | (d << 16);
    hl[5] = al5 = (a & 0xffff) | (b << 16);

    h = ah6;
    l = al6;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[6];
    l = hl[6];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[6] = ah6 = (c & 0xffff) | (d << 16);
    hl[6] = al6 = (a & 0xffff) | (b << 16);

    h = ah7;
    l = al7;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[7];
    l = hl[7];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[7] = ah7 = (c & 0xffff) | (d << 16);
    hl[7] = al7 = (a & 0xffff) | (b << 16);

    pos += 128;
    n -= 128;
  }

  return n;
}

function crypto_hash(out, m, n) {
  var hh = new Int32Array(8),
      hl = new Int32Array(8),
      x = new Uint8Array(256),
      i, b = n;

  hh[0] = 0x6a09e667;
  hh[1] = 0xbb67ae85;
  hh[2] = 0x3c6ef372;
  hh[3] = 0xa54ff53a;
  hh[4] = 0x510e527f;
  hh[5] = 0x9b05688c;
  hh[6] = 0x1f83d9ab;
  hh[7] = 0x5be0cd19;

  hl[0] = 0xf3bcc908;
  hl[1] = 0x84caa73b;
  hl[2] = 0xfe94f82b;
  hl[3] = 0x5f1d36f1;
  hl[4] = 0xade682d1;
  hl[5] = 0x2b3e6c1f;
  hl[6] = 0xfb41bd6b;
  hl[7] = 0x137e2179;

  crypto_hashblocks_hl(hh, hl, m, n);
  n %= 128;

  for (i = 0; i < n; i++) x[i] = m[b-n+i];
  x[n] = 128;

  n = 256-128*(n<112?1:0);
  x[n-9] = 0;
  ts64(x, n-8,  (b / 0x20000000) | 0, b << 3);
  crypto_hashblocks_hl(hh, hl, x, n);

  for (i = 0; i < 8; i++) ts64(out, 8*i, hh[i], hl[i]);

  return 0;
}

function add(p, q) {
  var a = gf(), b = gf(), c = gf(),
      d = gf(), e = gf(), f = gf(),
      g = gf(), h = gf(), t = gf();

  Z(a, p[1], p[0]);
  Z(t, q[1], q[0]);
  M(a, a, t);
  A(b, p[0], p[1]);
  A(t, q[0], q[1]);
  M(b, b, t);
  M(c, p[3], q[3]);
  M(c, c, D2);
  M(d, p[2], q[2]);
  A(d, d, d);
  Z(e, b, a);
  Z(f, d, c);
  A(g, d, c);
  A(h, b, a);

  M(p[0], e, f);
  M(p[1], h, g);
  M(p[2], g, f);
  M(p[3], e, h);
}

function cswap(p, q, b) {
  var i;
  for (i = 0; i < 4; i++) {
    sel25519(p[i], q[i], b);
  }
}

function pack(r, p) {
  var tx = gf(), ty = gf(), zi = gf();
  inv25519(zi, p[2]);
  M(tx, p[0], zi);
  M(ty, p[1], zi);
  pack25519(r, ty);
  r[31] ^= par25519(tx) << 7;
}

function scalarmult(p, q, s) {
  var b, i;
  set25519(p[0], gf0);
  set25519(p[1], gf1);
  set25519(p[2], gf1);
  set25519(p[3], gf0);
  for (i = 255; i >= 0; --i) {
    b = (s[(i/8)|0] >> (i&7)) & 1;
    cswap(p, q, b);
    add(q, p);
    add(p, p);
    cswap(p, q, b);
  }
}

function scalarbase(p, s) {
  var q = [gf(), gf(), gf(), gf()];
  set25519(q[0], X);
  set25519(q[1], Y);
  set25519(q[2], gf1);
  M(q[3], X, Y);
  scalarmult(p, q, s);
}

function crypto_sign_keypair(pk, sk, seeded) {
  var d = new Uint8Array(64);
  var p = [gf(), gf(), gf(), gf()];
  var i;

  if (!seeded) randombytes(sk, 32);
  crypto_hash(d, sk, 32);
  d[0] &= 248;
  d[31] &= 127;
  d[31] |= 64;

  scalarbase(p, d);
  pack(pk, p);

  for (i = 0; i < 32; i++) sk[i+32] = pk[i];
  return 0;
}

var L = new Float64Array([0xed, 0xd3, 0xf5, 0x5c, 0x1a, 0x63, 0x12, 0x58, 0xd6, 0x9c, 0xf7, 0xa2, 0xde, 0xf9, 0xde, 0x14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0x10]);

function modL(r, x) {
  var carry, i, j, k;
  for (i = 63; i >= 32; --i) {
    carry = 0;
    for (j = i - 32, k = i - 12; j < k; ++j) {
      x[j] += carry - 16 * x[i] * L[j - (i - 32)];
      carry = Math.floor((x[j] + 128) / 256);
      x[j] -= carry * 256;
    }
    x[j] += carry;
    x[i] = 0;
  }
  carry = 0;
  for (j = 0; j < 32; j++) {
    x[j] += carry - (x[31] >> 4) * L[j];
    carry = x[j] >> 8;
    x[j] &= 255;
  }
  for (j = 0; j < 32; j++) x[j] -= carry * L[j];
  for (i = 0; i < 32; i++) {
    x[i+1] += x[i] >> 8;
    r[i] = x[i] & 255;
  }
}

function reduce(r) {
  var x = new Float64Array(64), i;
  for (i = 0; i < 64; i++) x[i] = r[i];
  for (i = 0; i < 64; i++) r[i] = 0;
  modL(r, x);
}

// Note: difference from C - smlen returned, not passed as argument.
function crypto_sign(sm, m, n, sk) {
  var d = new Uint8Array(64), h = new Uint8Array(64), r = new Uint8Array(64);
  var i, j, x = new Float64Array(64);
  var p = [gf(), gf(), gf(), gf()];

  crypto_hash(d, sk, 32);
  d[0] &= 248;
  d[31] &= 127;
  d[31] |= 64;

  var smlen = n + 64;
  for (i = 0; i < n; i++) sm[64 + i] = m[i];
  for (i = 0; i < 32; i++) sm[32 + i] = d[32 + i];

  crypto_hash(r, sm.subarray(32), n+32);
  reduce(r);
  scalarbase(p, r);
  pack(sm, p);

  for (i = 32; i < 64; i++) sm[i] = sk[i];
  crypto_hash(h, sm, n + 64);
  reduce(h);

  for (i = 0; i < 64; i++) x[i] = 0;
  for (i = 0; i < 32; i++) x[i] = r[i];
  for (i = 0; i < 32; i++) {
    for (j = 0; j < 32; j++) {
      x[i+j] += h[i] * d[j];
    }
  }

  modL(sm.subarray(32), x);
  return smlen;
}

function unpackneg(r, p) {
  var t = gf(), chk = gf(), num = gf(),
      den = gf(), den2 = gf(), den4 = gf(),
      den6 = gf();

  set25519(r[2], gf1);
  unpack25519(r[1], p);
  S(num, r[1]);
  M(den, num, D);
  Z(num, num, r[2]);
  A(den, r[2], den);

  S(den2, den);
  S(den4, den2);
  M(den6, den4, den2);
  M(t, den6, num);
  M(t, t, den);

  pow2523(t, t);
  M(t, t, num);
  M(t, t, den);
  M(t, t, den);
  M(r[0], t, den);

  S(chk, r[0]);
  M(chk, chk, den);
  if (neq25519(chk, num)) M(r[0], r[0], I);

  S(chk, r[0]);
  M(chk, chk, den);
  if (neq25519(chk, num)) return -1;

  if (par25519(r[0]) === (p[31]>>7)) Z(r[0], gf0, r[0]);

  M(r[3], r[0], r[1]);
  return 0;
}

function crypto_sign_open(m, sm, n, pk) {
  var i;
  var t = new Uint8Array(32), h = new Uint8Array(64);
  var p = [gf(), gf(), gf(), gf()],
      q = [gf(), gf(), gf(), gf()];

  if (n < 64) return -1;

  if (unpackneg(q, pk)) return -1;

  for (i = 0; i < n; i++) m[i] = sm[i];
  for (i = 0; i < 32; i++) m[i+32] = pk[i];
  crypto_hash(h, m, n);
  reduce(h);
  scalarmult(p, q, h);

  scalarbase(q, sm.subarray(32));
  add(p, q);
  pack(t, p);

  n -= 64;
  if (crypto_verify_32(sm, 0, t, 0)) {
    for (i = 0; i < n; i++) m[i] = 0;
    return -1;
  }

  for (i = 0; i < n; i++) m[i] = sm[i + 64];
  return n;
}

var crypto_secretbox_KEYBYTES = 32,
    crypto_secretbox_NONCEBYTES = 24,
    crypto_secretbox_ZEROBYTES = 32,
    crypto_secretbox_BOXZEROBYTES = 16,
    crypto_scalarmult_BYTES = 32,
    crypto_scalarmult_SCALARBYTES = 32,
    crypto_box_PUBLICKEYBYTES = 32,
    crypto_box_SECRETKEYBYTES = 32,
    crypto_box_BEFORENMBYTES = 32,
    crypto_box_NONCEBYTES = crypto_secretbox_NONCEBYTES,
    crypto_box_ZEROBYTES = crypto_secretbox_ZEROBYTES,
    crypto_box_BOXZEROBYTES = crypto_secretbox_BOXZEROBYTES,
    crypto_sign_BYTES = 64,
    crypto_sign_PUBLICKEYBYTES = 32,
    crypto_sign_SECRETKEYBYTES = 64,
    crypto_sign_SEEDBYTES = 32,
    crypto_hash_BYTES = 64;

nacl.lowlevel = {
  crypto_core_hsalsa20: crypto_core_hsalsa20,
  crypto_stream_xor: crypto_stream_xor,
  crypto_stream: crypto_stream,
  crypto_stream_salsa20_xor: crypto_stream_salsa20_xor,
  crypto_stream_salsa20: crypto_stream_salsa20,
  crypto_onetimeauth: crypto_onetimeauth,
  crypto_onetimeauth_verify: crypto_onetimeauth_verify,
  crypto_verify_16: crypto_verify_16,
  crypto_verify_32: crypto_verify_32,
  crypto_secretbox: crypto_secretbox,
  crypto_secretbox_open: crypto_secretbox_open,
  crypto_scalarmult: crypto_scalarmult,
  crypto_scalarmult_base: crypto_scalarmult_base,
  crypto_box_beforenm: crypto_box_beforenm,
  crypto_box_afternm: crypto_box_afternm,
  crypto_box: crypto_box,
  crypto_box_open: crypto_box_open,
  crypto_box_keypair: crypto_box_keypair,
  crypto_hash: crypto_hash,
  crypto_sign: crypto_sign,
  crypto_sign_keypair: crypto_sign_keypair,
  crypto_sign_open: crypto_sign_open,

  crypto_secretbox_KEYBYTES: crypto_secretbox_KEYBYTES,
  crypto_secretbox_NONCEBYTES: crypto_secretbox_NONCEBYTES,
  crypto_secretbox_ZEROBYTES: crypto_secretbox_ZEROBYTES,
  crypto_secretbox_BOXZEROBYTES: crypto_secretbox_BOXZEROBYTES,
  crypto_scalarmult_BYTES: crypto_scalarmult_BYTES,
  crypto_scalarmult_SCALARBYTES: crypto_scalarmult_SCALARBYTES,
  crypto_box_PUBLICKEYBYTES: crypto_box_PUBLICKEYBYTES,
  crypto_box_SECRETKEYBYTES: crypto_box_SECRETKEYBYTES,
  crypto_box_BEFORENMBYTES: crypto_box_BEFORENMBYTES,
  crypto_box_NONCEBYTES: crypto_box_NONCEBYTES,
  crypto_box_ZEROBYTES: crypto_box_ZEROBYTES,
  crypto_box_BOXZEROBYTES: crypto_box_BOXZEROBYTES,
  crypto_sign_BYTES: crypto_sign_BYTES,
  crypto_sign_PUBLICKEYBYTES: crypto_sign_PUBLICKEYBYTES,
  crypto_sign_SECRETKEYBYTES: crypto_sign_SECRETKEYBYTES,
  crypto_sign_SEEDBYTES: crypto_sign_SEEDBYTES,
  crypto_hash_BYTES: crypto_hash_BYTES,

  gf: gf,
  D: D,
  L: L,
  pack25519: pack25519,
  unpack25519: unpack25519,
  M: M,
  A: A,
  S: S,
  Z: Z,
  pow2523: pow2523,
  add: add,
  set25519: set25519,
  modL: modL,
  scalarmult: scalarmult,
  scalarbase: scalarbase,
};

/* High-level API */

function checkLengths(k, n) {
  if (k.length !== crypto_secretbox_KEYBYTES) throw new Error('bad key size');
  if (n.length !== crypto_secretbox_NONCEBYTES) throw new Error('bad nonce size');
}

function checkBoxLengths(pk, sk) {
  if (pk.length !== crypto_box_PUBLICKEYBYTES) throw new Error('bad public key size');
  if (sk.length !== crypto_box_SECRETKEYBYTES) throw new Error('bad secret key size');
}

function checkArrayTypes() {
  for (var i = 0; i < arguments.length; i++) {
    if (!(arguments[i] instanceof Uint8Array))
      throw new TypeError('unexpected type, use Uint8Array');
  }
}

function cleanup(arr) {
  for (var i = 0; i < arr.length; i++) arr[i] = 0;
}

nacl.randomBytes = function(n) {
  var b = new Uint8Array(n);
  randombytes(b, n);
  return b;
};

nacl.secretbox = function(msg, nonce, key) {
  checkArrayTypes(msg, nonce, key);
  checkLengths(key, nonce);
  var m = new Uint8Array(crypto_secretbox_ZEROBYTES + msg.length);
  var c = new Uint8Array(m.length);
  for (var i = 0; i < msg.length; i++) m[i+crypto_secretbox_ZEROBYTES] = msg[i];
  crypto_secretbox(c, m, m.length, nonce, key);
  return c.subarray(crypto_secretbox_BOXZEROBYTES);
};

nacl.secretbox.open = function(box, nonce, key) {
  checkArrayTypes(box, nonce, key);
  checkLengths(key, nonce);
  var c = new Uint8Array(crypto_secretbox_BOXZEROBYTES + box.length);
  var m = new Uint8Array(c.length);
  for (var i = 0; i < box.length; i++) c[i+crypto_secretbox_BOXZEROBYTES] = box[i];
  if (c.length < 32) return null;
  if (crypto_secretbox_open(m, c, c.length, nonce, key) !== 0) return null;
  return m.subarray(crypto_secretbox_ZEROBYTES);
};

nacl.secretbox.keyLength = crypto_secretbox_KEYBYTES;
nacl.secretbox.nonceLength = crypto_secretbox_NONCEBYTES;
nacl.secretbox.overheadLength = crypto_secretbox_BOXZEROBYTES;

nacl.scalarMult = function(n, p) {
  checkArrayTypes(n, p);
  if (n.length !== crypto_scalarmult_SCALARBYTES) throw new Error('bad n size');
  if (p.length !== crypto_scalarmult_BYTES) throw new Error('bad p size');
  var q = new Uint8Array(crypto_scalarmult_BYTES);
  crypto_scalarmult(q, n, p);
  return q;
};

nacl.scalarMult.base = function(n) {
  checkArrayTypes(n);
  if (n.length !== crypto_scalarmult_SCALARBYTES) throw new Error('bad n size');
  var q = new Uint8Array(crypto_scalarmult_BYTES);
  crypto_scalarmult_base(q, n);
  return q;
};

nacl.scalarMult.scalarLength = crypto_scalarmult_SCALARBYTES;
nacl.scalarMult.groupElementLength = crypto_scalarmult_BYTES;

nacl.box = function(msg, nonce, publicKey, secretKey) {
  var k = nacl.box.before(publicKey, secretKey);
  return nacl.secretbox(msg, nonce, k);
};

nacl.box.before = function(publicKey, secretKey) {
  checkArrayTypes(publicKey, secretKey);
  checkBoxLengths(publicKey, secretKey);
  var k = new Uint8Array(crypto_box_BEFORENMBYTES);
  crypto_box_beforenm(k, publicKey, secretKey);
  return k;
};

nacl.box.after = nacl.secretbox;

nacl.box.open = function(msg, nonce, publicKey, secretKey) {
  var k = nacl.box.before(publicKey, secretKey);
  return nacl.secretbox.open(msg, nonce, k);
};

nacl.box.open.after = nacl.secretbox.open;

nacl.box.keyPair = function() {
  var pk = new Uint8Array(crypto_box_PUBLICKEYBYTES);
  var sk = new Uint8Array(crypto_box_SECRETKEYBYTES);
  crypto_box_keypair(pk, sk);
  return {publicKey: pk, secretKey: sk};
};

nacl.box.keyPair.fromSecretKey = function(secretKey) {
  checkArrayTypes(secretKey);
  if (secretKey.length !== crypto_box_SECRETKEYBYTES)
    throw new Error('bad secret key size');
  var pk = new Uint8Array(crypto_box_PUBLICKEYBYTES);
  crypto_scalarmult_base(pk, secretKey);
  return {publicKey: pk, secretKey: new Uint8Array(secretKey)};
};

nacl.box.publicKeyLength = crypto_box_PUBLICKEYBYTES;
nacl.box.secretKeyLength = crypto_box_SECRETKEYBYTES;
nacl.box.sharedKeyLength = crypto_box_BEFORENMBYTES;
nacl.box.nonceLength = crypto_box_NONCEBYTES;
nacl.box.overheadLength = nacl.secretbox.overheadLength;

nacl.sign = function(msg, secretKey) {
  checkArrayTypes(msg, secretKey);
  if (secretKey.length !== crypto_sign_SECRETKEYBYTES)
    throw new Error('bad secret key size');
  var signedMsg = new Uint8Array(crypto_sign_BYTES+msg.length);
  crypto_sign(signedMsg, msg, msg.length, secretKey);
  return signedMsg;
};

nacl.sign.open = function(signedMsg, publicKey) {
  checkArrayTypes(signedMsg, publicKey);
  if (publicKey.length !== crypto_sign_PUBLICKEYBYTES)
    throw new Error('bad public key size');
  var tmp = new Uint8Array(signedMsg.length);
  var mlen = crypto_sign_open(tmp, signedMsg, signedMsg.length, publicKey);
  if (mlen < 0) return null;
  var m = new Uint8Array(mlen);
  for (var i = 0; i < m.length; i++) m[i] = tmp[i];
  return m;
};

nacl.sign.detached = function(msg, secretKey) {
  var signedMsg = nacl.sign(msg, secretKey);
  var sig = new Uint8Array(crypto_sign_BYTES);
  for (var i = 0; i < sig.length; i++) sig[i] = signedMsg[i];
  return sig;
};

nacl.sign.detached.verify = function(msg, sig, publicKey) {
  checkArrayTypes(msg, sig, publicKey);
  if (sig.length !== crypto_sign_BYTES)
    throw new Error('bad signature size');
  if (publicKey.length !== crypto_sign_PUBLICKEYBYTES)
    throw new Error('bad public key size');
  var sm = new Uint8Array(crypto_sign_BYTES + msg.length);
  var m = new Uint8Array(crypto_sign_BYTES + msg.length);
  var i;
  for (i = 0; i < crypto_sign_BYTES; i++) sm[i] = sig[i];
  for (i = 0; i < msg.length; i++) sm[i+crypto_sign_BYTES] = msg[i];
  return (crypto_sign_open(m, sm, sm.length, publicKey) >= 0);
};

nacl.sign.keyPair = function() {
  var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
  var sk = new Uint8Array(crypto_sign_SECRETKEYBYTES);
  crypto_sign_keypair(pk, sk);
  return {publicKey: pk, secretKey: sk};
};

nacl.sign.keyPair.fromSecretKey = function(secretKey) {
  checkArrayTypes(secretKey);
  if (secretKey.length !== crypto_sign_SECRETKEYBYTES)
    throw new Error('bad secret key size');
  var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
  for (var i = 0; i < pk.length; i++) pk[i] = secretKey[32+i];
  return {publicKey: pk, secretKey: new Uint8Array(secretKey)};
};

nacl.sign.keyPair.fromSeed = function(seed) {
  checkArrayTypes(seed);
  if (seed.length !== crypto_sign_SEEDBYTES)
    throw new Error('bad seed size');
  var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
  var sk = new Uint8Array(crypto_sign_SECRETKEYBYTES);
  for (var i = 0; i < 32; i++) sk[i] = seed[i];
  crypto_sign_keypair(pk, sk, true);
  return {publicKey: pk, secretKey: sk};
};

nacl.sign.publicKeyLength = crypto_sign_PUBLICKEYBYTES;
nacl.sign.secretKeyLength = crypto_sign_SECRETKEYBYTES;
nacl.sign.seedLength = crypto_sign_SEEDBYTES;
nacl.sign.signatureLength = crypto_sign_BYTES;

nacl.hash = function(msg) {
  checkArrayTypes(msg);
  var h = new Uint8Array(crypto_hash_BYTES);
  crypto_hash(h, msg, msg.length);
  return h;
};

nacl.hash.hashLength = crypto_hash_BYTES;

nacl.verify = function(x, y) {
  checkArrayTypes(x, y);
  // Zero length arguments are considered not equal.
  if (x.length === 0 || y.length === 0) return false;
  if (x.length !== y.length) return false;
  return (vn(x, 0, y, 0, x.length) === 0) ? true : false;
};

nacl.setPRNG = function(fn) {
  randombytes = fn;
};

(function() {
  // Initialize PRNG if environment provides CSPRNG.
  // If not, methods calling randombytes will throw.
  var crypto = typeof self !== 'undefined' ? (self.crypto || self.msCrypto) : null;
  if (crypto && crypto.getRandomValues) {
    // Browsers.
    var QUOTA = 65536;
    nacl.setPRNG(function(x, n) {
      var i, v = new Uint8Array(n);
      for (i = 0; i < n; i += QUOTA) {
        crypto.getRandomValues(v.subarray(i, i + Math.min(n - i, QUOTA)));
      }
      for (i = 0; i < n; i++) x[i] = v[i];
      cleanup(v);
    });
  } else if (typeof require !== 'undefined') {
    // Node.js.
    crypto = require('crypto');
    if (crypto && crypto.randomBytes) {
      nacl.setPRNG(function(x, n) {
        var i, v = crypto.randomBytes(n);
        for (i = 0; i < n; i++) x[i] = v[i];
        cleanup(v);
      });
    }
  }
})();

})(typeof module !== 'undefined' && module.exports ? module.exports : (self.nacl = self.nacl || {}));

},{"crypto":83}]},{},[6]);
