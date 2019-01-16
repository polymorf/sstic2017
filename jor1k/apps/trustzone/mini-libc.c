#include <stdlib.h>
#include <stdio.h>


long syscall(long n, long a, long b, long c, unsigned long* ret)
{
	register unsigned long r11 __asm__("r11") = n;
	register unsigned long r3 __asm__("r3") = a;
	register unsigned long r4 __asm__("r4") = b;
	register unsigned long r5 __asm__("r5") = c;
	__asm__ __volatile__ ("l.sys 1"
			      : "=r"(r11)
			      : "r"(r11), "r"(r3), "r"(r4), "r"(r5)
			      : "memory", "r1", "r2", "r6", "r7", "r8",
				"r12", "r13", "r15", "r17", "r19", "r21",
				"r23", "r25", "r27", "r29", "r31");
	*ret = r11;
}
