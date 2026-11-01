// Lets plain Node resolve extension-less imports ("./constants") the way Metro does.
export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (e) {
    if (specifier.startsWith('.') && !/\.[a-z]+$/.test(specifier)) {
      return nextResolve(`${specifier}.js`, context);
    }
    throw e;
  }
}
