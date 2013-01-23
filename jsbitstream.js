/**
 * JSBitStream is a Javascript class to read and write bit level data into and out of a stream.
 * It was created to preserve as many bits and bytes during network communication as possible without sacrificing
 * speed (ie. through compression). It was intended to prepare network packets for multiplayer HTML5 games.
 *
 * @class
 * @name JSBitStream
 * @namespace
 */
var JSBitStream = function () {
    'use strict';
};

/**
 * The string buffer packing 16 bits into each Unicode character - every character represents two 8 bit values
 * @type {String}
 */
JSBitStream.prototype.data = "";

/**
 * The number of bits used in the first character
 * @type {Number}
 */
JSBitStream.prototype.bitOffset = 0;

/**
 * The number of used bits (0-15) in the final incomplete 16 bit character (0 if all 16 bits are used)
 * @type {Number}
 */
JSBitStream.prototype.lastCharBits = 0;


/**
 * Reads an arbitrary string from the stream.
 * @return {String} The string read.
 */
JSBitStream.prototype.readString = function () {
    'use strict';

    var typeId = this.readU4(),
        l = this.readU16(),
        txt = "",
        c;

    while (l--) {
        switch (typeId) {
        case 5:  // numeric 4 bit
            c = this.readBits(4).data.charCodeAt(0) >> 12;
            if (c === 4) {
                c = 32;
            } else {
                c += 43;
            }
            break;
        case 4:  // lowercase alpha 5 bit
            c = this.readBits(5).data.charCodeAt(0) >> 11;
            if (c === 26) {         // space
                c = 32;
            } else if (c === 27) {  // |
                c = 124;
            } else if (c === 28) {  // '
                c = 39;
            } else if (c === 29) {  // -
                c = 45;
            } else if (c === 30) {  // .
                c = 46;
            } else if (c === 31) {  // ,
                c = 44;
            } else {
                c += 97;           // a-z
            }
            break;
        case 3:  // alphanumeric 6 bit
            c = this.readBits(6).data.charCodeAt(0) >> 10;
            if (c === 62) {         // ,
                c = 44;
            } else if (c === 63) {  // space
                c = 32;
            } else {
                c += 48;
                if (c >= 58) { c += 7; }
                if (c >= 91) { c += 6; }
            }
            break;
        case 2:  // low ascii 7 bit
            c = this.readBits(7).data.charCodeAt(0) >> 9;
            break;
        case 1:  // ascii 8 bit
            c = this.readBits(8).data.charCodeAt(0) >> 8;
            break;
        default: // unicode
            c = this.readBits(16).data.charCodeAt(0);
            break;
        }

        txt += String.fromCharCode(c);
    }

    return txt;
};

/**
 * Writes an arbitrary string into the bitstream.
 * @param val (string) The string value to be written.
 * @param lowerCase (boolean) Shows whether the string can be represented in a lower case format.
 *                            Defaults to false. A full lowercase string takes less bits in the bitstream.
 * @return {String} The string that was inserted into the bitstream.
 */
JSBitStream.prototype.writeString = function (val, lowerCase) {
    'use strict';

    if (lowerCase === undefined) {
        lowerCase = false;
    }

    if (lowerCase) {
        val = val.toLowerCase();
    }

    var numericOnly = true,
        lowerCaseCharactersOnly = true,
        alphanumericOnly = true,
        lowASCIIOnly = true,
        asciiOnly = true,
        typeId,
        c,
        t;

    for (t = 0; t < val.length; t++) {
        c = val.charCodeAt(t);
        if ((c < 43 || c > 57 || c === 47) && c !== 32) { numericOnly = false; } // includes: +,-.space
        if ((c < 97 || c > 122) && c !== 32 && c !== 124 && c !== 39 && c !== 46 && c !== 44) { lowerCaseCharactersOnly = false; } // includes '|-., and space
        if ((c < 48 || c > 57) && (c < 65 || c > 90) && (c < 97 || c > 122) && (c !== 32 && c !== 39)) { alphanumericOnly = false; } // includes , and space
        if (c > 127) { lowASCIIOnly = false; }
        if (c > 255) { asciiOnly = false; }
    }

    typeId = (numericOnly ? 5 : (lowerCaseCharactersOnly ? 4 : (alphanumericOnly ? 3 : (lowASCIIOnly ? 2 : (asciiOnly ? 1 : 0))))) & 0x000F;

    this.writeU4(typeId);
    this.writeU16(val.length);

    for (t = 0; t < val.length; t++) {
        c = val.charCodeAt(t);
        switch (typeId) {
        case 5:     // 5 - numeric only (4 bits) (0-15) - includes: +,-.space
            if (c === 32) {
                c = 4; // space instead of /
            } else {
                c -= 43;
            }
            this.writeBits(String.fromCharCode((c << 12) & 0xF000), 4);
            break;
        case 4:     // 4 - lowercase alpha only (5 bits) (0-31) - includes space|'-.,
            if (c === 32) {         // space
                c = 26;
            } else if (c === 124) {  // |
                c = 27;
            } else if (c === 39) {  // '
                c = 28;
            } else if (c === 45) {  // -
                c = 29;
            } else if (c === 46) {  // .
                c = 30;
            } else if (c === 44) {  // ,
                c = 31;
            } else {
                c -= 97;          // a-z
            }
            this.writeBits(String.fromCharCode((c << 11) & 0xF800), 5);
            break;
        case 3:     // 3 - alphanumeric only (6 bits) (0-63) - includes , and space
            if (c === 44) {         // ,
                c = 62;
            } else if (c === 32) {  // space
                c = 63;
            } else {
                c -= 48;
                if (c >= 17) { c -= 7; }
                if (c >= 42) { c -= 6; }
            }
            this.writeBits(String.fromCharCode((c << 10) & 0xFC00), 6);
            break;
        case 2:     // 2 - low ascii only (7 bit) (0-127)
            this.writeBits(String.fromCharCode((c << 9) & 0xFE00), 7);
            break;
        case 1:     // 1 - ascii only (8 bits)
            this.writeBits(String.fromCharCode((c << 8) & 0xFF00), 8);
            break;
        default:    // 0 - unicode (16 bits)
            this.writeBits(String.fromCharCode(c & 0xFFFF), 16);
            break;
        }
    }

    return val;
};

/**
 * Reads a compressed integer from the bitstream. Useful for numbers where small (<256) and
 * large (>65536 or >4294967296) values fluctuate.
 * @return {Number|String} The integer read from the bitstream. For small numbers, this is a number, for large numbers
 *                         this is a string.
 */
JSBitStream.prototype.readInt = function () {
    'use strict';

    if (this.readFlag()) { // 8 bit?
        return this.readU8();
    }
    if (this.readFlag()) { // 16 bit ?
        return this.readU16();
    }
    if (this.readFlag()) { // 32 bit ?
        return this.readU32();
    }
    // large value
    return this.readString();
};

/**
 * Writes a compressed integer into the bitstream. Use for numbers where small (<256)
 * and large (>65536 or >4294967296) values fluctuate.
 * @param val The number to be written into the bitstream. For extremely large values, this is treated as a string.
 * @return {Number|String} The value written into the bitstream.
 */
JSBitStream.prototype.writeInt = function (val) {
    'use strict';

    val *= 1;
    if (this.writeFlag(val < Math.pow(2, 8))) { // 8 bit
        this.writeU8(val);
    } else if (this.writeFlag(val < Math.pow(2, 16))) { // 16 bit
        this.writeU16(val);
    } else if (this.writeFlag(val < Math.pow(2, 32))) { // 32 bit
        this.writeU32(val);
    } else { // large value
        this.writeString(val.toString(), false);
    }

    return val;
};

/**
 * Reads a relative float (0-1) value from the bitstream with 8 bit precision.
 * @return {Number} The number read from the bitstream. Note that this number will have a difference of up to 0.008.
 */
JSBitStream.prototype.readFloat = function () {
    'use strict';

    return (this.readU8() & 0xFF) / 255;
};

/**
 * Writes a relative float (0-1) value into the bitstream with 8 bit precision.
 * @param val_float The value to be written into the bitstream. The value must be between 0 and 1 (inclusive).
 * @return {Number} The number written into the bitstream (not the number passed as the original argument).
 */
JSBitStream.prototype.writeFloat = function (val_float) {
    'use strict';

    val_float = (val_float * 255) & 0xFF;
    this.writeU8(val_float);
    return val_float;
};

/**
 * Reads a 32 bit value from the bitstream.
 * @return {Number} The 32 bit number read from the bitstream.
 */
JSBitStream.prototype.readU32 = function () {
    'use strict';

    var readStr = this.readBits(32).data.toString();
    return (readStr.charCodeAt(0) & 0xFFFF) * 0x10000 + (readStr.charCodeAt(1) & 0xFFFF);
};

/**
 * Writes a 32 bit value into the bitstream.
 * @param val_u32 The number (32 bits) to be written into the bitstream.
 * @return {Number} The original number passed as an argument.
 */
JSBitStream.prototype.writeU32 = function (val_u32) {
    'use strict';

    this.writeBits(String.fromCharCode(val_u32 >> 16 & 0xFFFF) + String.fromCharCode(val_u32 & 0xFFFF), 32);
    return val_u32;
};

/**
 * Reads a 16 bit number from the bitstream.
 * @return {Number} The 16 bit number read from the bitstream.
 */
JSBitStream.prototype.readU16 = function () {
    'use strict';

    return (this.readBits(16).data.toString()).charCodeAt(0) & 0xFFFF;
};

/**
 * Writes a 16 bit value into the bitstream.
 * @param val_u16 The number (16 bits) to be written into the bitstream.
 * @return {Number} The original number passed as an argument.
 */
JSBitStream.prototype.writeU16 = function (val_u16) {
    'use strict';

    this.writeBits(String.fromCharCode(val_u16 & 0xFFFF), 16);
    return val_u16;
};

/**
 * Reads a byte (8 bits) from the bitstream.
 * @return {Number} The 8 bit number read from the bitstream.
 */
JSBitStream.prototype.readU8 = function () {
    'use strict';

    return ((this.readBits(8).data.toString()).charCodeAt(0) & 0xFF00) >> 8;
};

/**
 * Writes a byte (8 bits) value into the bitstream.
 * @param val_u8 The number (8 bits) to be written into the bitstream.
 * @return {Number} The original number passed as an argument.
 */
JSBitStream.prototype.writeU8 = function (val_u8) {
    'use strict';

    this.writeBits(String.fromCharCode((val_u8 & 0xFF) * 0x100), 8);
    return val_u8;
};

/**
 * Reads a half-byte (4 bits) from the bitstream.
 * @return {Number} The 4 bit number read from the bitstream.
 */
JSBitStream.prototype.readU4 = function () {
    'use strict';

    return ((this.readBits(4).data.toString()).charCodeAt(0) & 0xF000) >> 12;
};

/**
 * Writes a half-byte (4 bits) value into the bitstream.
 * @param val_u4 The number (4 bits) to be written into the bitstream.
 * @return {Number} The original number passed as an argument.
 */
JSBitStream.prototype.writeU4 = function (val_u4) {
    'use strict';

    this.writeBits(String.fromCharCode((val_u4 & 0x0F) * 0x1000), 4);
    return val_u4;
};

/**
 * Reads a boolean value from the bitstream.
 * @return {Boolean} The boolean value read from the bitstream.
 */
JSBitStream.prototype.readFlag = function () {
    'use strict';

    return ((this.readBits(1).data.toString()).charCodeAt(0) & 0x8000) === 0x8000;
};

/**
 * Writes a boolean value into the bitstream.
 * @param val_boolean The boolean value to be written into the bitstream.
 * @return {Boolean} The original boolean value passed as an argument.
 */
JSBitStream.prototype.writeFlag = function (val_boolean) {
    'use strict';

    this.writeBits(val_boolean ? String.fromCharCode(0x8000) : String.fromCharCode(0x0000), 1);
    return val_boolean;
};

/**
 * Reads an arbitrary amount of bits and returns it as a JSBitStream object. This always reads from bitOffset. The
 * final portion of the stream that was read is then shifted to have a 0 offset before converting to a type.
 * @param count The number of bits to be read from the bitstream.
 * @return {JSBitStream} The JSBitStream object representing the bits read.
 */
JSBitStream.prototype.readBits = function (count) {
    'use strict';

    if (this.size() < count) {
        count = this.size();
    }

    // TODO: does this work with node?
    var readStream = new JSBitStream(),
        toReadCount,
        prevBitOffset = this.bitOffset,
        originalCount = count,
        firstChar = "",
        readMsg,
        r;

    if (this.debug) {
        this.log(0, "readBits reading " + originalCount + " bit(s) with a bit offset of " + prevBitOffset + " within the first character");
    }

    if (this.bitOffset > 0) {
        toReadCount = Math.min(16 - this.bitOffset, count);

        // copy the first character using only valid bits
        firstChar = ((this.data.charCodeAt(0) << this.bitOffset) & ((Math.pow(2, toReadCount) - 1) << (16 - toReadCount)));
        if (this.debug) {
            this.log(0, "readBits initial offset read: " + this.left_pad(firstChar.toString(2), toReadCount, "0").substr(0, toReadCount));
        }
        readStream.writeBits(String.fromCharCode(firstChar), toReadCount);

        this.bitOffset = (this.bitOffset + toReadCount) % 16;
        if (this.bitOffset === 0) {
            this.data = this.data.substr(1);
        }

        count -= toReadCount;
    }

    while (count > 0) {
        toReadCount = Math.min(16, count);

        readStream.writeBits(String.fromCharCode((this.data.charCodeAt(0) & ((Math.pow(2, toReadCount) - 1) << (16 - toReadCount)))), toReadCount);

        if (toReadCount < 16) {
            // the read ends in this character with a non-zero bitOffset
            this.bitOffset = toReadCount;
        } else {
            // the read ends with the last bit or goes on in the next character
            this.data = this.data.substr(1);
        }

        count -= toReadCount;
    }

    if (this.debug && originalCount > 0) {
        readMsg = "Read '";
        if (firstChar.length > 0) {
            readMsg += this.left_pad(firstChar.charCodeAt(0).toString(2), 16 - prevBitOffset, "0") + " ";
        }
        for (r = 0; r < readStream.data.length; r++) {
            readMsg += this.left_pad(readStream.data.charCodeAt(r).toString(2), 16, "0").substr(0, Math.min(originalCount - r * 16, 16)) + " ";
        }
        readMsg = readMsg.trim();
        readMsg += "'";
        this.log(0, readMsg);
    }

    // clean up if no data is left in the stream
    if (this.size === 0) {
        this.data = "";
        this.bitOffset = 0;
        this.lastCharBits = 0;
    }

    if (this.debug) {
        this.log(0, this.serialize(false));
    }

    return readStream;
};

/**
 * Writes an arbitrary amount of bits into the stream.
 * @param writeBuffer {String} A bit packed string containing the value to be written.
 * @param bitCount {Number} The number of bits to write. Must be equal or less than 16 * the number of characters in
 *                          writeBuffer.
 */
JSBitStream.prototype.writeBits = function (writeBuffer, bitCount) {
    'use strict';

    bitCount = Math.min(bitCount, writeBuffer.length * 16);

    var writeBufferPointer = 0,
        bitsToRead,
        writeValue,
        targetOffset,
        targetValue,
        firstBitsToWrite,
        firstValue,
        nextBitsToWrite,
        nextValue;

    while (writeBufferPointer < bitCount) {
        // get at most 16 bits and add them as a new character
        // read the buffer to write (writeBuffer) up to the end of the current character or to the end of the string (bitCount)
        bitsToRead = Math.min(Math.min(16, (bitCount - writeBufferPointer)), 16 - (writeBufferPointer % 16));
        // this is the value we need to write - masked out from the source character and shifted to the right
        writeValue = (writeBuffer.charCodeAt(writeBufferPointer / 16 >> 0) >> (16 - bitsToRead)) & (Math.pow(2, bitsToRead) - 1);
        // this is the character we're writing to
        targetOffset = Math.max(this.data.length - 1 + (this.lastCharBits === 0 ? 1 : 0), 0);

        if (this.data.length - 1 < targetOffset) {
            this.data += "\u0000";
        }

        firstBitsToWrite = Math.min(16 - this.lastCharBits, bitsToRead);
        firstValue = writeValue >> (bitsToRead - firstBitsToWrite);
        nextBitsToWrite = bitsToRead - firstBitsToWrite;
        nextValue = writeValue & (Math.pow(2, nextBitsToWrite) - 1);

        // mask out any bits following the last write from the target value
        // add the new value shifted to the target position
        // and copy it into the target stream's last character
        targetValue = this.data.charCodeAt(targetOffset) & 0xFFFF;
        targetValue &= ((Math.pow(2, this.lastCharBits) - 1) << (16 - this.lastCharBits));
        targetValue |= firstValue << (16 - (this.lastCharBits + firstBitsToWrite));
        this.data = this.data.substr(0, targetOffset) + String.fromCharCode(targetValue & 0xFFFF);

        if (nextBitsToWrite > 0) {
            // the value to be written has overflown the target character
            // add a new zero character at the end of the stream
            // and shift the remaining bits that need to be written all the way to the left
            // before writing it into the stream's new character
            this.data += "\u0000";
            targetValue = nextValue << (16 - nextBitsToWrite);
            this.data = this.data.substr(0, targetOffset + 1) + String.fromCharCode(targetValue & 0xFFFF);
        }

        if (this.debug) {
            if (bitCount > 32) {
                this.log(0, this.left_pad(((writeBuffer.charCodeAt(0) & 0xFF00) >> 8).toString(16), 2, "0") + " " + this.left_pad((writeBuffer.charCodeAt(0) & 0x00FF).toString(16), 2, "0") + " " +
                    this.left_pad(((writeBuffer.charCodeAt(1) & 0xFF00) >> 8).toString(16), 2, "0") + " " + this.left_pad((writeBuffer.charCodeAt(1) & 0x00FF).toString(16), 2, "0") + " " +
                    this.left_pad(((writeBuffer.charCodeAt(2) & 0xFF00) >> 8).toString(16), 2, "0") + " " + this.left_pad((writeBuffer.charCodeAt(2) & 0x00FF).toString(16), 2, "0") + " " +
                    this.left_pad(((writeBuffer.charCodeAt(3) & 0xFF00) >> 8).toString(16), 2, "0") + " " + this.left_pad((writeBuffer.charCodeAt(3) & 0x00FF).toString(16), 2, "0"));
            } else if (bitCount > 16) {
                this.log(0, this.left_pad(((writeBuffer.charCodeAt(0) & 0xFF00) >> 8).toString(16), 2, "0") + " " + this.left_pad((writeBuffer.charCodeAt(0) & 0x00FF).toString(16), 2, "0") + " " +
                    this.left_pad(((writeBuffer.charCodeAt(1) & 0xFF00) >> 8).toString(16), 2, "0") + " " + this.left_pad((writeBuffer.charCodeAt(1) & 0x00FF).toString(16), 2, "0"));
            } else if (bitCount > 8) {
                this.log(0, this.left_pad(((writeBuffer.charCodeAt(0) & 0xFF00) >> 8).toString(16), 2, "0") + " " + this.left_pad((writeBuffer.charCodeAt(0) & 0x00FF).toString(16), 2, "0"));
            } else if (bitCount > 1) {
                this.log(0, this.left_pad(((writeBuffer.charCodeAt(0) & 0xFF00) >> 8).toString(16), 2, "0"));
            } else {
                this.log(0, this.left_pad(((writeBuffer.charCodeAt(0) & 0x8000) >> 15).toString(16), 1, "0"));
            }
            this.log(0, "writeBits preparing to write " + bitsToRead + " of " + bitCount + " bit(s)" + (writeBufferPointer > 0 ? " at read offset " + writeBufferPointer : ""));
            this.log(0, "writeBits writing " + bitsToRead + " bit(s) with a value of '" + this.left_pad(writeBuffer.charCodeAt((writeBufferPointer / 16) >> 0).toString(2), 16, "0").substr(0, bitsToRead) + "' from " + targetOffset + "." + (this.lastCharBits) + " to " + ((nextBitsToWrite > 0) ? targetOffset + 1 : targetOffset) + "." + ((this.lastCharBits + bitsToRead) % 16));
        }

        this.lastCharBits = (this.lastCharBits + bitsToRead) % 16;
        writeBufferPointer += bitsToRead;

        if (this.debug) {
            this.lastBitsAdded = bitsToRead;
            this.log(0, this.serialize(true));
        }
    }
};

/**
 * Returns the number of bits within the stream.
 * @return {Number} teh number of bits within the stream.
 */
JSBitStream.prototype.size = function () {
    'use strict';

    return (this.data.length * 16) - this.bitOffset - ((16 - this.lastCharBits) % 16);
};

/**
 * If QUnit is available it is safe to assume that JSBitStream is being unit tested so it should provide tools that
 * provide additional info within the console:
 */
if (QUnit !== undefined) {
    'use strict';

    JSBitStream.prototype.debug = true;
    JSBitStream.prototype.lastBitsAdded = 0;  // debug only, shows how many bits have been added to the stream during the latest write

    /**
     * Serializes the bitstream for debugging.
     * @param showLastAdd {Boolean} Show the last bits added. Defaults to false.
     * @return {String} The serialized debug information.
     */
    JSBitStream.prototype.serialize = function (showLastAdd) {
        if (showLastAdd === undefined) {
            showLastAdd = false;
        }

        if (this.data.length === 0) {
            return "\n<  empty  >";
        }

        var txt = "\n",
            chr,
            bin,
            lo,
            hi,
            lo16,
            hi16,
            lo2,
            hi2,
            strBit,
            endBit,
            c,
            f;

        for (c = 0; c < this.data.length; c++) {
            chr = this.data.charCodeAt(c);

            lo = chr & 0xFF;
            hi = chr >> 8;
            lo16 = this.left_pad(lo.toString(16), 2, "0");
            hi16 = this.left_pad(hi.toString(16), 2, "0");
            lo2 = this.left_pad(lo.toString(2), 8, "0");
            hi2 = this.left_pad(hi.toString(2), 8, "0");

            bin = hi2 + lo2;

            if (c === 0) {
                bin = this.left_pad("", this.bitOffset, "+") + bin.substr(this.bitOffset);
            }

            txt += bin + "    0x" + hi16 + " 0x" + lo16 + "    " + this.left_pad(hi, 3, " ") + " " + this.left_pad(lo, 3, " ") + "    " + this.left_pad(chr, 5, " ") + "    " + String.fromCharCode(chr) + "\n";
        }

        if (showLastAdd) {
            strBit = (this.data.length * 16 - ((16 - this.lastCharBits) % 16) - (this.lastBitsAdded % 16)) % 16;
            endBit = strBit + this.lastBitsAdded;

            for (f = 0; f <= endBit - 1; f++) {
                if (f === 16) {
                    txt += "\n";
                }

                if (f < strBit) {
                    txt += " ";
                } else if (f === strBit) {
                    if (this.lastBitsAdded === 1) {
                        txt += "*";
                    } else {
                        txt += "<";
                    }
                } else if (f === endBit - 1) {
                    txt += ">";
                } else {
                    txt += "-";
                }
            }
        }

        txt += "\nSIZE: " + this.size() + " bits / " + this.data.length + " characters\n";

        return txt;
    };

    /**
     * Left pads a string.
     * @param val Value to be padded
     * @param len Length to be padded to.
     * @param str String to pad with.
     * @return {String} The padded string.
     */
    JSBitStream.prototype.left_pad = function (val, len, str) {
        var w;
        val += "";
        if (str === undefined) { str = "0"; }
        for (w = val.length; w < len; w++) { val = str.charAt(0) + val; }
        return val;
    };

    /**
     * Log wrapper.
     * @param severity {Number} Severity of the log message (0 - log, 1 - warn, 2 - error)
     * @param message {String} The message to be logged.
     */
    JSBitStream.prototype.log = function (severity, message) {
        switch (severity) {
        case 2:
            if (console.error !== undefined) {
                console.error(message);
            } else {
                this.log(0, "ERROR: " + message);
            }
            break;
        case 1:
            if (console.warn !== undefined) {
                console.warn(message);
            } else {
                this.log(0, "WARNING: " + message);
            }
            break;
        default: // 0
            console.log(message);
        }
    };
}

/**
 * If this is running under node.js, export the JSBitStream object.
 */
if (module !== undefined && module.exports) {
    module.exports.JSBitStream = JSBitStream;
}
