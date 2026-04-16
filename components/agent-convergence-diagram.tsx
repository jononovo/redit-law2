"use client";

import { useEffect, useRef, useState } from "react";

const agents = [
  { name: "Claude", icon: "✦", color: "#D97706" },
  { name: "ChatGPT", icon: "◆", color: "#10B981" },
  { name: "Perplexity", icon: "◎", color: "#6366F1" },
  { name: "Independent Agents", icon: "⚙", color: "#64748B" },
];

const outputs = [
  { name: "Product Feed", icon: "📦" },
  { name: "Skills", icon: "⚡" },
  { name: "Documentation", icon: "📄" },
  { name: "Agent Checkout", icon: "🛒" },
];

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
    <div ref={ref} className="w-full max-w-4xl mx-auto py-8">
      <div className="relative flex items-center justify-between gap-4 md:gap-0">

        <div className="flex flex-col gap-5 z-10 shrink-0">
          {agents.map((agent, i) => (
            <div
              key={agent.name}
              className="flex items-center gap-3 transition-all duration-700"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "translateX(0)" : "translateX(-30px)",
                transitionDelay: `${i * 150}ms`,
              }}
              data-testid={`diagram-agent-${i}`}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-lg font-bold text-white shadow-md shrink-0"
                style={{ backgroundColor: agent.color }}
              >
                {agent.icon}
              </div>
              <span className="text-sm font-bold text-neutral-700 whitespace-nowrap hidden sm:block">
                {agent.name}
              </span>
            </div>
          ))}
        </div>

        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 800 280"
          preserveAspectRatio="none"
          fill="none"
        >
          {agents.map((agent, i) => {
            const startY = 35 + i * 65;
            const midX = 400;
            const midY = 140;
            return (
              <path
                key={`left-${i}`}
                d={`M 160 ${startY} C 280 ${startY}, 320 ${midY}, ${midX} ${midY}`}
                stroke={agent.color}
                strokeWidth="2"
                strokeOpacity="0.4"
                fill="none"
                className="transition-all duration-1000"
                style={{
                  strokeDasharray: 400,
                  strokeDashoffset: visible ? 0 : 400,
                  transitionDelay: `${i * 150 + 300}ms`,
                }}
              />
            );
          })}

          {outputs.map((_, i) => {
            const endY = 60 + i * 80;
            const midX = 400;
            const midY = 140;
            return (
              <path
                key={`right-${i}`}
                d={`M ${midX} ${midY} C 480 ${midY}, 520 ${endY}, 640 ${endY}`}
                stroke="hsl(10, 85%, 55%)"
                strokeWidth="2"
                strokeOpacity="0.35"
                fill="none"
                className="transition-all duration-1000"
                style={{
                  strokeDasharray: 400,
                  strokeDashoffset: visible ? 0 : 400,
                  transitionDelay: `${i * 150 + 800}ms`,
                }}
              />
            );
          })}
        </svg>

        <div
          className="z-10 flex flex-col items-center shrink-0 transition-all duration-700"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "scale(1)" : "scale(0.8)",
            transitionDelay: "500ms",
          }}
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-orange-400 flex items-center justify-center shadow-lg shadow-primary/20" data-testid="diagram-center">
            <span className="text-white text-2xl font-extrabold">B</span>
          </div>
          <span className="text-xs font-extrabold text-neutral-900 mt-2 whitespace-nowrap">Your Brand</span>
        </div>

        <div className="flex flex-col gap-6 z-10 shrink-0">
          {outputs.map((output, i) => (
            <div
              key={output.name}
              className="flex items-center gap-3 transition-all duration-700"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "translateX(0)" : "translateX(30px)",
                transitionDelay: `${i * 150 + 900}ms`,
              }}
              data-testid={`diagram-output-${i}`}
            >
              <div className="w-11 h-11 rounded-xl bg-neutral-100 flex items-center justify-center text-lg shadow-sm border border-neutral-200 shrink-0">
                {output.icon}
              </div>
              <span className="text-sm font-bold text-neutral-700 whitespace-nowrap hidden sm:block">
                {output.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between mt-8 px-4">
        <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Agents discover you</p>
        <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">You provide</p>
      </div>
    </div>
  );
}
