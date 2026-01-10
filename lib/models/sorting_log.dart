import 'package:cloud_firestore/cloud_firestore.dart';

class SortingLog {
  final String? id;
  final String partNo;
  final String partName;
  final int quantitySorted;
  final int quantityNg;
  final String ngType;
  final String operatorName;
  final String supplier;
  final String? imageUrl;
  final Timestamp timestamp;

  SortingLog({
    this.id,
    required this.partNo,
    required this.partName,
    required this.quantitySorted,
    required this.quantityNg,
    required this.ngType,
    required this.operatorName,
    required this.supplier,
    this.imageUrl,
    required this.timestamp,
  });

  // Factory constructor to create a SortingLog from a Firestore document
  factory SortingLog.fromFirestore(DocumentSnapshot doc) {
    Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
    return SortingLog(
      id: doc.id,
      partNo: data['part_no'] ?? '',
      partName: data['part_name'] ?? '',
      quantitySorted: data['quantity_sorted'] ?? 0,
      quantityNg: data['quantity_ng'] ?? 0,
      ngType: data['ng_type'] ?? '',
      operatorName: data['operator_name'] ?? '',
      supplier: data['supplier'] ?? '',
      imageUrl: data['image_url'],
      timestamp: data['timestamp'] ?? Timestamp.now(),
    );
  }

  // Method to convert a SortingLog instance to a map for Firestore
  Map<String, dynamic> toFirestore() {
    return {
      'part_no': partNo,
      'part_name': partName,
      'quantity_sorted': quantitySorted,
      'quantity_ng': quantityNg,
      'ng_type': ngType,
      'operator_name': operatorName,
      'supplier': supplier,
      'image_url': imageUrl,
      'timestamp': timestamp,
    };
  }
}
