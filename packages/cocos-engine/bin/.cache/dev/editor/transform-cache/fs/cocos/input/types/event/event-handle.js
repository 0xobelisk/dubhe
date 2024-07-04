System.register("q-bundled:///fs/cocos/input/types/event/event-handle.js", ["./event.js"], function (_export, _context) {
  "use strict";

  var Event, EventHandle;
  _export("EventHandle", void 0);
  return {
    setters: [function (_eventJs) {
      Event = _eventJs.Event;
    }],
    execute: function () {
      /*
       Copyright (c) 2022-2023 Xiamen Yaji Software Co., Ltd.
      
       http://www.cocos.com
      
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
      /**
       * @en
       * The 6DOF handle event.
       *
       * @zh
       * 6DOF手柄事件。
       */
      _export("EventHandle", EventHandle = class EventHandle extends Event {
        /**
         * @param eventType - The type of the event
         * @param handleInputDevice - The handle device which trigger the current handle event
         */
        constructor(eventType, handleInputDevice) {
          super(eventType, false);
          /**
           * @en The handle device which trigger the current handle event
           * @zh 触发当前手柄事件的手柄设备
           */
          this.handleInputDevice = void 0;
          this.handleInputDevice = handleInputDevice;
        }
      });
    }
  };
});