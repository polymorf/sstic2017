#include "syscalls.h"

long TEE_write(unsigned long fd, unsigned long ptr, unsigned long size) {
	register long a0 asm("a0") = fd; /* not supported */
	register long a1 asm("a1") = ptr;
	register long a2 asm("a2") = size;
	register long a7 asm("a7") = SYS_write;
	asm volatile ("scall" : "+r"(a0) : "r"(a1), "r"(a2), "r"(a7));
	return a0;
}

long TEE_readkey(unsigned char *name, unsigned char *ptr, unsigned long size) {
	register long a0 asm("a0") = (unsigned long)name;
	register long a1 asm("a1") = (unsigned long)ptr;
	register long a2 asm("a2") = size;
	register long a7 asm("a7") = SYS_readkey;
	asm volatile ("scall" : "+r"(a0) : "r"(a1), "r"(a2), "r"(a7));
	return a0;
}

long TEE_writekey(unsigned char *name, unsigned char *ptr, unsigned long size, unsigned long wrapped) {
	register long a0 asm("a0") = (unsigned long)name;
	register long a1 asm("a1") = (unsigned long)ptr;
	register long a2 asm("a2") = size;
	register long a3 asm("a3") = wrapped;
	register long a7 asm("a7") = SYS_writekey;
	asm volatile ("scall" : "+r"(a0) : "r"(a1), "r"(a2), "r"(a3), "r"(a7));
	return a0;
}

long TEE_AES_decrypt(unsigned char *name, unsigned char *dst_ptr, unsigned char *src_ptr, unsigned long size) {
	register long a0 asm("a0") = (unsigned long)name;
	register long a1 asm("a1") = (unsigned long)dst_ptr;
	register long a2 asm("a2") = (unsigned long)src_ptr;
	register long a3 asm("a3") = size;
	register long a7 asm("a7") = SYS_AES_decrypt;
	asm volatile ("scall" : "+r"(a0) : "r"(a1), "r"(a2), "r"(a3), "r"(a7));
	return a0;
}

long TEE_HMAC(unsigned char *name, unsigned char *dst_ptr, unsigned char *src_ptr, unsigned long size) {
	register long a0 asm("a0") = (unsigned long)name;
	register long a1 asm("a1") = (unsigned long)dst_ptr;
	register long a2 asm("a2") = (unsigned long)src_ptr;
	register long a3 asm("a3") = size;
	register long a7 asm("a7") = SYS_HMAC;
	asm volatile ("scall" : "+r"(a0) : "r"(a1), "r"(a2), "r"(a3), "r"(a7));
	return a0;
}
