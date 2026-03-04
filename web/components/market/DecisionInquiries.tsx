'use client';

import { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

export interface DecisionInquiry {
  id: string;
  inquiry: string;
  createdAt?: Date | string;
}

interface DecisionInquiriesProps {
  inquiries: DecisionInquiry[];
}

export function DecisionInquiries({ inquiries }: DecisionInquiriesProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  if (inquiries.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4">Structural Decision Inquiries</h3>
        <div className="text-center py-8 text-text-muted">
          No decision inquiries available at this time.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <HelpCircle className="w-5 h-5 text-accent-primary" />
        <h3 className="text-xl font-semibold">Structural Decision Inquiries</h3>
      </div>

      <div className="space-y-3">
        {inquiries.map((inquiry, index) => (
          <div
            key={inquiry.id}
            className="bg-white/[0.02] border border-border rounded-lg overflow-hidden"
          >
            <button
              onClick={() => toggleExpand(inquiry.id)}
              className="w-full p-4 flex items-center justify-between hover:bg-white/[0.03] transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-text-primary">
                  Inquiry {index + 1}
                </span>
                <HelpCircle className="w-4 h-4 text-accent-primary" />
              </div>
              {expanded[inquiry.id] ? (
                <ChevronUp className="w-4 h-4 text-text-muted" />
              ) : (
                <ChevronDown className="w-4 h-4 text-text-muted" />
              )}
            </button>

            {expanded[inquiry.id] && (
              <div className="px-4 pb-4 pt-2 border-t border-border">
                <p className="text-sm text-text-secondary leading-relaxed">{inquiry.inquiry}</p>
              </div>
            )}

            {!expanded[inquiry.id] && (
              <div className="px-4 pb-4 pt-2 border-t border-border">
                <p className="text-sm text-text-secondary line-clamp-2">{inquiry.inquiry}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

