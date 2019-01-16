#!/bin/sh
export PATH=/opt/cross/or1k-linux-musl/bin:/opt/cross/or1k-linux-musl/bin:/home/david/bin:/bin:/sbin:/usr/local/bin:/usr/local/sbin:/usr/bin:/usr/sbin:/usr/X11R6/bin:/usr/games:.
export SYSROOT=/home/david/ork1/or1k-toolchain/sysroot
export PKG_CONFIG_DIR=
export PKG_CONFIG_PATH=
export PKG_CONFIG_LIBDIR=/home/david/ork1/or1k-toolchain/sysroot/usr/lib/pkgconfig:/home/david/ork1/or1k-toolchain/sysroot/usr/share/pkgconfig
export PKG_CONFIG_SYSROOT_DIR=/home/david/ork1/or1k-toolchain/sysroot

or1k-linux-musl-gcc normal_world.c -o /home/david/html/jor1k/sys/fs/challenges/riscy_zones/trustzone_decrypt -O3 -fdata-sections -ffunction-sections -Wl,--gc-sections
or1k-linux-musl-gcc mini-libc.c -shared -o /home/david/html/jor1k/sys/fs/challenges/dont_let_him_escape/mini-libc.so -nostdlib -O4
or1k-linux-musl-strip -s /home/david/html/jor1k/sys/fs/challenges/dont_let_him_escape/mini-libc.so
# save some symbols to help reverse
or1k-linux-musl-strip -s /home/david/html/jor1k/sys/fs/challenges/riscy_zones/trustzone_decrypt -K __bswap_16 -K __bswap_32 -K decode_hex -K .plt -K _start -K _start_c -K main
/opt/riscv/bin/riscv64-unknown-linux-gnu-gcc -m32 lib/syscalls.c lib/utils.c TA.c -o TA.elf -nostdlib -O3 -fno-builtin -fdata-sections -ffunction-sections -Wl,--gc-sections
/opt/riscv/bin/riscv64-unknown-linux-gnu-strip -s TA.elf -K TEE_write -K TEE_writekey -K TEE_readkey -K TEE_AES_decrypt -K TEE_HMAC

python2 sign.py
