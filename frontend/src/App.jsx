import React, { useState, useEffect, useRef } from 'react';
import { Activity, ShoppingCart, Users } from 'lucide-react';
import LiveFeed from './components/LiveFeed';
import SockpuppetRadar from './components/SockpuppetRadar';
import SentimentChart from './components/SentimentChart';
import Sandbox from './components/Sandbox';

function App() {
  const [messages, setMessages] = useState([]);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [activeTab, setActiveTab] = useState('live');
  const [selectedRegion, setSelectedRegion] = useState('All');
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    // Connect to WebSocket
    wsRef.current = new WebSocket('ws://localhost:8000/ws');

    wsRef.current.onopen = () => {
      setIsConnected(true);
    };

    wsRef.current.onclose = () => {
      setIsConnected(false);
      // Simple reconnect logic for demo purposes
      setTimeout(() => {
        if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
           window.location.reload();
        }
      }, 5000);
    };

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      // Update Live Feed
      setMessages((prev) => [data, ...prev].slice(0, 50)); // Keep last 50
      
      // Update Graph Data for Regions & Sockpuppets
      setGraphData((prev) => {
        // Clean up any ghost cluster hubs from previous versions
        const newNodes = prev.nodes.filter(n => !n.isClusterNode && n.label !== 'Fingerprint Match');
        const newLinks = [...prev.links];
        
        const existingNode = newNodes.find(n => n.id === data.user_id);
        const isFake = !!data.nlp.cluster_id || data.nlp.is_bot;
        
        // FORCE users to stay in their original region.
        // The mock backend assigns regions randomly, which causes a single user to jump between 
        // regions. This creates cross-region bridges that pull the graph into a single blob!
        if (existingNode) {
          data.region = existingNode.region;
        }
        
        // Ensure region node exists
        const regionNodeId = `region_${data.region}`;
        if (!newNodes.find(n => n.id === regionNodeId)) {
          newNodes.push({ id: regionNodeId, isRegionNode: true, label: data.region });
        }
        
        if (existingNode) {
          existingNode.isFake = isFake;
          existingNode.clusterId = data.nlp.cluster_id;
        } else {
          newNodes.push({ id: data.user_id, region: data.region, isFake, clusterId: data.nlp.cluster_id });
        }
        
        // Helper to handle react-force-graph's habit of mutating string IDs into node objects
        const getSafeId = (obj) => typeof obj === 'object' && obj !== null ? obj.id : obj;
        
        // Link user to region ONLY if they don't already have one
        const hasRegionLink = newLinks.some(l => 
          getSafeId(l.source) === data.user_id && String(getSafeId(l.target)).startsWith('region_')
        );
        
        if (!hasRegionLink) {
          newLinks.push({ source: data.user_id, target: regionNodeId });
        }
        
        // Link fake accounts of the same user together
        if (isFake) {
          // ONLY link if they are in the exact same region to keep regions totally isolated
          const sibling = newNodes.find(n => 
            n.clusterId === data.nlp.cluster_id && 
            n.id !== data.user_id && 
            n.region === data.region
          );
          if (sibling) {
             const linkExists = newLinks.find(l => {
               const srcId = getSafeId(l.source);
               const tgtId = getSafeId(l.target);
               return (srcId === data.user_id && tgtId === sibling.id) || 
                      (tgtId === data.user_id && srcId === sibling.id);
             });
             if (!linkExists) {
               newLinks.push({ source: data.user_id, target: sibling.id, isFakeLink: true });
             }
          }
        }
        
        return { nodes: newNodes, links: newLinks };
      });
    };

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const getSafeIdForFilter = (obj) => typeof obj === 'object' && obj !== null ? obj.id : obj;
  
  const filteredNodes = selectedRegion === 'All' 
    ? graphData.nodes 
    : graphData.nodes.filter(n => n.region === selectedRegion || n.id === `region_${selectedRegion}`);
    
  const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
  
  const filteredLinks = selectedRegion === 'All'
    ? graphData.links
    : graphData.links.filter(l => filteredNodeIds.has(getSafeIdForFilter(l.source)) && filteredNodeIds.has(getSafeIdForFilter(l.target)));
    
  const filteredGraphData = { nodes: filteredNodes, links: filteredLinks };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="glass-header sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          
          {/* Pure CSS/SVG Amazon Now Logo */}
          <div className="flex items-center select-none pt-1">
            <div className="relative">
              <span className="text-[28px] font-bold tracking-tighter text-white leading-none" style={{ letterSpacing: '-0.06em', fontFamily: 'Arial, sans-serif' }}>amazon</span>
              {/* Amazon Smile - Official Vector Path */}
              <svg viewBox="85 110 365 75" className="w-[72px] absolute -bottom-[12px] left-[6px] text-white fill-current overflow-visible">
                 <path d="m 374.00642,142.18404 c -34.99948,25.79739 -85.72909,39.56123 -129.40634,39.56123 -61.24255,0 -116.37656,-22.65135 -158.08757,-60.32496 -3.2771,-2.96252 -0.34083,-6.9999 3.59171,-4.69283 45.01431,26.19064 100.67269,41.94697 158.16623,41.94697 38.774689,0 81.4295,-8.02237 120.6499,-24.67006 5.92501,-2.51683 10.87999,3.88009 5.08607,8.17965" />
                 <path d="m 388.55678,125.53635 c -4.45688,-5.71527 -29.57261,-2.70033 -40.84585,-1.36327 -3.43442,0.41947 -3.95874,-2.56925 -0.86517,-4.71905 20.00346,-14.07844 52.82696,-10.01483 56.65462,-5.2958 3.82764,4.74526 -0.99624,37.64741 -19.79373,53.35128 -2.88385,2.41195 -5.63662,1.12734 -4.35198,-2.07113 4.2209,-10.53917 13.68519,-34.16054 9.20211,-39.90203" />
              </svg>
            </div>
            <div className="ml-1.5 bg-[#61C8EF] px-1.5 py-0.5 transform -skew-x-[15deg] flex items-center justify-center">
              <span className="text-[#151D29] text-[20px] font-black italic transform skew-x-[15deg] flex items-center leading-none" style={{ letterSpacing: '-0.05em' }}>
                n
                <div className="relative mx-[2px] flex items-center justify-center">
                   <div className="bg-[#151D29] rounded-full w-[17px] h-[17px] flex items-center justify-center">
                     <svg viewBox="0 0 24 24" className="w-[10px] h-[10px] text-[#61C8EF] fill-current">
                       <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round"/>
                     </svg>
                   </div>
                </div>
                w
              </span>
            </div>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center h-full">
            <span className="text-slate-400 text-lg font-normal ml-3 border-l border-slate-600 pl-4 h-[30px] flex items-center">Platform Integrity</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm border ${isConnected ? 'indicator-human' : 'indicator-bot'}`}>
            <Activity className="w-4 h-4" />
            {isConnected ? 'Stream Active' : 'Disconnected'}
          </div>
        </div>
      </header>

      {/* Tabs Navigation */}
      <div className="px-6 py-2 border-b border-slate-700/50 flex items-center gap-6">
        <button 
          onClick={() => setActiveTab('live')}
          className={`pb-2 px-1 border-b-2 font-semibold transition-colors ${activeTab === 'live' ? 'border-[#61C8EF] text-white' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
        >
          Live Radar
        </button>
        <button 
          onClick={() => setActiveTab('sandbox')}
          className={`pb-2 px-1 border-b-2 font-semibold transition-colors ${activeTab === 'sandbox' ? 'border-[#61C8EF] text-white' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
        >
          Sandbox Mode
        </button>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-6">
        {activeTab === 'sandbox' ? (
          <Sandbox />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Live Feed */}
            <div className="lg:col-span-1 flex flex-col gap-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-300">
                <Activity className="w-5 h-5 text-slate-400" />
                Live Analysis Feed
              </h2>
              <div className="glass-panel flex-1 overflow-hidden flex flex-col h-[800px]">
                 <LiveFeed messages={messages} />
              </div>
            </div>

            {/* Right Column: Analytics & Graph */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              
              {/* Top Row: Sockpuppet Radar */}
              <div className="flex flex-col gap-4 h-[450px]">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-300">
                    <Users className="w-5 h-5 text-slate-400" />
                    Sockpuppet Radar (Linguistic Clusters)
                  </h2>
                  <select 
                    className="bg-slate-800 text-sm text-slate-300 border border-slate-700 rounded px-3 py-1.5 outline-none focus:border-[#FF9900]"
                    value={selectedRegion}
                    onChange={(e) => setSelectedRegion(e.target.value)}
                  >
                    <option value="All">All Regions</option>
                    <option value="US-East">US-East</option>
                    <option value="US-West">US-West</option>
                    <option value="Europe">Europe</option>
                    <option value="Asia">Asia</option>
                    <option value="South America">South America</option>
                  </select>
                </div>
                <div className="glass-panel flex-1 overflow-hidden relative">
                  <SockpuppetRadar graphData={filteredGraphData} />
                </div>
              </div>

              {/* Bottom Row: Sentiment/Volume */}
              <div className="flex flex-col gap-4 h-[300px]">
                 <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-300">
                  <Activity className="w-5 h-5 text-slate-400" />
                  Anomaly Detection
                </h2>
                <div className="glass-panel flex-1">
                  <SentimentChart messages={messages} />
                </div>
              </div>

            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
