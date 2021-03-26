---
toc: false
layout: post
description: A dive into C# Properties and various interesting patterns of using them into your code.
categories: [C#, properties, classes]
title: C# Properties and their different Uses
image: images/2020-08-19-c-sharp-properties/hero.png
comments: true
---
I learnt C# in parts from various resources, mostly because each one had their different starting points. One book heavily relied on using Visual Studio which definitely makes life easy, but makes you ignore the nitties-gritties of setting up .NET projects, while one did everything from scratch, which did scratch my itch (*Get it?* 😜) but had a really really slow pace.

One constructs that I learnt about while seeing how to create classes was C# Properties. Properties have a little confusing syntax as described here (in all the non syntax highlighted glory of C#)

```csharp
public class MyRiches
{
    // Normal Data Members
    public int Money;
    // Properties
    public int GoldInKgs { get; set; }
}
```

If you come from some other language, upon seeing this, you might be like
![]({{ site.baseurl }}/images/2020-08-19-c-sharp-properties/meme1.png)

When I learnt about properties, I kept wondering why do I work extra hard to define data members when I can do it in a simpler and a much known way. I though it was just [syntactic sugar](https://en.wikipedia.org/wiki/Syntactic_sugar), only with its visible diabetes as well. Then I saw an interesting usage of properties in our existing codebase, something like this

```csharp
public class MyClass
{
    public IList<SomeType> Property
    {
        get
        {
            if(m_property == null)
            {
                m_property = new List<SomeType>();
            }
            return m_property;
        }
        set
        {
            m_property = value;
        }
    }
    private IList<SomeType> m_property;
}
```

and I suddenly doubting my already dubious C# knowledge. Thus I began a journey on to understand the actual use and various usage of patterns. (Don't worry, I will also explain this example soon)

## So what actually are Properties?

Before getting into why these exist, lets assume they didnt. Now say I had a data member in my class that was private but I needed to access it's value in some other class, but not let it modify the value. For example

```csharp
public class Bank
{
    private int AccountBalance;
}

public class Me
{
    var myBankAccount = new Bank();
    var myMoney = myBankAccount.AccountBalance;
}
```

Now if I cant directly access the `AccountBalance` property. If I make it public, although it might be fun for me, it might not be fun for the bank, when I could just do this

```csharp
// The easy way of becoming a millionaire
myBankAccount.AccountBalance = 1000000;
```

So what is the other solution? Ah yes, **getters** (and **setters**, their siblings). We could easily define a getter on this data member that will get us the value but not let modify it. Something like this:

```csharp
public class Bank
{
    private int AccountBalance;
    public int getAccountBalance()
    {
        return AccountBalance;
    }
}

public class Me
{
    var myBankAccount = new Bank();
    var myMoney = myBankAccount.getAccountBalance();
}
```

If you are used to working in Java with Eclipse, you know it has a functionality of auto generating getters and setters and I'm partly sure the creators of C# might have already loaded this in Visual Studio, but for people who didnt use it, this was a long and tedious methods to write this getters and setters. That's why, C# creators created properties.

> Properties provide an access mechanism for private data members

So even though you can essentially create data members using properties, that's not their intended use. Essentially Properties provide a flexible mechanism to read, write or compute the value of a private field. They can be used as data members, but they are actually special methods called **accessors**, which as you guessed it, are useful for accessing data.

If you are not a fan of big words, this basically means, they are a shortcut for writing customized getter and setter methods. Thus, in a way, they indeed are syntactic sugar, without the harms? I am not going to bore you with the syntax of C# Properties, here is a good [reference](https://www.geeksforgeeks.org/c-sharp-properties/).

Now comes the fun part, the various usage patterns of Properties. The `get` and `set` aren't just for show. You can customize them to implement various fun and useful patterns in your code, and here I'll show a few

### Lazy Loading Values using Properties

Properties can help you implement a cache with lazy loading feature. For example

```csharp
private int m_IncomeTax;

public int IncomeTax
{
    get
    {
        if(m_IncomeTax == null)
        {
            m_IncomeTax = AReallyLongComputationForTax();
        }
        return m_IncomeTax;
    }
}
```

This is the other primary usage of Properties, of course other than controlling access.

### Future Proofing Code

Say you want to maintain the API of your class but the logic or calculation changes. To incorporate that without affecting your class API, you can change the setter code. 

In terms of the above example, say in the computation for tax, they include a cess (YES! Tax on Tax!), you can change the getters like this, such that `IncomeTax` property gives you the total tax always.

```csharp
// Old
public int IncomeTax
{
    get
    {
        return m_IncomeTax;
    }
}

// New
public int IncomeTax
{
    get
    {
        return m_IncomeTax + Cess;
    }
}
```

### Creating a Contract

Properties help you create a contract/API for a class. This way you can have a proper contract of accessing class members, which might be private or calculations on some private members. They are useful if you need some extra calculations on private members.

In general, the point is to separate *implementation* (the field) from *API* (the property). Later on you can, should you wish, put logic, logging etc in the property without breaking either source or binary compatibility - but more importantly you're saying what your type is willing to do, rather than how it's going to do it. More on this in [this article](https://csharpindepth.com/Articles/PropertiesMatter)    

### Returning Non Null Values using Properties

I promised I'll explain the code at the beginning of the section. For reference, this is the code

```csharp
public class MyClass
{
    public IList<SomeType> Property
    {
        get
        {
            if(m_property == null)
            {
                m_property = new List<SomeType>();
            }
            return m_property;
        }
        set
        {
            m_property = value;
        }
    }

    private IList<SomeType> m_property;
}
```

This code essentially checks whether a given member is null, and if it is null, it will populate the value first, and then return it. There is one great benefit of using this approach. Anything that consumes the value of this property need not have a null check, since this essentially ensures that you never get a null value and reduces the amount of code and checks you need to write, and don't we all want to write less code?

In closing, I know properties seem like glorified setters/getters and all of the benefits mentioned above can also be done using setters and getters as well, as said above, they are just syntactic sugar. Learning how they can be used to control access rather than being used as public data members can help flesh out some nice code as well.

## An honourable TypeScript Mention

Typescript itself has a similar method of implementing getters on private variables, which I remembered when I was reading up on properties. This looks quite similar to the C# Properties implementation and hence the mention here.

```js
class MyClass {
    private _property;
    public get property() {
        return _property;
    }
}

var data = new MyClass();
var value = data.property;
```