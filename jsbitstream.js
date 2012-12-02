/*



*/
var JSBitStream = function()
{
   var self = this;

   this.data            = ""; // the string buffer packing 16 bits into each Unicode character - every character represents two 8 bit values
   this.bitOffset       = 0;  // the number of bits used in the first character
   this.lastCharBits    = 0;  // (0-15) number of used bits in the final incomplete 16 bit character (0 if all 16 bits are used)

   /*
    * Reads a string from the bitstream.
    */
   this.readString = function(undefined)
   {
      var typeId = self.readU4();
      var l = self.readU16();
      var txt = "";

      var c;

      while (l--)
      {
         switch (typeId)
         {
            case 5:  // numeric 4 bit
               c = self.readBits(4).data.charCodeAt(0) >> 12;
               if (c==4) {
                  c = 32;
               } else {
                  c += 43;
               }
               break;
            case 4:  // lowercase alpha 5 bit
               c = self.readBits(5).data.charCodeAt(0) >> 11;
               if (c==26) {         // space
                  c = 32;
               } else if (c==27){   // |
                  c = 124;
               } else if (c==28) {  // '
                  c = 39;
               } else if (c==29) {  // -
                  c = 45;
               } else if (c==30) {  // .
                  c = 46;
               } else if (c==31) {  // ,
                  c = 44;
               } else {
                  c += 97;          // a-z
               }
               break;
            case 3:  // alphanumeric 6 bit
               c = self.readBits(6).data.charCodeAt(0) >> 10;
               if (c==62) {         // ,
                  c = 44;
               } else if (c==63) {  // space
                  c = 32;
               } else {
                  c += 48;
                  if (c >= 58) c += 7;
                  if (c >= 91) c += 6;
               }
               break;
            case 2:  // low ascii 7 bit
               c = self.readBits(7).data.charCodeAt(0) >> 9;
               break;
            case 1:  // ascii 8 bit
               c = self.readBits(8).data.charCodeAt(0) >> 8;
               break;
            default: // unicode
               c = self.readBits(16).data.charCodeAt(0);
               break;
         }

         txt += String.fromCharCode(c);
      }

      return txt;
   };

   /*
    * Writes a string into the bitstream in the most optimized format.
    * Use caseless to convert 
    */
   this.writeString = function(val, lowerCase, undefined)
   {
      if (lowerCase == undefined)
         lowerCase = false;

      if (lowerCase)
         val = val.toLowerCase();

      var numericOnly = true;
      var lowerCaseCharactersOnly = true;
      var charactersOnly = true;
      var alphanumericOnly = true;
      var lowASCIIFrom32Only = true;
      var lowASCIIOnly = true;
      var asciiOnly = true;

      var typeId = 0; // Unicode (16 bit) characters
      var c;
      
      for (var t=0;t<val.length;t++)
      {
         c = val.charCodeAt(t);
         if ((c<43 || c>57 || c==47) && c!=32) numericOnly = false; // includes: +,-.space
         if ((c<97 || c>122) && c!=32 && c!=124 && c!=39 && c!= 46 && c!= 44) lowerCaseCharactersOnly = false; // includes '|-., and space
         if ((c<48 || c>57) && (c<65 || c>90) && (c<97 || c>122) && (c!=32 && c!=39)) alphanumericOnly = false; // includes , and space
         if (c > 127) lowASCIIOnly = false;
         if (c > 255) asciiOnly = false;
      }

      typeId = (numericOnly ? 5 : (lowerCaseCharactersOnly ? 4 : (alphanumericOnly ? 3 : (lowASCIIOnly ? 2 : (asciiOnly ? 1 : 0))))) & 0x000F;

      self.writeU4(typeId);
      self.writeU16(val.length);

      for (var t=0;t<val.length;t++)
      {
         c = val.charCodeAt(t);
         switch (typeId)
         {
            case 5:     // 5 - numeric only (4 bits) (0-15) - includes: +,-.space
               if (c==32) {
                  c = 4; // space instead of /
               } else {
                  c -= 43;
               }
               self.writeBits(String.fromCharCode((c << 12) & 0xF000), 4);
               break;
            case 4:     // 4 - lowercase alpha only (5 bits) (0-31) - includes space|'-.,
               if (c==32) {         // space
                  c = 26;
               } else if (c==124){  // |
                  c = 27;
               } else if (c==39) {  // '
                  c = 28;
               } else if (c==45) {  // -
                  c = 29;
               } else if (c==46) {  // .
                  c = 30;
               } else if (c==44) {  // ,
                  c = 31;
               } else {
                  c -= 97;          // a-z
               }
               self.writeBits(String.fromCharCode((c << 11) & 0xF800), 5);
               break;
            case 3:     // 3 - alphanumeric only (6 bits) (0-63) - includes , and space
               if (c==44) {         // ,
                  c = 62;
               } else if (c==32) {  // space
                  c = 63;
               } else {
                  c -= 48;
                  if (c >= 17) c -= 7;
                  if (c >= 42) c -= 6;
               }
               self.writeBits(String.fromCharCode((c << 10) & 0xFC00), 6);
               break;
            case 2:     // 2 - low ascii only (7 bit) (0-127)
               self.writeBits(String.fromCharCode((c << 9) & 0xFE00), 7);
               break;
            case 1:     // 1 - ascii only (8 bits)
               self.writeBits(String.fromCharCode((c << 8) & 0xFF00), 8);
               break;
            default:    // 0 - unicode (16 bits)
               self.writeBits(String.fromCharCode(c & 0xFFFF), 16);
               break;
         }
      }

      return val;
   };

   /*
    * Reads a compressed integer from the bitstream
    * Use for numbers where small (<256) and large (>65536 or >4294967296) values fluctuate
    */
   this.readInt = function(undefined)
   {
      if (self.readFlag()) // 8 bit?
      {
         return self.readU8();
      } else if (self.readFlag()) // 16 bit ?
      {
         return self.readU16();
      } else if (self.readFlag()) // 32 bit ?
      {
         return self.readU32();
      } else { // large value
         return self.readString();
      }
   };

   /*
    * Writes a compressed integer into the bitstream
    * Use for numbers where small (<256) and large (>65536 or >4294967296) values fluctuate
    */
   this.writeInt = function(val, undefined)
   {
      val *= 1;
      if (self.writeFlag(val<Math.pow(2,8))) // 8 bit
      {
         self.writeU8(val);
      } else if (self.writeFlag(val<Math.pow(2,16))) // 16 bit
      {
         self.writeU16(val);
      } else if (self.writeFlag(val<Math.pow(2,32))) // 32 bit
      {
         self.writeU32(val);
      } else { // large value
         self.writeString(val+"");
      }

      return val;
   };
   
   /*
    * Reads a float (0-1) value from the bitstream with 8 bit precision.
    */
   this.readFloat = function(undefined)
   {
      return (self.readU8() & 0xFF) / 255;
   };

   /*
    * Writes a float (0-1) value into the bitstream with 8 bit precision.
    */
   this.writeFloat = function(val_float, undefined)
   {
      self.writeU8((val_float * 255) & 0xFF);
      return val_float;
   };

   /*
    * Reads a 32 bit value from the bitstream.
    */
   this.readU32 = function(undefined)
   {
      var readStr = self.readBits(32).data+"";
      return (readStr.charCodeAt(0) & 0xFFFF) * 0x10000 + (readStr.charCodeAt(1) & 0xFFFF);
   };

   /*
    * Writes a 32 bit value into the bitstream.
    */
   this.writeU32 = function(val_u32, undefined)
   {
      self.writeBits(String.fromCharCode(val_u32 >> 16 & 0xFFFF)+String.fromCharCode(val_u32 & 0xFFFF), 32);
      return val_u32;
   };

   /*
    * Reads a 16 bit value from the bitstream.
    */
   this.readU16 = function(undefined)
   {
      return (self.readBits(16).data+"").charCodeAt(0) & 0xFFFF;
   };

   /*
    * Writes a 16 bit value into the bitstream.
    */
   this.writeU16 = function(val_u16, undefined)
   {
      self.writeBits(String.fromCharCode(val_u16 & 0xFFFF), 16);
      return val_u16;
   };

   /*
    * Reads a byte value from the bitstream.
    */
   this.readU8 = function(undefined)
   {
      return ((self.readBits(8).data+"").charCodeAt(0) & 0xFF00) >> 8;
   };

   /*
    * Writes a byte value into the bitstream.
    */
   this.writeU8 = function(val_u8, undefined)
   {
      self.writeBits(String.fromCharCode((val_u8 & 0xFF) * 0x100), 8);
      return val_u8;
   };

   /*
    * Reads a half byte (0-15) value from the bitstream.
    */
   this.readU4 = function(undefined)
   {
      return ((self.readBits(4).data+"").charCodeAt(0) & 0xF000) >> 12;
   };

   /*
    * Writes a half byte (0-15) value into the bitstream.
    */
   this.writeU4 = function(val_u4, undefined)
   {
      self.writeBits(String.fromCharCode((val_u4 & 0x0F) * 0x1000), 4);
      return val_u4;
   };

   /*
    * Reads a boolean value from the bitstream.
    */
   this.readFlag = function(undefined)
   {
      return ((self.readBits(1).data+"").charCodeAt(0) & 0x8000) == 0x8000;
   };

   /*
    * Writes a boolean value into the bitstream.
    */
   this.writeFlag = function(val_boolean, undefined)
   {
      self.writeBits(val_boolean ? String.fromCharCode(0x8000) : String.fromCharCode(0x0000), 1);
      return val_boolean;
   };

   /*
    * Reads an arbitrary amount of bits and returns it as a JSBitStream object.
    * This always reads from bitOffset. The final portion of the stream that was 
    * read is then shifted to have a 0 offset before converting to a type.
    */
   this.readBits = function(count, undefined) {
      if (self.size() < count)
         count = self.size();

      // TODO: does this work with node?
      var readStream = new JSBitStream();

      var toReadCount;
      var prevBitOffset = self.bitOffset;
      var originalCount = count;
      var firstChar = "";

      if (self.debug)
         self.log(0,"readBits reading " + originalCount + " bit(s) with a bit offset of " + prevBitOffset + " within the first character");

      if (self.bitOffset > 0)
      {
         toReadCount = Math.min(16-self.bitOffset, count);

         // copy the first character using only valid bits
         firstChar = ((self.data.charCodeAt(0) << self.bitOffset) & ((Math.pow(2,toReadCount)-1) << (16-toReadCount)));
         if (self.debug)
            self.log(0,"readBits initial offset read: " + self.lpad(firstChar.toString(2), toReadCount, "0").substr(0,toReadCount));
         readStream.writeBits(String.fromCharCode(firstChar), toReadCount);

         self.bitOffset = (self.bitOffset + toReadCount) % 16;
         if (self.bitOffset == 0)
            self.data = self.data.substr(1);
         
         count -= toReadCount;
      }

      while (count > 0)
      {
         toReadCount = Math.min(16, count);

         readStream.writeBits(String.fromCharCode((self.data.charCodeAt(0) & ((Math.pow(2,toReadCount)-1) << (16-toReadCount)))), toReadCount);

         if (toReadCount<16)
         {
            // the read ends in this character with a non-zero bitOffset
            self.bitOffset = toReadCount;
         } else {
            // the read ends with the last bit or goes on in the next character
            self.data = self.data.substr(1);
         }

         count -= toReadCount;
      }
      
      if (self.debug && originalCount>0) {
         var readMsg = "Read '";
         if (firstChar.length>0)
            readMsg += self.lpad(firstChar.charCodeAt(0).toString(2), 16-prevBitOffset) + " ";
          for (var r=0;r<readStream.data.length;r++)
            readMsg += self.lpad(readStream.data.charCodeAt(r).toString(2), 16).substr(0, Math.min(originalCount-r*16, 16)) + " ";
         readMsg = readMsg.trim();
         readMsg += "'";
         self.log(0,readMsg);
      }

      // clean up if no data is left in the stream
      if (self.size==0) {
         self.data = "";
         self.bitOffset = 0;
         self.lastCharBits = 0;
      }

      if (self.debug)
         self.log(0,self.serialize());

      return readStream;
   };

   /*
    * Writes an arbitrary amount of bits into this stream.
    */
   this.writeBits = function(writeBuffer, count, undefined) {
      // count can only be smaller than the stream to be written, but never larger
      // the rest of writeBuffer (string) is not written to this stream
      // as there could be extra bits that fill up the final character
      var count = Math.min(count, writeBuffer.length * 16);

      var writeBufferPointer = 0;
      var bitsToRead, writeValue, targetOffset, targetValue, firstBitsToWrite, firstValue, nextBitsToWrite, nextValue;

      while (writeBufferPointer < count)
      {
         // get at most 16 bits and add them as a new character
         // read the buffer to write (writeBuffer) up to the end of the current character or to the end of the string (count)
         bitsToRead = Math.min(Math.min(16, (count-writeBufferPointer)), 16-(writeBufferPointer % 16));
         // this is the value we need to write - masked out from the source character and shifted to the right
         writeValue = (writeBuffer.charCodeAt(writeBufferPointer/16 >> 0) >> (16-bitsToRead)) & (Math.pow(2,bitsToRead)-1);
         // this is the character we're writing to
         targetOffset = Math.max(self.data.length-1 + (self.lastCharBits==0?1:0), 0);

         if (self.data.length-1<targetOffset)
            self.data += "\u0000";

         firstBitsToWrite = Math.min(16-self.lastCharBits, bitsToRead);
         firstValue = writeValue >> (bitsToRead - firstBitsToWrite);
         nextBitsToWrite = bitsToRead-firstBitsToWrite;
         nextValue = writeValue & (Math.pow(2,nextBitsToWrite)-1);

         // mask out any bits following the last write from the target value
         // add the new value shifted to the target position
         // and copy it into the target stream's last character
         targetValue = self.data.charCodeAt(targetOffset) & 0xFFFF;
         targetValue &= ((Math.pow(2,self.lastCharBits)-1) << (16-self.lastCharBits));
         targetValue |= firstValue << (16-(self.lastCharBits+firstBitsToWrite));
         self.data = self.data.substr(0,targetOffset) + String.fromCharCode(targetValue & 0xFFFF);

         if (nextBitsToWrite > 0)
         {
            // the value to be written has overflown the target character
            // add a new zero character at the end of the stream
            // and shift the remaining bits that need to be written all the way to the left
            // before writing it into the stream's new character
            self.data += "\u0000";
            targetValue = nextValue << (16 - nextBitsToWrite);
            self.data = self.data.substr(0,targetOffset+1) + String.fromCharCode(targetValue & 0xFFFF);
         }

         if (self.debug)
         {
            if (count > 32) {
               self.log(0, self.lpad(((writeBuffer.charCodeAt(0) & 0xFF00) >> 8).toString(16), 2) + " " + self.lpad((writeBuffer.charCodeAt(0) & 0x00FF).toString(16),2) + " " + 
                           self.lpad(((writeBuffer.charCodeAt(1) & 0xFF00) >> 8).toString(16), 2) + " " + self.lpad((writeBuffer.charCodeAt(1) & 0x00FF).toString(16),2) + " " +
                           self.lpad(((writeBuffer.charCodeAt(2) & 0xFF00) >> 8).toString(16), 2) + " " + self.lpad((writeBuffer.charCodeAt(2) & 0x00FF).toString(16),2) + " " + 
                           self.lpad(((writeBuffer.charCodeAt(3) & 0xFF00) >> 8).toString(16), 2) + " " + self.lpad((writeBuffer.charCodeAt(3) & 0x00FF).toString(16),2));
            } else if (count > 16) {
               self.log(0, self.lpad(((writeBuffer.charCodeAt(0) & 0xFF00) >> 8).toString(16), 2) + " " + self.lpad((writeBuffer.charCodeAt(0) & 0x00FF).toString(16),2) + " " + 
                           self.lpad(((writeBuffer.charCodeAt(1) & 0xFF00) >> 8).toString(16), 2) + " " + self.lpad((writeBuffer.charCodeAt(1) & 0x00FF).toString(16),2));
            } else if (count >8) {
               self.log(0,self.lpad(((writeBuffer.charCodeAt(0) & 0xFF00) >> 8).toString(16), 2) + " " + self.lpad((writeBuffer.charCodeAt(0) & 0x00FF).toString(16),2));
            } else if (count > 1) {
               self.log(0,self.lpad(((writeBuffer.charCodeAt(0) & 0xFF00) >> 8).toString(16), 2));
            } else {
               self.log(0,self.lpad(((writeBuffer.charCodeAt(0) & 0x8000) >> 15).toString(16), 1));
            }
            self.log(0,"writeBits preparing to write " + bitsToRead + " of " + count + " bit(s)" + (writeBufferPointer>0?" at read offset " + writeBufferPointer:""));
            self.log(0,"writeBits writing " + bitsToRead + " bit(s) with a value of '" + self.lpad(writeBuffer.charCodeAt((writeBufferPointer/16)>>0).toString(2), 16).substr(0,bitsToRead) + "' from " + targetOffset + "." + (self.lastCharBits) + " to " + ((nextBitsToWrite > 0)?targetOffset+1:targetOffset) + "." + ((self.lastCharBits + bitsToRead) % 16));
         }

         self.lastCharBits = (self.lastCharBits + bitsToRead) % 16;
         writeBufferPointer += bitsToRead;

         if (self.debug) {
            self.lastBitsAdded = bitsToRead;
            self.log(0,self.serialize(true));
         }
      }
   };

   /*
    * Returns the number of bits within the stream
    */
   this.size = function() {
      return (self.data.length * 16) - self.bitOffset - ((16 - self.lastCharBits) % 16);
   };

   // if QUnit is available it is safe to assume that JSBitStream is being unit tested
   // so it should provide tools that provide additional info within the console:
   if (false && typeof QUnit !== 'undefined')
   {
      this.debug           = true;
      this.lastBitsAdded   = 0;  // debug only, shows how many bits have been added to the stream during the latest write

      /*
       * Serializes the bitstream for debugging
       */
      this.serialize = function(showLastAdd, undefined) {

         if (showLastAdd == undefined)
            showLastAdd = false;

         if (self.data.length==0)
            return "\n<  empty  >";

         var txt = "\n";
         var chr, bina, lo, hi, lo16, hi16, lo2, hi2;

         for (var c=0;c<self.data.length;c++)
         {
            chr = self.data.charCodeAt(c);

            lo = chr & 0xFF;
            hi = chr >> 8;
            lo16 = self.lpad(lo.toString(16), 2);
            hi16 = self.lpad(hi.toString(16), 2);
            lo2 = self.lpad(lo.toString(2), 8);
            hi2 = self.lpad(hi.toString(2), 8);

            bina = hi2 + lo2;

            if (c==0)
               bina = self.lpad("", self.bitOffset, "+") + bina.substr(self.bitOffset);

            txt += bina + "    0x"+hi16+" 0x"+lo16+"    "+self.lpad(hi,3," ")+" "+self.lpad(lo,3," ")+"    " + self.lpad(chr, 5, " ") + "    " + String.fromCharCode(chr) + "\n";
         }

         if (showLastAdd) {
            var strBit = (self.data.length * 16 - ((16 - self.lastCharBits) % 16) - (self.lastBitsAdded % 16)) % 16;
            var endBit = strBit + self.lastBitsAdded;

            for (var f=0;f<=endBit-1;f++) {
               if (f==16)
                  txt += "\n";
               
               if (f<strBit) {
                  txt += " ";
               } else if (f==strBit) {
                  if (self.lastBitsAdded == 1)
                  {
                     txt += "*";
                  } else {
                     txt += "<";
                  }
               } else if (f==endBit-1) {
                  txt += ">";
               } else {
                  txt += "-";
               }
            }
         }

         txt+="\nSIZE: "+self.size()+" bits / " + self.data.length + " characters\n";

         return txt;
      };

      /*
       * Classical left padding function
       */
      this.lpad = function(v,l,s,undefined) { // value, length, string to pad with
         v+="";if(s==undefined) s="0";for(var w=v.length;w<l;w++) v=""+s.charAt(0)+v;
         return v;
      };

      /*
       * Log wrapper
       */
      this.log = function(severity, message, undefined)
      {
         switch (severity)
         {
            case 2:
               console.error(message);
               break;
            case 1:
               console.warn(message);
               break;
            default: // 0
               console.log(message);
         }
      }
   }
};

// if this is running under node.js, export the JSBitStream object
if (typeof module !== 'undefined' && module.exports)
   module.exports.JSBitStream = JSBitStream;

