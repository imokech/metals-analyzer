import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#17191c",
        paper: "#ffffff",
        mist: "#f2f2f3",
        fog: "#fafafb",
        slate: {
          DEFAULT: "#777b86",
        },
        ash: "#979799",
        smoke: "#a3a6af",
        blush: "#fbe1d1",
        sienna: "#5d2a1a",
        hairline: "#ececec",
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-serif", "Georgia", "serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      fontSize: {
        caption: ["15px", { lineHeight: "1.5" }],
        body: ["17px", { lineHeight: "1.35" }],
        "body-lg": ["20px", { lineHeight: "1.35" }],
        subheading: ["22px", { lineHeight: "1.5" }],
        "heading-sm": ["26px", { lineHeight: "1.18", letterSpacing: "-0.23px" }],
        heading: ["44px", { lineHeight: "1.3", letterSpacing: "-0.66px" }],
        "heading-lg": ["64px", { lineHeight: "1.3", letterSpacing: "-0.96px" }],
        display: ["90px", { lineHeight: "1.3", letterSpacing: "-2.25px" }],
      },
      borderRadius: {
        input: "16px",
        smallcard: "16px",
        elevated: "20px",
        card: "24px",
        pill: "9999px",
      },
      boxShadow: {
        artifact:
          "0 0 0 1px rgba(4,23,43,0.05), 0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
        overlay:
          "0 0 0 1px rgba(0,0,0,0.05), 0 8px 40px 0 rgba(0,0,0,0.1)",
        popover:
          "0 0 0 1px rgba(0,0,0,0.05), 0 4px 24px 0 rgba(0,0,0,0.08)",
      },
      spacing: {
        18: "72px",
        30: "120px",
      },
      maxWidth: {
        page: "1200px",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.16,1,0.3,1) both",
      },
    },
  },
  plugins: [],
};

export default config;
