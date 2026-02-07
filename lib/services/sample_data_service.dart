import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:myapp/models/sorting_log.dart';
import 'package:myapp/services/firestore_service.dart';

class SampleDataService {
  final FirestoreService _firestoreService = FirestoreService();

  Future<void> generateSampleData() async {
    final List<SortingLog> sampleLogs = [
      SortingLog(
        partNo: 'PN-1001-A',
        partName: 'Front Cover Assembly',
        quantitySorted: 150,
        quantityNg: 5,
        supplier: 'NES Manufacturing Hub',
        factoryLocation: 'Bayan Lepas, Penang',
        operators: ['Ahmad Hafiz'],
        ngDetails: [
          NgDetail(type: 'Scratch', operatorName: 'Ahmad Hafiz'),
        ],
        remarks: 'Minor scratches observed on surface.',
        timestamp: Timestamp.fromDate(DateTime.now().subtract(const Duration(hours: 2))),
      ),
      SortingLog(
        partNo: 'PN-1002-B',
        partName: 'Back Plate Metal',
        quantitySorted: 300,
        quantityNg: 12,
        supplier: 'Global Components',
        factoryLocation: 'Kulim, Kedah',
        operators: ['Siti Sarah'],
        ngDetails: [
          NgDetail(type: 'Dent', operatorName: 'Siti Sarah'),
          NgDetail(type: 'Rust', operatorName: 'Siti Sarah'),
        ],
        remarks: 'Dents found on edges.',
        timestamp: Timestamp.fromDate(DateTime.now().subtract(const Duration(hours: 4))),
      ),
      SortingLog(
        partNo: 'PN-200X-C',
        partName: 'Sensor Mount',
        quantitySorted: 500,
        quantityNg: 2,
        supplier: 'Precision Parts Ltd',
        factoryLocation: 'Batu Kawan, Penang',
        operators: ['Rajesh Kumar'],
        ngDetails: [
          NgDetail(type: 'Color Mismatch', operatorName: 'Rajesh Kumar'),
        ],
        remarks: 'Color deviation in batch.',
        timestamp: Timestamp.fromDate(DateTime.now().subtract(const Duration(minutes: 30))),
      ),
      SortingLog(
        partNo: 'PN-1001-A',
        partName: 'Front Cover Assembly',
        quantitySorted: 200,
        quantityNg: 25,
        supplier: 'NES Manufacturing Hub',
        factoryLocation: 'Bayan Lepas, Penang',
        operators: ['Alice Wong', 'Bob Tan'],
        ngDetails: [
          NgDetail(type: 'Cracked', operatorName: 'Alice Wong'),
          NgDetail(type: 'Deformed', operatorName: 'Bob Tan'),
        ],
        remarks: 'High NG rate due to mold issue.',
        timestamp: Timestamp.fromDate(DateTime.now().subtract(const Duration(days: 1))),
      ),
       SortingLog(
        partNo: 'PN-3000-Z',
        partName: 'LED Housing',
        quantitySorted: 1000,
        quantityNg: 0,
        supplier: 'OptoTech',
        factoryLocation: 'Perai, Penang',
        operators: ['Lim Wei'],
        ngDetails: [],
        remarks: 'Production smooth, no defects.',
        timestamp: Timestamp.fromDate(DateTime.now().subtract(const Duration(hours: 5))),
      ),
    ];

    for (final log in sampleLogs) {
      await _firestoreService.addSortingLog(log);
    }
  }
}
