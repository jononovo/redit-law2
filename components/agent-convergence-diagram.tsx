"use client";

import { useEffect, useRef, useState } from "react";

const agents = [
  { name: "Claude", color: "#D97706", letter: "C" },
  { name: "ChatGPT", color: "#10B981", letter: "G" },
  { name: "Perplexity", color: "#6366F1", letter: "P" },
  { name: "Independent Agents", color: "#64748B", letter: "A" },
];

const outputs = [
  { name: "Product Feed", color: "#F97316" },
  { name: "Skills", color: "#F97316" },
  { name: "Documentation", color: "#F97316" },
];

function Dot({ color, visible, delay }: { color: string; visible: boolean; delay: number }) {
  return (
    <div
      className="absolute w-2 h-2 rounded-full transition-all duration-[2000ms] ease-in-out"
      style={{
        backgroundColor: color,
        opacity: visible ? 0.6 : 0,
        transitionDelay: `${delay}ms`,
      }}
    />
  );
}

export function AgentConvergenceDiagram() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="w-full max-w-4xl mx-auto py-6">
      <div className="relative flex items-center justify-between">

        <div className="flex flex-col gap-4 z-10 shrink-0 w-[160px] sm:w-[200px]">
          {agents.map((agent, i) => (
            <div
              key={agent.name}
              className="flex items-center gap-3 transition-all duration-700"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "translateX(0)" : "translateX(-40px)",
                transitionDelay: `${i * 120}ms`,
              }}
              data-testid={`diagram-agent-${i}`}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-extrabold text-white shrink-0 tracking-wide"
                style={{ backgroundColor: agent.color }}
              >
                {agent.letter}
              </div>
              <span className="text-[13px] font-semibold text-neutral-600 whitespace-nowrap hidden sm:block">
                {agent.name}
              </span>
            </div>
          ))}
        </div>

        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-0"
          viewBox="0 0 800 260"
          preserveAspectRatio="none"
          fill="none"
        >
          <defs>
            <linearGradient id="lineGradLeft" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.15" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="lineGradRight" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="hsl(10,85%,55%)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="hsl(10,85%,55%)" stopOpacity="0.15" />
            </linearGradient>
          </defs>

          {agents.map((agent, i) => {
            const startY = 32 + i * 60;
            return (
              <path
                key={`left-${i}`}
                d={`M 170 ${startY} C 300 ${startY}, 340 130, 400 130`}
                stroke={agent.color}
                strokeWidth="1.5"
                strokeOpacity="0.3"
                fill="none"
                className="transition-all duration-1000"
                style={{
                  strokeDasharray: 400,
                  strokeDashoffset: visible ? 0 : 400,
                  transitionDelay: `${i * 120 + 400}ms`,
                }}
              />
            );
          })}

          {outputs.map((_, i) => {
            const endY = 50 + i * 80;
            return (
              <path
                key={`right-${i}`}
                d={`M 400 130 C 460 130, 500 ${endY}, 630 ${endY}`}
                stroke="hsl(10, 85%, 55%)"
                strokeWidth="1.5"
                strokeOpacity="0.25"
                fill="none"
                className="transition-all duration-1000"
                style={{
                  strokeDasharray: 400,
                  strokeDashoffset: visible ? 0 : 400,
                  transitionDelay: `${i * 120 + 900}ms`,
                }}
              />
            );
          })}
        </svg>

        <div
          className="z-10 flex flex-col items-center shrink-0 transition-all duration-700"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "scale(1)" : "scale(0.85)",
            transitionDelay: "500ms",
          }}
        >
          <div className="w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-primary to-orange-400 flex items-center justify-center shadow-xl shadow-primary/20 ring-4 ring-primary/10" data-testid="diagram-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
              <path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9" />
              <path d="M12 3v6" />
            </svg>
          </div>
          <span className="text-[11px] font-bold text-neutral-500 mt-2 uppercase tracking-widest">Your Brand</span>
        </div>

        <div className="flex flex-col gap-5 z-10 shrink-0 w-[160px] sm:w-[200px] items-end">
          {outputs.map((output, i) => (
            <div
              key={output.name}
              className="flex items-center gap-3 flex-row-reverse sm:flex-row transition-all duration-700"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "translateX(0)" : "translateX(40px)",
                transitionDelay: `${i * 120 + 900}ms`,
              }}
              data-testid={`diagram-output-${i}`}
            >
              <div className="w-10 h-10 rounded-lg bg-neutral-900 flex items-center justify-center shrink-0">
                {i === 0 && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                    <path d="m3.3 7 8.7 5 8.7-5" />
                    <path d="M12 22V12" />
                  </svg>
                )}
                {i === 1 && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                )}
                {i === 2 && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                    <path d="M14 2v6h6" />
                    <path d="M16 13H8" />
                    <path d="M16 17H8" />
                    <path d="M10 9H8" />
                  </svg>
                )}
              </div>
              <span className="text-[13px] font-semibold text-neutral-600 whitespace-nowrap hidden sm:block">
                {output.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between mt-6">
        <p className="text-[10px] font-bold text-neutral-300 uppercase tracking-[0.2em]">Agents discover you</p>
        <p className="text-[10px] font-bold text-neutral-300 uppercase tracking-[0.2em]">You provide</p>
      </div>
    </div>
  );
}
