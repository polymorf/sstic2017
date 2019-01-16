#ifndef _SSTIC_UTILS
#define _SSTIC_UTILS

//void memset(unsigned char * src, unsigned char value, unsigned int len);
int decode_hex(char * src, char * dst, int len);
int memcmp(const void *s1, const void *s2, int n);
//int itoa(int num, unsigned char* str, int len, int base);
//char * toHex(unsigned char * str, unsigned int len);
unsigned long strlen(const char * str);
void print(unsigned char *str);
//void print_buf(unsigned char *name, unsigned char *buf, unsigned int len);
#endif
