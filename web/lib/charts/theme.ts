export type ThemeName = "light" | "dark" | "batman";

export function getChartTheme(t: ThemeName) {
  const text = t === "batman" ? "#8A6D35" : t === "dark" ? "#8B949E" : "#5A6873";
  const grid = t === "batman" ? "rgba(200,168,75,0.06)" : t === "dark" ? "rgba(240,246,252,0.07)" : "rgba(26,35,43,0.05)";
  const tooltip = t === "batman" ? "#0C0C10" : t === "dark" ? "#21262D" : "#1A232B";
  const border = t === "dark" ? "#21262D" : t === "batman" ? "#0C0C10" : "#FFFFFF";
  const phases: Record<ThemeName, string[]> = {
    light: ["#2A6BE8", "#E8881A", "#22936A", "#8055C8", "#D94545"],
    dark: ["#60A5FA", "#FBBF24", "#34D399", "#A78BFA", "#F87171"],
    batman: ["#C8A84B", "#8A6D35", "#6B7A4A", "#5A5A6E", "#8A4A3A"],
  };
  return { text, grid, tooltip, border, phases: phases[t] || phases.light };
}

export function lineColor(t: ThemeName) {
  return t === "batman" ? "#C8A84B" : t === "dark" ? "#60A5FA" : "#17395D";
}
