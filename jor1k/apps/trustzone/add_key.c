#include <termios.h>
#include <fcntl.h>
#include <errno.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/ioctl.h>
#include <sys/mman.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <unistd.h>
#include <byteswap.h>

#include "includes/messages.h"
#include "includes/tee_driver.h"

int send_secure_message(struct sstic_message *message) {
	int ret_code;
	int fd = open("/dev/sstic", O_RDONLY);
	if (fd < 0) {
		printf("Can't open /dev/sstic\n");
		return 1;
	}

	ret_code = ioctl(fd, SSTIC_SEND_MSG, message);
	close(fd);
	return ret_code;
}

int check_lum(unsigned char * password) {
	int ret;
	struct sstic_message message;

	message.cmd=CMD_CHECK_KEY;
	message.data_in_len=32;
	message.data_in=password;
	message.data_out_len=0;
	message.data_out="";

	ret = send_secure_message(&message);
	if(ret != 0) {
		printf("\033[31;1mBad KEY !\033[0m\n");
		return 1;
	}else{
		printf("\033[32;1mGood KEY !\033[0m\n");
		return 0;
	}
}

int main(int argc, char ** argv) {
	int ret;
	unsigned char password[32];

	if(argc != 2) {
		printf("usage:\n%s [KEY]\n", argv[0]);
		return 1;
	}

	if(strlen(argv[1]) != 32) {
		printf("Bad KEY size\n");
		return 1;
	}

	memcpy(password, argv[1], 32);

	/* Check the password */
	ret = check_lum(password);
	if(ret != 0) {
		return 1;
	}
	return 0;
}
