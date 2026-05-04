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

This is Part 2 of the **Observability for Backend Engineers Who Don't Want Dashboard Theater** series. [Part 1 covered logs](/blog/posts/observability-01-logs) — structured logging, correlation, and why `Console.WriteLine("here")` in production is a cry for help.

Now we are talking about metrics. Logs tell you what happened to one request. Metrics tell you how the system is behaving — across thousands of requests, over time, in aggregate. They are how you answer "is this thing healthy?" without reading a novel.

## Table of contents

## The problem with not having metrics

If someone asked you right now whether your service is healthy, how would you answer without opening three dashboards and performing a small ritual?

Every backend team has had this meeting. Someone important says "the app feels slow." The team scrambles. Someone greps the logs for slow requests. Someone else eyeballs response times in a few cherry-picked traces. A third person says "it seems fine to me" and opens a dashboard that has not been updated since 2023.

Nobody can answer the basic questions: slow compared to what? Since when? For which endpoints? For what percentage of users?

This is the gap that metrics fill. Where logs are individual event records — great for post-incident forensics — metrics are aggregated measurements over time. They answer questions about the system as a whole, not about one specific request.

Without metrics, answering "what is our p99 latency for order creation since the deploy?" turns into archaeology. You grep logs, parse timestamps, remember that one code path logs milliseconds while another logs seconds, and eventually produce a spreadsheet with the structural integrity of wet cardboard.

With metrics, the same question is boring:

```txt file="PromQL"
histogram_quantile(
  0.99,
  sum by (le) (
    rate(http_server_request_duration_seconds_bucket{http_route="/api/orders"}[5m])
  )
)
```

Boring is good. Boring means the answer does not depend on who remembered the right log query.

You do not debug an outage with metrics alone. But you detect one. You scope one. You answer "is this getting worse?" and "did the deploy fix it?" Metrics are the vital signs. Logs are the MRI.

## What even is a metric?

A metric is a named numeric value that you collect over time. That is it. Request count. Error rate. Queue depth. Response time. CPU usage. Each one is a number, attached to a name, sampled or incremented at regular intervals.

What makes metrics powerful is not individual data points — it is aggregation. You do not care that one request took 247ms. You care that the 99th percentile latency for `/api/orders` went from 200ms to 800ms after last Thursday's deploy.

### Metric types

Most metrics systems give you three fundamental instrument types:

| Type          | What it does                                             | Example                                                |
| ------------- | -------------------------------------------------------- | ------------------------------------------------------ |
| **Counter**   | Goes up. Only up. Monotonically increasing.              | Total requests served, total errors, total bytes sent  |
| **Gauge**     | Goes up or down. A point-in-time measurement.            | Current queue depth, active connections, CPU usage     |
| **Histogram** | Records a distribution of values. Gives you percentiles. | Request duration, response size, batch processing time |

Counters are usually consumed as rates — "requests per second" is more useful than "we have served 14 million requests since the process started." Gauges are snapshots. Histograms are where the interesting stuff lives, because averages lie and percentiles don't (as much).

:::info
If a metric can decrease, it is a gauge. If it can only go up (or reset to zero on restart), it is a counter. Getting this wrong leads to nonsensical dashboards where your "total requests" occasionally goes backwards, which is either a bug or time travel, and you should not bet on the latter.
:::

### Dimensions and labels

A metric name alone is not enough. `http_request_duration` is useful. `http_request_duration` broken down by `method`, `endpoint`, and `status_code` is powerful. Those breakdowns are called dimensions, labels, or tags depending on which metrics system you are using. They all mean the same thing: key-value pairs attached to a metric that let you filter and group.

But there is a trap here, and it has ruined more Prometheus instances than bad configuration files ever have.

:::warning[The cardinality trap]
Every unique combination of label values creates a separate time series. If you add a `userId` label to a request duration metric and you have 100,000 users, you just created 100,000 time series per endpoint per method per status code. Your metrics backend will not send you a thank-you note.

Good labels: `method`, `endpoint`, `status_code`, `service`, `region`.

Bad labels: `userId`, `requestId`, `orderId`, `sessionToken`, anything that is unique per request.

Rule of thumb: if the label can have more than a few hundred distinct values, it probably does not belong on a metric. Put it in a log or a trace instead.
:::

## RED, USE, and the Four Golden Signals

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

.NET has had several metrics APIs over the years. `PerformanceCounter` is ancient. `EventCounters` were the .NET Core era approach. The modern answer is `System.Diagnostics.Metrics`, which aligns with OpenTelemetry's instrumentation model and is the recommended approach from .NET 8 onwards.

The core concept: you create a `Meter` (a named group of instruments), then create instruments on it (counters, histograms, gauges). Instruments record measurements. Something downstream — Prometheus, OTLP, `dotnet-counters` — collects and exports them.

The instruments you will use most often are:

| Instrument           | Use it for                                 | Example                                          |
| -------------------- | ------------------------------------------ | ------------------------------------------------ |
| `Counter<T>`         | Values that only increase                  | Orders created, HTTP requests, failed payments   |
| `Histogram<T>`       | Distributions                              | Request duration, response size, processing time |
| `UpDownCounter<T>`   | Values that can both increase and decrease | Active jobs, in-flight requests                  |
| `ObservableGauge<T>` | Values observed from current state         | Queue depth, cache size, memory pressure         |

Most services only need a few custom instruments. If your metrics class has more properties than your domain model, you may have mistaken observability for inventory management.

`ObservableGauge<T>` is the odd one out because you do not record values directly. You give .NET a callback, and the metrics pipeline observes the current value when it collects:

```cs
meter.CreateObservableGauge(
    "orders.queue.depth",
    () => queue.Count,
    unit: "{order}",
    description: "Number of orders waiting to be processed");
```

Use this for state that already exists somewhere else, like queue depth or cache size. Do not update a gauge manually with vibes and hope.

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
            unit: "s",
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

    public void RecordProcessingDuration(double durationSeconds, string region) =>
        _orderProcessingDuration.Record(durationSeconds,
            new KeyValuePair<string, object?>("region", region));

    public void OrderProcessingStarted() => _activeOrders.Add(1);
    public void OrderProcessingCompleted() => _activeOrders.Add(-1);
}
```

```cs file="Program.cs"
// Register the meter and metrics class
builder.Services.AddSingleton<ServiceMetrics>();
```

:::info[Why IMeterFactory?]
You could create a `static Meter` and call it a day. It works. But `IMeterFactory` plays nicely with dependency injection, gives you proper lifetime management, and makes your metrics testable. In a `static` Meter world, your unit tests either ignore metrics entirely or fight with shared global state. Neither is fun.
:::

Recording a metric is cheap. The hot path is designed for this. The expensive part is usually what happens later: aggregation, export, storage, and the moment someone adds `customerId` as a label and quietly turns your metrics backend into a bonfire.

### Using metrics in a service

```cs file="Services/OrderService.cs"
using System.Diagnostics;

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
            _metrics.RecordProcessingDuration(stopwatch.Elapsed.TotalSeconds, request.Region);

            return order;
        }
        catch (Exception ex)
        {
            _metrics.OrderFailed(request.Region, ex.GetType().Name);
            _logger.LogError(ex, "Failed to create order in region {Region}", request.Region);
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
- Include units in the instrument definition, not in the name: `orders.processing.duration` with `unit: "s"`, not `orders.processing.duration_seconds`
- Meter name should identify the library/component: `MyCompany.OrderService`

Boring, consistent naming now saves you from a metrics junk drawer later. Same lesson as structured log field names from Part 1 — pick a convention and be stubbornly consistent about it.

## What to actually measure

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

Do not start by inventing twenty custom metrics. Start with what the platform already gives you, add RED metrics for your service, then add business metrics for the things your team is actually responsible for. Observability is not a sticker collection.

## What NOT to measure

Metrics have a cost. Every unique time series consumes memory in your metrics backend, and cardinality explosions are the number one way to take down a Prometheus instance.

- **Don't add per-user or per-entity dimensions.** If you need per-user latency data, that is a trace or a log, not a metric.
- **Don't duplicate platform metrics.** ASP.NET Core already emits `http.server.request.duration`. Don't create your own unless you need something the built-in doesn't provide.
- **Don't create metrics you will never alert on or dashboard.** Every metric is a promise to maintain it. If nobody will ever look at it, it is just entropy with a name.
- **Don't measure internal implementation details.** "Number of times we entered the retry loop" is probably not worth a metric. "Number of retries per dependency" is.
- **Don't worship vanity metrics.** "Total registered users" looks great on a dashboard and tells you almost nothing about whether the system is healthy right now. It is a business report wearing an incident-response costume.

A good metric helps you detect, explain, or decide something. If it does none of those, remove it before it becomes another graph nobody opens but everyone is afraid to delete.

## Wiring up OpenTelemetry metrics export

`System.Diagnostics.Metrics` records measurements. OpenTelemetry collects and exports them. Wiring the two together in ASP.NET Core:

:::info[Packages used in this example]
The code below assumes you have the relevant OpenTelemetry packages installed:

```bash
dotnet add package OpenTelemetry.Extensions.Hosting
dotnet add package OpenTelemetry.Instrumentation.AspNetCore
dotnet add package OpenTelemetry.Instrumentation.Http
dotnet add package OpenTelemetry.Instrumentation.Runtime
dotnet add package OpenTelemetry.Exporter.OpenTelemetryProtocol
dotnet add package OpenTelemetry.Exporter.Prometheus.AspNetCore
```

OpenTelemetry is a standard, but NuGet packages are still where optimism goes to meet reality.
:::

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

In production, OTLP is usually the least annoying default because it keeps your application from caring where the telemetry eventually lands. Grafana, Azure Monitor, Honeycomb, New Relic, Datadog, and several other tools can receive OTLP directly or through the OpenTelemetry Collector. The collector is where you do routing, filtering, batching, and other plumbing that does not belong in your application code.

:::info[The OTel thread continues]
In Part 1, we mentioned OpenTelemetry as the glue that connects logs, metrics, and traces. This is where it starts earning its keep. `System.Diagnostics.Metrics` is the recording API. OpenTelemetry is the pipeline that gets those measurements to wherever you visualise them. Same pattern as `Activity` for traces (which we will cover in Part 3) — .NET provides the API surface, OTel provides the plumbing.
:::

### What meters to enable

At minimum, enable these built-in instrumentation sources:

| Source                           | What you get                                                  |
| -------------------------------- | ------------------------------------------------------------- |
| `AddAspNetCoreInstrumentation()` | `http.server.request.duration`, `http.server.active_requests` |
| `AddHttpClientInstrumentation()` | `http.client.request.duration` for outbound HTTP calls        |
| `AddRuntimeInstrumentation()`    | GC collections, heap size, thread pool queue length, etc.     |
| `AddMeter("YourApp.Meter")`      | Your custom business and application metrics                  |

You get a surprising amount of visibility just from enabling the built-in instrumentation. Add your custom meters on top for business-specific signals.

## Percentiles, averages, and why averages lie

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

Histogram buckets matter too. If your buckets are `100ms`, `1s`, and `10s`, you will know that something is slow, but not whether it is annoyingly slow or "the customer has opened another tab and is reconsidering their life choices" slow. Pick buckets that match your actual expectations for the endpoint.

## SLIs and SLOs: metrics that mean something to the business

Metrics become genuinely useful when they are connected to an expectation. That is what SLIs and SLOs give you.

- **SLI (Service Level Indicator)** — a metric that quantifies some aspect of service quality. For example: "the proportion of requests to `/api/orders` that complete in under 300ms."
- **SLO (Service Level Objective)** — a target for that indicator. For example: "99.5% of requests should complete in under 300ms, measured over a 30-day rolling window."
- **SLA (Service Level Agreement)** — an SLO with contractual consequences. If you miss it, someone writes a cheque.

The reason "it feels slow" is not an SLO: there is no baseline, no target, and no way to measure whether things got better or worse. An SLO gives you a number to compare against and a budget to burn — if you are meeting your SLO with room to spare, you can ship riskier changes. If you are close to the edge, slow down.

For an order creation endpoint, a reasonable first pass might be:

| Item         | Example                                                                    |
| ------------ | -------------------------------------------------------------------------- |
| User journey | Customer creates an order                                                  |
| SLI          | Percentage of successful `POST /api/orders` requests completed under 300ms |
| SLO          | 99.5% over a rolling 30-day window                                         |
| Error budget | 0.5% of requests can be slower or fail before you have spent the budget    |

That is much better than "orders should be fast," which is not an objective. It is a wish wearing a blazer.

You do not need SLOs for every metric. Start with one or two for your most critical endpoints and see how it changes the way your team makes decisions.

## A skeleton for metrics in a new service

If you are starting from scratch, the practical setup looks like this:

```cs file="Program.cs"
builder.Services.AddSingleton<ServiceMetrics>();

builder.Services.AddOpenTelemetry()
    .WithMetrics(metrics =>
    {
        metrics
            .AddAspNetCoreInstrumentation()
            .AddHttpClientInstrumentation()
            .AddRuntimeInstrumentation()
            .AddMeter(ServiceMetrics.MeterName)
            .AddOtlpExporter();
    });
```

Then keep `ServiceMetrics` small: RED metrics for your service, dependency health, and a few business counters that actually matter. Everything else needs to justify its existence like it is asking for production database access.

## Wrapping up

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

_This is Part 2 of the [Observability for Backend Engineers](/blog/tags/observability-for-backend-engineers) series. [Part 1: Your Logs Are Lying to You](/blog/posts/observability-01-logs)._
