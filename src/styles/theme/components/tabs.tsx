import type { Components, Theme } from "@mui/joy/styles";
import { color } from "framer-motion";

export const JoyTabs = {
  styleOverrides: {
    root: ({ ownerState }) => ({
      ...(ownerState.variant === "custom" && {
        backgroundColor: "transparent",
        "& .MuiTabList-root": {
          backgroundColor: "var(--joy-palette-background-mainBg)",
          borderRadius: "20px",
          boxShadow: "none",
          gap: "4px",
          padding: "4px",
        },
        "& .MuiTab-root": {
          borderRadius: "20px",
          flex: "1 1 auto",
          "&:after": { display: "none" },
          "&.Mui-selected": {
            backgroundColor: "var(--joy-palette-background-navActiveBg)",
            boxShadow: "var(--joy-shadow-sm)",
            color: "var(--joy-palette-text-primary)",
            border: "1px solid var(--joy-palette-divider)",
          },
          "&:not(&.Mui-selected):hover": {
            backgroundColor: "var(--joy-palette-background-level2)",
          },
        },
      }),
    }),
  },
} satisfies Components<Theme>["JoyTabs"];
