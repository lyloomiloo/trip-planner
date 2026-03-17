import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["'DM Sans'", "sans-serif"],
        body: ["'DM Mono'", "monospace"],
        mono: ["'DM Mono'", "monospace"],
        serif: ["'Playfair Display'", "serif"],
      },
      colors: {
        text: { DEFAULT: "#2D2D2D", light: "#888888" },
        accent: {
          gold: "#C4973B",
          blue: "#4A7C9B",
          green: "#8B9D83",
          purple: "#8B7B9B",
          gray: "#D0D0D0",
        },
        slot: { empty: "#F5F5F5", border: "#DDDDDD" },
      },
    },
  },
  plugins: [],
};
export default config;
