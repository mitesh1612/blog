---
toc: false
layout: post
description: A super short introduction to Conditional Probability with a fun tricky problem involving a family and their unknown children.
categories: [probability, python]
title: Conditional Probability and Families
image: images/2020-08-14-conditional-probability/hero.png
comments: true
---
So I was reading the book "Data Science from Scratch" by Joel Grus. I came across this nice tricky problem in Conditional Probability mentioned in this book. Let's take a look

## A Quick Refresher on Conditional Probability

Well if you forgot the definition of conditional probability, here is a small refresher for you. Say there are two events E and F. The probability that E happens given that we know F happens is represented using

 $$P(E|F)$$
 
Mathematically,

$$P(E|F) = P(E,F)/P(F). P(E,F)$$

 is the probability of both E and F happening.

Well enough of a probability class, lets look at an interesting family now

### The Family and The Unknown Children

Say there is a family with two unknown children. If we assume that:
* Each child is equally likely to be a boy or a girl
* The gender of the second child is independent of the first child.

Then the event "no girls" has probability 1/4, the event "one girl, one boy" has probability 1/2, and the event "two girls" has probability 1/4.

Now here comes the interesting problem. "What is the probability of the event 'both children are girls' (B) conditional on the event that 'the older child is a girl (G)'?"

This aint a test, so here is how we can easily calculate this using conditional probability

$$P(B|G) = P(B,G)/P(G)$$

T event B and G ("both children are girls and the older child is a girl") is just the event B. (Once you know that both children are girls, it’s necessarily true that the older child is a girl). Thus,

$$P(B|G) = P(B,G)/P(G) = P(B)/P(G) = 1/2$$

This is mostly intuitive. Now can you guess "What is the probability of the event 'both children are girls' (B) conditional on the event that 'at least one of the children is a girl' (L)?"

Surprisingly, the answer to this question is different from the one before. Here is how

As before, the event B and L ("both children are girls and at least one of the children is a girl") is just the event B. This means we have:

$$P(B|L) = P(B,L)/P(L) = P(B)/P(L) = 1/3$$

How can this be the case? Well, if all you know is that at least one of the children is a girl, then it is twice as likely that the family has one boy and one girl than that it has both girls.

### Still don't believe me?

Well if you are the doubting kind, we can write a simple Python code to simulate this experiment.

```python
import enum, random

class Kid(enum.Enum):
    BOY = 0
    GIRL = 1

def random_kid() -> Kid:
    return random.choice([Kid.BOY, Kid.GIRL])

both_girls = 0
older_girl = 0
either_girl = 0

random.seed(20200814) # Yep, this post's date

for _ in range(10000):
    younger = random_kid()
    older = random_kid()
    if older == Kid.GIRL:
        older_girl += 1
    if older == Kid.GIRL and younger == Kid.GIRL:
        both_girls += 1
    if older == Kid.GIRL or younger == Kid.GIRL:
        either_girl += 1

print("P(both | older):", both_girls / older_girl)     # 0.494 ~ 1/2
print("P(both | either): ", both_girls / either_girl)  # 0.322 ~ 1/3
```

This indicates how the conditioning of an event affects its probability.

Weirdly, this problem reminds me a lot of the [Monty Hall Problem](https://en.wikipedia.org/wiki/Monty_Hall_problem). Hey if you have any explaination on how this can relate to Monty Hall, you can always @ me at my socials (linked in this blog at various locations!😉) and I'll probably try to figure out if there is any relation between these two (after I refresh my Probability Course 😋)
