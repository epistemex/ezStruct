ezStruct
======

Create virtual structures for binary data in JavaScript.

Virtual structures are very useful for binary data packets and file
parsing.

Store structured data as bytes and send over the net in an highly
efficient way.


Features
--------
- Define unlimited structures by name
- Allocate memory for structures by name, size by definitions.
- Easy to define field types, names and sizes.
- Multi-level nested structures is supported
- Nested structures accessed using chained properties
- Read/write to/from structure fields using properties
- Supports char, string, struct, integers, floats fields
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
var defStruct = ezStruct.define("myStruct");
var t = ezStruct.enums;

// define fields
defStruct.def(t.UINT32, "field1");
defStruct.def(t.UINT16, "field2");
defStruct.def(t.STRING, "text", 100);   // NUL-terminated UTF8 string, max 100 bytes
defStruct.def(t.CHAR  , "data", 100);   // raw char (byte) buffer
```

Next, create the actual memory byte-buffer like this. This approach
allows you to create several independent buffers for the same definitions:
```javascript
var memStruct = ezStruct.alloc("myStruct");

// set fields
memStruct.field1 = 0x12345678;
memStruct.field2 = 0x1234;
memStruct.text = "Hello structures!";

// read back
var v1 = memStruct.field2;              // => 0x1234
var str = memStruct.text;               // => "Hello structures!"

// get the raw byte buffer
var bytes = memStruct.uint8;
var arrBuffer = memStruct.buffer;
```

Nested structure is possible (and recursively):
```javascript
var defStruct2 = ezStruct.define("myStruct2");

// Define an existing structure definition as field in this definition
defStruct2.def(t.STRUCT, "subStruct", "myStruct");    // type, field name, def. name
defStruct2.def(t.BOOL  , "status");                   // etc.
// ...

// allocate a buffer for the new defined structure
var memStruct2 = ezStruct.alloc("myStruct2", true);   // true = use little-endian

// access nested struct using chained propterties.
// Data written to same buffer as main structure.
memStruct2.subStruct.text = "Hello sub-structure!";
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
