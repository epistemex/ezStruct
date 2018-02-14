﻿ezStruct
======

Create virtual structures for binary data in JavaScript.

Virtual structures are very useful for binary data packets and file
parsing.

Store structured data as bytes and send over the net in an highly
efficient way.


Features
--------
- Define unlimited structures by name
- Define optional default values for each field
- Allocate memory for structures by name, size by definitions.
- Easy to define field types, names and sizes.
- Multi-level nested structures is supported
- Nested structures accessed using chained properties
- Read/write to/from structure fields using properties
- Supports char, string, struct, integers, floats fields
- Supports bit-field packing (unsigned 8 and 16 types).
- Export definitions as C-struct strings.
- Several convenient aliases for the enumerated types

All data is written/read directly to/from the underlying ArrayBuffer
which allows for efficient memory use as well fast read and write.


Install
-------
**ezStruct** can be installed in various ways:

- Git using HTTPS: `git clone https://github.com/epistemex/ezStruct.git`
- Git using SSH: `git clone git@github.com:epistemex/ezStruct.git`
- Download [zip archive](https://github.com/epistemex/ezStruct/archive/master.zip) and extract.


Usage
-----
The `ezStruct` is a global static object that manage structure definitions
and memory allocations of those definitions.

To define a new structure simply call:
```javascript
var s1 = ezStruct.define("myStruct1");
var t = ezStruct.enums;

// define fields
s1.def(t.UINT32, "field1");
s1.def(t.UINT16, "field2");
s1.def(t.STRING, "text", 100);          // NUL-terminated UTF8 string, max 100 bytes
s1.def(t.CHAR  , "data", 100);          // raw char (byte) buffer
```

Next, create the actual memory byte-buffer like this. This approach
allows you to create several independent buffers for the same definitions:
```javascript
var m1 = ezStruct.alloc("myStruct1");

// set fields
m1.field1 = 0x12345678;
m1.field2 = 0x1234;
m1.text = "Hello structures!";

// read back
var v1 = m1.field2;                     // => 0x1234
var str = m1.text;                      // => "Hello structures!"

// get the raw byte buffer
var bytes = m1.uint8;
var arrBuffer = m1.buffer;
```

Nested structure is possible (and recursively):
```javascript
var s2 = ezStruct.define("myStruct2");

// Define an existing structure definition as field in this definition
s2.def(t.STRUCT, "subStruct", "myStruct1");   // type, field name, def. name
s2.def(t.BOOL  , "status");                   // etc.
// ...

// allocate a buffer for the new defined structure
var m2 = ezStruct.alloc(s2, {le: true});      // use def. for name, true = use little-endian

// access nested struct using chained propterties.
// Data written to same buffer as main structure.
m2.subStruct.text = "Hello sub-structure!";
```

ezStruct also has bit-field support to pack flags tight to create
very compact buffers:
```javascript
var bits = ezStruct.define("myFlags");

// pack into Uint8
bits.def(t.BITS8, "bitFld1", 1);                // 1 bit width
bits.def(t.BITS8, "bitFld2", 3);                // 3 bits width
bits.def(t.BITS8, null, 0);                     // align to next byte
bits.def(t.BITS8, "bitFld3", 2);                // 2 bits width

// pack into Uint16
bits.def(t.BITS16, "bitFld4", 4);               // 4 bits width
bits.def(t.BITS16, "bitFld5", 4);               // 4 bits width
bits.def(t.BITS16, "bitFld6", 2);               // 2 bits width
bits.def(t.BITS16, "bitFld7", 6);               // 6 bits width

var bitMem = ezStruct.alloc(bits);              // allocates 4 bytes
bitMem.bitFld6 = 3;                             // sets all bits in bitFld6
```

Export a definition as C-struct string:
```javascript
var bits = ezStruct.define("myFlags");
var txt = ezStruct.defToC(bits);
/* =>
 struct myFlags {
    unsigned char bitFld1 : 1;
    unsigned char bitFld2 : 3;
    unsigned char :0;
    unsigned char bitFld3 : 2;
    unsigned int bitFld4 : 4;
    unsigned int bitFld5 : 4;
    unsigned int bitFld6 : 2
    unsigned int bitFld7 : 6
 };
```


Also see
--------

- [ezBuffers](https://github.com/epistemex/ezBuffer) - enhanced data-view. Includes bit-tools (ezBits).


Issues
------

See the [issue tracker](https://github.com/epistemex/ezStruct/issues) for details.


Contributors
------------

See [contributors](https://github.com/epistemex/ezStruct/graphs/master) here.


License
-------

Released under [MIT license](http://choosealicense.com/licenses/mit/). You may use this class in both commercial and non-commercial projects provided that full header (minified and developer versions) is included.


*&copy; Epistemex 2018*

![Epistemex](https://i.imgur.com/GP6Q3v8.png)
