import fetchRequest from "@/utils/fetch";

export const getAvailableUniquecodes = async () => {
  const path = "/uniquecodes/available-count";
  const method = "GET";
  const response = await fetchRequest<{ count: number }>(path, {
    method,
  });
  return response;
};
