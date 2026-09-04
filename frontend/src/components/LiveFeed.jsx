import React from 'react';
import { Bot, User, Users } from 'lucide-react';

const LiveFeed = ({ messages }) => {
  return (
    <div className="overflow-y-auto pr-2 h-full flex flex-col gap-3 custom-scrollbar">
      {messages.length === 0 && (
        <div className="text-slate-500 text-center mt-10">Waiting for data stream...</div>
      )}
      
      {messages.map((msg) => {
        const isBot = msg.nlp.is_bot;
        const isSockpuppet = !!msg.nlp.cluster_id;
        
        let indicatorClass = "indicator-human";
        let Icon = User;
        let label = "Human";

        if (isBot) {
          indicatorClass = "indicator-bot";
          Icon = Bot;
          label = "Bot Detected";
        } else if (isSockpuppet) {
          indicatorClass = "indicator-sockpuppet";
          Icon = Users;
          label = "Sockpuppet Match";
        }

        return (
          <div key={msg.id} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 flex flex-col gap-2 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-slate-400 bg-slate-900 px-2 py-1 rounded">
                  {msg.user_id}
                </span>
                <span className="text-xs text-slate-500">{msg.region}</span>
              </div>
              <div className={`flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${indicatorClass}`}>
                <Icon className="w-3 h-3" />
                {label}
              </div>
            </div>
            <p className="text-sm text-slate-200 mt-1 leading-relaxed">
              "{msg.text}"
            </p>
            
            {/* Meta breakdown */}
            <div className="flex gap-4 mt-2 pt-2 border-t border-slate-700/30">
              <div className="text-[10px] text-slate-500 font-mono flex gap-1">
                <span>SIM:</span>
                <span className="text-slate-400">{(msg.nlp.features[4] * 100).toFixed(0)}%</span>
              </div>
              {isSockpuppet && (
                <div className="text-[10px] text-amber-500/70 font-mono flex gap-1">
                  <span>CLUSTER:</span>
                  <span>#{msg.nlp.cluster_id}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default LiveFeed;
