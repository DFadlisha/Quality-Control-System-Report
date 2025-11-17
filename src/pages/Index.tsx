import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScanLine, BarChart3, History, Settings } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/10">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-4">
            <ScanLine className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            Quality Sorting System
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Mobile data capture for SIC location Triplus reporting. Streamline your hourly quality
            sorting activities with automated part lookup and real-time reporting.
          </p>
        </div>

        {/* Main Actions */}
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <Card
            className="p-8 hover:shadow-lg transition-all cursor-pointer group border-2 hover:border-primary"
            onClick={() => navigate("/scan")}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <ScanLine className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Scan & Log</h2>
              <p className="text-muted-foreground">
                Scan part barcodes and quickly log sorting quantities
              </p>
              <Button size="lg" className="w-full mt-4">
                Start Scanning
              </Button>
            </div>
          </Card>

          <Card
            className="p-8 hover:shadow-lg transition-all cursor-pointer group border-2 hover:border-primary"
            onClick={() => navigate("/dashboard")}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <BarChart3 className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
              <p className="text-muted-foreground">
                View real-time analytics and hourly production reports
              </p>
              <Button size="lg" variant="outline" className="w-full mt-4">
                View Dashboard
              </Button>
            </div>
          </Card>
        </div>

        {/* Features */}
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-foreground mb-6 text-center">Key Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
                  <ScanLine className="w-6 h-6 text-success" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Automated Lookup</h4>
                  <p className="text-sm text-muted-foreground">
                    Part names automatically retrieved from master database
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <History className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Real-time Updates</h4>
                  <p className="text-sm text-muted-foreground">
                    Instant synchronization with live dashboard updates
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-2">NG Rate Tracking</h4>
                  <p className="text-sm text-muted-foreground">
                    Monitor quality trends and prevent line stoppages
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Info Section */}
        <Card className="max-w-4xl mx-auto mt-12 p-6 bg-muted">
          <div className="flex items-start space-x-4">
            <Settings className="w-6 h-6 text-muted-foreground mt-1 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-foreground mb-2">System Information</h4>
              <p className="text-sm text-muted-foreground mb-2">
                This system integrates barcode scanning with automated database lookup to reduce
                manual input and enable timely hourly reports. All entries are timestamped and
                stored in real-time.
              </p>
              <p className="text-sm text-muted-foreground">
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
