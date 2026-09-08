/** Local verification reporting and error hooks, independent of editor UI and model creation. */
export function createEditorReports({getStatus, host = window, send = body => ['localhost', '127.0.0.1'].includes(host.location?.hostname) ? fetch('/__report', {
  method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body),
}) : Promise.resolve()}) {
  const errors = [];
  const removals = [];

  async function postReport(extra = {}) {
    const report = {...getStatus(), errors: [...errors], ...extra};
    // A disconnected local report endpoint must not cause recursive unhandled rejections.
    try { await send(report); } catch { /* Keep errors available in the editor's public API. */ }
    return report;
  }
  function record(error) {
    errors.push(String(error?.stack || error));
    void postReport();
  }
  function listen(type, handler) {
    host.addEventListener(type, handler);
    removals.push(() => host.removeEventListener(type, handler));
  }
  listen('error', event => record(event.message));
  listen('unhandledrejection', event => record(event.reason));

  return {
    errors, record, postReport,
    watchShaders(renderer) {
      const previous = renderer.debug.onShaderError;
      const handler = (gl, program, vertex, fragment) => record(gl.getProgramInfoLog(program)
        || gl.getShaderInfoLog(vertex) || gl.getShaderInfoLog(fragment) || 'Shader compilation failed');
      renderer.debug.onShaderError = handler;
      removals.push(() => { if (renderer.debug.onShaderError === handler) renderer.debug.onShaderError = previous; });
    },
    dispose() { for (const remove of removals.splice(0)) remove(); },
  };
}
