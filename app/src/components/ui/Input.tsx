interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
}

export function Input({ label, className = '', ...props }: InputProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-white/60">{label}</span>
      <input
        className={`w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white outline-none transition focus:border-accent/50 focus:ring-2 focus:ring-accent/20 ${className}`}
        {...props}
      />
    </label>
  )
}

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
}

export function TextArea({ label, className = '', ...props }: TextAreaProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-white/60">{label}</span>
      <textarea
        className={`min-h-24 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white outline-none transition focus:border-accent/50 focus:ring-2 focus:ring-accent/20 ${className}`}
        {...props}
      />
    </label>
  )
}
