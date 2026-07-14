// Shared formatting functions used across pages

// Format separuh tahun (half year)
export const formatSeparuhTahun = (value) => {
  if (value === null || value === undefined) return "—";
  const num = parseInt(value);
  if (num === 1) return "Pertama";
  if (num === 2) return "Kedua";
  return String(value);
};

// Format separuh tahun short form (T1, T2)
export const formatSeparuhTahunShort = (value) => {
  if (value === null || value === undefined) return "—";
  const strValue = String(value).toLowerCase();
  if (strValue === "1" || strValue === "pertama") return "T1";
  if (strValue === "2" || strValue === "kedua") return "T2";
  return String(value);
};

// Format date to localized string
export const formatDate = (dateString) => {
  if (!dateString) return "Tiada Tarikh";
  const date = new Date(dateString);
  return date.toLocaleString("ms-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Parse semicolon-separated string into array
export const parseListData = (dataString) => {
  if (!dataString || dataString === "-" || dataString.trim() === "") {
    return [];
  }
  return dataString
    .split(";")
    .map((item) => item.trim())
    .filter((item) => item !== "" && item !== "-");
};

// Format list display (semicolon-separated string to numbered list text)
export const formatListDisplay = (dataString) => {
  if (!dataString || dataString === "—" || dataString.trim() === "") return "—";
  const items = dataString
    .split(";")
    .map((item) => item.trim())
    .filter((item) => item !== "");
  if (items.length === 1) return items[0];
  return items.map((item, index) => `${index + 1}. ${item}`).join("\n");
};
