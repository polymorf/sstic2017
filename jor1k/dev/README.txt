Bonjour,

Voici la suite du challenge, les épreuves suivantes se dérouleront dans un
navigateur.  Pour fonctionner, ce dossier doit être propulsé par un serveur
web, par exemple avec python SimpleHTTPServer :

$ python -m SimpleHTTPServer 8000

Pour travailler plus confortablement tu peux te connecter à la machine
virtuelle fonctionnant dans ton navigateur en SSH.
Une passerelle Websocket<->Interface TAP est nécessaire pour fournir du réseau
à la machine virtuelle. Le projet «go-websockproxy» [1] permet de créer cette
passerelle, il remplit également la fonction de serveur web.

Le binaire nécessite des privilèges élevés (les capabilities CAP_NET_RAW et
CAP_NET_ADMIN ainsi que le droit d'exécuter la commande "ip" avec ces
capabilities) pour créer une interface TAP :
sudo go-websockproxy --listen-address=127.0.0.1:8090 --static-directory=$CHALLENGE_DIR --tap-ipv4=10.42.42.1/30

Ensuite il ne reste plus qu'à ouvrir ton navigateur à l'adresse
http://127.0.0.1:8090/main.html. Lorsque la machine virtuelle a fini de
démarrer, il est possible de se connecter en SSH :
ssh user@10.42.42.2, le mot de passe est "sstic".

[1] https://github.com/gdm85/go-websockproxy
