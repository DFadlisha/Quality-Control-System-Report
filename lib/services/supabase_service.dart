import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter/foundation.dart';
import 'package:myapp/models/sorting_log.dart';

class SupabaseService {
  final SupabaseClient _client = Supabase.instance.client;

  // Add a new sorting log with NG details
  Future<String> addSortingLog(SortingLog log) async {
    try {
      // Insert the main sorting log
      final response = await _client
          .from('sorting_logs')
          .insert(log.toJson())
          .select('id')
          .single();

      final logId = response['id'] as String;

      // Insert NG details if any
      if (log.ngDetails.isNotEmpty) {
        final ngDetailsData = log.ngDetails.map((detail) {
          return {
            'sorting_log_id': logId,
            'type': detail.type,
            'operator_name': detail.operatorName,
            'image_url': detail.imageUrl,
          };
        }).toList();

        await _client.from('ng_details').insert(ngDetailsData);
      }

      return logId;
    } catch (e) {
      debugPrint('Error adding sorting log: $e');
      rethrow;
    }
  }

  // Get a stream of sorting logs with NG details
  Stream<List<SortingLog>> getSortingLogs() {
    return _client
        .from('sorting_logs')
        .stream(primaryKey: ['id'])
        .order('timestamp', ascending: false)
        .asyncMap((data) async {
          // For each sorting log, fetch its NG details
          List<SortingLog> logs = [];
          
          for (var logData in data) {
            // Fetch NG details for this log
            final ngDetailsResponse = await _client
                .from('ng_details')
                .select()
                .eq('sorting_log_id', logData['id']);

            final ngDetails = (ngDetailsResponse as List)
                .map((ng) => NgDetail.fromJson(ng))
                .toList();

            logs.add(SortingLog.fromJson(logData, ngDetails));
          }

          return logs;
        });
  }

  // Get sorting logs as a one-time fetch (not real-time)
  Future<List<SortingLog>> getSortingLogsOnce() async {
    try {
      final response = await _client
          .from('sorting_logs')
          .select()
          .order('timestamp', ascending: false);

      List<SortingLog> logs = [];
      
      for (var logData in response) {
        // Fetch NG details for this log
        final ngDetailsResponse = await _client
            .from('ng_details')
            .select()
            .eq('sorting_log_id', logData['id']);

        final ngDetails = (ngDetailsResponse as List)
            .map((ng) => NgDetail.fromJson(ng))
            .toList();

        logs.add(SortingLog.fromJson(logData, ngDetails));
      }

      return logs;
    } catch (e) {
      debugPrint('Error getting sorting logs: $e');
      return [];
    }
  }

  // Get part name from parts_master table
  Future<String?> getPartName(String partNo) async {
    try {
      final response = await _client
          .from('parts_master')
          .select('part_name')
          .eq('part_no', partNo)
          .maybeSingle();

      if (response != null) {
        return response['part_name'] as String?;
      }
      return null;
    } catch (e) {
      debugPrint('Error getting part name: $e');
      return null;
    }
  }

  // Add a new part to parts_master
  Future<void> addPart(String partNo, String partName) async {
    try {
      await _client.from('parts_master').insert({
        'part_no': partNo,
        'part_name': partName,
      });
    } catch (e) {
      debugPrint('Error adding part: $e');
      rethrow;
    }
  }

  // Update PDF URL for a sorting log
  Future<void> updatePdfUrl(String logId, String pdfUrl) async {
    try {
      await _client
          .from('sorting_logs')
          .update({'pdf_url': pdfUrl})
          .eq('id', logId);
    } catch (e) {
      debugPrint('Error updating PDF URL: $e');
      rethrow;
    }
  }

  // Delete all sorting logs (admin utility)
  Future<void> deleteAllLogs() async {
    try {
      // Delete all NG details first (cascade should handle this, but being explicit)
      await _client.from('ng_details').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      // Delete all sorting logs
      await _client.from('sorting_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch (e) {
      debugPrint('Error deleting all logs: $e');
      rethrow;
    }
  }

  // Upload image to Supabase Storage
  Future<String?> uploadImage(String filePath, List<int> fileBytes, String bucket) async {
    try {
      final fileName = '${DateTime.now().millisecondsSinceEpoch}_${filePath.split('/').last}';
      
      await _client.storage
          .from(bucket)
          .uploadBinary(fileName, Uint8List.fromList(fileBytes));

      final publicUrl = _client.storage
          .from(bucket)
          .getPublicUrl(fileName);

      return publicUrl;
    } catch (e) {
      debugPrint('Error uploading image: $e');
      return null;
    }
  }

  // Upload PDF to Supabase Storage
  Future<String?> uploadPdf(String fileName, List<int> pdfBytes) async {
    try {
      await _client.storage
          .from('reports')
          .uploadBinary(fileName, Uint8List.fromList(pdfBytes), fileOptions: const FileOptions(
            contentType: 'application/pdf',
          ));

      final publicUrl = _client.storage
          .from('reports')
          .getPublicUrl(fileName);

      return publicUrl;
    } catch (e) {
      debugPrint('Error uploading PDF: $e');
      return null;
    }
  }

  // Get statistics for dashboard
  Future<Map<String, dynamic>> getStatistics() async {
    try {
      final logs = await getSortingLogsOnce();
      
      int totalSorted = 0;
      int totalNg = 0;
      
      for (var log in logs) {
        totalSorted += log.quantitySorted;
        totalNg += log.quantityNg;
      }

      return {
        'total_logs': logs.length,
        'total_sorted': totalSorted,
        'total_ng': totalNg,
        'ng_percentage': totalSorted > 0 ? (totalNg / totalSorted * 100).toStringAsFixed(2) : '0.00',
      };
    } catch (e) {
      debugPrint('Error getting statistics: $e');
      return {
        'total_logs': 0,
        'total_sorted': 0,
        'total_ng': 0,
        'ng_percentage': '0.00',
      };
    }
  }
}
