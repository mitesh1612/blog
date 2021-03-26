---
toc: false
layout: post
description: An interesting problem I encountered while working and an equally interesting solution suggested to me. How to use the same code to create complex data structure of two different classes.
categories: [C#, dictionaries, objects]
title: Constructing a complex dictionary of base and derived class using the same code
image: images/2020-08-13-constructing-objects/hero.jpg
comments: true
---

Okay, really complex title aside, I'll try to explain the problem I had and the interesting way I found to solve it. This may not be the best or the most optimized way, but I really liked this solution and would like to share it.

Also, although I do prefer Python, this post is in C#, since that was the language I encountered this problem in.

So here is the problem. Say we have two C# Classes

```cs
public class BaseClass
{
    public string SomeProperties { get; set; }
}

public class DerivedClass : BaseClass
{
    public string SomeOtherProperties { get; set; }
}
```

I wanted to construct a Dictionary of these classes like ```Dictionary<string, BaseClass>``` and ```Dictionary<string, DerivedClass>``` at two very different places. The construction of each dictionary element was not that trivial due to the inherent complexity of filling the properties for both the classes. Here is an example of how one of the dictionaries was being created:

```cs
// For the base class
var map = new Dictionary<string, BaseClass>();
foreach(var someProperty in someList)
{
    var baseElement = new BaseClass(someProperty);
    map[someProperty] = baseElement;
}

foreach(var dependency in dependencyList)
{
    map[dependency.To] = map[dependency.From]
}

// For the derived class
var map = new Dictionary<string, DerivedClass>();
foreach(var someProperty in someList)
{
    // someOtherProperty comes from somewhere else
    var derivedElement = new DerivedClass(someProperty, someOtherProperty);
    map[someProperty] = derivedElement;
}

foreach(var dependency in dependencyList)
{
    map[dependency.To] = map[dependency.From]
}
```

As you can see, there is a lot of logic repeating since the properties that were created for the base class were also created for the derived class, but when we create the DerivedClass object, new properties were also to be added to those object. Both the objects differ in how they are constructed but the way the map is created is similar. I wanted a way to reuse these for loops instead of writing them for both `BaseClass` and `DerivedClass` and other classes that might inherit from `BaseClass` later.

My basic idea was to use a Template method like this.

```cs
public Dictionary<string, <T>> CreateDictionary(parameters)
{
    while(someConditionOnParameters)
    {
        if(T is BaseClass)
        {
            // Base class object creation code
        }
        else if(T is DerivedClass)
        {
            // Derived class object creation code
        }
        // repeated dictionary creation code
    }
}
```

The other problem that I encounter here in was the arguments to this method. When we create the BaseClass object, I require fewer properties but when I created DerivedClass object, I require more properties and hence the number and type of arguments couldn't be fixed. Of course, I can set/pass them as `null` and ignore when not needed, but that didn't feel like a tidy solution to me. Plus later on, when we derive a new class from BaseClass, again the signature of method changes which might break a few things here and there.

That's when I was suggested the interesting solution to this problem, the one I am going to share now. We keep one function that creates this dictionary but rather than passing the parameters to create the objects, we pass a function that creates those objects for us. For example when we want to create the BaseClass dictionary, we can pass a function that creates the base class object and so on. This way this method can be extensible for any classes that derive from future as well. Here is a dummy code to show how that method might look like

```cs
public Dictionary<string, BaseClass> CreateDictionary(DataObject requiredData, Func<Data, BaseClass> objectCreator)
{
    var map = new Dictionary<string, BaseClass>();
    foreach(Data propertyValues in requiredData.data)
    {
        var element = objectCreator(Data);
    }
    foreach(var dependency in requiredData.dependencies)
    {
        map[dependency.To] = dependency.From;
    }
}
```

Now when I want to create the base class dictionary, I can call it like:

```cs
var map = CreateDictionary(requiredData, x => 
{
    return new BaseClass(x.somePropertyValue);
});
```

Or if I want the derived class dictionary, like this:

```cs
var map = CreateDictionary(requiredData, x => 
{
    return new DerivedClass(x.SomePropertyValue, someOtherPropertyValue);
});
```

I really loved this solution, its nifty and useful and this didnt come to my mind easily.

### Closing Thoughts

I know this is a really specific and weird problem to encounter, and some constraints of why this solution was used over other ways are not clear from the vague names and class designs (and possibly incomplete details) I provided. However, I really found the solution interesting and felt like sharing it.

You can always share your thoughts on this by @'ing me on Twitter or LinkedIn (links are available in my author bio) or even this blog's [GitHub repo](http://github.com/mitesh1612/blog).