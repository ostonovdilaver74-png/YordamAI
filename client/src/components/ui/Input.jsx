export default function Input({
  type = "text",
  placeholder = "",
  value,
  onChange,
  onKeyDown,
  className = "",
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      className={`w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition
      focus:border-blue-600 focus:ring-2 focus:ring-blue-200 ${className}`}
    />
  );
}