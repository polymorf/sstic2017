#!/usr/bin/env python
import random
import bcrypt
import os
import hashlib
import base64
from Crypto.Cipher import AES
import json


def get_notify_value(val):
	sha=hashlib.sha256(val).digest()
	obj = AES.new(sha, AES.MODE_ECB)
	return obj.encrypt("_I have the key_").encode("hex")

salt = bcrypt.gensalt(10)

def gen_lum():
	lum_chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ%*+,-.:=?@_'
	SIZE=16
	pre="LUM{"
	post="}"
	gen_size = SIZE - (len(pre) + len(post))
	gen=""
	for i in range(gen_size):
		gen+=random.choice(lum_chars)
	lum = pre+gen+post
	return lum

levels = [
	{
		"name":"electronic_flash",
		"key":None,
		"lum":[
			"LUM{x.g215WiPCR}", # FLASH ID
			"LUM{AsPBdVWz95y}"   # deleted file
		]
	},
	{
		"name":"don't let him escape !",
		"key":"2d4ceda2fa2a0e08fc360b55291de7c9",
		"completed_img":"images/world2-completed.png",
		"lum":[
			"LUM{BvWQEdCrMfA}",
		]
	},
	{
		"name":"RISCy zones",
		"key":"5921cd9fd3a82bd9244ece5328c6c95f",
		"completed_img":"images/world3-completed.png",
		"lum":[
			"LUM{gdN8.D*@+UV}", # CMD_GET_TA_LUM dans la TA
			"LUM{0qvYH:QI?K6}", # HMAC key
			"LUM{+t%Lv.imT8M}", # exiv2 -pa encrypted.jpg
		]
	},
	{
		"name":"Unstable machines",
		"key":"3f691f3d6eb60b343c931c22e0baa92f",
		"completed_img":"images/world4-completed.png",
		"unlocked_img":"images/world4.png",
		"lum":[
			"LUM{C1UAidv_pzJ}",
			"LUM{+zhVQqJy03q}",
			"LUM{2KREDvn3OPf}",
		],
		"require":[1,2],
		"filename":"/challenges/unstable_machines/unstable.machines.exe",
		"data":open("../crackme-win/unstable.machines.exe","rb").read()
	},
	{
		"name":"Final world",
		"lum":[],
		"require":[1,2,3],
		"filename":"/challenges/final.txt",
		"data":open("../final/2017.02.12_v3.txt","rb").read()
	},
]

notify_lums={}
notify_keys={}

conf={}
conf["bcrypt_salt"]=salt
conf["notify_url"]="https://challenge2017.sstic.org/progress-update";
conf["levels"]=[]
i=0
for level in levels:
	cur = {}
	cur["name"] = level["name"]
	if "key" in level.keys() and level["key"] is not None:
		cur["key"]  = bcrypt.hashpw(level["key"],salt).replace(salt,"")
		notify_keys[i] = get_notify_value(level["key"])
		#cur["key"]="todo"
	if "completed_img" in level.keys():
		cur["completed_img"] = level["completed_img"]
	if "unlocked_img" in level.keys():
		cur["unlocked_img"] = level["unlocked_img"]
	cur["lum"]=[]
	notify_lums[i]=[]
	for lum in level["lum"]:
		cur["lum"].append(bcrypt.hashpw(lum,salt).replace(salt,""))
		notify_lums[i].append(get_notify_value(lum))
		#cur["lum"].append("todo")
	if "require" in level.keys():
		hashme = ""
		for req in level["require"]:
			hashme+=levels[req]["key"]
		aes_key=hashlib.sha256(hashme).digest()
		aes_iv = os.urandom(16)
		cur["aes_iv"]=base64.b64encode(aes_iv)
		cur["filename"]=level["filename"]
		cur["require"]=level["require"]
		aes      = AES.new(aes_key, AES.MODE_CBC, aes_iv)
		data     = level["data"]
		padlen   = 16-(len(data)%16)
		data    += chr(padlen)*padlen
		enc_data = aes.encrypt(data)
		cur["data"] = base64.b64encode(enc_data)
		cur["data_len"] = len(level["data"])
		#print "/*\naes key = %s\naes iv  = %s\n*/" % (aes_key.encode("hex"),aes_iv.encode("hex"))
	conf["levels"].append(cur)
	i+=1
levels[3]["data"]="";
levels[4]["data"]="";
js_config_with_data = open("js/config_with_data.js","w")
generated_values = open("generated_config.txt","w")
notify_values = open("notify_config.txt","w")

js_config_with_data.write("sstic_config = "+json.dumps(conf,indent=4, sort_keys=True) + "\nmodule.exports = sstic_config;")
generated_values.write(json.dumps(levels,indent=4, sort_keys=True))
notify_values.write("keys = "+json.dumps(notify_keys,indent=4, sort_keys=True)+"\n")
notify_values.write("lums = "+json.dumps(notify_lums,indent=4, sort_keys=True)+"\n")

js_config_without_data = open("js/config_without_data.js","w")
conf["levels"][3]["data"]="";
conf["levels"][4]["data"]="";
js_config_without_data.write("sstic_config = "+json.dumps(conf,indent=4, sort_keys=True) + "\nmodule.exports = sstic_config;")
js_config_without_data.close()

js_config_with_data.close()
generated_values.close()
notify_values.close()

