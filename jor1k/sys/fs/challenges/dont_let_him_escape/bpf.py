import ctypes
import base64
import zlib
import sys
import os
import platform
import struct
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

class bpf_map_lookup_attr(ctypes.Structure):
	_fields_ = [
		('map_fd', ctypes.c_uint),
		('_force_64bitalign', ctypes.c_uint),
		('key', ctypes.c_uint64),
		('value', ctypes.c_uint64),
		('flags', ctypes.c_uint64),
	]

class bpf_attr(ctypes.Union):
	_fields_ = [
		("prog_load",bpf_prog_load_attr),
		("map_create",bpf_map_create_attr),
		("map_lookup",bpf_map_lookup_attr),
	]


def bpf_syscall(bpf_type,attr):
	__NR_bpf = 0
	ret = 0
	libc = None
	arch = platform.machine()
	if arch == "openrisc":
		__NR_bpf = 280
		libc = ctypes.CDLL("/challenges/dont_let_him_escape/mini-libc.so")
		syscall = libc.syscall
		return_value = ctypes.c_int(0)
		syscall(__NR_bpf, bpf_type, ctypes.pointer(attr), ctypes.sizeof(attr), ctypes.pointer(return_value))
		ret = return_value.value
	elif arch == "x86_64":
		__NR_bpf = 321
		libc = ctypes.CDLL(None)
		syscall = libc.syscall
		ret = syscall(__NR_bpf, bpf_type, ctypes.pointer(attr), ctypes.sizeof(attr))
	else:
		print("untested arch %s" % (arch))
		sys.exit(1)
	return ret

def bpf_map_lookup(fd):
	BPF_MAP_LOOKUP_ELEM = 1

	attr = bpf_attr()
	key = ctypes.c_uint64(0)
	value = ctypes.c_uint64(0)
	attr.map_lookup.map_fd = ctypes.c_uint(fd)
	attr.map_lookup.key = ctypes.c_void_p.from_buffer(ctypes.pointer(key)).value
	attr.map_lookup.value = ctypes.c_void_p.from_buffer(ctypes.pointer(value)).value
	ret = bpf_syscall(BPF_MAP_LOOKUP_ELEM, attr)
	if ret == 0:
		return int(value.value)
	else:
		print("bpf_map_lookup error")
		return None

def bpf_map_create():
	BPF_MAP_CREATE = 0
	BPF_MAP_TYPE_HASH = 1

	attr = bpf_attr()
	attr.map_create.map_type = BPF_MAP_TYPE_HASH
	attr.map_create.key_size = 8
	attr.map_create.value_size = 8
	attr.map_create.max_entries = 8
	return bpf_syscall(BPF_MAP_CREATE, attr)

def load_bpf_program(bpf_prog,debug=False):
	BPF_PROG_LOAD = 5
	BPF_PROG_TYPE_SOCKET_FILTER = 1
	bpf_insn_size = 8

	attr = bpf_attr()
	attr.prog_load.prog_type = BPF_PROG_TYPE_SOCKET_FILTER
	attr.prog_load.insns = ctypes.c_void_p.from_buffer(ctypes.c_char_p(bpf_prog)).value
	attr.prog_load.insn_cnt = len(bpf_prog) / bpf_insn_size
	attr.prog_load.log_level = 0
	attr.prog_load.log_size = 0
	attr.prog_load.log_buf = 0
	if debug:
		attr.prog_load.log_level = 1
		log = ctypes.c_char_p("\x00"*102400)
		attr.prog_load.log_size = 102400
		attr.prog_load.log_buf = ctypes.c_void_p.from_buffer(log).value
	attr.prog_load.kernel_version = 264203
	attr.prog_load.license = ctypes.c_void_p.from_buffer(ctypes.c_char_p("GPL")).value
	ret = bpf_syscall(BPF_PROG_LOAD, attr)
	if debug:
		if ret < 0:
			print("BPF load error : %s" % (log.value))
	return ret

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

# patch the program to use the correct table, and the good endianness
def bpf_patcher(prog, table_fd):
	new=""
	endian="big"
	if struct.pack("=I",1) == "\x01\x00\x00\x00":
		endian="little"
	for i in range(0,len(prog),8):
		instru = prog[i:i+8]
		opcode = instru[0]
		registers = ord(instru[1])
		off = instru[2:4]
		imm = instru[4:8]
		if opcode == "\x18" and ((registers & 0xF0) >> 4) != 0:
			imm = struct.pack("<I",table_fd)
		if endian == "big":
			new += opcode + chr( (registers&0xF)<<4 | (registers&0xF0)>>4 ) + off[::-1] + imm[::-1]
		else:
			new += opcode + chr(registers) + off + imm
	return new
