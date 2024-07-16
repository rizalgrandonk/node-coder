export const sleep = async (time: number) => {
  return await new Promise((res) => setTimeout(res, time));
};
