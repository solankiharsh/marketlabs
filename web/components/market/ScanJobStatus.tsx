'use client';

import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { getScanJobStatus, ScanJob } from '@/lib/api';
import { toast } from 'sonner';

interface ScanJobStatusProps {
  jobId: string;
  onComplete?: () => void;
  onError?: () => void;
}

export function ScanJobStatus({ jobId, onComplete, onError }: ScanJobStatusProps) {
  const [job, setJob] = useState<ScanJob | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let pollInterval: NodeJS.Timeout;
    let isMounted = true;

    const pollJobStatus = async () => {
      try {
        const jobStatus = await getScanJobStatus(jobId);
        if (isMounted) {
          setJob(jobStatus);
          setLoading(false);

          if (jobStatus.status === 'completed') {
            if (pollInterval) clearInterval(pollInterval);
            toast.success(`Scan complete: ${jobStatus.results?.scanned || 0} assets scanned`);
            onComplete?.();
          } else if (jobStatus.status === 'failed') {
            if (pollInterval) clearInterval(pollInterval);
            toast.error(`Scan failed: ${jobStatus.error || 'Unknown error'}`);
            onError?.();
          }
        }
      } catch (error: any) {
        console.error('[ScanJobStatus] Error polling job:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Poll immediately, then every 2 seconds
    pollJobStatus();
    pollInterval = setInterval(pollJobStatus, 2000);

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [jobId, onComplete, onError]);

  if (loading && !job) {
    return (
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-accent-primary" />
          <div className="flex-1">
            <div className="text-sm font-semibold">Initializing scan...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return null;
  }

  const getStatusIcon = () => {
    switch (job.status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-success" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-error" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 animate-spin text-accent-primary" />;
      default:
        return <RefreshCw className="w-5 h-5 text-text-muted" />;
    }
  };

  const getStatusText = () => {
    switch (job.status) {
      case 'pending':
        return 'Pending';
      case 'processing':
        return 'Processing';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center gap-3 mb-3">
        {getStatusIcon()}
        <div className="flex-1">
          <div className="text-sm font-semibold">{getStatusText()}</div>
          {job.status === 'processing' && (
            <div className="text-xs text-text-muted mt-1">
              {job.scannedAssets} / {job.totalAssets || '?'} assets scanned
            </div>
          )}
        </div>
      </div>

      {job.status === 'processing' && (
        <div className="w-full bg-white/[0.05] rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-accent-primary transition-all duration-300"
            style={{ width: `${job.progress}%` }}
          />
        </div>
      )}

      {job.status === 'completed' && job.results && (
        <div className="text-xs text-text-muted mt-2">
          Successfully scanned {job.results.scanned} of {job.results.total} assets
        </div>
      )}

      {job.status === 'failed' && job.error && (
        <div className="text-xs text-error mt-2">{job.error}</div>
      )}
    </div>
  );
}

