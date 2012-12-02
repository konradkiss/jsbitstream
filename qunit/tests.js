
// Very crude unit testing in case QUnit is not defined (compatible only with test(), equal() and ok())
// if QUnit is present, additional bit level debug info is made available by jsbitstream.js via the console
if(typeof window.QUnit!='object'){test=function(t,c){c();};equal=function(e,c,m){(e==c)?console.log(m):console.error(m);};ok=function(c,m){c?console.log(m):console.error(m);};}


test( "Multiple misc Read / Write operations", function()
{
   var stream = new JSBitStream();

   // writeFloat (used for a value between 0 and 1) will convert the float to an unsigned 8 bit integer
   // and will sometimes lose some precision while saving 24 bits on the bitstream
   var float_threshold = (1/255);

   stream.writeInt(3);
   stream.writeString("alpha, beta, gamma, delta");
   stream.writeInt(519);
   stream.writeInt(0x01256789);
   stream.writeU4(0x0C);
   stream.writeFlag(true);
   stream.writeU16(0xa987);
   stream.writeString("Nothing to see here!");
   stream.writeU8(0x52);
   stream.writeFlag(false);
   stream.writeFlag(true);
   stream.writeFlag(false);
   stream.writeString("Apokaliptic tests");
   stream.writeU32(0x81818181);
   stream.writeU4(0x03);
   stream.writeFlag(true);
   stream.writeU16(0x9933);
   stream.writeFloat(0.5);
   stream.writeU8(0xa7);
   stream.writeFlag(true);
   stream.writeString("Árvíztűrő tükörfúrógép.");
   stream.writeFlag(true);
   stream.writeFlag(false);
   stream.writeU32(0x2623BF23);
   stream.writeFlag(true);
   stream.writeU16(0x771F);
   stream.writeFloat(0.134);
   stream.writeFloat(0.771);
   stream.writeU8(0x11);
   stream.writeString("-92");
   stream.writeFlag(false);
   stream.writeFlag(false);
   stream.writeFlag(true);
   stream.writeString("Próba ékezettel.");
   stream.writeU32(0x77711CCB);

   if (stream.debug)
      console.log(stream.serialize());

   /*  1. */ equal(3, stream.readInt(), "Flag read & write equals.");
   /*  2. */ equal("alpha, beta, gamma, delta", stream.readString(), "Lower case alpha string matches");
   /*  3. */ equal(519, stream.readInt(), "Flag read & write equals.");
   /*  4. */ equal(0x01256789, stream.readInt(), "Flag read & write equals.");
   /*  5. */ equal(0x0C, stream.readU4(), "Flag read & write equals.");
   /*  6. */ equal(true, stream.readFlag(), "Flag read & write equals.");
   /*  7. */ equal(0xa987, stream.readU16(), "U16 read & write equals.");
   /*  8. */ equal("Nothing to see here!", stream.readString(), "Low ASCII string matches");
   /*  9. */ equal(0x52, stream.readU8(), "U8 read & write equals.");
   /* 10. */ equal(false, stream.readFlag(), "Flag read & write equals.");
   /* 11. */ equal(true, stream.readFlag(), "Flag read & write equals.");
   /* 12. */ equal(false, stream.readFlag(), "Flag read & write equals.");
   /* 13. */ equal("Apokaliptic tests", stream.readString(), "Alphanumeric string matches");
   /* 14. */ equal(0x81818181, stream.readU32(), "U32 read & write equals.");
   /* 15. */ equal(0x03, stream.readU4(), "Flag read & write equals.");
   /* 16. */ equal(true, stream.readFlag(), "Flag read & write equals.");
   /* 17. */ equal(0x9933, stream.readU16(), "U16 read & write equals.");
   /* 18. */ ok(Math.abs(0.5 - stream.readFloat()) < float_threshold, "Float read & write difference is within threshold.");
   /* 19. */ equal(0xa7, stream.readU8(), "U8 read & write equals.");
   /* 20. */ equal(true, stream.readFlag(), "Flag read & write equals.");
   /* 21. */ equal("Árvíztűrő tükörfúrógép.", stream.readString(), "Unicode string matches");
   /* 22. */ equal(true, stream.readFlag(), "Flag read & write equals.");
   /* 23. */ equal(false, stream.readFlag(), "Flag read & write equals.");
   /* 24. */ equal(0x2623BF23, stream.readU32(), "U32 read & write equals.");
   /* 25. */ equal(true, stream.readFlag(), "Flag read & write equals.");
   /* 26. */ equal(0x771F, stream.readU16(), "U16 read & write equals.");
   /* 27. */ ok(Math.abs(0.134 - stream.readFloat()) < float_threshold, "Float read & write difference is within threshold.");
   /* 28. */ ok(Math.abs(0.771 - stream.readFloat()) < float_threshold, "Float read & write difference is within threshold.");
   /* 29. */ equal(0x11, stream.readU8(), "U8 read & write equals.");
   /* 30. */ equal("-92", stream.readString(), "Numeric string matches");
   /* 31. */ equal(false, stream.readFlag(), "Flag read & write equals.");
   /* 32. */ equal(false, stream.readFlag(), "Flag read & write equals.");
   /* 33. */ equal(true, stream.readFlag(), "Flag read & write equals.");
   /* 35. */ equal("Próba ékezettel.", stream.readString(), "ASCII string matches");
   /* 34. */ equal(0x77711CCB, stream.readU32(), "U32 read & write equals.");

   /* 36. */ ok(stream.size() == 0, "Stream is empty.");
});

