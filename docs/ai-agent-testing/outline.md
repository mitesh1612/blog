# Blog Post Outline: How to Test an AI Agent Before Production

## Title

**"Testing AI Agents: Because 'It Works on My Prompt' Is Not a Test Strategy"**

Slug: `testing-ai-agents` — SEO description targets "how to test an AI agent before production."

---

## Frontmatter

```yaml
title: "Testing AI Agents: Because 'It Works on My Prompt' Is Not a Test Strategy"
description: "A practical guide to testing AI agents before production — unit tests for non-deterministic systems, LLM-as-judge evaluation, tool call verification, red teaming, and the tooling that actually exists for .NET and Python"
pubDatetime: 2026-05-XX
author: Mitesh Shah
featured: true
draft: true
tags:
  - AI
  - testing
  - backend
  - C#
  - Python
  - LLM
```

---

## Decisions (locked in)

- **Title**: "It Works on My Prompt" — funnier, matches existing style
- **Format**: Standalone pillar post. Closing note invites readers to request deeper follow-ups on specific sections.
- **Code split**: C# for unit testing patterns and MEAI Evaluation; Python for DeepEval and PyRIT. Show the best tool for each job.
- **Voice**: Mix of first person ("When we shipped...", "In our system...") and general ("Teams often find..."). Sprinkle personal experience, don't make it a resume.
- **Experience to weave in** (throughout, not in one dump):
  - Used Microsoft.Extensions.AI.Evaluation in production for shipping AI features
  - Mix of built-in evaluators and custom evaluators (custom prompts with scoring strategy)
  - CI evals to catch prompt drift causing quality regressions
  - Production evals pushing metrics and traces → alerting when quality degrades
  - Tracing for drilling into specifics when something goes wrong
  - User data handling: redaction and appropriate treatment; opt-in for deeper investigation
  - Thorough red teaming and evaluation before production launch — hate content, invalid generation, prompt injection, all attack vectors
  - Frame as: "here's a process you should follow before shipping" (not a specific company process, but a responsible engineering practice)

---

## Post Structure

### Opening (~300 words)

**Hook**: Start with the reality of how most teams "test" their AI agents today - vibe checking in a playground, someone types five prompts, says "looks good," and ships. Draw the parallel to how backend engineers would never ship an API endpoint tested with "I curled it five times and it seemed fine." Yet that's exactly what's happening with AI agents.

**The core problem**: Traditional testing assumes determinism. AI agents violate that assumption at every level - non-deterministic outputs, no single right answer, real side effects (tool calls), emergent behavior from composition, multi-turn state. You can't just `Assert.Equal(expected, actual)`.

**What this post covers**: A practical framework for testing AI agents, from fast deterministic checks to LLM-based evaluation to adversarial probing. With code. In languages you actually use.

**Tone note**: Set the voice early — "I've shipped AI features to production. Some of what I learned came from the docs. Most of it came from things going wrong." Establishes credibility without making it about you.

---

### Section 1: Define What "Good" Looks Like Before You Write a Single Test (~400 words)

**Core argument**: Most teams skip this and go straight to building. Then they're surprised when their agent fails in production in ways they never considered.

**Content**:
- The Golden Examples exercise: For each critical capability, manually write 5-10 examples of ideal behavior. Be specific about what "correct" means for YOUR agent.
  - RAG agent: what good retrieval looks like AND what a good answer looks like
  - Tool-use agent: which tool should be called, with what args, and what to do with the result
  - Conversational agent: full multi-turn showing ideal tone and boundary-setting
- Define failure modes explicitly: What must the agent NOT do? (medical advice? reveal system prompt? call destructive APIs without confirmation? fabricate info?)
- These golden examples become your test dataset seed AND inform which metrics matter.

**Callout box**: "If you cannot articulate what 'correct' looks like for your agent, you are not ready to test it. You are not even ready to build it."

---

### Section 2: The Three Levels of AI Evaluation (~500 words)

**Core argument**: Not everything needs an LLM judge. There's a cost-to-signal ratio at each level, and you should conquer them in order.

**Level 1: Assertions (Unit Tests)**
- Deterministic, code-based checks. Fast, cheap, automatable.
- Output is valid JSON / matches schema
- Tool call includes required parameters
- Response doesn't exceed token limit
- No PII in response (regex/pattern matching)
- Classification matches expected categories
- Run on every PR. Should take seconds.
- "You'd be amazed how many production issues are 'the agent returned malformed JSON.'"

**Level 2: Model-Based Evaluation (LLM-as-Judge)**
- Using an LLM or human reviewer to judge subjective quality - helpfulness, correctness, tone, safety.
- Run on a regular cadence (daily/weekly), before releases, after significant changes.
- "Don't use a $0.03 API call to check what a $0.00 string match could verify."

**Level 3: Live Experiments (A/B Testing)**
- Production traffic experiments. Expensive.
- Brief mention only - most readers aren't here yet.
- "A/B testing without Level 1 and 2 is just shipping bugs to 50% of your users."

**Visual**: Simple table or diagram showing the three levels with cost, speed, and signal characteristics.

---

### Section 3: Unit Testing Non-Deterministic Systems (~800 words) ⭐ DEEP TREATMENT

**Core argument**: The trick is testing PROPERTIES of outputs, not exact outputs. This is where most backend engineers feel at home, so give them solid patterns.

**Patterns with code examples (xUnit + C#)**:

1. **Schema Validation**
   - Input → assert output is valid JSON, matches expected schema
   - Code example: xUnit test asserting agent response deserializes to expected type

2. **Tool Call Verification**
   - Assert correct tool was called with correct arguments
   - Code example: Mocking IChatClient, verifying function call name and args
   - This is the one that matters most for agent safety - wrong tool call = real-world consequences

3. **Classification Boundary**
   - Assert output falls within expected categories
   - Assert output does NOT match forbidden categories

4. **Negative Assertions (Safety)**
   - Prompt injection resistance: assert response does NOT contain system prompt
   - Assert no PII leakage
   - Assert agent refuses out-of-scope requests

5. **Semantic Similarity (Lightweight)**
   - When you need "roughly right" without an LLM judge
   - Assert key terms present, response length within bounds

**Dealing with non-determinism**:
- Run critical tests multiple times (3-5x). Flaky = investigate.
- Set temperature to 0 for eval runs where possible.
- Use soft assertions: "contains at least 2 of these 5 key points" instead of exact match.
- The mindset shift: your test answers "is this acceptable?" not "is this exactly right?"

**Code style note**: Use realistic, production-looking C# code. Not toy examples. Show the test setup, the assertion, and explain why it matters.

---

### Section 4: LLM-as-Judge: Using a Model to Evaluate a Model (~700 words) ⭐ DEEP TREATMENT

**Core argument**: When output is open-ended (creative, nuanced, complex reasoning), deterministic assertions aren't enough. You need a judge that understands meaning.

**The setup**:
- Agent produces output → separate "judge" model evaluates against criteria → judge returns score + reasoning
- Diagram or simple flow illustration

**Making it reliable**:
1. **Use a stronger model as judge** - weaker model judging stronger model = unreliable
2. **Explicit rubrics, not vague criteria**
   - Bad: "Is this response good?"
   - Good: Detailed 1-5 scale with specific criteria for each score
   - Code example showing a rubric definition
3. **Ask the judge to reason before scoring** - chain-of-thought grading is significantly more reliable
4. **Validate against human judgment** - grade 50-100 outputs with humans, calculate agreement. If judge disagrees >20%, rubric needs work.

**Tooling - what to use**:
- **Python**: DeepEval's G-Eval (custom criteria evaluation) - show a brief code example
- **.NET**: Microsoft.Extensions.AI.Evaluation.Quality - RelevanceEvaluator, CoherenceEvaluator, GroundednessEvaluator, etc. - show a brief code example
- Both are LLM-as-judge under the hood, both let you define custom criteria

**Callout**: "LLM judges are not perfect. They have biases (verbosity bias, position bias). But they scale in ways human review cannot, and for most teams, an imperfect automated judge running on every PR beats a perfect human review running never."

---

### Section 5: Testing Agent Behavior - Tools, Routing, and Orchestration (~700 words) ⭐ DEEP TREATMENT

**Core argument**: An agent that generates great text but calls the wrong API is worse than one that generates mediocre text but does the right thing. Tool testing is where agent testing diverges most from vanilla LLM testing.

**What to test**:
- **Tool selection accuracy**: Given this input, did the agent pick the right tool?
- **Argument correctness**: Did it pass the right parameters?
- **Trajectory efficiency**: Did it take a reasonable path, or loop and waste tokens?
- **Error recovery**: When a tool fails or returns garbage, does the agent handle it gracefully?
- **Multi-step orchestration**: For agents that chain tools, is the sequence correct?

**Practical approach - the "expected trajectory" pattern**:
- Define expected tool call sequences for common scenarios
- Assert the agent's actual trajectory matches (with some flexibility for ordering where order doesn't matter)
- Code example: testing a tool-use agent's trajectory

**Tooling**:
- **Python**: DeepEval's ToolCorrectnessMetric - evaluates tool selection with configurable strictness. Brief code example.
- **.NET**: Mock-based testing with IChatClient + function calling. Show how to capture and assert tool calls.
- Mention AgentEval NuGet for MAF-specific tool validation.

**Callout/Warning**: "A wrong tool call has real-world consequences. Your agent booking a non-refundable flight instead of checking availability is not a 'quality issue.' It is a bug with a credit card attached."

---

### Section 6: Building a Test Dataset That Doesn't Lie to You (~400 words)

**Compact treatment** - key points, no deep dive.

- Start small and manual: your golden examples from Section 1. Aim for 20-50 hand-crafted cases covering happy paths, edge cases, adversarial inputs, and failure scenarios.
- Grow from production: once live, flag real failures, add to test dataset with expected correct behavior. Virtuous cycle.
- Synthetic generation: use an LLM to generate diverse test queries from your agent's system prompt and tool definitions. Works surprisingly well as a starting point.
- Dataset hygiene: version alongside code, tag with metadata (difficulty, category, source), balance coverage, deduplicate, review periodically.

**One strong opinion**: "Your test dataset is the foundation of your entire evaluation strategy. A bad dataset gives you false confidence or false alarms. Neither is useful."

---

### Section 7: Red Teaming - Finding the Failure Modes You Didn't Imagine (~600 words) ⭐ DEEP TREATMENT

**Core argument**: Your agent will be used by people who do not share your assumptions about how it should be used. Red teaming is how you find out what happens.

**What to probe for**:
- Prompt injection: Can adversarial inputs override instructions?
- Jailbreaking: Can users get the agent to ignore safety guidelines?
- Data extraction: Can users get the agent to reveal training data, system prompts, or other users' data?
- Excessive agency: Does the agent take actions beyond its intended scope?

**Practical approach**:
- Manual red teaming first: have someone on the team spend an afternoon trying to break the agent. Seriously. This is the highest ROI activity in this entire post.
- Automated red teaming with PyRIT:
  - Brief overview: Microsoft's open-source red teaming framework
  - Multi-turn attack strategies: Crescendo, TAP, Skeleton Key
  - CLI scanner: `pyrit_scan` for automated security assessments
  - Brief code/CLI example
  - Targets any endpoint (OpenAI, Azure, custom HTTP)

**Mention OWASP LLM Top 10**: Don't enumerate all 10 - link to it and call out the 3-4 most relevant for agents (prompt injection, insecure output handling, excessive agency, sensitive information disclosure).

**Callout**: "Red teaming is not a one-time activity. Every prompt change, every new tool, every model upgrade can introduce new attack surfaces. Build it into your release process."

---

### Section 8: Putting It in CI/CD (~400 words)

**Compact treatment** - practical advice, not a deep dive.

- **Level 1 tests (assertions)**: Run on every PR. Fast. Gate merges on these.
- **Level 2 tests (LLM-as-judge)**: Run on a schedule (nightly) or before releases. More expensive, slower, but catch quality regressions.
- **Red team scans**: Run weekly or before major releases. Flag regressions in safety posture.
- Response caching for CI: Microsoft.Extensions.AI.Evaluation.Reporting has a response caching feature - cached LLM responses for repeat runs so your CI bill doesn't become your biggest cloud expense. Mention this as a useful pattern regardless of framework.
- The practical challenge: LLM-based tests are slow and non-deterministic. Set reasonable thresholds, expect some flakiness, use retry logic where appropriate.

**One strong opinion**: "If your AI agent doesn't have automated tests in CI, it is not tested. It is vibes-checked. Those are different things."

---

### Section 9: What to Look For in an Evaluation Framework (~300 words)

**Compact treatment** - since we're not doing an exhaustive tooling comparison (it'll go stale), instead describe what capabilities to look for.

**Checklist of capabilities**:
- LLM-as-judge with customizable rubrics
- Tool call / function call evaluation
- Multi-turn conversation support
- Safety and toxicity evaluation
- NLP metrics (BLEU, ROUGE, etc.) for specific use cases
- Integration with your test runner (pytest, xUnit)
- Response caching for CI/CD cost control
- Reporting and trend tracking across runs
- Trace-based evaluation (capture full agent execution, then evaluate)

**Brief "what exists today" mention** (not a comparison table):
- Python: DeepEval, Azure AI Evaluation SDK, Ragas (RAG-focused), Inspect AI (safety-focused)
- .NET: Microsoft.Extensions.AI.Evaluation (Quality, Safety, NLP, Reporting packages), AgentEval (MAF-specific)
- Red teaming: PyRIT (Python, works against any target)

"This space is evolving fast. Whatever I list here may be outdated by the time you read it. Focus on the capabilities checklist above, then pick the tool that fits your stack."

---

### Section 10: Wrapping Up (~300 words)

**Practical summary** — not a rehash, but a "what to do Monday morning" list.

**The priority order**:
1. Define what "good" looks like for your agent. Write it down.
2. Add Level 1 assertions to CI. Schema validation, tool call verification, safety checks. This takes a day.
3. Set up LLM-as-judge for your most critical scenarios. Start with 10-20 test cases.
4. Spend an afternoon red teaming manually. You will find things.
5. Automate red teaming with PyRIT or equivalent.
6. Build the feedback loop: production failures → test cases → eval suite → repeat.

**Closing thought**: Something about how testing AI agents is genuinely harder than testing traditional software, but the principles are the same ones backend engineers already know — define expected behavior, automate verification, make the build fail when things break. The tooling is catching up. The mindset doesn't need to.

**Follow-up invite**: "This post covers the full landscape. If you want a deeper dive on any specific section — unit testing patterns, red teaming playbooks, production eval pipelines — let me know and I'll write it up."

---

## Estimated Word Count

| Section | Words |
|---------|-------|
| Opening | 300 |
| Section 1: Define Success | 400 |
| Section 2: Three Levels | 500 |
| Section 3: Unit Testing | 800 |
| Section 4: LLM-as-Judge | 700 |
| Section 5: Tool Testing | 700 |
| Section 6: Test Dataset | 400 |
| Section 7: Red Teaming | 600 |
| Section 8: CI/CD | 400 |
| Section 9: Framework Checklist | 300 |
| Section 10: Wrap Up | 300 |
| **Total** | **~5,400** |

This is on the longer side of our 4000-5000 target, but the code examples will take up visual space without feeling dense. Can trim Sections 6 and 8 if needed.

---

## Resolved Questions

1. **Red teaming categories tested**: Harmful content, UPIA (User Prompt Injection Attack), XPIA (Cross-domain Prompt Injection Attack), Ungrounded content, Copyright (system generates content). All covered before shipping.
2. **Custom evaluators**: Mitesh to share a real custom evaluation prompt. Pattern: judge evaluates aspects of output, assigns scores with weighted importance (some things matter more, some blunders are worse). Will show a representative version in the post.
3. **Production eval → alerting**: Push eval scores as metrics, set thresholds, alert when quality drops. Use traces to debug further when alerts fire. If users opt in, can inspect their data to diagnose issues.
4. **CI catch story**: No dramatic catch — scores have been stable because prompts haven't been revised yet. Spin this positively: "The boring outcome is the successful one. Evals keeping things stable is the point."

## Still Needed

- [ ] ~~Custom evaluation prompt from Mitesh~~ **DONE** — Read from source. Will derive patterns, NOT include verbatim.

## Custom Evaluator Patterns (extracted from real production evaluators)

**Key patterns to showcase in the blog (genericized, no confidential content):**

1. **Weighted evaluation criteria**: Each aspect gets a percentage weight (e.g., Completeness 25%, Correctness 25%, Consistency 25%, Actionability 15%, Metadata Quality 10%). Some things matter more than others.

2. **Explicit 1-5 scoring rubric**: Each score level has a specific description. 5 = "Comprehensive, correct, actionable. An engineer could directly use this." 1 = "Mostly incorrect or unusable."

3. **Hard-fail caps**: If the output has a fundamental violation (e.g., invalid JSON, hallucinated references, a critical logical error), the score is CAPPED at a maximum regardless of other criteria. Prevents "scored 4.2 but fundamentally broken" situations. This is the killer pattern most teams miss.

4. **Feature-specific evaluators**: One evaluator per output component (correlations, parameters, naming) + one overall quality evaluator. All run on every invocation. This gives granular signal — you know WHICH aspect degraded.

5. **Reference-based in CI, reference-free in production**: CI evals run against a golden dataset (can compare to known-good outputs). Production evals are fully reference-free (obviously no golden answer for real user data). Different eval modes for different contexts.

6. **Discrimination testing**: Evaluating not just "did it find the right things" but "did it correctly NOT flag the wrong things." Over-detection is as much a bug as under-detection.

7. **Domain context in the prompt**: The evaluator prompt explains WHAT the output represents and WHY it matters, so the judge model has enough context to evaluate intelligently.

**Blog approach**: Show a generic custom evaluator (different domain — e.g., a customer support agent) using the same structural patterns. Weighted criteria, scoring rubric, hard-fail caps, feature-specific + overall.
