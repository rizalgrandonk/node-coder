import fetchRequest from "@/utils/fetch";

export const startPrint = async () => {
  const path = "/print/start";
  const method = "POST";
  const response = await fetchRequest(path, {
    method,
  });
  return response;
};

export const stopPrint = async () => {
  const path = "/print/stop";
  const method = "POST";
  const response = await fetchRequest(path, {
    method,
  });
  return response;
};
