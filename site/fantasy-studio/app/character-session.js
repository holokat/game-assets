/**
 * Owns the current character bundle and the latest asynchronous build request.
 * create/dispose own GPU resources; commit is synchronous, afterCommit may load workspaces.
 * Stale completions and failures cannot replace the current actor or its loading state.
 */
export function createCharacterSession({create, dispose, commit, beforeBuild = () => {}, afterCommit = async () => {}, busy = () => {}, failed = () => {}}) {
  let current = null;
  let revision = 0;
  let loading = false;
  let closed = false;

  return {
    get current() { return current; },
    get loading() { return loading; },
    async rebuild(input, options = {}) {
      if (closed) throw new Error('Character session is disposed');
      const token = ++revision;
      const ownsRequest = () => !closed && token === revision;
      loading = true;
      busy(true);
      let next;
      let committed = false;
      try {
        beforeBuild();
        next = await create(input);
        if (!ownsRequest()) { const stale = next; next = null; dispose(stale); return null; }
        const previous = current;
        current = next;
        committed = true;
        if (previous) dispose(previous);
        commit(next, input, options);
        await afterCommit(next);
        return ownsRequest() ? next : null;
      } catch (error) {
        if (next && !committed) dispose(next);
        if (ownsRequest()) failed(error);
        return null;
      } finally {
        if (ownsRequest()) { loading = false; busy(false); }
      }
    },
    dispose() {
      if (closed) return;
      closed = true;
      revision++;
      loading = false;
      if (current) dispose(current);
      current = null;
    },
  };
}
