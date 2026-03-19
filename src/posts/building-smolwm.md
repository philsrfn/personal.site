---
title: "building a window manager in c (smolwm)"
date: 2026-03-20
description: "a deep dive into why and how i built my own minimal window manager."
---

i have used tiling windows managers for years. right about now, close to a third of my life, but i have never settled on one. just like my distros (although i have settled on artix linux since 2024 now) i always found something to complain about. with bspwm it was janky multi-monitor support, dwm's constant need for rewrites, awesome's lua config, xmonad's haskell, i3's lack of features, etc. it just didnt sit right with me. 

although i have been quite enjoying niri for a while now, i wanted to fulfill my dream of writing my own window manager. or rather, a daemon that manages windows. just like bspwm. i also wanted it to adhere to the unix philosophy: do one thing and do it well.

so i built `smolwm`.

## what is smolwm?

smolwm is a bspwm-like window manager written in c. it is exposing a unix domain socket that can be used to communicate with it, just like bspwm, like that you can communicate with it using any programming language. multi-monitor support is implemented using xinerama, it supports different layouts (tiling and monocle), it is borderless by default, and it focuses heavily on simplicity. 

it is smol, but it is also powerful. it is not meant to replace bspwm, but rather to be a lightweight alternative for those who want something simpler. the tech stack is just c, pure xlib, xinerama, and standard posix libraries. no bloated toolkits.

## the display server protocol

writing a window manager means you have to talk directly to the x server. you aren't drawing windows yourself; you are telling x11 how to draw them, where to put them, and when to map or unmap them.

with xlib, you connect to the display, configure your root window to intercept events, and enter an infinite event loop. you wait for events like `MapRequest` (when an app wants to open a window) or `DestroyNotify` (when it closes) and map them to actions. the core loop in smolwm looks like this:

```c
XEvent ev;
while (running) {
    /* wait for events on the display file descriptor or our ipc socket */
    if (XPending(dpy)) {
        while (XPending(dpy) && !XNextEvent(dpy, &ev))
            if (handler[ev.type])
                handler[ev.type](&ev);
    } else if (select(maxfd + 1, &fds, NULL, NULL, NULL) > 0) {
        /* handle ipc messages */
    }
}
```

## managing the state

the hardest part of a window manager isn't the x11 calls, it's the state management. tracking which window is focused, which monitor it belongs to, and what the current layout dictates. 

in smolwm, i keep track of windows using a simple linked list of `Client` structs. each client knows its geometry, whether it is floating, and crucially, which workspace and monitor it belongs to. calculating the dimensions of these windows so they tile perfectly across the screen (using a master-stack layout with configurable gaps) involves math that triggers every time a new window is mapped or destroyed.

```c
typedef struct Client Client;
struct Client {
  Window win;
  int x, y, w, h;
  int isfloating;
  int isfullscreen;
  int ws;  /* workspace ID */
  int mon; /* monitor index */
  Client *next;
};
```

handling multi-monitor setups requires querying Xinerama for the physical screens, assigning boundaries, and then isolating the tiling logic to only operate on clients that belong to the currently active monitor view.

## input and keybindings

because smolwm is designed as a daemon, it doesn't handle keybindings itself. instead, it listens on `/tmp/smolwm.sock`. i wrote a tiny accompanying program called `smolwm-msg` that writes to this socket. 

you use a separate program like `sxhkd` to catch your keystrokes (`super + enter`) and run a shell command like `smolwm-msg togglelayout` or `smolwm-msg moveto 2`. smolwm reads this from the socket, parses it, and rearranges the windows accordingly.

this strict separation of concerns is what keeps the codebase under 1000 lines. parsing key inputs and launching applications (`fork()` and `exec()`) are delegated outward. smolwm only cares about managing the windows themselves.

## lessons learned

writing this improved my c skills massively. chasing down memory leaks and handling x11 errors taught me to be rigorous about state traversal. 

it also gave me a profound appreciation for full desktop environments. when you build a wm from scratch, you realize how many edge cases exist. handling floating dialogue boxes, keeping panels strictly on top, managing focus history when a window dies, or correctly implementing EWMH atoms so status bars (like polybar) know what workspace you are on—there are thousands of these things that heavier DEs do silently.

## what's next

smolwm is in a good place, but there's always more to tweak. i want to refine the multi-monitor edge cases and continue optimizing the codebase. 

if you want to look at the code or try deploying it yourself, it's all up here: [github.com/philsrfn/smolwm](https://github.com/philsrfn/smolwm).
