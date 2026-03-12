# SARGAM

**AI-Powered Multilingual Voice Calling Agent Platform for India**

> Real-time voice conversations powered by a cascading STT → LLM → TTS pipeline, supporting 11 Indian languages — built entirely on free-tier services.

**Live Demo:** [https://sargam-voice-bot.vercel.app](https://sargam-voice-bot.vercel.app)

---

## What is Sargam?

Sargam is an AI voice agent platform designed for the Indian market. It enables real-time, multilingual voice conversations between users and AI agents across multiple use cases — from marketing calls to grievance redressal. The platform uses browser-native speech APIs combined with a powerful LLM backbone to deliver a seamless voice experience with zero paid dependencies.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Browser STT   │────▶│   Groq LLM      │────▶│   Browser TTS   │
│  (Web Speech    │     │  (Llama 3.3     │     │  (Speech        │
│   API)          │     │   70B)          │     │   Synthesis)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        ▲                       │                       │
        │               ┌──────┴──────┐                 │
        │               │  Tool Calls │                 ▼
        │               │  & Info     │           Audio Output
   Microphone           │  Extraction │           to Speaker
    Input               └─────────────┘
        ▲
  ┌─────┴──────┐
  │  VAD       │   Voice Activity Detection
  │  (ONNX)   │   filters silence & noise
  └────────────┘
```

The pipeline orchestrator manages the full lifecycle: VAD detects speech → STT transcribes → LLM generates a contextual response → TTS speaks the reply. All processing happens in real-time with automatic turn-taking.

## Tech Stack

| Layer | Technology | Cost |
|-------|-----------|------|
| **Framework** | Next.js 16 (App Router, React 19) | Free |
| **Styling** | Tailwind CSS v4 | Free |
| **LLM** | Groq API — Llama 3.3 70B | Free tier |
| **STT** | Browser Web Speech API | Free (native) |
| **TTS** | Browser Speech Synthesis API | Free (native) |
| **VAD** | @ricky0123/vad-web + onnxruntime-web | Free |
| **Database** | Convex (real-time) | Free tier |
| **Hosting** | Vercel | Free tier |

**Total cost: $0**

## Features

- **Real-time voice conversations** — Full-duplex voice pipeline with automatic turn detection
- **11 Indian languages** — Hindi, Bengali, Telugu, Marathi, Tamil, Gujarati, Kannada, Malayalam, Odia, Punjabi, and English
- **6 agent modes** — Marketing, Inbound Helpline, Outbound Survey, Grievance Redressal, Appointment Booking, Outbound Outreach
- **Voice Activity Detection** — ONNX-powered VAD filters background noise for clean speech capture
- **Live transcript** — Real-time conversation transcript with interim speech display
- **Live info sheet** — Extracted data fields, notes, and tickets from conversations
- **Call history** — Session-based call logs with full transcripts
- **Post-call summary** — Duration, turn count, and sentiment analysis after each call
- **Mute controls** — Independent mic mute and TTS mute
- **Dashboard & Campaigns** — Call analytics and campaign management views
- **Brutalist UI** — Distinctive black-and-white military-aesthetic design system

## Supported Languages

| Language | Code | Native Name |
|----------|------|-------------|
| Hindi | hi-IN | हिन्दी |
| Bengali | bn-IN | বাংলা |
| Telugu | te-IN | తెలుగు |
| Marathi | mr-IN | मराठी |
| Tamil | ta-IN | தமிழ் |
| Gujarati | gu-IN | ગુજરાતી |
| Kannada | kn-IN | ಕನ್ನಡ |
| Malayalam | ml-IN | മലയാളം |
| Odia | or-IN | ଓଡ଼ିଆ |
| Punjabi | pa-IN | ਪੰਜਾਬੀ |
| English | en-IN | English |

## Agent Modes

| Mode | Description |
|------|-------------|
| **Sargam Marketing** | Default mode — introduces Sargam's AI voice platform to potential customers |
| **Inbound Helpline** | Handles incoming support calls with empathy and resolution |
| **Outbound Survey** | Conducts structured surveys and collects responses |
| **Grievance Redressal** | Logs complaints, creates tickets, and escalates when needed |
| **Appointment Booking** | Schedules appointments with date/time negotiation |
| **Outbound Outreach** | General outbound engagement and follow-ups |

## Local Development

### Prerequisites

- Node.js 18+
- npm or pnpm
- A Groq API key ([get one free](https://console.groq.com))
- A Convex deployment ([create one free](https://www.convex.dev))

### Setup

```bash
# Clone the repository
git clone <repo-url>
cd sargam-frontend

# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local
# Edit .env.local and add your keys:
#   GROQ_API_KEY=gsk_...
#   NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# Start Convex (in a separate terminal)
npx convex dev

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in Chrome for the best experience.

### Build

```bash
npm run build
```

## Project Structure

```
sargam-frontend/
├── app/
│   ├── layout.tsx                 # Root layout (fonts, global styles)
│   ├── page.tsx                   # Landing page
│   ├── globals.css                # Brutalist design system
│   ├── api/chat/route.ts          # Groq API proxy (server-side)
│   └── (app)/
│       ├── layout.tsx             # App shell (Convex + Store + Sidebar)
│       ├── call/page.tsx          # Voice call interface
│       ├── dashboard/page.tsx     # Analytics dashboard
│       └── campaigns/page.tsx     # Campaign management
├── components/
│   ├── Sidebar.tsx                # Navigation
│   ├── LiveInfoSheet.tsx          # Real-time data extraction display
│   └── ConvexClientProvider.tsx   # Convex wrapper
├── lib/
│   ├── store.tsx                  # Convex-backed state management
│   ├── prompts.ts                 # Agent system prompts & tool definitions
│   └── pipeline/
│       ├── orchestrator.ts        # Pipeline lifecycle & turn management
│       ├── stt.ts                 # Speech-to-text engine
│       ├── llm.ts                 # LLM engine (Groq)
│       ├── tts.ts                 # Text-to-speech engine
│       └── vad.ts                 # Voice activity detection
├── types/
│   └── index.ts                   # TypeScript types & constants
└── convex/
    ├── schema.ts                  # Database schema
    ├── calls.ts                   # Call CRUD operations
    ├── campaigns.ts               # Campaign operations
    ├── grievances.ts              # Grievance/ticket operations
    └── stats.ts                   # Analytics queries
```

## Browser Compatibility

- **Chrome (Recommended)** — Full support for Web Speech API STT + TTS
- **Edge** — Good support via Chromium engine
- **Firefox** — Limited STT support
- **Safari** — Partial support; some TTS voices may differ

A microphone is required for voice calls.

---

Built for India. Powered by open-source AI.
