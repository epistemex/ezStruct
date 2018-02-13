/*!
	ezStruct ver 0.1.0-alpha
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
      UBYTE  : 1,
      UINT16 : 2,
      USHORT : 2,
      UINT32 : 3,
      UINT   : 3,
      UINT64 : 4,
      ULONG  : 4,
      INT8   : 5,
      BYTE   : 5,
      BOOL   : 5,
      INT16  : 6,
      SHORT  : 6,
      INT32  : 7,
      INT    : 7,
      INT64  : 9,
      LONG   : 9,
      FLOAT32: 10,
      FLOAT  : 10,
      FLOAT64: 11,
      DOUBLE : 11,
      CHAR   : 14,
      STRING : 15,
      STRUCT : 16
    },

    /**
     * Create a new structure definition.
     * @param {string} name - internal name of this structure. This name
     * is used with alloc() and with definition type enums.STRUCT.
     * @returns {*} Contains method `def` to define each field.
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
         * Define a new field in the structure. The structure
         * will keep the same order as the definition order.
         * @param {enums} type - field type.
         * @param {string} name - field name. This will be the name you use in the code
         * so make sure it will be valid, or call it using ["!strange.name"].
         * @param {*} [opt] - only required for some types. char/string requires length to be
         * given. struct require a struct name as string.
         */
        def: function(type, name, opt) {
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
     */
    alloc: function(name, le) {

      /*
          `mem` is the "memory" objects where properties are set with set/get and
          is bound to an object which references the original struct as well
          as a cfg object specially for this call (position and length of field).
          It also references itself to access the buffer and view.
       */
      var struct, i, size = 0, mem = {}, subs = [];

      // check name
      for(i = 0; i < structs.length; i++) {
        if (structs[i].name === name) {
          struct = structs[i];
          break;
        }
      }

      if (!struct) throw "Structure with name not defined.";

      // Create a reference to the original structure
      mem._struct = struct;

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
            var subStruct = ezStruct.alloc(def.opt);
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

        // binds each function with common references as well as local position and length
        function _bind(pos, len) {
          return {mem: mem, cfg: {pos: pos, len: len}, le: !!le}
        }
      }

      // Internal workings. NOTE: Each "this" references the object set via _defProp().
      function _getINT8() {return this.mem.view.getInt8(this.cfg.pos)}
      function _setINT8(v) {return this.mem.view.setInt8(this.cfg.pos, v)}
      function _getINT16() {return this.mem.view.getInt16(this.cfg.pos, this.cfg.le)}
      function _setINT16(v) {return this.mem.view.setInt16(this.cfg.pos, v, this.cfg.le)}
      function _getINT32() {return this.mem.view.getInt32(this.cfg.pos, this.cfg.le)}
      function _setINT32(v) {return this.mem.view.setInt32(this.cfg.pos, v, this.cfg.le)}

      function _getUINT8() {return this.mem.view.getUint8(this.cfg.pos )}
      function _setUINT8(v) {return this.mem.view.setUint8(this.cfg.pos, v)}
      function _getUINT16() {return this.mem.view.getUint16(this.cfg.pos, this.cfg.le)}
      function _setUINT16(v) {return this.mem.view.setUint16(this.cfg.pos, v, this.cfg.le)}
      function _getUINT32() {return this.mem.view.getUint32(this.cfg.pos, this.cfg.le)}
      function _setUINT32(v) {return this.mem.view.setUint32(this.cfg.pos, v, this.cfg.le)}

      function _getFLOAT32() {return this.mem.view.getFloat32(this.cfg.pos, this.cfg.le)}
      function _setFLOAT32(v) {return this.mem.view.setFloat32(this.cfg.pos, v, this.cfg.le)}
      function _getFLOAT64() {return this.mem.view.getFloat64(this.cfg.pos, this.cfg.le)}
      function _setFLOAT64(v) {return this.mem.view.setFloat64(this.cfg.pos, v, this.cfg.le)}

      function _getCHAR() {return this.mem.uint8.subarray(this.cfg.pos, this.cfg.len)}
      function _setCHAR(bytes) {
        if (bytes.length > this.cfg.len) throw "Illegal size.";
        this.mem.uint8.set(bytes, this.cfg.pos )
      }

      function _getSTR() {
        var bytes = this.mem.uint8.subarray(this.cfg.pos , this.cfg.pos + this.cfg.len),
            i = bytes.indexOf(0);
        return new TextDecoder().decode(i < 0 ? bytes : bytes.subarray(0, i))
      }

      function _setSTR(str) {
        var bytes = new TextEncoder().encode(str + "\0");
        if (bytes.length > this.cfg.len) throw "Illegal size.";
        this.mem.uint8.set(bytes, this.cfg.pos )
      }

      function _getSTRUCT() {return this.struct}

      return mem
    }

  }
})();
