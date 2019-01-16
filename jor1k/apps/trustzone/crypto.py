# coding: utf8
import string
import os
import struct
import sys

def hexdump(buf,title=""):
    out="         \033[36;1m┌"+"─"*49+"┬"+"─"*18+"┐\033[0m\n"
    if title != "":
        dashlen = (46-len(title))/2
        out="         \033[36;1m┌"+"─"*dashlen+"  "+title+"  "+"─"*(dashlen-(1-(len(title)%2)))+"┬"+"─"*18+"┐\033[0m\n"
    for i in xrange(0,len(buf),16):
        out+="\033[36;1m0x%06x │ \033[0m" % (i)
        for j in xrange(16):
            if i+j < len(buf):
                out+="%02x " % (ord(buf[i+j]))
            else:
                out+="   "
        out+="\033[36;1m│ \033[0m"
        for j in xrange(16):
            if i+j < len(buf):
                if buf[i+j] in string.printable and buf[i+j] not in "\t\n\r\x0b\x0c":
                    out+="%s" % (buf[i+j])
                else:
                    out+="."
            else:
                out+=" "
        out+=" \033[36;1m│\033[0m\n"
    out+="         \033[36;1m└"+"─"*49+"┴"+"─"*18+"┘\033[0m"
    print out

def ror32(a,b):
	return ((a >> b) | ((a << (32 - b))))&0xFFFFFFFF

def rol32(a,b):
	return ror32(a,32-b)

def xor(a,b):
	out=[0]*len(a)
	for i,c in enumerate(a):
		out[i] = c ^ b[i]
	return out

def inv_xor(a,b):
	out=[0]*len(a)
	for i,c in enumerate(a):
		out[i] = c ^ b[0xF-i]
	return out

def mix_key(key, bloc_id):
	str_key = "".join(map(chr,key))
	key_dwords = struct.unpack('<IIII',str_key)
	out_dwords = [0]*4
	out_dwords[0] = ror32( (key_dwords[0] & 0xADAAA9AA) + (key_dwords[2] & 0x52555655), (13 + bloc_id)%32)
	out_dwords[1] = ror32( (key_dwords[1] & 0xADAAA9AA) + (key_dwords[3] & 0x52555655), (17 + bloc_id)%32)
	out_dwords[2] = ror32( (key_dwords[0] & 0x52555655) + (key_dwords[2] & 0xADAAA9AA), (19 + bloc_id)%32)
	out_dwords[3] = ror32( (key_dwords[1] & 0x52555655) + (key_dwords[3] & 0xADAAA9AA), (23 + bloc_id)%32)
	key=struct.pack("<IIII",out_dwords[0],out_dwords[1],out_dwords[2],out_dwords[3])
	#print "round key : " + key.encode("hex")
	return map(ord,key)

def unmix_key(key):
	str_key = "".join(map(chr,key))
	mixed_key_dwords = struct.unpack('<IIII',str_key)
	unrotate_dwords = [0]*4
	unrotate_dwords[0] = rol32( mixed_key_dwords[0] ,13)
	unrotate_dwords[1] = rol32( mixed_key_dwords[1] ,17)
	unrotate_dwords[2] = rol32( mixed_key_dwords[2] ,19)
	unrotate_dwords[3] = rol32( mixed_key_dwords[3] ,23)
	key_dwords = [0]*4
	key_dwords[0] = (unrotate_dwords[0] & 0xADAAA9AA) + (unrotate_dwords[2] & 0x52555655)
	key_dwords[1] = (unrotate_dwords[1] & 0xADAAA9AA) + (unrotate_dwords[3] & 0x52555655)
	key_dwords[2] = (unrotate_dwords[2] & 0xADAAA9AA) + (unrotate_dwords[0] & 0x52555655)
	key_dwords[3] = (unrotate_dwords[3] & 0xADAAA9AA) + (unrotate_dwords[1] & 0x52555655)
	key=struct.pack("<IIII",key_dwords[0],key_dwords[1],key_dwords[2],key_dwords[3])
	return map(ord,key)

def gen_mask(key,bloc_id):
	key = mix_key(key,bloc_id)
	mask = [0] * 0x10
	for i in range(0x10):
		mask[i] = (0xAA - i*0x7) & 0xFF
	tmp = 0
	for i in range(0xF,-1,-1):
		tmp = (tmp + key[i & 0xF] + mask[i]) & 0xFF
		mask[i] = tmp
	#print "mask      : " + ("".join(map(chr,mask))).encode("hex")
	return mask

def inverse_mask(mask):
	key = [0] * 0x10
	tmp=0
	for i in range(0xF,-1,-1):
		key[i] = ((mask[i] - tmp - (0xAA-i*0x7)) & 0xFF)
		tmp = mask[i]
	return key

#data=map(ord,list(os.urandom(0x100)))
init_iv=map(ord,list(os.urandom(16)))
data=[0x41]*0x100
#init_iv=[0]*16
#key=map(ord,list(sys.argv[1].decode("hex")))
key=map(ord,list(os.urandom(16)))
encrypted=[]
decrypted=[]
hexdump("".join(map(chr,data)),"input data")

iv=init_iv
# encrypt
for i in range(0,len(data),16):
	bloc = data[i:i+16]
	bloc = inv_xor(bloc,iv)             # computed in NW
	bloc = xor(bloc,gen_mask(key,i/16)) # computed in SW
	next_iv=bloc
	iv = next_iv
	encrypted+=bloc
enc="".join(map(chr,encrypted))
hexdump(enc,"encrypted")

bytes_iv="".join(map(chr,init_iv))
open("enc.bin","wb").write(bytes_iv+enc);

# test recover key from known plaintext on bloc1
first_bloc = encrypted[:16]
unxored   = xor(first_bloc,data[:16])
unxored   = inv_xor(unxored,init_iv)
recovered_key1=inverse_mask(unxored)
a = "".join(map(chr,recovered_key1))
hexdump(a,"recovered round 0 key")
unmixed_key=unmix_key(recovered_key1)
a = "".join(map(chr,unmixed_key))
hexdump(a,"recovered key")


iv=init_iv
# decrypt
for i in range(0,len(encrypted),16):
	bloc = encrypted[i:i+16]
	next_iv=bloc
	bloc = xor(bloc,gen_mask(key,i/16)) # computed in SW
	bloc = inv_xor(bloc,iv)             # computed in NW
	iv = next_iv
	decrypted+=bloc



dec="".join(map(chr,decrypted))
hexdump(dec,"decrypted")

if decrypted == data:
	print "decryption works"
