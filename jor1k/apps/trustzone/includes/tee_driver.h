/* TEE OS COMMANDS */
#define CMD_GET_VERSION 0x0001
#define CMD_LOAD_TA     0x0002
#define CMD_TA_MESSAGE  0x0003
#define CMD_UNLOAD_TA   0x0004
#define CMD_CHECK_LUM   0x0005
#define CMD_CHECK_KEY   0x0006

/* ioctl number */
#define SSTIC_IOC_MAGIC 'S'
#define SSTIC_SEND_MSG  _IOWR(SSTIC_IOC_MAGIC, 0, struct sstic_message)

struct sstic_message {
	unsigned long cmd;
	unsigned long data_in_len;
	void * data_in;
	unsigned long data_out_len;
	void * data_out;
};

