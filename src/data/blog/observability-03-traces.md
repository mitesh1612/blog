---
title: "Traces: Following a Request Through the Haunted House: Distributed Tracing for Backend Engineers"
description: "Distributed tracing without the PhD - ActivitySource, Activity, span design, correlation, and why your trace waterfall probably looks like modern art"
pubDatetime: 2026-06-11T00:00:00Z
author: Mitesh Shah
featured: true
draft: true
tags:
  - observability
  - Observability for Backend Engineers
  - backend
  - C#
  - ASP.NET Core
  - tracing
---

This is Part 3 of the **Observability for Backend Engineers Who Don't Want Dashboard Theater** series. [Part 1 covered logs](/blog/posts/observability-01-logs) — structured logging, correlation, and why `Console.WriteLine("here")` is a cry for help. [Part 2 covered metrics](/blog/posts/observability-02-metrics) — RED, USE, histograms, and why "it feels slow" is a vibe, not an SLO.

Now we are talking about traces. The thing that finally answers "where did the time go?" without requiring you to open six log windows and line up timestamps by hand like a conspiracy theorist with string and pushpins.

## Table of contents

## The problem traces solve

You have logs. They tell you what happened inside a single service. You have metrics. They tell you the system's vital signs over time. But neither one answers a deceptively simple question: what happened to _this specific request_ as it traveled through your system?

A request comes in. It hits your API gateway. Gets routed to the order service. The order service calls the inventory service. The inventory service checks a Redis cache, misses, hits a database. The order service publishes a message to a queue. A background worker picks it up, calls a payment provider, waits three seconds for a timeout, retries, succeeds.

The whole thing took 4.2 seconds. The customer is annoyed. Your logs have entries in six different services that you now need to manually stitch together using timestamps and a correlation ID that you hope someone remembered to propagate.

This is the problem that distributed tracing solves. A trace is the complete story of a single request as it moves through your distributed system — every service it touched, every call it made, how long each piece took, and which piece was the bottleneck.

Without traces, debugging a slow request in a distributed system looks like this:

1. Find the relevant log entries in Service A
2. Hope the correlation ID was propagated to Service B
3. Search Service B's logs for that correlation ID
4. Repeat for services C, D, and E
5. Manually compare timestamps
6. Argue with colleagues about whose service is "the slow one"
7. Discover the problem was in a dependency nobody was looking at

With traces, the same debugging session looks like:

1. Open the trace
2. Look at the waterfall
3. See that the payment provider call took 3.8 seconds of the 4.2 second total
4. Done

That is the pitch. Now let's talk about how it actually works.

## What a trace actually is

A trace is not one thing. It is a tree of things. Specifically:

- A **trace** is a collection of spans that share a single trace ID. It represents the full journey of one operation through your system.
- A **span** is a single unit of work within that trace. "Handle HTTP request," "query database," "call payment API" — each is a span.
- Spans have a **parent-child** relationship. The root span is the one that started it all (usually an incoming HTTP request). Child spans represent work done within that parent span's lifetime.

Every span carries:

| Field             | What it is                                                         |
| ----------------- | ------------------------------------------------------------------ |
| **Trace ID**      | A globally unique identifier shared by all spans in the trace      |
| **Span ID**       | Unique identifier for this specific span                           |
| **Parent Span ID**| The span that created this one (empty for the root span)           |
| **Operation name**| What this span represents (`POST /api/orders`, `SELECT orders`)    |
| **Start time**    | When the work began                                                |
| **Duration**      | How long it took                                                   |
| **Status**        | Ok, Error, or Unset                                                |
| **Attributes**    | Key-value pairs of additional context                              |
| **Events**        | Timestamped annotations within the span                            |

When you visualize a trace, you get the waterfall chart — that horizontal bar chart where each bar is a span, indented to show parent-child relationships, and the width shows duration. A healthy trace waterfall looks like a tidy Gantt chart. An unhealthy one looks like the floor plan of a house designed by someone who kept adding extensions without permits.

### The anatomy of a trace waterfall

```
[POST /api/orders ─────────────────────────────────── 420ms]
  [Validate order ── 12ms]
  [Check inventory ────────── 85ms]
    [Redis cache lookup ── 2ms (miss)]
    [SELECT FROM inventory ──── 78ms]
  [Create order record ─── 45ms]
    [INSERT INTO orders ─── 40ms]
  [Publish OrderCreated event ── 8ms]
  [Call payment service ───────────────────── 265ms]
    [POST /api/payments ──────────────────── 260ms]
      [Call Stripe API ──────────────── 245ms]
```

From this, you immediately know: the payment service is where the time goes. Specifically, the Stripe API call. No log-hunting required. The trace tells you where to look in about two seconds.

## Correlation IDs vs proper distributed tracing

If you followed Part 1, you already have correlation IDs flowing through your system. Good. That was useful groundwork. But correlation IDs and traces are different tools with different capabilities.

A correlation ID is a shared identifier that says "these things are related." It is a search key. You grep for it across services and hope that all the relevant log entries come back. It gives you _which_ things happened, but not _how they relate to each other structurally_ or _how long each piece took_.

A trace gives you:

- **Hierarchy.** You can see that span B is a child of span A, not just "also related to the same request."
- **Timing.** Each span has precise start time and duration. You can see parallelism, sequencing, and gaps.
- **Causality.** The parent-child relationship shows you _what caused what_, not just "stuff happened around the same time."

Think of it this way: a correlation ID is like a case number on a police report. Everyone involved references the same case number, but to understand what happened, you still need to read through all the reports and piece together the timeline yourself.

A trace is the actual timeline. With a map. And arrows showing who called whom.

:::info[The good news]
If you already propagate correlation IDs via headers, you are most of the way to proper tracing. OpenTelemetry uses `traceparent` and `tracestate` headers (the W3C Trace Context standard), which serve the same "pass context across boundaries" purpose as your `X-Correlation-Id` header — just with more structure. Your existing correlation mindset transfers directly.
:::

The correlation IDs from Part 1 are still useful, especially for business-level correlation ("all events related to this order"). But for understanding request flow, timing, and dependencies? That is trace territory.

## The .NET tracing API: System.Diagnostics

Just like .NET has `System.Diagnostics.Metrics` for metrics, it has `System.Diagnostics` for tracing — specifically, `ActivitySource` and `Activity`. These map directly to OpenTelemetry's concepts of tracer and span, and they have been part of .NET since well before OpenTelemetry existed. OTel just made them interoperable with the rest of the world.

The mapping is simple:

| OpenTelemetry concept | .NET equivalent       |
| --------------------- | --------------------- |
| Tracer                | `ActivitySource`      |
| Span                  | `Activity`            |
| Span Kind             | `ActivityKind`        |
| Span Attributes       | `Activity.SetTag()`   |
| Span Events           | `Activity.AddEvent()` |
| Span Links            | `ActivityLink`        |
| Trace Context         | `ActivityContext`     |

If you have been working in .NET for a while, you might recognize `Activity` from diagnostic source usage or from seeing `Activity.Current` in middleware. The class has been around since .NET Core 1.0 for basic correlation, but it grew proper distributed tracing semantics over time. Today it is a full-featured span implementation.

### ActivitySource: declaring your tracer

An `ActivitySource` is the entry point for creating spans (activities). Like `Meter` in the metrics world, you give it a name that identifies your component:

```cs file="Diagnostics/ServiceTracing.cs"
using System.Diagnostics;

public static class ServiceTracing
{
    public const string SourceName = "MyCompany.OrderService";

    public static readonly ActivitySource Source = new(SourceName, "1.0.0");
}
```

The `ActivitySource` name is how OpenTelemetry knows which spans to listen to. When you configure OTel tracing, you register sources by name — just like you register meters by name for metrics. If you create an `ActivitySource` but never tell OTel to listen to it, your spans vanish silently into the void. This is by design (zero-cost when nobody is listening) and also the number-one reason people think tracing "isn't working."

:::warning[If your spans are not appearing]
Check that you added `.AddSource(ServiceTracing.SourceName)` in your OTel configuration. This is the tracing equivalent of forgetting `.AddMeter()` for metrics. Ask me how I know.
:::

### Activity: creating and populating a span

```cs file="Services/OrderService.cs"
using System.Diagnostics;

public class OrderService
{
    private readonly ILogger<OrderService> _logger;
    private readonly PaymentClient _paymentClient;
    private readonly IOrderRepository _repository;

    public OrderService(
        ILogger<OrderService> logger,
        PaymentClient paymentClient,
        IOrderRepository repository)
    {
        _logger = logger;
        _paymentClient = paymentClient;
        _repository = repository;
    }

    public async Task<Order> CreateOrderAsync(CreateOrderRequest request)
    {
        using var activity = ServiceTracing.Source.StartActivity(
            "CreateOrder",
            ActivityKind.Internal);

        // Add attributes (tags) to the span
        activity?.SetTag("order.region", request.Region);
        activity?.SetTag("order.item_count", request.Items.Count);
        activity?.SetTag("order.customer_id", request.CustomerId);

        var order = await _repository.CreateAsync(request);

        activity?.SetTag("order.id", order.Id);
        activity?.AddEvent(new ActivityEvent("order.created"));

        var payment = await _paymentClient.ChargeAsync(order);

        if (payment.Succeeded)
        {
            activity?.SetStatus(ActivityStatusCode.Ok);
        }
        else
        {
            activity?.SetStatus(ActivityStatusCode.Error, "Payment failed");
            activity?.AddEvent(new ActivityEvent("payment.failed", tags: new ActivityTagsCollection
            {
                { "payment.failure_reason", payment.FailureReason }
            }));
        }

        return order;
    }
}
```

A few things to notice:

1. **`using var activity`** — the span starts at `StartActivity` and ends when disposed. If you forget the `using`, your span never ends. It wanders off into memory like an unsupervised toddler at a furniture store.

2. **The null-conditional `activity?.`** — `StartActivity` returns `null` when no listener is registered. This is the zero-cost-when-unused design. No OTel configured? The call returns `null` and all `?.SetTag()` calls become no-ops. Always use `?.` in production.

3. **`ActivityKind`** — tells consumers what kind of work this span represents. More on this below.

### ActivityKind: what is this span doing?

| Kind           | Use when                                                     |
| -------------- | ------------------------------------------------------------ |
| **Internal**   | Work within your service that is not a remote call           |
| **Server**     | Handling an incoming request (e.g., your API endpoint)       |
| **Client**     | Making an outgoing request (e.g., calling another service)   |
| **Producer**   | Creating a message to be handled asynchronously              |
| **Consumer**   | Processing a message from a queue                            |

Most of the time, ASP.NET Core instrumentation creates `Server` spans for your incoming requests, and `HttpClient` instrumentation creates `Client` spans for your outgoing calls. Your custom spans for business logic are usually `Internal`.

Getting the kind right matters because tracing backends use it to render the waterfall correctly and to understand service dependencies. If everything is `Internal`, tools cannot distinguish "called another service" from "did some local computation."

### ActivityEvent: timestamped annotations

Events are like log entries attached to a span. They record that something notable happened at a specific point during the span's lifetime:

```cs
activity?.AddEvent(new ActivityEvent("cache.miss", tags: new ActivityTagsCollection
{
    { "cache.key", cacheKey },
    { "cache.store", "redis-primary" }
}));
```

Use events for things that are interesting but do not deserve their own span. A cache miss, a retry attempt, a validation error, a feature flag evaluation. They add context to the span's story without exploding your span count.

Events are not a substitute for logs. They are lightweight annotations within a span. If you need full-text searchability, log levels, or separate retention policies, log it. If you need "this happened at this moment within this operation," use an event.

### ActivityLink: connecting related traces

Sometimes operations are related but not parent-child. A batch processor that handles ten messages creates one trace per message, but you might want to link back to the trace that produced each message. That is what `ActivityLink` is for:

```cs
var links = new[]
{
    new ActivityLink(producerContext)
};

using var activity = ServiceTracing.Source.StartActivity(
    "ProcessBatch",
    ActivityKind.Consumer,
    parentContext: default,
    links: links);
```

Links are less common than parent-child relationships, but they matter for fan-in patterns (batch processing, aggregation, scheduled jobs that process work created by earlier traces).

## Span design: what deserves its own span?

This is where most teams either under-instrument (one giant span per request, useless) or over-instrument (a span for every method call, also useless but more expensive about it).

A span should represent a **meaningful unit of work** that you would want to see separately in a trace waterfall. The goal is: when you open a slow trace, can you immediately identify which piece took too long?

### Things that deserve their own span

- **Outbound HTTP calls.** Always. This is where you see cross-service latency.
- **Database queries.** At least for operations that might be slow or fail.
- **Cache operations.** Especially if you want to see hit/miss patterns in the trace.
- **Message publish/consume.** So you can follow work across async boundaries.
- **Significant business operations.** "Process order," "validate inventory," "calculate pricing." Things you would explain to a new team member as distinct steps.
- **External API calls.** Payment providers, email services, anything where latency is unpredictable.

### Things that do NOT deserve their own span

- **Every method call.** Your trace should not be a stack trace with timestamps.
- **Trivial in-memory operations.** Calculating a total, mapping DTOs, string formatting. If it takes microseconds, it does not need instrumentation.
- **Already-instrumented operations.** ASP.NET Core, HttpClient, and EF Core all create spans automatically. Do not wrap them in another custom span that adds nothing.
- **Loops iterations.** If you process 1000 items in a loop, create one span for "process batch" with an attribute for the count. Do not create 1000 child spans.

### The "would I want to see this in the waterfall?" test

Before adding a span, ask: "if this trace shows up in my tracing tool, does this span help me understand what happened?" If the answer is "it would just be noise between the spans I actually care about," skip it.

:::info[A practical heuristic]
If the operation crosses a process/network boundary, span it. If it might be slow or fail in interesting ways, span it. If it is a logical phase of your business operation, span it. If it is just code executing between those things, let it live within its parent span.
:::

### Naming spans

Span names should be low-cardinality and descriptive:

| Good                          | Bad                                       | Why                                                    |
| ----------------------------- | ----------------------------------------- | ------------------------------------------------------ |
| `POST /api/orders`            | `POST /api/orders/ord_abc123`             | IDs in span names create cardinality bombs             |
| `OrderService.CreateOrder`    | `CreateOrder for customer cust_42`        | Dynamic values go in attributes, not names             |
| `SELECT orders`               | `SELECT * FROM orders WHERE id = 'abc'`   | Full queries create unbounded cardinality              |
| `payment.charge`              | `doTheThing`                              | Names should mean something to someone reading a trace |
| `inventory.check-availability`| `Step 3`                                  | Generic names are useless when you have 20 spans       |

The naming rules are identical to the cardinality lessons from metrics in Part 2. Dynamic, per-request values belong in span attributes. The span name is the grouping key — it is what lets your tracing tool aggregate "all CreateOrder spans took an average of X ms" without choking on millions of unique names.

## Propagation: how trace context crosses boundaries

Traces only work across services if the trace context (trace ID, span ID, flags) actually makes it from one service to the next. This is propagation, and it is the single most important thing to get right for distributed tracing. Without it, each service creates its own isolated trace, and your distributed system looks like a collection of unrelated single-service traces. Which is, unfortunately, exactly how it works with no traces at all.

### W3C Trace Context

The standard way to propagate trace context over HTTP is the [W3C Trace Context](https://www.w3.org/TR/trace-context/) specification. It defines two headers:

```http
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
tracestate: congo=t61rcWkgMzE
```

The `traceparent` header contains:

- Version (`00`)
- Trace ID (32 hex characters)
- Parent Span ID (16 hex characters)
- Trace flags (sampling decision)

The `tracestate` header carries vendor-specific context. Most of the time you can ignore it.

In .NET, `HttpClient` automatically propagates trace context when an `Activity` is active. If you are making HTTP calls through `IHttpClientFactory` (which you should be), propagation just works. The outgoing request gets the `traceparent` header injected automatically, and the receiving service picks it up and creates a child span.

```cs file="Services/PaymentClient.cs"
public class PaymentClient
{
    private readonly HttpClient _httpClient;

    public PaymentClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<PaymentResult> ChargeAsync(Order order)
    {
        // The traceparent header is automatically injected here
        // because Activity.Current is set by the parent span
        using var activity = ServiceTracing.Source.StartActivity(
            "payment.charge",
            ActivityKind.Client);

        activity?.SetTag("payment.order_id", order.Id);
        activity?.SetTag("payment.amount", order.Total);
        activity?.SetTag("payment.currency", order.Currency);

        var response = await _httpClient.PostAsJsonAsync("/api/payments", new
        {
            OrderId = order.Id,
            Amount = order.Total,
            Currency = order.Currency
        });

        activity?.SetTag("http.response.status_code", (int)response.StatusCode);

        return await response.Content.ReadFromJsonAsync<PaymentResult>()
            ?? throw new InvalidOperationException("Empty payment response");
    }
}
```

### Propagation across message queues

HTTP propagation is mostly automatic in .NET. Message queue propagation is not. If you publish a message to RabbitMQ, Azure Service Bus, or Kafka, you need to explicitly inject the trace context into the message headers and extract it on the consumer side.

```cs file="Infrastructure/MessagePublisher.cs"
using System.Diagnostics;

public class MessagePublisher
{
    public async Task PublishAsync<T>(string topic, T message)
    {
        using var activity = ServiceTracing.Source.StartActivity(
            $"publish {topic}",
            ActivityKind.Producer);

        var headers = new Dictionary<string, string>();

        // Inject current trace context into message headers
        // In production, prefer Propagators.DefaultTextMapPropagator.Inject()
        // for spec-compliant formatting. Manual here for clarity.
        if (activity?.Context is ActivityContext context)
        {
            headers["traceparent"] = $"00-{context.TraceId}-{context.SpanId}-{(context.TraceFlags.HasFlag(ActivityTraceFlags.Recorded) ? "01" : "00")}";
        }

        activity?.SetTag("messaging.system", "rabbitmq");
        activity?.SetTag("messaging.destination.name", topic);
        activity?.SetTag("messaging.operation.type", "publish");

        await InternalPublishAsync(topic, message, headers);
    }
}
```

```cs file="Infrastructure/MessageConsumer.cs"
using System.Diagnostics;

public class MessageConsumer
{
    public async Task HandleMessageAsync<T>(T message, IDictionary<string, string> headers)
    {
        ActivityContext parentContext = default;

        // Extract trace context from message headers
        if (headers.TryGetValue("traceparent", out var traceparent))
        {
            ActivityContext.TryParse(traceparent, null, out parentContext);
        }

        using var activity = ServiceTracing.Source.StartActivity(
            "process OrderCreated",
            ActivityKind.Consumer,
            parentContext: parentContext);

        activity?.SetTag("messaging.system", "rabbitmq");
        activity?.SetTag("messaging.operation.type", "process");

        // Process the message...
        await ProcessAsync(message);
    }
}
```

:::warning[The propagation gap]
The number one reason your distributed traces are disconnected is a propagation failure. Some service in the middle either swallowed the trace context, used a non-standard HTTP client, or published a message without injecting trace headers. If your traces end abruptly at a service boundary, check propagation first. It is always propagation.
:::

### What about gRPC?

gRPC propagates trace context through metadata headers, using the same W3C Trace Context format. The `OpenTelemetry.Instrumentation.GrpcNetClient` package handles this automatically. If you are already using OpenTelemetry's gRPC instrumentation, propagation works the same way as HTTP — you do not need to do it manually.

## Adding context to spans: attributes, events, and status

A span with just a name and duration is a progress bar. A span with rich attributes is a debugging tool. The difference between "this span took 3 seconds" and "this span took 3 seconds because it queried 45,000 rows from the orders table for customer X in region EU" is the difference between knowing where and knowing why.

### Attributes (tags)

Attributes are key-value pairs that describe _what_ the span was doing:

```cs
activity?.SetTag("order.id", orderId);
activity?.SetTag("order.item_count", items.Count);
activity?.SetTag("db.system", "postgresql");
activity?.SetTag("db.operation.name", "SELECT");
activity?.SetTag("db.collection.name", "orders");
activity?.SetTag("http.response.status_code", 200);
```

Use [OpenTelemetry Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/) for common attributes. They define standard names like `http.request.method`, `db.system`, `messaging.destination.name`. Using standard names means your tracing backend can render things nicely (like showing HTTP methods with color coding, or displaying database icons next to DB spans) because it recognizes the attributes.

For your own business attributes, pick a namespace and be consistent:

```cs
// Good: namespaced, consistent
activity?.SetTag("order.id", order.Id);
activity?.SetTag("order.status", order.Status.ToString());
activity?.SetTag("order.total", order.Total);

// Bad: inconsistent naming
activity?.SetTag("OrderId", order.Id);       // PascalCase?
activity?.SetTag("status", order.Status);     // too generic
activity?.SetTag("$$$", order.Total);         // I have questions
```

Same rules as metric labels from Part 2: do not put high-cardinality data in places that will be indexed or aggregated. Span attributes are generally fine for high-cardinality values (unlike metric labels), because traces are sampled and stored individually rather than aggregated into time series. A `user.id` attribute on a span is fine. A `user.id` label on a metric will set your TSDB on fire. Different storage models, different rules.

### Events

We covered events above, but here are patterns that work well in practice:

```cs
// Record retry attempts
activity?.AddEvent(new ActivityEvent("retry", tags: new ActivityTagsCollection
{
    { "retry.attempt", 2 },
    { "retry.reason", "timeout" },
    { "retry.delay_ms", 500 }
}));

// Record validation results
activity?.AddEvent(new ActivityEvent("validation.failed", tags: new ActivityTagsCollection
{
    { "validation.field", "email" },
    { "validation.error", "invalid format" }
}));

// Record cache behavior
activity?.AddEvent(new ActivityEvent("cache.hit", tags: new ActivityTagsCollection
{
    { "cache.key", "inventory:sku-12345" },
    { "cache.store", "redis" }
}));
```

### Status codes

Set the span status to communicate success or failure:

```cs
try
{
    var result = await DoWorkAsync();
    activity?.SetStatus(ActivityStatusCode.Ok);
}
catch (Exception ex)
{
    activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
    activity?.RecordException(ex); // convenience method that adds an exception event
    throw;
}
```

`RecordException` is a helper that creates an event with the exception details (type, message, stacktrace) in the standard OpenTelemetry format. Use it. It is less typing than building the `ActivityEvent` manually, and tracing tools know how to render it.

:::info[Status semantics]
`Unset` means "I didn't explicitly say whether this succeeded." `Ok` means "this definitely worked." `Error` means "this definitely failed." For server spans, the OpenTelemetry spec says to leave status as `Unset` for successful requests and only set `Error` for 5xx responses. For your own custom spans, setting `Ok` explicitly on success is fine and helps with trace analysis.
:::

## How to mess up traces (a field guide)

Tracing has a seductive simplicity — add spans, get visibility. In practice, there are several well-worn paths to making your traces useless, expensive, or both. Like the metrics mess-ups from Part 2, these are presented in the spirit of recognition and prevention. Or at least faster recognition.

### The "trace everything" trap

Someone reads the tracing documentation and decides that every method should have a span. The order creation endpoint now has 47 spans. The waterfall is so tall you need to scroll. Most of the spans are 0ms or 1ms. The one span that actually matters — the slow database call — is buried in a forest of noise.

Over-instrumented traces are like logs that say "entering method X" and "exiting method X" for every function. Technically complete, practically useless. The signal-to-noise ratio is worse because more is not more. Your tracing backend stores and indexes every span, your sampling rate needs to be lower to compensate for the volume, and developers stop opening traces because parsing 47 spans to find the 3 that matter is not anyone's idea of productivity.

**The fix:** instrument at meaningful boundaries. Network calls, database queries, significant business operations, and async handoffs. If you can not explain why a span helps debugging without referencing the source code, it probably does not.

### Missing propagation (the silent killer)

Your traces look fine within a single service. Beautiful, even. But they stop at the service boundary. Each service has its own disconnected traces, and you are back to correlating by timestamps and prayers.

This happens when:

- A reverse proxy or API gateway strips the `traceparent` header
- A service uses a raw `HttpClient` instead of `IHttpClientFactory` (missing automatic injection)
- Message queue publishing does not inject trace context into message headers
- A legacy service in the middle does not understand W3C Trace Context

The frustrating part: everything appears to work. Each service creates spans. The traces are just... smaller than they should be. You only notice when you try to follow a request across services and the trail goes cold.

**The fix:** test propagation explicitly. Make a request, then check that the trace ID in the first service matches the trace ID in the last service. If they differ, there is a break in the chain. Walk the path until you find it.

### Meaningless span names

```
Internal
Internal
Internal
  Internal
    Internal
  Internal
Internal
```

Congratulations, your waterfall is a list of `Internal` spans because someone used `ActivityKind` as the span name, or used autogenerated names that say nothing about what is happening. Span names should tell you what the span _does_, not what it _is_.

Equally unhelpful:

```
DoWork
Process
Handle
Execute
Run
```

These are method names that someone converted to span names without thinking about whether they communicate anything to the person who will read the trace at 3 AM during an incident.

**The fix:** name spans as `{verb} {noun}` or `{component}.{operation}`. "CreateOrder," "payment.charge," "inventory.check-availability." Something a human can read and immediately understand without cross-referencing the source code.

### Cardinality in span names (again)

We covered this in naming conventions, but it bears repeating because people keep doing it:

```cs
// NO. Please no.
using var activity = ServiceTracing.Source.StartActivity(
    $"ProcessOrder-{orderId}");
```

This creates a unique span name per request. Your tracing backend cannot aggregate "how long does ProcessOrder usually take?" because every instance has a different name. The orderId belongs in an attribute, not the name.

Same goes for URLs with path parameters. `GET /api/orders/{id}` is a span name. `GET /api/orders/ord_abc123` is a cardinality bomb pretending to be a span name.

### The "spans are logs" misunderstanding

Some teams start using span events as a replacement for logging. Every log statement becomes an `AddEvent` call. The spans accumulate dozens of events, the trace viewer becomes a log viewer with extra steps, and the actual value of tracing (timing, hierarchy, dependencies) gets buried under event noise.

Events on spans are for notable moments within an operation: retries, cache misses, state transitions. They are not for general-purpose logging. You still need logs. Traces do not replace them. They complement them.

**The fix:** ask "does this belong to this specific span's story?" If yes, add an event. If it is general operational information, log it. If it needs to be searchable independent of a specific trace, definitely log it.

### Sampling regret

You instrument everything, push every trace to your backend, and your monthly observability bill arrives with a number that makes the CFO ask questions about your department.

Production tracing at 100% sampling is expensive. Most systems need sampling — keeping only a percentage of traces. But naive sampling (random 10%) means you almost never capture traces for rare error paths. That one-in-a-thousand timeout that causes customer escalations? You sampled it away.

**Better approaches:**

- **Tail-based sampling:** decide whether to keep a trace _after_ it completes, based on whether it contains errors, high latency, or other interesting signals. The OpenTelemetry Collector supports this.
- **Head-based with bias:** sample 100% of error traces, 10% of healthy traces. Capture all the interesting stuff, sample down the boring stuff.
- **Always sample in non-production:** your staging environment is cheap. Sample everything there, catch instrumentation bugs before they hit production.

### Ignoring async gaps

A trace shows request A creating a message, and (if propagation works) a separate trace shows worker B processing that message. But what about the time between them? The 30 seconds the message sat in the queue?

If you only look at span duration, you see "publish took 8ms" and "process took 200ms." You do not see the 30 seconds of queue wait time that is actually the problem. The total end-to-end time is 30,208ms. Your spans account for 208ms of it.

**The fix:** include queue publish timestamps as span attributes on the consumer side. Calculate and record the queue wait time:

```cs
activity?.SetTag("messaging.queue.wait_ms",
    (DateTime.UtcNow - message.PublishedAt).TotalMilliseconds);
```

This makes the gap visible in the trace, even though there is no span covering it.

## Wiring up OpenTelemetry for tracing

This is where it all comes together. Like metrics in Part 2, you configure OpenTelemetry in your service startup to collect and export traces.

:::info[Packages for tracing]
```bash
dotnet add package OpenTelemetry.Extensions.Hosting
dotnet add package OpenTelemetry.Instrumentation.AspNetCore
dotnet add package OpenTelemetry.Instrumentation.Http
dotnet add package OpenTelemetry.Instrumentation.SqlClient
dotnet add package OpenTelemetry.Exporter.OpenTelemetryProtocol
```

Same family as the metrics packages from Part 2. If you already have `OpenTelemetry.Extensions.Hosting`, you are adding instrumentation libraries and pointing them at the same exporter. The setup is converging, which is kind of the point.
:::

```cs file="Program.cs"
builder.Services.AddOpenTelemetry()
    .WithTracing(tracing =>
    {
        tracing
            // Incoming HTTP requests (creates Server spans)
            .AddAspNetCoreInstrumentation()
            // Outgoing HTTP calls (creates Client spans)
            .AddHttpClientInstrumentation()
            // SQL queries (creates Client spans)
            .AddSqlClientInstrumentation(options =>
            {
                options.SetDbStatementForText = true; // include query text
                options.RecordException = true;
            })
            // Your custom ActivitySources
            .AddSource(ServiceTracing.SourceName)
            // Export via OTLP
            .AddOtlpExporter();
    });
```

That is the minimum useful configuration. Incoming requests, outgoing calls, database queries, your custom spans, and an exporter to get them somewhere useful.

### The complete picture: metrics AND tracing

If you did Part 2 properly, your `Program.cs` already has `.WithMetrics(...)`. Adding tracing is just another chain call:

```cs file="Program.cs"
builder.Services.AddOpenTelemetry()
    .WithMetrics(metrics =>
    {
        metrics
            .AddAspNetCoreInstrumentation()
            .AddHttpClientInstrumentation()
            .AddRuntimeInstrumentation()
            .AddMeter(ServiceMetrics.MeterName)
            .AddOtlpExporter();
    })
    .WithTracing(tracing =>
    {
        tracing
            .AddAspNetCoreInstrumentation()
            .AddHttpClientInstrumentation()
            .AddSqlClientInstrumentation(options =>
            {
                options.SetDbStatementForText = true;
                options.RecordException = true;
            })
            .AddSource(ServiceTracing.SourceName)
            .AddOtlpExporter();
    });
```

One `AddOpenTelemetry()` call. Two signal types. Same exporter endpoint. Same destination. This is the OTel convergence in action — your application sends both signals through the same pipeline to the same backend, using the same infrastructure.

### Configuring the OTLP exporter

By default, the OTLP exporter sends to `http://localhost:4317` (gRPC) or `http://localhost:4318` (HTTP/protobuf). In production, you point it at an OpenTelemetry Collector or directly at your backend:

```cs
.AddOtlpExporter(options =>
{
    options.Endpoint = new Uri("https://otel-collector.internal:4317");
    options.Protocol = OpenTelemetry.Exporter.OtlpExportProtocol.Grpc;
});
```

Or via environment variables (preferred for containerized deployments):

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=https://otel-collector.internal:4317
OTEL_EXPORTER_OTLP_PROTOCOL=grpc
OTEL_SERVICE_NAME=order-service
```

The environment variable approach is cleaner for Kubernetes because you configure it per deployment without rebuilding the application. The OTel SDK reads these automatically.

### Filtering noisy spans

Not every span is worth exporting. Health check endpoints, metrics scrape endpoints, and internal orchestrator probes generate traces that nobody cares about:

```cs
.AddAspNetCoreInstrumentation(options =>
{
    options.Filter = httpContext =>
    {
        // Don't trace health checks or metrics endpoints
        var path = httpContext.Request.Path;
        return !path.StartsWithSegments("/health")
            && !path.StartsWithSegments("/metrics")
            && !path.StartsWithSegments("/ready");
    };
})
```

This is the tracing equivalent of suppressing health check logs from Part 1. Same principle: instrument what matters, filter what does not.

### Sampling configuration

For production, you almost certainly want sampling:

```cs
.SetSampler(new TraceIdRatioBasedSampler(0.1)) // sample 10% of traces
```

For development, sample everything:

```cs
.SetSampler(new AlwaysOnSampler())
```

The `TraceIdRatioBasedSampler` is head-based sampling — the decision is made at the root span. All child spans in the same trace respect the same decision, so you never get half a trace. For tail-based sampling (keeping traces based on whether they contain errors), you need the OpenTelemetry Collector's `tail_sampling` processor, which makes the decision after the trace completes.

## The three pillars converge: logs, metrics, and traces unified

If you have been following this series, you have now seen OpenTelemetry show up in logs (trace/span IDs in log entries, Part 1), metrics (`System.Diagnostics.Metrics` with OTel export, Part 2), and traces (`ActivitySource`/`Activity` with OTel export, this post). That is the point — it is not three separate things to learn. It is one framework that connects all three signals through shared context.

### How trace IDs appear in logs

When an `Activity` is active (which it is for every incoming HTTP request in an ASP.NET Core app with tracing configured), the trace ID and span ID are available. Log frameworks can include them automatically:

```cs file="Program.cs"
builder.Host.UseSerilog((context, configuration) =>
{
    configuration
        .ReadFrom.Configuration(context.Configuration)
        .Enrich.FromLogContext()
        .Enrich.WithProperty("Application", "OrderService")
        // This enricher adds TraceId and SpanId to every log entry
        .Enrich.With<ActivityEnricher>()
        .WriteTo.Console()
        .WriteTo.Seq("http://localhost:5341");
});
```

```cs file="Diagnostics/ActivityEnricher.cs"
using System.Diagnostics;
using Serilog.Core;
using Serilog.Events;

public class ActivityEnricher : ILogEventEnricher
{
    public void Enrich(LogEvent logEvent, ILogEventPropertyFactory propertyFactory)
    {
        var activity = Activity.Current;
        if (activity is null) return;

        logEvent.AddPropertyIfAbsent(
            propertyFactory.CreateProperty("TraceId", activity.TraceId.ToString()));
        logEvent.AddPropertyIfAbsent(
            propertyFactory.CreateProperty("SpanId", activity.SpanId.ToString()));
        logEvent.AddPropertyIfAbsent(
            propertyFactory.CreateProperty("ParentSpanId", activity.ParentSpanId.ToString()));
    }
}
```

Now every log entry within a traced request carries the trace ID. You can go from a log line ("payment failed for order X") to the full distributed trace (the entire request journey across all services) with a single click in tools that support it. Seq, Grafana, Jaeger, and most modern observability platforms can do this.

This is the killer feature of unified telemetry. You do not have three isolated data stores. You have three views of the same story, connected by shared identifiers.

### How metrics correlate with traces

The connection between metrics and traces is more subtle. Metrics are aggregated (you lose individual request identity), but the relationship works in the other direction:

1. A metric alert fires: "p99 latency for POST /api/orders exceeded 2s"
2. You query your tracing backend: "show me traces for POST /api/orders where duration > 2s in the last 15 minutes"
3. You find the slow traces and see exactly where the time was spent

Some tools (Grafana Tempo, Honeycomb) support **exemplars** — individual trace IDs attached to metric data points. When you see a latency spike on a graph, you can click it and jump directly to a representative trace. This is where the "three pillars" metaphor stops being marketing and starts being workflow.

The correlation is:

- **Log → Trace:** via trace ID in log entry
- **Metric → Trace:** via exemplars or time-based query
- **Trace → Logs:** filter logs by the trace's trace ID
- **Trace → Metrics:** check if the trace's span attributes match any metric anomaly

### The OpenTelemetry thread across the series

Let's step back and look at what we have built across three posts:

| Signal  | .NET API                       | OTel role                    | Connected via                    |
| ------- | ------------------------------ | ---------------------------- | -------------------------------- |
| Logs    | `ILogger` + Serilog            | TraceId/SpanId enrichment    | Trace context in log entries     |
| Metrics | `System.Diagnostics.Metrics`   | Collection and export        | Exemplars, time correlation      |
| Traces  | `System.Diagnostics.Activity`  | Collection, export, propagation | Trace ID as the primary key   |

OpenTelemetry is not a thing you add on top. It is the connective tissue between your existing .NET APIs and the observability backends that visualize everything. The .NET team designed `Activity` and `Meter` to be OpenTelemetry-compatible from the start. OTel provides the pipeline — collecting from those APIs, enriching, sampling, batching, and exporting. Your code uses .NET APIs. OTel handles the plumbing. The backends handle the pretty pictures.

:::info[The OTel convergence]
If you have been following along, you have now seen OpenTelemetry show up in logs, metrics, and traces. That is the point — it is not a separate thing to learn, it is the glue. One SDK, one set of exporters, one configuration pattern, three signal types, all sharing context through trace IDs and span IDs. The "three pillars of observability" stop being three separate projects and become one coherent telemetry pipeline.
:::

## Practical debugging with traces: reading the waterfall

You have traces wired up. Spans are flowing. The waterfall renders beautifully in your tracing tool. Now what? How do you actually use traces to debug production issues?

### Finding the slow span

The most common trace debugging workflow: something is slow, find where the time goes.

Open the trace. Look at the waterfall. The widest bar (relative to its parent) is where the time was spent. In most distributed systems, the answer is one of:

- An outbound HTTP call to a slow dependency
- A database query doing a full table scan
- A retry loop waiting between attempts
- A synchronous call that should have been async

The waterfall makes this visual. You do not need to compute anything. The slow thing is the wide bar.

### Finding the error

For failed requests, look for spans with error status (usually highlighted in red). Walk up the span hierarchy: which span actually set the error status? Was it the root span failing, or did a child span fail and the error propagated up?

Span events are particularly useful here. If the failing span has a `RecordException` event, you get the exception type, message, and stack trace right in the trace. No log-hunting required.

### Identifying parallelism issues

If your trace shows three sequential HTTP calls that could be parallel, the waterfall makes it obvious — three bars stacked vertically instead of overlapping horizontally. Total time is the sum of all three instead of the max.

```
[Parent span ──────────────────── 900ms]
  [Call service A ──── 300ms]
  [Call service B ──── 300ms]    ← these should overlap
  [Call service C ──── 300ms]
```

vs what it should look like:

```
[Parent span ──── 300ms]
  [Call service A ──── 300ms]
  [Call service B ──── 300ms]   (parallel)
  [Call service C ──── 300ms]   (parallel)
```

### Spotting unnecessary work

Traces also reveal work that should not be happening. A span for "fetch user profile" appearing twice in the same trace means someone is calling the same service twice when they could cache the result. A database query span appearing inside a loop suggests an N+1 problem. These are not latency mysteries — they are architecture bugs that the waterfall exposes visually.

### The "gap" problem

Sometimes the waterfall shows a gap — time passes between the end of one child span and the start of the next, but there is no span covering that gap. This usually means either:

- CPU-bound work between spans (computation that is not instrumented)
- GC pauses
- Thread pool starvation (waiting to get a thread to continue)
- Awaiting something that is not instrumented

If you see a 500ms gap with no spans, check if there is un-instrumented work. Or check your thread pool metrics from Part 2 — thread pool queue length spikes correlate with "gap" time in traces.

## Wrapping up

Logs tell you what happened to a specific request within a service. Metrics tell you how the system is behaving overall. Traces tell you what happened to a specific request _across your entire system_ — the complete journey, with timing, hierarchy, and causality.

The practical takeaway:

- **Use `ActivitySource` and `Activity`** for custom spans. The .NET API is clean, zero-cost when nobody listens, and fully compatible with OpenTelemetry.
- **Instrument at meaningful boundaries.** Network calls, database queries, significant business operations. Not every method call.
- **Propagation is everything.** If trace context does not cross service boundaries, you have single-service traces pretending to be distributed. Check your headers.
- **Name spans well.** Low-cardinality, descriptive names. Dynamic values go in attributes. Same cardinality rules as metrics.
- **Add attributes generously.** Unlike metric labels, span attributes handle high-cardinality values fine. Add the context that makes debugging possible.
- **Sample in production.** 100% trace collection is expensive. Use head-based sampling with error bias, or tail-based sampling in the collector.
- **Connect the three signals.** Trace IDs in logs, exemplars on metrics, shared export pipeline. The value multiplies when they connect.

Distributed tracing is where the "three pillars" metaphor stops being a conference talk slide and starts being a practical debugging workflow. A log line leads you to a trace. The trace shows you where the time went. Metrics confirm whether it is an isolated event or a pattern. That loop — from alert to trace to root cause — is the payoff of wiring these three signals together through OpenTelemetry.

In the next post, we will talk about **alerts** — because all this observability data means nothing if nobody finds out about problems until a customer tweets about it. We will cover how to write alerts that wake you up for the right reasons, how SLOs become alert thresholds, and why most alert rules make on-call engineers hate their phones.

:::info[Observability series]
This post is part of **Observability for Backend Engineers Who Don't Want Dashboard Theater**, a series about production visibility that tries very hard not to become a collection of expensive screenshots.

| Part | Post                                                                                             |
| ---- | ------------------------------------------------------------------------------------------------ |
| 1    | [Your Logs Are Lying to You](/blog/posts/observability-01-logs)                                  |
| 2    | [Metrics: Because "It Feels Slow" Isn't an SLO](/blog/posts/observability-02-metrics)            |
| 3    | **Traces: Following a Request Through the Haunted House** ← you are here                         |
| 4    | Alerts That Don't Make You Hate Your Phone _(coming next)_                                       |

:::

---

_This is Part 3 of the [Observability for Backend Engineers](/blog/tags/observability-for-backend-engineers) series._
