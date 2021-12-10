---
toc: false
layout: post
description: How the default singleton pattern becomes an anti-pattern at times and how we can improve on its flaws in different ways to create ambient services in your code.
categories: [C#, design-patterns, design]
title: Improvements and Implementations of the Singleton Pattern
comments: true
---

Singleton is probably one of the easiest design patterns from the [Gang of Four book](https://www.amazon.in/Design-Patterns-Object-Oriented-Addison-Wesley-Professional-ebook/dp/B000SEIBB8). Its easy to understand and fairly simple to implement. Then Why is it hated? How is it easy to misuse?

Let's see step by step on what's wrong with the pattern, how we can fix its flaws and collect some learnings on the way.

For the code examples, I will assume that we will be writing a service called `SomeService` as a singleton that can be used anywhere across a .NET app. This service was designed as a singleton and not passed using Dependency Injection to make it available as an ambient service across the code base, deep inside the business logic. The pain points still apply for using Singleton for any other class as well.

Just a heads-up, the code examples will be in C#, but the flaws and improvements work in whatever language you work with. 😀

## Implementing Singleton using a Static Property

So the base, vanilla implementation of the singleton pattern is quite easy, you make the constructor private (or protected if that's your jam) and provide a static `instance` property which will be used to access the singleton object. Here's how that is implemented

```cs
public class SomeService
{
    private SomeService()
    {
        Console.WriteLine("Some heavy service initialization");
    }

    private static readonly SomeService _instance = new SomeService();

    public static SomeService Instance => _instance;

    // Other properties of this service
}
```

And it can be used as

```cs
var someSvc = SomeService.Instance;
```

As I said, simple enough. This is the easiest implementation to work with.

Not, lets discuss a few cons of going with this default way.

### Cons of Default Implementation

- Not lazy. The instance will be instantiated when the type is loaded. This means whether the instance is used or not, it will always be loaded, and will cause a performance issue if the service initialization is really heavy. But that has an easy fix, more details below.
- The singleton object cannot be replaced with the another type of object at runtime in a polymorphic way. Since there is no interface for the SomeService, I can only work with this one implementation of it.
- The code that uses Singleton is not easily testable. Let's say I have some code consuming this service. Since the code is relying on a static singleton, it's actually hard to mock or stub it and that reduces the testability. Also since this is a static, it is generally bad for testing [as discussed here](https://stackoverflow.com/questions/25591309/why-static-methods-are-bad-apart-from-tests).
- Using a singleton creates implicit dependencies in the rest of the code.
- It also violates the single responsibility principle because the class has 2 responsibilities, its main work and it is also responsible for creating itself.

Let's try to fix a few of these cons by making slight changes to the default implementation of the Singleton pattern.

### Lazy implementation using `Lazy<T>` class

We can fix the first con by using `Lazy<T>` class. The singleton object will only be instantiated when the Instance property is actually accessed.

```cs
public class SomeService
{
    private SomeService()
    {
        Console.WriteLine("Some heavy service initialization");
    }

    private static readonly Lazy<SomeService> _instance = new Lazy<SomeService>(() => new Singleton());

    public static SomeService Instance => _instance.Value;

    // Other properties of this service   
}
```

This makes the implementation a 100% lazy and still maintains the ease of implementation. But the other cons still hold true here like no extensibility, it is not testable and it still violates the Single Responsibility Principle.

### Double-Checked Locking based implementation

Yes, we are still editing the vanilla pattern a bit more. This implementation is almost similar to the previous ones, but from a learning standpoint, it provides a few standouts. It shows how to use [doubled-checked locking technique](https://en.wikipedia.org/wiki/Double-checked_locking), the [volatile keyword](https://www.c-sharpcorner.com/UploadFile/1d42da/volatile-keyword-in-C-Sharp-threading/) and [lock synchronization](https://www.javatpoint.com/c-sharp-thread-synchronization). This is a great implementation for a concurrent distributed system, since its completely thread safe.

```cs
public class SomeService
{
    private static volatile SomeService _instance;
    private static readonly object _lock = new object();

    private SomeService()
    {
        Console.WriteLine("Some heavy service initialization");
    }

    public static SomeService Instance
    {
        get
        {
            if (_instance == null)
            {
                lock (_lock)
                {
                    if (_instance == null)
                    {
                        _instance = new SomeService();
                    }
                }
            }
            return _instance;
        }
    }
}
```

Using this locking construct makes this singleton implementation thread safe.

This still doesn't solve the other cons listed above and it also makes the implementation a bit complicated.

## Singleton or Dependency Injection?

The main complaint for the default Singleton pattern is that is doesn't support dependency injection principle which hinders testability for the code that consumes this singleton service. It acts as a global constant and its really hard to substitute it with a test double.

Dependency Injection is preferable when we have a non-stable dependency. It's a good practice, as it provides great testability and lets a class specify everything it needs to function properly.

But then there are some dependencies that can be better represented using a Singleton. These are **ambient dependencies**. Ambient dependencies are dependencies which span across multiple classes and often multiple layers. They act as cross-cutting concerns for your application.

It doesn’t really make sense to apply the Dependency Injection design pattern for such dependencies as they are going to be everywhere anyway.

For such dependencies, its easier to make it ambient and clean up the dependency graph for consuming code. Without doing this, the code base would be flooded with the excessive number of the same dependencies traversing most of your classes. There might also be cases where you might need to create a tree of passing the dependency to some business logic class from the point where all dependencies are received.

## Implementing Singleton using the Ambient Context Pattern

So one of the major flexibility for the default Singleton pattern is the lack of flexibility at runtime. Since any code consuming this service depends on the concrete implementation itself, we are unable to replace it with say an `ExtendedSomeService` or `MockSomeService`. To achieve extensiblity at runtime, while also having a global access point, we can use the [Ambient Context Pattern](http://core.loyc.net/essentials/ambient-service-pattern.html). Let's start with seeing the implementation directly.

(Also hey, sound off in the comments if you want to see my take on ambient context pattern).

```cs
public interface ISomeService { }

public class SomeService : ISomeService
{ }

public class MockSomeService : ISomeService
{ }

public class SomeServiceContext
{
    public static ISomeService Current { get; private set; }

    public static void Initialize(ISomeService object)
    {
        Current = object;
    }
}
```

And then we can initialize or use it like so:

```cs
// Initialization in the application code
SomeServiceContext.Initialize(new SomeService());

// Intialization in unit tests
SomeServiceContext.Initialize(new MockSomeService());
```

Now to access SomeService, we always use the `SomeServiceContext.Current` property and use the `Initialize` method to change the concrete implementation at runtime, thus giving us more flexibility. Also introducing the interface for `SomeService` allows us to extend or mock the existing service code and still make it usable with our `SomeServiceContextClass` to access the modified version without modiying the usage points of this service.

The most obvious pro of jumping through these hoops is to achieve runtime flexibility. Also since now `SomeService` only does its own work, we are not violating the Single Responsiblity Principle.

Now about the glaring **Con**: This is not the Singleton pattern anymore. As it is visibile clearly, now someone can create many many instances of the `SomeService` class, which was supposed to be a singleton and they might not be the same as accessed from the context class.

### Another variant of this pattern using an initializer/factory method

Another variant of this same pattern is to use a factory method that is responsible to create the current instance, and it will look something like this:

```cs
public class SomeServiceContext
{
    public static ISomeService Current { get; private set; }

    public static void Initialize(Func<ISomeService> someSvcFactory)
    {
        Current = someSvcFactory();
    }
}
```

It can also be implemented as:

```cs
public class SomeServiceContext
{
    public static ISomeService Current { get; private set; }

    // This can also be implemented as
    private static readonly Func<ISomeService> _initializer;

    public static void SetInitializer(Func<ISomeService> initializer)
    {
        _initializer = initializer;
        Current = initializer();
    }
}
```

In this version, changing the initializer changes the singleton object returned.

This and the other 2 implementations also leave one more hole in the codebase. We cannot forget to initialize singletons before using them otherwise it might cause issues. (I guess this is called [*Temporal Coupling*](https://blog.ploeh.dk/2011/05/24/DesignSmellTemporalCoupling/)?)

Another approach here is to merge the `SomeService` and `SomeServiceContext` class, which although violates the single responsibility principle.

## Singleton using IoC Containers

Okay I cheated on this one. You can use the default `ServiceProvider` provided by .NET or some other IoC (Inversion of Control) container that lets us register an object with a lifetime scope and they provide a Singleton scope as well.

We can then register a dependency on the object and the IoC container will provide us the instance with a Singleton lifetime. That way, the main goal of keeping the object a singleton across the code, is achieved.

Since we are using the IoC container (and registration is usually against an interface), this makes the consuming code easily unit testable. It also doesn't violate Single Responsibility Principle since now the creation is the concern of the IoC container.

The con still exists that nothing's stopping you to create multiple instances of `SomeService` in your code.

## Modelling the Singleton as a Dependency in the Consuming class

There is one more shortcut to reduce the control the dependency in the consuming code for the singleton service while mostly using the default pattern. The consuming code can take the singleton as a dependency in the constructor with default value as the default singleton's instance, like so:

```cs
public ConsumingService
{
    private SomeService _someServiceInstance;

    public ConsumingService(SomeService instance = SomeService.Instance)
    {
        _someServiceInstance = instance;
    }
}
```

Now for testability, we can pass a mock for the SomeService code instead of actual service and we get runtime flexibility without adopting the ambient context pattern.

## Closing Thoughts

Singleton pattern is quite useful for ambient services, but their default implementation is not that great. Singleton can be a good pattern if:

- It doesn't have a state which can be modified in different parts of the application and affect the behvior of all the other parts.
- You use the different implementations discussed above or a combination of those so that the consuming code is more testable and easy to work with.
- The use/dependency of the singleton is not hidden deeply into the code.
- Otherwise use the singleton in a code that will not be unit tested.

For further reading on this topic, I would suggest [this post](https://enterprisecraftsmanship.com/posts/singleton-vs-dependency-injection/) which has way more pictures.

And I end it with a generic statement, this pattern can be good, given its used wisely!

That's it for this one. You can always share your thoughts on this by leaving a comment on this post. If you liked what you read, you can try reading some other posts on my blog as well, and you can also connect with me on my socials.
