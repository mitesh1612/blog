---
title: "Metrics: Because 'It Feels Slow' Isn't an SLO"
description: "RED and USE methods, picking metrics that actually matter, custom metrics in .NET with System.Diagnostics.Metrics and OpenTelemetry, and the art of not measuring everything just because you can"
pubDatetime: 2026-05-05T00:00:00Z
author: Mitesh Shah
featured: true
draft: true
tags:
  - observability
  - Observability for Backend Engineers
  - backend
  - C#
  - ASP.NET Core
  - metrics
---

This is Part 2 of the **Observability for Backend Engineers Who Don't Want Dashboard Theater** series. [Part 1 covered logs](/blog/observability-01-logs) — structured logging, correlation, and why `Console.WriteLine("here")` in production is a cry for help.

Now we are talking about metrics. Logs tell you what happened to one request. Metrics tell you how the system is behaving — across thousands of requests, over time, in aggregate. They are how you answer "is this thing healthy?" without reading a novel.

## Table of contents

## The problem with not having metrics

<!-- 
SKELETON: Open with a relatable scenario — a team debugging a performance complaint using only logs. 
Show how painful it is to answer aggregate questions ("how many requests are we doing?", "what's our p99?") by grepping logs.
Contrast with what a single metric query gives you.
The punchline: logs are for forensics, metrics are for vital signs.
-->

Every backend team has had this meeting. Someone important says "the app feels slow." The team scrambles. Someone greps the logs for slow requests. Someone else eyeballs response times in a few cherry-picked traces. A third person says "it seems fine to me" and opens a dashboard that has not been updated since 2023.

Nobody can answer the basic questions: slow compared to what? Since when? For which endpoints? For what percentage of users?

This is the gap that metrics fill. Where logs are individual event records — great for post-incident forensics — metrics are aggregated measurements over time. They answer questions about the system as a whole, not about one specific request.

You do not debug an outage with metrics alone. But you detect one. You scope one. You answer "is this getting worse?" and "did the deploy fix it?" Metrics are the vital signs. Logs are the MRI.

## What even is a metric?

<!-- 
SKELETON: Quick conceptual grounding.
- A metric is a named numeric measurement collected over time
- Dimensions/labels/tags let you slice and dice
- Aggregation is the whole point — counts, rates, percentages, percentiles
- Brief mention of metric types: counters, gauges, histograms
- Keep it practical, not academic
-->

A metric is a named numeric value that you collect over time. That is it. Request count. Error rate. Queue depth. Response time. CPU usage. Each one is a number, attached to a name, sampled or incremented at regular intervals.

What makes metrics powerful is not individual data points — it is aggregation. You do not care that one request took 247ms. You care that the 99th percentile latency for `/api/orders` went from 200ms to 800ms after last Thursday's deploy.

### Metric types

Most metrics systems give you three fundamental instrument types:

| Type | What it does | Example |
|------|-------------|---------|
| **Counter** | Goes up. Only up. Monotonically increasing. | Total requests served, total errors, total bytes sent |
| **Gauge** | Goes up or down. A point-in-time measurement. | Current queue depth, active connections, CPU usage |
| **Histogram** | Records a distribution of values. Gives you percentiles. | Request duration, response size, batch processing time |

Counters are usually consumed as rates — "requests per second" is more useful than "we have served 14 million requests since the process started." Gauges are snapshots. Histograms are where the interesting stuff lives, because averages lie and percentiles don't (as much).

:::info
If a metric can decrease, it is a gauge. If it can only go up (or reset to zero on restart), it is a counter. Getting this wrong leads to nonsensical dashboards where your "total requests" occasionally goes backwards, which is either a bug or time travel, and you should not bet on the latter.
:::

### Dimensions and labels

<!-- 
SKELETON: Explain that a metric name alone isn't enough — you need labels/dimensions.
http_request_duration with labels {method, endpoint, status_code} gives you the ability to slice.
Warn about cardinality explosion — high-cardinality labels (user IDs, request IDs) will murder your metrics backend.
-->

A metric name alone is not enough. `http_request_duration` is useful. `http_request_duration` broken down by `method`, `endpoint`, and `status_code` is powerful. Those breakdowns are called dimensions, labels, or tags depending on which metrics system you are using. They all mean the same thing: key-value pairs attached to a metric that let you filter and group.

But there is a trap here, and it has ruined more Prometheus instances than bad configuration files ever have.

:::warning[The cardinality trap]
Every unique combination of label values creates a separate time series. If you add a `userId` label to a request duration metric and you have 100,000 users, you just created 100,000 time series per endpoint per method per status code. Your metrics backend will not send you a thank-you note.

Good labels: `method`, `endpoint`, `status_code`, `service`, `region`.
Bad labels: `userId`, `requestId`, `orderId`, `sessionToken`, anything that is unique per request.

Rule of thumb: if the label can have more than a few hundred distinct values, it probably does not belong on a metric. Put it in a log or a trace instead.
:::

## RED, USE, and the Four Golden Signals

<!-- 
SKELETON: The three frameworks that actually matter for deciding what to measure.
- RED Method (Tom Wilkie / Weave Works): Rate, Errors, Duration — for services
- USE Method (Brendan Gregg): Utilization, Saturation, Errors — for resources (CPU, memory, disk)
- Google's Four Golden Signals (SRE Book): Latency, Traffic, Errors, Saturation — a superset
- Show how they overlap, and that RED is usually where backend engineers should start
- Opinion: start with RED for your services, add USE for your infrastructure, and you've covered 90% of what matters
-->

There are three well-known frameworks for deciding what to measure. They overlap significantly, but each has a slightly different focus.

### RED Method

Created by [Tom Wilkie](https://grafana.com/blog/the-red-method-how-to-instrument-your-services/), the RED Method is designed for services — the things your team writes and deploys:

- **Rate** — requests per second
- **Errors** — the number of those requests that are failing
- **Duration** — how long those requests take (as a distribution, not an average)

This is the starting point for any backend service. If you can answer "how many requests are we handling, how many are failing, and how long are they taking?" for every service, you are already ahead of most teams.

### USE Method

Created by [Brendan Gregg](https://www.brendangregg.com/usemethod.html), the USE Method is designed for resources — the infrastructure your services run on:

- **Utilization** — percentage of time the resource is busy
- **Saturation** — the amount of work the resource cannot yet service (queue length)
- **Errors** — error event count

USE is for CPUs, memory, disks, network interfaces. It is less about your application code and more about whether the machine underneath is healthy.

### The Four Golden Signals

From Google's [SRE Book](https://sre.google/sre-book/monitoring-distributed-systems/), the Four Golden Signals are essentially RED plus saturation:

- **Latency** — time to serve a request (successful vs failed, separately)
- **Traffic** — demand on your system (requests per second)
- **Errors** — rate of failed requests
- **Saturation** — how "full" your service is (CPU quota usage, memory pressure, queue backlog)

### Which one should you use?

All of them, kind of. Start with RED for your application services. Add USE for your infrastructure. Congratulations, you have covered the Four Golden Signals without needing to memorise a fourth acronym.

The important thing is not which framework you follow — it is that you have a systematic approach to deciding what to measure, rather than the default strategy of "add a metric whenever someone panics during an incident."

## Metrics in .NET: System.Diagnostics.Metrics

<!-- 
SKELETON: The practical C# section. 
- System.Diagnostics.Metrics is the modern .NET metrics API (not EventCounters, not PerformanceCounter)
- Meter is the entry point — like a named group of instruments
- Counter<T>, Histogram<T>, UpDownCounter<T>, ObservableGauge<T>
- Show practical examples: request counter, request duration histogram, queue depth gauge
- DI-friendly patterns with IMeterFactory
- Naming conventions (OTel-style: lowercase, dotted, underscore separators)
-->

.NET has had several metrics APIs over the years. `PerformanceCounter` is ancient. `EventCounters` were the .NET Core era approach. The modern answer is `System.Diagnostics.Metrics`, which aligns with OpenTelemetry's instrumentation model and is the recommended approach from .NET 8 onwards.

The core concept: you create a `Meter` (a named group of instruments), then create instruments on it (counters, histograms, gauges). Instruments record measurements. Something downstream — Prometheus, OTLP, `dotnet-counters` — collects and exports them.

### Setting up a Meter

```cs file="Metrics/ServiceMetrics.cs"
using System.Diagnostics.Metrics;

public class ServiceMetrics
{
    public const string MeterName = "MyCompany.OrderService";
    
    private readonly Counter<long> _ordersCreated;
    private readonly Counter<long> _ordersFailed;
    private readonly Histogram<double> _orderProcessingDuration;
    private readonly UpDownCounter<long> _activeOrders;
    
    public ServiceMetrics(IMeterFactory meterFactory)
    {
        var meter = meterFactory.Create(MeterName);
        
        _ordersCreated = meter.CreateCounter<long>(
            "orders.created",
            unit: "{order}",
            description: "Number of orders successfully created");
        
        _ordersFailed = meter.CreateCounter<long>(
            "orders.failed",
            unit: "{order}",
            description: "Number of orders that failed to create");
        
        _orderProcessingDuration = meter.CreateHistogram<double>(
            "orders.processing.duration",
            unit: "ms",
            description: "Time taken to process an order");
        
        _activeOrders = meter.CreateUpDownCounter<long>(
            "orders.active",
            unit: "{order}",
            description: "Number of orders currently being processed");
    }
    
    public void OrderCreated(string region) =>
        _ordersCreated.Add(1, new KeyValuePair<string, object?>("region", region));
    
    public void OrderFailed(string region, string reason) =>
        _ordersFailed.Add(1,
            new KeyValuePair<string, object?>("region", region),
            new KeyValuePair<string, object?>("failure.reason", reason));
    
    public void RecordProcessingDuration(double durationMs, string region) =>
        _orderProcessingDuration.Record(durationMs,
            new KeyValuePair<string, object?>("region", region));
    
    public void OrderProcessingStarted() => _activeOrders.Add(1);
    public void OrderProcessingCompleted() => _activeOrders.Add(-1);
}
```

```cs file="Program.cs"
// Register the meter and metrics class
builder.Services.AddSingleton<ServiceMetrics>();
```

<!-- 
SKELETON: 
- Explain why IMeterFactory over static Meter (DI-friendly, testable, proper lifetime management)
- Show how to use it in a service/controller
- Note: the instruments themselves are cheap to call — the overhead is in collection, not recording
-->

:::info[Why IMeterFactory?]
You could create a `static Meter` and call it a day. It works. But `IMeterFactory` plays nicely with dependency injection, gives you proper lifetime management, and makes your metrics testable. In a `static` Meter world, your unit tests either ignore metrics entirely or fight with shared global state. Neither is fun.
:::

### Using metrics in a service

```cs file="Services/OrderService.cs"
public class OrderService
{
    private readonly ServiceMetrics _metrics;
    private readonly ILogger<OrderService> _logger;
    
    public OrderService(ServiceMetrics metrics, ILogger<OrderService> logger)
    {
        _metrics = metrics;
        _logger = logger;
    }
    
    public async Task<Order> CreateOrderAsync(CreateOrderRequest request)
    {
        _metrics.OrderProcessingStarted();
        var stopwatch = Stopwatch.StartNew();
        
        try
        {
            var order = await ProcessOrderInternal(request);
            
            stopwatch.Stop();
            _metrics.OrderCreated(request.Region);
            _metrics.RecordProcessingDuration(stopwatch.Elapsed.TotalMilliseconds, request.Region);
            
            return order;
        }
        catch (Exception ex)
        {
            _metrics.OrderFailed(request.Region, ex.GetType().Name);
            throw;
        }
        finally
        {
            _metrics.OrderProcessingCompleted();
        }
    }
}
```

### Naming conventions

Follow the [OpenTelemetry semantic conventions](https://opentelemetry.io/docs/specs/semconv/general/metrics/) for naming:

- Lowercase, dotted hierarchy: `orders.created`, not `OrdersCreated` or `orders_created`
- Use `.` as namespace separator and `_` to separate words within a segment
- Include units in the instrument definition, not in the name: `orders.processing.duration` with `unit: "ms"`, not `orders.processing.duration_ms`
- Meter name should identify the library/component: `MyCompany.OrderService`

Boring, consistent naming now saves you from a metrics junk drawer later. Same lesson as structured log field names from Part 1 — pick a convention and be stubbornly consistent about it.

## What to actually measure

<!-- 
SKELETON: Opinionated guidance on what metrics matter for a typical backend service.
Organised around the RED/USE framework introduced earlier.
- HTTP request rate, error rate, duration (histogram) — the basics
- Dependency call rate, error rate, duration — your outbound calls
- Queue depth, processing rate, consumer lag — if you have async processing
- Business metrics — orders created, payments processed, signups — the ones that actually matter to the business
- Runtime metrics — GC, thread pool, connection pools — usually available for free via OTel or dotnet-counters
-->

Here is a practical checklist for a typical backend service:

### The RED basics (measure these first)

- **Request rate** by endpoint and method
- **Error rate** by endpoint and error type (4xx vs 5xx matters — one is "you asked wrong", the other is "we broke")
- **Request duration** as a histogram — p50, p95, p99 at minimum

### Dependency health

- Duration, error rate, and retry count for every outbound dependency (databases, APIs, caches, message brokers)
- Connection pool utilisation (are you running out of database connections before running out of CPU?)
- Circuit breaker state changes

### Async processing (if applicable)

- Queue depth / consumer lag
- Processing rate and duration per message type
- Dead letter queue size (this one should have an alert on it — always)

### Business metrics

These are the ones your product manager actually cares about, and the ones most engineering teams forget to instrument:

- Orders created per minute
- Payments processed, failed, retried
- User signups, login failures
- Whatever KPI your team reports on in sprint reviews

Business metrics are underrated. When the CEO asks "are we making money right now?" the answer should not involve someone SSHing into a production box.

### Runtime metrics (mostly free)

ASP.NET Core and the .NET runtime expose a bunch of useful metrics out of the box — GC pause times, thread pool queue length, HTTP connection pool usage. With OpenTelemetry configured, you get many of these without writing a single line of instrumentation code.

## What NOT to measure

<!-- 
SKELETON: Mirror the "what to stop logging" section from Part 1.
- Don't measure everything — metric cardinality has a cost
- Avoid per-user, per-request, per-entity metrics (cardinality bomb)
- Avoid vanity metrics that look good on dashboards but don't help you debug anything
- Avoid duplicating what the platform already measures (ASP.NET Core request metrics exist, don't reinvent them)
-->

Metrics have a cost. Every unique time series consumes memory in your metrics backend, and cardinality explosions are the number one way to take down a Prometheus instance.

- **Don't add per-user or per-entity dimensions.** If you need per-user latency data, that is a trace or a log, not a metric.
- **Don't duplicate platform metrics.** ASP.NET Core already emits `http.server.request.duration`. Don't create your own unless you need something the built-in doesn't provide.
- **Don't create metrics you will never alert on or dashboard.** Every metric is a promise to maintain it. If nobody will ever look at it, it is just entropy with a name.
- **Don't measure internal implementation details.** "Number of times we entered the retry loop" is probably not worth a metric. "Number of retries per dependency" is.

## Wiring up OpenTelemetry metrics export

<!-- 
SKELETON: The OTel section for this chapter, as described in the series outline.
- System.Diagnostics.Metrics + OTel exporter is the modern .NET approach
- Show how to wire up OTLP exporter (or Prometheus exporter for local dev)
- AddMeter() to register your custom meters
- Built-in ASP.NET Core and runtime meters you should enable
- Brief mention of exporters: OTLP (for Grafana/Tempo/etc), Prometheus, Azure Monitor
- Keep it practical, not a vendor deep-dive
-->

`System.Diagnostics.Metrics` records measurements. OpenTelemetry collects and exports them. Wiring the two together in ASP.NET Core:

```cs file="Program.cs"
builder.Services.AddOpenTelemetry()
    .WithMetrics(metrics =>
    {
        metrics
            // Built-in ASP.NET Core metrics
            .AddAspNetCoreInstrumentation()
            // Built-in HTTP client metrics
            .AddHttpClientInstrumentation()
            // Built-in runtime metrics (GC, thread pool, etc.)
            .AddRuntimeInstrumentation()
            // Your custom meters
            .AddMeter(ServiceMetrics.MeterName)
            // Export via OTLP (to Grafana, Jaeger, Azure Monitor, etc.)
            .AddOtlpExporter();
    });
```

For local development, a Prometheus exporter with Grafana is a solid setup:

```cs
// Instead of (or in addition to) OTLP
.AddPrometheusExporter();

// Then expose the /metrics endpoint
app.MapPrometheusScrapingEndpoint();
```

:::info[The OTel thread continues]
In Part 1, we mentioned OpenTelemetry as the glue that connects logs, metrics, and traces. This is where it starts earning its keep. `System.Diagnostics.Metrics` is the recording API. OpenTelemetry is the pipeline that gets those measurements to wherever you visualise them. Same pattern as `Activity` for traces (which we will cover in Part 3) — .NET provides the API surface, OTel provides the plumbing.
:::

### What meters to enable

At minimum, enable these built-in instrumentation sources:

| Source | What you get |
|--------|-------------|
| `AddAspNetCoreInstrumentation()` | `http.server.request.duration`, `http.server.active_requests` |
| `AddHttpClientInstrumentation()` | `http.client.request.duration` for outbound HTTP calls |
| `AddRuntimeInstrumentation()` | GC collections, heap size, thread pool queue length, etc. |
| `AddMeter("YourApp.Meter")` | Your custom business and application metrics |

You get a surprising amount of visibility just from enabling the built-in instrumentation. Add your custom meters on top for business-specific signals.

## Percentiles, averages, and why averages lie

<!-- 
SKELETON: A short but important section.
- Averages hide outliers. A p50 of 100ms and p99 of 5s averages to "looks fine"
- Histograms give you the distribution — p50, p95, p99 are what matter
- The "long tail" problem: 1% of users getting terrible latency is still a lot of users at scale
- Brief mention of histogram bucket configuration if relevant
-->

If your service has a p50 latency of 100ms and a p99 of 5 seconds, the average will tell you everything is fine. The average is wrong.

Averages smooth out the distribution. A request that takes 100ms and a request that takes 10 seconds average to 5.05 seconds, which describes neither experience accurately. This is why you need histograms, not averages.

The metrics that matter for latency:

- **p50 (median)** — what the typical user experiences
- **p95** — what the unlucky user experiences
- **p99** — what the really unlucky user experiences. At scale, 1% of 10 million requests is 100,000 bad experiences.

When someone says "our latency is 200ms," always ask "which percentile?" If the answer is "average" or "I don't know," the number is meaningless.

:::warning
If your monitoring dashboard shows only average latency, it is a dashboard designed to make you feel good, not one designed to help you find problems. Replace it with p50/p95/p99 as soon as possible.
:::

## SLIs and SLOs: metrics that mean something to the business

<!-- 
SKELETON: Connect metrics to SLIs/SLOs.
- SLI (Service Level Indicator) = a metric that measures service quality (e.g., proportion of requests < 300ms)
- SLO (Service Level Objective) = a target for that metric (e.g., 99.5% of requests should be < 300ms)
- SLA = SLO with consequences (contractual)
- Why "it feels slow" fails — no baseline, no target, no way to measure improvement
- Show a concrete example: defining an SLO for an order creation endpoint
- Brief, not a deep dive — just enough to connect the dots
-->

Metrics become genuinely useful when they are connected to an expectation. That is what SLIs and SLOs give you.

- **SLI (Service Level Indicator)** — a metric that quantifies some aspect of service quality. For example: "the proportion of requests to `/api/orders` that complete in under 300ms."
- **SLO (Service Level Objective)** — a target for that indicator. For example: "99.5% of requests should complete in under 300ms, measured over a 30-day rolling window."
- **SLA (Service Level Agreement)** — an SLO with contractual consequences. If you miss it, someone writes a cheque.

The reason "it feels slow" is not an SLO: there is no baseline, no target, and no way to measure whether things got better or worse. An SLO gives you a number to compare against and a budget to burn — if you are meeting your SLO with room to spare, you can ship riskier changes. If you are close to the edge, slow down.

You do not need SLOs for every metric. Start with one or two for your most critical endpoints and see how it changes the way your team makes decisions.

## Wrapping up

<!-- 
SKELETON: Recap the key takeaways and tease Part 3 (tracing).
-->

Logs tell you what happened to a specific request. Metrics tell you how the system is doing overall. They are different tools for different questions, and you need both.

The short version:

- **Use RED for services** — Rate, Errors, Duration. If you measure nothing else, measure these.
- **Use USE for infrastructure** — Utilization, Saturation, Errors. Know if the machine is healthy.
- **Use `System.Diagnostics.Metrics`** — the modern .NET metrics API. Create a `Meter`, create instruments, let OpenTelemetry export them.
- **Histograms over averages** — p50, p95, p99 tell you what is actually happening. Averages tell you a bedtime story.
- **Watch your cardinality** — every unique label combination is a time series. High-cardinality labels belong in logs and traces, not metrics.
- **Connect metrics to SLOs** — metrics without targets are numbers without meaning.

In the next post, we will talk about **distributed tracing** — following a request through the haunted house of microservices, and why your trace waterfall probably looks like abstract art.

---

*This is Part 2 of the [Observability for Backend Engineers](/blog/tags/observability-for-backend-engineers) series. [Part 1: Your Logs Are Lying to You](/blog/observability-01-logs).*
