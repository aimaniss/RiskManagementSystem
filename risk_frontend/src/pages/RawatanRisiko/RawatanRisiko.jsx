import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Stethoscope, Check, Search } from "lucide-react";
import api from "../../api/api";
import LoadingSpinner from "@/components/ui/loading-spinner";
import EmptyState from "@/components/ui/empty-state";
import PageHeader from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from "@/components/ui/table";
import { getRiskMatrix, getRiskAbbreviation } from "../../constants/riskMatrix";
import { formatSeparuhTahun } from "../../utils/formatters";

const RISK_LEVEL_COLORS = {
    "Rendah": "#22c55e",
    "Sederhana": "#eab308",
    "Tinggi": "#f97316",
    "Sangat Tinggi": "#ef4444",
    "Tiada Data": "#94a3b8",
};
const riskBadgeColor = (label) => RISK_LEVEL_COLORS[label] || "#94a3b8";

const STATUS_BADGE_VARIANTS = {
    "Buka": "outline",
    "Sedang Dilaksanakan": "default",
    "Pemantauan": "warning",
    "Selesai": "success",
    "Tutup": "secondary",
    "Tertunggak": "destructive",
};
const statusBadgeVariant = (status) => STATUS_BADGE_VARIANTS[status] || "secondary";

function FlowStep({ step, label, count, active, onClick }) {
    const completed = count === 0;

    const circleCls = active
        ? "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold bg-primary text-white shadow-sm"
        : completed
            ? "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold bg-success/10 text-success"
            : "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold border border-primary/40 bg-primary/5 text-primary";

    return (
        <button
            type="button"
            onClick={onClick}
            className="group flex flex-col items-center gap-1 rounded-lg px-2 py-1 transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
            <span className={circleCls}>
                {completed ? <Check className="h-3.5 w-3.5" /> : step}
            </span>
            <span className={`text-sm font-medium ${active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}>
                {label}
            </span>
            {completed ? (
                <span className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">Selesai</span>
            ) : (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">{count} menunggu</span>
            )}
        </button>
    );
}

function PenilaianDanRawatan() {
    const [data, setData] = useState([]);
    const [activeTab, setActiveTab] = useState('penilaian');
    const [search, setSearch] = useState("");
    const [tahunFilter, setTahunFilter] = useState("");
    const [separuhFilter, setSeparuhFilter] = useState("");
    const [syarikatFilter, setSyarikatFilter] = useState("");
    const [kategoriFilter, setKategoriFilter] = useState("");
    const [syarikatList, setSyarikatList] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const navigate = useNavigate();

    const getRiskData = (k,i) => getRiskMatrix(k, i);

    const isDinilai = (d) => (d.skor_kebarangkalian > 0 && d.skor_impak > 0) || (d.skor_kebarangkalian !== null && d.skor_impak !== null);
    const hasRawatan = (d) => d.plan_tindakan && Array.isArray(d.plan_tindakan) && d.plan_tindakan.filter(p => p && p.trim() !== "").length > 0;
    
    const fetchSyarikatList = async () => {
        try {
            const res = await api.get("/syarikat");
            setSyarikatList(res.data);
        } catch(err){ console.error("❌ Gagal fetch syarikat:",err); }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            
            const res = await api.get("/rawatan/with-status");
            
            const dataWithScore = res.data.map(d=>{
                const k = parseInt(d.skor_kebarangkalian)||0;
                const i = parseInt(d.skor_impak)||0;
                
                const {label,color} = getRiskData(k, i);
                
                const planTindakan = d.plan_tindakan;
                const kakitangan = d.kakitangan_bertanggungjawab;
                
                return {
                    ...d, 
                    tahap_risiko: label, 
                    risk_color: color,
                    plan_tindakan: Array.isArray(planTindakan) ? planTindakan : [planTindakan].filter(p => p),
                    kakitangan_bertanggungjawab: Array.isArray(kakitangan) ? kakitangan : [kakitangan].filter(k => k),
                    bahagian_unit: d.bahagian || d.unit || null,
                    status_pemantauan: d.status_pemantauan || "Buka",
                };
            });
            setData(dataWithScore);
        } catch(err){ 
            console.error("❌ Gagal fetch rawatan risiko:",err); 
        }
        finally{ setLoading(false); }
    };

    useEffect(()=>{ 
        fetchSyarikatList(); 
        fetchData(); 
    }, []);

    const risikoBelumDinilai = data.filter(d => !isDinilai(d)).length;
    const risikoMemerlukanRawatan = data.filter(d => isDinilai(d) && !hasRawatan(d)).length;

    const kategoriList = useMemo(() => {
        return [...new Set(data.map(d => d.kategori).filter(k => k))].sort();
    }, [data]);

    // Penilaian & rawatan disunting di halaman butiran risiko (tab berkaitan)
    const handleAction = (item) => navigate(`/risiko/${item.risiko_id}?tab=${activeTab === "penilaian" ? "penilaian" : "rawatan"}`);

    const filteredData = useMemo(()=>{
        const tabFiltered = data.filter(d => {
            const dinilai = isDinilai(d);
            
            if (activeTab === 'penilaian') {
                return !dinilai;
            } else {
                return dinilai && !hasRawatan(d); 
            }
        });

        return tabFiltered.filter(d => {
            const matchSearch = !search || d.no_rujukan?.toLowerCase().includes(search.toLowerCase());
            const matchSyarikat = !syarikatFilter || d.nama_syarikat === syarikatFilter;
            const matchTahun = !tahunFilter || String(d.tahun) === tahunFilter;
            const matchSeparuh = !separuhFilter || String(d.separuh_tahun) === separuhFilter;
            const matchKategori = !kategoriFilter || d.kategori === kategoriFilter;
            return matchSearch && matchSyarikat && matchTahun && matchSeparuh && matchKategori;
        });
    }, [data, activeTab, search, syarikatFilter, tahunFilter, separuhFilter, kategoriFilter]);

    const penilaianColSpan = 9; 
    const rawatanColSpan = 11; 

    const renderActionCell = (d) => (
        <TableCell className="text-center">
            <Button
                size="sm"
                variant="default"
                onClick={()=>handleAction(d)}
                title={activeTab === 'penilaian' ? "Nilai Risiko" : "Tambah Rawatan"}
            >
                <Plus className="h-3.5 w-3.5" />
                {activeTab === 'penilaian' ? "Nilai" : "Rawat"}
            </Button>
        </TableCell>
    );

    const renderTableContent = () => {
        const currentColSpan = activeTab === 'penilaian' ? penilaianColSpan : rawatanColSpan;
        
        if (loading) return (
            <TableRow>
                <TableCell colSpan={currentColSpan} className="h-32 text-center">
                    <LoadingSpinner text="Memuatkan..." />
                </TableCell>
            </TableRow>
        );
        if (filteredData.length === 0) {
            const message = activeTab === 'penilaian' ? 
                "Semua risiko telah dinilai." : 
                "Tiada risiko telah dinilai yang memerlukan rawatan."; 
            return (
                <TableRow>
                    <TableCell colSpan={currentColSpan} className="h-32">
                        <EmptyState icon={Stethoscope} title={message} />
                    </TableCell>
                </TableRow>
            );
        }

        return filteredData.map((d,i)=>(
            <TableRow key={i}>
                <TableCell className="text-center text-muted-foreground">{i+1}</TableCell>
                
                {activeTab === 'penilaian' ? (
                    <>
                        <TableCell className="whitespace-nowrap font-semibold text-foreground">{d.no_rujukan}</TableCell>
                        <TableCell className="whitespace-nowrap">
                            <div className="text-sm font-medium text-foreground">{d.tahun}</div>
                            <div className="text-xs text-muted-foreground">{formatSeparuhTahun(d.separuh_tahun)}</div>
                        </TableCell>
                        <TableCell>{d.nama_syarikat||"-"}</TableCell>
                        <TableCell>{d.kategori||"-"}</TableCell> 
                        <TableCell>{d.bahagian_unit||"-"}</TableCell> 
                        <TableCell>{d.risiko}</TableCell>

                        <TableCell className="text-center">
                            <Badge variant={statusBadgeVariant(d.status_pemantauan)}>
                                {d.status_pemantauan || "Buka"}
                            </Badge>
                        </TableCell>
                        {renderActionCell(d)}
                    </>
                ) : (
                    <>
                        <TableCell className="whitespace-nowrap font-semibold text-foreground">{d.no_rujukan}</TableCell>
                        <TableCell className="whitespace-nowrap">
                            <div className="text-sm font-medium text-foreground">{d.tahun}</div>
                            <div className="text-xs text-muted-foreground">{formatSeparuhTahun(d.separuh_tahun)}</div>
                        </TableCell>
                        <TableCell>{d.nama_syarikat||"-"}</TableCell>
                        <TableCell>{d.kategori||"-"}</TableCell>
                        <TableCell>{d.bahagian_unit||"-"}</TableCell>
                        <TableCell>{d.risiko}</TableCell>

                        <TableCell className="text-center">
                            <Badge
                                className="border-transparent text-white"
                                style={{ backgroundColor: riskBadgeColor(d.tahap_risiko) }}
                            >
                                {getRiskAbbreviation(d.tahap_risiko)}
                            </Badge>
                        </TableCell>
                        
                        <TableCell className="text-center">
                            <Badge variant="outline">{d.status_risiko || "-"}</Badge>
                        </TableCell>

                        <TableCell className="text-center">
                            <Badge variant={statusBadgeVariant(d.status_pemantauan)}>
                                {d.status_pemantauan || "Sedang Dilaksanakan"}
                            </Badge>
                        </TableCell>

                        {renderActionCell(d)}
                    </>
                )}
            </TableRow>
        ));
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Rawatan Risiko"
                description="Nilai risiko yang belum dinilai dan urus pelan rawatan risiko."
            />

            {/* Aliran Kerja */}
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-start">
                    <FlowStep
                        step={1}
                        label="Penilaian Risiko"
                        count={risikoBelumDinilai}
                        active={activeTab === 'penilaian'}
                        onClick={() => setActiveTab('penilaian')}
                    />
                    <div className="mx-1 mt-[13px] h-0.5 flex-1 rounded-full bg-border" />
                    <FlowStep
                        step={2}
                        label="Rawatan Risiko"
                        count={risikoMemerlukanRawatan}
                        active={activeTab === 'rawatan'}
                        onClick={() => setActiveTab('rawatan')}
                    />
                    <div className="mx-1 mt-[13px] h-0.5 flex-1 rounded-full bg-border" />
                    <div className="flex flex-col items-center gap-1 px-2 py-1 opacity-80">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-muted text-xs font-semibold text-muted-foreground">3</span>
                        <span className="text-sm font-medium text-muted-foreground">Pemantauan</span>
                        <span className="text-[10px] text-muted-foreground">diurus di page Pemantauan Risiko</span>
                    </div>
                </div>
            </div>
            <p className="-mt-4 px-1 text-xs text-muted-foreground">
                Aliran kerja: Risiko dinilai dahulu, kemudian rawatan dirancang, akhirnya dipantau dari semasa ke semasa.
            </p>

            {/* Penapis */}
            <div className="rounded-xl border border-border bg-card shadow-sm">
                <div className="flex flex-wrap items-center gap-3 p-4">
                    <div className="relative w-full sm:w-44">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input type="text" placeholder="Cari No Rujukan..." className="pl-9" value={search} onChange={e=>setSearch(e.target.value)} />
                    </div>
                    <Select className="w-full sm:w-44" value={syarikatFilter} onChange={e=>setSyarikatFilter(e.target.value)}>
                        <option value="">-- Semua Syarikat --</option>
                        {syarikatList.map(s=><option key={s.syarikat_id} value={s.nama_syarikat}>{s.nama_syarikat}</option>)}
                    </Select>
                    <Select className="w-full sm:w-40" value={tahunFilter} onChange={e=>setTahunFilter(e.target.value)}>
                        <option value="">-- Semua Tahun --</option>
                        {[...new Set(data.map(d=>d.tahun))].filter(t => t).sort((a,b)=>b-a).map(t=><option key={t} value={t}>{t}</option>)}
                    </Select>
                    <Select className="w-full sm:w-44" value={separuhFilter} onChange={e=>setSeparuhFilter(e.target.value)}>
                        <option value="">-- Semua Separuh Tahun --</option>
                        <option value="1">Pertama</option>
                        <option value="2">Kedua</option>
                    </Select>
                    <Select className="w-full sm:w-44" value={kategoriFilter} onChange={e=>setKategoriFilter(e.target.value)}>
                        <option value="">-- Semua Kategori --</option>
                        {kategoriList.map(k=><option key={k} value={k}>{k}</option>)}
                    </Select>
                </div>
            </div>

            {/* Jadual */}
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <Table>
                    <TableHeader key={activeTab}> 
                        {activeTab === 'penilaian' ? (
                            <>
                                <TableRow>
                                    <TableHead rowSpan={2} className="w-12 align-middle">BIL.</TableHead>
                                    <TableHead colSpan={6} className="text-center">Maklumat Risiko</TableHead> 
                                    <TableHead colSpan={2} className="text-center">Penilaian</TableHead> 
                                </TableRow>
                                <TableRow>
                                    <TableHead>No Rujukan</TableHead>
                                    <TableHead>Tahun / Separuh Tahun</TableHead>
                                    <TableHead>Syarikat</TableHead>
                                    <TableHead>Kategori Risiko</TableHead> 
                                    <TableHead>Bahagian/Unit</TableHead>
                                    <TableHead>Risiko</TableHead>
                                    <TableHead className="text-center">Status Pemantauan</TableHead>
                                    <TableHead className="text-center">Tindakan</TableHead>
                                </TableRow>
                            </>
                        ) : (
                            <>
                                <TableRow>
                                    <TableHead rowSpan={2} className="w-12 align-middle">BIL.</TableHead>
                                    <TableHead colSpan={8} className="text-center">Maklumat Risiko</TableHead>
                                    <TableHead colSpan={2} className="text-center">Rawatan</TableHead>
                                </TableRow>
                                <TableRow>
                                    <TableHead>No Rujukan</TableHead>
                                    <TableHead>Tahun / Separuh Tahun</TableHead>
                                    <TableHead>Syarikat</TableHead>
                                    <TableHead>Kategori Risiko</TableHead>
                                    <TableHead>Bahagian/Unit</TableHead>
                                    <TableHead>Risiko</TableHead>
                                    <TableHead className="text-center">Tahap Risiko</TableHead> 
                                    <TableHead className="text-center">Status Risiko</TableHead>
                                    <TableHead className="text-center">Status Pemantauan</TableHead>
                                    <TableHead className="text-center">Tindakan</TableHead>
                                </TableRow>
                            </>
                        )}
                    </TableHeader>

                    <TableBody>
                        {renderTableContent()}
                    </TableBody>
                </Table>
            </div>

        </div>
    );
}

export default PenilaianDanRawatan;
