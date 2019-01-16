#define MAX_INPUT_SIZE  3*1024-4
#define MAX_OUTPUT_SIZE 3*1024-4

#define MAX_VERSION_LEN 256
#define MAX_PASSWORD_LEN 16
#define MAX_ENCRYPTED_HMAC_LEN 256
#define BLOCK_SIZE 16

#define CMD_TA_INIT         0x0000
#define CMD_GET_TA_VERSION  0x0001
#define CMD_CHECK_PASSWORD  0x0002
#define CMD_DECRYPT_BLOCK   0x0003
#define CMD_GET_TA_LUM      0x0004

struct TA_in_check_password {
	unsigned short password_len;
	unsigned char password[MAX_PASSWORD_LEN];
	unsigned short encrypted_hmac_len;
	unsigned char encrypted_hmac[MAX_ENCRYPTED_HMAC_LEN];
};

struct TA_out_check_password {
};

struct TA_in_decrypt_block {
	unsigned int  block_id;
	unsigned char ciphertext_block[BLOCK_SIZE];
};

struct TA_out_decrypt_block {
	unsigned int  block_id;
	unsigned char cleartext_block[BLOCK_SIZE];
};

struct TA_in_getversion {
};

struct TA_out_getversion {
	char version[MAX_VERSION_LEN];
};

struct TA_in_getlum {
};

struct TA_out_getlum {
	char lum[17];
};

struct TA_in_msg {
	int cmd;
	union {
		struct TA_in_check_password check_password_payload;
		struct TA_in_getversion     get_version_payload;
		struct TA_in_getlum         get_lum_payload;
		struct TA_in_decrypt_block  decrypt_block_payload;
	};
};
struct TA_out_msg {
	int code;
	union {
		struct TA_out_check_password check_password_payload;
		struct TA_out_getversion     get_version_payload;
		struct TA_out_getlum         get_lum_payload;
		struct TA_out_decrypt_block  decrypt_block_payload;
	};
};

