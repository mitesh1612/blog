# AI Agent Testing Tools & Frameworks — May 2026

Research compiled May 9, 2026. Sources: official docs, GitHub repos, PyPI, NuGet.

---

## 1. Microsoft Agent Framework (MAF)

**What it is:** The enterprise-ready successor to Semantic Kernel. Semantic Kernel has been rebranded/evolved into Microsoft Agent Framework (MAF), now at **v1.0 (production-ready)**. Supports .NET 10+, Python 3.10+, and Java 17+.

**Key facts:**
- **Package (NuGet):** `Microsoft.SemanticKernel`, `Microsoft.SemanticKernel.Agents.Core`, `Microsoft.Agents.AI.Foundry`
- **Package (PyPI):** `semantic-kernel` (still the pip name), `agent-framework`
- **Migration guide:** Available at `learn.microsoft.com/en-us/agent-framework/migration-guide/from-semantic-kernel`
- Semantic Kernel namespace/SDK still works but points to MAF

**Capabilities:**
- Multi-agent orchestration with graph-based workflows
- Multi-provider model support (OpenAI, Azure OpenAI, Anthropic, Ollama, GitHub Copilot, Copilot Studio)
- A2A (Agent-to-Agent) and MCP (Model Context Protocol) interoperability
- Tool types: Function Tools, Code Interpreter, File Search, Web Search, Hosted & Local MCP Tools, Foundry Toolboxes
- Tool Approval (human-in-the-loop) for Responses and Foundry providers
- Workflows: graph-based, type-safe routing, checkpointing, human-in-the-loop
- Agent sessions for state management, context providers for memory, middleware for intercepting actions

**Testing capabilities:**
- No dedicated built-in test framework — testing is done via standard unit test patterns
- The middleware/interceptor pattern allows mocking agent actions
- Function tools can be unit tested independently
- Tool Approval mechanism enables deterministic testing of tool call flows
- Integration with Azure AI Foundry evaluators for quality/safety evals (see section 2)

**Code pattern (.NET):**
```csharp
using Microsoft.Agents.AI;
using Azure.AI.Projects;
using Azure.Identity;

AIAgent agent = new AIProjectClient(
        new Uri("https://your-foundry-service.services.ai.azure.com/api/projects/your-project"),
        new AzureCliCredential())
    .AsAIAgent(
        model: "gpt-5.4-mini",
        instructions: "You are a friendly assistant.");

Console.WriteLine(await agent.RunAsync("What is the largest city in France?"));
```

**Code pattern (Python):**
```python
from agent_framework.foundry import FoundryChatClient
from azure.identity import AzureCliCredential

client = FoundryChatClient(
    project_endpoint="https://your-foundry.services.ai.azure.com/...",
    credential=AzureCliCredential(),
)
agent = client.create_agent(model="gpt-5.4-mini", instructions="You are a friendly assistant.")
response = await agent.run("What is the largest city in France?")
```

**Agent-specific testing:** Supports tool calls and multi-turn via agent sessions. No built-in test harness — relies on Azure AI Evaluation SDK or third-party frameworks.

---

## 2. Azure AI Foundry Evaluators (`azure-ai-evaluation`)

**What it is:** Python SDK for evaluating AI/LLM outputs. Package: `azure-ai-evaluation` on PyPI. Part of the Azure AI Foundry platform. **Python-first** — no .NET equivalent package exists (the NuGet `Azure.AI.Evaluation` returns 404).

**Key classes/evaluators (as of late April 2026):**

| Category | Evaluators |
|----------|-----------|
| **Quality** | `BleuScoreEvaluator`, `GleuScoreEvaluator`, `MeteorScoreEvaluator`, `RougeScoreEvaluator`, `CoherenceEvaluator`, `FluencyEvaluator`, `RelevanceEvaluator`, `SimilarityEvaluator`, `GroundednessEvaluator`, `RetrievalEvaluator`, `ResponseCompletenessEvaluator` |
| **Safety** | `ContentSafetyEvaluator`, `CodeVulnerabilityEvaluator`, `HateUnfairnessEvaluator`, `SelfHarmEvaluator`, `SexualEvaluator`, `ViolenceEvaluator`, `ProtectedMaterialEvaluator`, `IndirectAttackEvaluator`, `UngroundedAttributesEvaluator` |
| **OpenAI Graders** | `AzureOpenAILabelGrader`, `AzureOpenAIScoreModelGrader`, `AzureOpenAIPythonGrader`, `AzureOpenAIStringCheckGrader`, `AzureOpenAITextSimilarityGrader` (all experimental) |
| **Red Teaming** | `azure.ai.evaluation.red_team` subpackage |
| **Simulation** | `azure.ai.evaluation.simulator` subpackage |

**Key capabilities:**
- LLM-as-judge evaluators (coherence, fluency, relevance, groundedness)
- NLP-based metrics (BLEU, GLEU, METEOR, ROUGE)
- Safety/content evaluators backed by Azure AI Content Safety
- Red team automation (built-in red teaming subpackage)
- Conversation/multi-turn simulation
- Custom graders via OpenAI API (label, score, Python code, string check, text similarity)
- `evaluate()` function for batch evaluation

**Code pattern (Python):**
```python
from azure.ai.evaluation import CoherenceEvaluator, evaluate

coherence = CoherenceEvaluator(model_config={
    "azure_deployment": "gpt-4o",
    "azure_endpoint": "https://your-endpoint.openai.azure.com/"
})

# Single evaluation
result = coherence(query="What is AI?", response="AI is artificial intelligence.")

# Batch evaluation
results = evaluate(
    data="test_data.jsonl",
    evaluators={"coherence": coherence},
)
```

**Agent-specific testing:** The simulator subpackage can simulate multi-turn conversations. Red team subpackage can probe agent vulnerabilities. OpenAI graders allow custom eval logic. No specific "tool call correctness" evaluator — that's a gap compared to DeepEval.

**.NET support:** ❌ No .NET SDK for Azure AI Evaluation exists as of May 2026. .NET users must use the Python SDK or REST APIs.

---

## 3. PyRIT (Python Risk Identification Tool)

**What it is:** Microsoft's open-source red teaming framework for generative AI. Originally at `github.com/Azure/PyRIT`, now **moved to `github.com/microsoft/PyRIT`**.

**Current state (May 2026):**
- Actively maintained under Microsoft org
- Website/docs: `microsoft.github.io/PyRIT/`
- Install via PyPI: `pip install pyrit` or Docker

**Key capabilities:**
- 🎯 **Automated Red Teaming** — multi-turn attack strategies: Crescendo, TAP, Skeleton Key. Single-turn and multi-turn attacks out of the box
- 📦 **Scenario Framework** — standardized evaluation scenarios at scale covering content harms, psychosocial risks, data leakage
- 🖥️ **CoPyRIT** — GUI for human-led red teaming (web UI)
- 🔌 **Any Target** — OpenAI, Azure, Anthropic, Google, HuggingFace, custom HTTP/WebSocket endpoints, Playwright-based web app targets
- 💾 **Built-in Memory** — SQLite or Azure SQL for tracking conversations, scores, attack results
- 📊 **Flexible Scoring** — true/false, Likert scale, classification, custom scorers (LLM-powered, Azure AI Content Safety, or custom)
- **`pyrit_scan`** — CLI scanner for automated security assessments
- **`pyrit_shell`** — interactive shell

**Code pattern:**
```python
# PyRIT uses config-file-driven approach
# ~/.pyrit/.pyrit_conf + .env for credentials

# CLI usage:
# pyrit_scan --target azure_openai --scenario content_harms
# pyrit_shell  (interactive)

# Programmatic:
from pyrit.orchestrator import CrescendoOrchestrator
from pyrit.prompt_target import AzureOpenAITarget

target = AzureOpenAITarget()
orchestrator = CrescendoOrchestrator(target=target)
results = await orchestrator.run(objective="Extract training data")
```

**Agent-specific testing:** Yes — can target agents via HTTP endpoints or Playwright (web UI agents). Multi-turn attack strategies are inherently agent-aware. Memory tracking captures full conversation flows.

---

## 4. DeepEval

**What it is:** Open-source LLM evaluation framework by Confident AI. "Pytest for LLM apps." Python-only.

**Current state:** Actively developed, latest releases on GitHub. Integrates with Confident AI cloud platform for reporting.

**Key capabilities & metrics:**

| Category | Metrics |
|----------|---------|
| **Custom/All-Purpose** | G-Eval (custom criteria), DAG (directed acyclic graph eval) |
| **Agent-Specific** | `ToolCorrectnessMetric`, `TaskCompletionMetric` |
| **RAG** | Answer Relevancy, Faithfulness, Contextual Recall/Precision/Relevancy |
| **Conversational** | Knowledge Retention, Conversation Completeness |
| **Safety** | Toxicity, Bias, Hallucination |
| **NLP** | BLEU, ROUGE, etc. |

**Agent-specific testing (the killer feature):**

### ToolCorrectnessMetric
Evaluates whether an agent called the right tools with correct parameters:
```python
from deepeval.test_case import LLMTestCase, ToolCall
from deepeval.metrics import ToolCorrectnessMetric

test_case = LLMTestCase(
    input="What if these shoes don't fit?",
    actual_output="We offer a 30-day full refund.",
    tools_called=[ToolCall(name="WebSearch"), ToolCall(name="ToolQuery")],
    expected_tools=[ToolCall(name="WebSearch")],
)
metric = ToolCorrectnessMetric()
metric.measure(test_case)
print(metric.score, metric.reason)
```

Options:
- `evaluation_params`: control strictness — match tool name only, or also require input parameters and/or output match
- `available_tools`: provide full tool list to evaluate selection capability
- `strict_mode`: binary pass/fail

### TaskCompletionMetric
Evaluates whether an agent completed its assigned task by analyzing the full execution trace:
```python
from deepeval.tracing import observe
from deepeval.metrics import TaskCompletionMetric

@observe()
def trip_planner_agent(input):
    @observe()
    def restaurant_finder(city):
        return ["Le Jules Verne", "Angelina Paris"]
    
    @observe()
    def itinerary_generator(destination, days):
        return ["Eiffel Tower", "Louvre Museum"][:days]
    
    itinerary = itinerary_generator("Paris", 2)
    restaurants = restaurant_finder("Paris")
    return itinerary + restaurants

task_completion = TaskCompletionMetric(threshold=0.7, model="gpt-4o")
```

**Multi-turn support:** Yes, via `ConversationalTestCase` and conversational metrics.

**Tracing:** Built-in `@observe()` decorator for capturing agent execution traces.

**Integration:** Works as pytest plugin (`deepeval test run`), integrates with LangChain, OpenAI, etc.

---

## 5. .NET Libraries for AI Agent Testing

### Microsoft.Extensions.AI
- **What it is:** The foundational .NET abstraction layer for AI services. Provides `IChatClient`, `IEmbeddingGenerator`, etc.
- **Testing patterns:** Standard .NET dependency injection + mocking
  - Mock `IChatClient` with `Moq` or `NSubstitute` for unit tests
  - Use middleware pattern to intercept and verify AI calls
  - No dedicated test utilities package

```csharp
// Mocking pattern for testing agents built with Microsoft.Extensions.AI
var mockClient = new Mock<IChatClient>();
mockClient.Setup(c => c.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), null, default))
    .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant, "mocked response")));

var agent = new MyAgent(mockClient.Object);
var result = await agent.ProcessAsync("test input");
Assert.Equal("expected", result);
```

### No dedicated .NET AI testing framework exists
As of May 2026, there is **no .NET equivalent of DeepEval**. Options for .NET developers:
1. Use Azure AI Evaluation SDK via Python interop or REST
2. Build custom evaluators using `Microsoft.Extensions.AI` abstractions
3. Use standard unit testing (xUnit/NUnit) with mocked AI clients
4. Call DeepEval/Python evals from CI/CD pipelines alongside .NET tests

---

## 6. Other Python Frameworks for Agent Evaluation/Testing

### Existing & Notable

| Framework | What It Does | Agent Testing? |
|-----------|-------------|----------------|
| **LangSmith** (LangChain) | Tracing, evaluation, dataset management for LangChain apps | Yes — traces agent runs, evaluates tool usage, supports custom evaluators |
| **Ragas** | RAG-focused evaluation (context precision, faithfulness, etc.) | Partial — RAG pipeline eval, not full agent eval |
| **AgentOps** | Agent observability and eval platform | Yes — tracks agent sessions, tool calls, costs |
| **Braintrust** | Eval, logging, prompt management | Yes — supports function call evaluation |
| **Inspect AI** (UK AISI) | AI safety evaluation framework | Yes — multi-turn agent evals with sandboxed tool use |
| **HELM** (Stanford) | Holistic evaluation of language models | No — model-level, not agent-level |

### Key Emerging Patterns (2025-2026)
1. **Trace-based evaluation** — capture full agent execution traces, then evaluate (DeepEval, LangSmith)
2. **Tool call correctness** — verify agents select and invoke the right tools (DeepEval's killer feature)
3. **Task completion scoring** — end-to-end "did the agent do the job" metrics
4. **Red teaming as testing** — PyRIT and Azure AI Evaluation's red_team module treating security probing as a test suite
5. **Simulation-driven testing** — generating synthetic multi-turn conversations to stress-test agents

---

## Summary Comparison

| Feature | MAF | Azure AI Eval | PyRIT | DeepEval |
|---------|-----|--------------|-------|----------|
| **Language** | .NET, Python, Java | Python only | Python only | Python only |
| **Primary purpose** | Build agents | Evaluate quality/safety | Red team/security | Eval framework |
| **Tool call testing** | Manual/mock | ❌ | Via attack scenarios | ✅ ToolCorrectnessMetric |
| **Multi-turn** | ✅ Agent sessions | ✅ Simulator | ✅ Multi-turn attacks | ✅ ConversationalTestCase |
| **Task completion** | ❌ | ❌ | ❌ | ✅ TaskCompletionMetric |
| **Safety/red team** | ❌ | ✅ Built-in | ✅ Primary purpose | ✅ Toxicity/Bias |
| **CI/CD integration** | Standard .NET/Python | Python scripts | CLI (`pyrit_scan`) | Pytest plugin |
| **LLM-as-judge** | ❌ | ✅ | ✅ Scoring | ✅ G-Eval |
| **GUI** | ❌ | Azure AI Foundry portal | ✅ CoPyRIT | ✅ Confident AI platform |
| **Cost** | Free/OSS | Azure consumption | Free/OSS | Free/OSS + paid platform |

---

## Recommendations

1. **For .NET agent testing:** Use MAF + standard unit tests with mocked `IChatClient`. For quality evals, call Azure AI Evaluation SDK from Python in CI/CD. There's a real gap here — no native .NET eval framework.

2. **For Python agent testing:** DeepEval is the strongest choice for agent-specific evaluation (tool correctness, task completion, tracing). Pair with PyRIT for security testing.

3. **For safety/red teaming:** PyRIT is the gold standard. Azure AI Evaluation's `red_team` subpackage is a lighter alternative if you're already in the Azure ecosystem.

4. **For RAG evaluation:** Ragas or DeepEval both work well. Azure AI Evaluation has groundedness/retrieval evaluators too.

5. **Biggest gap:** .NET has no first-class agent evaluation library. This is a real opportunity for the ecosystem.
