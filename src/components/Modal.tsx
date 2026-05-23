import React from "react";

type ModalProps = {
  children: React.ReactNode;
  onClose: () => void;
  open: boolean;
  title?: string;
};

export default function Modal({ children, onClose, open, title }: ModalProps) {
  if (!open) return null;

  return (
    <div className="modalOverlay" role="presentation" onClick={onClose}>
      <section className="modalCard" role="dialog" aria-modal="true" aria-label={title || "Janela"} onClick={(event) => event.stopPropagation()}>
        {title ? <h2>{title}</h2> : null}
        {children}
      </section>
    </div>
  );
}
