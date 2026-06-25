import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}", "./lib/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#152238",
        sea: "#0f766e",
        skySoft: "#e6f2ff",
        mist: "#f5f7fb"
      },
      boxShadow: {
        soft: "0 20px 50px -35px rgba(21, 34, 56, 0.35)"
      }
    }
  },
  plugins: []
};

export default config;
