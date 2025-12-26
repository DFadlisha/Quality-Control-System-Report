import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScanLine, BarChart3, History, Settings } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50/70 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/30">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12 space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
            Quality Sorting System
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto font-medium">
            Mobile data capture for SIC location Triplus reporting. Streamline your hourly quality
            sorting activities with automated part lookup and real-time reporting.
          </p>
        </div>

        {/* Main Actions */}
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <Card
            className="p-8 hover:shadow-2xl transition-all duration-300 cursor-pointer group border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-xl hover:scale-105"
            onClick={() => navigate("/scan")}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-all duration-300 group-hover:scale-110">
                <ScanLine className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">Scan & Log</h2>
              <p className="text-blue-100 font-medium">
                Scan part barcodes and quickly log sorting quantities
              </p>
              <Button size="lg" className="w-full mt-4 bg-white text-blue-600 hover:bg-blue-50 font-semibold shadow-lg">
                Start Scanning
              </Button>
            </div>
          </Card>

          <Card
            className="p-8 hover:shadow-2xl transition-all duration-300 cursor-pointer group border-0 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-xl hover:scale-105"
            onClick={() => navigate("/dashboard")}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-all duration-300 group-hover:scale-110">
                <BarChart3 className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">Dashboard</h2>
              <p className="text-indigo-100 font-medium">
                View real-time analytics and hourly production reports
              </p>
              <Button size="lg" variant="outline" className="w-full mt-4 bg-white/10 border-2 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm font-semibold">
                View Dashboard
              </Button>
            </div>
          </Card>
        </div>

        {/* Features */}
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent mb-6 text-center">
            Key Features
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-slate-200/50 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="flex items-start space-x-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                  <ScanLine className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 text-lg">Automated Lookup</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Part names automatically retrieved from master database
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-slate-200/50 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="flex items-start space-x-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                  <History className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 text-lg">Real-time Updates</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Instant synchronization with live dashboard updates
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-slate-200/50 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="flex items-start space-x-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                  <BarChart3 className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 text-lg">NG Rate Tracking</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Monitor quality trends and prevent line stoppages
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Info Section */}
        <Card className="max-w-4xl mx-auto mt-12 p-6 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 border-slate-300/50 dark:border-slate-700 shadow-xl">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 text-lg">System Information</h4>
              <p className="text-sm text-slate-700 dark:text-slate-300 mb-2 font-medium">
                This system integrates barcode scanning with automated database lookup to reduce
                manual input and enable timely hourly reports. All entries are timestamped and
                stored in real-time.
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                Data feeds directly to supplier production teams for proactive stock management.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Index;
