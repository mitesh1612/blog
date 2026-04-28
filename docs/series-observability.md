# Observability for Backend Engineers Who Don't Want Dashboard Theater

A blog series about observability that's actually useful — written for backend engineers who build real systems, not for people who collect Grafana screenshots.

## Series Overview

Most observability content falls into two buckets: vendor docs that want you to instrument everything, and conference talks where someone shows a perfect distributed trace on a slide. Neither is particularly helpful when you are staring at a broken service at 2 AM and your logs say "An error occurred."

This series covers observability the way it actually matters in backend systems — structured, practical, opinionated, and written in C#.

## Chapters

1. **Your Logs Are Lying to You**
   Structured logging done right, what to log, what to stop logging, and why `Console.WriteLine("here")` in prod is a cry for help.

2. **Metrics: Because "It Feels Slow" Isn't an SLO**
   RED/USE methods, picking metrics that actually matter, and the art of not measuring everything just because you can.

3. **Traces: Following a Request Through the Haunted House**
   Distributed tracing without the PhD, correlation IDs, span design, and why your trace waterfall looks like modern art.

4. **Alerts That Don't Make You Hate Your Phone**
   Alert fatigue, symptom vs cause alerting, runbooks that aren't fiction, and on-call that doesn't ruin weekends.

5. **Dashboards: The One Good One vs The Fifty Nobody Opens**
   What actually belongs on a dashboard, the golden signals board, and killing the vanity metrics graveyard.

6. **Debugging in Prod Without Losing Your Job**
   Feature flags, debug endpoints, dynamic log levels, and the dark arts of safe production investigation.

## Notes

- All code examples are in C# / ASP.NET Core
- Each chapter is self-contained but builds on the previous
- The series prioritises practical patterns over tool-specific guides
