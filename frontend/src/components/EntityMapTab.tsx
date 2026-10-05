import React, { useState, useEffect } from 'react';
import { Complaint } from '../types/pcwis';
import { Network, ShieldAlert } from 'lucide-react';
import { ReactFlow, Background, Controls, Node, Edge, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { fetchWithToken } from '../api';
import { CustomEntityNode } from './CustomEntityNode';

const nodeTypes = { custom: CustomEntityNode };

interface Props {
  complaints: Complaint[];
  token: string;
}

export const EntityMapTab: React.FC<Props> = ({ complaints, token }) => {
  const [selectedCase, setSelectedCase] = useState<string>('');
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(false);
  const [engineType, setEngineType] = useState('Graph Engine');

  useEffect(() => {
    if (complaints.length > 0 && !selectedCase) {
      setSelectedCase(complaints[0].caseRef);
    }
  }, [complaints, selectedCase]);

  useEffect(() => {
    if (!selectedCase || !token) return;
    
    const fetchGraph = async () => {
      setLoading(true);
      try {
        const data = await fetchWithToken(`/graph/${selectedCase}`, token);
        
        // Map backend graph to React Flow format
        const mappedNodes: Node[] = data.nodes.map((n: any, i: number) => {
          let x = n.position?.x || 250;
          let y = n.position?.y || (i * 100 + 50);

          const nodeType = n.type || n.data?.type || 'UNKNOWN';
          const nodeLabel = n.label || n.data?.label || 'Unknown';
          const nodeDetail = n.detail || n.data?.ref || n.data?.imei || (n.data?.amount ? `₹${n.data.amount}` : '');

          // Improve layout clustering if coordinates aren't provided
          if (!n.position) {
            const upperType = nodeType.toUpperCase();
            if (upperType === 'VICTIM') { x = 150; y = 250; }
            if (upperType === 'MULE_ACCOUNT' || upperType === 'MULE') { x = 400; y = 250; }
            if (upperType === 'DEVICE_IMEI' || upperType === 'DEVICE') { x = 400; y = 100; }
            if (upperType === 'ATM_LOCATION' || upperType === 'ATM') { x = 650; y = 250; }
            if (upperType === 'ACCOUNT') { x = 400; y = 400; }
          }
          
          return {
            id: n.id,
            type: 'custom',
            position: { x, y },
            data: { 
              type: nodeType,
              label: nodeLabel,
              detail: nodeDetail
            }
          };
        });

        const mappedEdges: Edge[] = data.edges.map((e: any, i: number) => {
          const edgeLabel = e.label || (e.data && e.data.label) || '';
          return {
            id: e.id || `e${i}`,
            source: e.source,
            target: e.target,
            label: edgeLabel,
            animated: e.animated !== undefined ? e.animated : (edgeLabel === 'TRANSFERRED_TO' || edgeLabel === 'CASH_WITHDRAWAL'),
            style: { stroke: '#9CA3AF', strokeWidth: 2 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
              color: '#9CA3AF',
            },
            labelStyle: { fill: '#4B5563', fontWeight: 700, fontSize: 10, fontFamily: 'monospace' },
            labelBgStyle: { fill: 'rgba(255, 255, 255, 0.9)', color: '#fff' },
            labelBgPadding: [4, 2],
            labelBgBorderRadius: 4,
          };
        });

        setNodes(mappedNodes);
        setEdges(mappedEdges);
        setEngineType(data.graph_backend);
      } catch (err) {
        console.error("Failed to fetch graph data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchGraph();
  }, [selectedCase, token]);

  const complaint = complaints.find(c => c.caseRef === selectedCase);

  return (
    <div className="gov-card flex flex-col h-[600px]">
      <div className="flex items-center justify-between border-b border-gov-border pb-3 mb-4">
        <h3 className="text-sm font-bold uppercase text-gov-navy tracking-wider flex items-center gap-2">
          <Network size={18} />
          Entity Relationship Architecture (Layer 5)
        </h3>
        <select 
          value={selectedCase} 
          onChange={e => setSelectedCase(e.target.value)}
          className="border border-gov-border px-3 py-1.5 rounded-sm text-xs font-mono font-bold focus:outline-none focus:border-gov-navy"
        >
          {complaints.map(c => (
            <option key={c.caseRef} value={c.caseRef}>{c.caseRef} - {c.fraudCategory}</option>
          ))}
        </select>
      </div>

      {complaint ? (
        <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
          
          <div className="lg:w-2/3 h-full w-full bg-[#F8FAFC] border border-gray-200 relative overflow-hidden">
            <div className="absolute top-2 left-2 bg-gov-navy text-white text-[9px] font-mono px-2 py-0.5 rounded-sm z-10">
              GRAPH_ENGINE: {engineType}
            </div>
            
            {loading ? (
              <div className="flex items-center justify-center h-full w-full">
                <span className="text-xs uppercase font-bold text-gov-navy animate-pulse">Computing Subgraph...</span>
              </div>
            ) : (
              <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView>
                <Background color="#D1D5DB" gap={16} />
                <Controls />
              </ReactFlow>
            )}
          </div>

          <div className="lg:w-1/3 border border-gov-border bg-white flex flex-col">
            <div className="bg-gov-navy text-white px-3 py-2 text-xs font-bold uppercase tracking-wider flex justify-between items-center">
              <span>Entity Dossier</span>
              <span className="bg-white text-gov-navy px-1.5 py-0.5 text-[10px] rounded-sm font-mono">CONFIDENCE: 94.2%</span>
            </div>
            
            <div className="p-4 flex flex-col gap-4 overflow-y-auto">
              <div>
                <h4 className="text-[10px] font-bold uppercase text-gov-text-muted mb-1 border-b border-gray-100 pb-1">Mule Account Profile</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <span className="text-gov-text-muted">Account Ref:</span><span className="font-mono font-bold text-gov-navy">{complaint.muleAccountRef}</span>
                  <span className="text-gov-text-muted">Banking Entity:</span><span className="font-bold">{complaint.muleBank}</span>
                  <span className="text-gov-text-muted">Branch Node:</span><span>{complaint.muleBranchCity}</span>
                  <span className="text-gov-text-muted">Status:</span>
                  <span className="gov-badge gov-badge-critical text-[9px] w-fit">LIEN PENDING</span>
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-bold uppercase text-gov-text-muted mb-1 border-b border-gray-100 pb-1">Digital Footprint</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <span className="text-gov-text-muted">Linked IMEI:</span><span className="font-mono">{complaint.linkedIMEI}</span>
                  <span className="text-gov-text-muted">Origin IP:</span><span className="font-mono">{complaint.ipAddress}</span>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 p-3 mt-2 rounded-sm">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldAlert size={14} className="text-gov-red" />
                  <h4 className="text-[11px] font-bold uppercase text-gov-red">Syndicate Intelligence</h4>
                </div>
                <p className="text-xs text-gov-text leading-relaxed">
                  This transaction flow strongly correlates with known typologies of <strong className="font-mono">{complaint.associatedSyndicate}</strong>. The rapid transfer from victim source to the flagged {complaint.muleBank} account suggests an imminent physical cash-out at {complaint.atmTargetLocation} within {complaint.predictedTimeWindow}.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gov-text-muted text-sm font-mono uppercase">
          Select a case to render entity graph.
        </div>
      )}
    </div>
  );
};
