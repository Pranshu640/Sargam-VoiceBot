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
  Users,
  MessageSquare,
  Phone,
} from "lucide-react";

const features = [
  {
    icon: PhoneIncoming,
    title: "INBOUND HANDLING",
    description:
      "Auto-attendant with natural language intent recognition. No more 'Press 1' menus. Instant routing.",
  },
  {
    icon: PhoneOutgoing,
    title: "OUTBOUND DIALING",
    description:
      "Batch dialing for surveys, reminders, and outreach with adaptive and relentless conversation flows.",
  },
  {
    icon: Globe,
    title: "11 INDIAN LANGUAGES",
    description:
      "Hindi, Tamil, Telugu, Bengali, Kannada, Malayalam, Marathi, Gujarati, Punjabi, Odia + English.",
  },
  {
    icon: Brain,
    title: "CONTEXT MEMORY",
    description:
      "Three-layer memory system: working memory, cross-call memory, and uncompromising knowledge base RAG.",
  },
  {
    icon: ArrowUpRight,
    title: "SMART ESCALATION",
    description:
      "Auto-detects frustration, loops, and sensitive topics. Immediate warm transfer with absolute context.",
  },
  {
    icon: BarChart3,
    title: "LIVE ANALYTICS",
    description:
      "Brutal live dashboard with blunt sentiment tracking, call metrics, and raw AI-powered insights.",
  },
];

const pipelineSteps = [
  {
    icon: Mic,
    title: "VOICE IN",
    description: "Raw caller input in any supported language.",
  },
  {
    icon: FileText,
    title: "SPEECH -> TEXT",
    description: "Instantaneous transcription. Accent-agnostic.",
  },
  {
    icon: Brain,
    title: "AI REASONING",
    description: "LLM processes intent, rips through knowledge, generates payload.",
  },
  {
    icon: Volume2,
    title: "TEXT -> SPEECH",
    description: "Synthesized natural voice output. Zero hesitation.",
  },
];

const useCases = [
  {
    title: "PUBLIC SERVICES",
    description: "Government helplines, scheme information, mass citizen services.",
    icon: Shield,
  },
  {
    title: "CUSTOMER SUPPORT",
    description: "24/7 automated brutal support efficiency with human failover.",
    icon: MessageSquare,
  },
  {
    title: "SURVEY EXECUTION",
    description: "Large-scale uncompromising surveys with adaptive branching.",
    icon: BarChart3,
  },
  {
    title: "GRIEVANCE REDRESSAL",
    description: "Complaint registration, immediate tracking, resolution enforcement.",
    icon: Users,
  },
  {
    title: "OUTREACH CAMPAIGNS",
    description: "Health awareness, raw payment reminders, mass notifications.",
    icon: Phone,
  },
];

const stats = [
  { value: "11+", label: "LANGUAGES" },
  { value: "< 1s", label: "LATENCY" },
  { value: "100+", label: "CONCURRENCY" },
  { value: "24/7", label: "UPTIME" },
];

const architectureLayers = [
  {
    title: "TELEPHONY",
    subtitle: "TWILIO / WEBRTC",
  },
  {
    title: "ORCHESTRATION",
    subtitle: "PIPELINE ENGINE",
  },
  {
    title: "AI STACK",
    subtitle: "STT + LLM + TTS",
  },
  {
    title: "DATA LAYER",
    subtitle: "ANALYTICS + STORAGE",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white antialiased selection:bg-white selection:text-black">
      {/* ───────────────────────── Navbar ───────────────────────── */}
      <nav className="fixed top-0 z-50 w-full border-b-[2px] border-white/20 bg-black/40 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-[1400px] items-center justify-between px-6">
          <Link href="/" className="text-3xl font-black tracking-tighter uppercase">
            SARGAM
          </Link>

          <div className="hidden items-center gap-12 md:flex">
            <a href="#features" className="text-sm font-bold tracking-widest text-zinc-400 hover:text-white transition-colors">
              FEATURES
            </a>
            <a href="#architecture" className="text-sm font-bold tracking-widest text-zinc-400 hover:text-white transition-colors">
              ARCHITECTURE
            </a>
            <a href="#use-cases" className="text-sm font-bold tracking-widest text-zinc-400 hover:text-white transition-colors">
              CASES
            </a>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="glass-brutal-btn-alt px-6 py-2 hidden sm:inline-flex text-sm">
              DASHBOARD
            </Link>
            <Link href="/call" className="glass-brutal-btn px-6 py-2 inline-flex items-center gap-2 text-sm">
              LIVE DEMO
              <Zap className="h-4 w-4 fill-white" />
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative pt-20">
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none z-0" />

        {/* ───────────────────────── Hero ───────────────────────── */}
        <section className="relative z-10 flex min-h-[90vh] items-center justify-center px-6 py-20">

          {/* Brutalist Glass Shape in Background */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 border-[1px] border-white/10 rotate-12 backdrop-blur-3xl z-0 rounded-none mix-blend-screen" />
          <div className="absolute top-1/4 right-1/4 w-[300px] h-[300px] bg-zinc-800/50 border-[2px] border-white/20 -rotate-6 backdrop-blur-2xl z-0 shadow-[10px_10px_0px_rgba(255,255,255,0.05)]" />

          <div className="relative z-10 mx-auto max-w-[1200px] w-full mt-10">
            <div className="mb-8 inline-flex items-center gap-3 border-[2px] border-white/30 bg-black/50 backdrop-blur-md px-5 py-2 text-sm font-bold tracking-widest uppercase shadow-[4px_4px_0px_rgba(255,255,255,0.2)] animate-in">
              <Zap className="h-4 w-4" />
              VOICE AUTOMATION ENGINE
            </div>

            <h1 className="max-w-[1000px] text-[12vw] sm:text-[8vw] lg:text-[100px] font-black leading-[0.85] tracking-tighter uppercase animate-in delay-100 mix-blend-difference">
              AI THAT SPEAKS
              <br />
              <span className="text-transparent bg-clip-text bg-white opacity-90 stroke-white stroke-2" style={{ WebkitTextStroke: '2px white' }}>
                INDIAN LANGUAGES
              </span>
            </h1>

            <p className="mt-8 max-w-[600px] text-xl sm:text-2xl font-medium leading-snug text-zinc-300 animate-in delay-200 border-l-[4px] border-white pl-6">
              Automate millions of interactions with relentless, human-grade AI.
              Hindi, Tamil, Telugu + 8 more. Zero hesitation. Sub-second latency.
            </p>

            <div className="mt-12 flex flex-col sm:flex-row gap-6 animate-in delay-300">
              <Link href="/call" className="glass-brutal-btn px-10 py-5 text-lg flex items-center justify-center gap-3 w-full sm:w-auto">
                INITIATE DEMO
                <ArrowUpRight className="h-6 w-6 stroke-[3]" />
              </Link>
              <Link href="/dashboard" className="glass-brutal-btn-alt px-10 py-5 text-lg flex items-center justify-center gap-3 w-full sm:w-auto">
                SYSTEM DASHBOARD
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-6 animate-in delay-400">
              {stats.map((stat, i) => (
                <div key={stat.label} className="glass-brutal p-6 flex flex-col justify-between" style={{ animationDelay: `${500 + i * 100}ms` }}>
                  <p className="text-4xl sm:text-5xl font-black tracking-tighter">{stat.value}</p>
                  <p className="mt-2 text-xs sm:text-sm font-bold tracking-widest text-zinc-400">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ───────────────────────── Features ───────────────────────── */}
        <section id="features" className="relative z-10 py-32 border-t-[2px] border-white/20 bg-zinc-950">
          <div className="mx-auto max-w-[1400px] px-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-20">
              <div className="max-w-[700px]">
                <h2 className="text-5xl sm:text-7xl font-black tracking-tighter leading-none mb-6">CAPABILITIES</h2>
                <p className="text-xl text-zinc-400 font-medium border-l-[2px] border-white/30 pl-4">Raw power. Absolute scalability. Sargam operates inbound and outbound workflows through a unified, brutalist architecture.</p>
              </div>
              <div className="h-[2px] w-full md:w-[30%] bg-white/20" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feat) => {
                const Icon = feat.icon;
                return (
                  <div key={feat.title} className="glass-brutal p-8 group relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Icon className="w-32 h-32" />
                    </div>
                    <div className="h-14 w-14 mb-8 flex items-center justify-center border-[2px] border-white/30 bg-white/5 shadow-[4px_4px_0px_rgba(255,255,255,0.2)]">
                      <Icon className="h-6 w-6 stroke-[2.5]" />
                    </div>
                    <h3 className="text-xl font-black tracking-tight mb-4">{feat.title}</h3>
                    <p className="text-sm font-medium text-zinc-400 leading-relaxed relative z-10">{feat.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ───────────────────────── Pipeline ───────────────────────── */}
        <section className="relative z-10 py-32 border-t-[2px] border-white/20 bg-black overflow-hidden">
          <div className="absolute right-0 top-1/2 w-[800px] h-[300px] bg-white/5 border-[1px] border-white/20 backdrop-blur-3xl z-0 -translate-y-1/2 rotate-12" />

          <div className="mx-auto max-w-[1400px] px-6 relative z-10">
            <h2 className="text-5xl sm:text-7xl font-black tracking-tighter leading-none mb-20">THE PIPELINE</h2>

            <div className="flex flex-col lg:flex-row gap-6">
              {pipelineSteps.map((step, idx) => {
                const Icon = step.icon;
                return (
                  <div key={step.title} className="flex-1 flex flex-col relative">
                    <div className="glass-brutal h-full p-8 relative z-10">
                      <div className="text-5xl font-black text-white/10 absolute top-4 right-4 tracking-tighter">0{idx + 1}</div>
                      <Icon className="h-10 w-10 mb-6" />
                      <h3 className="text-2xl font-black tracking-tight mb-4">{step.title}</h3>
                      <p className="text-sm font-medium text-zinc-400 leading-relaxed">{step.description}</p>
                    </div>
                    {/* Visual Connector for Desktop */}
                    {idx < pipelineSteps.length - 1 && (
                      <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-[2px] bg-white/50 z-0" />
                    )}
                    {/* Visual Connector for Mobile */}
                    {idx < pipelineSteps.length - 1 && (
                      <div className="block lg:hidden h-6 w-[2px] bg-white/50 mx-auto my-0 z-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ───────────────────────── Use Cases ───────────────────────── */}
        <section id="use-cases" className="relative z-10 py-32 border-t-[2px] border-white/20 bg-zinc-950">
          <div className="mx-auto max-w-[1400px] px-6">
            <h2 className="text-5xl sm:text-7xl font-black tracking-tighter leading-none mb-20 text-right">TARGET VECTORS</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
              {useCases.map((uc) => {
                const Icon = uc.icon;
                return (
                  <div key={uc.title} className="glass-brutal p-6 flex flex-col">
                    <Icon className="h-8 w-8 mb-6 stroke-[2]" />
                    <h3 className="text-lg font-black tracking-tight mb-3 leading-tight">{uc.title}</h3>
                    <div className="mt-auto pt-4 border-t-[1px] border-white/10">
                      <p className="text-xs font-bold tracking-wide text-zinc-500 uppercase">{uc.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ───────────────────────── Architecture ───────────────────────── */}
        <section id="architecture" className="relative z-10 py-32 border-t-[2px] border-white/20 bg-black">
          <div className="mx-auto max-w-[1400px] px-6">
            <div className="mb-20 inline-block border-[2px] border-white/30 bg-black/50 px-5 py-2 text-sm font-bold tracking-widest shadow-[4px_4px_0px_rgba(255,255,255,0.2)]">
              SYSTEM TOPOLOGY
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {architectureLayers.map((layer, idx) => (
                <div key={layer.title} className="glass-brutal p-8 relative flex flex-col justify-center items-center text-center">
                  <div className="text-[100px] leading-none font-black text-white/5 absolute top-0 left-0 -translate-y-1/4 -translate-x-1/4 pointer-events-none">
                    L{idx + 1}
                  </div>
                  <h3 className="text-2xl font-black tracking-tight mb-2 relative z-10">{layer.title}</h3>
                  <p className="text-xs font-bold tracking-widest text-zinc-400 relative z-10">{layer.subtitle}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ───────────────────────── CTA ───────────────────────── */}
        <section className="relative z-10 py-40 border-t-[2px] border-white/20 bg-zinc-950 overflow-hidden">
          <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />
          <div className="max-w-[1000px] mx-auto px-6 text-center relative z-10">
            <h2 className="text-6xl sm:text-8xl lg:text-[120px] font-black tracking-tighter leading-[0.85] mb-12">
              EXECUTE
              <br />
              <span className="text-transparent" style={{ WebkitTextStroke: '2px white' }}>COMMAND</span>
            </h2>
            <div className="flex flex-col sm:flex-row justify-center gap-6">
              <Link href="/call" className="glass-brutal-btn px-12 py-6 text-xl flex items-center justify-center gap-3">
                DEPLOY LIVE AGENT
                <ChevronRight className="h-6 w-6 stroke-[3]" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ───────────────────────── Footer ───────────────────────── */}
      <footer className="relative z-10 border-t-[4px] border-white bg-black py-12">
        <div className="mx-auto max-w-[1400px] px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <Link href="/" className="text-4xl font-black tracking-tighter">
            SARGAM
          </Link>

          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 font-bold text-sm tracking-widest text-zinc-500">
            <Link href="/call" className="hover:text-white transition-colors">DEMO</Link>
            <Link href="/dashboard" className="hover:text-white transition-colors">DASHBOARD</Link>
            <a href="#features" className="hover:text-white transition-colors">CAPABILITIES</a>
            <a href="#architecture" className="hover:text-white transition-colors">TOPOLOGY</a>
          </div>

          <p className="text-xs font-bold tracking-widest text-zinc-600">
            SYSTEM VERSION {new Date().getFullYear()}.0.1
          </p>
        </div>
      </footer>
    </div>
  );
}
