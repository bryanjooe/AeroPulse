import { AlertTriangle } from 'lucide-react';

export function ConfirmDialog({ title, description, confirmLabel = 'Confirm', onCancel, onConfirm }: { title: string; description: string; confirmLabel?: string; onCancel: () => void; onConfirm: () => void }) {
  return <div className="confirm-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onCancel(); }}><section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title"><div className="confirm-icon"><AlertTriangle size={20}/></div><h2 id="confirm-title">{title}</h2><p>{description}</p><div className="confirm-actions"><button className="button button-light" onClick={onCancel}>Keep record</button><button className="button button-danger" onClick={onConfirm}>{confirmLabel}</button></div></section></div>;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="table-empty"><div className="empty-art">✦</div><b>{title}</b><span>{description}</span></div>;
}
