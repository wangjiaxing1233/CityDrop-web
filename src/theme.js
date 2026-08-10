export const colors = {
  navy: "#1E2761",
  navyDark: "#141a47",
  ice: "#CADCFC",
  iceBg: "#EAF0FC",
  gold: "#E8A33D",
  text: "#232323",
  muted: "#6b6b6b",
  border: "#D9D9D9",
};

export const antdTheme = {
  token: {
    colorPrimary: colors.navy,
    colorLink: colors.navy,
    borderRadius: 14,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    colorText: colors.text,
    colorTextHeading: colors.navy,
    colorTextDescription: colors.muted,
    wireframe: false,
  },
  components: {
    Button: {
      controlHeight: 40,
      paddingInline: 20,
      fontWeight: 500,
    },
    Card: {
      paddingLG: 24,
    },
    Input: {
      controlHeight: 40,
    },
  },
};
