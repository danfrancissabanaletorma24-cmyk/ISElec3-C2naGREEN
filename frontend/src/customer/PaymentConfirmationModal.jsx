import { useState } from 'react';
import { CreditCard, Wallet } from 'lucide-react';
import Modal from './Modal';

const WALLET_METHODS = ['gcash', 'maya'];

export default function PaymentConfirmationModal({
  open,
  onClose,
  onConfirm,
  method,
  identifier,
  amount,
  processing = false,
}) {
  const [code, setCode] = useState('');
  const isWallet = WALLET_METHODS.includes(method);
  const label = isWallet ? `${method === 'gcash' ? 'GCash' : 'Maya'} PIN` : 'CVV';

  const submit = async (event) => {
    event.preventDefault();
    const valid = isWallet ? /^\d{4}$/.test(code) : /^\d{3,4}$/.test(code);
    if (!valid) return;
    await onConfirm(code);
    setCode('');
  };

  const close = () => {
    setCode('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Confirm your payment"
      description="Enter your payment method's security code to continue."
      footer={(
        <>
          <button
            type="button"
            onClick={close}
            disabled={processing}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="payment-confirmation-form"
            disabled={processing || (isWallet ? !/^\d{4}$/.test(code) : !/^\d{3,4}$/.test(code))}
            className="rounded-xl bg-[#0056FF] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-800 disabled:opacity-60"
          >
            {processing ? 'Processing…' : amount ? `Pay ${amount}` : 'Confirm payment'}
          </button>
        </>
      )}
    >
      <form id="payment-confirmation-form" onSubmit={submit} className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
          {isWallet ? <Wallet className="h-5 w-5 text-[#0056FF]" /> : <CreditCard className="h-5 w-5 text-[#0056FF]" />}
          <span className="font-semibold text-slate-800">
            {isWallet ? (method === 'gcash' ? 'GCash' : 'Maya') : 'Saved card'}
            {identifier ? ` · ${identifier}` : ''}
          </span>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</span>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            required
            maxLength={4}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 4))}
            aria-label={label}
            placeholder={isWallet ? '••••' : '•••'}
            className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#0056FF] focus:ring-2 focus:ring-[#0056FF]/20"
          />
        </label>
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Enter your {isWallet ? '4-digit' : '3-4 digit'} {label} to confirm your payment. This is a security measure to protect your account.
        </p>
      </form>
    </Modal>
  );
}
