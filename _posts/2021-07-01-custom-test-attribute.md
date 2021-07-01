---
toc: false
layout: post
description: How I made a custom attribute to decorate my usual tests with extra behavior for tests written using the MS Test Framework.
categories: [C#, Testing]
title: How to create a custom C# Attribute to Inject Extra Behavior in Tests
comments: true
---

So the title definitely sounds way more complicated than it has any right to, so I'd rather suggest you to read through this post to completely understand the problem and the solution I went with. As I always says, the solution seems trivial, and you might already know something on the lines of it, but it took me a good amount of researching and experimenting to get it to work, so I thought I should share it.

Also do note, that this doesn't solve the general problem of injecting extra behavior using C# attributes or use C# attributes as decorators like in Python, that I still feel requires a lot more effort. This just solves the problem for writing tests. Apologies if you stumbled here and this doesn't solve your problem. 😀 

## The Problem Statement

So we (as in me and my team) created a custom feature flag service for ourselves (keep an eye out for a future posts regarding my findings about the whole ordeal). Now we wanted to enhance our existing test framework to make our existing tests work with feature flags. We wanted options to run our test where the developer can declare/specify the expected state of the feature flag before the test, and it will be set as such, and wanted the experience to author new tests and modify existing tests as seamless as possible.

So to start with we created some helper methods, and instructed everyone to "wrap" their test code between the required helper methods like so:

```cs
[TestMethod]
public void SomeRandomTest()
{
    FeatureFlagHelpers.SetFeatureFlag(featureName, featureState);
    // Actual test code
    FeatureFlagHepers.UnsetFeatureFlag(featureName, featureState);
}
```

While this did serve the purpose we wanted, this process is cumbersome for devs to author tests with the feature flag service. Moreover I feel this is error prone. What if the dev forgot to unset the feature flag in the excitement of writing those bunch of assertions? It can interfere with other tests as well.

We wanted something simpler, and similar to something like Python decorators, where in we can just use an attribute to decorate the test with desired configuration for the feature flag, and that should be it. Something like:

```cs
[FeatureFlag("featureA", true)]
[TestMethod]
public void SomeRandomTest()
{
    // Actual test code
}
```

## Our Limitations

So our testing framework is simple, and we use [**MSTest**](https://docs.microsoft.com/en-us/dotnet/core/testing/unit-testing-with-mstest) as our testing framework. We wanted to avoid any complex libraries or making the test framework more complex (like adding super reflection heavy code?).

I also wanted to use C# Attributes, because usually test authors are already in the habit of using attributes to annotate the test methods.

I read up on C# Attributes and I realised, they are quite different from their Python counterparts. While Python decorators can be used to add extra behavior to existing methods, C# attributes just add metadata and are basically useless for that purpose. (One post laughingly also called them as  *glorified comments*).

## The Journey to the Solution

So from my earlier specification, this seemed like the perfect fit for the [decorator design pattern](https://channel9.msdn.com/Shows/Visual-Studio-Toolbox/Design-Patterns-Decorator). It is essentially used to add extra behavior to existing classes/code.

I quickly threw up a simple higher order function type solution for my problem like this:

```cs
public static void RunFeatureFlagTest(Action testToRun, string featureName, bool featureState)
{
    FeatureFlagHelper.SetFeatureFlag(featureName, featureState);
    testToRun();
    FeatureFlagHelper.UnsetFeatureFlag(featureName, featureState);
}

[TestMethod]
public void SomeRandomTestRunner()
{
    RunFeatureFlagTest(SomeRandomTest, "featureA", true);
}

public void SomeRandomTest()
{
    // testing code
}
```

So now we are basically wrapping the execution of test with a higher order function (eerily similar to how Python decorators are written). So for a developer, now they have to write their code. Then create a runner function invoking the test using the higher order function we wrote. I still feel this is a reasonable trade-off and definitely better than the original way, but I wanted to look further for solutions.

So I started reading on how to achieve a lot of things using C# Attributes. I read up about [Aspect Oriented Programming](https://en.wikipedia.org/wiki/Aspect-oriented_programming) and how [**PostSharp**](https://www.postsharp.net/) can be used to achieve exactly what I wanted using C# attributes. But as I said, I wanted to avoid using any extra library, and thus ignored this suggestion.

It felt like we can solve this problem using reflection, or hey, even the new [source generators](https://devblogs.microsoft.com/dotnet/introducing-c-source-generators/) feature of .NET seems like a great way to do it, like [this](https://medium.com/rocket-mortgage-technology-blog/generating-code-in-c-1868ebbe52c5) and [this](https://www.infoq.com/articles/CSharp-Source-Generator/) articles were doing for themselves. But I am not good at reflection, yet 😉 and source generators are a preview feature at the time of writing. (Although they also seemed quite complex to me).

Then I went to basics, looked into how the MS Test Framework uses the `[TestMethod]` attribute.

## Hacking with the TestMethod Attribute

So I realised that the second attribute `[DataTestMethod]` basically inherits the `[TestMethod]` attribute. This got me thinking, what if I also inherit from the `[TestMethod]` attribute and create my own custom attribute. Hopefully MS Test recognizes methods decorated with that attribute as test methods as well and runs them using VS Test Explorer or `dotnet test` command. Boy I was right!

The `TestMethodAttribute` class looks something like this:

```cs
public TestMethodAttribute : Attribute
{
    public TestMethodAttribute() { }

    public TestResult[] virtual Execute() { } // This executes the test and returns test results of type TestResult
}
```

Interestingly, the `virtual` keyword preceeding the `Execute()` method downright indicated that this method was made to be overriden and do interesting things with (I know I know, C# basic feature, but boy was I happy for it being helpful in this real life situation).

Awesome, so I need to inherit this attribute, inject whatever behavior I wanted before calling the base's `Execute` method and ideally my problem is solved. This is exactly the solution. So my final test attribute looked like this.

```cs
public FeatureFlagTestAttribute : TestMethodAttribute
{
    private string featureFlagName;
    private bool featureFlagState;

    public FeatureFlagTestAttribute(string ffName, bool ffState)
    {
        featureFlagName = ffName;
        featureFlagState = ffState;
    }

    public override TestResult[] Execute()
    {
        FeatureFlagHelper.SetFeatureFlag(featureFlagName, featureFlagState);
        var results = base.Execute();
        FeatureFlagHelper.UnsetFeatureFlag(featureFlagName, featureFlagState);
        return results;
    } 
}
```

And now the tests can easily be authored as follows:

```cs
[FeatureFlagTest("featureA", true)]
public void SomeRandomTest() { } // testing code.
```

This is exactly what I wanted.

## Closing Thoughts

I know this is again a specific problem, for people using MS Test Framework, but I think similar things could be achieved with NUnit or other testing frameworks as well. If you have thoughts or suggestions on how this problem could have been solved in a better way, feel free to sound off in the comments. Hope this article was fun for you, catch you in the next one. 😀