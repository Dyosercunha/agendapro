import React from "react";

type CardProps = React.HTMLAttributes<HTMLElement> & {
  as?: "article" | "aside" | "div" | "section";
};

export default function Card({ as: Element = "section", className = "", ...props }: CardProps) {
  return <Element {...props} className={["card", className].filter(Boolean).join(" ")} />;
}
