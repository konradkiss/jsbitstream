# JSBitStream #
---

## What is it? ##

JSBitStream is a Javascript class to read and write bit level data into and out of a stream. It was created to preserve as many bits and bytes during network communication as possible without sacrificing speed (ie. through compression). It was intended to prepare network packets for multiplazer HTML5 games for example.

## How does it work? ##

Instead of sending an entire 16 bits for every unicode character of your data, depending on the type it is possible to decrease the size of your data down to a single bit. When these bits are compressed together, you can save much bandwidth through your stream's size.

You can write any value or string and concatenate all these values regardless of where a byte or a character boundary would be. All the bits of your data are stored as unicode text. The last character has its bits padded with zeroes to make sure it forms a full 16 bit unicode character.

Writing to a stream adds bits at the end of the stream while reading from a stream strips data from the beginning of the stream - so the stream's size keeps changing automatically as you write to and read from it. For this reason you need to have the same amount and same kind of reads as you had writes.

The class has built-in methods to read and write the kind of data that appears in games, such as:
* Booleans (true or false)
* Floats with a value between 0 and 1 with 8 bit precision
* 4, 8, 16 and 32 bit fixed integers
* Integers where the bit length is tested against (the smaller the number the less bits used)
* Strings where characters are tested against character maps to use only as many bits for each character as required:
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
stream.writeString("Nothing to see here!");
stream.writeU8(0x52);
stream.writeU32(0x81818181);

// we can now write raw data characters to the console:
console.log(stream.data); // result is a 18 character unicode string starting like this: ĥ枉쪘爀ᒝ...

// let's read all the data back from the stream
var results = [
  stream.writeInt(3),
  stream.writeInt(519),
  stream.writeFlag(false),
  stream.writeFlag(true),
  stream.writeInt(0x01256789),
  stream.writeU4(0x0C),
  stream.writeU16(0xa987),
  stream.writeString("Nothing to see here!"),
  stream.writeU8(0x52),
  stream.writeU32(0x81818181)
];

// here, with decimal values result is:
// [3, 519, false, true, 19228553, 12, 43399, "Nothing to see here!", 82, 2172748161]
```

## Available methods ##

* **readString(), writeString(value)** *Reads from and writes a string into the bitstream. Maximum length is 65535 characters. Automatically uses the smallest possible code page taking from 4 (numeric) up to 16 bits (unicode) per character.*
* **readInt(), writeInt(value)** *Reads from and writes an arbitrary size integer into the bitstream. The integer is tested fr size and will use up 5+ bits. This is primarily useful when the value is unknown and may vary greatly. Very large numbers are sent as a numeric string.*
* **readFloat(), writeFloat(value)** *Reads from and writes a relative floating point value (having a value between 0 and 1) into the bitstream. This has an 8 bit precision, so values written and then read might have a rough difference of up to 0.008. For writing other floats, it is preferable that the float is converted into an integer at write time and deconverted at read time to best fit your use case.*
* **readU4(), writeU4(value), readU8(), writeU8(value), readU()16, writeU16(value), readU32(), writeU32(value)** *Reads from and writes fixed size integers into the bitstream. Useful when you know how large a specific value can be.*
* **readFlag, writeFlag(value)** *Reads from and writes a boolean value into the bitstream using a single bit.*

All read methods return the proper value as a boolean (readFlag()), a 0-1 float (readFloat), a string (readString() and readInt() for integers taking more than 32 bits) and an integers.

## Node.js support ##

The class is intended to be usable both on the client (browser) and server (node.js) side. However, node.js support is still untested.