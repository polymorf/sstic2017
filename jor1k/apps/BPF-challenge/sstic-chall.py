from __future__ import print_function
from bcc import BPF
from sys import argv

import sys
import socket
import os

#arguments
interface="lo"

print ("binding socket to '%s'" % interface)

bpf = BPF(src_file = "sstic-chall.c",debug = 0,cflags=["-O3"])
function_http_filter = bpf.load_func("sstic_filter", BPF.SOCKET_FILTER)
#sys.exit()

BPF.attach_raw_socket(function_http_filter, interface)

socket_fd = function_http_filter.sock

sock = socket.fromfd(socket_fd,socket.PF_PACKET,socket.SOCK_RAW,socket.IPPROTO_IP)
sock.setblocking(True)

while 1:
  packet_str = os.read(socket_fd,2048)

  packet_bytearray = bytearray(packet_str)
  
  ETH_HLEN = 14 

  total_length = packet_bytearray[ETH_HLEN + 2]               #load MSB
  total_length = total_length << 8                            #shift MSB
  total_length = total_length + packet_bytearray[ETH_HLEN+3]  #add LSB
  
  ip_header_length = packet_bytearray[ETH_HLEN]               #load Byte
  ip_header_length = ip_header_length & 0x0F                  #mask bits 0..3
  ip_header_length = ip_header_length << 2                    #shift to obtain length

  udp_header_length = 8
  
  payload_offset = ETH_HLEN + ip_header_length + udp_header_length
  print(repr(packet_str[payload_offset:]))
  state = bpf.get_table("current_state")
  print(state.values())
  print("State = %016x" % state.values()[0].value)
  print("XOR1 = %016x"  % state.values()[1].value)
  print("XOR2 = %016x"  % state.values()[2].value)

