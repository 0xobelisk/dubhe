System.register("q-bundled:///fs/cocos/asset/assets/texture-cube.js", ["../../../../virtual/internal%253Aconstants.js", "../../core/data/decorators/index.js", "../../gfx/index.js", "./image-asset.js", "./simple-texture.js", "./texture-2d.js", "../../core/global-exports.js", "../../core/index.js", "../../../pal/system-info/enum-type/index.js"], function (_export, _context) {
  "use strict";

  var EDITOR, OPPO, TEST, VIVO, WECHAT, WECHAT_MINI_PROGRAM, ccclass, serializable, TextureType, TextureInfo, TextureViewInfo, BufferTextureCopy, ImageAsset, SimpleTexture, Texture2D, legacyCC, ccwindow, js, sys, OS, _dec, _class, _class2, _initializer, _initializer2, _initializer3, _initializer4, _class3, FaceIndex, MipmapMode, TextureCube;
  function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
  function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
  function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
  function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }
  function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
  function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }
  function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }
  function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
  function _applyDecoratedInitializer(target, property, decorators, initializer) {
    return decorators.slice().reverse().reduce(function (decoratedInitializer, decorator) {
      return decorator(target, property, decoratedInitializer) || decoratedInitializer;
    }, initializer);
  }
  function _initializerWarningHelper(descriptor, context) { throw new Error('Decorating class property failed. Please ensure that ' + 'transform-class-properties is enabled and runs after the decorators transform.'); }
  /**
   * @param {Mipmap} mipmap
   * @param {(face: ImageAsset) => void} callback
   */
  function _forEachFace(mipmap, callback) {
    callback(mipmap.front, FaceIndex.front);
    callback(mipmap.back, FaceIndex.back);
    callback(mipmap.left, FaceIndex.left);
    callback(mipmap.right, FaceIndex.right);
    callback(mipmap.top, FaceIndex.top);
    callback(mipmap.bottom, FaceIndex.bottom);
  }
  _export("MipmapMode", void 0);
  return {
    setters: [function (_virtualInternal253AconstantsJs) {
      EDITOR = _virtualInternal253AconstantsJs.EDITOR;
      OPPO = _virtualInternal253AconstantsJs.OPPO;
      TEST = _virtualInternal253AconstantsJs.TEST;
      VIVO = _virtualInternal253AconstantsJs.VIVO;
      WECHAT = _virtualInternal253AconstantsJs.WECHAT;
      WECHAT_MINI_PROGRAM = _virtualInternal253AconstantsJs.WECHAT_MINI_PROGRAM;
    }, function (_coreDataDecoratorsIndexJs) {
      ccclass = _coreDataDecoratorsIndexJs.ccclass;
      serializable = _coreDataDecoratorsIndexJs.serializable;
    }, function (_gfxIndexJs) {
      TextureType = _gfxIndexJs.TextureType;
      TextureInfo = _gfxIndexJs.TextureInfo;
      TextureViewInfo = _gfxIndexJs.TextureViewInfo;
      BufferTextureCopy = _gfxIndexJs.BufferTextureCopy;
    }, function (_imageAssetJs) {
      ImageAsset = _imageAssetJs.ImageAsset;
    }, function (_simpleTextureJs) {
      SimpleTexture = _simpleTextureJs.SimpleTexture;
    }, function (_texture2dJs) {
      Texture2D = _texture2dJs.Texture2D;
    }, function (_coreGlobalExportsJs) {
      legacyCC = _coreGlobalExportsJs.legacyCC;
      ccwindow = _coreGlobalExportsJs.ccwindow;
    }, function (_coreIndexJs) {
      js = _coreIndexJs.js;
      sys = _coreIndexJs.sys;
    }, function (_palSystemInfoEnumTypeIndexJs) {
      OS = _palSystemInfoEnumTypeIndexJs.OS;
    }],
    execute: function () {
      (function (FaceIndex) {
        FaceIndex[FaceIndex["right"] = 0] = "right";
        FaceIndex[FaceIndex["left"] = 1] = "left";
        FaceIndex[FaceIndex["top"] = 2] = "top";
        FaceIndex[FaceIndex["bottom"] = 3] = "bottom";
        FaceIndex[FaceIndex["front"] = 4] = "front";
        FaceIndex[FaceIndex["back"] = 5] = "back";
      })(FaceIndex || (FaceIndex = {}));
      (function (MipmapMode) {
        MipmapMode[MipmapMode["NONE"] = 0] = "NONE";
        MipmapMode[MipmapMode["AUTO"] = 1] = "AUTO";
        MipmapMode[MipmapMode["BAKED_CONVOLUTION_MAP"] = 2] = "BAKED_CONVOLUTION_MAP";
      })(MipmapMode || _export("MipmapMode", MipmapMode = {}));
      /**
       * @en The texture cube asset.
       * Each mipmap level of a texture cube have 6 [[ImageAsset]], represents 6 faces of the cube.
       * @zh 立方体贴图资源。
       * 立方体贴图资源的每个 Mipmap 层级都为 6 张 [[ImageAsset]]，分别代表了立方体贴图的 6 个面。
       */
      _export("TextureCube", TextureCube = (_dec = ccclass('cc.TextureCube'), _dec(_class = (_class2 = (_class3 = /*#__PURE__*/function (_SimpleTexture) {
        _inheritsLoose(TextureCube, _SimpleTexture);
        function TextureCube() {
          var _this;
          for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }
          _this = _SimpleTexture.call.apply(_SimpleTexture, [this].concat(args)) || this;
          _this.isRGBE = _initializer && _initializer();
          _this._mipmapAtlas = _initializer2 && _initializer2();
          _this._mipmapMode = _initializer3 && _initializer3();
          /**
           * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
           */
          _this._mipmaps = _initializer4 && _initializer4();
          _this._generatedMipmaps = [];
          return _this;
        }
        var _proto = TextureCube.prototype;
        _proto._setMipmapParams = function _setMipmapParams(value) {
          var _this2 = this;
          this._generatedMipmaps = value;
          this._setMipmapLevel(this._generatedMipmaps.length);
          if (this._generatedMipmaps.length > 0) {
            var imageAsset = this._generatedMipmaps[0].front;
            this.reset({
              width: imageAsset.width,
              height: imageAsset.height,
              format: imageAsset.format,
              mipmapLevel: this._generatedMipmaps.length,
              baseLevel: this._baseLevel,
              maxLevel: this._maxLevel
            });
            this._generatedMipmaps.forEach(function (mipmap, level) {
              _forEachFace(mipmap, function (face, faceIndex) {
                _this2._assignImage(face, level, faceIndex);
              });
            });
          } else {
            this.reset({
              width: 0,
              height: 0,
              mipmapLevel: this._generatedMipmaps.length,
              baseLevel: this._baseLevel,
              maxLevel: this._maxLevel
            });
          }
        }

        /**
         * @en Fill mipmaps for cube map with atlas.
         * @zh 使用 atlas 方式排布的图填充到立方体贴图的 mipmaps。
         * @param value @en All mipmaps of each face of the cube map are stored in the form of atlas
         * and the value contains the atlas of the 6 faces and the layout information of each mipmap layer.
         * @zh 立方体贴图六个面的图，其中每张图中的全部 mip 数据都使用 atlas 方式排布
         */;
        /**
         * @en Whether mipmaps are baked convolutional maps.
         * @zh mipmaps是否为烘焙出来的卷积图。
         */
        _proto.isUsingOfflineMipmaps = function isUsingOfflineMipmaps() {
          return this._mipmapMode === MipmapMode.BAKED_CONVOLUTION_MAP;
        }

        /**
         * @en Level 0 mipmap image.
         * Be noted, `this.image = img` equals `this.mipmaps = [img]`,
         * sets image will clear all previous mipmaps.
         * @zh 0 级 Mipmap。
         * 注意，`this.image = img` 等价于 `this.mipmaps = [img]`，
         * 也就是说，通过 `this.image` 设置 0 级 Mipmap 时将隐式地清除之前的所有 Mipmap。
         */;
        /**
         * @en Create a texture cube with an array of [[Texture2D]] which represents 6 faces of the texture cube.
         * @zh 通过二维贴图数组指定每个 Mipmap 的每个面创建立方体贴图。
         * @param textures Texture array, the texture count must be multiple of 6. Every 6 textures are 6 faces of a mipmap level.
         * The order should obey [[FaceIndex]] order.
         * @param out Output texture cube, if not given, will create a new texture cube.
         * @returns The created texture cube.
         * @example
         * ```ts
         * const textures = new Array<Texture2D>(6);
         * textures[TextureCube.FaceIndex.front] = frontImage;
         * textures[TextureCube.FaceIndex.back] = backImage;
         * textures[TextureCube.FaceIndex.left] = leftImage;
         * textures[TextureCube.FaceIndex.right] = rightImage;
         * textures[TextureCube.FaceIndex.top] = topImage;
         * textures[TextureCube.FaceIndex.bottom] = bottomImage;
         * const textureCube = TextureCube.fromTexture2DArray(textures);
         * ```
         */
        TextureCube.fromTexture2DArray = function fromTexture2DArray(textures, out) {
          var mipmaps = [];
          var nMipmaps = textures.length / 6;
          for (var i = 0; i < nMipmaps; i++) {
            var x = i * 6;
            mipmaps.push({
              front: textures[x + FaceIndex.front].image,
              back: textures[x + FaceIndex.back].image,
              left: textures[x + FaceIndex.left].image,
              right: textures[x + FaceIndex.right].image,
              top: textures[x + FaceIndex.top].image,
              bottom: textures[x + FaceIndex.bottom].image
            });
          }
          out = out || new TextureCube();
          out.mipmaps = mipmaps;
          return out;
        };
        _proto.onLoaded = function onLoaded() {
          if (this._mipmapMode === MipmapMode.BAKED_CONVOLUTION_MAP) {
            this.mipmapAtlas = this._mipmapAtlas;
          } else {
            this.mipmaps = this._mipmaps;
          }
        }

        /**
         * @en Reset the current texture with given size, pixel format and mipmap images.
         * After reset, the gfx resource will become invalid, you must use [[uploadData]] explicitly to upload the new mipmaps to GPU resources.
         * @zh 将当前贴图重置为指定尺寸、像素格式以及指定 mipmap 层级。重置后，贴图的像素数据将变为未定义。
         * mipmap 图像的数据不会自动更新到贴图中，你必须显式调用 [[uploadData]] 来上传贴图数据。
         * @param info @en The create information. @zh 创建贴图的相关信息。
         */;
        _proto.reset = function reset(info) {
          this._width = info.width;
          this._height = info.height;
          this._setGFXFormat(info.format);
          var mipLevels = info.mipmapLevel === undefined ? 1 : info.mipmapLevel;
          this._setMipmapLevel(mipLevels);
          var minLod = info.baseLevel === undefined ? 0 : info.baseLevel;
          var maxLod = info.maxLevel === undefined ? 1000 : info.maxLevel;
          this._setMipRange(minLod, maxLod);
          this._tryReset();
        }

        /**
         * @en Updates the given level mipmap image.
         * @zh 更新指定层级范围内的 Mipmap。当 Mipmap 数据发生了改变时应调用此方法提交更改。
         * 若指定的层级范围超出了实际已有的层级范围，只有覆盖的那些层级范围会被更新。
         * @param firstLevel @en First level to be updated. @zh 更新指定层的 mipmap。
         * @param count @en Mipmap level count to be updated。 @zh 指定要更新层的数量。
         */;
        _proto.updateMipmaps = function updateMipmaps(firstLevel, count) {
          var _this3 = this;
          if (firstLevel === void 0) {
            firstLevel = 0;
          }
          if (firstLevel >= this._generatedMipmaps.length) {
            return;
          }
          var nUpdate = Math.min(count === undefined ? this._generatedMipmaps.length : count, this._generatedMipmaps.length - firstLevel);
          var _loop = function _loop() {
            var level = firstLevel + i;
            _forEachFace(_this3._generatedMipmaps[level], function (face, faceIndex) {
              _this3._assignImage(face, level, faceIndex);
            });
          };
          for (var i = 0; i < nUpdate; ++i) {
            _loop();
          }
        }

        /**
         * @en Destroys this texture, clear all mipmaps and release GPU resources
         * @zh 销毁此贴图，清空所有 Mipmap 并释放占用的 GPU 资源。
         */;
        _proto.destroy = function destroy() {
          this._mipmaps = [];
          this._generatedMipmaps = [];
          this._mipmapAtlas = null;
          return _SimpleTexture.prototype.destroy.call(this);
        }

        /**
         * @en Release used GPU resources.
         * @zh 释放占用的 GPU 资源。
         * @deprecated please use [[destroy]] instead
         */;
        _proto.releaseTexture = function releaseTexture() {
          this.destroy();
        }

        /**
         * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
         */;
        _proto._serialize = function _serialize(ctxForExporting) {
          if (EDITOR || TEST) {
            if (this._mipmapMode === MipmapMode.BAKED_CONVOLUTION_MAP) {
              var atlas = this._mipmapAtlas.atlas;
              var uuids = {};
              if (ctxForExporting && ctxForExporting._compressUuid) {
                uuids = {
                  front: EditorExtends.UuidUtils.compressUuid(atlas.front._uuid, true),
                  back: EditorExtends.UuidUtils.compressUuid(atlas.back._uuid, true),
                  left: EditorExtends.UuidUtils.compressUuid(atlas.left._uuid, true),
                  right: EditorExtends.UuidUtils.compressUuid(atlas.right._uuid, true),
                  top: EditorExtends.UuidUtils.compressUuid(atlas.top._uuid, true),
                  bottom: EditorExtends.UuidUtils.compressUuid(atlas.bottom._uuid, true)
                };
              } else {
                uuids = {
                  front: atlas.front._uuid,
                  back: atlas.back._uuid,
                  left: atlas.left._uuid,
                  right: atlas.right._uuid,
                  top: atlas.top._uuid,
                  bottom: atlas.bottom._uuid
                };
              }
              return {
                base: _SimpleTexture.prototype._serialize.call(this, ctxForExporting),
                rgbe: this.isRGBE,
                mipmapMode: this._mipmapMode,
                mipmapAtlas: uuids,
                mipmapLayout: this._mipmapAtlas.layout
              };
            } else {
              return {
                base: _SimpleTexture.prototype._serialize.call(this, ctxForExporting),
                rgbe: this.isRGBE,
                mipmaps: this._mipmaps.map(function (mipmap) {
                  return ctxForExporting && ctxForExporting._compressUuid ? {
                    front: EditorExtends.UuidUtils.compressUuid(mipmap.front._uuid, true),
                    back: EditorExtends.UuidUtils.compressUuid(mipmap.back._uuid, true),
                    left: EditorExtends.UuidUtils.compressUuid(mipmap.left._uuid, true),
                    right: EditorExtends.UuidUtils.compressUuid(mipmap.right._uuid, true),
                    top: EditorExtends.UuidUtils.compressUuid(mipmap.top._uuid, true),
                    bottom: EditorExtends.UuidUtils.compressUuid(mipmap.bottom._uuid, true)
                  } : {
                    front: mipmap.front._uuid,
                    back: mipmap.back._uuid,
                    left: mipmap.left._uuid,
                    right: mipmap.right._uuid,
                    top: mipmap.top._uuid,
                    bottom: mipmap.bottom._uuid
                  };
                })
              };
            }
          }
          return null;
        }

        /**
         * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
         */;
        _proto._deserialize = function _deserialize(serializedData, handle) {
          var data = serializedData;
          _SimpleTexture.prototype._deserialize.call(this, data.base, handle);
          this.isRGBE = data.rgbe;
          this._mipmapMode = data.mipmapMode;
          if (this._mipmapMode === MipmapMode.BAKED_CONVOLUTION_MAP) {
            var mipmapAtlas = data.mipmapAtlas;
            var mipmapLayout = data.mipmapLayout;
            this._mipmapAtlas = {
              atlas: {},
              layout: mipmapLayout
            };
            this._mipmapAtlas.atlas = {
              front: new ImageAsset(),
              back: new ImageAsset(),
              left: new ImageAsset(),
              right: new ImageAsset(),
              top: new ImageAsset(),
              bottom: new ImageAsset()
            };
            var imageAssetClassId = js.getClassId(ImageAsset);
            handle.result.push(this._mipmapAtlas.atlas, "front", mipmapAtlas.front, imageAssetClassId);
            handle.result.push(this._mipmapAtlas.atlas, "back", mipmapAtlas.back, imageAssetClassId);
            handle.result.push(this._mipmapAtlas.atlas, "left", mipmapAtlas.left, imageAssetClassId);
            handle.result.push(this._mipmapAtlas.atlas, "right", mipmapAtlas.right, imageAssetClassId);
            handle.result.push(this._mipmapAtlas.atlas, "top", mipmapAtlas.top, imageAssetClassId);
            handle.result.push(this._mipmapAtlas.atlas, "bottom", mipmapAtlas.bottom, imageAssetClassId);
          } else {
            this._mipmaps = new Array(data.mipmaps.length);
            for (var i = 0; i < data.mipmaps.length; ++i) {
              // Prevent resource load failed
              this._mipmaps[i] = {
                front: new ImageAsset(),
                back: new ImageAsset(),
                left: new ImageAsset(),
                right: new ImageAsset(),
                top: new ImageAsset(),
                bottom: new ImageAsset()
              };
              var mipmap = data.mipmaps[i];
              var _imageAssetClassId = js.getClassId(ImageAsset);
              handle.result.push(this._mipmaps[i], "front", mipmap.front, _imageAssetClassId);
              handle.result.push(this._mipmaps[i], "back", mipmap.back, _imageAssetClassId);
              handle.result.push(this._mipmaps[i], "left", mipmap.left, _imageAssetClassId);
              handle.result.push(this._mipmaps[i], "right", mipmap.right, _imageAssetClassId);
              handle.result.push(this._mipmaps[i], "top", mipmap.top, _imageAssetClassId);
              handle.result.push(this._mipmaps[i], "bottom", mipmap.bottom, _imageAssetClassId);
            }
          }
        };
        _proto._getGfxTextureCreateInfo = function _getGfxTextureCreateInfo(presumed) {
          var texInfo = new TextureInfo(TextureType.CUBE);
          texInfo.width = this._width;
          texInfo.height = this._height;
          texInfo.layerCount = 6;
          Object.assign(texInfo, presumed);
          return texInfo;
        };
        _proto._getGfxTextureViewCreateInfo = function _getGfxTextureViewCreateInfo(presumed) {
          var texViewInfo = new TextureViewInfo();
          texViewInfo.type = TextureType.CUBE;
          texViewInfo.baseLayer = 0;
          texViewInfo.layerCount = 6;
          Object.assign(texViewInfo, presumed);
          return texViewInfo;
        };
        _proto._uploadAtlas = function _uploadAtlas() {
          var _this4 = this;
          var layout = this._mipmapAtlas.layout;
          var mip0Layout = layout[0];
          this.reset({
            width: mip0Layout.width,
            height: mip0Layout.height,
            format: this._mipmapAtlas.atlas.front.format,
            mipmapLevel: layout.length
          });
          _forEachFace(this._mipmapAtlas.atlas, function (face, faceIndex) {
            var tex = new Texture2D();
            tex.image = face;
            tex.reset({
              width: face.width,
              height: face.height,
              format: face.format
            });
            tex.uploadData(face.data);
            for (var i = 0; i < layout.length; i++) {
              var layoutInfo = layout[i];
              var size = tex.getGFXTexture().size;
              var buffer = new Uint8Array(size); // should use the gfxTexture memory size
              var region = new BufferTextureCopy();
              region.texOffset.x = layoutInfo.left;
              region.texOffset.y = layoutInfo.top;
              region.texExtent.width = layoutInfo.width;
              region.texExtent.height = layoutInfo.height;
              _this4._getGFXDevice().copyTextureToBuffers(tex.getGFXTexture(), [buffer], [region]);
              var bufferAsset = new ImageAsset({
                _data: buffer,
                _compressed: face.isCompressed,
                width: layoutInfo.width,
                height: layoutInfo.height,
                format: face.format
              });
              _this4._assignImage(bufferAsset, layoutInfo.level, faceIndex);
            }
          });
        };
        _proto.initDefault = function initDefault(uuid) {
          _SimpleTexture.prototype.initDefault.call(this, uuid);
          var imageAsset = new ImageAsset();
          imageAsset.initDefault();
          this.mipmaps = [{
            front: imageAsset,
            back: imageAsset,
            top: imageAsset,
            bottom: imageAsset,
            left: imageAsset,
            right: imageAsset
          }];
        };
        _proto.validate = function validate() {
          if (this._mipmapMode === MipmapMode.BAKED_CONVOLUTION_MAP) {
            if (this.mipmapAtlas === null || this.mipmapAtlas.layout.length === 0) {
              return false;
            }
            var atlas = this.mipmapAtlas.atlas;
            return !!(atlas.top && atlas.bottom && atlas.front && atlas.back && atlas.left && atlas.right);
          } else {
            return this._mipmaps.length !== 0 && !this._mipmaps.find(function (x) {
              return !(x.top && x.bottom && x.front && x.back && x.left && x.right);
            });
          }
        };
        _createClass(TextureCube, [{
          key: "mipmaps",
          get:
          /**
           * @en All levels of mipmap images, be noted, automatically generated mipmaps are not included.
           * When setup mipmap, the size of the texture and pixel format could be modified.
           * @zh 所有层级 Mipmap，注意，这里不包含自动生成的 Mipmap。
           * 当设置 Mipmap 时，贴图的尺寸以及像素格式可能会改变。
           */
          function get() {
            return this._mipmaps;
          },
          set: function set(value) {
            this._mipmaps = value;
            var cubeMaps = [];
            if (value.length === 1) {
              var cubeMipmap = value[0];
              var front = cubeMipmap.front.extractMipmaps();
              var back = cubeMipmap.back.extractMipmaps();
              var left = cubeMipmap.left.extractMipmaps();
              var right = cubeMipmap.right.extractMipmaps();
              var top = cubeMipmap.top.extractMipmaps();
              var bottom = cubeMipmap.bottom.extractMipmaps();
              if (front.length !== back.length || front.length !== left.length || front.length !== right.length || front.length !== top.length || front.length !== bottom.length) {
                console.error('The number of mipmaps of each face is different.');
                this._setMipmapParams([]);
                return;
              }
              var level = front.length;
              for (var i = 0; i < level; ++i) {
                var cubeMap = {
                  front: front[i],
                  back: back[i],
                  left: left[i],
                  right: right[i],
                  top: top[i],
                  bottom: bottom[i]
                };
                cubeMaps.push(cubeMap);
              }
            } else if (value.length > 1) {
              value.forEach(function (mipmap) {
                var cubeMap = {
                  front: mipmap.front.extractMipmap0(),
                  back: mipmap.back.extractMipmap0(),
                  left: mipmap.left.extractMipmap0(),
                  right: mipmap.right.extractMipmap0(),
                  top: mipmap.top.extractMipmap0(),
                  bottom: mipmap.bottom.extractMipmap0()
                };
                cubeMaps.push(cubeMap);
              });
            }
            this._setMipmapParams(cubeMaps);
          }
        }, {
          key: "mipmapAtlas",
          get: function get() {
            return this._mipmapAtlas;
          },
          set: function set(value) {
            var _this5 = this;
            this._mipmapAtlas = value;
            if (!this._mipmapAtlas) {
              this.reset({
                width: 0,
                height: 0,
                mipmapLevel: 0
              });
              return;
            }
            var imageAtlasAsset = this._mipmapAtlas.atlas.front;
            if (!imageAtlasAsset.data) {
              return;
            }
            //In ios wechat mini-game platform drawImage and getImageData can not get correct data,so upload to gfxTexture than use readPixels to get data
            //The performance of upload to gfxTexture and readPixels is not good, so only use this way in the ios wechat mini-game platform
            if ((WECHAT || WECHAT_MINI_PROGRAM) && sys.os === OS.IOS || VIVO || OPPO) {
              this._uploadAtlas();
              return;
            }
            var faceAtlas = this._mipmapAtlas.atlas;
            var layout = this._mipmapAtlas.layout;
            var mip0Layout = layout[0];
            var ctx = Object.assign(ccwindow.document.createElement('canvas'), {
              width: imageAtlasAsset.width,
              height: imageAtlasAsset.height
            }).getContext('2d');
            this.reset({
              width: mip0Layout.width,
              height: mip0Layout.height,
              format: imageAtlasAsset.format,
              mipmapLevel: layout.length
            });
            var _loop2 = function _loop2() {
              var layoutInfo = layout[j];
              _forEachFace(faceAtlas, function (face, faceIndex) {
                ctx.clearRect(0, 0, imageAtlasAsset.width, imageAtlasAsset.height);
                var drawImg = face.data;
                // NOTE: on OH platform, drawImage only supports ImageBitmap and PixelMap type, so we mark drawImg as any.
                ctx.drawImage(drawImg, 0, 0);
                var rawData = ctx.getImageData(layoutInfo.left, layoutInfo.top, layoutInfo.width, layoutInfo.height);
                var bufferAsset = new ImageAsset({
                  _data: rawData.data,
                  _compressed: face.isCompressed,
                  width: rawData.width,
                  height: rawData.height,
                  format: face.format
                });
                _this5._assignImage(bufferAsset, layoutInfo.level, faceIndex);
              });
            };
            for (var j = 0; j < layout.length; j++) {
              _loop2();
            }
          }
        }, {
          key: "image",
          get: function get() {
            return this._mipmaps.length === 0 ? null : this._mipmaps[0];
          },
          set: function set(value) {
            this.mipmaps = value ? [value] : [];
          }
        }]);
        return TextureCube;
      }(SimpleTexture), _class3.FaceIndex = FaceIndex, _class3), (_initializer = _applyDecoratedInitializer(_class2.prototype, "isRGBE", [serializable], function () {
        return false;
      }), _initializer2 = _applyDecoratedInitializer(_class2.prototype, "_mipmapAtlas", [serializable], function () {
        return null;
      }), _initializer3 = _applyDecoratedInitializer(_class2.prototype, "_mipmapMode", [serializable], function () {
        return MipmapMode.NONE;
      }), _initializer4 = _applyDecoratedInitializer(_class2.prototype, "_mipmaps", [serializable], function () {
        return [];
      })), _class2)) || _class));
      legacyCC.TextureCube = TextureCube;
    }
  };
});