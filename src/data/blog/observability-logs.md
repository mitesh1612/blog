---
title: "Your Logs Are Lying to You"
description: "Structured logging done right for backend engineers — what to log, what to stop logging, and why your current logs are probably making incidents harder, not easier"
pubDatetime: 2026-04-28T00:00:00Z
author: Mitesh Shah
featured: false
draft: true
tags:
  - observability
  - backend
  - C#
  - ASP.NET Core
  - logging
---

This is the first post in a series called **Observability for Backend Engineers Who Don't Want Dashboard Theater**. The series covers observability the way it actually matters in real backend systems — practical, opinionated, and grounded in production experience rather than vendor marketing.

In this chapter, we are talking about logs. Specifically, why most of them are useless, and what to do about it.

## Table of contents

## The problem with most logs

If I asked you to debug a production issue right now, and the only thing you had was your application's logs, how confident would you be?

For most backend services I have worked on, the honest answer is "not very." The logs exist. There are plenty of them. But when something actually goes wrong, they tend to be either too noisy to find anything useful, or too vague to tell you what actually happened.

This is not a tooling problem. Most teams have perfectly fine logging infrastructure. They have Seq, or Application Insights, or an ELK stack, or whatever their ops team set up three years ago. The problem is what goes into the logs in the first place.

A typical backend service ends up with logs that fall into a few familiar patterns:

- **The "I was here" log.** `Entering method ProcessOrder`. Cool. What order? What state was it in? Who called this?
- **The "something happened" log.** `Order processed successfully`. Which order? How long did it take? Was anything unusual about it?
- **The "cry for help" log.** `Error occurred`. That is the entire message. No exception details, no context, no correlation to anything.
- **The "novel" log.** Fourteen lines of serialised request and response bodies on every single HTTP call, including health checks. Your log storage bill sends its regards.

None of these are helpful when you are debugging a production issue at 2 AM. They are the logging equivalent of someone describing a car crash as "a thing happened on a road."

## Structured logging is not optional anymore

The single biggest improvement you can make to your logs is to stop treating them as strings.

Unstructured logs look like this:

```cs
_logger.LogInformation($"Processing order {orderId} for customer {customerId}, amount: {amount}");
```

That produces a perfectly readable line in a console. It is also nearly useless at scale, because you cannot query it. Want to find all log entries for a specific customer? You are now doing string searches across millions of log lines. Want to correlate order processing times? Good luck parsing that out of a sentence.

Structured logging means treating log entries as data, not prose:

```cs
_logger.LogInformation(
    "Processing order {OrderId} for customer {CustomerId}, amount: {Amount}",
    orderId, customerId, amount);
```

The difference looks small, but it is enormous. With structured logging, each log entry becomes a record with named, queryable fields. `OrderId`, `CustomerId`, and `Amount` are now first-class properties you can filter, aggregate, and correlate.

:::info
If you are using string interpolation (`$"..."`) in your log calls, you are doing it wrong. The message template with placeholders is what makes structured logging work — it lets the logging framework capture the values as separate fields rather than baking them into a string.
:::

In C#, the most common way to get structured logging right is through [Serilog](https://serilog.net/). The built-in `ILogger` in ASP.NET Core supports message templates, but Serilog gives you richer sinks, better enrichers, and more control over the output format.

A basic Serilog setup looks like this:

```cs file="Program.cs"
builder.Host.UseSerilog((context, configuration) =>
{
    configuration
        .ReadFrom.Configuration(context.Configuration)
        .Enrich.FromLogContext()
        .Enrich.WithProperty("Application", "OrderService")
        .WriteTo.Console()
        .WriteTo.Seq("http://localhost:5341");
});
```

Once you have this in place, every log entry automatically carries structured data, and you can push it to a sink that actually lets you query it.

## What to actually log

Having structured logging in place is the foundation, but it only helps if you are logging the right things. And "the right things" is a much smaller list than most people think.

Here is what I think is worth logging in a backend service:

### Request boundaries

Log when a meaningful operation starts and ends. Not every method call — just the entry points that matter: incoming API requests, background job executions, message handler invocations.

```cs
_logger.LogInformation("Handling request {Method} {Path}", request.Method, request.Path);

// ... after processing

_logger.LogInformation(
    "Completed request {Method} {Path} with {StatusCode} in {ElapsedMs}ms",
    request.Method, request.Path, response.StatusCode, elapsed.TotalMilliseconds);
```

:::info[Tip]
ASP.NET Core already logs request start and completion if you enable the right log levels. Before adding your own, check if the framework is already doing it for you. Serilog's `UseSerilogRequestLogging()` middleware gives you a single structured log entry per request with timing, status code, and path — often that is all you need.
:::

### State transitions

When something changes state in a way that matters, log it. An order moving from `Pending` to `Confirmed`. A payment being retried. A feature flag being toggled. These are the events you will actually search for during an incident.

```cs
_logger.LogInformation(
    "Order {OrderId} transitioned from {FromStatus} to {ToStatus}",
    order.Id, previousStatus, order.Status);
```

### Decisions and branches

When your code takes a non-obvious path, log why. This is especially useful for conditional logic that depends on configuration, feature flags, or external state.

```cs
_logger.LogInformation(
    "Skipping notification for order {OrderId}: customer {CustomerId} has notifications disabled",
    orderId, customerId);
```

Six months from now, when someone asks "why didn't the customer get notified?", this log line saves you an hour of debugging.

### Errors with context

When something fails, log the error along with enough context to actually understand what was happening. The exception alone is rarely enough.

```cs
_logger.LogError(
    ex,
    "Failed to process payment for order {OrderId}, customer {CustomerId}, amount {Amount}, provider {Provider}",
    orderId, customerId, amount, paymentProvider);
```

Compare that with `_logger.LogError(ex, "Payment failed")`. Same exception, completely different debuggability.

## What to stop logging

This section might be more important than the previous one. The biggest problem with most logging setups is not missing logs — it is too many useless ones drowning out the signal.

### Health checks

If your service has a health check endpoint that gets hit every ten seconds by a load balancer, and you are logging every single one of those requests, you are generating thousands of log entries per hour that will never help anyone.

```cs
// In your Serilog request logging config
app.UseSerilogRequestLogging(options =>
{
    options.GetLevel = (httpContext, elapsed, ex) =>
    {
        if (httpContext.Request.Path.StartsWithSegments("/health"))
            return LogEventLevel.Verbose; // effectively hidden in most configs

        return LogEventLevel.Information;
    };
});
```

### Successful routine operations

Not everything needs a log line. If your message consumer processes ten thousand messages an hour and each one produces three log lines, you are writing thirty thousand log entries for operations that worked perfectly. Log the failures and anomalies. For the happy path, aggregate metrics are usually more useful.

### Request and response bodies

Logging full HTTP request and response payloads is tempting during development and extremely expensive in production. It bloats your log storage, can leak sensitive data, and almost never helps with real debugging because the issue is usually somewhere else entirely.

If you need to debug specific requests, use targeted diagnostic logging that you can turn on temporarily — not blanket body logging on every call.

### Framework noise

EF Core at `Debug` level will log every single SQL query, including parameter values. The HTTP client factory will log every outbound request lifecycle. The DI container will log every service resolution. These are useful during development. In production, they are noise. Set sensible minimum log levels:

```json file="appsettings.Production.json"
{
  "Serilog": {
    "MinimumLevel": {
      "Default": "Information",
      "Override": {
        "Microsoft.AspNetCore": "Warning",
        "Microsoft.EntityFrameworkCore": "Warning",
        "System.Net.Http.HttpClient": "Warning"
      }
    }
  }
}
```

## Correlation: tying logs together

Individual log entries are useful. Correlated log entries are powerful.

When a request comes in and touches three services, hits a database, publishes a message, and returns a response, you want to be able to pull one string and see everything that happened as part of that operation.

In ASP.NET Core, you get some of this for free through `Activity` and the built-in trace/span ID propagation. But in practice, you usually want to enrich your logs with a few more things:

```cs
app.UseSerilogRequestLogging(options =>
{
    options.EnrichDiagnosticContext = (diagnosticContext, httpContext) =>
    {
        diagnosticContext.Set("RequestId", httpContext.TraceIdentifier);
        diagnosticContext.Set("UserId", httpContext.User.FindFirst("sub")?.Value);
        diagnosticContext.Set("TenantId", httpContext.Request.Headers["X-Tenant-Id"].FirstOrDefault());
    };
});
```

For background jobs and message handlers — where there is no HTTP request — you need to establish correlation yourself:

```cs
public async Task HandleAsync(OrderCreatedEvent message, CancellationToken ct)
{
    using (_logger.BeginScope(new Dictionary<string, object>
    {
        ["CorrelationId"] = message.CorrelationId,
        ["OrderId"] = message.OrderId
    }))
    {
        _logger.LogInformation("Processing OrderCreated event for {OrderId}", message.OrderId);
        // ... handler logic
    }
}
```

The `BeginScope` pattern in `ILogger` (and Serilog's `LogContext.PushProperty`) lets you attach properties to every log entry within a scope. This is how you make it possible to query "show me everything that happened for correlation ID X" and actually get a complete picture.

:::warning
Correlation only works if you propagate the correlation ID across boundaries. If your service publishes a message, the correlation ID needs to be in the message. If it makes an HTTP call, it needs to be in the headers. One broken link in the chain and you lose visibility for everything downstream.
:::

## Log levels: mean what you say

Log levels seem straightforward, but in practice most codebases use them inconsistently. Here is how I think about them:

| Level | When to use it |
|-------|---------------|
| `Trace` | You are debugging something specific and will turn this off after |
| `Debug` | Useful during development, not in production |
| `Information` | Something happened that is expected and worth recording |
| `Warning` | Something unusual happened that might need attention, but the operation continued |
| `Error` | Something failed and the operation could not complete |
| `Critical` | The application itself is in trouble — cannot connect to the database, out of memory, startup failures |

The most common mistakes:

- **Logging expected conditions as errors.** A customer entering an invalid email is not an error. It is validation doing its job. Log it as `Information` or `Debug`, not `Error`.
- **Logging everything as Information.** When every message is `Information`, you have no way to filter by severity. You have written a diary, not a diagnostic tool.
- **Never using Warning.** `Warning` is the "this worked, but something was off" level. It is incredibly useful for catching degradation before it becomes an outage. Use it.

## A skeleton for good logging in a new service

If you are starting a new ASP.NET Core service today, here is a reasonable baseline:

```cs file="Program.cs"
var builder = WebApplication.CreateBuilder(args);

// Structured logging with Serilog
builder.Host.UseSerilog((context, configuration) =>
{
    configuration
        .ReadFrom.Configuration(context.Configuration)
        .Enrich.FromLogContext()
        .Enrich.WithProperty("Application", "MyService")
        .Enrich.WithProperty("Environment", context.HostingEnvironment.EnvironmentName)
        .WriteTo.Console(new RenderedCompactJsonFormatter())
        .WriteTo.Seq(context.Configuration["Seq:Url"] ?? "http://localhost:5341");
});

var app = builder.Build();

// Request logging — single entry per request, with enrichment
app.UseSerilogRequestLogging(options =>
{
    options.EnrichDiagnosticContext = (diagnosticContext, httpContext) =>
    {
        diagnosticContext.Set("RequestId", httpContext.TraceIdentifier);
        diagnosticContext.Set("UserId", httpContext.User.FindFirst("sub")?.Value);
    };

    options.GetLevel = (httpContext, elapsed, ex) =>
    {
        if (httpContext.Request.Path.StartsWithSegments("/health"))
            return LogEventLevel.Verbose;
        if (ex != null || httpContext.Response.StatusCode >= 500)
            return LogEventLevel.Error;
        if (elapsed > 3000)
            return LogEventLevel.Warning;

        return LogEventLevel.Information;
    };
});

app.MapGet("/health", () => Results.Ok());

// ... your endpoints

app.Run();
```

```json file="appsettings.Production.json"
{
  "Serilog": {
    "MinimumLevel": {
      "Default": "Information",
      "Override": {
        "Microsoft.AspNetCore": "Warning",
        "Microsoft.EntityFrameworkCore": "Warning",
        "System.Net.Http.HttpClient": "Warning"
      }
    }
  }
}
```

That gets you structured output, request-level logging with timing and status, correlation support, and sensible noise reduction. You can add more enrichment as your service grows, but this is a solid starting point.

## Wrapping up

Logging is the most accessible part of observability. Every framework supports it, every service already does some of it, and it requires zero additional infrastructure beyond what most teams already have. But accessibility has a downside — because it is easy to add a log line, most codebases end up with too many bad ones instead of fewer good ones.

The short version:

- **Structure your logs.** Message templates, not string interpolation. Queryable fields, not prose.
- **Log meaningful events.** Request boundaries, state transitions, decisions, errors with context.
- **Stop logging noise.** Health checks, routine successes, request bodies, framework internals at debug level.
- **Correlate everything.** Thread a correlation ID through requests, messages, and background jobs.
- **Use log levels honestly.** They are a severity signal, not a volume knob.

Get these basics right, and your logs become a tool you actually reach for during incidents rather than something you scroll through hopelessly.

In the next post, we will talk about **metrics** — because "it feels slow" is not an SLO, and your logs alone cannot tell you how your system is actually performing.

---

*This is Part 1 of the [Observability for Backend Engineers](/blog/tags/observability) series.*
