import React, { useState } from 'react';
import { Send, User, MapPin, Globe, AlertTriangle, ShieldCheck, Activity, Play, Plus, X, Trash2 } from 'lucide-react';

const ReviewCard = ({ review, onRemove }) => {
  const isEvaluated = !!review.result;
  let statusColor = "bg-slate-800/50 border-slate-700/50 text-slate-300";
  let statusText = "Pending Analysis";
  let Icon = Activity;
  
  if (isEvaluated) {
    const { is_bot, cluster_id } = review.result.nlp;
    if (is_bot || cluster_id) {
       statusColor = "bg-red-900/20 border-red-500/30 text-red-400";
       statusText = is_bot ? "High Prob Bot" : "Sockpuppet Cluster";
       Icon = AlertTriangle;
    } else {
       statusColor = "bg-green-900/20 border-green-500/30 text-green-400";
       statusText = "Normal User";
       Icon = ShieldCheck;
    }
  }

  return (
    <div className={`p-4 rounded border ${statusColor} relative group transition-colors`}>
      <button 
        onClick={() => onRemove(review._tempId)} 
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-400 transition-opacity"
        title="Remove from batch"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-center gap-2 mb-2">
         <User className="w-4 h-4" />
         <span className="font-semibold text-white">{review.user_id}</span>
         <span className="text-xs opacity-50 ml-auto mr-6">{review.region} • {review.ip_address}</span>
      </div>
      <p className="text-sm opacity-90 italic mb-3">"{review.text}"</p>
      
      <div className="flex items-center justify-between border-t border-current pt-3 mt-2 border-opacity-20">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
          <Icon className="w-4 h-4" /> {statusText}
        </div>
        {isEvaluated && (
          <div className="flex gap-4 text-xs font-mono opacity-80">
            <span>Score: {(review.result.nlp.bot_score * 100).toFixed(0)}%</span>
            <span>Cluster: {review.result.nlp.cluster_id || 'None'}</span>
          </div>
        )}
      </div>
      
      {isEvaluated && (
        <div className="mt-3 pt-3 border-t border-current border-opacity-10 grid grid-cols-3 gap-2 text-[10px] font-mono opacity-70">
          <div>UPPER: {(review.result.nlp.features[1] * 100).toFixed(0)}%</div>
          <div>EXCL: {(review.result.nlp.features[2] * 100).toFixed(0)}%</div>
          <div>ELLIPS: {(review.result.nlp.features[3] * 100).toFixed(0)}%</div>
        </div>
      )}
    </div>
  );
};

const Sandbox = () => {
  const [formData, setFormData] = useState({
    user_id: 'user_100',
    ip_address: '192.168.1.100',
    region: 'US-East',
    text: 'I really liked this product. It works exactly as described.'
  });
  
  const [stagedReviews, setStagedReviews] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handlePostReview = (e) => {
    e.preventDefault();
    if (!formData.user_id || !formData.text) return;
    
    // Add to queue with a temporary ID
    setStagedReviews([...stagedReviews, { ...formData, _tempId: Date.now(), result: null }]);
    
    // Clear text but keep user/ip/region to make posting easier for the same user
    setFormData({ ...formData, text: '' });
  };

  const handleAnalyzeBatch = async () => {
    if (stagedReviews.length === 0) return;
    setIsAnalyzing(true);

    try {
      const payload = {
        reviews: stagedReviews.map(r => ({
          user_id: r.user_id,
          text: r.text,
          region: r.region,
          ip_address: r.ip_address || "127.0.0.1"
        }))
      };

      const response = await fetch('http://127.0.0.1:8000/api/analyze-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const results = await response.json();
      
      // Merge results back into staged reviews
      const updatedReviews = stagedReviews.map((rev, idx) => ({
        ...rev,
        result: results[idx]
      }));
      setStagedReviews(updatedReviews);
    } catch (error) {
      console.error('Error analyzing batch:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  const removeReview = (id) => {
    setStagedReviews(stagedReviews.filter(r => r._tempId !== id));
  };

  const clearBatch = () => {
    setStagedReviews([]);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-[800px]">
      {/* Left Column: Input Form */}
      <div className="flex flex-col gap-4 h-full">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-300 shrink-0">
          <User className="w-5 h-5 text-slate-400" />
          Test Payload Generator
        </h2>
        
        <div className="glass-panel p-6 overflow-y-auto custom-scrollbar flex-1 flex flex-col">
          <form onSubmit={handlePostReview} className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm text-slate-400 flex items-center gap-1">
                  <User className="w-4 h-4" /> User ID
                </label>
                <select 
                  name="user_id"
                  value={formData.user_id}
                  onChange={handleChange}
                  className="bg-slate-800/50 border border-slate-700 rounded p-2.5 text-slate-200 outline-none focus:border-[#61C8EF]"
                >
                  <option value="user_100">user_100 (Normal)</option>
                  <option value="user_101">user_101 (Normal)</option>
                  <option value="user_102">user_102 (Normal)</option>
                  <option value="bot_1">bot_1 (Bot)</option>
                  <option value="sockpuppet_1">sockpuppet_1 (Sockpuppet)</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm text-slate-400 flex items-center gap-1">
                  <Globe className="w-4 h-4" /> IP Address
                </label>
                <select 
                  name="ip_address"
                  value={formData.ip_address}
                  onChange={handleChange}
                  className="bg-slate-800/50 border border-slate-700 rounded p-2.5 text-slate-200 outline-none focus:border-[#61C8EF]"
                >
                  <option value="192.168.1.100">192.168.1.100 (Clean Home IP)</option>
                  <option value="192.168.1.101">192.168.1.101 (Clean Home IP)</option>
                  <option value="45.33.20.1">45.33.20.1 (Datacenter / Bot IP)</option>
                  <option value="104.28.31.22">104.28.31.22 (Known Sockpuppet Farm IP)</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm text-slate-400 flex items-center gap-1">
                <MapPin className="w-4 h-4" /> Region
              </label>
              <select 
                name="region"
                value={formData.region}
                onChange={handleChange}
                className="bg-slate-800/50 border border-slate-700 rounded p-2.5 text-slate-200 outline-none focus:border-[#61C8EF]"
              >
                <option value="US-East">US-East</option>
                <option value="US-West">US-West</option>
                <option value="Europe">Europe</option>
                <option value="Asia">Asia</option>
                <option value="South America">South America</option>
              </select>
            </div>

            {/* Fix for the textarea expanding endlessly */}
            <div className="flex flex-col gap-2">
              <label className="text-sm text-slate-400 flex items-center gap-1">
                Review Text
              </label>
              <select 
                name="text"
                value={formData.text}
                onChange={handleChange}
                className="bg-slate-800/50 border border-slate-700 rounded p-3 text-slate-200 outline-none focus:border-[#61C8EF] overflow-hidden"
              >
                <option value="I really liked this product. It works exactly as described.">I really liked this product. It works exactly as described. (Normal)</option>
                <option value="Not bad, but the shipping was a bit slow.">Not bad, but the shipping was a bit slow. (Normal)</option>
                <option value="Five stars! Would highly recommend to anyone looking for this.">Five stars! Would highly recommend to anyone looking for this. (Normal)</option>
                <option value="It broke after two days. Very disappointed with the quality.">It broke after two days. Very disappointed with the quality. (Normal)</option>
                <option value="Decent value for the price, though the packaging was damaged.">Decent value for the price, though the packaging was damaged. (Normal)</option>
                <option value="buy now cheap discount great price buy now cheap discount">buy now cheap discount great price buy now cheap discount (Bot Spam)</option>
                <option value="best product best price best product best price click here">best product best price best product best price click here (Bot Spam)</option>
                <option value="ABSOLUTELY outstanding!!!! The craftsmanship... is beyond compare... definitely buying again!!!">ABSOLUTELY outstanding!!!! The craftsmanship... is beyond compare... definitely buying again!!! (Sockpuppet A)</option>
                <option value="TRULY remarkable!!!! The quality... is without equal... surely purchasing more!!!">TRULY remarkable!!!! The quality... is without equal... surely purchasing more!!! (Sockpuppet B)</option>
                <option value="SIMPLY fantastic!!!! The design... is unmatched... absolutely getting another!!!">SIMPLY fantastic!!!! The design... is unmatched... absolutely getting another!!! (Sockpuppet C)</option>
              </select>
            </div>

            <button 
              type="submit" 
              className="mt-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white font-bold py-3 rounded flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Post Review to Queue
            </button>
          </form>
          
          <div className="mt-8 p-4 bg-slate-800/30 rounded border border-slate-700/50 text-sm text-slate-400">
             <h4 className="font-semibold text-slate-300 mb-2">How Batch Testing Works:</h4>
             <ul className="list-disc pl-4 space-y-1 opacity-80">
               <li>Post multiple reviews to the queue.</li>
               <li>Click <strong>Run Analysis</strong> to evaluate them all at once.</li>
               <li>The NLP engine processes them sequentially, allowing it to detect similarities and <strong>Sockpuppet Clusters</strong> within your test batch.</li>
             </ul>
          </div>
        </div>
      </div>

      {/* Right Column: Batch Queue & Results */}
      <div className="flex flex-col gap-4 h-full">
        <div className="flex items-center justify-between shrink-0">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-300">
            <Activity className="w-5 h-5 text-slate-400" />
            Batch Queue ({stagedReviews.length})
          </h2>
          <div className="flex items-center gap-3">
             {stagedReviews.length > 0 && (
               <button 
                 onClick={clearBatch}
                 className="text-slate-400 hover:text-red-400 text-sm flex items-center gap-1 transition-colors"
               >
                 <Trash2 className="w-4 h-4" /> Clear
               </button>
             )}
             <button 
               onClick={handleAnalyzeBatch}
               disabled={stagedReviews.length === 0 || isAnalyzing}
               className="bg-[#61C8EF] hover:bg-[#4ab0d6] text-[#151D29] px-4 py-2 rounded font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
             >
               {isAnalyzing ? (
                 <><Activity className="w-4 h-4 animate-spin" /> Processing...</>
               ) : (
                 <><Play className="w-4 h-4" /> Run Analysis</>
               )}
             </button>
          </div>
        </div>
        
        <div className="glass-panel p-6 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 relative">
          {stagedReviews.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">
              No reviews in queue. Post a review to get started.
            </div>
          ) : (
            stagedReviews.map(rev => (
              <ReviewCard key={rev._tempId} review={rev} onRemove={removeReview} />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Sandbox;
