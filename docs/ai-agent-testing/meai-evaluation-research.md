# Microsoft.Extensions.AI.Evaluation — Research Notes

## Overview
A full .NET evaluation framework at **v10.5.0** (as of May 2026). NOT preview/experimental — production-ready.

## Package Family
- `Microsoft.Extensions.AI.Evaluation` — Core abstractions and types
- `Microsoft.Extensions.AI.Evaluation.Quality` — Quality evaluators (Relevance, Truth, Completeness, Fluency, Coherence, Retrieval, Equivalence, Groundedness)
- `Microsoft.Extensions.AI.Evaluation.Safety` — Safety evaluators via Azure AI Foundry (Protected Material, Groundedness Pro, Ungrounded Attributes, Hate/Unfairness, Self Harm, Violence, Sexual, Code Vulnerability, Indirect Attack)
- `Microsoft.Extensions.AI.Evaluation.NLP` — NLP metrics (BLEU, GLEU, F1)
- `Microsoft.Extensions.AI.Evaluation.Reporting` — Response caching, result storage, report generation
- `Microsoft.Extensions.AI.Evaluation.Reporting.Azure` — Azure Storage backend for reporting
- `Microsoft.Extensions.AI.Evaluation.Console` — CLI tool for reports and data management

## Key Capabilities
- LLM-as-judge evaluators for quality dimensions
- Safety evaluators backed by Azure AI Foundry service
- NLP-based metrics
- Response caching (avoid repeated LLM calls in CI/CD)
- Result storage across multiple executions over time
- Report generation
- Structured as xUnit/NUnit test patterns — evaluations run as unit tests
- Works in both "online" (production telemetry) and "offline" (CI/CD) modes

## Usage Pattern
- Evaluations structured as unit tests (xUnit)
- First run hits LLM, subsequent runs use cache (if params unchanged)
- Cache expires after 14 days by default
- Can store results in Azure Storage or locally
- CLI tool for generating reports from stored results

## Samples
- Official samples: https://github.com/dotnet/ai-samples/blob/main/src/microsoft-extensions-ai-evaluation/api/
- Structured as unit test examples, each file demonstrates a specific concept

## Third-Party Extensions
- **AgentEval** (NuGet) — Built on top of MEAI Evaluation, adds: tool usage validation, RAG quality metrics, stochastic evaluation, model comparison, red team security testing. Specifically for Microsoft Agent Framework (MAF).

## What It Doesn't Have (vs. DeepEval)
- No `ToolCorrectnessMetric` equivalent in the core package (AgentEval fills this gap)
- No `TaskCompletionMetric` equivalent (trace-based task completion)
- No built-in tracing/observability (`@observe` decorator equivalent)
- No built-in multi-turn conversational test cases

## Blog Implications
- The .NET eval story is actually solid — not a desert
- MEAI Evaluation + AgentEval covers most of what DeepEval does for Python
- Still worth mentioning DeepEval for Python-specific features (tracing, tool correctness)
- The "response caching for CI/CD" feature is unique and worth highlighting
