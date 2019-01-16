import ctypes
import base64
import zlib
import sys
import os
import platform
from socket import socket, AF_PACKET, SOCK_RAW, htons

class bpf_prog_load_attr(ctypes.Structure):
	_fields_ = [
		('prog_type', ctypes.c_uint),
		('insn_cnt', ctypes.c_uint),
		('insns',ctypes.c_uint64),
		('license',ctypes.c_uint64),
		('log_level', ctypes.c_uint),
		('log_size', ctypes.c_uint),
		('log_buf',ctypes.c_uint64),
		('kern_version', ctypes.c_uint),
	]

class bpf_map_create_attr(ctypes.Structure):
	_fields_ = [
		('map_type', ctypes.c_uint),
		('key_size', ctypes.c_uint),
		('value_size',ctypes.c_uint),
		('max_entries',ctypes.c_uint),
	]

class bpf_attr(ctypes.Union):
	_fields_ = [
		("prog_load",bpf_prog_load_attr),
		("map_create",bpf_map_create_attr),
	]


def bpf_syscall(bpf_type,attr):
	__NR_bpf = 0
	libc = None
	arch = platform.machine()
	if arch == "openrisc":
		__NR_bpf = 280
		libc = ctypes.CDLL("/challenges/dont_let_him_escape/mini-libc.so")
	elif arch == "x86_64":
		__NR_bpf = 321
		libc = ctypes.CDLL(None)
	else:
		print "untested arch %s" % (arch)
		sys.exit(1)
	syscall = libc.syscall
	ret = syscall(__NR_bpf, bpf_type, ctypes.pointer(attr), ctypes.sizeof(attr))
	return ret

def bpf_state_map_create():
	BPF_MAP_CREATE = 0
	BPF_MAP_TYPE_HASH = 1
	bpf_insn_size = 8

	attr = bpf_attr()
	attr.map_create.map_type = BPF_MAP_TYPE_HASH
	attr.map_create.key_size = 1
	attr.map_create.value_size = 1
	attr.map_create.max_entries = 1
	return bpf_syscall(BPF_MAP_CREATE, attr)

def load_bpf_program(bpf_prog):
	BPF_PROG_LOAD = 5
	BPF_PROG_TYPE_SOCKET_FILTER = 1
	bpf_insn_size = 8

	attr = bpf_attr()
	attr.prog_load.prog_type = BPF_PROG_TYPE_SOCKET_FILTER
	attr.prog_load.insns = ctypes.c_void_p.from_buffer(ctypes.c_char_p(bpf_prog)).value
	attr.prog_load.insn_cnt = len(bpf_prog) / bpf_insn_size
	attr.prog_load.log_size = 0
	attr.prog_load.log_buf = 0
	attr.prog_load.kernel_version = 264203
	attr.prog_load.license = ctypes.c_void_p.from_buffer(ctypes.c_char_p("GPL")).value
	return bpf_syscall(BPF_PROG_LOAD, attr)

def bpf_attach_socket(fd, prog_fd):
	SOL_SOCKET = 1
	SO_ATTACH_BPF = 50

	libc = ctypes.CDLL(None)
	setsockopt = libc.setsockopt
	prog_fd = ctypes.c_uint(prog_fd)
	setsockopt(fd, SOL_SOCKET, SO_ATTACH_BPF, ctypes.pointer(prog_fd), ctypes.sizeof(prog_fd))

def create_raw_socket(interface):
	ETH_P_ALL = 3
	s = socket(AF_PACKET, SOCK_RAW, htons(ETH_P_ALL))
	s.bind((interface, ETH_P_ALL))
	return s


interface="lo"
bpf_prog = "eNrtVs1rE0EUf9Mk7LaINUhNzMEGFS2CmoogglLTpVoxYqSG4MGbNJdKPwLqdiloQZCcelEPIqJWqiB4zHEO/gfiwYOHeutF7MFD2rRd38x7cT8SSYoXEReW3755H/Pm/X6ZVu4B/VRNwgF8d+BbgIwAXMvgd0Lbx0Sc/bvwld0Ur/w7lW14+Qd1/IA4HQNICoCa67rAT+9ewhLGdyEWEc8g9tu0LqcJDcxTrTmpVdffX7lCtZLYTBS8R77kPCyK27kP8FvoPvo4b2ubeXFoGf+G402Kl6/YjgBsKXue5xmlOqpeV6s6HNfYLwYRbU8LWu8TZ6kP8SPATwnnnka8w1jorms+nNkVfT57ieal5qvjGPNTvC/zZi9RvGEQvw2//YLWixjn6vrfIadsYBu+4Yt1mEf5hM+PdVKI57iO07Pshv37A/7VJv8+n7+hJwP7SCKOLni6Ses+Kf9KgtaVzuay45fV94x1c+RG4jOfh/ooCZ4HY0F8gqvF28P6XK4610dwMLsqiI9yapN0x3yUUxtt9bMR0sMm2tWox7PWAeumkR+DD234lVrBHfPLvx+Pr3dwSa3znORdwgsmnTN/j9d5f2l7c1f95heCulE8RXz7efs8Byegm2dwXdkm2+ZTGAnp7kjLOo9hTsW9XWnSx6E/1Jdfn9J336m6knk+jGhPTE69v898NOlmHi5eGxurYr3xmclbQz6dav3yvHqNoF4bPBWMWRi10pa9yDxG2c8os5R3PM66RhKOvj5f+aW33YRDBziOsX8wmNcuTlq/8Z/cXp1/Ji7bWVxBDEM2l0vbi8sd8/f14cSX//z9Lfz1wInM4CnvXq+7hOtt7/f10P1eRzsGVuj/kzWqV6m1rVcL1Vtr8fdC8v38iPN/AlbjK8U="
sock = create_raw_socket(interface)

# decompress bpf program
bpf_prog = base64.b64decode(bpf_prog)
bpf_prog = zlib.decompress(bpf_prog)

# create_bpf_table
table_fd = bpf_state_map_create()
if table_fd < 0:
	print "can't create map"
	sys.exit(1)
# patch the program to use the correct table
bpf_patched_prog=""
for i in range(0,len(bpf_prog), 8):
	code = bpf_prog[i:i+8]
	if code.startswith("\x18\x11"):
		code = "\x18\x11\x00\x00"+chr(table_fd)+"\x00\x00\x00"
	bpf_patched_prog+=code

# load bpf program
bpf_fd = load_bpf_program(bpf_patched_prog)
if bpf_fd > 0:
	print "bpf successfully loaded"
else:
	print "bpf load error"
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
	payload_offset = ETH_HLEN + ip_header_length + udp_header_length
	payload = packet_str[payload_offset:]

	if payload.startswith("LUM{"):
		print("Good job!, you find a LUM : "+payload)
	else:
		key = payload[4:20].encode("hex")
		print("Good job!, key is : "+key)
