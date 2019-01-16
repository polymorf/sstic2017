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

# define ENC_HMAC_SIZE 0x70

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
			printf("bad char\n");
			return 1;
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
			printf("bad char\n");
			return 1;
		}
		dst[i] = out;
	}
	return 0;
}

int send_secure_message(struct sstic_message *message) {
	int ret_code;
	int fd = open("/dev/sstic", O_RDONLY);
	if (fd < 0) {
		printf("Can't open /dev/sstic\n");
		return 1;
	}

	ret_code = ioctl(fd, SSTIC_SEND_MSG, message);
	struct TA_out_msg *recv = message->data_out;
	if (ret_code == 0 && __bswap_32(recv->code) == 0) {
		printf("[\033[32;1m+\033[0m] OS return code = 0x%08x, TA return code = 0x%08x\n",ret_code,__bswap_32(recv->code));
	}else{
		printf("[\033[31;1m!\033[0m] OS return code = 0x%08x, TA return code = 0x%08x\n",ret_code,__bswap_32(recv->code));
	}
	close(fd);
	return ret_code + __bswap_32(recv->code);
}

void get_TA(unsigned long *TA_data, unsigned int *size) {
	struct stat statbuf;
	int ta_fd = open ("./TA.elf.signed", O_RDONLY);
	if (fstat(ta_fd,&statbuf) < 0) {
		printf("Can't stat\n");
		exit(1);
	}
	if ((*TA_data = (unsigned long)mmap (0, statbuf.st_size, PROT_READ, MAP_PRIVATE|MAP_DENYWRITE, ta_fd, 0)) == -1) {
		printf("can't mmap\n");
		exit(1);
	}
	*size = statbuf.st_size;
}

int load_TA() {
	int ret;
	unsigned long ta_data_ptr;
	unsigned int size;
	struct sstic_message message;
	struct TA_out_msg *recv = (struct TA_out_msg *)malloc(sizeof(struct TA_out_msg));
	struct TA_in_msg *send = (struct TA_in_msg*)malloc(sizeof(struct TA_in_msg));
	memset(send,0,sizeof(struct TA_in_msg));
	memset(recv,0,sizeof(struct TA_out_msg));

	get_TA(&ta_data_ptr,&size);

	message.cmd=CMD_LOAD_TA;
	message.data_in_len=size;
	message.data_in=(char *)ta_data_ptr;
	message.data_out_len=sizeof(struct TA_out_msg);
	message.data_out=recv;

	printf("[\033[34;1mi\033[0m] load TA.elf.signed in TrustedOS\n");
	ret = send_secure_message(&message);
	if(ret != 0) {
		return 1;
	}
	return 0;
}

/*
int get_TA_lum() {
	int ret;
	struct sstic_message message;
	struct TA_out_msg *recv = (struct TA_out_msg *)malloc(sizeof(struct TA_out_msg));
	struct TA_in_msg *send = (struct TA_in_msg*)malloc(sizeof(struct TA_in_msg));
	memset(send,0,sizeof(struct TA_in_msg));
	memset(recv,0,sizeof(struct TA_out_msg));

	printf("[\033[34;1mi\033[0m] Send command to Trusted App CMD_GET_TA_LUM\n");
	send->cmd = __bswap_32(CMD_GET_TA_LUM);

	message.cmd=CMD_TA_MESSAGE;
	message.data_in_len=sizeof(struct TA_in_msg);
	message.data_in=send;
	message.data_out_len=sizeof(struct TA_out_msg);
	message.data_out=recv;

	ret = send_secure_message(&message);
	if(ret == 0) {
		printf("retreived lum : \033[1m%s\033[0m\n",recv->get_lum_payload.lum);
	}
}
*/

int get_TA_version() {
	int ret;
	struct sstic_message message;
	struct TA_out_msg *recv = (struct TA_out_msg *)malloc(sizeof(struct TA_out_msg));
	struct TA_in_msg *send = (struct TA_in_msg*)malloc(sizeof(struct TA_in_msg));
	memset(send,0,sizeof(struct TA_in_msg));
	memset(recv,0,sizeof(struct TA_out_msg));

	printf("[\033[34;1mi\033[0m] Send command to Trusted App CMD_GET_TA_VERSION\n");
	send->cmd = __bswap_32(CMD_GET_TA_VERSION);

	message.cmd=CMD_TA_MESSAGE;
	message.data_in_len=sizeof(struct TA_in_msg);
	message.data_in=send;
	message.data_out_len=sizeof(struct TA_out_msg);
	message.data_out=recv;

	ret = send_secure_message(&message);
	if(ret == 0) {
		printf("retreived version : \033[1m%s\033[0m\n",recv->get_version_payload.version);
	}
}

int check_password(unsigned char * password, char *password_encrypted_hmac) {
	int ret;
	struct sstic_message message;
	struct TA_out_msg *recv = (struct TA_out_msg *)malloc(sizeof(struct TA_out_msg));
	struct TA_in_msg *send = (struct TA_in_msg*)malloc(sizeof(struct TA_in_msg));
	memset(send,0,sizeof(struct TA_in_msg));
	memset(recv,0,sizeof(struct TA_out_msg));

	printf("[\033[34;1mi\033[0m] check password in TEE\n");
	send->cmd = __bswap_32(CMD_CHECK_PASSWORD);
	memcpy(send->check_password_payload.encrypted_hmac,password_encrypted_hmac,ENC_HMAC_SIZE);
	memcpy(send->check_password_payload.password,password,16);

	send->check_password_payload.password_len = __bswap_16(16);
	send->check_password_payload.encrypted_hmac_len = __bswap_16(ENC_HMAC_SIZE);

	message.cmd=CMD_TA_MESSAGE;
	message.data_in_len=sizeof(struct TA_in_msg);
	message.data_in=send;
	message.data_out_len=sizeof(struct TA_out_msg);
	message.data_out=recv;

	ret = send_secure_message(&message);
	if(ret != 0) {
		if(ret == -1) {
			printf("Cannot decrypt password blob\n");
		}
		if(ret == -2) {
			printf("\033[31;1mBad password :(\033[0m\n");
		}
		return 1;
	}else{
		printf("\033[32;1mGood password !\033[0m\n");
		return 0;
	}
}

int unload_TA() {
	int ret;
	struct sstic_message message;
	struct TA_out_msg *recv = (struct TA_out_msg *)malloc(sizeof(struct TA_out_msg));
	struct TA_in_msg *send = (struct TA_in_msg*)malloc(sizeof(struct TA_in_msg));
	memset(send,0,sizeof(struct TA_in_msg));
	memset(recv,0,sizeof(struct TA_out_msg));

	/* Unload the TA */
	printf("[\033[34;1mi\033[0m] Unload TA form TrustedOS\n");
	message.cmd=CMD_UNLOAD_TA;
	message.data_in_len=sizeof(struct TA_in_msg);
	message.data_in=send;
	message.data_out_len=sizeof(struct TA_out_msg);
	message.data_out=recv;

	ret = send_secure_message(&message);
}

int decrypt_block(unsigned char *dst, unsigned char *block,unsigned int block_id) {
	int ret;
	struct sstic_message message;
	struct TA_out_msg *recv = (struct TA_out_msg *)malloc(sizeof(struct TA_out_msg));
	struct TA_in_msg *send = (struct TA_in_msg*)malloc(sizeof(struct TA_in_msg));
	memset(send,0,sizeof(struct TA_in_msg));
	memset(recv,0,sizeof(struct TA_out_msg));

	printf("[\033[34;1mi\033[0m] Send command to Trusted App CMD_DECRYPT_BLOCK\n");
	send->cmd = __bswap_32(CMD_DECRYPT_BLOCK);

	message.cmd=CMD_TA_MESSAGE;
	message.data_in_len=sizeof(struct TA_in_msg);
	message.data_in=send;
	message.data_out_len=sizeof(struct TA_out_msg);
	message.data_out=recv;

	send->decrypt_block_payload.block_id = __bswap_32(block_id);
	memcpy(send->decrypt_block_payload.ciphertext_block,block,16);

	ret = send_secure_message(&message);
	memcpy(dst,recv->decrypt_block_payload.cleartext_block,16);
}

static inline void inv_xor(unsigned char *out, unsigned char *in1, unsigned char *in2, unsigned int len) {
	int i=0;
	for(i=0;i<len;i++) {
		out[i] = in1[i] ^ in2[len-i-1];
	}
}
int decrypt_file(int in_fd, char *decrypted_filename) {
	char IV[16];
	char block[16];
	char buf1[16];
	char buf2[16];
	struct stat statbuf;
	int out_fd = open (decrypted_filename, O_WRONLY|O_CREAT,S_IRUSR|S_IWUSR);
	if(out_fd < 0) {
		printf("Can't open %s for writing\n",decrypted_filename);
		return 1;
	}
	if (fstat(in_fd,&statbuf) < 0) {
		printf("Can't stat\n");
		return 1;
	}
	int size;
	size = read(in_fd,IV,16);
	if (size != 16) {
		printf("Can't read IV\n");
		return 1;
	}
	int id=0;
	while(1) {
		size = read(in_fd,block,16);
		if(size==0) {
			break;
		}
		if(size!=16) {
			printf("Bad block size");
			break;
		}
		decrypt_block(buf1,block,id); /* decrypt block in trustzone */
		inv_xor(buf2,buf1,IV,16);     /* CBC like */
		write(out_fd,buf2,size);
		memcpy(IV,block,16);          /* next IV, is the current ciphertext */
		id++;
	}
	close(out_fd);
}

int main(int argc, char ** argv) {
	int ret;
	unsigned char password[16];

	if(argc != 4) {
		printf("usage:\n%s [password] [encrypted file] [destination file]\n", argv[0]);
		return 1;
	}

	if(strlen(argv[1]) != 32) {
		printf("Bad password len\n");
		return 1;
	}

	ret = decode_hex(argv[1], password, 16);
	if(ret != 0) {
		printf("Can't decode password\n");
		return 1;
	}

	/* LOAD TA */
	ret = load_TA();
	if(ret != 0) {
		printf("Can't load TA\n");
		return 1;
	}

	/* Get TA version */
	get_TA_version();
	//get_TA_lum();

	int in_fd = open (argv[2], O_RDONLY);
	if(in_fd < 0) {
		printf("Can't open %s for reading\n",argv[2]);
		return 1;
	}

	char password_encrypted_hmac[ENC_HMAC_SIZE];
	int size = read(in_fd,password_encrypted_hmac,ENC_HMAC_SIZE);
	if(size != ENC_HMAC_SIZE) {
		printf("Can't read encrypted hmac from %s\n",argv[2]);
		return 1;
	}


	/* Check the password */
	ret = check_password(password,password_encrypted_hmac);
	if(ret != 0) {
		goto unload;
	}

	decrypt_file(in_fd,argv[3]);
	close(in_fd);

unload:
	unload_TA();
	return 0;
}
