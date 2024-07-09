System.register("q-bundled:///fs/cocos/2d/utils/text-utils.js", ["../../../../virtual/internal%253Aconstants.js", "pal/minigame", "../../core/index.js"], function (_export, _context) {
  "use strict";

  var RUNTIME_BASED, minigame, js, BASELINE_RATIO, _BASELINE_OFFSET, ral, featureAlphabeticeName, featureAlphabeticEnable, defaultBaselineName, defaultIsAlphaBetic, MIDDLE_RATIO, MAX_CACHE_SIZE, pool, LRUCache, measureCache, WORD_REG, SYMBOL_REG, LAST_WORD_REG, LAST_ENGLISH_REG, FIRST_ENGLISH_REG, WRAP_INSPECTION, highSurrogateRex, lowSurrogateRex;
  function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
  function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }
  function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); } /*
                                                                                                                                                                                                                                                                                                                                                                                             Copyright (c) 2013-2016 Chukong Technologies Inc.
                                                                                                                                                                                                                                                                                                                                                                                             Copyright (c) 2017-2023 Xiamen Yaji Software Co., Ltd.
                                                                                                                                                                                                                                                                                                                                                                                            
                                                                                                                                                                                                                                                                                                                                                                                             https://www.cocos.com/
                                                                                                                                                                                                                                                                                                                                                                                            
                                                                                                                                                                                                                                                                                                                                                                                             Permission is hereby granted, free of charge, to any person obtaining a copy
                                                                                                                                                                                                                                                                                                                                                                                             of this software and associated documentation files (the "Software"), to deal
                                                                                                                                                                                                                                                                                                                                                                                             in the Software without restriction, including without limitation the rights to
                                                                                                                                                                                                                                                                                                                                                                                             use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
                                                                                                                                                                                                                                                                                                                                                                                             of the Software, and to permit persons to whom the Software is furnished to do so,
                                                                                                                                                                                                                                                                                                                                                                                             subject to the following conditions:
                                                                                                                                                                                                                                                                                                                                                                                            
                                                                                                                                                                                                                                                                                                                                                                                             The above copyright notice and this permission notice shall be included in
                                                                                                                                                                                                                                                                                                                                                                                             all copies or substantial portions of the Software.
                                                                                                                                                                                                                                                                                                                                                                                            
                                                                                                                                                                                                                                                                                                                                                                                             THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
                                                                                                                                                                                                                                                                                                                                                                                             IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
                                                                                                                                                                                                                                                                                                                                                                                             FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
                                                                                                                                                                                                                                                                                                                                                                                             AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
                                                                                                                                                                                                                                                                                                                                                                                             LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
                                                                                                                                                                                                                                                                                                                                                                                             OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
                                                                                                                                                                                                                                                                                                                                                                                             THE SOFTWARE.
                                                                                                                                                                                                                                                                                                                                                                                            */
  function getBaselineOffset() {
    return _BASELINE_OFFSET;
  }
  /**
   * @deprecated since v3.7.2, this is an engine private interface that will be removed in the future.
   */
  function isUnicodeCJK(ch) {
    var __CHINESE_REG = /^[\u4E00-\u9FFF\u3400-\u4DFF]+$/;
    var __JAPANESE_REG = /[\u3000-\u303F]|[\u3040-\u309F]|[\u30A0-\u30FF]|[\uFF00-\uFFEF]|[\u4E00-\u9FAF]|[\u2605-\u2606]|[\u2190-\u2195]|\u203B/g;
    var __KOREAN_REG = /^[\u1100-\u11FF]|[\u3130-\u318F]|[\uA960-\uA97F]|[\uAC00-\uD7AF]|[\uD7B0-\uD7FF]+$/;
    return __CHINESE_REG.test(ch) || __JAPANESE_REG.test(ch) || __KOREAN_REG.test(ch);
  }

  /**
   * @deprecated since v3.7.2, this is an engine private interface that will be removed in the future.
   */
  // Checking whether the character is a whitespace
  function isUnicodeSpace(ch) {
    var chCode = ch.charCodeAt(0);
    return chCode >= 9 && chCode <= 13 || chCode === 32 || chCode === 133 || chCode === 160 || chCode === 5760 || chCode >= 8192 && chCode <= 8202 || chCode === 8232 || chCode === 8233 || chCode === 8239 || chCode === 8287 || chCode === 12288;
  }
  /**
   * @deprecated since v3.7.2, this is an engine private interface that will be removed in the future.
   */
  function safeMeasureText(ctx, string, desc) {
    var font = desc || ctx.font;
    var key = font + "\uD83C\uDFAE" + string;
    var cache = measureCache.get(key);
    if (cache !== null) {
      return cache;
    }
    var metric = ctx.measureText(string);
    var width = metric && metric.width || 0;
    measureCache.put(key, width);
    return width;
  }
  function getSymbolLength(str) {
    var length = str.length;
    var len = 0;
    var count = 0;
    var start = 0;
    var charCode = 0;
    for (var i = 0; i < length; i++) {
      charCode = str.charCodeAt(i);
      if (charCode === 0x200d) {
        len++;
        continue;
      }
      if (charCode >= 0xd800 && charCode <= 0xdbff) {
        len++;
        charCode = str.charCodeAt(i + 1);
        if (charCode >= 0xdc00 && charCode <= 0xdfff) {
          len++;
          if (i + 2 >= length || str.charCodeAt(i + 2) !== 0x200d) {
            start += len;
            count++;
            len = 0;
          }
          i++;
          continue;
        }
      }
      start = i + 1;
      count++;
      len = 0;
    }
    return count;
  }
  function getSymbolAt(str, index) {
    var length = str.length;
    var len = 0;
    var count = 0;
    var start = 0;
    var charCode = 0;
    for (var i = 0; i < length; i++) {
      charCode = str.charCodeAt(i);
      if (charCode === 0x200d) {
        len++;
        continue;
      }
      if (charCode >= 0xd800 && charCode <= 0xdbff) {
        len++;
        charCode = str.charCodeAt(i + 1);
        if (charCode >= 0xdc00 && charCode <= 0xdfff) {
          len++;
          if (i + 2 >= length || str.charCodeAt(i + 2) !== 0x200d) {
            if (index === count) {
              return str.slice(start, start + len);
            }
            start += len;
            count++;
            len = 0;
          }
          i++;
          continue;
        }
      }
      if (index === count) {
        return str.charAt(i);
      }
      start = i + 1;
      count++;
      len = 0;
    }
    return '';
  }
  function getSymbolCodeAt(str, index) {
    var _char = getSymbolAt(str, index);
    if (_char.length === 1) {
      return "" + _char.charCodeAt(0);
    }
    var charCodes = '';
    for (var j = 0; j < _char.length; j++) {
      charCodes += "" + _char.charCodeAt(j);
    }
    return "" + charCodes;
  }
  function getSymbolStartIndex(targetString, index) {
    if (index >= targetString.length) {
      return targetString.length;
    }
    var startCheckIndex = index;
    var startChar = targetString[startCheckIndex];
    while (startCheckIndex >= 0) {
      if (startChar === "\u200D") {
        startCheckIndex--;
        startChar = targetString[startCheckIndex];
      }
      if (startChar >= "\uDC00" && startChar <= "\uDFFF") {
        // lowSurrogateRex
        if (startCheckIndex - 1 >= 0) {
          startCheckIndex--;
          startChar = targetString[startCheckIndex];
        }
      }
      if (startChar >= "\uD800" && startChar <= "\uDBFF") {
        // highSurrogateRex
        if (startCheckIndex - 1 >= 0 && targetString[startCheckIndex - 1] === "\u200D") {
          startCheckIndex--;
          startChar = targetString[startCheckIndex];
        } else {
          break;
        }
      } else {
        break;
      }
    }
    return startCheckIndex;
  }
  function getSymbolEndIndex(targetString, index) {
    var newEndIndex = index;
    var endCheckIndex = index;
    var endChar = targetString[endCheckIndex];
    while (endCheckIndex < targetString.length) {
      if (endChar === "\u200D") {
        endCheckIndex++;
        newEndIndex++;
        endChar = targetString[endCheckIndex];
        if (endChar >= "\uD800" && endChar <= "\uDBFF") {
          // highSurrogateRex
          endCheckIndex++;
          newEndIndex++;
          endChar = targetString[endCheckIndex];
        }
      }
      if (endChar >= "\uD800" && endChar <= "\uDBFF") {
        // highSurrogateRex
        endCheckIndex++;
        newEndIndex++;
        endChar = targetString[endCheckIndex];
      } else if (endChar >= "\uDC00" && endChar <= "\uDFFF") {
        // lowSurrogateRex
        endCheckIndex++;
        endChar = targetString[endCheckIndex];
        if (endCheckIndex < targetString.length && targetString[endCheckIndex] === "\u200D") {
          newEndIndex++;
          endChar = targetString[endCheckIndex];
        } else {
          break;
        }
      } else {
        break;
      }
    }
    return newEndIndex;
  }

  // in case truncate a character on the Supplementary Multilingual Plane
  // test case: a = '😉🚗'
  // _safeSubstring(a, 1) === '🚗'
  // _safeSubstring(a, 0, 1) === '😉'
  // _safeSubstring(a, 0, 2) === '😉'
  // _safeSubstring(a, 0, 3) === '😉🚗'
  // _safeSubstring(a, 0, 4) === '😉🚗'
  // _safeSubstring(a, 0, 1) === _safeSubstring(a, 0, 2) === '😉'
  // _safeSubstring(a, 2, 3) === _safeSubstring(a, 2, 4) === '🚗'
  function _safeSubstring(targetString, startIndex, endIndex) {
    var newStartIndex = getSymbolStartIndex(targetString, startIndex);
    if (newStartIndex < startIndex) {
      newStartIndex = getSymbolEndIndex(targetString, startIndex) + 1;
    }
    var newEndIndex = endIndex;
    if (endIndex !== undefined) {
      endIndex = Math.max(0, endIndex - 1);
      newEndIndex = getSymbolEndIndex(targetString, endIndex);
      var newStartEndIndex = getSymbolStartIndex(targetString, endIndex);
      if (newStartEndIndex < newStartIndex || newStartEndIndex === newStartIndex && startIndex > newStartIndex) {
        newEndIndex = newStartIndex;
      } else {
        newEndIndex += 1;
      }
    }
    return targetString.substring(newStartIndex, newEndIndex);
  }

  /**
  * @engineInternal
  */
  function isEnglishWordPartAtFirst(stringToken) {
    return FIRST_ENGLISH_REG.test(stringToken);
  }
  /**
  * @engineInternal
  */
  function isEnglishWordPartAtLast(stringToken) {
    return LAST_ENGLISH_REG.test(stringToken);
  }
  /**
  * @engineInternal
  */
  function getEnglishWordPartAtFirst(stringToken) {
    var result = FIRST_ENGLISH_REG.exec(stringToken);
    return result;
  }
  /**
  * @engineInternal
  */
  function getEnglishWordPartAtLast(stringToken) {
    var result = LAST_ENGLISH_REG.exec(stringToken);
    return result;
  }
  /**
   * @deprecated since v3.7.2, this is an engine private interface that will be removed in the future.
   */
  function fragmentText(stringToken, allWidth, maxWidth, measureText) {
    // check the first character
    var wrappedWords = [];
    // fast return if strArr is empty
    if (stringToken.length === 0 || maxWidth < 0) {
      wrappedWords.push('');
      return wrappedWords;
    }
    var text = stringToken;
    while (allWidth > maxWidth && text.length > 1) {
      var fuzzyLen = text.length * (maxWidth / allWidth) | 0;
      var tmpText = _safeSubstring(text, fuzzyLen);
      var width = allWidth - measureText(tmpText);
      var sLine = tmpText;
      var pushNum = 0;
      var checkWhile = 0;
      var checkCount = 100;

      // Exceeded the size
      while (width > maxWidth && checkWhile++ < checkCount) {
        fuzzyLen *= maxWidth / width;
        fuzzyLen |= 0;
        tmpText = _safeSubstring(text, fuzzyLen);
        width = allWidth - measureText(tmpText);
      }
      checkWhile = 0;

      // Find the truncation point
      // if the 'tempText' which is truncated from the next line content equals to '',
      // we should break this loop because there is no available character in the next line.
      while (tmpText && width <= maxWidth && checkWhile++ < checkCount) {
        var exec = WORD_REG.exec(tmpText);
        pushNum = exec ? exec[0].length : 1;
        sLine = tmpText;
        fuzzyLen += pushNum;
        tmpText = _safeSubstring(text, fuzzyLen);
        width = allWidth - measureText(tmpText);
      }
      fuzzyLen -= pushNum;
      // in case maxWidth cannot contain any characters, need at least one character per line
      if (fuzzyLen === 0) {
        fuzzyLen = 1;
        sLine = _safeSubstring(text, 1);
      } else if (fuzzyLen === 1 && text[0] >= "\uD800" && text[0] <= "\uDBFF") {
        // highSurrogateRex
        fuzzyLen = 2;
        sLine = _safeSubstring(text, 2);
      }
      var sText = _safeSubstring(text, 0, fuzzyLen);
      var result = void 0;

      // Symbols cannot be the first character in a new line.
      // In condition that a symbol appears at the beginning of the new line, we will move the last word of this line to the new line.
      // If there is only one word in this line, we will keep the first character of this word and move the rest of characters to the new line.
      if (WRAP_INSPECTION) {
        if (SYMBOL_REG.test(sLine || tmpText)) {
          result = LAST_WORD_REG.exec(sText);
          fuzzyLen -= result ? result[0].length : 0;
          if (fuzzyLen === 0) {
            fuzzyLen = 1;
          }
          sLine = _safeSubstring(text, fuzzyLen);
          sText = _safeSubstring(text, 0, fuzzyLen);
        }
      }

      // To judge whether a English words are truncated
      // If it starts with an English word in the next line and it ends with an English word in this line,
      // we consider that a complete word is truncated into two lines. The last word without symbols of this line will be moved to the next line.
      if (FIRST_ENGLISH_REG.test(sLine)) {
        result = LAST_ENGLISH_REG.exec(sText);
        if (result && sText !== result[0]) {
          fuzzyLen -= result[0].length;
          sLine = _safeSubstring(text, fuzzyLen);
          sText = _safeSubstring(text, 0, fuzzyLen);
        }
      }

      // The first line And do not wrap should not remove the space
      if (wrappedWords.length === 0) {
        wrappedWords.push(sText);
      } else {
        sText = sText.trim();
        if (sText.length > 0) {
          wrappedWords.push(sText);
        }
      }
      text = sLine || tmpText;
      allWidth = measureText(text);
    }
    if (wrappedWords.length === 0) {
      wrappedWords.push(text);
    } else {
      text = text.trim();
      if (text.length > 0) {
        wrappedWords.push(text);
      }
    }
    return wrappedWords;
  }
  _export({
    getBaselineOffset: getBaselineOffset,
    isUnicodeCJK: isUnicodeCJK,
    isUnicodeSpace: isUnicodeSpace,
    safeMeasureText: safeMeasureText,
    getSymbolLength: getSymbolLength,
    getSymbolAt: getSymbolAt,
    getSymbolCodeAt: getSymbolCodeAt,
    isEnglishWordPartAtFirst: isEnglishWordPartAtFirst,
    isEnglishWordPartAtLast: isEnglishWordPartAtLast,
    getEnglishWordPartAtFirst: getEnglishWordPartAtFirst,
    getEnglishWordPartAtLast: getEnglishWordPartAtLast,
    fragmentText: fragmentText
  });
  return {
    setters: [function (_virtualInternal253AconstantsJs) {
      RUNTIME_BASED = _virtualInternal253AconstantsJs.RUNTIME_BASED;
    }, function (_palMinigame) {
      minigame = _palMinigame.minigame;
    }, function (_coreIndexJs) {
      js = _coreIndexJs.js;
    }],
    execute: function () {
      _export("BASELINE_RATIO", BASELINE_RATIO = 0.26);
      _BASELINE_OFFSET = 0;
      if (RUNTIME_BASED) {
        _BASELINE_OFFSET = BASELINE_RATIO * 2 / 3;
        ral = minigame.ral;
        featureAlphabeticeName = ral.CANVAS_CONTEXT2D_TEXTBASELINE_ALPHABETIC.name;
        featureAlphabeticEnable = ral.CANVAS_CONTEXT2D_TEXTBASELINE_ALPHABETIC.enable;
        defaultBaselineName = ral.CANVAS_CONTEXT2D_TEXTBASELINE_DEFAULT.name;
        defaultIsAlphaBetic = ral.CANVAS_CONTEXT2D_TEXTBASELINE_DEFAULT.alphabetic;
        if (ral.getFeaturePropertyInt(featureAlphabeticeName) === featureAlphabeticEnable) {
          // if support alphabetic baseline, set default baseline to alphabetic
          ral.setFeaturePropertyInt(defaultBaselineName, defaultIsAlphaBetic);
          if (ral.getFeaturePropertyInt(defaultBaselineName) === defaultIsAlphaBetic) {
            // if default baseline has been successfully set to alphabetic, _BASELINE_OFFSET should be 0.
            _BASELINE_OFFSET = 0;
          }
        }
      }
      _export("MIDDLE_RATIO", MIDDLE_RATIO = (BASELINE_RATIO + 1) / 2 - BASELINE_RATIO);
      MAX_CACHE_SIZE = 100;
      pool = new js.Pool(2);
      pool.get = function () {
        return this._get() || {
          key: '',
          value: 0,
          prev: null,
          next: null
        };
      };
      _export("LRUCache", LRUCache = /*#__PURE__*/function () {
        function LRUCache(size) {
          this.count = 0;
          this.limit = 0;
          this.datas = {};
          this.limit = size;
        }
        var _proto = LRUCache.prototype;
        _proto.moveToHead = function moveToHead(node) {
          node.next = this.head;
          node.prev = null;
          if (this.head) this.head.prev = node;
          this.head = node;
          if (!this.tail) this.tail = node;
          this.count++;
          this.datas[node.key] = node;
        };
        _proto.put = function put(key, value) {
          var node = pool.get();
          node.key = key;
          node.value = value;
          if (this.count >= this.limit) {
            var discard = this.tail;
            delete this.datas[discard.key];
            this.count--;
            this.tail = discard.prev;
            this.tail.next = null;
            discard.prev = null;
            discard.next = null;
            pool.put(discard);
          }
          this.moveToHead(node);
        };
        _proto.remove = function remove(node) {
          if (node.prev) {
            node.prev.next = node.next;
          } else {
            this.head = node.next;
          }
          if (node.next) {
            node.next.prev = node.prev;
          } else {
            this.tail = node.prev;
          }
          delete this.datas[node.key];
          this.count--;
        };
        _proto.get = function get(key) {
          var node = this.datas[key];
          if (node) {
            this.remove(node);
            this.moveToHead(node);
            return node.value;
          }
          return null;
        };
        _proto.clear = function clear() {
          this.count = 0;
          this.datas = {};
          this.head = null;
          this.tail = null;
        };
        _proto.has = function has(key) {
          return !!this.datas[key];
        };
        _proto["delete"] = function _delete(key) {
          var node = this.datas[key];
          this.remove(node);
        };
        return LRUCache;
      }());
      measureCache = new LRUCache(MAX_CACHE_SIZE);
      WORD_REG = /([a-zA-Z0-9ÄÖÜäöüßéèçàùêâîôûа-яА-ЯЁё]+|\S)/; // eslint-disable-next-line no-useless-escape
      SYMBOL_REG = /^[!,.:;'}\]%\?>、‘“》？。，！]/;
      LAST_WORD_REG = /([a-zA-Z0-9ÄÖÜäöüßéèçàùêâîôûаíìÍÌïÁÀáàÉÈÒÓòóŐőÙÚŰúűñÑæÆœŒÃÂãÔõěščřžýáíéóúůťďňĚŠČŘŽÁÍÉÓÚŤżźśóńłęćąŻŹŚÓŃŁĘĆĄ-яА-ЯЁёáàảạãăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệiíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđÁÀẢẠÃĂẮẰẲẴẶÂẤẦẨẪẬÉÈẺẼẸÊẾỀỂỄỆIÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴĐ]+|\S)$/;
      LAST_ENGLISH_REG = /[a-zA-Z0-9ÄÖÜäöüßéèçàùêâîôûаíìÍÌïÁÀáàÉÈÒÓòóŐőÙÚŰúűñÑæÆœŒÃÂãÔõěščřžýáíéóúůťďňĚŠČŘŽÁÍÉÓÚŤżźśóńłęćąŻŹŚÓŃŁĘĆĄ-яА-ЯЁёáàảạãăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệiíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđÁÀẢẠÃĂẮẰẲẴẶÂẤẦẨẪẬÉÈẺẼẸÊẾỀỂỄỆIÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴĐ]+$/;
      FIRST_ENGLISH_REG = /^[a-zA-Z0-9ÄÖÜäöüßéèçàùêâîôûаíìÍÌïÁÀáàÉÈÒÓòóŐőÙÚŰúűñÑæÆœŒÃÂãÔõěščřžýáíéóúůťďňĚŠČŘŽÁÍÉÓÚŤżźśóńłęćąŻŹŚÓŃŁĘĆĄ-яА-ЯЁёáàảạãăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệiíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđÁÀẢẠÃĂẮẰẲẴẶÂẤẦẨẪẬÉÈẺẼẸÊẾỀỂỄỆIÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴĐ]/;
      WRAP_INSPECTION = true; // The unicode standard will never assign a character from code point 0xD800 to 0xDFFF
      // high surrogate (0xD800-0xDBFF) and low surrogate(0xDC00-0xDFFF) combines to a character on the Supplementary Multilingual Plane
      // reference: https://en.wikipedia.org/wiki/UTF-16
      highSurrogateRex = /[\uD800-\uDBFF]/;
      lowSurrogateRex = /[\uDC00-\uDFFF]/;
    }
  };
});