import ctypes
import fcntl
import sys

class tee_message(ctypes.Structure):
    CMD_GET_VERSION = 0x0001
    CMD_LOAD_TA     = 0x0002
    CMD_TA_MESSAGE  = 0x0003
    CMD_UNLOAD_TA   = 0x0004
    CMD_CHECK_LUM   = 0x0005
    CMD_CHECK_KEY   = 0x0006
    MAX_LEN         = 8192
    _fields_ = [
        ('cmd', ctypes.c_int),
        ('data_in_len', ctypes.c_int),
        ('data_in', ctypes.c_char_p),
        ('data_out_len', ctypes.c_int),
        ('data_out', ctypes.c_char_p),
    ]

def get_version():
	tee_msg = tee_message()
	tee_msg.cmd = tee_message.CMD_GET_VERSION
	tee_msg.data_in_len = 0
	tee_msg.data_in = ctypes.c_char_p("\x00"*0)
	tee_msg.data_out_len = tee_message.MAX_LEN
	tee_msg.data_out = ctypes.c_char_p('\x00'*tee_message.MAX_LEN)

	devicehandle = open('/dev/sstic', 'r')
	version = None

	try:
		fcntl.ioctl(devicehandle, 0xc0145300, tee_msg)
		version = tee_msg.data_out[:tee_msg.data_out_len]
	except:
		pass
	finally:
		devicehandle.close()
		return version

def add_key_or_lum(cmd, value):
	tee_msg = tee_message()
	tee_msg.cmd = cmd
	tee_msg.data_in_len = len(value)
	tee_msg.data_in = ctypes.c_char_p(value)
	tee_msg.data_out_len = 0
	tee_msg.data_out = ctypes.c_char_p('\x00'*0)

	devicehandle = open('/dev/sstic', 'r')
	success = True

	try:
		fcntl.ioctl(devicehandle, 0xc0145300, tee_msg)
	except:
		success = False
	finally:
		devicehandle.close()
		return success

def add_lum(lum):
	return add_key_or_lum(tee_message.CMD_CHECK_LUM, lum)

def add_key(key):
	return add_key_or_lum(tee_message.CMD_CHECK_KEY, key)
