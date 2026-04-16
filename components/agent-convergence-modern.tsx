"use client";

import { useEffect, useRef, useState } from "react";

function AnthropicLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.304 3.541h-3.476l6.182 16.918h3.476L17.304 3.541zm-10.609 0L.514 20.459h3.554l1.262-3.471h6.478l1.263 3.471h3.554L10.443 3.541H6.695zm-.783 10.64L8.57 7.554l2.657 6.627H5.912z" />
    </svg>
  );
}

function OpenAILogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.998 5.998 0 0 0-3.998 2.9 6.042 6.042 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
    </svg>
  );
}

function PerplexityLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4l8 8M20 4l-8 8M12 12v10M4 20l8-8 8 8M12 2v10M4 12h16" />
    </svg>
  );
}

function AgentIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v4" />
      <line x1="8" y1="16" x2="8" y2="16" />
      <line x1="16" y1="16" x2="16" y2="16" />
    </svg>
  );
}

const agents = [
  { name: "Claude", logo: AnthropicLogo, bg: "#D97706", line: "#D9770640" },
  { name: "ChatGPT", logo: OpenAILogo, bg: "#10B981", line: "#10B98140" },
  { name: "Perplexity", logo: PerplexityLogo, bg: "#6366F1", line: "#6366F140" },
  { name: "Independent Agents", logo: AgentIcon, bg: "#64748B", line: "#64748B40" },
];

const outputs = [
  { name: "Product Feed", desc: "UCP-aligned Catalog" },
  { name: "Skill.md", desc: "Search, order & deals" },
  { name: "Documentation", desc: "llm.txt & specs" },
];

export function AgentConvergenceModern() {
  const [visible, setVisible] = useState(false);
  const [drawn, setDrawn] = useState(false);
  const [pulsesActive, setPulsesActive] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        inView.current = entry.isIntersecting;
        if (entry.isIntersecting && !visible) setVisible(true);
      },
      { threshold: 0.15 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [visible]);

  useEffect(() => {
    if (visible) {
      setDrawn(true);
      const t = setTimeout(() => setPulsesActive(true), 2400);
      return () => clearTimeout(t);
    }
  }, [visible]);

  return (
    <div ref={ref} className="w-full max-w-4xl mx-auto py-6">
      <div className="relative flex items-center justify-between overflow-visible">

        <div className="flex flex-col gap-5 z-10 shrink-0 w-10 sm:w-[210px]">
          {agents.map((agent, i) => {
            const Logo = agent.logo;
            return (
              <div
                key={agent.name}
                className="flex items-center gap-3 transition-all duration-700"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateX(0)" : "translateX(-40px)",
                  transitionDelay: `${i * 120}ms`,
                }}
                data-testid={`modern-agent-${i}`}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0"
                  style={{ backgroundColor: agent.bg }}
                >
                  <Logo size={18} />
                </div>
                <span className="text-[13px] font-semibold text-neutral-600 whitespace-nowrap hidden sm:block">
                  {agent.name}
                </span>
              </div>
            );
          })}
        </div>

        {([
          { cls: "sm:hidden", leftX: 160, leftCtrl: 320, rightCtrl: 480, rightX: 640 },
          { cls: "hidden sm:block", leftX: 160, leftCtrl: 320, rightCtrl: 480, rightX: 560 },
        ] as const).map((cfg, idx) => (
        <svg
          key={idx}
          className={`absolute inset-0 w-full h-full pointer-events-none z-0 ${cfg.cls}`}
          viewBox="0 0 800 340"
          preserveAspectRatio="none"
          fill="none"
        >
          <defs>
            <radialGradient id={`centerGlow-${idx}`}>
              <stop offset="0%" stopColor="hsl(10, 85%, 55%)" stopOpacity="0.12" />
              <stop offset="100%" stopColor="hsl(10, 85%, 55%)" stopOpacity="0" />
            </radialGradient>
          </defs>

          {agents.map((agent, i) => {
            const startY = 40 + i * 75;
            return (
              <path
                key={`left-${i}`}
                d={`M ${cfg.leftX} ${startY} Q ${cfg.leftCtrl} ${startY} 400 160`}
                stroke={agent.line}
                strokeWidth="1.5"
                strokeOpacity="1"
                fill="none"
                className="transition-all duration-1000"
                style={{
                  strokeDasharray: 400,
                  strokeDashoffset: drawn ? 0 : 400,
                  transitionDelay: `${i * 150 + 300}ms`,
                }}
              />
            );
          })}

          {outputs.map((_, i) => {
            const endY = 45 + i * 115;
            return (
              <path
                key={`right-${i}`}
                d={`M 400 160 Q ${cfg.rightCtrl} ${endY} ${cfg.rightX} ${endY}`}
                stroke="hsl(10, 85%, 55%)"
                strokeWidth="1.5"
                strokeOpacity="0.3"
                fill="none"
                className="transition-all duration-1000"
                style={{
                  strokeDasharray: 400,
                  strokeDashoffset: drawn ? 0 : 400,
                  transitionDelay: `${i * 150 + 800}ms`,
                }}
              />
            );
          })}

          <line
            x1="400" y1="200" x2="400" y2="310"
            stroke="hsl(10, 85%, 55%)"
            strokeWidth="1.5"
            strokeOpacity="0.3"
            className="transition-all duration-1000"
            style={{
              strokeDasharray: 200,
              strokeDashoffset: drawn ? 0 : 200,
              transitionDelay: "1200ms",
            }}
          />

          <circle cx="400" cy="160" r="36" fill={`url(#centerGlow-${idx})`} opacity={visible ? 1 : 0} className="transition-opacity duration-1000" style={{ transitionDelay: "600ms" }} />

          {pulsesActive && agents.map((agent, i) => {
            const startY = 40 + i * 75;
            return (
              <path
                key={`pulse-left-${i}`}
                d={`M ${cfg.leftX} ${startY} Q ${cfg.leftCtrl} ${startY} 400 160`}
                stroke={agent.bg}
                strokeWidth="2"
                strokeOpacity="0.9"
                fill="none"
                pathLength={1}
                style={{
                  strokeDasharray: "0.12 0.88",
                  animation: `pulseFlow 3s linear infinite`,
                  animationDelay: `${i * 400}ms`,
                }}
              />
            );
          })}

          {pulsesActive && outputs.map((_, i) => {
            const endY = 45 + i * 115;
            return (
              <path
                key={`pulse-right-${i}`}
                d={`M 400 160 Q ${cfg.rightCtrl} ${endY} ${cfg.rightX} ${endY}`}
                stroke="hsl(10, 85%, 55%)"
                strokeWidth="2"
                strokeOpacity="0.9"
                fill="none"
                pathLength={1}
                style={{
                  strokeDasharray: "0.12 0.88",
                  animation: `pulseFlow 3s linear infinite`,
                  animationDelay: `${i * 400 + 1200}ms`,
                }}
              />
            );
          })}

          {pulsesActive && (
            <line
              x1="400" y1="200" x2="400" y2="310"
              stroke="hsl(10, 85%, 55%)"
              strokeWidth="2"
              strokeOpacity="0.9"
              pathLength={1}
              style={{
                strokeDasharray: "0.15 0.85",
                animation: `pulseFlow 3s linear infinite`,
                animationDelay: "2000ms",
              }}
            />
          )}
        </svg>
        ))}

        <style jsx>{`
          @keyframes pulseFlow {
            0% { stroke-dashoffset: 1; }
            100% { stroke-dashoffset: 0; }
          }
        `}</style>

        <div
          className="z-10 flex flex-col items-center shrink-0 relative transition-all duration-700"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "scale(1)" : "scale(0.85)",
            transitionDelay: "500ms",
          }}
        >
          <div className="w-16 h-16 rounded-2xl bg-neutral-900 flex items-center justify-center shadow-2xl ring-[3px] ring-neutral-800/50" data-testid="modern-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
              <path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9" />
              <path d="M12 3v6" />
            </svg>
          </div>
          <span className="text-[10px] font-bold text-neutral-400 mt-2 uppercase tracking-[0.15em]">Your Brand</span>
          <div
            className="absolute top-full mt-10 flex flex-col items-center gap-2 whitespace-nowrap transition-all duration-700"
            style={{
              left: "50%",
              opacity: visible ? 1 : 0,
              transform: visible ? "translateX(-50%) translateY(0)" : "translateX(-50%) translateY(-20px)",
              transitionDelay: "1300ms",
            }}
            data-testid="agent-checkout-node"
          >
            <div className="w-10 h-10 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#525252" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="8" cy="21" r="1" />
                <circle cx="19" cy="21" r="1" />
                <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
              </svg>
            </div>
            <span className="text-[13px] font-semibold text-neutral-700">Agent Checkout</span>
            <span className="text-[11px] text-neutral-400 font-medium">ACP via MCP/API/CLI</span>
          </div>
        </div>

        <div className="flex flex-col justify-center gap-8 z-10 shrink-0 w-10 sm:w-[210px] items-end sm:items-start">
          {outputs.map((output, i) => (
            <div
              key={output.name}
              className="flex items-center gap-3 flex-row-reverse sm:flex-row transition-all duration-700"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "translateX(0)" : "translateX(40px)",
                transitionDelay: `${i * 120 + 900}ms`,
              }}
              data-testid={`modern-output-${i}`}
            >
              <div className="w-10 h-10 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0">
                {i === 0 && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#525252" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                    <path d="m3.3 7 8.7 5 8.7-5" />
                    <path d="M12 22V12" />
                  </svg>
                )}
                {i === 1 && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#525252" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                )}
                {i === 2 && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#525252" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                    <path d="M14 2v6h6" />
                    <path d="M16 13H8" />
                    <path d="M16 17H8" />
                    <path d="M10 9H8" />
                  </svg>
                )}
              </div>
              <div className="hidden sm:block text-right sm:text-left">
                <span className="text-[13px] font-semibold text-neutral-700 block leading-tight">{output.name}</span>
                <span className="text-[11px] text-neutral-400 font-medium">{output.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between mt-28">
        <p className="text-[10px] font-bold text-neutral-600 uppercase tracking-[0.2em]">Agents discover you</p>
        <p className="text-[10px] font-bold text-neutral-600 uppercase tracking-[0.2em]">You provide</p>
      </div>
    </div>
  );
}
