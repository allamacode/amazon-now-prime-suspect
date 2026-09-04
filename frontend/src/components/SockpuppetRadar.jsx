import React, { useEffect, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

const SockpuppetRadar = ({ graphData }) => {
  const containerRef = useRef();
  const fgRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight
      });
    }
    
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Tune forces to push disconnected regions apart
  useEffect(() => {
    if (fgRef.current) {
      // Stronger repulsion so regional clusters push away from each other
      fgRef.current.d3Force('charge').strength(-300);
      
      // Keep fake links tight, let region links fan out
      fgRef.current.d3Force('link').distance(link => {
        return link.isFakeLink ? 20 : 80;
      });
    }
  }, []);

  const getNodeColor = (node) => {
    if (node.isRegionNode) return '#FF9900'; // Amazon Orange for Regions
    if (node.isFake) return '#ef4444'; // Red for fake/sockpuppet accounts
    return '#3b82f6'; // Default Blue for normal users
  };

  return (
    <div ref={containerRef} className="w-full h-full bg-slate-900/30 rounded-lg inset-0 absolute">
      {graphData.nodes.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center text-slate-500">
          Listening for sockpuppet clusters...
        </div>
      ) : (
        <ForceGraph2D
          ref={fgRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          nodeAutoColorBy="group"
          nodeRelSize={6}
          linkColor={(link) => link.isFakeLink ? 'rgba(239, 68, 68, 0.8)' : 'rgba(255, 255, 255, 0.2)'}
          linkWidth={(link) => link.isFakeLink ? 2 : 1}
          linkDirectionalParticles={(link) => link.isFakeLink ? 3 : 0}
          linkDirectionalParticleWidth={3}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const label = node.label || node.id;
            const fontSize = 12/globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;
            
            // Draw Node
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.isRegionNode ? 10 : 5, 0, 2 * Math.PI, false);
            ctx.fillStyle = getNodeColor(node);
            ctx.fill();
            
            // Draw Label
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillText(label, node.x, node.y + (node.isRegionNode ? 14 : 10));
          }}
          cooldownTicks={100}
        />
      )}
    </div>
  );
};

export default SockpuppetRadar;
