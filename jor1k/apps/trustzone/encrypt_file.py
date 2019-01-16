# coding: utf8
import string
import os
import struct
import sys

from Crypto.Hash import HMAC
from Crypto.Cipher import AES
from Crypto.Hash import SHA256

aes_key  = "___SSTIC_2017___"
hmac_key = "LUM{0qvYH:QI?K6}"

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

file_data = open(sys.argv[1],"rb").read()
pad_len = 16-(len(file_data)%16)
file_data += chr(pad_len)*pad_len

# ---------------------------------------------------------
good_password=os.urandom(16);

if len(sys.argv) > 2 and len(sys.argv[2]) == 32:
	good_password=sys.argv[2].decode("hex")

print "Good Password is "+good_password.encode("hex")

h = HMAC.new(hmac_key,digestmod=SHA256)
h.update(good_password)
hmac = h.hexdigest()

password_blob="==BEGIN PASSWORD HMAC==\r\n"+hmac+"\r\n==END PASSWORD HMAC=="
print len(password_blob)

aes = AES.new(aes_key, AES.MODE_ECB)
encrypted_hmac = aes.encrypt(password_blob)
# ---------------------------------------------------------

data=map(ord,list(file_data))
init_iv=map(ord,list(os.urandom(16)))
key=map(ord,list(good_password))
encrypted=[]
decrypted=[]

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

bytes_iv="".join(map(chr,init_iv))
open(sys.argv[1]+".encrypted","wb").write(encrypted_hmac + bytes_iv + enc);
