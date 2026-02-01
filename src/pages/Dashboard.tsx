import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Bell, MoreHorizontal, Plus, TrendingUp, Download, Package, Clock } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useToast } from "@/components/ui/use-toast";
import { ResponsiveContainer, Tooltip, Area, AreaChart } from "recharts";



// Interfaces
interface SortingLog {
  id: string;
  part_no: string;
  quantity_all_sorting: number;
  quantity_ng: number;
  logged_at: string;
  operator_name?: string;
  reject_image_url?: string;
  factories?: {
    company_name: string;
    location: string;
  };
  parts_master?: {
    part_name: string;
  };
  ng_type?: string;
}

interface HourlyData {
  hour: string;
  total: number;
  ng: number;
  ngRate: number;
}

interface HourlyOperatorOutput {
  operator_name: string;
  hour: string;
  total_logs: number;
  total_sorted: number;
  total_ng: number;
  ng_rate_percent: number;
}

interface ProductionStatus {
  id: string;
  label: string;
  sub_label: string;
  icon_char: string;
  color_class: string;
}

const Dashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<SortingLog[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [hourlyOperatorData, setHourlyOperatorData] = useState<HourlyOperatorOutput[]>([]);
  const [statusItems, setStatusItems] = useState<ProductionStatus[]>([]);
  const [stats, setStats] = useState({
    totalSorted: 0,
    totalNg: 0,
    ngRate: 0,
    partsProcessed: 0,
  });

  useEffect(() => {
    fetchLogs();
    fetchLogs();
    // fetchHourlyOperatorOutput(); // Moved to processData
    fetchStatusItems();
    const channel = supabase
      .channel("sorting-logs-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sorting_logs",
        },
        () => {
          fetchLogs();
          fetchLogs();
          // fetchHourlyOperatorOutput(); // Moved to processData
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStatusItems = async () => {
    try {
      const { data, error } = await supabase
        .from("production_status")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      if (data) {
        setStatusItems(data as ProductionStatus[]);
      }
    } catch (error) {
      console.error("Error fetching status items:", error);
    }
  };

  const fetchLogs = async () => {
    try {
      setConnectionError(null);
      const { data, error } = await supabase
        .from("sorting_logs")
        .select(`
          *, 
          factories(company_name, location),
          parts_master(part_name)
        `)
        .order("logged_at", { ascending: false });

      if (error) throw error;

      if (data) {
        setLogs(data as any);
        processData(data);
      }
    } catch (error: any) {
      console.error("Error fetching logs:", error);
      setConnectionError(error.message || "Failed to connect to Supabase");
    }
  };

  // Replaced with client-side calculation in processData to ensure no missing View errors
  // const fetchHourlyOperatorOutput = async () => { ... }

  const processData = (data: SortingLog[]) => {
    // Calculate overall stats
    const totalSorted = data.reduce((sum, log) => sum + log.quantity_all_sorting, 0);
    const totalNg = data.reduce((sum, log) => sum + log.quantity_ng, 0);
    const ngRate = totalSorted > 0 ? (totalNg / totalSorted) * 100 : 0;
    const partsProcessed = new Set(data.map((log) => log.part_no)).size;

    setStats({
      totalSorted,
      totalNg,
      ngRate,
      partsProcessed,
    });

    // Process hourly data
    const hourlyMap = new Map<string, { total: number; ng: number }>();

    data.forEach((log) => {
      const hour = new Date(log.logged_at).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });

      const existing = hourlyMap.get(hour) || { total: 0, ng: 0 };
      hourlyMap.set(hour, {
        total: existing.total + log.quantity_all_sorting,
        ng: existing.ng + log.quantity_ng,
      });
    });

    // Correctly closed forEach loop above, no extra line needed here.

    const hourlyArray: HourlyData[] = Array.from(hourlyMap.entries())
      .map(([hour, values]) => ({
        hour,
        total: values.total,
        ng: values.ng,
        ngRate: values.total > 0 ? (values.ng / values.total) * 100 : 0,
      }))
      .slice(0, 12)
      .reverse();

    setHourlyData(hourlyArray);

    // Process Hourly Operator Data (Client-Side)
    const opHourlyMap = new Map<string, HourlyOperatorOutput>();

    data.forEach((log) => {
      if (!log.operator_name) return;

      const date = new Date(log.logged_at);
      const hourKey = date.toISOString().slice(0, 13) + ":00:00"; // Key: YYYY-MM-DDTHH:00:00
      const key = `${log.operator_name}_${hourKey}`;

      const existing = opHourlyMap.get(key) || {
        operator_name: log.operator_name,
        hour: hourKey,
        total_logs: 0,
        total_sorted: 0,
        total_ng: 0,
        ng_rate_percent: 0
      };

      existing.total_logs += 1;
      existing.total_sorted += log.quantity_all_sorting;
      existing.total_ng += log.quantity_ng;

      opHourlyMap.set(key, existing);
    });

    const opHourlyArray: HourlyOperatorOutput[] = Array.from(opHourlyMap.values())
      .map(item => ({
        ...item,
        ng_rate_percent: item.total_sorted > 0 ? (item.total_ng / item.total_sorted) * 100 : 0
      }))
      .sort((a, b) => b.hour.localeCompare(a.hour) || a.operator_name.localeCompare(b.operator_name));

    setHourlyOperatorData(opHourlyArray);
  };

  // Interfaces (moved to top for clarity)

  // ...

  // inside Dashboard component:
  const getDataUrl = (url: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = url;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/jpeg"));
      };
      img.onerror = () => resolve(""); // Resolve empty string on error to continue
    });
  };

  const exportToPDF = async () => {
    console.log("Starting PDF generation...");
    try {
      if (typeof autoTable !== 'function') {
        throw new Error("AutoTable plugin not loaded correctly.");
      }

      if (!logs || logs.length === 0) {
        toast({
          variant: "destructive",
          title: "No Data",
          description: "There is no data available to export.",
        });
        return;
      }

      toast({
        title: "Generating Report",
        description: "Creating formal report...",
      });

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Formal Grayscale Theme
      const theme = {
        text: [0, 0, 0], // Black
        line: [0, 0, 0],
        headerFill: [240, 240, 240], // Very light gray for table headers
      };

      // --- Data Aggregation (Same as before) ---
      const partSummaryMap = new Map<string, { partName: string, supplier: string, total: number, ng: number, ok: number }>();
      logs.forEach(log => {
        const partName = log.parts_master?.part_name || "Unknown Part";
        const supplier = log.factories?.company_name || "Unknown Supplier";
        const key = `${partName}-${supplier}`;
        const existing = partSummaryMap.get(key) || { partName, supplier, total: 0, ng: 0, ok: 0 };
        existing.total += log.quantity_all_sorting;
        existing.ng += log.quantity_ng;
        existing.ok += (log.quantity_all_sorting - log.quantity_ng);
        partSummaryMap.set(key, existing);
      });
      const partSummaryData = Array.from(partSummaryMap.values());

      const rejectTypeMap = new Map<string, { count: number, imageUrls: string[] }>();
      logs.forEach(log => {
        if (log.quantity_ng > 0) {
          const type = log.ng_type || "Uncategorized";
          const existing = rejectTypeMap.get(type) || { count: 0, imageUrls: [] };
          existing.count += log.quantity_ng;
          if (log.reject_image_url) existing.imageUrls.push(log.reject_image_url);
          rejectTypeMap.set(type, existing);
        }
      });

      const rejectTableDataWithImages: any[] = [];
      for (const [type, data] of rejectTypeMap.entries()) {
        const lastImage = data.imageUrls.length > 0 ? data.imageUrls[0] : null;
        let base64Img = "";
        if (lastImage) {
          try {
            base64Img = await getDataUrl(lastImage);
          } catch (e) {
            console.error("Failed to load image", e);
          }
        }
        rejectTableDataWithImages.push({
          type,
          count: data.count,
          percentage: (data.count / stats.totalNg * 100).toFixed(1),
          image: base64Img
        });
      }

      // --- PDF Drawing (Compact & Formal) ---
      let yPosition = 15;

      // 1. Title Header (Simple)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text("QUALITY SORTING INSPECTION REPORT", pageWidth / 2, yPosition, { align: "center" });

      yPosition += 8;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated: ${new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`, pageWidth / 2, yPosition, { align: "center" });

      yPosition += 10;
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(14, yPosition, pageWidth - 14, yPosition);
      yPosition += 10;

      // 2. Summary Statistics (Compact Table)
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("1. EXECUTIVE SUMMARY", 14, yPosition);
      yPosition += 5;

      autoTable(doc, {
        startY: yPosition,
        head: [["Total Sorted", "Total NG", "NG Rate", "Parts Processed", "Overall Status"]],
        body: [[
          stats.totalSorted.toLocaleString(),
          stats.totalNg.toLocaleString(),
          `${stats.ngRate.toFixed(2)}%`,
          stats.partsProcessed.toString(),
          stats.ngRate > 3 ? "ACTION REQUIRED" : "WITHIN LIMITS"
        ]],
        theme: "plain", // No colors
        styles: {
          fontSize: 9,
          cellPadding: 3,
          lineColor: [0, 0, 0],
          lineWidth: 0.1,
          halign: "center"
        },
        headStyles: {
          fontStyle: "bold",
          fillColor: [240, 240, 240] // Light gray header
        }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 8;

      // 3. Production by Part & Supplier
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("2. PRODUCTION SUMMARY (BY PART & SUPPLIER)", 14, yPosition);
      yPosition += 5;

      const summaryTableData = partSummaryData.map(d => [
        d.partName.substring(0, 25), // Truncate if too long
        d.supplier.substring(0, 25),
        d.total.toLocaleString(),
        d.ok.toLocaleString(),
        d.ng.toLocaleString(),
        `${(d.total > 0 ? (d.ng / d.total * 100) : 0).toFixed(2)}%`
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [["Part Name", "Supplier", "Total", "OK", "NG", "Rate"]],
        body: summaryTableData,
        theme: "grid", // Simple grid
        styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1 },
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
        columnStyles: {
          2: { halign: 'right' },
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'right' }
        }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 8;

      // 4. Reject Type Analysis (Side by Side with Operator data if possible, or stacked compactly)
      // Let's stack them but tight.

      if (rejectTableDataWithImages.length > 0) {
        doc.setFontSize(11);
        doc.text("3. DEFECT ANALYSIS", 14, yPosition);
        yPosition += 5;

        // Two columns layout simulation? No, just list.
        const rejectBody = rejectTableDataWithImages.map(r => [
          r.type,
          r.count,
          `${r.percentage}%`,
          "" // Image placeholder
        ]);

        autoTable(doc, {
          startY: yPosition,
          head: [["Defect Type", "Qty", "%", "Visual"]],
          body: rejectBody,
          theme: "grid",
          styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1, minCellHeight: 12 },
          headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] },
          columnStyles: {
            0: { cellWidth: 40 },
            1: { cellWidth: 20, halign: 'right' },
            2: { cellWidth: 20, halign: 'right' },
            3: { cellWidth: 25 }
          },
          didDrawCell: (data) => {
            if (data.column.index === 3 && data.section === 'body') {
              const rowIndex = data.row.index;
              const imgData = rejectTableDataWithImages[rowIndex].image;
              if (imgData) {
                try {
                  // Smaller image to fit in row
                  doc.addImage(imgData, 'JPEG', data.cell.x + 2, data.cell.y + 1, 10, 10);
                } catch (err) { }
              }
            }
          }
        });

        yPosition = (doc as any).lastAutoTable.finalY + 8;
      }

      // Check for page break needed
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = 20;
      }

      // 5. Detailed Logs (Compact)
      if (logs.length > 0) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("4. DETAILED LOGS (LAST 25)", 14, yPosition);
        yPosition += 5;

        const recentLogsData = logs.slice(0, 25).map((log) => {
          const ngRate = (log.quantity_ng / log.quantity_all_sorting) * 100;
          return [
            new Date(log.logged_at).toLocaleString("en-US", { month: 'numeric', day: 'numeric', hour: "2-digit", minute: "2-digit", hour12: false }),
            log.parts_master?.part_name || log.part_no,
            log.factories?.company_name || "-",
            log.quantity_all_sorting,
            log.quantity_ng,
            log.ng_type || "-",
            `${ngRate.toFixed(1)}%`
          ];
        });

        autoTable(doc, {
          startY: yPosition,
          head: [["Time", "Part", "Supplier", "Total", "NG", "Type", "Rate"]],
          body: recentLogsData,
          theme: "grid",
          styles: { fontSize: 7, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.1, overflow: 'ellipsize' },
          headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] },
          columnStyles: {
            0: { cellWidth: 25 },
            3: { halign: "right", cellWidth: 15 },
            4: { halign: "right", cellWidth: 15 },
            6: { halign: "right", cellWidth: 15 },
          }
        });
      }

      // Footer
      const pageCount = (doc as any).getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(100);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - 20, pageHeight - 10, { align: "right" });
        doc.text("CONFIDENTIAL - INTERNAL USE ONLY", 14, pageHeight - 10);
      }

      const fileName = `Formal_Report_${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(fileName);

      toast({
        title: "Report Generated",
        description: "Formal report saved.",
      });

    } catch (error) {
      console.error("PDF Export Error:", error);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "There was an error generating the PDF report.",
      });
    }
  };

  const handleNotificationClick = () => {
    toast({
      title: "Notifications",
      description: "You have no new notifications at this time.",
    });
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white pb-24 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-900/20 to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-slate-400 text-sm">Real-time production stats</p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={exportToPDF}
              variant="ghost"
              size="icon"
              className="bg-[#1e293b]/50 border border-white/10 text-white hover:bg-white/10 rounded-full w-10 h-10"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              onClick={handleNotificationClick}
              variant="ghost"
              size="icon"
              className="bg-[#1e293b]/50 border border-white/10 text-white hover:bg-white/10 rounded-full w-10 h-10"
            >
              <Bell className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Connection Error Banner */}
        {connectionError && (
          <div className="mb-6 bg-red-500/10 border border-red-500/50 rounded-xl p-4 flex items-start gap-3">
            <div className="p-2 bg-red-500/20 rounded-full text-red-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-alert-circle"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
            </div>
            <div>
              <h3 className="text-white font-bold">Database Connection Error</h3>
              <p className="text-red-300 text-sm mt-1">{connectionError}</p>
              <p className="text-slate-400 text-xs mt-2">
                Please ensure you have run the <code className="bg-white/10 px-1 py-0.5 rounded">full_setup.sql</code> script in Supabase SQL Editor to create the necessary tables.
              </p>
            </div>
          </div>
        )}

        {/* Start Chart Section */}
        <div className="mb-6">
          <div className="h-72 w-full bg-[#1e293b]/50 backdrop-blur-md rounded-3xl border border-white/5 p-6 shadow-xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-t from-blue-500/10 to-transparent pointer-events-none" />
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div>
                <p className="text-slate-400 text-sm font-medium">Hourly Production</p>
                <h2 className="text-3xl font-bold text-white mt-1">{stats.totalSorted.toLocaleString()} <span className="text-sm font-normal text-slate-500">units</span></h2>
              </div>
              <div className="bg-blue-500/20 p-2 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-400" />
              </div>
            </div>

            <div className="h-40 w-full mt-4 -ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyData}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff' }}
                    cursor={{ stroke: '#ffffff20' }}
                  />
                  <Area type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        {/* End Chart Section */}

        {/* Middle Stats Section (Cards) */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-[#1e293b]/50 backdrop-blur-md rounded-3xl border border-white/5 p-5 shadow-lg flex flex-col justify-between h-36 relative overflow-hidden group hover:bg-[#1e293b]/70 transition-colors">
            <div className="absolute right-[-10px] top-[-10px] p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <Package className="w-20 h-20 text-white" />
            </div>
            <p className="text-slate-400 text-sm font-medium relative z-10">NG Rate</p>
            <div className="relative z-10">
              <h3 className="text-2xl font-bold text-white">{stats.ngRate.toFixed(2)}%</h3>
              <p className={`text-xs mt-1 ${stats.ngRate < 3 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {stats.ngRate < 3 ? 'Within Limits' : 'Action Required'}
              </p>
            </div>
          </div>

          <div className="bg-[#1e293b]/50 backdrop-blur-md rounded-3xl border border-white/5 p-5 shadow-lg flex flex-col justify-between h-36 relative overflow-hidden group hover:bg-[#1e293b]/70 transition-colors">
            <div className="absolute right-[-10px] top-[-10px] p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <Clock className="w-20 h-20 text-white" />
            </div>
            <p className="text-slate-400 text-sm font-medium relative z-10">Parts Processed</p>
            <div className="relative z-10">
              <h3 className="text-2xl font-bold text-white">{stats.partsProcessed}</h3>
              <p className="text-xs text-blue-400 mt-1">Unique IDs Scanned</p>
            </div>
          </div>
        </div>

        {/* Horizontal Scroll List (Now Dynamic) */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-white">Shift Status</h3>
            {/* <MoreHorizontal className="text-slate-400 w-5 h-5" /> */} {/* This line was commented out in the original, keeping it that way */}
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {statusItems.map((item) => (
              <div key={item.id} className="min-w-[150px] bg-[#1e293b]/50 backdrop-blur-md rounded-3xl border border-white/5 p-4 flex items-center gap-3 shadow-lg hover:scale-105 transition-transform">
                <div className={`w-10 h-10 rounded-full ${item.color_class} flex items-center justify-center text-white font-bold shadow-lg`}>
                  {item.icon_char}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{item.label}</p>
                  <p className="text-slate-400 text-xs">{item.sub_label}</p>
                </div>
              </div>
            ))}
            <div className="min-w-[150px] bg-white/5 border border-white/10 border-dashed rounded-3xl p-4 flex items-center justify-center gap-2 cursor-pointer hover:bg-white/10 transition-colors">
              <Plus className="w-5 h-5 text-slate-400" />
              <span className="text-slate-400 text-sm">Add Filter</span>
            </div>
          </div>
        </div>

        {/* Hourly Operator Output Table (Visible UI) */}
        <div className="mb-24">
          <h3 className="text-lg font-bold text-white mb-4">Hourly Operator Performance</h3>
          <div className="bg-[#1e293b]/50 backdrop-blur-md rounded-3xl border border-white/5 overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-white/5 text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Operator</th>
                    <th className="px-4 py-3">Hour</th>
                    <th className="px-4 py-3 text-right">Sorted</th>
                    <th className="px-4 py-3 text-right">NG</th>
                    <th className="px-4 py-3 text-right">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {hourlyOperatorData.length > 0 ? (
                    hourlyOperatorData.slice(0, 10).map((row, idx) => (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 font-medium text-white">{row.operator_name}</td>
                        <td className="px-4 py-3 text-slate-400">
                          {new Date(row.hour).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-300">{row.total_sorted.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-rose-400">{row.total_ng}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${row.ng_rate_percent > 3 ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                            }`}>
                            {row.ng_rate_percent.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                        No data available for today
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Floating Main Action Button */}
        <div className="fixed bottom-24 left-4 right-4 z-40">
          <Button
            onClick={() => navigate('/scan')}
            className="w-full py-7 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-lg font-bold rounded-2xl shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-2">
              <div className="bg-white/20 p-1 rounded-full">
                <Plus className="w-4 h-4" />
              </div>
              New Inspection Log
            </div>
          </Button>
        </div>
      </div>
      <BottomNav />
    </div >
  );
};

export default Dashboard;

