#!/usr/bin/python2
import base64
import zlib
import sys
import os
from bpf import *

interface="lo"
bpf_prog = "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"
sock = create_raw_socket(interface)

# decompress bpf program
bpf_prog = base64.b64decode(bpf_prog)
bpf_prog = zlib.decompress(bpf_prog)


# create_bpf_table
table_fd = bpf_map_create()
print("table_fd = %d" % (table_fd))
if table_fd < 0:
	print("can't create map")
	sys.exit(1)
bpf_patched_prog=bpf_patcher(bpf_prog,table_fd)
# load bpf program
bpf_fd = load_bpf_program(bpf_patched_prog, debug=True)
if bpf_fd > 0:
	print("bpf successfully loaded")
else:
	print("bpf load error")
	sys.exit(1)

# attach the bpf program to the raw socket
bpf_attach_socket(sock.fileno(), bpf_fd)

# empty the recv queue
sock.setblocking(0)
while 1:
	try:
		d = os.read(sock.fileno(),2048)
	except:
		break

# start the main loop
sock.setblocking(True)
while 1:
	packet_str = os.read(sock.fileno(),2048)
	packet_bytearray = bytearray(packet_str)
	ETH_HLEN = 2*6 + 2
	ip_header_length = (packet_bytearray[ETH_HLEN] & 0xF) << 2
	udp_header_length = 8
	udp_offset = ETH_HLEN + ip_header_length
	payload_size = struct.unpack(">H",packet_str[udp_offset+4:udp_offset+6])[0] - 8
	payload_offset = ETH_HLEN + ip_header_length + udp_header_length
	payload = packet_str[payload_offset:payload_offset+payload_size]

	state = bpf_map_lookup(table_fd)

	if state == 1:
		lum = payload
		print("Good job!, you find a LUM : "+lum)
		try:
			sys.path.append("/challenges/tools/")
			from tee_client import add_lum
			add_lum(lum)
		except:
			pass
	elif state == 2:
		key = payload[4:36]
		print("Good job!, key is : "+key)
		try:
			sys.path.append("/challenges/tools/")
			from tee_client import add_key
			add_key(key)
		except:
			pass
	else:
		print("Strange state !")
