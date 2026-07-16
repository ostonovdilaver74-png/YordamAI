export default function Button({
  children,
  onClick,
  variant = "primary",
  className = "",
}) {
  const styles = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-slate-100 text-slate-800 hover:bg-slate-200",
    outline: "border border-blue-600 text-blue-600 hover:bg-blue-50",
  };

  return (
    <button
      onClick={onClick}
      className={`px-5 py-3 rounded-xl font-medium transition ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}