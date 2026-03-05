'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/Dialog';
import { Step1Form } from './Step1Form';
import { Step2Launch } from './Step2Launch';

export interface CreateStrategyFormState {
  mode: 'simple' | 'advanced';
  strategyName: string;
  indicatorId: string;
  tradingPairs: string[];
  initialCapital: number;
  marketType: 'futures' | 'spot';
  leverage: number;
  tradeDirection: 'long_only' | 'short_only' | 'both';
  klinePeriod: string;
  risk: {
    stopLossPct: number;
    takeProfitPct: number;
    trailingStop: boolean;
    trailingTriggerPct: number;
    trailingDistancePct: number;
  };
  scaleIn: {
    trendFollowing: boolean;
    trendTriggerPct: number;
    trendSizePct: number;
    maxTrendTimes: number;
    meanReversionDca: boolean;
    dcaTriggerPct: number;
    dcaSizePct: number;
    maxDcaTimes: number;
  };
  scaleOut: {
    trendReduce: boolean;
    trendTriggerPct: number;
    reduceSizePct: number;
    maxTrendReduceTimes: number;
    adverseReduce: boolean;
    adverseTriggerPct: number;
    adverseReduceSizePct: number;
    maxAdverseReduceTimes: number;
  };
  entrySizing: {
    entrySizePct: number;
  };
  aiFilterEnabled: boolean;
  strategyType: 'single' | 'cross_sectional';
  launchMode: 'paper' | 'live';
  credentialId: number | '';
}

const defaultFormState: CreateStrategyFormState = {
  mode: 'simple',
  strategyName: '',
  indicatorId: '',
  tradingPairs: [],
  initialCapital: 1000,
  marketType: 'futures',
  leverage: 5,
  tradeDirection: 'long_only',
  klinePeriod: '15m',
  risk: {
    stopLossPct: 3,
    takeProfitPct: 6,
    trailingStop: false,
    trailingTriggerPct: 0,
    trailingDistancePct: 0,
  },
  scaleIn: {
    trendFollowing: false,
    trendTriggerPct: 0,
    trendSizePct: 0,
    maxTrendTimes: 0,
    meanReversionDca: false,
    dcaTriggerPct: 0,
    dcaSizePct: 0,
    maxDcaTimes: 0,
  },
  scaleOut: {
    trendReduce: false,
    trendTriggerPct: 0,
    reduceSizePct: 0,
    maxTrendReduceTimes: 0,
    adverseReduce: false,
    adverseTriggerPct: 0,
    adverseReduceSizePct: 0,
    maxAdverseReduceTimes: 0,
  },
  entrySizing: {
    entrySizePct: 100,
  },
  aiFilterEnabled: false,
  strategyType: 'single',
  launchMode: 'paper',
  credentialId: '',
};

interface CreateStrategyModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateStrategyModal({ open, onClose, onSuccess }: CreateStrategyModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [formState, setFormState] = useState<CreateStrategyFormState>(defaultFormState);

  const handleClose = () => {
    setStep(1);
    setFormState(defaultFormState);
    onClose();
  };

  const handleStep1Next = () => setStep(2);
  const handleStep2Back = () => setStep(1);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0">
          <DialogTitle>Create Strategy</DialogTitle>
          <DialogClose asChild>
            <button
              type="button"
              className="rounded p-1.5 text-text-muted hover:bg-bg-elevated hover:text-text-primary"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </DialogClose>
        </DialogHeader>

        {step === 1 && (
          <Step1Form
            formState={formState}
            setFormState={setFormState}
            onNext={handleStep1Next}
            onCancel={handleClose}
          />
        )}

        {step === 2 && (
          <Step2Launch
            formState={formState}
            onBack={handleStep2Back}
            onCreate={onSuccess}
            onCancel={handleClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
