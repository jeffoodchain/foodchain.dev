---
title: Event Loop in JS
date: 2026-03-03
category: tech
---

# Event loop

There are several internals inside javascript event loop:
- The call stack
- The Event Loop
- Macrotasks (Task Queue)
- Microtasks (Microtask Queue)

# Call stack

The call stack is where JS tracks what function is currently executing. It is working as a stack way (Last in First out).

```js
function greet() {
    console.log("Hello, world!");
}

function main() {
    greet();
}
main();
```

what javascript do is to push the functions into the stack and then execute them in order. And because javascript is a single-threaded language, only one thing is on the top of the stack at a time. 

1. push main();
2. push greet();
3. push console.log


## reference
- https://javascript.info/event-loop
