---
toc: false
layout: post
description: An introduction and deep dive into CancellationToken to achieve cancellation in asynchronous operations, alongwith recommended patterns to use it.
categories: [C#, deep-dive, asynchronous]
title: A Deep Dive into C#'s CancellationToken
comments: true
---

One of my goals for writing this blog was to store things I learnt for myself and refer to them later (while also sharing it with the world) and today's post is something along those lines.

Recently I have started dabbling into asynchronous programming in C# while writing a side project, and I saw a lot of methods using something called `CancellationToken` in their signatures. I knew it was related to cancelling an asynchronous operation (name is a dead giveaway, right?), but that was the extent of my knowledge. So I did a deep dive into the topic, and here I present a shorter version of everything I learnt so far.

Do note that this post doesn't cover how to do asynchronous programming or the TAP/Task-based Asynchronous Pattern, [here is a great reference from Microsoft docs](https://docs.microsoft.com/en-us/dotnet/standard/asynchronous-programming-patterns/task-based-asynchronous-pattern-tap), if you want a refresher on those topics

Also, eventhough this post is really specific to C#, the design of CancellationToken is pretty interesting and this can be an interesting read for you, eventhough your language of choice isn't C#, so do read on. 😊

## So what is a `CancellationToken`?

Obviously, asynchronous code is good for long running operation, and the provided task mechanism is plenty powerful. But sometimes we need to control the execution flow of this tasks. Why? We want observability into our tasks and not let some task hold the CPU and thread pool and hog down precious resources. Sometimes we want to have a difference between a task getting cancelled manually versus cancelling it due to an exception (or timeout?).

Well worry not, .NET provides us with a mechanism for cooperative cancellation of asynchronous operations, based on a lightweight object called *cancellation token*.

### Basic Mental Model for the Cancellation Tokens

We have an object that creates one or more long running asynchronous operations. This object will pass this token to all of these operations. The individual operations can in turn pass copies of this token to other operations as well. At some later time, the object that created the token can use it to request the operations to stop what they are doing, essentially requesting a cancellation. This request can only be issued by the requesting object, i.e. no individual operation can cancel itself and other operations with that token. Importantly, each listener is responsible for noticing the request and responding to it in an appropriate and timely manner.

I know we already have a lot of text, but hey don't worry. Soon I'll add pictures and code to make it even more clearer, while also diving deep into how to do each of the things specified above.

### How does .NET achieve this?

.NET provides 2 classes, [CancellationTokenSource](https://docs.microsoft.com/en-us/dotnet/api/system.threading.cancellationtokensource?view=net-6.0) and [CancellationToken](https://docs.microsoft.com/en-us/dotnet/api/system.threading.cancellationtoken?view=net-6.0) to achieve the cancellation mechanism.

- **`CancellationTokenSource`** - This is the object responsible for creating a cancellation token and sending a cancellation request to all copies of that token.
- **`CancellationToken`** - This is the structure used by listeners to monitor the token's current state.

There is one more type that is involved, **`OperationCancelledException`**. Listeners of the cancellation token can optionally throw this exception to verify the source of the cancellation and notify others that it has responed to a cancellation request.

The **general pattern** to implement the above stated, cooperative cancellation model is as follows:

- Instantiate a `CancellationTokenSource` object
- Pass the token returned by the `CancellationTokenSource.Token` property to each task or thread that listens for cancellation
- Provide a mechanism for each task or thread to respond to this cancellation
- Call the `CancellationTokenSource.Cancel` method to provide a notification for cancellation

Well this covers the basics, and you can rightfully jump off to dabble into using it. But if you will, stay to see how to do each of the above steps, especially 3, since there are various ways to do it.

Here is an illustration that I totally stole from Microsoft docs showing the relationship between a token source and all of the copies of its token.

<img src="https://docs.microsoft.com/en-us/dotnet/standard/threading/media/vs-cancellationtoken.png" />

The important aspect here is that this model is cooperative, i.e., the cancellation is not forced on the listener. The listener can determine how to gracefully terminate in response to a cancellation request.

Also the source can issue a cancellation request to all copies of the token by using one method call, which makes cancelling a complex task or its sub tasks simple and easy using a single cancellation token.

A listener of the cancellation token can also listen to multiple tokens at once, by joining them into one *linked token*.

Listeners can implement a variety of mechanisms like polling, callbacks or wait handles to get notified of cancellation, thus giving flexibility.

Now lets see some code to see how we can use Cancellation Tokens.

## Example of using Cancellation Token

```cs
public async Task CancellableMethod()
{
    var tokenSource = new CancellationTokenSource();
    // Queue some long running tasks
    for(int i = 0;i < 10;++i)
    {
        Task.Run(() => DoSomeWork(tokenSource.Token), tokenSource.Token);
    }

    // After some delay/when you want manual cancellation
    tokenSource.Cancel();
}

// Runs on a different thread
public async Task DoSomeWork(CancellationToken ct)
{
    int maxIterations = 100;
    for(int i = 0;i < maxIterations;++i)
    {
        // Do some long running work

        if(ct.IsCancellationRequested)
        {
            Console.WriteLine("Task cancelled.");
            ct.ThrowIfCancellationRequested();
        }

    }
}
```

Here we start cancellable tasks and pass the cancellation token to the delegate that's running. Passing to the task here is optional. User delegate notices and responds to the cancellation request. That way the calling thread can not forcibly end the task, just signal that cancellation is requested and the delegate/task can notice the request and respond to it appropriately.

## Cancellation Token is for Operations, not Objects

Here in this framework, the cancellation is referred for operations, not objects. That way, one cancellation token should refer to a "cancellable operation". Once the `IsCancellationRequested` property in a cancellation token is set to `true`, it can't be set to `false` again and you cant reuse the same cancellation token again after its cancelled.

## How to Listen and Respond to Cancellation Requests

A cancellable operation or the listener has to determine on how to terminate gracefully and how to respond to a cancellation request. Usually some required cleanup is performed and then the delegate responds immediately.

However, in more complex cases, it might be necessary for the user delegate to notify library code that cancellation has occurred. In such cases, the correct way to terminate the operation is for the delegate to call the [ThrowIfCancellationRequested](https://docs.microsoft.com/en-us/dotnet/api/system.threading.cancellationtoken.throwifcancellationrequested), method, which will cause an [OperationCanceledException](https://docs.microsoft.com/en-us/dotnet/api/system.operationcanceledexception) to be thrown. Library code can catch this exception on the user delegate thread and examine the exception's token to determine whether the exception indicates cooperative cancellation or some other exceptional situation.

The [Task](https://docs.microsoft.com/en-us/dotnet/api/system.threading.tasks.task) class handles the OperationCancelledException in this way. (See the benefit of passing the Cancellation token to the task now?)

Here are a few mechanisms on how the user delegate can monitor the cancellation request

### Listening by Polling

For long running operations that are implemented in loops (like in the example above) or recursive methods, listener can listen to the value for a cancellation request by polling the value of `CancellationToken.IsCancellationRequested` property. If the value is `true`, the method can perform required cleanup and terminate as quickly as possible.

The optimal frequency of polling this property is something that's application dependent and is upto the developer to determine the best frequency. Here is a small example for this approach

```cs
public static void SomeLongRunningOperation(CancellationToken ct)
{
    while(!ct.IsCancellationRequested)
    {
        DoWork(); // perform one unit of work
    }

    // perform cleanup if needed
}
```

This is how a lot of `BackgroundServices` are implemented.

There is another variant of this, where instead of breaking out of the loop, we can use the `ThrowIfCancellationRequested` method to throw an appropriate `OperationCancelledException`. Prefer this instead of manually throwing this exception.

```cs
public static void SomeLongRunningOperation(CancellationToken ct)
{
    while(true)
    {
        DoWork(); // perform one unit of work
        ct.ThrowIfCancellationRequested(); // this is extremely fast
    }
}
```

For more details on this approach, refer to [this link](https://docs.microsoft.com/en-us/dotnet/standard/threading/how-to-listen-for-cancellation-requests-by-polling).

### Listening by Registering a Callback

Some operations can become blocked in such a way that they cannot check the value of the cancellation token in a timely manner. For these cases, you can register a callback method that unblocks the method when a cancellation request is received.

The `Register` method is used for this purpose. It also returns a `CancellationTokenRegistration` type of object, which can also be used to unregister this callback, for whatever reason you might want to.

Lets look at an example of cancelling a web request, using this approach:

```cs
public static void DownloadSomeHugeFile(CancellationToken ct)
{
    WebClient wc = new WebClient();

    ct.Register(() =>
    {
        wc.CancelAsync();
    });
    // optionally can also store this registration in a variable

    wc.DownloadStringAsync("https://some-download-path");
}
```

Now whenever the source requests a cancellation, the registered callback will be called and cancellation occurs. This registration object manages thread synchronization and ensures that the callback will stop executing at a precise point in time.

**Note**, The callback method should be fast because it is called synchronously and therefore the call to `Cancel` does not return until the callback returns.

For more details, you can refer to [this link](https://docs.microsoft.com/en-us/dotnet/standard/threading/cancellation-in-managed-threads#listening-by-registering-a-callback).

There is one more way by using Wait Handles. But I don't know about them enough to blog about them. Hence if you are interested in that approach, sorry, but here's Microsoft docs [reference](https://docs.microsoft.com/en-us/dotnet/standard/threading/how-to-listen-for-cancellation-requests-that-have-wait-handles) that might be able to help you.

## Listening to Multiple Tokens Simultaneously

In some cases, a listener may have to listen to multiple cancellation tokens simultaneously. For example, a cancelable operation may have to monitor an internal cancellation token in addition to a token passed in externally as an argument to a method parameter. To accomplish this, create a linked token source that can join two or more tokens into one token. 

Here is a code example:

```cs
public void DoWork(CancellationToken ct)
{
    var internalTokenSource = new CancellationTokenSource();
    internalTokenSource.CancelAfter(10000);
    var internalToken = internalTokenSource.Token;
    var externalToken = ct;
    using (CancellationTokenSource linkedCts = CancellationTokenSource.CreateLinkedTokenSource(internalToken, externalToken))
    {
        try
        {
            DoWorkInternal(linkedCts.Token);
        }
        catch(OperationCancelledException)
        {
            if(internalToken.IsCancellationRequested)
            {
                Console.WriteLine("Operation timed out");
            }
            
            if(externalToken.IsCancellationRequested)
            {
                Console.WriteLine("Cancelling per user request.");
            }
        }
    }

}
```

**Note**, When the linked token throws an OperationCanceledException, the token that is passed to the exception is the linked token, not either of the predecessor tokens. To determine which of the tokens was canceled, check the status of the predecessor tokens directly.

For more details on this approach, use [this reference](https://docs.microsoft.com/en-us/dotnet/standard/threading/how-to-listen-for-multiple-cancellation-requests).


Well, that was a lot of details on Cancellation Tokens, but I feel inspired today. So I think of extending this post by adding some recommended patterns as well.

## Recommended Patterns for Cancellation Tokens

I wish I knew a lot about cancellation tokens to recommend some patterns of my own. But until then, I am sharing the patterns refererred to [in this excellent blog](https://devblogs.microsoft.com/premier-developer/recommended-patterns-for-cancellationtoken/). It's a wonderful article giving some great guidelines on how to design and work around cancellation tokens.

Using cancellation tokens is a great pattern, but supporting these require some extra responsibility.

### 1. Know when you've passed the point of no cancellation

**Don't** cancel if you've already incurred side-effects that your method isn't prepared to revert on the way out that would leave you in an inconsistent state. So if you've done some work, and have a lot more to do, and the token is cancelled, you must only cancel when and if you can do so leaving objects in a valid state. This may mean that you have to finish the large amount of work, or undo all your previous work (i.e. revert the side-effects), or find a convenient place that you can stop halfway through but in a valid condition, before then throwing OperationCanceledException. In other words, the caller must be able to recover to a known consistent state after cancelling your work, or realize that cancellation was not responded to and that the caller then must decide whether to accept the work, or revert its successful completion on its own.

### 2. Propagate your CancellationToken

Propagate your CancellationToken to all the methods you call that accept one, except after the “point of no cancellation” referred to in the previous point. In fact if your method mostly orchestrates calls to other methods that themselves take CancellationTokens, you may find that you don’t personally have to call CancellationToken.ThrowIfCancellationRequested() at all, since the async methods you’re calling will generally do it for you.

### 3. Don't throw OperationCancelledException after you've completed the work

Don’t throw OperationCanceledException after you’ve completed the work, just because the token was signaled. Return a successful result and let the caller decide what to do next. The caller can’t assume you’re cancellable at a given point anyway so they have to be prepared for a successful result even upon cancellation.

### 4. Input Validation

Input Validation can certainly go ahead of cancellation checks (since that helps highlight bugs in the calling code).

### 5. Consider not checking the token at all

Consider not checking the token at all if your work is very quick, or you propagate it to the methods you call. That said, calling CancellationToken.ThrowIfCancellationRequested() is pretty lightweight so don’t think too hard about this one unless you see it on perf traces.

### Optional Parameters for cancellation tokens

If you want to accept CancellationToken but want to make it optional, you can do so with syntax such as this:

```cs
public Task SomethingExpensiveAsync(CancellationToken cancellationToken = default(CancellationToken))
{
  // don't worry about NullReferenceException if the
  // caller omitted the argument because it's a struct.
  cancellationToken.ThrowIfCancellationRequested();
}
```

It’s a good idea to only make your CancellationToken parameters optional in your public API (if you have one) and leave them as required parameters everywhere else. This really helps to ensure that you intentionally propagate your CancellationTokens through all the methods you call (#2 above). But of course remember to switch to passing CancellationToken.None once you pass the point of no cancellation.

It’s also a good API pattern to keep your CancellationToken as the last parameter your method accepts. This fits nicely with optional parameters anyway since they have to show up after any required parameters.

### How to handle cancellation exceptions

If you’ve experienced cancellation before, you’ve probably noticed a couple of types of these exceptions: `TaskCanceledException` and `OperationCanceledException`. TaskCanceledException derives from OperationCanceledException. That means when writing your catch blocks that deal with the fallout of a canceled operation, you should catch OperationCanceledException. If you catch TaskCanceledException you may let certain cancellation occurrences slip through your catch blocks (and possibly crash your app).

If your cancelable method is in between other cancelable operations, you may need to perform clean up when canceled. When doing so, you can use the catch block, but be sure to rethrow properly:

```cs
async Task SendResultAsync(CancellationToken cancellationToken)
{
  try
  {
    await httpClient.SendAsync(form, cancellationToken);
  }
  catch (OperationCanceledException ex)
  {
    // perform your cleanup
    form.Dispose();

    // rethrow exception so caller knows you've canceled.
    // DON'T "throw ex;" because that stomps on
    // the Exception.StackTrace property.
    throw;
  }
}
```

## In conclusion

This post became inceremoniously too long, but it stands as a great reference on how CancellationTokens work, how to listen to them and what design considerations should be done while using it. Let me know in the comments if you liked this deep dive or felt it was too long and textual. Also do sound off if you want me to do deep dives on other topics as well.

If you liked what you read, you can try reading some other posts on my blog as well, and you can also connect with me on my socials. Until next time. 😊