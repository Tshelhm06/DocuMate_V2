import * as Network from 'expo-network';

export async function isOnline() {
  try {
    const state = await Network.getNetworkStateAsync();
    if (!state.isConnected) return false;
    return state.isInternetReachable !== false;
  } catch (_) {
    return true; // if we cannot tell, let the request itself decide
  }
}

export function withTimeout(promise, ms, message = 'The request timed out. Please try again.') {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}