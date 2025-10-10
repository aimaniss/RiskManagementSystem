import { useState, useEffect } from "react";
import api from "../../api/api";
import "./PemantauanRisiko.css";

function PemantauanRisiko() {
  const [data, setData] = useState([]);
  const [subsidiariFilter, setSubsidiariFilter] = useState("");
  const [tahunFilter, setTahunFilter] = useState("");
  const [separuhFilter, setSeparuhFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [subsidiariList, setSubsidiariList] = useState([]);

  const riskMatrix = {
    1: {1:{label:"Rendah",color:"#22c55e"},2:{label:"Rendah",color:"#22c55e"},3:{label:"Sederhana",color:"#eab308"},4:{label:"Sederhana",color:"#eab308"},5:{label:"Tinggi",color:"#f97316"}},
    2: {1:{label:"Rendah",color:"#22c55e"},2:{label:"Rendah",color:"#22c55e"},3:{label:"Sederhana",color:"#eab308"},4:{label:"Sederhana",color:"#eab308"},5:{label:"Tinggi",color:"#f97316"}},
    3: {1:{label:"Rendah",color:"#22c55e"},2:{label:"Sederhana",color:"#eab308"},3:{label:"Sederhana",color:"#eab308"},4:{label:"Tinggi",color:"#f97316"},5:{label:"Tinggi",color:"#f97316"}},
    4: {1:{label:"Sederhana",color:"#eab308"},2:{label:"Sederhana",color:"#eab308"},3:{label:"Tinggi",color:"#f97316"},4:{label:"Tinggi",color:"#f97316"},5:{label:"Sangat Tinggi",color:"#ef4444"}},
    5: {1:{label:"Sederhana",color:"#eab308"},2:{label:"Tinggi",color:"#f97316"},3:{label:"Tinggi",color:"#f97316"},4:{label:"Sangat Tinggi",color:"#ef4444"},5:{label:"Sangat Tinggi",color:"#ef4444"}},
  };

  const getRiskData = (k,i) => riskMatrix[k]?.[i] || {label:"-", color:"#f1f5f9"};
  const shortForm = (label) => label==="Rendah"?"R":label==="Sederhana"?"S":label==="Tinggi"?"T":label==="Sangat Tinggi"?"ST":"-";

  // Fetch subsidiari dropdown
  const fetchSubsidiariList = async () => {
    try {
      const res = await api.get("/subsidiari");
      setSubsidiariList(res.data);
    } catch(err){ console.error(err); }
  };

  // Fetch pemantauan risiko
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/pemantauan-risiko");
      const dataWithScore = res.data.map(d=>{
        const {label,color} = getRiskData(parseInt(d.skor_kebarangkalian)||0, parseInt(d.skor_impak)||0);
        return {...d, tahap_risiko:label, risk_color:color};
      });
      setData(dataWithScore);
    } catch(err){ console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(()=>{
    fetchSubsidiariList();
    fetchData();
  }, []);

  // Cards summary
  const totalRisiko = data.length;
  const tindakanSelesai = data.filter(d=>d.status_pemantauan==="Selesai").length;
  const tindakanTertunggak = data.filter(d=>d.status_pemantauan==="Tertunggak").length;

  // Filtered data
  const filteredData = data.filter(d=>{
    const matchSubsidiari = !subsidiariFilter || d.nama_subsidiari===subsidiariFilter;
    const matchTahun = !tahunFilter || String(d.tahun)===tahunFilter;
    const matchSeparuh = !separuhFilter || String(d.separuh_tahun)===separuhFilter;
    const matchStatus = !statusFilter || d.status_pemantauan===statusFilter;
    return matchSubsidiari && matchTahun && matchSeparuh && matchStatus;
  });

  return (
    <div className="senarai-risiko-container">
      <h1>Pemantauan Risiko</h1>

      {/* Summary Cards */}
      <div className="cards-container">
        <div className="info-card">
          <h3>Jumlah Risiko Dipantau</h3>
          <p>{totalRisiko}</p>
        </div>
        <div className="info-card">
          <h3>Tindakan Selesai</h3>
          <p>{tindakanSelesai}</p>
        </div>
        <div className="info-card">
          <h3>Tindakan Tertunggak</h3>
          <p>{tindakanTertunggak}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-container">
        <select className="filter-select" value={subsidiariFilter} onChange={e=>setSubsidiariFilter(e.target.value)}>
          <option value="">-- Semua Subsidiari --</option>
          {subsidiariList.map(s=>(
            <option key={s.subsidiari_id} value={s.nama_subsidiari}>{s.nama_subsidiari}</option>
          ))}
        </select>

        <select className="filter-select" value={tahunFilter} onChange={e=>setTahunFilter(e.target.value)}>
          <option value="">-- Semua Tahun --</option>
          {[...new Set(data.map(d=>d.tahun))].sort((a,b)=>b-a).map(t=>(
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select className="filter-select" value={separuhFilter} onChange={e=>setSeparuhFilter(e.target.value)}>
          <option value="">-- Semua Separuh Tahun --</option>
          <option value="1">Pertama</option>
          <option value="2">Kedua</option>
        </select>

        <select className="filter-select" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
          <option value="">-- Semua Status --</option>
          <option value="Selesai">Selesai</option>
          <option value="Tertunggak">Tertunggak</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="risiko-table">
          <thead>
            <tr>
              <th>Bil.</th>
              <th>No Rujukan</th>
              <th>Tahun</th>
              <th>Separuh Tahun</th>
              <th>Nama Subsidiari</th>
              <th>Risiko</th>
              <th>Skor Risiko</th>
              <th>Pelan Tindakan</th>
              <th>Status Pemantauan</th>
              <th>Tarikh Pemantauan</th>
              <th>Catatan</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="11" className="loading">Loading...</td></tr>
            ) : filteredData.length>0 ? (
              filteredData.map((d,i)=>(
                <tr key={d.id}>
                  <td>{i+1}</td>
                  <td>{d.no_rujukan}</td>
                  <td>{d.tahun}</td>
                  <td>{d.separuh_tahun===1?"Pertama":"Kedua"}</td>
                  <td>{d.nama_subsidiari}</td>
                  <td>{d.risiko}</td>
                  <td className="center">
                    <div className="risk-box" style={{backgroundColor:d.risk_color}}>
                      {shortForm(d.tahap_risiko)}
                    </div>
                  </td>
                  <td>{d.pelan_tindakan}</td>
                  <td>{d.status_pemantauan}</td>
                  <td>{d.tarikh_pemantauan}</td>
                  <td>{d.catatan}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="11" className="no-data">Tiada data dijumpai</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PemantauanRisiko;
