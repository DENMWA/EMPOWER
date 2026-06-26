import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}", "./lib/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#152238",
        navy: "#19324d",
        sea: "#0f766e",
        mint: "#ccfbf1",
        skySoft: "#e6f2ff",
        mist: "#f5f7fb",
        gold: "#b7791f"
      },
      boxShadow: {
        soft: "0 20px 50px -35px rgba(21, 34, 56, 0.35)",
        lift: "0 26px 70px -42px rgba(15, 118, 110, 0.45)"
      }
    }
  },
  plugins: []
};

export default config;
