const router = {
  refresh() {
    window.fixtureRefreshCount = (window.fixtureRefreshCount || 0) + 1;
  },
};
export function useRouter() {
  return router;
}
