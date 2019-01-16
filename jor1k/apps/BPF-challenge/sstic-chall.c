
#include <net/sock.h>
#include <bcc/proto.h>

#define IP_UDP 	17
#define ETH_HLEN 14
//BPF_TABLE("hash", u64, u64, current_state, 8);
BPF_HASH(current_state, u64);

#define ASCII 1


typedef union {
    u8 bytes[8];
    u64 value;
} helpcast;

u64 get_state() {
	u64 table_idx = 0;
	u64 *state = current_state.lookup(&table_idx);
	if(!state) {
		return 0x0;
	}
	return *state;
}
void set_state(u32 value) {
	u64 set = value;
	u64 table_idx = 0;
	current_state.update(&table_idx,&set);
}

void set_xor_key1(u32 value) {
	u64 set = value;
	u64 table_idx = 1;
	current_state.update(&table_idx,&set);
}
void set_xor_key2(u32 value) {
	u64 set = value;
	u64 table_idx = 2;
	current_state.update(&table_idx,&set);
}

u32 get_xor_key1() {
	u64 table_idx = 1;
	u64 *state = current_state.lookup(&table_idx);
	if(!state) {
		return 0x0;
	}
	return (u32)*state;
}
u32 get_xor_key2() {
	u64 table_idx = 2;
	u64 *state = current_state.lookup(&table_idx);
	if(!state) {
		return 0x0;
	}
	return (u32)*state;
}

#ifdef ASCII
static inline u32 ascii_nibles_to_u32(u8 nibble, u8 pos) {
	// 0-9 
	if ( nibble > 47 && nibble < 58 ) {
		return ((nibble-48)<<(pos*4));
	// A-F
	}else if ( nibble > 64 && nibble < 71 ) {
		return ((nibble-0x37)<<(pos*4));
	// a-f
	}else if ( nibble > 96 && nibble < 103 ) {
		return ((nibble-0x57)<<(pos*4));
	}else{
		// not ascii
		return 0;
	}
}

static inline u32 convert_ascii(u64 ascii_dword) {
	helpcast input;
	u32 out=0;
	input.value = ascii_dword;
	int i=0;
	out += ascii_nibles_to_u32(input.bytes[0],0);
	out += ascii_nibles_to_u32(input.bytes[1],1);
	out += ascii_nibles_to_u32(input.bytes[2],2);
	out += ascii_nibles_to_u32(input.bytes[3],3);
	out += ascii_nibles_to_u32(input.bytes[4],4);
	out += ascii_nibles_to_u32(input.bytes[5],5);
	out += ascii_nibles_to_u32(input.bytes[6],6);
	out += ascii_nibles_to_u32(input.bytes[7],7);
	return out;
}
#endif

static inline u32 mod_mult(u64 a, u64 b, u32 n) {
	return (a*b)%n;
}

static inline u32 mod_exp(unsigned long base, unsigned long n) {
	int i;
	unsigned long ans = 1;
	// 1
	ans=mod_mult(ans, base, n);
	base = mod_mult(base,base,n);
	// 0
	base = mod_mult(base,base,n);
	// 0
	base = mod_mult(base,base,n);
	// 0
	base = mod_mult(base,base,n);
	// 0
	base = mod_mult(base,base,n);
	// 0
	base = mod_mult(base,base,n);
	// 0
	base = mod_mult(base,base,n);
	// 0
	base = mod_mult(base,base,n);
	// 1
	ans=mod_mult(ans, base, n);
	return ans;
}

int sstic_filter(struct __sk_buff *skb) {

	u8 *cursor = 0;

	struct ethernet_t *ethernet = cursor_advance(cursor, sizeof(*ethernet));
	// keep only IP packets (ethernet type = 0x0800)
	if (!(ethernet->type == 0x0800)) {
		goto DROP;
	}

	struct ip_t *ip = cursor_advance(cursor, sizeof(*ip));
	// keep only UDP packets
	if (ip->nextp != IP_UDP) {
		goto DROP;
	}

	u32  udp_header_length = 0;
	u32  ip_header_length = 0;
	u32  payload_offset = 0;
	u32  payload_length = 0;

	struct udp_t *udp = cursor_advance(cursor, sizeof(*udp));
	ip_header_length = ip->hlen << 2;    //SHL 2 -> *4 multiply
	udp_header_length = 8;

	//calculate patload offset and length
	payload_offset = ETH_HLEN + ip_header_length + udp_header_length;
	payload_length = ip->tlen - ip_header_length - udp_header_length;

	// keep only UDP packet with dst port 1337
	if(udp->dport != 1337) {
		goto DROP;
	}

	u64 c_state = get_state();
	if (c_state == 0) {
		if(payload_length != 16) {
			goto DROP;
		}

		u8  lum_8b1 = load_byte(skb, payload_offset);
		u8  lum_8b2 = load_byte(skb, payload_offset + 1);
		u16 lum_16b = load_half(skb, payload_offset + 2);
		u32 lum_32b = load_word(skb, payload_offset + 4);
		u64 lum_64b = load_dword(skb, payload_offset + 8);


		if (
			lum_8b1 != 0x4c ||
			lum_8b2 != 0x55 ||
			lum_16b != 0x4d7b ||
			lum_32b != 0x42765751 ||
			lum_64b != 0x456443724d66417d
		) {
			goto DROP;
		}else{
			set_state(1);
			set_xor_key1(load_word(skb, payload_offset + 4) ^ 0xFFFFFFFF);
			set_xor_key2(load_word(skb, payload_offset + 8) ^ 0xFFFFFFFF);
			goto KEEP;
		}
	}else if(c_state == 1) {
#ifdef ASCII
		if(payload_length != (5+32)) {
#else
		if(payload_length != (5+16)) {
#endif

			goto DROP;
		}
		int i = 0;
		int ptr = 0;
		u8 p[4];
		for (i = 0 ; i < 4 ; i++) {
			ptr = i + payload_offset;
			p[i] = load_byte(skb , ptr);
		}
		if ((p[0] != 'K') || (p[1] != 'E') || (p[2] != 'Y') || (p[3] != '{')) {
			goto BAD_STATE_DROP;
		}
#ifdef ASCII
		u8 end = load_byte(skb, payload_offset + 4+32);
#else
		u8 end = load_byte(skb, payload_offset + 4+16);
#endif

		if (end != '}') {
			goto BAD_STATE_DROP;
		}

		u32 xor_key1 = get_xor_key1() & 0xFFFFFFFF;
		u32 xor_key2 = get_xor_key2() & 0xFFFFFFFF;

#ifdef ASCII
		u64 ascii_key1 = load_dword(skb, payload_offset + 4);
		u64 ascii_key2 = load_dword(skb, payload_offset + 4+8);
		u64 ascii_key3 = load_dword(skb, payload_offset + 4+2*8);
		u64 ascii_key4 = load_dword(skb, payload_offset + 4+3*8);

		u32 key1 = convert_ascii(ascii_key1) ^ xor_key1;
		u32 key2 = convert_ascii(ascii_key2) ^ xor_key2;
		u32 key3 = convert_ascii(ascii_key3) ^ xor_key1;
		u32 key4 = convert_ascii(ascii_key4) ^ xor_key2;
#else
		u32 key1 = load_word(skb, payload_offset + 4);
		u32 key2 = load_word(skb, payload_offset + 8);
		u32 key3 = load_word(skb, payload_offset + 12);
		u32 key4 = load_word(skb, payload_offset + 16);

		key1 ^= xor_key1;
		key2 ^= xor_key2;
		key3 ^= xor_key1;
		key4 ^= xor_key2;
#endif
#ifdef ASCII
		u8 mult_const = udp->length;
#else
		u8 mult_const = udp->length + 16;  // keep the same key in ascii and non ascii mod
#endif
		if ((key1 ^ ((0x706f6c79 * mult_const)&0xFFFFFFFF)) != 0x53535449) {
			goto BAD_STATE_DROP;
		}
		if ((key2 + (0x6d6f7266 / mult_const) & 0xFFFFFFFF) != 0x43204348) {
			goto BAD_STATE_DROP;
		}

		/*
		p = 53927
		q = 43019
		e = 257
		n = 2319885613 is 32 bytes long
		d = 713086789 is 30 bytes long

		message : 0x204c4c41
		encrypted with private key : 0x204c4c41 ^ 0x2a80d745 % 0x8a46a52d => 0x41bfa3fb
		decrypted with public key  : 0x41bfa3fb ^ 0x00000101 % 0x8a46a52d => 0x204c4c41
		*/
		unsigned int n = 2319885613;
		u64 exp = mod_exp(key3,n);
		if (exp != 0x204c4c41) {
			goto BAD_STATE_DROP;
		}
		/*
		p = 56921
		q = 64969
		e = 257
		n = 3698100449 is 32 bytes long
		d = 3108028673 is 32 bytes long

		message : 0x37313032
		encrypted with private key : 0x37313032 ^ 0xb940c101 % 0xdc6c88e1 => 0x93865b44
		decrypted with public key  : 0x93865b44 ^ 0x00000101 % 0xdc6c88e1 => 0x37313032
		*/
		n = 3698100449;
		exp = mod_exp(key4,n);
		if (exp != 0x37313032) {
			goto BAD_STATE_DROP;
		}
		set_state(2);
		goto KEEP;
	}else{
		goto DROP;
	}

	BAD_STATE_DROP:
		set_state(0);
		goto DROP;
	DROP:
		return 0;
	KEEP:
		return -1;

}
