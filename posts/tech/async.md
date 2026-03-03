---
title: single-threaded asynchronous
date: 2026-01-
category: tech
---

normal event loop in javascript

sometimes when executing a program, you have to wait for the response from a https method. However, if you gonna wait 1 minute for the data to return back, the UX would be extremely bad. Imagining you wait for one minute just for a image to show up in a website, and you might think this website is broken.

Therefore, we would use asynchronous & event loops to maintain this stuff.


let's directly jump into an example in javascript:

we have two functions
- A: a synchronous function
- B: an asynchronous function

```js
async main() {
    A();
    B();
    A();
}

function A() {
    console.log("This is A function\n");
}

async function B() {
    console.log("This is B function\n");
}
```

output:

```bash
This is A function
This is B function
This is A function
```

Although B is an asynchronous function, `B()` would resolve immediately because there is nothing to wait for.

---

```js
async main() {
    A();
    B();
    A();
}

function A() {
    console.log("This is A function\n");
}

async function B() {
    // we have a promise here, but we will explain it later
    await new Promise(resolve => setTimeout(resolve, 10));
    console.log("This is B function\n");
}
```

output: 


```bash
This is A function
This is A function
This is B function
```

After we add a await action in `B` (wait for 10 ms), we could see the order of printing changed. So in this case, imagine there is a runner running on main function. The runner first runs into A, executes the `console.log`, and then returns back to main; Then it runs into B and start executing it.

However, because it hits an `await`, it has to pause at this line, and returns a "pending" promise to main.

The runner then jumps back to main and continues, meeting the second `A()`, runs into `A` and executes the `console.log`. 

Meanwhile the 10ms timer fires, and the timer resolved the promise. The event loop pick this up, resumes `B` from where it paused, and executes `B`'s `console.log`.

---
