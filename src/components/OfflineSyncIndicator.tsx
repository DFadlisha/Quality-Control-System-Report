
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, CloudOff, CheckCircle2 } from "lucide-react";
import { getOfflineLogs, removeOfflineLog, clearOfflineLogs } from "@/utils/offlineStorage";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const OfflineSyncIndicator = () => {
    const { toast } = useToast();
    const [offlineCount, setOfflineCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);

    const checkOfflineLogs = () => {
        const logs = getOfflineLogs();
        setOfflineCount(logs.length);
    };

    useEffect(() => {
        checkOfflineLogs();

        // Poll every 5 seconds to update the count (in case user added more via Scan)
        const interval = setInterval(checkOfflineLogs, 5000);
        return () => clearInterval(interval);
    }, []);

    const uploadImageToSupabase = async (base64Image: string, partNo: string): Promise<string | null> => {
        try {
            const response = await fetch(base64Image);
            const blob = await response.blob();
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `rejects/${partNo}_${timestamp}_offline_sync.jpg`;

            const { error } = await supabase.storage
                .from('reject-images')
                .upload(filename, blob, {
                    contentType: 'image/jpeg',
                    upsert: false,
                });

            if (error) throw error;

            const { data: urlData } = supabase.storage
                .from('reject-images')
                .getPublicUrl(filename);

            return urlData.publicUrl;
        } catch (error) {
            console.error("Error uploading image:", error);
            // If image fails, return null but allow log to proceed? 
            // Better to fail the whole sync item so we can retry.
            throw error;
        }
    };

    const handleSync = async () => {
        if (!navigator.onLine) {
            toast({
                title: "Still Offline",
                description: "Cannot sync no internet connection.",
                variant: "destructive",
            });
            return;
        }

        setIsSyncing(true);
        const logs = getOfflineLogs();
        let successCount = 0;
        let failCount = 0;

        for (const log of logs) {
            try {
                let imageUrl: string | null = null;

                // If there is an image, try to upload it first
                if (log.reject_image_base64) {
                    imageUrl = await uploadImageToSupabase(log.reject_image_base64, log.part_no);
                }

                let finalFactoryId = log.factory_id;

                // If no ID but name exists, resolve it
                if (!finalFactoryId && log.factory_name) {
                    const { data: existingFactory } = await supabase
                        .from('factories')
                        .select('id')
                        .ilike('company_name', log.factory_name)
                        .maybeSingle();

                    if (existingFactory) {
                        finalFactoryId = existingFactory.id;
                    } else {
                        // Create new factory
                        const { data: newFactory, error: createError } = await supabase
                            .from('factories')
                            .insert({
                                company_name: log.factory_name,
                                location: log.factory_name // Default location to name
                            })
                            .select('id')
                            .single();

                        if (!createError && newFactory) {
                            finalFactoryId = newFactory.id;
                        }
                    }
                }

                const { error } = await supabase.from("sorting_logs").insert({
                    part_no: log.part_no,
                    quantity_all_sorting: log.quantity_all_sorting,
                    quantity_ng: log.quantity_ng,
                    operator_name: log.operator_name,
                    factory_id: finalFactoryId,
                    reject_image_url: imageUrl,
                    // @ts-ignore casting to any because ng_type might not be in the generated types yet
                    ng_type: log.ng_type,
                    logged_at: log.timestamp, // Preserve original timestamp
                });

                if (error) throw error;

                // If successful, remove from offline storage
                removeOfflineLog(log.id);
                successCount++;

            } catch (error) {
                console.error("Sync failed for log:", log.id, error);
                failCount++;
            }
        }

        checkOfflineLogs();
        setIsSyncing(false);

        if (successCount > 0) {
            toast({
                title: "Sync Complete",
                description: `Successfully uploaded ${successCount} logs.`,
                className: "bg-success text-success-foreground",
            });
        }

        if (failCount > 0) {
            toast({
                title: "Sync Issues",
                description: `Failed to upload ${failCount} logs. Please try again.`,
                variant: "destructive",
            });
        }
    };

    if (offlineCount === 0) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500/90 backdrop-blur-sm text-white px-4 py-2 flex items-center justify-between shadow-lg animate-in slide-in-from-top">
            <div className="flex items-center gap-2">
                <CloudOff className="h-4 w-4" />
                <span className="text-sm font-medium">
                    {offlineCount} pending upload{offlineCount !== 1 ? 's' : ''}
                </span>
            </div>

            <Button
                size="sm"
                variant="secondary"
                onClick={handleSync}
                disabled={isSyncing}
                className="h-8 gap-2 bg-white text-amber-600 hover:bg-white/90 font-bold"
            >
                {isSyncing ? (
                    <>
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        Syncing...
                    </>
                ) : (
                    <>
                        <RefreshCw className="h-3 w-3" />
                        Sync Now
                    </>
                )}
            </Button>
        </div>
    );
};

export default OfflineSyncIndicator;
