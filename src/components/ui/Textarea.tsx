import type { TextareaHTMLAttributes } from "react";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className = "", rows = 3, ...rest }: Props) {
  return (
    <textarea
      rows={rows}
      className={`block w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-base text-valtext placeholder:text-valmuted/70 outline-none transition focus:border-valaccent/40 ${className}`}
      {...rest}
    />
  );
}
