export const capitalize = (str: string): string => {
  if (!str || typeof str !== "string") {
    console.error("No string provided", { str });
    return "";
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
};
