import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'package:myapp/models/sorting_log.dart';
import 'package:intl/intl.dart';

class ExcelExportService {
  Future<String> generateExcelReport(List<SortingLog> logs) async {
    // Generate CSV content
    final buffer = StringBuffer();
    
    // Header row
    buffer.writeln('Timestamp,Part Number,Part Name,Supplier,Location,Sorting Team,Total Sorted,Total NG,NG Types');
    
    // Data rows
    for (var log in logs) {
      final timestamp = DateFormat('yyyy-MM-dd HH:mm').format(log.timestamp.toDate());
      final operators = log.operators.join(' | ');
      final ngTypes = log.ngDetails.map((e) => e.type).join(' | ');
      
      buffer.writeln(
        '"$timestamp","${log.partNo}","${log.partName}","${log.supplier}","${log.factoryLocation}","$operators",${log.quantitySorted},${log.quantityNg},"$ngTypes"'
      );
    }
    
    // Save file
    final directory = await getApplicationDocumentsDirectory();
    final fileName = 'QCSR_Report_${DateFormat('yyyyMMdd_HHmmss').format(DateTime.now())}.csv';
    final filePath = '${directory.path}/$fileName';
    
    File(filePath)
      ..createSync(recursive: true)
      ..writeAsStringSync(buffer.toString());
    
    return filePath;
  }
}
