import React from "react";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "dark" | "danger";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  full?: boolean;
  variant?: ButtonVariant;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "green",
  secondary: "",
  outline: "outline",
  ghost: "ghostButton",
  dark: "black",
  danger: "dangerButton",
};

export default function Button({
  className = "",
  full = true,
  type = "button",
  variant = "secondary",
  ...props
}: ButtonProps) {
  const classes = [variantClasses[variant], full ? "full" : "", className].filter(Boolean).join(" ");

  return <button {...props} className={classes} type={type} />;
}
