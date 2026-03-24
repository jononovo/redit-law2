const transactions = [
  { id: 1, text: "OpenAI Credits", amount: "-$20.00", icon: "🧠", type: "debit", time: "Just now" },
  { id: 2, text: "Weekly Allowance", amount: "+$50.00", icon: "💰", type: "credit", time: "1h ago" },
  { id: 3, text: "Vercel Hosting", amount: "-$12.00", icon: "▲", type: "debit", time: "Yesterday" },
];

export function TransactionLedger() {
  return (
    <div 
      className="w-72 bg-white rounded-3xl shadow-2xl shadow-blue-900/10 border border-neutral-100 overflow-hidden animate-fade-in-up"
      style={{ animationDelay: '0.8s' }}
    >
      <div className="px-5 py-4 bg-neutral-50 border-b border-neutral-100 flex justify-between items-center">
        <span className="text-xs font-bold uppercase text-neutral-500 tracking-wider">Recent Activity</span>
        <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <div className="w-2 h-2 rounded-full bg-yellow-400" />
            <div className="w-2 h-2 rounded-full bg-green-400" />
        </div>
      </div>
      
      <div className="p-2">
        {transactions.map((tx) => (
          <div 
            key={tx.id}
            className="flex items-center justify-between p-3 hover:bg-neutral-50 rounded-2xl transition-colors cursor-default"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white border border-neutral-100 flex items-center justify-center text-lg shadow-sm">
                {tx.icon}
              </div>
              <div>
                <div className="text-sm font-bold text-neutral-800">{tx.text}</div>
                <div className="text-[10px] text-neutral-400 font-semibold">{tx.time}</div>
              </div>
            </div>
            <div className={`text-sm font-bold ${tx.type === 'credit' ? 'text-green-600' : 'text-neutral-800'}`}>
              {tx.amount}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
