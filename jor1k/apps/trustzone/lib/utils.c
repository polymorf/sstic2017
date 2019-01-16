#include "utils.h"
#include "syscalls.h"

/*
void memset(unsigned char * src, unsigned char value, unsigned int len) {
	int pos=0;
	for(pos=0;pos<len;pos++) {
		src[pos]=0;
	}
}
*/

int decode_hex(char * src, char * dst, int len) {
	int i;
	unsigned char out,c1,c2;
	for(i=0; i<len; i++) {
		out=0;
		c1 = src[i*2];
		c2 = src[i*2+1];
		// A-Z
		if ( c1 > 64 && c1 < 71 ) {
			out+=(c1-65+0xA)<<4;
		// a-z
		}else if( c1 > 96 && c1 < 103) {
			out+=(c1-97+0xA)<<4;
		// 0-9
		}else if( c1 > 47 && c1 < 58) {
			out+=(c1-48)<<4;
		}else{
			return 0;
		}
		// A-Z
		if ( c2 > 64 && c2 < 71 ) {
			out+=(c2-65+0xA);
		// a-z
		}else if( c2 > 96 && c2 < 103) {
			out+=(c2-97+0xA);
		// 0-9
		}else if( c2 > 47 && c2 < 58) {
			out+=(c2-48);
		}else{
			return 0;
		}
		dst[i] = out;
	}
	return 1;
}

int memcmp(const void *s1, const void *s2, int n) {
    unsigned char u1, u2;
    for ( ; n-- ; s1++, s2++) {
	u1 = * (unsigned char *) s1;
	u2 = * (unsigned char *) s2;
	if ( u1 != u2) {
	    return (u1-u2);
	}
    }
    return 0;
}

/*
inline void strrev(unsigned char *str) {
	int i;
	int j;
	unsigned char a;
	unsigned len = strlen((const char *)str);
	for (i = 0, j = len - 1; i < j; i++, j--)
	{
		a = str[i];
		str[i] = str[j];
		str[j] = a;
	}
}

int itoa(int num, unsigned char* str, int len, int base)
{
	int sum = num;
	int i = 0;
	int digit;
	if (len == 0)
		return -1;
	do
	{
		digit = sum % base;
		if (digit < 0xA)
			str[i++] = '0' + digit;
		else
			str[i++] = 'A' + digit - 0xA;
		sum /= base;
	}while (sum && (i < (len - 1)));
	if (i == (len - 1) && sum)
		return -1;
	str[i] = '\0';
	strrev(str);
	return 0;
}
*/

/*
char * toHex(unsigned char * str, unsigned int len) {
	char out[len*2+1];
	out[len*2]='\0';
	char *p = out;
	int i = 0;
	int temp;
	for(i=0; i<len; i++) {
		temp=(str[i]&0xF0)>>4;
		if(temp < 0xA) {
			out[i*2] = temp+0x30;
		}else{
			out[i*2] = temp+0x41-0xA;
		}
		temp=(str[i]&0x0F);
		if(temp < 0xA) {
			out[i*2+1] = temp+0x30;
		}else{
			out[i*2+1] = temp+0x41-0xA;
		}
	}
	return p;
}
*/

/* strlen */
unsigned long strlen(const char * str) {
	unsigned long count=0;
	while(*str) {
		count++;
		str++;
	}
	return count;
	//return 0x13;
}

/* print */
void print(unsigned char *str) {
	TEE_write(1,(unsigned long)str,strlen(str));
}

/*
void print_buf(unsigned char *name, unsigned char *buf, unsigned int len) {
	print(name);
	print(toHex(buf,len));
	print("\r\n");
}
*/
