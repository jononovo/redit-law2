"use client";

import { useEffect, useRef, useState } from "react";

const agents = [
  { name: "Claude", icon: "✦", color: "#D97706", delay: 0 },
  { name: "ChatGPT", icon: "◆", color: "#10B981", delay: 200 },
  { name: "Perplexity", icon: "◎", color: "#6366F1", delay: 400 },
  { name: "Independent Agents", icon: "⚙", color: "#64748B", delay: 600 },
];

const outputs = [
  { name: "Product Feed", icon: "📦", delay: 1000 },
  { name: "Skills", icon: "⚡", delay: 1200 },
  { name: "Documentation", icon: "📄", delay: 1400 },
];

export function AgentConvergenceV2() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.15 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="w-full py-12">
      <div className="flex flex-col md:flex-row items-stretch gap-0 relative">

        <div className="flex-1 flex flex-col justify-center gap-3 pr-4 md:pr-0">
          {agents.map((agent, i) => (
            <div
              key={agent.name}
              className="flex items-center gap-4 py-3 px-5 rounded-2xl transition-all duration-700 bg-white/60 backdrop-blur-sm border border-neutral-100/80"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "translateX(0)" : "translateX(-60px)",
                transitionDelay: `${agent.delay}ms`,
              }}
              data-testid={`v2-agent-${i}`}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold text-white shadow-lg shrink-0"
                style={{ backgroundColor: agent.color }}
              >
                {agent.icon}
              </div>
              <div>
                <span className="text-sm font-bold text-neutral-800">{agent.name}</span>
                <p className="text-xs text-neutral-400 font-medium">AI Agent</p>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden md:flex flex-col items-center justify-center px-6 relative" style={{ minWidth: 120 }}>
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 120 360" fill="none" preserveAspectRatio="none">
            {agents.map((agent, i) => {
              const startY = 45 + i * 78;
              return (
                <line
                  key={`l-${i}`}
                  x1="0" y1={startY} x2="60" y2="180"
                  stroke={agent.color}
                  strokeWidth="1.5"
                  strokeOpacity={visible ? 0.35 : 0}
                  className="transition-all duration-1000"
                  style={{ transitionDelay: `${agent.delay + 300}ms` }}
                />
              );
            })}
            {outputs.map((_, i) => {
              const endY = 70 + i * 110;
              return (
                <line
                  key={`r-${i}`}
                  x1="60" y1="180" x2="120" y2={endY}
                  stroke="hsl(10, 85%, 55%)"
                  strokeWidth="1.5"
                  strokeOpacity={visible ? 0.3 : 0}
                  className="transition-all duration-1000"
                  style={{ transitionDelay: `${800 + i * 150}ms` }}
                />
              );
            })}
          </svg>

          <div
            className="relative z-10 transition-all duration-700"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "scale(1)" : "scale(0.7)",
              transitionDelay: "600ms",
            }}
          >
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-orange-400 flex flex-col items-center justify-center shadow-xl shadow-primary/25">
              <span className="text-white text-3xl font-extrabold">B</span>
            </div>
            <p className="text-xs font-extrabold text-neutral-900 mt-2 text-center">Your Brand</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center gap-3 pl-4 md:pl-0">
          {outputs.map((output, i) => (
            <div
              key={output.name}
              className="flex items-center gap-4 py-4 px-5 rounded-2xl transition-all duration-700 bg-neutral-50 border border-neutral-100"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "translateX(0)" : "translateX(60px)",
                transitionDelay: `${output.delay}ms`,
              }}
              data-testid={`v2-output-${i}`}
            >
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-xl shadow-sm border border-neutral-200 shrink-0">
                {output.icon}
              </div>
              <div>
                <span className="text-sm font-bold text-neutral-800">{output.name}</span>
                <p className="text-xs text-neutral-400 font-medium">Brand asset</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between mt-6 px-2">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Agents discover you</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">You provide</p>
        </div>
      </div>
    </div>
  );
}
