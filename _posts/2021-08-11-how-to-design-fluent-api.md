---
toc: false
layout: post
description: A introductory post talking about fluent apis, its pros and cons and how to design one for yourself from scratch.
categories: [C#, design, fluent]
title: How to Create a Fluent API in C#
image: images/2021-08-11-how-to-design-fluent-api/hero.png
comments: true
---

If you are a regular C# developer, you must have seen a "Fluent" API/Class commonly, for example while using LINQ

```cs
var recentBigCustomers = OrdersList.Where(o => o.Amount > 1000 && o.Date >= DateTime.Now.AddDays(-5))
                                .OrderBy(o => o.Amount)
                                .Take(10)
                                .Select(o => o.Customer)
                                .ToList();
```
This post will introduce these Fluent APIs, share some common benefits and pitfalls of using such an API and a short tutorial on how to design such a class yourself.

## What are Fluent APIs?

So we use `MSTest` for our testing framework and our assertions for tests look something like this:

```cs
[TestMethod]
public void ValueOfProperty_ShouldBeEqualTo_Five()
{
    var propertyValue = 5;
    Assert.AreEqual(propertyValue, 5);
    // or can be Assert.IsTrue(propertyValue == 5)
}
```

and I was used to seeing all the tests employ similar assertions. But then one fine day, I saw a completed PR that added new tests and their aseertions looked much cleaner, something like this:

```cs
[TestMethod]
public void ThisTest_ShouldThrow_ArgumentException()
{
    Action a = () => throw new ArgumentException("MyMessage");
    a.Should()
     .Throw<ArgumentException>()
     .And
     .Message
     .Should()
     .Contain("MyMessage");
}
```

They were using this library called [Fluent Assertions](https://fluentassertions.com/) to write their assertions, and although it doesn't fundamentally change the test or performance, the code looks readable. There is a similar library to write validations as well, aptly named [Fluent Validation](https://fluentvalidation.net/).

(**Side Note**: I know these look a lot like the assertions used in Jest test runs as well).

The name of the library caught my eye, 'Fluent' Assertions. So I looked into that library. I was intrigued by the class design for this library and then I recalled, hey this API looks a lot like how LINQ methods are used in C# as well.

So I started reading up on what 'Fluent' APIs are. I think Martin Fowler's [blog post](https://martinfowler.com/bliki/FluentInterface.html) on them is a good introduction, but I am going to take a stab at it as well (although do read that post once you're done here).

Sometime or other you must've written code like this:

```cs
string value = input.ToString();
value = value.ToLower();
value = value.Trim();
value = value.Substring(1, 5);
```

or the more weirder version where you create multiple temporary values. Since all the string methods return a string, we can write this in a more concise way like this:

```cs
string value = input.ToString().ToLower().Trim().Substring(1, 5);
```

Again, they both do the same thing, but this is more concise and readable according to me.

The other benefit I see of using a Fluent API is great code-completion or "Intellisense" where the IDE itself can suggest what you should write next and you don't need to read through a bunch of API docs to understand what methods a class providers to you.

The intention of designing a 'fluent' API is to produce an API that is readable and flows. We can do similar things in with a non-fluent API as well, and granted do it as well, but like in the LINQ example, it would need a lot more lines of code and a bunch of temporary variables.

To be honest, my fascination with them was mostly because it looked cool and interesting to me, and to convert an existing class or code I've written to a 'fluent' styled API seemed interesting to me. So I'll skip writing about the practical benefits and pitfalls of creating such an API until after the tutorial.

I thought what better way to learn how to write a Fluent API than to create one yourself. So lets create a simple fluent API from scratch.

I'll walk through a (mostly) toy problem, and show you two ways to create a Fluent API, a simple way and a more better way to create a Fluent API.

## The (toy) Problem

So we usually write a Dockerfile by hand. If you don't know what Docker or Dockerfile is (which the toy problem relies a bit on), I'd recommend quickly going through this [amazing video by Fireship](https://www.youtube.com/watch?v=Gjnup-PuquQ) that explains it in 100 seconds. Done? Lets move forward then.

So we write a dockerfile by hand, but I wanted to represent a Dockerfile using a C# object, then set the various components for it, like the base image, or the commands I want to run using property setters on that object and finally get the actual text Dockerfile content using a `GenerateDockerfile()` method. If it sounds complicated, its really not (seeing the class in action soon might help in clarifying it a bit more).

Instead of creating a normal class, I thought of writing it as a "Fluent" class.

Now lets solve the problem.

If you want to see the final result, you can [check this repo](https://github.com/mitesh1612/FluentDockerfileGenerator) containing all the code that we are going to write.

## The Simple Way to Create a Fluent API

If you look at the Fluent API from the surface, you see that all the methods that are chained together are essentially setters, and these setters return a value, usually the same object back, so more methods can be chained on top of them. This is exactly the simple way to write a fluent API.

Take for example that we want to write a `SimpleFluentDockerfileGenerator` which works like this:

```cs
var dockerFile = SimpleFluentDockerFileGenerator.CreateBuilder()
                .FromImage("node:12")
                .CopyFiles("package*.json", "./")
                .RunCommand("npm install")
                .WithEnvironmentVariable("PORT","8080")
                .ExposePort(8080)
                .WithRunCommand("npm start")
                .GenerateDockerFile();
```

Here each method would be returning the same object and at last the `GenerateDockerFile()` would return the text content of the docker file.

If you see, there are two important methods. One is the entry method like `CreateBuilder()` above or `Initialize()`. Although not really required (like in LINQ), these are important in setting up the skeleton of the underlying object. The second one is the exit method like `ToList()` in LINQ or `GenerateDockerFile()` here which gives the actual result. All the other outputs are partial outputs.

The other important aspect of this fluent class comes from the entry method. The constructor for this class should be `private`. Why private? Because otherwise a user can just do

```cs
var _ = new SimpleFluentDockerFileGenerator()
```

and we dont want that. So instead we make the constructor private and create a static factory method on the class.

Taking these two principles, we can build a simple version of the Fluent class. Here is a snippet of my Fluent Class:


```cs
public class SimpleFluentDockerFileGenerator
{
    private StringBuilder _dockerFileContent;

    private SimpleFluentDockerFileGenerator()
    {
        this._dockerFileContent = new StringBuilder();
    }

    public static SimpleFluentDockerFileGenerator CreateBuilder()
    {
        return new SimpleFluentDockerFileGenerator();
    }

    public SimpleFluentDockerFileGenerator FromImage(string imageName)
    {
        this._dockerFileContent.AppendLine($"FROM {imageName}");
        return this;
    }
}
```

Here I am using `StringBuilder` to store the actual string content of the dockerfile and the setters are essentially just adding content to this string builder. (there might be other ways to do it like having a bunch of private properties, but this is the way I chose). As you can see, my constructor is private which initializes a new object and I have a factory method that returns a new object.

You can also see the setter method `FromImage` that adds content to the object and returns it back, which will enable us to use "method-chaining" on our objects.

And really, that's it. You can keep adding such methods to add more content and complete the fluent class. Here is a [link to my implementation](https://github.com/mitesh1612/FluentDockerfileGenerator/blob/main/SimpleFluentDockerFileGenerator.cs) of the same class.

### The Problem with this Approach

You might be thinking, hey if creating a Fluent API is this simple, why can I see a lot of content remaining in this post?

While this approach is simple for bootstrapping, can you find an issue by designing your fluent classes in this way? (Just issues in the fluent design only 😅)

The major issue is that, there is no guidance on the order of methods a user should use. When the user loads up the object in their IDE and sees all the method suggestion, they don't really get a hint of which methods are required to be called or what order they should be called in. So a user can do something like:

```cs
var dockerFile = SimpleFluentDockerFileGenerator.CreateBuilder()
                .CopyFiles("package*.json", "./")
                .RunCommand("npm install")
                .ExposePort(8080)
                .WithRunCommand("npm start")
                .GenerateDockerFile(); // Where's the base image!!
```

and get a dockerfile without a base image and no error would be thrown. I know we can maybe add validations to ensure its called and stuff like that, but it still doesn't solve our other problems like guiding the user about the order of the methods used or bombarding with all the available methods instead of a few available ones.

For example in LINQ, whenever you call the `OrderBy()` method, that method gives you **new** methods that you are able to call like `.ThenBy()` or `.ThenByDescending()`. It doesn't make sense to perform `.ThenBy()` on its own.

I think the approach we are going to see now is powerful in these aspects. They in a way guide a user on what methods are available, what their natural order should be, and how the user can avoid shooting themselves on the foot by missing calling some important methods.

## The Better Way to Create a Fluent API

If you guessed it, great. If not, hey that's why I am writing the post right. We are going to use **Interfaces** to solve all the problems listed above.

Like in the LINQ OrderBy example, when you call `OrderBy()` on an `IEnumerable` object, instead of returning another `IEnumerable`, it returns an object of type `IOrderedEnumerable` which adds or remove new methods in your method chain.

We are going to create interfaces to limit the next set of methods an object can call or what methods are allowed to be called at a particular time. Then our class would implement our interfaces and the methods would change their return types from the class to the respective interfaces thus giving us the better, guided flow we want.

There are multiple ways regarding the process about designing a fluent API, for example [this article](https://scottlilly.com/how-to-create-a-fluent-interface-in-c/) shows a great process on it, by defining various grammar rules and then using them to create interfaces.

I am going to try something different. Let's try to see the order of methods that we can call using a state diagram [and no I am not using this way to flex on my excalidraw skills, although a man can do both]. Consider the following state diagram.

![]({{ site.baseurl }}/images/2021-08-11-how-to-design-fluent-api/InitialStateDiagram.png)

As you can see, after you create the builder, the first method should be `FromImage()` to set the base image. After calling it, we can set any of the other properties like copying files, setting environment variables, running commands, exposing port with their respective methods, but you shouldn't be able to get back to set the base image again here. You can cycle through any of the states, i.e. any state should be reachable from any other state. From all of these states, you should be able to reach the penultimate state that can set the container startup command using the `WithCommand()` method. Again, once you reach there, you shouldnt be able to go back to any previous state (since there is no point of setting any other properties after adding the container startup command). After this, you should only be able to generate the dockerfile.

Let us define these "stages" (I am referring to stages as a bunch of states) as

1. `CanSetBaseImage`
2. `CanSetContainerProperties`
3. `CanAddRunCommand`
4. `CanGenerateDockerfile`

So we can group our states in our previous state diagram like this:

![]({{ site.baseurl }}/images/2021-08-11-how-to-design-fluent-api/StateDiagramWithStagesMarked.png)

Now if we define the transition between these stages as follows, we get this:

![]({{ site.baseurl }}/images/2021-08-11-how-to-design-fluent-api/StageTransitionDiagram.png)

We can now model these stages as interfaces now, and use the transition between these stages to determine the return type of each methods.

So for example, I can create an interface `ICanSetBaseImage` which will be returned by the `Create()` class. This will only contain the method to set the base image (the `FromImage()` method). The return type of this method would be the next interface in the stage transition diagram, `ICanSetContainerProperties`:

```cs
public interface ICanSetBaseImage
{
    public ICanSetContainerProperties FromImage(string image);
}
```

If we look at the end of the stage diagram, we can create an interface called `ICanAddRunCommand` that will only let the user add the container startup command and that method returns an object of the interface called `ICanGenerateDockerfile` which only lets you generate the dockerfile now.

```cs
public interface ICanAddRunCommand
{
    public ICanGenerateDockerFile WithCommand(string command);
}

public interface ICanGenerateDockerFile
{
    public string GenerateDockerFile();
}
```

Now for the `ICanSetContainerPropertiesInterface`. For all the methods in this interface, they can call their methods again (signified using the loop in the transition diagram) or use the `WithCommand` method to break out of it. We can model this using inheritance between the interfaces.

```cs
public interface ICanSetContainerProperties : ICanAddRunCommand
{
    public ICanSetContainerProperties CopyFiles(string source, string destination);
    public ICanSetContainerProperties RunCommand(string command);
    public ICanSetContainerProperties ExposePort(int port);
    public ICanSetContainerProperties WithEnvironmentVariable(string variableName, string variableValue);
}

public interface ICanAddRunCommand
{
    public ICanGenerateDockerFile WithCommand(string command);
}
```

This would let the object either call the same methods again or use the `WithCommand` method to short circuit and get out of the loop.

Once this is done, we can make our class implement all these interfaces as follows:

```cs
public class FluentDockerfileGenerator :
        ICanSetBaseImage,
        ICanGenerateDockerFile,
        ICanSetContainerProperties,
        ICanAddRunCommand
    {
```

and then change the return type of the respective methods to the appropriate interface types like:

```cs
public class FluentDockerfileGenerator :
        ICanSetBaseImage,
        ICanGenerateDockerFile,
        ICanSetContainerProperties,
        ICanAddRunCommand
{
    private StringBuilder _dockerFileContent;

    private FluentDockerfileGenerator() // The private constructor
    {
        this._dockerFileContent = new StringBuilder();
    }

    public static ICanSetBaseImage CreateBuilder()
    {
        return new FluentDockerfileGenerator();
    }

    public ICanSetContainerProperties FromImage(string imageName)
    {
        this._dockerFileContent.AppendLine($"FROM {imageName}");
        return this;
    }
```

You can refer to [this link to the repo](https://github.com/mitesh1612/FluentDockerfileGenerator/blob/main/FluentDockerfileGenerator.cs) containing the full code for this class.

Now if we use the same fluent class, we get in a way guided tour of the natural order of methods and the methods we have at our disposal. Here are a few examples of the awesome code completion we get with this fluent class.

![]({{ site.baseurl }}/images/2021-08-11-how-to-design-fluent-api/CodeCompletion.png)

Do take a look at the complete code in [the repository](https://github.com/mitesh1612/FluentDockerfileGenerator), and contributions are always welcome. 😀

## So what did we lose?

### Requirement of Domain Knowledge

The best start to discussing the benefits and pitfalls of creating a fluent API comes for the example itself that we took. As you can see, designing a fluent API is really domain specific like the example was really specific to the domain of generating a dockerfile and this is what Martin Fowler believes as well. This requirement of the domain knowledge forces you to think as a user of your API, how well your API communicates with the users and is critical to the success of it as well. This also trickles down to the users of the API, but only if the API is not well designed I believe. If the user is not well versed in the domain, they would be lost trying to combine enigmatic methods, stitching things together until they work. Although a well defined fluent API can remediate a lot of it.

### Design Roadblocks

Usually you are likely to hit design roadblocks while designing a fluent API (as with any API design in general), since this is not a design pattern nor a framework and I'll try to outline a few common deficiencies if you decide to implement such an API.

1. **Gratuitous Extension Methods**, where you keep adding new methods to avoid the cost of refactoring
2. **Context Confusion**, where sometimes new methods totally unrelated to the original context are added
3. **Exception MisManagement**, where you have to write a lot more code to handle and manage exceptions better
4. **Viscous Interface**, where due to the above 3, the interface loses its fluency over time.

For more details on this problem, I'd recommend going through [this article](https://www.red-gate.com/simple-talk/development/dotnet-development/fluent-code-in-c/)

Or this one very wonderful comment I found on this wonderful [YouTube video](https://www.youtube.com/watch?v=1JAdZul-aRQ) on how to write a Fluent API. 

![]({{ site.baseurl }}/images/2021-08-11-how-to-design-fluent-api/YoutubeComment.png)

## And what did we gain?

I think the biggest benefit of a Fluent Interface, when designed well, *only let you use what makes sense to use in the current context*. In a properly designed fluent interface, you shouldn't be able to:

- Call the methods in the wrong order
- Be confused on where to start
- Be confused about where to go next
- Call methods in a specific chain partially

Fluent Interface design gives the developer a techinique for building code that is designed with the intent that other people might actually be reading it. This also creates a new mindset where instead of thinking "what data does this object have", you are forced to think about "what kinds of things this object can do?"

These benefits may seem superflous or not worth the effort required to build such an interface API and I totally get that.

To me, as I said, it looks cool, and that was a reason enough to me to learn a bit more about them, and I hope this post does the same for you.

That's it for this one. You can always share your thoughts on this by leaving a comment on this post. If you liked what you read, you can try reading some other posts on my blog as well, and you can also connect with me on my socials.
