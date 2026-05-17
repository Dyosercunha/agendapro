export default {
  base: process.env.GITHUB_PAGES === "true" ? "/agendapro/" : "/",
  build: {
    chunkSizeWarningLimit: 700,
  },
};
