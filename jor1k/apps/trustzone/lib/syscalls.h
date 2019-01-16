#ifndef _SSTIC_SYSCALL
#define _SSTIC_SYSCALL

#define SYS_write       0x01
#define SYS_readkey     0x02
#define SYS_writekey    0x03
#define SYS_AES_decrypt 0x04
#define SYS_HMAC        0x05

long TEE_write(unsigned long fd, unsigned long ptr, unsigned long size);
long TEE_writekey(unsigned char *name, unsigned char *ptr, unsigned long size, unsigned long wrapped);
long TEE_readkey(unsigned char *name, unsigned char *ptr, unsigned long size);
long TEE_AES_decrypt(unsigned char *name, unsigned char *dst_ptr, unsigned char *src_ptr, unsigned long size);
long TEE_HMAC(unsigned char *name, unsigned char *dst_ptr, unsigned char *src_ptr, unsigned long size);

#endif
