---
title: Little endian & big endian
date: 2026-01-10
category: tech
---

This concept is so common in computer science but I never remember this and never understand the details, so I think writing a note down is a good idea.

Modern memory storing the data in some sort of cells. Each cell could only store an limited amount of data, say 8 bits (1 byte). 

However, most of the data is bigger than just one byte. If you want to put a integer with 4 bytes (32 bits) into the memory, you have to divide this integer into several chunks.

i.e. you are putting a number `0x12345678`, CPU allocate a 32-bits memory for you, and you have to put them like this

```bash
// because each cell stores 8 bits, so this 32-bits memory has 4 cells
[`Address 0`|`Address 1`|`Address 2`|`Address 3`]
[     12    |     34    |     56    |     78    ]

```

---

So what is Big and Little Endian? It’s really simple. These are two different ways of putting the data into the memory.

### Big endian

For big endian, you are putting the data in order. This is a more natural method, since you could imagine the data is stored from left to right.

i.e., you put the same number `0x12345678` into memory

```bash
[`Address 0`|`Address 1`|`Address 2`|`Address 3`]
[     12    |     34    |     56    |     78    ]
```

you have to put the most significant byte first (at address 0 in this case), and then second-significant byte, …, to the least-significant byte.

> TCP/IP, RISC, JVM use this kind of arragement
> 

### Little endian

On the other hand, little endian is that you put the data in a reverse order. 

i.e., putting the same number `0x12345678` 

```bash
[`Address 0`|`Address 1`|`Address 2`|`Address 3`]
[     78    |     56    |     34    |     12    ]
```

> Intel/AMD x86, Linux, Windows, etc uses this arrangement
>