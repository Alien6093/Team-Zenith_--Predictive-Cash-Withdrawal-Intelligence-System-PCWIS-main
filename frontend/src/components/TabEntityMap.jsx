import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { ReactFlow, MiniMap, Controls, Background, useNodesState, useEdgesState, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Network, Server, MonitorSmartphone, Shield, AlertTriangle } from 'lucide-react';
import SharedModal from './SharedModal';

export default function TabEntityMap() {
  const [cases, setCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [graphData, setGraphData] = useState(null);
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  const [selectedNodeData, setSelectedNodeData] = useState(null);
  const [modalConfig, setModalConfig] = useState({ isOpen: false });

  useEffect(() => {
    api.getDemoCases().then(res => {
      setCases(res.cases);
      if (res.cases.length > 0) {
        setSelectedCaseId(res.cases[0].case_ref);
      }
    });
  }, []);

  useEffect(() => {
    if (selectedCaseId) {
      loadGraph();
    }
  }, [selectedCaseId]);

  const loadGraph = async () => {
    try {
      const data = await api.getDemoGraph(selectedCaseId);
      setGraphData(data);
      
      const styledNodes = data.nodes.map(n => ({
        ...n,
        style: {
          background: '#fff',
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          padding: '10px',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          width: 150,
          textAlign: 'center',
          fontSize: '12px',
          fontWeight: 'bold'
        }
      }));
      
      const styledEdges = data.edges.map(e => ({
        ...e,
        style: { stroke: '#64748b', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' },
        labelStyle: { fill: '#334155', fontWeight: 'bold' }
      }));

      setNodes(styledNodes);
      setEdges(styledEdges);
      setSelectedNodeData(null);
    } catch (err) {
      console.error(err);
    }
  };

  const onNodeClick = useCallback((event, node) => {
    setSelectedNodeData(node.data);
  }, []);

  const openActionModal = (actionType) => {
    let actionFields = [];
    if (actionType === 'Bank Freeze Request') {
      actionFields = [{ id: 'note', label: 'Authorizing Officer Note', placeholder: 'Enter official order reference...' }];
    }

    setModalConfig({
      isOpen: true,
      title: `${actionType.toUpperCase()} AUTHORIZATION`,
      actionType,
      caseData: { case_ref: selectedCaseId, linked_mule_bank: selectedNodeData?.bank || 'Unknown' },
      actionFields,
      buttonText: `Confirm ${actionType.split(' ')[0]}`
    });
  };

  return (
    <div className="flex h-full gap-4 animate-in fade-in">
      {/* Main Flow Area */}
      <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col relative">
        <div className="bg-white px-4 py-3 border-b border-slate-200 flex justify-between items-center z-10">
          <div className="flex items-center gap-3">
            <Network size={18} className="text-indigo-600" />
            <select 
              value={selectedCaseId} 
              onChange={e => setSelectedCaseId(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-sm font-semibold focus:outline-none focus:border-indigo-500 min-w-[250px]"
            >
              {cases.map(c => (
                <option key={c.case_ref} value={c.case_ref}>{c.case_ref} - {c.fraud_category}</option>
              ))}
            </select>
          </div>
          {graphData && (
            <div className="bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-md text-xs font-bold text-indigo-800 flex items-center gap-2">
              <Server size={14} /> MODEL CONFIDENCE: {graphData.confidence}%
            </div>
          )}
        </div>
        
        <div className="flex-1 h-full w-full">
          <ReactFlow 
            nodes={nodes} 
            edges={edges} 
            onNodesChange={onNodesChange} 
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            fitView
          >
            <Background color="#ccc" gap={16} />
            <Controls />
            <MiniMap nodeStrokeColor="#indigo" nodeColor="#e2e8f0" />
          </ReactFlow>
        </div>
      </div>

      {/* Forensic Node Inspection Panel */}
      <div className="w-80 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col shrink-0">
        <div className="bg-slate-900 px-4 py-3 flex items-center gap-2 text-white">
          <MonitorSmartphone size={16} />
          <h3 className="font-bold text-sm m-0 uppercase">Forensic Inspection</h3>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto">
          {selectedNodeData ? (
            <div className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="text-xs text-slate-500 uppercase font-bold mb-1">Node Type</div>
                <div className="font-semibold text-slate-800 capitalize">{selectedNodeData.type}</div>
              </div>
              
              <div className="space-y-2 text-sm">
                {Object.entries(selectedNodeData).filter(([k]) => k !== 'type' && k !== 'label').map(([key, value]) => (
                  <div key={key} className="flex flex-col border-b border-slate-100 pb-2">
                    <span className="text-xs text-slate-500 uppercase font-bold">{key.replace('_', ' ')}</span>
                    <span className="font-mono text-slate-800 font-semibold">{value.toString()}</span>
                  </div>
                ))}
              </div>

              {selectedNodeData.type === 'mule' && (
                <div className="mt-6 pt-4 border-t border-slate-200 space-y-3">
                  <div className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1"><AlertTriangle size={14} className="text-amber-500"/> Directives</div>
                  <button onClick={() => openActionModal('Bank Freeze Request')} className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-xs font-bold flex justify-center items-center gap-2 transition-colors">
                    <Shield size={14} /> Issue Freeze on Node
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-center text-slate-400 text-sm">
              Select a node in the graph to inspect its properties and issue directives.
            </div>
          )}
        </div>
      </div>

      <SharedModal 
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ isOpen: false })}
        {...modalConfig}
      />
    </div>
  );
}
