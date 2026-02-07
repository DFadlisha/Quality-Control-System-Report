import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'package:myapp/models/sorting_log.dart';
import 'package:intl/intl.dart';
import 'package:share_plus/share_plus.dart';
import 'package:excel/excel.dart';

class ExcelExportService {
  Future<void> generateAndShareExcelReport(List<SortingLog> logs) async {
    final excel = Excel.createExcel();
    final sheet = excel['Inspection Logs'];
    excel.setDefaultSheet('Inspection Logs');

    // Header row
    List<String> headers = [
      'Timestamp',
      'Part Number',
      'Part Name',
      'Supplier',
      'Location',
      'Operators',
      'Total Sorted',
      'Total NG',
      'NG Types'
    ];

    for (var i = 0; i < headers.length; i++) {
      var cell = sheet.cell(CellIndex.indexByColumnRow(columnIndex: i, rowIndex: 0));
      cell.value = TextCellValue(headers[i]);
    }

    // Data rows
    for (var i = 0; i < logs.length; i++) {
      final log = logs[i];
      final rowIndex = i + 1;
      
      final timestamp = DateFormat('yyyy-MM-dd HH:mm').format(log.timestamp.toDate());
      final operators = log.operators.join(', ');
      final ngTypes = log.ngDetails.map((e) => e.type).join(', ');

      sheet.cell(CellIndex.indexByColumnRow(columnIndex: 0, rowIndex: rowIndex)).value = TextCellValue(timestamp);
      sheet.cell(CellIndex.indexByColumnRow(columnIndex: 1, rowIndex: rowIndex)).value = TextCellValue(log.partNo);
      sheet.cell(CellIndex.indexByColumnRow(columnIndex: 2, rowIndex: rowIndex)).value = TextCellValue(log.partName);
      sheet.cell(CellIndex.indexByColumnRow(columnIndex: 3, rowIndex: rowIndex)).value = TextCellValue(log.supplier);
      sheet.cell(CellIndex.indexByColumnRow(columnIndex: 4, rowIndex: rowIndex)).value = TextCellValue(log.factoryLocation);
      sheet.cell(CellIndex.indexByColumnRow(columnIndex: 5, rowIndex: rowIndex)).value = TextCellValue(operators);
      sheet.cell(CellIndex.indexByColumnRow(columnIndex: 6, rowIndex: rowIndex)).value = IntCellValue(log.quantitySorted);
      sheet.cell(CellIndex.indexByColumnRow(columnIndex: 7, rowIndex: rowIndex)).value = IntCellValue(log.quantityNg);
      sheet.cell(CellIndex.indexByColumnRow(columnIndex: 8, rowIndex: rowIndex)).value = TextCellValue(ngTypes);
    }
    
    // Save file
    final directory = await getTemporaryDirectory();
    final fileName = 'QCSR_Report_${DateFormat('yyyyMMdd_HHmmss').format(DateTime.now())}.xlsx';
    final filePath = '${directory.path}/$fileName';
    
    // Save the bytes
    final fileBytes = excel.save();
    if (fileBytes != null) {
      final file = File(filePath);
      await file.create(recursive: true);
      await file.writeAsBytes(fileBytes);
      
      // Share file
      await Share.shareXFiles([XFile(filePath)], text: 'QCSR Inspection Report (Excel)');
    }
  }
}
