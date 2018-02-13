/*!
	ezStruct ver 0.1.1-alpha
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
      UINT8  : 0,
      UBYTE  : 0,
      UINT16 : 1,
      USHORT : 1,
      UINT32 : 2,
      UINT   : 2,
      UINT64 : 3,
      ULONG  : 3,
      INT8   : 4,
      BYTE   : 4,
      BOOL   : 4,
      INT16  : 5,
      SHORT  : 5,
      INT32  : 6,
      INT    : 6,
      INT64  : 7,
      LONG   : 7,
      FLOAT32: 8,
      FLOAT  : 8,
      FLOAT64: 9,
      DOUBLE : 9,
      CHAR   : 10,
      BYTES  : 10,
      STRING : 11,
      STRUCT : 12
    },

    /**
     * Create a new structure definition.
     * @param {string} name - internal name of this structure. This name
     * is used with alloc() and with definition type enums.STRUCT.
     * @returns {*} Contains method `def` to define each field.
     * @memberOf ezStruct
     */
    define: function(name) {

      // todo create an instance object instead

      var struct = {name: name, defs: []}, i;

      // check if name is in use
      for(i = 0; i < structs.length; i++) {
        if (structs[i].name === name) throw "Structure with this name exists."
      }

      structs.push(struct);

      return {
        /**
         * Define a new field in the structure. The structure
         * will keep the same order as the definition order.
         *
         * CHAR, BYTES, STRING takes size (in bytes) as third argument.
         *
         * STRUCT takes name of a defined structure as third argument.
         *
         * @param {enums} type - field type.
         * @param {string} name - field name. This will be the name you use in the code
         * so make sure it will be valid, or call it using ["!strange.name"].
         * @param {*} [opt] - only required for some types. char/string requires length to be
         * given. struct require a struct name as string.
         */
        def: function(type, name, opt) {
          if (type < 0 || type > ezStruct.enums.STRUCT) throw "Invalid type.";
          struct.defs.push({name: name, type: type, opt: opt})
        }
      }
    },

    /**
     * Allocates the actual memory for the structure and provides
     * properties to set or get each field. The size of the buffer
     * depends on the field definitions.
     * @param {string} name - the name of the structure to allocate memory for.
     * @param {boolean} [le=false] - endianess, defaults to big-endian. Set to true for little-endian.
     * @returns {*} The returned buffer object can be used to update the structure buffer. The available
     * properties depends on the field definitions. Common properties for all buffers are: `buffer`,
     * `uint8`, `view`, name and length.
     * @memberOf ezStruct
     */
    alloc: function(name, le) {

      /*
          `mem` is the "memory" objects where properties are set with set/get and
          is bound to an object which references the original struct as well
          as a cfg object specially for this call (position and length of field).
          It also references itself to access the buffer and view.
       */
      var struct, i, size = 0, mem = {}, subs = []; //todo support for initial default values

      // check name
      for(i = 0; i < structs.length; i++) {
        if (structs[i].name === name) {
          struct = structs[i];
          break;
        }
      }

      if (!struct) throw "Structure not defined.";

      // loop through each definition in the struct
      struct.defs.forEach(function(def) {
        var t = ezStruct.enums;

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

          case t.CHAR:
            _defProp(def.name, _getCHAR, _setCHAR, size, def.opt);
            size += def.opt; break;

          case t.STRING:
            _defProp(def.name, _getSTR, _setSTR, size, def.opt);
            size += def.opt; break;

          case t.STRUCT:
            var subStruct = ezStruct.alloc(def.opt, le);
            subs.push({struct: subStruct, pos: size, len: subStruct.uint8.length});
            Object.defineProperty(mem, def.name, {
              get: _getSTRUCT.bind({struct: subStruct})
            });
            size += subStruct.uint8.length; break;
        }
      });

      // setup buffers, name and length properties
      mem.buffer = new ArrayBuffer(size);
      mem.view = new DataView(mem.buffer);
      mem.uint8 = new Uint8Array(mem.buffer);
      mem.name = struct.name;
      mem.length = mem.uint8.length;

      // parse and change references for sub-structures if any
      subs.forEach(function(sub) {
        sub.struct.buffer = mem.buffer;
        sub.struct.uint8 = new Uint8Array(mem.buffer, sub.pos, sub.len);
        sub.struct.view = new DataView(mem.buffer, sub.pos, sub.len);
      });

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

      function _getCHAR() {return this.m.uint8.subarray(this.pos, this.len)}
      function _setCHAR(bytes) {
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
