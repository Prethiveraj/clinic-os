/** Retry transient Windows output-directory failures without changing runtime IO. */
export class WindowsOutputPlugin {
  apply(compiler) {
    const original = compiler.outputFileSystem;
    if (!original) return;
    const wrapped = Object.create(original);
    wrapped.mkdir = function (directory, ...args) {
      const callback = args.pop();
      let retries = 0;
      const attempt = () => original.mkdir(directory, ...args, (error) => {
        if (error?.code !== 'EPERM' || retries++ >= 6) return callback(error);
        original.stat(directory, (statError, info) => {
          if (!statError && info.isDirectory()) return callback(null);
          setTimeout(attempt, 50 * retries);
        });
      });
      attempt();
    };
    compiler.outputFileSystem = wrapped;
  }
}
