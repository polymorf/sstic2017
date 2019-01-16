#!/bin/sh
export PATH=/opt/cross/or1k-linux-musl/bin:/opt/cross/or1k-linux-musl/bin:/home/david/bin:/bin:/sbin:/usr/local/bin:/usr/local/sbin:/usr/bin:/usr/sbin:/usr/X11R6/bin:/usr/games:.
export SYSROOT=/home/david/ork1/or1k-toolchain/sysroot
export PKG_CONFIG_DIR=
export PKG_CONFIG_PATH=
export PKG_CONFIG_LIBDIR=/home/david/ork1/or1k-toolchain/sysroot/usr/lib/pkgconfig:/home/david/ork1/or1k-toolchain/sysroot/usr/share/pkgconfig
export PKG_CONFIG_SYSROOT_DIR=/home/david/ork1/or1k-toolchain/sysroot

make ARCH=openrisc -j3
or1k-linux-musl-objcopy -O binary vmlinux vmlinux.bin
bzip2 -f --best vmlinux.bin
cp vmlinux.bin.bz2 /home/david/html/jor1k/sys/or1k/vmlinux.bin.bz2

