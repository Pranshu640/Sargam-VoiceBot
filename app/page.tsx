import Link from "next/link";
import {
  PhoneIncoming,
  PhoneOutgoing,
  Globe,
  Brain,
  ArrowUpRight,
  BarChart3,
  Mic,
  FileText,
  Volume2,
  ChevronRight,
  Zap,
  Shield,
  Clock,
  Users,
  MessageSquare,
  Phone,
} from "lucide-react";

const features = [
  {
    icon: PhoneIncoming,
    title: "Inbound Call Handling",
    description:
      "Auto-attendant with natural language intent recognition. No more 'Press 1' menus.",
  },
  {
    icon: PhoneOutgoing,
    title: "Outbound Campaigns",
    description:
      "Batch dialing for surveys, reminders, and outreach with adaptive conversation flows.",
  },
  {
    icon: Globe,
    title: "11 Indian Languages",
    description:
      "Hindi, Tamil, Telugu, Bengali, Kannada, Malayalam, Marathi, Gujarati, Punjabi, Odia + English.",
  },
  {
    icon: Brain,
    title: "Contextual Memory",
    description:
      "Three-layer memory system: working memory, cross-call memory, and knowledge base RAG.",
  },
  {
    icon: ArrowUpRight,
    title: "Smart Escalation",
    description:
      "Auto-detects frustration, loops, and sensitive topics. Warm transfer with full context.",
  },
  {
    icon: BarChart3,
    title: "Real-time Analytics",
    description:
      "Live dashboard with sentiment tracking, call metrics, and AI-powered insights.",
  },
];

const pipelineSteps = [
  {
    icon: Mic,
    title: "Voice Input",
    description: "Caller speaks naturally in any supported language",
  },
  {
    icon: FileText,
    title: "Speech-to-Text",
    description: "Real-time transcription with accent & code-mixing support",
  },
  {
    icon: Brain,
    title: "AI Reasoning",
    description:
      "LLM processes intent, retrieves knowledge, generates response",
  },
  {
    icon: Volume2,
    title: "Text-to-Speech",
    description: "Natural voice synthesis in matching language and tone",
  },
];

const useCases = [
  {
    title: "Public Service Centers",
    description: "Government helplines, scheme information, citizen services",
    icon: Shield,
  },
  {
    title: "Customer Support",
    description: "24/7 automated support with human escalation",
    icon: MessageSquare,
  },
  {
    title: "Survey Execution",
    description: "Large-scale surveys with adaptive branching",
    icon: BarChart3,
  },
  {
    title: "Grievance Redressal",
    description: "Complaint registration, tracking, and resolution",
    icon: Users,
  },
  {
    title: "Outreach Campaigns",
    description:
      "Health awareness, payment reminders, scheme notifications",
    icon: Phone,
  },
];

const stats = [
  { value: "11+", label: "Languages" },
  { value: "< 1s", label: "Response" },
  { value: "100+", label: "Concurrent Calls" },
  { value: "24/7", label: "Available" },
];

const architectureLayers = [
  {
    title: "Telephony",
    subtitle: "Twilio / WebRTC",
    color: "border-indigo-500/50 bg-indigo-500/10",
  },
  {
    title: "Orchestration",
    subtitle: "Pipeline Engine",
    color: "border-violet-500/50 bg-violet-500/10",
  },
  {
    title: "AI Stack",
    subtitle: "STT + LLM + TTS",
    color: "border-amber-400/50 bg-amber-400/10",
  },
  {
    title: "Data",
    subtitle: "Analytics + Storage",
    color: "border-emerald-500/50 bg-emerald-500/10",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-white antialiased">
      {/* ───────────────────────── Navbar ───────────────────────── */}
      <nav className="fixed top-0 z-50 w-full border-b border-slate-800/60 bg-slate-950/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-2xl font-bold">
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              Sargam
            </span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <a
              href="#features"
              className="text-sm text-slate-300 transition-colors hover:text-white"
            >
              Features
            </a>
            <a
              href="#architecture"
              className="text-sm text-slate-300 transition-colors hover:text-white"
            >
              Architecture
            </a>
            <a
              href="#use-cases"
              className="text-sm text-slate-300 transition-colors hover:text-white"
            >
              Use Cases
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="hidden rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:border-slate-500 hover:text-white sm:inline-flex"
            >
              Dashboard
            </Link>
            <Link
              href="/call"
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
            >
              Try Live Demo
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ───────────────────────── Hero ───────────────────────── */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-16">
        {/* Animated gradient background */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-40 -top-40 h-[600px] w-[600px] animate-pulse rounded-full bg-indigo-600/20 blur-3xl" />
          <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] animate-pulse rounded-full bg-violet-600/20 blur-3xl [animation-delay:2s]" />
          <div className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-amber-500/10 blur-3xl [animation-delay:4s]" />
        </div>

        <div className="relative z-10 mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-sm text-indigo-300">
            <Zap className="h-4 w-4" />
            AI-Powered Multilingual Voice Platform
          </div>

          <h1 className="mx-auto max-w-4xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            AI Voice Agents That Speak{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-amber-400 bg-clip-text text-transparent">
              Every Indian Language
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-400 sm:text-xl">
            Automate millions of calls with human-like AI that understands
            Hindi, Tamil, Telugu and 8 more languages. Built for public
            services, customer support, and outreach campaigns.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/call"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-500 hover:shadow-indigo-500/40"
            >
              Start Live Demo
              <ChevronRight className="h-5 w-5" />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-8 py-3.5 text-base font-semibold text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
            >
              View Dashboard
            </Link>
          </div>

          {/* Stats row */}
          <div className="mt-20 grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-8">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-5 backdrop-blur-sm"
              >
                <p className="text-2xl font-bold text-white sm:text-3xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm text-slate-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────── Features ───────────────────────── */}
      <section id="features" className="relative py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-indigo-400">
              Capabilities
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need for AI voice automation
            </h2>
            <p className="mt-4 text-lg text-slate-400">
              From inbound call handling to outbound campaigns, Sargam covers
              the full spectrum of voice communication.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="group rounded-xl border border-slate-800 bg-slate-900/50 p-6 transition-all hover:border-slate-700 hover:bg-slate-900"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-500/10">
                    <Icon className="h-6 w-6 text-indigo-400" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───────────────────── How It Works / Pipeline ───────────────────── */}
      <section className="bg-slate-900 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-amber-400">
              How It Works
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Cascading STT → LLM → TTS Pipeline
            </h2>
            <p className="mt-4 text-lg text-slate-400">
              Every call flows through a real-time AI pipeline designed for low
              latency and natural conversation.
            </p>
          </div>

          {/* Pipeline diagram */}
          <div className="mt-16 flex flex-col items-center gap-4 lg:flex-row lg:justify-center lg:gap-0">
            {pipelineSteps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="flex items-center">
                  <div className="flex w-56 flex-col items-center rounded-xl border border-slate-700 bg-slate-800/80 p-6 text-center backdrop-blur-sm">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500/15 ring-1 ring-indigo-500/30">
                      <Icon className="h-7 w-7 text-indigo-400" />
                    </div>
                    <h3 className="mt-4 text-base font-semibold">
                      {step.title}
                    </h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                      {step.description}
                    </p>
                  </div>

                  {/* Arrow connector */}
                  {idx < pipelineSteps.length - 1 && (
                    <div className="mx-2 hidden text-slate-600 lg:block">
                      <ChevronRight className="h-8 w-8" />
                    </div>
                  )}
                  {idx < pipelineSteps.length - 1 && (
                    <div className="my-1 rotate-90 text-slate-600 lg:hidden">
                      <ChevronRight className="h-8 w-8" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───────────────────────── Use Cases ───────────────────────── */}
      <section id="use-cases" className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-violet-400">
              Use Cases
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Built for real-world impact at scale
            </h2>
            <p className="mt-4 text-lg text-slate-400">
              From government helplines to enterprise customer support, Sargam
              adapts to any voice communication workflow.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {useCases.map((useCase) => {
              const Icon = useCase.icon;
              return (
                <div
                  key={useCase.title}
                  className="group rounded-xl border border-slate-800 bg-slate-900/50 p-6 transition-all hover:border-violet-500/30 hover:bg-slate-900"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-violet-500/10">
                    <Icon className="h-6 w-6 text-violet-400" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">
                    {useCase.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    {useCase.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───────────────────── Architecture ───────────────────── */}
      <section id="architecture" className="bg-slate-900 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-indigo-400">
              Architecture
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Production-grade tech stack
            </h2>
            <p className="mt-4 text-lg text-slate-400">
              A modular architecture designed for reliability, scalability, and
              sub-second latency.
            </p>
          </div>

          {/* Architecture diagram */}
          <div className="mt-16 flex flex-col items-center gap-4 lg:flex-row lg:justify-center lg:gap-0">
            {architectureLayers.map((layer, idx) => (
              <div key={layer.title} className="flex items-center">
                <div
                  className={`flex w-52 flex-col items-center rounded-xl border p-6 text-center ${layer.color}`}
                >
                  <h3 className="text-lg font-bold">{layer.title}</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    {layer.subtitle}
                  </p>
                </div>

                {idx < architectureLayers.length - 1 && (
                  <div className="mx-3 hidden text-slate-600 lg:block">
                    <ChevronRight className="h-7 w-7" />
                  </div>
                )}
                {idx < architectureLayers.length - 1 && (
                  <div className="my-1 rotate-90 text-slate-600 lg:hidden">
                    <ChevronRight className="h-7 w-7" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────── CTA Section ───────────────────────── */}
      <section className="relative overflow-hidden py-24 sm:py-32">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 via-violet-600/10 to-transparent" />
          <div className="absolute -right-20 -top-20 h-[400px] w-[400px] rounded-full bg-indigo-500/15 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-[300px] w-[300px] rounded-full bg-violet-500/15 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Ready to Transform Your{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              Communication?
            </span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-slate-400">
            Experience Sargam&apos;s AI voice agent live. No sign-up required.
          </p>
          <div className="mt-10">
            <Link
              href="/call"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-10 py-4 text-lg font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-500 hover:shadow-indigo-500/40"
            >
              Try Live Demo
              <ChevronRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ───────────────────────── Footer ───────────────────────── */}
      <footer className="border-t border-slate-800 bg-slate-950 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-4">
            {/* Brand */}
            <div className="lg:col-span-1">
              <Link href="/" className="text-2xl font-bold">
                <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                  Sargam
                </span>
              </Link>
              <p className="mt-3 text-sm text-slate-400">
                Built for India, Designed for Scale
              </p>
            </div>

            {/* Link columns */}
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                Product
              </h4>
              <ul className="mt-4 space-y-3">
                {["Features", "Pricing", "API"].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-sm text-slate-400 transition-colors hover:text-white"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                Resources
              </h4>
              <ul className="mt-4 space-y-3">
                {["Docs", "GitHub", "Blog"].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-sm text-slate-400 transition-colors hover:text-white"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                Company
              </h4>
              <ul className="mt-4 space-y-3">
                {["About", "Contact", "Careers"].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-sm text-slate-400 transition-colors hover:text-white"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-12 border-t border-slate-800 pt-8 text-center">
            <p className="text-sm text-slate-500">
              &copy; {new Date().getFullYear()} Sargam. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
