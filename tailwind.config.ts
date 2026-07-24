import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}", "./lib/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17212b",
        navy: "#19324d",
        sea: "#0f766e",
        mint: "#ccfbf1",
        skySoft: "#e6f2ff",
        mist: "#f6f8fa",
        gold: "#b7791f"
      },
      boxShadow: {
        soft: "0 1px 2px rgba(15, 23, 42, 0.04), 0 10px 30px rgba(15, 23, 42, 0.035)",
        lift: "0 16px 32px -18px rgba(15, 118, 110, 0.5)"
      }
    }
  },
  plugins: []
};

export default config;
