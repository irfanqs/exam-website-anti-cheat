const AVATAR_COLORS = ["bg-sky", "bg-sun", "bg-leaf", "bg-coral", "bg-periwinkle", "bg-paper"];

/** Avatar bulat bergaris berisi inisial; warnanya tetap untuk nama yang sama. */
export function Avatar({ name, className = "h-12 w-12 text-lg" }: { name: string; className?: string }) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?";
  const hash = [...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);

  return (
    <span className={`avatar ${AVATAR_COLORS[hash % AVATAR_COLORS.length]} ${className}`}>
      {initials}
    </span>
  );
}
