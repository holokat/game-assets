/** Scoped element access plus explicit ownership of event listeners. No global event bus. */
export function createDOMScope(root = document) {
  const cleanups = [];
  return {
    root,
    get(id) {
      const element = root.querySelector(`#${id}`);
      if (!element) throw new Error(`Missing editor element: ${id}`);
      return element;
    },
    all(selector) { return [...root.querySelectorAll(selector)]; },
    on(target, event, handler) {
      const element = typeof target === 'string' ? root.querySelector(`#${target}`) : target;
      if (!element) throw new Error(`Missing event target: ${target}`);
      element.addEventListener(event, handler);
      cleanups.push(() => element.removeEventListener(event, handler));
    },
    dispose() { for (const cleanup of cleanups.splice(0)) cleanup(); },
  };
}
