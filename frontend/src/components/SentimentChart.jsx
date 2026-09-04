import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const SentimentChart = ({ messages }) => {
  // Process messages into a time-series for the chart
  // Group by rolling window (e.g. last 10 messages) to show trend of suspicious vs normal
  const chartData = useMemo(() => {
    // To make it look dynamic, we'll bucket the last 50 messages into groups of 5
    const buckets = [];
    const chunkSize = 5;
    
    // Reverse messages to process chronologically
    const chronoMessages = [...messages].reverse();
    
    for (let i = 0; i < chronoMessages.length; i += chunkSize) {
      const chunk = chronoMessages.slice(i, i + chunkSize);
      let suspiciousCount = 0;
      
      chunk.forEach(msg => {
        if (msg.nlp.is_bot || msg.nlp.cluster_id) suspiciousCount++;
      });
      
      buckets.push({
        time: i,
        volume: chunk.length,
        anomalyScore: (suspiciousCount / chunk.length) * 100 || 0
      });
    }
    
    // Ensure we have some empty data to fill the chart initially
    while (buckets.length < 10) {
      buckets.unshift({ time: -buckets.length, volume: 0, anomalyScore: 0 });
    }
    
    return buckets;
  }, [messages]);

  return (
    <div className="w-full h-full p-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorAnomaly" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis dataKey="time" hide />
          <YAxis stroke="#64748b" tick={{fontSize: 12}} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
            itemStyle={{ color: '#f8fafc' }}
          />
          <Area 
            type="monotone" 
            dataKey="anomalyScore" 
            name="Anomaly Score (%)"
            stroke="#ef4444" 
            fillOpacity={1} 
            fill="url(#colorAnomaly)" 
            animationDuration={300}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SentimentChart;
