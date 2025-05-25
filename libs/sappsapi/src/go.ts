export const go = (callback: () => Promise<any> | void) => {
  try {
    const result = callback();
    if (result instanceof Promise) {
      result.catch((err) => {
        console.error("Unhandled async error in go():", err);
      });
    }
  } catch (err) {
    console.error("Unhandled sync error in go():", err);
  }
};
