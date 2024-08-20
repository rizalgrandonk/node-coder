// utils/fetch.ts

import env from "@/configs/env";
/**
 * Makes an HTTP request using the Fetch.
 *
 * @param url - The endpoint URL for the request.
 * @param options - Optional configurations such as method, headers, and body.
 * @returns A promise that resolves to an object containing success status and either data or an error message.
 */
const fetchRequest = async <T>(
  path: string,
  options?: RequestInit
): Promise<{ success: boolean; data?: T; message?: string }> => {
  try {
    const url = `${env.VITE_APP_SERVER_URL}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(Number(env.VITE_APP_SERVER_REQUEST_TIMEOUT)),
    });
    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.message || "An error occurred.",
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: (error as Error).message || "Network error",
    };
  }
};

export default fetchRequest;
