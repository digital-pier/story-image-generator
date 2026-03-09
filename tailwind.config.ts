import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#06080f",
        panel: "#0d1220",
        panelSoft: "#141d33",
        line: "#26324d",
        cyanGlow: "#63d9ff",
        ember: "#ff7a59"
      },
      boxShadow: {
        horror: "0 0 0 1px rgba(99,217,255,0.12), 0 12px 45px rgba(0,0,0,0.45)"
      }
    }
  },
  plugins: []
};

export default config;
