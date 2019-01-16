import struct
import sys
from scapy.all import *

ascii=1

def xor(key,data):
	out=""
	for i,c in enumerate(data):
		out+=chr(ord(c)^ord(key[i%len(key)]))
	return out

conf.iface="lo"

lum="LUM{BvWQEdCrMfA}"
print lum
pkt1 = IP(dst="127.0.0.1")/UDP(sport=1338,dport=1337)/Raw(lum)
send(pkt1, verbose=False)

udp_len = 5 + 16 + 8 + 16
if ascii:
	udp_len = 5 + 32 + 8

key_start="KEY{"
key1 = struct.pack(">I",(((0x706f6c79 * udp_len)&0xFFFFFFFF) ^ 0x53535449))
key2 = struct.pack(">I",(0x43204348 - (0x6d6f7266 / udp_len))&0xFFFFFFFF)
key3 = struct.pack(">I",0x41bfa3fb)
key4 = struct.pack(">I",0x93865b44)
key_end='}'

p = key1+key2+key3+key4
xor_key = xor("FFFFFFFFFFFFFFFF".decode("hex"),lum[4:12])
p = xor(xor_key,p)
print p.encode("hex")

payload = key_start + p + key_end
if ascii:
	payload = key_start + p.encode("hex") + key_end
print payload
pkt2 = IP(dst="127.0.0.1")/UDP(sport=1338,dport=1337)/Raw(payload)
send(pkt2, verbose=False)
