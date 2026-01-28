module.exports = {
  content: [
    "./App.tsx",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primaryBg: "#DFEFF3",
        buttonBg: "#BF8224",
        buttonAlt: "#E32428",
        textPrimary: "#191C2F",
        textSecondary: "#DADADA",
        accentST: "#5E1324",
      },
      fontFamily: {
        jost: ["Jost-Regular"],
        jostM: ["Jost-Medium"],
        jostBI: ["Jost-BoldItalic"],
      },
    },
  },
  plugins: [],
};
