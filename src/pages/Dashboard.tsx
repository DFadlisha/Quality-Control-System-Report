import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, TrendingDown, Package, Clock, AlertTriangle, Download } from "lucide-react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface SortingLog {
  id: string;
  part_no: string;
  part_name: string;
  quantity_all_sorting: number;
  quantity_ng: number;
  logged_at: string;
  operator_name?: string;
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

const Dashboard = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<SortingLog[]>([]);
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [hourlyOperatorData, setHourlyOperatorData] = useState<HourlyOperatorOutput[]>([]);
  const [stats, setStats] = useState({
    totalSorted: 0,
    totalNg: 0,
    ngRate: 0,
    partsProcessed: 0,
  });

  useEffect(() => {
    fetchLogs();
    fetchHourlyOperatorOutput();
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
          fetchHourlyOperatorOutput();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("sorting_logs")
        .select("*")
        .order("logged_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      if (data) {
        setLogs(data);
        processData(data);
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
    }
  };

  const fetchHourlyOperatorOutput = async () => {
    try {
      // Fetch from the hourly_operator_output view
      const { data, error } = await supabase
        .from("hourly_operator_output")
        .select("*")
        .order("hour", { ascending: false })
        .limit(50); // Get last 50 hours of data

      if (error) throw error;
      if (data) {
        setHourlyOperatorData(data);
      }
    } catch (error) {
      console.error("Error fetching hourly operator output:", error);
    }
  };

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
  };

  const exportToPDF = () => {
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
      doc.rect(0, 0, pageWidth, 35, "F");
      
      // Company/Title text
      doc.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("SIC Triplus - Quality Sorting Report", pageWidth / 2, 18, { align: "center" });
      
      // Subtitle
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Generated: ${new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`,
        pageWidth / 2,
        28,
        { align: "center" }
      );
      
      // Reset text color
      doc.setTextColor(colors.black[0], colors.black[1], colors.black[2]);
      return yPos + 45;
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

    const addCoverPage = () => {
      // Full page background gradient effect (top section)
      doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.rect(0, 0, pageWidth, pageHeight * 0.4, "F");
      
      // Decorative bottom section
      doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]);
      doc.rect(0, pageHeight * 0.4, pageWidth, pageHeight * 0.6, "F");
      
      // Company Logo Area (placeholder - can be replaced with actual logo if available)
      const logoY = 50;
      doc.setFillColor(colors.white[0], colors.white[1], colors.white[2]);
      doc.roundedRect(pageWidth / 2 - 30, logoY, 60, 40, 5, 5, "F");
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.text("T", pageWidth / 2, logoY + 25, { align: "center" });
      
      // Main Title
      doc.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
      doc.setFontSize(28);
      doc.setFont("helvetica", "bold");
      doc.text("Quality Sorting System", pageWidth / 2, logoY + 70, { align: "center" });
      
      // Subtitle
      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      doc.text("SIC Location - Triplus Reporting", pageWidth / 2, logoY + 85, { align: "center" });
      
      // Description Box
      const descY = pageHeight * 0.45;
      doc.setFillColor(colors.white[0], colors.white[1], colors.white[2]);
      doc.roundedRect(20, descY, pageWidth - 40, 35, 5, 5, "F");
      
      doc.setTextColor(colors.black[0], colors.black[1], colors.black[2]);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const description = "Mobile data capture for SIC location Triplus reporting. Streamline your hourly quality sorting activities with automated part lookup and real-time reporting.";
      doc.text(description, pageWidth / 2, descY + 12, { align: "center", maxWidth: pageWidth - 60 });
      
      // Key Features Section
      const featuresY = descY + 50;
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.text("Key Features", pageWidth / 2, featuresY, { align: "center" });
      
      // Feature boxes
      const featureBoxY = featuresY + 15;
      const featureWidth = (pageWidth - 60) / 3;
      
      // Feature 1: Automated Lookup
      doc.setFillColor(colors.accent[0], colors.accent[1], colors.accent[2]);
      doc.roundedRect(20, featureBoxY, featureWidth, 40, 3, 3, "F");
      doc.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Automated Lookup", 20 + featureWidth / 2, featureBoxY + 8, { align: "center" });
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("Part names automatically", 20 + featureWidth / 2, featureBoxY + 18, { align: "center" });
      doc.text("retrieved from database", 20 + featureWidth / 2, featureBoxY + 26, { align: "center" });
      
      // Feature 2: Real-time Updates
      doc.setFillColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
      doc.roundedRect(20 + featureWidth + 10, featureBoxY, featureWidth, 40, 3, 3, "F");
      doc.text("Real-time Updates", 20 + featureWidth + 10 + featureWidth / 2, featureBoxY + 8, { align: "center" });
      doc.setFontSize(8);
      doc.text("Instant synchronization", 20 + featureWidth + 10 + featureWidth / 2, featureBoxY + 18, { align: "center" });
      doc.text("with live dashboard", 20 + featureWidth + 10 + featureWidth / 2, featureBoxY + 26, { align: "center" });
      
      // Feature 3: NG Rate Tracking
      doc.setFillColor(colors.warning[0], colors.warning[1], colors.warning[2]);
      doc.roundedRect(20 + (featureWidth + 10) * 2, featureBoxY, featureWidth, 40, 3, 3, "F");
      doc.text("NG Rate Tracking", 20 + (featureWidth + 10) * 2 + featureWidth / 2, featureBoxY + 8, { align: "center" });
      doc.setFontSize(8);
      doc.text("Monitor quality trends", 20 + (featureWidth + 10) * 2 + featureWidth / 2, featureBoxY + 18, { align: "center" });
      doc.text("and prevent issues", 20 + (featureWidth + 10) * 2 + featureWidth / 2, featureBoxY + 26, { align: "center" });
      
      // System Information Box
      const infoY = featureBoxY + 55;
      doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]);
      doc.roundedRect(20, infoY, pageWidth - 40, 30, 3, 3, "F");
      
      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("System Information", 30, infoY + 8);
      
      doc.setTextColor(colors.darkGray[0], colors.darkGray[1], colors.darkGray[2]);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("This system integrates barcode scanning with automated database lookup to reduce", 30, infoY + 18, { maxWidth: pageWidth - 60 });
      doc.text("manual input and enable timely hourly reports. All entries are timestamped and stored in real-time.", 30, infoY + 25, { maxWidth: pageWidth - 60 });
      
      // Report Date
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(colors.darkGray[0], colors.darkGray[1], colors.darkGray[2]);
      doc.text(
        `Report Generated: ${new Date().toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" })}`,
        pageWidth / 2,
        pageHeight - 20,
        { align: "center" }
      );
    };

    // Add cover page first
    addCoverPage();
    
    // Add main report content on new page
    doc.addPage();
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
    
    yPosition += boxHeight + 20;

    // Hourly Operator Output Table
    if (hourlyOperatorData.length > 0) {
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = addHeader(0);
      }

      // Section header with background
      doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]);
      doc.rect(14, yPosition - 5, pageWidth - 28, 8, "F");
      
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.text("Hourly Output Per Operator", 18, yPosition);
      yPosition += 12;

      const operatorTableData = hourlyOperatorData.slice(0, 30).map((row, index) => [
        row.operator_name,
        new Date(row.hour).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        row.total_logs.toString(),
        row.total_sorted.toString(),
        row.total_ng.toString(),
        `${row.ng_rate_percent.toFixed(1)}%`,
      ]);

      (doc as any).autoTable({
        startY: yPosition,
        head: [["Operator", "Hour", "Logs", "Total Sorted", "NG", "NG Rate"]],
        body: operatorTableData,
        theme: "striped",
        headStyles: { 
          fillColor: [colors.primary[0], colors.primary[1], colors.primary[2]], 
          fontStyle: "bold",
          textColor: [255, 255, 255],
          fontSize: 10,
        },
        bodyStyles: { 
          fontSize: 9,
          textColor: [0, 0, 0],
        },
        alternateRowStyles: {
          fillColor: [colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]],
        },
        styles: { 
          cellPadding: 3,
          lineWidth: 0.1,
          lineColor: [200, 200, 200],
        },
        margin: { left: 14, right: 14 },
        columnStyles: {
          0: { fontStyle: "bold" },
          2: { halign: "right", cellWidth: 30 },
          3: { halign: "right", cellWidth: 40 },
          4: { halign: "right", cellWidth: 30, textColor: [colors.danger[0], colors.danger[1], colors.danger[2]] },
          5: { halign: "right", cellWidth: 35 },
        },
        didParseCell: (data: any) => {
          // Color code NG Rate column
          if (data.column.index === 5 && data.row.index >= 0) {
            const ngRate = parseFloat(data.cell.text[0].replace('%', ''));
            if (ngRate > 5) {
              data.cell.styles.textColor = [colors.danger[0], colors.danger[1], colors.danger[2]];
              data.cell.styles.fontStyle = "bold";
            } else if (ngRate > 2) {
              data.cell.styles.textColor = [colors.warning[0], colors.warning[1], colors.warning[2]];
              data.cell.styles.fontStyle = "bold";
            }
          }
        },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }

    // Recent Logs Table
    if (logs.length > 0) {
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = addHeader(0);
      }

      // Section header with background
      doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]);
      doc.rect(14, yPosition - 5, pageWidth - 28, 8, "F");
      
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.text("Recent Logs", 18, yPosition);
      yPosition += 12;

      const recentLogsData = logs.slice(0, 30).map((log) => {
        const ngRate = (log.quantity_ng / log.quantity_all_sorting) * 100;
        return [
          new Date(log.logged_at).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
          log.operator_name || "N/A",
          log.part_no,
          log.part_name.substring(0, 25), // Truncate long names
          log.quantity_all_sorting.toString(),
          log.quantity_ng.toString(),
          `${ngRate.toFixed(1)}%`,
        ];
      });

      (doc as any).autoTable({
        startY: yPosition,
        head: [["Time", "Operator", "Part No", "Part Name", "Sorted", "NG", "NG Rate"]],
        body: recentLogsData,
        theme: "striped",
        headStyles: { 
          fillColor: [colors.primary[0], colors.primary[1], colors.primary[2]], 
          fontStyle: "bold",
          textColor: [255, 255, 255],
          fontSize: 9,
        },
        bodyStyles: { 
          fontSize: 8,
          textColor: [0, 0, 0],
        },
        alternateRowStyles: {
          fillColor: [colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]],
        },
        styles: { 
          cellPadding: 2.5,
          lineWidth: 0.1,
          lineColor: [200, 200, 200],
        },
        margin: { left: 14, right: 14 },
        columnStyles: {
          1: { fontStyle: "bold", cellWidth: 35 },
          2: { fontFamily: "courier", cellWidth: 40 },
          4: { halign: "right", cellWidth: 25 },
          5: { halign: "right", cellWidth: 25, textColor: [colors.danger[0], colors.danger[1], colors.danger[2]] },
          6: { halign: "right", cellWidth: 30 },
        },
        didParseCell: (data: any) => {
          // Color code NG Rate column
          if (data.column.index === 6 && data.row.index >= 0) {
            const ngRate = parseFloat(data.cell.text[0].replace('%', ''));
            if (ngRate > 5) {
              data.cell.styles.textColor = [colors.danger[0], colors.danger[1], colors.danger[2]];
              data.cell.styles.fontStyle = "bold";
            } else if (ngRate > 2) {
              data.cell.styles.textColor = [colors.warning[0], colors.warning[1], colors.warning[2]];
              data.cell.styles.fontStyle = "bold";
            }
          }
        },
      });
    }

    // Professional Footer on report pages (skip cover page)
    const pageCount = doc.getNumberOfPages();
    for (let i = 2; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Footer line
      doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.setLineWidth(0.5);
      doc.line(14, pageHeight - 20, pageWidth - 14, pageHeight - 20);
      
      // Footer text (adjust page number for cover page)
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(colors.darkGray[0], colors.darkGray[1], colors.darkGray[2]);
      doc.text(
        `SIC Triplus Quality Sorting System | Page ${i - 1} of ${pageCount - 1}`,
        pageWidth / 2,
        pageHeight - 12,
        { align: "center" }
      );
      
      // Confidential notice
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      doc.text(
        "Confidential - For Internal Use Only",
        pageWidth / 2,
        pageHeight - 7,
        { align: "center" }
      );
    }

    // Save the PDF
    const fileName = `Quality_Sorting_Report_${new Date().toISOString().split("T")[0]}.pdf`;
    doc.save(fileName);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-lg p-4 shadow-sm border border-slate-200/50 dark:border-slate-800">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="hover:bg-primary/10 hover:text-primary"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
            Quality Dashboard
          </h1>
          <Button
            onClick={exportToPDF}
            variant="default"
            className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
          >
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-100 font-medium">Total Sorted</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {stats.totalSorted.toLocaleString()}
                </p>
              </div>
              <div className="bg-white/20 rounded-full p-3 backdrop-blur-sm">
                <Package className="h-8 w-8 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-red-500 to-red-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-100 font-medium">Total NG</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {stats.totalNg.toLocaleString()}
                </p>
              </div>
              <div className="bg-white/20 rounded-full p-3 backdrop-blur-sm">
                <TrendingDown className="h-8 w-8 text-white" />
              </div>
            </div>
          </Card>

          <Card className={`p-6 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 ${
            stats.ngRate > 5
              ? "bg-gradient-to-br from-red-500 to-red-600"
              : stats.ngRate > 2
              ? "bg-gradient-to-br from-amber-500 to-amber-600"
              : "bg-gradient-to-br from-emerald-500 to-emerald-600"
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${
                  stats.ngRate > 5
                    ? "text-red-100"
                    : stats.ngRate > 2
                    ? "text-amber-100"
                    : "text-emerald-100"
                }`}>
                  NG Rate
                </p>
                <p className="text-3xl font-bold text-white mt-2">
                  {stats.ngRate.toFixed(1)}%
                </p>
              </div>
              <div className="bg-white/20 rounded-full p-3 backdrop-blur-sm">
                <AlertTriangle className="h-8 w-8 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-indigo-100 font-medium">Parts Processed</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {stats.partsProcessed}
                </p>
              </div>
              <div className="bg-white/20 rounded-full p-3 backdrop-blur-sm">
                <Clock className="h-8 w-8 text-white" />
              </div>
            </div>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-slate-200/50 dark:border-slate-800 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Hourly Production</h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="hour" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                />
                <Legend />
                <Bar dataKey="total" fill="#3b82f6" name="Total Sorted" radius={[8, 8, 0, 0]} />
                <Bar dataKey="ng" fill="#ef4444" name="NG" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-slate-200/50 dark:border-slate-800 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 bg-gradient-to-b from-amber-500 to-amber-600 rounded-full"></div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">NG Rate Trend</h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="hour" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="ngRate"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  name="NG Rate %"
                  dot={{ fill: "#f59e0b", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Hourly Operator Output */}
        <Card className="p-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-slate-200/50 dark:border-slate-800 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-6 bg-gradient-to-b from-indigo-500 to-indigo-600 rounded-full"></div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Hourly Output Per Operator</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-indigo-500 to-indigo-600">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-white">
                    Operator
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-white">
                    Hour
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-white">
                    Logs
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-white">
                    Total Sorted
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-white">
                    NG
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-white">
                    NG Rate
                  </th>
                </tr>
              </thead>
              <tbody>
                {hourlyOperatorData.length > 0 ? (
                  hourlyOperatorData.map((row, index) => (
                    <tr key={`${row.operator_name}-${row.hour}-${index}`} className={`border-b border-slate-200 dark:border-slate-700 ${
                      index % 2 === 0 ? "bg-slate-50/50 dark:bg-slate-800/50" : "bg-white dark:bg-slate-900"
                    } hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors`}>
                      <td className="py-3 px-4 text-sm font-semibold">
                        {row.operator_name}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {new Date(row.hour).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-semibold">
                        {row.total_logs}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-semibold">
                        {row.total_sorted}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-semibold text-destructive">
                        {row.total_ng}
                      </td>
                      <td
                        className={`py-3 px-4 text-sm text-right font-semibold ${
                          row.ng_rate_percent > 5
                            ? "text-destructive"
                            : row.ng_rate_percent > 2
                            ? "text-warning"
                            : "text-success"
                        }`}
                      >
                        {row.ng_rate_percent.toFixed(1)}%
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      No hourly operator data available yet. Start logging sorting activities to see results.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Recent Logs */}
        <Card className="p-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-slate-200/50 dark:border-slate-800 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-6 bg-gradient-to-b from-slate-500 to-slate-600 rounded-full"></div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Recent Logs</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-slate-500 to-slate-600">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-white">
                    Time
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-white">
                    Operator
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-white">
                    Part No
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-white">
                    Part Name
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-white">
                    Sorted
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-white">
                    NG
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-white">
                    NG Rate
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.slice(0, 10).map((log, index) => {
                  const ngRate = (log.quantity_ng / log.quantity_all_sorting) * 100;
                  return (
                    <tr key={log.id} className={`border-b border-slate-200 dark:border-slate-700 ${
                      index % 2 === 0 ? "bg-slate-50/50 dark:bg-slate-800/50" : "bg-white dark:bg-slate-900"
                    } hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors`}>
                      <td className="py-3 px-4 text-sm">
                        {new Date(log.logged_at).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-4 text-sm font-semibold">
                        {log.operator_name || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-sm font-mono">{log.part_no}</td>
                      <td className="py-3 px-4 text-sm">{log.part_name}</td>
                      <td className="py-3 px-4 text-sm text-right font-semibold">
                        {log.quantity_all_sorting}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-semibold text-destructive">
                        {log.quantity_ng}
                      </td>
                      <td
                        className={`py-3 px-4 text-sm text-right font-semibold ${
                          ngRate > 5
                            ? "text-destructive"
                            : ngRate > 2
                            ? "text-warning"
                            : "text-success"
                        }`}
                      >
                        {ngRate.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
