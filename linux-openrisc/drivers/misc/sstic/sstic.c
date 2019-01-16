/*
 * SSTIC Device Driver
 */

#include <linux/kernel.h>
#include <linux/module.h>
#include <linux/init.h>
#include <linux/platform_device.h>
#include <linux/spinlock.h>
#include <linux/slab.h>
#include <linux/io.h>
#include <linux/of.h>
#include <linux/device.h>
#include <linux/cdev.h>
#include <linux/highmem.h>


static dev_t first;
static struct cdev c_dev;
static struct class *cl;
static int already_open = 0;

struct sstic_message {
	unsigned long cmd;
	unsigned long data_in_len;
	void * data_in;
	unsigned long data_out_len;
	void * data_out;
};

static int sstic_open(struct inode *inode, struct file *file) {
	//printk(KERN_INFO "sstic: open()\n");
	if (already_open) {
		return -EBUSY;
	}
	already_open++;
	return 0;
}
static int sstic_release(struct inode *inode, struct file *file) {
	//printk(KERN_INFO "sstic: release()\n");
	already_open--;
	return 0;
}

#define SSTIC_IOC_MAGIC 'S'
#define SSTIC_SEND_MSG  _IOWR(SSTIC_IOC_MAGIC, 0, struct sstic_message)
#define MAX_MSG_SIZE 65536

static long sstic_syscall(
	unsigned long cmd,
	unsigned long input_buffer,
	unsigned long input_len,
	unsigned long output_buffer,
	unsigned long * output_len
) {
	register unsigned long r11 __asm__("r11") = cmd;
	register unsigned long r3 __asm__("r3") = input_buffer;
	register unsigned long r4 __asm__("r4") = input_len;
	register unsigned long r5 __asm__("r5") = output_buffer;
	register unsigned long r6 __asm__("r6") = * output_len;
	__asm__ __volatile__ ("l.sys 0"
			      : "=r"(r11)
			      : "r"(r11), "r"(r3), "r"(r4), "r"(r5), "r"(r6)
			      : "memory", "r7", "r8",
				"r12", "r13", "r15", "r17", "r19", "r21",
				"r23", "r25", "r27", "r29", "r31");
	*output_len = r6;
	return r11;
}

static long sstic_ioctl(struct file *file, unsigned int cmd, unsigned long arg) {
	unsigned long ret;
	int __user *uarg = (int __user *)arg;
	//printk(KERN_INFO "sstic: ioctl()\n");
	if (cmd == SSTIC_SEND_MSG) {
		struct sstic_message message;
		void *input_buffer;
		void *output_buffer;
		//message = (struct sstic_message *)uarg;
		if (copy_from_user(&message, uarg, sizeof(struct sstic_message))) {
			printk(KERN_INFO "sstic: ioctl() error copy message struct\n");
			return -EFAULT;
		}
		if(message.data_in_len > MAX_MSG_SIZE) {
			printk(KERN_INFO "sstic: ioctl() error bad data_in_len\n");
			return -EFAULT;
		}
		input_buffer = kmalloc(message.data_in_len, GFP_KERNEL);
		if (!input_buffer) {
			printk(KERN_INFO "sstic: can't allocate input_buffer\n");
			return -EFAULT;
		}
		if(message.data_out_len > MAX_MSG_SIZE) {
			printk(KERN_INFO "sstic: ioctl() error bad data_out_len\n");
			return -EFAULT;
		}
		output_buffer = kmalloc(message.data_out_len, GFP_KERNEL);
		if (!output_buffer) {
			printk(KERN_INFO "sstic: can't allocate output_buffer\n");
			return -EFAULT;
		}
		if (copy_from_user(input_buffer, message.data_in, message.data_in_len)) {
			printk(KERN_INFO "sstic: ioctl() error copy_from_user (input_buffer)\n");
			return -EFAULT;
		}
		/* use syscall uimm=0, linux uses syscall uimm=1 */
		ret = sstic_syscall(
			message.cmd,
			virt_to_phys(input_buffer),
			message.data_in_len,
			virt_to_phys(output_buffer),
			&(message.data_out_len)
		);
		if (copy_to_user(message.data_out, output_buffer, message.data_out_len)) {
			printk(KERN_INFO "sstic: ioctl() error copy_to_user (output_buffer)\n");
			return -EFAULT;
		}
		if (copy_to_user(uarg, &message, sizeof(struct sstic_message))) {
			printk(KERN_INFO "sstic: ioctl() error copy message struct\n");
			return -EFAULT;
		}
		return ret;
	}
	return -ENOIOCTLCMD;
}


static struct file_operations pugs_fops = {
	.owner = THIS_MODULE,
	.open = sstic_open,
	.release = sstic_release,
	.unlocked_ioctl = sstic_ioctl,
};

static int __init sstic_init(void) {
	/* create chardev */
	if (alloc_chrdev_region(&first, 0, 1, "sstic") < 0) {
		return -1;
	}
	if ((cl = class_create(THIS_MODULE, "chardrv")) == NULL) {
		unregister_chrdev_region(first, 1);
		return -1;
	}
	if (device_create(cl, NULL, first, NULL, "sstic") == NULL) {
		class_destroy(cl);
		unregister_chrdev_region(first, 1);
		return -1;
	}
	cdev_init(&c_dev, &pugs_fops);
	if (cdev_add(&c_dev, first, 1) == -1)
	{
		device_destroy(cl, first);
		class_destroy(cl);
		unregister_chrdev_region(first, 1);
		return -1;
	}
	return 0;
}

static void __exit sstic_exit(void) {
	unregister_chrdev_region(first, 3);
}

module_init(sstic_init);
module_exit(sstic_exit);

MODULE_AUTHOR("David BERARD <contact@davidberard.fr>");
MODULE_DESCRIPTION("Driver for SSTIC Challenge : Communication between normal world and noSecure world");
MODULE_LICENSE("GPL");
MODULE_ALIAS("platform:sstic");
