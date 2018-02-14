/*!
	ezStruct ver 0.3.1-alpha
	Copyright (c) 2018 Epistemex
	www.epistemex.com
*/

"use strict";

/**
 * ezStruct allows for defining and creating binary structures.
 * @namespace
 */
var ezStruct = (function() {
  var structs = [];

  return {
   /**
    * Types enums definitions. Notice that there are several aliases
    * included for convenience. Also notice the following:
    *
    * - (U)LONG is 64-bit, (U)INT is 32-bit and (U)SHORT is 16 bit in this context.
    * - STRING is a *NUL-terminated* string and **not** an alias for CHAR.
    * - CHAR is a raw byte buffer. Use this type for undefined types and lengths.
    * - STRUCT is special for this solution and refer to a sub-structure (by name).
    *
    * @readonly
    * @enum {number}
    */
    enums: {
      UINT8    : 0,
      UBYTE    : 0,
      UINT     : 1,
      UINT16   : 1,
      USHORT   : 1,
      UINT32   : 2,
      ULONG    : 2,
      UINT64   : 3,
      ULONGLONG: 3,
      INT8     : 4,
      BYTE     : 4,
      BOOL     : 4,
      SHORT    : 5,
      INT      : 5,
      INT16    : 5,
      INT32    : 6,
      LONG     : 6,
      INT64    : 7,
      LONGLONG : 7,
      FLOAT32  : 8,
      FLOAT    : 8,
      FLOAT64  : 9,
      DOUBLE   : 9,
      BIT8     : 10,
      BIT16    : 11,
      CHAR     : 12,
      UCHAR    : 13,
      BYTES    : 13,
      STRING   : 14,
      STRUCT   : 15
    },

    /**
     * Definition object to define structures.
     * @typedef {*} ezDefiner
     */

    /**
     * Create a new structure definition.
     * @param {string} name - internal name of this structure. This name
     * is used with alloc() and with definition type enums.STRUCT.
     * @returns {ezDefiner} Contains method `def` to define each field.
     * @memberOf ezStruct
     */
    define: function(name) {
      var struct = {name: name, defs: []}, i;

      // check if name is in use
      for(i = 0; i < structs.length; i++) {
        if (structs[i].name === name) throw "Structure with this name exists."
      }

      structs.push(struct);

      return {
        /**
         * @type {string}
         * @name name
         */
        name: name,

        /**
         * Define a new field in the structure. The structure
         * will keep the same order as the definition order.
         *
         * CHAR, BYTES, STRING takes size (in bytes) as third argument.
         *
         * STRUCT takes name of a defined structure as third argument.
         *
         * @param {enums|number} type - field type.
         * @param {string|null} name - field name. This will be the name you use in the code
         * so make sure it will be valid, or call it using ["!strange.name"].
         * @param {*} [opt] - used to set size for BIT8, BIT16, CHAR and STRING. For struct type a
         * structure name or def. For other types this can be used to set a default value.
         * @param {*} [opt2] - optional default data for CHAR, STRING, BIT8, BIT16 types.
         */
        def: function(type, name, opt, opt2) {
          if (type < 0 || type > ezStruct.enums.STRUCT) throw "Invalid type.";
          for(var i = 0, defs = struct.defs; i < defs.length; i++) {
            if (defs[i].name === name) throw "Field already exists.";
          }
          defs.push({name: name, type: type, opt: opt, opt2: opt2})
        }
      } // return
    },  // define()

    /**
     * Allocates the actual memory for the structure and provides
     * properties to set or get each field. The size of the buffer
     * depends on the field definitions.
     * @param {string|*} name - the name of the structure to allocate memory for. You can also pass
     * in a structure definition instead of name.
     * @param {*} [options] - various options
     * @param {boolean} [options.le] - endianess, defaults to big-endian. Set to true for little-endian.
     * @param {ArrayBuffer} [options.buffer] - use this buffer instead of allocating one new.
     * @param {number} [options.offset] - use the given buffer from this offset (in bytes).
     * @returns {*} The returned buffer object can be used to update the structure buffer. The available
     * properties depends on the field definitions. Common properties for all buffers are: `buffer`,
     * `uint8`, `view`, name and length.
     * @memberOf ezStruct
     */
    alloc: function(name, options) {

      options = Object.assign({
        le: false,
        buffer: null,
        offset: 0
      }, options);

      /*
          `mem` is the "memory" objects where properties are set with set/get and
          is bound to an object which references the original struct as well
          as a cfg object specially for this call (position and length of field).
          It also references itself to access the buffer and view.
       */
      var
        struct, i, buffer,
        size = 0,
        bPos = 0, // bit-position
        mem = {},
        subs = [],
        defaults = [],
        hasBits8 = false,
        hasBits16 = false,
        le = options.le,
        _name = (typeof name === "string") ? name : name.name;

      // check name
      for(i = 0; i < structs.length; i++) {
        if (structs[i].name === _name) {
          struct = structs[i];
          break;
        }
      }

      if (!struct) throw "Structure not defined.";

      // loop through each definition in the struct
      struct.defs.forEach(function(def) {
        var t = ezStruct.enums;

        // flush bits definitions to structure if type/op change
        if ((def.type !== t.BIT8 && hasBits8) || (def.type !== t.BIT16 && hasBits16)) {
          size = flushBits(size, hasBits8 ? 1 : 2);
        }

        // check TYPE
        switch(def.type) {
          case t.UINT8:
            _defProp(def.name, _getUINT8, _setUINT8, size, size + 1);
            size++; break;

          case t.UINT16:
            _defProp(def.name, _getUINT16, _setUINT16, size, size + 2);
            size += 2; break;

          case t.UINT32:
            _defProp(def.name, _getUINT32, _setUINT32, size, size + 4);
            size += 4; break;

          case t.INT8:
            _defProp(def.name, _getINT8, _setINT8, size, size + 1);
            size++; break;

          case t.INT16:
            _defProp(def.name, _getINT16, _setINT16, size, size + 2);
            size += 2; break;

          case t.INT32:
            _defProp(def.name, _getINT32, _setINT32, size, size + 4);
            size += 4; break;

          case t.FLOAT32:
            _defProp(def.name, _getFLOAT32, _setFLOAT32, size, size + 4);
            size += 4; break;

          case t.FLOAT64:
            _defProp(def.name, _getFLOAT64, _setFLOAT64, size, size + 8);
            size += 8; break;

          case t.CHAR:  // for now use uint8
          case t.UCHAR:
            _defProp(def.name, _getUCHAR, _setUCHAR, size, def.opt);
            size += def.opt; break;

          case t.STRING:
            _defProp(def.name, _getSTR, _setSTR, size, def.opt);
            size += def.opt; break;

          case t.STRUCT:
            var subStruct = ezStruct.alloc(def.opt, le);
            subs.push({struct: subStruct, pos: size + options.offset, len: subStruct.uint8.length});
            Object.defineProperty(mem, def.name, {
              get: _getSTRUCT.bind({struct: subStruct})
            });
            size += subStruct.uint8.length;
            break;

          case t.BIT8:
          case t.BIT16:
            // todo needs refactoring...
            var
              isBit8 = def.type === t.BIT8,
              width = isBit8 ? 8 : 16,
              bOffset = bPos - (size<<3), offset = bOffset % width, mask = 0, iMask, _bind;

            if (isBit8) hasBits8 = true;
            else hasBits16 = true;

            if (def.opt) {
              if (def.name && def.name.length) {
                // build mask based on offset and number of bits
                for(var i = bOffset; i < bOffset + def.opt; i++) mask |= 1<<i;
                iMask = ~mask;

                _bind = {m: mem, pos: size, offset: offset, width: def.opt, mask: mask};
                Object.defineProperty(mem, def.name, {
                  get: (isBit8 ? _getBIT8 : _getBIT16).bind(_bind),
                  set: (isBit8 ? _setBIT8 : _setBIT16).bind(_bind)
                });
              }

              bPos += def.opt;
              if (bOffset + def.opt >= width) {
                size = flushBits(size, width>>>3);
                bPos = size<<3;
              }
            }
            else {
              size = flushBits(size, width>>>3);
              bPos = size<<3;
            }

            break;

          default:
            throw "Unknown type.";
        }

        // set bit-position
        if (def.type !== t.BIT8 && def.type !== t.BIT16) bPos = size<<3;

        // get default value if any
        if (def.type !== t.STRUCT) getDefault(def);
      });

      // Final alignment for bit defs.
      if (hasBits8) size = flushBits(size, 1);
      else if (hasBits16) size = flushBits(size, 2);

      // setup buffers, name and length properties
      buffer = options.buffer ? options.buffer : new ArrayBuffer(size);
      if (buffer.byteLength < size) throw "Buffer too small.";

      mem.buffer = buffer;
      mem.offset = options.offset;
      mem.view = new DataView(buffer, mem.offset, size);
      mem.uint8 = new Uint8Array(buffer, mem.offset, size);
      mem.name = struct.name;
      mem.length = mem.uint8.length;
      mem.subs = subs;
      mem.hasDefaults = defaults.length > 0;
      mem.id = Date.now();

      // parse and change references for sub-structures if any
      setSubs(subs, 0);

      // init with defaults
      defaults.forEach(function(def) {mem[def.name] = def.value});

      function setSubs(subs, offset) {
        subs.forEach(function(sub) {
          var struct = sub.struct, oUint8;
          if (struct.hasDefaults) oUint8 = sub.struct.uint8;  // preserve defaults

          struct.offset = offset + sub.pos;
          struct.buffer = buffer;
          struct.uint8 = new Uint8Array(buffer, struct.offset, sub.len);
          struct.view = new DataView(buffer, struct.offset, sub.len);

          if (struct.hasDefaults) sub.struct.uint8.set(oUint8);   // set back defaults
          setSubs(struct.subs, struct.offset);                    // recursive offset
        });
      }

      function flushBits(size, bytes) {
        hasBits8 = hasBits16 = false;
        return size + bytes
      }

      function getDefault(def) {
        var value = (def.type === t.CHAR ||
          def.type === t.STRING ||
          def.type === t.BIT8 ||
          def.type === t.BIT16) ? def.opt2 : def.opt;
        if (typeof value !== "undefined") defaults.push({name: def.name, value: value})
      }

      /*
          This will add a property with setter and getter to the mem
          object. It will bind each property to a unique object referencing
          itself (to access buffer/view) and a local object holding buffer
          position and and data width.
       */
      function _defProp(name, get, set, pos, size) {

        // Define the actual property for the field
        Object.defineProperty(mem, name, {
          get: get.bind(_bind(pos, size)),
          set: set.bind(_bind(pos, size))
        });

        // binds each function with common references as well as local position and length.
        // mem is referenced since view (property on mem) is created later.
        function _bind(pos, len) {
          return {m: mem, pos: pos, len: len, le: !!le}
        }
      }

      // Internal workings. NOTE: Each "this" references the object set via _defProp().
      function _getINT8() {return this.m.view.getInt8(this.pos)}
      function _setINT8(v) {this.m.view.setInt8(this.pos, v)}
      function _getINT16() {return this.m.view.getInt16(this.pos, this.le)}
      function _setINT16(v) {this.m.view.setInt16(this.pos, v, this.le)}
      function _getINT32() {return this.m.view.getInt32(this.pos, this.le)}
      function _setINT32(v) {this.m.view.setInt32(this.pos, v, this.le)}

      function _getUINT8() {return this.m.view.getUint8(this.pos )}
      function _setUINT8(v) {this.m.view.setUint8(this.pos, v)}
      function _getUINT16() {return this.m.view.getUint16(this.pos, this.le)}
      function _setUINT16(v) {this.m.view.setUint16(this.pos, v, this.le)}
      function _getUINT32() {return this.m.view.getUint32(this.pos, this.le)}
      function _setUINT32(v) {this.m.view.setUint32(this.pos, v, this.le)}

      function _getFLOAT32() {return this.m.view.getFloat32(this.pos, this.le)}
      function _setFLOAT32(v) {this.m.view.setFloat32(this.pos, v, this.le)}
      function _getFLOAT64() {return this.m.view.getFloat64(this.pos, this.le)}
      function _setFLOAT64(v) {this.m.view.setFloat64(this.pos, v, this.le)}

      function _getBIT8() {return (this.m.uint8[this.pos] & this.mask) >>> this.offset}
      function _setBIT8(v) {this.m.uint8[this.pos] = this.m.uint8[this.pos] & ~this.mask | ((v << this.offset) & this.mask)}

      function _getBIT16() {return (this.m.view.getUint16(this.pos) & this.mask) >>> this.offset}
      function _setBIT16(v) {this.m.view.setUint16(this.pos, this.m.view.getUint16(this.pos) & ~this.mask | ((v << this.offset) & this.mask))}

      function _getUCHAR() {return this.m.uint8.subarray(this.pos, this.len)}
      function _setUCHAR(bytes) {
        if (bytes.length > this.len) throw "Illegal size.";
        this.m.uint8.set(bytes, this.pos)
      }

      function _getSTR() {
        var bytes = this.m.uint8.subarray(this.pos , this.pos + this.len),
            i = bytes.indexOf(0);
        return new TextDecoder().decode(i < 0 ? bytes : bytes.subarray(0, i))
      }

      function _setSTR(str) {
        var bytes = new TextEncoder().encode(str + "\0");
        if (bytes.length > this.len) throw "Illegal size.";
        this.m.uint8.set(bytes, this.pos )
      }

      function _getSTRUCT() {return this.struct}

      return mem
    },

    /**
     * Get a definition object by name.
     * @param {string} name - name of definition to return
     * @returns {*} The definition if found, else null
     * @memberOf ezStruct
     */
    getDef: function(name) {
      for(var i = 0; i < structs.length; i++) {
        if (structs[i].name === name) return structs[i]
      }
      return null
    },

    defFromC: function(structTxt, options) {
      // todo convert C/C++ structure def. to ezStruct def.
    },

    /**
     * Create a C-struct string from a definition.
     * @param {string|*} name - name of definition to return or the definition object
     * @returns {string} A string holding the C-struct
     * @throws If definition name is not found an error is thrown.
     * @memberOf ezStruct
     */
    defToC: function(name) {
      var
        struct = typeof name === "string" ? ezStruct.getDef(name) : name,
        txt, t = ezStruct.enums,
        types = ["unsigned char", "unsigned int", "unsigned long", "unsigned long long", "char", "int", "long", "long long",
                 "float", "double", "unsigned char", "unsigned int", "char", "unsigned char", "char", "struct"];

      if (!struct) throw "No definition with that name.";

      // open
      txt = "struct " + struct.name + " {\n";

      // add defs
      struct.defs.forEach(function(def) {txt += makeLine(def)});

      function makeLine(def) {
        var name = types[def.type];

        return "   " + (name === "struct" ? (typeof def.opt === "string" ? def.opt : def.opt.name) : name)
                + " " + (def.name || "")
                + (def.type === t.BIT8 || def.type === t.BIT16 ? (def.name && def.name.length ? " : " : ":") + def.opt : "")
                + (def.type === t.CHAR || def.type === t.STRING ? "[" + def.opt + "]" : "")
                + (def.type < t.BIT8 && def.opt ? " = " + def.opt : "")
                + (def.type > t.CHAR && def.opt2 ? " = \"" + def.opt2 + "\"" : "")
                + ";\n";
      }

      // close
      txt += "};\n";
      return txt
    },


    /**
     * Creates a new structure buffer and fills it with data from given buffer.
     * If the source buffer is shorter than structure buffer the data is filled
     * from the beginning. If larger then the data is truncated to fit into
     * the structure buffer.
     *
     * @param {string} name - name of structure to create and fill.
     * @param {*} buffer - source buffer (ArrayBuffer or a TypedArray view).
     * @param {boolean} [le=false] - little-endian flag
     * @returns {*} New structure with filled buffer
     * @memberOf ezStruct
     */
    fromBuffer: function(name, buffer, le) {
      var mem = ezStruct.alloc(name, le);
      if (ArrayBuffer.isView(buffer)) buffer = buffer.buffer;
      mem.uint8.set(new Uint8Array(buffer, 0, Math.min(mem.length, buffer.byteLength)));
      return mem
    },

    /**
     * Clones a allocated structure and the content of the source structure buffer.
     * @param {*} memStruct - source structure buffer
     * @returns {*} New instance of a allocated structure
     * @memberOf ezStruct
     */
    clone: function(memStruct) {
      var mem = ezStruct.alloc(memStruct.name);
      mem.uint8.set(memStruct.uint8.slice(0, mem.length));
      return mem
    }

  }
})();
