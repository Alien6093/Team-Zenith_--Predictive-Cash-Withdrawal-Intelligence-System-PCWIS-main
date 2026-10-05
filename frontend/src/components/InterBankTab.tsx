import React from 'react';
import { RefreshCw, Landmark, AlertTriangle, ShieldCheck } from 'lucide-react';
import { BankDirective } from '../types/pcwis';

interface Props {
  directives: BankDirective[];
  onOpenModal: (type: 'FREEZE', caseRef?: string) => void;
}

export const InterBankTab: React.FC<Props> = ({ directives, onOpenModal }) => {
  return (
    <div className="gov-card flex flex-col min-h-[500px]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gov-border pb-4 mb-4 gap-4">
        <div>
          <h3 className="text-sm font-bold uppercase text-gov-navy tracking-wider">
            INTER-BANK NODAL COORDINATION & FREEZE PROTOCOL TRACKER (RBI 1930 FRAMEWORK)
          </h3>
          <p className="text-[10px] text-gov-text-muted mt-1 uppercase tracking-wide">
            Real-time API gateway status for Sec 102 BNSS automated liens
          </p>
        </div>
        <button className="gov-btn gov-btn-secondary flex items-center gap-2">
          <RefreshCw size={14} /> SYNC BANK API GATEWAY
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="gov-table">
          <thead>
            <tr>
              <th>Banking Entity</th>
              <th>RBI Code</th>
              <th>Directive Ref</th>
              <th>Nodal Contact</th>
              <th>Active Liens</th>
              <th>Secured (Today)</th>
              <th>Avg Latency</th>
              <th>Gateway Status</th>
              <th>Action Protocol</th>
            </tr>
          </thead>
          <tbody>
            {directives.map(dir => (
              <tr key={dir.rbiCode}>
                <td>
                  <div className="flex items-center gap-2">
                    <Landmark size={14} className="text-gov-navy" />
                    <span className="font-bold text-xs uppercase">{dir.bankName}</span>
                  </div>
                </td>
                <td className="font-mono text-xs text-gov-text-muted">{dir.rbiCode}</td>
                <td className="font-mono text-xs font-bold">{dir.referenceNo}</td>
                <td className="text-xs">{dir.nodelOfficerContact}</td>
                <td className="font-mono text-xs font-bold text-gov-navy">{dir.activeFreezeCount.toLocaleString()}</td>
                <td className="font-mono text-xs font-bold text-gov-green">₹{dir.fundsSecuredTodayCr}Cr</td>
                <td className="font-mono text-xs">{dir.avgResponseTimeMin} min</td>
                <td>
                  {dir.status === 'OPTIMAL' && <span className="gov-badge gov-badge-success flex w-fit items-center gap-1"><ShieldCheck size={10} /> OPTIMAL</span>}
                  {dir.status === 'MODERATE_DELAY' && <span className="gov-badge gov-badge-warning flex w-fit items-center gap-1"><AlertTriangle size={10} /> DELAYED</span>}
                  {dir.status === 'ESCALATED' && <span className="gov-badge gov-badge-critical flex w-fit items-center gap-1"><AlertTriangle size={10} /> ESCALATED</span>}
                </td>
                <td>
                  <button onClick={() => onOpenModal('FREEZE')} className="gov-btn gov-btn-primary py-1 px-2 text-[10px]">
                    ISSUE DIRECT LIEN
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
