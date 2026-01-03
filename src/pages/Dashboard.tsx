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
  const exportToPDF = () => {
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

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Professional color scheme
      const colors = {
        primary: [30, 58, 138],      // Deep blue
        secondary: [59, 130, 246],   // Bright blue
        accent: [16, 185, 129],      // Green
        danger: [239, 68, 68],       // Red
        warning: [245, 158, 11],     // Orange
        lightGray: [243, 244, 246],  // Light gray
        darkGray: [107, 114, 128],   // Dark gray
        white: [255, 255, 255],
        black: [0, 0, 0],
      };

      const addHeader = (yPos: number) => {
        // Header background
        doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.rect(0, 0, pageWidth, 40, "F");

        // Report Title
        doc.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text("Quality Sorting Inspection Report", pageWidth / 2, 20, { align: "center" });

        // Subtitle / Date
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(
          `Generated: ${new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`,
          pageWidth / 2,
          30,
          { align: "center" }
        );

        // Reset text color
        doc.setTextColor(colors.black[0], colors.black[1], colors.black[2]);
        return yPos + 50;
      };

      const addStatBox = (x: number, y: number, width: number, height: number, label: string, value: string, color: number[]) => {
        // Box background with gradient effect
        doc.setFillColor(color[0], color[1], color[2]);
        doc.setDrawColor(color[0] - 20, color[1] - 20, color[2] - 20);
        doc.setLineWidth(0.5);
        doc.roundedRect(x, y, width, height, 3, 3, "FD");

        // Label
        doc.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(label, x + width / 2, y + 8, { align: "center" });

        // Value
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(value, x + width / 2, y + 18, { align: "center" });

        // Reset text color
        doc.setTextColor(colors.black[0], colors.black[1], colors.black[2]);
      };

      // Start Content (No Cover Page)
      let yPosition = addHeader(0);

      // Summary Statistics Section with colored boxes
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.text("Summary Statistics", 14, yPosition);
      yPosition += 12;

      // Calculate box dimensions
      const boxWidth = (pageWidth - 28 - 12) / 4; // 4 boxes with spacing
      const boxHeight = 25;
      const boxSpacing = 4;

      // Stat boxes
      addStatBox(14, yPosition, boxWidth, boxHeight, "Total Sorted", stats.totalSorted.toLocaleString(), colors.secondary);
      addStatBox(14 + boxWidth + boxSpacing, yPosition, boxWidth, boxHeight, "Total NG", stats.totalNg.toLocaleString(), colors.danger);

      const ngRateColor = stats.ngRate > 5 ? colors.danger : stats.ngRate > 2 ? colors.warning : colors.accent;
      addStatBox(14 + (boxWidth + boxSpacing) * 2, yPosition, boxWidth, boxHeight, "NG Rate", `${stats.ngRate.toFixed(2)}%`, ngRateColor);
      addStatBox(14 + (boxWidth + boxSpacing) * 3, yPosition, boxWidth, boxHeight, "Parts Processed", stats.partsProcessed.toString(), colors.accent);

      yPosition += boxHeight + 8; // Reduced spacing

      // Hourly Operator Output Table
      if (hourlyOperatorData.length > 0) {
        // Section header with background
        doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]);
        doc.rect(14, yPosition - 4, pageWidth - 28, 6, "F");

        doc.setFontSize(11); // Smaller header
        doc.setFont("helvetica", "bold");
        doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.text("Top Operator Performance (Last 5 Active)", 16, yPosition);
        yPosition += 8;

        const operatorTableData = hourlyOperatorData.slice(0, 5).map((row, index) => [ // Limit to 5
          row.operator_name,
          new Date(row.hour).toLocaleString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          row.total_logs.toString(),
          row.total_sorted.toString(),
          row.total_ng.toString(),
          `${row.ng_rate_percent.toFixed(1)}%`,
        ]);

        autoTable(doc, {
          startY: yPosition,
          head: [["Operator", "Hour", "Logs", "Total Sorted", "NG", "NG Rate"]],
          body: operatorTableData,
          theme: "striped",
          headStyles: {
            fillColor: [colors.primary[0], colors.primary[1], colors.primary[2]],
            fontStyle: "bold",
            textColor: [255, 255, 255],
            fontSize: 8, // Smaller header font
            halign: 'center'
          },
          bodyStyles: {
            fontSize: 7, // Compact font
            textColor: [0, 0, 0],
            cellPadding: 1.5,
          },
          columnStyles: {
            0: { fontStyle: "bold" },
            2: { halign: "right" },
            3: { halign: "right" },
            4: { halign: "right", textColor: [colors.danger[0], colors.danger[1], colors.danger[2]] },
            5: { halign: "right" },
          },
          alternateRowStyles: {
            fillColor: [colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]],
          },
          margin: { left: 14, right: 14 },
          didParseCell: (data: any) => {
            // Color code NG Rate column
            if (data.column.index === 5 && data.row.index >= 0) {
              const ngRate = parseFloat(data.cell.text[0].replace('%', ''));
              if (ngRate > 5) {
                data.cell.styles.textColor = [colors.danger[0], colors.danger[1], colors.danger[2]];
                data.cell.styles.fontStyle = "bold";
              }
            }
          }
        });

        yPosition = (doc as any).lastAutoTable.finalY + 10; // Reduced spacing
      }

      // Recent Logs Table
      if (logs.length > 0) {
        // Section header with background
        doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]);
        doc.rect(14, yPosition - 4, pageWidth - 28, 6, "F");

        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.text("Recent Scans (Last 10)", 16, yPosition);
        yPosition += 8;

        const recentLogsData = logs.slice(0, 10).map((log) => { // Limit to 10
          const ngRate = (log.quantity_ng / log.quantity_all_sorting) * 100;
          const status = ngRate <= 3 ? "PASS" : "REVIEW";
          const partName = log.parts_master?.part_name || "";
          return [
            new Date(log.logged_at).toLocaleString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            log.operator_name || "N/A",
            log.part_no,
            partName.substring(0, 12),
            log.quantity_all_sorting.toString(),
            log.quantity_ng.toString(),
            `${ngRate.toFixed(1)}%`,
            status,
            log.reject_image_url ? "Link" : "",
          ];
        });

        autoTable(doc, {
          startY: yPosition,
          head: [["Time", "Op", "Part No", "Part Name", "Qty", "NG", "Rate", "Status", "Img"]],
          body: recentLogsData,
          theme: "striped",
          headStyles: {
            fillColor: [colors.primary[0], colors.primary[1], colors.primary[2]],
            fontStyle: "bold",
            textColor: [255, 255, 255],
            fontSize: 8,
            halign: 'center'
          },
          bodyStyles: {
            fontSize: 7,
            textColor: [0, 0, 0],
            cellPadding: 1.5,
          },
          columnStyles: {
            4: { halign: "right" },
            5: { halign: "right", textColor: [colors.danger[0], colors.danger[1], colors.danger[2]] },
            6: { halign: "right" },
            7: { halign: "center", fontStyle: "bold" },
            8: { halign: "center", textColor: [colors.secondary[0], colors.secondary[1], colors.secondary[2]] }
          },
          alternateRowStyles: {
            fillColor: [colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]],
          },
          margin: { left: 14, right: 14 },
          didParseCell: (data: any) => {
            if (data.column.index === 8 && data.cell.raw) {
              (data.cell as any).link = logs[data.row.index].reject_image_url;
            }
            if (data.column.index === 7 && data.section === 'body') {
              const status = data.cell.text[0];
              if (status === "PASS") data.cell.styles.textColor = [colors.accent[0], colors.accent[1], colors.accent[2]];
              else data.cell.styles.textColor = [colors.danger[0], colors.danger[1], colors.danger[2]];
            }
          }
        });
      }

      // Professional Footer for all pages
      const pageCount = (doc as any).getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        // Footer line
        doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.setLineWidth(0.5);
        doc.line(14, pageHeight - 20, pageWidth - 14, pageHeight - 20);

        // Footer text (Generic)
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(colors.darkGray[0], colors.darkGray[1], colors.darkGray[2]);
        doc.text(
          `Quality Sorting System - Internal Report | Page ${i} of ${pageCount}`,
          pageWidth / 2,
          pageHeight - 12,
          { align: "center" }
        );

        // Confidential notice
        doc.setFontSize(7);
        doc.setFont("helvetica", "italic");
        doc.text(
          "Confidential - For Internal Use Only. This report contains proprietary data.",
          pageWidth / 2,
          pageHeight - 7,
          { align: "center" }
        );
      }

      // Save the PDF
      const fileName = `Quality_Report_${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(fileName);

      toast({
        title: "Report Downloaded",
        description: "Quality inspection report has been saved to your device.",
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

