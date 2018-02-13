ezStruct
======

Create virtual structures for binary data in JavaScript.


Features
--------
- Define several structures by name
- Easy to define field types and names
- Nested structures possible
- Allocates buffer size based on definition
- Update buffer fields by name and value
- Supports char, string, struct, integers, floats
- Several aliases for types
- Small, fast and efficient


Install
-------

**ezStruct** can be installed in various ways:

- Git using HTTPS: `git clone https://github.com/epistemex/ezStruct.git`
- Git using SSH: `git clone git@github.com:epistemex/ezStruct.git`
- Download [zip archive](https://github.com/epistemex/ezStruct/archive/master.zip) and extract.


Usage
-----
The `ezStruct` is a global static objects that manage structure definitions.
To define a new structure simply call:
```javascript
var defStruct = ezStruct.define("myStruct");
var t = ezStruct.enums;

// define fields
defStruct.def(t.UINT32, "field1");
defStruct.def(t.UINT16, "field2");
defStruct.def(t.STRING, "text", 100);   // NUL-terminated string
defStruct.def(t.CHAR  , "data", 100);   // raw char (byte) buffer
```

Next, create the actual memory byte-buffer like this:
```javascript
var memStruct = ezStruct.alloc("myStruct");

// set fields
memStruct.field1 = 0x12345678;
memStruct.field2 = 0x1234;
memStruct.text = "Hello structures!";

// read back
var v1 = memStruct.field2;              // => 0x1234
var str = memStruct.text;               // => "Hello structures!"

// get raw buffer
var bytes = mem.uint8;
var arrBuffer = mem.buffer;
```

Nested structure is possible (and recursively):
```javascript
var defStruct2 = ezStruct.define("myStruct2");

// Define an existing structure defintion as field in this def.
defStruct2.def(t.STRUCT, "subStruct", "myStruct");    // type, field name, def. name
defStruct2.def(t.BOOL  , "status");                   // etc.
// ...

// allocate a buffer for the new defined structure
var memStruct2 = ezStruct.alloc("myStruct2", true);   // use little-endian

// access nested struct:
memStruct2.subStruct.text = "Hello sub-structure!";
```

Also see
--------

- [ezBuffers](https://github.com/epistemex/ezBuffer) enhanced data-view. Includes bit-tools (ezBits).


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
