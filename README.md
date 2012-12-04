**Attention! This library is rather young and it is still to be tested in a live scenario. Although there are thorough unit tests included, be sure to do additional tests tailored to your own environment before using the class.**

# JSBitStream #
---

## What is it? ##

JSBitStream is a Javascript class to read and write bit level data into and out of a stream. It was created to preserve as many bits and bytes during network communication as possible without sacrificing speed (ie. through compression). It was intended to prepare network packets for multiplayer HTML5 games.

## How does it work? ##

Instead of sending an entire 16 bits for every unicode character of your data, depending on the type it is possible to decrease the size of your data down to a single bit. When these bits are compressed together, you can save much bandwidth through your stream's size.

You can write any value or string and concatenate all these values regardless of where a byte or a character boundary would be. All the bits of your data are stored as unicode text. The last character has its bits padded with zeroes to make sure it forms a full 16 bit unicode character.

Writing to a stream adds bits at the end of the stream while reading from a stream strips data from the beginning of the stream - so the stream's size keeps changing automatically as you write to and read from it. For this reason you need to have the same amount and same kind of reads as you had writes.

The class has built-in methods to read and write the kind of data that appears in games, such as:
* Booleans (true or false)
* Floats with a value between 0 and 1 with 8 bit precision
* Integers with a 4, 8, 16 and 32 bit fixed or variable bit count
* Strings that are tested against character maps to use only as many bits for each character as required:
  * 4 (numeric characters + space, "+", "-", ",", "."), 
  * 5 (lower case only alphabet + space, "|", "'", "-", "." and ","), 
  * 6 (alphanumeric characters + space and ","), 
  * 7 (ascii up to 0x7F), 
  * 8 (ascii up to 0xFF) and 
  * 16 (default unicode)

## Example usage ##

```javascript
// create the stream
var stream = new JSBitStream();

// write some data to the stream
stream.writeInt(3);
stream.writeInt(519);
stream.writeFlag(false);
stream.writeFlag(true);
stream.writeInt(0x01256789);
stream.writeU4(0x0C);
stream.writeU16(0xa987);
stream.writeString("Nothing to see here!"); // will take 7 bits per character since all character codes are below 0x7F
stream.writeU8(0x52);
stream.writeU32(0x81818181);

// we can now write raw data characters to the console:
console.log(stream.data); // result is a 18 character unicode string starting like this: ĥ枉쪘爀ᒝ...

// let's read all the data back from the stream
var results = [
  stream.readInt(),
  stream.readInt(),
  stream.readFlag(),
  stream.readFlag(),
  stream.readInt(),
  stream.readU4(),
  stream.readU16(),
  stream.readString(),
  stream.readU8(),
  stream.readU32()
];

console.log(stream.data); // returns an empty string as each read also removes the read data from the stream

// here, with decimal values 'results' is:
// [3, 519, false, true, 19228553, 12, 43399, "Nothing to see here!", 82, 2172748161]
```

## Available methods ##

* **readString(), writeString(value)** *Reads from and writes a string into the bitstream. Maximum length is 65535 characters. Automatically uses the smallest possible code page taking from 4 (numeric) up to 16 bits (unicode) per character.*
* **readInt(), writeInt(value)** *Reads from and writes an arbitrary size integer into the bitstream. The integer is tested fr size and will use 5+ bits. This is primarily useful when the value is unknown and may vary greatly. Very large numbers are sent as a numeric string.*
* **readFloat(), writeFloat(value)** *Reads from and writes a relative floating point value (having a value between 0 and 1) into the bitstream. This has an 8 bit precision, so values written and then read might have a rough difference of up to 0.008. For writing other floats, it is preferable that the float is converted into an integer at write time and deconverted at read time to best fit your use case.*
* **readU4(), writeU4(value), readU8(), writeU8(value), readU()16, writeU16(value), readU32(), writeU32(value)** *Reads from and writes fixed size integers into the bitstream. Useful when you know how large a specific value can be.*
* **readFlag, writeFlag(value)** *Reads from and writes a boolean value into the bitstream using a single bit.*

All read methods return the proper value as a boolean (readFlag()), a 0-1 float (readFloat), a string (readString() and readInt() for integers taking more than 32 bits) and an integers.

## Node.js support ##

The class is intended to be usable both on the client (browser) and server (node.js) side. However, node.js support is still untested.

## Testing ##

QUnit tests are included. Edit qunit/tests.js to change, launch qunit/unittests.html to run the tests. Open the javascript console to see additional, bit level information (available only when the QUnit object is available). Note that writing to the console and testing the code makes the class methods run significantly slower than how it would normally run.

Example bit level debug information that is available in the console:

    ...
    
    writeBits preparing to write 5 of 5 bit(s)
    writeBits writing 5 bit(s) with a value of '00100' from 4.5 to 4.10
    
    1000000110100000    0x81 0xa0    129 160    33184    膠
    0000000011001000    0x00 0xc8      0 200      200    È
    0001011011110011    0x16 0xf3     22 243     5875    ᛳ
    1000001111111010    0x83 0xfa    131 250    33786    菺
    0000100100000000    0x09 0x00      9   0     2304    ऀ
         <--->
    SIZE: 74 bits / 5 characters
    
    ...

## License ##

JSBitStream is licensed under the terms of the MIT license;

> Copyright © 2012 Konrad Kiss
> 
> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
> 
> The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
> 
> THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.