# 🧠 MeshMind - Multi-Model Research Orchestrator

<div align="center">

**One Question. Many Minds. Collective Intelligence.**

A powerful multi-model AI research platform that queries multiple LLMs in **true parallel execution** and synthesizes their reasoning into one collective consensus. Experience up to 4x faster responses with concurrent agent processing!

[![TanStack](https://img.shields.io/badge/TanStack-Start-blue)](https://tanstack.com/start)
[![Convex](https://img.shields.io/badge/Convex-Backend-purple)](https://convex.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)

</div>

---

## 🌟 What is MeshMind?

MeshMind is a cutting-edge AI orchestration platform that eliminates single-model bias by querying multiple large language models simultaneously. Instead of relying on one AI's perspective, MeshMind creates a "mesh" of AI agents working together to provide more balanced, comprehensive, and nuanced responses.

### ✨ Key Features

- **🔀 Multi-Model Orchestration**: Run up to 4 AI agents in **true parallel execution**, each with different models
- **⚡ Ultra-Fast Parallel Processing**: All agents execute concurrently - get responses up to 4x faster than sequential processing
- **🤖 Provider Support**: Integrate with OpenRouter and Vercel AI Gateway for access to dozens of models
- **⚡ Real-Time Streaming**: See responses from each agent as they arrive with beautiful segmented UI
- **🎯 Custom System Prompts**: Configure each agent with unique instructions and perspectives
- **🔐 Secure Authentication**: OAuth support (Google, GitHub) and traditional email/password
- **💾 Persistent Conversations**: All chats saved with full history and agent configurations
- **🎨 Beautiful UI**: Modern, responsive interface built with Tailwind CSS and Radix UI
- **🌙 Dark Mode**: Seamless theme switching for comfortable viewing

---

## 🏗️ Tech Stack

**Frontend:**
- [TanStack Start](https://tanstack.com/start) - Full-stack React framework
- [TanStack Router](https://tanstack.com/router) - Type-safe routing
- [TanStack Query](https://tanstack.com/query) - Async state management
- [Tailwind CSS](https://tailwindcss.com) - Utility-first styling
- [Radix UI](https://www.radix-ui.com/) - Accessible components
- [Zustand](https://zustand-demo.pmnd.rs/) - State management

**Backend:**
- [Convex](https://convex.dev) - Real-time backend with RPC actions
- [Node.js](https://nodejs.org/) - Server runtime
- JWT + Argon2 - Secure authentication

**AI Integration:**
- [OpenRouter API](https://openrouter.ai/) - Access to GPT, Claude, Gemini, and more
- [Vercel AI Gateway](https://vercel.com/docs/ai) - Unified AI model interface
- Custom streaming protocol for multi-agent responses

---

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/meshmind.git
cd meshmind

# Install dependencies
npm install

# Set up environment variables (see .env.example)
cp .env.example .env.local

# Initialize Convex
npx convex dev

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see MeshMind in action!

### 🔬 Technical Implementation

**Parallel Execution Engine:**
```typescript
// All agents execute concurrently using Promise.allSettled()
const agentPromises = agents.map(async (agent) => {
  // Each agent processes independently
  const response = await callAIProvider(agent);
  return { agent, response };
});

// Wait for all agents in parallel (not sequential!)
const results = await Promise.allSettled(agentPromises);

// Stream results in order as UI receives them
```

**Performance Optimizations:**
- Single chat history fetch shared across all agents
- Concurrent web scraping for firecrawl-enabled agents
- Non-blocking error handling per agent
- Streaming results maintain UI responsiveness
- Console logging tracks individual agent timing

---

## 💡 How It Works

1. **Configure Your Agents**: Set up 1-4 AI agents with different models and personalities
2. **Ask Your Question**: Type your query once
3. **Get Multiple Perspectives**: Each agent processes your question simultaneously
4. **Compare & Analyze**: View all responses side-by-side in beautifully segmented cards
5. **Make Informed Decisions**: Synthesize insights from multiple AI perspectives

### Multi-Agent Parallel Architecture

```bash
User Question
     ↓
┌────┴────┐
│  Mesh   │
│ Router  │
└────┬────┘
     ↓
     ├─────────┬─────────┬─────────┐
     │         │         │         │
     ↓         ↓         ↓         ↓
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│ Agent 1 │ │ Agent 2 │ │ Agent 3 │ │ Agent 4 │
│ (GPT-4) │ │(Claude) │ │(Gemini) │ │ (Llama) │
└────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘
     │           │           │           │
     └───────────┴───────────┴───────────┘
              ↓
     ⚡ PARALLEL EXECUTION ⚡
     All agents run concurrently!
              ↓
     Real-time Streaming to UI
     (Results appear as agents complete)
```

### 🚀 Parallel Execution Performance

MeshMind uses **true concurrent processing** for all AI agents:

- **Sequential Processing** (old): Agent 1 → Wait → Agent 2 → Wait → Agent 3 → Wait → Agent 4
  - Total Time: ~40 seconds (4 agents × 10s each)
  
- **Parallel Processing** (MeshMind): Agent 1 + Agent 2 + Agent 3 + Agent 4 (all at once!)
  - Total Time: ~10 seconds (limited only by the slowest agent)
  - **4x faster** for 4 agents! ⚡

**Key Benefits:**
- All agents start processing **simultaneously**
- Results stream as they complete (fastest agent displays first)
- No waiting for previous agents to finish
- Robust error handling - one failing agent doesn't block others
- Optimized with shared context loading and `Promise.allSettled()`

---

---

## 🎯 Use Cases

- **Research**: Get diverse perspectives on complex topics in seconds, not minutes
- **Code Review**: Multiple AI models review your code simultaneously - 4x faster feedback
- **Writing**: Compare creative outputs from different models instantly
- **Decision Making**: Evaluate options from various AI viewpoints with parallel analysis
- **Learning**: See how different models approach the same problem in real-time
- **Rapid Prototyping**: Get multiple implementation strategies simultaneously

---

## 🔐 Security

- Encrypted API key storage
- JWT-based authentication
- Argon2 password hashing
- Server-side token verification
- OAuth integration (Google, GitHub)

---

## 📦 Project Structure

```bash
meshmind/
├── convex/           # Backend logic (Convex)
├── src/
│   ├── components/   # React components
│   ├── routes/       # TanStack Router pages
│   ├── zustand/      # State stores
│   └── lib/          # Utilities & helpers
├── .env.example      # Environment template
└── package.json
```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/Srijan-Baniyal).

---

## 📄 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

Built with ❤️ using:
- [TanStack](https://tanstack.com/) ecosystem
- [Convex](https://convex.dev) real-time backend
- [OpenRouter](https://openrouter.ai/) & [Vercel AI](https://vercel.com/docs/ai) for model access

---

<div align="center">

**Made for the TanStack Hackathon**

⭐ Star this repo if you find it useful!
