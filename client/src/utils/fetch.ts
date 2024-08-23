// utils/fetch.ts

import env from "@/configs/env";

/**
 * Makes an HTTP request using the Fetch.
 *
 * @param url - The endpoint URL for the request.
 * @param options - Optional configurations such as method, headers, and body.
 * @returns A promise that resolves to an object containing success status and either data or an error message.
 */

type Response<T> =
  | {
      success: true;
      data: T;
      message: string;
    }
  | {
      success: false;
      message: string;
    };
const fetchRequest = async <T>(path: string, options?: RequestInit): Promise<Response<T>> => {
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
        message: data?.message ?? "An error occurred.",
      };
    }

    return data;
  } catch (error: any) {
    console.log("Failed Request", error);
    if (error.toString().includes("signal timed out")) {
      return {
        success: false,
        message: "Connection Timeout: Unable to retrieve data. Please try again.",
      };
    }
    return {
      success: false,
      message: "An error occurred.",
    };
  }
};

export default fetchRequest;
