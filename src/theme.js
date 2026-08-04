// Shared color palette — matches the interactive prototype
// (CityDrop_Interactive_Prototype_v5.html) and the citydrop-web version,
// so both frontends look the same even though they're built differently
// under the hood.
export const colors = {
  navy: '#1E2761',
  navyDark: '#141a47',
  ice: '#CADCFC',
  iceBg: '#EAF0FC',
  gold: '#E8A33D',
  text: '#232323',
  muted: '#6b6b6b',
  border: '#D9D9D9',
};

// Passed to Ant Design's <ConfigProvider theme={antdTheme}> in index.js so
// every AntD component (buttons, tabs, steps, etc.) picks up the same
// palette automatically instead of everyone overriding colors per-component.
export const antdTheme = {
  token: {
    colorPrimary: colors.navy,
    colorLink: colors.navy,
    borderRadius: 8,
    fontFamily: '-apple-system, "Segoe UI", Arial, sans-serif',
  },
};
