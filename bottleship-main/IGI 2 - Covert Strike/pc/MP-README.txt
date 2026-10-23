MULTIPLAYER README
------------------

This document contains three sections:

1. RUNNING IGI2 THROUGH A FIREWALL
2. STARTING MULTIPLAYER IGI2 FROM THE COMMAND LINE
3. RUNNING AN IGI2 SERVER ON LAN



1.RUNNING IGI2 THROUGH A FIREWALL
---------------------------------

Getting started - fast!
-----------------------

In your firewall or other filter between you and the Internet - open for traffic in and out of
UDP ports 26001 and 26015.


Introduction
------------

Starting with version 0.306 the multiplayer game sends messages through well-defined, user-specified
ports only.


Running a server
----------------

If you start your own server, the machine will connect to port *svport* as found in
the file networkconfig.cfg. Currently, the default server port is UDP 26001. You can change this
value by either editing the networkconfig.cfg when the server is not running, or by entering
another port in the menues right before you launch your server.


Joining a server
----------------

Your machine will try to connect to the port *clport* as found in the file networkconfig.cfg.
The default value, currently UDP port 26015, can be changed by editing this file when the game is not
running. All game traffic to and from your machine will pass through this port.

If your local firewall/router/et.c. blocks your game messages, allowing traffic on the svport and
the clport should fix the problems. Your specific firewall et.c. should hopefully provide you with
information about how to accomplish this.

All traffic to and from both client and server is UDP only. (i.e. no TCP).


Browsing for a server
---------------------

When browsing for a server, the built-in Gamespy(tm) server browser will open a TCP port, acquire
information about available game servers and then quickly shut down its socket. Firewalls usually
allow this kind of traffic without any special configuration.


Norton Personal Firewall
------------------------

Specifically for this firewall software: To join a server first give 'Internet Access' to
your IGI application. Then place the server you want to join in the 'Trusted Zone.'


Trouble handling
----------------

If you encounter problems you may find assistance by browsing the net (e.g. www.google.com) for
information. IGI2 is largely similar to long running networked games such as CounterStrike and Quake when it
comes to port and protocol usage. Information concerning firewall configuration and network caveats
for those games should often make sense in the IGI2 case as well.



2. STARTING MULTIPLAYER IGI2 FROM THE COMMAND LINE
--------------------------------------------------

Open a command window ('DOS-window'), and 'cd' to the
main game directory, where you among other files will
find the igi2.exe executable.

In the command window enter one of the following commands
depending on what you want to do.


Joining a running game from the command line:
---------------------------------------------

igi2 ip<ip> port<port> player<name> password<password>

If the server isn't password protected, the password field
needs not be passed.


Starting a non-dedicated server from the command line
-----------------------------------------------------

igi2 [port<port>] player<name> server level<level>

Example:

igi2 playerTom server level03

... starts a server at level03 with a player called Tom.
This server will connect to the port specified in the 
server options menu the last time this menu was edited.

igi2 playerTom server port26004 level05

... As above, but this server will connect to port 26004


Starting a dedicated server from the command line
-------------------------------------------------

A dedicated server cannot be started from the menues, it has to be
started from the command line - like this:

igi2 [port<port>] serverdedicated level<level>

Example:

igi2 port26001 serverdedicated level05

... starts a dedicated server on port 26001 with level 05 loaded.


Selecting maps to play
----------------------

When starting a server from command line (dedicated or non-dedicated)
the following maps will be marked as active:

- The map you have specified on the command line as level<level>. You must always
  specify a map on the command line.

- All the maps set as active in networkconfig.cfg, as 'lo activatemap <level>'

The command line map will be the first one played. It will also add itself to 
*the top of* your map list, and be saved in the config file with the other maps.



3. RUNNING AN IGI2 SERVER ON LAN
--------------------------------

When running a server on LAN, players will use the 'LAN' update button in the ingame
server browser to locate the server's IP and port. Note that the server browser will
only find servers running at ports in the range 26001-26011 inclusive.

You can run servers on any ports also outside this range, but players will then have to
manually enter the IP and port without seeing the server listed in the browser.



Depending on your network infrastructure and access from Internet, outside and unknown
players may be able to join your LAN server or not.

You will probably want to make your LAN server keep quit about its existence. In the 
networkconfig.cfg file, you will find a line as 'lo public <0|1>'. Set this to

lo public 0

to have your server *not* announce its presence on the Internet to services such as 
GameSpy or All-Seeing-Eye.

Any potential players from the outside will then not be told the IP of your socket, and
would have to know that from external sources to be able to join.
