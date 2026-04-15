"use client";

import { useEffect, useRef, useState } from "react";

const agents = [
  { name: "Claude", icon: "✦", color: "#D97706" },
  { name: "ChatGPT", icon: "◆", color: "#10B981" },
  { name: "Perplexity", icon: "◎", color: "#6366F1" },
  { name: "Independent Agents", icon: "⚙", color: "#64748B" },
];

const outputs = [
  { name: "Product Feed", icon: "📦", desc: "Structured catalog for agents" },
  { name: "Skills", icon: "⚡", desc: "Programmable capabilities" },
  { name: "Documentation", icon: "📄", desc: "Agent-readable specs" },
];

export function AgentConvergenceV3() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="w-full">
      <div className="flex flex-col items-center gap-12 py-8">

        <div className="flex flex-wrap justify-center gap-4 w-full">
          {agents.map((agent, i) => (
            <div
              key={agent.name}
              className="flex items-center gap-3 px-5 py-3 rounded-full bg-white border border-neutral-100 shadow-sm transition-all duration-700"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(-30px)",
                transitionDelay: `${i * 120}ms`,
              }}
              data-testid={`v3-agent-${i}`}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white"
                style={{ backgroundColor: agent.color }}
              >
                {agent.icon}
              </div>
              <span className="text-sm font-bold text-neutral-700">{agent.name}</span>
            </div>
          ))}
        </div>

        <div className="relative flex flex-col items-center">
          <svg
            className="w-16 h-16 mb-2"
            viewBox="0 0 64 64"
            fill="none"
          >
            {[0, 1, 2, 3].map((i) => (
              <line
                key={i}
                x1={12 + i * 14}
                y1="0"
                x2="32"
                y2="64"
                stroke={agents[i].color}
                strokeWidth="1.5"
                strokeOpacity={visible ? 0.4 : 0}
                className="transition-all duration-700"
                style={{ transitionDelay: `${500 + i * 100}ms` }}
              />
            ))}
          </svg>

          <div
            className="transition-all duration-700"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "scale(1)" : "scale(0.7)",
              transitionDelay: "700ms",
            }}
          >
            <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-primary to-orange-400 flex flex-col items-center justify-center shadow-2xl shadow-primary/30 mx-auto">
              <span className="text-white text-4xl font-extrabold">B</span>
              <span className="text-white/80 text-[10px] font-bold mt-0.5 uppercase tracking-wider">Your Brand</span>
            </div>
          </div>

          <svg
            className="w-48 h-12 mt-2"
            viewBox="0 0 192 48"
            fill="none"
          >
            {[0, 1, 2].map((i) => (
              <line
                key={i}
                x1="96"
                y1="0"
                x2={32 + i * 64}
                y2="48"
                stroke="hsl(10, 85%, 55%)"
                strokeWidth="1.5"
                strokeOpacity={visible ? 0.3 : 0}
                className="transition-all duration-700"
                style={{ transitionDelay: `${1000 + i * 150}ms` }}
              />
            ))}
          </svg>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
          {outputs.map((output, i) => (
            <div
              key={output.name}
              className="flex flex-col items-center text-center p-6 rounded-2xl bg-white border border-neutral-100 shadow-sm transition-all duration-700"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(30px)",
                transitionDelay: `${1100 + i * 150}ms`,
              }}
              data-testid={`v3-output-${i}`}
            >
              <div className="w-14 h-14 rounded-2xl bg-neutral-50 flex items-center justify-center text-2xl mb-3 border border-neutral-100">
                {output.icon}
              </div>
              <span className="text-sm font-bold text-neutral-800">{output.name}</span>
              <span className="text-xs text-neutral-400 font-medium mt-1">{output.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
