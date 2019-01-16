#include "lib/utils.h"
#include "lib/syscalls.h"
#include "includes/messages.h"

#define AES_BLOCK_SZ	16
#define AES_BLOCK_BITLEN	(AES_BLOCK_SZ * 8)
#define AES_KEY_BITLEN(kl)	(kl * 8)
#define AES_ROUNDS(kl)		((AES_KEY_BITLEN(kl) / 32) + 6)
#define AES_MAXROUNDS		14

typedef unsigned int __u32;
static inline __u32 ror32(__u32 word, unsigned int shift) {
	return (word >> shift) | (word << (32 - shift));
}

static inline void mix_key(unsigned char *mixed_key,unsigned int bloc_id) {
	char key[16];
	TEE_readkey("SSTIC_CUSTOM_KEY",key,16);
	unsigned int *inkey = (unsigned int *)key;
	unsigned int *outkey = (unsigned int *)mixed_key;
	outkey[0] = ror32( (inkey[0] & 0xADAAA9AA) + (inkey[2] & 0x52555655), (13+bloc_id)%32 );
	outkey[1] = ror32( (inkey[1] & 0xADAAA9AA) + (inkey[3] & 0x52555655), (17+bloc_id)%32 );
	outkey[2] = ror32( (inkey[0] & 0x52555655) + (inkey[2] & 0xADAAA9AA), (19+bloc_id)%32 );
	outkey[3] = ror32( (inkey[1] & 0x52555655) + (inkey[3] & 0xADAAA9AA), (23+bloc_id)%32 );
}

static inline void gen_mask(char *mask,unsigned int block_id) {
	char mixed_key[16];
	mix_key(mixed_key,block_id);
	int i, tmp;
	tmp=0;

	for(i=0;i<16;i++) {
		mask[i] = (0xAA - i*7)&0xFF;
	}
	for(i=0xF;i>=0;i--) {
		tmp = (tmp + mixed_key[i] + mask[i]) & 0xFF;
		mask[i] = tmp;
	}
}
static inline void xor(unsigned char *out, unsigned char *in1, unsigned char *in2, unsigned int len) {
	int i;
	for(i=0;i<len;i++) {
		out[i] = in1[i] ^ in2[i];
	}
}

static void decrypt_block(unsigned char *clearblock, unsigned char *cipherblock, unsigned int block_id) {
	char mask[16];
	gen_mask(mask,block_id);
	xor(clearblock,cipherblock,mask,16);
}

static int check_password(unsigned char *password, unsigned int password_len, unsigned char *encrypted_hmac, unsigned int encrypted_hmac_len) {
	unsigned char hmac_blob[MAX_ENCRYPTED_HMAC_LEN];
	unsigned char computed_hmac[32];
	unsigned char hmac[32];

	TEE_AES_decrypt("SSTIC_AES_KEY",hmac_blob,encrypted_hmac,encrypted_hmac_len);

	if (memcmp(hmac_blob,"==BEGIN PASSWORD HMAC==\r\n",25)) {
		print("[DEBUG] Bad HMAC_BLOB\r\n");
		return -1;
	}
	if (memcmp(hmac_blob+encrypted_hmac_len-23,"\r\n==END PASSWORD HMAC==",23)) {
		print("[DEBUG] Bad HMAC_BLOB\r\n");
		return -1;
	}
	if (!decode_hex(hmac_blob+25,hmac,32)) {
		print("[DEBUG] Can't decode HMAC value\r\n");
		return -1;
	}

	TEE_HMAC("SSTIC_PASSWORD_HMAC_KEY",computed_hmac,password,password_len);

	//print_buf("HMAC          : ",hmac,32);
	//print_buf("Computed HMAC : ",computed_hmac,32);

	if (memcmp(hmac,computed_hmac,32)) {
		print("\x1b[38;5;124mB\x1b[0m\x1b[38;5;125ma\x1b[0m\x1b[38;5;126md\x1b[0m\x1b[38;5;127m \x1b[0m\x1b[38;5;128mp\x1b[0m\x1b[38;5;129ma\x1b[0m\x1b[38;5;130ms\x1b[0m\x1b[38;5;131ms\x1b[0m\x1b[38;5;132mw\x1b[0m\x1b[38;5;133mo\x1b[0m\x1b[38;5;134mr\x1b[0m\x1b[38;5;135md\x1b[0m\r\n");
		return -2;
	}
	print("\x1b[38;5;112mG\x1b[0m\x1b[38;5;113mo\x1b[0m\x1b[38;5;114mo\x1b[0m\x1b[38;5;115md\x1b[0m\x1b[38;5;116m \x1b[0m\x1b[38;5;117mp\x1b[0m\x1b[38;5;118ma\x1b[0m\x1b[38;5;119ms\x1b[0m\x1b[38;5;120ms\x1b[0m\x1b[38;5;121mw\x1b[0m\x1b[38;5;122mo\x1b[0m\x1b[38;5;123mrd\x1b[0m\x1b[38;5;124m \x1b[0m\x1b[38;5;125m!\x1b[0m\r\n");
	TEE_writekey(
		"SSTIC_CUSTOM_KEY",
		password,
		password_len,
		0
	);
	return 0;
}

static void handleMessages(struct TA_in_msg *in, unsigned int *in_len, struct TA_out_msg *out, unsigned int *out_len) {
	int i;

	switch(in->cmd) {
		case CMD_TA_INIT:
			print("[DEBUG] CMD CMD_TA_INIT\r\n");
			/* Load Keys */
			TEE_writekey("SSTIC_AES_KEY","___SSTIC_2017___",16,0);
			// xor key : [51, 137, 244, 253, 53, 246, 17, 181, 15, 206, 70, 166, 129, 206, 151, 113]
			TEE_writekey("SSTIC_PASSWORD_HMAC_KEY","\x7f\xdc\xb9\x86\x05\x87\x67\xec\x47\xf4\x17\xef\xbe\x85\xa1\x0c",16, 1);
			break;

		case CMD_GET_TA_VERSION:
			print("[DEBUG] CMD CMD_GET_TA_VERSION\r\n");
			char version[] = "SSTIC Trusted APP v0.0.1";
			for(i=0; i < strlen(version); i++) {
				out->get_version_payload.version[i] = version[i];
			}
			out->get_version_payload.version[i]='\0';
			out->code=0x0;
			break;

		case CMD_GET_TA_LUM:
			print("[DEBUG] CMD CMD_GET_TA_LUM\r\n");
			char encrypted_lum[] = "HVOzg\x9b\xb0\xc5\xd2\xbf\xd0\xb9\xd3\xa2\xa0\x88"; // LUM{gdN8.D*@+UV}
			unsigned char xor_key = in->cmd;
			for(i=0; i < 16; i++) {
				out->get_lum_payload.lum[i] = encrypted_lum[i] ^ ((xor_key-i)&0xFF);
			}
			out->get_lum_payload.lum[i]='\0';
			out->code=0x0;
			break;

		case CMD_CHECK_PASSWORD:
			print("[DEBUG] CMD CMD_CHECK_PASSWORD\r\n");
			int password_len = in->check_password_payload.password_len;
			int encrypted_hmac_len = in->check_password_payload.encrypted_hmac_len;
			if (password_len > MAX_PASSWORD_LEN) {
				out->code=-1;
			}
			if(encrypted_hmac_len > MAX_ENCRYPTED_HMAC_LEN) {
				out->code=-1;
			}
			out->code = check_password(
				in->check_password_payload.password,
				password_len,
				in->check_password_payload.encrypted_hmac,
				encrypted_hmac_len
			);
			break;

		case CMD_DECRYPT_BLOCK:
			print("[DEBUG] CMD CMD_DECRYPT_BLOCK\r\n");
			unsigned block_id = in->decrypt_block_payload.block_id;
			decrypt_block(
				out->decrypt_block_payload.cleartext_block,
				in->decrypt_block_payload.ciphertext_block,
				block_id
			);
			out->code=0x0;
			break;

		default:
			print("[DEBUG] Unknown CMD \r\n");
			out->code=-1;
			break;
	}
}

void _start(void *in, unsigned int *in_len, void *out, unsigned int *out_len) {
	if (*in_len >= MAX_INPUT_SIZE) {
		print("bad input size\r\n");
		return;
	}
	if (*out_len >= MAX_OUTPUT_SIZE) {
		print("bad output size\r\n");
		return;
	}
        handleMessages((struct TA_in_msg *)in,in_len,(struct TA_out_msg *)out,out_len);
}
