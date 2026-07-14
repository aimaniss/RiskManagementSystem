import { parseListData } from "../utils/formatters";

/**
 * Shared ListDisplay component
 * Renders semicolon-separated or array data as a numbered list
 */
const ListDisplay = ({ data, isLogContext = false }) => {
  const getItemText = (item) => {
    if (typeof item === "string") return item;
    if (item?.punca) return item.punca;
    if (item?.kesan) return item.kesan;
    if (item?.punca_text) return item.punca_text;
    if (item?.kesan_text) return item.kesan_text;
    if (item?.nama_punca) return item.nama_punca;
    if (item?.nama_kesan) return item.nama_kesan;
    if (item?.butiran_punca) return item.butiran_punca;
    if (item?.butiran_kesan) return item.butiran_kesan;
    if (item?.butiran_aktiviti) return item.butiran_aktiviti;
    if (item?.butiran_kakitangan) return item.butiran_kakitangan;
    if (item?.butiran_log) return item.butiran_log;
    if (item?.text) return item.text;
    return "-";
  };

  let cleanedData = [];

  if (typeof data === "string") {
    cleanedData = parseListData(data);
  } else if (Array.isArray(data)) {
    cleanedData = data.filter((item) => {
      const text = getItemText(item);
      return text && text.trim() !== "-";
    });
  }

  if (cleanedData.length === 0) {
    return <span style={{ color: "#64748b" }}>-</span>;
  }

  if (cleanedData.length === 1) {
    const itemText =
      typeof cleanedData[0] === "string"
        ? cleanedData[0]
        : getItemText(cleanedData[0]);
    return <span className="data-inline">{itemText}</span>;
  }

  return (
    <ul style={{ listStyleType: "none", paddingLeft: "0", margin: "0" }}>
      {cleanedData.map((item, index) => {
        const itemText =
          typeof item === "string" ? item : getItemText(item);
        return (
          <li key={index} className="list-item">
            <span className="data-inline">
              {`${index + 1}. ${itemText}`}
            </span>
          </li>
        );
      })}
    </ul>
  );
};

export default ListDisplay;
