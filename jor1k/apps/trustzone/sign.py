import hmac
import hashlib

key = "I'm an approuved TA builder !"
data = open("TA.elf","rb").read()

digest_maker = hmac.new(key,'',hashlib.sha256);
digest_maker.update(data)
hmac = digest_maker.hexdigest()

f=open("/home/david/html/jor1k/sys/fs/challenges/riscy_zones/TA.elf.signed","wb")
f.write(data)
f.write(hmac)
f.close()
